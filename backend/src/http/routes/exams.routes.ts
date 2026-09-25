import { Router } from 'express';
import { z } from 'zod';
import { DifficultyLevel, ExamKind, QuestionType, AttemptStatus, Role } from '@prisma/client';
import type { ExamAttempt, ExamAnswer } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertOwnsOffering, assertOfferingAccess, getEffectiveCapabilities } from '../../lib/permissions.js';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
//  Pure exam logic (exported for DB-free unit tests)
// ════════════════════════════════════════════════════════════════

/** Late-submit grace window past expiresAt (network latency buffer). */
export const SUBMIT_GRACE_MS = 60_000;

/**
 * Short-answer matcher: exact equality after trimming, or the same
 * comparison case-insensitively — NEVER substring containment. A
 * one-character answer must not score against a longer model answer,
 * and a model answer must not match a single word of a verbose reply.
 */
export function shortAnswerMatches(expected: unknown, submitted: string | null | undefined): boolean {
  if (typeof expected !== 'string') return false;
  const e = expected.trim();
  const s = (submitted ?? '').trim();
  if (e === '' || s === '') return false;
  return s === e || s.toLowerCase() === e.toLowerCase();
}

export type AutoGrade =
  | { kind: 'auto'; awarded: number; isCorrect: boolean }
  | { kind: 'manual' };

/** Parse an MCQ/TRUE_FALSE key into a non-negative integer choice
 *  index. Legacy rows may store the index as a numeric string; letter
 *  keys, booleans and null cannot be auto-graded. */
function mcqKeyIndex(correctAnswer: unknown): number | null {
  const n =
    typeof correctAnswer === 'number'
      ? correctAnswer
      : typeof correctAnswer === 'string' && correctAnswer.trim() !== ''
        ? Number(correctAnswer)
        : Number.NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Pure auto-grading for one answer. Returns 'manual' when the question
 * needs a human decision: essays, keyless short answers, and —
 * defensively for legacy rows — MCQ keys that are not valid choice
 * indexes (which previously graded every student wrong, silently).
 */
export function gradeExamAnswer(
  question: { type: QuestionType; correctAnswer: unknown; choices: unknown },
  answer: { choiceIndex: number | null; answerText: string | null },
  points: number,
): AutoGrade {
  if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
    const choiceCount = Array.isArray(question.choices) ? question.choices.length : 0;
    const key = mcqKeyIndex(question.correctAnswer);
    if (key === null || key >= choiceCount) return { kind: 'manual' };
    // No selection is an explicit wrong answer, not a pending review —
    // objective questions are machine-gradable either way.
    const isCorrect = answer.choiceIndex !== null && answer.choiceIndex === key;
    return { kind: 'auto', awarded: isCorrect ? points : 0, isCorrect };
  }
  if (question.type === 'SHORT') {
    if (typeof question.correctAnswer !== 'string' || question.correctAnswer.trim() === '') {
      return { kind: 'manual' };
    }
    const isCorrect = shortAnswerMatches(question.correctAnswer, answer.answerText);
    return { kind: 'auto', awarded: isCorrect ? points : 0, isCorrect };
  }
  // ESSAY — needs a teacher's judgement.
  return { kind: 'manual' };
}

export type ExamStartAction = 'resume' | 'alreadyAttempted' | 'freshStart';

/**
 * What `POST /exams/templates/:id/start` must do with an existing
 * attempt:
 *  - 'resume'           — IN_PROGRESS and still inside the submit grace
 *                         window (the same deadline the submit route
 *                         enforces): hand the exam back with the saved
 *                         answers.
 *  - 'alreadyAttempted' — closed for the student (GRADED / EXPIRED, or
 *                         SUBMITTED awaiting teacher grading).
 *  - 'freshStart'       — no blocking attempt, or a finished PRACTICE
 *                         attempt (practice exams are retakeable).
 */
export function decideExamStart(
  existing: { status: AttemptStatus; expiresAt: Date } | null,
  kind: ExamKind,
  now: Date = new Date(),
): ExamStartAction {
  if (!existing) return 'freshStart';
  if (existing.status === 'IN_PROGRESS') {
    const graceDeadline = existing.expiresAt.getTime() + SUBMIT_GRACE_MS;
    if (graceDeadline >= now.getTime()) return 'resume';
    return kind === ExamKind.PRACTICE ? 'freshStart' : 'alreadyAttempted';
  }
  return kind === ExamKind.PRACTICE ? 'freshStart' : 'alreadyAttempted';
}

export type ManualGradeReconciliation =
  | { ok: true }
  | { ok: false; message: string; answerIds: string[] };

