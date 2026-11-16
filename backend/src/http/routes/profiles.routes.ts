import { Router } from 'express';
import type { Response } from 'express';
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
import {
  buildStorageKey,
  generateStorageId,
  getStorage,
  storageKeyIsValid,
  VercelBlobDriver,
} from '../../lib/storage.js';
import { mintDocSignature } from '../../lib/doc-urls.js';
import { planPhotoZip, PHOTO_ZIP_MAX_ENTRIES } from '../../lib/photo-zip.js';
import { env } from '../../env.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
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

/* ── field definitions (the registrar's custom-field editor) ─────── */

const fieldDefinitionSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'المفتاح: حروف لاتينية صغيرة وأرقام وشرطات فقط')
      .max(60),
    labelAr: z.string().trim().min(1).max(120),
    labelEn: z.string().trim().min(1).max(120),
    entity: z.enum(['STUDENT', 'TEACHER']),
    type: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT']),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(80)).max(30).nullable().optional(),
    validation: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().max(200).optional(),
      })
      .nullable()
      .optional(),
    visibleTo: z.object({ roles: z.array(z.enum(['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'])) }).nullable().optional(),
    searchable: z.boolean().default(false),
    importKeyAr: z.string().trim().max(120).nullable().optional(),
    importKeyEn: z.string().trim().max(120).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .strict();

const fieldDefinitionPatchSchema = fieldDefinitionSchema.partial().extend({
  key: z.undefined().optional(), // the key is immutable after creation
});

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

    // r349-P3: the self view carries the institution's custom fields
    // (the الوثائق section) — visibleTo is NOT re-filtered here: the
    // owner of the file sees their own values (the definitions carry
    // the visibility for OTHER readers; /people/:id applies it).
    const customFields = studentProfile
      ? await customFieldsFor('student', studentProfile.id)
      : teacherProfile
        ? await customFieldsFor('teacher', teacherProfile.id)
        : [];

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
              // ── r349-P2/P3: the shaped self view + custom fields ──
              profile: shapeStudentProfileFor(
                studentProfile as unknown as StudentProfileInput,
                { role: req.user!.role, isSelf: true },
              ),
              customFields,
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
              // ── r349-P2/P3: the shaped self view + custom fields ──
              profile: shapeTeacherProfileFor(
                teacherProfile as unknown as TeacherProfileInput,
                { role: req.user!.role, isSelf: true },
              ),
              customFields,
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

    // r357 L2 — a phone search on the directory IS audited (no values:
    // length + which arms matched, the people.read convention).
    if (phoneDigits.length >= 4) {
      await audit(req.user!.id, scope, 'search.phone', 'DirectoryQuery', phoneDigits.slice(0, 3), {
        surface: 'directory', digits: phoneDigits.length, kind,
      } as Prisma.InputJsonValue);
    }

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

/* ════════════════════════════════════════════════════════════════
   GET /people/:id/history — the file's own trail (الملاحظات tab)
   ════════════════════════════════════════════════════════════════ */
router.get(
  '/people/:id/history',
  requireRole(Role.ADMIN, Role.OWNER, Role.QUALITY),
  async (req, res, next) => {
    try {
      const scope = await callerInstitutionOrThrow(
        req.user!.id, req.user!.role, req.user!.institutionId,
      );
      // The trail exists only for a profile that EXISTS in the caller's
      // institution (student first, teacher fallthrough — 404 otherwise).
      const student = await withRetry(() => prisma.studentProfile.findUnique({
        where: { id: req.params.id },
        select: { id: true, institutionId: true },
      }));
      let resourceType = 'StudentProfile';
      if (student) {
        if (student.institutionId !== scope) throw AppError.notFound();
      } else {
        const teacher = await withRetry(() => prisma.teacherProfile.findUnique({
          where: { id: req.params.id },
          select: { id: true, userId: true },
        }));
        if (!teacher) throw AppError.notFound();
        const membership = await withRetry(() => prisma.membership.findFirst({
          where: { userId: teacher.userId, institutionId: scope, isActive: true },
          select: { id: true },
        }));
        if (!membership) throw AppError.notFound();
        resourceType = 'TeacherProfile';
      }
      const rows = await withRetry(() => prisma.auditLog.findMany({
        where: { resourceType, resourceId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true, action: true, metadata: true, createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }));
      res.json({ data: rows });
    } catch (e) { next(e); }
  },
);

/* ════════════════════════════════════════════════════════════════
   Field definitions — the registrar's custom-field editor (P3)
   ════════════════════════════════════════════════════════════════ */

/** Prisma Json columns need the explicit JsonNull sentinel, not JS null. */
function jsonOrNull(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return v === null || v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue);
}

