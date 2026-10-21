/**
 * qa-transport — the r305 QA area's hermetic stand-in for the Express
 * API (Task 4, redesign/r305-heron-auth-public-qa).
 *
 * RE-IMPLEMENTATION NOTICE (per the R305-A9 file contract): this file
 * deliberately re-implements the MINIMAL transport machinery the QA
 * suite needs, modelled on tests/e2e/fixtures/mock-transport.ts (read
 * for reference, never imported/edited). Nothing under tests/e2e/** is
 * touched. The QA corpus is a dedicated SUBSET keyed to the routes the
 * QA specs cover — it is NOT a copy of the journey corpus, and the two
 * must evolve independently.
 *
 * Same core guarantees as the e2e transport:
 *   - a context-level route on the /api/ glob fulfils every /api/
 *     call before the network (Vite dev server serves the real SPA;
 *     no backend, no DB, no external traffic);
 *   - real envelopes (`{ data }` / `{ error: { code, message } }`) so
 *     axios + unwrap() behave exactly as against the live backend;
 *   - /auth/login and /auth/me are DYNAMIC (the transport owns the
 *     session; a successful login flips it, like the live backend);
 *   - every unmatched /api/** call answers 501 MOCK_NOT_IMPLEMENTED —
 *     a missing fixture is loud, never a silent success.
 *
 * QA-specific extension: a route def may carry `delayMs` — the
 * fulfilment is deferred so the specs can observe the app's real
 * loading (skeleton) state deterministically. Error responses ride the
 * standard `status` + error-envelope shape.
 */
import type { BrowserContext, Page, Route } from '@playwright/test';

/* ── frozen clock ──────────────────────────────────────────────── */

/** The instant every fixture timestamp is relative to (10:00 UTC). */
export const FIXED_NOW_ISO = '2026-03-15T10:00:00.000Z';
export const FIXED_NOW = Date.parse(FIXED_NOW_ISO);

/** ISO string `hours` from the frozen now (negative = past). */
export function iso(hoursFromNow: number): string {
  return new Date(FIXED_NOW + hoursFromNow * 3_600_000).toISOString();
}

/* ── users & sessions ──────────────────────────────────────────── */

/** Wire shape of the persisted user (stores/auth.store.ts). */
export interface FixtureUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';
  avatarColor: string | null;
  avatarInitials: string | null;
  scopeFacultyId: string | null;
}

export const STUDENT_USER: FixtureUser = {
  id: 'usr_qa_student',
  email: 'student@zu.edu.ly',
  firstName: 'أحمد',
  lastName: 'الزاوي',
  role: 'STUDENT',
  avatarColor: '#3b82f6',
  avatarInitials: 'أز',
  scopeFacultyId: null,
};

/** Credentials the dynamic login endpoint accepts (backend seed twin). */
export const VALID_LOGIN = { email: STUDENT_USER.email, password: 'Madarek2026!' } as const;
export const WRONG_LOGIN = { email: STUDENT_USER.email, password: 'wrong-password' } as const;
export const LOCKED_EMAIL = 'locked@zu.edu.ly';
export const LOGIN_FAILED_MESSAGE = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
export const LOGIN_LOCKED_MESSAGE = 'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة.';

/* ── envelope helpers (the real backend's shapes) ──────────────── */

export function ok(data: unknown): Record<string, unknown> {
  return { data };
}

export function fail(code: string, message: string): Record<string, unknown> {
  return { error: { code, message } };
}

/** Success envelope with pagination meta sibling (lib/pagination). */
export function pageOf(rows: unknown[], extraMeta: Record<string, number>): Record<string, unknown> {
  return { data: rows, meta: { page: 1, total: rows.length, totalPages: 1, ...extraMeta } };
}

/* ── the QA corpus ─────────────────────────────────────────────── */

