/**
 * Backend unit test — the P4 AI provider layer (lib/ai.ts) + wiring
 * pins for the real-LLM chat path (ai.routes.ts).
 *
 * Two layers, both DB-free (house pattern):
 *  1. Pure helpers: history windowing (newest-first DB read →
 *     chronological request window), message assembly (system FIRST,
 *     user LAST), completion parsing (honest 0 tokens without a usage
 *     block; empty content is a failure, not a reply), mastery
 *     context lines (worst gaps first, same thresholds as
 *     masteryTier), and both system prompts (the anti-fabrication
 *     guardrails are the point).
 *  2. callOpenAiCompatible with fetch STUBBED (vi.stubGlobal): the
 *     exact request shape (URL join, Bearer, model/messages/
 *     temperature/max_tokens) and every failure mapping (HTTP
 *     non-2xx with status, transport, timeout name, non-JSON,
 *     unparseable payload) → always AiProviderError.
 *  3. Source-scan wiring pins (learning-logic technique — the file
 *     is the contract): the route must keep the mode switch
 *     (provider vs composer), the windowed history read, the REAL
 *     model + token counts in telemetry, and the NO-SILENT-FALLBACK
 *     catch (provider failure → one Arabic AppError, never a
 *     template reply wearing an LLM badge). env.ts keeps the
 *     openai-mode fail-closed superRefine.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_HISTORY_TURNS,
  AI_MAX_OUTPUT_TOKENS,
  AI_TEMPERATURE,
  AI_TIMEOUT_MS,
  AI_HISTORY_CHAR_CAP,
  AiProviderError,
  OPENROUTER_REFERER,
  OPENROUTER_TITLE,
  attributedModel,
  buildChatMessages,
  buildGenericSystemPrompt,
  buildStudentSystemPrompt,
  callOpenAiCompatible,
  callProviderWithRetry,
  classifyProviderFailure,
  clipHistoryContent,
  getAiProvider,
  isOpenRouterBaseUrl,
  masteryContextLines,
  masteryFactTier,
  parseChatCompletion,
  parseModelId,
  providerFailureMessage,
  providerLabelFromBaseUrl,
  windowHistory,
  type AiChatMessage,
  type AiFailureKind,
  type MasteryFact,
} from '../../src/lib/ai.js';

const aiRouteSource = readFileSync(new URL('../../src/http/routes/ai.routes.ts', import.meta.url), 'utf8');
const aiLibSource = readFileSync(new URL('../../src/lib/ai.ts', import.meta.url), 'utf8');
const envSource = readFileSync(new URL('../../src/env.ts', import.meta.url), 'utf8');
const renderSource = readFileSync(new URL('../../../render.yaml', import.meta.url), 'utf8');

// ─── Constants (the contract's ceilings) ──────────────────────────

describe('provider constants', () => {
  it('pins the request ceilings — concise replies, bounded cost, 45s default wait', () => {
    // r176a: 800→1200 — free-router reasoning models can spend part of
    // the completion budget on hidden reasoning; 800 produced empty-
    // content failures on exactly those models. The prompt still
    // mandates brevity — the ceiling is a guard, not a target.
    expect(AI_MAX_OUTPUT_TOKENS).toBe(1200);
    expect(AI_TEMPERATURE).toBe(0.4);
    expect(AI_TIMEOUT_MS).toBe(45_000);
  });

  it('pins the history window at 12 messages (6 user+assistant pairs)', () => {
    expect(AI_HISTORY_TURNS).toBe(12);
  });

  it('r176a: pins the per-message HISTORY clip so the window cannot overflow small free-model contexts', () => {
    expect(AI_HISTORY_CHAR_CAP).toBe(1600);
  });
});

// ─── Pure: history windowing + message assembly ───────────────────

describe('windowHistory (newest-first DB read → chronological window)', () => {
  it('keeps the NEWEST maxMessages entries and restores chronological order', () => {
    // The bounded read arrives newest-first: [5,4,3,2,1,0] for a
    // conversation whose chronological order is 0..5. The newest 3 are
    // [5,4,3]; windowed chronologically that is [3,4,5].
    const rows = [5, 4, 3, 2, 1, 0];
    expect(windowHistory(rows, 3)).toEqual([3, 4, 5]);
  });

  it('keeps everything (re-oriented) when the conversation is shorter than the window', () => {
    expect(windowHistory([2, 1, 0], 12)).toEqual([0, 1, 2]);
  });

  it('maxMessages 0 → empty (the window is off, not everything)', () => {
    expect(windowHistory([1, 0], 0)).toEqual([]);
  });

  it('does not mutate the input (the DB array belongs to the caller)', () => {
    const rows = [3, 2, 1, 0];
    windowHistory(rows, 2);
    expect(rows).toEqual([3, 2, 1, 0]);
  });
});

describe('buildChatMessages (system first, user last)', () => {
  const history: AiChatMessage[] = [
    { role: 'user', content: 'سؤال أول' },
    { role: 'assistant', content: 'جواب أول' },
  ];

  it('assembles system → history → user, in that order', () => {
    const msgs = buildChatMessages('النظام', history, 'سؤال جديد');
    expect(msgs.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(msgs[0]).toEqual({ role: 'system', content: 'النظام' });
    expect(msgs.at(-1)).toEqual({ role: 'user', content: 'سؤال جديد' });
  });

  it('the user message is LAST even with a long history — truncation can never eat the ask', () => {
    const long: AiChatMessage[] = Array.from({ length: 40 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as AiChatMessage['role'],
      content: `turn ${i}`,
    }));
    const msgs = buildChatMessages('sys', long, 'the ask');
    expect(msgs.at(-1)!.content).toBe('the ask');
    expect(msgs[0]!.role).toBe('system');
  });
});

// ─── Pure: completion parsing (the honesty boundary) ──────────────

describe('parseChatCompletion', () => {
  it('parses content + usage + the provider-reported model verbatim (r175)', () => {
    const out = parseChatCompletion({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      choices: [{ message: { content: 'جواب النموذج' } }],
      usage: { prompt_tokens: 210, completion_tokens: 95 },
    });
    expect(out).toEqual({
      content: 'جواب النموذج',
      inputTokens: 210,
      outputTokens: 95,
      model: 'deepseek/deepseek-chat-v3-0324:free',
    });
  });

  it('a missing usage block records 0 tokens and a missing model records null — never estimated, never fabricated', () => {
    const out = parseChatCompletion({ choices: [{ message: { content: 'جواب' } }] });
    expect(out.inputTokens).toBe(0);
    expect(out.outputTokens).toBe(0);
    expect(out.model).toBeNull();
  });

  it('an empty/whitespace/non-string model degrades to null (absent metadata, not a bad id)', () => {
    for (const model of ['', '   ', 7, null]) {
      const out = parseChatCompletion({ model, choices: [{ message: { content: 'جواب' } }] });
      expect(out.model).toBeNull();
    }
  });

  it('non-numeric or negative token values degrade to 0 (floor on valid numbers)', () => {
    const out = parseChatCompletion({
      choices: [{ message: { content: 'جواب' } }],
      usage: { prompt_tokens: '210', completion_tokens: -5 },
    });
    expect(out.inputTokens).toBe(0);
    expect(out.outputTokens).toBe(0);
    expect(parseChatCompletion({
      model: 'm',
      choices: [{ message: { content: 'جواب' } }],
      usage: { prompt_tokens: 3.7, completion_tokens: 2 },
    })).toEqual({ content: 'جواب', inputTokens: 3, outputTokens: 2, model: 'm' });
  });

  it('empty / whitespace / missing content is a provider failure, not a reply', () => {
    expect(() => parseChatCompletion({ choices: [{ message: { content: '   ' } }] })).toThrow();
    expect(() => parseChatCompletion({ choices: [{ message: { content: '' } }] })).toThrow();
    expect(() => parseChatCompletion({ choices: [] })).toThrow();
    expect(() => parseChatCompletion({})).toThrow();
  });
});

// ─── Pure: r175 model attribution + provider labels ───────────────

describe('parseModelId (provider-reported model validation)', () => {
  it('a valid slug survives verbatim (trimmed)', () => {
    expect(parseModelId('deepseek/deepseek-chat-v3-0324:free')).toBe('deepseek/deepseek-chat-v3-0324:free');
    expect(parseModelId('  gpt-4o-mini  ')).toBe('gpt-4o-mini');
  });

  it('absent/empty/gigantic/control-laden values are null (absent metadata)', () => {
    expect(parseModelId(undefined)).toBeNull();
    expect(parseModelId(42)).toBeNull();
    expect(parseModelId('')).toBeNull();
    expect(parseModelId('   ')).toBeNull();
    expect(parseModelId('x'.repeat(201))).toBeNull();
    expect(parseModelId('bad\nmodel')).toBeNull();
    expect(parseModelId('bad\u0000model')).toBeNull();
  });
});

describe('attributedModel (the per-response attribution rule)', () => {
  it('the provider-reported id wins verbatim', () => {
    expect(attributedModel('qwen/qwen-2.5-7b-instruct:free', 'openrouter/free')).toBe(
      'qwen/qwen-2.5-7b-instruct:free',
    );
  });

  it('absent metadata degrades to the configured ROUTER id, clearly flagged — never a silent exact-model claim', () => {
    expect(attributedModel(null, 'openrouter/free')).toBe('openrouter/free (unattributed)');
    expect(attributedModel(undefined, 'test-model')).toBe('test-model (unattributed)');
    expect(attributedModel('   ', 'test-model')).toBe('test-model (unattributed)');
  });
});

describe('providerLabelFromBaseUrl (the honest vendor label)', () => {
  it('openai is openai; openrouter is openrouter — the OpenAI-compatible transport never relabels the vendor', () => {
    expect(providerLabelFromBaseUrl('https://api.openai.com/v1')).toBe('openai');
    expect(providerLabelFromBaseUrl('https://openrouter.ai/api/v1')).toBe('openrouter');
  });

  it('known compatible hosts map to their stable labels', () => {
    expect(providerLabelFromBaseUrl('https://api.groq.com/openai/v1')).toBe('groq');
    expect(providerLabelFromBaseUrl('https://api.deepseek.com/v1')).toBe('deepseek');
    expect(providerLabelFromBaseUrl('https://api.groq.com')).toBe('groq');
  });

  it('an unknown compatible host is labeled by its hostname (honest, never a wrong vendor name)', () => {
    expect(providerLabelFromBaseUrl('https://llm.internal.example/v1')).toBe('llm.internal.example');
  });

  it('an unparseable URL degrades to the generic compatible label', () => {
    expect(providerLabelFromBaseUrl('not a url')).toBe('compatible');
  });
});

describe('isOpenRouterBaseUrl (the OpenRouter-only header gate)', () => {
  it('matches openrouter.ai ONLY (never a lookalike host)', () => {
    expect(isOpenRouterBaseUrl('https://openrouter.ai/api/v1')).toBe(true);
    expect(isOpenRouterBaseUrl('https://openrouter.ai')).toBe(true);
    expect(isOpenRouterBaseUrl('https://api.openai.com/v1')).toBe(false);
    expect(isOpenRouterBaseUrl('https://evil-openrouter.ai.example.com/v1')).toBe(false);
    expect(isOpenRouterBaseUrl('garbage')).toBe(false);
  });
});

// ─── Pure: mastery context + system prompts ───────────────────────

describe('masteryFactTier (same thresholds as ai.routes masteryTier)', () => {
  it('<0.5 gap, <0.8 developing, else strong', () => {
    expect(masteryFactTier(0)).toBe('فجوة');
    expect(masteryFactTier(0.49)).toBe('فجوة');
    expect(masteryFactTier(0.5)).toBe('قيد التطوّر');
    expect(masteryFactTier(0.79)).toBe('قيد التطوّر');
    expect(masteryFactTier(0.8)).toBe('متقن');
    expect(masteryFactTier(1)).toBe('متقن');
  });
});

describe('masteryContextLines (worst gaps first)', () => {
  const facts: MasteryFact[] = [
    { conceptName: 'الاستدعاء الذاتي', courseName: 'بنية المعطيات', level: 0.83 },
    { conceptName: 'الأشجار المتوازنة', courseName: 'بنية المعطيات', level: 0.31, lectureTitle: 'محاضرة الأشجار' },
    { conceptName: 'الجداول المبعثرة', courseName: 'الخوارزميات', level: 0.62 },
  ];

  it('sorts ascending by level — the model leads with what the student most needs', () => {
    const lines = masteryContextLines(facts);
    expect(lines[0]).toContain('الأشجار المتوازنة');
    expect(lines.at(-1)).toContain('الاستدعاء الذاتي');
  });

  it('each line carries concept, course, Math.round percent, and the tier', () => {
    const line = masteryContextLines([facts[0]!])[0]!;
    expect(line).toBe('- الاستدعاء الذاتي (بنية المعطيات): 83% — متقن');
  });

  it('a lecture title appends the pointer; its absence keeps the line bare', () => {
    expect(masteryContextLines([facts[1]!])[0]).toContain('محاضرة ذات صلة: «محاضرة الأشجار»');
    expect(masteryContextLines([facts[2]!])[0]).not.toContain('محاضرة ذات صلة');
  });

  it('0.499 renders as 50% while its tier stays فجوة (Math.round, pinned)', () => {
    expect(masteryContextLines([{ conceptName: 'س', courseName: 'ج', level: 0.499 }])[0]).toContain('50% — فجوة');
  });
});

describe('buildStudentSystemPrompt', () => {
  it('carries the persona, the gap-first focus, and the anti-fabrication guardrails', () => {
    const p = buildStudentSystemPrompt(['- مفهوم (مقرر): 40% — فجوة']);
    expect(p).toContain('مساعد مدارك الدراسيّ');
    expect(p).toContain('لا تختلق');
    expect(p).toContain('ركّز على فجوات الطالب');
    expect(p).toContain('- مفهوم (مقرر): 40% — فجوة');
  });

  it('no mastery rows → the prompt says so honestly instead of an empty context block', () => {
    expect(buildStudentSystemPrompt([])).toContain('لا توجد بيانات إتقان مسجّلة');
  });
});

describe('buildGenericSystemPrompt', () => {
  it('has the guardrails but NO mastery block (roles other than students have none)', () => {
    const p = buildGenericSystemPrompt();
    expect(p).toContain('لا تختلق');
    expect(p).not.toContain('إتقان');
  });
});

// ─── getAiProvider resolution (default test env) ──────────────────

describe('getAiProvider (boot-frozen resolution)', () => {
  it('the default (unset) test env resolves to the LOCAL composer mode', () => {
    // env.AI_PROVIDER defaults to 'local' — the route's mode switch
    // reads null and composeReply answers.
    expect(getAiProvider()).toBeNull();
  });

  it('the defensive branch requires provider AND key AND model (source pin)', () => {
    // A future env regression must degrade to the local composer, never
    // crash requests — this is that branch.
    expect(aiLibSource).toContain("env.AI_PROVIDER === 'openai' && env.AI_API_KEY && env.AI_MODEL");
  });

  it('r176a: the round-trip ceiling honors the AI_TIMEOUT_MS env knob with a sane default (source pins)', () => {
    // env.ts validates the bounds; the provider resolution threads the
    // value through with the lib default as fallback.
    expect(envSource).toContain('AI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(90_000).optional()');
    expect(aiLibSource).toContain('timeoutMs: env.AI_TIMEOUT_MS ?? AI_TIMEOUT_MS');
  });
});

// ─── callOpenAiCompatible (fetch stubbed — the wire contract) ─────

const CFG = {
  baseUrl: 'https://provider.example/v1/',
  apiKey: 'sk-test-placeholder',
  model: 'test-model',
  timeoutMs: 1000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('callOpenAiCompatible — request shape', () => {
  it('joins the URL (trailing slash stripped), Bearer-auths, and sends the pinned body', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          model: 'echoed-model-id',
          choices: [{ message: { content: 'جواب' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    });
    const out = await callOpenAiCompatible(CFG, buildChatMessages('sys', [], 'سؤال'));
    expect(out).toEqual({ content: 'جواب', inputTokens: 10, outputTokens: 5, model: 'echoed-model-id' });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://provider.example/v1/chat/completions');
    const init = calls[0]!.init as { headers: Record<string, string>; body: string; signal: AbortSignal };
    expect(init.headers.Authorization).toBe('Bearer sk-test-placeholder');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body) as Record<string, unknown>;
    expect(body.model).toBe('test-model');
    expect(body.temperature).toBe(AI_TEMPERATURE);
    expect(body.max_tokens).toBe(AI_MAX_OUTPUT_TOKENS);
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'سؤال' },
    ]);
    // The timeout rides as an abort signal (AbortSignal.timeout).
    expect(init.signal).toBeInstanceOf(AbortSignal);
    // r175: a NON-OpenRouter base URL carries NO OpenRouter headers —
    // unrelated request behavior must not change.
    expect(init.headers['HTTP-Referer']).toBeUndefined();
    expect(init.headers['X-Title']).toBeUndefined();
  });

  it('r175: an OpenRouter base URL carries the HTTP-Referer/X-Title attribution headers — and only there', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          model: 'qwen/qwen-2.5-7b-instruct:free',
          choices: [{ message: { content: 'جواب' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    });
    const out = await callOpenAiCompatible(
      { ...CFG, baseUrl: 'https://openrouter.ai/api/v1' },
      buildChatMessages('sys', [], 'سؤال'),
    );
    expect(out.model).toBe('qwen/qwen-2.5-7b-instruct:free');
    const init = calls[0]!.init as { headers: Record<string, string> };
    expect(init.headers['HTTP-Referer']).toBe(OPENROUTER_REFERER);
    expect(init.headers['X-Title']).toBe(OPENROUTER_TITLE);
    expect(OPENROUTER_REFERER).toBe('https://madarek.onrender.com');
    expect(OPENROUTER_TITLE).toBe('Madarek');
  });
});

describe('callOpenAiCompatible — every failure is a CLASSIFIED AiProviderError (r176a)', () => {
  it('HTTP 429 carries the status, a body excerpt (LOG-only), and kind=rate_limited', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":{"message":"quota exceeded"}}', { status: 429 }));
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).status).toBe(429);
    expect((err as AiProviderError).kind).toBe('rate_limited');
    expect((err as AiProviderError).message).toContain('HTTP 429');
    expect((err as AiProviderError).message).toContain('quota exceeded');
  });

  it('HTTP 400 (param/model rejection) is kind=provider_rejected, distinct from 429 and 5xx', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":{"message":"temperature not supported"}}', { status: 400 }));
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect((err as AiProviderError).kind).toBe('provider_rejected');
    expect((err as AiProviderError).status).toBe(400);
  });

  it('HTTP 500 is kind=provider_error', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":{"message":"upstream blew up"}}', { status: 502 }));
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect((err as AiProviderError).kind).toBe('provider_error');
    expect((err as AiProviderError).status).toBe(502);
  });

  it('transport failure (fetch TypeError) maps to kind=transport', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('transport');
    expect((err as AiProviderError).message).toContain('transport failure');
  });

  it('a TimeoutError name maps to kind=timeout (DOMException is not Error on every runtime)', async () => {
    vi.stubGlobal('fetch', async () => {
      const e = new Error('The operation was aborted due to timeout');
      e.name = 'TimeoutError';
      throw e;
    });
    const err = await callOpenAiCompatible({ ...CFG, timeoutMs: 45_000 }, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('timeout');
    expect((err as AiProviderError).message).toBe('provider timeout after 45000ms');
  });

  it('a 200 with a non-JSON body is kind=invalid_response', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>gateway hijack</html>', { status: 200 }));
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('invalid_response');
    expect((err as AiProviderError).message).toContain('non-JSON');
  });

  it('a 200 with an empty choice content is kind=invalid_response (not an empty reply)', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }));
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('invalid_response');
    expect((err as AiProviderError).message).toContain('no message content');
  });
});

// ─── r176a: the failure taxonomy, client messages, and bounded retry ──

describe('classifyProviderFailure (the single classifier)', () => {
  it('AiProviderError carries its own kind through the classifier', () => {
    for (const kind of ['timeout', 'rate_limited', 'provider_rejected', 'provider_error', 'transport', 'invalid_response'] as const) {
      expect(classifyProviderFailure(new AiProviderError('x', kind))).toBe(kind);
    }
  });

  it('a raw TimeoutError-shaped error classifies as timeout; anything raw is transport', () => {
    const timeoutish = new Error('aborted');
    timeoutish.name = 'TimeoutError';
    expect(classifyProviderFailure(timeoutish)).toBe('timeout');
    expect(classifyProviderFailure(new TypeError('fetch failed'))).toBe('transport');
  });
});

describe('providerFailureMessage (r176a — one message per failure class)', () => {
  const ALL: AiFailureKind[] = ['timeout', 'rate_limited', 'provider_rejected', 'provider_error', 'transport', 'invalid_response'];
  it('every kind maps to a DISTINCT, non-empty Arabic message', () => {
    const messages = ALL.map(providerFailureMessage);
    expect(messages.every((m) => m.length > 10)).toBe(true);
    expect(new Set(messages).size).toBe(ALL.length - 1); // provider_error and transport intentionally share the generic line
  });

  it('rate_limited tells the student to WAIT (free-tier minute quota)', () => {
    expect(providerFailureMessage('rate_limited')).toContain('انتظر دقيقة');
  });

  it('timeout invites a retry that re-routes (free router picks a different model)', () => {
    expect(providerFailureMessage('timeout')).toContain('أعد المحاولة');
  });
});

describe('callProviderWithRetry (ONE bounded retry, fast-fail transients only)', () => {
  const MESSAGES = buildChatMessages('sys', [], 'سؤال');
  const logs: Array<[Record<string, unknown>, string]> = [];
  const log = (obj: Record<string, unknown>, msg: string) => logs.push([obj, msg]);

  it('a 429-then-200 sequence SUCCEEDS on the retry: two wire calls, one completion, retry logged', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls += 1;
      return calls === 1
        ? new Response('{"error":{"message":"rate limit"}}', { status: 429 })
        : new Response(JSON.stringify({ choices: [{ message: { content: 'ردّ بعد المحاولة' } }], usage: { prompt_tokens: 1, completion_tokens: 2 }, model: 'm1' }), { status: 200 });
    });
    const out = await callProviderWithRetry(CFG, MESSAGES, log);
    expect(out.content).toBe('ردّ بعد المحاولة');
    expect(calls).toBe(2);
    expect(logs.at(-1)![1]).toContain('retrying once');
  });

  it('a 429-twice sequence surfaces the rate_limited failure (no second retry, no loop)', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls += 1;
      return new Response('{"error":{"message":"rate limit"}}', { status: 429 });
    });
    const err = await callProviderWithRetry(CFG, MESSAGES, log).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('rate_limited');
    expect(calls).toBe(2); // 1 + exactly one retry — never more
  });

  it('a timeout is NOT retried (the first attempt already burned the whole ceiling)', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls += 1;
      const e = new Error('aborted');
      e.name = 'TimeoutError';
      throw e;
    });
    const err = await callProviderWithRetry(CFG, MESSAGES, log).catch((e: unknown) => e);
    expect((err as AiProviderError).kind).toBe('timeout');
    expect(calls).toBe(1);
  });

  it('a 400 param rejection is NOT retried (non-transient — retrying the same payload cannot succeed)', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls += 1;
      return new Response('{"error":{"message":"bad param"}}', { status: 400 });
    });
    const err = await callProviderWithRetry(CFG, MESSAGES, log).catch((e: unknown) => e);
    expect((err as AiProviderError).kind).toBe('provider_rejected');
    expect(calls).toBe(1);
  });

  it('an invalid_response (empty content) is NOT retried', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls += 1;
      return new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 });
    });
    const err = await callProviderWithRetry(CFG, MESSAGES, log).catch((e: unknown) => e);
    expect((err as AiProviderError).kind).toBe('invalid_response');
    expect(calls).toBe(1);
  });
});

describe('clipHistoryContent (r176a — bounded history payload)', () => {
  it('clips each HISTORY message to the cap with an ellipsis marker; short messages pass verbatim', () => {
    const long = 'أ'.repeat(4000);
    const out = clipHistoryContent(
      [
        { role: 'user', content: long },
        { role: 'assistant', content: 'ردّ قصير' },
      ],
      1600,
    );
    expect(out[0]!.content).toHaveLength(1601); // 1600 chars + the ellipsis
    expect(out[0]!.content.endsWith('…')).toBe(true);
    expect(out[1]!.content).toBe('ردّ قصير');
    expect(out.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('maxChars ≤ 0 clips everything to nothing (defensive bound)', () => {
    expect(clipHistoryContent([{ role: 'user', content: 'x' }], 0)).toEqual([]);
  });
});

// ─── Source-scan wiring pins (the route is the contract) ──────────

describe('ai.routes.ts — the P4 mode switch', () => {
  it('resolves the provider once at boot (module level) and switches on it', () => {
    expect(aiRouteSource).toContain('const aiProvider = getAiProvider();');
    expect(aiRouteSource).toContain('aiProvider\n      ? await composeReplyWithProvider(');
    expect(aiRouteSource).toContain(': { reply: await composeReply(');
  });

  it('the real path builds messages and calls the provider through the lib helpers', () => {
    // r176a: the route calls through the retry wrapper (which wraps
    // callOpenAiCompatible) — one attempt + at most one bounded retry.
    expect(aiRouteSource).toContain('await callProviderWithRetry(');
    expect(aiRouteSource).toContain('buildChatMessages(system, history, message)');
    expect(aiRouteSource).toContain('buildStudentSystemPrompt(masteryContextLines(');
    expect(aiRouteSource).toContain('buildGenericSystemPrompt()');
    expect(aiRouteSource).toContain('isMasteryAwareRole(role)');
  });

  it('r176a: the history window is also content-clipped (AI_HISTORY_CHAR_CAP) on the wire', () => {
    expect(aiRouteSource).toContain('history = clipHistoryContent(');
    expect(aiRouteSource).toContain('AI_HISTORY_CHAR_CAP');
  });

  it('loads the conversation history windowed + chronological, and drops stored system rows', () => {
    expect(aiRouteSource).toContain('take: AI_HISTORY_TURNS');
    expect(aiRouteSource).toContain('windowHistory(rows, AI_HISTORY_TURNS)');
    expect(aiRouteSource).toContain(".filter((m) => m.role !== 'system')");
  });

  it('telemetry records the REAL model and token counts; the assistant message carries output tokens', () => {
    expect(aiRouteSource).toContain('model: engine.model');
    expect(aiRouteSource).toContain('inputTokens: engine.inputTokens');
    expect(aiRouteSource).toContain('outputTokens: engine.outputTokens');
    expect(aiRouteSource).toContain('tokens: engine.outputTokens');
  });

  it('r175: the per-RESPONSE attribution flows through attributedModel; the provider label is boot-frozen from the base URL', () => {
    expect(aiRouteSource).toContain(
      "const aiProviderLabel = aiProvider ? providerLabelFromBaseUrl(aiProvider.baseUrl) : 'local';",
    );
    expect(aiRouteSource).toContain('model: attributedModel(completion.model, aiProvider!.model)');
    expect(aiRouteSource).toContain('engine: aiProviderLabel');
    expect(aiRouteSource).toContain('provider: aiProviderLabel');
  });

  it('NO silent fallback: a provider failure maps to ONE classified Arabic AppError — composeReply never runs in the catch', () => {
    expect(aiRouteSource).toContain("e.name === 'AiProviderError'");
    // r176a: the classified message matrix, not one fixed string.
    expect(aiRouteSource).toContain('providerFailureMessage(failureKind)');
    const catchStart = aiRouteSource.indexOf('} catch (e) {');
    const catchEnd = aiRouteSource.indexOf('next(e);', catchStart);
    const catchBlock = aiRouteSource.slice(catchStart, catchEnd);
    expect(catchBlock).not.toContain('composeReply(');
    // Failure telemetry is attributed to the attempted model.
    expect(catchBlock).toContain('model: aiProvider?.model');
    // r176a: the persisted errorMessage is the CLASSIFIED kind — the
    // provider response-body excerpt (which rides err.message) must
    // stay log-only, never in the DB.
    expect(catchBlock).toContain('classifyProviderFailure(e)');
    expect(catchBlock).toContain("`${failureKind}${failureDetail}`.slice(0, 200)");
  });

  it('GET /config exposes the honest surface (label + configured model, null in local mode)', () => {
    expect(aiRouteSource).toContain("router.get('/config'");
    expect(aiRouteSource).toContain('model: aiProvider?.model ?? null');
  });

  it('the local composer path and its transaction shape are untouched', () => {
    // composeReply keeps its own query and template branches.
    expect(aiRouteSource).toContain('const GENERIC_RESPONSES = [');
    expect(aiRouteSource).toContain('export function worstGapMastery');
    expect(aiRouteSource).toContain('conversationTitle(message)');
  });
});

describe('env.ts — the openai fail-closed superRefine', () => {
  it('names the missing AI vars at boot (skipped in test mode, like the s3 ruling)', () => {
    expect(envSource).toContain("AI_PROVIDER: z.enum(['local', 'openai']).default('local')");
    expect(envSource).toContain("cfg.AI_PROVIDER === 'openai' && !isTest");
    expect(envSource).toContain("aiMissing.push('AI_API_KEY')");
    expect(envSource).toContain("aiMissing.push('AI_MODEL')");
    expect(envSource).toContain('AI_PROVIDER=openai requires: ');
  });
});

describe('render.yaml — the AI vars are opt-in on Render', () => {
  it('all four AI vars are sync:false (never required by the dashboard)', () => {
    for (const key of ['AI_PROVIDER', 'AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL']) {
      const i = renderSource.indexOf(`- key: ${key}`);
      expect(i).toBeGreaterThan(-1);
      expect(renderSource.slice(i, i + key.length + 45)).toContain('sync: false');
    }
  });
});
