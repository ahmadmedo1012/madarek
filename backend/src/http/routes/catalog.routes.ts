import { Router } from 'express';
import { z } from 'zod';
import { LoanStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════════════════
// LIBRARY
// ════════════════════════════════════════════════════
router.get(
  '/library/books',
  validate(paginationSchema.extend({ category: z.string().optional() }), 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, q, category } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
        category?: string;
      };
      const where = {
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { author: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        prisma.book.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { title: 'asc' },
        }),
        prisma.book.count({ where }),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/library/loans',
  validate(z.object({ bookId: z.string().cuid() }).strict()),
  async (req, res, next) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const book = await tx.book.findUnique({ where: { id: req.body.bookId } });
        if (!book) throw AppError.notFound('Book not found');
        if (book.availableCopies <= 0) throw AppError.conflict('No copies available');
        await tx.book.update({
          where: { id: book.id },
          data: { availableCopies: { decrement: 1 } },
        });
        return tx.loan.create({
          data: {
            bookId: book.id,
            userId: req.user!.id,
            dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      });
      res.status(201).json({ data: result });
    } catch (e) {
      next(e);
    }
  },
);

router.post('/library/loans/:id/return', async (req, res, next) => {
  try {
    const loan = await prisma.loan.findUnique({ where: { id: req.params.id! } });
    if (!loan || loan.userId !== req.user!.id) throw AppError.notFound();
    if (loan.status !== LoanStatus.ACTIVE) throw AppError.conflict('Loan already closed');
    const updated = await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: loan.bookId },
        data: { availableCopies: { increment: 1 } },
      });
      return tx.loan.update({
        where: { id: loan.id },
        data: { returnedAt: new Date(), status: LoanStatus.RETURNED },
      });
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/me/loans', async (req, res, next) => {
  try {
    const data = await prisma.loan.findMany({
      where: { userId: req.user!.id },
      include: { book: true },
      orderBy: { borrowedAt: 'desc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// MOOC
// ════════════════════════════════════════════════════
router.get(
  '/mooc',
  validate(paginationSchema.extend({ category: z.string().optional() }), 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, q, category } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
        category?: string;
      };
      const where = {
        ...(category ? { category } : {}),
        ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
      };
      const [data, total] = await Promise.all([
        prisma.moocCourse.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { rating: 'desc' },
        }),
        prisma.moocCourse.count({ where }),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) {
      next(e);
    }
  },
);

router.post('/mooc/:id/enroll', async (req, res, next) => {
  try {
    const enrolled = await prisma.moocEnrollment.upsert({
      where: { moocId_userId: { moocId: req.params.id!, userId: req.user!.id } },
      create: { moocId: req.params.id!, userId: req.user!.id },
      update: {},
    });
    await prisma.moocCourse.update({
      where: { id: req.params.id! },
      data: { enrolled: { increment: 1 } },
    });
    res.status(201).json({ data: enrolled });
  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// JOBS
// ════════════════════════════════════════════════════
router.get(
  '/jobs',
  validate(paginationSchema.extend({ category: z.string().optional() }), 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, q, category } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
        category?: string;
      };
      const where = {
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { company: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };
      const [data, total] = await Promise.all([
        prisma.job.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { postedAt: 'desc' },
        }),
        prisma.job.count({ where }),
      ]);
      res.json({ data, meta: buildMeta(page, limit, total) });
    } catch (e) {
      next(e);
    }
  },
);

