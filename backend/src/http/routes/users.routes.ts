import { Router } from 'express';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';
import { hashPassword } from '../../lib/password.js';
import {
  parseCsv,
  parseBulkStudentCsv,
  generateTempPassword,
  type BulkImportResultRow,
} from '../../lib/bulk-import.js';
import {
  assertNotLastActiveOwner,
  assertWithinScope,
  buildScopedUserWhere,
  getGovernanceScope,
  loadGovernanceTarget,
  lockActiveOwnerRows,
  requiresLastOwnerGuard,
} from '../../lib/governance.js';
import { resolveCallerInstitutionScope, institutionContextRequiredError } from '../../lib/profile-scoping.js';

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
      // r179 (phase-5): an ADMIN/QUALITY caller MUST hold a DB-verified
      // institution context (403 INSTITUTION_CONTEXT_REQUIRED without
      // one — the legacy null-scope platform-wide listing for a
      // contextless institutional admin is gone); the list is pinned
      // to that institution. OWNER keeps the platform-wide view.
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
    // r179 (phase-5): profiles are per-membership and the projection
    // is FAIL-CLOSED — an ADMIN/QUALITY caller reading a TARGET needs
    // their DB-verified institution context, and the target must hold
    // an ACTIVE membership in it (404 otherwise — never leak a foreign
    // institution's user existence). An institutional self-read needs
    // the same context (which profile? — 403 without one). OWNER may
    // pass ?institution=<slug> (validated to exist, 404 otherwise) for
    // an explicit platform view; a contextless OWNER view simply
    // carries no profile (never a oldest-profile guess).
    const actorIsInstitutional =
      actor.role === Role.STUDENT ||
      actor.role === Role.TEACHER ||
      actor.role === Role.ADMIN ||
      actor.role === Role.QUALITY;
    let profileInstitution: string | null;
    if (actorIsInstitutional) {
      profileInstitution = await resolveCallerInstitutionScope(actor.id, actor.institutionId);
      if (!profileInstitution) throw institutionContextRequiredError();
    } else {
      // OWNER (the only remaining role): explicit ?institution= slug or
      // an honest no-profile platform view.
      const slug =
        typeof req.query.institution === 'string' && req.query.institution.trim().length > 0
          ? req.query.institution.trim()
          : null;
      if (slug) {
        const institution = await prisma.institution.findUnique({
          where: { slug },
          select: { id: true, status: true },
        });
        if (!institution || institution.status !== 'ACTIVE') {
          throw AppError.notFound('المؤسسة غير موجودة');
        }
        profileInstitution = institution.id;
      } else {
        profileInstitution = null;
      }
    }
    // A privileged ADMIN/QUALITY reading a TARGET: the target must be a
    // member of the caller's institution (404 — don't leak existence).
    // Self-reads skip this: the caller's own membership just resolved.
    if (
      actor.id !== id &&
      (actor.role === Role.ADMIN || actor.role === Role.QUALITY) &&
      profileInstitution
    ) {
      const targetMembership = await prisma.membership.findFirst({
        where: {
          userId: id,
          institutionId: profileInstitution,
          isActive: true,
          institution: { status: 'ACTIVE' },
        },
        select: { id: true },
      });
      if (!targetMembership) throw AppError.notFound();
    }
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
            : { id: { in: [] } },
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
            : { id: { in: [] } },
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
    // r179 (phase-5): an ADMIN/QUALITY caller's DB-verified institution
    // context is REQUIRED (403 without one) and scopes the target's
    // faculty association (their profile in THAT institution); the
    // target must also hold an ACTIVE membership in the caller's
    // institution (403 otherwise — a cross-institution write).
    // OWNER passes null: their governance decisions never depend on
    // the faculty-scope predicate (university-wide by definition).
    const callerInstitution =
      actor.role === Role.ADMIN || actor.role === Role.QUALITY
        ? await resolveCallerInstitutionScope(actor.id, actor.institutionId)
        : null;
    if ((actor.role === Role.ADMIN || actor.role === Role.QUALITY) && !callerInstitution) {
      throw institutionContextRequiredError();
    }
    if (isPrivileged && actor.id !== id && callerInstitution) {
      const targetMembership = await prisma.membership.findFirst({
        where: {
          userId: id,
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

// ── r323 B3.1: bulk student import (CSV) ───────────────────────────
// The registrar pastes or uploads a class list CSV; the platform
// validates it against the REAL institution (faculty/department name
// resolution, existing emails/reg-numbers), then commits the whole
// cohort in one transaction and returns the printable temp-password
// sheet. Pure parsing/validation lives in lib/bulk-import.ts; this
// section owns the DB truth. OWNER callers without an institution
// context MUST pass an explicit institutionId (fail-closed — no
// platform-wide import guess).

const bulkImportLimiter = createRouteLimiter({ max: 5 });

const bulkImportBodySchema = z.object({
  csv: z.string().min(1).max(512 * 1024),
  institutionId: z.string().min(1).max(64).optional(),
});

/** Resolve the import's institution: ADMIN → verified context (403
 *  without one); OWNER → the explicit body institutionId, verified
 *  ACTIVE. A scoped-ADMIN's faculty scope never narrows the import —
 *  registration is institution-wide by construction (reg-numbers are
 *  institution-scoped), matching the register route's own behavior. */
async function resolveBulkImportInstitution(
  req: Request,
  bodyInstitutionId?: string,
): Promise<string> {
  if (req.user!.role === Role.ADMIN) {
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (scope === null) throw institutionContextRequiredError();
    return scope;
  }
  if (typeof bodyInstitutionId !== 'string' || bodyInstitutionId.length === 0) {
    throw AppError.badRequest('حدّد المؤسسة التي سيُستورد إليها الطلاب');
  }
  const institution = await prisma.institution.findFirst({
    where: { id: bodyInstitutionId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!institution) throw AppError.badRequest('المؤسسة المحددة غير موجودة أو غير نشطة');
  return institution.id;
}

/** Name→id resolution for one faculty/department pair (trimmed,
 *  case-insensitive; Arabic names dominate so a plain match first,
 *  then a case-insensitive fallback). Null = unknown → the row errors. */
async function resolveFacultyDepartment(
  institutionId: string,
  facultyName: string,
  departmentName: string,
): Promise<{ facultyId: string; departmentId: string } | { error: string }> {
  const faculty = await prisma.faculty.findFirst({
    where: { institutionId, OR: [{ name: facultyName }, { name: { equals: facultyName, mode: 'insensitive' } }] },
    select: { id: true, name: true },
  });
  if (!faculty) return { error: `الكلية «${facultyName}» غير موجودة في المؤسسة` };
  const department = await prisma.department.findFirst({
    where: {
      facultyId: faculty.id,
      OR: [{ name: departmentName }, { name: { equals: departmentName, mode: 'insensitive' } }],
    },
    select: { id: true },
  });
  if (!department) return { error: `القسم «${departmentName}» غير موجود في كلية «${faculty.name}»` };
  return { facultyId: faculty.id, departmentId: department.id };
}

/** One CSV → planned rows against the DB (shared by preview + commit).
 *  OK rows carry the RESOLVED facultyId/departmentId so the commit
 *  never re-resolves names inside the transaction (one truth, one hop). */
async function planBulkImport(csv: string, institutionId: string) {
  const parsed = parseBulkStudentCsv(parseCsv(csv));
  if ('fileError' in parsed) return { fileError: parsed.fileError as string };

  const resultRows: (BulkImportResultRow & { facultyId?: string; departmentId?: string })[] = [];
  // Batch existence checks: emails are globally unique; reg-numbers are
  // institution-scoped. Two `findMany`s beat 2N round trips.
  const emails = parsed.rows.map((r) => r.email);
  const universityIds = parsed.rows.map((r) => r.universityId);
  const [existingUsers, existingProfiles] = await Promise.all([
    prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
    prisma.studentProfile.findMany({
      where: { institutionId, universityId: { in: universityIds } },
      select: { universityId: true },
    }),
  ]);
  const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const existingRegSet = new Set(existingProfiles.map((p) => p.universityId));

  for (const row of parsed.rows) {
    const dbError =
      existingEmailSet.has(row.email)
        ? 'البريد الإلكتروني مسجل مسبقاً في المنصة'
        : existingRegSet.has(row.universityId)
          ? 'الرقم الجامعي مسجل مسبقاً في هذه المؤسسة'
          : null;
    if (dbError !== null) {
      resultRows.push({ line: row.line, status: 'error', message: dbError, email: row.email, universityId: row.universityId });
      continue;
    }
    const chain = await resolveFacultyDepartment(institutionId, row.faculty, row.department);
    if ('error' in chain) {
      resultRows.push({ line: row.line, status: 'error', message: chain.error, email: row.email, universityId: row.universityId });
      continue;
    }
    resultRows.push({
      line: row.line,
      status: 'ok',
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      universityId: row.universityId,
      faculty: row.faculty,
      department: row.department,
      year: row.year,
      facultyId: chain.facultyId,
      departmentId: chain.departmentId,
    });
  }

  return {
    rows: resultRows,
    summary: {
      total: resultRows.length,
      ok: resultRows.filter((r) => r.status === 'ok').length,
      error: resultRows.filter((r) => r.status === 'error').length,
      rowErrors: parsed.errors,
    },
  };
}

router.post(
  '/bulk-import/preview',
  bulkImportLimiter,
  requireRole(Role.ADMIN, Role.OWNER),
  validate(bulkImportBodySchema, 'body'),
  async (req, res, next) => {
    try {
      const { csv, institutionId } = req.body as { csv: string; institutionId?: string };
      const inst = await resolveBulkImportInstitution(req, institutionId);
      const plan = await planBulkImport(csv, inst);
      res.json({ data: plan });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/bulk-import/commit',
  bulkImportLimiter,
  requireRole(Role.ADMIN, Role.OWNER),
  validate(bulkImportBodySchema, 'body'),
  async (req, res, next) => {
    try {
      const { csv, institutionId } = req.body as { csv: string; institutionId?: string };
      const inst = await resolveBulkImportInstitution(req, institutionId);
      const plan = await planBulkImport(csv, inst);
      if ('fileError' in plan) throw AppError.badRequest(plan.fileError);
      const okRows = plan.rows.filter((r) => r.status === 'ok');
      if (okRows.length === 0) {
        throw AppError.badRequest('لا توجد صفوف صالحة للاستيراد — صحّح الأخطاء في العرض المسبق');
      }

      // One transaction: the cohort lands whole or not at all — a
      // half-created class is the worst possible registrar outcome.
      const created = await prisma.$transaction(async (tx) => {
        const sheet: { name: string; email: string; universityId: string; tempPassword: string }[] = [];
        for (const row of okRows) {
          const tempPassword = generateTempPassword();
          const passwordHash = await hashPassword(tempPassword);
          const user = await tx.user.create({
            data: {
              email: row.email!,
              passwordHash,
              role: Role.STUDENT,
              firstName: row.firstName!,
              lastName: row.lastName!,
            },
            select: { id: true },
          });
          const membership = await tx.membership.create({
            data: { userId: user.id, institutionId: inst, role: Role.STUDENT, isActive: true },
            select: { id: true },
          });
          await tx.studentProfile.create({
            data: {
              userId: user.id,
              membershipId: membership.id,
              institutionId: inst,
              universityId: row.universityId!,
              facultyId: row.facultyId!,
              departmentId: row.departmentId!,
              year: row.year ?? 1,
            },
          });
          await tx.auditLog.create({
            data: {
              action: 'BULK_IMPORT',
              resourceType: 'User',
              resourceId: user.id,
              userId: req.user!.id,
              institutionId: inst,
              metadata: { email: row.email, universityId: row.universityId },
            },
          });
          sheet.push({
            name: `${row.firstName} ${row.lastName}`,
            email: row.email!,
            universityId: row.universityId!,
            tempPassword,
          });
        }
        return sheet;
      });

      res.status(201).json({
        data: {
          created: created.length,
          sheet: created,
          skipped: plan.summary.error,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
