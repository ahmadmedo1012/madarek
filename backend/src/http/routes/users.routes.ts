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

// ── List users (admin only) ──────────────────────────────────────
router.get(
  '/',
  requireRole(Role.ADMIN),
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

// ── Get a user (self or admin) ───────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id!;
    if (req.user!.role !== Role.ADMIN && req.user!.id !== id) {
      throw AppError.forbidden();
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true, teacherProfile: true },
    });
    if (!user) throw AppError.notFound();
    const { passwordHash: _h, tokenVersion: _v, ...safe } = user;
    void _h; void _v;
    res.json({ data: safe });
  } catch (e) {
    next(e);
  }
});

// ── Update profile (self or admin) ───────────────────────────────
const patchSchema = z
  .object({
    firstName: z.string().min(1).max(60).optional(),
    lastName: z.string().min(1).max(60).optional(),
    avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

router.patch('/:id', validate(patchSchema), async (req, res, next) => {
  try {
    const id = req.params.id!;
    if (req.user!.role !== Role.ADMIN && req.user!.id !== id) throw AppError.forbidden();
    const data: typeof req.body = { ...req.body };
    if (req.user!.role !== Role.ADMIN) delete data.isActive; // only admins toggle active
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, firstName: true, lastName: true, avatarColor: true, isActive: true },
    });
    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

export default router;
