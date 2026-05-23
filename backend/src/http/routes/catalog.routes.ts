import { Router } from 'express';
import { z } from 'zod';
import { LoanStatus, Role } from '@prisma/client';
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

export default router;
