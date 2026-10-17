import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';
import { resolveCallerInstitutionScope } from '../../lib/profile-scoping.js';

const router = Router();
router.use(authMiddleware);

// r178: institution basics carried by every course row (public read
// contract keeps its shape — the extra field is additive so the FE can
// group/label courses by institution).
const courseInstitutionSelect = {
  id: true,
  name: true,
  nameEn: true,
  slug: true,
} as const;

const createCourseSchema = z
  .object({
    code: z.string().trim().min(2).max(20),
    name: z.string().trim().min(2).max(120),
    nameEn: z.string().trim().max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    credits: z.number().int().min(1).max(10).default(3),
    iconEmoji: z.string().trim().max(8).optional(),
    themeColor: z.string().trim().max(20).optional(),
    departmentId: z.string().cuid(),
    // r178: OWNER-only global console path — the institution to create
    // the course in when the owner has no membership context. ADMIN
    // callers derive the institution from their verified membership
    // context and MUST NOT send this field (403 below).
    institutionId: z.string().min(1).optional(),
  })
  .strict();

const listQuerySchema = paginationSchema.extend({
  departmentId: z.string().cuid().optional(),
  // r178: optional institution filter (public listing stays public —
  // the register page and per-institution catalogs pass the slug).
  institutionSlug: z.string().trim().min(1).max(64).optional(),
});

router.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, q, departmentId, institutionSlug } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;
    // r178: an institutionSlug filter resolves to active institutions
    // only (an unknown/suspended slug matches nothing — never a 404 on
    // a public list).
    const slugInstitutions = institutionSlug
      ? await prisma.institution.findMany({
          where: { slug: institutionSlug, status: 'ACTIVE' },
          select: { id: true },
        })
      : [];
    const where = {
      ...(departmentId ? { departmentId } : {}),
      // An unmatched/suspended slug yields `in: []` — matches nothing,
      // same as an unknown departmentId (never a 404 on a public list).
      ...(institutionSlug ? { institutionId: { in: slugInstitutions.map((i) => i.id) } } : {}),
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
        include: {
          department: true,
          institution: { select: courseInstitutionSelect },
        },
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
        institution: { select: courseInstitutionSelect },
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

/**
 * r178 (multi-institution) — resolve the institution a catalogue
 * MUTATION (course/faculty/department write) is scoped to:
 *  - OWNER may pass an explicit `institutionId` in the body (the global
 *    owner-console path) — verified to exist and be ACTIVE;
 *  - everyone else (and an OWNER without the explicit field) needs a
 *    DB-verified institution context: an ACTIVE membership in an
 *    ACTIVE institution for the token's inst claim (the same
 *    re-resolution `requireInstitution` performs — the claim is never
 *    trusted alone). ADMIN callers sending `institutionId` are rejected
 *    (their scope is their membership, never a client-supplied id).
 * Returns the institution id the write is scoped to.
 */
async function resolveCatalogueInstitution(req: {
  user?: { id: string; role: Role; institutionId: string | null };
  body?: { institutionId?: string };
}): Promise<string> {
  const user = req.user!;
  const explicit = req.body?.institutionId;
  if (user.role === Role.OWNER && typeof explicit === 'string' && explicit.length > 0) {
    const institution = await prisma.institution.findUnique({
      where: { id: explicit },
      select: { id: true, status: true },
    });
    if (!institution || institution.status !== 'ACTIVE') {
      throw AppError.badRequest('المؤسسة المحددة غير موجودة أو غير نشطة');
    }
    return institution.id;
  }
  if (user.role !== Role.OWNER && typeof explicit === 'string' && explicit.length > 0) {
    throw AppError.forbidden('لا يمكنك تحديد مؤسسة غير مؤسستك');
  }
  const institutionId = await resolveCallerInstitutionScope(user.id, user.institutionId);
  if (!institutionId) {
    throw new AppError(
      'INSTITUTION_CONTEXT_REQUIRED',
      'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
      403,
    );
  }
  return institutionId;
}

/**
 * r178 — the department→faculty→institution chain guard for course
 * writes: the department must exist and its faculty must belong to the
 * institution the write is scoped to (a cross-institution department
 * id in the payload is a 403, not a silent cross-institution write).
 * Returns the department row when valid.
 */
async function assertDepartmentInInstitution(
  departmentId: string,
  institutionId: string,
): Promise<{ id: string; facultyId: string }> {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, facultyId: true, faculty: { select: { institutionId: true } } },
  });
  if (!department) {
    throw AppError.badRequest('القسم الأكاديمي المحدد غير موجود');
  }
  if (department.faculty.institutionId !== institutionId) {
    throw AppError.forbidden('القسم الأكاديمي المحدد لا ينتمي إلى مؤسستك');
  }
  return department;
}

