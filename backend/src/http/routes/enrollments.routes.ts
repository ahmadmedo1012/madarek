import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';
import {
  assertWithinScope,
  buildScopedUserWhere,
  getGovernanceScope,
  loadGovernanceTarget,
} from '../../lib/governance.js';
import { resolveCallerInstitutionScope } from '../../lib/profile-scoping.js';

const router = Router();
router.use(authMiddleware);

// ── Faculty governance scope (r155a) ─────────────────────────────
// The ADMIN surfaces below mirror the users/permissions/admin-extras
// pattern: a faculty-scoped ADMIN only governs the enrollments of
// their own faculty (OWNER / unscoped ADMIN = university-wide —
// getGovernanceScope resolves that). What you cannot govern, you do
// not list — and the write paths assert both halves of an enrollment
// (the student AND the offering's course→department→faculty chain)
// before the mutation.

/**
 * Pure where-builder for the admin enrollment list (GET /): a
 * specific student pins the filter (their scope was asserted up
 * front — 403, never a silent empty list); listing all is pinned to
 * the actor's faculty via the shared user-scope filter (students of
 * the faculty; enrollments are student-shaped, so the TEACHER branch
 * simply never matches). University-wide actors get the unscoped
 * base. Exported for unit tests.
 */
export function buildScopedEnrollmentWhere(
  actorScopeFacultyId: string | null,
  studentId?: string,
): Prisma.EnrollmentWhereInput {
  if (studentId) return { studentId };
  if (actorScopeFacultyId === null) return {};
  return { student: buildScopedUserWhere(actorScopeFacultyId) };
}

/**
 * Pure where-builder for the admin offerings picker (GET /offerings):
 * a scoped ADMIN only sees offerings whose course is homed in their
 * own faculty (course → department → facultyId). Exported for unit
 * tests.
 */
export function buildScopedOfferingWhere(
  actorScopeFacultyId: string | null,
): Prisma.CourseOfferingWhereInput {
  if (actorScopeFacultyId === null) return {};
  return { course: { department: { facultyId: actorScopeFacultyId } } };
}

/**
 * Pure predicate: is an offering's home faculty (resolved through
 * course → department → facultyId) within the actor's governance
 * scope? University-wide actors reach every faculty; a scoped actor
 * reaches only their own. Exported for unit tests.
 */
export function isOfferingWithinScope(
  actorScopeFacultyId: string | null,
  offeringFacultyId: string | null,
): boolean {
  if (actorScopeFacultyId === null) return true;
  return offeringFacultyId === actorScopeFacultyId;
}

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

/**
 * GET /enrollments?studentId=X — admin/owner enrollment list with
 * offering/course/teacher detail (r154e.2). The student's own view is
 * GET /me above; this is the admin-side mirror for the
 * enrollment-management modal on AdminStudentsPage. `studentId` is
 * optional (r155a): without it the surface lists the actor's visible
 * enrollments — university-wide for OWNER/unscoped ADMIN, pinned to
 * the faculty for a scoped ADMIN.
 */
