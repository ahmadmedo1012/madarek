import { Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma, withRetry } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { utcDayStart } from '../../lib/dates.js';
import { extractPaperText } from '../../lib/pdf.js';
import { assertOwnsResearchPaper, assertOfferingAccess } from '../../lib/permissions.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.use(authMiddleware);

/**
 * Helper — convert Decimal columns to Numbers for JSON.
 * Exported for unit tests (pure logic, no DB). Prisma Decimals always
 * expose toNumber() in-process; there is deliberately no serialized-shape
 * fallback because these handlers only ever see live Prisma rows.
 */
export function decToNum<T>(o: T): T {
  if (o === null || o === undefined) return o;
  if (typeof o === 'object') {
    // Pass-through for native types we shouldn't traverse.
    if (o instanceof Date) return o;
    if (Array.isArray(o)) return o.map(decToNum) as never;
    // Prisma Decimal exposes toNumber() — convert to plain number.
    const obj = o as unknown as { toNumber?: () => number };
    if (typeof obj.toNumber === 'function') {
      return obj.toNumber() as never;
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
    await assertOfferingAccess(id, req.user!.id, req.user!.role);
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
    await assertOfferingAccess(offeringId, req.user!.id, req.user!.role);
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
    // Single fetch: the full lecture row already carries offeringId, so
    // the access gate below reads it off the result instead of paying
    // for a separate stub lookup first. Without the gate any
    // authenticated user could read any lecture's content.
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
    // Offering-level access gate before any lecture content is returned.
    await assertOfferingAccess(lec.offeringId, req.user!.id, req.user!.role);
    res.json({ data: lec });
  } catch (e) { next(e); }
});

export const watchSchema = z.object({
  watchedSec: z.number().int().nonnegative(),
  totalSec: z.number().int().nonnegative(),
  completed: z.boolean().optional(),
}).strict();

/**
 * Server-side completion rule for recorded-lecture watching (decision D9):
 * a client `completed:true` claim is only accepted when the reported
 * progress covers at least 90% of the effective video length —
 * min(client totalSec, lecture durationSec) — and both clock values are
 * positive. The 90% test uses integer cross-multiplication so the exact
 * boundary (e.g. 900 of 1000 seconds) is never lost to float rounding.
 * Exported for unit tests.
 */
export function watchProgressCompletes(watchedSec: number, totalSec: number, durationSec: number): boolean {
  if (totalSec <= 0 || durationSec <= 0) return false;
  const effectiveLength = Math.min(totalSec, durationSec);
  return watchedSec * 10 >= effectiveLength * 9;
}

/**
 * High-water clamp for watch progress: stored watchedSec must never
 * rewind (a client bug or clock skew must not erase progress), and a
 * single tick can never claim more than the reported video length (so
 * aggregate engagement ratios can't be inflated past 100%). Exported
 * for unit tests.
 */
export function clampWatchedSec(priorWatchedSec: number | undefined, incomingSec: number, totalSec: number): number {
  const bounded = totalSec > 0 ? Math.min(incomingSec, totalSec) : incomingSec;
  return Math.max(priorWatchedSec ?? 0, bounded);
}

