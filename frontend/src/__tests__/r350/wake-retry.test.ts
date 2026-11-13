/**
 * R350 H4 — the cold-boot wake retry, pinned.
 *
 * The law (frontend/src/lib/api.ts): a GET/HEAD that dies on TRANSPORT
 * (timeout / network fault, no HTTP response) while the free-tier
 * instance cold-boots re-enters the pipeline after a bounded backoff
 * (2s/6s/12s, retry timeout 10s). Writes NEVER blind-retry; a server
 * that ANSWERED (any status) is awake — its refusal is final.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../../lib/api';

function transportFail(code: string): () => Promise<never> {
  return () => {
    const err = new ApiError(code === 'ECONNABORTED' ? 'timeout of 20000ms exceeded' : 'Network Error');
    err.code = code;
    throw err;
  };
}

afterEach(() => {
  api.defaults.adapter = null;
  vi.restoreAllMocks();
});

describe('R350 H4 — wake retry (cold-boot truth)', () => {
  it('retries a timed-out GET through the boot and resolves when the server answers', async () => {
    vi.useFakeTimers();
    let calls = 0;
    api.defaults.adapter = async () => {
      calls += 1;
      if (calls <= 2) return transportFail('ECONNABORTED')();
      return { data: { ok: 1 } };
    };
    const p = api.get('/me/dashboard');
    // two backoffs: 2s then 6s
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(6_000);
    const res = await p;
    expect((res.data as { ok: number }).ok).toBe(1);
    expect(calls).toBe(3);
    vi.useRealTimers();
  });

  it('NEVER blind-retries a POST (a write is not idempotent)', async () => {
    let calls = 0;
    api.defaults.adapter = async () => {
      calls += 1;
      return transportFail('NETWORK')();
    };
    await expect(api.post('/auth/login', {})).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('does not retry when the server ANSWERED (HTTP 503 is an answer, not a boot)', async () => {
    let calls = 0;
    api.defaults.adapter = async () => {
      calls += 1;
      const err = new ApiError('Request failed with status code 503');
      err.response = { data: { error: { code: 'UNAVAILABLE' } }, status: 503 };
      throw err;
    };
    await expect(api.get('/health')).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('spends the bounded budget (3 retries) then surfaces the error honestly', async () => {
    vi.useFakeTimers();
    let calls = 0;
    api.defaults.adapter = async () => {
      calls += 1;
      return transportFail('ECONNABORTED')();
    };
    const p = api.get('/courses');
    const expectation = expect(p).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(2_000 + 6_000 + 12_000 + 1_000);
    await expectation;
    expect(calls).toBe(4); // original + 3 retries — the budget is bounded
    vi.useRealTimers();
  });

  it('retry attempts carry the tighter 10s timeout', async () => {
    vi.useFakeTimers();
    const seenTimeouts: Array<number | undefined> = [];
    let calls = 0;
    api.defaults.adapter = async (cfg) => {
      calls += 1;
      seenTimeouts.push(cfg.timeout);
      if (calls === 1) return transportFail('NETWORK')();
      return { data: { ok: 1 } };
    };
    const p = api.get('/status');
    await vi.advanceTimersByTimeAsync(2_000);
    await p;
    expect(seenTimeouts[0]).toBeUndefined(); // the default 20s rides the config default
    expect(seenTimeouts[1]).toBe(10_000); // the wake retry tightens it
    vi.useRealTimers();
  });
});