/** Controlled-JSON guards (E1's fields.ts contract): SELECT types NEED
 *  options; other types must NOT carry them. */
function assertDefinitionShape(
  type: string,
  options: string[] | null | undefined,
): void {
  if (type === 'SELECT' || type === 'MULTI_SELECT') {
    if (!options || options.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'حقول الاختيار تحتاج قائمة خيارات', 400);
    }
    if (new Set(options).size !== options.length) {
      throw new AppError('VALIDATION_ERROR', 'الخيارات مكررة', 400);
    }
  } else if (options && options.length > 0) {
    throw new AppError('VALIDATION_ERROR', 'الخيارات تُستخدم مع حقول الاختيار فقط', 400);
  }
}

router.get(
  '/field-definitions',
  requireRole(Role.TEACHER, Role.ADMIN, Role.QUALITY, Role.OWNER),
  async (req, res, next) => {
    try {
      const scope = await callerInstitutionOrThrow(
        req.user!.id, req.user!.role, req.user!.institutionId,
      );
      const entity =
        req.query.entity === 'TEACHER' ? 'TEACHER' : req.query.entity === 'STUDENT' ? 'STUDENT' : undefined;
      const rows = await withRetry(() => prisma.institutionFieldDefinition.findMany({
        where: { institutionId: scope, ...(entity ? { entity } : {}) },
        orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }],
      }));
      res.json({ data: rows });
    } catch (e) { next(e); }
  },
);

router.post(
  '/field-definitions',
  requireRole(Role.ADMIN, Role.OWNER),
  validate(fieldDefinitionSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof fieldDefinitionSchema>;
      const scope = await callerInstitutionOrThrow(
        req.user!.id, req.user!.role, req.user!.institutionId,
      );
      assertDefinitionShape(body.type, body.options ?? null);
      // Per (institution, entity, sortOrder) uniqueness: two fields may
      // not claim one seat (schema @@unique).
      const seatTaken = await withRetry(() => prisma.institutionFieldDefinition.findFirst({
        where: { institutionId: scope, entity: body.entity, sortOrder: body.sortOrder },
        select: { id: true },
      }));
      if (seatTaken) {
        throw new AppError('VALIDATION_ERROR', 'هذا الترتيب مشغول بحقل آخر لنفس الكيان', 400);
      }
      const created = await withRetry(() => prisma.institutionFieldDefinition.create({
        data: {
          institutionId: scope,
          key: body.key,
          labelAr: body.labelAr,
          labelEn: body.labelEn,
          entity: body.entity,
          type: body.type,
          required: body.required,
          options: jsonOrNull(body.options),
          validation: jsonOrNull(body.validation),
          visibleTo: jsonOrNull(body.visibleTo),
          searchable: body.searchable,
          importKeyAr: body.importKeyAr ?? null,
          importKeyEn: body.importKeyEn ?? null,
          sortOrder: body.sortOrder,
        },
      }));
      await audit(req.user!.id, scope, 'field-definition.create', 'InstitutionFieldDefinition', created.id, {
        key: created.key, entity: created.entity, type: created.type,
      } as Prisma.InputJsonValue);
      res.status(201).json({ data: created });
    } catch (e) { next(e); }
  },
);

