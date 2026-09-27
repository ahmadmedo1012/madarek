import { Router } from 'express';
import { z } from 'zod';
import { DifficultyLevel, ExamKind, QuestionType, AttemptStatus, Prisma, Role } from '@prisma/client';
import type { ExamAttempt, ExamAnswer } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertOwnsOffering, assertOfferingAccess, getEffectiveCapabilities } from '../../lib/permissions.js';
// D12: the short-answer matcher is consolidated in lib/grading.ts (shared
// with the training quiz gate); re-exported because the DB-free tests
// import it from this module.
import { shortAnswerMatches } from '../../lib/grading.js';

export { shortAnswerMatches };

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
//  Pure exam logic (exported for DB-free unit tests)
// ════════════════════════════════════════════════════════════════

/** Late-submit grace window past expiresAt (network latency buffer). */
export const SUBMIT_GRACE_MS = 60_000;

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
    return { ok: false, message: 'إجابات مكرّرة في طلب التصحيح', answerIds: duplicates };
  }
  const notPending = submitted.map((s) => s.answerId).filter((id) => !pending.has(id));
  if (notPending.length > 0) {
    return { ok: false, message: 'بعض الإجابات المرسلة ليست بانتظار التصحيح اليدوي', answerIds: notPending };
  }
  const missing = pendingAnswerIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    return { ok: false, message: 'يجب تصحيح كل الإجابات المعلّقة قبل إنهاء المحاولة', answerIds: missing };
  }
  return { ok: true };
}

/**
 * Which attempt statuses block starting a new attempt on a template
 * of this kind. One attempt per exam — EXPIRED included: a student who
 * has seen every question must not get a fresh retake. PRACTICE exams
 * are retakeable, so only a live attempt blocks them. Returns a fresh
 * array per call (callers build Prisma `in` filters from it).
 */
export function attemptBlockingStatuses(kind: ExamKind): AttemptStatus[] {
  return kind === ExamKind.PRACTICE
    ? ['IN_PROGRESS']
    : ['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED'];
}

/**
 * The LATEST attempt per template (5-D3 — 5-B3 hand-off #2).
 * /exams/me collapses a student's attempts to one myAttempt row; the
 * old un-ordered findMany + Map last-wins made that pick depend on the
 * DB's return order. Folding by (startedAt, id) is order-independent —
 * whichever row arrives last, the newest attempt wins. `id` breaks
 * exact-ms ties (cuids are unique, so the order is total).
 */
export function latestAttemptPerTemplate<
  T extends { templateId: string; startedAt: Date; id: string },
>(attempts: ReadonlyArray<T>): Map<string, T> {
  const latest = new Map<string, T>();
  for (const a of attempts) {
    const cur = latest.get(a.templateId);
    if (
      !cur ||
      a.startedAt.getTime() > cur.startedAt.getTime() ||
      (a.startedAt.getTime() === cur.startedAt.getTime() && a.id > cur.id)
    ) {
      latest.set(a.templateId, a);
    }
  }
  return latest;
}

/**
 * Total gradeable points of a template's question set — a per-template
 * pointsOverride wins over the question's default points.
 */
export function templateMaxScore(
  questions: ReadonlyArray<{ pointsOverride: number | null; question: { points: number } }>,
): number {
  return questions.reduce((sum, eq) => sum + (eq.pointsOverride ?? eq.question.points), 0);
}

/**
 * Fisher-Yates shuffle returning a copy — `sort()` with a random
 * comparator is biased and not a uniform shuffle. The `rng` parameter
 * exists so unit tests can pin the exact permutation; production calls
 * use `Math.random`. The input array is never mutated.
 */
