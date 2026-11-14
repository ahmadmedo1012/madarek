/**
 * R351 X2b — the tick core: serverless timers → idempotent ticks.
 *
 * On a long-lived process (local dev, the Render standby) the scheduler
 * owns the timers (server.ts → startScheduler). On a Vercel Fluid
 * function there IS no long-lived process, so the same jobs run as
 * TICKS: any trigger (Vercel daily cron, the GitHub Actions every-5-minutes ticker,
 * an opportunistic tick riding traffic, the post-enqueue drain) POSTs
 * /api/v1/internal/tick, and THIS module decides — through a DB claim —
 * whether that tick should run the fast slot (outbox drain), the daily
 * slot (retention + due reminders + rate-limit prune), or the weekly
 * slot (digest).
 *
 * Concurrency guard = a plain row CAS, NOT pg advisory locks: through
 * Neon's PgBouncer (transaction pooling) a session-scoped advisory lock
 * binds to whichever backend served that statement — the unlock may run
 * on a different session and leak. The row claim is pooler-safe:
 *
 *   UPDATE "TickRun" SET "lastRunAt" = now()
 *   WHERE "key" = <slot> AND "lastRunAt" < now() - <minInterval>
 *
 * Whoever's updateMany returns count=1 owns the window. A claimer that
 * dies mid-run only blocks its slot until the interval elapses; every
 * job is idempotent (dedupe keys, CAS claims, capped batches), so a
 * re-run is always safe. Correctness never depends on tick frequency —
 * only mail latency does (outbox rows carry nextAttemptAt).
 */
import { Prisma } from '@prisma/client';

import { logger } from '../logger.js';

/** Structural slice of the Prisma client (the pruneLoginEvents pattern —
 *  keeps the claim logic unit-testable without a database). */
export interface TickClient {
  tickRun: {
    create(args: { data: { key: string; lastRunAt: Date } }): Promise<unknown>;
    updateMany(args: {
      where: { key: string; lastRunAt: { lt: Date } };
      data: { lastRunAt: Date };
    }): Promise<{ count: number }>;
    update(args: {
      where: { key: string };
      data: { lastDurationMs: number; lastSummary?: Prisma.InputJsonValue };
    }): Promise<unknown>;
  };
}

/** The slot table: what runs at which cadence. */
export const TICK_SLOTS = {
  /** Fast slot — the outbox drain (mail latency). */
  tick: 55_000,
  /** Daily slot — retention sweeps + due reminders + rate-limit prune. */
  'tick-daily': 20 * 3_600_000,
  /** Weekly slot — the weekly digest. */
  'tick-weekly': 6 * 24 * 3_600_000,
} as const;

export type TickSlotKey = keyof typeof TICK_SLOTS;

/** P2002 = unique constraint (the row exists / a racing creator won).
 *  Accepts both the real Prisma known-error and a duck-typed shape so
 *  unit tests can fake the race without constructing client errors. */
function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return err.code === 'P2002';
  return (err as { code?: string } | null)?.code === 'P2002';
}

/**
 * Try to claim a slot for this tick. Creates the row lazily (first run
 * ever); a P2002 from a racing creator is fine — the CAS updateMany
 * still decides exactly one winner.
 */
export async function claimTickSlot(
  client: TickClient,
  key: TickSlotKey,
  minIntervalMs: number,
  now: Date = new Date(),
): Promise<boolean> {
  try {
    await client.tickRun.create({ data: { key, lastRunAt: new Date(0) } });
  } catch (err) {
    // Row exists (normal) or a racing first-tick creator won (fine) —
    // anything else is a real DB problem and must fail the tick loudly.
    if (!isUniqueConstraintError(err)) throw err;
  }
  const claimed = await client.tickRun.updateMany({
    where: { key, lastRunAt: { lt: new Date(now.getTime() - minIntervalMs) } },
    data: { lastRunAt: now },
  });
  return claimed.count === 1;
}

export type TickSlotReport = {
  key: TickSlotKey;
  /** claimed + the job ran (or threw — see `error`). */
  ran: boolean;
  /** job outcome (null when skipped/failed) */
  summary?: unknown;
  error?: string;
  durationMs?: number;
};

export interface TickReport {
  label: string;
  startedAt: string;
  slots: TickSlotReport[];
}

/** The jobs a tick can run (injected so tests never touch the DB). */
export interface TickJobs {
  tick: () => Promise<unknown>;
  'tick-daily': () => Promise<unknown>;
  'tick-weekly': () => Promise<unknown>;
}

/**
 * Run one tick: for each slot, try the claim; if won, run the job
 * (never-throw — errors are recorded on the slot row and the report),
 * then stamp duration + summary. Always resolves.
 */
export async function runTick(
  client: TickClient,
  jobs: TickJobs,
  label: string,
  now: Date = new Date(),
): Promise<TickReport> {
  const report: TickReport = { label, startedAt: now.toISOString(), slots: [] };
  for (const key of Object.keys(TICK_SLOTS) as TickSlotKey[]) {
    let claimed: boolean;
    try {
      claimed = await claimTickSlot(client, key, TICK_SLOTS[key], now);
    } catch (err) {
      logger.error({ err, key, label }, '[tick] claim failed');
      report.slots.push({ key, ran: false, error: 'claim-failed' });
      continue;
    }
    if (!claimed) {
      report.slots.push({ key, ran: false });
      continue;
    }
    const slotStart = Date.now();
    try {
      const summary = await jobs[key]();
      const durationMs = Date.now() - slotStart;
      report.slots.push({ key, ran: true, summary, durationMs });
      // Diagnostics stamp — best-effort, never fails the tick.
      try {
        // Json fields cannot take a plain null in an update (Prisma
        // demands DbNull) — omit the field when there is no summary.
        await client.tickRun.update({
          where: { key },
          data:
            summary === undefined || summary === null
              ? { lastDurationMs: durationMs }
              : { lastDurationMs: durationMs, lastSummary: summary as Prisma.InputJsonValue },
        });
      } catch {
        /* diagnostics only */
      }
    } catch (err) {
      const durationMs = Date.now() - slotStart;
      logger.error({ err, key, label, durationMs }, '[tick] job failed');
      report.slots.push({ key, ran: true, error: err instanceof Error ? err.message : String(err), durationMs });
    }
  }
  return report;
}
