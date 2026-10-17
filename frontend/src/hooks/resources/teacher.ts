// teacher.ts — r153c domain split of ../useResources.ts (teacher domain: dashboard · academic intelligence · materials/assignments · risk rows · curriculum AI · teacher profile (live sessions live in live.ts).)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';
// ── Teacher dashboard aggregate ───────────────────────────────
export interface TeacherDashboard {
  kpi: {
    studentCount: number;
    avgGradePct: number | null;
    attendancePct: number | null;
    needsReview: number;
  };
  /* ── r164-h: the pending-grading queue rollup — per-assignment
   * counts of submissions in the SAME awaiting-grade set the
   * /me/pending-submissions queue walks (SUBMITTED + LATE via the
   * backend's shared pendingSubmissionWhere). The teacher home opens
   * with the actionable summary; the full queue stays on
   * /teacher/assignments (actionTo links there). ───────────────── */
  pendingGrading: Array<{
    assignmentId: string;
    title: string;
    type: 'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM';
    course: { code: string; name: string };
    count: number;
    oldestSubmittedAt: string | null;
    actionTo: string;
  }>;
  trend: Array<{
    week: string;
    avgGradePct: number | null;
    attendancePct: number | null;
  }>;
  feed: Array<{
    kind: 'submissions' | 'research' | 'attendance';
    id: string;
    author: { firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null } | null;
    meta: string;
    when: string;
    title: string;
    actionTo: string;
    /** Submissions only (18-G): the submission landed past its deadline
     *  (status LATE). Consume for a «متأخر» chip — NEVER a title suffix:
     *  TeacherPages derives the grade modal's maxScore by matching the
     *  stripped title, so the marker rides its own field. */
    late?: boolean;
    /** Submissions only (5-B6 / audit 5-A7 P1-2): the student's answer,
     *  so the grading modal can show the work it is grading. PROJECTED
     *  by the backend feed since 5-B6 landed (teacher-dashboard.routes.ts
     *  PendingSubmissionFeedRow selects textAnswer + fileUrl) — the old
     *  "dormant hand-off" comment was stale; the answer surface renders
     *  live (r157 / 6A8 note). */
    textAnswer?: string | null;
    fileUrl?: string | null;
  }>;
}
export function useTeacherDashboard() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['teacher', 'dashboard'], inst),
    queryFn: () => unwrap<TeacherDashboard>(api.get('/teacher/dashboard')),
    staleTime: 60_000,
  });
}

// ── Teacher academic intelligence ──────────────────────────────
export interface TeacherOffering {
  id: string;
  term: string;
  room: string | null;
  capacity: number;
  course: { id: string; code: string; name: string; iconEmoji: string | null; themeColor: string | null; credits: number };
  _count: { enrollments: number; assignments: number; lectures: number; examTemplates: number };
  schedule: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string; room: string | null }>;
}
export function useTeacherOfferings() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['teacher', 'offerings'], inst),
    queryFn: () => unwrap<TeacherOffering[]>(api.get('/teacher/me/offerings')),
  });
}

export type RiskLevel = 'OK' | 'WATCH' | 'AT_RISK' | 'CRITICAL';

export interface TeacherStudentRow {
  studentId: string;
  name: string;
  universityId: string;
  avatarInitials: string | null;
  avatarColor: string | null;
  attendancePct: number;
  absences: number;
  lateCount: number;
  avgGrade: number;
  watchPct: number;
  riskScore: number;
  riskLevel: RiskLevel;
  signals: string[];
  suggestion: string;
}
export function useTeacherStudents(offeringId: string | undefined) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['teacher', 'offering', offeringId, 'students'], inst),
    enabled: !!offeringId,
    queryFn: () => unwrap<TeacherStudentRow[]>(api.get(`/teacher/offerings/${offeringId}/students`)),
  });
}

export interface OfferingAnalytics {
  enrolled: number;
  totalSessions: number;
  overallAttendance: number;
  avgGrade: number;
  passRate: number;
  assignmentCount: number;
  examCount: number;
}
export function useOfferingAnalytics(offeringId: string | undefined) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['teacher', 'offering', offeringId, 'analytics'], inst),
    enabled: !!offeringId,
    queryFn: () => unwrap<OfferingAnalytics>(api.get(`/teacher/offerings/${offeringId}/analytics`)),
  });
}

export interface RecordAttendanceInput {
  offeringId: string;
  date: string; // ISO
  topic?: string;
  records: Array<{
    studentId: string;
    status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
    notes?: string;
  }>;
}
export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offeringId, ...payload }: RecordAttendanceInput) =>
      unwrap<{ sessionId: string; count: number }>(
        api.post(`/teacher/offerings/${offeringId}/attendance`, {
          date: payload.date,
          topic: payload.topic,
          records: payload.records,
        }),
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher', 'offering', vars.offeringId, 'students'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offering', vars.offeringId, 'analytics'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'risks'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
    },
  });
}