export function shuffleQuestions<T>(rows: readonly T[], rng: () => number = Math.random): T[] {
  const out = rows.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** The write performed by one answer save — only the dimension(s) the
 *  request actually carries. */
export type AnswerPatch = { answerText?: string; choiceIndex?: number };

/**
 * Dimension-aware validation + patch for one answer save. The save must
 * carry the field this question type is graded on — an MCQ answer with
 * only text (or an essay with only an index) would silently grade as
 * unanswered. The patch contains only the provided dimension, so a
 * text-only retry never erases a previously saved choiceIndex (and
 * vice versa). Returns the missing-dimension error instead of a usable
 * patch when validation fails.
 */
export function answerPatchFor(
  type: QuestionType,
  body: { answerText?: string; choiceIndex?: number },
): { patch: AnswerPatch; error: string | null } {
  if ((type === 'MCQ' || type === 'TRUE_FALSE') && body.choiceIndex === undefined) {
    return { patch: {}, error: 'يُجاب على هذا السؤال باختيار أحد الخيارات' };
  }
  if ((type === 'SHORT' || type === 'ESSAY') && body.answerText === undefined) {
    return { patch: {}, error: 'يُجاب على هذا السؤال بكتابة نص الإجابة' };
  }
  const patch: AnswerPatch = {};
  if (body.answerText !== undefined) patch.answerText = body.answerText;
  if (body.choiceIndex !== undefined) patch.choiceIndex = body.choiceIndex;
  return { patch, error: null };
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
    prompt: z.string().trim().min(5).max(2000),
    choices: z.array(z.string().trim().max(500)).min(2).max(20).optional(),
    correctAnswer: z.union([z.string(), z.number(), z.boolean()]).optional(),
    difficulty: z.nativeEnum(DifficultyLevel).default('MEDIUM'),
    points: z.number().int().min(1).max(20).default(1),
    tags: z.array(z.string().trim().max(40)).max(8).default([]),
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
  note: z.string().trim().max(500).optional(),
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
    title: z.string().trim().min(3).max(200),
    kind: z.nativeEnum(ExamKind).default('QUIZ'),
    description: z.string().trim().max(2000).optional(),
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
      throw AppError.badRequest('يجب أن تكون جميع الأسئلة موجودة ومعتمدة', { questionIds: rejectedQuestionIds });
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
    if (!template) throw AppError.notFound('قالب الاختبار غير موجود');

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
          throw AppError.forbidden('هذا الاختبار مخصص لكلّيّة أخرى');
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
    if (!t) throw AppError.notFound('قالب الاختبار غير موجود');
    if (req.user!.role !== Role.OWNER && t.authorId !== req.user!.id) throw AppError.forbidden('هذا القالب ليس من إنشائك');
    if (t.status !== 'APPROVED') {
      throw AppError.badRequest('يجب اعتماد القالب من وحدة الجودة قبل نشره');
    }
    // Conditional claim: a moderation rejection landing between the
    // status read above and this write must not be leapfrogged to
    // PUBLISHED — a quality-rejected exam must never go live. The flip
    // only fires while the row is still APPROVED.
    const claim = await prisma.examTemplate.updateMany({
      where: { id: t.id, status: 'APPROVED' },
      data: { status: 'PUBLISHED' },
    });
    if (claim.count === 0) {
      throw AppError.conflict('لم يعد القالب معتمداً — حدّث الصفحة ثم أعد المحاولة');
    }
    const updated = await prisma.examTemplate.findUnique({ where: { id: t.id } });
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
      select: { id: true, templateId: true, status: true, score: true, maxScore: true, submittedAt: true, startedAt: true },
      // Newest-first documents the intent; the fold below is the real
      // guarantee (order-independent latest-per-template).
      orderBy: { startedAt: 'desc' },
    });
    // 5-D3 (5-B3 hand-off #2): fold to the LATEST attempt per template
    // — deterministic regardless of the DB's return order.
    // score/maxScore are Prisma Decimal columns — the platform convention
    // (like every other Decimal on the wire: /me/results, lab sessions,
    // submit/grade below) is to convert before res.json, which would
    // otherwise serialize them as strings.
    const attemptByTemplate = new Map(
      [...latestAttemptPerTemplate(myAttempts).entries()].map(([templateId, a]) => [templateId, {
        id: a.id,
        templateId: a.templateId,
        status: a.status,
        score: a.score === null ? null : Number(a.score),
        maxScore: Number(a.maxScore),
        submittedAt: a.submittedAt,
      }]),
    );

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
    if (!template) throw AppError.notFound('قالب الاختبار غير موجود');
    if (template.status !== 'PUBLISHED') throw AppError.forbidden('هذا الاختبار غير منشور');
    if (template.openAt && template.openAt > new Date()) throw AppError.forbidden('لم يفتح باب هذا الاختبار بعد');
    if (template.closeAt && template.closeAt < new Date()) throw AppError.forbidden('أغلق باب التسليم لهذا الاختبار');

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
        throw AppError.forbidden('هذا الاختبار مخصص لكلّيّة أخرى');
      }
    }

    // Two concurrent starts used to race past the findFirst and create
    // two attempts. The transaction below serializes concurrent starts
    // per template via SELECT … FOR UPDATE on the template row, so the
    // find-then-create sequence is atomic per (template, student).
    const expiresAt = new Date(Date.now() + template.durationMin * 60_000);
    const maxScore = templateMaxScore(template.questions);
    const now = new Date();

    const blockingStatuses = attemptBlockingStatuses(template.kind);

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

    // Optional shuffle on randomized templates (Fisher-Yates). A
    // non-randomized template serves its stable authoring order — still
    // a copy, never the shared template rows.
    const serializedQs = template.randomized
      ? shuffleQuestions(template.questions)
      : template.questions.slice();

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
      if (!attempt) throw AppError.notFound('المحاولة غير موجودة');
      if (attempt.studentId !== req.user!.id) throw AppError.forbidden();
      if (attempt.status !== 'IN_PROGRESS') throw AppError.forbidden('انتهت هذه المحاولة');
      // Same grace deadline the submit route enforces: the frontend
      // flushes pending saves before auto-submitting at expiresAt, so a
      // save landing seconds past the deadline must still be accepted —
      // a submit in the same window grades it.
      const graceDeadline = new Date(attempt.expiresAt.getTime() + SUBMIT_GRACE_MS);
      if (new Date() > graceDeadline) throw AppError.forbidden('انتهى وقت هذه المحاولة');

      // The question must belong to THIS attempt's template, and a choice
      // index must point inside that question's choices array.
      const link = attempt.template.questions.find((q) => q.questionId === body.questionId);
      if (!link) {
        throw AppError.badRequest('هذا السؤال ليس ضمن أسئلة الاختبار');
      }
      if (body.choiceIndex !== undefined) {
        const choiceCount = Array.isArray(link.question.choices) ? link.question.choices.length : 0;
        if (body.choiceIndex >= choiceCount) {
          throw AppError.badRequest('رقم الخيار المرسل غير صالح لهذا السؤال');
        }
      }

      // Dimension requirement + partial patch (pure logic, unit-tested).
      // The save must carry the field this question type is graded on,
      // and the patch must contain only the provided dimension so a
      // text-only retry never erases a previously saved choiceIndex
      // (and vice versa).
      const { patch, error } = answerPatchFor(link.question.type, body);
      if (error !== null) throw AppError.badRequest(error);

      // Serialize against submit (and concurrent saves) on the attempt
      // row: FOR UPDATE, re-check the guards, then upsert — all in one
      // transaction (the same pattern as start, on the attempt row).
      // A submit that graded the attempt between our read and this lock
      // makes the re-check fail with 409 instead of mutating the answers
      // of a graded attempt; a submit arriving later blocks on the same
      // row and grades this save (submit re-reads the answers inside its
      // claim transaction), so no saved answer is silently scored 0.
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ExamAttempt" WHERE id = ${attempt.id} FOR UPDATE`;
        const locked = await tx.examAttempt.findUnique({
          where: { id: attempt.id },
          select: { status: true, expiresAt: true },
        });
        if (!locked || locked.status !== 'IN_PROGRESS') throw AppError.conflict('انتهت هذه المحاولة');
        if (locked.expiresAt.getTime() + SUBMIT_GRACE_MS < Date.now()) {
          throw AppError.forbidden('انتهى وقت هذه المحاولة');
        }
        await tx.examAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: body.questionId } },
          update: patch,
          create: {
            attemptId: attempt.id,
            questionId: body.questionId,
            answerText: body.answerText ?? null,
            choiceIndex: body.choiceIndex ?? null,
          },
        });
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
      },
    });
    if (!attempt) throw AppError.notFound('المحاولة غير موجودة');
    if (attempt.studentId !== req.user!.id) throw AppError.forbidden();
    if (attempt.status !== 'IN_PROGRESS') throw AppError.conflict('تم تسليم هذه المحاولة مسبقاً');

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
      if (expiredClaim.count === 0) throw AppError.conflict('تم تسليم هذه المحاولة مسبقاً');
      throw AppError.forbidden('انتهى وقت هذه المحاولة');
    }

    // Template questions are immutable once a template is published (no
    // edit route), so the question set read above is safe to grade
    // against inside the transaction. The ANSWERS are not: an answer
    // save can commit between the read above and the claim below, so
    // they are re-read inside the transaction, after the attempt row is
    // locked (the answer-save route takes the same row lock) — a
    // late-committing answer is graded, never silently scored 0.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ExamAttempt" WHERE id = ${attempt.id} FOR UPDATE`;
      const freshAnswers = await tx.examAnswer.findMany({ where: { attemptId: attempt.id } });

      // Auto-grade MCQ + TF + SHORT (exact match); ESSAY — and anything
      // without a machine-usable key — is parked for manual grading.
      let totalAwarded = 0;
      let needsManual = 0;
      const answerByQId = new Map(freshAnswers.map((a) => [a.questionId, a]));
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
      if (claim.count === 0) throw AppError.conflict('تم تسليم هذه المحاولة مسبقاً');
      for (const ga of gradedAnswers) {
        await tx.examAnswer.update({
          where: { id: ga.id },
          data: { isCorrect: ga.isCorrect, awardedPoints: ga.awardedPoints },
        });
      }
      const updated = await tx.examAttempt.findUnique({ where: { id: attempt.id } });
      return { updated, finalStatus, totalAwarded, needsManual };
    });

    const maxScore = Number(attempt.maxScore);
    res.json({
      data: {
        score: result.totalAwarded,
        maxScore,
        status: (result.updated?.status ?? result.finalStatus) as AttemptStatus,
        needsManual: result.needsManual,
        // While manual grading is pending the pass verdict is not final —
        // report null instead of a verdict the teacher's grading can
        // flip. A zero maxScore can never produce a meaningful
        // percentage, so it never "passes".
        passed:
          result.needsManual > 0
            ? null
            : maxScore > 0 && (result.totalAwarded / maxScore) * 100 >= attempt.template.passingScore,
      },
    });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
