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
router.get('/me', async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) throw AppError.forbidden();
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
router.post('/', requireRole(Role.ADMIN), validate(enrollSchema), async (req, res, next) => {
  try {
    const created = await prisma.enrollment.create({ data: req.body });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    await prisma.enrollment.delete({ where: { id: req.params.id! } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
