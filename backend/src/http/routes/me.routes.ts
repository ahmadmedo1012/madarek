import { Router } from 'express';
import { NotificationType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
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
    // The meta carries an `unread` count (incoming, readAt null) like
    // the notifications list — without it the frontend unread badge
    // can never be honest (audit 11-c P2-13).
    const [data, total, unread] = await Promise.all([
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
      prisma.message.count({ where: { toUserId: req.user!.id, readAt: null } }),
    ]);
    res.json({ data, meta: { ...buildMeta(page, limit, total), unread } });
  } catch (e) {
    next(e);
  }
});

const sendMessageSchema = z
  .object({
    toUserId: z.string().cuid(),
    body: z.string().trim().min(1).max(4000),
  })
  .strict();

// Per-user send limiter (30/min — audit 11-c P2-13): the global
// 1000/15-min/IP limit is far too generous for a free-text write any
// authenticated user can hit; createRouteLimiter keys per-user.
router.post(
  '/messages',
  createRouteLimiter({ max: 30 }),
  validate(sendMessageSchema),
  async (req, res, next) => {
    try {
      const { toUserId, body } = req.body as z.infer<typeof sendMessageSchema>;
      if (toUserId === req.user!.id) throw AppError.badRequest('لا يمكنك إرسال رسالة إلى نفسك');

      // Pre-validate recipient + sender in one round-trip. Without the
      // recipient check a DM to a deleted/unknown id exploded as a P2003
      // foreign-key 500; and we need the sender's name for the
      // recipient-side notification anyway.
      const [recipient, sender] = await Promise.all([
        prisma.user.findUnique({
          where: { id: toUserId },
          select: { id: true, firstName: true, isActive: true },
        }),
        prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { firstName: true },
        }),
      ]);
      if (!recipient) throw AppError.notFound('المستلم غير موجود');
      if (!recipient.isActive) throw AppError.badRequest('حساب المستلم غير نشط حالياً');

      // Message + recipient notification atomically — a DM the recipient
      // never hears about is a broken loop, and a notification without
      // its message is a ghost.
      const created = await prisma.$transaction(async (tx) => {
        const message = await tx.message.create({
          data: { fromUserId: req.user!.id, toUserId, body },
        });
        // Mirror the seed notification copy style (Arabic, icon, short body).
        await tx.notification.create({
          data: {
            userId: recipient.id,
            type: NotificationType.SOCIAL,
            icon: '💬',
            title: `رسالة جديدة من ${sender?.firstName ?? 'مستخدم'}`,
            body: body.slice(0, 80),
            link: '/messages',
          },
        });
        return message;
      });
      res.status(201).json({ data: created });
    } catch (e) {
      next(e);
    }
  },
);

// Mark one incoming DM as read — recipient only. Message.readAt was
// previously written by no code path at all, so every DM thread was
// forever "unread" in the data model (audit 11-c P2-13). Mirrors the
// notifications sibling: non-recipient callers get a 404 (never leak
// existence); re-marking an already-read message just refreshes readAt.
router.patch('/messages/:id/read', async (req, res, next) => {
  try {
    const message = await prisma.message.findUnique({ where: { id: req.params.id! } });
    if (!message || message.toUserId !== req.user!.id) throw AppError.notFound();
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { readAt: new Date() },
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

const markMessagesReadSchema = z
  .object({
    // Optional: restrict the sweep to one conversation (all unread
    // DMs from a single sender) instead of every incoming message.
    fromUserId: z.string().cuid().optional(),
  })
  .strict();

// Bulk mark-incoming-read, mirroring /notifications/read-all. Only the
// recipient's own unread messages are touched; an unknown fromUserId
// simply matches zero rows.
router.post('/messages/read-all', validate(markMessagesReadSchema), async (req, res, next) => {
  try {
    const { fromUserId } = req.body as z.infer<typeof markMessagesReadSchema>;
    const result = await prisma.message.updateMany({
      where: {
        toUserId: req.user!.id,
        readAt: null,
        ...(fromUserId ? { fromUserId } : {}),
      },
      data: { readAt: new Date() },
    });
    res.json({ data: { updated: result.count } });
  } catch (e) {
    next(e);
  }
});

export default router;
