import { Router } from 'express';
import { AssignmentType, GradeKind, MaterialType, Role } from '@prisma/client';
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

/**
 * Prisma `BigInt` columns crash `res.json` (TypeError → 500), so every
 * material row must stringify `sizeBytes` before it crosses the wire
 * (audits 15-i P1-5 + 15-c hand-off: this file's GET used to ship the
 * raw BigInt, making the endpoint 500 whenever a material existed,
 * while the POST one route below already stringified). A string is
 * also exact beyond Number.MAX_SAFE_INTEGER and matches the platform's
 * materials wire format (`GET /offerings/:id/full` ships strings too).
 */
export function serializeMaterial<T extends { sizeBytes: bigint }>(
  material: T,
): Omit<T, 'sizeBytes'> & { sizeBytes: string } {
  return { ...material, sizeBytes: material.sizeBytes.toString() };
}

router.get('/:id/materials', async (req, res, next) => {
  try {
    await assertOfferingAccess(req.params.id!, req.user!.id, req.user!.role);
    // Bounded read (audit P2-18): newest materials first, capped well
    // above a realistic per-offering material count.
    const rows = await prisma.material.findMany({
      where: { offeringId: req.params.id! },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json({ data: rows.map(serializeMaterial) });
  } catch (e) {
    next(e);
  }
});

export const materialCreateSchema = z
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
      res.status(201).json({ data: serializeMaterial(created) });
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

export const assignmentCreateSchema = z
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

export const gradeItemSchema = z
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

export const gradesUpsertSchema = z
  .object({
    grades: z.array(gradeItemSchema).min(1).max(200),
  })
  .strict();

/**
 * The requested studentIds that are NOT enrolled in the offering — the
 * foreign-student guard behind the grade upsert (audit 15-i TOP-11:
 * the guard existed but was unpinned; a regression here would let
 * grades be recorded for arbitrary users). Deduplicates the requested
 * list and keeps first-seen order.
 */
export function foreignStudentIds(
  requested: readonly string[],
  enrolled: readonly string[],
): string[] {
  const enrolledSet = new Set(enrolled);
  return Array.from(new Set(requested)).filter((id) => !enrolledSet.has(id));
}

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
      const foreign = foreignStudentIds(
        grades.map((g) => g.studentId),
        enrolled.map((e) => e.studentId),
      );
      if (foreign.length > 0) {
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

// ─── Attendance (read-only) ───
// The roll-call WRITE path is POST /teacher/offerings/:id/attendance
// (teacher.routes.ts) — the frontend's only caller (useResources.ts).
// The parallel upsert twin that used to live here was dead, carried a
// diverging schema (notes max 500 vs the live route's 300), and was a
// second attendance-day write surface to remember in every timezone
// fix — deleted (audit 15-h P2-8, wave 16-B7). With it gone this file
// writes no calendar-day values at all; the two live attendance
// writers (teacher.routes roll-call, learning.routes auto-attendance)
// both normalize their day keys through lib/dates.ts.
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
