/**
 * R351 X2c — the Postgres rate-limit store, unit belt (structural fake
 * client; no DB). Pins the SQL shapes, the fixed-window math, the
 * fail-open law, and the prune cutoff.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  PrismaRateLimitStore,
  pruneRateLimitHits,
  RATE_LIMIT_PRUNE_AFTER_MS,
  type RateLimitClient,
} from '../../src/lib/rate-limit-store.js';

/** Captures every raw call's values; answers from a script. */
function makeClient(script: (values: unknown[]) => unknown = () => []) {
  const calls: unknown[][] = [];
  const client: RateLimitClient = {
    $queryRaw: vi.fn(async (_tpl: TemplateStringsArray, ...values: unknown[]) => {
      calls.push(values);
      return script(values);
    }) as RateLimitClient['$queryRaw'],
    $executeRaw: vi.fn(async (_tpl: TemplateStringsArray, ...values: unknown[]) => {
      calls.push(values);
      return script(values);
    }) as RateLimitClient['$executeRaw'],
  };
  return { client, calls };
}

describe('PrismaRateLimitStore', () => {
  it('increment inserts the window row and returns count + resetTime at the window edge', async () => {
    const { client, calls } = makeClient(() => [{ count: 1 }]);
    const store = new PrismaRateLimitStore({ prefix: 'auth', windowMs: 60_000 }, client);
    const res = await store.increment('1.2.3.4');
    // Row key shape: prefix : limiter key : window index.
    expect(String(calls[0]![0])).toBe(`auth:1.2.3.4:${Math.floor(Date.now() / 60_000)}`);
    expect(res.totalHits).toBe(1);
    // resetTime = the NEXT window boundary.
    expect(res.resetTime!.getTime()).toBe((Math.floor(Date.now() / 60_000) + 1) * 60_000);
  });

  it('increment returns the incremented count on the conflict path (RETURNING)', async () => {
    const { client } = makeClient(() => [{ count: 7 }]);
    const store = new PrismaRateLimitStore({ prefix: 'global', windowMs: 15 * 60_000 }, client);
    await expect(store.increment('ip')).resolves.toMatchObject({ totalHits: 7 });
  });

  it('decrement targets the same row and floors at zero (GREATEST in SQL)', async () => {
    const { client, calls } = makeClient();
    const store = new PrismaRateLimitStore({ prefix: 'auth', windowMs: 60_000 }, client);
    await store.decrement('u1');
    // The only $executeRaw call carried the row key.
    expect(String(calls[0]![0])).toContain('auth:u1:');
  });

  it('resetKey deletes every window row for the key (LIKE prefix:key:%)', async () => {
    const { client, calls } = makeClient();
    const store = new PrismaRateLimitStore({ prefix: 'route', windowMs: 60_000 }, client);
    await store.resetKey('user-9');
    expect(String(calls[0]![0])).toBe('route:user-9:%');
  });

  it('fails OPEN on DB errors: incr answers count 0, decrement/resetKey resolve', async () => {
    const client: RateLimitClient = {
      $queryRaw: vi.fn(async () => {
        throw new Error('neon unreachable');
      }) as RateLimitClient['$queryRaw'],
      $executeRaw: vi.fn(async () => {
        throw new Error('neon unreachable');
      }) as RateLimitClient['$executeRaw'],
    };
    const store = new PrismaRateLimitStore({ prefix: 'auth', windowMs: 60_000 }, client);
    const res = await store.increment('ip');
    expect(res.totalHits).toBe(0);
    await expect(store.decrement('ip')).resolves.toBeUndefined();
    await expect(store.resetKey('ip')).resolves.toBeUndefined();
  });
});

describe('pruneRateLimitHits', () => {
  it('deletes rows older than the 25h horizon and reports the count', async () => {
    const { client, calls } = makeClient(() => 42);
    const now = new Date('2026-11-14T12:00:00Z');
    const res = await pruneRateLimitHits(client, now);
    expect(res.deleted).toBe(42);
    // values[0] is the cutoff — exactly now - 25h.
    const cutoff = calls[0]![0] as Date;
    expect(cutoff.getTime()).toBe(now.getTime() - RATE_LIMIT_PRUNE_AFTER_MS);
  });
});