router.patch(
  '/field-definitions/:id',
  requireRole(Role.ADMIN, Role.OWNER),
  validate(fieldDefinitionPatchSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof fieldDefinitionPatchSchema>;
      const scope = await callerInstitutionOrThrow(
        req.user!.id, req.user!.role, req.user!.institutionId,
      );
      const existing = await withRetry(() => prisma.institutionFieldDefinition.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, institutionId: true, type: true, sortOrder: true,
          entity: true, options: true,
        },
      }));
      if (!existing || existing.institutionId !== scope) throw AppError.notFound();
      // The MERGED shape must stay coherent: a SELECT keeps real options,
      // a non-SELECT carries none (E1's controlled-JSON contract).
      const nextType = body.type ?? existing.type;
      const existingOptions = Array.isArray(existing.options)
        ? (existing.options as string[])
        : null;
      const nextOptions =
        body.options !== undefined ? body.options : existingOptions;
      assertDefinitionShape(nextType, nextOptions);
      if (body.sortOrder !== undefined && body.sortOrder !== existing.sortOrder) {
        const seatTaken = await withRetry(() => prisma.institutionFieldDefinition.findFirst({
          where: {
            institutionId: scope, entity: existing.entity,
            sortOrder: body.sortOrder, id: { not: existing.id },
          },
          select: { id: true },
        }));
        if (seatTaken) {
          throw new AppError('VALIDATION_ERROR', 'هذا الترتيب مشغول بحقل آخر لنفس الكيان', 400);
        }
      }
      const updated = await withRetry(() => prisma.institutionFieldDefinition.update({
        where: { id: existing.id },
        data: {
          ...(body.labelAr !== undefined ? { labelAr: body.labelAr } : {}),
          ...(body.labelEn !== undefined ? { labelEn: body.labelEn } : {}),
          ...(body.type !== undefined ? { type: body.type } : {}),
          ...(body.required !== undefined ? { required: body.required } : {}),
          ...(body.options !== undefined ? { options: jsonOrNull(body.options) } : {}),
          ...(body.validation !== undefined ? { validation: jsonOrNull(body.validation) } : {}),
          ...(body.visibleTo !== undefined ? { visibleTo: jsonOrNull(body.visibleTo) } : {}),
          ...(body.searchable !== undefined ? { searchable: body.searchable } : {}),
          ...(body.importKeyAr !== undefined ? { importKeyAr: body.importKeyAr } : {}),
          ...(body.importKeyEn !== undefined ? { importKeyEn: body.importKeyEn } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        },
      }));
      await audit(req.user!.id, scope, 'field-definition.update', 'InstitutionFieldDefinition', existing.id, {
        fields: Object.keys(body),
      } as Prisma.InputJsonValue);
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

router.delete(
  '/field-definitions/:id',
  requireRole(Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const scope = await callerInstitutionOrThrow(
        req.user!.id, req.user!.role, req.user!.institutionId,
      );
      const existing = await withRetry(() => prisma.institutionFieldDefinition.findUnique({
        where: { id: req.params.id },
        select: { id: true, institutionId: true, key: true, entity: true },
      }));
      if (!existing || existing.institutionId !== scope) throw AppError.notFound();
      // Deleting a definition cascades its FieldValue rows (schema) —
      // the registrar sees the consequence in the confirm copy (FE).
      await withRetry(() => prisma.institutionFieldDefinition.delete({
        where: { id: existing.id },
      }));
      await audit(req.user!.id, scope, 'field-definition.delete', 'InstitutionFieldDefinition', existing.id, {
        key: existing.key, entity: existing.entity,
      } as Prisma.InputJsonValue);
      res.json({ data: { deleted: true } });
    } catch (e) { next(e); }
  },
);

/* ════════════════════════════════════════════════════════════
   r357 L2 — student photo · important documents · photo-ZIP ·
   the rest of this file is the accounts/student-data lane.
   ═══════════════════════════════════════════════════════════ */

/* ── pure guards (exported for tests) ─────────────────────────── */

/** Sniff the actual bytes: 'webp' | 'png' | null — never the
 *  client's claim. WebP = RIFF….WEBP; PNG = \x89PNG\r\n\x1a\n. */
export function sniffImageKind(buf: Buffer): 'webp' | 'png' | null {
  if (buf.length >= 12 && buf.readUInt32BE(0) === 0x52494646 && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'png';
  return null;
}

/** \u0000PDF- start. */
export function sniffPdfMagic(buf: Buffer): boolean {
  return buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-';
}

const PHOTO_EXT: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png' };
const DOC_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/webp': 'webp',
};
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const DOC_MAX_BYTES = 10 * 1024 * 1024;
const PHOTO_ZIP_MAX_BYTES = 20 * 1024 * 1024;
const PRESIGN_TTL_MS = 10 * 60_000;

function presignUnsupported(): AppError {
  return new AppError('INTERNAL', 'الرفع المباشر يتطلب تخزين Blob مهيّأً — الوضع الحالي لا يدعمه', 503);
}

