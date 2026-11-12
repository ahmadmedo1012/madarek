// people.ts — r349-P2/P3: the people surface (LANE P). The shaped
// profile views, the staff directory, the person read/update mutations,
// and the registrar's custom-field definitions. Source of truth for the
// shapes: backend/src/lib/profiles/privacy.ts (the shaper) — mirrored
// here as TYPES only; every access decision is made server-side.

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';

/* ── types (the privacy-shaped payloads) ─────────────────────────── */

export interface PhoneView {
  access: 'VISIBLE' | 'MASKED' | 'HIDDEN';
  display: string | null;
  canRequestContact: boolean;
}

export interface NationalIdView {
  access: 'VISIBLE' | 'MASKED' | 'HIDDEN';
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
  studyType: 'MORNING' | 'EVENING' | 'PARALLEL' | null;
  enrollmentStatus: 'ACTIVE' | 'SUSPENDED' | 'DEFERRED' | 'GRADUATED' | 'WITHDRAWN';
  secondarySchool: string | null;
  secondarySchoolBranch: string | null;
  secondarySchoolPercent: number | null;
  admissionYear: number | null;
}

export interface CustomFieldValue {
  key: string;
  labelAr: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT';
  value: unknown;
}

/** The shaped student profile (self view from /me/profile, staff view
 *  from /people/:id — the same shape, different access levels). */
export interface StudentProfileView {
  id: string;
  userId: string;
  kind: 'student';
  nameAr: string | null;
  nameEn: string | null;
  fatherName: string | null;
  grandfatherName: string | null;
  motherName: string | null;
  dateOfBirth: string | null;
  birthPlace: string | null;
  gender: 'MALE' | 'FEMALE' | 'UNSPECIFIED' | null;
  city: string | null;
  address: string | null;
  profileImageUrl: string | null;
  universityId: string;
  phone: PhoneView;
  /** The raw SETTING (not the access) — the owner's الأمان selector. */
  phoneVisibility: 'INSTITUTION_STAFF' | 'PRIVATE';
  guardianPhoneVisibility: 'INSTITUTION_STAFF' | 'PRIVATE';
  additionalPhone: string | null;
  guardian: GuardianView | null;
  emergencyContact: { name: string | null; phone: string | null };
  nationalId: NationalIdView;
  nationalIdPresent: boolean;
  academic: AcademicView;
}

/** The shaped teacher profile (consumed by student.ts's useMyProfile
 *  teacher view + the in-file base of TeacherPerson). */