//  Student post-grading review (5-D3 — 5-B3 hand-off #1 / A6 P2-4)
// ════════════════════════════════════════════════════════════════

/** Question source of the review query — the template's ordered links
 * (order asc, the taker's own presentation order). */
export interface ReviewQuestionSource {
  questionId: string;
  pointsOverride: number | null;
  question: {
    type: QuestionType;
    prompt: string;
    choices: unknown;
    correctAnswer: unknown;
    points: number;
  };
}

/** One reviewed question — the student's answer next to the verdict
 * and (for machine-keyed kinds) the released key. */
export interface AttemptReviewQuestion {
  questionId: string;
  type: QuestionType;
  prompt: string;
  choices: string[] | null;
  points: number;
  myChoiceIndex: number | null;
  myAnswerText: string | null;
  isCorrect: boolean | null;
  awardedPoints: number | null;
  feedback: string | null;
  /** MCQ/TF: the correct choice index. SHORT: the model answer.
   *  ESSAY: always null — the rubric is teacher-side material, the
   *  teacher's per-answer feedback carries the student-facing verdict. */
  correctAnswer: string | number | null;
}

export interface AttemptReview {
  attemptId: string;
  templateTitle: string;
  score: number | null;
  maxScore: number;
  submittedAt: Date | null;
  questions: AttemptReviewQuestion[];
}

