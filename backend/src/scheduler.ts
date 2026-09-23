import { runSync, type SyncResult } from './lib/zu-sync/index.js';
import { logger } from './logger.js';

/**
 * Lightweight in-process scheduler.
 *
 * Render's free tier is single-process, so a setInterval-based ticker
 * is sufficient and avoids adding a job-queue dependency. The ticker:
 *  - runs once on boot (after a 5s delay so the server is healthy)
 *  - runs every 24 hours after that
 *  - never throws — errors are captured in SyncRun rows
 *
 * In a multi-instance deployment, replace this with a proper cron
 * (e.g. Render Cron Job, BullMQ, or pg-boss with a leader lock).
 *
 * Overlap guard: a boolean flag prevents a slow daily sync from
 * piling up if Neon is sluggish and the next 24h tick fires while
 * the previous is still in flight. Without this, two concurrent
 * sync runs could race on the same UniversityFact rows and waste
 * Neon compute on the free tier.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 5_000;

let dailyTimer: NodeJS.Timeout | null = null;
let bootTimer: NodeJS.Timeout | null = null;
let syncInProgress = false;

/**
 * Result of a guarded sync attempt.
 *
 * - `{ ran: true, result }` — this call executed the sync; `result`
 *   carries the outcome (runSync reports sync-level failures as
 *   `status: FAILED`, not as exceptions).
 * - `{ ran: false, reason: 'overlap' }` — another sync is still in
 *   flight, so this call was skipped.
 */
export type GuardedSyncOutcome =
  | { ran: true; result: SyncResult }
  | { ran: false; reason: 'overlap' };

/**
 * Single guarded entry point into runSync, shared by the scheduler
 * ticks AND the manual `POST /admin/sync/trigger` route. Exported so
 * the manual admin trigger cannot bypass the overlap guard and race
 * a scheduled run on the UniversityFact rows.
 *
 * The check-then-set of `syncInProgress` happens synchronously (no
 * await in between), so under concurrent callers exactly one wins
 * in the single-threaded event loop.
 */
export async function runSyncGuarded(label: string): Promise<GuardedSyncOutcome> {
  if (syncInProgress) {
    logger.warn({ label }, '[scheduler] previous sync still running — skipping this tick');
    return { ran: false, reason: 'overlap' };
  }
  syncInProgress = true;
  try {
    const result = await runSync();
    logger.info(
      {
        label,
        status: result.status,
        factsAdded: result.factsAdded,
        factsUpdated: result.factsUpdated,
        durationMs: result.durationMs,
      },
      '[scheduler] sync complete',
    );
    return { ran: true, result };
  } catch (err) {
    // runSync captures sync-level failures itself; this is defense-in-depth
    // for bookkeeping failures (e.g. the SyncRun row cannot be created).
    logger.error({ err, label }, '[scheduler] sync threw');
    throw err;
  } finally {
    syncInProgress = false;
  }
}

export function startScheduler() {
  // Initial run after boot, once the server is responsive.
  // runSyncGuarded logs its own errors; the .catch keeps a failing boot
  // callback from surfacing as an unhandled promise rejection.
  bootTimer = setTimeout(() => {
    runSyncGuarded('initial').catch(() => {});
  }, BOOT_DELAY_MS);

  // Recurring daily run (same no-unhandled-rejection contract).
  dailyTimer = setInterval(() => {
    runSyncGuarded('daily').catch(() => {});
  }, ONE_DAY_MS);

  if (typeof dailyTimer.unref === 'function') dailyTimer.unref();
  if (typeof bootTimer.unref === 'function') bootTimer.unref();
}

export function stopScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
}
