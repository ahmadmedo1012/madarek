/**
 * r326 M2.6 — Expo push device registration (additive; the contract from
 * apps/mobile/docs/push-backend-proposal.md, implemented verbatim).
 *
 *   POST   /me/push-devices      — upsert by expoToken (re-registrations
 *                                  after reinstall dedupe naturally)
 *   GET    /me/push-devices      — the caller's devices (masked token)
 *   DELETE /me/push-devices/:id  — unregister (call on logout; a handed-
 *                                  over phone must not keep pushing)
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

export default router;
