/**
 * r323 B5 — the public status surface (`GET /api/v1/status`).
 *
 * One honest JSON the pilot's «حالة المنصة» card renders: DB latency
 * (same 5s race as /health), the ACTIVE driver/mode names (never keys),
 * the build id, and the server time. No secrets, no counts, no user
 * data — the only purpose is: «is it up, and which mode is it in?».
 * Mounted BEFORE the global limiter so a rate-limited surface still
 * answers status (Render cron pings it for keep-warm — r323 B6).
 */
import { Router } from 'express';
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { resolveBuildId } from '../../lib/build-id.js';
import { BUILD_SHA } from '../../lib/build-sha.generated.js';
import { logger } from '../../logger.js';
/* R353 C2 — the AI mode label: 'chain' when ≥2 providers are
 * configured (the multi-provider failover chain), else the historical
 * env label. Boot-frozen like everything AI (memoized in providers.ts). */
import { getAiChain, isChainMode, aiProviderBreakers } from '../../lib/ai/providers.js';
/* r357 L5 — the quota knobs for the honest /status AI block (no
 * secrets: the configured limits + the platform month budget only). */
import { AI_DAILY_LIMIT_ENV, parseAiDailyLimit, aiMonthKey } from '../../lib/ai/quota.js';
/* r357 L5 — the cross-instance all-providers-down verdict (telemetry-
 * backed; the tick workflow reads it to open the GitHub issue). */
import { assessProviderHealth } from '../../lib/ai/provider-health.js';

const router = Router();

/**
 * R353 — the SAME derived buildId as /api/v1/health: the build-time
 * baked sha first (see lib/build-id.ts + scripts/bake-build-sha.mjs),
 * then the runtime env chain. Evaluated AT REQUEST TIME (a memoized
 * getter, not a boot-frozen const) because the Vercel entry fills
 * process.env.GIT_SHA from api/build-sha.json AFTER this module loads
 * but BEFORE the first request.
 */
const BUILD_ID = () =>
  resolveBuildId(BUILD_SHA, {
    RENDER_GIT_COMMIT: env.RENDER_GIT_COMMIT,
    VERCEL_GIT_COMMIT_SHA: env.VERCEL_GIT_COMMIT_SHA,
    GIT_SHA: process.env.GIT_SHA ?? env.GIT_SHA,
  });
/** The boot-frozen AI mode label (mode NAMES only — never keys). */
const AI_MODE_LABEL = isChainMode(getAiChain()) ? 'chain' : env.AI_PROVIDER;

/* r357 L5 — the honest AI health/quota block (NO secrets):
 * provider ids + model counts, the in-process breaker verdicts, the
 * per-user daily ask limit, and the platform month token budget.
 * Best-effort: a budget-read outage degrades to nulls, never a red
 * status. */
async function aiStatusBlock(): Promise<Record<string, unknown>> {
  const chain = getAiChain();
  const providers = chain.providers.map((p) => ({ id: p.id, models: p.models.length, tasks: p.tasks }));
  let monthBudget: { monthKey: string; usedTokens: number } | null = null;
  try {
    const row = await prisma.aiBudget.findUnique({ where: { monthKey: aiMonthKey() }, select: { usedTokens: true } });
    monthBudget = { monthKey: aiMonthKey(), usedTokens: row?.usedTokens ?? 0 };
  } catch {
    // honest: the counter is unreadable right now — monthBudget stays null
  }
  /* r357 L5 — the cross-instance verdict (best-effort: a telemetry
   * read failure degrades to null, never a false down). */
  let allProvidersDownSince: string | null = null;
  try {
    const verdict = await assessProviderHealth(prisma);
    allProvidersDownSince = verdict.downSince?.toISOString() ?? null;
  } catch {
    // a telemetry read failure degrades to null, never a false down
  }
  return {
    mode: AI_MODE_LABEL,
    providers,
    breakers: aiProviderBreakers.snapshot(),
    dailyAskLimitPerUser: parseAiDailyLimit(process.env[AI_DAILY_LIMIT_ENV]),
    monthBudget,
    allProvidersDownSince,
  };
}

router.get('/status', async (_req, res) => {
  const start = Date.now();
  let timer: NodeJS.Timeout | undefined;
  let dbOk = true;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('status timeout')), 5_000);
      }),
    ]);
  } catch (err) {
    dbOk = false;
    logger.warn({ err }, 'status: db ping failed');
  } finally {
    if (timer) clearTimeout(timer);
  }

  // R352 K4 — the tick ledger, freshness only (ISO timestamps, no
  // summaries/counts): the tick-watch workflow answers «when did the
  // platform last tick?» from here, and a forced tick's effect is
  // observable on the next read. Best-effort — a ledger read failure
  // degrades the field to nulls, never fails the route.
  let tick: { fastAt: string | null; dailyAt: string | null; weeklyAt: string | null } = {
    fastAt: null,
    dailyAt: null,
    weeklyAt: null,
  };
  try {
    const rows = await Promise.race([
      prisma.tickRun.findMany({ select: { key: true, lastRunAt: true } }),
      new Promise<{ key: string; lastRunAt: Date }[]>((_, reject) => {
        timer = setTimeout(() => reject(new Error('tick status timeout')), 5_000);
      }),
    ]);
    const byKey = new Map(rows.map((row) => [row.key, row.lastRunAt]));
    tick = {
      fastAt: byKey.get('tick')?.toISOString() ?? null,
      dailyAt: byKey.get('tick-daily')?.toISOString() ?? null,
      weeklyAt: byKey.get('tick-weekly')?.toISOString() ?? null,
    };
  } catch (err) {
    logger.warn({ err }, 'status: tick ledger read failed');
  } finally {
    if (timer) clearTimeout(timer);
  }

  res.json({
    data: {
      ok: dbOk,
      db: { ok: dbOk, latencyMs: dbOk ? Date.now() - start : null },
      // Mode names only — never endpoints, keys, or counts.
      storageDriver: env.STORAGE_DRIVER,
      aiMode: AI_MODE_LABEL,
      /* r357 L5 — the quota-aware AI block (the mode label above stays
       * for the existing consumers; the block carries the detail). */
      ai: await aiStatusBlock(),
      mailProvider: env.MAIL_PROVIDER,
      buildId: BUILD_ID(),
      serverTime: new Date().toISOString(),
      tick,
      // r326 M0.7 — the mobile minimum-version gate: the native app
      // compares its semver on cold start; below minAppVersion it shows
      // the blocking «يلزم تحديث التطبيق» screen pointing at updateUrl.
      // Unset MIN_APP_VERSION = no gate (bare-clone/dev default).
      minAppVersion: env.MIN_APP_VERSION ?? null,
      updateUrl: env.APP_DOWNLOAD_URL ?? 'https://madarek-nine.vercel.app/app',
    },
  });
});

export default router;
