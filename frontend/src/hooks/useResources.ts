import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';
import type { AppRole } from '../stores/auth.store';

// ── Teacher dashboard aggregate ───────────────────────────────
export interface TeacherDashboard {
  kpi: {
    studentCount: number;
    avgGradePct: number | null;
    attendancePct: number | null;
    needsReview: number;
  };
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
     *  so the grading modal can show the work it is grading. OPTIONAL —
     *  the backend feed select does not project these columns yet
     *  (teacher-dashboard.routes.ts PendingSubmissionFeedRow); the FE
     *  renders the answer surface the moment they arrive. Hand-off
     *  filed in the 5-B6 worklog entry. */
    textAnswer?: string | null;
    fileUrl?: string | null;
  }>;
}
export function useTeacherDashboard() {
  return useQuery({
    queryKey: ['teacher', 'dashboard'],
    queryFn: () => unwrap<TeacherDashboard>(api.get('/teacher/dashboard')),
    staleTime: 60_000,
  });
}

// ── Student dashboard aggregate ───────────────────────────────
export interface StudentDashboard {
  /** True when an ADMIN/OWNER previews this page without a student profile. */
  preview?: boolean;
  profile: {
    year: number;
    gpa: number;
    totalXp: number;
    level: number;
    facultyName: string | null;
    departmentName: string | null;
  } | null;
  kpi: {
    courseCount: number;
    attendancePct: number | null;
    pendingAssignmentsCount: number;
    totalXp: number;
    rank: number;
    cohortSize: number;
  };
  term: {
    code: string;
    startsAt: string;
    endsAt: string;
    progressPct: number;
  };
  progress: {
    avgEnrollmentProgressPct: number;
  };
  agenda: {
    classes: Array<{
      id: string;
      courseName: string;
      courseCode: string;
      startTime: string;
      endTime: string;
      room: string | null;
      when: 'today' | 'tomorrow';
    }>;
    assignments: Array<{
      id: string;
      offeringId: string;
      title: string;
      type: 'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM';
      dueAt: string;
      courseName: string;
      courseCode: string;
    }>;
    live: Array<{
      id: string;
      title: string;
      scheduledAt: string;
      status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
      offering: { course: { name: string; code: string } };
    }>;
  };
}
export function useStudentDashboard() {
  return useQuery({
    queryKey: ['me', 'dashboard'],
    queryFn: () => unwrap<StudentDashboard>(api.get('/me/dashboard')),
    staleTime: 60_000,
  });
}

// ── Student results / grades ──────────────────────────────────
export interface StudentResults {
  headline: {
    avgGradePct: number | null;
    highest: { courseName: string; gradePct: number } | null;
    lowest: { courseName: string; gradePct: number } | null;
    courseCount: number;
  };
  courses: Array<{
    offeringId: string;
    term: string;
    courseCode: string;
    courseName: string;
    themeColor: string | null;
    gradePct: number | null;
    breakdown: Array<{ kind: string; score: number; maxScore: number; weight: number; feedback: string | null }>;
  }>;
  recentAssignments: Array<{
    id: string;
    title: string;
    type: 'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM';
    offeringId: string;
    gradePct: number;
    gradedAt: string | null;
  }>;
}
export function useStudentResults() {
  return useQuery({
    queryKey: ['me', 'results'],
    queryFn: () => unwrap<StudentResults>(api.get('/me/results')),
    staleTime: 60_000,
  });
}

// ── Student materials (downloads) ─────────────────────────────
export interface StudentMaterial {
  id: string;
  name: string;
  type: 'PDF' | 'PPT' | 'VIDEO' | 'DOC' | 'ZIP' | 'IMAGE' | 'OTHER';
  url: string;
  sizeBytes: number;
  createdAt: string;
  course: { code: string; name: string };
}
export function useStudentMaterials() {
  return useQuery({
    queryKey: ['me', 'materials'],
    queryFn: () => unwrap<StudentMaterial[]>(api.get('/me/materials')),
    staleTime: 60_000,
  });
}

// ── Courses (admin) ────────────────────────────────────────────
export interface Course {
  id: string;
  code: string;
  name: string;
  iconEmoji?: string | null;
  themeColor?: string | null;
  credits: number;
  department?: { id: string; name: string };
}
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => unwrap<Course[]>(api.get('/courses?limit=100')),
  });
}

// ── Enrollments (student "my courses") ────────────────────────
export interface MyEnrollment {
  id: string;
  progressPct: number;
  offering: {
    id: string;
    room?: string | null;
    course: Course;
    teacher: { id: string; firstName: string; lastName: string };
    schedule: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string; room?: string | null }>;
  };
}
export function useMyEnrollments() {
  return useQuery({
    queryKey: ['me', 'enrollments'],
    queryFn: () => unwrap<MyEnrollment[]>(api.get('/enrollments/me')),
  });
}

// ── Notifications ──────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'URGENT' | 'ACADEMIC' | 'SYSTEM' | 'SOCIAL';
  icon?: string | null;
  title: string;
  body?: string | null;
  readAt?: string | null;
  createdAt: string;
}
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => unwrap<Notification[]>(api.get('/notifications?limit=50')),
  });
}
export function useMarkNotifRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** Bulk "mark all as read" — ONE POST /notifications/read-all (backend
 *  updateMany over the unread rows, returns { updated }) instead of a
 *  per-item PATCH loop that only reached the visible slice and refetched
 *  the list once per item (15-d P1-2). The per-item PATCH above stays for
 *  single-notification clicks. */
export function useMarkAllNotifsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<{ updated: number }>(api.post('/notifications/read-all', {})),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// Unread count from response meta — backend returns it on the notifications endpoint.
export function useUnreadNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await api.get<{ data: Notification[]; meta: { unread: number } }>('/notifications?limit=1');
      return res.data.meta?.unread ?? 0;
    },
    refetchInterval: 60_000, // refresh every minute
    refetchIntervalInBackground: false, // don't poll a hidden tab
  });
}

// ── Library ────────────────────────────────────────────────────
export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  iconEmoji?: string | null;
  themeColor?: string | null;
  rating?: string | null;
  totalCopies: number;
  availableCopies: number;
}
export function useBooks(opts: { category?: string; q?: string } = {}) {
  return useQuery({
    queryKey: ['books', opts],
    queryFn: () =>
      unwrap<Book[]>(
        api.get('/library/books', {
          params: { limit: 100, category: opts.category, q: opts.q },
        }),
      ),
    /* 22-c (A3 P2-2): every NEW category/query key transitions
       isPending → true, unmounting the grid into its skeleton — the
       flash was intermittent (cached keys re-show instantly) so it
       felt random. keepPreviousData keeps the previous page mounted
       while the new key resolves; the skeleton still owns the true
       first load (no previous data exists). */
    placeholderData: keepPreviousData,
  });
}

export interface MyLoan {
  id: string;
  bookId: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  book: { id: string; title: string; author: string; category?: string | null };
}
export function useMyLoans() {
  return useQuery({
    queryKey: ['me', 'loans'],
    queryFn: () => unwrap<MyLoan[]>(api.get('/me/loans')),
    staleTime: 60_000,
  });
}

export interface MyLabStats {
  active: number;
  completed: number;
  total: number;
  recent: Array<{
    id: string;
    experimentName: string;
    progressPct: number;
    score: number | null;
    startedAt: string;
    completedAt: string | null;
    lab: { id: string; name: string };
  }>;
}
export function useMyLabSessions() {
  return useQuery({
    queryKey: ['me', 'lab-sessions'],
    queryFn: () => unwrap<MyLabStats>(api.get('/me/lab-sessions')),
    staleTime: 60_000,
  });
}

