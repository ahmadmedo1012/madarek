/**
 * Backend unit test — R353 C2: the multi-PROVIDER chain
 * (backend/src/lib/ai/providers.ts).
 *
 * DB-free + wire-free (house canon): the chain is exercised at the
 * PURE layers (env parsing, the circuit breaker state machine, the
 * runner's walk) with fetch stubbed at the global — the
 * ai-provider.test.ts pattern. Route-level chain behavior (telemetry
 * provider column, /ai/config summary, the local-composer terminal
 * fallback) lives in r353-ai-chain-routes.test.ts against localhost
 * stub HTTP servers (this sandbox cannot reach Gemini/Groq — both are
 * geo-blocked 403 from here — so EVERY provider in every test is a
 * stub).
 *
 * Policy under pin:
 *  · the default chain order from individual keys: gemini → groq →
 *    openrouter → legacy; AI_PROVIDERS JSON wins when it parses;
 *  · fail-open: no AI_* chain var value can produce a throw out of
 *    the PARSER — an empty chain is the local-composer mode;
 *  · per-provider breaker: 3 consecutive provider failures open a
 *    jittered cooldown; consult states closed/open/half-open; the
 *    cooldown expiry yields a HALF-OPEN probe (one attempt);
 *  · the runner walks (provider, model) pairs with the r176a/r323
 *    per-model retry grammar, the budget pre-emption, and the client
 *    abort short-circuit;
 *  · the wire quirk: gemini/groq (and every chain attempt) carries
 *    the plain `model` field — OpenRouter's `models` array never
 *    rides a chain attempt, and OpenRouter's attribution headers ride
 *    ONLY OpenRouter.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_CHAIN_BREAKER_COOLDOWN_MS,
  AI_CHAIN_BREAKER_THRESHOLD,
  AI_CHAIN_TOTAL_BUDGET_MS,
  AI_PROVIDER_TIMEOUT_MS,
  AiProviderBreakers,
  callProviderChain,
  isChainMode,
  parseAiChainEnv,
  routeChainForTask,
  runProviderChain,
  streamProviderChain,
  type AiChainConfig,
  type AiProviderSpec,
  type BreakerVerdict,
} from '../../src/lib/ai/providers.js';
import {
  AiProviderError,
  buildChatMessages,
  providerLabelFromBaseUrl,
  type AiRetrySleeper,
} from '../../src/lib/ai.js';

// ─── fixtures ──────────────────────────────────────────────────────

const MESSAGES = buildChatMessages('sys', [], 'سؤال');

const SPEC = (
  over: Partial<AiProviderSpec> & Pick<AiProviderSpec, 'id' | 'baseUrl' | 'apiKey'>,
): AiProviderSpec => ({ models: ['m-1'], timeoutMs: 1000, tasks: ['chat'], ...over });

const CHAIN = (providers: AiProviderSpec[], over: Partial<AiChainConfig> = {}): AiChainConfig => ({
  providers,
  totalBudgetMs: AI_CHAIN_TOTAL_BUDGET_MS,
  breaker: { threshold: AI_CHAIN_BREAKER_THRESHOLD, cooldownMs: AI_CHAIN_BREAKER_COOLDOWN_MS },
  ...over,
});

const GEMINI = SPEC({
  id: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: 'gem-key',
  models: ['gemini-2.5-flash'],
  timeoutMs: AI_PROVIDER_TIMEOUT_MS.gemini,
});
const GROQ = SPEC({
  id: 'groq',
  baseUrl: 'https://api.groq.com/openai/v1',
  apiKey: 'groq-key',
  models: ['llama-3.3-70b-versatile'],
  timeoutMs: AI_PROVIDER_TIMEOUT_MS.groq,
});
const OPENROUTER = SPEC({
  id: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'or-key',
  timeoutMs: AI_PROVIDER_TIMEOUT_MS.openrouter,
});

const freshBreakers = () => new AiProviderBreakers({ threshold: 3, cooldownMs: 60_000 });

const okBody = (model: string, content = 'جواب') =>
  new Response(
    JSON.stringify({
      model,
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 2, completion_tokens: 3 },
    }),
    { status: 200 },
  );

const httpError = (status: number) => new Response(JSON.stringify({ error: { message: 'boom' } }), { status });

const sseChunk = (delta: string): string =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;

function streamResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < frames.length) controller.enqueue(encoder.encode(frames[i++]!));
      else controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const noopLog = (_obj: Record<string, unknown>, _msg: string): void => undefined;

/** Immediate sleeper capturing the requested delays. */
function fakeSleeper(): { sleep: AiRetrySleeper; delays: number[] } {
  const delays: number[] = [];
  return { delays, sleep: async (ms) => { delays.push(ms); } };
}