async function requireBlobDriver() {
  const storage = getStorage();
  if (!(storage instanceof VercelBlobDriver)) throw presignUnsupported();
  return storage;
}

const mediaLimiter = createRouteLimiter({ max: 30 });

/* ── student photo (client WebP; PNG accepted as the e2e/fallback) ── */

const photoTicketSchema = z.object({
  contentType: z.enum(['image/webp', 'image/png']),
  sizeBytes: z.number().int().positive().max(PHOTO_MAX_BYTES),
});

router.post('/me/profile/photo-ticket', mediaLimiter, validate(photoTicketSchema, 'body'), async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) throw AppError.forbidden('صورة الملف تُرفع من حساب الطالب نفسه');
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();
    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope }, select: { id: true },
    }));
    if (!profile) throw AppError.notFound('لا يوجد ملف طالب لهذا المستخدم في مؤسسته الحالية');

    const storage = await requireBlobDriver();
    const ext = PHOTO_EXT[req.body.contentType as keyof typeof PHOTO_EXT];
    const key = buildStorageKey('profile-media', `${generateStorageId()}.${ext}`);
    const { uploadUrl } = await storage.presignClientPut(key, {
      allowedContentType: req.body.contentType as string,
      maximumSizeInBytes: PHOTO_MAX_BYTES,
      validUntilMs: Date.now() + PRESIGN_TTL_MS,
    });
    res.json({ data: { mode: 'client-upload' as const, key, uploadUrl, validUntilMs: Date.now() + PRESIGN_TTL_MS } });
  } catch (e) { next(e); }
});

const photoConfirmSchema = z.object({ key: z.string().min(6).max(120) });

router.post('/me/profile/photo-confirm', mediaLimiter, validate(photoConfirmSchema, 'body'), async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) throw AppError.forbidden();
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();
    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope },
      select: { id: true, profileImageUrl: true },
    }));
    if (!profile) throw AppError.notFound('لا يوجد ملف طالب لهذا المستخدم في مؤسسته الحالية');

    const key = req.body.key as string;
    if (!storageKeyIsValid(key) || !key.startsWith('profile-media/') || /\.(zip)$/.test(key)) {
      throw AppError.badRequest('مفتاح الرفع غير صالح');
    }
    const storage = await requireBlobDriver();
    const stat = await storage.stat(key);
    if (!stat || stat.size > PHOTO_MAX_BYTES) throw AppError.badRequest('حجم الصورة خارج الحدود');
    const buf = await storage.get(key);
    if (!buf) throw AppError.badRequest('الصورة لم تصل إلى التخزين — أعد المحاولة');
    const kind = sniffImageKind(buf);
    if (!kind || !key.endsWith(`.${kind}`)) {
      throw AppError.badRequest('المحتوى ليس صورة WebP/PNG سليمة');
    }

    const previous = profile.profileImageUrl;
    await withRetry(() => prisma.studentProfile.update({
      where: { id: profile.id },
      data: { profileImageUrl: key }, select: { id: true },
    }));
    // best-effort: retire the previous object (a stale orphan is not a leak vector).
    if (previous && previous.startsWith('profile-media/') && previous !== key) { void storage.delete(previous); }

    await audit(req.user!.id, scope, 'profile.photo-set', 'StudentProfile', profile.id, {
      contentType: `image/${kind}`, sizeBytes: stat.size,
    } as Prisma.InputJsonValue);
    res.json({ data: { key, sizeBytes: stat.size } });
  } catch (e) { next(e); }
});

/** Stream the caller's own photo (auth-checked; never a public URL). */
async function streamProfilePhoto(res: Response, key: string): Promise<void> {
  const storage = getStorage();
  const buf = await storage.get(key);
  if (!buf) throw AppError.notFound('الصورة غير موجودة');
  const kind = sniffImageKind(buf);
  const ct = kind === 'webp' ? 'image/webp' : kind === 'png' ? 'image/png' : 'application/octet-stream';
  res.setHeader('Content-Type', ct);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.end(buf);
}

router.get('/me/profile/photo', async (req, res, next) => {
  try {
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();
    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope }, select: { profileImageUrl: true },
    }));
    const key = profile?.profileImageUrl ?? null;
    if (!key || !key.startsWith('profile-media/')) throw AppError.notFound('لا توجد صورة مرفوعة');
    await streamProfilePhoto(res, key);
  } catch (e) { next(e); }
});

