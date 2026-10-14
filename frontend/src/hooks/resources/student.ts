// student.ts — r153c domain split of ../useResources.ts (student domain: dashboard · resume · results · materials · enrollments · matrix · messages · MyProfile (paper mutations live in research.ts).)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import type { AppRole } from '../../stores/auth.store';
import type { Course } from './catalog';

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
      /** PP-X2 (audit 3/8): agenda class rows became links to the
       *  course — the backend already shipped offeringId on every slot
       *  (student-dashboard.routes.ts todayClasses), the FE type just
       *  never declared it. */
      offeringId: string;
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

// ── Continue-learning resume (PP-X2, audit P0-3) ─────────────
/* GET /me/resume (learning.routes.ts, STUDENT only): the single
 * "where did I leave off" answer — the most-recently-watched
 * uncompleted lecture (mode 'continue', with its watched share), or
 * the first uncompleted lecture across active enrollments (mode
 * 'start'). data:null = nothing to resume (student with no in-progress
 * and no startable lecture) — consumers render NOTHING, not an empty
 * state; the dashboard keeps its metrics-first layout. Non-students
 * also get null. */
export interface ResumeState {
  mode: 'continue' | 'start';
  progressPct: number;
  watchedSec: number;
  lecture: {
    id: string;
    title: string;
    durationSec: number;
    ordinal: number;
    course: { id: string; name: string; code: string; themeColor: string | null };
    offeringId: string;
  };
}
export function useResume() {
  return useQuery({
    queryKey: ['me', 'resume'],
    queryFn: () => unwrap<ResumeState | null>(api.get('/me/resume')),
    // 30s default staleTime would lag a just-finished lecture; the
    // ['me'] invalidation on watch-completion (useReportWatch) covers
    // the transition, and a window-focus refetch catches the rest.
    refetchOnWindowFocus: true,
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
    /* r164-e (assessment loop) — additive fields the results page now
     * renders. Optional so a pre-r164-e cached payload (or an older
     * server) still satisfies the type: the page guards each one. */
    /** Raw awarded score (the pct alone hid the rubric ceiling). */
    grade?: number | null;
    /** The assignment's maxScore — the score's denominator. */
    maxScore?: number;
    /** The teacher's grading feedback, inline. */
    feedback?: string | null;
    /** When the student handed the work in (timeline step 1). */
    submittedAt?: string | null;
  }>;
  /* r164-e — the awaiting-grading half of the submission timeline.
   * Optional for the same backward-compat reason. */
  pendingSubmissions?: Array<{
    id: string;
    title: string;
    type: 'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM';
    offeringId: string;
    courseCode: string;
    courseName: string;
    status: 'SUBMITTED' | 'LATE';
    /** LATE as its own flag (the 16-B1 queue contract). */
    late: boolean;
    submittedAt: string;
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
      // r157 / 6A9: the meta carries `unread` (incoming, readAt null) —
      // the same contract as /notifications; the teacher inbox consumes
      // it for the unread subtitle + mark-all-read affordance.
      const res = await api.get<{ data: MessageRow[]; meta: { total: number; page: number; limit: number; totalPages: number; unread: number } }>(
        '/messages', { params: { page, limit } });
      return res.data;
    },
    staleTime: 30_000,
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
