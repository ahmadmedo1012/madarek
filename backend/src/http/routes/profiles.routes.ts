import { Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma, withRetry } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import {
  institutionContextRequiredError,
  resolveCallerInstitutionScope,
} from '../../lib/profile-scoping.js';
import { normalizePhone } from '../../lib/phones.js';
import { prepareNationalId } from '../../lib/profiles/national-id.js';
import {
  canViewPeople,
  shapeStudentProfileFor,
  shapeTeacherProfileFor,
  type StudentProfileInput,
  type TeacherProfileInput,
} from '../../lib/profiles/privacy.js';

/**
 * r349-P2 — the people surface: the flexible Libyan file, served.
 *
 * Routes (mounted at the bare /api/v1 prefix):
 *   GET    /me/profile              self view (moved from learning.routes
 *                                   and EXTENDED with the shaped E1/P1
 *                                   profile — the existing consumer
 *                                   contract keys are untouched)
 *   PATCH  /me/profile              student self-edit (contact set only)
 *   GET    /people/:id              staff read of one student/teacher
 *                                   profile, privacy-shaped, AUDITED on
 *                                   every phone/nationalId read
 *   PATCH  /people/:id              registrar edit (ADMIN/OWNER), audited
 *   GET    /directory               staff directory: filters, pagination,
 *                                   json | xlsx | csv (formula-injection
 *                                   safe)
 *   POST   /people/:id/contact-request  the PRIVATE-phone door — a
 *                                   staff member asks the profile owner
 *                                   to share; rate-limited + audited
 *
 * Scoping law (r179 phase-5, unchanged): ADMIN/QUALITY need a
 * DB-verified institution context; TEACHER scoping is the roster
 * (enrollments in the caller's own offerings) for students and
 * institution-wide for colleagues; STUDENT never reaches this surface.
 */

const router = Router();
router.use(authMiddleware);

/* ── shared shapes ──────────────────────────────────────────────── */

const phoneVisibilitySchema = z.enum(['INSTITUTION_STAFF', 'PRIVATE']);
const genderSchema = z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']);

/** A phone input: any human form; the route folds it via normalizePhone. */
const phoneSchema = z.string().trim().max(32);

const patchMeProfileSchema = z
  .object({
    nameEn: z.string().trim().max(120).optional(),
    dateOfBirth: z.coerce.date().min(new Date('1900-01-01')).max(new Date()).optional(),
    gender: genderSchema.optional(),
    city: z.string().trim().max(120).optional(),
    address: z.string().trim().max(240).optional(),
    studentPhone: phoneSchema.nullable().optional(),
    studentPhoneVisibility: phoneVisibilitySchema.optional(),
    additionalPhone: phoneSchema.nullable().optional(),
    emergencyContactName: z.string().trim().max(120).nullable().optional(),
    emergencyContactPhone: phoneSchema.nullable().optional(),
  })
  .strict();

const directoryQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().positive().max(100).default(20),
  kind: z.enum(['student', 'teacher']).default('student'),
  facultyId: z.string().trim().max(64).optional(),
  departmentId: z.string().trim().max(64).optional(),
  year: z.coerce.number().int().positive().max(20).optional(),
  stage: z.string().trim().max(40).optional(),
  grade: z.string().trim().max(40).optional(),
  studyType: z.enum(['MORNING', 'EVENING', 'PARALLEL']).optional(),
  enrollmentStatus: z
    .enum(['ACTIVE', 'SUSPENDED', 'DEFERRED', 'GRADUATED', 'WITHDRAWN'])
    .optional(),
  phone: z.string().trim().max(32).optional(), // digits search on the normalized columns
  format: z.enum(['json', 'xlsx', 'csv']).default('json'),
});

