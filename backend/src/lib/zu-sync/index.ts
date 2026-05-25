import { prisma } from '../../db.js';
import { STATIC_FACTS, type FactPatch } from './static-source.js';

/**
 * Run a sync against the configured source.
 *
 * Currently the only source is `static-markdown` (curated from zu.edu.ly).
 * The function is shape-stable so a future `live-http` source can be
 * dropped in by replacing `loadFacts()`.
 *
 * Guarantees:
 *  - Every run creates exactly one `SyncRun` row (status RUNNING → SUCCESS|PARTIAL|FAILED).
 *  - Existing facts are updated, never deleted (so a transient source
 *    failure can't wipe institutional data).
 *  - Stale facts (not seen this run) are flagged `isStale: true`.
 *  - The function never throws — failures are recorded on the SyncRun.
 */
export interface SyncResult {
  runId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
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

  const run = await prisma.syncRun.create({
    data: { source, status: 'RUNNING' },
  });

  try {
    const { facts, sourceLabel } = await loadFacts(source);

    // Track which keys we touched in this run so we can mark unseen ones stale.
    const seenKeys = new Set<string>();
    let added = 0;
    let updated = 0;

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
    const unseenKeys = allKeys
      .map((r) => r.key)
      .filter((k) => !seenKeys.has(k));
    if (unseenKeys.length) {
      await prisma.universityFact.updateMany({
        where: { key: { in: unseenKeys } },
        data: { isStale: true },
      });
    }

    const durationMs = Date.now() - startedAt;
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        factsAdded: added,
        factsUpdated: updated,
        durationMs,
        notes: unseenKeys.length
          ? `${unseenKeys.length} fact(s) marked stale: ${unseenKeys.slice(0, 5).join(', ')}${unseenKeys.length > 5 ? '…' : ''}`
          : `Synced ${facts.length} fact(s) from ${sourceLabel}.`,
      },
    });

    return {
      runId: run.id,
      status: 'SUCCESS',
      factsAdded: added,
      factsUpdated: updated,
      durationMs,
      errorMsg: null,
      notes: unseenKeys.length ? `${unseenKeys.length} stale` : null,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    // eslint-disable-next-line no-console
    console.error('[sync] failed', errorMsg);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMsg,
        durationMs,
      },
    });
    return {
      runId: run.id,
      status: 'FAILED',
      factsAdded: 0,
      factsUpdated: 0,
      durationMs,
      errorMsg,
      notes: null,
    };
  }
}