/** Json choices → string[] (corrupt shapes collapse to null). */
function reviewChoices(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((c) => typeof c === 'string') ? (value as string[]) : null;
}

/** The released key per question type — see AttemptReviewQuestion. */
function releasedKey(type: QuestionType, correctAnswer: unknown): string | number | null {
  if (type === QuestionType.ESSAY) return null;
  if (typeof correctAnswer === 'number') return correctAnswer;
  if (typeof correctAnswer === 'string') return correctAnswer;
  return null; // keyless SHORT: parked for manual grading, nothing to release
}

/** Pure row builder of the review read — Decimal columns converted per
 * the platform's wire convention. Unanswered questions (no ExamAnswer
 * row) list with 0 awarded points: on a GRADED attempt every question
 * contributed its points and a missing row scored 0. */
export function attemptReview(
  attempt: {
    id: string;
    score: Prisma.Decimal | null;
    maxScore: Prisma.Decimal;
    submittedAt: Date | null;
    template: { title: string };
    answers: ReadonlyArray<{
      questionId: string;
      answerText: string | null;
      choiceIndex: number | null;
      isCorrect: boolean | null;
      awardedPoints: Prisma.Decimal | null;
      feedback: string | null;
    }>;
  },
  questions: ReadonlyArray<ReviewQuestionSource>,
): AttemptReview {
  const answerByQId = new Map(attempt.answers.map((a) => [a.questionId, a]));
  return {
    attemptId: attempt.id,
    templateTitle: attempt.template.title,
    score: attempt.score === null ? null : Number(attempt.score),
    maxScore: Number(attempt.maxScore),
    submittedAt: attempt.submittedAt,
    questions: questions.map((eq) => {
      const ans = answerByQId.get(eq.questionId);
      return {
        questionId: eq.questionId,
        type: eq.question.type,
        prompt: eq.question.prompt,
        choices: reviewChoices(eq.question.choices),
        points: eq.pointsOverride ?? eq.question.points,
        myChoiceIndex: ans?.choiceIndex ?? null,
        myAnswerText: ans?.answerText ?? null,
        isCorrect: ans?.isCorrect ?? false,
        awardedPoints: ans ? (ans.awardedPoints === null ? null : Number(ans.awardedPoints)) : 0,
        feedback: ans?.feedback ?? null,
        correctAnswer: releasedKey(eq.question.type, eq.question.correctAnswer),
      };
    }),
  };
}