/** A controllable monotonic clock. */
function fakeClock(): { now: () => number; advance: (ms: number) => void } {
  let t = 1_000_000;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

/** Stub global fetch dispatching by the provider's chat-completions
 * URL (every provider here is a STUB — this sandbox cannot reach
 * gemini/groq: both geo-block 403). */
function stubByProvider(
  respond: (spec: AiProviderSpec) => Response | Promise<Response>,
  calls: Array<{ url: string; init: RequestInit }>,
): (specs: AiProviderSpec[]) => void {
  const byUrl = new Map<string, AiProviderSpec>();
  return (specs: AiProviderSpec[]) => {
    for (const s of specs) byUrl.set(`${s.baseUrl.replace(/\/+$/, '')}/chat/completions`, s);
    vi.stubGlobal('fetch', async (url: string | URL | Request, init: RequestInit) => {
      const target = String(url instanceof Request ? url.url : url);
      const spec = byUrl.get(target);
      if (!spec) throw new TypeError(`unexpected fetch ${target}`);
      calls.push({ url: target, init });
      return respond(spec);
    });
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── parseAiChainEnv — the configuration grammars ──────────────────

describe('parseAiChainEnv (fail-open chain configuration)', () => {
  it('an EMPTY env is the empty chain — the honest local-composer mode, no warnings', () => {
    const { chain, warnings } = parseAiChainEnv({});
    expect(chain.providers).toEqual([]);
    expect(chain.totalBudgetMs).toBe(AI_CHAIN_TOTAL_BUDGET_MS);
    expect(chain.breaker).toEqual({ threshold: 3, cooldownMs: 60_000 });
    expect(warnings).toEqual([]);
  });

  it('the DEFAULT ORDER from individual keys: gemini → groq → (openrouter needs its key) → legacy last', () => {
    const { chain } = parseAiChainEnv({
      GROQ_API_KEY: 'g',
      GEMINI_API_KEY: 'gem',
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'legacy-key',
      AI_MODEL: 'legacy-model',
      AI_BASE_URL: 'https://api.openai.com/v1',
    });
    expect(chain.providers.map((p) => p.id)).toEqual(['gemini', 'groq', 'openai']);
    // The third entry is the LEGACY provider (labeled by its base
    // URL), not an OpenRouter key lane — no OPENROUTER_API_KEY set.
    expect(chain.providers[2]!.apiKey).toBe('legacy-key');
    expect(chain.providers[2]!.models).toEqual(['legacy-model']);
  });

  it('gemini: the real OpenAI-compatible base URL, the vendor default model, the 25s timeout class', () => {
    const { chain } = parseAiChainEnv({ GEMINI_API_KEY: 'gem' });
    expect(chain.providers).toHaveLength(1);
    const gemini = chain.providers[0]!;
    expect(gemini.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai/');
    expect(gemini.models).toEqual(['gemini-2.5-flash']);
    expect(gemini.timeoutMs).toBe(25_000);
    expect(gemini.tasks).toEqual(['chat']);
  });

  it('AI_GEMINI_MODELS overrides the default list (ordered, trimmed, deduped, ≤3)', () => {
    const { chain } = parseAiChainEnv({ GEMINI_API_KEY: 'gem', AI_GEMINI_MODELS: ' b , a , a , c , d' });
    expect(chain.providers[0]!.models).toEqual(['b', 'a', 'c']);
  });

  it('groq: api.groq.com/openai/v1, its model list, the 15s timeout class', () => {
    const { chain } = parseAiChainEnv({ GROQ_API_KEY: 'g', AI_GROQ_MODELS: 'llama-huge' });
    const groq = chain.providers[0]!;
    expect(groq.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(groq.models).toEqual(['llama-huge']);
    expect(groq.timeoutMs).toBe(15_000);
  });

  it('an EMPTY-STRING key is an absent provider (a deploy UI clearing a var is not a provider)', () => {
    const { chain } = parseAiChainEnv({ GEMINI_API_KEY: '' });
    expect(chain.providers).toEqual([]);
  });

  it('AI_PROVIDERS JSON wins entirely when it parses (individual keys ignored)', () => {
    const { chain, warnings } = parseAiChainEnv({
      GEMINI_API_KEY: 'ignored',
      AI_PROVIDERS: JSON.stringify([{ id: 'groq', apiKeyEnv: 'MY_GROQ_KEY', models: ['llama-x'] }]),
      MY_GROQ_KEY: 'via-indirection',
    });
    expect(warnings).toEqual([]);
    expect(chain.providers).toHaveLength(1);
    expect(chain.providers[0]!.id).toBe('groq');
    expect(chain.providers[0]!.apiKey).toBe('via-indirection');
    expect(chain.providers[0]!.baseUrl).toBe('https://api.groq.com/openai/v1'); // registry default
  });

  it('AI_PROVIDERS object shape: {providers, totalBudgetMs} with the hard-cap clamp', () => {
    const tooBig = parseAiChainEnv({
      AI_PROVIDERS: JSON.stringify({ providers: [{ id: 'gemini' }], totalBudgetMs: 999_999 }),
      GEMINI_API_KEY: 'gem',
    });
    expect(tooBig.chain.totalBudgetMs).toBe(55_000); // the hard cap
    const sane = parseAiChainEnv({
      AI_PROVIDERS: JSON.stringify({ providers: [{ id: 'gemini' }], totalBudgetMs: 30_000 }),
      GEMINI_API_KEY: 'gem',
    });
    expect(sane.chain.totalBudgetMs).toBe(30_000);
    const invalid = parseAiChainEnv({
      AI_PROVIDERS: JSON.stringify({ providers: [{ id: 'gemini' }], totalBudgetMs: 10 }),
      GEMINI_API_KEY: 'gem',
    });
    expect(invalid.chain.totalBudgetMs).toBe(AI_CHAIN_TOTAL_BUDGET_MS); // out of bounds → default
    expect(invalid.warnings.join(' ')).toContain('out of bounds');
  });

  it('an unknown id without baseUrl is DROPPED with a warning (never a crash)', () => {
    const { chain, warnings } = parseAiChainEnv({
      AI_PROVIDERS: JSON.stringify([{ id: 'my-vllm', apiKey: 'k', models: ['m'] }]),
    });
    expect(chain.providers).toEqual([]);
    expect(warnings.join(' ')).toContain('baseUrl');
  });

  it('invalid JSON / a non-array shape → the EMPTY chain with a warning (fail-open)', () => {
    const bad = parseAiChainEnv({ AI_PROVIDERS: '{not json' });
    expect(bad.chain.providers).toEqual([]);
    expect(bad.warnings.join(' ')).toContain('not valid JSON');
    const notArray = parseAiChainEnv({ AI_PROVIDERS: JSON.stringify({ nope: 1 }) });
    expect(notArray.chain.providers).toEqual([]);
    expect(notArray.warnings.join(' ')).toContain('array');
  });

  it('a descriptor without a resolvable key is dropped with a warning (no key material logged)', () => {
    const { chain, warnings } = parseAiChainEnv({
      AI_PROVIDERS: JSON.stringify([{ id: 'groq', models: ['m'] }]),
    });
    expect(chain.providers).toEqual([]);
    expect(warnings.join(' ')).toContain('no resolvable API key');
    expect(warnings.join(' ')).not.toContain('sk-');
  });

  it('isChainMode: ≥2 providers → chain mode; 0/1 keep the historical single-provider contract', () => {
    expect(isChainMode(parseAiChainEnv({}).chain)).toBe(false);
    expect(isChainMode(parseAiChainEnv({ GEMINI_API_KEY: 'g' }).chain)).toBe(false);
    expect(isChainMode(parseAiChainEnv({ GEMINI_API_KEY: 'g', GROQ_API_KEY: 'q' }).chain)).toBe(true);
  });

  it('routeChainForTask filters by tag, preserving chain order (the routing policy is data)', () => {
    const tagged = CHAIN([{ ...GEMINI, tasks: ['chat'] }, { ...GROQ, tasks: ['fast'] }]);
    expect(routeChainForTask(tagged, 'chat').map((p) => p.id)).toEqual(['gemini']);
    // The mechanism a future 'fast' task type rides: groq tagged 'fast'
    // routes groq-first without a runner change.
    expect(routeChainForTask(tagged, 'fast' as never).map((p) => p.id)).toEqual(['groq']);
  });
});

// ─── providerLabelFromBaseUrl — the gemini host mapping ────────────

describe('providerLabelFromBaseUrl — R353 C2 gemini mapping', () => {
  it("Gemini's OpenAI-compat endpoint is labeled gemini — the vendor name, never a bare hostname", () => {
    expect(providerLabelFromBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai/')).toBe('gemini');
  });
});

// ─── AiProviderBreakers — the per-provider circuit breaker ─────────

describe('AiProviderBreakers (in-process, monotonic timestamps, no timers)', () => {
  it('closed by default; 3 consecutive failures OPEN the breaker (the threshold)', () => {
    const b = new AiProviderBreakers({ threshold: 3, cooldownMs: 60_000 }, () => 0.5);
    expect(b.consult('gemini', 0)).toBe('closed' as BreakerVerdict);
    b.recordFailure('gemini', 0);
    b.recordFailure('gemini', 1_000);
    expect(b.consult('gemini', 2_000)).toBe('closed' as BreakerVerdict); // 2 < 3
    b.recordFailure('gemini', 3_000);
    expect(b.consult('gemini', 4_000)).toBe('open' as BreakerVerdict);
  });

  it('a success RESETS the consecutive count (a healthy provider is closed)', () => {
    const b = new AiProviderBreakers({ threshold: 3, cooldownMs: 60_000 }, () => 0.5);
    b.recordFailure('groq', 0);
    b.recordFailure('groq', 1);
    b.recordSuccess('groq');
    b.recordFailure('groq', 2);
    b.recordFailure('groq', 3);
    expect(b.consult('groq', 4)).toBe('closed' as BreakerVerdict); // 2 consecutive — the reset worked
  });

  it('after the cooldown the verdict is HALF-OPEN (one probe); before it, open', () => {
    const b = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0.0); // jitter → 45s
    b.recordFailure('gemini', 0);
    expect(b.consult('gemini', 44_999)).toBe('open' as BreakerVerdict);
    expect(b.consult('gemini', 45_000)).toBe('half-open' as BreakerVerdict);
  });

  it('the cooldown is JITTERED ±25% around the base (rand injectable)', () => {
    const low = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0);
    low.recordFailure('p', 0);
    expect(low.consult('p', 44_999)).toBe('open' as BreakerVerdict);
    expect(low.consult('p', 45_000)).toBe('half-open' as BreakerVerdict); // 60_000 × 0.75
    const high = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0.999999);
    high.recordFailure('p', 0);
    // floor(60_000 × 1.25 − ε) = 74_999 — the upper jitter bound.
    expect(high.consult('p', 74_998)).toBe('open' as BreakerVerdict);
    expect(high.consult('p', 74_999)).toBe('half-open' as BreakerVerdict);
  });

  it('breaker state is PER PROVIDER (gemini opening never touches groq)', () => {
    const b = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0.5);
    b.recordFailure('gemini', 0);
    expect(b.consult('gemini', 1)).toBe('open' as BreakerVerdict);
    expect(b.consult('groq', 1)).toBe('closed' as BreakerVerdict);
  });
});

// ─── the JSON transport on the chain ───────────────────────────────

describe('callProviderChain — cross-provider failover (fetch stubbed)', () => {
  it('gemini 500 ×2 (attempt + its ONE retry) then groq answers — wire calls 2+1, the outcome names groq', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    stubByProvider(
      (spec) => (spec.id === 'gemini' ? httpError(500) : okBody('llama-3.3-70b-versatile', 'جواب groq')),
      calls,
    )([GEMINI, GROQ]);
    const { sleep, delays } = fakeSleeper();

    const outcome = await callProviderChain(CHAIN([GEMINI, GROQ]), MESSAGES, {
      log: noopLog,
      sleep,
      breakers: freshBreakers(),
    });
    expect(outcome.result.content).toBe('جواب groq');
    expect(outcome.providerId).toBe('groq');
    expect(outcome.providerLabel).toBe('groq');
    // gemini burned its attempt + the single same-model retry, then
    // fell through — exactly the r176a grammar per chain member.
    expect(calls.filter((c) => c.url.includes('generativelanguage'))).toHaveLength(2);
    expect(calls.filter((c) => c.url.includes('api.groq.com'))).toHaveLength(1);
    // One retry backoff, nothing else slept.
    expect(delays).toHaveLength(1);
  });

  it('the wire quirk: chain attempts carry the PLAIN model field — gemini never sees a models array; OpenRouter keeps its attribution headers', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    stubByProvider((spec) => okBody(`${spec.id}-model`), calls)([GEMINI, OPENROUTER]);

    const first = await callProviderChain(CHAIN([GEMINI, OPENROUTER]), MESSAGES, {
      log: noopLog,
      sleep: fakeSleeper().sleep,
      breakers: freshBreakers(),
    });
    expect(first.providerId).toBe('gemini');
    const geminiBody = JSON.parse((calls[0]!.init as { body: string }).body) as Record<string, unknown>;
    expect(geminiBody.model).toBe('gemini-2.5-flash');
    expect(geminiBody.models).toBeUndefined();
    const geminiHeaders = calls[0]!.init.headers as Record<string, string>;
    expect(geminiHeaders.Authorization).toBe('Bearer gem-key');
    expect(geminiHeaders['HTTP-Referer']).toBeUndefined();

    // Force the fall-through to OpenRouter: gemini refuses non-transiently.
    const calls2: Array<{ url: string; init: RequestInit }> = [];
    stubByProvider((spec) => (spec.id === 'gemini' ? httpError(400) : okBody('or-model')), calls2)([
      GEMINI,
      OPENROUTER,
    ]);
    const second = await callProviderChain(CHAIN([GEMINI, OPENROUTER]), MESSAGES, {
      log: noopLog,
      sleep: fakeSleeper().sleep,
      breakers: freshBreakers(),
    });
    expect(second.providerId).toBe('openrouter');
    const orCall = calls2.find((c) => c.url.includes('openrouter.ai'))!;
    const orBody = JSON.parse((orCall.init as { body: string }).body) as Record<string, unknown>;
    expect(orBody.model).toBe('m-1'); // pinned per attempt — the models array NEVER rides a chain attempt
    expect(orBody.models).toBeUndefined();
    const orHeaders = orCall.init.headers as Record<string, string>;
    expect(orHeaders['HTTP-Referer']).toBe('https://madarek-app.vercel.app');
    expect(orHeaders['X-Title']).toBe('Madarek');
  });

  it('the per-model retry grammar survives INSIDE a provider: a 429-then-200 never falls through', async () => {
    let geminiCalls = 0;
    stubByProvider(
      (spec) => {
        if (spec.id !== 'gemini') throw new Error('groq must not be called');
        geminiCalls += 1;
        return geminiCalls === 1 ? httpError(429) : okBody('gemini-2.5-flash', 'بعد المحاولة');
      },
      [],
    )([GEMINI, GROQ]);
    const outcome = await callProviderChain(CHAIN([GEMINI, GROQ]), MESSAGES, {
      log: noopLog,
      sleep: fakeSleeper().sleep,
      breakers: freshBreakers(),
    });
    expect(outcome.result.content).toBe('بعد المحاولة');
    expect(geminiCalls).toBe(2);
  });

  it('a 429 storm opens the breaker: the NEXT chain run skips gemini entirely (0 wire calls) and groq answers', async () => {
    const breakers = freshBreakers();
    const chain = CHAIN([GEMINI, GROQ]);
    const { sleep } = fakeSleeper();
    const mkStub = (calls: Array<{ url: string; init: RequestInit }>) =>
      stubByProvider((spec) => (spec.id === 'gemini' ? httpError(429) : okBody('llama-3.3-70b-versatile')), calls);

    // Three failed provider walks (each: attempt + retry on gemini, groq answers).
    for (let turn = 0; turn < 3; turn += 1) {
      const calls: Array<{ url: string; init: RequestInit }> = [];
      mkStub(calls)([GEMINI, GROQ]);
      const outcome = await callProviderChain(chain, MESSAGES, { log: noopLog, sleep, breakers });
      expect(outcome.providerId).toBe('groq');
    }
    // The 4th turn: gemini's breaker is OPEN — skipped with ZERO wire
    // calls (no budget burned on a provider that just refused 3×).
    const calls4: Array<{ url: string; init: RequestInit }> = [];
    mkStub(calls4)([GEMINI, GROQ]);
    const outcome4 = await callProviderChain(chain, MESSAGES, { log: noopLog, sleep, breakers });
    expect(outcome4.providerId).toBe('groq');
    expect(calls4.filter((c) => c.url.includes('generativelanguage'))).toHaveLength(0);
    expect(calls4.filter((c) => c.url.includes('api.groq.com'))).toHaveLength(1);
  });

  it('cooldown expiry → HALF-OPEN: exactly ONE probe attempt on gemini; success closes the breaker', async () => {
    const breakers = freshBreakers();
    const chain = CHAIN([GEMINI, GROQ]);
    const clock = fakeClock();
    const { sleep } = fakeSleeper();
    const mkStub = (respond: (spec: AiProviderSpec) => Response, calls: Array<{ url: string; init: RequestInit }>) => {
      stubByProvider(respond, calls)([GEMINI, GROQ]);
    };

    // Open the breaker (3 failed provider walks).
    for (let turn = 0; turn < 3; turn += 1) {
      const calls: Array<{ url: string; init: RequestInit }> = [];
      mkStub((spec) => (spec.id === 'gemini' ? httpError(500) : okBody('g-model')), calls);
      await callProviderChain(chain, MESSAGES, { log: noopLog, sleep, breakers, now: clock.now });
    }
    expect(breakers.consult('gemini', clock.now())).toBe('open' as BreakerVerdict);

    // The cooldown passes (a monotonic clock fact — no timers involved).
    clock.advance(120_000); // past any jittered cooldown
    expect(breakers.consult('gemini', clock.now())).toBe('half-open' as BreakerVerdict);

    // The probe: gemini answers now — ONE wire call, breaker CLOSED.
    const probeCalls: Array<{ url: string; init: RequestInit }> = [];
    mkStub((spec) => okBody(`${spec.id}-model`), probeCalls);
    const outcome = await callProviderChain(chain, MESSAGES, { log: noopLog, sleep, breakers, now: clock.now });
    expect(outcome.providerId).toBe('gemini');
    expect(probeCalls).toHaveLength(1);
    expect(breakers.consult('gemini', clock.now())).toBe('closed' as BreakerVerdict);

    // And the next turn is a normal closed walk (gemini first, no probe limits).
    const normalCalls: Array<{ url: string; init: RequestInit }> = [];
    mkStub((spec) => okBody(`${spec.id}-model`), normalCalls);
    const outcome2 = await callProviderChain(chain, MESSAGES, { log: noopLog, sleep, breakers, now: clock.now });
    expect(outcome2.providerId).toBe('gemini');
    expect(normalCalls).toHaveLength(1);
  });

  it('a FAILED half-open probe re-opens the breaker and the chain moves on (one attempt only)', async () => {
    const breakers = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0);
    const chain = CHAIN([GEMINI, GROQ]);
    const clock = fakeClock();
    const { sleep } = fakeSleeper();

    // Open immediately (threshold 1), then let the 45s cooldown pass.
    const calls1: Array<{ url: string; init: RequestInit }> = [];
    stubByProvider((spec) => (spec.id === 'gemini' ? httpError(500) : okBody('g-model')), calls1)([GEMINI, GROQ]);
    await callProviderChain(chain, MESSAGES, { log: noopLog, sleep, breakers, now: clock.now });
    clock.advance(45_001);
    expect(breakers.consult('gemini', clock.now())).toBe('half-open' as BreakerVerdict);

    // The probe fails: ONE gemini attempt (a 429 would normally earn a
    // same-model retry — a probe gets exactly ONE), groq answers, and
    // gemini is OPEN again.
    const probeCalls: Array<{ url: string; init: RequestInit }> = [];
    stubByProvider((spec) => (spec.id === 'gemini' ? httpError(429) : okBody('g-model')), probeCalls)([GEMINI, GROQ]);
    const outcome = await callProviderChain(chain, MESSAGES, { log: noopLog, sleep, breakers, now: clock.now });
    expect(outcome.providerId).toBe('groq');
    expect(probeCalls.filter((c) => c.url.includes('generativelanguage'))).toHaveLength(1);
    expect(breakers.consult('gemini', clock.now())).toBe('open' as BreakerVerdict);
  });
});