/** GET /auth/me — MeProfileResponse (hooks/useAuth.ts useMe). */
function meProfile(user: FixtureUser): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarColor: user.avatarColor,
    avatarInitials: user.avatarInitials,
    scopeFaculty: null,
    // 'SYSTEM' → useThemeProfileSync: the local choice stays authoritative.
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: iso(-24 * 90),
    onboardingCompletedAt: iso(-24 * 30),
    firedMilestones: [],
    studentProfile: user.role === 'STUDENT'
      ? {
          universityId: '2023-11045',
          year: 3,
          facultyId: 'fac_qa_eng',
          departmentId: 'dep_qa_cs',
          faculty: { id: 'fac_qa_eng', name: 'كلية الهندسة' },
          department: { id: 'dep_qa_cs', name: 'قسم علوم الحاسوب' },
        }
      : null,
    teacherProfile: null,
  };
}

/** GET /colleges — public gallery rows (backend records match the
 *  identity bridge on (name, city); see the e2e transport twin). */
export const COLLEGES = [
  { id: 'clg_qa_eng', name: 'كلية الهندسة', nameEn: 'Engineering', iconEmoji: null, city: 'حرم المعرفة', departmentCount: 3, studentCount: 420, teacherCount: 28, courseCount: 12 },
  { id: 'clg_qa_sci', name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: null, city: 'حرم المعرفة', departmentCount: 2, studentCount: 310, teacherCount: 19, courseCount: 9 },
  { id: 'clg_qa_arts', name: 'كلية الآداب', nameEn: 'Arts', iconEmoji: null, city: 'حرم المعرفة', departmentCount: 2, studentCount: 260, teacherCount: 15, courseCount: 7 },
];

/** GET /colleges/leaderboard — LeaderboardData (CollegePages.tsx). */
export const COLLEGE_LEADERBOARD = {
  colleges: [
    {
      id: 'clg_qa_eng', name: 'كلية الهندسة', iconEmoji: null, city: 'حرم المعرفة',
      studentCount: 420, teacherCount: 28, totalXp: 18400, avgXp: 43.8, avgGpa: 3.21,
      publishedPapers: 14, examAttempts: 380, labSessions: 96, completedEnrollments: 210,
      ranks: { totalXp: 1, avgGpa: 2, publishedPapers: 1, examAttempts: 1, labSessions: 1, completedEnrollments: 1 },
    },
    {
      id: 'clg_qa_sci', name: 'كلية العلوم', iconEmoji: null, city: 'حرم المعرفة',
      studentCount: 310, teacherCount: 19, totalXp: 14200, avgXp: 45.8, avgGpa: 3.34,
      publishedPapers: 9, examAttempts: 260, labSessions: 120, completedEnrollments: 150,
      ranks: { totalXp: 2, avgGpa: 1, publishedPapers: 2, examAttempts: 2, labSessions: 2, completedEnrollments: 2 },
    },
    {
      id: 'clg_qa_arts', name: 'كلية الآداب', iconEmoji: null, city: 'حرم المعرفة',
      studentCount: 260, teacherCount: 15, totalXp: 9800, avgXp: 37.7, avgGpa: 3.05,
      publishedPapers: 4, examAttempts: 180, labSessions: 12, completedEnrollments: 110,
      ranks: { totalXp: 3, avgGpa: 3, publishedPapers: 3, examAttempts: 3, labSessions: 3, completedEnrollments: 3 },
    },
  ],
};

/** GET /training/catalog — TrainingTrackCard[] (hooks/resources/training.ts). */
export const TRAINING_CATALOG = [
  {
    id: 'trk_qa_research', slug: 'research-mastery', title: 'إتقان البحث العلمي', titleEn: null,
    summary: 'من صياغة السؤال البحثي إلى توثيق المراجع بأسلوب واحد منظّم.',
    category: 'RESEARCH', level: 'INTERMEDIATE', iconEmoji: '🔬', themeColor: null,
    estMinutes: 45, pointsAward: 120, totalLessons: 4,
    enrolled: true, completedLessons: 2, isCompleted: false, progressPct: 50,
  },
  {
    id: 'trk_qa_study', slug: 'study-skills', title: 'مهارات الدراسة الفعّالة', titleEn: null,
    summary: 'خطط مراجعة واقعية وتقنيات استدعاء نشط تصلح لأي مقرّر.',
    category: 'STUDY_SKILLS', level: 'BEGINNER', iconEmoji: '📚', themeColor: null,
    estMinutes: 30, pointsAward: 80, totalLessons: 3,
    enrolled: false, completedLessons: 0, isCompleted: false, progressPct: 0,
  },
];

