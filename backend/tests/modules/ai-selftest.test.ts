/**
 * R354 V2 — the selftest ENGINE belt (lib/ai/selftest.ts).
 *
 * The engine is pure except its injected fetch: every test drives a
 * fake transport, zero network. Pins:
 *  · full success — models list + 1-token completion, latency/model
 *    reported;
 *  · key refusal (401) — ok:false with the provider's message, redacted;
 *  · the API key NEVER appears anywhere in the report (exact match and
 *    shape patterns both redacted);
 *  · wrong-model fallback — a 404 "model not found" walks to the next
 *    model in the spec;
 *  · timeout — an AbortError becomes `timeout after …ms`, never a crash;
 *  · empty env → aiMode 'local', zero probes (fail-open honesty);
 *  · two keys → 'chain' with both providers probed in the report.
 */
import { describe, expect, it } from 'vitest';

import { probeProvider, redactSecrets, runAiSelftest } from '../../src/lib/ai/selftest.js';

/** A canned fetch that answers by URL + method. */
function fakeFetch(
  routes: Array<{ match: (url: string, method: string) => boolean; status: number; body: unknown }>,
): (url: string, init: RequestInit) => Promise<Response> {
  return async (url: string, init: RequestInit) => {
    const method = (init.method as string) ?? 'GET';
    for (const r of routes) {
      if (r.match(url, method)) {
        return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ error: { message: `no route matched ${method} ${url}` } }), { status: 500 });
  };
}

const okModels = { data: [{ id: 'model-a' }, { id: 'model-b' }, { id: 'model-c' }] };
const okCompletion = { choices: [{ message: { content: 'ه' } }] };

describe('probeProvider', () => {
  it('reports a full success with model + latencies', async () => {
    const fetchImpl = fakeFetch([
      { match: (u, m) => m === 'GET' && u.endsWith('/models'), status: 200, body: okModels },
      { match: (u, m) => m === 'POST' && u.endsWith('/chat/completions'), status: 200, body: okCompletion },
    ]);
    const r = await probeProvider(
      { id: 'groq', baseUrl: 'https://api.groq.com/openai/v1/', apiKey: 'gsk_test_key_123456', models: ['model-a'] },
      fetchImpl,
    );
    expect(r.provider).toBe('groq');
    expect(r.baseUrl).toBe('https://api.groq.com/openai/v1/');
    expect(r.modelsList?.ok).toBe(true);
    expect(r.modelsList?.modelCount).toBe(3);
    expect(r.completion?.ok).toBe(true);
    expect(r.completion?.model).toBe('model-a');
    expect(r.completion?.replyChars).toBe(1);
    expect(r.error).toBeNull();
    // The key never leaks into the JSON serialization of the report.
    expect(JSON.stringify(r)).not.toContain('gsk_test_key_123456');
  });

  it('reports a key refusal (401) with a redacted provider message', async () => {
    const fetchImpl = fakeFetch([
      {
        match: (u, m) => m === 'GET' && u.endsWith('/models'),
        status: 401,
        body: { error: { message: 'Invalid API key gsk_test_key_123456' } },
      },
      {
        match: (u, m) => m === 'POST' && u.endsWith('/chat/completions'),
        status: 401,
        body: { error: { message: 'Invalid API key' } },
      },
    ]);
    const r = await probeProvider(
      { id: 'groq', baseUrl: 'https://api.groq.com/openai/v1', apiKey: 'gsk_test_key_123456', models: ['model-a'] },
      fetchImpl,
    );
    expect(r.modelsList?.ok).toBe(false);
    expect(r.modelsList?.status).toBe(401);
    expect(r.completion?.ok).toBe(false);
    expect(r.error).not.toContain('gsk_test_key_123456');
    expect(JSON.stringify(r)).not.toContain('gsk_test_key_123456');
  });

  it('falls through to the next model on a 404 model-not-found', async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      const method = (init.method as string) ?? 'GET';
      if (method === 'GET') return new Response(JSON.stringify(okModels), { status: 200 });
      const body = JSON.parse(init.body as string) as { model: string };
      calls.push(body.model);
      if (body.model === 'gone-model') {
        return new Response(JSON.stringify({ error: { message: `model ${body.model} not found` } }), { status: 404 });
      }
      return new Response(JSON.stringify(okCompletion), { status: 200 });
    };
    const r = await probeProvider(
      { id: 'gemini', baseUrl: 'https://example.test/v1', apiKey: 'AQ.testkey123456', models: ['gone-model', 'live-model'] },
      fetchImpl,
    );
    expect(calls).toEqual(['gone-model', 'live-model']);
    expect(r.completion?.ok).toBe(true);
    expect(r.completion?.model).toBe('live-model');
  });

  it('stops on a real refusal without trying further models', async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      const method = (init.method as string) ?? 'GET';
      if (method === 'GET') return new Response(JSON.stringify(okModels), { status: 200 });
      const body = JSON.parse(init.body as string) as { model: string };
      calls.push(body.model);
      return new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 });
    };
    const r = await probeProvider(
      { id: 'groq', baseUrl: 'https://example.test/v1', apiKey: 'gsk_x123456789', models: ['a', 'b'] },
      fetchImpl,
    );
    expect(calls).toEqual(['a']); // 429 is not a wrong-model 404 — stop.
    expect(r.completion?.ok).toBe(false);
    expect(r.completion?.status).toBe(429);
  });

  it('turns an AbortError into a timeout data point', async () => {
    const fetchImpl = async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    };
    const r = await probeProvider(
      { id: 'gemini', baseUrl: 'https://example.test/v1', apiKey: 'AQ.testkey123456', models: ['m'] },
      fetchImpl as unknown as (url: string, init: RequestInit) => Promise<Response>,
    );
    expect(r.modelsList?.ok).toBe(false);
    expect(r.modelsList?.status).toBe(0);
    expect(r.error).toMatch(/timeout after \d+ms/);
  });
});

