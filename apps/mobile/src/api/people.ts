/**
 * people.ts — r349-P4: the people surface on mobile (LANE P parity).
 * The shaped profile views, the person read, the contact-request
 * mutation, and the staff directory — the same contracts the web's
 * frontend/src/hooks/resources/people.ts rides. Source of truth for
 * the shapes: backend/src/lib/profiles/privacy.ts (the shaper) —
 * mirrored here as TYPES only; every access decision is server-side.
 *
 * Envelope note (the P5 sweep's lesson, mobile-side): /directory's
 * body paginates with meta SIBLING of data, and the shared client
 * unwraps `data` by key presence — so `get` returns the bare rows and
 * usePagedList's no-meta path (honest-guess pagination) applies. The
 * rows are the shaped directory payloads; nothing is lost that the
 * infinite scroll needs.
 */
import { get, post, patch } from "./client";

/* ── types (the privacy-shaped payloads) ─────────────────────────── */

export interface PhoneView {
  access: "VISIBLE" | "MASKED" | "HIDDEN";
  display: string | null;
  canRequestContact: boolean;
}

export interface NationalIdView {
  access: "VISIBLE" | "MASKED" | "HIDDEN";
  value: string | null;
}

export interface GuardianView {
  name: string | null;
  relationship: string | null;
  phone: PhoneView;
}

export interface AcademicView {
  stage: string | null;
  grade: string | null;
  section: string | null;
  previousSchool: string | null;
  transferStatus: string | null;
  studyType: "MORNING" | "EVENING" | "PARALLEL" | null;
  enrollmentStatus: "ACTIVE" | "SUSPENDED" | "DEFERRED" | "GRADUATED" | "WITHDRAWN";
  secondarySchool: string | null;
  secondarySchoolBranch: string | null;
  secondarySchoolPercent: number | null;
  admissionYear: number | null;
}

export interface CustomFieldValue {
  key: string;
  labelAr: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT";
  value: unknown;
}

/** The shaped student profile (self view from /me/profile, staff view
 *  from /people/:id — the same shape, different access levels). */
export interface StudentProfileView {
  id: string;
  userId: string;
  kind: "student";
  nameAr: string | null;
  nameEn: string | null;
  fatherName: string | null;
  grandfatherName: string | null;
  motherName: string | null;
  dateOfBirth: string | null;
  birthPlace: string | null;
  gender: "MALE" | "FEMALE" | "UNSPECIFIED" | null;
  city: string | null;
  address: string | null;
  profileImageUrl: string | null;
  universityId: string;
  phone: PhoneView;
  /** The raw SETTING (not the access) — the owner's الأمان selector. */
  phoneVisibility: "INSTITUTION_STAFF" | "PRIVATE";
  guardianPhoneVisibility: "INSTITUTION_STAFF" | "PRIVATE";
  additionalPhone: string | null;
  guardian: GuardianView | null;
  emergencyContact: { name: string | null; phone: string | null };
  nationalId: NationalIdView;
  nationalIdPresent: boolean;
  academic: AcademicView;
}

/** The shaped teacher profile. */
export interface TeacherProfileView {
  id: string;
  userId: string;
  kind: "teacher";
  nameAr: string | null;
  nameEn: string | null;
  specialty: string;
  rank: string;
  bio: string | null;
  profileImageUrl: string | null;
  officeLocation: string | null;
  officeHours: string | null;
  websiteUrl: string | null;
  employeeId: string | null;
  phone: PhoneView;
  phoneVisibility: "INSTITUTION_STAFF" | "PRIVATE";
  officialPhone: string | null;
  officialEmail: string | null;
  preferredContact: "PHONE" | "WHATSAPP" | "EMAIL" | "OFFICE_HOURS" | null;
}

export interface PersonUserView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarColor: string | null;
  avatarInitials: string | null;
  isActive: boolean;
}

/** GET /people/:id payload (student flavor). */
export interface StudentPerson extends StudentProfileView {
  user: PersonUserView;
  customFields: CustomFieldValue[];
  faculty?: { id: string; name: string; nameEn: string | null } | null;
  department?: { id: string; name: string; nameEn: string | null } | null;
  year?: number;
}

/** GET /people/:id payload (teacher flavor). */
export interface TeacherPerson extends TeacherProfileView {
  user: PersonUserView;
  customFields: CustomFieldValue[];
  department?: { id: string; name: string; nameEn: string | null; faculty?: { name: string } | null } | null;
}

/** Either flavor of /people/:id. */
export type Person = StudentPerson | TeacherPerson;

export interface DirectoryParams {
  kind?: "student" | "teacher";
  q?: string;
  facultyId?: string;
  departmentId?: string;
  year?: number;
  stage?: string;
  grade?: string;
  studyType?: "MORNING" | "EVENING" | "PARALLEL";
  enrollmentStatus?: "ACTIVE" | "SUSPENDED" | "DEFERRED" | "GRADUATED" | "WITHDRAWN";
  phone?: string;
  page?: number;
  limit?: number;
}

/** PATCH /me/profile input (the student self-edit lane — mirrors the
 *  backend's patchMeProfileSchema exactly: contact & demographics only). */
export interface PatchMyProfileInput {
  nameEn?: string | null;
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | "UNSPECIFIED";
  city?: string | null;
  address?: string | null;
  studentPhone?: string | null;
  studentPhoneVisibility?: "INSTITUTION_STAFF" | "PRIVATE";
  additionalPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

/* ── the api ─────────────────────────────────────────────────────── */

export const peopleApi = {
  /** GET /people/:id — the shaped person (student or teacher flavor). */
  person: (id: string) => get<Person>(`/people/${id}`),

  /** GET /directory — the staff contact sheet rows (shaped, filtered).
   *  The client unwraps the envelope's `data` (the rows array); the
   *  meta sibling rides the body, which the paged-list's no-meta path
   *  absorbs (honest-guess pagination — see the file header). */
  directory: (params: DirectoryParams) =>
    get<Person[]>("/directory", {
      kind: params.kind,
      q: params.q,
      facultyId: params.facultyId,
      departmentId: params.departmentId,
      year: params.year,
      stage: params.stage,
      grade: params.grade,
      studyType: params.studyType,
      enrollmentStatus: params.enrollmentStatus,
      phone: params.phone,
      page: params.page,
      limit: params.limit,
    }),

  /** POST /people/:id/contact-request — the hourly-gated ask. */
  contactRequest: (id: string, input: { channel: "student" | "guardian"; message?: string }) =>
    post<{ sent: boolean; channel: string }>(`/people/${id}/contact-request`, input),

  /** PATCH /me/profile — the student's self-edit lane. */
  patchMyProfile: (input: PatchMyProfileInput) =>
    patch<{ id: string; updatedAt: string }>("/me/profile", input),
};
