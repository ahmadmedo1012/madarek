/** Teacher: dashboard, offerings, rosters, attendance, grading, materials, assignments, risks. */
import { get, post, patch } from "./client";
import type { Material, Assignment, Submission } from "./types";

export interface TeacherOffering {
  id: string;
  term: string;
  course: { id: string; name: string; code: string; iconEmoji?: string | null; themeColor?: string | null };
  schedule: { id: string; dayOfWeek: number; startTime: string; endTime: string; room?: string | null }[];
  studentsCount?: number;
  [k: string]: unknown;
}

export interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  universityId?: string | null;
  year?: number | null;
  progressPct?: number | null;
  risk?: string | null;
  gradePct?: number | null;
  attendancePct?: number | null;
  [k: string]: unknown;
}

export interface TeacherDashboardData {
  kpi: { studentCount: number; avgGradePct: number | null; attendancePct: number | null; needsReview: number };
  trend?: { week: string; value: number | null }[];
  feed?: { id: string; kind?: string; text?: string; at?: string }[];
  pendingGrading?: number;
  offerings?: TeacherOffering[];
  [k: string]: unknown;
}

export const teacherApi = {
  dashboard: () => get<TeacherDashboardData>("/teacher/dashboard"),
  offerings: () => get<TeacherOffering[]>("/teacher/me/offerings"),
  students: (offeringId: string) => get<RosterStudent[]>(`/teacher/offerings/${offeringId}/students`),
  analytics: (offeringId: string) => get<Record<string, unknown>>(`/teacher/offerings/${offeringId}/analytics`),
  risks: () => get<(RosterStudent & { courseName?: string })[]>("/teacher/risks"),
  attendance: (offeringId: string, payload: { date: string; topic?: string; records: { studentId: string; status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED"; notes?: string }[] }) =>
    post<unknown>(`/teacher/offerings/${offeringId}/attendance`, payload),
  grades: (offeringId: string) => get<unknown[]>(`/offerings/${offeringId}/grades`),
  upsertGrades: (offeringId: string, grades: { studentId: string; kind: string; score: number; maxScore: number; weight?: number; feedback?: string }[]) =>
    post<unknown>(`/offerings/${offeringId}/grades`, { grades }),
  materials: () => get<Material[]>("/teacher/me/materials"),
  addMaterial: (offeringId: string, payload: { name: string; description?: string; type: string; url: string; sizeBytes?: number }) =>
    post<Material>(`/offerings/${offeringId}/materials`, payload),
  assignments: () => get<(Assignment & { offering?: { id: string; courseName?: string } })[]>("/teacher/me/assignments"),
  pendingSubmissions: () => get<Submission[]>("/teacher/me/pending-submissions"),
  createAssignment: (offeringId: string, payload: { title: string; description?: string; type: string; dueAt?: string; weight?: number; maxScore?: number }) =>
    post<Assignment>(`/offerings/${offeringId}/assignments`, payload),
  gradeSubmission: (submissionId: string, payload: { grade: number; feedback?: string }) =>
    post<Submission>(`/submissions/${submissionId}/grade`, payload),
  submitAssignment: (offeringId: string, assignmentId: string, payload: { fileUrl?: string; textAnswer?: string }) =>
    post<Submission>(`/offerings/${offeringId}/assignments/${assignmentId}/submit`, payload),
  curriculumSuggest: (offeringId: string) => post<{ outline?: unknown }>(`/teacher/offerings/${offeringId}/curriculum/suggest`),
  teacherProfile: () => get<unknown>("/me/teacher-profile"),
  updateTeacherProfile: (payload: Record<string, unknown>) => patch<unknown>("/me/teacher-profile", payload),
};
