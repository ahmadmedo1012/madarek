/**
 * R362 (Agent 5) — the complete route-coverage table for the real-stack
 * sweep (`tests/r362/*.spec.ts`, `npm run test:r362`).
 *
 * ONE TABLE, MACHINE-PINNED: every renderable route declared in
 * src/App.tsx appears here exactly once, owned by the role whose
 * ProtectedRoute guard mounts it (tests/unit/r362-sweep-table.test.ts
 * parses App.tsx with the same regex the title-coverage gate uses and
 * fails on any drift — a route added to the router without a sweep row,
 * or a row whose path no longer exists, both fail loudly).
 *
 * Param routes carry a `params` resolution: either an API lookup the
 * sweep performs at setup (preferred — survives reseeds) or a seeded
 * constant (documented, validated by the visit itself).
 *
 * Guard semantics per App.tsx:
 *   GUEST   — public (GuestRoute / CollegesLayout / GuestReveal sheets)
 *   STUDENT / TEACHER / ADMIN / QUALITY / OWNER — ProtectedRoute allow
 *   ANY     — bare ProtectedRoute (every authenticated role; swept as
 *             STUDENT, the broadest real account)
 *   STUDENT_AND_TEACHER — the single documented widening (/student/labs,
 *             pinned by App-routes.test.tsx since r155c)
 */

export type SweepRole =
  | 'GUEST'
  | 'STUDENT'
  | 'TEACHER'
  | 'ADMIN'
  | 'QUALITY'
  | 'OWNER'
  | 'ANY'
  | 'STUDENT_AND_TEACHER';

export interface SweepRoute {
  /** Literal path (with :params) — must match App.tsx byte-for-byte. */
  path: string;
  role: SweepRole;
  /**
   * How a concrete URL is built for param routes. Omitted for static
   * paths. `seed` values are pinned against the canonical seed
   * (prisma/seed.ts + MADAREK_TEST_ACCOUNTS=1 ensure) and re-validated
   * by the sweep's setup lookups where an endpoint exists.
   */
  params?: Record<string, string>;
}

/* ── seeded param anchors ─────────────────────────────────────────
 * The canonical seeded ids (madarek-demo institution). The sweep
 * resolves fresher values via API lookups when it can (see
 * resolveSweepParams in route-sweep.spec.ts); these constants are the
 * documented floor so the table stays runnable even when a lookup
 * endpoint's shape evolves. */
export const SEEDED_PARAM_ANCHORS = {
  /** The demo offering the test student is enrolled in AND the test
   * teacher owns (seed upserts both) — shared anchor for the course
   * detail and the teacher intelligence detail. */
  offeringId: 'cmw9d6q0j003sexl1rp5dgryf',
  /** First lecture of that offering. */
  lectureId: 'cmw9dkey003aexl1flhqwvjh',
  /** The seed's published exam template (teacher-authored; the student
   * has an IN_PROGRESS attempt on it — ExamTakerPage's resume path). */
  examTemplateId: 'cmw9d9tlp00cxexl16p1peysk',
  /** The methodology track + its first lesson. */
  trainingSlug: 'academic-methodology',
  trainingLessonId: 'cmw9d8gpi008oexl1pl47khdl',
  /** The test TEACHER user (permissions console target). */
  teacherUserId: 'cmw9d6bsi002aexl1hxswu0wo',
  /** The test STUDENT user (person file target). */
  studentUserId: 'cmw9d6awy0025exl17hi9cpb2',
  /** The demo institution's slug (owner console target). */
  institutionSlug: 'madarek-demo',
  /** First public college row (colleges API, public list). */
  collegeId: 'cmwjfz4v100021037wli1t1s8',
  /** First seeded competition. */
  competitionId: 'cmw9d9ys600dwexl1z3uk80mo',
  /** First vision concept slug (static config, src/lib/vision.ts). */
  visionSlug: 'ai-predictor',
  /** A deliberately-missing document filename — the viewer's honest
   * 404 branch is the state this route owns for a bare filename. */
  documentFilename: 'r362-missing-probe.pdf',
} as const;

/* ── the table ──────────────────────────────────────────────────── */

