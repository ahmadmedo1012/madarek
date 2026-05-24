import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';

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
