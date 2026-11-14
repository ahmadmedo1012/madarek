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
import { buildIdFromEnv } from '../../lib/build-id.js';
import { logger } from '../../logger.js';

const router = Router();

const BUILD_ID = buildIdFromEnv(env.RENDER_GIT_COMMIT ?? env.GIT_SHA);

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
      aiMode: env.AI_PROVIDER,
      mailProvider: env.MAIL_PROVIDER,
      buildId: BUILD_ID,
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
