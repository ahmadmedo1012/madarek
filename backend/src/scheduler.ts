import { prisma } from './db.js';
import { logger } from './logger.js';

/**
 * Lightweight in-process scheduler.
 *
 * Render's free tier is single-process, so a setInterval-based ticker
 * is sufficient and avoids adding a job-queue dependency. The ticker
 * runs ONE daily job:
 *  - LoginEvent retention: prunes login telemetry older than
 *    LOGIN_EVENT_RETENTION_DAYS (boot + every 24h)
 * The job never throws into the timer callback — errors are captured
 * by the logger.
 *
 * R349 U2 — the university-facts sync job (the sync library) was RETIRED
 * with the demo-tenant purge: the owner's word «احذفهم نهائيًا» — the
 * project belongs to no university, and the facts feed (the model
 * + SyncRun + /admin/sync + /university/facts) is deleted. The
 * my-institution page now reads the signed-in user's OWN institution
 * (Institution + Faculty + contact profiles).
 *
 * LoginEvent retention is PLATFORM-LEVEL maintenance: LoginEvent rows
 * are login telemetry with no institution dimension (every attempt of
 * every institution writes platform telemetry read by the OWNER
 * login-analytics page), so the sweep stays global by design.
 *
 * In a multi-instance deployment, replace this with a proper cron
 * (e.g. Render Cron Job, BullMQ, or pg-boss with a leader lock).
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const BOOT_DELAY_MS = 5_000;

/**
 * LoginEvent retention horizon (11-c hand-off: rows are never pruned
 * on their own, and the table is attacker-inflatable — every failed
 * login writes one, so a botnet can grow it without bound while
 * retaining PII: emails, IPs, user agents).
 *
 * 180 days deliberately exceeds the 30-day window read by
 * GET /owner/login-analytics — do NOT lower it below that window
 * plus a healthy margin, or the OWNER analytics page silently loses
 * its oldest days.
 */
export const LOGIN_EVENT_RETENTION_DAYS = 180;

/**
 * Upper bound on rows deleted per sweep statement. Batching keeps each
 * DELETE small (index-backed id IN (…) of at most this many ids) so the
 * first sweep against a large attacker-inflated backlog can never turn
 * into one giant lock-heavy transaction on Neon's free tier.
 */
export const LOGIN_EVENT_PRUNE_BATCH_SIZE = 5_000;

/**
 * Safety valve: stop after this many batches per sweep (currently
 * 200 × 5,000 = 1M rows/day). The next daily sweep continues where
 * this one stopped, so a backlog larger than the cap drains over
 * multiple days instead of monopolizing the database in one run.
 */
export const LOGIN_EVENT_PRUNE_MAX_BATCHES = 200;

let dailyTimer: NodeJS.Timeout | null = null;
let bootTimer: NodeJS.Timeout | null = null;
let retentionInProgress = false;

export function startScheduler() {
  // Retention runs on boot: on Render's free tier the process is
  // restarted (or cold-started) far more often than a 24h interval
  // elapses, so the boot tick is the one that fires most reliably.
  // The sweep is cheap and idempotent in the steady state, and never
  // rejects by contract; the void call keeps a failing boot callback
  // from surfacing as an unhandled promise rejection.
  bootTimer = setTimeout(() => {
    void runLoginEventRetentionSweep('initial');
  }, BOOT_DELAY_MS);

  // Recurring daily run (same never-reject contract).
  dailyTimer = setInterval(() => {
    void runLoginEventRetentionSweep('daily');
  }, ONE_DAY_MS);

  if (typeof dailyTimer.unref === 'function') dailyTimer.unref();
  if (typeof bootTimer.unref === 'function') bootTimer.unref();
}

export function stopScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
}

// ── LoginEvent retention (11-c) ─────────────────────────────────────

/**
 * Minimal structural slice of the Prisma client — same pattern as
 * `lib/operational-alerts.ts`, keeps the prune unit-testable without a
 * database or module-level mocking.
 */
