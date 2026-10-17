/**
 * Backend unit test — `runSync` from `backend/src/lib/zu-sync/index.ts`.
 *
 * DB-free contract test with a mocked Prisma client, a tiny mocked
 * STATIC_FACTS source and a mocked pino logger. Pins down the
 * guarantees the admin sync page relies on:
 *   - fact add / update / refresh / stale transitions
 *   - SyncRun finalized exactly once on both success and failure paths
 *     (finally block) — a mid-loop throw must not strand it in RUNNING
 *   - stale RUNNING rows (>15 min) are auto-failed before a new run row
 *     is created
 *   - failures surface through the structured logger (logger.error),
 *     never `console.error` (12-8 hand-off #3)
 *   - r179d (phase-5): a run for ONE institution never touches another
 *     institution's rows — every prisma call carries the run institution
 *     (reap, run-row create, fact upserts, stale-marking, key listing),
 *     and the default no-opts run stays on the showcase institution
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
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
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { runSync, STALE_RUNNING_RUN_MS, DEFAULT_SYNC_INSTITUTION_ID } from '../../src/lib/zu-sync/index';
import { prisma } from '../../src/db.js';
import { logger } from '../../src/logger.js';

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

// runSync failures must surface on the structured logger (12-8 hand-off
// #3: console.error → logger.error) — the spy pins the pino call shape.
const loggerError = vi.mocked(logger.error);

beforeEach(() => {
  vi.clearAllMocks();
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
    factFindUnique.mockImplementation((async ({
      where,
    }: {
      where: { institutionId_key: { institutionId: string; key: string } };
    }) => {
      const key = where.institutionId_key.key; // r179: composite (institution, key) PK
      if (key === 'name.ar') return null; // new fact → create
      if (key === 'founded')
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
    const updatedKeys = factUpdate.mock.calls.map(
      (c) => (c[0] as { where: { institutionId_key: { key: string } } }).where.institutionId_key.key,
    );
    expect(updatedKeys).toContain('founded');
    expect(updatedKeys).toContain('motto');

    // A fact in the DB but not in the source is flagged stale.
    expect(factUpdateMany).toHaveBeenCalledWith({
      where: { institutionId: DEFAULT_SYNC_INSTITUTION_ID, key: { in: ['ghost'] } },
      data: { isStale: true },
    });
    // r166b (E2 #1 — D17-3): the run notes are Arabic user-facing text
    // (rendered verbatim on /admin/sync) — the key list rides along.
    expect(result.notes).toBe('تم وسم 1 من الحقول كقديمة');
    const finalizeData = syncRunUpdate.mock.calls[0]![0].data as Record<string, unknown>;
    expect(finalizeData.notes).toBe('تم وسم 1 من الحقول كقديمة: ghost');
  });

  it('clears the stale flag on a fact whose value matches again', async () => {
    factFindUnique.mockImplementation((async ({
      where,
    }: {
      where: { institutionId_key: { institutionId: string; key: string } };
    }) => {
      const key = where.institutionId_key.key; // r179: composite (institution, key) PK
      if (key === 'name.ar') {
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
    // r166b (E2 #1 — D17-3): the clean-run note is Arabic with proper
    // count forms (3 → «حقول») and the source label translated, the
    // Latin slug riding along in parentheses for support.
    expect(data.notes).toBe('تمت مزامنة 3 حقول من المصدر الثابت (static-markdown).');
    expect(result.notes).toBeNull();
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
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith(
      { err: expect.any(Error), source: 'static-markdown' },
      '[sync] run failed',
    );
  });

  it('does not mask the sync outcome when the finalizing write itself fails', async () => {
    factFindUnique.mockResolvedValue(null);
    factFindMany.mockResolvedValue([]);
    syncRunUpdate.mockRejectedValueOnce(new Error('row gone'));

    const result = await runSync();

    // The sync succeeded; the bookkeeping failure is logged, not thrown.
    expect(result.status).toBe('SUCCESS');
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith(
      { err: expect.any(Error), runId: 'run-1' },
      '[sync] failed to finalize SyncRun row',
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

// ── r179d (phase-5): per-institution scoping ────────────────────────
//
// The Zawia static source is the ZAWIA SHOWCASE institution's source,
// not a global default for every university. These pins enforce that
// a run for institution B can never read, write, or stale-mark
// institution A's rows: EVERY prisma call (reap, run-row create, fact
// upsert, stale-marking, key listing) must carry the run institution.
describe('runSync — institution scoping (r179d)', () => {
  const INST_A = 'inst-zawia-showcase';
  const INST_B = 'inst-other-university';

  it('threads an explicit institutionId through EVERY prisma call', async () => {
    // All facts missing → the create path; no stale keys → findMany [].
    factFindUnique.mockResolvedValue(null);
    factFindMany.mockResolvedValue([]);

    await runSync({ institutionId: INST_B });

    // Reap (stale RUNNING rows) is scoped to the run institution.
    expect(syncRunUpdateMany).toHaveBeenCalledTimes(1);
    expect(syncRunUpdateMany.mock.calls[0]![0].where?.institutionId).toBe(INST_B);

    // The run row itself is created FOR the institution.
    expect(syncRunCreate).toHaveBeenCalledWith({
      data: { source: 'static-markdown', institutionId: INST_B, status: 'RUNNING' },
    });

    // Every fact create carries the institution (composite PK half).
    expect(factCreate).toHaveBeenCalledTimes(3);
    for (const call of factCreate.mock.calls) {
      expect(call[0]!.data.institutionId).toBe(INST_B);
    }

    // The unseen-key listing (stale-marking source) is scoped.
    expect(factFindMany).toHaveBeenCalledWith({
      where: { institutionId: INST_B },
      select: { key: true },
    });
  });

  it('stale-marks ONLY the run institution\'s unseen keys — the where-clause never names another institution', async () => {
    factFindUnique.mockResolvedValue(null);
    // B's own DB keys, none present in the mocked STATIC_FACTS source.
    factFindMany.mockResolvedValue([{ key: 'ghost-b' } as never]);

    await runSync({ institutionId: INST_B });

    expect(factUpdateMany).toHaveBeenCalledTimes(1);
    const call = factUpdateMany.mock.calls[0]![0];
    expect(call.where).toEqual({ institutionId: INST_B, key: { in: ['ghost-b'] } });
    expect(JSON.stringify(call.where)).not.toContain(INST_A);
  });

  it('the same key may exist in BOTH institutions (composite PK): A\'s run updates only A\'s row', async () => {
    // Both institutions already hold 'name.ar' — with DIFFERENT values.
    const rowFor = (value: string) => ({
      key: 'name.ar',
      value,
      category: 'identity',
      source: 'zu.edu.ly:about',
      syncedAt: new Date(),
      isStale: false,
    });
    factFindUnique.mockImplementation((async ({ where }: {
      where: { institutionId_key: { institutionId: string; key: string } };
    }) =>
      where.institutionId_key.key === 'name.ar'
        ? rowFor(`قيمة ${where.institutionId_key.institutionId}`)
        : null
    ) as unknown as FactFindUniqueImpl);
    factFindMany.mockResolvedValue([]);

    await runSync({ institutionId: INST_A });

    // Every upsert targets A's composite key — B's row is never read
    // for update, created, or written by any call in this run.
    const touchedInstitutions = factUpdate.mock.calls.map(
      (c) => (c[0] as { where: { institutionId_key: { institutionId: string } } }).where.institutionId_key.institutionId,
    );
    expect(touchedInstitutions.length).toBeGreaterThan(0);
    expect(touchedInstitutions.every((id) => id === INST_A)).toBe(true);
    expect(touchedInstitutions).not.toContain(INST_B);
  });

  it('the stale-RUNNING reap fails only the RUN institution\'s orphaned runs', async () => {
    factFindUnique.mockResolvedValue(null);
    factFindMany.mockResolvedValue([]);

    await runSync({ institutionId: INST_B });

    expect(syncRunUpdateMany).toHaveBeenCalledTimes(1);
    const where = syncRunUpdateMany.mock.calls[0]![0].where as Record<string, unknown>;
    expect(where.institutionId).toBe(INST_B);
    expect(where.status).toBe('RUNNING');
  });

  it('runSync with no opts keeps the DEFAULT showcase institution (base r179 contract)', async () => {
    factFindUnique.mockResolvedValue(null);
    factFindMany.mockResolvedValue([]);

    await runSync();

    expect(syncRunCreate.mock.calls[0]![0].data.institutionId).toBe(DEFAULT_SYNC_INSTITUTION_ID);
    expect(factCreate.mock.calls[0]![0].data.institutionId).toBe(DEFAULT_SYNC_INSTITUTION_ID);
    expect(factFindMany.mock.calls[0]![0]).toMatchObject({ where: { institutionId: DEFAULT_SYNC_INSTITUTION_ID } });
  });
});
