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
