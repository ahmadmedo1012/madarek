/**
 * Backend unit test — LoginEvent retention in `backend/src/scheduler.ts`
 * (11-c hand-off: LoginEvent rows were never pruned, and the table is
 * attacker-inflatable — every failed login writes one, so a botnet can
 * grow it without bound while retaining PII: emails, IPs, user agents).
 *
 * DB-free:
 *  - `pruneLoginEvents` is driven directly with hand-rolled fake
 *    clients (structural slice of the Prisma client — no mocking).
 *  - `runLoginEventRetentionSweep` + `startScheduler`/`stopScheduler`
 *    lifecycle run against the mocked db/zu-sync/logger modules,
 *    including fake-timer ticks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SyncResult } from '../../src/lib/zu-sync/index.js';

vi.mock('../../src/lib/zu-sync/index.js', () => ({
  runSync: vi.fn(),
}));
vi.mock('../../src/db.js', () => ({
  prisma: {
    loginEvent: { findMany: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  LOGIN_EVENT_PRUNE_BATCH_SIZE,
  LOGIN_EVENT_PRUNE_MAX_BATCHES,
  LOGIN_EVENT_RETENTION_DAYS,
  pruneLoginEvents,
  runLoginEventRetentionSweep,
  startScheduler,
  stopScheduler,
} from '../../src/scheduler';
import { runSync } from '../../src/lib/zu-sync/index.js';
import { prisma } from '../../src/db.js';

const runSyncMock = vi.mocked(runSync);
const findManyMock = vi.mocked(prisma.loginEvent.findMany);
const deleteManyMock = vi.mocked(prisma.loginEvent.deleteMany);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Prisma delegates return PrismaPromise, a Promise branded via
 * `[Symbol.toStringTag]` — a plain async function can never satisfy
 * that structurally, so mock implementations need one cast (same
 * pattern as tests/modules/zu-sync-run.test.ts).
 */
type LoginEventFindManyImpl = NonNullable<Parameters<typeof findManyMock.mockImplementation>[0]>;

// ── Hand-rolled fakes for the direct pruneLoginEvents tests ─────────

/** In-memory LoginEvent table honouring the prune's exact query shape. */
class FakeLoginEventTable {
  rows: Array<{ id: string; createdAt: Date }> = [];
  findCalls = 0;
  deleteCalls = 0;

  readonly loginEvent = {
    findMany: async (args: {
      where: { createdAt: { lt: Date } };
      select: { id: true };
      take: number;
    }): Promise<Array<{ id: string }>> => {
      this.findCalls += 1;
      return this.rows
        .filter((r) => r.createdAt < args.where.createdAt.lt)
        .slice(0, args.take)
        .map((r) => ({ id: r.id }));
    },
    deleteMany: async (args: {
      where: { id: { in: string[] } };
    }): Promise<{ count: number }> => {
      this.deleteCalls += 1;
      const ids = new Set(args.where.id.in);
      const before = this.rows.length;
      this.rows = this.rows.filter((r) => !ids.has(r.id));
      return { count: before - this.rows.length };
    },
  };
}

/** Client whose eligible set never drains — pins the batch-cap valve. */
const neverDrainingClient = () => {
  const page = Array.from({ length: LOGIN_EVENT_PRUNE_BATCH_SIZE }, (_, i) => ({
    id: `stale-${i}`,
  }));
  return {
    loginEvent: {
      findMany: async (): Promise<Array<{ id: string }>> => [...page],
      deleteMany: async (): Promise<{ count: number }> => ({
        count: LOGIN_EVENT_PRUNE_BATCH_SIZE,
      }),
    },
  };
};

/** Scripted pages for findMany, in order (deleteMany counts each page). */
const scriptedClient = (pages: Array<Array<{ id: string }>>) => {
  let call = 0;
  return {
    loginEvent: {
      findMany: async (): Promise<Array<{ id: string }>> => {
        const page = pages[call] ?? [];
        call += 1;
        return page;
      },
      deleteMany: async (): Promise<{ count: number }> => ({
        count: (pages[call - 1] ?? []).length,
      }),
    },
  };
};

