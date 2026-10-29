/** /me + student projection endpoints (student-dashboard.routes + me.routes). */
import { get, patch, post } from "./client";
import type { AchievementBadge, MatrixCourse, KnowledgeGap, Loan, ResumeCard, ResearchPaper, Message, Paginated, AppNotification, AuthUser } from "./types";

export interface StudentDashboard {
  preview?: boolean;
  profile: { year?: number | null; gpa?: number | null; totalXp?: number | null; level?: number | null; facultyName?: string | null; departmentName?: string | null };
  kpi: { courseCount: number; attendancePct: number | null; pendingAssignmentsCount: number; totalXp: number; rank?: number | null; cohortSize?: number | null };
  term: { code: string; startsAt: string; endsAt: string; progressPct: number } | null;
  progress?: { avgEnrollmentProgressPct?: number | null };
  agenda: {
    classes: { id: string; offeringId: string; courseName: string; courseCode: string; startTime: string; endTime: string; room?: string | null; when: "today" | "tomorrow" | string }[];
    assignments: { id: string; offeringId: string; courseCode?: string; title: string; dueAt: string | null; overdue?: boolean }[];
    live: { id: string; title: string; scheduledAt: string; status?: string }[];
    exams: { id: string; templateId?: string; title: string; openAt?: string | null; closeAt?: string | null }[];
  };
}

export const studentApi = {
  dashboard: () => get<StudentDashboard>("/me/dashboard"),
  resume: () => get<ResumeCard | null>("/me/resume"),
  matrix: () => get<MatrixCourse[]>("/me/matrix"),
  gaps: () => get<KnowledgeGap[]>("/me/gaps"),
  results: () => get<ResultCourse[]>("/me/results"),
  materials: () => get<MaterialRow[]>("/me/materials"),
  profile: () => get<MeProfile>("/me/profile"),
  achievements: () => get<AchievementBadge[]>("/me/achievements"),
  skills: () => get<SkillRow[]>("/me/skills"),
  loans: () => get<Loan[]>("/me/loans"),
  labSessions: () => get<LabSession[]>("/me/lab-sessions"),
  recordLab: (labId: string, experimentName: string) => post<LabSession>("/me/lab-sessions", { labId, experimentName }),
  myResearch: () => get<ResearchPaper[]>("/me/research"),
  submitResearch: (payload: { title: string; abstract?: string; offeringId?: string; fileUrl?: string }) =>
    post<ResearchPaper>("/me/research", payload),
  notifications: (page: number, limit = 30, q?: string) => get<Paginated<AppNotification>>("/me/notifications", { page, limit, q }),
  messages: (page: number, limit = 30) => get<Paginated<Message>>("/me/messages", { page, limit }),
  sendMessage: (payload: { toUserId: string; body: string }) => post<Message>("/me/messages", payload),
  readAllMessages: () => post("/me/messages/read-all"),
  readAllNotifications: () => post<{ updated: number }>("/me/notifications/read-all"),
  markNotification: (id: string) => patch<AppNotification>(`/me/notifications/${id}/read`),
  onboardingComplete: () => post("/me/onboarding/complete"),
  theme: (themePreference: "LIGHT" | "DARK" | "SYSTEM") => post("/me/theme", { themePreference }),
};

export interface ResultCourse {
  offeringId: string;
  term: string;
  courseCode: string;
  courseName: string;
  themeColor?: string | null;
  gradePct: number | null;
  breakdown: { kind: string; score: number | null; maxScore: number | null; weight?: number | null; feedback?: string | null }[];
}

export interface MaterialRow {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  sizeBytes: number | string;
  url: string;
  courseName?: string;
  courseCode?: string;
  offeringId?: string;
  uploadedAt?: string;
}

export interface MeProfile {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  student?: { universityId?: string | null; year?: number | null; gpa?: number | null; totalXp?: number | null; level?: number | null; faculty?: { id: string; name: string } | null; department?: { id: string; name: string } | null } | null;
  teacher?: { specialty?: string | null; rank?: string | null; department?: { id: string; name: string } | null; position?: string | null } | null;
  memberships?: unknown;
  [k: string]: unknown;
}

export interface SkillRow { id: string; name: string; level: number; progressPct?: number | null }
export interface LabSession { id: string; labId?: string; labName?: string; experimentName: string; progressPct?: number | null; score?: number | null; completedAt?: string | null; createdAt?: string }
export type { AuthUser };