export interface TeacherProfileView {
  id: string;
  userId: string;
  kind: 'teacher';
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
  phoneVisibility: 'INSTITUTION_STAFF' | 'PRIVATE';
  officialPhone: string | null;
  officialEmail: string | null;
  preferredContact: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'OFFICE_HOURS' | null;
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

interface DirectoryMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DirectoryParams {
  kind?: 'student' | 'teacher';
  q?: string;
  facultyId?: string;
  departmentId?: string;
  year?: number;
  stage?: string;
  grade?: string;
  studyType?: 'MORNING' | 'EVENING' | 'PARALLEL';
  enrollmentStatus?: 'ACTIVE' | 'SUSPENDED' | 'DEFERRED' | 'GRADUATED' | 'WITHDRAWN';
  phone?: string;
  page?: number;
  limit?: number;
}

export interface FieldDefinition {
  id: string;
  institutionId: string;
  key: string;
  labelAr: string;
  labelEn: string;
  entity: 'STUDENT' | 'TEACHER';
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT';
  required: boolean;
  options: string[] | null;
  validation: { min?: number; max?: number; pattern?: string } | null;
  visibleTo: { roles: string[] } | null;
  searchable: boolean;
  importKeyAr: string | null;
  importKeyEn: string | null;
  sortOrder: number;
}

/* ── the directory ──────────────────────────────────────────────── */

export function useDirectory(params: DirectoryParams) {
  const inst = useInstitutionScope();
  const search = new URLSearchParams();
  if (params.kind) search.set('kind', params.kind);
  if (params.q) search.set('q', params.q);
  if (params.facultyId) search.set('facultyId', params.facultyId);
  if (params.departmentId) search.set('departmentId', params.departmentId);
  if (params.year) search.set('year', String(params.year));
  if (params.stage) search.set('stage', params.stage);
  if (params.grade) search.set('grade', params.grade);
  if (params.studyType) search.set('studyType', params.studyType);
  if (params.enrollmentStatus) search.set('enrollmentStatus', params.enrollmentStatus);
  if (params.phone) search.set('phone', params.phone);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  return useQuery({
    queryKey: withInstitutionScope(['people', 'directory', search.toString()], inst),
    queryFn: () =>
      unwrap<{ data: Array<StudentPerson | TeacherPerson>; meta: DirectoryMeta }>(
        api.get(`/directory?${search.toString()}`),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Export download for the current filters (xlsx/csv). The shared api
 *  pipeline parses JSON bodies — binary exports ride a direct fetch
 *  with the same Authorization header + credentials (the token comes
 *  from the auth store exactly like the pipeline does). */
export async function downloadDirectoryExport(
  params: DirectoryParams,
  format: 'xlsx' | 'csv',
): Promise<void> {
  const search = new URLSearchParams();
  if (params.kind) search.set('kind', params.kind);
  if (params.q) search.set('q', params.q);
  if (params.facultyId) search.set('facultyId', params.facultyId);
  if (params.year) search.set('year', String(params.year));
  if (params.stage) search.set('stage', params.stage);
  if (params.grade) search.set('grade', params.grade);
  if (params.studyType) search.set('studyType', params.studyType);
  if (params.enrollmentStatus) search.set('enrollmentStatus', params.enrollmentStatus);
  if (params.phone) search.set('phone', params.phone);
  search.set('format', format);
  const { apiBaseURL } = await import('../../lib/api');
  const { useAuthStore } = await import('../../stores/auth.store');
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${apiBaseURL}/directory?${search.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('تعذّر تجهيز الملف');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `madarek-${params.kind ?? 'student'}s.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ── the person read ────────────────────────────────────────────── */

export function usePerson(id: string | null) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['people', 'person', id], inst),
    queryFn: () => unwrap<StudentPerson | TeacherPerson>(api.get(`/people/${id}`)),
    enabled: Boolean(id),
  });
}

/* ── mutations ───────────────────────────────────────────────────── */

export interface PatchMyProfileInput {
  nameEn?: string | null;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  city?: string | null;
  address?: string | null;
  studentPhone?: string | null;
  studentPhoneVisibility?: 'INSTITUTION_STAFF' | 'PRIVATE';
  additionalPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export function usePatchMyProfile() {
  const qc = useQueryClient();
  const inst = useInstitutionScope();
  return useMutation({
    mutationFn: (input: PatchMyProfileInput) =>
      unwrap<{ data: { id: string; updatedAt: string } }>(
        api.patch('/me/profile', input),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withInstitutionScope(['me', 'profile'], inst) });
    },
  });
}

export interface PatchPersonInput extends Record<string, unknown> {
  nameAr?: string | null;
  nameEn?: string | null;
  fatherName?: string | null;
  grandfatherName?: string | null;
  motherName?: string | null;
  birthPlace?: string | null;
  nationalId?: string | null;
  city?: string | null;
  address?: string | null;
  studentPhone?: string | null;
  studentPhoneVisibility?: 'INSTITUTION_STAFF' | 'PRIVATE';
  guardianName?: string | null;
  guardianRelationship?: string | null;
  guardianPhone?: string | null;
  guardianPhoneVisibility?: 'INSTITUTION_STAFF' | 'PRIVATE';
  stage?: string | null;
  grade?: string | null;
  section?: string | null;
  studyType?: 'MORNING' | 'EVENING' | 'PARALLEL' | null;
  enrollmentStatus?: 'ACTIVE' | 'SUSPENDED' | 'DEFERRED' | 'GRADUATED' | 'WITHDRAWN' | null;
  secondarySchool?: string | null;
  secondarySchoolBranch?: string | null;
  secondarySchoolPercent?: number | null;
  admissionYear?: number | null;
  employeeId?: string | null;
  preferredContact?: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'OFFICE_HOURS' | null;
}

export function usePatchPerson(id: string | null) {
  const qc = useQueryClient();
  const inst = useInstitutionScope();
  return useMutation({
    mutationFn: (input: PatchPersonInput) =>
      unwrap<{ data: { id: string; updatedAt: string } }>(api.patch(`/people/${id}`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withInstitutionScope(['people', 'person', id], inst) });
      qc.invalidateQueries({ queryKey: withInstitutionScope(['people', 'directory'], inst) });
    },
  });
}

export function useContactRequest(id: string | null) {
  return useMutation({
    mutationFn: (input: { channel: 'student' | 'guardian'; message?: string }) =>
      unwrap<{ data: { sent: boolean; channel: string } }>(
        api.post(`/people/${id}/contact-request`, input),
      ),
  });
}

/* ── field definitions (the registrar's editor) ──────────────────── */

export function useFieldDefinitions(entity?: 'STUDENT' | 'TEACHER') {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['people', 'field-definitions', entity ?? 'all'], inst),
    queryFn: () =>
      unwrap<{ data: FieldDefinition[] }>(
        api.get(`/field-definitions${entity ? `?entity=${entity}` : ''}`),
      ),
  });
}

export function useCreateFieldDefinition() {
  const qc = useQueryClient();
  const inst = useInstitutionScope();
  return useMutation({
    mutationFn: (input: Partial<FieldDefinition> & {
      key: string; labelAr: string; labelEn: string;
      entity: 'STUDENT' | 'TEACHER';
      type: FieldDefinition['type'];
    }) => unwrap<{ data: FieldDefinition }>(api.post('/field-definitions', input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withInstitutionScope(['people', 'field-definitions'], inst) });
    },
  });
}

export function useUpdateFieldDefinition() {
  const qc = useQueryClient();
  const inst = useInstitutionScope();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<FieldDefinition>) =>
      unwrap<{ data: FieldDefinition }>(api.patch(`/field-definitions/${id}`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withInstitutionScope(['people', 'field-definitions'], inst) });
    },
  });
}

export function useDeleteFieldDefinition() {
  const qc = useQueryClient();
  const inst = useInstitutionScope();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<{ data: { deleted: boolean } }>(api.delete(`/field-definitions/${id}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: withInstitutionScope(['people', 'field-definitions'], inst) });
    },
  });
}