// ─── runProviderChain — budget pre-emption + abort (direct attempt) ─

describe('runProviderChain — budget pre-emption and the abort short-circuit', () => {
  it('an attempt whose worst case cannot fit the REMAINING budget never starts', async () => {
    const clock = fakeClock();
    const attempts: string[] = [];
    const chain = CHAIN(
      [
        { ...GEMINI, timeoutMs: 25_000 },
        { ...GROQ, timeoutMs: 30_000 },
      ],
      { totalBudgetMs: 50_000 },
    );

    // gemini "takes" its whole 25s ceiling and fails non-transiently.
    const err = await runProviderChain(
      chain,
      'chat',
      async (spec) => {
        attempts.push(spec.id);
        if (spec.id === 'gemini') clock.advance(25_000);
        throw new AiProviderError('provider HTTP 400: nope', 'provider_rejected', 400);
      },
      { log: noopLog, now: clock.now, breakers: freshBreakers() },
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('provider_rejected'); // the LAST real error surfaces
    expect(attempts).toEqual(['gemini']); // groq pre-empted: 25s + 30s > 50s
  });

  it('a chain where NOTHING fits the budget throws the honest classified timeout (never a fabricated reply)', async () => {
    const attempts: string[] = [];
    const chain = CHAIN([{ ...GEMINI, timeoutMs: 60_000 }], { totalBudgetMs: 50_000 });
    const err = await runProviderChain(
      chain,
      'chat',
      async (spec) => {
        attempts.push(spec.id);
        return 'never' as never;
      },
      { log: noopLog, breakers: freshBreakers() },
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('timeout');
    expect(attempts).toEqual([]); // pre-empted before ANY attempt
  });

  it('a client abort short-circuits the walk — no retries, no fall-through', async () => {
    const attempts: string[] = [];
    const abortError = new Error('client gone');
    await expect(
      runProviderChain(
        CHAIN([GEMINI, GROQ]),
        'chat',
        async (spec) => {
          attempts.push(spec.id);
          throw abortError;
        },
        {
          log: noopLog,
          sleep: fakeSleeper().sleep,
          isAborted: () => true,
          breakers: freshBreakers(),
        },
      ),
    ).rejects.toBe(abortError);
    expect(attempts).toEqual(['gemini']); // the abort won before any fallback
  });

  it('a provider skipped by the budget keeps its breaker state UNTOUCHED (the budget refusing ≠ the provider failing)', async () => {
    const breakers = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 });
    const clock = fakeClock();
    const chain = CHAIN(
      [
        { ...GEMINI, timeoutMs: 25_000 },
        { ...GROQ, timeoutMs: 30_000 },
      ],
      { totalBudgetMs: 50_000 },
    );
    await runProviderChain(
      chain,
      'chat',
      async (spec) => {
        if (spec.id === 'gemini') clock.advance(25_000);
        throw new AiProviderError('HTTP 500', 'provider_error', 500);
      },
      { log: noopLog, now: clock.now, breakers },
    ).catch(() => undefined);
    // gemini was attempted and failed → its breaker counts; groq was
    // only pre-empted → still closed.
    expect(breakers.consult('gemini', clock.now())).toBe('open' as BreakerVerdict);
    expect(breakers.consult('groq', clock.now())).toBe('closed' as BreakerVerdict);
  });
});