// ── MOOCs ──────────────────────────────────────────────────────
export interface MoocCourse {
  id: string;
  title: string;
  organization: string;
  iconEmoji?: string | null;
  category: string;
  durationHours: number;
  level: string;
  rating: string;
  enrolled: number;
  hasCertificate: boolean;
  jobReady: boolean;
  /** External course page (Coursera / edX …). Nullable — cards without a
   *  URL render without a registration link instead of a dead button. */
  externalUrl?: string | null;
}
export function useMoocs() {
  return useQuery({
    queryKey: ['mooc'],
    queryFn: () => unwrap<MoocCourse[]>(api.get('/mooc?limit=50')),
  });
}

// ── Jobs ───────────────────────────────────────────────────────
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'FREELANCE' | 'REMOTE';
  salary?: string | null;
  category: string;
  iconEmoji?: string | null;
  postedAt: string;
}

/** GET /jobs payload (18-G): the page's jobs beside `appliedJobIds` —
 *  the jobs ON THE CURRENT PAGE the viewer already applied to
 *  (page-scoped, so the set stays correct under future pagination;
 *  computed for every authenticated caller). */
export interface JobsPayload {
  data: Job[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  appliedJobIds: string[];
}
export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    // The whole body is the query result — `unwrap` would drop
    // appliedJobIds (18-G's shape note: the honest «تمّ التقديم» state
    // was client-local fiction before, lost on every remount).
    queryFn: async (): Promise<JobsPayload> => {
      const res = await api.get<JobsPayload>('/jobs?limit=50');
      return res.data;
    },
  });
}

/** Apply to a job posting — real POST /jobs/:id/apply (upserts the
 *  application server-side). Backs the «تقدّم الآن» button. */
export function useApplyJob() {
  return useMutation({
    mutationFn: (jobId: string) =>
      unwrap<{ id: string; jobId: string; userId: string }>(api.post(`/jobs/${jobId}/apply`)),
  });
}

// ── Achievements / Skills / Leaderboard ────────────────────────
export interface UserAchievement {
  unlockedAt: string;
  achievement: { id: string; name: string; description?: string; icon?: string | null; xp: number };
}
export function useMyAchievements() {
  return useQuery({
    queryKey: ['me', 'achievements'],
    queryFn: () => unwrap<UserAchievement[]>(api.get('/me/achievements')),
  });
}

export interface UserSkill {
  level: number;
  progressPct: number;
  skill: { id: string; name: string; category?: string | null; icon?: string | null };
}
export function useMySkills() {
  return useQuery({
    queryKey: ['me', 'skills'],
    queryFn: () => unwrap<UserSkill[]>(api.get('/me/skills')),
  });
}

export interface LeaderEntry {
  id: string;
  firstName: string;
  lastName: string;
  avatarInitials?: string | null;
  avatarColor?: string | null;
  totalXp: number;
  level: number;
}
export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => unwrap<LeaderEntry[]>(api.get('/leaderboard')),
  });
}

