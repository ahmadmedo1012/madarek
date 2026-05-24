import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

/**
 * Helper — convert Decimal columns to Numbers for JSON.
 */
function decToNum<T>(o: T): T {
  if (o === null || o === undefined) return o;
  if (typeof o === 'object') {
    // Pass-through for native types we shouldn't traverse.
    if (o instanceof Date) return o;
    if (Array.isArray(o)) return o.map(decToNum) as never;
    // Prisma Decimal exposes toNumber() — convert to plain number.
    const obj = o as unknown as { toNumber?: () => number; s?: number; e?: number; d?: number[] };
    if (typeof obj.toNumber === 'function') {
      return obj.toNumber() as never;
    }
    // Fallback: detect serialized Decimal shape { s, e, d:[...] }
    if (
      typeof obj.s === 'number' &&
      typeof obj.e === 'number' &&
      Array.isArray(obj.d) &&
      Object.keys(o).length <= 3
    ) {
      // Reconstruct a number from the Decimal internal representation.
      // s = sign, e = exponent, d = digits array.
      const digits = obj.d.join('');
      const num = Number(`${obj.s < 0 ? '-' : ''}${digits.slice(0, obj.e + 1)}.${digits.slice(obj.e + 1) || '0'}`);
      return (Number.isFinite(num) ? num : 0) as never;
    }
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o as object)) out[k] = decToNum((o as Record<string, unknown>)[k]);
    return out as never;
  }
  return o;
}

