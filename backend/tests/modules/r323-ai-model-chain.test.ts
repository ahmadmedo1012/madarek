/**
 * Backend unit test — r323 B1.1: the model CHAIN (AI_MODELS fallback
 * order), the exponential backoff + jitter, and the per-model bounded
 * retry policy, across BOTH transports (JSON + SSE).
 *
 * DB-free (house canon): fetch stubbed at the global (the
 * ai-provider.test.ts pattern) and the chain driver's sleeper INJECTED
 * so backoff ordering is pinned without wall-clock waits.
 *
 * Policy under pin (runModelChain, lib/ai.ts):
 *  · the chain walks AI_MODELS in ORDER (fallback = the next member);
 *  · per model: ONE bounded same-model retry for fast-fail transients
 *    (rate_limited / transport / provider_error — the r176a policy,
 *    preserved per chain member);
 *  · a timeout is NEVER retried on the same model — it buys a fresh
 *    model instead (fall-through);
 *  · non-transient kinds (provider_rejected / invalid_response) skip
 *    straight to the next model;
 *  · the LAST error surfaces, classified as always;
 *  · the wire carries ONE pinned model per attempt (per-model failures
 *    stay attributable).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_BACKOFF_BASE_MS,
  AI_BACKOFF_CAP_MS,
  AI_CHAIN_MODEL_RETRIES,
  AiProviderError,
  backoffDelayMs,
  buildChatMessages,
  callProviderWithRetry,
  resolveModelChain,
  streamProviderWithChain,
  type AiProviderConfig,
  type AiRetrySleeper,
} from '../../src/lib/ai.js';

const MESSAGES = buildChatMessages('sys', [], 'سؤال');

const CFG_ONE: AiProviderConfig = {
  baseUrl: 'https://provider.example/v1',
  apiKey: 'sk-test-placeholder',
  model: 'solo/model:free',
  models: [],
  timeoutMs: 1000,
};

const CFG_CHAIN: AiProviderConfig = {
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'sk-test-placeholder',
  model: 'openrouter/free',
  models: ['a/model:free', 'b/model:free'],
  timeoutMs: 1000,
};

/** Immediate sleeper capturing the requested delays. */
function fakeSleeper(): { sleep: AiRetrySleeper; delays: number[] } {
  const delays: number[] = [];
  return { delays, sleep: async (ms) => { delays.push(ms); } };
}

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