interface LoginEventRetentionClient {
  loginEvent: {
    findMany(args: {
      where: { createdAt: { lt: Date } };
      select: { id: true };
      take: number;
    }): Promise<Array<{ id: string }>>;
    deleteMany(args: { where: { id: { in: string[] } } }): Promise<{ count: number }>;
  };
}

export interface PruneLoginEventsResult {
  /** Rows strictly older than this instant were eligible for deletion. */
  cutoff: Date;
  /** Rows actually deleted by this sweep. */
  deleted: number;
  /** Number of find+delete batch statements executed. */
  batches: number;
  /** True when MAX_BATCHES was reached with rows still eligible — the backlog continues draining on the next sweep. */
  capped: boolean;
}

/**
 * Delete LoginEvent rows older than LOGIN_EVENT_RETENTION_DAYS, in
 * bounded batches (find ids by the `createdAt` index, then delete by
 * id list — Prisma's deleteMany has no `take`, so a single unconditional
 * deleteMany would be one huge transaction on the first run against an
 * attacker-inflated backlog).
 *
 * Pure with respect to its inputs (client + clock) — exported for unit
 * tests. Throws only if the client itself fails; the scheduler wrapper
 * below owns the never-throw contract.
 */
export async function pruneLoginEvents(
  client: LoginEventRetentionClient,
  now: Date = new Date(),
): Promise<PruneLoginEventsResult> {
  const cutoff = new Date(now.getTime() - LOGIN_EVENT_RETENTION_DAYS * ONE_DAY_MS);
  let deleted = 0;
  let batches = 0;
  let capped = false;

  while (true) {
    const rows = await client.loginEvent.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: LOGIN_EVENT_PRUNE_BATCH_SIZE,
    });
    // Empty page — everything older than the cutoff is gone.
    if (rows.length === 0) break;

    const res = await client.loginEvent.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    deleted += res.count;
    batches += 1;

    // Short page — this batch drained the predicate for this sweep.
    if (rows.length < LOGIN_EVENT_PRUNE_BATCH_SIZE) break;
    // Full page deleted and the safety valve is tripped: eligible rows
    // may remain. The next sweep continues from exactly this cutoff.
    if (batches >= LOGIN_EVENT_PRUNE_MAX_BATCHES) {
      capped = true;
      break;
    }
  }

  return { cutoff, deleted, batches, capped };
}

/**
 * Result of a guarded retention sweep attempt:
 * `ran: false` means this tick was skipped (overlap) or failed (error —
 * already logged here, never rethrown).
 */
export type RetentionSweepOutcome =
  | { ran: true; result: PruneLoginEventsResult }
  | { ran: false; reason: 'overlap' | 'error' };

/**
 * Scheduler-facing wrapper around pruneLoginEvents. Overlap-guard
 * discipline: a sweep still in flight skips the next tick instead of
 * stacking a second one on the same connection pool.
 *
 * Never rejects — a failing sweep is logged and reported as
 * `{ ran: false, reason: 'error' }` so the timer callback can fire it
 * with a plain `void` call (no unhandled-rejection risk).
 */
export async function runLoginEventRetentionSweep(label: string): Promise<RetentionSweepOutcome> {
  if (retentionInProgress) {
    logger.warn({ label }, '[scheduler] previous retention sweep still running — skipping this tick');
    return { ran: false, reason: 'overlap' };
  }
  retentionInProgress = true;
  try {
    const result = await pruneLoginEvents(prisma);
    if (result.deleted > 0 || result.capped) {
      logger.info(
        {
          label,
          deleted: result.deleted,
          batches: result.batches,
          capped: result.capped,
          cutoff: result.cutoff,
        },
        '[scheduler] login-event retention sweep complete',
      );
    }
    if (result.capped) {
      logger.warn(
        { label, batches: result.batches },
        '[scheduler] login-event retention sweep hit its batch cap — the remaining backlog drains on the next sweep',
      );
    }
    return { ran: true, result };
  } catch (err) {
    // Best-effort job: telemetry pruning must never take the process
    // down, and the next tick retries naturally.
    logger.error({ err, label }, '[scheduler] login-event retention sweep failed');
    return { ran: false, reason: 'error' };
  } finally {
    retentionInProgress = false;
  }
}