// ════════════════════════════════════════════════════════════════
// Lectures (per offering)
// ════════════════════════════════════════════════════════════════
router.get('/offerings/:id/full', async (req, res, next) => {
  try {
    const id = req.params.id!;
    const offering = await prisma.courseOffering.findUnique({
      where: { id },
      include: {
        course: { include: { department: { include: { faculty: true } } } },
        teacher: { select: { id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true } },
        schedule: true,
        materials: { orderBy: { createdAt: 'desc' }, take: 10 },
        assignments: { orderBy: { dueAt: 'asc' } },
        lectures: {
          orderBy: { ordinal: 'asc' },
          include: {
            _count: { select: { chapters: true, checkpoints: true } },
            watchEvents: req.user!.role === Role.STUDENT
              ? { where: { studentId: req.user!.id }, take: 1 }
              : false,
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!offering) throw AppError.notFound();
    // Replace BigInt material sizes with strings for JSON compatibility.
    const safe = {
      ...offering,
      materials: offering.materials.map((m) => ({ ...m, sizeBytes: m.sizeBytes.toString() })),
    };
    res.json({ data: decToNum(safe) });
  } catch (e) { next(e); }
});

router.get('/offerings/:id/lectures', async (req, res, next) => {
  try {
    const offeringId = req.params.id!;
    const data = await prisma.lecture.findMany({
      where: { offeringId },
      orderBy: { ordinal: 'asc' },
      include: {
        _count: { select: { chapters: true, checkpoints: true } },
        watchEvents: req.user!.role === Role.STUDENT
          ? { where: { studentId: req.user!.id } }
          : false,
      },
    });
    res.json({ data });
  } catch (e) { next(e); }
});

router.get('/lectures/:id', async (req, res, next) => {
  try {
    const lec = await prisma.lecture.findUnique({
      where: { id: req.params.id! },
      include: {
        offering: {
          include: {
            course: { include: { department: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        chapters: {
          orderBy: { ordinal: 'asc' },
          include: { concept: { select: { id: true, name: true } } },
        },
        checkpoints: {
          orderBy: { triggerSec: 'asc' },
          select: {
            id: true, triggerSec: true, question: true, options: true, conceptId: true,
            // hide correctIndex from the wire — answered via separate endpoint
          },
        },
        watchEvents: req.user!.role === Role.STUDENT
          ? { where: { studentId: req.user!.id }, take: 1 }
          : false,
      },
    });
    if (!lec) throw AppError.notFound();
    res.json({ data: lec });
  } catch (e) { next(e); }
});

const watchSchema = z.object({
  watchedSec: z.number().int().nonnegative(),
  totalSec: z.number().int().nonnegative(),
  completed: z.boolean().optional(),
}).strict();

router.post('/lectures/:id/watch', validate(watchSchema), async (req, res, next) => {
  try {
    const { watchedSec, totalSec, completed } = req.body as z.infer<typeof watchSchema>;
    const ev = await prisma.watchEvent.upsert({
      where: { lectureId_studentId: { lectureId: req.params.id!, studentId: req.user!.id } },
      create: {
        lectureId: req.params.id!,
        studentId: req.user!.id,
        watchedSec,
        totalSec,
        completed: completed ?? false,
      },
      update: {
        watchedSec: { set: Math.max(watchedSec, 0) },
        totalSec,
        completed: completed ?? undefined,
        lastSeenAt: new Date(),
      },
    });
    res.json({ data: ev });
  } catch (e) { next(e); }
});

const answerSchema = z.object({ answerIndex: z.number().int().min(0).max(10) }).strict();

router.post('/lectures/:lid/checkpoints/:cid/answer', validate(answerSchema), async (req, res, next) => {
  try {
    const cp = await prisma.lectureCheckpoint.findUnique({ where: { id: req.params.cid! } });
    if (!cp) throw AppError.notFound();
    const correct = cp.correctIndex === (req.body as z.infer<typeof answerSchema>).answerIndex;

    // Update student mastery if checkpoint is concept-tagged.
    if (cp.conceptId && req.user!.role === Role.STUDENT) {
      const existing = await prisma.studentMastery.findUnique({
        where: { studentId_conceptId: { studentId: req.user!.id, conceptId: cp.conceptId } },
      });
      const attempts = (existing?.attempts ?? 0) + 1;
      const correctCount = (existing?.correct ?? 0) + (correct ? 1 : 0);
      const level = Math.max(0, Math.min(1, correctCount / attempts));
      await prisma.studentMastery.upsert({
        where: { studentId_conceptId: { studentId: req.user!.id, conceptId: cp.conceptId } },
        create: { studentId: req.user!.id, conceptId: cp.conceptId, level, attempts, correct: correctCount },
        update: { level, attempts, correct: correctCount, lastUpdatedAt: new Date() },
      });
    }
    res.json({ data: { correct, correctIndex: cp.correctIndex, explanation: cp.explanation } });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
// Educational Matrix (per-student)
// ════════════════════════════════════════════════════════════════
router.get('/me/resume', async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) {
      res.json({ data: null });
      return;
    }

    // 1. Most-recently-watched, not yet completed lecture takes priority.
    const recent = await prisma.watchEvent.findFirst({
      where: { studentId: req.user!.id, completed: false },
      orderBy: { lastSeenAt: 'desc' },
      include: {
        lecture: {
          include: {
            offering: { include: { course: { select: { id: true, name: true, code: true, themeColor: true } } } },
          },
        },
      },
    });
    if (recent) {
      const pct = recent.totalSec > 0 ? Math.round((recent.watchedSec / recent.totalSec) * 100) : 0;
      res.json({
        data: {
          mode: 'continue',
          progressPct: pct,
          watchedSec: recent.watchedSec,
          lecture: {
            id: recent.lecture.id,
            title: recent.lecture.title,
            durationSec: recent.lecture.durationSec,
            ordinal: recent.lecture.ordinal,
            course: recent.lecture.offering.course,
            offeringId: recent.lecture.offeringId,
          },
        },
      });
      return;
    }

    // 2. No in-progress: first lecture of an enrolled offering with lectures.
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      include: {
        offering: {
          include: {
            course: { select: { id: true, name: true, code: true, themeColor: true } },
            lectures: { orderBy: { ordinal: 'asc' }, take: 1 },
          },
        },
      },
    });
    for (const e of enrollments) {
      const lec = e.offering.lectures[0];
      if (lec) {
        res.json({
          data: {
            mode: 'start',
            progressPct: 0,
            watchedSec: 0,
            lecture: {
              id: lec.id,
              title: lec.title,
              durationSec: lec.durationSec,
              ordinal: lec.ordinal,
              course: e.offering.course,
              offeringId: e.offering.id,
            },
          },
        });
        return;
      }
    }
    res.json({ data: null });
  } catch (e) { next(e); }
});


router.get('/me/matrix', async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) {
      res.json({ data: [] });
      return;
    }
    // Get all concepts across the student's enrolled courses, with mastery if any.
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      include: { offering: { include: { course: { include: { concepts: true } } } } },
    });
    const masteries = await prisma.studentMastery.findMany({
      where: { studentId: req.user!.id },
    });
    const masteryByConcept = new Map(masteries.map((m) => [m.conceptId, m]));

    const data = enrollments.map((e) => ({
      courseId: e.offering.course.id,
      courseName: e.offering.course.name,
      courseCode: e.offering.course.code,
      themeColor: e.offering.course.themeColor,
      offeringId: e.offering.id,
      concepts: e.offering.course.concepts
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((c) => {
          const m = masteryByConcept.get(c.id);
          return {
            id: c.id,
            name: c.name,
            level: m ? Number(m.level) : 0,
            attempts: m?.attempts ?? 0,
          };
        }),
    }));
    res.json({ data: decToNum(data) });
  } catch (e) { next(e); }
});

router.get('/me/gaps', async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) {
      res.json({ data: [] });
      return;
    }
    const masteries = await prisma.studentMastery.findMany({
      where: { studentId: req.user!.id, level: { lt: 0.6 } },
      include: {
        concept: {
          include: {
            course: { select: { id: true, name: true, themeColor: true } },
            chapters: {
              take: 1,
              include: { lecture: { select: { id: true, title: true } } },
            },
          },
        },
      },
      orderBy: { level: 'asc' },
    });
    const data = masteries.map((m) => ({
      conceptId: m.conceptId,
      conceptName: m.concept.name,
      courseId: m.concept.course.id,
      courseName: m.concept.course.name,
      courseColor: m.concept.course.themeColor,
      level: Number(m.level),
      recommendedLectureId: m.concept.chapters[0]?.lecture.id ?? null,
      recommendedLectureTitle: m.concept.chapters[0]?.lecture.title ?? null,
    }));
    res.json({ data });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
// Research papers
// ════════════════════════════════════════════════════════════════
router.get('/me/research', async (req, res, next) => {
  try {
    const where = req.user!.role === Role.STUDENT ? { studentId: req.user!.id } : {};
    const data = await prisma.researchPaper.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, avatarInitials: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        offering: { include: { course: { select: { name: true, code: true } } } },
      },
    });
    res.json({ data: decToNum(data) });
  } catch (e) { next(e); }
});