router.post('/', requireRole(Role.ADMIN, Role.OWNER), validate(createCourseSchema), async (req, res, next) => {
  try {
    /* r153j: catalogue writes are governance-visible — the audit row
     * lands in the SAME transaction (the 15-a P1-4 class the offerings
     * create closed for itself; the course-CRUD merge had re-opened
     * exactly that class here: 15 unaudited admin writes).
     * r178: the write is institution-scoped — institutionId comes from
     * the caller's verified membership context (ADMIN) or the OWNER's
     * explicit payload id, the department chain is validated to belong
     * to that institution (denormalized column must match — the
     * app-level invariant that keeps course codes unique per
     * institution), and the audit row carries the institution id. */
    const body = req.body as z.infer<typeof createCourseSchema>;
    const institutionId = await resolveCatalogueInstitution(req);
    await assertDepartmentInInstitution(body.departmentId, institutionId);
    const { institutionId: _ownerExplicit, ...courseData } = body;
    const created = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: { ...courseData, institutionId },
      });
      await tx.auditLog.create({
        data: {
          action: 'COURSE_CREATED',
          resourceType: 'Course',
          resourceId: course.id,
          userId: req.user!.id,
          institutionId,
          metadata: { code: course.code, name: course.name, departmentId: course.departmentId },
        },
      });
      return course;
    });
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
      /* r178: PATCH is institution-scoped like POST. The course's own
       * institution is fixed (moving a course between institutions is
       * not a PATCH field) — an ADMIN may only patch courses of their
       * verified institution context; a departmentId change must stay
       * inside the SAME institution (chain validated). OWNER may patch
       * any institution's course (global console) but can still never
       * move it across institutions via departmentId. */
      const body = req.body as Partial<z.infer<typeof createCourseSchema>>;
      if (body.institutionId !== undefined) {
        throw AppError.badRequest('لا يمكن نقل مقرر بين المؤسسات');
      }
      const existing = await prisma.course.findUnique({
        where: { id: req.params.id! },
        select: { id: true, institutionId: true },
      });
      if (!existing) throw AppError.notFound();
      if (req.user!.role !== Role.OWNER) {
        const callerInstitution = await resolveCallerInstitutionScope(
          req.user!.id,
          req.user!.institutionId,
        );
        if (!callerInstitution) {
          throw new AppError(
            'INSTITUTION_CONTEXT_REQUIRED',
            'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
            403,
          );
        }
        if (existing.institutionId !== callerInstitution) {
          throw AppError.forbidden('هذا المقرر ينتمي إلى مؤسسة أخرى');
        }
        if (body.departmentId) {
          await assertDepartmentInInstitution(body.departmentId, callerInstitution);
        }
      } else if (body.departmentId) {
        await assertDepartmentInInstitution(body.departmentId, existing.institutionId);
      }
      const { institutionId: _ignored, ...data } = body;
      const updated = await prisma.$transaction(async (tx) => {
        const course = await tx.course.update({ where: { id: req.params.id! }, data });
        await tx.auditLog.create({
          data: {
            action: 'COURSE_UPDATED',
            resourceType: 'Course',
            resourceId: course.id,
            userId: req.user!.id,
            institutionId: course.institutionId,
            metadata: { fields: Object.keys(data) },
          },
        });
        return course;
      });
      res.json({ data: updated });
    } catch (e) {
      next(e);
    }
  },
);

router.delete('/:id', requireRole(Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const courseId = req.params.id!;

    // r178: like PATCH, the delete is institution-scoped for non-OWNER
    // callers (their verified membership context must match the
    // course's institution); OWNER stays global.
    if (req.user!.role !== Role.OWNER) {
      const callerInstitution = await resolveCallerInstitutionScope(
        req.user!.id,
        req.user!.institutionId,
      );
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { institutionId: true },
      });
      if (!course) throw AppError.notFound();
      if (!callerInstitution) {
        throw new AppError(
          'INSTITUTION_CONTEXT_REQUIRED',
          'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
          403,
        );
      }
      if (course.institutionId !== callerInstitution) {
        throw AppError.forbidden('هذا المقرر ينتمي إلى مؤسسة أخرى');
      }
    }

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
      const removed = await tx.course.delete({ where: { id: courseId } });
      // r153j: destructive catalogue writes carry their audit row out in
      // the same transaction as the delete + its FK guards.
      await tx.auditLog.create({
        data: {
          action: 'COURSE_DELETED',
          resourceType: 'Course',
          resourceId: removed.id,
          userId: req.user!.id,
          metadata: { code: removed.code, name: removed.name },
        },
      });
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
