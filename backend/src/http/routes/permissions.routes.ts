import { Router } from 'express';
import { z } from 'zod';
import { Capability, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import {
  getEffectiveCapabilities,
  DEFAULT_ROLE_CAPABILITIES,
} from '../../lib/permissions.js';

const router = Router();
router.use(authMiddleware);

/** GET /me/permissions — what can the current user actually do */
router.get('/me/permissions', async (req, res, next) => {
  try {
    const caps = await getEffectiveCapabilities(req.user!.id, req.user!.role);
    res.json({
      data: {
        role: req.user!.role,
        capabilities: Array.from(caps),
        roleDefaults: DEFAULT_ROLE_CAPABILITIES[req.user!.role],
      },
    });
  } catch (e) { next(e); }
});

/** GET /admin/users — list users for governance UI */
router.get('/admin/users', requireCapability('USERS_MANAGE'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        avatarColor: true, avatarInitials: true, isActive: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: users });
  } catch (e) { next(e); }
});

/** GET /admin/users/:id/permissions — see effective + override list for a user */
router.get('/admin/users/:id/permissions', requireCapability('ROLES_ASSIGN'), async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        scopeFacultyId: true,
        scopeFaculty: { select: { id: true, name: true } },
      },
    });
    if (!target) throw AppError.notFound('User not found');
    const caps = await getEffectiveCapabilities(target.id, target.role);
    const overrides = await prisma.userPermission.findMany({
      where: { userId: target.id },
      orderBy: { grantedAt: 'desc' },
    });
    res.json({
      data: {
        user: target,
        roleDefaults: DEFAULT_ROLE_CAPABILITIES[target.role],
        effective: Array.from(caps),
        overrides,
      },
    });
  } catch (e) { next(e); }
});

const setOverrideSchema = z.object({
  capability: z.nativeEnum(Capability),
  // grant=true → explicitly add; grant=false → explicitly revoke;
  // grant=null → remove the override (back to role default)
  grant: z.boolean().nullable(),
  reason: z.string().max(500).optional(),
}).strict();

router.post(
  '/admin/users/:id/permissions',
  requireCapability('ROLES_ASSIGN'),
  validate(setOverrideSchema),
  async (req, res, next) => {
    try {
      const userId = req.params.id!;
      const { capability, grant, reason } = req.body as z.infer<typeof setOverrideSchema>;
      if (grant === null) {
        await prisma.userPermission.deleteMany({ where: { userId, capability } });
      } else {
        await prisma.userPermission.upsert({
          where: { userId_capability: { userId, capability } },
          update: { grant, reason: reason ?? null, grantedById: req.user!.id, grantedAt: new Date() },
          create: { userId, capability, grant, reason: reason ?? null, grantedById: req.user!.id },
        });
      }
      res.json({ data: { ok: true } });
    } catch (e) { next(e); }
  },
);

const setRoleSchema = z.object({ role: z.nativeEnum(Role) }).strict();
router.post(
  '/admin/users/:id/role',
  requireCapability('ROLES_ASSIGN'),
  validate(setRoleSchema),
  async (req, res, next) => {
    try {
      const u = await prisma.user.update({
        where: { id: req.params.id },
        data: { role: req.body.role, tokenVersion: { increment: 1 } },
        select: { id: true, role: true },
      });
      res.json({ data: u });
    } catch (e) { next(e); }
  },
);

export default router;
