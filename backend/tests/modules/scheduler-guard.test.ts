/**
 * Backend unit test — `runSyncGuarded` overlap guard from
 * `backend/src/scheduler.ts`.
 *
 * The guard is the shared entry point for both the scheduler ticks and
 * the manual `POST /admin/sync/trigger` route. r179d (phase-5): guards
 * are PER INSTITUTION — a run for institution A never blocks a trigger
 * for institution B (disjoint UniversityFact rows). These tests pin
 * down the overlap contract (DB-free, `runSync` is mocked with
 * manually-resolved promises):
 *   - first caller wins and receives the result
 *   - concurrent callers while a sync for the SAME institution is in
 *     flight are skipped
 *   - a concurrent caller for a DIFFERENT institution runs (the guard
 *     is keyed by institution, not a global flag)
 *   - the guard is released on BOTH completion and failure, so a later
 *     call can run again (a stuck guard would silently stop all syncs)
 *   - the runSync call carries the caller's institutionId + source
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SyncResult } from '../../src/lib/zu-sync/index.js';

vi.mock('../../src/lib/zu-sync/index.js', () => ({
  runSync: vi.fn(),
  INSTITUTION_SYNC_CONFIGS: [],
  findInstitutionSyncConfig: vi.fn(),
  PUBLIC_FACTS_DEFAULT_SLUG: 'zawia-showcase',
}));
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../src/db.js', () => ({
  prisma: { institution: { findMany: vi.fn() } },
}));

import { runSyncGuarded } from '../../src/scheduler';
import { runSync } from '../../src/lib/zu-sync/index.js';

const runSyncMock = vi.mocked(runSync);

const successResult = (runId: string): SyncResult => ({
  runId,
  status: 'SUCCESS',
  factsAdded: 3,
  factsUpdated: 2,
  durationMs: 10,
  errorMsg: null,
  notes: null,
});

const INST_A = 'inst-zawia-showcase';
const INST_B = 'inst-other';

describe('runSyncGuarded', () => {
  beforeEach(() => {
    runSyncMock.mockReset();
  });

  it('runs the sync when none is in flight and returns its result', async () => {
    runSyncMock.mockResolvedValue(successResult('run-1'));

    const outcome = await runSyncGuarded('test', { institutionId: INST_A, source: 'static-markdown' });

    expect(outcome).toEqual({ ran: true, result: successResult('run-1') });
    expect(runSyncMock).toHaveBeenCalledTimes(1);
    // r179d: the institution and its configured source thread through.
    expect(runSyncMock).toHaveBeenCalledWith({ institutionId: INST_A, source: 'static-markdown' });
  });

  it('skips a call that arrives while a sync for the SAME institution is still running', async () => {
    let release!: (v: SyncResult) => void;
    runSyncMock.mockImplementation(
      () => new Promise<SyncResult>((resolve) => { release = resolve; }),
    );

    const first = runSyncGuarded('first', { institutionId: INST_A });
    const second = await runSyncGuarded('second', { institutionId: INST_A });

    expect(second).toEqual({ ran: false, reason: 'overlap' });
    // The overlapping call must not have started a second sync.
    expect(runSyncMock).toHaveBeenCalledTimes(1);

    release(successResult('run-2'));
    await first;
  });

  it('lets a DIFFERENT institution run while one sync is in flight (per-institution guard)', async () => {
    let releaseA!: (v: SyncResult) => void;
    runSyncMock.mockImplementationOnce(
      () => new Promise<SyncResult>((resolve) => { releaseA = resolve; }),
    );
    runSyncMock.mockResolvedValueOnce(successResult('run-b'));

    const a = runSyncGuarded('a', { institutionId: INST_A });
    // B's trigger arrives while A's sync is mid-flight — the rows are
    // disjoint, so B must NOT be answered with an overlap skip.
    const b = await runSyncGuarded('b', { institutionId: INST_B, source: 'static-markdown' });

    expect(b).toEqual({ ran: true, result: successResult('run-b') });
    expect(runSyncMock).toHaveBeenCalledTimes(2);
    expect(runSyncMock).toHaveBeenNthCalledWith(2, { institutionId: INST_B, source: 'static-markdown' });

    releaseA(successResult('run-a'));
    await a;
  });

  it('releases the guard after completion so the next call runs again', async () => {
    runSyncMock.mockResolvedValue(successResult('a'));
    await runSyncGuarded('a', { institutionId: INST_A });

    runSyncMock.mockResolvedValue(successResult('b'));
    const outcome = await runSyncGuarded('b', { institutionId: INST_A });

    expect(outcome.ran).toBe(true);
    expect(runSyncMock).toHaveBeenCalledTimes(2);
  });

  it('releases the guard even when runSync throws, and surfaces the error', async () => {
    runSyncMock.mockRejectedValueOnce(new Error('db unreachable'));

    // The route relies on this rejection to answer with a 500.
    await expect(runSyncGuarded('boom', { institutionId: INST_A })).rejects.toThrow('db unreachable');

    // …but the finally block must have freed the guard for the next call.
    runSyncMock.mockResolvedValue(successResult('after'));
    const outcome = await runSyncGuarded('after', { institutionId: INST_A });
    expect(outcome.ran).toBe(true);
    expect(runSyncMock).toHaveBeenCalledTimes(2);
  });
});
