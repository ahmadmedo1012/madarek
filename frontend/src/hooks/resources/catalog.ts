// catalog.ts — r153c domain split of ../useResources.ts (catalog domain: courses (admin list) · books/loans · lab stats · MOOCs · jobs · labs/AR · faculties.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

/* r179 (phase-5) scope classification: this module's reads are either
 * PLATFORM-SHARED catalogue surfaces (books/mooc/jobs/labs/AR — no
 * institution column by design) or USER-scoped rows (me/loans,
 * me/lab-sessions — keyed by userId). No key here carries the
 * institution scope segment — not an omission, the classification. */

/** r180 — the CALLER's institution slug for in-app faculty pickers.
 * The auth session's current context (null for OWNER / a member whose
 * context is not selected yet, so those consumers keep the honest
 * platform-wide listing instead of a silently wrong filter). */
export function useCurrentInstitutionSlug(): string | undefined {
  return useAuthStore((s) => s.currentInstitution?.slug ?? undefined);
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

/* r155b: نصفي الواجهة لمساري الاستعارة/الإرجاع — الخلفية كانت مكتملة
 * (catalog.routes.ts: POST /library/loans و POST /library/loans/:id/return)
 * والصفحة تعلن «الاستعارة الفورية» بلا أي زر. الإبطال يشمل عائلة
 * ['books'] (المطابقة بالبادئة تغطي كل مفتاح مُعامَل) لأن الاستعارة
 * تنقص availableCopies، و ['me','loans'] لأن القائمة/KPI تتبدّل فوراً. */

/** ردّ POST /library/loans و POST /library/loans/:id/return — صفّ Loan
 *  المجرد (لا علاقة `book` على السلك؛ الواجهة تعيد الجلب عبر
 *  GET /me/loans بعد الإبطال). */
export interface LoanWriteResult {
  id: string;
  bookId: string;
  status: MyLoan['status'];
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
}

/** استعارة نسخة من كتاب — الجسم يطابق borrowBookSchema في الخلفية
 *  حرفياً ({ bookId } فقط؛ z.string().cuid()). 409ات الخلفية عربية
 *  («استعرت هذا الكتاب مسبقاً…» / «لا توجد نسخ متاحة…») والصفحة
 *  تعرضها كما هي عبر apiErrorMessage. */
export function useBorrowBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) =>
      unwrap<LoanWriteResult>(api.post('/library/loans', { bookId })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
      qc.invalidateQueries({ queryKey: ['me', 'loans'] });
    },
  });
}

/** إرجاع استعارة نشطة — الخلفية تحرّر النسخة (increment) داخل معاملة
 *  محروسة، والردّ هو الصفّ المحدَّث. */
export function useReturnLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) =>
      unwrap<LoanWriteResult>(api.post(`/library/loans/${loanId}/return`, {})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
      qc.invalidateQueries({ queryKey: ['me', 'loans'] });
    },
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
  /** r178: the institution this faculty belongs to. Present on the
   *  public catalog rows (Agent D's contract — each faculty row
   *  includes `institution: {id, name, slug}`); optional so legacy
   *  admin consumers that project fewer fields keep typechecking. */
  institution?: { id: string; name: string; slug: string } | null;
}
/**
 * r178: `institutionSlug` scopes the listing to one institution
 * (GET /faculties?institutionSlug=… — the register page always passes
 * the selected institution). Omitted → the server returns faculties
 * across ALL active institutions (legacy behavior every other
 * consumer relies on). `opts.enabled` lets the register page hold the
 * query until an institution is actually selected instead of listing
 * cross-institution faculties in the select.
 */
export function useFaculties(
  institutionSlug?: string,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: institutionSlug ? ['faculties', 'institution', institutionSlug] : ['faculties'],
    queryFn: () =>
      unwrap<Faculty[]>(
        api.get('/faculties', {
          params: institutionSlug ? { institutionSlug } : undefined,
        }),
      ),
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}