/** Staff read of one student's photo (same gates as /people/:id). */
router.get('/people/:id/photo', async (req, res, next) => {
  try {
    const role = req.user!.role;
    if (!canViewPeople(role)) throw AppError.forbidden();
    const scope = await callerInstitutionOrThrow(req.user!.id, role, req.user!.institutionId);
    const profile = await withRetry(() => prisma.studentProfile.findUnique({
      where: { id: req.params.id }, select: { id: true, institutionId: true, profileImageUrl: true },
    }));
    if (!profile || profile.institutionId !== scope || !profile.profileImageUrl?.startsWith('profile-media/')) {
      throw AppError.notFound('لا توجد صورة مرفوعة');
    }
    await audit(req.user!.id, scope, 'people.photo-read', 'StudentProfile', profile.id, {} as Prisma.InputJsonValue);
    await streamProfilePhoto(res, profile.profileImageUrl);
  } catch (e) { next(e); }
});

/* ── important documents (signed URLs) ───────────────────────── */

const DOC_KINDS = ['passport', 'certificate', 'national-id', 'transcript', 'other'] as const;

const docTicketSchema = z.object({
  titleAr: z.string().trim().min(2).max(160),
  kind: z.enum(DOC_KINDS),
  contentType: z.enum(['application/pdf', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().positive().max(DOC_MAX_BYTES),
});

router.post('/me/documents/ticket', mediaLimiter, validate(docTicketSchema, 'body'), async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) throw AppError.forbidden('الوثائق تُرفع من حساب الطالب نفسه');
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();
    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope }, select: { id: true },
    }));
    if (!profile) throw AppError.notFound('لا يوجد ملف طالب لهذا المستخدم في مؤسسته الحالية');

    const storage = await requireBlobDriver();
    const ext = DOC_TYPES[req.body.contentType as keyof typeof DOC_TYPES];
    const key = buildStorageKey('profile-media', `${generateStorageId()}.${ext}`);
    const { uploadUrl } = await storage.presignClientPut(key, {
      allowedContentType: req.body.contentType as string,
      maximumSizeInBytes: DOC_MAX_BYTES,
      validUntilMs: Date.now() + PRESIGN_TTL_MS,
    });
    res.json({ data: { mode: 'client-upload' as const, key, uploadUrl, validUntilMs: Date.now() + PRESIGN_TTL_MS } });
  } catch (e) { next(e); }
});

const docConfirmSchema = z.object({
  key: z.string().min(6).max(120),
  titleAr: z.string().trim().min(2).max(160),
  kind: z.enum(DOC_KINDS),
});

router.post('/me/documents/confirm', mediaLimiter, validate(docConfirmSchema, 'body'), async (req, res, next) => {
  try {
    if (req.user!.role !== Role.STUDENT) throw AppError.forbidden();
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();
    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope }, select: { id: true },
    }));
    if (!profile) throw AppError.notFound('لا يوجد ملف طالب لهذا المستخدم في مؤسسته الحالية');

    const key = req.body.key as string;
    if (!storageKeyIsValid(key) || !key.startsWith('profile-media/') || /\.(zip)$/.test(key)) {
      throw AppError.badRequest('مفتاح الرفع غير صالح');
    }
    const storage = await requireBlobDriver();
    const stat = await storage.stat(key);
    if (!stat || stat.size > DOC_MAX_BYTES) throw AppError.badRequest('حجم الوثيقة خارج الحدود');
    const buf = await storage.get(key);
    if (!buf) throw AppError.badRequest('الوثيقة لم تصل إلى التخزين — أعد المحاولة');
    const ext = key.slice(key.lastIndexOf('.') + 1).toLowerCase();
    const ok = ext === 'pdf' ? sniffPdfMagic(buf) : (sniffImageKind(buf) !== null && key.endsWith(`.${sniffImageKind(buf)}`));
    if (!ok) throw AppError.badRequest('المحتوى لا يطابق النوع المعلن');

    const row = await withRetry(() => prisma.studentDocument.create({
      data: {
        studentProfileId: profile.id,
        titleAr: req.body.titleAr as string,
        kind: req.body.kind as string,
        storageKey: key,
        contentType: ext === 'pdf' ? 'application/pdf' : `image/${sniffImageKind(buf)}`,
        sizeBytes: stat.size,
        uploadedBy: req.user!.id,
        institutionId: scope,
      },
      select: { id: true, createdAt: true },
    }));
    await audit(req.user!.id, scope, 'document.attach', 'StudentDocument', row.id, {
      kind: req.body.kind as string, sizeBytes: stat.size,
    } as Prisma.InputJsonValue);
    res.status(201).json({ data: row });
  } catch (e) { next(e); }
});

