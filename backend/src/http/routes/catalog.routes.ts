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

// ════════════════════════════════════════════════════
// FACULTIES & DEPARTMENTS (public catalog)
// ════════════════════════════════════════════════════
// PUBLIC — declared BEFORE the router-level authMiddleware
// below (audit 4-A13 P0-1): the anonymous /auth/register
// funnel reads this lookup (useFaculties), as do the campus
// map and the university directory. Express dispatches in
// registration order, so this route answers before the auth
// gate ever runs — previously the router-level middleware
// swallowed it and every anonymous visitor got a 401, making
// self-serve registration impossible.
//
// Projection: names/ids/emoji/city only — no PII, and
// strictly narrower than the already-public GET /colleges
// bundle (which additionally ships the per-faculty counts).
// Still behind the app-level global rate limiter (app.ts
// mounts it for the whole /api/v1 prefix).
router.get('/faculties', async (_req, res, next) => {
  try {
    const data = await prisma.faculty.findMany({
      select: {
        id: true,
        name: true,
        iconEmoji: true,
        city: true,
        departments: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// Everything below this line requires a session. Public
// routes MUST be declared above (they would otherwise be
// 401'd by this gate before their handler runs).
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

// ─── Pure logic (exported for DB-free unit tests) ─────────────────

/** Body of POST /library/loans — a book reference and nothing else. */
export const borrowBookSchema = z.object({ bookId: z.string().cuid() }).strict();

router.post(
  '/library/loans',
  validate(borrowBookSchema),
  async (req, res, next) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const book = await tx.book.findUnique({ where: { id: req.body.bookId } });
        if (!book) throw AppError.notFound('الكتاب غير موجود');
        // Guarded decrement: only a request that actually flips
        // availableCopies > 0 → ≥ 0 can claim a copy, so two concurrent
        // borrows can't both take the last copy (classic check-then-update race).
        const claim = await tx.book.updateMany({
          where: { id: book.id, availableCopies: { gt: 0 } },
          data: { availableCopies: { decrement: 1 } },
        });
        if (claim.count === 0) throw AppError.conflict('لا توجد نسخ متاحة للاستعارة حالياً');
        // Per-(user, book) active-loan dedupe (audit 15-b P2-3). The check
        // runs AFTER the copy claim on purpose: the claim's row lock on the
        // book is the serialization point for every borrow of the same book,
        // so a same-user transaction that committed while this one waited is
        // already visible here — the classic find-then-create race is closed
        // without a schema edit. (Report-only: a partial unique on
        // (bookId, userId) WHERE status <> 'RETURNED' would make it airtight
        // at the DB level too.) Throwing rolls the whole transaction back,
        // so the decremented copy is restored. OVERDUE counts as possession:
        // nothing flips loans to OVERDUE today, but "still in the borrower's
        // hands" is "not RETURNED", not "ACTIVE".
        const activeLoan = await tx.loan.findFirst({
          where: {
            bookId: book.id,
            userId: req.user!.id,
            status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
          },
          select: { id: true },
        });
        if (activeLoan) throw AppError.conflict('استعرت هذا الكتاب مسبقاً ولم تُعده بعد');
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
    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id! },
      select: { id: true, userId: true, bookId: true },
    });
    if (!loan || loan.userId !== req.user!.id) throw AppError.notFound();
    const updated = await prisma.$transaction(async (tx) => {
      // Claim the return INSIDE the transaction: the updateMany guard means
      // only one concurrent return can flip ACTIVE → RETURNED; the loser
      // gets a 409 instead of double-incrementing the book's copies.
      const claim = await tx.loan.updateMany({
        where: { id: loan.id, userId: loan.userId, status: LoanStatus.ACTIVE },
        data: { returnedAt: new Date(), status: LoanStatus.RETURNED },
      });
      if (claim.count === 0) throw AppError.conflict('أُعيد هذا الكتاب مسبقاً');
      // Restore the copy, but never above totalCopies (data-integrity clamp).
      const book = await tx.book.findUnique({
        where: { id: loan.bookId },
        select: { totalCopies: true },
      });
      if (!book) throw AppError.notFound('الكتاب غير موجود');
      await tx.book.updateMany({
        where: { id: loan.bookId, availableCopies: { lt: book.totalCopies } },
        data: { availableCopies: { increment: 1 } },
      });
      return tx.loan.findUnique({ where: { id: loan.id } });
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/me/loans', async (req, res, next) => {
  try {
    // Bounded read (audit P2-18): a personal loan history far below
    // this cap — newest first.
    const data = await prisma.loan.findMany({
      where: { userId: req.user!.id },
      include: { book: true },
      orderBy: { borrowedAt: 'desc' },
      take: 100,
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
    const moocId = req.params.id!;
    const userId = req.user!.id;

    // Only a NEW enrollment row bumps the counter — a repeat enroll used to
    // inflate `enrolled` on every call (upsert + unconditional increment).
    const enroll = async () =>
      prisma.$transaction(async (tx) => {
        const existing = await tx.moocEnrollment.findUnique({
          where: { moocId_userId: { moocId, userId } },
        });
        if (existing) return existing;
        const created = await tx.moocEnrollment.create({ data: { moocId, userId } });
        await tx.moocCourse.update({ where: { id: moocId }, data: { enrolled: { increment: 1 } } });
        return created;
      });
    try {
      const enrolled = await enroll();
      res.status(201).json({ data: enrolled });
    } catch (e) {
      // P2002 = a concurrent request created the row first — treat as enrolled.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const enrolled = await prisma.moocEnrollment.findUniqueOrThrow({
          where: { moocId_userId: { moocId, userId } },
        });
        res.status(201).json({ data: enrolled });
        return;
      }
      throw e;
    }

  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// JOBS
// ════════════════════════════════════════════════════
/** The viewer's JobApplication rows for the current jobs page — the
 * select below projects exactly this (audit 15-d P2-10). */
export interface ViewerApplicationRow {
  jobId: string;
}

/**
 * GET /jobs payload (audit 15-d P2-10): `appliedJobIds` tells the FE
 * which jobs on THIS page the viewer already applied to — the
 * «تمّ التقديم» badge used to be client-local fiction (`useState(false)`
 * seeded from nothing), lost on every remount while the server-side
 * upsert kept the application. Reads `jobId` (NOT the application's own
 * id — the realistic mix-up this extraction pins) and preserves row
 * order; the (jobId, userId) unique constraint guarantees no duplicates.
 */
export function jobsListPayload<T extends { id: string }>(
  data: readonly T[],
  total: number,
  page: number,
  limit: number,
  applications: readonly ViewerApplicationRow[],
): { data: T[]; meta: ReturnType<typeof buildMeta>; appliedJobIds: string[] } {
  return {
    data: [...data],
    meta: buildMeta(page, limit, total),
    appliedJobIds: applications.map((a) => a.jobId),
  };
}

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
      // Viewer's applications, bounded by the page (≤ limit) — never an
      // unbounded scan of a user's whole application history (11-c P2-14).
      // Runs for every authenticated caller: POST /jobs/:id/apply has no
      // role guard, so truth is not role-gated either.
      const applications = data.length > 0
        ? await prisma.jobApplication.findMany({
            where: { userId: req.user!.id, jobId: { in: data.map((j) => j.id) } },
            select: { jobId: true },
          })
        : [];
      res.json(jobsListPayload(data, total, page, limit, applications));
    } catch (e) {
      next(e);
    }
  },
);

router.post('/jobs/:id/apply', async (req, res, next) => {
  try {
    // Unknown jobIds previously surfaced as a P2003 FK error (400
    // «Related record does not exist») — resolve to a clean 404, the
    // same shape as POST /library/loans above (audit P2-14).
    const job = await prisma.job.findUnique({
      where: { id: req.params.id! },
      select: { id: true },
    });
    if (!job) throw AppError.notFound('الوظيفة غير موجودة');
    const created = await prisma.jobApplication.upsert({
      where: { jobId_userId: { jobId: job.id, userId: req.user!.id } },
      create: { jobId: job.id, userId: req.user!.id },
      update: {},
    });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

// ── POSTS (community feed) ────────────────────────────────────────
// List convention (audit 15-i P1-4): browse-style feeds are paginated
// (page/limit + meta); only search-as-you-type endpoints are capped.
// `/posts` follows the paginated rule — the capped twin lives in social.

/** Feed row of GET /posts — the Prisma include below. `reactions` holds
 * ONLY the viewer's own rows (filtered by userId in the query); it is a
 * derivation helper, folded away before the wire (audit 15-d P2-13). */
export interface PostFeedRow {
  id: string;
  authorId: string;
  body: string;
  hashtags: string[];
  imageUrl: string | null;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string; avatarColor: string | null; avatarInitials: string | null };
  _count: { comments: number; reactions: number };
  reactions: ReadonlyArray<{ kind: string }>;
}

/**
 * GET /posts list item — the feed row plus the additive `viewerReacted`
 * flag (audit 15-d P2-13-reaction): the FE heart used to be session-local
 * state, so a reload un-liked the UI while the server reaction persisted.
 * True when the viewer has ANY reaction row (like or save) on the post;
 * the raw rows are stripped from the item.
 */
export function postFeedItem(row: PostFeedRow): Omit<PostFeedRow, 'reactions'> & { viewerReacted: boolean } {
  const { reactions: _viewerRows, ...post } = row;
  return { ...post, viewerReacted: _viewerRows.length > 0 };
}

router.get('/posts', validate(paginationSchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q } = req.query as unknown as { page: number; limit: number; q?: string };
    // `q` used to be accepted by the query schema and then silently
    // ignored — a ?q= search returned the unfiltered page. Apply the
    // same body-text filter as the other catalog lists (audit P2-8).
    const where = q ? { body: { contains: q, mode: 'insensitive' as const } } : {};
    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatarInitials: true } },
          _count: { select: { comments: true, reactions: true } },
          // The viewer's own reactions — feeds `viewerReacted` above.
          reactions: { where: { userId: req.user!.id }, select: { kind: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);
    res.json({ data: data.map(postFeedItem), meta: buildMeta(page, limit, total) });
  } catch (e) {
    next(e);
  }
});

export const createPostSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    hashtags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    imageUrl: z.string().trim().url().optional(),
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

/** Body of POST /posts/:id/react — toggling one reaction kind. */
export const reactSchema = z.object({ kind: z.enum(['like', 'save']) }).strict();

router.post('/posts/:id/react', validate(reactSchema), async (req, res, next) => {
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
    // Bounded read (audit P2-18) — catalog domain, well below this cap.
    const data = await prisma.virtualLab.findMany({ orderBy: { name: 'asc' }, take: 200 });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/ar-experiences', async (_req, res, next) => {
  try {
    // Bounded read (audit P2-18) — catalog domain, well below this cap.
    const data = await prisma.arExperience.findMany({ orderBy: { title: 'asc' }, take: 200 });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ════════════════════════════════════════════════════
// ADMIN STATS
// ════════════════════════════════════════════════════
router.get('/admin/stats', requireRole(Role.ADMIN, Role.OWNER), async (_req, res, next) => {
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
router.get('/admin/faculties', requireRole(Role.ADMIN, Role.OWNER), async (_req, res, next) => {
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
        city: f.city,
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

// ── Pure logic: /admin/reports folds (exported for DB-free tests) ──

/** The /admin/reports projection of a research paper — just the three
 *  activity timestamps the trend buckets are built from. */
export type PaperTrendInput = {
  uploadedAt: Date;
  gradedAt: Date | null;
  publishedAt: Date | null;
};

export type PaperTrendBucket = { month: string; submitted: number; graded: number; published: number };

/**
 * Last-`bucketCount` monthly paper-activity buckets, oldest → newest.
 * `monthStart(n)` must return the FIRST instant of the month `n` months
 * before "now" (the route passes its local-calendar closure). Bucket i is
 * the half-open range [start, end): a paper timestamped exactly at a
 * boundary belongs to the newer bucket, and null gradedAt/publishedAt
 * never count in those dimensions.
 */
export function buildPaperTrend(
  papers: readonly PaperTrendInput[],
  monthStart: (monthsAgo: number) => Date,
  bucketCount = 6,
): PaperTrendBucket[] {
  return Array.from({ length: bucketCount }, (_, i) => {
    const start = monthStart(bucketCount - 1 - i);
    const end = monthStart(bucketCount - 2 - i);
    const label = start.toLocaleDateString('ar-LY', { month: 'short' });
    const submitted = papers.filter((p) => p.uploadedAt >= start && p.uploadedAt < end).length;
    const graded = papers.filter((p) => p.gradedAt !== null && p.gradedAt >= start && p.gradedAt < end).length;
    const published = papers.filter((p) => p.publishedAt !== null && p.publishedAt >= start && p.publishedAt < end).length;
    return { month: label, submitted, graded, published };
  });
}

/** The /admin/reports offering projection folded by `topCoursesByEnrollments`. */
export type TopCourseOfferingInput = {
  courseId: string;
  course: { name: string; code: string };
  _count: { enrollments: number; lectures: number };
};

export type CourseEnrollmentStat = { code: string; name: string; enrollments: number; lectures: number };

/**
 * Fold bounded offering rows into per-COURSE totals so a multi-offering
 * course occupies ONE row (per-course code/name comes from the FIRST row
 * seen), ranked by total enrollments with a code tie-break that keeps the
 * order stable, capped at `max` rows (the admin table renders the top 8).
 */
export function topCoursesByEnrollments(
  offerings: readonly TopCourseOfferingInput[],
  max = 8,
): CourseEnrollmentStat[] {
  const byCourse = new Map<string, CourseEnrollmentStat>();
  for (const o of offerings) {
    const row =
      byCourse.get(o.courseId) ??
      { code: o.course.code, name: o.course.name, enrollments: 0, lectures: 0 };
    row.enrollments += o._count.enrollments;
    row.lectures += o._count.lectures;
    byCourse.set(o.courseId, row);
  }
  return Array.from(byCourse.values())
    .sort((a, b) => b.enrollments - a.enrollments || a.code.localeCompare(b.code))
    .slice(0, max);
}

// ── Admin: institutional reports
router.get('/admin/reports', requireRole(Role.ADMIN, Role.OWNER), async (_req, res, next) => {
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
      select: { publishedAt: true, gradedAt: true, uploadedAt: true },
    });

    const monthBuckets = buildPaperTrend(allRecentPapers, monthStart);

    // 2) Top courses — ranked by TOTAL enrollments across their
    //    offerings, aggregated per course so a multi-offering course
    //    occupies ONE row (the old per-offering rows duplicated course
    //    codes in the admin table). The metric is enrollment count,
    //    matching the admin UI's «أكثر المقررات تسجيلاً» label — NOT a
    //    completion rate (audit P2-22). Bounded to the 50 most recent
    //    offerings; code tie-break keeps the top-8 stable.
    const offerings = await prisma.courseOffering.findMany({
      select: {
        courseId: true,
        course: { select: { name: true, code: true } },
        _count: { select: { enrollments: true, lectures: true } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    const courseStats = topCoursesByEnrollments(offerings);

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
// NOTE: `offerings` here is a PREVIEW (3 most recent, for the
// recentOfferings column only) — per-course totals are computed from
// a second bounded query over ALL of the page's courses' offerings,
// so courses with 4+ offerings are no longer undercounted (P2-7).
const adminCourseInclude = Prisma.validator<Prisma.CourseInclude>()({
  department: { select: { name: true, faculty: { select: { name: true, iconEmoji: true } } } },
  _count: { select: { offerings: true, concepts: true } },
  offerings: {
    select: {
      id: true,
      term: true,
      _count: { select: { enrollments: true, lectures: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
    orderBy: { term: 'desc' },
    take: 3,
  },
});

router.get(
  '/admin/courses',
  requireRole(Role.ADMIN, Role.OWNER),
  validate(paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ code: 'asc' }],
          include: adminCourseInclude,
        }),
        prisma.course.count(),
      ]);

      // Real per-course totals across ALL of each course's offerings
      // (count aggregation, not hydration) — summing the take:3 preview
      // above undercounted courses with more offerings (audit P2-7).
      const courseIds = courses.map((c) => c.id);
      const offeringTotals = courseIds.length
        ? await prisma.courseOffering.findMany({
            where: { courseId: { in: courseIds } },
            select: {
              courseId: true,
              _count: { select: { enrollments: true, lectures: true, materials: true } },
            },
          })
        : [];
      const totalsByCourse = new Map<
        string,
        { enrollments: number; lectures: number; materials: number }
      >();
      for (const o of offeringTotals) {
        const t = totalsByCourse.get(o.courseId) ?? { enrollments: 0, lectures: 0, materials: 0 };
        t.enrollments += o._count.enrollments;
        t.lectures += o._count.lectures;
        t.materials += o._count.materials;
        totalsByCourse.set(o.courseId, t);
      }

      const data = courses.map((c) => {
        const totals = totalsByCourse.get(c.id) ?? { enrollments: 0, lectures: 0, materials: 0 };
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
          totalEnrollments: totals.enrollments,
          totalLectures: totals.lectures,
          totalMaterials: totals.materials,
          recentOfferings: c.offerings.map((o) => ({
            id: o.id,
            term: o.term,
            enrollments: o._count.enrollments,
            lectures: o._count.lectures,
            teacher: o.teacher ? `${o.teacher.firstName} ${o.teacher.lastName}` : null,
          })),
        };
      });

    res.json({ data, meta: buildMeta(page, limit, total) });
  } catch (e) { next(e); }
});

export default router;