/**
 * A manual-grading payload must grade exactly the pending answers:
 * every pending answer once, nothing the auto-grader already scored.
 */
export function reconcileManualGrades(
  submitted: ReadonlyArray<{ answerId: string }>,
  pendingAnswerIds: readonly string[],
): ManualGradeReconciliation {
  const pending = new Set(pendingAnswerIds);
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const s of submitted) {
    if (seen.has(s.answerId)) duplicates.push(s.answerId);
    seen.add(s.answerId);
  }
  if (duplicates.length > 0) {
    return { ok: false, message: 'Duplicate answerId in grading payload', answerIds: duplicates };
  }
  const notPending = submitted.map((s) => s.answerId).filter((id) => !pending.has(id));
  if (notPending.length > 0) {
    return { ok: false, message: 'Answers are not awaiting manual grading', answerIds: notPending };
  }
  const missing = pendingAnswerIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    return { ok: false, message: 'All pending answers must be graded before finalizing', answerIds: missing };
  }
  return { ok: true };
}

/** An exam attempt row including its saved answers. */
type AttemptWithAnswers = ExamAttempt & { answers: ExamAnswer[] };

// ════════════════════════════════════════════════════════════════
//  Question bank
// ════════════════════════════════════════════════════════════════

/** GET /question-bank — browse with filters */
router.get('/question-bank', async (req, res, next) => {
  try {
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const questions = await prisma.question.findMany({
      where: {
        isApproved: true,
        ...(categoryId ? { categoryId } : {}),
        ...(difficulty && Object.values(DifficultyLevel).includes(difficulty as DifficultyLevel)
          ? { difficulty: difficulty as DifficultyLevel } : {}),
        ...(type && Object.values(QuestionType).includes(type as QuestionType)
          ? { type: type as QuestionType } : {}),
        ...(q ? { prompt: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: {
        category: { select: { title: true, slug: true, iconEmoji: true } },
        author: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({
      data: questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        difficulty: q.difficulty,
        points: q.points,
        category: q.category,
        // Don't leak the answer in the bank listing.
        choices: q.choices,
        author: `${q.author.firstName} ${q.author.lastName}`,
        tags: q.tags,
      })),
    });
  } catch (e) { next(e); }
});

/** GET /question-bank/categories — list */
router.get('/question-bank/categories', async (_req, res, next) => {
  try {
    const cats = await prisma.questionCategory.findMany({
      include: {
        faculty: { select: { name: true } },
        department: { select: { name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { title: 'asc' },
    });
    res.json({ data: cats });
  } catch (e) { next(e); }
});

export const createQuestionSchema = z
  .object({
    categoryId: z.string().cuid(),
    type: z.nativeEnum(QuestionType),
    prompt: z.string().min(5).max(2000),
    choices: z.array(z.string().max(500)).min(2).max(20).optional(),
    correctAnswer: z.union([z.string(), z.number(), z.boolean()]).optional(),
    difficulty: z.nativeEnum(DifficultyLevel).default('MEDIUM'),
    points: z.number().int().min(1).max(20).default(1),
    tags: z.array(z.string().max(40)).max(8).default([]),
  })
  .strict()
  .superRefine((body, ctx) => {
    // The answer key's shape must match the question type — an MCQ
    // keyed with a letter ("B") or any non-index value silently graded
    // every student wrong, and a keyless short answer cannot be
    // auto-graded at all.
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (body.type === 'MCQ' || body.type === 'TRUE_FALSE') {
      if (!body.choices) {
        issue('choices', 'MCQ/TRUE_FALSE questions require choices');
        return;
      }
      if (body.type === 'TRUE_FALSE' && body.choices.length !== 2) {
        issue('choices', 'TRUE_FALSE questions require exactly 2 choices');
        return;
      }
      if (
        typeof body.correctAnswer !== 'number' ||
        !Number.isInteger(body.correctAnswer) ||
        body.correctAnswer < 0 ||
        body.correctAnswer >= body.choices.length
      ) {
        issue('correctAnswer', 'correctAnswer must be an integer index into choices');
      }
    } else if (body.type === 'SHORT') {
      if (typeof body.correctAnswer !== 'string' || body.correctAnswer.trim() === '') {
        issue('correctAnswer', 'SHORT questions require a non-empty model answer string');
      }
    } else if (body.type === 'ESSAY' && body.correctAnswer !== undefined && typeof body.correctAnswer !== 'string') {
      issue('correctAnswer', 'ESSAY rubric must be a string');
    }
  });

router.post('/question-bank', requireCapability('EXAMS_AUTHOR'), validate(createQuestionSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createQuestionSchema>;
    const q = await prisma.question.create({
      data: {
        categoryId: body.categoryId,
        type: body.type,
        prompt: body.prompt,
        choices: body.choices ?? undefined,
        correctAnswer: body.correctAnswer !== undefined ? body.correctAnswer : undefined,
        difficulty: body.difficulty,
        points: body.points,
        tags: body.tags,
        authorId: req.user!.id,
        // New questions always enter the moderation queue — an
        // EXAMS_MODERATE holder approves them via /question-bank/:id/moderate.
        isApproved: false,
      },
    });
    res.status(201).json({ data: q });
  } catch (e) { next(e); }
});

/** POST /question-bank/:id/moderate — approve/reject */
const moderateSchema = z.object({
  approve: z.boolean(),
  note: z.string().max(500).optional(),
}).strict();

router.post(
  '/question-bank/:id/moderate',
  requireCapability('EXAMS_MODERATE'),
  validate(moderateSchema),
  async (req, res, next) => {
    try {
      const updated = await prisma.question.update({
        where: { id: req.params.id },
        data: {
          isApproved: req.body.approve,
          moderatedById: req.user!.id,
          moderationNote: req.body.note ?? null,
        },
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

// ════════════════════════════════════════════════════════════════
//  Exam templates
// ════════════════════════════════════════════════════════════════

export const createTemplateSchema = z
  .object({
    offeringId: z.string().cuid().optional(),
    facultyId: z.string().cuid().optional(),
    title: z.string().min(3).max(200),
    kind: z.nativeEnum(ExamKind).default('QUIZ'),
    description: z.string().max(2000).optional(),
    durationMin: z.number().int().min(5).max(480).default(45),
    passingScore: z.number().int().min(0).max(100).default(50),
    randomized: z.boolean().default(true),
    questionIds: z.array(z.string().cuid()).min(1).max(60),
    openAt: z.coerce.date().optional(),
    closeAt: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.openAt && body.closeAt && body.openAt.getTime() >= body.closeAt.getTime()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['closeAt'], message: 'closeAt must be after openAt' });
    }
    if (new Set(body.questionIds).size !== body.questionIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['questionIds'], message: 'questionIds must not contain duplicates' });
    }
  });

router.post('/exams/templates', requireCapability('EXAMS_AUTHOR'), validate(createTemplateSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createTemplateSchema>;
    if (body.offeringId) {
      await assertOwnsOffering(body.offeringId, req.user!.id, req.user!.role);
    }
    // Template authoring is gated on question-level moderation too: a
    // template built from unapproved (or unknown) questions would bypass
    // the question moderation queue once the template itself is
    // approved. The question-bank listing only offers approved
    // questions, so this enforces what the UI already promises.
    const questions = await prisma.question.findMany({
      where: { id: { in: body.questionIds } },
      select: { id: true, isApproved: true },
    });
    const approvedIds = new Set(questions.filter((q) => q.isApproved).map((q) => q.id));
    const rejectedQuestionIds = body.questionIds.filter((qid) => !approvedIds.has(qid));
    if (rejectedQuestionIds.length > 0) {
      throw AppError.badRequest('All questions must exist and be approved', { questionIds: rejectedQuestionIds });
    }
    const template = await prisma.examTemplate.create({
      data: {
        offeringId: body.offeringId ?? null,
        facultyId: body.facultyId ?? null,
        title: body.title,
        kind: body.kind,
        description: body.description ?? null,
        durationMin: body.durationMin,
        passingScore: body.passingScore,
        randomized: body.randomized,
        status: 'PENDING_REVIEW',
        authorId: req.user!.id,
        openAt: body.openAt ?? null,
        closeAt: body.closeAt ?? null,
        questions: {
          create: body.questionIds.map((qid, i) => ({ questionId: qid, order: i + 1 })),
        },
      },
      include: { questions: { include: { question: true } } },
    });
    res.status(201).json({ data: template });
  } catch (e) { next(e); }
});

router.get('/exams/templates', async (req, res, next) => {
  try {
    const role = req.user!.role;
    const where: Record<string, unknown> = {};
    if (role === 'TEACHER') where.authorId = req.user!.id;
    else if (role === 'STUDENT') {
      // Same scoping as /exams/me: published templates for offerings I'm
      // enrolled in OR my own faculty. Without this, students could list
      // every published template platform-wide (cross-faculty leak).
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user!.id },
        select: { offeringId: true },
      });
      const myFaculty = await prisma.studentProfile.findUnique({
        where: { userId: req.user!.id },
        select: { facultyId: true },
      });
      where.status = 'PUBLISHED';
      where.OR = [
        { offeringId: { in: enrollments.map((e) => e.offeringId) } },
        ...(myFaculty?.facultyId ? [{ facultyId: myFaculty.facultyId }] : []),
      ];
    }
    // QUALITY/ADMIN: see all by default

    const templates = await prisma.examTemplate.findMany({
      where,
      include: {
        offering: { select: { id: true, course: { select: { name: true, code: true, iconEmoji: true } } } },
        faculty: { select: { name: true } },
        author: { select: { firstName: true, lastName: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ data: templates });
  } catch (e) { next(e); }
});

router.get('/exams/templates/:id', async (req, res, next) => {
  try {
    const template = await prisma.examTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        offering: { select: { id: true, teacherId: true, course: { select: { name: true, code: true } } } },
        faculty: { select: { name: true } },
        author: { select: { firstName: true, lastName: true } },
        moderatedBy: { select: { firstName: true, lastName: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: { question: { include: { category: { select: { title: true } } } } },
        },
        _count: { select: { attempts: true } },
      },
    });
    if (!template) throw AppError.notFound('Template not found');

    // Authorization: students can only see PUBLISHED templates
    if (req.user!.role === 'STUDENT' && template.status !== 'PUBLISHED') {
      throw AppError.forbidden();
    }

    // Scoping for students — mirror /exams/me: the template must belong to
    // an offering the student is enrolled in, or to the student's faculty.
    // Without this, any student could fetch any published template by ID.
    if (req.user!.role === 'STUDENT') {
      if (template.offeringId) {
        await assertOfferingAccess(template.offeringId, req.user!.id, Role.STUDENT);
      } else if (template.facultyId) {
        const profile = await prisma.studentProfile.findUnique({
          where: { userId: req.user!.id },
          select: { facultyId: true },
        });
        if (!profile || profile.facultyId !== template.facultyId) {
          throw AppError.forbidden('This exam is for a different faculty');
        }
      }
    }

    // Answer-key visibility:
    //  - STUDENT: never (would defeat the exam)
    //  - TEACHER: only if they're the author of this template
    //  - QUALITY: only if they hold EXAMS_MODERATE
    //  - ADMIN / OWNER: oversight roles — always visible
    // Previously any TEACHER could read any other teacher's answer key —
    // an information-disclosure bug.
    const canSeeAnswers =
      req.user!.role === Role.ADMIN ||
      req.user!.role === Role.OWNER ||
      (req.user!.role === Role.TEACHER && template.authorId === req.user!.id) ||
      (req.user!.role === Role.QUALITY && (await getEffectiveCapabilities(req.user!.id, req.user!.role)).has('EXAMS_MODERATE'));

    res.json({
      data: {
        ...template,
        questions: template.questions.map((eq) => ({
          ...eq,
          question: {
            ...eq.question,
            correctAnswer: canSeeAnswers ? eq.question.correctAnswer : null,
          },
        })),
      },
    });
  } catch (e) { next(e); }
});

/** Quality moderation: approve/reject template */
router.post(
  '/exams/templates/:id/moderate',
  requireCapability('EXAMS_MODERATE'),
  validate(moderateSchema),
  async (req, res, next) => {
    try {
      const status = req.body.approve ? 'APPROVED' : 'REJECTED';
      const updated = await prisma.examTemplate.update({
        where: { id: req.params.id },
        data: {
          status,
          moderatedById: req.user!.id,
          moderationNote: req.body.note ?? null,
        },
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

/** Author publish — only after moderation APPROVED */
router.post('/exams/templates/:id/publish', requireCapability('EXAMS_AUTHOR'), async (req, res, next) => {
  try {
    const t = await prisma.examTemplate.findUnique({ where: { id: req.params.id } });
    if (!t) throw AppError.notFound('Template not found');
    if (req.user!.role !== Role.OWNER && t.authorId !== req.user!.id) throw AppError.forbidden('Not your template');
    if (t.status !== 'APPROVED') {
      throw AppError.badRequest('Template must be APPROVED by quality before publishing');
    }
    const updated = await prisma.examTemplate.update({
      where: { id: t.id },
      data: { status: 'PUBLISHED' },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
//  Student exam-taking
// ════════════════════════════════════════════════════════════════

router.get('/exams/me', async (req, res, next) => {
  try {
    // Read-only endpoint listing published exams for the caller. Non-students
    // (TEACHER / ADMIN / OWNER previewing the page) get an empty array
    // rather than a 403 — this is a personal-data shape, not a security
    // boundary. The mutation endpoints (start/submit) stay STUDENT-only.
    if (req.user!.role !== Role.STUDENT) {
      res.json({ data: [] });
      return;
    }
    const userId = req.user!.id;
    // Find published exams for offerings I'm enrolled in OR faculty-wide
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: userId },
      select: { offeringId: true },
    });
    const offeringIds = enrollments.map((e) => e.offeringId);

    const myFaculty = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { facultyId: true },
    });

    const available = await prisma.examTemplate.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { offeringId: { in: offeringIds } },
          ...(myFaculty?.facultyId ? [{ facultyId: myFaculty.facultyId }] : []),
        ],
      },
      include: {
        offering: { select: { course: { select: { name: true, iconEmoji: true } } } },
        faculty: { select: { name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myAttempts = await prisma.examAttempt.findMany({
      where: { studentId: userId, templateId: { in: available.map((t) => t.id) } },
      select: { id: true, templateId: true, status: true, score: true, maxScore: true, submittedAt: true },
    });
    const attemptByTemplate = new Map(myAttempts.map((a) => [a.templateId, a]));

    res.json({
      data: available.map((t) => ({
        id: t.id,
        title: t.title,
        kind: t.kind,
        durationMin: t.durationMin,
        questionCount: t._count.questions,
        passingScore: t.passingScore,
        openAt: t.openAt,
        closeAt: t.closeAt,
        courseName: t.offering?.course.name ?? null,
        courseIcon: t.offering?.course.iconEmoji ?? null,
        facultyName: t.faculty?.name ?? null,
        myAttempt: attemptByTemplate.get(t.id) ?? null,
      })),
    });
  } catch (e) { next(e); }
});

router.post('/exams/templates/:id/start', requireRole(Role.STUDENT), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const template = await prisma.examTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!template) throw AppError.notFound('Template not found');
    if (template.status !== 'PUBLISHED') throw AppError.forbidden('Exam not published');
    if (template.openAt && template.openAt > new Date()) throw AppError.forbidden('Exam not open yet');
    if (template.closeAt && template.closeAt < new Date()) throw AppError.forbidden('Exam closed');

    // Enrollment / scoping check — students may only start exams that
    // belong to an offering they're enrolled in, or a faculty they
    // belong to. Without this, any student could start any published
    // exam by ID (even ones for a faculty they're not in).
    if (template.offeringId) {
      await assertOfferingAccess(template.offeringId, userId, Role.STUDENT);
    } else if (template.facultyId) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { facultyId: true },
      });
      if (!profile || profile.facultyId !== template.facultyId) {
        throw AppError.forbidden('This exam is for a different faculty');
      }
    }

    // Two concurrent starts used to race past the findFirst and create
    // two attempts. The transaction below serializes concurrent starts
    // per template via SELECT … FOR UPDATE on the template row, so the
    // find-then-create sequence is atomic per (template, student).
    const expiresAt = new Date(Date.now() + template.durationMin * 60_000);
    const maxScore = template.questions.reduce((s, eq) => s + (eq.pointsOverride ?? eq.question.points), 0);
    const now = new Date();

    // One attempt per exam — EXPIRED included: a student who has seen
    // every question must not get a fresh retake. PRACTICE exams are
    // retakeable, so only a live attempt blocks them.
    const blockingStatuses: AttemptStatus[] =
      template.kind === ExamKind.PRACTICE
        ? ['IN_PROGRESS']
        : ['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED'];

    const toQuestionPayload = (eq: (typeof template.questions)[number]) => ({
      id: eq.question.id,
      type: eq.question.type,
      prompt: eq.question.prompt,
      choices: eq.question.choices,
      points: eq.pointsOverride ?? eq.question.points,
    });

    const started = await prisma.$transaction(async (tx): Promise<{ existing: AttemptWithAnswers | null; created: ExamAttempt | null }> => {
      await tx.$queryRaw`SELECT id FROM "ExamTemplate" WHERE id = ${template.id} FOR UPDATE`;
      let existing = await tx.examAttempt.findFirst({
        where: { templateId: template.id, studentId: userId, status: { in: blockingStatuses } },
        orderBy: { startedAt: 'desc' },
        include: { answers: true },
      });

      // Expired-but-unflipped: an IN_PROGRESS row whose grace window
      // (the same deadline the submit route enforces) has closed. Flip
      // it to EXPIRED — guarded exactly like the submit claim, so a
      // concurrent submit that graded the attempt can never be
      // overwritten back to EXPIRED.
      if (existing && existing.status === 'IN_PROGRESS' && existing.expiresAt.getTime() + SUBMIT_GRACE_MS < now.getTime()) {
        const flip = await tx.examAttempt.updateMany({
          where: { id: existing.id, status: 'IN_PROGRESS' },
          data: { status: AttemptStatus.EXPIRED },
        });
        existing = flip.count === 1
          ? { ...existing, status: AttemptStatus.EXPIRED }
          : await tx.examAttempt.findUnique({ where: { id: existing.id }, include: { answers: true } });
      }

      const action = decideExamStart(existing, template.kind, now);
      if (existing && action !== 'freshStart') {
        return { existing, created: null };
      }
      const created = await tx.examAttempt.create({
        data: {
          templateId: template.id,
          studentId: userId,
          expiresAt,
          maxScore,
        },
      });
      return { existing: null, created };
    });

    if (started.existing) {
      if (started.existing.status === 'IN_PROGRESS') {
        // Resume: a live attempt returns the full fresh-start shape
        // plus the saved answers, so a mid-exam refresh or reconnect
        // restores the exam instead of bricking it. No reshuffle on
        // resume — re-randomizing on every reconnect would keep moving
        // the board under the student; answers are keyed by question
        // id, so the template order is stable and safe.
        res.json({
          data: {
            attemptId: started.existing.id,
            expiresAt: started.existing.expiresAt,
            durationMin: template.durationMin,
            title: template.title,
            questions: template.questions.map(toQuestionPayload),
            resumed: true,
            attempt: {
              id: started.existing.id,
              status: started.existing.status,
              expiresAt: started.existing.expiresAt,
              answers: started.existing.answers.map((a) => ({
                questionId: a.questionId,
                value: a.choiceIndex !== null ? a.choiceIndex : a.answerText,
              })),
            },
          },
        });
        return;
      }
      // Closed for the student: GRADED and EXPIRED attempts, and
      // SUBMITTED ones awaiting teacher grading. The status field lets
      // the client tell "graded" apart from "awaiting grading".
      res.json({
        data: {
          attemptId: started.existing.id,
          status: started.existing.status,
          alreadyAttempted: true,
        },
      });
      return;
    }
    const attempt = started.created!;


    // Optional shuffle on randomized templates — Fisher-Yates (sort()
    // with a random comparator is biased and not a uniform shuffle).
    let serializedQs = template.questions.slice();
    if (template.randomized) {

      for (let i = serializedQs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = serializedQs[i]!;
        serializedQs[i] = serializedQs[j]!;
        serializedQs[j] = tmp;
      }
    }

    res.status(201).json({
      data: {
        attemptId: attempt.id,
        expiresAt,
        durationMin: template.durationMin,
        title: template.title,
        questions: serializedQs.map(toQuestionPayload),
      },
    });
  } catch (e) { next(e); }
});

export const submitAnswerSchema = z.object({
  questionId: z.string().cuid(),
  answerText: z.string().max(4000).optional(),
  choiceIndex: z.number().int().min(0).max(19).optional(),
}).strict();

router.post(
  '/exams/attempts/:id/answer',
  requireRole(Role.STUDENT),
  validate(submitAnswerSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof submitAnswerSchema>;
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: req.params.id },
        include: {
          template: {
            include: {
              questions: {
                include: { question: { select: { id: true, type: true, choices: true } } },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });
      if (!attempt) throw AppError.notFound('Attempt not found');
      if (attempt.studentId !== req.user!.id) throw AppError.forbidden();
      if (attempt.status !== 'IN_PROGRESS') throw AppError.forbidden('Attempt closed');
      if (attempt.expiresAt < new Date()) throw AppError.forbidden('Attempt expired');

      // The question must belong to THIS attempt's template, and a choice
      // index must point inside that question's choices array.
      const link = attempt.template.questions.find((q) => q.questionId === body.questionId);
      if (!link) {
        throw AppError.badRequest('Question does not belong to this exam');
      }
      if (body.choiceIndex !== undefined) {
        const choiceCount = Array.isArray(link.question.choices) ? link.question.choices.length : 0;
        if (body.choiceIndex >= choiceCount) {
          throw AppError.badRequest(`choiceIndex out of range (question has ${choiceCount} choices)`);
        }
      }
      // The save must carry the field this question type is graded on —
      // an MCQ answer with only text (or an essay with only an index)
      // would silently grade as unanswered.
      if ((link.question.type === 'MCQ' || link.question.type === 'TRUE_FALSE') && body.choiceIndex === undefined) {
        throw AppError.badRequest('This question is answered with choiceIndex');
      }
      if ((link.question.type === 'SHORT' || link.question.type === 'ESSAY') && body.answerText === undefined) {
        throw AppError.badRequest('This question is answered with answerText');
      }

      // Save only the provided dimension — a text-only retry must not
      // erase a previously saved choiceIndex (and vice versa).
      const patch: { answerText?: string | null; choiceIndex?: number | null } = {};
      if (body.answerText !== undefined) patch.answerText = body.answerText;
      if (body.choiceIndex !== undefined) patch.choiceIndex = body.choiceIndex;

      await prisma.examAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: body.questionId } },
        update: patch,
        create: {
          attemptId: attempt.id,
          questionId: body.questionId,
          answerText: body.answerText ?? null,
          choiceIndex: body.choiceIndex ?? null,
        },
      });
      res.json({ data: { ok: true } });
    } catch (e) { next(e); }
  },
);

