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
  resolveProvisionInstitution,
} from '../../lib/governance.js';
import { resolveCallerInstitutionScope, institutionContextRequiredError } from '../../lib/profile-scoping.js';
import {
  getEffectiveCapabilities,
  DEFAULT_ROLE_CAPABILITIES,
} from '../../lib/permissions.js';

const router = Router();
router.use(authMiddleware);

/** GET /me/permissions — what can the current user actually do */
router.get('/me/permissions', async (req, res, next) => {
  try {
    // r178: capabilities resolve IN the token's institution context when
    // one is present (institution-scoped UserPermission grants apply on
    // top of the global ones); a contextless session sees global grants
    // only (a scoped grant must never leak into it).
    const caps = await getEffectiveCapabilities(req.user!.id, req.user!.role, req.user!.institutionId);
    // r178: the effective membership role when a context is selected
    // (null for contextless sessions) — the FE can label the source of
    // the capability set. Resolved from the DB for the token's inst
    // claim (this router runs authMiddleware only, so req.membership is
    // NOT attached here — an unverified claim must never label the
    // payload; an inactive membership reports null, not a stale role).
    const membershipRole = req.user!.institutionId
      ? (await prisma.membership.findFirst({
          where: {
            userId: req.user!.id,
            institutionId: req.user!.institutionId,
            isActive: true,
            institution: { status: 'ACTIVE' },
          },
          select: { role: true },
        }))?.role ?? null
      : null;
    res.json({
      data: {
        role: req.user!.role,
        capabilities: Array.from(caps),
        roleDefaults: DEFAULT_ROLE_CAPABILITIES[req.user!.role],
        membershipRole,
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
      // r179 (phase-5): an ADMIN/QUALITY caller MUST hold a DB-verified
      // institution context (403 INSTITUTION_CONTEXT_REQUIRED without
      // one); the list is pinned to that institution. OWNER keeps the
      // platform-wide view.
      const scopeFacultyId = await getGovernanceScope(req.user!.id);
      const institutionScope =
        req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY
          ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
          : null;
      if (
        (req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY) &&
        !institutionScope
      ) {
        throw institutionContextRequiredError();
      }
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
    // permission profile of an out-of-faculty user. r179 (phase-5):
    // an ADMIN/QUALITY caller MUST hold a DB-verified institution
    // context (403 without one) and the target must be a member of
    // that institution (404 otherwise — never leak a foreign user's
    // existence); OWNER reads any target (platform governance).
    const callerInstitution =
      req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY
        ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
        : null;
    if ((req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY) && !callerInstitution) {
      throw institutionContextRequiredError();
    }
    if (callerInstitution) {
      const targetMembership = await prisma.membership.findFirst({
        where: {
          userId: req.params.id!,
          institutionId: callerInstitution,
          isActive: true,
          institution: { status: 'ACTIVE' },
        },
        select: { id: true },
      });
      if (!targetMembership) throw AppError.notFound('المستخدم غير موجود');
    }
    const targetScope = await loadGovernanceTarget(req.params.id!, callerInstitution);
    if (!targetScope) throw AppError.notFound('المستخدم غير موجود');
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
    if (!target) throw AppError.notFound('المستخدم غير موجود');
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
  reason: z.string().trim().max(500).optional(),
}).strict();

router.post(
  '/admin/users/:id/permissions',
  requireCapability('ROLES_ASSIGN'),
  validate(setOverrideSchema),
  async (req, res, next) => {
    try {
      const userId = req.params.id!;
      const { capability, grant, reason } = req.body as z.infer<typeof setOverrideSchema>;

      // Self-modification guard (r157 / 6A9): the editor is ROLES_ASSIGN-
      // gated, but an ADMIN holding that capability could still point it
      // at their own row — self-granting USERS_MANAGE/ROLES_ASSIGN in one
      // request and locking the governance loop open for themselves.
      // Same protection the role endpoint below enforces; it runs BEFORE
      // the governance-target read so a self-edit never even resolves
      // its own row.
      if (userId === req.user!.id) {
        throw AppError.forbidden('لا يمكنك تعديل صلاحياتك بنفسك');
      }

      // Pre-validate the target: without this, a grant against a
      // non-existent user surfaced as a P2003 foreign-key 500 instead
      // of a clean 404.
      // r179 (phase-5): an ADMIN/QUALITY caller MUST hold a DB-verified
      // institution context (403 without one); the target must be a
      // member of that institution (403 — a cross-institution
      // governance write). OWNER governs platform-wide (null context).
      const callerInstitution =
        req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY
          ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
          : null;
      if ((req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY) && !callerInstitution) {
        throw institutionContextRequiredError();
      }
      if (callerInstitution) {
        const targetMembership = await prisma.membership.findFirst({
          where: {
            userId,
            institutionId: callerInstitution,
            isActive: true,
            institution: { status: 'ACTIVE' },
          },
          select: { id: true },
        });
        if (!targetMembership) {
          throw AppError.forbidden('هذا المستخدم ليس عضواً في مؤسستك');
        }
      }
      const target = await loadGovernanceTarget(userId, callerInstitution);
      if (!target) throw AppError.notFound('المستخدم غير موجود');

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
          // r178: this surface stays platform-global — only NULL-
          // institutionId overrides are removed (an institution-scoped
          // grant belongs to the institution's own console, Phase 5).
          await tx.userPermission.deleteMany({
            where: { userId, capability, institutionId: null },
          });
        } else {
          /* r178: the global override (institutionId = NULL) cannot be
           * addressed through the compound-unique upsert — Prisma types
           * the triple's input institutionId as non-nullable (PG itself
           * treats NULLs as distinct there). The explicit
           * find-then-write pair below is the documented app-level
           * upsert on the triple. */
          const existing = await tx.userPermission.findFirst({
            where: { userId, capability, institutionId: null },
            select: { id: true },
          });
          if (existing) {
            await tx.userPermission.update({
              where: { id: existing.id },
              data: { grant, reason: reason ?? null, grantedById: req.user!.id, grantedAt: new Date() },
            });
          } else {
            await tx.userPermission.create({
              data: { userId, capability, grant, reason: reason ?? null, grantedById: req.user!.id },
            });
          }
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
    specialty: z.string().trim().min(2).max(120).optional(),
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
        throw AppError.forbidden('لا يمكنك تغيير دورك بنفسك');
      }

      // OWNER is invitation-only — never mint an OWNER account through the
      // admin role-assignment API. The OWNER-only path
      // (`POST /api/v1/owner/users/:id/role`) enforces the same guard.
      if (newRole === Role.OWNER) {
        throw AppError.forbidden('لا يمكن منح دور المالك عبر النظام — تواصل مع الدعم الفني');
      }

      // r179 (phase-5): DB-verified caller institution context —
      // REQUIRED for ADMIN/QUALITY (403 without one); null for the
      // platform OWNER only. It scopes the target's profile reads
      // below (no legacy oldest-profile fallback — an OWNER promotion
      // without a context needs an explicit departmentId) and the
      // TEACHER-provisioning institution further down.
      const callerInstitution =
        req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY
          ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
          : null;
      if ((req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY) && !callerInstitution) {
        throw institutionContextRequiredError();
      }
      const target = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          // r179: per-membership profiles — resolved within the caller's
          // institution context only; without one (OWNER) NO profile is
          // read (the promotion then needs an explicit departmentId).
          studentProfiles: {
            where: callerInstitution
              ? { institutionId: callerInstitution }
              : { id: { in: [] } },
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { departmentId: true, facultyId: true },
          },
          teacherProfiles: {
            where: callerInstitution
              ? { membership: { institutionId: callerInstitution } }
              : { id: { in: [] } },
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { id: true, department: { select: { facultyId: true } } },
          },
        },
      });
      if (!target) throw AppError.notFound('المستخدم غير موجود');

      const oldRole = target.role;
      const studentProfile = target.studentProfiles[0] ?? null;
      const teacherProfile = target.teacherProfiles[0] ?? null;

      // Faculty governance scope — a scoped ADMIN may only change the
      // roles of users in their own faculty.
      const actorScopeFacultyId = await getGovernanceScope(req.user!.id);
      assertWithinScope(actorScopeFacultyId, {
        role: target.role,
        studentFacultyId: studentProfile?.facultyId ?? null,
        teacherFacultyId: teacherProfile?.department.facultyId ?? null,
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
        hasTeacherProfile: Boolean(teacherProfile),
        explicitDepartmentId: departmentId ?? null,
        studentDepartmentId: studentProfile?.departmentId ?? null,
      });
      if (provisionPlan.kind === 'missing-department') {
        throw AppError.badRequest(
          'ترقية المستخدم إلى أستاذ تتطلب قسماً أكاديمياً — حدّد القسم أو رقّه من ملف طالب لديه قسم',
        );
      }
      // r179 (phase-5): the TeacherProfile is per-membership —
      // resolveProvisionInstitution is fail-closed now: with the
      // caller's context the target MUST hold an active membership in
      // THAT institution (400 otherwise); the platform OWNER path
      // requires exactly one active membership (400 when zero or
      // ambiguous, counting them honestly).
      const provisionInstitutionId =
        provisionPlan.kind === 'create'
          ? await resolveProvisionInstitution(callerInstitution, id)
          : null;
      const teacherProvision =
        provisionPlan.kind === 'create' && provisionInstitutionId
          ? buildTeacherProvision(id, { ...provisionPlan, institutionId: provisionInstitutionId }, specialty)
          : null;

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
