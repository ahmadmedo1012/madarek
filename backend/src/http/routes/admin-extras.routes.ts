import { Router } from 'express';
import { ResearchPaperStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { buildMeta, paginationSchema } from '../../lib/pagination.js';
import { buildScopedUserWhere, getGovernanceScope } from '../../lib/governance.js';
import { resolveCallerInstitutionScope, institutionContextRequiredError } from '../../lib/profile-scoping.js';
// Decimal→Number serializer for ResearchPaper rows — exported by the
// research-owning route module (learning.routes) and reused here so the
// admin projection serializes Decimals exactly like /research/queue.
import { decToNum } from './learning.routes.js';

/**
 * Admin-extras — sub-project D.
 *
 * Backs the previously-placeholder admin pages: students listing, digital
 * transformation metrics. Kept compact: the existing /admin/stats,
 * /admin/faculties, /admin/reports, /admin/courses already cover the
 * dashboard surface; this file adds the two page-specific bundles.
 */
const router = Router();
router.use(authMiddleware);
router.use(requireRole(Role.ADMIN, Role.OWNER));

/**
 * GET /admin/students query envelope (audit 11-c P1-1).
 *
 * Built on the shared pagination schema instead of manual Number()
 * coercion: `?page=abc` used to become NaN, flow into skip/take and
 * surface as a PrismaClientValidationError → 500. Now every malformed
 * parameter is a clean 400, exactly like /users and /owner/users.
 * `limit` keeps this surface's 50-row cap (default 20); `facultyId`
 * must be a well-formed cuid.
 */
export const studentsQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().positive().max(50).default(20),
  facultyId: z.string().cuid().optional(),
});

/**
 * GET /admin/students
 * Paginated student list with faculty / department / year / XP level.
 */
router.get('/students', validate(studentsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, facultyId } = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
      facultyId?: string;
    };

    // Faculty governance scope (audit 11-c P1-4 / 12-4 hand-off #3): the
    // facultyId param is client-supplied and used to be trusted outright —
    // a faculty-scoped ADMIN could enumerate any faculty's students (or the
    // whole university's) by simply omitting it. buildScopedUserWhere pins
    // the list to the actor's own faculty for scoped admins, mirroring
    // GET /users — what you cannot govern, you do not list. A faculty the
    // actor requests outside their scope simply matches no rows.
    // OWNER / unscoped ADMIN keep the platform-wide view.
    // r179 (phase-5): an ADMIN caller MUST hold a DB-verified institution
    // context (403 INSTITUTION_CONTEXT_REQUIRED without one — the
    // contextless platform-wide listing is gone); the list is pinned to
    // that institution and the profile projection resolves each
    // student's profile IN it (no legacy oldest-profile fallback).
    const scopeFacultyId = await getGovernanceScope(req.user!.id);
    const institutionScope =
      req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY
        ? await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId)
        : null;
    if ((req.user!.role === Role.ADMIN || req.user!.role === Role.QUALITY) && !institutionScope) {
      throw institutionContextRequiredError();
    }
    const where = buildScopedUserWhere(scopeFacultyId, {
      role: Role.STUDENT,
      ...(q ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' as const } },
          { lastName: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { studentProfiles: { some: { universityId: { contains: q, mode: 'insensitive' as const } } } },
        ],
      } : {}),
      ...(facultyId ? { studentProfiles: { some: { facultyId } } } : {}),
    }, institutionScope);

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          isActive: true, avatarColor: true, avatarInitials: true,
          createdAt: true,
          // r179: per-membership profiles — resolved in the caller's
          // DB-verified institution context (fail-closed — a
          // contextless ADMIN projection is impossible now); folded
          // back to the singular `studentProfile` key the FE consumes.
          studentProfiles: {
            where: institutionScope
              ? { institutionId: institutionScope }
              : { id: { in: [] } },
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: {
              universityId: true, year: true, gpa: true, totalXp: true, level: true,
              faculty: { select: { id: true, name: true } },
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);
    const data = rows.map((u) => ({
      ...u,
      studentProfiles: undefined,
      studentProfile: u.studentProfiles[0] ?? null,
    }));

    res.json({ data, meta: buildMeta(page, limit, total) });
  } catch (e) { next(e); }
});

/**
 * GET /admin/papers query envelope (audit 5-A8 §5 row 8 — the admin
 * drill-down for «إجمالي الأوراق/منشورة»): the shared pagination schema
 * (page/limit/q) plus the contract's `status` filter over the
 * ResearchPaperStatus lifecycle. Exported for unit tests.
 */
export const papersQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(ResearchPaperStatus).optional(),
});

/**
 * GET /admin/papers — the institution-wide research list for admins
 * (audit 5-A8 §5, minimal backend ask #1). Projection of the existing
 * research routes (/me/research's oversight branch + /research/queue):
 * same explicit select — NEVER extractedText (full PDF text) — same
 * no-email student projection. `status` pre-filters the lifecycle
 * (PUBLISHED for «منشورة», UPLOADED for the unscanned intake…), `q`
 * searches titles, and the response is a standard paginated list
 * ({data, meta}) so the FE can land pre-filtered with a pagination
 * footer — NOT another fixed silent cap (the 5-A8 P2-1 bug class).
 */
