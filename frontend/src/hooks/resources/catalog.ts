// catalog.ts — r153c domain split of ../useResources.ts (catalog domain: courses (admin list) · books/loans · lab stats · MOOCs · jobs · labs/AR · faculties.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';

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
/* (r153l grave: useCourses — the ['courses'] query — had ZERO consumers
 * in src and tests since the admin list moved to useAdminCourses's
 * paginated envelope; only the Course TYPE is consumed (student.ts's
 * MyEnrollment). Dead export deleted; type kept.) */

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

/** r154d: record a completed lab experiment. The LabsPage runner calls this
 *  on the final step so the «تجارب مكتملة» KPI (sourced from GET /me/lab-sessions)
 *  reflects real persistence instead of staying at 0. Invalidates the
 *  sessions family so the KPI + recent list refresh on success. */
export function useCompleteLabSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { labId: string; experimentName: string }) =>
      unwrap<{ id: string; completedAt: string }>(api.post('/me/lab-sessions', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'lab-sessions'] }),
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      unwrap<{ id: string; jobId: string; userId: string }>(api.post(`/jobs/${jobId}/apply`)),
    /* r153g: the payload carries appliedJobIds (18-G) — without this
     * invalidation the «تمّ التقديم» badge was client-local fiction
     * that vanished on every remount until the 30s stale window
     * lapsed on a later mount. */
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
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
