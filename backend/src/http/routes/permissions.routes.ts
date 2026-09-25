import { Router } from 'express';
import { z } from 'zod';
import { Capability, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';
import {
  assertNotLastActiveOwner,
  assertWithinScope,
  buildScopedUserWhere,
  buildTeacherProvision,
  getGovernanceScope,
  loadGovernanceTarget,
  lockActiveOwnerRows,
  planTeacherProvisioning,
  requiresLastOwnerGuard,
} from '../../lib/governance.js';
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

/**
 * GET /admin/users — list users for the governance UI.
 *
 * Paginated like every other user list (previously a silent hard cap
 * of 200 with no meta — user #201 was invisible). The default limit
 * matches that old cap so the current governance UI, which sends no
 * query params and filters client-side, keeps seeing the same window.
 */
const adminUsersListSchema = paginationSchema.extend({
  role: z.nativeEnum(Role).optional(),
  limit: z.coerce.number().int().positive().max(200).default(200),
});

router.get(
  '/admin/users',
  requireCapability('USERS_MANAGE'),
  validate(adminUsersListSchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, q, role } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
        role?: Role;
      };
      // Faculty governance scope: a scoped ADMIN only lists the users
      // of their own faculty — mirrors the write guards below.
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
            id: true, email: true, role: true, firstName: true, lastName: true,
            avatarColor: true, avatarInitials: true, isActive: true, createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) { next(e); }
  },
);

/** GET /admin/users/:id/permissions — see effective + override list for a user */
router.get('/admin/users/:id/permissions', requireCapability('ROLES_ASSIGN'), async (req, res, next) => {
  try {
    // Faculty governance scope — a scoped ADMIN cannot inspect the
    // permission profile of an out-of-faculty user.
    const targetScope = await loadGovernanceTarget(req.params.id!);
    if (!targetScope) throw AppError.notFound('User not found');
    const actorScopeFacultyId = await getGovernanceScope(req.user!.id);
    assertWithinScope(actorScopeFacultyId, targetScope);

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
      // Pre-validate the target: without this, a grant against a
      // non-existent user surfaced as a P2003 foreign-key 500 instead
      // of a clean 404.
      const target = await loadGovernanceTarget(userId);
      if (!target) throw AppError.notFound('User not found');

      // Faculty governance scope — capability overrides change what a
      // user can do platform-wide; a scoped ADMIN may only touch the
      // users of their own faculty.
      const actorScopeFacultyId = await getGovernanceScope(req.user!.id);
      assertWithinScope(actorScopeFacultyId, target);

      // Apply the override + write the governance audit trail atomically
      // (one transaction — never a grant without an audit row, or vice
      // versa). Capability grants/revokes are security-relevant: they
      // belong in the audit log exactly like role changes (OWNER path).
      await prisma.$transaction(async (tx) => {
        if (grant === null) {
          await tx.userPermission.deleteMany({ where: { userId, capability } });
        } else {
          await tx.userPermission.upsert({
            where: { userId_capability: { userId, capability } },
            update: { grant, reason: reason ?? null, grantedById: req.user!.id, grantedAt: new Date() },
            create: { userId, capability, grant, reason: reason ?? null, grantedById: req.user!.id },
          });
        }
        // Audit log — capability grants were previously invisible to
        // governance. Resource + role metadata for the full trail.
        await tx.auditLog.create({
          data: {
            action: 'CAPABILITY_OVERRIDE',
            resourceType: 'UserPermission',
            resourceId: userId,
            userId: req.user!.id,
            metadata: { capability, grant, reason: reason ?? null, targetRole: target.role },
          },
        });
      });
      res.json({ data: { ok: true } });
    } catch (e) { next(e); }
  },
);

/**
 * POST /admin/users/:id/role — change a user's role.
 *
 * Optional provisioning payload for TEACHER promotions (same contract
 * as the OWNER path): a TeacherProfile needs a home department; we
 * default to the student's current department when promoting
 * STUDENT→TEACHER, but allow an explicit override for every other
 * promotion path.
 */
