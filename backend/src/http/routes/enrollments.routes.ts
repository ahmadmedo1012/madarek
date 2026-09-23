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

// Current student's enrollments with full course detail.
// Non-student callers (teacher/admin/owner previewing) get an empty list
// rather than a 403 — these /me endpoints are personal-data shaped, not
// security boundaries, so a generic "no data" response is the right
// shape for the React Query cache.
router.get('/me', async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) {
      res.json({ data: [] });
      return;
    }
    const data = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      include: {
        offering: {
          include: {
            course: { include: { department: true } },
            teacher: { select: { id: true, firstName: true, lastName: true } },
            schedule: true,
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
        select: { capacity: true, _count: { select: { enrollments: true } } },
      });
      if (!offering) throw AppError.notFound('Offering not found');
      if (offering._count.enrollments >= offering.capacity) {
        throw AppError.conflict('Offering is at capacity');
      }
      return tx.enrollment.create({ data: { studentId, offeringId } });
    });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireRole(Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    await prisma.enrollment.delete({ where: { id: req.params.id! } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