// ── Teacher: own materials + assignments across all offerings ──
export interface TeacherMaterial {
  id: string;
  name: string;
  type: 'PDF' | 'PPT' | 'VIDEO' | 'DOC' | 'ZIP' | 'IMAGE' | 'OTHER';
  url: string;
  sizeBytes: number;
  downloads: number;
  views: number;
  createdAt: string;
  course: { code: string; name: string };
}
export function useTeacherMaterials() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['teacher', 'me', 'materials'], inst),
    queryFn: () => unwrap<TeacherMaterial[]>(api.get('/teacher/me/materials')),
    staleTime: 60_000,
  });
}

export interface TeacherAssignmentRow {
  id: string;
  title: string;
  type: 'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM';
  dueAt: string;
  weight: number;
  maxScore: number;
  course: { code: string; name: string };
  submissions: number;
  enrolled: number;
}
export function useTeacherAssignments() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['teacher', 'me', 'assignments'], inst),
    queryFn: () => unwrap<TeacherAssignmentRow[]>(api.get('/teacher/me/assignments')),
    staleTime: 60_000,
  });
}

/* ── r157 / 6A8: the pending-submissions queue (the grading loop's
 * missing discovery surface). GET /teacher/me/pending-submissions
 * walks the FULL shared set (SUBMITTED + LATE, oldest-first, capped
 * at 100 server-side) — the dashboard feed only ever previewed 6
 * rows, so the 7th+ pending submission was invisible on the one page
 * built to grade them. ───────────────────────────────────────── */
export interface PendingSubmissionRow {
  id: string;
  submittedAt: string;
  /** LATE rides as its own field — never a title suffix (16-B1: the
   *  grading modal matches assignments by title). */
  status: 'SUBMITTED' | 'LATE';
  /** The answer the grading modal renders (5-B6 P1-2). */
  textAnswer: string | null;
  fileUrl: string | null;
  student: { firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null };
  assignment: {
    title: string;
    type: 'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM';
    /** The grading ceiling travels with the row — no FE
     *  title-matching guesswork on the queue surface. */
    maxScore: number;
    dueAt: string;
    offering: { course: { code: string; name: string } };
  };
}
export function usePendingSubmissions() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['teacher', 'me', 'pending-submissions'], inst),
    queryFn: () => unwrap<PendingSubmissionRow[]>(api.get('/teacher/me/pending-submissions')),
    staleTime: 30_000,
  });
}

/* ── r157 (6A9 messages): bulk mark-incoming-read for the teacher
 * inbox — POST /messages/read-all (the backend sweep exists; the FE
 * inbox was honest read-only with no way to clear the unread badge).
 * Invalidates every ['me','messages',page,limit] page key (prefix
 * match) so the unread count + rows refetch together. ──────────── */
export function useMarkAllMessagesRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<{ updated: number }>(api.post('/messages/read-all', {})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'messages'] });
    },
  });
}

/* ── r170a: the compose half the read-only inbox never shipped —
 * POST /messages (me.routes.ts:98-155): { toUserId: cuid, body: 1–4000
 * trimmed }, 201 with the created row. The backend maps the failure
 * modes to Arabic copy the UI surfaces via apiErrorMessage: 400
 * self-send («لا يمكنك إرسال رسالة إلى نفسك») / 400 inactive
 * recipient / 404 unknown recipient; the per-user 30/min limiter
 * answers 429 with the limiter's LATIN default, so the caller maps
 * that status to its own Arabic line (sendErrorMessage in
 * TeacherPages). Invalidates every ['me','messages',page,limit]
 * page key (prefix match — the same grammar as
 * useMarkAllMessagesRead above) so the sent row + the unread meta
 * refetch together. ──────────────────────────────────────────── */
export interface SendMessageInput {
  toUserId: string;
  body: string;
}
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: SendMessageInput) =>
      unwrap<{ id: string; createdAt: string }>(
        api.post('/messages', { toUserId: vars.toUserId, body: vars.body }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'messages'] });
    },
  });
}

/* ── r144: the teaching loop's authoring half — POST /offerings/:id/
 * assignments and /materials shipped in the backend with ZERO frontend
 * consumers (audit T1-h F1/F2), so a teacher on a clean environment
 * could never run create → submit → grade. Both mutations invalidate
 * the same read models the pages render. ──────────────────────── */

export interface CreateAssignmentInput {
  offeringId: string;
  title: string;
  description?: string;
  type: 'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM';
  dueAt: string; // ISO
  weight?: number;
  maxScore?: number;
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offeringId, ...payload }: CreateAssignmentInput) =>
      unwrap<unknown>(api.post(`/offerings/${offeringId}/assignments`, payload)),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher', 'me', 'assignments'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
      /* r153g: the student-facing course detail embeds the assignments
       * list (useOfferingFull) — the targeted full key keeps a fresh
       * create visible on the next CourseDetail visit without
       * refetching every offering in the cache. */
      qc.invalidateQueries({ queryKey: ['offerings', vars.offeringId, 'full'] });
    },
  });
}