// ── Posts (community) ──────────────────────────────────────────
export interface Post {
  id: string;
  body: string;
  hashtags: string[];
  imageUrl?: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; avatarColor?: string | null; avatarInitials?: string | null };
  _count: { comments: number; reactions: number };
  /** 18-G: the viewer has a like/save row on this post — the heart's
   *  honest initial state (it was session-local fiction before: a
   *  reload un-liked the UI while the server reaction persisted). */
  viewerReacted: boolean;
}
// 15-d P2-13: the feed limit is a parameter (keyed, so two limits never
// share a cache entry) — consumers can page beyond the newest 20 posts;
// the default keeps every existing call site byte-identical.
export function usePosts(limit: number = 20) {
  return useQuery({
    queryKey: ['posts', limit],
    queryFn: () => unwrap<Post[]>(api.get(`/posts?limit=${limit}`)),
  });
}
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; hashtags?: string[] }) =>
      unwrap<Post>(api.post('/posts', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}
export function useReactToPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { postId: string; kind: 'like' | 'save' }) =>
      api.post(`/posts/${input.postId}/react`, { kind: input.kind }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

// ── Labs / AR ──────────────────────────────────────────────────
export interface VirtualLab {
  id: string;
  name: string;
  platform?: string | null;
  category: string;
  iconEmoji?: string | null;
  totalExperiments: number;
  themeColor?: string | null;
}
export function useLabs() {
  return useQuery({ queryKey: ['labs'], queryFn: () => unwrap<VirtualLab[]>(api.get('/labs')) });
}
export interface ArExperience {
  id: string;
  title: string;
  subject: string;
  type: 'AR' | 'VR';
  iconEmoji?: string | null;
  themeColor?: string | null;
  description?: string | null;
}
export function useArExperiences() {
  return useQuery({
    queryKey: ['ar-experiences'],
    queryFn: () => unwrap<ArExperience[]>(api.get('/ar-experiences')),
  });
}

// ── Faculties (for register form) ─────────────────────────────
export interface Faculty {
  id: string;
  name: string;
  iconEmoji?: string | null;
  city: string;
  departments: { id: string; name: string }[];
}
export function useFaculties() {
  return useQuery({
    queryKey: ['faculties'],
    queryFn: () => unwrap<Faculty[]>(api.get('/faculties')),
    staleTime: 5 * 60_000,
  });
}

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

// ── AI ─────────────────────────────────────────────────────────
export function useAiChat() {
  return useMutation({
    mutationFn: (input: { conversationId?: string; message: string }) =>
      unwrap<{ conversationId: string; reply: string }>(api.post('/ai/chat', input)),
  });
}


// ── Educational Matrix ─────────────────────────────────────────
export interface MatrixCourse {
  courseId: string;
  courseCode: string;
  courseName: string;
  themeColor?: string | null;
  offeringId: string;
  concepts: Array<{ id: string; name: string; level: number; attempts: number }>;
}
export function useMatrix() {
  return useQuery({
    queryKey: ['me', 'matrix'],
    queryFn: () => unwrap<MatrixCourse[]>(api.get('/me/matrix')),
  });
}

export interface Gap {
  conceptId: string;
  conceptName: string;
  courseId: string;
  courseName: string;
  courseColor?: string | null;
  level: number;
  recommendedLectureId: string | null;
  recommendedLectureTitle: string | null;
}
export function useGaps() {
  return useQuery({
    queryKey: ['me', 'gaps'],
    queryFn: () => unwrap<Gap[]>(api.get('/me/gaps')),
  });
}

// ── Lectures ───────────────────────────────────────────────────
export interface Lecture {
  id: string;
  offeringId: string;
  title: string;
  description?: string | null;
  ordinal: number;
  durationSec: number;
  videoUrl: string;
  posterUrl?: string | null;
  createdAt: string;
  _count?: { chapters: number; checkpoints: number };
  watchEvents?: Array<{ watchedSec: number; totalSec: number; completed: boolean }>;
}
export function useOfferingLectures(offeringId: string | undefined) {
  return useQuery({
    queryKey: ['offerings', offeringId, 'lectures'],
    queryFn: () => unwrap<Lecture[]>(api.get(`/offerings/${offeringId}/lectures`)),
    enabled: Boolean(offeringId),
  });
}

export interface LectureChapter {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  ordinal: number;
  conceptId: string | null;
  concept: { id: string; name: string } | null;
}
export interface LectureCheckpoint {
  id: string;
  triggerSec: number;
  question: string;
  options: string[];
  conceptId: string | null;
}
export interface LectureDetail extends Lecture {
  chapters: LectureChapter[];
  checkpoints: LectureCheckpoint[];
  offering: {
    id: string;
    course: { id: string; name: string; code: string; themeColor?: string | null };
    teacher: { id: string; firstName: string; lastName: string };
  };
}
export function useLecture(lectureId: string | undefined) {
  return useQuery({
    queryKey: ['lectures', lectureId],
    queryFn: () => unwrap<LectureDetail>(api.get(`/lectures/${lectureId}`)),
    enabled: Boolean(lectureId),
  });
}
export function useReportWatch() {
  return useMutation({
    mutationFn: (input: { lectureId: string; watchedSec: number; totalSec: number; completed?: boolean }) =>
      unwrap(
        api.post(`/lectures/${input.lectureId}/watch`, {
          watchedSec: input.watchedSec,
          totalSec: input.totalSec,
          completed: input.completed,
        }),
      ),
  });
}
export function useAnswerCheckpoint() {
  return useMutation({
    mutationFn: (input: { lectureId: string; checkpointId: string; answerIndex: number }) =>
      unwrap<{ correct: boolean; correctIndex: number; explanation?: string }>(
        api.post(
          `/lectures/${input.lectureId}/checkpoints/${input.checkpointId}/answer`,
          { answerIndex: input.answerIndex },
        ),
      ),
  });
}


// ── Curriculum authoring (lectures · chapters · checkpoints) ──
// Mirrors backend/src/http/routes/curriculum.routes.ts (TEACHER/ADMIN/OWNER,
// zod strict). Reads stay on useOfferingLectures / useLecture above — these
// are the write paths. Every mutation invalidates the read keys so the
// "إدارة المنهج" panel refetches immediately.
//
// PATCH semantics: axios drops undefined keys from the JSON body, so the
// caller sends ONLY the changed fields — an omitted field keeps its DB
// value (the server schema is .partial()). There is no isPublished flag
// on the Lecture model, so partial field updates are the whole contract.

export interface LectureWriteInput {
  title: string;
  description?: string;
  videoUrl: string;
  durationSec?: number;
  ordinal?: number;
}
export interface LecturePatchInput {
  lectureId: string;
  title?: string;
  /** Empty string clears the description server-side; undefined = keep. */
  description?: string;
  videoUrl?: string;
  durationSec?: number;
  ordinal?: number;
}
export function useCreateLecture(offeringId: string) {
  const qc = useQueryClient();
  return useMutation({
    // 201 → { data: <lecture> }
    mutationFn: (input: LectureWriteInput) =>
      unwrap<Lecture>(api.post(`/offerings/${offeringId}/lectures`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offerings', offeringId] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
    },
  });
}
export function useUpdateLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lectureId, ...patch }: LecturePatchInput) =>
      unwrap<Lecture>(api.patch(`/lectures/${lectureId}`, patch)),
    onSuccess: (_data, vars) => {
      // The hook doesn't know the parent offering — prefix-invalidate both
      // the lecture detail key and every offering list/detail key.
      qc.invalidateQueries({ queryKey: ['lectures', vars.lectureId] });
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
    },
  });
}
export function useDeleteLecture() {
  const qc = useQueryClient();
  return useMutation({
    // 409 with an Arabic message when WatchEvents exist (student watch
    // history RESTRICTs the FK) — surfaced inline via apiErrorMessage.
    mutationFn: (lectureId: string) =>
      unwrap<{ ok: true }>(api.delete(`/lectures/${lectureId}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
    },
  });
}

export interface ChapterWriteInput {
  title: string;
  startSec: number;
  endSec: number;
}
export interface ChapterPatchInput {
  chapterId: string;
  title?: string;
  startSec?: number;
  endSec?: number;
}
export function useCreateChapter(lectureId: string) {
  const qc = useQueryClient();
  return useMutation({
    // 201 → { data: <chapter> } (ordinal auto-assigned = max+1)
    mutationFn: (input: ChapterWriteInput) =>
      unwrap<LectureChapter>(api.post(`/lectures/${lectureId}/chapters`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures', lectureId] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
export function useUpdateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, ...patch }: ChapterPatchInput) =>
      unwrap<LectureChapter>(api.patch(`/chapters/${chapterId}`, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
export function useDeleteChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: string) =>
      unwrap<{ ok: true }>(api.delete(`/chapters/${chapterId}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}

export interface CheckpointWriteInput {
  /** NOTE: the API field is `question` (not `prompt`) — model invariant. */
  question: string;
  triggerSec: number;
  options: string[];
  correctIndex: number;
  conceptId?: string;
  explanation?: string;
}
export interface CheckpointPatchInput {
  checkpointId: string;
  question?: string;
  triggerSec?: number;
  options?: string[];
  /**
   * Send together with any options change — the server re-validates the
   * (options, correctIndex) pair and 400s when the index falls outside
   * the effective option list.
   */
  correctIndex?: number;
  conceptId?: string;
  explanation?: string;
}
export function useCreateCheckpoint(lectureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckpointWriteInput) =>
      unwrap<LectureCheckpoint>(api.post(`/lectures/${lectureId}/checkpoints`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures', lectureId] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
export function useUpdateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ checkpointId, ...patch }: CheckpointPatchInput) =>
      unwrap<LectureCheckpoint>(api.patch(`/checkpoints/${checkpointId}`, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
export function useDeleteCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checkpointId: string) =>
      unwrap<{ ok: true }>(api.delete(`/checkpoints/${checkpointId}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}

// ── Course offering detail (full) ──────────────────────────────
export interface OfferingFull {
  id: string;
  term: string;
  room?: string | null;
  course: {
    id: string;
    name: string;
    code: string;
    iconEmoji?: string | null;
    themeColor?: string | null;
    description?: string | null;
    credits: number;
    department: { id: string; name: string; faculty: { id: string; name: string } };
  };
  teacher: { id: string; firstName: string; lastName: string; avatarInitials?: string | null; avatarColor?: string | null };
  schedule: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string; room?: string | null }>;
  materials: Array<{ id: string; name: string; type: string; sizeBytes: string; createdAt: string }>;
  assignments: Array<{ id: string; title: string; type: string; dueAt: string; weight: number; maxScore: number }>;
  lectures: Array<Lecture & { _count: { chapters: number; checkpoints: number } }>;
  _count: { enrollments: number };
}
export function useOfferingFull(offeringId: string | undefined) {
  return useQuery({
    queryKey: ['offerings', offeringId, 'full'],
    queryFn: () => unwrap<OfferingFull>(api.get(`/offerings/${offeringId}/full`)),
    enabled: Boolean(offeringId),
  });
}

// ── Assignment submissions (student submit + teacher grade) ────
export type SubmissionStatusFE = 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED' | 'DRAFT';

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  textAnswer?: string | null;
  fileUrl?: string | null;
  status: SubmissionStatusFE;
  grade?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
}

export interface SubmitAssignmentInput {
  textAnswer?: string;
  fileUrl?: string;
}

/**
 * Client-side validation for the student submission form — shared with the
 * unit tests. Mirrors the server contract:
 *   - at least one of textAnswer / fileUrl must be non-empty
 *   - fileUrl (when present) must be an external https:// URL or an
 *     internal papers path (^/api/v1/files/papers/)
 * Returns an Arabic error message, or null when the draft is valid.
 */
export function validateSubmissionDraft(draft: SubmitAssignmentInput): string | null {
  const text = draft.textAnswer?.trim() ?? '';
  const file = draft.fileUrl?.trim() ?? '';
  if (!text && !file) {
    return 'أدخل إجابة نصية أو رابط ملف على الأقل قبل التسليم.';
  }
  if (file && !(/^https:\/\//.test(file) || file.startsWith('/api/v1/files/papers/'))) {
    return 'رابط الملف يجب أن يبدأ بـ https:// أو أن يكون مسار ملف داخل المنصة (/api/v1/files/papers/).';
  }
  return null;
}

export function useSubmitAssignment(offeringId: string, assignmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    // Envelope matches WS-B1's mounted route: 201 → { data: <submission> }
    // (the submission row sits directly in `data`).
    mutationFn: (input: SubmitAssignmentInput) =>
      unwrap<Submission>(
        api.post(`/offerings/${offeringId}/assignments/${assignmentId}/submit`, input),
      ),
    onSuccess: () => {
      // Refresh the student agenda (submitted items drop out of the
      // upcoming list) and the teacher dashboard (needs-review count).
      qc.invalidateQueries({ queryKey: ['me', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
    },
  });
}

// 15-d P1-3: a grade flows into more than the two dashboards — the
// student's results page (['me','results'] recentAssignments / course
// gradePct) and, for the graded offering, the Intelligence page's student
// rows and analytics (avgGrade / passRate). The offering keys need the
// offering's id, so the signature takes it as an optional second param:
// call sites that cannot know it (the dashboard feed target carries only
// courseCode today) keep compiling and still refresh everything
// session-wide they could before.
export function useGradeSubmission(submissionId: string, offeringId?: string) {
  const qc = useQueryClient();
  return useMutation({
    // Envelope: { data: <graded submission> } with status GRADED.
    mutationFn: (input: { grade: number; feedback?: string }) =>
      unwrap<Submission>(
        api.post(`/submissions/${submissionId}/grade`, { grade: input.grade, feedback: input.feedback }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['me', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['me', 'results'] });
      if (offeringId) {
        qc.invalidateQueries({ queryKey: ['teacher', 'offering', offeringId, 'students'] });
        qc.invalidateQueries({ queryKey: ['teacher', 'offering', offeringId, 'analytics'] });
      }
    },
  });
}

/**
 * Best-effort Arabic error message for inline mutation failures.
 * Canonical implementation lives in lib/format.ts since wave 9-a;
 * re-exported here so the ~15 existing import sites keep working.
 */
export { apiErrorMessage } from '../lib/format';


// ── Research papers ────────────────────────────────────────────
export type PaperStatus =
  | 'UPLOADED' | 'SCANNING' | 'CHECKS_PASSED' | 'CHECKS_FAILED' | 'GRADED' | 'PUBLISHED';

export interface ResearchPaper {
  id: string;
  title: string;
  abstract?: string | null;
  fileUrl?: string | null;
  status: PaperStatus;
  plagiarismPct?: number | null;
  aiContentPct?: number | null;
  grade?: number | null;
  feedback?: string | null;
  uploadedAt: string;
  scannedAt?: string | null;
  gradedAt?: string | null;
  publishedAt?: string | null;
  student: { id: string; firstName: string; lastName: string; avatarInitials?: string | null; avatarColor?: string | null; email?: string };
  reviewer?: { id: string; firstName: string; lastName: string } | null;
  offering?: { id: string; course: { name: string; code: string } } | null;
}

export function useMyResearch() {
  return useQuery({
    queryKey: ['me', 'research'],
    queryFn: () => unwrap<ResearchPaper[]>(api.get('/me/research')),
  });
}

export function useResearchQueue() {
  return useQuery({
    queryKey: ['research', 'queue'],
    queryFn: () => unwrap<ResearchPaper[]>(api.get('/research/queue')),
  });
}

export function usePublishedResearch() {
  return useQuery({
    queryKey: ['research', 'published'],
    queryFn: () => unwrap<ResearchPaper[]>(api.get('/research/published')),
  });
}

// Cross-document search across published papers (title + abstract + body).
// Returns papers with matchedIn ('title' | 'abstract' | 'body') + a snippet
// containing <mark> tags around the search term.
export interface ResearchSearchHit extends ResearchPaper {
  matchedIn: 'title' | 'abstract' | 'body';
  snippet: string | null;
}
export function useResearchSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['research', 'search', trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const res = await api.get<{ data: ResearchSearchHit[]; meta: { query: string; total: number } }>(
        `/research/search?q=${encodeURIComponent(trimmed)}`,
      );
      return res.data;
    },
    /* 22-c (A3 P2-2): same flicker as useBooks — each new query term
       collapsed the list into its skeleton. Previous results stay
       mounted until the new search resolves. */
    placeholderData: keepPreviousData,
  });
}

// ── Paper annotations ─────────────────────────────────────────
export interface PaperAnnotation {
  id: string;
  paperId: string;
  page: number;
  comment: string;
  color: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    // AppRole (16-E2 hand-off, landed 16-E10): the backend ships user.role
    // raw and OWNER may annotate (learning.routes POST requireRole
    // TEACHER/ADMIN/OWNER) — the 4-role union mislabeled an OWNER author.
    role: AppRole;
    avatarColor: string | null;
    avatarInitials: string | null;
  };
}
export function useAnnotations(paperId: string | undefined) {
  return useQuery({
    queryKey: ['annotations', paperId],
    enabled: !!paperId,
    queryFn: () => unwrap<PaperAnnotation[]>(api.get(`/research/${paperId}/annotations`)),
  });
}
export function useCreateAnnotation(paperId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { page: number; comment: string; color?: string }) =>
      unwrap<PaperAnnotation>(api.post(`/research/${paperId}/annotations`, input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annotations', paperId] }),
  });
}
export function useDeleteAnnotation(paperId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (annotationId: string) =>
      api.delete(`/research/annotations/${annotationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annotations', paperId] }),
  });
}

// ── My profile (real student/teacher data) ────────────────────
export interface MyProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  // Backend ships req.user.role raw — the Prisma Role enum includes
  // OWNER, and OWNER accounts do hit /me/profile (15-c P1-4). AppRole
  // (stores/auth.store) is the single source of truth for the wire union.
  role: AppRole;
  avatarColor: string | null;
  avatarInitials: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  student: {
    universityId: string;
    year: number;
    gpa: number;
    totalXp: number;
    level: number;
    faculty: { id: string; name: string; nameEn: string | null } | null;
    department: { id: string; name: string; nameEn: string | null } | null;
  } | null;
  teacher: {
    specialty: string | null;
    rank: string | null;
    department: { name: string; facultyName: string | undefined } | null;
  } | null;
}
export function useMyProfile() {
  return useQuery({
    queryKey: ['me', 'profile'],
    queryFn: () => unwrap<MyProfile>(api.get('/me/profile')),
  });
}

export function useUploadPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; abstract?: string; offeringId?: string; fileUrl?: string }) =>
      unwrap<ResearchPaper>(api.post('/me/research', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'research'] }),
  });
}