router.post('/lectures/:id/watch', validate(watchSchema), async (req, res, next) => {
  try {
    const { watchedSec, totalSec, completed } = req.body as z.infer<typeof watchSchema>;
    const lectureId = req.params.id!;
    const studentId = req.user!.id;

    // Enrollment check: students may only record watch progress for
    // lectures in offerings they are enrolled in. Teachers/admins/
    // quality can preview but should still be the offering's teacher
    // (or have oversight) — we run assertOfferingAccess so the auth
    // path is uniform. Without this guard any authenticated user
    // could fake attendance signals for any lecture.
    const lectureStub = await prisma.lecture.findUnique({
      where: { id: lectureId },
      // durationSec feeds the server-side completion rule (D9).
      select: { offeringId: true, durationSec: true },
    });
    if (!lectureStub) throw AppError.notFound();
    await assertOfferingAccess(lectureStub.offeringId, studentId, req.user!.role);

    // One transaction for the whole flow — prior-state read, high-water
    // clamp, watch-event upsert and both attendance upserts — so the
    // writes are atomic (no "completed but no attendance row" states).
    // Concurrent posts are serialized per lecture via a row lock (the
    // same pattern enrollments.routes uses for seat capacity); without
    // it two racing ticks could read the same prior row and the later
    // commit would rewind watchedSec.
    const ev = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Lecture" WHERE id = ${lectureId} FOR UPDATE`;
      const prior = await tx.watchEvent.findUnique({
        where: { lectureId_studentId: { lectureId, studentId } },
        select: { completed: true, watchedSec: true },
      });
      const effectiveWatchedSec = clampWatchedSec(prior?.watchedSec, watchedSec, totalSec);
      // The server — never the client — decides completion (D9).
      const earnedCompletion =
        completed === true &&
        watchProgressCompletes(effectiveWatchedSec, totalSec, lectureStub.durationSec);
      // Completion is monotonic: once true it stays true — a client
      // sending completed:false can't un-complete a lecture.
      const nextCompleted = (prior?.completed ?? false) || earnedCompletion;

      const saved = await tx.watchEvent.upsert({
        where: { lectureId_studentId: { lectureId, studentId } },
        create: {
          lectureId,
          studentId,
          watchedSec: effectiveWatchedSec,
          totalSec,
          completed: nextCompleted,
        },
        update: {
          watchedSec: effectiveWatchedSec,
          totalSec,
          completed: nextCompleted,
          lastSeenAt: new Date(),
        },
      });

      // Smart auto-attendance: when a recorded lecture transitions into
      // "fully watched" for the first time, register the student as PRESENT
      // on that day's attendance session for the offering. Spec calls this
      // out: "هل شاهد الطالب الدرس بالكامل" feeds the attendance signal.
      // The transition condition keeps it idempotent — re-posting a
      // completed lecture never fires it twice.
      if (req.user!.role === Role.STUDENT && nextCompleted && !prior?.completed) {
        // lectureStub already carries offeringId — no second lookup needed.
        // Bucket attendance by calendar day. The day-key lives on the UTC
        // data calendar (lib/dates.ts, audit 15-h P1-1): the FE roll-call
        // sends UTC-midnight dates and the seed writes utcDayStart too, so
        // the @@unique(offeringId, date) constraint can never split one
        // calendar day into two sessions on a non-UTC machine. On the UTC
        // deployment this is byte-identical to the old setHours(0,0,0,0)
        // computation — the implicit assumption is now explicit + tested.
        const today = utcDayStart(new Date());
        const session = await tx.attendanceSession.upsert({
          where: { offeringId_date: { offeringId: lectureStub.offeringId, date: today } },
          create: { offeringId: lectureStub.offeringId, date: today, topic: 'حضور افتراضي تلقائي' },
          update: {},
        });
        await tx.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId } },
          create: { sessionId: session.id, studentId, status: 'PRESENT', notes: 'تم تسجيله تلقائياً بعد إكمال مشاهدة المحاضرة المسجّلة' },
          update: {}, // don't overwrite if a teacher has already marked something
        });
      }

      return saved;
    });

    res.json({ data: ev });
  } catch (e) { next(e); }
});

// answerIndex's upper bound is the checkpoint's actual options length,
// checked in the handler after the checkpoint is loaded (zod can't know it).
const answerSchema = z.object({ answerIndex: z.number().int().min(0) }).strict();