router.get('/papers', validate(papersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, status } = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
      status?: ResearchPaperStatus;
    };
    /* r179 (phase-5): the institutional paper archive is
     * institution-scoped. An ADMIN caller MUST hold a DB-verified
     * context (403 without one) and sees only papers submitted under
     * their institution (ResearchPaper.institutionId — written by the
     * r179 submission flow). OWNER keeps the platform-wide archive
     * and may narrow it with ?institutionSlug= (an unknown/suspended
     * slug matches nothing, mirroring /admin/faculties). */
    let paperInstitution: string | null | undefined;
    if (req.user!.role === Role.OWNER) {
      const slug =
        typeof req.query.institutionSlug === 'string' && req.query.institutionSlug.trim().length > 0
          ? req.query.institutionSlug.trim()
          : undefined;
      if (slug) {
        const institutions = await prisma.institution.findMany({
          where: { slug, status: 'ACTIVE' },
          select: { id: true },
        });
        paperInstitution = institutions[0]?.id ?? 'no-such-institution';
      }
    } else {
      const callerInstitution = await resolveCallerInstitutionScope(
        req.user!.id,
        req.user!.institutionId,
      );
      if (!callerInstitution) throw institutionContextRequiredError();
      paperInstitution = callerInstitution;
    }
    const where = {
      ...(paperInstitution ? { institutionId: paperInstitution } : {}),
      ...(status ? { status } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.researchPaper.findMany({
        where,
        // Explicit select: NEVER ship extractedText (full PDF text — huge).
        select: {
          id: true, studentId: true, reviewerId: true, offeringId: true,
          title: true, abstract: true, fileUrl: true, status: true,
          plagiarismPct: true, aiContentPct: true, grade: true, feedback: true,
          uploadedAt: true, scannedAt: true, gradedAt: true, publishedAt: true,
          student: {
            select: {
              // No email — the admin list needs name + avatar, not PII.
              id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true,
            },
          },
          reviewer: { select: { id: true, firstName: true, lastName: true } },
          offering: { include: { course: { select: { name: true, code: true } } } },
        },
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.researchPaper.count({ where }),
    ]);
    res.json({ data: decToNum(data), meta: buildMeta(page, limit, total) });
  } catch (e) { next(e); }
});

/**
 * GET /admin/digital
 * Counts that show how much of the university lives in the platform vs. on paper.
 */
router.get('/digital', async (req, res, next) => {
  try {
    /* r179 (phase-5): digital-transformation metrics are
     * institution-scoped for ADMIN callers — their DB-verified context
     * pins every count to their institution (memberships, course
     * chains, paper institution ids, user-scoped rows via membership).
     * OWNER keeps the platform-wide numbers (the owner console's
     * platform stats stay platform-wide by the shared contract). */
    const digitalInstitution =
      req.user!.role === Role.OWNER
        ? null
        : await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (req.user!.role !== Role.OWNER && !digitalInstitution) {
      throw institutionContextRequiredError();
    }
    // Count shapes per metric (null = platform-wide for OWNER):
    //  - users          → ACTIVE membership in the institution
    //  - exams          → ExamTemplate via offering.course OR faculty chain
    //  - attempts       → ExamAttempt → template chain
    //  - labs / mooc    → the row's user holds an active membership
    //    (VirtualLab and MoocCourse are platform-wide shared catalogues)
    //  - papers         → ResearchPaper.institutionId
    //  - sessions/mats  → offering → course chain
    const membership = { some: { institutionId: digitalInstitution!, isActive: true } };
    const templateChain = {
      OR: [
        { offering: { course: { institutionId: digitalInstitution! } } },
        { faculty: { institutionId: digitalInstitution! } },
      ],
    };
    const [
      totalUsers,
      activeUsers,
      onlineExams,
      examAttempts,
      labSessions,
      moocEnrollments,
      researchPapers,
      liveSessions,
      materialsUploaded,
    ] = await Promise.all([
      digitalInstitution
        ? prisma.user.count({ where: { memberships: membership } })
        : prisma.user.count(),
      digitalInstitution
        ? prisma.user.count({ where: { isActive: true, memberships: membership } })
        : prisma.user.count({ where: { isActive: true } }),
      digitalInstitution
        ? prisma.examTemplate.count({ where: { status: 'PUBLISHED', ...templateChain } })
        : prisma.examTemplate.count({ where: { status: 'PUBLISHED' } }),
      digitalInstitution
        ? prisma.examAttempt.count({ where: { template: templateChain } })
        : prisma.examAttempt.count(),
      digitalInstitution
        ? prisma.labSession.count({ where: { user: { memberships: membership } } })
        : prisma.labSession.count(),
      digitalInstitution
        ? prisma.moocEnrollment.count({ where: { user: { memberships: membership } } })
        : prisma.moocEnrollment.count(),
      digitalInstitution
        ? prisma.researchPaper.count({ where: { institutionId: digitalInstitution } })
        : prisma.researchPaper.count(),
      digitalInstitution
        ? prisma.liveSession.count({ where: { offering: { course: { institutionId: digitalInstitution } } } })
        : prisma.liveSession.count(),
      digitalInstitution
        ? prisma.material.count({ where: { offering: { course: { institutionId: digitalInstitution } } } })
        : prisma.material.count(),
    ]);
    res.json({
      data: {
        totalUsers,
        activeUsers,
        adoptionPct: totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0,
        onlineExams,
        examAttempts,
        labSessions,
        moocEnrollments,
        researchPapers,
        liveSessions,
        materialsUploaded,
      },
    });
  } catch (e) { next(e); }
});

export default router;
