import { Router } from 'express';
import { z } from 'zod';
import { DifficultyLevel, ExamKind, ExamStatus, QuestionType, AttemptStatus, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertOwnsOffering } from '../../lib/permissions.js';

const router = Router();
router.use(authMiddleware);

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

const createQuestionSchema = z.object({
  categoryId: z.string().cuid(),
  type: z.nativeEnum(QuestionType),
  prompt: z.string().min(5).max(2000),
  choices: z.array(z.string().max(500)).optional(),
  correctAnswer: z.union([z.string(), z.number(), z.boolean()]).optional(),
  difficulty: z.nativeEnum(DifficultyLevel).default('MEDIUM'),
  points: z.number().int().min(1).max(20).default(1),
  tags: z.array(z.string().max(40)).max(8).default([]),
}).strict();

router.post('/question-bank', requireCapability('EXAMS_AUTHOR'), validate(createQuestionSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createQuestionSchema>;
    if ((body.type === 'MCQ' || body.type === 'TRUE_FALSE') && (!body.choices || body.choices.length < 2)) {
      throw new AppError('BAD_REQUEST', 'MCQ/TF questions need at least 2 choices', 400);
    }
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
        // Auto-approve own questions if author also has EXAMS_MODERATE
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

const createTemplateSchema = z.object({
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
}).strict();

router.post('/exams/templates', requireCapability('EXAMS_AUTHOR'), validate(createTemplateSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createTemplateSchema>;
    if (body.offeringId) {
      await assertOwnsOffering(body.offeringId, req.user!.id, req.user!.role);
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
    else if (role === 'STUDENT') where.status = 'PUBLISHED';
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

    res.json({
      data: {
        ...template,
        // Hide answers for non-authors / non-moderators
        questions: template.questions.map((eq) => ({
          ...eq,
          question: {
            ...eq.question,
            correctAnswer: req.user!.role === 'TEACHER' || req.user!.role === 'QUALITY' || req.user!.role === 'ADMIN'
              ? eq.question.correctAnswer
              : null,
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
      throw new AppError('BAD_REQUEST', 'Template must be APPROVED by quality before publishing', 400);
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

    const existing = await prisma.examAttempt.findFirst({
      where: { templateId: template.id, studentId: userId, status: { in: ['IN_PROGRESS', 'SUBMITTED', 'GRADED'] } },
      orderBy: { startedAt: 'desc' },
    });
    if (existing) {
      // Already attempted — return the existing one
      res.json({
        data: {
          attemptId: existing.id,
          status: existing.status,
          alreadyAttempted: true,
        },
      });
      return;
    }

    const expiresAt = new Date(Date.now() + template.durationMin * 60_000);
    const maxScore = template.questions.reduce((s, eq) => s + (eq.pointsOverride ?? eq.question.points), 0);

    const attempt = await prisma.examAttempt.create({
      data: {
        templateId: template.id,
        studentId: userId,
        expiresAt,
        maxScore,
      },
    });

    // Optional shuffle on randomized templates
    let serializedQs = template.questions.slice();
    if (template.randomized) {
      serializedQs = serializedQs.sort(() => Math.random() - 0.5);
    }

    res.status(201).json({
      data: {
        attemptId: attempt.id,
        expiresAt,
        durationMin: template.durationMin,
        title: template.title,
        questions: serializedQs.map((eq) => ({
          id: eq.question.id,
          type: eq.question.type,
          prompt: eq.question.prompt,
          choices: eq.question.choices,
          points: eq.pointsOverride ?? eq.question.points,
        })),
      },
    });
  } catch (e) { next(e); }
});

const submitAnswerSchema = z.object({
  questionId: z.string().cuid(),
  answerText: z.string().max(4000).optional(),
  choiceIndex: z.number().int().min(0).max(20).optional(),
}).strict();

router.post(
  '/exams/attempts/:id/answer',
  requireRole(Role.STUDENT),
  validate(submitAnswerSchema),
  async (req, res, next) => {
    try {
      const attempt = await prisma.examAttempt.findUnique({ where: { id: req.params.id } });
      if (!attempt) throw AppError.notFound('Attempt not found');
      if (attempt.studentId !== req.user!.id) throw AppError.forbidden();
      if (attempt.status !== 'IN_PROGRESS') throw AppError.forbidden('Attempt closed');
      if (attempt.expiresAt < new Date()) throw AppError.forbidden('Attempt expired');

      await prisma.examAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: req.body.questionId } },
        update: {
          answerText: req.body.answerText ?? null,
          choiceIndex: req.body.choiceIndex ?? null,
        },
        create: {
          attemptId: attempt.id,
          questionId: req.body.questionId,
          answerText: req.body.answerText ?? null,
          choiceIndex: req.body.choiceIndex ?? null,
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

    // Auto-grade MCQ + TF + SHORT (exact match)
    let totalAwarded = 0;
    let needsManual = 0;
    const answerByQId = new Map(attempt.answers.map((a) => [a.questionId, a]));

    for (const eq of attempt.template.questions) {
      const q = eq.question;
      const ans = answerByQId.get(q.id);
      const points = eq.pointsOverride ?? q.points;
      if (!ans) continue;

      let awarded = 0;
      let isCorrect: boolean | null = null;

      if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
        const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : Number(q.correctAnswer);
        if (ans.choiceIndex !== null && ans.choiceIndex === correctIdx) {
          awarded = points;
          isCorrect = true;
        } else if (ans.choiceIndex !== null) {
          isCorrect = false;
        }
      } else if (q.type === 'SHORT') {
        const expected = String(q.correctAnswer ?? '').trim().toLowerCase();
        const submitted = (ans.answerText ?? '').trim().toLowerCase();
        if (expected && submitted) {
          // Tolerant: contains either way
          const norm = (s: string) => s.replace(/[\s,،.\-_/'"]+/g, ' ').trim();
          if (norm(submitted).includes(norm(expected)) || norm(expected).includes(norm(submitted))) {
            awarded = points;
            isCorrect = true;
          } else {
            isCorrect = false;
          }
        }
      } else if (q.type === 'ESSAY') {
        // Cannot auto-grade — leave for manual
        needsManual++;
      }

      totalAwarded += awarded;
      await prisma.examAnswer.update({
        where: { id: ans.id },
        data: { isCorrect, awardedPoints: awarded },
      });
    }

    const finalStatus: AttemptStatus = needsManual > 0 ? 'SUBMITTED' : 'GRADED';
    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: finalStatus,
        score: totalAwarded,
        submittedAt: new Date(),
      },
    });

    res.json({
      data: {
        score: totalAwarded,
        maxScore: Number(attempt.maxScore),
        status: finalStatus,
        needsManual,
        passed: totalAwarded / Number(attempt.maxScore) * 100 >= attempt.template.passingScore,
      },
    });
  } catch (e) { next(e); }
});

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
