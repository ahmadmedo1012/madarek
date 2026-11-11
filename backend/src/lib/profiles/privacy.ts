/**
 * r349-P2 — مصفوفة الخصوصية: من يرى ماذا من ملف الطالب/المدرّس.
 *
 * THE PRIVACY MATRIX (one engine, one place — PRIVACY-MATRIX.md is its
 * documentation, the tests are its law, this file is its machine):
 *
 * · Phones follow the profile's own PhoneVisibility:
 *     - the profile OWNER always sees their own raw phone;
 *     - INSTITUTION_STAFF (default) → staff roles (TEACHER/ADMIN/
 *       QUALITY/OWNER) of the SAME institution see the raw phone;
 *     - PRIVATE → every other caller sees the MASKED form + a
 *       canRequestContact flag (the POST /people/:id/contact-request
 *       door — a teacher who needs the guardian number asks, the owner
 *       decides).
 * · The national id is shape-gated by ROLE:
 *     - the profile owner sees their own raw id;
 *     - OWNER/ADMIN see the raw id (governance duty of care);
 *     - QUALITY sees the MASKED form;
 *     - TEACHER never sees it — not even masked (PROFILES-RESEARCH §3).
 * · One STUDENT never reads another person's profile at all: the
 *   people routes are staff-only (the G1 rule — students discover no
 *   people); this layer still shapes defensively (HIDDEN) in case a
 *   future caller hands a student a profile object.
 *
 * Pure layer — no DB, no Prisma import: the routes pass plain
 * structurally-typed rows and get back the caller-shaped view. Every
 * access change happens HERE and is pinned by a per-cell test.
 */
import { maskNationalId } from './national-id.js';

/** The three access levels a field can have for a caller. */
export type FieldAccess = 'VISIBLE' | 'MASKED' | 'HIDDEN';

