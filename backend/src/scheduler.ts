import { prisma } from './db.js';
import { logger } from './logger.js';
import { startMailOutboxWorker, stopMailOutboxWorker } from './lib/mail-outbox.js';
// R350 E3 — the mail sweeps (due reminders + weekly digest) reuse the
// event-mail layer: preference-gated, outbox-owned, never-throw.
import {
  sendEventMail,
  renderAssignmentDue,
  renderWeeklyDigest,
  isDeliverableEmail,
  appUrl,
  formatLyDateTime,
} from './lib/mail-events.js';

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
let weeklyTimer: NodeJS.Timeout | null = null;
let dueSweepInProgress = false;
let digestInProgress = false;

export function startScheduler() {
  // R350 E2 — the transactional-mail outbox worker (30s drain ticks;
  // provider=none queues without sending — the honest off).
  startMailOutboxWorker();
  // Retention runs on boot: on Render's free tier the process is
  // restarted (or cold-started) far more often than a 24h interval
  // elapses, so the boot tick is the one that fires most reliably.
  // The sweep is cheap and idempotent in the steady state, and never
  // rejects by contract; the void call keeps a failing boot callback
  // from surfacing as an unhandled promise rejection.
  bootTimer = setTimeout(() => {
    void runLoginEventRetentionSweep('initial');
    void runAssignmentDueSweep('initial');
    void runWeeklyDigestSweep('initial');
  }, BOOT_DELAY_MS);

  // Recurring daily run (same never-reject contract).
  dailyTimer = setInterval(() => {
    void runLoginEventRetentionSweep('daily');
    void runAssignmentDueSweep('daily');
  }, ONE_DAY_MS);

  // R350 E3 — the weekly digest (7-day cadence; the dedupe key makes
  // the boot ticks on a cold-starting free tier collapse to one mail
  // per user per ISO week).
  weeklyTimer = setInterval(() => {
    void runWeeklyDigestSweep('weekly');
  }, 7 * ONE_DAY_MS);

  if (typeof dailyTimer.unref === 'function') dailyTimer.unref();
  if (typeof bootTimer.unref === 'function') bootTimer.unref();
  if (typeof weeklyTimer.unref === 'function') weeklyTimer.unref();
}