export function useScanPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<ResearchPaper>(api.post(`/research/${id}/scan`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'research'] });
      qc.invalidateQueries({ queryKey: ['research', 'queue'] });
    },
  });
}

export function useGradePaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; grade: number; feedback?: string }) =>
      unwrap<ResearchPaper>(api.post(`/research/${input.id}/grade`, { grade: input.grade, feedback: input.feedback })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research', 'queue'] });
      qc.invalidateQueries({ queryKey: ['me', 'research'] });
    },
  });
}

export function usePublishPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<ResearchPaper>(api.post(`/research/${id}/publish`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['research', 'queue'] });
      qc.invalidateQueries({ queryKey: ['me', 'research'] });
      // 15-d P2-1: the library list surfaces published papers — a fresh
      // publish must appear there immediately, not after the 30s stale
      // window lapses on a later mount.
      qc.invalidateQueries({ queryKey: ['research', 'published'] });
    },
  });
}


// ── Training (Self-Development) ───────────────────────────────
export type TrainingCategory =
  | 'ONBOARDING' | 'ACADEMIC' | 'FLIPPED' | 'STUDY_SKILLS' | 'RESEARCH'
  | 'CAREER' | 'COMMUNICATION' | 'ENGLISH' | 'PROGRAMMING' | 'PRODUCTIVITY' | 'VISION';