/** The staff roles that may hold a directory/people view at all. */
export const STAFF_ROLES = ['TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const;

/** Structural profile inputs — satisfied by Prisma rows and test rows. */
export interface PhonePairInput {
  display: string | null;
  normalized: string | null;
}

export interface StudentProfileInput {
  id: string;
  userId: string;
  institutionId: string;
  universityId: string;
  nameAr: string | null;
  nameEn: string | null;
  fatherName: string | null;
  grandfatherName: string | null;
  motherName: string | null;
  dateOfBirth: Date | null;
  birthPlace: string | null;
  gender: string | null;
  city: string | null;
  address: string | null;
  profileImageUrl: string | null;
  studentPhone: string | null;
  studentPhoneNormalized: string | null;
  studentPhoneVisibility: string;
  additionalPhone: string | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianPhone: string | null;
  guardianPhoneNormalized: string | null;
  guardianPhoneVisibility: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  nationalId: string | null;
  nationalIdHash: string | null;
  stage: string | null;
  grade: string | null;
  section: string | null;
  previousSchool: string | null;
  transferStatus: string | null;
  studyType: string | null;
  enrollmentStatus: string | null;
  secondarySchool: string | null;
  secondarySchoolBranch: string | null;
  secondarySchoolPercent: unknown;
  admissionYear: number | null;
}

export interface TeacherProfileInput {
  id: string;
  userId: string;
  specialty: string;
  rank: string;
  bio: string | null;
  profileImageUrl: string | null;
  officeLocation: string | null;
  officeHours: string | null;
  websiteUrl: string | null;
  employeeId: string | null;
  nameAr: string | null;
  nameEn: string | null;
  personalPhone: string | null;
  personalPhoneNormalized: string | null;
  personalPhoneVisibility: string;
  officialPhone: string | null;
  officialEmail: string | null;
  preferredContact: string | null;
}

/** The caller's lens: their role + whether they own the profile. */
export interface CallerView {
  role: string;
  isSelf: boolean;
}

/** A phone as the caller may see it. */
export interface PhoneView {
  access: FieldAccess;
  display: string | null;
  /** Set when access === 'MASKED' — the contact-request door. */
  canRequestContact: boolean;
}

/** A national id as the caller may see it. */
export interface NationalIdView {
  access: FieldAccess;
  value: string | null;
}

/**
 * Mask a phone's display form for a PRIVATE phone: keep the last three
 * digits, mask the rest. A masked-but-present value is what makes the
 * "request contact" affordance honest (the caller knows a number
 * exists, not what it is).
 */
export function maskPhoneDisplay(display: string | null): string | null {
  if (typeof display !== 'string' || display.trim() === '') return null;
  const digits = display.replace(/\D/g, '');
  if (digits.length < 4) return '•••';
  const tail = digits.slice(-3);
  return `•••• ${tail}`;
}

/** Phone access per the matrix (owner → raw; staff per visibility; others hidden). */
export function phoneAccess(view: CallerView, visibility: string): FieldAccess {
  if (view.isSelf) return 'VISIBLE';
  if (!(STAFF_ROLES as readonly string[]).includes(view.role)) return 'HIDDEN';
  return visibility === 'PRIVATE' ? 'MASKED' : 'VISIBLE';
}

/** National-id access per the matrix (owner/OWNER/ADMIN raw; QUALITY masked; TEACHER/student hidden). */
export function nationalIdAccess(view: CallerView): FieldAccess {
  if (view.isSelf) return 'VISIBLE';
  if (view.role === 'OWNER' || view.role === 'ADMIN') return 'VISIBLE';
  if (view.role === 'QUALITY') return 'MASKED';
  return 'HIDDEN';
}

function shapePhone(display: string | null, view: CallerView, visibility: string): PhoneView {
  const access = phoneAccess(view, visibility);
  if (access === 'VISIBLE') {
    return { access, display, canRequestContact: false };
  }
  if (access === 'MASKED') {
    return { access, display: maskPhoneDisplay(display), canRequestContact: true };
  }
  return { access, display: null, canRequestContact: false };
}

function shapeNationalId(raw: string | null, view: CallerView): NationalIdView {
  const access = nationalIdAccess(view);
  if (access === 'VISIBLE') return { access, value: raw };
  if (access === 'MASKED') return { access, value: maskNationalId(raw) };
  return { access, value: null };
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in (value as object)) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** The caller-shaped student profile (the GET /people/:id payload core). */
export function shapeStudentProfileFor(
  p: StudentProfileInput,
  view: CallerView,
): Record<string, unknown> {
  const nationalId = shapeNationalId(p.nationalId, view);
  return {
    id: p.id,
    userId: p.userId,
    kind: 'student' as const,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    fatherName: p.fatherName,
    grandfatherName: p.grandfatherName,
    motherName: p.motherName,
    dateOfBirth: p.dateOfBirth,
    birthPlace: p.birthPlace,
    gender: p.gender,
    city: p.city,
    address: p.address,
    profileImageUrl: p.profileImageUrl,
    universityId: p.universityId,
    phone: shapePhone(p.studentPhone, view, p.studentPhoneVisibility),
    additionalPhone: p.additionalPhone,
    guardian:
      view.isSelf || (STAFF_ROLES as readonly string[]).includes(view.role)
        ? {
            name: p.guardianName,
            relationship: p.guardianRelationship,
            phone: shapePhone(p.guardianPhone, view, p.guardianPhoneVisibility),
          }
        : null,
    emergencyContact: { name: p.emergencyContactName, phone: p.emergencyContactPhone },
    nationalId,
    nationalIdPresent: p.nationalId !== null,
    academic: {
      stage: p.stage,
      grade: p.grade,
      section: p.section,
      previousSchool: p.previousSchool,
      transferStatus: p.transferStatus,
      studyType: p.studyType,
      enrollmentStatus: p.enrollmentStatus ?? 'ACTIVE',
      secondarySchool: p.secondarySchool,
      secondarySchoolBranch: p.secondarySchoolBranch,
      secondarySchoolPercent: decimalToNumber(p.secondarySchoolPercent),
      admissionYear: p.admissionYear,
    },
  };
}

/** The caller-shaped teacher profile. */
export function shapeTeacherProfileFor(
  p: TeacherProfileInput,
  view: CallerView,
): Record<string, unknown> {
  return {
    id: p.id,
    userId: p.userId,
    kind: 'teacher' as const,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    specialty: p.specialty,
    rank: p.rank,
    bio: p.bio,
    profileImageUrl: p.profileImageUrl,
    officeLocation: p.officeLocation,
    officeHours: p.officeHours,
    websiteUrl: p.websiteUrl,
    employeeId: (view.isSelf || view.role === 'ADMIN' || view.role === 'OWNER') ? p.employeeId : null,
    phone: shapePhone(p.personalPhone, view, p.personalPhoneVisibility),
    officialPhone: p.officialPhone,
    officialEmail: p.officialEmail,
    preferredContact: p.preferredContact,
  };
}

/**
 * The self-editable STUDENT field set (PATCH /me/profile). The clean
 * two-lane rule: self = contact & preferences only; the documentary
 * identity (nameAr, quadruple parts, nationalId) and the academic
 * record are staff-entered (PATCH /people/:id).
 */
export const STUDENT_SELF_EDITABLE_FIELDS = [
  'nameEn',
  'dateOfBirth',
  'gender',
  'city',
  'address',
  'studentPhone',
  'studentPhoneVisibility',
  'additionalPhone',
  'emergencyContactName',
  'emergencyContactPhone',
] as const;

/** The self-editable TEACHER contact additions (PATCH /me/teacher-profile). */
export const TEACHER_SELF_EDITABLE_CONTACT_FIELDS = [
  'personalPhone',
  'personalPhoneVisibility',
  'preferredContact',
] as const;

/** True when the caller may open the people/directory surface at all. */
export function canViewPeople(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}