/**
 * GET /exams/attempts/:id/review — the student's own attempt with the
 * per-question verdicts and the released answer key. The 5-B3 hand-off
 * #1 endpoint (A6 P2-4): the honest «المراجعة غير متاحة» note on the
 * terminal screens ships until this exists.
 *
 * Authorization: own attempts only (attempt.studentId) — a student can
 * only ever hold attempts on exams they were allowed to start, so
 * attempt ownership IS the scope. The key releases ONLY on GRADED
 * attempts: SUBMITTED still awaits manual grading (an unfinished
 * verdict plus a leaked key), EXPIRED was never graded, IN_PROGRESS is
 * mid-exam. Retake exposure is deliberate: graded kinds block retakes
 * (attemptBlockingStatuses), and PRACTICE retakes with the key visible
 * is immediate feedback — the point of practice.
 */
router.get('/exams/attempts/:id/review', requireRole(Role.STUDENT), async (req, res, next) => {
  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: req.params.id },
      include: {
        template: {
          select: {
            title: true,
            questions: {
              orderBy: { order: 'asc' },
              select: {
                questionId: true,
                pointsOverride: true,
                question: {
                  select: { type: true, prompt: true, choices: true, correctAnswer: true, points: true },
                },
              },
            },
          },
        },
        answers: {
          select: { questionId: true, answerText: true, choiceIndex: true, isCorrect: true, awardedPoints: true, feedback: true },
        },
      },
    });
    if (!attempt) throw AppError.notFound('المحاولة غير موجودة');
    if (attempt.studentId !== req.user!.id) throw AppError.forbidden();
    if (attempt.status !== AttemptStatus.GRADED) {
      throw AppError.forbidden('مراجعة الأسئلة متاحة بعد اكتمال تصحيح المحاولة');
    }
    res.json({ data: attemptReview(attempt, attempt.template.questions) });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
//  Teacher manual grading
// ════════════════════════════════════════════════════════════════

/** Role door of the grading teacher surface — the same trio the manual
 *  grade route below admits. STUDENT (the graded party) and QUALITY
 *  (template moderation, never student answers) are structurally out;
 *  pinned DB-free by tests/modules/exams-logic.test.ts. */
export const EXAM_GRADING_ROLES: readonly Role[] = [Role.TEACHER, Role.ADMIN, Role.OWNER];

/** Outcome of `decideAttemptsAccess`. */
export type AttemptsAccess =
  | { ok: true; via: 'offering'; offeringId: string }
  | { ok: true; via: 'author' | 'owner' }
  | { ok: false; reason: 'not-author' };

/**
 * Pure access decision for a template's attempts — the read half of the
 * manual-grading authorization, mirroring the grade route's map exactly:
 * an offering-scoped template is gated through `assertOwnsOffering`
 * (the offering's teacher, ADMIN via CURRICULUM_EDIT_ANY, OWNER bypass);
 * a faculty-wide/general template belongs to its author (OWNER passes,
 * ADMIN does not — oversight reaches offerings through the caps check,
 * never keyless templates). The role door has already excluded
 * STUDENT/QUALITY by the time this runs.
 */