router.post('/jobs/:id/apply', async (req, res, next) => {
  try {
    const created = await prisma.jobApplication.upsert({
      where: { jobId_userId: { jobId: req.params.id!, userId: req.user!.id } },
      create: { jobId: req.params.id!, userId: req.user!.id },
      update: {},
    });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// POSTS (community feed)
// ════════════════════════════════════════════════════
router.get('/posts', validate(paginationSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const [data, total] = await Promise.all([
      prisma.post.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarInitials: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      prisma.post.count(),
    ]);
    res.json({ data, meta: buildMeta(page, limit, total) });
  } catch (e) {
    next(e);
  }
});

const createPostSchema = z
  .object({
    body: z.string().min(1).max(2000),
    hashtags: z.array(z.string().min(1).max(40)).max(10).default([]),
    imageUrl: z.string().url().optional(),
  })
  .strict();

router.post('/posts', validate(createPostSchema), async (req, res, next) => {
  try {
    const created = await prisma.post.create({
      data: { ...req.body, authorId: req.user!.id },
    });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.post('/posts/:id/react', validate(z.object({ kind: z.enum(['like', 'save']) }).strict()), async (req, res, next) => {
  try {
    const created = await prisma.postReaction.upsert({
      where: { postId_userId_kind: { postId: req.params.id!, userId: req.user!.id, kind: req.body.kind } },
      create: { postId: req.params.id!, userId: req.user!.id, kind: req.body.kind },
      update: {},
    });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// ACHIEVEMENTS / SKILLS / CERTIFICATES (read-mostly for users)
// ════════════════════════════════════════════════════
router.get('/me/achievements', async (req, res, next) => {
  try {
    const data = await prisma.userAchievement.findMany({
      where: { userId: req.user!.id },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/me/skills', async (req, res, next) => {
  try {
    const data = await prisma.userSkill.findMany({
      where: { userId: req.user!.id },
      include: { skill: true },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/me/certificates', async (req, res, next) => {
  try {
    const data = await prisma.certificate.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/leaderboard', async (_req, res, next) => {
  try {
    const data = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      include: { studentProfile: true },
      orderBy: { studentProfile: { totalXp: 'desc' } },
      take: 10,
    });
    res.json({
      data: data.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarInitials: u.avatarInitials,
        avatarColor: u.avatarColor,
        totalXp: u.studentProfile?.totalXp ?? 0,
        level: u.studentProfile?.level ?? 1,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// LABS / AR catalog
// ════════════════════════════════════════════════════
router.get('/labs', async (_req, res, next) => {
  try {
    const data = await prisma.virtualLab.findMany({ orderBy: { name: 'asc' } });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/ar-experiences', async (_req, res, next) => {
  try {
    const data = await prisma.arExperience.findMany({ orderBy: { title: 'asc' } });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// FACULTIES & DEPARTMENTS (public catalog)
// ════════════════════════════════════════════════════
router.get('/faculties', async (_req, res, next) => {
  try {
    const data = await prisma.faculty.findMany({
      include: { departments: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// ADMIN STATS
// ════════════════════════════════════════════════════
router.get('/admin/stats', requireRole(Role.ADMIN), async (_req, res, next) => {
  try {
    const [totalStudents, totalTeachers, totalCourses, totalEnrollments] = await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({ where: { role: Role.TEACHER } }),
      prisma.course.count(),
      prisma.enrollment.count(),
    ]);
    res.json({ data: { totalStudents, totalTeachers, totalCourses, totalEnrollments } });
  } catch (e) {
    next(e);
  }
});

// ── Admin: faculties with student / teacher / dept / course counts ──
router.get('/admin/faculties', requireRole(Role.ADMIN), async (_req, res, next) => {
  try {
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: 'asc' },
      include: {
        departments: {
          select: {
            id: true,
            name: true,
            _count: { select: { courses: true, students: true, teachers: true } },
          },
        },
      },
    });

    const data = faculties.map((f) => {
      const studentCount = f.departments.reduce((s, d) => s + d._count.students, 0);
      const teacherCount = f.departments.reduce((s, d) => s + d._count.teachers, 0);
      const courseCount = f.departments.reduce((s, d) => s + d._count.courses, 0);
      return {
        id: f.id,
        name: f.name,
        nameEn: f.nameEn,
        iconEmoji: f.iconEmoji,
        departmentCount: f.departments.length,
        studentCount,
        teacherCount,
        courseCount,
        departments: f.departments.map((d) => ({
          id: d.id,
          name: d.name,
          students: d._count.students,
          teachers: d._count.teachers,
          courses: d._count.courses,
        })),
      };
    });

    res.json({ data });
  } catch (e) { next(e); }
});

// ── Admin: institutional reports
router.get('/admin/reports', requireRole(Role.ADMIN), async (_req, res, next) => {
  try {
    const now = new Date();
    const monthStart = (n: number) => {
      const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
      return d;
    };

    // 1) Paper publishing trend — last 6 months
    const sixMonthsAgo = monthStart(5);
    const allRecentPapers = await prisma.researchPaper.findMany({
      where: {
        OR: [
          { publishedAt: { gte: sixMonthsAgo } },
          { gradedAt: { gte: sixMonthsAgo } },
          { uploadedAt: { gte: sixMonthsAgo } },
        ],
      },
      select: { status: true, publishedAt: true, gradedAt: true, uploadedAt: true },
    });

    const monthBuckets = Array.from({ length: 6 }, (_, i) => {
      const start = monthStart(5 - i);
      const end = monthStart(4 - i);
      const label = start.toLocaleDateString('ar-LY', { month: 'short' });
      const submitted = allRecentPapers.filter((p) => p.uploadedAt >= start && p.uploadedAt < end).length;
      const graded = allRecentPapers.filter((p) => p.gradedAt && p.gradedAt >= start && p.gradedAt < end).length;
      const published = allRecentPapers.filter((p) => p.publishedAt && p.publishedAt >= start && p.publishedAt < end).length;
      return { month: label, submitted, graded, published };
    });

    // 2) Top performing courses — by completion rate
    const offerings = await prisma.courseOffering.findMany({
      include: {
        course: { select: { name: true, code: true } },
        _count: { select: { enrollments: true, lectures: true } },
      },
      take: 50,
    });
    const courseStats = offerings.map((o) => ({
      code: o.course.code,
      name: o.course.name,
      enrollments: o._count.enrollments,
      lectures: o._count.lectures,
    })).sort((a, b) => b.enrollments - a.enrollments).slice(0, 8);

    // 3) Headline counts
    const [totalPapers, publishedPapers, totalUsers, activeStudents] = await Promise.all([
      prisma.researchPaper.count(),
      prisma.researchPaper.count({ where: { status: 'PUBLISHED' } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.STUDENT } }),
    ]);

    res.json({
      data: {
        headline: { totalPapers, publishedPapers, totalUsers, activeStudents },
        paperTrend: monthBuckets,
        topCourses: courseStats,
      },
    });
  } catch (e) { next(e); }
});

// ── Admin: courses list with full counts ─────────────────────
const adminCourseInclude = Prisma.validator<Prisma.CourseInclude>()({
  department: { select: { name: true, faculty: { select: { name: true, iconEmoji: true } } } },
  _count: { select: { offerings: true, concepts: true } },
  offerings: {
    select: {
      id: true,
      term: true,
      _count: { select: { enrollments: true, lectures: true, materials: true, assignments: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
    orderBy: { term: 'desc' },
    take: 3,
  },
});

router.get('/admin/courses', requireRole(Role.ADMIN), async (_req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: [{ code: 'asc' }],
      include: adminCourseInclude,
    });

    const data = courses.map((c) => {
      const totalEnrollments = c.offerings.reduce((s, o) => s + o._count.enrollments, 0);
      const totalLectures = c.offerings.reduce((s, o) => s + o._count.lectures, 0);
      const totalMaterials = c.offerings.reduce((s, o) => s + o._count.materials, 0);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        credits: c.credits,
        themeColor: c.themeColor,
        faculty: c.department?.faculty?.name ?? null,
        facultyEmoji: c.department?.faculty?.iconEmoji ?? null,
        department: c.department?.name ?? null,
        offeringCount: c._count.offerings,
        conceptCount: c._count.concepts,
        totalEnrollments,
        totalLectures,
        totalMaterials,
        recentOfferings: c.offerings.map((o) => ({
          id: o.id,
          term: o.term,
          enrollments: o._count.enrollments,
          lectures: o._count.lectures,
          teacher: o.teacher ? `${o.teacher.firstName} ${o.teacher.lastName}` : null,
        })),
      };
    });

    res.json({ data });
  } catch (e) { next(e); }
});

export default router;
