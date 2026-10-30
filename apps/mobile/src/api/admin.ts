/** Admin (registrar) console + governance endpoints. */
import { get, post, patch, del } from "./client";
import type { Paginated } from "./types";

export interface AdminStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalCourses?: number;
  totalOfferings?: number;
  totalFaculties?: number;
  totalDepartments?: number;
  totalInstitutions?: number;
  [k: string]: unknown;
}

export interface AdminUserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive?: boolean;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  universityId?: string | null;
  position?: string | null;
  verifiedAt?: string | null;
  memberships?: { institutionId: string; name: string; role: string; isActive: boolean }[];
  [k: string]: unknown;
}

/** GET /admin/users/:id/permissions — the real backend response shape
 *  (permissions.routes.ts: { data: { user, roleDefaults, effective, overrides } }). */
export interface AdminUserPermissions {
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    scopeFacultyId: string | null;
    scopeFaculty: { id: string; name: string } | null;
  };
  roleDefaults: string[];
  effective: string[];
  overrides: { id: string; capability: string; grant: boolean; reason: string | null; grantedAt: string }[];
}

export const adminApi = {
  stats: () => get<AdminStats>("/admin/stats"),
  faculties: (institutionSlug?: string) =>
    get<unknown[]>("/admin/faculties", institutionSlug ? { institutionSlug } : undefined),
  createFaculty: (payload: { institutionId?: string; name: string; city?: string; nameEn?: string; iconEmoji?: string }) =>
    post<unknown>("/admin/faculties", payload),
  createDepartment: (payload: { facultyId: string; name: string }) => post<unknown>("/admin/departments", payload),
  reports: () => get<unknown>("/admin/reports"),
  courses: (q?: { page?: number; limit?: number; q?: string; facultyId?: string; institutionSlug?: string }) =>
    get<{ data: unknown[]; meta: unknown }>("/admin/courses", q),
  createCourse: (payload: { code: string; name: string; nameEn?: string; description?: string; credits?: number; departmentId: string; iconEmoji?: string; themeColor?: string }) =>
    post<unknown>("/courses", payload),
  updateCourse: (id: string, payload: Record<string, unknown>) => patch<unknown>(`/courses/${id}`, payload),
  deleteCourse: (id: string) => del<void>(`/courses/${id}`),
  createOffering: (payload: { courseId: string; teacherId: string; term: string; room?: string; capacity?: number }) =>
    post<unknown>("/offerings", payload),
  papers: (page = 1, limit = 20) => get<Paginated<unknown>>("/admin/papers", { page, limit }),
  users: (q?: { page?: number; limit?: number; q?: string; role?: string }) =>
    get<Paginated<AdminUserRow>>("/admin/users", { q: q?.q, role: q?.role, page: q?.page, limit: q?.limit ?? 50 }),
  /** Real contract: the permissions payload carries the full target user row
   *  (incl. governance scope) — there is no separate GET /admin/users/:id. */
  permissions: (userId: string) =>
    get<AdminUserPermissions>(`/admin/users/${userId}/permissions`),
  setPermission: (userId: string, payload: { capability: string; grant: boolean; reason?: string }) =>
    post<unknown>(`/admin/users/${userId}/permissions`, payload),
  setScope: (userId: string, scopeFacultyId: string | null) => post<unknown>(`/admin/users/${userId}/scope`, { scopeFacultyId }),
  verifyTeacher: (teacherId: string, payload: { verified: boolean; notes?: string }) =>
    post<unknown>(`/admin/teachers/${teacherId}/verify`, payload),
  positionSuggestions: (teacherId: string) => get<unknown>(`/admin/teachers/${teacherId}/suggestions`),
  setPosition: (teacherId: string, payload: { position: "DEAN" | "ASSOCIATE_DEAN" | "DEPARTMENT_HEAD" | null; positionFacultyId?: string; positionDepartmentId?: string }) =>
    post<unknown>(`/admin/teachers/${teacherId}/position`, payload),
  enrollments: (studentId: string) => get<unknown[]>(`/enrollments`, { studentId }),
  enrollmentOfferings: () => get<unknown[]>("/enrollments/offerings"),
  enroll: (payload: { studentId: string; offeringId: string }) => post<unknown>("/enrollments", payload),
  unenroll: (enrollmentId: string) => del<void>(`/enrollments/${enrollmentId}`),
  syncStatus: () => get<unknown>("/admin/sync"),
  syncTrigger: () => post<unknown>("/admin/sync/trigger"),
  digital: () => get<unknown>("/admin/digital"),
  bulkPreview: (csv: string, institutionId?: string) => post<unknown>("/users/bulk-import/preview", { csv, institutionId }),
  bulkCommit: (csv: string, institutionId?: string) => post<unknown>("/users/bulk-import/commit", { csv, institutionId }),
  invites: () => get<unknown[]>("/invites"),
  createInvite: (payload: { role: "STUDENT" | "TEACHER"; offeringId?: string; departmentId?: string; facultyId?: string; expiresInDays: number; maxUses: number }) =>
    post<unknown>("/invites", payload),
  deleteInvite: (id: string) => del<void>(`/invites/${id}`),
};
