/**
 * R351 X2b — the platform tick: composes the real jobs behind runTick
 * and exposes the two production callers:
 *
 *   · runPlatformTick(label) — POST /api/v1/internal/tick (cron/Actions
 *     triggers hit the route; the route calls this).
 *   · opportunisticTick()   — the traffic-riding trigger: at most once
 *     per 60 s per function instance, fire-and-forget through
 *     afterResponse (waitUntil on Vercel). The DB claim makes a
 *     stampede of instances harmless — whoever wins runs, the rest skip.
 *
 * Jobs map (mirrors server.ts's startScheduler cadence):
 *   tick        → drainOutbox (mail latency; R350 E2)
 *   tick-daily  → LoginEvent retention + assignment-due reminders +
 *                 rate-limit prune (X2c)
 *   tick-weekly → the weekly digest (R350 E3)
 * Every job is already idempotent + never-throw at its own layer; the
 * tick adds the cross-instance claim on top.
 */
import { prisma } from '../db.js';
import { runTick, type TickReport } from './tick.js';
import { afterResponse } from './after-response.js';
import { drainOutbox } from './mail-outbox.js';
import { runLoginEventRetentionSweep, runAssignmentDueSweep, runWeeklyDigestSweep } from '../scheduler.js';

export async function runPlatformTick(label: string): Promise<TickReport> {
  return runTick(prisma, {
    tick: () => drainOutbox(),
    'tick-daily': async () => {
      // allSettled: one failing sweep must not skip the others.
      const [retention, due] = await Promise.allSettled([
        runLoginEventRetentionSweep(label),
        runAssignmentDueSweep(label),
      ]);
      return {
        retention: retention.status === 'fulfilled' ? retention.value : { ran: false, reason: 'error' },
        due: due.status === 'fulfilled' ? due.value : false,
      };
    },
    'tick-weekly': () => runWeeklyDigestSweep(label),
  }, label);
}

/* ── the opportunistic trigger (function instances only) ───────────── */

const OPPORTUNISTIC_MIN_GAP_MS = 60_000;
let lastOpportunisticAt = 0;

/**
 * Called by the Vercel function entry on every request. If this
 * instance hasn't tried a tick in the last 60 s, fire one in the
 * background (waitUntil-registered). The DB claim bounds the actual
 * work: at most one real tick per 55 s across ALL instances.
 */
export function opportunisticTick(): void {
  const now = Date.now();
  if (now - lastOpportunisticAt < OPPORTUNISTIC_MIN_GAP_MS) return;
  lastOpportunisticAt = now;
  afterResponse(
    runPlatformTick('opportunistic').then((report) => {
      const ran = report.slots.filter((s) => s.ran).map((s) => s.key);
      if (ran.length > 0) {
        // Import lazily to keep this module's hot path lean.
        import('../logger.js').then(({ logger }) => {
          logger.info({ ran }, '[tick] opportunistic tick ran slots');
        });
      }
    }),
  );
}
