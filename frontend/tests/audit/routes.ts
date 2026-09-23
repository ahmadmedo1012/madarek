/**
 * Audit route table — see specs/012-design-graphics-uplift/contracts/audit-script.md.
 *
 * WS-F6: rewritten against the REAL route map (frontend/src/App.tsx +
 * lib/nav.ts). The previous table listed fictional routes (/login,
 * /dashboard, /faculty, /dean, /error, /onboarding-replay) that never
 * existed in the router — the sweep would have 404'd through the SPA
 * fallback and baselined the wrong surface.
 *
 * Each tuple of (route × viewport × theme × dir) becomes one capture in
 * surface-inventory.json. Routes containing :param placeholders are
 * resolved by the audit harness (tests/audit/surface-inventory.spec.ts)
 * against fixture ids — see PARAM_DEFAULTS there.
 *
 * Route → guarding role is derived from the first path segment; the
 * harness logs in via the API and seeds the auth store before visiting
 * guarded routes.
 */

export const AUDIT_ROUTES = [
  // ── public (guest) ─────────────────────────────────────────────
  '/',                        // HomeRedirect → landing for guests
  '/auth',                    // login
  '/auth/register',           // registration
  '/404',                     // NotFoundPage

  // ── student (STUDENT-guarded) ──────────────────────────────────
  '/student/dashboard',
  '/student/schedule',
  '/student/courses',
  '/student/courses/:offeringId',
  '/student/lectures/:lectureId',
  '/student/results',
  '/student/library',
  '/student/mooc',
  '/student/jobs',
  '/student/ai',
  '/student/gamification',
  '/student/skills',
  '/student/alerts',
  '/student/labs',
  '/student/ar',
  '/student/social',
  '/student/downloads',
  '/student/university',
  '/student/live',
  '/student/payment',
  '/student/map',
  '/student/matrix',
  '/student/research',
  '/student/profile',
  '/student/webinars',
  '/student/exams',
  '/student/online-exams',
  '/student/online-exams/:id',
  '/training',                // STUDENT-guarded in App.tsx
  '/training/:slug',
  '/training/:slug/lesson/:lessonId',
  '/achievements',
  '/community',               // STUDENT-guarded in App.tsx

  // ── teacher (TEACHER-guarded) ──────────────────────────────────
  '/teacher/dashboard',
  '/teacher/schedule',
  '/teacher/attendance',
  '/teacher/grades',
  '/teacher/materials',
  '/teacher/research',
  '/teacher/students',
  '/teacher/performance',
  '/teacher/assignments',
  '/teacher/messages',
  '/teacher/ai',
  '/teacher/library',
  '/teacher/alerts',
  '/teacher/intelligence',
  '/teacher/intelligence/:offeringId',
  '/teacher/profile',
  '/teacher/live',
  '/teacher/labs',
  '/teacher/community',

  // ── admin (ADMIN-guarded) ──────────────────────────────────────
  '/admin/dashboard',
  '/admin/students',
  '/admin/teachers',
  '/admin/permissions/:id',
  '/admin/sync',
  '/admin/community',
  '/admin/faculties',
  '/admin/courses',
  '/admin/analysis',
  '/admin/digital',
  '/admin/reports',
  '/admin/settings',
  '/admin/alerts',

  // ── quality (QUALITY/ADMIN-guarded) ────────────────────────────
  '/quality/dashboard',
  '/quality/courses',
  '/quality/professors',
  '/quality/engagement',
  '/quality/reports',
  '/quality/curriculum',
  '/quality/alerts',
  '/quality/exam-moderation',
  '/quality/community',

  // ── owner (OWNER-guarded) ──────────────────────────────────────
  '/owner/dashboard',
  '/owner/users',
  '/owner/activity',
  '/owner/content',
  '/owner/system',
  '/owner/education',
  '/owner/realtime',
  '/owner/ai',
  '/owner/alerts',
  '/owner/governance',

  // ── shared (any authenticated role; swept as STUDENT) ──────────
  '/vision',
  '/vision/:slug',
  '/document/:filename',
  '/colleges',
  '/colleges/leaderboard',
  '/colleges/:id',
  '/competitions',
  '/competitions/:id',
] as const;

export type AuditRoute = typeof AUDIT_ROUTES[number];

export const VIEWPORTS = [360, 768, 1280] as const;
export type Viewport = typeof VIEWPORTS[number];

export const THEMES = ['light', 'dark'] as const;
export type Theme = typeof THEMES[number];

/**
 * The app is RTL-only — index.html hard-locks `dir="rtl"` and no LTR
 * locale/mode exists — so the sweep covers a single direction. (The
 * DirKey type in inventory-types.ts still allows 'ltr' so historical
 * baselines remain readable.)
 */
export const DIRS = ['rtl'] as const;
export type Dir = typeof DIRS[number];
