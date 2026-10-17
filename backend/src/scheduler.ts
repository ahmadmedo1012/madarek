import {
  runSync,
  INSTITUTION_SYNC_CONFIGS,
  type InstitutionSyncConfig,
  type SyncResult,
} from './lib/zu-sync/index.js';
import { prisma } from './db.js';
import { logger } from './logger.js';

/**
 * Lightweight in-process scheduler.
 *
 * Render's free tier is single-process, so a setInterval-based ticker
 * is sufficient and avoids adding a job-queue dependency. The ticker
 * runs two independent daily jobs:
 *  - zu-sync: university facts (runs once on boot after a 5s delay so
 *    the server is healthy, then every 24 hours)
 *  - LoginEvent retention: prunes login telemetry older than
 *    LOGIN_EVENT_RETENTION_DAYS (also boot + every 24h)
 * Neither job ever throws into the timer callback — errors are
 * captured in SyncRun rows / the logger.
 *
 * r179d (phase-5) — background-job classification:
 *  - zu-sync writes INSTITUTIONAL data. Since phase-5 every run
 *    targets exactly ONE institution, and the scheduler only syncs
 *    the institutions with a CONFIGURED source
 *    (`INSTITUTION_SYNC_CONFIGS` in lib/zu-sync — today only the
 *    zawia-showcase institution; e.g. alandalus-demo has no configured
 *    source and is never synced). Institutions are resolved against
 *    the live ACTIVE rows, so a configured-but-missing institution is
 *    skipped (fresh/disposable databases never hit a dangling FK).
 *  - LoginEvent retention is PLATFORM-LEVEL maintenance: LoginEvent
 *    rows are login telemetry with no institution dimension (every
 *    attempt of every institution writes platform telemetry read by
 *    the OWNER login-analytics page), so the sweep stays global by
 *    design. No other background job exists in this codebase (the
 *    milestones/onboarding services are request-path, not cron).
 *
 * In a multi-instance deployment, replace this with a proper cron
 * (e.g. Render Cron Job, BullMQ, or pg-boss with a leader lock).
 *
 * Overlap guard: a per-institution in-flight flag prevents a slow run
 * from piling up if Neon is sluggish and the next 24h tick fires while
 * the previous is still in flight. Without this, two concurrent sync
 * runs could race on the same institution's UniversityFact rows and
 * waste Neon compute on the free tier (the retention sweep is
 * idempotent, but a stuck sweep must not stack either). Guards are
 * keyed per institution: a run for institution A never blocks a
 * trigger for institution B (they touch disjoint rows).
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

// ── r179d (phase-5): the per-institution sync plan ─────────────────

/**
 * One institution the scheduler will sync this tick: the institution
 * id to run against and the CONFIGURED source to load facts from.
 */
export interface ScheduledSyncPlanItem {
  institutionId: string;
  source: string;
}

/**
 * Pure decision — WHICH institutions get a scheduled sync.
 *
 * Rules (honest by construction):
 *  - ONLY configured sources run (INSTITUTION_SYNC_CONFIGS): a source
 *    is per-institution, never a global default for every university.
 *  - A config runs only when its institution exists among the given
 *    (ACTIVE) rows, matched by id OR slug. An institution with NO
 *    config — e.g. a second seeded demo institution — is never synced.
 *  - The planned institutionId is the LIVE row's id (not the config's
 *    literal), so the syncRun.create FK always points at a real row.
 *
 * Exported for the DB-free scheduler unit tests.
 */
export function planScheduledSyncs(
  configs: readonly InstitutionSyncConfig[],
  institutions: ReadonlyArray<{ id: string; slug: string }>,
): ScheduledSyncPlanItem[] {
  const plan: ScheduledSyncPlanItem[] = [];
  for (const config of configs) {
    const live = institutions.find(
      (i) => i.id === config.institutionId || i.slug === config.institutionSlug,
    );
    if (live) plan.push({ institutionId: live.id, source: config.source });
  }
  return plan;
}

/**
 * Minimal structural slice of the Prisma client — same pattern as the
 * retention sweep and `lib/operational-alerts.ts`, keeps the scheduled
 * runner unit-testable without a database.
 */
interface InstitutionDirectoryClient {
  institution: {
    findMany(args: {
      where: { status: 'ACTIVE' };
      select: { id: true; slug: true };
    }): Promise<Array<{ id: string; slug: string }>>;
  };
}

/** In-flight syncs, keyed per institution (see the overlap-guard note above). */
const syncsInProgress = new Set<string>();

/**
 * Result of a guarded sync attempt.
 *
 * - `{ ran: true, result }` — this call executed the sync; `result`
 *   carries the outcome (runSync reports sync-level failures as
 *   `status: FAILED`, not as exceptions).
 * - `{ ran: false, reason: 'overlap' }` — a sync for the SAME
 *   institution is still in flight, so this call was skipped.
 */
export type GuardedSyncOutcome =
  | { ran: true; result: SyncResult }
  | { ran: false; reason: 'overlap' };

