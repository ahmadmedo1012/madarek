import { runSync } from './lib/zu-sync/index.js';
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

async function runSyncGuarded(label: string) {
  if (syncInProgress) {
    logger.warn({ label }, '[scheduler] previous sync still running — skipping this tick');
    return;
  }
  syncInProgress = true;
  try {
    const r = await runSync();
    logger.info(
      {
        label,
        status: r.status,
        factsAdded: r.factsAdded,
        factsUpdated: r.factsUpdated,
        durationMs: r.durationMs,
      },
      '[scheduler] sync complete',
    );
  } catch (err) {
    // runSync swallows internally, but defense-in-depth
    logger.error({ err, label }, '[scheduler] sync threw');
  } finally {
    syncInProgress = false;
  }
}

export function startScheduler() {
  // Initial run after boot, once the server is responsive
  bootTimer = setTimeout(() => {
    void runSyncGuarded('initial');
  }, BOOT_DELAY_MS);

  // Recurring daily run
  dailyTimer = setInterval(() => {
    void runSyncGuarded('daily');
  }, ONE_DAY_MS);

  if (typeof dailyTimer.unref === 'function') dailyTimer.unref();
  if (typeof bootTimer.unref === 'function') bootTimer.unref();
}

export function stopScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
}
