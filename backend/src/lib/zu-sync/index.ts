import { prisma } from '../../db.js';
import { STATIC_FACTS, type FactPatch } from './static-source.js';
import { raiseOperationalAlert } from '../operational-alerts.js';

/**
 * Run a sync against the configured source.
 *
 * Currently the only source is `static-markdown` (curated from zu.edu.ly).
 * The function is shape-stable so a future `live-http` source can be
 * dropped in by replacing `loadFacts()`.
 *
 * Guarantees:
 *  - Every run creates exactly one `SyncRun` row (status RUNNING → SUCCESS|FAILED).
 *  - The row is finalized in a `finally` block, so even a mid-loop throw
 *    can never strand it in RUNNING.
 *  - Runs orphaned in RUNNING (process crash / restart) older than
 *    STALE_RUNNING_RUN_MS are auto-failed by the next run.
 *  - Existing facts are updated, never deleted (so a transient source
 *    failure can't wipe institutional data).
 *  - Stale facts (not seen this run) are flagged `isStale: true`.
 *  - Sync-level failures are recorded on the SyncRun and returned as a
 *    FAILED result; the only way this function throws is when the initial
 *    SyncRun bookkeeping itself fails (e.g. the DB is unreachable).
 */

/**
 * A run still marked RUNNING after this long is considered dead: a full
 * sync completes in seconds, so anything older died with its process
 * (crash, restart, re-deploy). The next run auto-fails such rows.
 */
export const STALE_RUNNING_RUN_MS = 15 * 60 * 1000;

export interface SyncResult {
  runId: string;
  // A run either lands all facts ('SUCCESS') or is failed whole — there
  // are no partial semantics here. (The DB-level SyncRunStatus enum keeps
  // a PARTIAL value, but runSync never produces it.)
  status: 'SUCCESS' | 'FAILED';
  factsAdded: number;
  factsUpdated: number;
  durationMs: number;
  errorMsg: string | null;
  notes: string | null;
}

async function loadFacts(source: string): Promise<{ facts: FactPatch[]; sourceLabel: string }> {
  if (source === 'static-markdown') {
    return { facts: STATIC_FACTS, sourceLabel: 'static-markdown' };
  }
  // Future: { source === 'live-http' } → fetch + parse zu.edu.ly
  throw new Error(`Unknown sync source: ${source}`);
}

export async function runSync(opts: { source?: string } = {}): Promise<SyncResult> {
  const source = opts.source ?? 'static-markdown';
  const startedAt = Date.now();

  // Reap runs orphaned in RUNNING state before creating this run's row
  // (so this run can never match its own filter). Anything still RUNNING
  // after STALE_RUNNING_RUN_MS died with its process; mark it FAILED so
  // the admin sync view never shows a phantom "in progress" run forever.
  const reaped = await prisma.syncRun.updateMany({
    where: {
      status: 'RUNNING',
      startedAt: { lt: new Date(startedAt - STALE_RUNNING_RUN_MS) },
    },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorMsg: `Run abandoned: still RUNNING after ${STALE_RUNNING_RUN_MS / 60_000} minutes (process crash or restart); auto-failed by the next sync run.`,
    },
  });
  if (reaped.count > 0) {
    // Best-effort (never rejects) — surfaces sync health on the OWNER
    // alerts page instead of failing silently.
    void raiseOperationalAlert(prisma, {
      severity: 'warning',
      code: 'SYNC_STALE_RUNS_REAPED',
      message: `${reaped.count} sync run(s) were still RUNNING after 15 minutes and have been auto-marked FAILED.`,
      metadata: { reapedCount: reaped.count },
    });
  }

  const run = await prisma.syncRun.create({
    data: { source, status: 'RUNNING' },
  });

  // Outcome bookkeeping — mutated by the try/catch below and applied to
  // the SyncRun row exactly once in the finally block.
  let status: 'SUCCESS' | 'FAILED' = 'FAILED';
  let added = 0;
  let updated = 0;
  let unseen: string[] = [];
  let syncedCount = 0;
  let sourceLabel = source;
  let errorMsg: string | null = null;

  try {
    const loaded = await loadFacts(source);
    const facts = loaded.facts;
    sourceLabel = loaded.sourceLabel;

    // Track which keys we touched in this run so we can mark unseen ones stale.
    const seenKeys = new Set<string>();

    for (const f of facts) {
      seenKeys.add(f.key);
      const existing = await prisma.universityFact.findUnique({ where: { key: f.key } });
      if (!existing) {
        await prisma.universityFact.create({
          data: {
            key: f.key,
            value: f.value,
            category: f.category,
            source: f.source,
            syncedAt: new Date(),
            isStale: false,
          },
        });
        added++;
      } else if (existing.value !== f.value || existing.isStale) {
        await prisma.universityFact.update({
          where: { key: f.key },
          data: {
            value: f.value,
            category: f.category,
            source: f.source,
            syncedAt: new Date(),
            isStale: false,
          },
        });
        updated++;
      } else {
        // Same value — just bump syncedAt to reflect it's still current
        await prisma.universityFact.update({
          where: { key: f.key },
          data: { syncedAt: new Date(), isStale: false },
        });
      }
    }

    // Flag any fact we know about but did NOT see this run
    const allKeys = await prisma.universityFact.findMany({ select: { key: true } });
    unseen = allKeys
      .map((r) => r.key)
      .filter((k) => !seenKeys.has(k));
    if (unseen.length) {
      await prisma.universityFact.updateMany({
        where: { key: { in: unseen } },
        data: { isStale: true },
      });
    }

    syncedCount = facts.length;
    status = 'SUCCESS';
  } catch (err) {
    errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    // eslint-disable-next-line no-console
    console.error('[sync] failed', errorMsg);
  } finally {
    // Exactly-once finalization on both the success and failure paths.
    // A failure of this bookkeeping write itself must never mask the
    // sync outcome — if it can't land, the row is auto-failed by the
    // next run's stale-RUNNING reap above.
    const durationMs = Date.now() - startedAt;
    try {
      await prisma.syncRun.update({
        where: { id: run.id },
        data:
          status === 'SUCCESS'
            ? {
                status,
                completedAt: new Date(),
                factsAdded: added,
                factsUpdated: updated,
                durationMs,
                notes: unseen.length
                  ? `${unseen.length} fact(s) marked stale: ${unseen.slice(0, 5).join(', ')}${unseen.length > 5 ? '…' : ''}`
                  : `Synced ${syncedCount} fact(s) from ${sourceLabel}.`,
              }
            : {
                status,
                completedAt: new Date(),
                durationMs,
                errorMsg: errorMsg ?? 'unknown error',
              },
      });
    } catch (finalizeErr) {
      // eslint-disable-next-line no-console
      console.error('[sync] failed to finalize SyncRun row', finalizeErr);
    }
  }

  return {
    runId: run.id,
    status,
    factsAdded: status === 'SUCCESS' ? added : 0,
    factsUpdated: status === 'SUCCESS' ? updated : 0,
    durationMs: Date.now() - startedAt,
    errorMsg,
    notes: status === 'SUCCESS' && unseen.length ? `${unseen.length} stale` : null,
  };
}
