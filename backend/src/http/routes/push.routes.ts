/**
 * r326 M2.6 — Expo push device registration (additive; the contract from
 * apps/mobile/docs/push-backend-proposal.md, implemented verbatim) +
 * R353 N's per-user push preferences.
 *
 *   POST   /me/push-devices      — upsert by expoToken (re-registrations
 *                                  after reinstall dedupe naturally)
 *   GET    /me/push-devices      — the caller's devices (masked token)
 *   DELETE /me/push-devices/:id  — unregister (call on logout; a handed-
 *                                  over phone must not keep pushing)
 *   GET    /me/push-preferences  — R353 N: the 4 push categories
 *                                  (URGENT/ACADEMIC/SYSTEM/SOCIAL) with
 *                                  absent = ON, no quiet hours
 *   PUT    /me/push-preferences  — upsert one category: pushEnabled +
 *                                  optional quiet hours (UTC 0-23)
 *
 * All three require auth; tokens are scoped to the caller; the send path
 * (Expo fan-out) is gated separately by PUSH_ENABLED and lands with the
 * client wiring — registration alone changes nothing for the web.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../validate.js';
import { PUSH_CATEGORIES } from '../../modules/notifications/core.js';

const router = Router();
router.use(authMiddleware);

const upsertBody = z
  .object({
    expoToken: z.string().trim().min(20).max(200),
    platform: z.enum(['ANDROID', 'IOS', 'WEB']),
    appVersion: z.string().max(40).optional(),
  })
  .strict();

router.post('/me/push-devices', validate(upsertBody), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof upsertBody>;
    const device = await prisma.pushDevice.upsert({
      where: { expoToken: b.expoToken },
      create: {
        userId: req.user!.id,
        expoToken: b.expoToken,
        platform: b.platform,
        appVersion: b.appVersion ?? null,
      },
      update: {
        // A reinstall re-registers the same token for a possibly different
        // account — the latest registrant owns the device row.
        userId: req.user!.id,
        platform: b.platform,
        appVersion: b.appVersion ?? null,
        lastSeenAt: new Date(),
      },
    });
    res.status(201).json({ data: { id: device.id, platform: device.platform } });
  } catch (e) {
    next(e);
  }
});

router.get('/me/push-devices', async (req, res, next) => {
  try {
    const devices = await prisma.pushDevice.findMany({
      where: { userId: req.user!.id },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, platform: true, appVersion: true, lastSeenAt: true, createdAt: true },
    });
    res.json({ data: devices });
  } catch (e) {
    next(e);
  }
});

router.delete('/me/push-devices/:id', async (req, res, next) => {
  try {
    const device = await prisma.pushDevice.findUnique({ where: { id: req.params.id! } });
    if (!device || device.userId !== req.user!.id) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'غير موجود' } });
      return;
    }
    await prisma.pushDevice.delete({ where: { id: device.id } });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

/* ── R353 N — the push notification preferences ─────────────────────
 * Same law as the mail twins in me.routes.ts (R350 E6): the push
 * categories are the NotificationPayload types, absent row = ON with
 * no quiet hours. Every category is user-suppressible — push is the
 * tap on the shoulder, never the surface of record: the bell inbox
 * row is written regardless, so there is no "essential" carve-out
 * here (a password-reset mail MUST arrive; its push cousin may not).
 * Quiet hours are UTC hours 0-23, the window [start, end) — both ends
 * set or none (a lone end is stored but inactive, the fan-out's law). */

router.get('/me/push-preferences', async (req, res, next) => {
  try {
    const rows = await prisma.notificationPreference.findMany({
      where: { userId: req.user!.id, category: { in: [...PUSH_CATEGORIES] } },
      select: { category: true, pushEnabled: true, quietStart: true, quietEnd: true },
    });
    const byCategory = new Map(rows.map((r) => [r.category, r]));
    res.json({
      data: PUSH_CATEGORIES.map((category) => ({
        category,
        pushEnabled: byCategory.get(category)?.pushEnabled ?? true,
        quietStart: byCategory.get(category)?.quietStart ?? null,
        quietEnd: byCategory.get(category)?.quietEnd ?? null,
      })),
    });
  } catch (e) {
    next(e);
  }
});

const pushPreferenceBody = z
  .object({
    category: z.enum(PUSH_CATEGORIES),
    pushEnabled: z.boolean(),
    quietStart: z.number().int().min(0).max(23).nullish(),
    quietEnd: z.number().int().min(0).max(23).nullish(),
  })
  .strict();

router.put('/me/push-preferences', validate(pushPreferenceBody), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof pushPreferenceBody>;
    // Full-state PUT (the mail twin's contract): an absent quiet field
    // CLEARS it — nullish collapses to null in both branches.
    const row = await prisma.notificationPreference.upsert({
      where: { userId_category: { userId: req.user!.id, category: b.category } },
      update: {
        pushEnabled: b.pushEnabled,
        quietStart: b.quietStart ?? null,
        quietEnd: b.quietEnd ?? null,
      },
      create: {
        userId: req.user!.id,
        category: b.category,
        pushEnabled: b.pushEnabled,
        quietStart: b.quietStart ?? null,
        quietEnd: b.quietEnd ?? null,
      },
      select: { category: true, pushEnabled: true, quietStart: true, quietEnd: true },
    });
    res.json({ data: row });
  } catch (e) {
    next(e);
  }
});

export default router;