export interface CreateMaterialInput {
  offeringId: string;
  name: string;
  description?: string;
  type: 'PDF' | 'PPT' | 'VIDEO' | 'DOC' | 'ZIP' | 'IMAGE' | 'OTHER';
  url: string;
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offeringId, ...payload }: CreateMaterialInput) =>
      unwrap<unknown>(api.post(`/offerings/${offeringId}/materials`, payload)),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher', 'me', 'materials'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
      /* r153g: same student-facing freshness contract as assignments —
       * the materials list lives inside the offering-full projection. */
      qc.invalidateQueries({ queryKey: ['offerings', vars.offeringId, 'full'] });
    },
  });
}

/* P3: direct PDF material upload — POST /offerings/:id/materials/file
 * with the File as the RAW body; name/description/type ride the query
 * string (encodeURIComponent via URLSearchParams). Response 201:
 * { data: materialRow } — same row shape the JSON route returns, so the
 * same invalidation set as useCreateMaterial keeps the teacher's table,
 * the offerings count and the student-facing offering-full projection
 * honest after a landed upload. */
/* ── r164-h: the materials upload channel's progress contract —
 * axios exposes determinate upload progress (onUploadProgress); the
 * modal feeds it into its ProgressBar for a real byte-accurate bar.
 * The timeout widens from the instance's 20s to 120s: a 20MiB PDF at
 * a typical uplink outruns 20s easily — the upload would abort
 * mid-transfer no matter how honest the progress bar is. */
export interface UploadMaterialFileInput {
  offeringId: string;
  name: string;
  description?: string;
  /** The PDF the teacher picked — sent as the request body. */
  file: File;
  /** Determinate progress callback (0–100, rounded). */
  onUploadProgress?: (pct: number) => void;
}

export const MATERIAL_UPLOAD_TIMEOUT_MS = 120_000;

export function useUploadMaterialFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offeringId, name, description, file, onUploadProgress }: UploadMaterialFileInput) => {
      const params = new URLSearchParams({ name, type: 'PDF' });
      if (description) params.set('description', description);
      return unwrap<unknown>(
        api.post(`/offerings/${offeringId}/materials/file?${params.toString()}`, file, {
          headers: { 'Content-Type': 'application/pdf' },
          timeout: MATERIAL_UPLOAD_TIMEOUT_MS,
          onUploadProgress: (e) => {
            if (onUploadProgress && e.total) {
              onUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          },
        }),
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher', 'me', 'materials'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
      qc.invalidateQueries({ queryKey: ['offerings', vars.offeringId, 'full'] });
    },
  });
}

export interface TeacherRiskRow extends Omit<TeacherStudentRow, 'attendancePct' | 'absences' | 'lateCount' | 'avgGrade' | 'watchPct' | 'universityId'> {
  offeringId: string;
  courseName: string;
  courseIcon: string | null;
  courseColor: string | null;
}
export function useTeacherRisks() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['teacher', 'risks'], inst),
    queryFn: () => unwrap<TeacherRiskRow[]>(api.get('/teacher/risks')),
  });
}

// ── Curriculum AI ──────────────────────────────────────────────
export interface CurriculumSuggestion {
  courseName: string;
  currentLectureCount: number;
  suggestedTotalLectures: number;
  outline: Array<{ title: string; topics: string[]; estLectures: number }>;
  rationale: string;
  nextSteps: string[];
}
export function useCurriculumSuggest() {
  return useMutation({
    mutationFn: (offeringId: string) =>
      unwrap<CurriculumSuggestion>(api.post(`/teacher/offerings/${offeringId}/curriculum/suggest`, {})),
  });
}

// ── Teacher profile + live sessions ──────────────────────────
export interface TeacherFullProfile {
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarColor: string | null;
  avatarInitials: string | null;
  specialty: string;
  rank: string;
  bio: string | null;
  degreeLevel: 'BACHELORS' | 'MASTERS' | 'PHD';
  yearsExperience: number;
  certifications: Array<{ title: string; issuer: string; year: number }>;
  publications: Array<{ title: string; venue?: string; year: number; url?: string }>;
  awards: Array<{ title: string; year: number; issuer?: string }>;
  profileImageUrl: string | null;
  officeLocation: string | null;
  officeHours: string | null;
  websiteUrl: string | null;
  subjectKeywords: string[];
  verifiedAt: string | null;
  department: string;
  faculty: string;
  courses: Array<{
    offeringId: string;
    code: string;
    name: string;
    iconEmoji: string | null;
    themeColor: string | null;
    credits: number;
    enrolled: number;
    term: string;
  }>;
  workload: {
    courseCount: number;
    totalCredits: number;
    totalEnrolled: number;
  };
}
export function useMyTeacherProfile() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['me', 'teacher-profile'], inst),
    queryFn: () => unwrap<TeacherFullProfile>(api.get('/me/teacher-profile')),
  });
}

export interface UpdateTeacherProfilePayload {
  bio?: string | null;
  officeLocation?: string | null;
  officeHours?: string | null;
  websiteUrl?: string | null;
  publications?: Array<{ title: string; venue?: string; year: number; url?: string }>;
  awards?: Array<{ title: string; year: number; issuer?: string }>;
}
export function useUpdateTeacherProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTeacherProfilePayload) =>
      unwrap<{ userId: string; updatedAt: string }>(api.patch('/me/teacher-profile', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'teacher-profile'] }),
  });
}
