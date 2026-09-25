import { Router } from 'express';
import { z } from 'zod';
import { NotificationType, Role, SubmissionStatus } from '@prisma/client';
import type { Submission } from '@prisma/client';
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

/**
 * Statuses a re-submission may overwrite. GRADED/RETURNED rows are
 * immutable from the student side — the conditional update in the
 * submit handler enforces this atomically (no check-then-write window).
 * The teacher-side counterpart of this contract is the grade claim's
 * optimistic `submittedAt` guard below: every student write stamps a
 * fresh `submittedAt`, so a row still carrying the `submittedAt` the
 * teacher read cannot have been re-submitted since.
 */
export const RESUBMITTABLE_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.LATE,
  SubmissionStatus.DRAFT,
];

/**
 * The write a student (re)submission applies — absent optional fields
 * normalize to null so a re-submission clears the dimension the student
 * dropped. `submittedAt` is always stamped fresh: it doubles as the
 * optimistic-concurrency token the teacher grade claim pins against
 * (audit 15-b P2-4), so every student write must move it.
 */
export function buildSubmissionWrite(
  body: Pick<z.infer<typeof submitBodySchema>, 'textAnswer' | 'fileUrl'>,
  status: SubmissionStatus,
  submittedAt: Date = new Date(),
) {
  return {
    textAnswer: body.textAnswer ?? null,
    fileUrl: body.fileUrl ?? null,
    status,
    submittedAt,
  };
}

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

      // Offering-level access: the student must be ACTIVELY enrolled —
      // assertOfferingAccess filters enrollment rows by status 'active'
      // server-side (lib/permissions.ts), so dropped/completed
      // enrollments are rejected here. The former inline duplicate of
      // this check was removed once the shared guard took over the
      // status filter (wave 12-8).
      await assertOfferingAccess(offeringId, studentId, Role.STUDENT);

      // Assignment must exist AND belong to the offering in the path.
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { offeringId: true, dueAt: true },
      });
      if (!assignment || assignment.offeringId !== offeringId) {
        throw AppError.notFound('Assignment not found');
      }

      const status = submissionStatusFor(assignment.dueAt);

      // First-ever submission? (milestone fires after a successful write).
      const priorSubmissions = await prisma.submission.count({ where: { studentId } });

      // Re-submitting an already-graded/returned submission is not
      // allowed. The guard IS the update's WHERE clause: only rows still
      // in a re-submittable state match, so a teacher grade landing
      // mid-request can never be stomped back to SUBMITTED with its
      // grade/gradedAt still attached (audit 11-d P2-15). Under READ
      // COMMITTED, Postgres re-evaluates the predicate against the
      // concurrently committed row — the losing write matches zero rows.
      const submittedAt = new Date();
      const write = buildSubmissionWrite(body, status, submittedAt);
      const claim = await prisma.submission.updateMany({
        where: { assignmentId, studentId, status: { in: RESUBMITTABLE_STATUSES } },
        data: write,
      });

      let submission: Submission;
      if (claim.count === 0) {
        // No re-submittable row: either nothing was ever submitted
        // (create below) or the existing row is graded/returned (409).
        const existing = await prisma.submission.findUnique({
          where: { assignmentId_studentId: { assignmentId, studentId } },
          select: { status: true },
        });
        if (existing) {
          throw AppError.conflict('لا يمكن إعادة تسليم تكليف تم تصحيحه');
        }
        // Two concurrent first-ever submissions race here: the unique
        // (assignmentId, studentId) constraint turns the loser's create
        // into a P2002 → 409 (centralized error handler).
        submission = await prisma.submission.create({
          data: { assignmentId, studentId, ...write },
        });
      } else {
        // updateMany returns no row — read back what was written.
        const updated = await prisma.submission.findUnique({
          where: { assignmentId_studentId: { assignmentId, studentId } },
        });
        if (!updated) {
          // Unreachable barring a mid-request cascade delete of the row.
          throw AppError.internal();
        }
        submission = updated;
      }

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

      // Teacher must own the offering FIRST (ADMIN via CURRICULUM_EDIT_ANY,
      // OWNER bypass) — a teacher probing foreign submission IDs must not
      // learn the assignment's maxScore from the ceiling error below
      // (audit 11-d P2-14).
      await assertOwnsOffering(submission.assignment.offeringId, req.user!.id, req.user!.role);

      // Grade ceiling is per-assignment (dynamic → checked here, not in zod).
      if (grade > submission.assignment.maxScore) {
        throw AppError.badRequest(`الدرجة يجب ألا تتجاوز الحد الأقصى (${submission.assignment.maxScore})`);
      }

      const gradedAt = new Date();
      const updated = await prisma.$transaction(async (tx) => {
        // Optimistic `submittedAt` guard (audit 15-b P2-4): the student
        // side rewrites `submittedAt` on every (re)submission, so it is a
        // content version stamp. Pinning the grade write to the
        // `submittedAt` we validated against means a resubmission that
        // committed between the read above and this claim matches zero
        // rows — the grade can never land on content the teacher never
        // saw (which would also lock the student out: resubmission 409s
        // on GRADED rows). Under READ COMMITTED the WHERE re-evaluates
        // against the concurrently committed row; the losing teacher
        // reloads and re-grades. Re-grading still works: grading does
        // not touch `submittedAt`, so a second pass matches again.
        const claim = await tx.submission.updateMany({
          where: { id: submissionId, submittedAt: submission.submittedAt },
          data: {
            grade,
            feedback: feedback ?? null,
            status: SubmissionStatus.GRADED,
            gradedAt,
          },
        });
        if (claim.count === 0) {
          throw AppError.conflict('Submission changed while grading — reload and re-grade');
        }
        await tx.notification.create({
          data: {
            userId: submission.studentId,
            type: NotificationType.ACADEMIC,
            icon: '📊',
            title: 'تم تصحيح تكليفك',
            body: `حصلت على ${grade} من ${submission.assignment.maxScore} في «${submission.assignment.title}»`,
          },
        });
        // updateMany returns no row — read back what was written.
        const row = await tx.submission.findUnique({ where: { id: submissionId } });
        if (!row) {
          // Unreachable barring a mid-request cascade delete of the row.
          throw AppError.internal();
        }
        return row;
      });

      res.json({ data: { ...updated, grade: updated.grade === null ? null : Number(updated.grade) } });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