export const SWEEP_ROUTES: readonly SweepRoute[] = [
  /* ── public (GUEST) ─────────────────────────────────────────── */
  { path: '/', role: 'GUEST' }, // HomeRedirect → landing for guests
  { path: '/auth', role: 'GUEST' },
  { path: '/auth/register', role: 'GUEST' },
  { path: '/auth/forgot-password', role: 'GUEST' },
  { path: '/auth/reset-password', role: 'GUEST' },
  { path: '/auth/verify-email', role: 'GUEST' },
  { path: '/capabilities', role: 'GUEST' },
  { path: '/legal/privacy', role: 'GUEST' },
  { path: '/legal/terms', role: 'GUEST' },
  { path: '/legal/cookies', role: 'GUEST' },
  { path: '/legal/accessibility', role: 'GUEST' },
  { path: '/legal/security', role: 'GUEST' },
  { path: '/legal/data', role: 'GUEST' },
  { path: '/about', role: 'GUEST' },
  { path: '/help', role: 'GUEST' },
  { path: '/contact', role: 'GUEST' },
  { path: '/app', role: 'GUEST' },
  { path: '/colleges', role: 'GUEST' },
  { path: '/colleges/leaderboard', role: 'GUEST' },
  { path: '/colleges/:id', role: 'GUEST', params: { id: SEEDED_PARAM_ANCHORS.collegeId } },
  { path: '/404', role: 'GUEST' },
  { path: '/500', role: 'GUEST' },
  { path: '/403', role: 'GUEST' },
  { path: '/maintenance', role: 'GUEST' },

  /* ── student (STUDENT) ──────────────────────────────────────── */
  { path: '/student/dashboard', role: 'STUDENT' },
  { path: '/student/schedule', role: 'STUDENT' },
  { path: '/student/calendar', role: 'STUDENT' },
  { path: '/student/courses', role: 'STUDENT' },
  { path: '/student/catalog', role: 'STUDENT' },
  { path: '/student/results', role: 'STUDENT' },
  { path: '/student/library', role: 'STUDENT' },
  { path: '/student/research', role: 'STUDENT' },
  { path: '/student/mooc', role: 'STUDENT' },
  { path: '/student/jobs', role: 'STUDENT' },
  { path: '/student/ai', role: 'STUDENT' },
  { path: '/student/gamification', role: 'STUDENT' },
  { path: '/student/skills', role: 'STUDENT' },
  { path: '/student/alerts', role: 'STUDENT' },
  { path: '/student/messages', role: 'STUDENT' },
  { path: '/student/ar', role: 'STUDENT' },
  { path: '/student/social', role: 'STUDENT' },
  { path: '/student/downloads', role: 'STUDENT' },
  { path: '/student/university', role: 'STUDENT' },
  { path: '/student/live', role: 'STUDENT' },
  { path: '/student/payment', role: 'STUDENT' },
  { path: '/student/map', role: 'STUDENT' },
  { path: '/student/matrix', role: 'STUDENT' },
  { path: '/student/profile', role: 'STUDENT' },
  { path: '/student/webinars', role: 'STUDENT' },
  { path: '/student/online-exams', role: 'STUDENT' },
  { path: '/student/online-exams/:id', role: 'STUDENT', params: { id: SEEDED_PARAM_ANCHORS.examTemplateId } },
  { path: '/student/courses/:offeringId', role: 'STUDENT', params: { offeringId: SEEDED_PARAM_ANCHORS.offeringId } },
  { path: '/student/lectures/:lectureId', role: 'STUDENT', params: { lectureId: SEEDED_PARAM_ANCHORS.lectureId } },
  { path: '/training', role: 'STUDENT' },
  { path: '/training/:slug', role: 'STUDENT', params: { slug: SEEDED_PARAM_ANCHORS.trainingSlug } },
  { path: '/training/:slug/lesson/:lessonId', role: 'STUDENT', params: { slug: SEEDED_PARAM_ANCHORS.trainingSlug, lessonId: SEEDED_PARAM_ANCHORS.trainingLessonId } },
  { path: '/achievements', role: 'STUDENT' },
  { path: '/community', role: 'STUDENT' },

  /* ── the single documented role-widening (r155c) ────────────── */
  { path: '/student/labs', role: 'STUDENT_AND_TEACHER' },

  /* ── teacher (TEACHER) ──────────────────────────────────────── */
  { path: '/teacher/dashboard', role: 'TEACHER' },
  { path: '/teacher/schedule', role: 'TEACHER' },
  { path: '/teacher/attendance', role: 'TEACHER' },
  { path: '/teacher/grades', role: 'TEACHER' },
  { path: '/teacher/materials', role: 'TEACHER' },
  { path: '/teacher/research', role: 'TEACHER' },
  { path: '/teacher/students', role: 'TEACHER' },
  { path: '/teacher/performance', role: 'TEACHER' },
  { path: '/teacher/assignments', role: 'TEACHER' },
  { path: '/teacher/exams', role: 'TEACHER' },
  { path: '/teacher/exams/:templateId', role: 'TEACHER', params: { templateId: SEEDED_PARAM_ANCHORS.examTemplateId } },
  { path: '/teacher/messages', role: 'TEACHER' },
  { path: '/teacher/ai', role: 'TEACHER' },
  { path: '/teacher/library', role: 'TEACHER' },
  { path: '/teacher/alerts', role: 'TEACHER' },
  { path: '/teacher/intelligence', role: 'TEACHER' },
  { path: '/teacher/intelligence/:offeringId', role: 'TEACHER', params: { offeringId: SEEDED_PARAM_ANCHORS.offeringId } },
  { path: '/teacher/profile', role: 'TEACHER' },
  { path: '/teacher/live', role: 'TEACHER' },
  { path: '/teacher/labs', role: 'TEACHER' },
  { path: '/teacher/community', role: 'TEACHER' },

  /* ── admin / registrar general (ADMIN) ──────────────────────── */
  { path: '/admin/dashboard', role: 'ADMIN' },
  { path: '/admin/students', role: 'ADMIN' },
  { path: '/admin/directory', role: 'ADMIN' },
  { path: '/admin/people/:id', role: 'ADMIN', params: { id: SEEDED_PARAM_ANCHORS.studentUserId } },
  { path: '/admin/teachers', role: 'ADMIN' },
  { path: '/admin/permissions/:id', role: 'ADMIN', params: { id: SEEDED_PARAM_ANCHORS.teacherUserId } },
  { path: '/admin/community', role: 'ADMIN' },
  { path: '/admin/faculties', role: 'ADMIN' },
  { path: '/admin/courses', role: 'ADMIN' },
  // /admin/analysis renders AdminAnalysisPage — an in-page redirect to
  // /admin/reports (?trend=table); the sweep expects the bounce.
  { path: '/admin/analysis', role: 'ADMIN' },
  { path: '/admin/digital', role: 'ADMIN' },
  { path: '/admin/reports', role: 'ADMIN' },
  { path: '/admin/settings', role: 'ADMIN' },
  { path: '/admin/mail', role: 'ADMIN' },
  { path: '/admin/import', role: 'ADMIN' },
  { path: '/admin/alerts', role: 'ADMIN' },

  /* ── quality office (QUALITY) ───────────────────────────────── */
  { path: '/quality/dashboard', role: 'QUALITY' },
  { path: '/quality/courses', role: 'QUALITY' },
  { path: '/quality/professors', role: 'QUALITY' },
  { path: '/quality/engagement', role: 'QUALITY' },
  { path: '/quality/reports', role: 'QUALITY' },
  { path: '/quality/curriculum', role: 'QUALITY' },
  { path: '/quality/notifications', role: 'QUALITY' },
  { path: '/quality/alerts', role: 'QUALITY' },
  { path: '/quality/exam-moderation', role: 'QUALITY' },
  { path: '/quality/community', role: 'QUALITY' },

  /* ── owner (OWNER) ──────────────────────────────────────────── */
  { path: '/owner/dashboard', role: 'OWNER' },
  { path: '/owner/users', role: 'OWNER' },
  { path: '/owner/institutions', role: 'OWNER' },
  { path: '/owner/institutions/:slug', role: 'OWNER', params: { slug: SEEDED_PARAM_ANCHORS.institutionSlug } },
  { path: '/owner/activity', role: 'OWNER' },
  { path: '/owner/content', role: 'OWNER' },
  { path: '/owner/system', role: 'OWNER' },
  { path: '/owner/education', role: 'OWNER' },
  { path: '/owner/realtime', role: 'OWNER' },
  { path: '/owner/ai', role: 'OWNER' },
  { path: '/owner/notifications', role: 'OWNER' },
  { path: '/owner/alerts', role: 'OWNER' },
  { path: '/owner/governance', role: 'OWNER' },
  { path: '/owner/feedback', role: 'OWNER' },

  /* ── any authenticated role (swept as STUDENT) ──────────────── */
  { path: '/vision', role: 'ANY' },
  { path: '/vision/:slug', role: 'ANY', params: { slug: SEEDED_PARAM_ANCHORS.visionSlug } },
  { path: '/settings', role: 'ANY' },
  { path: '/document/:filename', role: 'ANY', params: { filename: SEEDED_PARAM_ANCHORS.documentFilename } },
  { path: '/competitions', role: 'ANY' },
  { path: '/competitions/:id', role: 'ANY', params: { id: SEEDED_PARAM_ANCHORS.competitionId } },
] as const;

