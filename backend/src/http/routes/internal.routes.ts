/**
 * R351 X2b — POST /api/v1/internal/tick: the serverless timer surface.
 *
 * Triggers that hit this route (see lib/tick.ts for the claim design):
 *   1. Vercel's daily cron (vercel.json `crons`; Vercel sends
 *      `Authorization: Bearer $CRON_SECRET` automatically when the
 *      CRON_SECRET env var exists — the documented secure-cron flow);
 *   2. the GitHub Actions every-5-minutes ticker (tick.yml, dormant until the
 *      TICK_TARGET_URL repo variable is set at the X4 cutover — never
 *      point it at Render before then, it would keep Render awake and
 *      defeat X0);
 *   3. the owner's optional external pinger (cron-job.org/UptimeRobot,
 *      documented in the owner guide — add the Bearer header).
 *
 * R354 V2 — POST /api/v1/internal/ai-selftest: the provider REALITY
 * probe. Runs INSIDE the production function (fra1) so the vantage
 * point is the one that actually serves student chats: every provider
 * in the resolved chain gets a /models probe + a 1-token completion,
 * answered with {provider, ok, status, latencyMs, model} rows. Keys
 * NEVER appear in the response (lib/ai/selftest.ts redacts). Same
 * CRON_SECRET belt as the tick; owner-triggered via the ai-selftest
 * workflow (workflow_dispatch — write-access only).
 *
 * Auth: CRON_SECRET (Bearer or ?key=), timing-safe compared; unset
 * secret = 503 fail-closed (the mail-webhook law). The route mounts
 * BEFORE the global rate limiter — cron must never be throttled.
 */
import { Router, type Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

import { env } from '../../env.js';
import { runPlatformTick } from '../../lib/tick-jobs.js';
import { runAiSelftest } from '../../lib/ai/selftest.js';

export const internalRouter = Router();

function secretMatches(presented: unknown): boolean {
  if (typeof presented !== 'string' || !env.CRON_SECRET) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(env.CRON_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

function tickAuthorized(req: Request): boolean {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const qKey = typeof req.query.key === 'string' ? req.query.key : undefined;
  return secretMatches(bearer ?? qKey);
}

internalRouter.post('/tick', async (req, res) => {
  if (!env.CRON_SECRET) {
    // Fail-closed, mirroring the mail webhook: an unconfigured secret
    // must never turn the tick endpoint into an open job runner.
    res.status(503).json({
      error: { code: 'TICK_DISABLED', message: 'CRON_SECRET is not configured' },
    });
    return;
  }
  if (!tickAuthorized(req)) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'مفتاح التشغيل غير صحيح' },
    });
    return;
  }
  const label =
    req.headers['x-vercel-cron'] === '1'
      ? 'vercel-cron'
      : typeof req.query.label === 'string' && req.query.label.length <= 40
        ? req.query.label
        : 'http';
  const report = await runPlatformTick(label);
  res.json({ data: { ok: true, report } });
});

// R354 V2 — the provider reality probe (see the header comment). The
// whole probe set is bounded (~10 s worst case, parallel legs, 10 s
// AbortController deadlines) far inside the function's 60 s ceiling.
internalRouter.post('/ai-selftest', async (req, res) => {
  if (!env.CRON_SECRET) {
    res.status(503).json({
      error: { code: 'SELFTEST_DISABLED', message: 'CRON_SECRET is not configured' },
    });
    return;
  }
  if (!tickAuthorized(req)) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'مفتاح التشغيل غير صحيح' },
    });
    return;
  }
  const report = await runAiSelftest(process.env);
  res.json({ data: { ok: true, report } });
});