const createPaperSchema = z.object({
  title: z.string().min(3).max(280),
  abstract: z.string().max(4000).optional(),
  offeringId: z.string().cuid().optional(),
  fileUrl: z.string().url().max(500).optional(),
}).strict();

router.post('/me/research', validate(createPaperSchema), async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) throw AppError.forbidden();
    const created = await prisma.researchPaper.create({
      data: { ...req.body, studentId: req.user!.id, status: 'UPLOADED' },
    });
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

// Simulated plagiarism + AI-content scan. Picks deterministic-feeling values.
router.post('/research/:id/scan', async (req, res, next) => {
  try {
    const id = req.params.id!;
    const paper = await prisma.researchPaper.findUnique({ where: { id } });
    if (!paper) throw AppError.notFound();
    if (req.user!.role !== Role.STUDENT && req.user!.role !== Role.TEACHER && req.user!.role !== Role.ADMIN) {
      throw AppError.forbidden();
    }
    // Deterministic-looking results derived from id hash.
    const seed = paper.id.charCodeAt(0) + paper.id.charCodeAt(2);
    const plagiarismPct = Number((((seed * 7) % 18) + 3).toFixed(1)); // 3 - 21
    const aiContentPct = Number((((seed * 11) % 22) + 4).toFixed(1)); // 4 - 26
    const passed = plagiarismPct < 15 && aiContentPct < 25;
    const updated = await prisma.researchPaper.update({
      where: { id },
      data: {
        status: passed ? 'CHECKS_PASSED' : 'CHECKS_FAILED',
        plagiarismPct,
        aiContentPct,
        scannedAt: new Date(),
      },
    });
    res.json({ data: decToNum(updated) });
  } catch (e) { next(e); }
});