export function decideAttemptsAccess(
  template: { offeringId: string | null; authorId: string },
  viewer: { id: string; role: Role },
): AttemptsAccess {
  if (template.offeringId !== null) {
    return { ok: true, via: 'offering', offeringId: template.offeringId };
  }
  if (viewer.role === Role.OWNER) return { ok: true, via: 'owner' };
  if (template.authorId === viewer.id) return { ok: true, via: 'author' };
  return { ok: false, reason: 'not-author' };
}

/** ?status= filter of the attempts list — every AttemptStatus value is
 *  accepted; anything else (absent, malformed, wrong case) lists
 *  unfiltered, the question-bank query-param convention. */
export function parseAttemptStatusFilter(raw: unknown): AttemptStatus | null {
  return typeof raw === 'string' && (Object.values(AttemptStatus) as string[]).includes(raw)
    ? (raw as AttemptStatus)
    : null;
}

/** Points at stake per question id — `pointsOverride ?? question.points`
 *  from the template's question links, the same rule both graders apply
 *  (templateMaxScore at start, the manual grade write at finalize). */
export type QuestionPoints = ReadonlyMap<string, number>;

export function templateQuestionPoints(
  links: ReadonlyArray<{ questionId: string; pointsOverride: number | null; question: { points: number } }>,
): QuestionPoints {
  return new Map(links.map((l) => [l.questionId, l.pointsOverride ?? l.question.points]));
}

/** One parked answer of a SUBMITTED attempt, as the grading modal
 *  consumes it. `studentAnswer` carries the dimension the question is
 *  graded on — the chosen option's TEXT for MCQ/TRUE_FALSE (a bare index
 *  means nothing to a human grader), the prose otherwise; null when the
 *  student wrote nothing (the FE renders its own no-answer note). */
export interface PendingAnswerDetail {
  answerId: string;
  questionId: string;
  prompt: string;
  type: QuestionType;
  points: number;
  studentAnswer: string | null;
}

/** Source row of the attempts list query — the Prisma include below
 *  (kept in sync with this shape; test factories build it DB-free).
 *  `choices` is the raw Json column (the grader's Array.isArray guard
 *  narrows it, exactly like gradeExamAnswer). */
export interface TemplateAttemptSource {
  id: string;
  status: AttemptStatus;
  startedAt: Date;
  submittedAt: Date | null;
  score: Prisma.Decimal | null;
  maxScore: Prisma.Decimal;
  student: { id: string; firstName: string; lastName: string };
  answers: ReadonlyArray<{
    id: string;
    questionId: string;
    isCorrect: boolean | null;
    answerText: string | null;
    choiceIndex: number | null;
    question: { prompt: string; type: QuestionType; choices: unknown };
  }>;
}

/** GET /exams/templates/:id/attempts row. `pendingReview` counts the
 *  answer rows without a verdict (isCorrect null) — for SUBMITTED
 *  attempts those are the auto-grader's parked essays/keyless shorts
 *  (the grading modal's workload). `pendingAnswers` embeds their full
 *  detail ONLY on SUBMITTED rows, the one status the grade write
 *  accepts: IN_PROGRESS answers are mid-exam (serving them buys nothing
 *  but leakage) and EXPIRED ones are terminal — both keep the honest
 *  count but ship an empty array. */
export interface TemplateAttemptItem {
  id: string;
  studentId: string;
  studentName: string;
  status: AttemptStatus;
  startedAt: Date;
  submittedAt: Date | null;
  score: number | null;
  maxScore: number;
  pendingReview: number;
  pendingAnswers: PendingAnswerDetail[];
}

/** The human-readable form of one parked answer (module-private helper
 *  of attemptListRow): the chosen option's text when the index points
 *  into the choices, the prose otherwise, null when nothing was
 *  written — never an empty string. */
function answerTextForGrader(ans: {
  answerText: string | null;
  choiceIndex: number | null;
  question: { choices: unknown };
}): string | null {
  const choices = Array.isArray(ans.question.choices) ? ans.question.choices : null;
  if (ans.choiceIndex !== null && choices !== null && ans.choiceIndex >= 0 && ans.choiceIndex < choices.length) {
    return String(choices[ans.choiceIndex]);
  }
  return ans.answerText !== null && ans.answerText.trim() !== '' ? ans.answerText : null;
}

