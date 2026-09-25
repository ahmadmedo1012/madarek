import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

// Current student's enrollments with the course detail the student
// surfaces consume. Non-student callers (teacher/admin/owner previewing)
// get an empty list rather than a 403 — these /me endpoints are
// personal-data shaped, not security boundaries, so a generic "no data"
// response is the right shape for the React Query cache.
//
// The select mirrors the frontend `MyEnrollment` contract exactly
// (hooks/useResources.ts): id/progressPct + offering id/room + the
// course display fields + teacher name + schedule slots. Unlisted model
// fields (course description/nameEn/timestamps, offering term/capacity,
// enrollment status/enrolledAt…) are deliberately not shipped on the
// personal feed.
router.get('/me', async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) {
      res.json({ data: [] });
      return;
    }
    const data = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      select: {
        id: true,
        progressPct: true,
        offering: {
          select: {
            id: true,
            room: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
                iconEmoji: true,
                themeColor: true,
                credits: true,
                department: { select: { id: true, name: true } },
              },
            },
            teacher: { select: { id: true, firstName: true, lastName: true } },
            schedule: {
              select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true },
            },
          },
        },
      },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

const enrollSchema = z
  .object({
    studentId: z.string().cuid(),
    offeringId: z.string().cuid(),
  })
  .strict();

// Admin enrolls a student into an offering.
router.post('/', requireRole(Role.ADMIN, Role.OWNER), validate(enrollSchema), async (req, res, next) => {
  try {
    const { studentId, offeringId } = req.body as z.infer<typeof enrollSchema>;
    // Enforce CourseOffering.capacity: concurrent enrolls are serialized per
    // offering via SELECT … FOR UPDATE, then the count is checked inside the
    // transaction so the seat can't be oversold.
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "CourseOffering" WHERE id = ${offeringId} FOR UPDATE`;
      const offering = await tx.courseOffering.findUnique({
        where: { id: offeringId },
        // Only 'active' enrollments hold a seat — the platform-wide
        // convention (lib/permissions.ts decideOfferingAccess grants
        // content access on 'active' rows only). No code path writes
        // another status today, so this filter is a no-op until an
        // enrollment state machine exists (audit 11-c P2-11,
        // report-only); it is here so a future 'dropped' status frees
        // the seat instead of squatting on it forever.
        select: {
          capacity: true,
          _count: { select: { enrollments: { where: { status: 'active' } } } },
        },
      });
      if (!offering) throw AppError.notFound('Offering not found');
      // Pre-validate the target: a TEACHER/ADMIN/OWNER id passes zod's
      // cuid check, but enrolling a non-student must fail with a clean
      // 400 — not a generic FK error — and an unknown id is a 404
      // (audit 11-c P2-12).
      const student = await tx.user.findUnique({
        where: { id: studentId },
        select: { role: true },
      });
      if (!student) throw AppError.notFound('Student not found');
      if (student.role !== Role.STUDENT) {
        throw AppError.badRequest('Enrollment target must be a STUDENT');
      }
      if (offering._count.enrollments >= offering.capacity) {
        throw AppError.conflict('Offering is at capacity');
      }
      // @@unique([studentId, offeringId]) is the race-safe backstop; this
      // explicit check just upgrades the generic P2002 "Duplicate value"
      // to a precise conflict message. Same-offering attempts are
      // serialized by the row lock above, so it cannot be raced past.
      const existing = await tx.enrollment.findUnique({
        where: { studentId_offeringId: { studentId, offeringId } },
        select: { id: true },
      });
      if (existing) {
        throw AppError.conflict('Student is already enrolled in this offering');
      }
      const enrollment = await tx.enrollment.create({ data: { studentId, offeringId } });
      // Seat changes are governance-visible mutations — write the audit
      // row in the SAME transaction (never a seat without a trail).
      await tx.auditLog.create({
        data: {
          action: 'ENROLLMENT_CREATED',
          resourceType: 'Enrollment',
          resourceId: enrollment.id,
          userId: req.user!.id,
          metadata: { studentId, offeringId },
        },
      });
      return enrollment;
    });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

// Seat removal — hard delete (no drop/complete state machine exists;
// audit 11-c P2-11 is report-only pending a schema change). The audit
// row goes in the SAME transaction as the delete: previously seat
// removals were the one unaudited admin mutation in the identity
// family, leaving a governance blind spot (audit 11-c P2-12).
router.delete('/:id', requireRole(Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      // delete() returns the removed row (or throws P2025 → 404 via the
      // error handler) — its fields feed the audit metadata.
      const removed = await tx.enrollment.delete({ where: { id: req.params.id! } });
      await tx.auditLog.create({
        data: {
          action: 'ENROLLMENT_REMOVED',
          resourceType: 'Enrollment',
          resourceId: removed.id,
          userId: req.user!.id,
          metadata: {
            studentId: removed.studentId,
            offeringId: removed.offeringId,
            status: removed.status,
            progressPct: removed.progressPct,
          },
        },
      });
      return removed;
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