const setRoleSchema = z
  .object({
    role: z.nativeEnum(Role),
    departmentId: z.string().cuid().optional(),
    specialty: z.string().min(2).max(120).optional(),
  })
  .strict();

router.post(
  '/admin/users/:id/role',
  requireCapability('ROLES_ASSIGN'),
  validate(setRoleSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id!;
      const { role: newRole, departmentId, specialty } = req.body as z.infer<typeof setRoleSchema>;

      // Self-modification guard — same protection the OWNER endpoint enforces.
      if (id === req.user!.id) {
        throw AppError.forbidden('Cannot change your own role');
      }

      // OWNER is invitation-only — never mint an OWNER account through the
      // admin role-assignment API. The OWNER-only path
      // (`POST /api/v1/owner/users/:id/role`) enforces the same guard.
      if (newRole === Role.OWNER) {
        throw AppError.forbidden('Cannot promote to OWNER via API');
      }

      const target = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          studentProfile: { select: { departmentId: true, facultyId: true } },
          teacherProfile: { select: { userId: true, department: { select: { facultyId: true } } } },
        },
      });
      if (!target) throw AppError.notFound('User not found');

      const oldRole = target.role;

      // Faculty governance scope — a scoped ADMIN may only change the
      // roles of users in their own faculty.
      const actorScopeFacultyId = await getGovernanceScope(req.user!.id);
      assertWithinScope(actorScopeFacultyId, {
        role: target.role,
        studentFacultyId: target.studentProfile?.facultyId ?? null,
        teacherFacultyId: target.teacherProfile?.department.facultyId ?? null,
      });

      // ── Profile provisioning for TEACHER promotions ────────────
      // Parity with the OWNER path: a STUDENT→TEACHER promotion
      // previously left the user with NO TeacherProfile, so every
      // teacher surface 404'd. Provision the required profile fields
      // in the SAME transaction as the role change. Demotions keep
      // profile data intact (read routes 403 non-teachers) — no
      // dangling state is created either way.
      const provisionPlan = planTeacherProvisioning({
        newRole,
        oldRole,
        hasTeacherProfile: Boolean(target.teacherProfile),
        explicitDepartmentId: departmentId ?? null,
        studentDepartmentId: target.studentProfile?.departmentId ?? null,
      });
      if (provisionPlan.kind === 'missing-department') {
        throw AppError.badRequest(
          'Promotion to TEACHER requires a home department — pass departmentId (or promote from a student profile that has one)',
        );
      }
      const teacherProvision =
        provisionPlan.kind === 'create' ? buildTeacherProvision(id, provisionPlan, specialty) : null;

      // Role + guard + provisioning + audit atomically; tokenVersion
      // bump kills the target's outstanding refresh tokens so stale
      // JWTs with the old role can't be refreshed back into use.
      // The last-active-owner guard runs INSIDE the transaction, after
      // locking the active OWNER rows FOR UPDATE — without it an ADMIN
      // could demote the sole OWNER account and permanently lock the
      // platform out of its master governance role (OWNER is
      // invitation-only; audit 11-c P0-1), and without the lock the
      // plain count is a read that a concurrent demotion/deactivation
      // on another surface can race past under Read-Committed (audit
      // 15-b P1-1 — same lock the OWNER console takes).
      const updated = await prisma.$transaction(async (tx) => {
        if (requiresLastOwnerGuard({ targetRole: oldRole, newRole })) {
          await lockActiveOwnerRows(tx);
          await assertNotLastActiveOwner(id, tx);
        }
        const u = await tx.user.update({
          where: { id },
          data: { role: newRole, tokenVersion: { increment: 1 } },
          select: { id: true, role: true },
        });
        if (teacherProvision) await teacherProvision(tx);
        await tx.auditLog.create({
          data: {
            action: 'ROLE_CHANGE',
            resourceType: 'User',
            resourceId: id,
            userId: req.user!.id,
            metadata: {
              oldRole,
              newRole,
              source: 'admin',
              ...(teacherProvision ? { teacherProfileProvisioned: true } : {}),
            },
          },
        });
        return u;
      });

      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

export default router;
