import { Router } from 'express';
import { ResearchPaperStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { buildMeta, paginationSchema } from '../../lib/pagination.js';
import { buildScopedUserWhere, getGovernanceScope } from '../../lib/governance.js';
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
    const scopeFacultyId = await getGovernanceScope(req.user!.id);
    const where = buildScopedUserWhere(scopeFacultyId, {
      role: Role.STUDENT,
      ...(q ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' as const } },
          { lastName: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { studentProfile: { universityId: { contains: q, mode: 'insensitive' as const } } },
        ],
      } : {}),
      ...(facultyId ? { studentProfile: { facultyId } } : {}),
    });

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          isActive: true, avatarColor: true, avatarInitials: true,
          createdAt: true,
          studentProfile: {
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
    const where = {
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
router.get('/digital', async (_req, res, next) => {
  try {
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
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.examTemplate.count({ where: { status: 'PUBLISHED' } }),
      prisma.examAttempt.count(),
      prisma.labSession.count(),
      prisma.moocEnrollment.count(),
      prisma.researchPaper.count(),
      prisma.liveSession.count(),
      prisma.material.count(),
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
