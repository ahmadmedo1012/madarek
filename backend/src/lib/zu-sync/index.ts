import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
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

/** r166b (E2 #1 — D17-3): صيغ العدّ العربي لـ«حقل» في ملاحظات التشغيل —
 *  نفس سلّم countAr الذي تستعمله واجهة المزامنة
 *  (frontend/src/lib/format.ts): 1 / 2 / 3–10 / 11+. */
function fieldCountAr(n: number): string {
  if (n === 1) return 'حقل واحد';
  if (n === 2) return 'حقلان';
  if (n >= 3 && n <= 10) return `${n} حقول`;
  return `${n} حقلاً`;
}

/** r166b (E2 #1 — D17-3): تسمية عربية للمصدر داخل الملاحظة (المعرّف
 *  اللاتيني يرافقها للدعم الفنّي — المصطلحات التقنية تبقى بأسمائها
 *  الأصلية وفق AGENTS.md §9). مصدر مستقبلي غير معروف يُعرض كما هو. */
const SOURCE_LABEL_AR: Record<string, string> = {
  'static-markdown': 'المصدر الثابت (static-markdown)',
};
function sourceLabelAr(label: string): string {
  return SOURCE_LABEL_AR[label] ?? label;
}

/**
 * r179 (phase-5) → r188: the sync runs against a SPECIFIC institution.
 * The curated synthetic fact sheet (static-source.ts) is the DEMO
 * institution's configured source — not a global source for every
 * university. A run for one institution never touches another
 * institution's facts (upserts, stale-marking, and run history are all
 * keyed by institutionId). The fixed default keeps existing callers
 * (runSync with no opts) on the demonstration tenant.
 */
export const DEFAULT_SYNC_INSTITUTION_ID = 'inst-zawia-showcase';

/**
 * r179d (phase-5) → r188: the per-institution CONFIGURED sync sources —
 * the registry that decides WHICH institutions the scheduler syncs and
 * WHICH source POST /admin/sync/trigger runs.
 *
 * The demonstration tenant's curated synthetic source (static-source.ts,
 * r188 fictional «جامعة مدارك التجريبية» fact sheet) is the DEMO
 * institution's source, NOT a global source for every university. An
 * institution absent from this registry (today: every institution other
 * than the demo tenant, e.g. alandalus-demo) has NO configured source —
 * the scheduler never syncs it, and a manual trigger for it answers an
 * honest 400.
 *
 * Matching is by institution id OR slug (both unique in the DB): the
 * demo row keeps the FIXED legacy id `inst-zawia-showcase` (stable FK
 * anchor) with the r188 slug `madarek-demo` (prisma/seed.ts), so either
 * identity resolves the same row. This is deliberately a simple in-code
 * registry — there is no operator-editable source-config surface yet,
 * so a DB config table would be speculative. Adding a future source =
 * adding an entry here (a live-http fetcher plugs into loadFacts below).
 */
export interface InstitutionSyncConfig {
  /** Institution id this config resolves to (fixed ids come from seed.ts). */
  institutionId: string;
  /** Institution slug (unique) — the human-facing identity. */
  institutionSlug: string;
  /** Source identifier `loadFacts()` understands ('static-markdown' today). */
  source: string;
}

export const INSTITUTION_SYNC_CONFIGS: readonly InstitutionSyncConfig[] = [
  {
    institutionId: DEFAULT_SYNC_INSTITUTION_ID,
    institutionSlug: 'madarek-demo',
    source: 'static-markdown',
  },
];

/**
 * The institution whose facts the PUBLIC `GET /university/facts`
 * serves when no `?institution=slug` param arrives — the demonstration
 * tenant (the explicitly-fictional reference data). Distinct from the
 * registry on purpose: the public default and the scheduled sources
 * are separate decisions, even though both are the demo tenant today.
 */
export const PUBLIC_FACTS_DEFAULT_SLUG = 'madarek-demo';

/**
 * The configured source for an institution, matched by id OR slug.
 * `null` = the institution has NO configured source (never synced).
 */
export function findInstitutionSyncConfig(
  institution: { id: string; slug: string },
): InstitutionSyncConfig | null {
  return (
    INSTITUTION_SYNC_CONFIGS.find(
      (c) => c.institutionId === institution.id || c.institutionSlug === institution.slug,
    ) ?? null
  );
}

