/**
 * R351 X2b — POST /api/v1/internal/tick, the route belt.
 *
 * Pins (app-level, through the real Express pipeline):
 *  · no CRON_SECRET configured → 503 fail-closed (never an open runner);
 *  · wrong secret → 401, uniform body, no job side effects;
 *  · right secret (Bearer AND ?key= forms) → 200 with the tick report;
 *  · the report reflects the claim outcome (fresh slots run).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

// CRON_SECRET must exist BEFORE the env module (and the app) parse it.
process.env.CRON_SECRET = 'tick_secret_0123456789abcdef';

vi.mock('../../src/db.js', () => ({
  prisma: {
    tickRun: {
      create: vi.fn(async () => {
        throw Object.assign(new Error('P2002'), { code: 'P2002' });
      }),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => ({})),
    },
  },
  withRetry: vi.fn(),
}));

// The jobs are tick-jobs' collaborators — mock them so the route belt
// asserts the HTTP contract, not the sweep internals (tick.test.ts owns
// those).
vi.mock('../../src/lib/mail-outbox.js', () => ({
  drainOutbox: vi.fn(async () => ({ picked: 2, sent: 2, failed: 0, suppressed: 0, skippedProviderOff: 0 })),
  queueMail: vi.fn(),
  startMailOutboxWorker: vi.fn(),
  stopMailOutboxWorker: vi.fn(),
}));
vi.mock('../../src/scheduler.js', () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  runLoginEventRetentionSweep: vi.fn(async () => ({ ran: true, result: { deleted: 0, batches: 0, capped: false } })),
  runAssignmentDueSweep: vi.fn(async () => true),
  runWeeklyDigestSweep: vi.fn(async () => true),
}));

// The app is imported DYNAMICALLY, inside beforeAll — a static import
// would hoist above the process.env assignment at the top of this file
// and env.ts would parse without the secret (the mail-webhook pattern).
let baseUrl: string;
let server: ReturnType<ReturnType<typeof import('../../src/app.js')['createApp']>['listen']>;

beforeAll(async () => {
  const { createApp } = await import('../../src/app.js');
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const post = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers } });

describe('POST /api/v1/internal/tick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers 200 with the report for the right Bearer secret', async () => {
    const res = await post('/api/v1/internal/tick', { authorization: 'Bearer tick_secret_0123456789abcdef' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ok: boolean; report: { slots: Array<{ key: string; ran: boolean }> } } };
    expect(body.data.ok).toBe(true);
    const keys = body.data.report.slots.map((s) => s.key).sort();
    expect(keys).toEqual(['tick', 'tick-daily', 'tick-weekly']);
    // The mocked claim wins every slot → every job ran.
    expect(body.data.report.slots.every((s) => s.ran)).toBe(true);
  });

  it('accepts the ?key= form (external pingers)', async () => {
    const res = await post('/api/v1/internal/tick?key=tick_secret_0123456789abcdef');
    expect(res.status).toBe(200);
  });

  it('401s the wrong secret without running anything', async () => {
    const res = await post('/api/v1/internal/tick', { authorization: 'Bearer wrong-secret' });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('401s a missing secret', async () => {
    const res = await post('/api/v1/internal/tick');
    expect(res.status).toBe(401);
  });

  it('503s fail-closed when CRON_SECRET is not configured', async () => {
    // Re-import the whole graph with the secret absent: env.ts parses
    // process.env at module load, so resetModules + dynamic import gives
    // us an app whose env has no secret.
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    vi.resetModules();
    try {
      const { createApp: freshCreateApp } = await import('../../src/app.js');
      const freshServer = freshCreateApp().listen(0);
      const freshUrl = `http://127.0.0.1:${(freshServer.address() as AddressInfo).port}`;
      const res = await fetch(`${freshUrl}/api/v1/internal/tick`, { method: 'POST' });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('TICK_DISABLED');
      await new Promise<void>((resolve) => freshServer.close(() => resolve()));
    } finally {
      process.env.CRON_SECRET = previous;
      // Restore the module graph for the other tests in this file.
      vi.resetModules();
    }
  });
});
