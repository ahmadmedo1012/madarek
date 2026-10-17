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
import { resolveCallerInstitutionScope } from '../../lib/profile-scoping.js';

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
      // r178 (multi-institution): an ADMIN/QUALITY caller with an
      // institution context lists ONLY that institution's members —
      // the claim is DB-verified (an ACTIVE membership in an ACTIVE
      // institution), never trusted from the token alone. OWNER and
      // contextless sessions keep the platform-wide view.
      const scopeFacultyId = await getGovernanceScope(req.user!.id);
      const institutionScope =
        req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY
          ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
          : null;
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
      }, institutionScope);
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
    // r178: profiles are per-membership — a privileged caller with an
    // institution context sees the target's profile in THAT
    // institution; self-reads and contextless callers resolve the
    // target's oldest active profile (TODO(r179/phase-5): full
    // isolation). The response keeps the singular profile keys the FE
    // consumes.
    const profileInstitution =
      isPrivileged && actor.id !== id && (actor.role === Role.ADMIN || actor.role === Role.QUALITY)
        ? await resolveCallerInstitutionScope(actor.id, actor.institutionId)
        : actor.id === id
          ? await resolveCallerInstitutionScope(actor.id, actor.institutionId)
          : null;
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
        studentProfiles: {
          where: profileInstitution
            ? { institutionId: profileInstitution }
            : { membership: { isActive: true, institution: { status: 'ACTIVE' } } },
          take: 1,
          orderBy: { createdAt: 'asc' },
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
        teacherProfiles: {
          where: profileInstitution
            ? { membership: { institutionId: profileInstitution } }
            : { membership: { isActive: true, institution: { status: 'ACTIVE' } } },
          take: 1,
          orderBy: { createdAt: 'asc' },
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

    // Singular wire keys (the FE contract) off the resolved rows.
    const studentProfile = user.studentProfiles[0] ?? null;
    const teacherProfile = user.teacherProfiles[0] ?? null;

    // Faculty governance scope — a scoped ADMIN cannot read
    // out-of-faculty users (self-view is never scope-checked).
    if (isPrivileged && actor.id !== id) {
      const scopeFacultyId = await getGovernanceScope(actor.id);
      assertWithinScope(scopeFacultyId, {
        role: user.role,
        studentFacultyId: studentProfile?.facultyId ?? null,
        teacherFacultyId: teacherProfile?.department.facultyId ?? null,
      });
    }

    res.json({
      data: {
        ...user,
        studentProfiles: undefined,
        teacherProfiles: undefined,
        studentProfile,
        teacherProfile,
      },
    });
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
    // r178: an ADMIN/QUALITY caller's institution context scopes the
    // target's faculty association (their profile in THAT institution).
    const callerInstitution =
      actor.role === Role.ADMIN || actor.role === Role.QUALITY
        ? await resolveCallerInstitutionScope(actor.id, actor.institutionId)
        : null;
    const target = await loadGovernanceTarget(id, callerInstitution);
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
