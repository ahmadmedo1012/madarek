import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';
import {
  assertNotLastActiveOwner,
  assertWithinScope,
  buildScopedUserWhere,
  getGovernanceScope,
  loadGovernanceTarget,
  lockActiveOwnerRows,
  requiresLastOwnerGuard,
} from '../../lib/governance.js';

const router = Router();
router.use(authMiddleware);

// ── List users (admin only) ──────────────────────────────────────
router.get(
  '/',
  requireRole(Role.ADMIN, Role.OWNER),
  validate(paginationSchema.extend({ role: z.nativeEnum(Role).optional() }), 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, q, role } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
        role?: Role;
      };
      // Faculty governance scope: a scoped ADMIN only ever sees the
      // users of their own faculty (OWNER / unscoped ADMIN =
      // university-wide). The filter mirrors the write guards below —
      // what you cannot govern, you do not list.
      const scopeFacultyId = await getGovernanceScope(req.user!.id);
      const where = buildScopedUserWhere(scopeFacultyId, {
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
      });
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
    const actor = req.user!;
    const isPrivileged = actor.role === Role.ADMIN || actor.role === Role.OWNER;
    if (!isPrivileged && actor.id !== id) {
      throw AppError.forbidden();
    }
    // Explicit allow-list select: the previous destructure-rest strip
    // leaked account-security metadata (failedLoginCount, lockedUntil,
    // emailVerifiedAt) through this shape. Profile rows carry no
    // secrets and are part of the self/admin view contract.
    const user = await prisma.user.findUnique({
      where: { id },
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
        studentProfile: {
          select: {
            universityId: true,
            facultyId: true,
            departmentId: true,
            year: true,
            gpa: true,
            totalXp: true,
            level: true,
          },
        },
        teacherProfile: {
          select: {
            specialty: true,
            rank: true,
            departmentId: true,
            department: { select: { facultyId: true } },
            bio: true,
            position: true,
            verifiedAt: true,
          },
        },
      },
    });
    if (!user) throw AppError.notFound();

    // Faculty governance scope — a scoped ADMIN cannot read
    // out-of-faculty users (self-view is never scope-checked).
    if (isPrivileged && actor.id !== id) {
      const scopeFacultyId = await getGovernanceScope(actor.id);
      assertWithinScope(scopeFacultyId, {
        role: user.role,
        studentFacultyId: user.studentProfile?.facultyId ?? null,
        teacherFacultyId: user.teacherProfile?.department.facultyId ?? null,
      });
    }

    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

// ── Update profile (self or admin) ───────────────────────────────
const patchSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

type PatchBody = z.infer<typeof patchSchema>;

router.patch('/:id', validate(patchSchema), async (req, res, next) => {
  try {
    const id = req.params.id!;
    const actor = req.user!;
    const isPrivileged = actor.role === Role.ADMIN || actor.role === Role.OWNER;
    if (!isPrivileged && actor.id !== id) throw AppError.forbidden();
    const data: Partial<PatchBody> = { ...(req.body as PatchBody) };
    if (!isPrivileged) delete data.isActive; // only admins/owner toggle active
    // Self-deactivation guard — an ADMIN/OWNER who deactivates their own
    // account instantly loses the ability to undo it (the API requires an
    // active privileged account to re-activate). The OWNER user-management
    // route has the same guard; this is the ADMIN-facing path.
    if (data.isActive === false && id === actor.id) {
      throw AppError.forbidden('لا يمكنك تعطيل حسابك الخاص');
    }

    // Pre-load the target: a clean 404 (an update on a missing id
    // surfaces as P2025) plus the context the governance guards need.
    const target = await loadGovernanceTarget(id);
    if (!target) throw AppError.notFound('المستخدم غير موجود');

    if (isPrivileged && actor.id !== id) {
      // Faculty governance scope — a scoped ADMIN cannot modify
      // out-of-faculty users (profile, status or otherwise).
      const scopeFacultyId = await getGovernanceScope(actor.id);
      assertWithinScope(scopeFacultyId, target);
    }

    // Plain profile edits are routine; only status moves are
    // governance-relevant and get the guard + audit treatment.
    if (data.isActive === undefined) {
      const user = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, firstName: true, lastName: true, avatarColor: true, isActive: true },
      });
      return res.json({ data: user });
    }

    // Status change by a privileged actor (self-deactivation is
    // impossible here — the guard above rejected it; non-privileged
    // actors never carry isActive at all).
    //
    // Never deactivate the last active OWNER (governance lockout —
    // OWNER is invitation-only), revoke the target's refresh tokens
    // immediately on deactivation, and write the STATUS_CHANGE audit
    // row — all inside one transaction, mirroring the OWNER path
    // including its FOR UPDATE owner-row lock (audit 15-b P1-1: a
    // plain guard count is a read that row locks never block under
    // Read-Committed, so this ADMIN path must take the same lock the
    // OWNER console does or the two surfaces can race each other into
    // a zero-active-OWNER lockout).
    const deactivatesOwner = requiresLastOwnerGuard({
      targetRole: target.role,
      newIsActive: data.isActive,
    });
    const updated = await prisma.$transaction(async (tx) => {
      if (deactivatesOwner) {
        await lockActiveOwnerRows(tx);
        await assertNotLastActiveOwner(id, tx);
      }
      const u = await tx.user.update({
        where: { id },
        data: {
          ...data,
          // tokenVersion bump on deactivation kills the target's
          // outstanding refresh tokens outright instead of waiting for
          // the isActive re-check on their next refresh.
          ...(data.isActive === false ? { tokenVersion: { increment: 1 } } : {}),
        },
        select: { id: true, firstName: true, lastName: true, avatarColor: true, isActive: true },
      });
      await tx.auditLog.create({
        data: {
          action: 'STATUS_CHANGE',
          resourceType: 'User',
          resourceId: id,
          userId: actor.id,
          metadata: { isActive: data.isActive },
        },
      });
      return u;
    });

    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
