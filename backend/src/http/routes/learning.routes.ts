import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma, withRetry } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { extractPaperText } from '../../lib/pdf.js';
import { assertOwnsResearchPaper } from '../../lib/permissions.js';
import { requireCapability } from '../middleware/requireCapability.js';

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
    const lectureId = req.params.id!;
    const studentId = req.user!.id;

    // Read the previous state so we know if this call transitions
    // the watch event from "not completed" → "completed".
    const prior = await prisma.watchEvent.findUnique({
      where: { lectureId_studentId: { lectureId, studentId } },
      select: { completed: true },
    });

    const ev = await prisma.watchEvent.upsert({
      where: { lectureId_studentId: { lectureId, studentId } },
      create: {
        lectureId,
        studentId,
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

    // Smart auto-attendance: when a recorded lecture transitions into
    // "fully watched" for the first time, register the student as PRESENT
    // on that day's attendance session for the offering. Spec calls this
    // out: "هل شاهد الطالب الدرس بالكامل" feeds the attendance signal.
    if (req.user!.role === Role.STUDENT && completed === true && !prior?.completed) {
      const lecture = await prisma.lecture.findUnique({
        where: { id: lectureId },
        select: { offeringId: true },
      });
      if (lecture) {
        // Bucket attendance by calendar day.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const session = await prisma.attendanceSession.upsert({
          where: { offeringId_date: { offeringId: lecture.offeringId, date: today } },
          create: { offeringId: lecture.offeringId, date: today, topic: 'حضور افتراضي تلقائي' },
          update: {},
        });
        await prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId } },
          create: { sessionId: session.id, studentId, status: 'PRESENT', notes: 'تم تسجيله تلقائياً بعد إكمال مشاهدة المحاضرة المسجّلة' },
          update: {}, // don't overwrite if a teacher has already marked something
        });
      }
    }

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
router.get('/me/profile', async (req, res, next) => {
  try {
    const user = await withRetry(() => prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        studentProfile: {
          include: {
            faculty: { select: { id: true, name: true, nameEn: true } },
            department: { select: { id: true, name: true, nameEn: true } },
          },
        },
        teacherProfile: {
          include: {
            department: { include: { faculty: { select: { name: true } } } },
          },
        },
      },
    }));
    if (!user) throw AppError.notFound();
    res.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarColor: user.avatarColor,
        avatarInitials: user.avatarInitials,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        student: user.studentProfile
          ? {
              universityId: user.studentProfile.universityId,
              year: user.studentProfile.year,
              gpa: Number(user.studentProfile.gpa ?? 0),
              totalXp: user.studentProfile.totalXp,
              level: user.studentProfile.level,
              faculty: user.studentProfile.faculty,
              department: user.studentProfile.department,
            }
          : null,
        teacher: user.teacherProfile
          ? {
              specialty: user.teacherProfile.specialty,
              rank: user.teacherProfile.rank,
              department: user.teacherProfile.department
                ? {
                    name: user.teacherProfile.department.name,
                    facultyName: user.teacherProfile.department.faculty?.name,
                  }
                : null,
            }
          : null,
      },
    });
  } catch (e) { next(e); }
});

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
  // Accept either an absolute URL or a path under our /api/v1/files/papers/ namespace.
  fileUrl: z.string()
    .max(500)
    .refine(
      (s) => /^https?:\/\//i.test(s) || s.startsWith('/api/v1/files/papers/'),
      { message: 'fileUrl must be a full URL or a /api/v1/files/papers/<filename>.pdf path' },
    )
    .optional(),
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
    // Students may only scan their own papers.
    if (req.user!.role === Role.STUDENT && paper.studentId !== req.user!.id) {
      throw AppError.forbidden();
    }
    if (req.user!.role !== Role.STUDENT && req.user!.role !== Role.TEACHER && req.user!.role !== Role.ADMIN) {
      throw AppError.forbidden();
    }
    // Refuse to re-scan papers already graded or published.
    if (paper.status === 'GRADED' || paper.status === 'PUBLISHED') {
      throw AppError.conflict('Cannot rescan a graded paper');
    }
    // Deterministic-looking results derived from id hash.
    const seed = paper.id.charCodeAt(0) + paper.id.charCodeAt(2);
    const plagiarismPct = Number((((seed * 7) % 18) + 3).toFixed(1)); // 3 - 21
    const aiContentPct = Number((((seed * 11) % 22) + 4).toFixed(1)); // 4 - 26
    const passed = plagiarismPct < 15 && aiContentPct < 25;

    // Best-effort full-text extraction so the paper becomes searchable
    // in the library archive after scanning. Local files only (those
    // served by /api/v1/files/papers/...).
    const extractedText = await extractPaperText(paper.fileUrl);

    const updated = await prisma.researchPaper.update({
      where: { id },
      data: {
        status: passed ? 'CHECKS_PASSED' : 'CHECKS_FAILED',
        plagiarismPct,
        aiContentPct,
        scannedAt: new Date(),
        ...(extractedText ? { extractedText } : {}),
      },
    });
    res.json({ data: decToNum(updated) });
  } catch (e) { next(e); }
});