const gradePaperSchema = z.object({
  grade: z.number().min(0).max(20),
  feedback: z.string().max(4000).optional(),
}).strict();

router.post('/research/:id/grade', requireRole(Role.TEACHER, Role.ADMIN), validate(gradePaperSchema), async (req, res, next) => {
  try {
    const id = req.params.id!;
    const updated = await prisma.researchPaper.update({
      where: { id },
      data: {
        grade: req.body.grade,
        feedback: req.body.feedback,
        reviewerId: req.user!.id,
        status: 'GRADED',
        gradedAt: new Date(),
      },
    });
    res.json({ data: decToNum(updated) });
  } catch (e) { next(e); }
});

// Teacher / admin queue: papers passing checks, awaiting grade.
router.get('/research/queue', requireRole(Role.TEACHER, Role.ADMIN), async (_req, res, next) => {
  try {
    const data = await prisma.researchPaper.findMany({
      where: { status: { in: ['CHECKS_PASSED', 'CHECKS_FAILED'] } },
      orderBy: { uploadedAt: 'desc' },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true, email: true,
          },
        },
        offering: { include: { course: { select: { name: true, code: true } } } },
      },
    });
    res.json({ data: decToNum(data) });
  } catch (e) { next(e); }
});

// Publish a graded paper to the library.
router.post('/research/:id/publish', requireRole(Role.TEACHER, Role.ADMIN), async (req, res, next) => {
  try {
    const id = req.params.id!;
    const paper = await prisma.researchPaper.findUnique({ where: { id } });
    if (!paper) throw AppError.notFound();
    if (paper.status !== 'GRADED') throw AppError.conflict('Paper must be graded before publishing');
    const updated = await prisma.researchPaper.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    res.json({ data: decToNum(updated) });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
// Quality oversight (read-only views of institutional health)
// ════════════════════════════════════════════════════════════════
router.get('/quality/overview', requireRole(Role.QUALITY, Role.ADMIN), async (_req, res, next) => {
  try {
    const [users, courses, offerings, attendance, papers, lectures] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.course.count(),
      prisma.courseOffering.count(),
      prisma.attendanceRecord.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.researchPaper.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.lecture.count(),
    ]);
    res.json({
      data: {
        users: Object.fromEntries(users.map((u) => [u.role, u._count._all])),
        courses,
        offerings,
        lectures,
        attendance: Object.fromEntries(attendance.map((a) => [a.status, a._count._all])),
        papers: Object.fromEntries(papers.map((p) => [p.status, p._count._all])),
      },
    });
  } catch (e) { next(e); }
});

router.get('/quality/courses', requireRole(Role.QUALITY, Role.ADMIN), async (_req, res, next) => {
  try {
    const offerings = await prisma.courseOffering.findMany({
      include: {
        course: { select: { id: true, name: true, code: true, themeColor: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { enrollments: true, lectures: true, materials: true, assignments: true } },
      },
      take: 50,
    });
    res.json({ data: offerings });
  } catch (e) { next(e); }
});

router.get('/quality/professors', requireRole(Role.QUALITY, Role.ADMIN), async (_req, res, next) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: Role.TEACHER },
      include: {
        teacherProfile: { include: { department: { include: { faculty: { select: { name: true } } } } } },
        taughtOfferings: {
          include: {
            _count: {
              select: {
                materials: true, assignments: true, lectures: true, attendance: true, enrollments: true,
              },
            },
          },
        },
      },
      take: 100,
    });

    // Compute per-teacher aggregate metrics. Where real signals are sparse,
    // we fall back to deterministic seed-based mock values so the UI is meaningful.
    const data = teachers.map((t, idx) => {
      const off = t.taughtOfferings;
      const totals = off.reduce(
        (acc, o) => ({
          enrollments: acc.enrollments + o._count.enrollments,
          materials: acc.materials + o._count.materials,
          lectures: acc.lectures + o._count.lectures,
          assignments: acc.assignments + o._count.assignments,
          attendance: acc.attendance + o._count.attendance,
        }),
        { enrollments: 0, materials: 0, lectures: 0, assignments: 0, attendance: 0 },
      );
      // Deterministic but plausible mock satisfaction & response time per teacher.
      const seed = (idx + 1) * 7;
      const satisfaction = 3.5 + ((seed * 13) % 13) / 10; // 3.5 - 4.8
      const responseHours = 2 + ((seed * 5) % 22); // 2 - 24
      // Compliance score = simple weighted mix of materials + lectures + attendance.
      const compliance = Math.min(
        100,
        totals.materials * 6 + totals.lectures * 12 + totals.attendance * 4 + (totals.assignments ? 8 : 0),
      );
      return {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        avatarInitials: t.avatarInitials,
        avatarColor: t.avatarColor,
        rank: t.teacherProfile?.rank ?? 'LECTURER',
        specialty: t.teacherProfile?.specialty ?? '—',
        faculty: t.teacherProfile?.department?.faculty?.name ?? '—',
        department: t.teacherProfile?.department?.name ?? '—',
        offerings: off.length,
        totals,
        satisfaction: Number(satisfaction.toFixed(1)),
        responseHours,
        compliance,
      };
    });
    res.json({ data });
  } catch (e) { next(e); }
});

