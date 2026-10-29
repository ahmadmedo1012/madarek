import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { AppError } from '../../lib/errors.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { canTransitionStatus, screenshotOk, type FeedbackStatus } from '../../modules/feedback/core.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';

/**
 * r323 B3.6 — the pilot feedback loop.
 *
 *   POST  /feedback      — the floating widget (any signed-in user;
 *                          5 / hour — a pilot tap, not a firehose)
 *   GET   /feedback      — the registrar/owner inbox (status filter +
 *                          pagination)
 *   PATCH /feedback/:id  — the status grammar (core.ts): open →
 *                          triage → fixed | dismissed (terminal)
 */

const router = Router();

const consoleEntrySchema = z.object({
  t: z.number().int().nonnegative(),
  text: z.string().max(500),
});

const createBody = z
  .object({
    kind: z.enum(['BUG', 'IDEA']),
    note: z.string().trim().min(10, 'الوصف قصير جدًا — 10 أحرف على الأقل').max(2000),
    route: z.string().trim().max(300).optional(),
    console: z.array(consoleEntrySchema).max(20).optional(),
    screenshot: z.string().optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.screenshot !== undefined && !screenshotOk(b.screenshot)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['screenshot'], message: 'اللقطة غير صالحة أو أكبر من الحد' });
    }
  });

router.post(
  '/feedback',
  authMiddleware,
  createRouteLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
  validate(createBody),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createBody>;
      const created = await prisma.pilotFeedback.create({
        data: {
          userId: req.user!.id,
          kind: body.kind,
          role: req.user!.role,
          route: body.route ?? null,
          userAgent: (req.headers['user-agent'] ?? '').slice(0, 300) || null,
          console: body.console ? (body.console as never) : undefined,
          note: body.note,
          screenshot: body.screenshot ?? null,
        },
        select: { id: true, createdAt: true },
      });
      logger.info({ feedbackId: created.id, kind: body.kind, userId: req.user!.id }, 'feedback: filed');
      res.status(201).json({ data: created });
    } catch (e) { next(e); }
  },
);

router.get(
  '/feedback',
  authMiddleware,
  requireRole(Role.ADMIN, Role.QUALITY, Role.OWNER),
  validate(paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 50);
      const status = typeof req.query.status === 'string' ? req.query.status : null;
      const where = status && ['open', 'triage', 'fixed', 'dismissed'].includes(status) ? { status } : {};
      const [rows, total] = await Promise.all([
        prisma.pilotFeedback.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        }),
        prisma.pilotFeedback.count({ where }),
      ]);
      res.json({ data: rows, meta: buildMeta(page, limit, total) });
    } catch (e) { next(e); }
  },
);

const patchBody = z.object({ status: z.enum(['open', 'triage', 'fixed', 'dismissed']) }).strict();

router.patch(
  '/feedback/:id',
  authMiddleware,
  requireRole(Role.ADMIN, Role.QUALITY, Role.OWNER),
  validate(patchBody),
  async (req, res, next) => {
    try {
      const row = await prisma.pilotFeedback.findUnique({ where: { id: req.params.id! }, select: { status: true } });
      if (!row) throw AppError.notFound('التقرير غير موجود');
      if (!canTransitionStatus(row.status as FeedbackStatus, (req.body as z.infer<typeof patchBody>).status)) {
        throw AppError.conflict('لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية');
      }
      const updated = await prisma.pilotFeedback.update({
        where: { id: req.params.id! },
        data: { status: (req.body as z.infer<typeof patchBody>).status },
        select: { id: true, status: true },
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

export default router;