router.get('/me/documents', async (req, res, next) => {
  try {
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();
    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope }, select: { id: true },
    }));
    if (!profile) throw AppError.notFound('لا يوجد ملف طالب لهذا المستخدم في مؤسسته الحالية');
    const docs = await withRetry(() => prisma.studentDocument.findMany({
      where: { studentProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, titleAr: true, kind: true, contentType: true, sizeBytes: true, createdAt: true },
    }));
    res.json({ data: docs });
  } catch (e) { next(e); }
});

router.delete('/me/documents/:id', mediaLimiter, async (req, res, next) => {
  try {
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();
    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope }, select: { id: true },
    }));
    if (!profile) throw AppError.notFound('لا يوجد ملف طالب لهذا المستخدم في مؤسسته الحالية');
    const row = await withRetry(() => prisma.studentDocument.findUnique({ where: { id: req.params.id } }));
    if (!row || row.studentProfileId !== profile.id) throw AppError.notFound();
    await withRetry(() => prisma.studentDocument.delete({ where: { id: row.id } }));
    try { (await requireBlobDriver()).delete(row.storageKey); } catch { /* best-effort */ }
    await audit(req.user!.id, scope, 'document.delete', 'StudentDocument', row.id, {
      kind: row.kind, sizeBytes: row.sizeBytes,
    } as Prisma.InputJsonValue);
    res.json({ data: { deleted: true } });
  } catch (e) { next(e); }
});