const okBody = (model: string) =>
  new Response(
    JSON.stringify({
      model,
      choices: [{ message: { content: 'جواب' } }],
      usage: { prompt_tokens: 2, completion_tokens: 3 },
    }),
    { status: 200 },
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Pure: chain + backoff ─────────────────────────────────────────

describe('resolveModelChain (the ordered chain)', () => {
  it('AI_MODELS wins when configured — priority IS the list order', () => {
    expect(resolveModelChain(CFG_CHAIN)).toEqual(['a/model:free', 'b/model:free']);
  });

  it('a single-model config chains exactly one member (the configured id)', () => {
    expect(resolveModelChain(CFG_ONE)).toEqual(['solo/model:free']);
  });

  it('returns a COPY — callers cannot mutate the config through it', () => {
    const chain = resolveModelChain(CFG_CHAIN);
    chain.push('evil/model:free');
    expect(CFG_CHAIN.models).toEqual(['a/model:free', 'b/model:free']);
  });
});

describe('backoffDelayMs (exponential + jitter)', () => {
  it('attempt 0 keeps the historical [400, 800) window exactly', () => {
    expect(backoffDelayMs(0, () => 0)).toBe(AI_BACKOFF_BASE_MS);
    expect(backoffDelayMs(0, () => 0.999999)).toBe(AI_BACKOFF_BASE_MS * 2 - 1);
  });

  it('doubles per attempt (exponential), still inside its jitter band', () => {
    expect(backoffDelayMs(1, () => 0)).toBe(AI_BACKOFF_BASE_MS * 2);
    expect(backoffDelayMs(1, () => 0.999999)).toBe(AI_BACKOFF_BASE_MS * 4 - 1);
  });

  it('caps the exponential growth at AI_BACKOFF_CAP_MS', () => {
    expect(backoffDelayMs(10, () => 0)).toBe(AI_BACKOFF_CAP_MS);
    expect(backoffDelayMs(10, () => 0.999999)).toBeLessThan(AI_BACKOFF_CAP_MS * 2);
  });

  it('the per-model retry bound stays the r176a single retry (pinned)', () => {
    expect(AI_CHAIN_MODEL_RETRIES).toBe(1);
  });
});

// ─── JSON transport: the chain drives callOpenAiCompatible ─────────

describe('callProviderWithRetry — the model chain (fetch stubbed)', () => {
  it('walks AI_MODELS in order: a fails (exhausted) → b answers; each attempt pins ONE model on the wire', async () => {
    const models: Array<string | undefined> = [];
    let n = 0;
    vi.stubGlobal('fetch', async (_url: string | URL, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      models.push(typeof body.model === 'string' ? body.model : undefined);
      n += 1;
      return n <= 2
        ? new Response('{"error":{"message":"rate limit"}}', { status: 429 })
        : okBody('b/model:free');
    });
    const { sleep, delays } = fakeSleeper();
    const out = await callProviderWithRetry(CFG_CHAIN, MESSAGES, () => {}, sleep);
    expect(out.content).toBe('جواب');
    expect(out.model).toBe('b/model:free');
    // attempts: a, a(retry), b — the wire always pins the ONE model
    // (the OpenRouter `models` array is NOT sent by the chain driver).
    expect(models).toEqual(['a/model:free', 'a/model:free', 'b/model:free']);
    // backoff: one same-model retry delay, then the fall-through delay —
    // both inside the attempt-0 jitter band.
    expect(delays).toHaveLength(2);
    for (const d of delays) expect(d).toBeGreaterThanOrEqual(AI_BACKOFF_BASE_MS);
  });

  it('a timeout on model a is NOT retried there — it falls through to model b immediately', async () => {
    const models: string[] = [];
    vi.stubGlobal('fetch', async (_url: string | URL, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      models.push(String(body.model));
      if (body.model === 'a/model:free') {
        const e = new Error('aborted');
        e.name = 'TimeoutError';
        throw e;
      }
      return okBody('b/model:free');
    });
    const { sleep, delays } = fakeSleeper();
    const out = await callProviderWithRetry(CFG_CHAIN, MESSAGES, () => {}, sleep);
    expect(out.model).toBe('b/model:free');
    expect(models).toEqual(['a/model:free', 'b/model:free']);
    // No same-model retry happened; only the fall-through backoff ran.
    expect(delays).toHaveLength(1);
  });

  it('a non-transient 400 on model a skips the same-model retry and falls through', async () => {
    const models: string[] = [];
    vi.stubGlobal('fetch', async (_url: string | URL, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      models.push(String(body.model));
      return body.model === 'a/model:free'
        ? new Response('{"error":{"message":"bad param"}}', { status: 400 })
        : okBody('b/model:free');
    });
    const { sleep, delays } = fakeSleeper();
    const out = await callProviderWithRetry(CFG_CHAIN, MESSAGES, () => {}, sleep);
    expect(out.model).toBe('b/model:free');
    expect(models).toEqual(['a/model:free', 'b/model:free']);
    expect(delays).toHaveLength(1); // fall-through only
  });

  it('every model failing surfaces the LAST classified error (rate_limited) after bounded attempts', async () => {
    const models: string[] = [];
    vi.stubGlobal('fetch', async (_url: string | URL, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      models.push(String(body.model));
      return new Response('{"error":{"message":"rate limit"}}', { status: 429 });
    });
    const { sleep } = fakeSleeper();
    const err = await callProviderWithRetry(CFG_CHAIN, MESSAGES, () => {}, sleep).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('rate_limited');
    // per model: 1 attempt + 1 retry — bounded, never a loop.
    expect(models).toEqual(['a/model:free', 'a/model:free', 'b/model:free', 'b/model:free']);
  });

  it('a single-model config keeps the r176a contract: 429-then-200 succeeds on the same-model retry', async () => {
    const models: string[] = [];
    let n = 0;
    vi.stubGlobal('fetch', async (_url: string | URL, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      models.push(String(body.model));
      n += 1;
      return n === 1
        ? new Response('{"error":{"message":"rate limit"}}', { status: 429 })
        : okBody('solo/model:free');
    });
    const { sleep } = fakeSleeper();
    const out = await callProviderWithRetry(CFG_ONE, MESSAGES, () => {}, sleep);
    expect(out.content).toBe('جواب');
    expect(models).toEqual(['solo/model:free', 'solo/model:free']);
  });
});

// ─── SSE transport: the SAME chain grammar ─────────────────────────

describe('streamProviderWithChain — the model chain over SSE (fetch stubbed)', () => {
  it('a failing model a falls through to model b; deltas stream from the model that ANSWERED only', async () => {
    const models: string[] = [];
    const deltas: string[] = [];
    vi.stubGlobal('fetch', async (_url: string | URL, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      models.push(String(body.model));
      if (body.model === 'a/model:free') {
        // A 400 param rejection is non-transient: no same-model retry —
        // straight to the next chain member.
        return new Response('{"error":{"message":"unknown model id"}}', { status: 400 });
      }
      return streamResponse([
        sseChunk('مرحبًا'),
        `data: ${JSON.stringify({ choices: [{ delta: { content: ' بك' } }], model: 'b/model:free', usage: { prompt_tokens: 5, completion_tokens: 2 } })}\n\n`,
        'data: [DONE]\n\n',
      ]);
    });
    const { sleep } = fakeSleeper();
    const out = await streamProviderWithChain(
      CFG_CHAIN,
      MESSAGES,
      (d) => deltas.push(d),
      () => {},
      undefined,
      sleep,
    );
    expect(models).toEqual(['a/model:free', 'b/model:free']);
    expect(deltas.join('')).toBe('مرحبًا بك');
    expect(out.content).toBe('مرحبًا بك');
    expect(out.model).toBe('b/model:free');
    expect(out.outputTokens).toBe(2);
  });

  it('a model failing with empty content (invalid_response) surfaces — non-transient, no loop', async () => {
    vi.stubGlobal('fetch', async () =>
      streamResponse([sseChunk(' '), 'data: [DONE]\n\n']),
    );
    const { sleep } = fakeSleeper();
    const err = await streamProviderWithChain(
      { ...CFG_CHAIN, models: ['a/model:free'] },
      MESSAGES,
      () => {},
      () => {},
      undefined,
      sleep,
    ).catch((e: unknown) => e);
    // invalid_response is non-transient → no retry, no next model.
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('invalid_response');
  });

  it('a client abort short-circuits the chain — no retries, no fall-through', async () => {
    const models: string[] = [];
    vi.stubGlobal('fetch', async (_url: string | URL, init: { body: string }) => {
      const body = JSON.parse(init.body) as Record<string, unknown>;
      models.push(String(body.model));
      return new Response('{"error":{"message":"rate limit"}}', { status: 429 });
    });
    const controller = new AbortController();
    controller.abort();
    const { sleep } = fakeSleeper();
    const err = await streamProviderWithChain(
      CFG_CHAIN,
      MESSAGES,
      () => {},
      () => {},
      controller.signal,
      sleep,
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    // The abort surfaced the FIRST failure immediately: one call, no
    // retry, no model b.
    expect(models).toEqual(['a/model:free']);
  });
});
