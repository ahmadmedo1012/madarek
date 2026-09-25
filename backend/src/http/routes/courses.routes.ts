import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
router.use(authMiddleware);

const createCourseSchema = z
  .object({
    code: z.string().min(2).max(20),
    name: z.string().min(2).max(120),
    nameEn: z.string().max(120).optional(),
    description: z.string().max(2000).optional(),
    credits: z.number().int().min(1).max(10).default(3),
    iconEmoji: z.string().max(8).optional(),
    themeColor: z.string().max(20).optional(),
    departmentId: z.string().cuid(),
  })
  .strict();

const listQuerySchema = paginationSchema.extend({
  departmentId: z.string().cuid().optional(),
});

router.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, departmentId } = req.query as unknown as z.infer<typeof listQuerySchema>;
    const where = {
      ...(departmentId ? { departmentId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { code: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { department: true },
      }),
      prisma.course.count({ where }),
    ]);
    res.json({ data, meta: buildMeta(page, limit, total) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    // Course metadata (name/code/department/faculty) is visible to any
    // authenticated user — the list route ships the same data. The
    // offering roster, however (teacher identity, schedule, room), is
    // gated exactly like GET /offerings/:id (assertOfferingAccess):
    // oversight roles see every offering, a TEACHER only the ones they
    // teach, a STUDENT only the ones they are actively enrolled in.
    // Un-enrolled students must not be able to enumerate offerings the
    // rest of the API carefully gates.
    const role = req.user!.role;
    const userId = req.user!.id;
    const offeringWhere =
      role === Role.TEACHER
        ? { teacherId: userId }
        : role === Role.STUDENT
          ? { enrollments: { some: { studentId: userId, status: 'active' } } }
          : {}; // ADMIN / QUALITY / OWNER — oversight

    const course = await prisma.course.findUnique({
      where: { id: req.params.id! },
      include: {
        department: { include: { faculty: true } },
        offerings: {
          where: offeringWhere,
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
            schedule: true,
          },
        },
      },
    });
    if (!course) throw AppError.notFound();
    res.json({ data: course });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireRole(Role.ADMIN, Role.OWNER), validate(createCourseSchema), async (req, res, next) => {
  try {
    const created = await prisma.course.create({ data: req.body });
    res.status(201).json({ data: created });
  } catch (e) {
    next(e);
  }
});

router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.OWNER),
  validate(createCourseSchema.partial()),
  async (req, res, next) => {
    try {
      const updated = await prisma.course.update({ where: { id: req.params.id! }, data: req.body });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

router.delete('/:id', requireRole(Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const courseId = req.params.id!;

    // FK audit (schema.prisma @relation onDelete): CourseOffering and
    // KnowledgeConcept both reference Course with default RESTRICT —
    // deleting a course that still has either would surface as a
    // confusing P2003 → 400 «Related record does not exist». Pre-check
    // and answer with a clear 409 instead (same pattern as curriculum's
    // watch-history guard).
    await prisma.$transaction(async (tx) => {
      const [offeringCount, conceptCount] = await Promise.all([
        tx.courseOffering.count({ where: { courseId } }),
        tx.knowledgeConcept.count({ where: { courseId } }),
      ]);
      if (offeringCount > 0) {
        throw AppError.conflict('لا يمكن حذف المقرر: ما زالت له شُعب تدريسية مسجّلة');
      }
      if (conceptCount > 0) {
        throw AppError.conflict('لا يمكن حذف المقرر: ما زالت له مفاهيم في مصفوفة المفاهيم');
      }
      await tx.course.delete({ where: { id: courseId } });
    });

    // 200 + envelope (not 204) — the platform's dominant delete shape
    // (curriculum deletes, learning annotation delete) and what the
    // frontend's `unwrap<{ ok: true }>` callers expect.
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
