/**
 * Backend unit test — `runSyncGuarded` overlap guard from
 * `backend/src/scheduler.ts`.
 *
 * The guard is the shared entry point for both the scheduler ticks and
 * the manual `POST /admin/sync/trigger` route. These tests pin down the
 * overlap contract (DB-free, `runSync` is mocked with manually-resolved
 * promises):
 *   - first caller wins and receives the result
 *   - concurrent callers while a sync is in flight are skipped
 *   - the guard is released on BOTH completion and failure, so a later
 *     call can run again (a stuck guard would silently stop all syncs)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SyncResult } from '../../src/lib/zu-sync/index.js';

vi.mock('../../src/lib/zu-sync/index.js', () => ({
  runSync: vi.fn(),
}));
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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

describe('runSyncGuarded', () => {
  beforeEach(() => {
    runSyncMock.mockReset();
  });

  it('runs the sync when none is in flight and returns its result', async () => {
    runSyncMock.mockResolvedValue(successResult('run-1'));

    const outcome = await runSyncGuarded('test');

    expect(outcome).toEqual({ ran: true, result: successResult('run-1') });
    expect(runSyncMock).toHaveBeenCalledTimes(1);
  });

  it('skips a call that arrives while a previous sync is still running', async () => {
    let release!: (v: SyncResult) => void;
    runSyncMock.mockImplementation(
      () => new Promise<SyncResult>((resolve) => { release = resolve; }),
    );

    const first = runSyncGuarded('first');
    const second = await runSyncGuarded('second');

    expect(second).toEqual({ ran: false, reason: 'overlap' });
    // The overlapping call must not have started a second sync.
    expect(runSyncMock).toHaveBeenCalledTimes(1);

    release(successResult('run-2'));
    await first;
  });

  it('releases the guard after completion so the next call runs again', async () => {
    runSyncMock.mockResolvedValue(successResult('a'));
    await runSyncGuarded('a');

    runSyncMock.mockResolvedValue(successResult('b'));
    const outcome = await runSyncGuarded('b');

    expect(outcome.ran).toBe(true);
    expect(runSyncMock).toHaveBeenCalledTimes(2);
  });

  it('releases the guard even when runSync throws, and surfaces the error', async () => {
    runSyncMock.mockRejectedValueOnce(new Error('db unreachable'));

    // The route relies on this rejection to answer with a 500.
    await expect(runSyncGuarded('boom')).rejects.toThrow('db unreachable');

    // …but the finally block must have freed the guard for the next call.
    runSyncMock.mockResolvedValue(successResult('after'));
    const outcome = await runSyncGuarded('after');
    expect(outcome.ran).toBe(true);
    expect(runSyncMock).toHaveBeenCalledTimes(2);
  });
});