export async function runSync(
  opts: { source?: string; institutionId?: string } = {},
): Promise<SyncResult> {
  const source = opts.source ?? 'static-markdown';
  const institutionId = opts.institutionId ?? DEFAULT_SYNC_INSTITUTION_ID;
  const startedAt = Date.now();

  // Reap runs orphaned in RUNNING state before creating this run's row
  // (so this run can never match its own filter). Anything still RUNNING
  // after STALE_RUNNING_RUN_MS died with its process; mark it FAILED so
  // the admin sync view never shows a phantom "in progress" run forever.
  const reaped = await prisma.syncRun.updateMany({
    where: {
      institutionId,
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
    // alerts page instead of failing silently. r179d: the metadata
    // carries institutionId — runs are per-institution since phase-5,
    // and support needs to know WHICH institution's runs were reaped.
    // (The throttle key stays the alert `code` — a reap storm across
    // several institutions collapses into one alert per 5-minute
    // window, which is the intended throttle semantics.)
    void raiseOperationalAlert(prisma, {
      severity: 'warning',
      code: 'SYNC_STALE_RUNS_REAPED',
      message: `${reaped.count} sync run(s) were still RUNNING after 15 minutes and have been auto-marked FAILED.`,
      metadata: { reapedCount: reaped.count, institutionId },
    });
  }

  const run = await prisma.syncRun.create({
    data: { source, institutionId, status: 'RUNNING' },
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
      const existing = await prisma.universityFact.findUnique({
        where: { institutionId_key: { institutionId, key: f.key } },
      });
      if (!existing) {
        await prisma.universityFact.create({
          data: {
            institutionId,
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
          where: { institutionId_key: { institutionId, key: f.key } },
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
          where: { institutionId_key: { institutionId, key: f.key } },
          data: { syncedAt: new Date(), isStale: false },
        });
      }
    }

    // Flag any fact of THIS institution we did NOT see this run —
    // r179 (phase-5): never another institution's facts.
    const instKeys = await prisma.universityFact.findMany({
      where: { institutionId },
      select: { key: true },
    });
    unseen = instKeys
      .map((r) => r.key)
      .filter((k) => !seenKeys.has(k));
    if (unseen.length) {
      await prisma.universityFact.updateMany({
        where: { institutionId, key: { in: unseen } },
        data: { isStale: true },
      });
    }

    syncedCount = facts.length;
    status = 'SUCCESS';
  } catch (err) {
    errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    logger.error({ err, source }, '[sync] run failed');
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
                /* r166b (E2 #1 — D17-3): كانت الملاحظات إنجليزية خام
                   تُعرض في واجهة /admin/sync («ملاحظات آخر تشغيل:
                   Synced 38 fact(s) from static-markdown.»). الآن عربية
                   مع إبقاء الأعداد والمفاتيح مُدرَجة كما هي — القاعدة
                   الجزئية «N من الحقول» سليمة نحوياً لأي عدد. */
                notes: unseen.length
                  ? `تم وسم ${unseen.length} من الحقول كقديمة: ${unseen.slice(0, 5).join(', ')}${unseen.length > 5 ? '…' : ''}`
                  : `تمت مزامنة ${fieldCountAr(syncedCount)} من ${sourceLabelAr(sourceLabel)}.`,
              }
            : {
                status,
                completedAt: new Date(),
                durationMs,
                errorMsg: errorMsg ?? 'unknown error',
              },
      });
    } catch (finalizeErr) {
      logger.error({ err: finalizeErr, runId: run.id }, '[sync] failed to finalize SyncRun row');
    }
  }

  return {
    runId: run.id,
    status,
    factsAdded: status === 'SUCCESS' ? added : 0,
    factsUpdated: status === 'SUCCESS' ? updated : 0,
    durationMs: Date.now() - startedAt,
    errorMsg,
    /* r166b: نفس لغة الملاحظة المحفوظة — ملخّص حالة التشغيل في جسم
       استجابة POST /admin/sync/trigger (تُستعمل للتحقّق وليس للعرض
       المباشر؛ الترجمة تمنع تسرّب الإنجليزية لو استُعملت لاحقاً). */
    notes: status === 'SUCCESS' && unseen.length ? `تم وسم ${unseen.length} من الحقول كقديمة` : null,
  };
}
