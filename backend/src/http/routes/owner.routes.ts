import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('OWNER' as Role));

// ── GET /owner/stats — platform-wide statistics ──────────────────
router.get('/owner/stats', async (_req, res, next) => {
  try {
    const [
      totalUsers,
      students,
      teachers,
      admins,
      quality,
      owners,
      totalCourses,
      totalOfferings,
      totalEnrollments,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'QUALITY' } }),
      prisma.user.count({ where: { role: 'OWNER' as Role } }),
      prisma.course.count(),
      prisma.offering.count(),
      prisma.enrollment.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    res.json({
      data: {
        totalUsers,
        students,
        teachers,
        admins,
        quality,
        owners,
        totalCourses,
        totalOfferings,
        totalEnrollments,
        recentAuditLogs,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── GET /owner/users — paginated user list ───────────────────────
router.get(
  '/owner/users',
  validate(paginationSchema.extend({ role: z.nativeEnum(Role).optional() }), 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, q, role } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
        role?: Role;
      };
      const where = {
        ...(role ? { role } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: 'insensitive' as const } },
                { firstName: { contains: q, mode: 'insensitive' as const } },
                { lastName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            avatarColor: true,
            avatarInitials: true,
            isActive: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) {
      next(e);
    }
  },
);

// ── GET /owner/activity — paginated audit log ────────────────────
router.get(
  '/owner/activity',
  validate(paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        }),
        prisma.auditLog.count(),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) {
      next(e);
    }
  },
);

// ── POST /owner/users/:id/role — change user role ────────────────
const changeRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

router.post(
  '/owner/users/:id/role',
  validate(changeRoleSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body as { role: Role };

      // Self-demotion guard
      if (id === req.user!.id) {
        throw AppError.forbidden('Cannot change your own role');
      }

      // OWNER promotion guard
      if (role === ('OWNER' as Role)) {
        throw AppError.forbidden('Cannot promote to OWNER via API');
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw AppError.notFound('User not found');

      const oldRole = user.role;

      const updated = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, role: true },
      });

      // Audit logging
      await prisma.auditLog.create({
        data: {
          action: 'ROLE_CHANGE',
          resourceType: 'User',
          resourceId: id,
          userId: req.user!.id,
          metadata: { oldRole, newRole: role },
        },
      });

      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

// ── PATCH /owner/users/:id/status — toggle isActive ──────────────
const toggleStatusSchema = z.object({
  isActive: z.boolean(),
});

router.patch(
  '/owner/users/:id/status',
  validate(toggleStatusSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body as { isActive: boolean };

      // Self-deactivation guard
      if (id === req.user!.id) {
        throw AppError.forbidden('Cannot deactivate your own account');
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw AppError.notFound('User not found');

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: { id: true, isActive: true },
      });

      // Audit logging
      await prisma.auditLog.create({
        data: {
          action: 'STATUS_CHANGE',
          resourceType: 'User',
          resourceId: id,
          userId: req.user!.id,
          metadata: { isActive },
        },
      });

      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
