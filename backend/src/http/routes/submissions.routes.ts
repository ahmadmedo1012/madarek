import { Router } from 'express';
import { z } from 'zod';
import { NotificationType, Role, SubmissionStatus } from '@prisma/client';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertOfferingAccess, assertOwnsOffering } from '../../lib/permissions.js';
import { fireMilestone } from '../../modules/milestones/service.js';

/**
 * Submissions — student assignment submission + teacher grading.
 *
 * Contract (shared with the frontend agent):
 *   POST /api/v1/offerings/:offeringId/assignments/:assignmentId/submit   (STUDENT)
 *   POST /api/v1/submissions/:id/grade                                    (TEACHER/ADMIN/OWNER)
 *
 * Mounted by app.ts at the `/api/v1` prefix.
 */

const router = Router();
router.use(authMiddleware);

// ─── Pure logic (exported for DB-free unit tests) ─────────────────

/**
 * Late vs on-time status for a submission happening at `at`
 * against an assignment due at `dueAt`.
 */
export function submissionStatusFor(dueAt: Date, at: Date = new Date()): SubmissionStatus {
  return at > dueAt ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;
}

/** Submissions may reference an external https URL or a paper served by our own files API. */
export const SUBMISSION_FILE_URL_PATTERN = /^https:\/\/|^\/api\/v1\/files\/papers\//;

export const submitBodySchema = z
  .object({
    textAnswer: z.string().min(1).max(8000).optional(),
    fileUrl: z
      .string()
      .max(500)
      .refine((s) => SUBMISSION_FILE_URL_PATTERN.test(s), {
        message: 'fileUrl must start with https:// or /api/v1/files/papers/',
      })
      .optional(),
  })
  .strict()
  .refine((b) => (b.textAnswer !== undefined && b.textAnswer.trim().length > 0) || (b.fileUrl !== undefined && b.fileUrl.length > 0), {
    message: 'At least one of textAnswer or fileUrl is required',
  });

/**
 * Grade body. `grade` must be a finite number with at most 2 decimal
 * places and >= 0; the upper bound (assignment.maxScore) is checked in
 * the handler after the assignment is loaded (it is per-assignment).
 */
export const gradeBodySchema = z
  .object({
    grade: z
      .number()
      .finite()
      .min(0)
      .refine((v) => Math.round(v * 100) === v * 100, {
        message: 'grade supports at most 2 decimal places',
      }),
    feedback: z.string().max(2000).optional(),
  })
  .strict();

// ─── POST /offerings/:offeringId/assignments/:assignmentId/submit ──

router.post(
  '/offerings/:offeringId/assignments/:assignmentId/submit',
  requireRole(Role.STUDENT),
  validate(submitBodySchema),
  async (req, res, next) => {
    try {
      const { offeringId, assignmentId } = req.params as { offeringId: string; assignmentId: string };
      const studentId = req.user!.id;
      const body = req.body as z.infer<typeof submitBodySchema>;

      // Offering-level access (student must be able to read the offering).
      await assertOfferingAccess(offeringId, studentId, Role.STUDENT);

      // Explicit active-enrollment guard (assertOfferingAccess counts any
      // enrollment row regardless of status).
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, offeringId, status: 'active' },
        select: { id: true },
      });
      if (!enrollment) throw AppError.forbidden('يجب أن تكون مسجلاً في هذا المقرر لتسليم التكليف');

      // Assignment must exist AND belong to the offering in the path.
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { offeringId: true, dueAt: true },
      });
      if (!assignment || assignment.offeringId !== offeringId) {
        throw AppError.notFound('Assignment not found');
      }

      const status = submissionStatusFor(assignment.dueAt);

      // Re-submitting an already-graded/returned submission is not allowed —
      // check BEFORE the upsert so a graded row can never be stomped.
      const existing = await prisma.submission.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        select: { status: true },
      });
      if (existing && (existing.status === SubmissionStatus.GRADED || existing.status === SubmissionStatus.RETURNED)) {
        throw AppError.conflict('لا يمكن إعادة تسليم تكليف تم تصحيحه');
      }

      // First-ever submission? (milestone fires after a successful write).
      const priorSubmissions = await prisma.submission.count({ where: { studentId } });

      const submission = await prisma.submission.upsert({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        create: {
          assignmentId,
          studentId,
          textAnswer: body.textAnswer ?? null,
          fileUrl: body.fileUrl ?? null,
          status,
          submittedAt: new Date(),
        },
        update: {
          // Re-submit before grading: overwrite answer, reset status/submittedAt.
          textAnswer: body.textAnswer ?? null,
          fileUrl: body.fileUrl ?? null,
          status,
          submittedAt: new Date(),
        },
      });

      // 'first-assignment-complete' milestone — best-effort, never blocks the submission.
      if (priorSubmissions === 0) {
        try {
          await fireMilestone(studentId, 'first-assignment-complete');
        } catch (err) {
          logger.warn({ err, studentId }, 'first-assignment-complete milestone fire failed (submission unaffected)');
        }
      }

      res.status(201).json({
        data: { ...submission, grade: submission.grade === null ? null : Number(submission.grade) },
      });
    } catch (e) {
      next(e);
    }
  },
);

// ─── POST /submissions/:id/grade ───────────────────────────────────

router.post(
  '/submissions/:id/grade',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(gradeBodySchema),
  async (req, res, next) => {
    try {
      const submissionId = req.params.id!;
      const { grade, feedback } = req.body as z.infer<typeof gradeBodySchema>;

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          assignment: { select: { offeringId: true, maxScore: true, title: true } },
          student: { select: { firstName: true, lastName: true } },
        },
      });
      if (!submission) throw AppError.notFound('Submission not found');

      // Grade ceiling is per-assignment (dynamic → checked here, not in zod).
      if (grade > submission.assignment.maxScore) {
        throw new AppError('BAD_REQUEST', `الدرجة يجب ألا تتجاوز الحد الأقصى (${submission.assignment.maxScore})`, 400);
      }

      // Teacher must own the offering (ADMIN via CURRICULUM_EDIT_ANY, OWNER bypass).
      await assertOwnsOffering(submission.assignment.offeringId, req.user!.id, req.user!.role);

      const gradedAt = new Date();
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.submission.update({
          where: { id: submissionId },
          data: {
            grade,
            feedback: feedback ?? null,
            status: SubmissionStatus.GRADED,
            gradedAt,
          },
        });
        await tx.notification.create({
          data: {
            userId: submission.studentId,
            type: NotificationType.ACADEMIC,
            icon: '📊',
            title: 'تم تصحيح تكليفك',
            body: `حصلت على ${grade} من ${submission.assignment.maxScore} في «${submission.assignment.title}»`,
          },
        });
        return row;
      });

      res.json({ data: { ...updated, grade: updated.grade === null ? null : Number(updated.grade) } });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