// ─── the SSE transport on the chain ────────────────────────────────

describe('streamProviderChain — SSE failover (fetch stubbed)', () => {
  it('gemini stream 500s → groq streams the answer; deltas arrive from groq ONLY; the outcome names groq', async () => {
    const deltas: string[] = [];
    const calls: Array<{ url: string }> = [];
    vi.stubGlobal('fetch', async (url: string | URL | Request) => {
      const target = String(url instanceof Request ? url.url : url);
      calls.push({ url: target });
      if (target.includes('generativelanguage')) return httpError(503);
      return streamResponse([sseChunk('جزء '), sseChunk('من groq'), 'data: [DONE]\n\n']);
    });

    const outcome = await streamProviderChain(CHAIN([GEMINI, GROQ]), MESSAGES, (d) => deltas.push(d), {
      log: noopLog,
      sleep: fakeSleeper().sleep,
      breakers: freshBreakers(),
    });
    expect(outcome.providerId).toBe('groq');
    expect(outcome.providerLabel).toBe('groq');
    expect(outcome.result.content).toBe('جزء من groq');
    expect(deltas).toEqual(['جزء ', 'من groq']);
    // gemini: attempt + the one retry (503 is provider_error —
    // retryable), then the groq fall-through.
    expect(calls.filter((c) => c.url.includes('generativelanguage'))).toHaveLength(2);
    expect(calls.filter((c) => c.url.includes('api.groq.com'))).toHaveLength(1);
  });

  it('a mid-stream abort short-circuits the chain (the student left — no fall-through)', async () => {
    const controller = new AbortController();
    const calls: Array<{ url: string }> = [];
    vi.stubGlobal('fetch', async (url: string | URL | Request) => {
      const target = String(url instanceof Request ? url.url : url);
      calls.push({ url: target });
      controller.abort(); // the stream is dead the moment it starts
      throw new DOMException('This operation was aborted', 'AbortError');
    });
    await expect(
      streamProviderChain(CHAIN([GEMINI, GROQ]), MESSAGES, () => undefined, {
        log: noopLog,
        sleep: fakeSleeper().sleep,
        breakers: freshBreakers(),
        externalSignal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(calls).toHaveLength(1); // gemini only — groq never dialed
  });
});

/* ════════════════════════════════════════════════════════════════════
   r357 L5 — the Retry-After law + the breaker snapshot
   ════════════════════════════════════════════════════════════════════ */

describe('r357 L5 — parseRetryAfterMs (the provider\'s own word, clamped)', () => {
  it('delta-seconds parse to ms; 0 floors at 1s (a 0 must not slam the door)', async () => {
    const { parseRetryAfterMs, RETRY_AFTER_MIN_MS } = await import('../../src/lib/ai.js');
    expect(parseRetryAfterMs('30')).toBe(30_000);
    expect(parseRetryAfterMs('0')).toBe(RETRY_AFTER_MIN_MS);
    expect(parseRetryAfterMs('  120 ')).toBe(120_000);
  });

  it('an HTTP-date parses against nowMs; a past date floors at 1s', async () => {
    const { parseRetryAfterMs, RETRY_AFTER_MIN_MS } = await import('../../src/lib/ai.js');
    const now = Date.UTC(2026, 10, 16, 12, 0, 0);
    expect(parseRetryAfterMs(new Date(now + 45_000).toUTCString(), now)).toBe(45_000);
    expect(parseRetryAfterMs(new Date(now - 60_000).toUTCString(), now)).toBe(RETRY_AFTER_MIN_MS);
  });

  it('a daily-cap "come back tomorrow" clamps at 10 min; garbage/absent is null', async () => {
    const { parseRetryAfterMs, RETRY_AFTER_MAX_MS } = await import('../../src/lib/ai.js');
    expect(parseRetryAfterMs('86400')).toBe(RETRY_AFTER_MAX_MS);
    expect(parseRetryAfterMs('soon')).toBeNull();
    expect(parseRetryAfterMs('')).toBeNull();
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs(undefined)).toBeNull();
  });
});

describe('r357 L5 — the breaker honors Retry-After over the generic cooldown', () => {
  it('a 429 failure with Retry-After opens with cooldown = max(jittered base, Retry-After)', () => {
    const b = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0.0); // jitter → 45s
    b.recordFailure('gemini', 0, 300_000); // the provider said "5 minutes"
    expect(b.consult('gemini', 44_999)).toBe('open' as BreakerVerdict);
    expect(b.consult('gemini', 45_000)).toBe('open' as BreakerVerdict); // NOT half-open — Retry-After still rules
    expect(b.consult('gemini', 299_999)).toBe('open' as BreakerVerdict);
    expect(b.consult('gemini', 300_000)).toBe('half-open' as BreakerVerdict);
  });

  it('a Retry-After SHORTER than the jittered base never SHORTENS the cooldown', () => {
    const b = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 1.0); // jitter → 75s
    b.recordFailure('groq', 0, 5_000); // 5s < 75s → the base wins
    expect(b.consult('groq', 5_000)).toBe('open' as BreakerVerdict);
    expect(b.consult('groq', 74_999)).toBe('open' as BreakerVerdict);
    expect(b.consult('groq', 75_000)).toBe('half-open' as BreakerVerdict);
  });

  it('a failure WITHOUT Retry-After keeps the historical jittered cooldown', () => {
    const b = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0.5); // → 60s
    b.recordFailure('openrouter', 0, undefined);
    expect(b.consult('openrouter', 59_999)).toBe('open' as BreakerVerdict);
    expect(b.consult('openrouter', 60_000)).toBe('half-open' as BreakerVerdict);
  });

  it('snapshot() exposes verdicts + remaining cooldown, never secrets', () => {
    const b = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0.5);
    b.recordFailure('gemini', 0, 120_000);
    const snap = b.snapshot(30_000);
    expect(snap.gemini).toEqual({ verdict: 'open', cooldownRemainingMs: 90_000 });
    expect(JSON.stringify(snap)).not.toMatch(/key|token|secret/i);
    // a clean breaker is absent from the snapshot (nothing to say)
    expect(snap.groq).toBeUndefined();
  });
});

