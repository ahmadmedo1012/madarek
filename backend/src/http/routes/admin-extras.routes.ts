import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { buildMeta, paginationSchema } from '../../lib/pagination.js';
import { buildScopedUserWhere, getGovernanceScope } from '../../lib/governance.js';

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