router.post('/exams/attempts/:id/submit', requireRole(Role.STUDENT), async (req, res, next) => {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: req.params.id },
      include: {
        template: { include: { questions: { include: { question: true } } } },
        answers: true,
      },
    });
    if (!attempt) throw AppError.notFound('Attempt not found');
    if (attempt.studentId !== req.user!.id) throw AppError.forbidden();
    if (attempt.status !== 'IN_PROGRESS') throw AppError.conflict('Already submitted');

    // Expiry: submissions are accepted up to 60s past expiresAt (network
    // latency grace). Beyond that the attempt is hard-closed as EXPIRED
    // and never graded.
    const now = new Date();
    const graceDeadline = new Date(attempt.expiresAt.getTime() + SUBMIT_GRACE_MS);
    if (now > graceDeadline) {
      // Guarded exactly like the IN_PROGRESS claim below: a concurrent
      // submit that already graded this attempt can never have its
      // GRADED row overwritten back to EXPIRED.
      const expiredClaim = await prisma.examAttempt.updateMany({
        where: { id: attempt.id, status: 'IN_PROGRESS' },
        data: { status: AttemptStatus.EXPIRED },
      });
      if (expiredClaim.count === 0) throw AppError.conflict('Already submitted');
      throw AppError.forbidden('Attempt expired');
    }

    // Auto-grade MCQ + TF + SHORT (exact match); ESSAY — and anything
    // without a machine-usable key — is parked for manual grading.
    let totalAwarded = 0;
    let needsManual = 0;
    const answerByQId = new Map(attempt.answers.map((a) => [a.questionId, a]));

    // Compute grading results FIRST (pure computation), then persist
    // everything in ONE transaction.
    const gradedAnswers: Array<{ id: string; isCorrect: boolean | null; awardedPoints: number }> = [];
    for (const eq of attempt.template.questions) {
      const q = eq.question;
      const ans = answerByQId.get(q.id);
      const points = eq.pointsOverride ?? q.points;
      if (!ans) {
        // Unanswered: objective questions simply score 0, but a blank
        // essay (or keyless short answer) still needs a human decision
        // before the attempt can be finalized.
        if (gradeExamAnswer(q, { choiceIndex: null, answerText: null }, points).kind === 'manual') {
          needsManual++;
        }
        continue;
      }
      const grade = gradeExamAnswer(q, ans, points);
      if (grade.kind === 'manual') {
        needsManual++;
        gradedAnswers.push({ id: ans.id, isCorrect: null, awardedPoints: 0 });
      } else {
        totalAwarded += grade.awarded;
        gradedAnswers.push({ id: ans.id, isCorrect: grade.isCorrect, awardedPoints: grade.awarded });
      }
    }

    const finalStatus: AttemptStatus = needsManual > 0 ? 'SUBMITTED' : 'GRADED';
    const updated = await prisma.$transaction(async (tx) => {
      // Double-grading guard: the status flip only applies while the
      // attempt is still IN_PROGRESS — a concurrent submit loses the race
      // and gets a 409 instead of double-writing grades.
      const claim = await tx.examAttempt.updateMany({
        where: { id: attempt.id, status: 'IN_PROGRESS' },
        data: {
          status: finalStatus,
          score: totalAwarded,
          submittedAt: new Date(),
        },
      });
      if (claim.count === 0) throw AppError.conflict('Already submitted');
      for (const ga of gradedAnswers) {
        await tx.examAnswer.update({
          where: { id: ga.id },
          data: { isCorrect: ga.isCorrect, awardedPoints: ga.awardedPoints },
        });
      }
      return tx.examAttempt.findUnique({ where: { id: attempt.id } });
    });

    const maxScore = Number(attempt.maxScore);
    res.json({
      data: {
        score: totalAwarded,
        maxScore,
        status: (updated?.status ?? finalStatus) as AttemptStatus,
        needsManual,
        // While manual grading is pending the pass verdict is not final —
        // report null instead of a verdict the teacher's grading can
        // flip. A zero maxScore can never produce a meaningful
        // percentage, so it never "passes".
        passed:
          needsManual > 0
            ? null
            : maxScore > 0 && (totalAwarded / maxScore) * 100 >= attempt.template.passingScore,
      },
    });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