const patchPeopleSchema = z
  .object({
    // documentary identity (staff lane)
    nameAr: z.string().trim().max(200).nullable().optional(),
    nameEn: z.string().trim().max(120).nullable().optional(),
    fatherName: z.string().trim().max(120).nullable().optional(),
    grandfatherName: z.string().trim().max(120).nullable().optional(),
    motherName: z.string().trim().max(200).nullable().optional(),
    birthPlace: z.string().trim().max(120).nullable().optional(),
    nationalId: z.string().trim().max(32).nullable().optional(),
    // contact
    city: z.string().trim().max(120).nullable().optional(),
    address: z.string().trim().max(240).nullable().optional(),
    studentPhone: phoneSchema.nullable().optional(),
    studentPhoneVisibility: phoneVisibilitySchema.optional(),
    additionalPhone: phoneSchema.nullable().optional(),
    guardianName: z.string().trim().max(200).nullable().optional(),
    guardianRelationship: z.string().trim().max(60).nullable().optional(),
    guardianPhone: phoneSchema.nullable().optional(),
    guardianPhoneVisibility: phoneVisibilitySchema.optional(),
    emergencyContactName: z.string().trim().max(120).nullable().optional(),
    emergencyContactPhone: phoneSchema.nullable().optional(),
    // academic
    stage: z.string().trim().max(40).nullable().optional(),
    grade: z.string().trim().max(40).nullable().optional(),
    section: z.string().trim().max(20).nullable().optional(),
    previousSchool: z.string().trim().max(160).nullable().optional(),
    transferStatus: z.string().trim().max(60).nullable().optional(),
    studyType: z.enum(['MORNING', 'EVENING', 'PARALLEL']).nullable().optional(),
    enrollmentStatus: z
      .enum(['ACTIVE', 'SUSPENDED', 'DEFERRED', 'GRADUATED', 'WITHDRAWN'])
      .nullable()
      .optional(),
    secondarySchool: z.string().trim().max(160).nullable().optional(),
    secondarySchoolBranch: z.string().trim().max(60).nullable().optional(),
    secondarySchoolPercent: z.coerce.number().min(0).max(100).nullable().optional(),
    admissionYear: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
    // teacher-side
    employeeId: z.string().trim().max(60).nullable().optional(),
    personalPhone: phoneSchema.nullable().optional(),
    personalPhoneVisibility: phoneVisibilitySchema.optional(),
    preferredContact: z.enum(['PHONE', 'WHATSAPP', 'EMAIL', 'OFFICE_HOURS']).nullable().optional(),
  })
  .strict();

const contactRequestSchema = z
  .object({
    channel: z.enum(['student', 'guardian']).default('student'),
    message: z.string().trim().max(280).optional(),
  })
  .strict();

/* ── helpers ────────────────────────────────────────────────────── */

/** Normalize a phone input → { display, normalized } | null (empty → null). */
function foldPhone(raw: string | null | undefined): { display: string | null; normalized: string | null } {
  if (raw === null || raw === undefined) return { display: null, normalized: null };
  if (raw === '') return { display: null, normalized: null };
  const n = normalizePhone(raw);
  return { display: n?.display ?? raw.trim(), normalized: n?.normalized ?? null };
}

/**
 * Assert a phone that FAILED to normalize is not silently accepted: an
 * unparseable non-empty input is a 400, never a stored guess.
 */
function assertPhonesParseable(entries: Array<[string, string | null | undefined]>): void {
  for (const [field, raw] of entries) {
    if (raw === undefined || raw === null || raw === '') continue;
    if (normalizePhone(raw) === null) {
      throw new AppError('VALIDATION_ERROR', `تعذّر قراءة رقم الهاتف في «${field}»`, 400);
    }
  }
}

/** One audit row. Fire-and-report: an audit failure fails the request
 *  (the trail is part of the contract, not a nice-to-have). */
async function audit(
  userId: string,
  institutionId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Prisma.InputJsonValue,
): Promise<void> {
  await withRetry(() =>
    prisma.auditLog.create({
      data: { userId, institutionId, action, resourceType, resourceId, metadata },
    }),
  );
}

/** The caller's verified institution id for this surface (staff only). */
async function callerInstitutionOrThrow(userId: string, role: Role, claimed: string | null): Promise<string> {
  const scope = await resolveCallerInstitutionScope(userId, claimed);
  if (!scope) throw institutionContextRequiredError();
  if (role === Role.STUDENT) throw AppError.forbidden();
  return scope;
}

/** Selects for the two profile reads (everything the shaper needs). */
const studentSelect = {
  id: true, userId: true, institutionId: true, universityId: true,
  nameAr: true, nameEn: true, fatherName: true, grandfatherName: true, motherName: true,
  dateOfBirth: true, birthPlace: true, gender: true, city: true, address: true,
  profileImageUrl: true, studentPhone: true, studentPhoneNormalized: true,
  studentPhoneVisibility: true, additionalPhone: true,
  guardianName: true, guardianRelationship: true, guardianPhone: true,
  guardianPhoneNormalized: true, guardianPhoneVisibility: true,
  emergencyContactName: true, emergencyContactPhone: true,
  nationalId: true, nationalIdHash: true,
  stage: true, grade: true, section: true, previousSchool: true, transferStatus: true,
  studyType: true, enrollmentStatus: true, secondarySchool: true,
  secondarySchoolBranch: true, secondarySchoolPercent: true, admissionYear: true,
  faculty: { select: { id: true, name: true, nameEn: true } },
  department: { select: { id: true, name: true, nameEn: true } },
  year: true,
} as const;

