import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

router.get('/notifications', validate(paginationSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const where = { userId: req.user!.id };
    const [data, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    res.json({ data, meta: { ...buildMeta(page, limit, total), unread } });
  } catch (e) {
    next(e);
  }
});

router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    const note = await prisma.notification.findUnique({ where: { id: req.params.id! } });
    if (!note || note.userId !== req.user!.id) throw AppError.notFound();
    const updated = await prisma.notification.update({
      where: { id: note.id },
      data: { readAt: new Date() },
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.post('/notifications/read-all', async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ data: { updated: result.count } });
  } catch (e) {
    next(e);
  }
});

// ── Messages (DMs) ──────────────────────────────────────────────
router.get('/messages', validate(paginationSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const where = { OR: [{ fromUserId: req.user!.id }, { toUserId: req.user!.id }] };
    const [data, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { select: { id: true, firstName: true, lastName: true, avatarColor: true } },
          toUser: { select: { id: true, firstName: true, lastName: true, avatarColor: true } },
        },
      }),
      prisma.message.count({ where }),
    ]);
    res.json({ data, meta: buildMeta(page, limit, total) });
  } catch (e) {
    next(e);
  }
});

const sendMessageSchema = z
  .object({
    toUserId: z.string().cuid(),
    body: z.string().min(1).max(4000),
  })
  .strict();

router.post('/messages', validate(sendMessageSchema), async (req, res, next) => {
  try {
    if (req.body.toUserId === req.user!.id) throw AppError.badRequest('Cannot message yourself');
    const created = await prisma.message.create({
      data: { fromUserId: req.user!.id, toUserId: req.body.toUserId, body: req.body.body },
    });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

export default router;