router.get('/', requireRole(Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const studentId =
      typeof req.query.studentId === 'string' && req.query.studentId ? req.query.studentId : undefined;
    // Faculty governance scope (r155a): a scoped ADMIN reading a
    // specific student gets the same 403 the write guards throw — a
    // filter that silently returns [] would hide the boundary. Listing
    // all is restricted to the scoped students (see the where-builder).
    const scopeFacultyId = await getGovernanceScope(req.user!.id);
    if (studentId && scopeFacultyId !== null) {
      const target = await loadGovernanceTarget(studentId);
      if (!target) throw AppError.notFound('الطالب المحدد غير موجود');
      assertWithinScope(scopeFacultyId, target);
    }
    /* r176d (F-04): the BROAD listing (no studentId) is paginated with
     * the platform's paginationSchema — at university scale it is the
     * unbounded surface (tens of thousands of rows). The per-student
     * path keeps its full-list shape: one student's enrollments are
     * naturally bounded, and the enrollment-management modal (the only
     * consumer) expects the complete list. */
    let page = 1;
    let limit = Number.POSITIVE_INFINITY; // per-student path: unbounded by design (naturally small)
    if (!studentId) {
      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success) throw AppError.badRequest('معاملات ترقيم غير صالحة');
      page = parsed.data.page;
      limit = parsed.data.limit;
    }
    const where = buildScopedEnrollmentWhere(scopeFacultyId, studentId);
    const [rows, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip: studentId ? undefined : (page - 1) * limit,
        take: studentId ? undefined : limit,
        select: {
          id: true,
          progressPct: true,
          status: true,
          enrolledAt: true,
          offering: {
            select: {
              id: true,
              term: true,
              room: true,
              capacity: true,
              course: { select: { id: true, name: true, code: true, iconEmoji: true } },
              teacher: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      studentId ? Promise.resolve(0) : prisma.enrollment.count({ where }),
    ]);
    res.json(studentId ? { data: rows } : { data: rows, meta: buildMeta(page, limit, total) });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /enrollments/offerings — admin/owner picker list of offerings with
 * course + teacher names + live seat counts (r154e.2). The enrollment-
 * management modal's "enroll in a new course" select consumes this.
 * Bounded to 100 rows (the catalog is small); capacity-vs-count drives
 * the "مكتمل" disabled state on options.
 *
 * Faculty governance scope (r155a): a scoped ADMIN only picks from
 * offerings homed in their own faculty — the enroll endpoint below
 * rejects out-of-faculty offerings anyway, so the picker must not
 * offer them.
 */
router.get('/offerings', requireRole(Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const scopeFacultyId = await getGovernanceScope(req.user!.id);
    const data = await prisma.courseOffering.findMany({
      where: buildScopedOfferingWhere(scopeFacultyId),
      select: {
        id: true,
        term: true,
        room: true,
        capacity: true,
        course: { select: { id: true, name: true, code: true, iconEmoji: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { enrollments: { where: { status: 'active' } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
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
    /* r178 (multi-institution): an ADMIN caller with an institution
     * context may only enroll within THEIR institution — both halves
     * of the seat are checked: the offering's course chain and the
     * student (a membership in the same institution). Contextless
     * callers (OWNER, legacy sessions) keep the university-wide
     * semantics; TODO(r179/phase-5): the exhaustive isolation pass. */
    const callerInstitution = await resolveCallerInstitutionScope(
      req.user!.id,
      req.user!.institutionId,
    );
    if (callerInstitution) {
      const [offering, targetMembership] = await Promise.all([
        prisma.courseOffering.findUnique({
          where: { id: offeringId },
          select: { course: { select: { institutionId: true } } },
        }),
        prisma.membership.findFirst({
          where: { userId: studentId, institutionId: callerInstitution, isActive: true },
          select: { id: true },
        }),
      ]);
      if (offering && offering.course.institutionId !== callerInstitution) {
        throw AppError.forbidden('هذا المقرر ينتمي إلى مؤسسة أخرى');
      }
      if (!targetMembership) {
        throw AppError.forbidden('الطالب المحدد ليس عضواً في مؤسستك');
      }
    }
    // Faculty governance scope (r155a): BOTH halves of the enrollment
    // are asserted before the transaction — the student (same guard
    // the user surfaces throw) and the offering's
    // course→department→faculty chain. A scoped ADMIN could otherwise
    // enroll their students into any faculty's offering.
    const scopeFacultyId = await getGovernanceScope(req.user!.id);
    if (scopeFacultyId !== null) {
      const target = await loadGovernanceTarget(studentId);
      if (!target) throw AppError.notFound('الطالب المحدد غير موجود');
      assertWithinScope(scopeFacultyId, target);
      // Offering faculty resolution — a missing offering is NOT a scope
      // decision (the transaction below owns that 404); an offering
      // found outside the scope is a hard 403.
      const offering = await prisma.courseOffering.findUnique({
        where: { id: offeringId },
        select: { course: { select: { department: { select: { facultyId: true } } } } },
      });
      if (
        offering &&
        !isOfferingWithinScope(scopeFacultyId, offering.course.department.facultyId)
      ) {
        throw AppError.forbidden('هذا المقرر خارج نطاق الكلّيّة التي تديرها');
      }
    }
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
      if (!offering) throw AppError.notFound('المقرر المحدد غير موجود');
      // Pre-validate the target: a TEACHER/ADMIN/OWNER id passes zod's
      // cuid check, but enrolling a non-student must fail with a clean
      // 400 — not a generic FK error — and an unknown id is a 404
      // (audit 11-c P2-12).
      const student = await tx.user.findUnique({
        where: { id: studentId },
        select: { role: true },
      });
      if (!student) throw AppError.notFound('الطالب المحدد غير موجود');
      if (student.role !== Role.STUDENT) {
        throw AppError.badRequest('يمكن التسجيل في المقررات للطلاب فقط');
      }
      if (offering._count.enrollments >= offering.capacity) {
        throw AppError.conflict('اكتمل العدد في هذا المقرر');
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
        throw AppError.conflict('الطالب مسجّل مسبقاً في هذا المقرر');
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
    // Faculty governance scope (r155a): asserted BEFORE the delete
    // transaction — a scoped ADMIN may only drop the enrollments of
    // students in their own faculty (what you cannot govern, you do
    // not delete). A missing id still 404s via the transaction's P2025
    // path, so an absent row is not a scope decision.
    // r178: the student's profile is per-membership — resolved in the
    // caller's institution context when one exists, else their oldest
    // active profile (TODO(r179/phase-5): full isolation).
    const scopeFacultyId = await getGovernanceScope(req.user!.id);
    if (scopeFacultyId !== null) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: req.params.id! },
        select: {
          student: {
            select: {
              role: true,
              studentProfiles: {
                where: { membership: { isActive: true, institution: { status: 'ACTIVE' } } },
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: { facultyId: true },
              },
              teacherProfiles: {
                where: { membership: { isActive: true, institution: { status: 'ACTIVE' } } },
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: { department: { select: { facultyId: true } } },
              },
            },
          },
        },
      });
      if (enrollment) {
        assertWithinScope(scopeFacultyId, {
          role: enrollment.student.role,
          studentFacultyId: enrollment.student.studentProfiles[0]?.facultyId ?? null,
          teacherFacultyId: enrollment.student.teacherProfiles[0]?.department.facultyId ?? null,
        });
      }
    }
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
    // 200 + envelope (not 204) — D17-5: the platform's dominant delete
    // shape ({data:{ok:true}} — courses, curriculum, learning annotation
    // deletes). r154e.2 wired the FE consumer (useDropEnrollment on
    // AdminStudentsPage's enrollment modal); the convention is client-safe.
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
