import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { Role, type Membership, type Institution } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { hashPassword } from '../../lib/password.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
// R320 §B (c1-RENAME): backend role labels share the twin of the
// frontend's lib/roleLabels.ts (belt-locked equal).
import { ROLE_LABEL_INDEFINITE } from '../../lib/roleLabels.js';
import { arabicInitials, sanitizeUser } from '../../modules/auth/auth.service.js';
import {
  createInstitutionSchema,
  provisionAdminSchema,
  updateInstitutionSchema,
} from '../../modules/institution/institution.dto.js';

/**
 * r178 (multi-institution foundation) — the institution API.
 *
 * Mounted at the ROOT '/api/v1' prefix (see app.ts):
 *   GET  /institutions                                        — PUBLIC
 *   GET  /owner/institutions                                   — OWNER
 *   POST /owner/institutions                                   — OWNER
 *   PATCH /owner/institutions/:id                              — OWNER
 *   POST /owner/institutions/:id/administrators                — OWNER
 *   POST /owner/institutions/:id/memberships/:membershipId/revoke   — OWNER
 *   POST /owner/institutions/:id/memberships/:membershipId/restore  — OWNER
 *
 * Router ordering (app.ts): this router must be registered BEFORE the
 * broad-mounted authed routers (meRoutes, learningRoutes, …) so the
 * PUBLIC /institutions listing stays reachable anonymously, and it is
 * registered BEFORE ownerRoutes so the /owner/institutions* subpaths
 * match here first (ownerRoutes has no /institutions children — no
 * collision; verified by a boot test).
 *
 * Every mutation writes an AuditLog row (action
 * 'institution.create' / 'institution.update' / 'institution.admin.provision'
 * / 'institution.membership.revoke' / 'institution.membership.restore')
 * INSIDE the same transaction — the courses.routes.ts governance pattern.
 */
const router = Router();

// ── OWNER console gate ────────────────────────────────────────────
// requireRole must run AFTER authMiddleware (its own contract: it
// 401s when req.user is absent). Scoped to THIS router's /owner/*
// paths so the public /institutions listing below stays anonymous.
router.use('/owner', authMiddleware, requireRole(Role.OWNER));

// ── GET /institutions — public directory (register funnel, login) ──
// Active institutions only, minimal fields, ordered by (Arabic) name.
// No authMiddleware: this is the public switchboard the register page
// and the login disambiguation flow consume.
router.get('/institutions', async (_req, res, next) => {
  try {
    const institutions = await prisma.institution.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, nameEn: true, slug: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: institutions });
  } catch (e) {
    next(e);
  }
});