const teacherSelect = {
  id: true, userId: true, specialty: true, rank: true, bio: true, profileImageUrl: true,
  officeLocation: true, officeHours: true, websiteUrl: true,
  employeeId: true, nameAr: true, nameEn: true,
  personalPhone: true, personalPhoneNormalized: true, personalPhoneVisibility: true,
  officialPhone: true, officialEmail: true, preferredContact: true,
  department: { select: { id: true, name: true, nameEn: true, faculty: { select: { name: true } } } },
} as const;

/** The custom-field values block attached to people reads (P3's editor reads it). */
async function customFieldsFor(
  kind: 'student' | 'teacher',
  profileId: string,
): Promise<Array<{ key: string; labelAr: string; type: string; value: unknown }>> {
  const values = await withRetry(() =>
    prisma.fieldValue.findMany({
      where: kind === 'student' ? { studentProfileId: profileId } : { teacherProfileId: profileId },
      select: {
        valueText: true, valueNumber: true, valueDate: true, valueBoolean: true,
        valueSelect: true, valueMultiSelect: true,
        definition: { select: { key: true, labelAr: true, type: true } },
      },
    }),
  );
  return values.map((v) => ({
    key: v.definition.key,
    labelAr: v.definition.labelAr,
    type: v.definition.type,
    value:
      v.definition.type === 'NUMBER'
        ? v.valueNumber === null ? null : Number(v.valueNumber)
        : v.definition.type === 'DATE'
          ? v.valueDate?.toISOString() ?? null
          : v.definition.type === 'BOOLEAN'
            ? v.valueBoolean
            : v.definition.type === 'MULTI_SELECT'
              ? v.valueMultiSelect
              : v.valueSelect ?? v.valueText,
  }));
}

/* ════════════════════════════════════════════════════════════════
   GET /me/profile — the extended self view
   ════════════════════════════════════════════════════════════════ */
router.get('/me/profile', async (req, res, next) => {
  try {
    /* r179 (phase-5) contract, unchanged from the learning.routes
     * original: STUDENT/TEACHER NEED the context (403 without one);
     * ADMIN/QUALITY/OWNER get an honest profile-less response. */
    const callerInstitution = await resolveCallerInstitutionScope(
      req.user!.id,
      req.user!.institutionId,
    );
    const isInstitutionalProfileRole =
      req.user!.role === Role.STUDENT || req.user!.role === Role.TEACHER;
    if (isInstitutionalProfileRole && !callerInstitution) {
      throw institutionContextRequiredError();
    }
    const user = await withRetry(() => prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true,
        avatarColor: true, avatarInitials: true, emailVerifiedAt: true, createdAt: true,
        studentProfiles: {
          where: callerInstitution ? { institutionId: callerInstitution } : { id: { in: [] } },
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { ...studentSelect, faculty: true, department: true },
        },
        teacherProfiles: {
          where: callerInstitution
            ? { membership: { institutionId: callerInstitution } }
            : { id: { in: [] } },
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: teacherSelect,
        },
      },
    }));
    if (!user) throw AppError.notFound();
    const studentProfile = user.studentProfiles[0] ?? null;
    const teacherProfile = user.teacherProfiles[0] ?? null;

    res.json({
      data: {
        // ── the pre-P2 consumer contract (useMyProfile) — UNTOUCHED ──
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarColor: user.avatarColor,
        avatarInitials: user.avatarInitials,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        student: studentProfile
          ? {
              universityId: studentProfile.universityId,
              year: studentProfile.year,
              gpa: Number((studentProfile as { gpa?: unknown }).gpa ?? 0),
              totalXp: (studentProfile as { totalXp?: number }).totalXp ?? 0,
              level: (studentProfile as { level?: number }).level ?? 1,
              faculty: studentProfile.faculty,
              department: studentProfile.department,
              // ── r349-P2: the shaped self view (additive key) ──
              profile: shapeStudentProfileFor(
                studentProfile as unknown as StudentProfileInput,
                { role: req.user!.role, isSelf: true },
              ),
            }
          : null,
        teacher: teacherProfile
          ? {
              specialty: teacherProfile.specialty,
              rank: teacherProfile.rank,
              department: teacherProfile.department
                ? {
                    name: teacherProfile.department.name,
                    facultyName: teacherProfile.department.faculty?.name,
                  }
                : null,
              // ── r349-P2: the shaped self view (additive key) ──
              profile: shapeTeacherProfileFor(
                teacherProfile as unknown as TeacherProfileInput,
                { role: req.user!.role, isSelf: true },
              ),
            }
          : null,
      },
    });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   PATCH /me/profile — student self-edit (contact & preferences lane)
   ════════════════════════════════════════════════════════════════ */
