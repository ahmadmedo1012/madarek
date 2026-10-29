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
    },
  });
});

export default router;
