import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
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

/**
 * The offering-visibility filter — WHICH CourseOffering rows each role may
 * enumerate. This is the list-side twin of `assertOfferingAccess`
 * (lib/permissions.ts): the same role matrix expressed as a Prisma `where`
 * instead of a per-row decision.
 *   - TEACHER → only the offerings they teach
 *   - STUDENT → only offerings with an ACTIVE enrollment (the platform-wide
 *     enrollment convention: dropped/completed leftovers never grant
 *     content access)
 *   - ADMIN / QUALITY / OWNER → unfiltered (oversight)
 *
 * Single source of truth for both consumers of the branch (this file's
 * GET /:id offering roster and search.routes' global search scope) — the
 * two hand-maintained copies had already drifted once (search grew the
 * `status: 'active'` enrollment constraint first; audit 15-i TOP-10).
 * Pinned DB-free by tests/modules/visibility-logic.test.ts.
 */
export function offeringVisibilityFilter(role: Role, userId: string): Prisma.CourseOfferingWhereInput {
  if (role === Role.TEACHER) return { teacherId: userId };
  if (role === Role.STUDENT) return { enrollments: { some: { studentId: userId, status: 'active' } } };
  return {};
}

router.get('/:id', async (req, res, next) => {
  try {
    // Course metadata (name/code/department/faculty) is visible to any
    // authenticated user — the list route ships the same data. The
    // offering roster, however (teacher identity, schedule, room), is
    // gated exactly like GET /offerings/:id (assertOfferingAccess) via
    // the shared offeringVisibilityFilter above. Un-enrolled students
    // must not be able to enumerate offerings the rest of the API
    // carefully gates.
    const course = await prisma.course.findUnique({
      where: { id: req.params.id! },
      include: {
        department: { include: { faculty: true } },
        offerings: {
          where: offeringVisibilityFilter(req.user!.role, req.user!.id),
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