router.patch('/me/profile', validate(patchMeProfileSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof patchMeProfileSchema>;
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();

    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope },
      select: { id: true },
    }));
    if (!profile) {
      throw AppError.notFound('لا يوجد ملف طالب لهذا المستخدم في مؤسسته الحالية');
    }

    assertPhonesParseable([
      ['هاتف الطالب', body.studentPhone ?? undefined],
      ['هاتف إضافي', body.additionalPhone ?? undefined],
      ['هاتف الطوارئ', body.emergencyContactPhone ?? undefined],
    ]);

    const studentPhone = body.studentPhone !== undefined ? foldPhone(body.studentPhone) : undefined;
    const emergencyPhone =
      body.emergencyContactPhone !== undefined ? foldPhone(body.emergencyContactPhone) : undefined;

    const updated = await withRetry(() =>
      prisma.studentProfile.update({
        where: { id: profile.id },
        data: {
          ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
          ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth } : {}),
          ...(body.gender !== undefined ? { gender: body.gender } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(studentPhone !== undefined
            ? { studentPhone: studentPhone.display, studentPhoneNormalized: studentPhone.normalized }
            : {}),
          ...(body.studentPhoneVisibility !== undefined
            ? { studentPhoneVisibility: body.studentPhoneVisibility }
            : {}),
          ...(body.additionalPhone !== undefined ? { additionalPhone: body.additionalPhone } : {}),
          ...(body.emergencyContactName !== undefined
            ? { emergencyContactName: body.emergencyContactName }
            : {}),
          ...(emergencyPhone !== undefined
            ? { emergencyContactPhone: emergencyPhone.display }
            : {}),
        },
        select: { id: true, updatedAt: true },
      }),
    );

    // Self-writes of the contact lane are audited with FIELD NAMES only —
    // no PII values in the trail.
    await audit(
      req.user!.id, scope, 'profile.self-update', 'StudentProfile', profile.id,
      { fields: Object.keys(body) } as Prisma.InputJsonValue,
    );

    res.json({ data: updated });
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   GET /people/:id — staff read of one profile (audited)
   ════════════════════════════════════════════════════════════════ */
