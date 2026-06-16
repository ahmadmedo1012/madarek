import { runSync } from './lib/zu-sync/index.js';

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
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 5_000;

let dailyTimer: NodeJS.Timeout | null = null;
let bootTimer: NodeJS.Timeout | null = null;

export function startScheduler() {
  // Initial run after boot, once the server is responsive
  bootTimer = setTimeout(async () => {
    try {
      const r = await runSync();
      // eslint-disable-next-line no-console
      console.log(`[scheduler] initial sync: ${r.status} (added=${r.factsAdded} updated=${r.factsUpdated} ${r.durationMs}ms)`);
    } catch (err) {
      // runSync swallows internally, but defense-in-depth
      // eslint-disable-next-line no-console
      console.error('[scheduler] initial sync threw', err);
    }
  }, BOOT_DELAY_MS);

  // Recurring daily run
  dailyTimer = setInterval(async () => {
    try {
      const r = await runSync();
      // eslint-disable-next-line no-console
      console.log(`[scheduler] daily sync: ${r.status} (added=${r.factsAdded} updated=${r.factsUpdated})`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[scheduler] daily sync threw', err);
    }
  }, ONE_DAY_MS);

  if (typeof dailyTimer.unref === 'function') dailyTimer.unref();
  if (typeof bootTimer.unref === 'function') bootTimer.unref();
}

export function stopScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
}
