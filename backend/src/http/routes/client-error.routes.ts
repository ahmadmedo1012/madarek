/**
 * r326 M1.1 — native client crash/error telemetry (additive).
 *
 *   POST  /client-errors        — the mobile telemetry firehose (public:
 *                                 crashes BEFORE login must still report;
 *                                 10/hour/IP — telemetry, not a channel)
 *   GET   /client-errors        — the OWNER inbox (paginated, kind +
 *                                 reviewed filters, counts)
 *   PATCH /client-errors/:id/reviewed — mark reviewed (OWNER)
 *
 * Storage: prisma ClientError (userId optional — the anonymous case is the
 * norm for pre-auth crashes). Payload mirrors the mobile telemetry module
 * (apps/mobile/src/lib/telemetry.ts): kind/message/stack/route/role/
 * breadcrumbs/appVersion/updateId/runtimeVersion/deviceModel/os/osVersion.
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';

const router = Router();

const crumbSchema = z.string().max(200);

const reportBody = z
  .object({
    kind: z.enum(['crash', 'js_error', 'unhandled_rejection', 'api_error', 'render']),
    message: z.string().min(1).max(2000),
    stack: z.string().max(8000).nullable().optional(),
    route: z.string().max(300).optional(),
    role: z.string().max(40).optional(),
    breadcrumbs: z.array(crumbSchema).max(30).optional(),
    appVersion: z.string().max(40).optional(),
    updateId: z.string().max(100).nullable().optional(),
    runtimeVersion: z.string().max(100).nullable().optional(),
    deviceModel: z.string().max(120).optional(),
    osName: z.string().max(40).optional(),
    osVersion: z.string().max(40).optional(),
  })
  .strict();

router.post(
  '/client-errors',
  createRouteLimiter({ windowMs: 60 * 60 * 1000, max: 10 }),
  validate(reportBody),
  optionalAuthMiddleware,
  async (req, res, next) => {
    try {
      const b = req.body as z.infer<typeof reportBody>;
      await prisma.clientError.create({
        data: {
          // Optional auth: pre-login crashes land anonymously, a valid
          // token attributes the report to its user.
          userId: req.user?.id ?? null,
          kind: b.kind,
          message: b.message,
          stack: b.stack ?? null,
          route: b.route ?? null,
          role: b.role ?? req.user?.role ?? null,
          breadcrumbs: b.breadcrumbs ? { rows: b.breadcrumbs } : undefined,
          appVersion: b.appVersion ?? null,
          updateId: b.updateId ?? null,
          runtimeVersion: b.runtimeVersion ?? null,
          deviceModel: b.deviceModel ?? null,
          osName: b.osName ?? null,
          osVersion: b.osVersion ?? null,
          userAgent: req.headers['user-agent']?.slice(0, 300) ?? null,
        },
      });
      res.status(201).json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

const listQuery = paginationSchema.extend({
  kind: z.enum(['crash', 'js_error', 'unhandled_rejection', 'api_error', 'render']).optional(),
  reviewed: z.enum(['no', 'yes', 'all']).default('no'),
});

router.get(
  '/client-errors',
  authMiddleware,
  requireRole(Role.OWNER),
  validate(listQuery, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, kind, reviewed } = req.query as unknown as z.infer<typeof listQuery>;
      const where = {
        ...(kind ? { kind } : {}),
        ...(reviewed === 'no' ? { reviewedAt: null } : reviewed === 'yes' ? { NOT: { reviewedAt: null } } : {}),
      };
      const [data, total, unreviewed] = await Promise.all([
        prisma.clientError.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        }),
        prisma.clientError.count({ where }),
        prisma.clientError.count({ where: { reviewedAt: null } }),
      ]);
      res.json({ data, meta: { ...buildMeta(page, limit, total), unreviewed } });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/client-errors/:id/reviewed',
  authMiddleware,
  requireRole(Role.OWNER),
  async (req, res, next) => {
    try {
      const existing = await prisma.clientError.findUnique({ where: { id: req.params.id! } });
      if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'غير موجود' } });
        return;
      }
      const updated = await prisma.clientError.update({
        where: { id: existing.id },
        data: { reviewedAt: existing.reviewedAt ? null : new Date() },
      });
      logger.info({ id: updated.id, reviewed: Boolean(updated.reviewedAt) }, 'client-error review toggled');
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