router.get('/people/:id', async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (!canViewPeople(role)) throw AppError.forbidden();
    const scope = await callerInstitutionOrThrow(req.user!.id, role, req.user!.institutionId);

    // Student first (the common case: the directory's population).
    const student = await withRetry(() => prisma.studentProfile.findUnique({
      where: { id: req.params.id },
      select: { ...studentSelect, userId: true },
    }));
    if (student) {
      if (student.institutionId !== scope) throw AppError.notFound();
      if (role === Role.TEACHER) {
        // Roster guard: the caller must teach an offering this student is
        // enrolled in (within the verified institution).
        const enrolled = await withRetry(() => prisma.enrollment.findFirst({
          where: {
            studentId: student.userId,
            offering: { teacherId: req.user!.id, course: { department: { faculty: { institutionId: scope } } } },
          },
          select: { id: true },
        }));
        if (!enrolled) throw AppError.notFound();
      }
      const view = shapeStudentProfileFor(student as unknown as StudentProfileInput, {
        role, isSelf: false,
      });
      const user = await withRetry(() => prisma.user.findUnique({
        where: { id: student.userId },
        select: { id: true, firstName: true, lastName: true, email: true, avatarColor: true, avatarInitials: true, isActive: true },
      }));
      const customFields = await customFieldsFor('student', student.id);

      // PII read audit: which protected families the caller actually saw.
      const sawStudentPhone = (view.phone as { access: string }).access !== 'HIDDEN';
      const sawGuardianPhone =
        view.guardian !== null && (view.guardian as { phone: { access: string } }).phone.access !== 'HIDDEN';
      const sawNationalId = (view.nationalId as { access: string }).access !== 'HIDDEN';
      await audit(req.user!.id, scope, 'people.read', 'StudentProfile', student.id, {
        sawStudentPhone, sawGuardianPhone, sawNationalId,
        nationalIdAccess: (view.nationalId as { access: string }).access,
      });

      return res.json({
        data: { ...view, user, customFields, faculty: student.faculty, department: student.department },
      });
    }

    // Teacher profile fallthrough.
    const teacher = await withRetry(() => prisma.teacherProfile.findUnique({
      where: { id: req.params.id },
      select: teacherSelect,
    }));
    if (teacher) {
      const membership = await withRetry(() => prisma.membership.findFirst({
        where: { userId: teacher.userId, institutionId: scope, isActive: true },
        select: { id: true },
      }));
      if (!membership) throw AppError.notFound();
      const view = shapeTeacherProfileFor(teacher as unknown as TeacherProfileInput, {
        role, isSelf: false,
      });
      const user = await withRetry(() => prisma.user.findUnique({
        where: { id: teacher.userId },
        select: { id: true, firstName: true, lastName: true, email: true, avatarColor: true, avatarInitials: true, isActive: true },
      }));
      const customFields = await customFieldsFor('teacher', teacher.id);

      const sawPersonalPhone = (view.phone as { access: string }).access !== 'HIDDEN';
      await audit(req.user!.id, scope, 'people.read', 'TeacherProfile', teacher.id, {
        sawPersonalPhone,
        sawNationalId: false,
      });

      return res.json({
        data: { ...view, user, customFields, department: teacher.department },
      });
    }

    throw AppError.notFound();
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   PATCH /people/:id — the registrar's edit (ADMIN/OWNER, audited)
   ════════════════════════════════════════════════════════════════ */
router.patch(
  '/people/:id',
  requireRole(Role.ADMIN, Role.OWNER),
  validate(patchPeopleSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof patchPeopleSchema>;
      const scope = await callerInstitutionOrThrow(req.user!.id, req.user!.role, req.user!.institutionId);

      assertPhonesParseable([
        ['هاتف الطالب', body.studentPhone ?? undefined],
        ['هاتف إضافي', body.additionalPhone ?? undefined],
        ['هاتف ولي الأمر', body.guardianPhone ?? undefined],
        ['هاتف الطوارئ', body.emergencyContactPhone ?? undefined],
        ['الهاتف الشخصي', body.personalPhone ?? undefined],
      ]);
      if (body.nationalId !== undefined && body.nationalId !== null && body.nationalId !== '' &&
          prepareNationalId(body.nationalId) === null) {
        throw new AppError('VALIDATION_ERROR', 'الرقم الوطني يجب أن يكون 12 خانة رقمية', 400);
      }

      const student = await withRetry(() => prisma.studentProfile.findUnique({
        where: { id: req.params.id },
        select: { id: true, institutionId: true },
      }));
      if (student) {
        if (student.institutionId !== scope) throw AppError.notFound();
        const studentPhone = body.studentPhone !== undefined ? foldPhone(body.studentPhone) : undefined;
        const guardianPhone = body.guardianPhone !== undefined ? foldPhone(body.guardianPhone) : undefined;
        const emergencyPhone =
          body.emergencyContactPhone !== undefined ? foldPhone(body.emergencyContactPhone) : undefined;
        const nationalId =
          body.nationalId === undefined ? undefined
          : body.nationalId === null || body.nationalId === '' ? { raw: null, hash: null }
          : prepareNationalId(body.nationalId)!;

        const updated = await withRetry(() =>
          prisma.studentProfile.update({
            where: { id: student.id },
            data: {
              ...(body.nameAr !== undefined ? { nameAr: body.nameAr } : {}),
              ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
              ...(body.fatherName !== undefined ? { fatherName: body.fatherName } : {}),
              ...(body.grandfatherName !== undefined ? { grandfatherName: body.grandfatherName } : {}),
              ...(body.motherName !== undefined ? { motherName: body.motherName } : {}),
              ...(body.birthPlace !== undefined ? { birthPlace: body.birthPlace } : {}),
              ...(nationalId !== undefined ? { nationalId: nationalId.raw, nationalIdHash: nationalId.hash } : {}),
              ...(body.city !== undefined ? { city: body.city } : {}),
              ...(body.address !== undefined ? { address: body.address } : {}),
              ...(studentPhone !== undefined
                ? { studentPhone: studentPhone.display, studentPhoneNormalized: studentPhone.normalized }
                : {}),
              ...(body.studentPhoneVisibility !== undefined
                ? { studentPhoneVisibility: body.studentPhoneVisibility }
                : {}),
              ...(body.additionalPhone !== undefined ? { additionalPhone: body.additionalPhone } : {}),
              ...(body.guardianName !== undefined ? { guardianName: body.guardianName } : {}),
              ...(body.guardianRelationship !== undefined ? { guardianRelationship: body.guardianRelationship } : {}),
              ...(guardianPhone !== undefined
                ? { guardianPhone: guardianPhone.display, guardianPhoneNormalized: guardianPhone.normalized }
                : {}),
              ...(body.guardianPhoneVisibility !== undefined
                ? { guardianPhoneVisibility: body.guardianPhoneVisibility }
                : {}),
              ...(body.emergencyContactName !== undefined ? { emergencyContactName: body.emergencyContactName } : {}),
              ...(emergencyPhone !== undefined ? { emergencyContactPhone: emergencyPhone.display } : {}),
              ...(body.stage !== undefined ? { stage: body.stage } : {}),
              ...(body.grade !== undefined ? { grade: body.grade } : {}),
              ...(body.section !== undefined ? { section: body.section } : {}),
              ...(body.previousSchool !== undefined ? { previousSchool: body.previousSchool } : {}),
              ...(body.transferStatus !== undefined ? { transferStatus: body.transferStatus } : {}),
              ...(body.studyType !== undefined ? { studyType: body.studyType } : {}),
              ...(body.enrollmentStatus !== undefined ? { enrollmentStatus: body.enrollmentStatus } : {}),
              ...(body.secondarySchool !== undefined ? { secondarySchool: body.secondarySchool } : {}),
              ...(body.secondarySchoolBranch !== undefined ? { secondarySchoolBranch: body.secondarySchoolBranch } : {}),
              ...(body.secondarySchoolPercent !== undefined
                ? { secondarySchoolPercent: body.secondarySchoolPercent }
                : {}),
              ...(body.admissionYear !== undefined ? { admissionYear: body.admissionYear } : {}),
            },
            select: { id: true, updatedAt: true },
          }),
        );
        await audit(req.user!.id, scope, 'people.update', 'StudentProfile', student.id, {
          fields: Object.keys(body),
        });
        return res.json({ data: updated });
      }

      const teacher = await withRetry(() => prisma.teacherProfile.findUnique({
        where: { id: req.params.id },
        select: { id: true, userId: true },
      }));
      if (teacher) {
        const membership = await withRetry(() => prisma.membership.findFirst({
          where: { userId: teacher.userId, institutionId: scope, isActive: true },
          select: { id: true },
        }));
        if (!membership) throw AppError.notFound();
        const personalPhone = body.personalPhone !== undefined ? foldPhone(body.personalPhone) : undefined;
        const updated = await withRetry(() =>
          prisma.teacherProfile.update({
            where: { id: teacher.id },
            data: {
              ...(body.nameAr !== undefined ? { nameAr: body.nameAr } : {}),
              ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
              ...(body.employeeId !== undefined ? { employeeId: body.employeeId } : {}),
              ...(personalPhone !== undefined
                ? { personalPhone: personalPhone.display, personalPhoneNormalized: personalPhone.normalized }
                : {}),
              ...(body.personalPhoneVisibility !== undefined
                ? { personalPhoneVisibility: body.personalPhoneVisibility }
                : {}),
              ...(body.preferredContact !== undefined ? { preferredContact: body.preferredContact } : {}),
            },
            select: { id: true, updatedAt: true },
          }),
        );
        await audit(req.user!.id, scope, 'people.update', 'TeacherProfile', teacher.id, {
          fields: Object.keys(body),
        });
        return res.json({ data: updated });
      }

      throw AppError.notFound();
    } catch (e) { next(e); }
  },
);