describe('runAiSelftest', () => {
  it('returns local mode with zero probes for an empty env', async () => {
    const report = await runAiSelftest({}, fakeFetch([]));
    expect(report.aiMode).toBe('local');
    expect(report.providerCount).toBe(0);
    expect(report.probes).toEqual([]);
  });

  it('probes every configured provider and reports chain mode', async () => {
    const env = {
      GEMINI_API_KEY: 'AQ.gemtest123456',
      GROQ_API_KEY: 'gsk_groqtest123456',
    };
    const report = await runAiSelftest(
      env,
      fakeFetch([
        { match: (u, m) => m === 'GET' && u.endsWith('/models'), status: 200, body: okModels },
        { match: (u, m) => m === 'POST' && u.endsWith('/chat/completions'), status: 200, body: okCompletion },
      ]),
    );
    expect(report.aiMode).toBe('chain');
    expect(report.providerCount).toBe(2);
    expect(report.probes.map((p) => p.provider).sort()).toEqual(['gemini', 'groq']);
    expect(report.probes.every((p) => p.completion?.ok)).toBe(true);
    expect(report.region).toBeNull();
    expect(JSON.stringify(report)).not.toContain('AQ.gemtest123456');
    expect(JSON.stringify(report)).not.toContain('gsk_groqtest123456');
  });

  it('carries the VERCEL_REGION marker when present', async () => {
    const report = await runAiSelftest(
      { VERCEL_REGION: 'fra1' },
      fakeFetch([]),
    );
    expect(report.region).toBe('fra1');
  });
});

describe('redactSecrets', () => {
  it('redacts exact keys, token shapes, bearer headers, and key= params', () => {
    const out = redactSecrets('key gsk_abcdef123456 leaked Bearer sk-xyz987654321 ?key=AQ.abc12345678', [
      'gsk_abcdef123456',
    ]);
    expect(out).not.toContain('gsk_abcdef123456');
    expect(out).not.toContain('sk-xyz987654321');
    expect(out).not.toContain('AQ.abc12345678');
    expect(out).toContain('***');
  });

  it('truncates to 180 chars', () => {
    expect(redactSecrets('x'.repeat(500), []).length).toBeLessThanOrEqual(180);
  });
});