const gradePaperSchema = z.object({
  grade: z.number().min(0).max(20),
  feedback: z.string().max(4000).optional(),
}).strict();

router.post('/research/:id/grade', requireCapability('RESEARCH_GRADE_OWN', 'RESEARCH_GRADE_ANY'), validate(gradePaperSchema), async (req, res, next) => {
  try {
    const id = req.params.id!;
    // Per-row ownership: teacher must own the offering the paper belongs to,
    // unless they hold RESEARCH_GRADE_ANY.
    await assertOwnsResearchPaper(id, req.user!.id, req.user!.role);
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
router.get('/research/queue', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (_req, res, next) => {
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
router.post('/research/:id/publish', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
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

// Public archive of published student papers — surfaces them in the library.
router.get('/research/published', async (_req, res, next) => {
  try {
    const data = await withRetry(() => prisma.researchPaper.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 60,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true },
        },
        offering: { include: { course: { select: { name: true, code: true } } } },
      },
    }));
    res.json({ data: decToNum(data) });
  } catch (e) { next(e); }
});

// ─── Cross-document search across published papers ──────────
// Searches title + abstract + extractedText (when available) and returns
// papers ranked by where the match occurred (title > abstract > body).
// For each match a contextual snippet is generated with the search term
// surrounded by `<mark>…</mark>` for the UI to render highlighted.
const SNIPPET_RADIUS = 80; // chars of context on each side of the first hit

function buildSnippet(text: string, q: string): string | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(text.length, idx + q.length + SNIPPET_RADIUS);
  const before = start === 0 ? '' : '…';
  const after = end === text.length ? '' : '…';
  const slice = text.slice(start, end);
  // Highlight ALL occurrences in the slice (not just the first one).
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const highlighted = slice.replace(re, (m) => `<mark>${m}</mark>`);
  return `${before}${highlighted}${after}`;
}

router.get('/research/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ data: [], meta: { query: '', total: 0 } });
      return;
    }
    if (q.length < 2) {
      res.json({ data: [], meta: { query: q, total: 0, error: 'too_short' } });
      return;
    }

    // ILIKE on three fields is sufficient at our demo scale and works for
    // both Arabic and English. Tsvector/GIN can be layered on top later
    // if the dataset grows.
    const papers = await withRetry(() => prisma.researchPaper.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title:         { contains: q, mode: 'insensitive' } },
          { abstract:      { contains: q, mode: 'insensitive' } },
          { extractedText: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true },
        },
        offering: { include: { course: { select: { name: true, code: true } } } },
      },
    }));

    type Match = 'title' | 'abstract' | 'body';
    const results = papers.map((p) => {
      let matchedIn: Match = 'body';
      let snippet: string | null = null;
      if (p.title.toLowerCase().includes(q.toLowerCase())) {
        matchedIn = 'title';
        snippet = buildSnippet(p.title, q);
      } else if (p.abstract && p.abstract.toLowerCase().includes(q.toLowerCase())) {
        matchedIn = 'abstract';
        snippet = buildSnippet(p.abstract, q);
      } else if (p.extractedText) {
        matchedIn = 'body';
        snippet = buildSnippet(p.extractedText, q);
      }

      const rank = matchedIn === 'title' ? 3 : matchedIn === 'abstract' ? 2 : 1;
      return { paper: p, matchedIn, snippet, rank };
    });

    // Sort by rank (title first), then publishedAt desc.
    results.sort((a, b) => {
      if (a.rank !== b.rank) return b.rank - a.rank;
      const aDate = a.paper.publishedAt?.getTime() ?? 0;
      const bDate = b.paper.publishedAt?.getTime() ?? 0;
      return bDate - aDate;
    });

    const data = results.map((r) => ({
      ...decToNum(r.paper),
      matchedIn: r.matchedIn,
      snippet: r.snippet,
    }));

    res.json({ data, meta: { query: q, total: data.length } });
  } catch (e) { next(e); }
});

// ─── Paper annotations ────────────────────────────────────────
// Permission model:
//   - GET: paper student, paper reviewer, ADMIN, QUALITY can read
//   - POST: only TEACHER (must be paper reviewer) or ADMIN can write
//   - DELETE: only the annotation author or ADMIN