export type TrainingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TrainingTrackCard {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  summary: string;
  category: TrainingCategory;
  level: TrainingLevel;
  iconEmoji?: string | null;
  themeColor?: string | null;
  estMinutes: number;
  pointsAward: number;
  totalLessons: number;
  enrolled: boolean;
  completedLessons: number;
  isCompleted: boolean;
  progressPct: number;
}
export function useTrainingCatalog() {
  return useQuery({
    queryKey: ['training', 'catalog'],
    queryFn: () => unwrap<TrainingTrackCard[]>(api.get('/training/catalog')),
  });
}

export interface TrainingLessonView {
  id: string;
  order: number;
  title: string;
  summary?: string | null;
  contentMarkdown: string;
  estMinutes: number;
  pointsAward: number;
  quizQuestion?: string | null;
  isCompleted: boolean;
}
export interface TrainingTrackDetail {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  summary: string;
  category: TrainingCategory;
  level: TrainingLevel;
  iconEmoji?: string | null;
  themeColor?: string | null;
  estMinutes: number;
  pointsAward: number;
  enrolled: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  lessons: TrainingLessonView[];
}
export function useTrainingTrack(slug: string | undefined) {
  return useQuery({
    queryKey: ['training', 'track', slug],
    enabled: !!slug,
    queryFn: () => unwrap<TrainingTrackDetail>(api.get(`/training/tracks/${slug}`)),
  });
}

export function useEnrollTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      unwrap<{ id: string; trackId: string; startedAt: string }>(
        api.post(`/training/tracks/${slug}/enroll`),
      ),
    onSuccess: (_d, slug) => {
      qc.invalidateQueries({ queryKey: ['training', 'catalog'] });
      qc.invalidateQueries({ queryKey: ['training', 'track', slug] });
      qc.invalidateQueries({ queryKey: ['training', 'me'] });
    },
  });
}

export interface CompleteLessonResult {
  newlyCompleted: boolean;
  pointsAwarded: number;
  totalPoints: number;
  level: { level: number; tier: Tier; toNext: number; pctIntoLevel: number };
  newBadges: Array<{ slug: string; title: string; iconEmoji: string }>;
}
export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, quizAnswer }: { lessonId: string; quizAnswer?: string }) =>
      unwrap<CompleteLessonResult>(
        api.post(`/training/lessons/${lessonId}/complete`, { quizAnswer }),
      ),
    onSuccess: () => {
      // 15-d P2-4: lesson completion awards XP / level / badges, so the
      // XP leaderboard, the achievements list and the student dashboard
      // KPIs (totalXp / level) all read stale data until these are
      // invalidated alongside the training family.
      qc.invalidateQueries({ queryKey: ['training'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['me', 'achievements'] });
      qc.invalidateQueries({ queryKey: ['me', 'dashboard'] });
    },
  });
}

export interface TrainingMeSummary {
  points: number;
  level: { level: number; tier: Tier; toNext: number; pctIntoLevel: number };
  badgeCount: number;
  certificateCount: number;
  tracksEnrolled: number;
  tracksCompleted: number;
  recentBadges: Array<{ slug: string; title: string; iconEmoji: string; rarity: BadgeRarity; earnedAt: string }>;
}
export function useTrainingMe() {
  return useQuery({
    queryKey: ['training', 'me'],
    queryFn: () => unwrap<TrainingMeSummary>(api.get('/training/me')),
  });
}

export interface UserBadgeRow {
  slug: string;
  title: string;
  description: string;
  iconEmoji: string;
  themeColor?: string | null;
  rarity: BadgeRarity;
  earnedAt: string | null;
  isEarned: boolean;
}
export function useMyBadges() {
  return useQuery({
    queryKey: ['training', 'me', 'badges'],
    queryFn: () => unwrap<UserBadgeRow[]>(api.get('/training/me/badges')),
  });
}

export interface TrainingCertificate {
  id: string;
  title: string;
  issuer: string;
  issuedAt: string | null;
  hours: number;
  status: 'ONGOING' | 'COMPLETED';
  trackSlug: string | null;
  iconEmoji: string | null;
  themeColor: string | null;
}
export function useMyTrainingCerts() {
  return useQuery({
    queryKey: ['training', 'me', 'certificates'],
    queryFn: () => unwrap<TrainingCertificate[]>(api.get('/training/me/certificates')),
  });
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  points: number;
  level: { level: number; tier: Tier; toNext: number; pctIntoLevel: number };
}
export function useTrainingLeaderboard() {
  return useQuery({
    queryKey: ['training', 'leaderboard'],
    queryFn: () => unwrap<LeaderboardRow[]>(api.get('/training/leaderboard')),
  });
}


// ════════════════════════════════════════════════════════════════
//  Academic intelligence + governance + exams + social
// ════════════════════════════════════════════════════════════════

// ── Permissions / governance ──────────────────────────────────
export type AppCapability =
  | 'RESEARCH_GRADE_OWN' | 'RESEARCH_GRADE_ANY' | 'RESEARCH_PUBLISH'
  | 'EXAMS_AUTHOR' | 'EXAMS_MODERATE' | 'EXAMS_TAKE'
  | 'CURRICULUM_EDIT_OWN' | 'CURRICULUM_EDIT_ANY'
  | 'USERS_MANAGE' | 'ROLES_ASSIGN' | 'TEACHERS_VERIFY'
  | 'QUALITY_VIEW' | 'QUALITY_REPORT'
  | 'ANNOUNCE_PLATFORM' | 'ANNOUNCE_FACULTY'
  | 'COMPETITIONS_RUN' | 'EVENTS_RUN';

