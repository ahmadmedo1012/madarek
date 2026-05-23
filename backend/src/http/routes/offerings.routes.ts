import { Router } from 'express';
import { AssignmentType, AttendanceStatus, GradeKind, MaterialType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

// Helper: ensure user can read this offering (admin, teacher of it, or enrolled student)
async function assertOfferingAccess(offeringId: string, userId: string, role: Role) {
  if (role === Role.ADMIN) return;
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: { enrollments: { where: { studentId: userId }, take: 1 } },
  });
  if (!offering) throw AppError.notFound('Offering not found');
  if (role === Role.TEACHER && offering.teacherId === userId) return;
  if (role === Role.STUDENT && offering.enrollments.length > 0) return;
  throw AppError.forbidden();
}

router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id!;
    await assertOfferingAccess(id, req.user!.id, req.user!.role);
    const offering = await prisma.courseOffering.findUnique({
      where: { id },
      include: {
        course: { include: { department: { include: { faculty: true } } } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        schedule: true,
      },
    });
    res.json({ data: offering });
  } catch (e) {
    next(e);
  }
});

// ─── Materials ───
router.get('/:id/materials', async (req, res, next) => {
  try {
    await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
    const data = await prisma.material.findMany({
      where: { offeringId: req.params.id! },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

const materialCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    type: z.nativeEnum(MaterialType),
    sizeBytes: z.number().int().nonnegative().default(0),
    url: z.string().url().max(500),
  })
  .strict();

router.post(
  '/:id/materials',
  requireRole(Role.TEACHER, Role.ADMIN),
  validate(materialCreateSchema),
  async (req, res, next) => {
    try {
      await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
      const created = await prisma.material.create({
        data: {
          ...req.body,
          sizeBytes: BigInt(req.body.sizeBytes ?? 0),
          offeringId: req.params.id!,
          uploaderId: req.user!.id,
        },
      });
      res.status(201).json({ data: { ...created, sizeBytes: created.sizeBytes.toString() } });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Assignments ───
router.get('/:id/assignments', async (req, res, next) => {
  try {
    await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
    const data = await prisma.assignment.findMany({
      where: { offeringId: req.params.id! },
      orderBy: { dueAt: 'asc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

const assignmentCreateSchema = z
  .object({
    title: z.string().min(2).max(200),
    description: z.string().max(4000).optional(),
    type: z.nativeEnum(AssignmentType),
    dueAt: z.coerce.date(),
    weight: z.number().int().min(0).max(100).default(10),
    maxScore: z.number().int().positive().default(100),
  })
  .strict();

router.post(
  '/:id/assignments',
  requireRole(Role.TEACHER, Role.ADMIN),
  validate(assignmentCreateSchema),
  async (req, res, next) => {
    try {
      await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
      const created = await prisma.assignment.create({
        data: { ...req.body, offeringId: req.params.id! },
      });
      res.status(201).json({ data: created });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Grades ───
router.get('/:id/grades', async (req, res, next) => {
  try {
    await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
    const where = {
      offeringId: req.params.id!,
      // Students may only see their own grades.
      ...(req.user!.role === Role.STUDENT ? { studentId: req.user!.id } : {}),
    };
    const data = await prisma.grade.findMany({
      where,
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { recordedAt: 'desc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

const gradesUpsertSchema = z
  .object({
    grades: z
      .array(
        z.object({
          studentId: z.string().cuid(),
          kind: z.nativeEnum(GradeKind),
          score: z.number().min(0).max(100),
          maxScore: z.number().int().positive().default(100),
          weight: z.number().int().min(0).max(100).default(10),
          feedback: z.string().max(2000).optional(),
        }),
      )
      .min(1)
      .max(200),
  })
  .strict();

router.post(
  '/:id/grades',
  requireRole(Role.TEACHER, Role.ADMIN),
  validate(gradesUpsertSchema),
  async (req, res, next) => {
    try {
      const offeringId = req.params.id!;
      await assertOfferingAccess(offeringId, req.user!.id, req.user!.role);
      const ops = (req.body.grades as z.infer<typeof gradesUpsertSchema>['grades']).map((g) =>
        prisma.grade.upsert({
          where: { offeringId_studentId_kind: { offeringId, studentId: g.studentId, kind: g.kind } },
          create: { offeringId, ...g },
          update: { score: g.score, maxScore: g.maxScore, weight: g.weight, feedback: g.feedback },
        }),
      );
      const result = await prisma.$transaction(ops);
      res.status(201).json({ data: result });
    } catch (e) {
      next(e);
    }
  },
);

// ─── Attendance ───
const attendanceUpsertSchema = z
  .object({
    date: z.coerce.date(),
    topic: z.string().max(200).optional(),
    records: z
      .array(
        z.object({
          studentId: z.string().cuid(),
          status: z.nativeEnum(AttendanceStatus),
          notes: z.string().max(500).optional(),
        }),
      )
      .min(1)
      .max(500),
  })
  .strict();

router.post(
  '/:id/attendance',
  requireRole(Role.TEACHER, Role.ADMIN),
  validate(attendanceUpsertSchema),
  async (req, res, next) => {
    try {
      const offeringId = req.params.id!;
      await assertOfferingAccess(offeringId, req.user!.id, req.user!.role);
      const { date, topic, records } = req.body as z.infer<typeof attendanceUpsertSchema>;
      const session = await prisma.attendanceSession.upsert({
        where: { offeringId_date: { offeringId, date } },
        create: { offeringId, date, topic },
        update: { topic },
      });
      const ops = records.map((r) =>
        prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: r.studentId } },
          create: { sessionId: session.id, studentId: r.studentId, status: r.status, notes: r.notes },
          update: { status: r.status, notes: r.notes },
        }),
      );
      await prisma.$transaction(ops);
      res.status(201).json({ data: { sessionId: session.id, count: records.length } });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/:id/attendance', async (req, res, next) => {
  try {
    await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
    const sessions = await prisma.attendanceSession.findMany({
      where: { offeringId: req.params.id! },
      include: {
        records: {
          ...(req.user!.role === Role.STUDENT ? { where: { studentId: req.user!.id } } : {}),
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });
    res.json({ data: sessions });
  } catch (e) {
    next(e);
  }
});

export default router;