/* ── helpers ────────────────────────────────────────────────────── */

/** The sweep LoginRole for a SweepRole ('GUEST' pages are visited
 * signed-out; 'ANY'/'STUDENT_AND_TEACHER' ride the STUDENT session —
 * the labs widening is separately pinned for TEACHER by the sweep's
 * second pass over that one route). */
export type LoginRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

export function loginRoleFor(role: SweepRole): LoginRole | null {
  switch (role) {
    case 'GUEST':
      return null;
    case 'STUDENT':
    case 'ANY':
      return 'STUDENT';
    case 'STUDENT_AND_TEACHER':
      return 'STUDENT'; // the TEACHER pass is explicit in the spec
    case 'TEACHER':
      return 'TEACHER';
    case 'ADMIN':
      return 'ADMIN';
    case 'QUALITY':
      return 'QUALITY';
    case 'OWNER':
      return 'OWNER';
  }
}

/** Build the concrete URL for a sweep route. */
export function sweepUrl(route: SweepRoute): string {
  let url = route.path;
  if (route.params) {
    for (const [key, value] of Object.entries(route.params)) {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    }
  }
  return url;
}

/** Routes whose element is an in-page redirect (the sweep asserts the
 * destination, not the source surface). */
export const IN_PAGE_REDIRECTS: ReadonlySet<string> = new Set([
  '/admin/analysis', // → /admin/reports?trend=table (5-B4 hand-off)
]);