/* ════════════════════════════════════════════════════════════════
   GET /directory — the staff directory (json | xlsx | csv)
   ════════════════════════════════════════════════════════════════ */

/** OWASP formula-injection guard for spreadsheet/csv cells. */
function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function toCsv(headers: string[], rows: string[][]): string {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(q).join(','), ...rows.map((r) => r.map(q).join(','))];
  // BOM: Excel reads Arabic UTF-8 CSVs correctly only with it.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

router.get('/directory', validate(directoryQuerySchema, 'query'), async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (!canViewPeople(role)) throw AppError.forbidden();
    const scope = await callerInstitutionOrThrow(req.user!.id, role, req.user!.institutionId);
    const { page, limit, q, kind, facultyId, departmentId, year, stage, grade, studyType,
            enrollmentStatus, phone, format } =
      req.query as unknown as z.infer<typeof directoryQuerySchema>;

    // Phone search: digits-only fold, matched against the normalized
    // columns (prefix match — the registrar types half a number).
    const phoneDigits = phone ? phone.replace(/\D/g, '') : '';

    if (kind === 'student') {
      const teacherRoster = role === Role.TEACHER
        ? { some: { offering: { teacherId: req.user!.id, course: { department: { faculty: { institutionId: scope } } } } } }
        : undefined;

      const where = {
        institutionId: scope,
        ...(facultyId ? { facultyId } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(year ? { year } : {}),
        ...(stage ? { stage } : {}),
        ...(grade ? { grade } : {}),
        ...(studyType ? { studyType } : {}),
        ...(enrollmentStatus ? { enrollmentStatus } : {}),
        ...(phoneDigits
          ? {
              OR: [
                { studentPhoneNormalized: { startsWith: phoneDigits } },
                { guardianPhoneNormalized: { startsWith: phoneDigits } },
              ],
            }
          : {}),
        ...(q
          ? {
              OR: [
                { nameAr: { contains: q } },
                { nameEn: { contains: q, mode: 'insensitive' as const } },
                { universityId: { contains: q, mode: 'insensitive' as const } },
                {
                  user: {
                    OR: [
                      { firstName: { contains: q, mode: 'insensitive' as const } },
                      { lastName: { contains: q, mode: 'insensitive' as const } },
                    ],
                  },
                },
              ],
            }
          : {}),
        ...(teacherRoster ? { user: { enrollments: teacherRoster } } : {}),
      };

      const [rows, total] = await Promise.all([
        withRetry(() => prisma.studentProfile.findMany({
          where,
          orderBy: [{ universityId: 'asc' }],
          skip: format === 'json' ? (page - 1) * limit : undefined,
          take: format === 'json' ? limit : undefined,
          select: {
            ...studentSelect,
            user: {
              select: { id: true, firstName: true, lastName: true, email: true,
                        avatarColor: true, avatarInitials: true, isActive: true },
            },
          },
        })),
        format === 'json'
          ? withRetry(() => prisma.studentProfile.count({ where }))
          : Promise.resolve(0),
      ]);

      if (format === 'json') {
        return res.json({
          data: rows.map((r) => ({
            ...shapeStudentProfileFor(r as unknown as StudentProfileInput, { role, isSelf: false }),
            user: r.user,
            faculty: r.faculty,
            department: r.department,
            year: r.year,
          })),
          meta: buildMeta(page, limit, total),
        });
      }

      // Exports: masked per the caller's lens too — a teacher exporting
      // the roster gets the same access they see on screen.
      const headers = [
        'رقم القيد', 'الاسم', 'الاسم (لاتيني)', 'الهاتف', 'هاتف ولي الأمر',
        'ولي الأمر', 'الكلية', 'القسم', 'السنة', 'المرحلة', 'الصف', 'الفصل',
        'وضع الدراسة', 'الحالة',
      ];
      const exportRows = rows.map((r) => {
        const v = shapeStudentProfileFor(r as unknown as StudentProfileInput, { role, isSelf: false });
        const g = v.guardian as { name: string | null; phone: { display: string | null } } | null;
        return [
          escapeCell(r.universityId),
          escapeCell(r.nameAr ?? `${r.user.firstName} ${r.user.lastName}`),
          escapeCell(r.nameEn),
          escapeCell((v.phone as { display: string | null }).display),
          escapeCell(g?.phone.display ?? null),
          escapeCell(g?.name ?? null),
          escapeCell(r.faculty?.name ?? null),
          escapeCell(r.department?.name ?? null),
          escapeCell(r.year),
          escapeCell(r.stage),
          escapeCell(r.grade),
          escapeCell(r.section),
          escapeCell(r.studyType),
          escapeCell((v.academic as { enrollmentStatus: string }).enrollmentStatus),
        ];
      });

      await audit(req.user!.id, scope, 'directory.export', 'StudentProfile', 'students', {
        kind, format, rows: rows.length, filters: { facultyId, departmentId, year, stage, grade, studyType, enrollmentStatus },
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="madarek-students.csv"');
        return res.send(toCsv(headers, exportRows));
      }
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('الطلاب');
      sheet.addRow(headers);
      sheet.views = [{ rightToLeft: true }];
      exportRows.forEach((r) => sheet.addRow(r));
      sheet.getRow(1).font = { bold: true };
      const out = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="madarek-students.xlsx"');
      return res.send(Buffer.from(out as ArrayBuffer));
    }

    // kind === 'teacher'
    const where = {
      membership: { institutionId: scope, isActive: true },
      ...(departmentId ? { departmentId } : {}),
      ...(phoneDigits
        ? { personalPhoneNormalized: { startsWith: phoneDigits } }
        : {}),
      ...(q
        ? {
            OR: [
              { nameAr: { contains: q } },
              { nameEn: { contains: q, mode: 'insensitive' as const } },
              { employeeId: { contains: q, mode: 'insensitive' as const } },
              {
                user: {
                  OR: [
                    { firstName: { contains: q, mode: 'insensitive' as const } },
                    { lastName: { contains: q, mode: 'insensitive' as const } },
                  ],
                },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      withRetry(() => prisma.teacherProfile.findMany({
        where,
        orderBy: [{ specialty: 'asc' }],
        skip: format === 'json' ? (page - 1) * limit : undefined,
        take: format === 'json' ? limit : undefined,
        select: {
          ...teacherSelect,
          user: { select: { id: true, firstName: true, lastName: true, email: true,
                            avatarColor: true, avatarInitials: true, isActive: true } },
        },
      })),
      format === 'json' ? withRetry(() => prisma.teacherProfile.count({ where })) : Promise.resolve(0),
    ]);

    if (format === 'json') {
      return res.json({
        data: rows.map((r) => ({
          ...shapeTeacherProfileFor(r as unknown as TeacherProfileInput, { role, isSelf: false }),
          user: r.user,
          department: r.department,
        })),
        meta: buildMeta(page, limit, total),
      });
    }

    const headers = ['الاسم', 'الاسم (لاتيني)', 'الرقم الوظيفي', 'التخصص', 'الرتبة',
                     'الهاتف الشخصي', 'هاتف المكتب', 'البريد الرسمي', 'القسم', 'قناة التواصل'];
    const exportRows = rows.map((r) => {
      const v = shapeTeacherProfileFor(r as unknown as TeacherProfileInput, { role, isSelf: false });
      return [
        escapeCell(r.nameAr ?? `${r.user.firstName} ${r.user.lastName}`),
        escapeCell(r.nameEn),
        escapeCell(role === 'ADMIN' || role === 'OWNER' ? r.employeeId : null),
        escapeCell(r.specialty),
        escapeCell(r.rank),
        escapeCell((v.phone as { display: string | null }).display),
        escapeCell(r.officialPhone),
        escapeCell(r.officialEmail),
        escapeCell(r.department?.name ?? null),
        escapeCell(r.preferredContact),
      ];
    });

    await audit(req.user!.id, scope, 'directory.export', 'TeacherProfile', 'teachers', {
      kind, format, rows: rows.length,
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="madarek-teachers.csv"');
      return res.send(toCsv(headers, exportRows));
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('المدرّسون');
    sheet.addRow(headers);
    sheet.views = [{ rightToLeft: true }];
    exportRows.forEach((r) => sheet.addRow(r));
    sheet.getRow(1).font = { bold: true };
    const out = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="madarek-teachers.xlsx"');
    return res.send(Buffer.from(out as ArrayBuffer));
  } catch (e) { next(e); }
});

/* ════════════════════════════════════════════════════════════════
   POST /people/:id/contact-request — the PRIVATE-phone door
   ════════════════════════════════════════════════════════════════ */
const contactRequestRateLimiterStore = new Map<string, { count: number; resetAt: number }>();
function contactRateGate(userId: string): void {
  const now = Date.now();
  const entry = contactRequestRateLimiterStore.get(userId);
  if (!entry || entry.resetAt < now) {
    contactRequestRateLimiterStore.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return;
  }
  entry.count += 1;
  if (entry.count > 10) {
    throw new AppError(
      'TOO_MANY_REQUESTS',
      'طلبات تواصل كثيرة خلال هذه الساعة — انتظر ثم أعد المحاولة',
      429,
    );
  }
}

router.post(
  '/people/:id/contact-request',
  requireRole(Role.TEACHER, Role.ADMIN, Role.QUALITY),
  validate(contactRequestSchema),
  async (req, res, next) => {
    try {
      const role = req.user!.role;
      const scope = await callerInstitutionOrThrow(req.user!.id, role, req.user!.institutionId);
      contactRateGate(req.user!.id);
      const { channel, message } = req.body as z.infer<typeof contactRequestSchema>;

      const student = await withRetry(() => prisma.studentProfile.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, institutionId: true, userId: true,
          studentPhoneVisibility: true, guardianPhoneVisibility: true,
        },
      }));
      if (!student || student.institutionId !== scope) throw AppError.notFound();

      // The door exists ONLY for a genuinely private phone — a request on
      // a staff-visible phone is a client bug, answered honestly.
      const visibility = channel === 'guardian'
        ? student.guardianPhoneVisibility
        : student.studentPhoneVisibility;
      if (visibility !== 'PRIVATE') {
        throw new AppError(
          'VALIDATION_ERROR',
          'هذا الهاتف متاح لطاقم المؤسسة — لا حاجة لطلب تواصل',
          400,
        );
      }

      // 24h per-target dedup, via the audit trail (no new model).
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await withRetry(() => prisma.auditLog.findFirst({
        where: {
          userId: req.user!.id,
          action: 'people.contact-request',
          resourceId: student.id,
          createdAt: { gt: since },
        },
        select: { id: true },
      }));
      if (recent) {
        throw new AppError(
          'TOO_MANY_REQUESTS',
          'سبق أن أرسلت طلب تواصل لهذا الملف خلال 24 ساعة — يُراجع قريبًا',
          429,
        );
      }

      const requester = await withRetry(() => prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { firstName: true, lastName: true },
      }));
      const channelLabel = channel === 'guardian' ? 'هاتف ولي الأمر' : 'هاتفك';
      await withRetry(() => prisma.notification.create({
        data: {
          userId: student.userId,
          type: 'SYSTEM',
          icon: 'phone',
          title: 'طلب وسيلة تواصل',
          body: message && message.length > 0
            ? `${requester?.firstName ?? ''} ${requester?.lastName ?? ''} (طاقم المؤسسة) يطلب ${channelLabel}: «${message}»`
            : `${requester?.firstName ?? ''} ${requester?.lastName ?? ''} (طاقم المؤسسة) يطلب ${channelLabel} — يمكنك مشاركته من ملفك أو تجاهل الطلب.`,
          link: '/student/profile',
        },
      }));
      await audit(req.user!.id, scope, 'people.contact-request', 'StudentProfile', student.id, {
        channel,
      });

      res.status(201).json({ data: { sent: true, channel } });
    } catch (e) { next(e); }
  },
);

export default router;