/** GET /training/me — TrainingMeSummary. */
export const TRAINING_ME = {
  points: 1240,
  level: { level: 7, tier: 'GOLD', toNext: 260, pctIntoLevel: 40 },
  badgeCount: 6,
  certificateCount: 2,
  tracksEnrolled: 1,
  tracksCompleted: 0,
  recentBadges: [
    { slug: 'first-lesson', title: 'الخطوة الأولى', iconEmoji: '🌱', rarity: 'COMMON', earnedAt: iso(-72) },
  ],
};

/** GET /training/me/badges — UserBadgeRow[]. */
export const TRAINING_BADGES = [
  { slug: 'first-lesson', title: 'الخطوة الأولى', description: 'أكملت أول درس تدريبي على المنصة.', iconEmoji: '🌱', themeColor: null, rarity: 'COMMON', earnedAt: iso(-72), isEarned: true },
  { slug: 'research-starter', title: 'باحث ناشئ', description: 'أنجزت أول مهمة بحث موجّهة.', iconEmoji: '🔬', themeColor: null, rarity: 'RARE', earnedAt: iso(-26), isEarned: true },
  { slug: 'streak-7', title: 'أسبوع متواصل', description: 'درست سبعة أيام متتالية دون انقطاع.', iconEmoji: '🔥', themeColor: null, rarity: 'EPIC', earnedAt: null, isEarned: false },
];

/** GET /training/me/certificates — TrainingCertificate[]. */
export const TRAINING_CERTS = [
  { id: 'cert_qa_study', title: 'شهادة إتمام: مهارات الدراسة الفعّالة', issuer: 'منصة مدارك', issuedAt: iso(-240), hours: 3, status: 'COMPLETED', trackSlug: 'study-skills', iconEmoji: '📜', themeColor: null },
];

/** GET /training/leaderboard — LeaderboardRow[]. */
export const TRAINING_LEADERBOARD = [
  { rank: 1, userId: 'usr_qa_student', name: 'أحمد الزاوي', avatarColor: '#3b82f6', avatarInitials: 'أز', points: 1240, level: { level: 7, tier: 'GOLD', toNext: 260, pctIntoLevel: 40 } },
  { rank: 2, userId: 'usr_qa_peer1', name: 'سارة المنصوري', avatarColor: '#059669', avatarInitials: 'سم', points: 1120, level: { level: 6, tier: 'SILVER', toNext: 380, pctIntoLevel: 62 } },
  { rank: 3, userId: 'usr_qa_peer2', name: 'خالد الترهوني', avatarColor: '#d97706', avatarInitials: 'خت', points: 980, level: { level: 6, tier: 'SILVER', toNext: 520, pctIntoLevel: 30 } },
];

/** GET /announcements/feed — AnnouncementRow[] (hooks/resources/social.ts). */
export const ANNOUNCEMENTS = [
  {
    id: 'ann_qa_1', scope: 'PLATFORM', scopeId: null,
    title: 'افتتاح التسجيل للفصل الجديد',
    body: 'يبدأ التسجيل للفصل الدراسي الجديد الأسبوع القادم عبر بوابة المنصّة.',
    pinned: true, publishedAt: iso(-3), iconEmoji: '📣',
    author: { firstName: 'سالم', lastName: 'القرضابي', avatarColor: null, avatarInitials: 'سق', role: 'ADMIN' },
  },
];