// ── pruneLoginEvents — retention semantics ──────────────────────────

describe('pruneLoginEvents', () => {
  it('retention horizon must cover the 30-day /owner/login-analytics window', () => {
    // Cross-file constraint: GET /owner/login-analytics buckets the
    // last 30 days of LoginEvents. If retention ever drops below that
    // window, the OWNER analytics page silently loses its oldest days.
    expect(LOGIN_EVENT_RETENTION_DAYS).toBeGreaterThanOrEqual(30);
  });

  it('deletes only rows strictly older than the horizon and reports the cutoff', async () => {
    const now = new Date('2026-01-15T00:00:00.000Z');
    const table = new FakeLoginEventTable();
    const day = (n: number) => new Date(now.getTime() - n * ONE_DAY_MS);
    table.rows = [
      { id: 'ancient', createdAt: day(365) },
      { id: 'edge-kept', createdAt: day(180) }, // exactly at the cutoff — kept (strict <)
      { id: 'edge-gone', createdAt: new Date(day(180).getTime() - 1) }, // 1ms older — gone
      { id: 'fresh', createdAt: day(30) },
    ];

    const result = await pruneLoginEvents(table, now);

    expect(result.cutoff).toEqual(new Date(now.getTime() - LOGIN_EVENT_RETENTION_DAYS * ONE_DAY_MS));
    expect(result.deleted).toBe(2);
    expect(result.batches).toBe(1);
    expect(result.capped).toBe(false);
    expect(table.rows.map((r) => r.id)).toEqual(['edge-kept', 'fresh']);
    expect(table.deleteCalls).toBe(1);
  });

  it('performs no delete when nothing is eligible', async () => {
    const table = new FakeLoginEventTable();
    table.rows = [{ id: 'fresh', createdAt: new Date() }];

    const result = await pruneLoginEvents(table, new Date());

    expect(result.deleted).toBe(0);
    expect(result.batches).toBe(0);
    expect(result.capped).toBe(false);
    expect(table.deleteCalls).toBe(0);
  });

  it('drains a backlog larger than one batch in multiple batches', async () => {
    const table = new FakeLoginEventTable();
    const total = LOGIN_EVENT_PRUNE_BATCH_SIZE * 2 + 30;
    table.rows = Array.from({ length: total }, (_, i) => ({
      id: `old-${i}`,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    }));

    const result = await pruneLoginEvents(table, new Date('2026-01-01T00:00:00.000Z'));

    expect(result.batches).toBe(3); // 5000 + 5000 + 30
    expect(result.deleted).toBe(total);
    expect(result.capped).toBe(false);
    expect(table.rows.length).toBe(0);
  });

  it('stops at the batch cap when the backlog exceeds the daily budget', async () => {
    const client = neverDrainingClient();

    const result = await pruneLoginEvents(client, new Date());

    expect(result.batches).toBe(LOGIN_EVENT_PRUNE_MAX_BATCHES);
    expect(result.deleted).toBe(LOGIN_EVENT_PRUNE_MAX_BATCHES * LOGIN_EVENT_PRUNE_BATCH_SIZE);
    expect(result.capped).toBe(true);
  });

  it('does not report capped when the final batch was a short page', async () => {
    const full = Array.from({ length: LOGIN_EVENT_PRUNE_BATCH_SIZE }, (_, i) => ({
      id: `full-${i}`,
    }));
    const short = Array.from({ length: 10 }, (_, i) => ({ id: `short-${i}` }));
    const client = scriptedClient([full, short]);

    const result = await pruneLoginEvents(client, new Date());

    expect(result.batches).toBe(2);
    expect(result.deleted).toBe(LOGIN_EVENT_PRUNE_BATCH_SIZE + 10);
    // Short final page means the predicate drained — no cap warning.
    expect(result.capped).toBe(false);
  });

  it('propagates client failures (the sweep wrapper owns the never-throw contract)', async () => {
    const client = {
      loginEvent: {
        findMany: async (): Promise<Array<{ id: string }>> => {
          throw new Error('connection reset');
        },
        deleteMany: async (): Promise<{ count: number }> => ({ count: 0 }),
      },
    };

    await expect(pruneLoginEvents(client, new Date())).rejects.toThrow('connection reset');
  });
});

