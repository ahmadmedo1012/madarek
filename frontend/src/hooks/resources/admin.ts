// admin.ts — r153c domain split of ../useResources.ts (admin domain: stats · course CRUD · papers register · smart professor onboarding.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';

// ── Admin stats ───────────────────────────────────────────────
export interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalEnrollments: number;
}
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => unwrap<AdminStats>(api.get('/admin/stats')),
  });
}

export interface AdminFaculty {
  id: string;
  name: string;
  nameEn: string | null;
  iconEmoji: string | null;
  city: string;
  departmentCount: number;
  studentCount: number;
  teacherCount: number;
  courseCount: number;
  departments: Array<{ id: string; name: string; students: number; teachers: number; courses: number }>;
}
export function useAdminFaculties() {
  return useQuery({
    queryKey: ['admin', 'faculties'],
    queryFn: () => unwrap<AdminFaculty[]>(api.get('/admin/faculties')),
  });
}

export interface AdminReports {
  headline: { totalPapers: number; publishedPapers: number; totalUsers: number; activeStudents: number };
  paperTrend: Array<{ month: string; submitted: number; graded: number; published: number }>;
  topCourses: Array<{ code: string; name: string; enrollments: number; lectures: number }>;
}
export function useAdminReports() {
  return useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => unwrap<AdminReports>(api.get('/admin/reports')),
  });
}

export interface AdminCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  themeColor: string | null;
  faculty: string | null;
  facultyEmoji: string | null;
  department: string | null;
  offeringCount: number;
  conceptCount: number;
  totalEnrollments: number;
  totalLectures: number;
  totalMaterials: number;
  recentOfferings: Array<{ id: string; term: string; enrollments: number; lectures: number; teacher: string | null }>;
}
/** GET /admin/courses meta (5-B1: server-side page/limit/q/facultyId). */
export interface AdminCoursesMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
/**
 * 5-B4 (audit 5-A8 P2-1 — the silent 20-row cap): /admin/courses is
 * consumed as a PAGINATED list now. Server-side filters (q,
 * facultyId — both shipped by 5-B1) + page/limit; the KPI total and
 * the pagination footer read `meta`, never `data.length`. Keyed on
 * the params object so every parameterized page caches separately;
 * the ['admin','courses'] prefix still matches prefix invalidations.
 */
export function useAdminCourses(
  params: { page?: number; limit?: number; q?: string; facultyId?: string } = {},
) {
  const { page = 1, limit = 20, q, facultyId } = params;
  return useQuery({
    queryKey: ['admin', 'courses', { page, limit, q: q ?? null, facultyId: facultyId ?? null }],
    queryFn: async () => {
      const res = await api.get<{ data: AdminCourse[]; meta: AdminCoursesMeta }>('/admin/courses', {
        params: {
          page,
          limit,
          ...(q ? { q } : {}),
          ...(facultyId ? { facultyId } : {}),
        },
      });
      return { data: res.data.data, meta: res.data.meta };
    },
    // Keeps the roster on screen while the next page/filter loads
    // (AdminStudentsPage pattern) — no skeleton flash mid-browse.
    placeholderData: (prev) => prev,
  });
}

// ── Course CRUD (16-decisions #5: API existed, page was read-only) ──
// The backend already routes POST/PATCH/DELETE with role + FK guards
// (courses.routes.ts); these are the frontend half — the hooks the
// /admin/courses page never had.
export interface CourseFormInput {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  credits: number;
  iconEmoji?: string;
  themeColor?: string;
  departmentId: string;
}
function invalidateCourses(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
}
/** POST /admin/courses — create (16-decisions #5). */
export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CourseFormInput) => unwrap(api.post('/admin/courses', body)),
    onSuccess: () => invalidateCourses(qc),
  });
}
/** PATCH /admin/courses/:id — edit (the list had no edit path). */
export function useUpdateCourse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['course', id],
    mutationFn: (body: Partial<CourseFormInput>) => unwrap(api.patch(`/admin/courses/${id}`, body)),
    onSuccess: () => invalidateCourses(qc),
  });
}
/** DELETE /admin/courses/:id — delete with the FK-conflict guard. */
export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.delete(`/admin/courses/${id}`)),
    onSuccess: () => invalidateCourses(qc),
  });
}

// ── Admin papers (institution-wide research register) ──────────
// 5-B4 (audit 5-A8 §5 row 8): the admin research drill-down. The
// backend endpoint (5-B1) is a projection of the research routes —
// no extractedText, no student email — paginated with the standard
// { data, meta } envelope.
export const RESEARCH_STATUSES = [
  'UPLOADED', 'SCANNING', 'CHECKS_PASSED', 'CHECKS_FAILED', 'GRADED', 'PUBLISHED',
] as const;
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export interface AdminPaper {
  id: string;
  title: string;
  status: ResearchStatus;
  plagiarismPct: number | null;
  aiContentPct: number | null;
  uploadedAt: string;
  student: { id: string; firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null };
  reviewer: { id: string; firstName: string; lastName: string } | null;
  offering: { course: { name: string; code: string } } | null;
}
export interface AdminPapersMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export function useAdminPapers(
  params: { page?: number; limit?: number; q?: string; status?: ResearchStatus } = {},
) {
  const { page = 1, limit = 20, q, status } = params;
  return useQuery({
    queryKey: ['admin', 'papers', { page, limit, q: q ?? null, status: status ?? null }],
    queryFn: async () => {
      const res = await api.get<{ data: AdminPaper[]; meta: AdminPapersMeta }>('/admin/papers', {
        params: {
          page,
          limit,
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
        },
      });
      return { data: res.data.data, meta: res.data.meta };
    },
    placeholderData: (prev) => prev,
  });
}

// ── Smart professor onboarding (admin) ────────────────────────
export interface TeacherSuggestionResponse {
  teacher: {
    id: string;
    name: string;
    email: string;
    specialty: string;
    rank: string;
    degreeLevel: 'BACHELORS' | 'MASTERS' | 'PHD';
    yearsExperience: number;
    certifications: Array<{ title: string; issuer: string; year: number }>;
    subjectKeywords: string[];
    department: string;
    departmentId: string;
    faculty: string;
    facultyId: string;
    verified: boolean;
    position: 'DEAN' | 'ASSOCIATE_DEAN' | 'DEPARTMENT_HEAD' | null;
    positionFacultyId: string | null;
    positionDepartmentId: string | null;
    appointedAt: string | null;
  };
  eligibilityNote: string;
  suggestedCourses: Array<{
    id: string; code: string; name: string;
    iconEmoji: string | null;
    departmentName: string; facultyName: string;
    matchScore: number; reason: string;
  }>;
}
export function useTeacherSuggestions(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'teachers', teacherId, 'suggestions'],
    enabled: !!teacherId,
    queryFn: () => unwrap<TeacherSuggestionResponse>(api.get(`/admin/teachers/${teacherId}/suggestions`)),
  });
}

export type AcademicPositionInput =
  | { position: 'DEAN'; positionFacultyId: string }
  | { position: 'ASSOCIATE_DEAN'; positionFacultyId: string }
  | { position: 'DEPARTMENT_HEAD'; positionDepartmentId: string }
  | { position: null };

export function useAssignTeacherPosition(teacherId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AcademicPositionInput) =>
      unwrap(api.post(`/admin/teachers/${teacherId}/position`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers', teacherId, 'suggestions'] });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      qc.invalidateQueries({ queryKey: ['colleges'] });
    },
  });
}

export function useAssignUserScope(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scopeFacultyId: string | null) =>
      unwrap(api.post(`/admin/users/${userId}/scope`, { scopeFacultyId })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