const annotationCreateSchema = z.object({
  page: z.number().int().min(1).max(2000),
  comment: z.string().min(1).max(2000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).strict();

router.get('/research/:id/annotations', async (req, res, next) => {
  try {
    const paper = await prisma.researchPaper.findUnique({
      where: { id: req.params.id! },
      select: { studentId: true, reviewerId: true },
    });
    if (!paper) throw AppError.notFound();
    const role = req.user!.role;
    const uid = req.user!.id;
    const allowed =
      role === Role.ADMIN ||
      role === Role.QUALITY ||
      paper.studentId === uid ||
      paper.reviewerId === uid;
    if (!allowed) throw AppError.forbidden('Not allowed to view annotations on this paper');

    const data = await prisma.paperAnnotation.findMany({
      where: { paperId: req.params.id! },
      orderBy: [{ page: 'asc' }, { createdAt: 'asc' }],
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true, avatarColor: true, avatarInitials: true } },
      },
    });
    res.json({ data });
  } catch (e) { next(e); }
});

router.post('/research/:id/annotations', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), validate(annotationCreateSchema), async (req, res, next) => {
  try {
    const paper = await prisma.researchPaper.findUnique({
      where: { id: req.params.id! },
      select: { id: true, reviewerId: true },
    });
    if (!paper) throw AppError.notFound();
    if (req.user!.role === Role.TEACHER && paper.reviewerId !== req.user!.id) {
      throw AppError.forbidden('Only the assigned reviewer can annotate this paper');
    }

    const created = await prisma.paperAnnotation.create({
      data: {
        paperId: paper.id,
        authorId: req.user!.id,
        page: req.body.page,
        comment: req.body.comment,
        color: req.body.color ?? null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true, avatarColor: true, avatarInitials: true } },
      },
    });
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

