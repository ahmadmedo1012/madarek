import { Router } from 'express';
import { AssignmentType, AttendanceStatus, GradeKind, MaterialType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { assertOfferingAccess } from '../../lib/permissions.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

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
    // assertOfferingAccess short-circuits for ADMIN/OWNER without an
    // existence check — a deleted/unknown id used to serialize as
    // `{ data: null }` instead of a 404 (audit P2-12).
    if (!offering) throw AppError.notFound('Offering not found');
    res.json({ data: offering });
  } catch (e) {
    next(e);
  }
});

// ─── Materials ───
router.get('/:id/materials', async (req, res, next) => {
  try {
    await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
    // Bounded read (audit P2-18): newest materials first, capped well
    // above a realistic per-offering material count.
    const data = await prisma.material.findMany({
      where: { offeringId: req.params.id! },
      orderBy: { createdAt: 'desc' },
      take: 200,
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
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(materialCreateSchema),
  async (req, res, next) => {
    try {
      await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
      const created = await prisma.material.create({
        data: {
          ...req.body,
          // zod's `.default(0)` guarantees a number here — the old
          // `?? 0` fallback was dead code (audit P2-15).
          sizeBytes: BigInt(req.body.sizeBytes),
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
    // Bounded read (audit P2-18): soonest-due first, capped well above
    // a realistic per-offering assignment count.
    const data = await prisma.assignment.findMany({
      where: { offeringId: req.params.id! },
      orderBy: { dueAt: 'asc' },
      take: 200,
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
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
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
      // Bounded read (audit P2-18): covers roster × the 6 GradeKind
      // values with margin; students are pre-filtered to their own rows.
      take: 500,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

const gradeItemSchema = z
  .object({
    studentId: z.string().cuid(),
    kind: z.nativeEnum(GradeKind),
    score: z.number().min(0).max(100),
    maxScore: z.number().int().positive().default(100),
    weight: z.number().int().min(0).max(100).default(10),
    feedback: z.string().max(2000).optional(),
  })
  .superRefine((g, ctx) => {
    // Cross-field validation (audit P2-15): score must fit within
    // maxScore — `score: 90, maxScore: 50` used to store as 180%.
    if (g.score > g.maxScore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['score'],
        message: `score (${g.score}) must not exceed maxScore (${g.maxScore})`,
      });
    }
  });

const gradesUpsertSchema = z
  .object({
    grades: z.array(gradeItemSchema).min(1).max(200),
  })
  .strict();

router.post(
  '/:id/grades',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(gradesUpsertSchema),
  async (req, res, next) => {
    try {
      const offeringId = req.params.id!;
      await assertOfferingAccess(offeringId, req.user!.id, req.user!.role);
      const grades = req.body.grades as z.infer<typeof gradesUpsertSchema>['grades'];

      // Every studentId must be an enrolled student of this offering —
      // otherwise grades could be recorded for arbitrary users.
      const studentIds = Array.from(new Set(grades.map((g) => g.studentId)));
      const enrolled = await prisma.enrollment.findMany({
        where: { offeringId, studentId: { in: studentIds } },
        select: { studentId: true },
      });
      const enrolledSet = new Set(enrolled.map((e) => e.studentId));
      if (studentIds.some((id) => !enrolledSet.has(id))) {
        throw AppError.badRequest('Grades contain students not enrolled in this offering');
      }

      const ops = grades.map((g) =>
        prisma.grade.upsert({
          where: { offeringId_studentId_kind: { offeringId, studentId: g.studentId, kind: g.kind } },
          create: { offeringId, ...g },
          // `feedback: g.feedback ?? null` — absent feedback now CLEARS
          // the stored value instead of silently keeping the previous
          // one (a full-payload upsert could never clear it, P2-15).
          update: { score: g.score, maxScore: g.maxScore, weight: g.weight, feedback: g.feedback ?? null },
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
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(attendanceUpsertSchema),
  async (req, res, next) => {
    try {
      const offeringId = req.params.id!;
      await assertOfferingAccess(offeringId, req.user!.id, req.user!.role);
      const { date, topic, records } = req.body as z.infer<typeof attendanceUpsertSchema>;
      // Every studentId must be an enrolled student of this offering —
      // otherwise attendance could be recorded for arbitrary users.
      const studentIds = Array.from(new Set(records.map((r) => r.studentId)));
      const enrolled = await prisma.enrollment.findMany({
        where: { offeringId, studentId: { in: studentIds } },
        select: { studentId: true },
      });
      const enrolledSet = new Set(enrolled.map((e) => e.studentId));
      if (studentIds.some((id) => !enrolledSet.has(id))) {
        throw AppError.badRequest('Records contain students not enrolled in this offering');
      }

      // Wrap session upsert + record upserts in a SINGLE transaction so
      // the session can't exist with no records if the records fail
      // (silent data loss). Previously the session upsert ran outside
      // the $transaction(ops) call.
      const result = await prisma.$transaction(async (tx) => {
        const session = await tx.attendanceSession.upsert({
          where: { offeringId_date: { offeringId, date } },
          create: { offeringId, date, topic },
          update: { topic },
        });
        await Promise.all(records.map((r) =>
          tx.attendanceRecord.upsert({
            where: { sessionId_studentId: { sessionId: session.id, studentId: r.studentId } },
            create: { sessionId: session.id, studentId: r.studentId, status: r.status, notes: r.notes },
            update: { status: r.status, notes: r.notes },
          }),
        ));
        return session;
      });
      res.status(201).json({ data: { sessionId: result.id, count: records.length } });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/:id/attendance', async (req, res, next) => {
  try {
    await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
    // Bounded reads (audit P2-18): sessions newest-first (a term holds
    // far fewer than the cap); per-session records are bounded by the
    // roster size, and the explicit orderBy keeps the take deterministic
    // (take without orderBy yields an arbitrary subset).
    const sessions = await prisma.attendanceSession.findMany({
      where: { offeringId: req.params.id! },
      include: {
        records: {
          ...(req.user!.role === Role.STUDENT ? { where: { studentId: req.user!.id } } : {}),
          take: 500,
          orderBy: { studentId: 'asc' },
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json({ data: sessions });
  } catch (e) {
    next(e);
  }
});

export default router;