// ── runLoginEventRetentionSweep — scheduler wrapper contract ────────

describe('runLoginEventRetentionSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the prune and reports its result', async () => {
    findManyMock.mockResolvedValue([]);
    deleteManyMock.mockResolvedValue({ count: 0 });

    const outcome = await runLoginEventRetentionSweep('test');

    expect(outcome).toEqual({
      ran: true,
      result: {
        cutoff: expect.any(Date),
        deleted: 0,
        batches: 0,
        capped: false,
      },
    });
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it('skips a tick that arrives while a previous sweep is still running', async () => {
    let releaseFind!: () => void;
    findManyMock.mockImplementation(
      (async () => {
        await new Promise<void>((resolve) => {
          releaseFind = resolve;
        });
        return [];
      }) as unknown as LoginEventFindManyImpl,
    );

    const first = runLoginEventRetentionSweep('first');
    const second = await runLoginEventRetentionSweep('second');

    expect(second).toEqual({ ran: false, reason: 'overlap' });
    // The overlapping tick must not have issued a second query.
    expect(findManyMock).toHaveBeenCalledTimes(1);

    releaseFind();
    await expect(first).resolves.toMatchObject({ ran: true });
  });

  it('never rejects when the prune fails, and releases the guard for the next tick', async () => {
    findManyMock.mockRejectedValueOnce(new Error('db unreachable'));

    await expect(runLoginEventRetentionSweep('boom')).resolves.toEqual({
      ran: false,
      reason: 'error',
    });

    // …but the finally block must have freed the guard for the next call.
    findManyMock.mockResolvedValue([]);
    const outcome = await runLoginEventRetentionSweep('after');
    expect(outcome.ran).toBe(true);
  });
});

// ── startScheduler / stopScheduler — timer lifecycle ────────────────

describe('scheduler timer lifecycle', () => {
  const successResult = (): SyncResult => ({
    runId: 'run-1',
    status: 'SUCCESS',
    factsAdded: 0,
    factsUpdated: 0,
    durationMs: 1,
    errorMsg: null,
    notes: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopScheduler();
    vi.useRealTimers();
  });

  it('boot tick runs the sync AND the retention sweep after the 5s delay', async () => {
    runSyncMock.mockResolvedValue(successResult());
    findManyMock.mockResolvedValue([]);

    startScheduler();
    expect(runSyncMock).not.toHaveBeenCalled();
    expect(findManyMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5_000);

    expect(runSyncMock).toHaveBeenCalledTimes(1);
    expect(runSyncMock).toHaveBeenCalledWith();
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  it('daily interval re-fires both jobs every 24h', async () => {
    runSyncMock.mockResolvedValue(successResult());
    findManyMock.mockResolvedValue([]);

    startScheduler();
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(ONE_DAY_MS);

    expect(runSyncMock).toHaveBeenCalledTimes(2); // boot + daily
    expect(findManyMock).toHaveBeenCalledTimes(2);
  });

  it('retention runs even when the sync rejects — the jobs are independent', async () => {
    runSyncMock.mockRejectedValue(new Error('sync down'));
    findManyMock.mockResolvedValue([]);

    startScheduler();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(runSyncMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  it('stopScheduler cancels both timers before anything fires', async () => {
    runSyncMock.mockResolvedValue(successResult());
    findManyMock.mockResolvedValue([]);

    startScheduler();
    stopScheduler();
    await vi.advanceTimersByTimeAsync(ONE_DAY_MS * 3);

    expect(runSyncMock).not.toHaveBeenCalled();
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