router.delete('/research/annotations/:id', async (req, res, next) => {
  try {
    const note = await prisma.paperAnnotation.findUnique({ where: { id: req.params.id! } });
    if (!note) throw AppError.notFound();
    if (note.authorId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      throw AppError.forbidden('You can only delete your own annotations');
    }
    await prisma.paperAnnotation.delete({ where: { id: note.id } });
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
// Quality oversight (read-only views of institutional health)
// ════════════════════════════════════════════════════════════════

/**
 * Quality alerts — derived from real signals in the database. No persisted
 * "alert" rows; this endpoint computes a fresh list each call from:
 *   · low attendance over the last 30 days (offering / class level)
 *   · high-plagiarism papers awaiting review
 *   · stale offerings (≥21 days since last upload)
 */
router.get('/quality/alerts', requireCapability('QUALITY_VIEW'), async (_req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

    type Alert = {
      id: string;
      severity: 'critical' | 'warning' | 'info';
      category: 'attendance' | 'plagiarism' | 'content';
      title: string;
      description: string;
      occurredAt: Date;
    };
    const alerts: Alert[] = [];

    // Low-attendance offerings (last 30d)
    const recentSessions = await prisma.attendanceSession.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      select: {
        offeringId: true,
        offering: { select: { course: { select: { name: true, code: true } } } },
        records: { select: { status: true } },
      },
    });
    const byOffering = new Map<string, { courseName: string; courseCode: string; total: number; absent: number }>();
    for (const s of recentSessions) {
      const cur = byOffering.get(s.offeringId) ?? {
        courseName: s.offering.course.name,
        courseCode: s.offering.course.code,
        total: 0, absent: 0,
      };
      for (const r of s.records) {
        cur.total += 1;
        if (r.status === 'ABSENT') cur.absent += 1;
      }
      byOffering.set(s.offeringId, cur);
    }
    for (const [oid, row] of byOffering) {
      if (row.total < 5) continue;
      const rate = row.absent / row.total;
      if (rate >= 0.25) {
        alerts.push({
          id: `att-${oid}`,
          severity: rate >= 0.4 ? 'critical' : 'warning',
          category: 'attendance',
          title: `غياب جماعيّ بنسبة ${Math.round(rate * 100)}٪`,
          description: `${row.courseName} (${row.courseCode}) — ${row.absent} غياب من ${row.total} جلسة آخر 30 يوماً`,
          occurredAt: now,
        });
      }
    }

    // High-plagiarism research papers
    const flaggedPapers = await prisma.researchPaper.findMany({
      where: {
        status: { in: ['CHECKS_PASSED', 'CHECKS_FAILED'] },
        plagiarismPct: { gte: 25 },
      },
      orderBy: { uploadedAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, plagiarismPct: true, uploadedAt: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });
    for (const p of flaggedPapers) {
      const pct = Number(p.plagiarismPct?.toString() ?? '0');
      alerts.push({
        id: `plag-${p.id}`,
        severity: pct >= 40 ? 'critical' : 'warning',
        category: 'plagiarism',
        title: `بحث برسبة انتحال ${pct.toFixed(1)}٪`,
        description: `«${p.title}» — ${p.student.firstName} ${p.student.lastName}`,
        occurredAt: p.uploadedAt,
      });
    }

    // Stale offerings — no material uploaded in 21+ days but has at least one
    const stale = await prisma.courseOffering.findMany({
      where: { materials: { none: { createdAt: { gte: twentyOneDaysAgo } } } },
      select: {
        id: true,
        course: { select: { name: true, code: true } },
        teacher: { select: { firstName: true, lastName: true } },
        _count: { select: { materials: true } },
      },
      take: 10,
    });
    for (const o of stale) {
      if (o._count.materials === 0) continue;
      alerts.push({
        id: `stale-${o.id}`,
        severity: 'info',
        category: 'content',
        title: `لم تُرفع مواد جديدة منذ 21 يوماً`,
        description: `${o.course.name} (${o.course.code}) — ${o.teacher?.firstName ?? ''} ${o.teacher?.lastName ?? ''}`.trim(),
        occurredAt: now,
      });
    }

    alerts.sort((a, b) => {
      const sev = (s: Alert['severity']) => (s === 'critical' ? 0 : s === 'warning' ? 1 : 2);
      return sev(a.severity) - sev(b.severity) || b.occurredAt.getTime() - a.occurredAt.getTime();
    });

    res.json({
      data: {
        alerts: alerts.slice(0, 20),
        counts: {
          critical: alerts.filter((a) => a.severity === 'critical').length,
          warning: alerts.filter((a) => a.severity === 'warning').length,
          info: alerts.filter((a) => a.severity === 'info').length,
          total: alerts.length,
        },
      },
    });
  } catch (e) { next(e); }
});

router.get('/quality/overview', requireCapability('QUALITY_VIEW'), async (_req, res, next) => {
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

router.get('/quality/courses', requireCapability('QUALITY_VIEW'), async (_req, res, next) => {
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

router.get('/quality/professors', requireCapability('QUALITY_VIEW'), async (_req, res, next) => {
  try {
    const teachers = await withRetry(() => prisma.user.findMany({
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
    }));

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

router.get('/quality/engagement', requireCapability('QUALITY_VIEW'), async (_req, res, next) => {
  try {
    const [attendance, watchEvents, lectures, enrollments, totalStudents, papersByStatus, weeklyActiveEvents] = await withRetry(() => Promise.all([
      prisma.attendanceRecord.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.watchEvent.findMany({ select: { watchedSec: true, totalSec: true, completed: true } }),
      prisma.lecture.count(),
      prisma.enrollment.count(),
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.researchPaper.groupBy({ by: ['status'], _count: { _all: true } }),
      // Distinct (student, day) pairs in the last 7 days for the weekly-active curve.
      prisma.watchEvent.findMany({
        where: { lastSeenAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { studentId: true, lastSeenAt: true },
      }),
    ]));

    const totalAttendance = attendance.reduce((s, x) => s + x._count._all, 0) || 1;
    const presentRate = ((attendance.find((a) => a.status === 'PRESENT')?._count._all ?? 0) / totalAttendance) * 100;
    const lateRate = ((attendance.find((a) => a.status === 'LATE')?._count._all ?? 0) / totalAttendance) * 100;
    const absentRate = ((attendance.find((a) => a.status === 'ABSENT')?._count._all ?? 0) / totalAttendance) * 100;

    const totalWatched = watchEvents.reduce((s, w) => s + w.watchedSec, 0);
    const totalDuration = watchEvents.reduce((s, w) => s + w.totalSec, 0) || 1;
    const completionRate = (totalWatched / totalDuration) * 100;
    const completedLectures = watchEvents.filter((w) => w.completed).length;

    // Weekly active: count unique students per day for the last 7 days.
    // Falls back to a deterministic pseudo-curve when there's not enough data.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeklyActive: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const studentSet = new Set<string>();
      for (const e of weeklyActiveEvents) {
        if (e.lastSeenAt >= dayStart && e.lastSeenAt < dayEnd) studentSet.add(e.studentId);
      }
      // Scale up against total student population so the curve is meaningful
      // even with limited demo data.
      const sample = studentSet.size;
      const projected = sample > 0
        ? Math.round(sample * Math.max(1, Math.floor(totalStudents / Math.max(1, weeklyActiveEvents.length))))
        : Math.round(totalStudents * (0.45 + 0.4 * Math.sin((6 - i) * 0.9)));
      weeklyActive.push(Math.max(0, Math.min(totalStudents, projected)));
    }

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
        weeklyActive,
      },
    });
  } catch (e) { next(e); }
});

router.get('/quality/curriculum', requireCapability('QUALITY_VIEW'), async (_req, res, next) => {
  try {
    const faculties = await withRetry(() => prisma.faculty.findMany({
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
    }));
    res.json({ data: faculties });
  } catch (e) { next(e); }
});

export default router;
