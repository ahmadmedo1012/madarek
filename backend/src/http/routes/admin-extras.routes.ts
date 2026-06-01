import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

/**
 * Admin-extras — sub-project D.
 *
 * Backs the previously-placeholder admin pages: students listing, digital
 * transformation metrics, performance analysis. Kept compact: the existing
 * /admin/stats, /admin/faculties, /admin/reports, /admin/courses already
 * cover the dashboard surface; this file adds the four page-specific bundles.
 */
const router = Router();
router.use(authMiddleware);
router.use(requireRole(Role.ADMIN, Role.OWNER));

/**
 * GET /admin/students
 * Paginated student list with faculty / department / year / XP level.
 */
router.get('/students', async (req, res, next) => {
  try {
    const page = Math.max(1, Number((req.query.page as string) || '1'));
    const limit = Math.min(50, Math.max(1, Number((req.query.limit as string) || '20')));
    const q = String((req.query.q as string) || '').trim();
    const facultyId = String((req.query.facultyId as string) || '').trim() || undefined;

    const where: import('@prisma/client').Prisma.UserWhereInput = {
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
    };

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

    res.json({
      data,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
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