/** Pure row builder of the attempts list — Decimal columns are
 *  converted here (res.json would serialize them as strings; the
 *  platform's /exams/me convention). */
export function attemptListRow(a: TemplateAttemptSource, points: QuestionPoints): TemplateAttemptItem {
  const pending = a.answers.filter((ans) => ans.isCorrect === null);
  return {
    id: a.id,
    studentId: a.student.id,
    studentName: `${a.student.firstName} ${a.student.lastName}`.trim(),
    status: a.status,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    score: a.score === null ? null : Number(a.score),
    maxScore: Number(a.maxScore),
    pendingReview: pending.length,
    pendingAnswers:
      a.status === AttemptStatus.SUBMITTED
        ? pending.map((ans) => ({
            answerId: ans.id,
            questionId: ans.questionId,
            prompt: ans.question.prompt,
            type: ans.question.type,
            points: points.get(ans.questionId) ?? 0,
            studentAnswer: answerTextForGrader(ans),
          }))
        : [],
  };
}

/**
 * GET /exams/templates/:id/attempts — the attempts of one template for
 * the manual-grading surface: the read half of the workflow the POST
 * grade route below completes (SUBMITTED essays/keyless shorts parked
 * forever with no surface to reach them — 18-F1 hand-off #3).
 * Authorization mirrors the grade route exactly.
 */
router.get(
  '/exams/templates/:id/attempts',
  requireRole(...EXAM_GRADING_ROLES),
  async (req, res, next) => {
    try {
      const template = await prisma.examTemplate.findUnique({
        where: { id: req.params.id },
        include: {
          questions: {
            select: { questionId: true, pointsOverride: true, question: { select: { points: true } } },
          },
        },
      });
      if (!template) throw AppError.notFound('قالب الاختبار غير موجود');

      const access = decideAttemptsAccess(template, { id: req.user!.id, role: req.user!.role });
      if (!access.ok) throw AppError.forbidden('هذا الاختبار ليس من إنشائك');
      if (access.via === 'offering') {
        await assertOwnsOffering(access.offeringId, req.user!.id, req.user!.role);
      }

      const status = parseAttemptStatusFilter(req.query.status);
      const attempts = await prisma.examAttempt.findMany({
        where: { templateId: template.id, ...(status ? { status } : {}) },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          answers: {
            select: {
              id: true,
              questionId: true,
              isCorrect: true,
              answerText: true,
              choiceIndex: true,
              question: { select: { prompt: true, type: true, choices: true } },
            },
          },
        },
        // Newest first via startedAt — every row has one (submittedAt is
        // null mid-exam, which Postgres would sort AHEAD of DESC dates).
        orderBy: { startedAt: 'desc' },
        // Bounded read: a template's realistic attempt population (a
        // class roster, practice-exam retakes included) stays far below
        // this cap.
        take: 200,
      });

      const points = templateQuestionPoints(template.questions);
      res.json({ data: attempts.map((a) => attemptListRow(a, points)) });
    } catch (e) { next(e); }
  },
);

export const manualGradeSchema = z.object({
  answers: z.array(z.object({
    answerId: z.string().cuid(),
    isCorrect: z.boolean(),
    feedback: z.string().trim().max(2000).optional(),
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
      if (!attempt) throw AppError.notFound('المحاولة غير موجودة');

      // Authorization: the teacher who owns the exam's offering
      // (assertOwnsOffering — OWNER bypass, ADMIN via
      // CURRICULUM_EDIT_ANY); faculty-wide templates without an
      // offering belong to their author.
      if (attempt.template.offeringId) {
        await assertOwnsOffering(attempt.template.offeringId, req.user!.id, req.user!.role);
      } else if (req.user!.role !== Role.OWNER && attempt.template.authorId !== req.user!.id) {
        throw AppError.forbidden('هذا الاختبار ليس من إنشائك');
      }

      // Manual grading is the SUBMITTED → GRADED transition: it exists
      // for attempts the auto-grader parked because answers need a
      // human decision.
      if (attempt.status !== 'SUBMITTED') throw AppError.conflict('هذه المحاولة ليست بانتظار التصحيح اليدوي');

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
        if (claim.count === 0) throw AppError.conflict('هذه المحاولة ليست بانتظار التصحيح اليدوي');
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
