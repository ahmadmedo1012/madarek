/**
 * Backend unit test — `runSync` from `backend/src/lib/zu-sync/index.ts`.
 *
 * DB-free contract test with a mocked Prisma client and a tiny mocked
 * STATIC_FACTS source. Pins down the three guarantees the admin sync
 * page relies on:
 *   - fact add / update / refresh / stale transitions
 *   - SyncRun finalized exactly once on both success and failure paths
 *     (finally block) — a mid-loop throw must not strand it in RUNNING
 *   - stale RUNNING rows (>15 min) are auto-failed before a new run row
 *     is created
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { FactPatch } from '../../src/lib/zu-sync/static-source.js';

vi.mock('../../src/db.js', () => ({
  prisma: {
    syncRun: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'run-1', status: 'RUNNING' }),
      update: vi.fn().mockResolvedValue({ id: 'run-1' }),
    },
    universityFact: {
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));
vi.mock('../../src/lib/zu-sync/static-source.js', () => ({
  STATIC_FACTS: [
    { key: 'name.ar', value: 'جامعة الزاوية', category: 'identity', source: 'zu.edu.ly:about' },
    { key: 'founded', value: '1983', category: 'identity', source: 'zu.edu.ly:about' },
    { key: 'motto', value: 'same-value', category: 'strategic', source: 'zu.edu.ly:about' },
  ] satisfies FactPatch[],
}));

import { runSync, STALE_RUNNING_RUN_MS } from '../../src/lib/zu-sync/index';
import { prisma } from '../../src/db.js';

const syncRunUpdate = vi.mocked(prisma.syncRun.update);
const syncRunCreate = vi.mocked(prisma.syncRun.create);
const syncRunUpdateMany = vi.mocked(prisma.syncRun.updateMany);
const factFindUnique = vi.mocked(prisma.universityFact.findUnique);
const factCreate = vi.mocked(prisma.universityFact.create);
const factUpdate = vi.mocked(prisma.universityFact.update);
const factUpdateMany = vi.mocked(prisma.universityFact.updateMany);
const factFindMany = vi.mocked(prisma.universityFact.findMany);

/**
 * Prisma delegates return PrismaPromise, a Promise branded via
 * `[Symbol.toStringTag]: "PrismaPromise"` — a plain async function can
 * never satisfy that structurally, so mock implementations need one cast.
 * Everything inside the impl stays fully type-checked.
 */
type FactFindUniqueImpl = NonNullable<Parameters<typeof factFindUnique.mockImplementation>[0]>;

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('runSync — stale RUNNING reap', () => {
  it('auto-fails RUNNING runs older than 15 minutes before creating the new row', async () => {
    factFindUnique.mockResolvedValue(null);
    factFindMany.mockResolvedValue([]);

    await runSync();

    expect(syncRunUpdateMany).toHaveBeenCalledTimes(1);
    const call = syncRunUpdateMany.mock.calls[0]![0];
    expect(call.where?.status).toBe('RUNNING');
    // startedAt is a DateTimeFilter (lt: cutoff) — narrow it for assertions.
    const startedAtFilter = call.where?.startedAt as { lt: Date };
    const cutoff = startedAtFilter.lt as Date;
    expect(cutoff).toBeInstanceOf(Date);
    // The cutoff must be ~15 minutes in the past (±2s tolerance).
    const age = Date.now() - cutoff.getTime();
    expect(age).toBeGreaterThanOrEqual(STALE_RUNNING_RUN_MS - 2_000);
    expect(age).toBeLessThanOrEqual(STALE_RUNNING_RUN_MS + 2_000);
    expect(call.data.status).toBe('FAILED');
    expect(call.data.errorMsg).toMatch(/Run abandoned/i);

    // The reap happens BEFORE the new RUNNING row is created, so the new
    // run can never reap itself.
    const reapOrder = syncRunUpdateMany.mock.invocationCallOrder[0]!;
    const createOrder = syncRunCreate.mock.invocationCallOrder[0]!;
    expect(reapOrder).toBeLessThan(createOrder);
  });
});