/**
 * Single guarded entry point into runSync, shared by the scheduler
 * ticks AND the manual `POST /admin/sync/trigger` route. Exported so
 * the manual admin trigger cannot bypass the overlap guard and race
 * a scheduled run on that institution's UniversityFact rows.
 *
 * r179d: the guard (and the run itself) is scoped to ONE institution —
 * callers pass the institutionId (and its configured source) from the
 * registry/plan; runSync's default showcase fallback only applies to
 * legacy no-opts callers.
 *
 * The check-then-set of the per-institution flag happens synchronously
 * (no await in between), so under concurrent callers exactly one wins
 * in the single-threaded event loop.
 */
export async function runSyncGuarded(
  label: string,
  opts: { institutionId: string; source?: string },
): Promise<GuardedSyncOutcome> {
  if (syncsInProgress.has(opts.institutionId)) {
    logger.warn(
      { label, institutionId: opts.institutionId },
      '[scheduler] a sync for this institution is still running — skipping this tick',
    );
    return { ran: false, reason: 'overlap' };
  }
  syncsInProgress.add(opts.institutionId);
  try {
    const result = await runSync({ institutionId: opts.institutionId, source: opts.source });
    logger.info(
      {
        label,
        institutionId: opts.institutionId,
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
    logger.error({ err, label, institutionId: opts.institutionId }, '[scheduler] sync threw');
    throw err;
  } finally {
    syncsInProgress.delete(opts.institutionId);
  }
}

/**
 * The scheduled tick: run a guarded sync for EVERY institution with a
 * configured source, sequentially (institution A's failure must never
 * abort institution B's run — the loop isolates them).
 *
 * Never rejects: directory-load and per-run failures are logged, and
 * the plan actually attempted is returned for observability/tests.
 * `client` and `configs` are injectable for the DB-free unit tests
 * (defaults: the real Prisma singleton and the real registry).
 */
export async function runScheduledSyncs(
  label: string,
  client: InstitutionDirectoryClient = prisma,
  configs: readonly InstitutionSyncConfig[] = INSTITUTION_SYNC_CONFIGS,
): Promise<ScheduledSyncPlanItem[]> {
  let institutions: Array<{ id: string; slug: string }>;
  try {
    institutions = await client.institution.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, slug: true },
    });
  } catch (err) {
    logger.error({ err, label }, '[scheduler] failed to load the institution directory — no syncs this tick');
    return [];
  }
  const plan = planScheduledSyncs(configs, institutions);
  if (plan.length === 0) {
    // Honest no-op: an institution without a configured source is
    // NEVER synced, so a database holding only unconfigured
    // institutions (fresh test DBs, pre-seed deploys) plans nothing.
    logger.info({ label }, '[scheduler] no institution has a configured sync source — nothing to sync');
  }
  for (const item of plan) {
    try {
      await runSyncGuarded(label, item);
      // overlap (ran:false) and thrown bookkeeping errors are already
      // logged by the guard — either way, continue to the next institution.
    } catch {
      /* one institution's sync failure must not abort the rest */
    }
  }
  return plan;
}

export function startScheduler() {
  // Initial run after boot, once the server is responsive. Retention
  // also runs on boot: on Render's free tier the process is restarted
  // (or cold-started) far more often than a 24h interval elapses, so
  // the boot tick is the one that fires most reliably. Both jobs are
  // cheap and idempotent in the steady state.
  // runScheduledSyncs and the retention sweep never reject by
  // contract; the void calls keep failing boot callbacks from
  // surfacing as unhandled promise rejections.
  bootTimer = setTimeout(() => {
    void runScheduledSyncs('initial');
    void runLoginEventRetentionSweep('initial');
  }, BOOT_DELAY_MS);

  // Recurring daily run (same never-reject contract).
  dailyTimer = setInterval(() => {
    void runScheduledSyncs('daily');
    void runLoginEventRetentionSweep('daily');
  }, ONE_DAY_MS);

  if (typeof dailyTimer.unref === 'function') dailyTimer.unref();
  if (typeof bootTimer.unref === 'function') bootTimer.unref();
}

export function stopScheduler() {
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
}

// ── LoginEvent retention (11-c hand-off) ────────────────────────────

/**
 * Minimal structural slice of the Prisma client — same pattern as
 * `lib/operational-alerts.ts`, keeps the prune unit-testable without
 * a database or module-level mocking.
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
 * Result of a guarded retention sweep attempt. Mirrors GuardedSyncOutcome:
 * `ran: false` means this tick was skipped (overlap) or failed (error —
 * already logged here, never rethrown).
 */
export type RetentionSweepOutcome =
  | { ran: true; result: PruneLoginEventsResult }
  | { ran: false; reason: 'overlap' | 'error' };

/**
 * Scheduler-facing wrapper around pruneLoginEvents. Same overlap-guard
 * discipline as runSyncGuarded: a sweep still in flight skips the next
 * tick instead of stacking a second one on the same connection pool.
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
