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
  // R362 (Agent 5 recalibration): the auth-recovery sheets + the
  // public marketing/legal sheets + /app joined the sweep — they are
  // real renderable routes (multi-line <Route> rows in App.tsx the
  // original table predated). /admin/sync was REMOVED (fictional — no
  // such route exists in the router; WS-F6's recalibration note).
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/capabilities',
  '/legal/privacy',
  '/legal/terms',
  '/legal/cookies',
  '/legal/accessibility',
  '/legal/security',
  '/legal/data',
  '/about',
  '/help',
  '/contact',
  '/app',
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
  // r171a: the student messages inbox (the DM lifecycle's student half —
  // shared components/messages pair, enrolled teachers as recipients).
  '/student/messages',
  // r164c: the student academic calendar (month grid uniting schedule
  // slots + assignment deadlines + exam windows + live sessions).
  '/student/calendar',
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
  '/student/catalog',
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
  '/teacher/exams',
  '/teacher/exams/:templateId',

  // ── admin (ADMIN-guarded) ──────────────────────────────────────
  '/admin/dashboard',
  '/admin/students',
  '/admin/teachers',
  '/admin/permissions/:id',
  '/admin/community',
  '/admin/faculties',
  '/admin/courses',
  '/admin/analysis',
  '/admin/digital',
  '/admin/reports',
  '/admin/settings',
  '/admin/alerts',
  // R362: the registrar console surfaces the original table missed.
  '/admin/directory',
  '/admin/people/:id',
  '/admin/mail',
  '/admin/import',

  // ── quality (QUALITY-guarded) ─────────────────────────────────
  '/quality/dashboard',
  '/quality/courses',
  '/quality/professors',
  '/quality/engagement',
  '/quality/reports',
  '/quality/curriculum',
  '/quality/alerts',
  '/quality/exam-moderation',
  '/quality/community',
  '/quality/notifications',

  // ── owner (OWNER-guarded) ─────────────────────────────────────
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
  '/owner/institutions',
  '/owner/institutions/:slug',
  '/owner/notifications',
  // R362: the pilot feedback inbox (r323 B3.6).
  '/owner/feedback',

  // ── shared (any authenticated role; swept as STUDENT) ──────────
  '/vision',
  '/vision/:slug',
  '/document/:filename',
  '/colleges',
  '/colleges/leaderboard',
  '/colleges/:id',
  '/competitions',
  '/competitions/:id',
  // R362: the any-auth account settings door (R320 cycle-3 P2-1).
  '/settings',
] as const;

export type AuditRoute = typeof AUDIT_ROUTES[number];

/**
 * r164 integration — the committed CI baseline slice.
 *
 * The surface-drift CI job re-captures these routes on every push and
 * hard-gates them against `surface-baseline.json`. Selection rule
 * (honest, not decorative): every route here renders its PRIMARY
 * content from the hermetic fixture transport (tests/e2e/fixtures/
 * mock-transport.ts) against the production build — routes whose
 * data queries have no fixture yet render error/loading states and
 * are deliberately NOT baseline material until their fixtures land.
 * Param routes resolve through the harness's PARAM_DEFAULTS.
 *
 * Re-capture locally with:
 *   AUDIT_BASELINE=1 AUDIT_API_MOCK=1 AUDIT_BASELINE_SLICE=1 \
 *   MADAREK_E2E_BASE_URL=http://localhost:4173 \
 *   npx playwright test tests/audit/surface-inventory.spec.ts
 * (vite preview serving `npm run build` output on :4173), then
 * `npm run audit:baseline` to promote, then re-capture + drift.
 */
export const BASELINE_ROUTES: readonly AuditRoute[] = [
  // public funnel
  '/',
  '/auth',
  '/auth/register',
  '/404',
  '/colleges',
  // student core journeys (fixtures: dashboard/resume/notifications/
  // enrollments/offerings full+lectures/lecture detail/exams/me)
  '/student/dashboard',
  '/student/courses',
  '/student/courses/:offeringId',
  '/student/lectures/:lectureId',
  '/student/online-exams',
  '/student/alerts',
  '/student/calendar',
] as const;

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