// ── GET /owner/institutions — the OWNER console listing ───────────
// ALL institutions (any status) + active-member counts + faculty
// counts + the ADMIN memberships (with their user basics) so the
// console can show and manage institutional admins.
router.get('/owner/institutions', async (_req, res, next) => {
  try {
    const [institutions, membershipCounts, facultyCounts, adminMemberships] = await Promise.all([
      prisma.institution.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.membership.groupBy({
        by: ['institutionId'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.faculty.groupBy({ by: ['institutionId'], _count: { _all: true } }),
      prisma.membership.findMany({
        where: { role: Role.ADMIN },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const memberCount = new Map(membershipCounts.map((g) => [g.institutionId, g._count._all]));
    const faculties = new Map(facultyCounts.map((g) => [g.institutionId, g._count._all]));
    const adminsByInstitution = new Map<
      string,
      Array<{
        membershipId: string;
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
      }>
    >();
    for (const m of adminMemberships) {
      const list = adminsByInstitution.get(m.institutionId) ?? [];
      list.push({
        membershipId: m.id,
        userId: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        isActive: m.isActive,
      });
      adminsByInstitution.set(m.institutionId, list);
    }

    res.json({
      data: institutions.map((i: Institution) => ({
        id: i.id,
        name: i.name,
        nameEn: i.nameEn,
        slug: i.slug,
        status: i.status,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        activeMembershipCount: memberCount.get(i.id) ?? 0,
        facultyCount: faculties.get(i.id) ?? 0,
        admins: adminsByInstitution.get(i.id) ?? [],
      })),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Slug derivation for institution creation: explicit slug wins; else
 * slugify(nameEn); else a generated `inst-xxxxxxxx` id. The DB unique
 * (slug) plus the explicit conflict check below keep it collision-free.
 */
const slugifyNameEn = (nameEn: string): string | null => {
  const slug = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length >= 2 ? slug : null;
};

// ── POST /owner/institutions — create an institution ──────────────
router.post(
  '/owner/institutions',
  validate(createInstitutionSchema),
  async (req, res, next) => {
    try {
      const input = req.body as unknown as z.infer<typeof createInstitutionSchema>;
      const slug =
        input.slug ?? slugifyNameEn(input.nameEn ?? '') ?? `inst-${randomUUID().slice(0, 8)}`;

      // Friendly 409 before the P2002 envelope (both exist; this one
      // names the slug field for the OWNER form).
      const clash = await prisma.institution.findUnique({ where: { slug } });
      if (clash) throw AppError.conflict('المعرّف (slug) مستخدم مسبقاً — اختر معرّفاً آخر');

      const institution = await prisma.$transaction(async (tx) => {
        const created = await tx.institution.create({
          data: { name: input.name, nameEn: input.nameEn ?? null, slug },
        });
        await tx.auditLog.create({
          data: {
            action: 'institution.create',
            resourceType: 'Institution',
            resourceId: created.id,
            userId: req.user!.id,
            institutionId: created.id,
            metadata: { name: created.name, nameEn: created.nameEn, slug: created.slug },
          },
        });
        return created;
      });
      res.status(201).json({ data: { institution } });
    } catch (e) {
      next(e);
    }
  },
);

// ── PATCH /owner/institutions/:id — rename / suspend / reactivate ─
router.patch(
  '/owner/institutions/:id',
  validate(updateInstitutionSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const input = req.body as unknown as z.infer<typeof updateInstitutionSchema>;
      const existing = await prisma.institution.findUnique({ where: { id } });
      if (!existing) throw AppError.notFound('المؤسسة غير موجودة');
      if (Object.keys(input).length === 0) {
        throw AppError.badRequest('لا توجد حقول لتحديثها');
      }

      const institution = await prisma.$transaction(async (tx) => {
        const updated = await tx.institution.update({
          where: { id },
          // The DTO's z.enum members mirror InstitutionStatus; at least
          // one field is guaranteed non-undefined by the empty-patch guard.
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'institution.update',
            resourceType: 'Institution',
            resourceId: id,
            userId: req.user!.id,
            institutionId: id,
            metadata: { changes: input },
          },
        });
        return updated;
      });
      res.json({ data: { institution } });
    } catch (e) {
      next(e);
    }
  },
);

// ── POST /owner/institutions/:id/administrators — provision an ─────
// institutional ADMIN. mode='new' creates the User (role ADMIN,
// platform-unique email, shared password policy) + ADMIN membership;
// mode='existing' attaches or upgrades a known user's membership
// (upsert on (userId, institutionId): reactivate revoked, keep/upgrade
// role to ADMIN). OWNER ≠ institution ADMIN: the platform OWNER role
// never receives a membership.
router.post(
  '/owner/institutions/:id/administrators',
  validate(provisionAdminSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const input = req.body as unknown as z.infer<typeof provisionAdminSchema>;
      const institution = await prisma.institution.findUnique({ where: { id } });
      if (!institution) throw AppError.notFound('المؤسسة غير موجودة');

      if (input.mode === 'new') {
        // Defense-in-depth alongside the DTO superRefine (programmatic
        // callers must stay honest — the repo's service-guard idiom).
        if (!input.password || !input.firstName || !input.lastName) {
          // R320 §B: the provisioned account is Role.ADMIN — the
          // institution's «مسجل عام» (was «مدير»). Shared label source.
          throw AppError.badRequest(`كلمة المرور والاسمان مطلوبان عند إنشاء حساب ${ROLE_LABEL_INDEFINITE.ADMIN} جديد`);
        }
        const clash = await prisma.user.findUnique({ where: { email: input.email } });
        if (clash) throw AppError.conflict('البريد الإلكتروني مسجّل مسبقاً');

        const passwordHash = await hashPassword(input.password);
        const { user, membership } = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: input.email,
              passwordHash,
              role: Role.ADMIN,
              firstName: input.firstName!,
              lastName: input.lastName!,
              avatarInitials: arabicInitials(input.firstName!, input.lastName!),
              avatarColor: '#4F8EF7',
            },
          });
          const membershipRow = await tx.membership.create({
            data: {
              userId: created.id,
              institutionId: institution.id,
              role: Role.ADMIN,
              isActive: true,
            },
          });
          await tx.auditLog.create({
            data: {
              action: 'institution.admin.provision',
              resourceType: 'Institution',
              resourceId: institution.id,
              userId: req.user!.id,
              institutionId: institution.id,
              metadata: { mode: 'new', email: input.email, membershipId: membershipRow.id },
            },
          });
          return { user: created, membership: membershipRow };
        });
        return res.status(201).json({ data: { user: sanitizeUser(user), membership } });
      }

      // mode === 'existing'
      const user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user) throw AppError.notFound('المستخدم غير موجود');
      if (user.role === Role.OWNER) {
        throw AppError.badRequest('مالك المنصة لا يُعيَّن مسجلاً عاماً لمؤسسة — الملكية دور منصّة مستقل');
      }

      // Pre-read the current membership (if any) BEFORE the transaction:
      // the upsert inside overwrites the role, so this is the only moment
      // the previous role is observable — and the audit callback must not
      // reference the outer `const membership` (temporal dead zone: the
      // first draft 500'd on exactly that, caught by the r178 integration
      // suite's mode=existing scenario).
      const previous = await prisma.membership.findUnique({
        where: { userId_institutionId: { userId: user.id, institutionId: institution.id } },
        select: { role: true },
      });

      const membership = await prisma.$transaction(async (tx) => {
        // Upsert on the (userId, institutionId) unique: a revoked
        // membership is reactivated and upgraded to ADMIN; a
        // non-member gains a fresh ADMIN membership.
        const row: Membership = await tx.membership.upsert({
          where: { userId_institutionId: { userId: user.id, institutionId: institution.id } },
          update: { role: Role.ADMIN, isActive: true },
          create: {
            userId: user.id,
            institutionId: institution.id,
            role: Role.ADMIN,
            isActive: true,
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'institution.admin.provision',
            resourceType: 'Institution',
            resourceId: institution.id,
            userId: req.user!.id,
            institutionId: institution.id,
            metadata: {
              mode: 'existing',
              email: input.email,
              membershipId: row.id,
              previousRole: previous?.role ?? null,
            },
          },
        });
        return row;
      });
      res.status(201).json({ data: { user: sanitizeUser(user), membership } });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * Shared handler factory for membership revoke/restore. The membership
 * must belong to the path's institution (else 404 — don't leak cross-
 * institution membership ids). Revoking a membership NEVER touches the
 * user account itself — access control only (r178 contract).
 */
const membershipActivation =
  (action: 'institution.membership.revoke' | 'institution.membership.restore', isActive: boolean) =>
  async (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    try {
      const { id, membershipId } = req.params;
      const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
      if (!membership || membership.institutionId !== id) {
        throw AppError.notFound('العضوية غير موجودة');
      }
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.membership.update({
          where: { id: membership.id },
          data: { isActive },
        });
        await tx.auditLog.create({
          data: {
            action,
            resourceType: 'Institution',
            resourceId: id,
            userId: req.user!.id,
            institutionId: id,
            metadata: {
              membershipId: membership.id,
              targetUserId: membership.userId,
              role: membership.role,
            },
          },
        });
        return row;
      });
      res.json({ data: { membership: updated } });
    } catch (e) {
      next(e);
    }
  };

router.post(
  '/owner/institutions/:id/memberships/:membershipId/revoke',
  membershipActivation('institution.membership.revoke', false),
);

router.post(
  '/owner/institutions/:id/memberships/:membershipId/restore',
  membershipActivation('institution.membership.restore', true),
);

export default router;