/** GET /competitions — CompetitionRow[]. */
export const COMPETITIONS = [
  {
    id: 'comp_qa_1', title: 'مسابقة المقالة العلمية',
    description: 'اكتب مقالة بحثية في أحد تخصصات كليتك وفق النموذج المعلن.',
    category: 'بحث علمي', prize: 'كتاب + شهادة تقدير', deadline: iso(72), status: 'OPEN',
    iconEmoji: '🏆', themeColor: null,
    organizer: { firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER' },
    _count: { entries: 4 },
  },
  {
    id: 'comp_qa_2', title: 'تحدي البرمجة السنوي',
    description: 'ثلاث مسائل خوارزمية بمستويات متدرّجة لطلبة الحاسوب.',
    category: 'برمجة', prize: null, deadline: iso(-24), status: 'JUDGED',
    iconEmoji: '💻', themeColor: null,
    organizer: { firstName: 'ليلى', lastName: 'الفيتوري', role: 'TEACHER' },
    _count: { entries: 9 },
  },
];

/** GET /events — CampusEventRow[]. */
export const CAMPUS_EVENTS = [
  {
    id: 'evt_qa_1', title: 'معرض المشاريع الطلابية',
    description: 'عرض مشاريع التخرج وورشة تعريفية بأدوات العرض.',
    location: 'المدرج الكبير', startsAt: iso(48), endsAt: iso(50), capacity: 200,
    iconEmoji: '🎓', themeColor: null,
    organizer: { firstName: 'سالم', lastName: 'القرضابي', role: 'ADMIN' },
    _count: { rsvps: 36 }, myRsvp: null,
  },
];

/* ── route table ───────────────────────────────────────────────── */

/** A single mock route: method + path pattern + static payload. */
export interface MockRouteDef {
  method: string;
  /** e.g. '/lectures/:lectureId' — ':param' matches one segment. */
  path: string;
  /** Optional required query params (others are ignored). */
  query?: Record<string, string | number>;
  status?: number;
  /** Static JSON body (already enveloped by the caller). */
  json?: unknown;
  /** QA extension: defer the fulfilment (loading-state observation). */
  delayMs?: number;
}

/** The standard route table for the QA-covered surfaces. */
export function standardQaRoutes(): MockRouteDef[] {
  return [
    { method: 'GET', path: '/health', json: ok({ status: 'ok' }) },
    { method: 'POST', path: '/auth/logout', json: ok({ ok: true }) },
    { method: 'POST', path: '/auth/register', json: ok({ user: STUDENT_USER, accessToken: 'qa-token' }) },
    { method: 'GET', path: '/faculties', json: ok([]) },
    { method: 'GET', path: '/institutions', json: ok([]) },
    { method: 'GET', path: '/colleges', json: ok(COLLEGES) },
    { method: 'GET', path: '/colleges/leaderboard', json: ok(COLLEGE_LEADERBOARD) },
    { method: 'GET', path: '/training/catalog', json: ok(TRAINING_CATALOG) },
    { method: 'GET', path: '/training/me', json: ok(TRAINING_ME) },
    { method: 'GET', path: '/training/me/badges', json: ok(TRAINING_BADGES) },
    { method: 'GET', path: '/training/me/certificates', json: ok(TRAINING_CERTS) },
    { method: 'GET', path: '/training/leaderboard', json: ok(TRAINING_LEADERBOARD) },
    { method: 'GET', path: '/announcements/feed', json: ok(ANNOUNCEMENTS) },
    { method: 'GET', path: '/competitions', json: ok(COMPETITIONS) },
    { method: 'GET', path: '/events', json: ok(CAMPUS_EVENTS) },
    { method: 'GET', path: '/me/permissions', json: ok({ role: STUDENT_USER.role, capabilities: [], roleDefaults: [] }) },
    { method: 'GET', path: '/posts', json: ok([]) },
    // The shell's unread poll (?limit=1 reads meta.unread) and the
    // 50-item panel share one route (same shape as the e2e corpus).
    { method: 'GET', path: '/notifications', json: pageOf([], { unread: 0, limit: 50 }) },
    { method: 'GET', path: '/me/profile', json: ok(meProfile(STUDENT_USER)) },
    { method: 'GET', path: '/me/dashboard', json: ok({}) },
    { method: 'GET', path: '/me/resume', json: ok(null) },
    { method: 'PUT', path: '/me/theme', json: ok({ ok: true }) },
    { method: 'GET', path: '/search/global', json: ok([]) },
  ];
}

/* ── matching ──────────────────────────────────────────────────── */

function pathSegments(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

/** Matches and captures `:param` segments; null = no match. */
function matchPath(pattern: string[], actual: string[]): Record<string, string> | null {
  if (pattern.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i]!;
    const a = actual[i]!;
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

/* ── dynamic auth endpoints ────────────────────────────────────── */

function readPostJson(route: Route): { email?: string; password?: string } {
  try {
    const data = route.request().postDataJSON();
    return data && typeof data === 'object' ? (data as { email?: string; password?: string }) : {};
  } catch {
    return {};
  }
}

/**
 * The login endpoint answers from the request body (success / 401
 * INVALID_CREDENTIALS / 429 lockout) and flips the transport's session
 * role — subsequent /auth/me calls answer for whoever just logged in.
 */
async function handleLogin(route: Route, session: { user: FixtureUser | null }): Promise<void> {
  const body = readPostJson(route);
  if (body.email === LOCKED_EMAIL) {
    await fulfillJson(route, 429, fail('TOO_MANY_REQUESTS', LOGIN_LOCKED_MESSAGE));
    return;
  }
  if (body.email === VALID_LOGIN.email && body.password === VALID_LOGIN.password) {
    session.user = STUDENT_USER;
    await fulfillJson(route, 200, ok({ user: STUDENT_USER, accessToken: 'qa-token-student' }));
    return;
  }
  await fulfillJson(route, 401, fail('INVALID_CREDENTIALS', LOGIN_FAILED_MESSAGE));
}

/* ── installer ─────────────────────────────────────────────────── */

export interface InstallQaApiOptions {
  /** Session user answering /auth/me before any login (null = guest). */
  sessionUser?: FixtureUser | null;
  /** Per-test routes; matched BEFORE the standard table. */
  overrides?: MockRouteDef[];
  /** Replace the standard table entirely (default: standardQaRoutes()). */
  routes?: MockRouteDef[];
}

/**
 * Installs the QA mock transport on a BrowserContext (all pages) or a
 * single Page. Returns the mutable session (post-login role flips).
 */
export async function installQaApi(
  target: BrowserContext | Page,
  options: InstallQaApiOptions = {},
): Promise<void> {
  const session = { user: options.sessionUser ?? null };
  const overrideRoutes = options.overrides ?? [];
  const baseRoutes = options.routes ?? standardQaRoutes();
  // /auth/me + /auth/login are dynamic; they never come from the tables.
  const isDynamic = (r: MockRouteDef) =>
    (r.method === 'GET' && r.path === '/auth/me') || (r.method === 'POST' && r.path === '/auth/login');
  const overrideTable = overrideRoutes.filter((r) => !isDynamic(r));
  const baseTable = baseRoutes.filter((r) => !isDynamic(r));

  await target.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());

    // Only paths under /api/v1 are ours; anything else /api-ish still
    // falls through to the 501 below (loud, never silent).
    const apiMatch = url.pathname.match(/^\/api(?:\/v1)?(\/.*)$/);
    const apiPath = apiMatch ? apiMatch[1]! : url.pathname;
    const segments = pathSegments(apiPath);

    // Dynamic auth endpoints.
    if (method === 'POST' && url.pathname.endsWith('/auth/login')) {
      await handleLogin(route, session);
      return;
    }
    if (method === 'GET' && url.pathname.endsWith('/auth/me')) {
      if (session.user) {
        await fulfillJson(route, 200, ok(meProfile(session.user)));
      } else {
        await fulfillJson(route, 401, fail('UNAUTHENTICATED', 'جلسة غير صالحة'));
      }
      return;
    }
    if (method === 'POST' && url.pathname.endsWith('/auth/refresh')) {
      await fulfillJson(route, 401, fail('SESSION_EXPIRED', 'انتهت صلاحية الجلسة'));
      return;
    }

    // Static tables (overrides first). A pure-delay override — a def
    // with a delayMs but NO json/status — means «serve whatever the
    // standard table says, just slowly», so after the delay it falls
    // through to the base table instead of answering ok(null).
    for (const def of overrideTable) {
      if (def.method.toUpperCase() !== method) continue;
      const params = matchPath(pathSegments(def.path), segments);
      if (params === null) continue;
      let queryOk = true;
      for (const [key, value] of Object.entries(def.query ?? {})) {
        if (url.searchParams.get(key) !== String(value)) {
          queryOk = false;
          break;
        }
      }
      if (!queryOk) continue;
      if (def.delayMs && def.delayMs > 0) await new Promise((r) => setTimeout(r, def.delayMs));
      if (def.json === undefined && def.status === undefined) break; // pure delay → base table body
      await fulfillJson(route, def.status ?? 200, def.json ?? ok(null));
      return;
    }
    for (const def of baseTable) {
      if (def.method.toUpperCase() !== method) continue;
      const params = matchPath(pathSegments(def.path), segments);
      if (params === null) continue;
      let queryOk = true;
      for (const [key, value] of Object.entries(def.query ?? {})) {
        if (url.searchParams.get(key) !== String(value)) {
          queryOk = false;
          break;
        }
      }
      if (!queryOk) continue;
      await fulfillJson(route, def.status ?? 200, def.json ?? ok(null));
      return;
    }

    // Loud 501: a missing fixture must never read as a silent success.
    console.error(
      `[qa-transport] no fixture for ${method} ${url.pathname}${url.search} — answering 501`,
    );
    await fulfillJson(
      route,
      501,
      fail('MOCK_NOT_IMPLEMENTED', `qa transport has no fixture for ${method} ${url.pathname}`),
    );
  });
}