export interface MyPermissions {
  // Same wire truth as MyProfile.role (15-c P1-4): the backend echoes
  // req.user.role raw, OWNER included.
  role: AppRole;
  capabilities: AppCapability[];
  roleDefaults: AppCapability[];
}
export function useMyPermissions() {
  return useQuery({
    queryKey: ['me', 'permissions'],
    queryFn: () => unwrap<MyPermissions>(api.get('/me/permissions')),
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
  return useQuery({
    queryKey: ['teacher', 'offerings'],
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
  return useQuery({
    queryKey: ['teacher', 'offering', offeringId, 'students'],
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
  return useQuery({
    queryKey: ['teacher', 'offering', offeringId, 'analytics'],
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
  return useQuery({
    queryKey: ['teacher', 'me', 'materials'],
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
  return useQuery({
    queryKey: ['teacher', 'me', 'assignments'],
    queryFn: () => unwrap<TeacherAssignmentRow[]>(api.get('/teacher/me/assignments')),
    staleTime: 60_000,
  });
}

// ── Direct messages ──────────────────────────────────────────
export interface MessageRow {
  id: string;
  body: string;
  createdAt: string;
  fromUser: { id: string; firstName: string; lastName: string; avatarColor: string | null };
  toUser: { id: string; firstName: string; lastName: string; avatarColor: string | null };
}
export function useMyMessages(page: number = 1, limit: number = 30) {
  return useQuery({
    queryKey: ['me', 'messages', page, limit],
    queryFn: async () => {
      const res = await api.get<{ data: MessageRow[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        '/messages', { params: { page, limit } });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export interface TeacherRiskRow extends Omit<TeacherStudentRow, 'attendancePct' | 'absences' | 'lateCount' | 'avgGrade' | 'watchPct' | 'universityId'> {
  offeringId: string;
  courseName: string;
  courseIcon: string | null;
  courseColor: string | null;
}
export function useTeacherRisks() {
  return useQuery({
    queryKey: ['teacher', 'risks'],
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

// ── Exams ──────────────────────────────────────────────────────
export type QType = 'MCQ' | 'TRUE_FALSE' | 'SHORT' | 'ESSAY';
export type ExamKindFE = 'QUIZ' | 'MIDTERM' | 'FINAL' | 'PRACTICE';
export type ExamStatusFE = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'CLOSED';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionRow {
  id: string;
  type: QType;
  prompt: string;
  difficulty: Difficulty;
  points: number;
  category: { title: string; slug: string; iconEmoji: string | null };
  choices: string[] | null;
  author: string;
  tags: string[];
}
export function useQuestionBank(filter?: { categoryId?: string; difficulty?: Difficulty; type?: QType; q?: string }) {
  const qs = new URLSearchParams();
  if (filter?.categoryId) qs.set('categoryId', filter.categoryId);
  if (filter?.difficulty) qs.set('difficulty', filter.difficulty);
  if (filter?.type) qs.set('type', filter.type);
  if (filter?.q) qs.set('q', filter.q);
  const query = qs.toString() ? `?${qs}` : '';
  return useQuery({
    queryKey: ['question-bank', filter],
    queryFn: () => unwrap<QuestionRow[]>(api.get('/question-bank' + query)),
  });
}

export interface QuestionCategoryRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  iconEmoji: string | null;
  isShared: boolean;
  faculty: { name: string } | null;
  department: { name: string } | null;
  _count: { questions: number };
}
export function useQuestionCategories() {
  return useQuery({
    queryKey: ['question-bank', 'categories'],
    queryFn: () => unwrap<QuestionCategoryRow[]>(api.get('/question-bank/categories')),
  });
}

export interface ExamTemplateRow {
  id: string;
  title: string;
  kind: ExamKindFE;
  status: ExamStatusFE;
  durationMin: number;
  passingScore: number;
  openAt: string | null;
  closeAt: string | null;
  offering: { id: string; course: { name: string; code: string; iconEmoji: string | null } } | null;
  faculty: { name: string } | null;
  author: { firstName: string; lastName: string };
  _count: { questions: number; attempts: number };
}
export function useExamTemplates() {
  return useQuery({
    queryKey: ['exams', 'templates'],
    queryFn: () => unwrap<ExamTemplateRow[]>(api.get('/exams/templates')),
  });
}

/** Full template payload of GET /exams/templates/:id. `correctAnswer` is
 *  nulled server-side for every viewer the answer key is not for (the
 *  author, ADMIN/OWNER oversight, QUALITY holding EXAMS_MODERATE —
 *  exams.routes.ts canSeeAnswers) — null here is a wire truth, not a
 *  missing field. Question-level `isApproved` / `moderationNote` are the
 *  moderation state of each bank question (the only read surface that
 *  exposes them — the bank listing filters to approved only). */
export interface ExamTemplateDetail {
  id: string;
  title: string;
  description: string | null;
  kind: ExamKindFE;
  status: ExamStatusFE;
  durationMin: number;
  passingScore: number;
  randomized: boolean;
  moderationNote: string | null;
  openAt: string | null;
  closeAt: string | null;
  offeringId: string | null;
  facultyId: string | null;
  authorId: string;
  createdAt: string;
  offering: { id: string; teacherId: string; course: { name: string; code: string } } | null;
  faculty: { name: string } | null;
  author: { firstName: string; lastName: string };
  moderatedBy: { firstName: string; lastName: string } | null;
  questions: Array<{
    id: string;
    order: number;
    pointsOverride: number | null;
    question: {
      id: string;
      type: QType;
      prompt: string;
      choices: string[] | null;
      correctAnswer: string | number | boolean | null;
      difficulty: Difficulty;
      points: number;
      isApproved: boolean;
      moderationNote: string | null;
      tags: string[];
      category: { title: string } | null;
    };
  }>;
  _count: { attempts: number };
}
export function useExamTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['exams', 'templates', id],
    enabled: !!id,
    queryFn: () => unwrap<ExamTemplateDetail>(api.get(`/exams/templates/${id}`)),
  });
}

/** POST /question-bank body — mirrors the backend's createQuestionSchema
 *  (MCQ/TRUE_FALSE carry choices + an integer correctAnswer index,
 *  SHORT carries a model-answer string, ESSAY an optional rubric). */
export interface CreateQuestionInput {
  categoryId: string;
  type: QType;
  prompt: string;
  choices?: string[];
  correctAnswer?: string | number;
  difficulty: Difficulty;
  points: number;
  tags: string[];
}
export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    // New questions land in moderation (isApproved: false) — they enter
    // the bank listing only after an EXAMS_MODERATE holder approves.
    mutationFn: (input: CreateQuestionInput) =>
      unwrap<{ id: string; isApproved: boolean }>(api.post('/question-bank', input)),
    onSuccess: () => {
      // Family-level: covers every filter view + the categories query
      // (['question-bank','categories']) whose _count.questions shifts.
      qc.invalidateQueries({ queryKey: ['question-bank'] });
    },
  });
}

/** POST /exams/templates body — questionIds are 1..60 approved bank
 *  questions; openAt/closeAt are ISO strings the backend coerces to Date. */
export interface CreateExamTemplateInput {
  offeringId?: string;
  facultyId?: string;
  title: string;
  kind: ExamKindFE;
  description?: string;
  durationMin: number;
  passingScore: number;
  randomized: boolean;
  questionIds: string[];
  openAt?: string;
  closeAt?: string;
}
export function useCreateExamTemplate() {
  const qc = useQueryClient();
  return useMutation({
    // Creation writes PENDING_REVIEW directly (the moderation gate).
    mutationFn: (input: CreateExamTemplateInput) =>
      unwrap<ExamTemplateRow>(api.post('/exams/templates', input)),
    onSuccess: () => {
      // ['exams'] covers the templates list + detail + the moderation
      // queue; the Intelligence offering cards carry _count.examTemplates.
      qc.invalidateQueries({ queryKey: ['exams'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
    },
  });
}

/** Author publish — the backend only flips APPROVED→PUBLISHED while the
 *  row is still APPROVED (a landing rejection 409s, never leapfrogs). */
export function usePublishExamTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      unwrap<ExamTemplateRow>(api.post(`/exams/templates/${templateId}/publish`, {})),
    onSuccess: () => {
      // PUBLISHED templates surface in the student exam list + every
      // author/moderation view — the ['exams'] family covers all of them.
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

/** Question-level moderation (POST /question-bank/:id/moderate) — the
 *  same approve/note body as the template moderate endpoint. Approval
 *  flips the question into every bank filter view; a rejection pulls it
 *  from the authoring pool (existing templates keep their rows). */
export function useModerateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      unwrap<{ id: string; isApproved: boolean }>(api.post(`/question-bank/${id}/moderate`, { approve, note })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['question-bank'] });
      // Template detail payloads embed the moderated question rows.
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

export interface ModerationQueueItem {
  id: string;
  title: string;
  kind: ExamKindFE;
  durationMin: number;
  createdAt: string;
  offering: { course: { name: string } } | null;
  author: { firstName: string; lastName: string };
  _count: { questions: number };
}
export function useExamModerationQueue() {
  return useQuery({
    queryKey: ['exams', 'moderation-queue'],
    queryFn: () => unwrap<ModerationQueueItem[]>(api.get('/exams/moderation-queue')),
  });
}

export function useModerateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      unwrap<{ id: string; status: ExamStatusFE }>(api.post(`/exams/templates/${id}/moderate`, { approve, note })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

/* ── Manual grading (18-F2 — the exam lifecycle's missing half) ── */

export type ExamAttemptStatusFE = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED';

/** One parked answer of a SUBMITTED exam attempt — the grading modal's
 *  unit of work (essays and keyless shorts the auto-grader parked).
 *  `studentAnswer` is the chosen option's text for objective questions,
 *  the prose otherwise; null = the student wrote nothing. */
export interface PendingExamAnswer {
  answerId: string;
  questionId: string;
  prompt: string;
  type: QType;
  points: number;
  studentAnswer: string | null;
}

/** GET /exams/templates/:id/attempts row. `pendingReview` counts the
 *  answers awaiting a verdict; `pendingAnswers` embeds their grading
 *  detail ONLY on SUBMITTED rows — the one status the grade write
 *  accepts (IN_PROGRESS is mid-exam, EXPIRED is terminal; both ship an
 *  honest count with an empty array). */
export interface ExamAttemptRow {
  id: string;
  studentId: string;
  studentName: string;
  status: ExamAttemptStatusFE;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  pendingReview: number;
  pendingAnswers: PendingExamAnswer[];
}

/** The attempts of one template for the grading surface — keyed under
 *  the template detail key, so both refresh together (the ['exams']
 *  family reaches them all). */
export function useExamAttempts(templateId: string | undefined) {
  return useQuery({
    queryKey: ['exams', 'templates', templateId, 'attempts'],
    enabled: !!templateId,
    queryFn: () => unwrap<ExamAttemptRow[]>(api.get(`/exams/templates/${templateId}/attempts`)),
  });
}

/** POST /exams/attempts/:attemptId/grade body — mirrors the backend's
 *  manualGradeSchema: every pending answer exactly once (isCorrect +
 *  optional feedback ≤ 2000), finalize SUBMITTED → GRADED with the
 *  machine score + the teacher's verdicts. */
export interface ManualExamGradeInput {
  attemptId: string;
  answers: Array<{ answerId: string; isCorrect: boolean; feedback?: string }>;
}
export function useGradeExamAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualExamGradeInput) =>
      unwrap<{ score: number; maxScore: number; status: string; passed: boolean }>(
        api.post(`/exams/attempts/${input.attemptId}/grade`, { answers: input.answers }),
      ),
    onSuccess: () => {
      // Finalizing SUBMITTED→GRADED shifts the attempts list, the
      // detail's _count.attempts and the author's template rows — the
      // ['exams'] family covers all of them.
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

export interface MyExam {
  id: string;
  title: string;
  kind: ExamKindFE;
  durationMin: number;
  questionCount: number;
  passingScore: number;
  openAt: string | null;
  closeAt: string | null;
  courseName: string | null;
  courseIcon: string | null;
  facultyName: string | null;
  myAttempt: { id: string; status: string; score: number | null; maxScore: number; submittedAt: string | null } | null;
}
export function useMyExams() {
  return useQuery({
    queryKey: ['exams', 'me'],
    queryFn: () => unwrap<MyExam[]>(api.get('/exams/me')),
  });
}

export interface StartedAttempt {
  attemptId: string;
  expiresAt: string;
  durationMin: number;
  title: string;
  /** Present (as `true`) only on the TERMINAL start response. Declared
   *  as the literal `true` — not `boolean` — so the optional property
   *  doubles as a discriminant: `if (r.alreadyAttempted)` narrows the
   *  StartExamResponse union (the wire never sends `false`). */
  alreadyAttempted?: true;
  questions: Array<{ id: string; type: QType; prompt: string; choices: string[] | null; points: number }>;
}
/* D5 (WAVE-12-MAP, backend batch 12-1) — exam resume contract: when an
   IN_PROGRESS attempt exists, POST /exams/templates/:id/start returns the
   fresh-start shape PLUS `resumed: true` and the saved attempt; a GRADED /
   EXPIRED / SUBMITTED attempt answers with a TERMINAL `{ attemptId,
   status, alreadyAttempted: true }` that carries no questions, expiry or
   title. `value` is the raw saved input — the choice index for MCQ /
   TRUE_FALSE, the answer text otherwise (null when nothing was
   saved); the object form is accepted defensively. */
export interface SavedAnswerValue {
  choiceIndex?: number | null;
  answerText?: string | null;
}
export interface ResumedAttempt {
  id: string;
  status: string;
  expiresAt: string;
  answers: Array<{ questionId: string; value: SavedAnswerValue | number | string | null }>;
}
/* 15-c P1-3 — the backend ships three disjoint payloads with no tag of
   its own (exams.routes.ts start route: fresh 201 / resume 200 /
   terminal 200). The old flat type declared questions + expiresAt +
   durationMin + title on EVERY response, so the terminal shape was a
   type-level lie any future consumer could crash on. The union is
   discriminated by a `type` tag attached client-side (the backend is
   unchanged — see tagStartExamResponse), and the raw `alreadyAttempted`
   flag stays accessible so existing consumers' `if (r.alreadyAttempted)`
   early-return compiles and narrows unchanged. */
export type StartExamResponse =
  | (StartedAttempt & { type: 'fresh'; resumed?: undefined; attempt?: undefined })
  | (StartedAttempt & { type: 'resumed'; resumed: true; attempt: ResumedAttempt })
  | { type: 'alreadyAttempted'; attemptId: string; status: string; alreadyAttempted: true };

/** Untagged wire payload of POST /exams/templates/:id/start — exactly
 *  what the backend sends: a start-OK shape (fresh, or resume with the
 *  saved answers) or the terminal no-questions shape. No `type` field
 *  exists on the wire; the union is discriminated structurally. */
export type StartExamWire =
  | (StartedAttempt & { resumed?: boolean; attempt?: ResumedAttempt })
  | { attemptId: string; status: string; alreadyAttempted: true };

/** Attach the `type` discriminant to a raw start response (15-c P1-3):
 *  the terminal payload carries `alreadyAttempted: true` and no
 *  questions; a resume carries `resumed: true` + the saved attempt;
 *  everything else is a fresh start. Pure and exported so the union
 *  contract is unit-pinned without a server. */
export function tagStartExamResponse(wire: StartExamWire): StartExamResponse {
  if ('questions' in wire) {
    // Start-OK payload — rebuild the normalized base so the tagged
    // result carries exactly the declared fields (wire-only extras
    // like a stray `resumed: false` never leak through).
    const base: StartedAttempt = {
      attemptId: wire.attemptId,
      expiresAt: wire.expiresAt,
      durationMin: wire.durationMin,
      title: wire.title,
      questions: wire.questions,
    };
    if (wire.resumed === true && wire.attempt) {
      return { ...base, type: 'resumed', resumed: true, attempt: wire.attempt };
    }
    return { ...base, type: 'fresh' };
  }
  // Terminal payload — the attempt is closed for this student
  // (GRADED / EXPIRED / SUBMITTED awaiting grading).
  return {
    type: 'alreadyAttempted',
    attemptId: wire.attemptId,
    status: wire.status,
    alreadyAttempted: true,
  };
}

export function useStartExam() {
  return useMutation({
    // The backend sends one of three disjoint payloads with no tag of
    // its own — tagStartExamResponse attaches the `type` discriminant
    // so consumers branch on a truthful union (15-c P1-3).
    mutationFn: async (templateId: string) =>
      tagStartExamResponse(
        await unwrap<StartExamWire>(api.post(`/exams/templates/${templateId}/start`, {})),
      ),
  });
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: ({ attemptId, questionId, answerText, choiceIndex }: { attemptId: string; questionId: string; answerText?: string; choiceIndex?: number }) =>
      unwrap<{ ok: boolean }>(api.post(`/exams/attempts/${attemptId}/answer`, { questionId, answerText, choiceIndex })),
  });
}

export function useFinishExam() {
  const qc = useQueryClient();
  return useMutation({
    // `passed` is null while manual grading pends (needsManual > 0) —
    // the backend deliberately withholds the verdict (15-c P1-1);
    // consumers must render a neutral state, never a failed one.
    mutationFn: (attemptId: string) =>
      unwrap<{ score: number; maxScore: number; status: string; needsManual: number; passed: boolean | null }>(
        api.post(`/exams/attempts/${attemptId}/submit`, {}),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams', 'me'] }),
  });
}

// ── Social ─────────────────────────────────────────────────────
export interface AnnouncementRow {
  id: string;
  scope: 'PLATFORM' | 'FACULTY' | 'DEPARTMENT' | 'OFFERING';
  scopeId: string | null;
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: string;
  iconEmoji: string | null;
  author: { firstName: string; lastName: string; avatarColor: string | null; avatarInitials: string | null; role: string };
}
export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'feed'],
    queryFn: () => unwrap<AnnouncementRow[]>(api.get('/announcements/feed')),
  });
}

export interface CreateAnnouncementInput {
  scope: 'PLATFORM' | 'FACULTY' | 'DEPARTMENT' | 'OFFERING';
  scopeId?: string;
  title: string;
  body: string;
  pinned?: boolean;
  iconEmoji?: string;
  expiresAt?: string;
}
export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      unwrap<AnnouncementRow>(api.post('/announcements', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export interface CompetitionRow {
  id: string;
  title: string;
  description: string;
  category: string;
  prize: string | null;
  deadline: string;
  status: 'OPEN' | 'CLOSED' | 'JUDGED';
  iconEmoji: string | null;
  themeColor: string | null;
  organizer: { firstName: string; lastName: string; role: string };
  _count: { entries: number };
}
export function useCompetitions() {
  return useQuery({
    queryKey: ['competitions'],
    queryFn: () => unwrap<CompetitionRow[]>(api.get('/competitions')),
  });
}

export interface CompetitionDetail extends CompetitionRow {
  organizerId: string;
  entries: Array<{
    id: string;
    title: string;
    body?: string;
    fileUrl?: string | null;
    submittedAt: string;
    score: number | null;
    user: { firstName: string; lastName: string; avatarColor: string | null; avatarInitials: string | null };
  }>;
}
export function useCompetition(id: string | undefined) {
  return useQuery({
    queryKey: ['competitions', id],
    queryFn: () => unwrap<CompetitionDetail>(api.get(`/competitions/${id}`)),
    enabled: !!id,
  });
}

export interface CreateCompetitionInput {
  title: string;
  description: string;
  category: string;
  prize?: string;
  deadline: string;
  iconEmoji?: string;
  themeColor?: string;
}
export function useCreateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompetitionInput) =>
      unwrap<CompetitionRow>(api.post('/competitions', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitions'] }),
  });
}

export interface EnterCompetitionInput {
  title: string;
  body: string;
  fileUrl?: string;
}
export function useEnterCompetition(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EnterCompetitionInput) =>
      unwrap<{ id: string }>(api.post(`/competitions/${competitionId}/enter`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions', competitionId] });
      // 15-d P2-2: the list row's _count.entries changes on entry — match
      // useCloseCompetition / useJudgeCompetition, which already refresh
      // both the detail key and the list.
      qc.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export function useCloseCompetition(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<CompetitionRow>(api.post(`/competitions/${competitionId}/close`, {})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions', competitionId] });
      qc.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export function useScoreCompetitionEntry(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, score }: { entryId: string; score: number | null }) =>
      unwrap<{ id: string; score: number | null }>(
        api.post(`/competitions/${competitionId}/entries/${entryId}/score`, { score }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions', competitionId] });
    },
  });
}

export function useJudgeCompetition(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<CompetitionRow>(api.post(`/competitions/${competitionId}/judge`, {})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions', competitionId] });
      qc.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export interface CampusEventRow {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  iconEmoji: string | null;
  themeColor: string | null;
  organizer: { firstName: string; lastName: string; role: string };
  _count: { rsvps: number };
}
export function useCampusEvents() {
  return useQuery({
    queryKey: ['campus-events'],
    queryFn: () => unwrap<CampusEventRow[]>(api.get('/events')),
  });
}

export interface CreateCampusEventInput {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  iconEmoji?: string;
  themeColor?: string;
}
export function useCreateCampusEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampusEventInput) =>
      unwrap<CampusEventRow>(api.post('/events', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campus-events'] }),
  });
}

export function useRsvpEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: 'GOING' | 'MAYBE' | 'NO' }) =>
      unwrap<{ status: string }>(api.post(`/events/${eventId}/rsvp`, { status })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campus-events'] }),
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
  return useQuery({
    queryKey: ['me', 'teacher-profile'],
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

export interface LiveSessionRow {
  id: string;
  offeringId: string;
  teacherId: string;
  title: string;
  description: string | null;
  topic: string | null;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  joinUrl: string | null;
  recordingUrl: string | null;
  offering: {
    id: string;
    course: { name: string; code: string; iconEmoji: string | null; themeColor: string | null };
  };
  teacher: { firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null };
}
export function useLiveSessions() {
  return useQuery({
    queryKey: ['live', 'sessions'],
    queryFn: () => unwrap<LiveSessionRow[]>(api.get('/live/sessions')),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      offeringId: string;
      title: string;
      description?: string;
      topic?: string;
      scheduledAt: string;
      joinUrl?: string;
    }) => unwrap<LiveSessionRow>(api.post('/live/sessions', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live', 'sessions'] }),
  });
}

export function useLifecycleLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'START' | 'END' | 'CANCEL' }) =>
      unwrap<LiveSessionRow>(api.post(`/live/sessions/${id}/lifecycle`, { action })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live', 'sessions'] }),
  });
}