router.post('/lectures/:lid/checkpoints/:cid/answer', validate(answerSchema), async (req, res, next) => {
  try {
    const cp = await prisma.lectureCheckpoint.findUnique({
      where: { id: req.params.cid! },
      include: { lecture: { select: { offeringId: true } } },
    });
    if (!cp) throw AppError.notFound();
    // Enrollment check: same guard as the watch endpoint. Without
    // this, any student could inflate their StudentMastery for
    // concepts in courses they aren't enrolled in.
    await assertOfferingAccess(cp.lecture.offeringId, req.user!.id, req.user!.role);
    // Validate the answer against THIS checkpoint's options length —
    // a hardcoded .max(10) accepted indices that point past the options.
    const optionCount = Array.isArray(cp.options) ? cp.options.length : 0;
    const answerIndex = (req.body as z.infer<typeof answerSchema>).answerIndex;
    if (answerIndex >= optionCount) {
      throw AppError.badRequest('رقم الإجابة المرسل غير صالح لهذا السؤال التفاعلي');
    }
    const correct = cp.correctIndex === answerIndex;

    // Update student mastery if checkpoint is concept-tagged.
    if (cp.conceptId && req.user!.role === Role.STUDENT) {
      // Atomic increment (upsert with {increment}) instead of the old
      // read-modify-write, which lost concurrent answers on the same
      // concept. level is then recomputed from the post-increment row.
      await prisma.studentMastery.upsert({
        where: { studentId_conceptId: { studentId: req.user!.id, conceptId: cp.conceptId } },
        create: {
          studentId: req.user!.id,
          conceptId: cp.conceptId,
          level: correct ? 1 : 0,
          attempts: 1,
          correct: correct ? 1 : 0,
        },
        update: {
          attempts: { increment: 1 },
          correct: { increment: correct ? 1 : 0 },
          lastUpdatedAt: new Date(),
        },
      });
      // NOTE: the level recompute below is deliberately a read-modify-write.
      // The increment above is atomic; the ratio recompute can interleave
      // with a concurrent answer and briefly store a stale ratio, but the
      // next answer always converges — cosmetic staleness only, not worth
      // a row lock on this hot path.
      const fresh = await prisma.studentMastery.findUnique({
        where: { studentId_conceptId: { studentId: req.user!.id, conceptId: cp.conceptId } },
        select: { attempts: true, correct: true },
      });
      if (fresh && fresh.attempts > 0) {
        await prisma.studentMastery.update({
          where: { studentId_conceptId: { studentId: req.user!.id, conceptId: cp.conceptId } },
          data: { level: Math.max(0, Math.min(1, fresh.correct / fresh.attempts)) },
        });
      }
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
      // Active enrollments only — mirrors the platform-wide convention
      // (a non-active enrollment must not surface course content).
      where: { studentId: req.user!.id, status: 'active' },
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
    // Get all concepts across the student's actively enrolled courses, with mastery if any.
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id, status: 'active' },
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
      // Bounded read — the weakest 50 concepts are plenty for the
      // "learning gaps" surface.
      take: 50,
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
      // Explicit select: NEVER ship extractedText (full PDF text — huge).
      select: {
        id: true, studentId: true, reviewerId: true, offeringId: true,
        title: true, abstract: true, fileUrl: true, status: true,
        plagiarismPct: true, aiContentPct: true, grade: true, feedback: true,
        uploadedAt: true, scannedAt: true, gradedAt: true, publishedAt: true,
        student: { select: { id: true, firstName: true, lastName: true, avatarInitials: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        offering: { include: { course: { select: { name: true, code: true } } } },
      },
      orderBy: { uploadedAt: 'desc' },
      // Non-students see the institutional archive — bound it.
      ...(req.user!.role === Role.STUDENT ? {} : { take: 50 }),
    });
    res.json({ data: decToNum(data) });
  } catch (e) { next(e); }
});

const createPaperSchema = z.object({
  title: z.string().trim().min(3).max(280),
  abstract: z.string().trim().max(4000).optional(),
  offeringId: z.string().cuid().optional(),
  // Accept either an absolute URL or a path under our /api/v1/files/papers/ namespace.
  fileUrl: z.string()
    .trim()
    .max(500)
    .refine(
      (s) => /^https?:\/\//i.test(s) || s.startsWith('/api/v1/files/papers/'),
      { message: 'fileUrl must be a full URL or a /api/v1/files/papers/<filename>.pdf path' },
    )
    .optional(),
}).strict();

/**
 * Double-submit guard for paper uploads (audit 15-b P2-5): an identical
 * (student, title, fileUrl) upload inside this window 409s instead of
 * stacking a permanent duplicate in the grader queue — research papers
 * have no delete route, so a duplicate sits there forever. Re-uploading
 * the same title with a different file (a legitimate revision) stays
 * allowed, as does re-submitting the same file after the window.
 * Exported for unit tests.
 */
export const RESEARCH_DEDUPE_WINDOW_MS = 5 * 60 * 1000;

/** The dedupe lookup for POST /me/research. Exported for unit tests. */
export function recentDuplicatePaperWhere(
  studentId: string,
  title: string,
  fileUrl: string | null,
  now: Date,
): Prisma.ResearchPaperWhereInput {
  return {
    studentId,
    title,
    // null (never undefined) so Prisma matches file-less rows (IS NULL);
    // an undefined value would silently drop the filter entirely.
    fileUrl,
    uploadedAt: { gte: new Date(now.getTime() - RESEARCH_DEDUPE_WINDOW_MS) },
  };
}