/* ── auth-state bootstrapping (the real store substrate) ────────── */

/**
 * localStorage payload exactly as zustand's persist middleware writes
 * it for `mdrk-auth` (stores/auth.store.ts — safeSessionStorage
 * JSON.stringify's { state, version }).
 */
export function authStorageJson(user: FixtureUser, token: string): string {
  return JSON.stringify({ state: { user, accessToken: token }, version: 0 });
}

/** localStorage payload for `madarek-theme` (theme.store.ts v2). */
export function themeStorageJson(mode: 'light' | 'dark'): string {
  return JSON.stringify({ state: { mode, modeUpdatedAt: 0 }, version: 2 });
}

/**
 * Seeds the auth store (and optionally a theme) via init script —
 * runs before any app module on every navigation in the context.
 * ONE-SHOT: a seed only writes when its key is ABSENT, so a reload
 * AFTER an in-test mutation (theme toggle, login) keeps what the app
 * itself persisted. A null user seeds only the theme (guest + theme).
 */
export async function seedQaSession(
  target: BrowserContext | Page,
  user: FixtureUser | null,
  opts: { token?: string; theme?: 'light' | 'dark' } = {},
): Promise<void> {
  const authJson = user ? authStorageJson(user, opts.token ?? 'qa-token-student') : null;
  const themeJson = opts.theme ? themeStorageJson(opts.theme) : null;
  await target.addInitScript(
    ([auth, theme]) => {
      if (auth) {
        try {
          if (localStorage.getItem('mdrk-auth') === null) {
            localStorage.setItem('mdrk-auth', auth);
          }
        } catch { /* storage unavailable — app falls back to guest */ }
      }
      if (theme) {
        try {
          if (localStorage.getItem('madarek-theme') === null) {
            localStorage.setItem('madarek-theme', theme);
          }
        } catch { /* same probe-guard story as the auth store */ }
      }
    },
    [authJson, themeJson] as const,
  );
}