//  Teacher manual grading
// ════════════════════════════════════════════════════════════════

export const manualGradeSchema = z.object({
  answers: z.array(z.object({
    answerId: z.string().cuid(),
    isCorrect: z.boolean(),
    feedback: z.string().max(2000).optional(),
  }).strict()).max(60),
}).strict();

/**
 * POST /exams/attempts/:attemptId/grade — grade the answers the
 * auto-grader parked for review (essays, keyless short answers),
 * finalize a SUBMITTED attempt to GRADED and write the final score.
 * Only the teacher owning the exam's offering (or the author of a
 * faculty-wide template) may grade.
 */
router.post(
  '/exams/attempts/:attemptId/grade',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(manualGradeSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof manualGradeSchema>;
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: req.params.attemptId },
        include: {
          template: { include: { questions: { include: { question: { select: { points: true } } } } } },
          answers: { include: { question: { select: { points: true } } } },
        },
      });
      if (!attempt) throw AppError.notFound('Attempt not found');

      // Authorization: the teacher who owns the exam's offering
      // (assertOwnsOffering — OWNER bypass, ADMIN via
      // CURRICULUM_EDIT_ANY); faculty-wide templates without an
      // offering belong to their author.
      if (attempt.template.offeringId) {
        await assertOwnsOffering(attempt.template.offeringId, req.user!.id, req.user!.role);
      } else if (req.user!.role !== Role.OWNER && attempt.template.authorId !== req.user!.id) {
        throw AppError.forbidden('Not your exam');
      }

      // Manual grading is the SUBMITTED → GRADED transition: it exists
      // for attempts the auto-grader parked because answers need a
      // human decision.
      if (attempt.status !== 'SUBMITTED') throw AppError.conflict('Attempt is not awaiting manual grading');

      // The payload must grade exactly the pending answers.
      const pendingIds = attempt.answers.filter((a) => a.isCorrect === null).map((a) => a.id);
      const reconciliation = reconcileManualGrades(body.answers, pendingIds);
      if (!reconciliation.ok) {
        throw AppError.badRequest(reconciliation.message, { answerIds: reconciliation.answerIds });
      }

      const gradeByAnswerId = new Map(body.answers.map((g) => [g.answerId, g]));
      const pointsByAnswerId = new Map(
        attempt.answers.map((a) => {
          const link = attempt.template.questions.find((eq) => eq.questionId === a.questionId);
          return [a.id, link ? (link.pointsOverride ?? link.question.points) : a.question.points];
        }),
      );

      // Final score = machine-graded points + the teacher's decisions.
      let totalAwarded = 0;
      for (const ans of attempt.answers) {
        const manual = gradeByAnswerId.get(ans.id);
        if (manual) {
          totalAwarded += manual.isCorrect ? (pointsByAnswerId.get(ans.id) ?? 0) : 0;
        } else {
          totalAwarded += Number(ans.awardedPoints ?? 0);
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Claim the transition — only a SUBMITTED attempt can be
        // graded; a concurrent grading request loses the race and gets
        // a 409.
        const claim = await tx.examAttempt.updateMany({
          where: { id: attempt.id, status: 'SUBMITTED' },
          data: { status: AttemptStatus.GRADED, score: totalAwarded },
        });
        if (claim.count === 0) throw AppError.conflict('Attempt is not awaiting manual grading');
        for (const g of body.answers) {
          await tx.examAnswer.update({
            where: { id: g.answerId },
            data: {
              isCorrect: g.isCorrect,
              awardedPoints: g.isCorrect ? (pointsByAnswerId.get(g.answerId) ?? 0) : 0,
              feedback: g.feedback ?? null,
            },
          });
        }
        return tx.examAttempt.findUnique({ where: { id: attempt.id } });
      });

      const maxScore = Number(attempt.maxScore);
      res.json({
        data: {
          score: totalAwarded,
          maxScore,
          status: updated?.status ?? AttemptStatus.GRADED,
          passed: maxScore > 0 && (totalAwarded / maxScore) * 100 >= attempt.template.passingScore,
        },
      });
    } catch (e) { next(e); }
  },
);

/** Quality moderation queue — pending review templates */
router.get('/exams/moderation-queue', requireCapability('EXAMS_MODERATE'), async (_req, res, next) => {
  try {
    const queue = await prisma.examTemplate.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: {
        offering: { select: { course: { select: { name: true } } } },
        author: { select: { firstName: true, lastName: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: queue });
  } catch (e) { next(e); }
});

export default router;