router.post('/me/research', validate(createPaperSchema), async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) throw AppError.forbidden();
    const body = req.body as z.infer<typeof createPaperSchema>;
    // If the paper is tied to an offering, the student must be actively
    // enrolled in it — otherwise any offering id could be attached to
    // fake course affiliation.
    if (body.offeringId) {
      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId: req.user!.id, offeringId: body.offeringId, status: 'active' },
        select: { id: true },
      });
      if (!enrolled) {
        throw new AppError('BAD_REQUEST', 'offeringId must be an offering you are enrolled in', 400);
      }
    }
    const created = await prisma.$transaction(async (tx) => {
      // Serialize per student (the watch-flow row-lock pattern): the FOR
      // UPDATE closes the double-submit TOCTOU — two racing POSTs can't
      // both pass the dedupe read, the loser blocks until the winner
      // commits and then sees the duplicate row (audit 15-b P2-5).
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${req.user!.id} FOR UPDATE`;
      const duplicate = await tx.researchPaper.findFirst({
        where: recentDuplicatePaperWhere(req.user!.id, body.title, body.fileUrl ?? null, new Date()),
        select: { id: true },
      });
      if (duplicate) {
        throw AppError.conflict('تم رفع هذه الورقة قبل قليل');
      }
      return tx.researchPaper.create({
        data: { ...body, studentId: req.user!.id, status: 'UPLOADED' },
      });
    });
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

// Simulated plagiarism + AI-content scan. Picks deterministic-feeling values.
// Rate-limited: every run parses a full PDF (extractPaperText) — the
// limiter keeps abuse and accidental client loops off the parser.

/**
 * Papers that may enter (or re-enter) the scan step. GRADED and PUBLISHED
 * are excluded — a graded or published paper must never be re-scanned.
 * The scan write is a conditional claim on this set (audit 15-b P1-3) so
 * a scan that finishes its seconds-long PDF extraction after a reviewer
 * graded/published the paper 409s instead of reverting the terminal
 * state. The never-written SCANNING value is excluded too: no code path
 * produces it, and a hypothetical mid-flight paper should not re-scan.
 * Exported for unit tests.
 */
export const SCANNABLE_PAPER_STATUSES = ['UPLOADED', 'CHECKS_PASSED', 'CHECKS_FAILED'] as const;

export function isPaperScannable(status: string): boolean {
  return (SCANNABLE_PAPER_STATUSES as readonly string[]).includes(status);
}

/**
 * Deterministic-feeling simulated scan results, derived from the paper id
 * hash (previously inline in the scan route; extracted for unit tests).
 * plagiarismPct lands in 3–20, aiContentPct in 4–25, both with at most one
 * decimal. Exported for unit tests.
 */
export function scanResultsFor(paperId: string): { plagiarismPct: number; aiContentPct: number; passed: boolean } {
  const seed = paperId.charCodeAt(0) + paperId.charCodeAt(2);
  const plagiarismPct = Number((((seed * 7) % 18) + 3).toFixed(1)); // 3 - 20
  const aiContentPct = Number((((seed * 11) % 22) + 4).toFixed(1)); // 4 - 25
  return { plagiarismPct, aiContentPct, passed: plagiarismPct < 15 && aiContentPct < 25 };
}

router.post('/research/:id/scan', createRouteLimiter({ max: 10 }), async (req, res, next) => {
  try {
    const id = req.params.id!;
    const paper = await prisma.researchPaper.findUnique({
      where: { id },
      // Narrow select — the scan needs the identity/ownership/status/file
      // fields only; never hydrate the potentially-megabyte extractedText
      // column for a precondition check.
      select: { id: true, studentId: true, fileUrl: true, status: true },
    });
    if (!paper) throw AppError.notFound();
    // Students may only scan their own papers.
    if (req.user!.role === Role.STUDENT) {
      if (paper.studentId !== req.user!.id) throw AppError.forbidden();
    } else if (req.user!.role === Role.TEACHER) {
      // Teachers may only scan papers tied to offerings they teach — the
      // same per-row ownership rule the grade and publish steps enforce.
      await assertOwnsResearchPaper(id, req.user!.id, req.user!.role);
    } else if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.OWNER) {
      throw AppError.forbidden();
    }
    // Refuse to re-scan papers already graded or published (fast path —
    // the conditional claim below is the race-safe backstop).
    if (!isPaperScannable(paper.status)) {
      throw AppError.conflict('لا يمكن إعادة فحص ورقة مصحّحة');
    }
    const { plagiarismPct, aiContentPct, passed } = scanResultsFor(paper.id);

    // Best-effort full-text extraction so the paper becomes searchable
    // in the library archive after scanning. Local files only (those
    // served by /api/v1/files/papers/...).
    const extractedText = await extractPaperText(paper.fileUrl);

    // Conditional claim (audit 15-b P1-3): the scan result only lands
    // while the paper is still in a scannable status. If a reviewer
    // graded and/or published the paper during the seconds-long
    // extraction above, the claim matches zero rows and this request
    // 409s — the PUBLISHED paper stays published. The old unconditional
    // update silently reverted it to CHECKS_* while publishedAt stayed
    // set, vanishing the paper from the public archive.
    const claim = await prisma.researchPaper.updateMany({
      where: { id, status: { in: [...SCANNABLE_PAPER_STATUSES] } },
      data: {
        status: passed ? 'CHECKS_PASSED' : 'CHECKS_FAILED',
        plagiarismPct,
        aiContentPct,
        scannedAt: new Date(),
        ...(extractedText ? { extractedText } : {}),
      },
    });
    if (claim.count === 0) throw AppError.conflict('لا يمكن إعادة فحص ورقة مصحّحة');
    // updateMany returns only a count — read the row back so the response
    // keeps the exact shape the unconditional update used to return.
    const updated = await prisma.researchPaper.findUnique({ where: { id } });
    if (!updated) throw AppError.notFound();
    res.json({ data: decToNum(updated) });
  } catch (e) { next(e); }
});

export const gradePaperSchema = z.object({
  grade: z.number().min(0).max(20),
  feedback: z.string().trim().max(4000).optional(),
}).strict();

/**
 * Papers are gradeable only after the scan step has run (checks passed
 * OR failed — a failed scan can still be graded, e.g. a low grade with
 * feedback), and re-grading is allowed until the paper is published.
 * This keeps the pipeline UPLOADED → scan → grade → publish from being
 * skipped at the grade step. The grade write is a conditional claim on
 * this set (audit 15-b P1-3). Exported for unit tests.
 */
export const GRADEABLE_PAPER_STATUSES = ['CHECKS_PASSED', 'CHECKS_FAILED', 'GRADED'] as const;

export function isPaperGradeable(status: string): boolean {
  return (GRADEABLE_PAPER_STATUSES as readonly string[]).includes(status);
}

router.post('/research/:id/grade', requireCapability('RESEARCH_GRADE_OWN', 'RESEARCH_GRADE_ANY'), validate(gradePaperSchema), async (req, res, next) => {
  try {
    const id = req.params.id!;
    // Per-row ownership: teacher must own the offering the paper belongs to,
    // unless they hold RESEARCH_GRADE_ANY.
    await assertOwnsResearchPaper(id, req.user!.id, req.user!.role);
    // Status precondition (fast path): the scan step cannot be skipped,
    // and a published paper is final.
    const paper = await prisma.researchPaper.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!paper) throw AppError.notFound();
    if (!isPaperGradeable(paper.status)) {
      throw AppError.conflict(
        paper.status === 'PUBLISHED'
          ? 'لا يمكن إعادة تصحيح ورقة منشورة'
          : 'يجب فحص الورقة قبل تصحيحها',
      );
    }
    // Conditional claim (audit 15-b P1-3): the grade only lands while the
    // paper is still in a gradeable status. If a concurrent publish
    // committed between the read above and this write, the claim matches
    // zero rows and this request 409s — instead of the old unconditional
    // update flipping PUBLISHED back to GRADED, silently un-publishing a
    // live archive paper.
    const claim = await prisma.researchPaper.updateMany({
      where: { id, status: { in: [...GRADEABLE_PAPER_STATUSES] } },
      data: {
        grade: req.body.grade,
        feedback: req.body.feedback,
        reviewerId: req.user!.id,
        status: 'GRADED',
        gradedAt: new Date(),
      },
    });
    // The only reachable claim failure (the fast-path read passed) is a
    // concurrent publish → PUBLISHED.
    if (claim.count === 0) throw AppError.conflict('لا يمكن إعادة تصحيح ورقة منشورة');
    // updateMany returns only a count — read the row back so the response
    // keeps the exact shape the unconditional update used to return.
    const updated = await prisma.researchPaper.findUnique({ where: { id } });
    if (!updated) throw AppError.notFound();
    res.json({ data: decToNum(updated) });
  } catch (e) { next(e); }
});

// Teacher / admin queue: papers passing checks, awaiting grade.
router.get('/research/queue', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const data = await prisma.researchPaper.findMany({
      // Scoped like the teacher dashboard feed: a TEACHER sees only
      // papers tied to offerings they teach; ADMIN/OWNER keep the
      // institution-wide oversight view.
      where: req.user!.role === Role.TEACHER
        ? { status: { in: ['CHECKS_PASSED', 'CHECKS_FAILED'] }, offering: { teacherId: req.user!.id } }
        : { status: { in: ['CHECKS_PASSED', 'CHECKS_FAILED'] } },
      // Explicit select: NEVER ship extractedText (full PDF text — huge).
      select: {
        id: true, studentId: true, reviewerId: true, offeringId: true,
        title: true, abstract: true, fileUrl: true, status: true,
        plagiarismPct: true, aiContentPct: true, grade: true, feedback: true,
        uploadedAt: true, scannedAt: true, gradedAt: true, publishedAt: true,
        student: {
          select: {
            // No email — graders need name + avatar, not student PII.
            id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true,
          },
        },
        offering: { include: { course: { select: { name: true, code: true } } } },
      },
      orderBy: { uploadedAt: 'desc' },
      take: 50,
    });
    res.json({ data: decToNum(data) });
  } catch (e) { next(e); }
});

/**
 * Only a GRADED paper may be published, and publishing is one-way: a
 * PUBLISHED paper is terminal. The publish write is a conditional claim
 * on this set (audit 15-b P1-3) so two racing publishes can't
 * double-write publishedAt. Exported for unit tests.
 */
export const PUBLISHABLE_PAPER_STATUSES = ['GRADED'] as const;

export function isPaperPublishable(status: string): boolean {
  return (PUBLISHABLE_PAPER_STATUSES as readonly string[]).includes(status);
}

// Publish a graded paper to the library.
router.post('/research/:id/publish', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const id = req.params.id!;
    // Per-row ownership check: a teacher may publish only papers tied to
    // offerings they teach. ADMIN/OWNER bypass via assertOwnsResearchPaper.
    await assertOwnsResearchPaper(id, req.user!.id, req.user!.role);
    // Fast-path precondition; the conditional claim below is the
    // race-safe backstop. Narrow select — status is all this handler
    // needs; never hydrate extractedText.
    const paper = await prisma.researchPaper.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!paper) throw AppError.notFound();
    if (!isPaperPublishable(paper.status)) throw AppError.conflict('يجب تصحيح الورقة قبل نشرها');
    // Conditional claim (audit 15-b P1-3): the publish only lands while
    // the paper is still GRADED — a paper that left GRADED between the
    // read and this write 409s instead of being leapfrogged into the
    // public archive, and a re-publish of a PUBLISHED paper can never
    // move publishedAt.
    const claim = await prisma.researchPaper.updateMany({
      where: { id, status: { in: [...PUBLISHABLE_PAPER_STATUSES] } },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    if (claim.count === 0) throw AppError.conflict('يجب تصحيح الورقة قبل نشرها');
    // updateMany returns only a count — read the row back so the response
    // keeps the exact shape the unconditional update used to return.
    const updated = await prisma.researchPaper.findUnique({ where: { id } });
    if (!updated) throw AppError.notFound();
    res.json({ data: decToNum(updated) });
  } catch (e) { next(e); }
});

// Public archive of published student papers — surfaces them in the library.
router.get('/research/published', async (_req, res, next) => {
  try {
    const data = await withRetry(() => prisma.researchPaper.findMany({
      where: { status: 'PUBLISHED' },
      // Explicit select: NEVER ship extractedText (full PDF text — huge).
      select: {
        id: true, studentId: true, reviewerId: true, offeringId: true,
        title: true, abstract: true, fileUrl: true, status: true,
        plagiarismPct: true, aiContentPct: true, grade: true, feedback: true,
        uploadedAt: true, scannedAt: true, gradedAt: true, publishedAt: true,
        student: {
          select: { id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true },
        },
        offering: { include: { course: { select: { name: true, code: true } } } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 60,
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

export function buildSnippet(text: string, q: string): string | null {
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
    // Cap the query at 120 chars — unbounded q flows straight into ILIKE
    // and into the highlight RegExp below.
    const q = String(req.query.q ?? '').trim().slice(0, 120);
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
    const where: Prisma.ResearchPaperWhereInput = {
      status: 'PUBLISHED',
      OR: [
        { title:         { contains: q, mode: 'insensitive' } },
        { abstract:      { contains: q, mode: 'insensitive' } },
        { extractedText: { contains: q, mode: 'insensitive' } },
      ],
    };
    // `total` is the true match count, not the page length — the result
    // list is capped at 50 rows but the meta must not lie about it.
    const [papers, total] = await withRetry(() => Promise.all([
      prisma.researchPaper.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: 50,
        // extractedText is selected for snippet generation ONLY — it is
        // stripped from the response payload below (it can be megabytes).
        select: {
          id: true, studentId: true, reviewerId: true, offeringId: true,
          title: true, abstract: true, fileUrl: true, status: true,
          plagiarismPct: true, aiContentPct: true, grade: true, feedback: true,
          uploadedAt: true, scannedAt: true, gradedAt: true, publishedAt: true,
          extractedText: true,
          student: {
            select: { id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true },
          },
          offering: { include: { course: { select: { name: true, code: true } } } },
        },
      }),
      prisma.researchPaper.count({ where }),
    ]));

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
      // Destructure extractedText out — never serialize full PDF text.
      const { extractedText: _omit, ...paperFields } = p;
      return { paper: paperFields, matchedIn, snippet, rank };
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

    res.json({ data, meta: { query: q, total } });
  } catch (e) { next(e); }
});

// ─── Paper annotations ────────────────────────────────────────
// Permission model:
//   - GET: paper student, paper reviewer, ADMIN, QUALITY can read
//   - POST: only TEACHER (must be paper reviewer) or ADMIN can write
//   - DELETE: only the annotation author or ADMIN

const annotationCreateSchema = z.object({
  page: z.number().int().min(1).max(2000),
  comment: z.string().trim().min(1).max(2000),
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
      role === Role.OWNER ||
      role === Role.QUALITY ||
      paper.studentId === uid ||
      paper.reviewerId === uid;
    if (!allowed) throw AppError.forbidden('لا تملك صلاحية عرض الملاحظات على هذه الورقة');

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
      throw AppError.forbidden('الملاحظات متاحة للمراجع المكلَّف بهذه الورقة فقط');
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
    if (note.authorId !== req.user!.id && req.user!.role !== Role.ADMIN && req.user!.role !== Role.OWNER) {
      throw AppError.forbidden('لا يمكنك حذف إلا ملاحظاتك الخاصة');
    }
    await prisma.paperAnnotation.delete({ where: { id: note.id } });
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
// Quality oversight (read-only views of institutional health)
// ════════════════════════════════════════════════════════════════

/**
 * Attendance alert thresholds: an offering is only judged once it has
 * at least MIN_RECORDS attendance records in the window; an absence
 * rate ≥25% is a warning, ≥40% is critical. Exported for unit tests.
 */
export const ATTENDANCE_ALERT_MIN_RECORDS = 5;
export const ATTENDANCE_ALERT_WARNING_RATE = 0.25;
export const ATTENDANCE_ALERT_CRITICAL_RATE = 0.4;

export function attendanceAlertSeverity(
  absentRate: number,
  totalRecords: number,
): 'warning' | 'critical' | null {
  if (totalRecords < ATTENDANCE_ALERT_MIN_RECORDS) return null;
  if (absentRate >= ATTENDANCE_ALERT_CRITICAL_RATE) return 'critical';
  if (absentRate >= ATTENDANCE_ALERT_WARNING_RATE) return 'warning';
  return null;
}

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

    // Low-attendance offerings (last 30d). Aggregated in the database
    // (groupBy) — never hydrate every attendance record of the
    // institution into memory.
    const [recentSessions, recordGroups, absentGroups] = await Promise.all([
      prisma.attendanceSession.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          offeringId: true,
          offering: { select: { course: { select: { name: true, code: true } } } },
        },
      }),
      prisma.attendanceRecord.groupBy({
        by: ['sessionId'],
        where: { session: { date: { gte: thirtyDaysAgo } } },
        _count: { _all: true },
      }),
      prisma.attendanceRecord.groupBy({
        by: ['sessionId'],
        where: { session: { date: { gte: thirtyDaysAgo } }, status: 'ABSENT' },
        _count: { _all: true },
      }),
    ]);
    const recordTotals = new Map(recordGroups.map((g) => [g.sessionId, g._count._all]));
    const absentTotals = new Map(absentGroups.map((g) => [g.sessionId, g._count._all]));
    const byOffering = new Map<string, { courseName: string; courseCode: string; total: number; absent: number }>();
    for (const s of recentSessions) {
      const cur = byOffering.get(s.offeringId) ?? {
        courseName: s.offering.course.name,
        courseCode: s.offering.course.code,
        total: 0, absent: 0,
      };
      cur.total += recordTotals.get(s.id) ?? 0;
      cur.absent += absentTotals.get(s.id) ?? 0;
      byOffering.set(s.offeringId, cur);
    }
    for (const [oid, row] of byOffering) {
      const rate = row.total > 0 ? row.absent / row.total : 0;
      const severity = attendanceAlertSeverity(rate, row.total);
      if (!severity) continue;
      alerts.push({
        id: `att-${oid}`,
        severity,
        category: 'attendance',
        title: `غياب جماعيّ بنسبة ${Math.round(rate * 100)}%`,
        description: `${row.courseName} (${row.courseCode}) — ${row.absent} غياب من ${row.total} جلسة آخر 30 يوماً`,
        occurredAt: now,
      });
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
        title: `بحث بنسبة انتحال ${pct.toFixed(1)}%`,
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
      // Deterministic order (longest-stale first) — `take` without
      // `orderBy` would return an arbitrary subset.
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
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
      // Deterministic order — `take` without `orderBy` returns an
      // arbitrary subset (newest offerings are the relevant ones here).
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 50,
    });
    res.json({ data: offerings });
  } catch (e) { next(e); }
});

/**
 * Stable positive seed derived from an entity id — used for estimated
 * (placeholder) metrics so a teacher's numbers never change between
 * calls, regardless of row order. Same id → same seed, always.
 * Exported for unit tests.
 */
export function stableSeed(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return h;
}

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
      // Deterministic order — `take` without `orderBy` returns an
      // arbitrary subset, and the estimated metrics below must not be
      // reassigned when row order shifts.
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
      take: 100,
    }));

    // Compute per-teacher aggregate metrics. Where real signals are sparse,
    // we fall back to deterministic seed-based values so the UI is meaningful —
    // flagged with `estimated: true` so consumers can label them as such.
    const data = teachers.map((t) => {
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
      // Deterministic but plausible mock satisfaction & response time per
      // teacher, seeded from the teacher's stable id (never the row
      // index — a row-order shift must not reassign estimated metrics).
      const seed = stableSeed(t.id);
      const satisfaction = 3.5 + (seed % 14) / 10; // 3.5 - 4.8
      const responseHours = 2 + (seed % 23); // 2 - 24
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
        satisfactionEstimated: true, // not measured — deterministic placeholder
        responseHours,
        responseHoursEstimated: true, // not measured — deterministic placeholder
        compliance,
      };
    });
    res.json({ data });
  } catch (e) { next(e); }
});

router.get('/quality/engagement', requireCapability('QUALITY_VIEW'), async (_req, res, next) => {
  try {
    // SQL aggregation: sums/counts computed in the database instead of
    // loading the whole WatchEvent table into memory.
    const [attendance, watchTotals, completedLectures, lectures, enrollments, totalStudents, papersByStatus, weeklyActiveEvents] = await withRetry(() => Promise.all([
      prisma.attendanceRecord.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.watchEvent.aggregate({ _sum: { watchedSec: true, totalSec: true }, _count: { _all: true } }),
      prisma.watchEvent.count({ where: { completed: true } }),
      prisma.lecture.count(),
      prisma.enrollment.count(),
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.researchPaper.groupBy({ by: ['status'], _count: { _all: true } }),
      // Distinct (student, day) pairs in the last 7 days for the weekly-active curve.
      // Bounded to a 7-day window — never the full table.
      prisma.watchEvent.findMany({
        where: { lastSeenAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { studentId: true, lastSeenAt: true },
      }),
    ]));

    const totalAttendance = attendance.reduce((s, x) => s + x._count._all, 0) || 1;
    const presentRate = ((attendance.find((a) => a.status === 'PRESENT')?._count._all ?? 0) / totalAttendance) * 100;
    const lateRate = ((attendance.find((a) => a.status === 'LATE')?._count._all ?? 0) / totalAttendance) * 100;
    const absentRate = ((attendance.find((a) => a.status === 'ABSENT')?._count._all ?? 0) / totalAttendance) * 100;

    const totalWatched = watchTotals._sum.watchedSec ?? 0;
    const totalDuration = watchTotals._sum.totalSec ?? 0;
    // Share of total video length actually watched across all watch
    // events (a watch-time ratio — the number of fully completed
    // lectures is reported separately as completedLectures).
    const completionRate = totalDuration > 0 ? (totalWatched / totalDuration) * 100 : 0;

    // Weekly active: count unique students per day for the last 7 days.
    // Falls back to a deterministic pseudo-curve when there's not enough data —
    // flagged via weeklyActiveEstimated so consumers can label the curve.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeklyActive: number[] = [];
    let usedFallback = false;
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
      if (sample > 0) {
        weeklyActive.push(Math.min(totalStudents, Math.round(sample * Math.max(1, Math.floor(totalStudents / Math.max(1, weeklyActiveEvents.length))))));
      } else {
        usedFallback = true;
        weeklyActive.push(Math.max(0, Math.min(totalStudents, Math.round(totalStudents * (0.45 + 0.4 * Math.sin((6 - i) * 0.9))))));
      }
    }

    res.json({
      data: {
        attendance: { presentRate, lateRate, absentRate, total: totalAttendance },
        videos: {
          totalLectures: lectures,
          totalEvents: watchTotals._count._all,
          completionRate,
          completedLectures,
        },
        enrollments,
        totalStudents,
        papersByStatus: Object.fromEntries(papersByStatus.map((p) => [p.status, p._count._all])),
        weeklyActive,
        weeklyActiveEstimated: usedFallback, // true when any day used the fallback curve
      },
    });
  } catch (e) { next(e); }
});

router.get('/quality/curriculum', requireCapability('QUALITY_VIEW'), async (_req, res, next) => {
  try {
    // Deep include is bounded: take-limits on courses (25/dept) and
    // offerings (10/course) so the payload can't explode on large faculties.
    const faculties = await withRetry(() => prisma.faculty.findMany({
      include: {
        departments: {
          include: {
            courses: {
              take: 25,
              orderBy: { code: 'asc' },
              include: {
                offerings: {
                  take: 10,
                  orderBy: { createdAt: 'desc' },
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