describe('runSync — fact transitions', () => {
  it('creates missing facts, updates changed ones, refreshes unchanged ones', async () => {
    factFindUnique.mockImplementation((async ({ where }: { where: { key: string } }) => {
      if (where.key === 'name.ar') return null; // new fact → create
      if (where.key === 'founded')
        return {
          key: 'founded',
          value: '1980',
          category: 'identity',
          source: 'zu.edu.ly:about',
          syncedAt: new Date(),
          isStale: false,
        }; // changed → update
      return {
        key: 'motto',
        value: 'same-value',
        category: 'strategic',
        source: 'zu.edu.ly:about',
        syncedAt: new Date(),
        isStale: false,
      }; // unchanged → bump syncedAt
    }) as unknown as FactFindUniqueImpl);
    factFindMany.mockResolvedValue([{ key: 'ghost' } as never]);

    const result = await runSync();

    expect(result.status).toBe('SUCCESS');
    expect(result.factsAdded).toBe(1);
    expect(result.factsUpdated).toBe(1);

    expect(factCreate).toHaveBeenCalledTimes(1);
    expect(factCreate.mock.calls[0]![0].data.key).toBe('name.ar');

    expect(factUpdate).toHaveBeenCalledTimes(2); // 'founded' (changed) + 'motto' (bump)
    const updatedKeys = factUpdate.mock.calls.map((c) => (c[0] as { where: { key: string } }).where.key);
    expect(updatedKeys).toContain('founded');
    expect(updatedKeys).toContain('motto');

    // A fact in the DB but not in the source is flagged stale.
    expect(factUpdateMany).toHaveBeenCalledWith({
      where: { key: { in: ['ghost'] } },
      data: { isStale: true },
    });
    expect(result.notes).toBe('1 stale');
  });

  it('clears the stale flag on a fact whose value matches again', async () => {
    factFindUnique.mockImplementation((async ({ where }: { where: { key: string } }) => {
      if (where.key === 'name.ar') {
        // Same value as the source, but previously flagged stale.
        return {
          key: 'name.ar',
          value: 'جامعة الزاوية',
          category: 'identity',
          source: 'zu.edu.ly:about',
          syncedAt: new Date(),
          isStale: true,
        };
      }
      return null;
    }) as unknown as FactFindUniqueImpl);
    factFindMany.mockResolvedValue([]);

    const result = await runSync();

    expect(result.factsUpdated).toBe(1);
    const updateCall = factUpdate.mock.calls[0]![0];
    expect(updateCall.data.isStale).toBe(false);
  });
});

describe('runSync — SyncRun finalization', () => {
  it('records SUCCESS on the SyncRun row exactly once', async () => {
    factFindUnique.mockResolvedValue(null);
    factFindMany.mockResolvedValue([]);

    const result = await runSync();

    expect(syncRunUpdate).toHaveBeenCalledTimes(1);
    const data = syncRunUpdate.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.status).toBe('SUCCESS');
    expect(data.completedAt).toBeInstanceOf(Date);
    expect(data.factsAdded).toBe(3);
    expect(result.runId).toBe('run-1');
  });

  it('records FAILED when the fact loop throws mid-run (no stranded RUNNING row)', async () => {
    factFindUnique.mockRejectedValue(new Error('connection reset'));

    const result = await runSync();

    expect(result.status).toBe('FAILED');
    expect(result.errorMsg).toContain('connection reset');
    // A mid-loop throw must still finalize the row…
    expect(syncRunUpdate).toHaveBeenCalledTimes(1);
    const data = syncRunUpdate.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.status).toBe('FAILED');
    expect(data.errorMsg).toContain('connection reset');
    // …and not report phantom progress in the return value.
    expect(result.factsAdded).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('does not mask the sync outcome when the finalizing write itself fails', async () => {
    factFindUnique.mockResolvedValue(null);
    factFindMany.mockResolvedValue([]);
    syncRunUpdate.mockRejectedValueOnce(new Error('row gone'));

    const result = await runSync();

    // The sync succeeded; the bookkeeping failure is logged, not thrown.
    expect(result.status).toBe('SUCCESS');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[sync] failed to finalize SyncRun row',
      expect.any(Error),
    );
  });

  it('reports an unknown source as FAILED on the SyncRun row', async () => {
    const result = await runSync({ source: 'live-http' });

    expect(result.status).toBe('FAILED');
    expect(result.errorMsg).toContain('Unknown sync source');
    const data = syncRunUpdate.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.status).toBe('FAILED');
    // Source failure happens before any fact write.
    expect(factFindUnique).not.toHaveBeenCalled();
  });
});