router.get('/quality/engagement', requireRole(Role.QUALITY, Role.ADMIN), async (_req, res, next) => {
  try {
    const [attendance, watchEvents, lectures, enrollments, totalStudents, papersByStatus] = await Promise.all([
      prisma.attendanceRecord.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.watchEvent.findMany({ select: { watchedSec: true, totalSec: true, completed: true } }),
      prisma.lecture.count(),
      prisma.enrollment.count(),
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.researchPaper.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const totalAttendance = attendance.reduce((s, x) => s + x._count._all, 0) || 1;
    const presentRate = ((attendance.find((a) => a.status === 'PRESENT')?._count._all ?? 0) / totalAttendance) * 100;
    const lateRate = ((attendance.find((a) => a.status === 'LATE')?._count._all ?? 0) / totalAttendance) * 100;
    const absentRate = ((attendance.find((a) => a.status === 'ABSENT')?._count._all ?? 0) / totalAttendance) * 100;

    const totalWatched = watchEvents.reduce((s, w) => s + w.watchedSec, 0);
    const totalDuration = watchEvents.reduce((s, w) => s + w.totalSec, 0) || 1;
    const completionRate = (totalWatched / totalDuration) * 100;
    const completedLectures = watchEvents.filter((w) => w.completed).length;

    res.json({
      data: {
        attendance: { presentRate, lateRate, absentRate, total: totalAttendance },
        videos: {
          totalLectures: lectures,
          totalEvents: watchEvents.length,
          completionRate,
          completedLectures,
        },
        enrollments,
        totalStudents,
        papersByStatus: Object.fromEntries(papersByStatus.map((p) => [p.status, p._count._all])),
        // Mock weekly active-users curve — deterministic.
        weeklyActive: [620, 740, 580, 890, 740, 480, 820],
      },
    });
  } catch (e) { next(e); }
});

router.get('/quality/curriculum', requireRole(Role.QUALITY, Role.ADMIN), async (_req, res, next) => {
  try {
    const faculties = await prisma.faculty.findMany({
      include: {
        departments: {
          include: {
            courses: {
              include: {
                offerings: {
                  include: {
                    _count: {
                      select: { lectures: true, materials: true, assignments: true, enrollments: true },
                    },
                  },
                },
                _count: { select: { offerings: true, concepts: true } },
              },
            },
          },
        },
      },
    });
    res.json({ data: faculties });
  } catch (e) { next(e); }
});

export default router;