router.get('/me/documents/:id/url', mediaLimiter, async (req, res, next) => {
  try {
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (!scope) throw institutionContextRequiredError();
    const profile = await withRetry(() => prisma.studentProfile.findFirst({
      where: { userId: req.user!.id, institutionId: scope }, select: { id: true },
    }));
    if (!profile) throw AppError.notFound('لا يوجد ملف طالب لهذا المستخدم في مؤسسته الحالية');
    const row = await withRetry(() => prisma.studentDocument.findUnique({ where: { id: req.params.id } }));
    if (!row || row.studentProfileId !== profile.id) throw AppError.notFound();

    const { exp, sig } = mintDocSignature(env.JWT_ACCESS_SECRET, row.id);
    const rawOrigin =
      typeof req.headers.origin === 'string' && /^https?:\/\/[^/]+/.test(req.headers.origin)
        ? req.headers.origin
        : (env.APP_ORIGIN ?? 'http://localhost:5173');
    const url = `${rawOrigin.replace(/\/+$/, '')}/api/v1/files/documents/${row.id}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
    await audit(req.user!.id, scope, 'document.url-mint', 'StudentDocument', row.id, {} as Prisma.InputJsonValue);
    res.json({ data: { url, expiresAt: new Date(exp * 1000).toISOString() } });
  } catch (e) { next(e); }
});

/* ── photo-ZIP bulk attach (registrar) ────────────────────────── */

const PHOTO_ZIP_TYPES: Record<string, string> = { '.zip': 'application/zip' };

const zipTicketSchema = z.object({
  filename: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(PHOTO_ZIP_MAX_BYTES),
});

router.post('/people/photos-zip/upload-ticket', mediaLimiter, requireRole(Role.ADMIN, Role.OWNER), validate(zipTicketSchema, 'body'), async (req, res, next) => {
  try {
    const scope = await callerInstitutionOrThrow(req.user!.id, req.user!.role, req.user!.institutionId);
    const baseName = (req.body.filename as string).split(/[\\/]/).pop() ?? '';
    const ext = baseName.slice(baseName.lastIndexOf('.')).toLowerCase();
    const contentType = PHOTO_ZIP_TYPES[ext];
    if (!contentType) throw AppError.badRequest('الملف يجب أن يكون أرشيف zip');
    const storage = await requireBlobDriver();
    const key = buildStorageKey('profile-media', `${generateStorageId()}.zip`);
    const validUntilMs = Date.now() + PRESIGN_TTL_MS;
    const { uploadUrl } = await storage.presignClientPut(key, {
      allowedContentType: contentType,
      maximumSizeInBytes: PHOTO_ZIP_MAX_BYTES,
      validUntilMs,
    });
    await withRetry(() => prisma.importUpload.create({
      data: { key, sizeBytes: req.body.sizeBytes as number, mintedBy: req.user!.id, institutionId: scope },
    }));
    res.json({ data: { mode: 'client-upload' as const, key, uploadUrl, validUntilMs } });
  } catch (e) { next(e); }
});

const zipProcessSchema = z.object({ storageKey: z.string().min(6).max(120) });

router.post('/people/photos-zip/process', mediaLimiter, requireRole(Role.ADMIN, Role.OWNER), validate(zipProcessSchema, 'body'), async (req, res, next) => {
  try {
    const scope = await callerInstitutionOrThrow(req.user!.id, req.user!.role, req.user!.institutionId);
    const key = req.body.storageKey as string;
    // the ticket gate: ONLY a key this server minted (an ImportUpload
    // row, not yet consumed) — an arbitrary key is a read primitive
    // over the whole store and dies here.
    if (!storageKeyIsValid(key) || !key.startsWith('profile-media/') || !key.endsWith('.zip')) {
      throw AppError.badRequest('مفتاح الأرشيف غير صالح');
    }
    const ticket = await withRetry(() => prisma.importUpload.findUnique({ where: { key } }));
    if (!ticket || ticket.consumedAt) throw AppError.badRequest('مفتاح الأرشيف غير معروف — ابدأ الرفع من جديد');

    const storage = await requireBlobDriver();
    const buf = await storage.get(key);
    if (!buf || buf.length > PHOTO_ZIP_MAX_BYTES) throw AppError.badRequest('الأرشيف لم يصل أو حجمه خارج الحدود');

    const { default: AdmZip } = await import('adm-zip');
    const zip = new AdmZip(buf);
    const rawEntries = zip.getEntries();
    if (rawEntries.length > PHOTO_ZIP_MAX_ENTRIES) {
      throw AppError.badRequest(`الأرشيف يحوي أكثر من ${PHOTO_ZIP_MAX_ENTRIES} ملفًا — قسّمه`);
    }
    const entries: { name: string; sizeBytes: number; bytes: Buffer }[] = rawEntries
      .filter((e) => !e.isDirectory)
      .map((e) => ({ name: e.entryName, sizeBytes: e.header.size, bytes: e.getData() }));

    const students = await withRetry(() => prisma.studentProfile.findMany({
      where: { institutionId: scope },
      select: { universityId: true, id: true },
    }));
    const plan = planPhotoZip(
      entries.map((e) => ({ name: e.name, sizeBytes: e.sizeBytes })),
      students.map((s) => ({ universityId: s.universityId, profileId: s.id })),
    );

    let attached = 0;
    for (const v of plan.verdicts) {
      if (v.kind !== 'attach') continue;
      const entry = entries.find((e) => e.name === v.entry);
      if (!entry) continue;
      const objectKey = buildStorageKey('profile-media', `${generateStorageId()}${v.ext}`);
      await storage.put(objectKey, entry.bytes);
      await withRetry(() => prisma.studentProfile.update({
        where: { id: v.profileId },
        data: { profileImageUrl: objectKey },
        select: { id: true },
      }));
      attached += 1;
    }

    // transient by design: the archive is consumed once.
    await withRetry(() => prisma.importUpload.update({ where: { key }, data: { consumedAt: new Date() } }));
    void storage.delete(key);
    await withRetry(() => prisma.importUpload.delete({ where: { key } }));

    await audit(req.user!.id, scope, 'photos-zip.apply', 'StudentProfile', scope, {
      entries: plan.counts.entries, attached, ambiguous: plan.counts.ambiguous, unmatched: plan.counts.unmatched,
    } as Prisma.InputJsonValue);
    res.json({ data: { counts: { ...plan.counts, attached }, verdicts: plan.verdicts } });
  } catch (e) { next(e); }
});

// r357 L2 — the export lives at the END: every L2 route above must
// register on the SAME router instance before the app mounts it.
export default router;