export function stopScheduler() {
  stopMailOutboxWorker();
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
  if (weeklyTimer) { clearInterval(weeklyTimer); weeklyTimer = null; }
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

// ── R350 E3: assignment-due reminders (daily sweep) ────────────────

/**
 * The reminder window: mail fires when an assignment's dueAt lands
 * 12–36 hours ahead. With the sweep running daily (boot + interval),
 * every assignment enters this window exactly once — the dedupe key
 * (`due:<assignmentId>:<studentId>:<dueAt day>`) then collapses any
 * repeat (cold-start boots, overlapping ticks) to one mail.
 */
export const ASSIGNMENT_DUE_WINDOW_MIN_H = 12;
export const ASSIGNMENT_DUE_WINDOW_MAX_H = 36;

/** Submission statuses that already satisfy the assignment. */
const SATISFIED_SUBMISSION_STATUSES = ['SUBMITTED', 'GRADED', 'RETURNED'] as const;

export async function sendAssignmentDueReminders(now: Date = new Date()): Promise<{
  assignments: number;
  queued: number;
}> {
  const from = new Date(now.getTime() + ASSIGNMENT_DUE_WINDOW_MIN_H * 3_600_000);
  const to = new Date(now.getTime() + ASSIGNMENT_DUE_WINDOW_MAX_H * 3_600_000);
  const assignments = await prisma.assignment.findMany({
    where: { dueAt: { gte: from, lte: to } },
    select: {
      id: true,
      title: true,
      dueAt: true,
      offering: {
        select: {
          enrollments: {
            where: { status: 'active' },
            select: {
              student: { select: { id: true, email: true, firstName: true, isActive: true } },
            },
          },
        },
      },
    },
  });
  let queued = 0;
  for (const a of assignments) {
    for (const e of a.offering.enrollments) {
      const student = e.student;
      if (!student.isActive || !isDeliverableEmail(student.email)) continue;
      // Skip students who already satisfied the assignment.
      const satisfied = await prisma.submission.findFirst({
        where: {
          assignmentId: a.id,
          studentId: student.id,
          status: { in: [...SATISFIED_SUBMISSION_STATUSES] },
        },
        select: { id: true },
      });
      if (satisfied) continue;
      await sendEventMail({
        userId: student.id,
        to: student.email,
        category: 'courses',
        template: 'assignment-due',
        ...renderAssignmentDue(a.title, a.dueAt),
        ctaLabel: 'تكاليفي',
        ctaUrl: appUrl('/student/assignments'),
        dedupeKey: `due:${a.id}:${student.id}:${a.dueAt.toISOString().slice(0, 10)}`,
      });
      queued += 1;
    }
  }
  return { assignments: assignments.length, queued };
}

/** Never-throw wrapper (the retention contract). */
export async function runAssignmentDueSweep(label: string): Promise<boolean> {
  if (dueSweepInProgress) return false;
  dueSweepInProgress = true;
  try {
    const res = await sendAssignmentDueReminders();
    if (res.queued > 0) {
      logger.info({ label, ...res }, '[scheduler] assignment-due reminders queued');
    }
    return true;
  } catch (err) {
    logger.error({ err, label }, '[scheduler] assignment-due sweep failed');
    return false;
  } finally {
    dueSweepInProgress = false;
  }
}

// ── R350 E3: the weekly digest ─────────────────────────────────────

export const DIGEST_PAGE_SIZE = 200;
export const DIGEST_HORIZON_DAYS = 7;

/** ISO week stamp (dedupe: one digest per user per ISO week). */
export function isoWeekStamp(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function sendWeeklyDigests(now: Date = new Date()): Promise<{
  users: number;
  queued: number;
}> {
  const to = new Date(now.getTime() + DIGEST_HORIZON_DAYS * ONE_DAY_MS);
  let users = 0;
  let queued = 0;
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        enrollments: { where: { status: 'active' }, select: { offeringId: true } },
      },
      take: DIGEST_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
    if (page.length === 0) break;
    cursor = page[page.length - 1]!.id;
    for (const u of page) {
      if (!isDeliverableEmail(u.email)) continue;
      users += 1;
      const offeringIds = u.enrollments.map((e) => e.offeringId);
      // No active enrolments (teachers/admins/…) — no digest to render.
      if (offeringIds.length === 0) continue;
      const [assignments, exams] = await Promise.all([
        prisma.assignment.findMany({
          where: { offeringId: { in: offeringIds }, dueAt: { gte: now, lte: to } },
          select: { title: true, dueAt: true },
          orderBy: { dueAt: 'asc' },
          take: 5,
        }),
        prisma.examTemplate.findMany({
          where: {
            offeringId: { in: offeringIds },
            status: 'PUBLISHED',
            openAt: { gte: now, lte: to },
          },
          select: { title: true, openAt: true },
          orderBy: { openAt: 'asc' },
          take: 3,
        }),
      ]);
      const items = [
        ...assignments.map((a) => `تكليف «${a.title}» يستحق ${formatLyDateTime(a.dueAt)}`),
        ...exams.map((x) => `اختبار «${x.title}» يفتح ${formatLyDateTime(x.openAt!)}`),
      ];
      await sendEventMail({
        userId: u.id,
        to: u.email,
        category: 'digest',
        template: 'weekly-digest',
        ...renderWeeklyDigest(u.firstName, 'الأسبوع القادم', items),
        ctaLabel: 'لوحتي',
        ctaUrl: appUrl('/student/dashboard'),
        dedupeKey: `digest:${u.id}:${isoWeekStamp(now)}`,
      });
      queued += 1;
    }
    if (page.length < DIGEST_PAGE_SIZE) break;
  }
  return { users, queued };
}

/** Never-throw wrapper (the retention contract). */
export async function runWeeklyDigestSweep(label: string): Promise<boolean> {
  if (digestInProgress) return false;
  digestInProgress = true;
  try {
    const res = await sendWeeklyDigests();
    if (res.queued > 0) {
      logger.info({ label, ...res }, '[scheduler] weekly digest queued');
    }
    return true;
  } catch (err) {
    logger.error({ err, label }, '[scheduler] weekly digest sweep failed');
    return false;
  } finally {
    digestInProgress = false;
  }
}