describe('r357 L5 — the chain runner carries the 429\'s Retry-After to the breaker', () => {
  it('gemini 429s with Retry-After 120s → the NEXT turn skips gemini for that long and groq answers', async () => {
    const breakers = new AiProviderBreakers({ threshold: 1, cooldownMs: 60_000 }, () => 0.5);
    let t = 0;
    const calls: string[] = [];
    const gemini = SPEC({ id: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKey: 'k1', models: ['m1'] });
    const groq = SPEC({ id: 'groq', baseUrl: 'https://api.groq.com/openai/v1', apiKey: 'k2', models: ['g1'] });
    const chain = CHAIN([gemini, groq]);

    // Turn 1: gemini refuses with a 429 + Retry-After 120s; groq answers.
    await runProviderChain(
      chain,
      'chat',
      async (spec) => {
        calls.push(spec.id);
        if (spec.id === 'gemini') {
          throw new AiProviderError('provider HTTP 429: quota', 'rate_limited', 429, 120_000);
        }
        return 'ok';
      },
      { log: () => undefined, sleep: async () => {}, breakers, now: () => (t += 1) },
    );

    // Turn 2 (inside the Retry-After window): gemini is skipped whole.
    const second: string[] = [];
    const out = await runProviderChain(
      chain,
      'chat',
      async (spec) => {
        second.push(spec.id);
        return 'groq-reply';
      },
      { log: () => undefined, sleep: async () => {}, breakers, now: () => (t += 1) },
    );
    expect(second).toEqual(['groq']); // gemini never dialed — the provider's word ruled
    expect(out.providerId).toBe('groq');
    // And the first turn DID dial gemini twice (the r176a same-model
    // bounded retry) then groq — the failover worked.
    expect(calls).toEqual(['gemini', 'gemini', 'groq']);
  });
});
