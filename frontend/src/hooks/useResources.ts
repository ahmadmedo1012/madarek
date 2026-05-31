import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';

// ── Student dashboard aggregate ───────────────────────────────
export interface StudentDashboard {
  profile: {
    year: number;
    gpa: number;
    totalXp: number;
    level: number;
    facultyName: string | null;
    departmentName: string | null;
  };
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
export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => unwrap<Job[]>(api.get('/jobs?limit=50')),
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
}
export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => unwrap<Post[]>(api.get('/posts?limit=20')),
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
export function useAdminCourses() {
  return useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => unwrap<AdminCourse[]>(api.get('/admin/courses')),
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

// ── Resume learning ────────────────────────────────────────────
export interface ResumeLecture {
  mode: 'continue' | 'start';
  progressPct: number;
  watchedSec: number;
  lecture: {
    id: string;
    title: string;
    durationSec: number;
    ordinal: number;
    course: { id: string; name: string; code: string; themeColor?: string | null };
    offeringId: string;
  };
}
export function useResume() {
  return useQuery({
    queryKey: ['me', 'resume'],
    queryFn: () => unwrap<ResumeLecture | null>(api.get('/me/resume')),
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
    role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';
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
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';
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
      qc.invalidateQueries({ queryKey: ['training'] });
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
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';
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
  alreadyAttempted?: boolean;
  status?: string;
  questions: Array<{ id: string; type: QType; prompt: string; choices: string[] | null; points: number }>;
}
export function useStartExam() {
  return useMutation({
    mutationFn: (templateId: string) =>
      unwrap<StartedAttempt>(api.post(`/exams/templates/${templateId}/start`, {})),
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
    mutationFn: (attemptId: string) =>
      unwrap<{ score: number; maxScore: number; status: string; needsManual: number; passed: boolean }>(
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
    faculty: string;
    verified: boolean;
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
