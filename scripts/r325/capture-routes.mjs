/* P2.4 phase 1 — capture EVERY authenticated route for the role matrix,
 * at 1440/768/390 × Paper(light)/Ink(dark), on the REAL stack.
 *
 * WHAT IT DOES
 * ────────────
 *   · real login sessions (POST /auth/login) cached to disk — the
 *     r325 flows/fixtures/live.ts sessionForRole pattern, reimplemented
 *     here in plain .mjs so `node` can run it directly (AUTH_RATE is
 *     10 logins / 15 min / IP and skipSuccessfulRequests keeps honest
 *     logins free — the cache exists so re-runs never re-login).
 *   · for every (role, route): goto → 2.5 s settle + document.fonts.ready
 *     → viewport screenshot (NOT fullPage) at the top scroll position;
 *     long pages ALSO get a mid-scroll shot (1440 only — the reading
 *     breakpoint where P2.6 ink-parity islands matter most).
 *   · themes via the `madarek-theme` zustand-persist seed
 *     ({state:{mode,modeUpdatedAt:1},version:2}) — modeUpdatedAt=1 is
 *     non-zero so the local choice wins the useThemeProfileSync
 *     tiebreak against the profile's themePreference.
 *   · console capture per route: pageerror + console.error into the
 *     manifest (known noise filtered — see NOISE below).
 *   · overflow probe: scrollWidth vs innerWidth at 390.
 *   · 403 surfaces per role (a route the role lacks — the guard
 *     bounces to ROLE_HOME with the denied-role toast), the login page
 *     and /__design.
 *
 * MANIFEST / RESUME
 * ─────────────────
 *   audits/evidence/r325/routes/manifest.json — one entry per
 *   (role, route, bp, theme, shot-kind): {status: done|error|skipped,
 *   file, ms, consoleErrors[], overflow}. Re-runs SKIP entries whose
 *   file exists and whose status is done. Filters:
 *     --only role/route-slug   (repeatable, comma list ok)
 *     --bps 1440,390
 *     --themes paper,ink
 *     --format png|webp        (default webp — PNG master converted to
 *                               webp q90 via system python3+PIL right
 *                               after the shot; 'png' keeps the lossless
 *                               master, used for DEFECT re-captures)
 *     --force                  (ignore resume, recapture)
 *     --parallel N             (pages within a role, default 2)
 *
 * USAGE
 * ─────
 *   node scripts/r325/capture-routes.mjs                    # full sweep
 *   node scripts/r325/capture-routes.mjs --only student/dashboard --bps 1440
 *   node scripts/r325/capture-routes.mjs --format png --only owner/system
 *
 * The frontend dev server (main checkout) serves the CURRENT merged
 * state — this worktree hosts only the harness + evidence.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

/* ── CLI ─────────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes('--' + k);

const BASE = (opt('base', 'http://localhost:5173')).replace(/\/+$/, '');
const API = (opt('api', 'http://localhost:4000')).replace(/\/+$/, '');
const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.resolve(ROOT, 'audits/evidence/r325/routes');
const MANIFEST = path.join(OUT, 'manifest.json');
const BPS = (opt('bps', '1440,768,390')).split(',').map((s) => s.trim()).filter(Boolean);
const THEMES = (opt('themes', 'paper,ink')).split(',').map((s) => s.trim()).filter(Boolean);
const FORMAT = opt('format', 'webp');
const PARALLEL = Math.max(1, parseInt(opt('parallel', '2'), 10) || 2);
/* --gap MS — minimum spacing between capture STARTS across all workers.
 * The backend's global limiter is 1000 req/15min/IP (rateLimit.ts
 * GLOBAL_RATE); a page fires ~5-8 API calls, so an unthrottled sweep
 * exhausts the bucket mid-run and every later capture degrades into
 * 429 error toasts (seen live on student 390-ink). --gap 7000 ≈ 8.5
 * pages/min ≈ 60-70 req/min ≈ 70% of the bucket — honest pages, no
 * mid-run cliff. 0 (default) = unthrottled. */
const GAP = Math.max(0, parseInt(opt('gap', '0'), 10) || 0);
let lastGlobalStart = 0; // global capture-start gate (see GAP)
const FORCE = flag('force');
const ONLY = []; // repeatable + comma list, parsed below
{
  let i = 0;
  while (i < args.length) {
    if (args[i] === '--only') { ONLY.push(...(args[i + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)); i += 2; continue; }
    i += 1;
  }
}
const onlyMatch = (role, slug) => ONLY.length === 0 || ONLY.some((s) => {
  const [r, rt] = s.split('/');
  return (!rt && r === role) || (rt && r === role && rt === slug);
});

const EXE = path.join(process.env.HOME || '', '.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell');

const VP_SIZES = {
  1440: { width: 1440, height: 900 },
  768: { width: 768, height: 1024 },
  390: { width: 390, height: 844 },
};
const THEME_MODE = { paper: 'light', ink: 'dark' };

/* ── known console noise (never defects) ─────────────────────────── */
const NOISE = [
  /contrast-axe/i,             // the contrast gate's own axe sweep logs
  /insufficient color contrast/i, // axe's "Fix any of the following:" scan output
  /Fix any of the following:/i,
  /pdf.*(telemetry|worker)/i,  // pdf.js telemetry warning
  /pdf\.js|pdfjs/i,            // pdf worker engine chatter
  /\[vite\]/i,                 // dev-server overlay chatter
  /React DevTools/i,           // the devtools suggestion
  /Download the React DevTools/i,
  /third-party cookie/i,
  /Autofocus processing/i,
  /lib_png|WebP author/i,
];

/* ── sessions (live.ts sessionForRole pattern, .mjs edition) ─────── */

const SESSION_TTL_MS = 10 * 60 * 1000; // access token lives 15 min — cache 10
const sessionMemory = new Map();
const sessionFile = () => path.join(os.tmpdir(), `madarek-capture-sessions-${new Date().toISOString().slice(0, 10)}.json`);

function readSessionDisk() {
  try { return JSON.parse(fs.readFileSync(sessionFile(), 'utf8')); } catch { return {}; }
}

/** REAL POST /auth/login — throws loudly (the stack must be UP). */
async function login(email, password) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`login failed ${email}: HTTP ${res.status} ${body.slice(0, 160)}`);
  }
  const { data } = await res.json();
  if (!data?.accessToken) throw new Error(`login returned no session for ${email}`);
  return data;
}

/** Session for an @test.ly EMAIL (cached memory + tmpfile, TTL 10 min). */
export async function sessionForEmail(email) {
  const memo = sessionMemory.get(email);
  if (memo) return memo;
  const disk = readSessionDisk()[email];
  if (disk && Date.now() - disk.at < SESSION_TTL_MS) {
    sessionMemory.set(email, disk.session);
    return disk.session;
  }
  const session = await login(email, '12345678');
  sessionMemory.set(email, session);
  const all = readSessionDisk();
  all[email] = { at: Date.now(), session };
  try { fs.writeFileSync(sessionFile(), JSON.stringify(all), { mode: 0o600 }); } catch { /* best-effort */ }
  return session;
}

/* ── role → account email (shared/testAccounts.ts table, flat here —
 *    .mjs can't import the TS table; values are the documented table's) */
const ROLE_EMAIL = {
  student: 'student@test.ly',
  student2: 'student2@test.ly',
  teacher: 'teacher@test.ly',
  head: 'head@test.ly',
  dean: 'dean@test.ly',
  vicedean: 'vicedean@test.ly',
  registrar: 'registrar@test.ly', // المسجل العام — the ADMIN seat
  faculty: 'faculty@test.ly',     // ADMIN scoped to one faculty
  quality: 'quality@test.ly',
  owner: 'owner@test.ly',
};

/* ── dynamic-ID resolvers (SETUP-only GETs, live.ts apiGet pattern) ── */

async function apiGet(email, p) {
  const s = await sessionForEmail(email);
  const res = await fetch(`${API}/api/v1${p}`, {
    headers: { authorization: `Bearer ${s.accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`GET ${p} → ${res.status}`);
  return (await res.json())?.data;
}

const RESOLVERS = {
  // student course detail + lecture player (first enrollment's offering)
  offeringId: async () => {
    const rows = await apiGet(ROLE_EMAIL.student, '/enrollments/me');
    return rows?.[0]?.offering?.id ?? null;
  },
  lectureId: async () => {
    const rows = await apiGet(ROLE_EMAIL.student, '/enrollments/me');
    const offeringId = rows?.[0]?.offering?.id;
    if (!offeringId) return null;
    const lectures = await apiGet(ROLE_EMAIL.student, `/offerings/${offeringId}/lectures`);
    return lectures?.[0]?.id ?? null;
  },
  // student online-exam detail (first exam)
  studentExamId: async () => {
    const rows = await apiGet(ROLE_EMAIL.student, '/exams/me');
    return rows?.[0]?.id ?? null;
  },
  // teacher exam template detail + intelligence offering
  templateId: async () => {
    const rows = await apiGet(ROLE_EMAIL.teacher, '/exams/templates');
    return rows?.[0]?.id ?? null;
  },
  teacherOfferingId: async () => {
    const rows = await apiGet(ROLE_EMAIL.teacher, '/offerings');
    return rows?.[0]?.id ?? null;
  },
  // registrar permissions detail (first user)
  adminUserId: async () => {
    const rows = await apiGet(ROLE_EMAIL.registrar, '/admin/users');
    return rows?.[0]?.id ?? null;
  },
  // owner institution detail (demo university slug)
  ownerInstitutionSlug: async () => {
    const rows = await apiGet(ROLE_EMAIL.owner, '/owner/institutions');
    return rows?.[0]?.slug ?? null;
  },
  // public-ish catalogs under the student session
  trainingSlug: async () => {
    const rows = await apiGet(ROLE_EMAIL.student, '/training/catalog');
    return rows?.[0]?.slug ?? null;
  },
  // first lesson of the first track (the /training/:slug/lesson/:lessonId mount)
  trainingLessonId: async () => {
    const rows = await apiGet(ROLE_EMAIL.student, '/training/catalog');
    const slug = rows?.[0]?.slug;
    if (!slug) return null;
    const track = await apiGet(ROLE_EMAIL.student, `/training/tracks/${slug}`);
    return track?.lessons?.[0]?.id ?? null;
  },
  // /document/:filename — needs a papers-namespace fileUrl; the seeded
  // /me/materials carry url:'#' or RFC-2606 hosts and /research/me/papers
  // is empty for the seeded student, so NO real seeded file exists →
  // resolver nulls → the manifest records skipped/no-id (honest gap).
  documentFilename: async () => {
    const rows = await apiGet(ROLE_EMAIL.student, '/me/materials');
    const hit = (rows ?? []).find((r) => typeof r?.url === 'string' && r.url.includes('/files/'));
    return hit ? hit.url.split('/').pop() : null;
  },
  competitionId: async () => {
    const rows = await apiGet(ROLE_EMAIL.student, '/competitions');
    return rows?.[0]?.id ?? null;
  },
  collegeId: async () => {
    const rows = await fetch(`${API}/api/v1/colleges`).then((r) => r.json()).catch(() => null);
    return rows?.data?.[0]?.id ?? null;
  },
};

/** Resolve one route's :params — returns a concrete path or null. */
async function resolveRoute(route) {
  if (!route.resolve) return route.path;
  const out = {};
  for (const [k, resolverName] of Object.entries(route.resolve)) {
    const fn = RESOLVERS[resolverName];
    if (!fn) return null;
    out[k] = await fn();
    if (!out[k]) return null;
  }
  let p = route.path;
  for (const [k, v] of Object.entries(out)) p = p.replace(`:${k}`, v);
  return p;
}

/* ── THE ROUTE TABLE (from frontend/src/App.tsx — the real mounts;
 *    redirect-only rows (/student/exams → /student/online-exams etc.)
 *    are not captured — their TARGETS are) ────────────────────────── */

const SHARED_AUTHED = [
  { path: '/settings', slug: 'settings' },
  { path: '/vision', slug: 'vision' },
  { path: '/vision/ai-predictor', slug: 'vision-detail' }, // static VISION_CONCEPTS[0]
];

const ROLE_ROUTES = {
  student: [
    { path: '/student/dashboard', slug: 'dashboard' },
    { path: '/student/calendar', slug: 'calendar' },
    { path: '/student/courses', slug: 'courses' },
    // r180-F4 — the institution catalogue (discovery surface)
    { path: '/student/catalog', slug: 'catalog' },
    { path: '/student/courses/:offeringId', slug: 'course-detail', resolve: { offeringId: 'offeringId' } },
    { path: '/student/lectures/:lectureId', slug: 'lecture-player', resolve: { lectureId: 'lectureId' } },
    { path: '/student/schedule', slug: 'schedule' },
    { path: '/student/results', slug: 'results' },
    { path: '/student/matrix', slug: 'matrix' },
    { path: '/student/online-exams', slug: 'online-exams' },
    { path: '/student/online-exams/:id', slug: 'exam-detail', resolve: { id: 'studentExamId' } },
    { path: '/student/library', slug: 'library' },
    { path: '/student/research', slug: 'research' },
    { path: '/student/ai', slug: 'ai' },
    { path: '/student/labs', slug: 'labs' },
    { path: '/student/ar', slug: 'ar' },
    { path: '/student/live', slug: 'live' },
    { path: '/training', slug: 'training' },
    { path: '/training/:slug', slug: 'training-track', resolve: { slug: 'trainingSlug' } },
    { path: '/training/:slug/lesson/:lessonId', slug: 'training-lesson', resolve: { slug: 'trainingSlug', lessonId: 'trainingLessonId' } },
    { path: '/achievements', slug: 'achievements' },
    { path: '/student/mooc', slug: 'mooc' },
    { path: '/student/jobs', slug: 'jobs' },
    { path: '/student/gamification', slug: 'gamification' },
    { path: '/student/skills', slug: 'skills' },
    { path: '/student/alerts', slug: 'alerts' },
    { path: '/student/messages', slug: 'messages' },
    { path: '/student/social', slug: 'social' },
    { path: '/student/downloads', slug: 'downloads' },
    { path: '/student/university', slug: 'university' },
    { path: '/student/payment', slug: 'payment' },
    { path: '/student/map', slug: 'map' },
    { path: '/student/webinars', slug: 'webinars' },
    { path: '/student/profile', slug: 'profile' },
    { path: '/community', slug: 'community' },
    { path: '/competitions', slug: 'competitions' },
    { path: '/competitions/:id', slug: 'competition-detail', resolve: { id: 'competitionId' } },
    { path: '/colleges', slug: 'colleges' },
    { path: '/colleges/leaderboard', slug: 'colleges-leaderboard' },
    { path: '/colleges/:id', slug: 'college-detail', resolve: { id: 'collegeId' } },
    ...SHARED_AUTHED,
    // any-authed: the /document viewer (no seeded file resolves — the
    // resolver nulls and the manifest records the honest skip)
    { path: '/document/:filename', slug: 'document-viewer', resolve: { filename: 'documentFilename' } },
    { path: '/owner/users', slug: 'forbidden-owner-users' }, // the 403 surface
  ],

  teacher: [
    { path: '/teacher/dashboard', slug: 'dashboard' },
    { path: '/teacher/schedule', slug: 'schedule' },
    { path: '/teacher/attendance', slug: 'attendance' },
    { path: '/teacher/grades', slug: 'grades' },
    { path: '/teacher/materials', slug: 'materials' },
    { path: '/teacher/research', slug: 'research' },
    { path: '/teacher/students', slug: 'students' },
    { path: '/teacher/performance', slug: 'performance' },
    { path: '/teacher/assignments', slug: 'assignments' },
    { path: '/teacher/exams', slug: 'exams' },
    { path: '/teacher/exams/:templateId', slug: 'exam-template-detail', resolve: { templateId: 'templateId' } },
    { path: '/teacher/messages', slug: 'messages' },
    { path: '/teacher/ai', slug: 'ai' },
    { path: '/teacher/library', slug: 'library' },
    { path: '/teacher/alerts', slug: 'alerts' },
    { path: '/teacher/intelligence', slug: 'intelligence' },
    { path: '/teacher/intelligence/:offeringId', slug: 'intelligence-offering', resolve: { offeringId: 'teacherOfferingId' } },
    { path: '/teacher/profile', slug: 'profile' },
    { path: '/teacher/live', slug: 'live' },
    { path: '/teacher/labs', slug: 'labs' },
    { path: '/teacher/community', slug: 'community' },
    { path: '/student/labs', slug: 'labs-preview' }, // the documented STUDENT+TEACHER widened mount
    ...SHARED_AUTHED,
    { path: '/admin/students', slug: 'forbidden-admin-students' },
  ],

  registrar: [ // ADMIN — «المسجل العام»
    { path: '/admin/dashboard', slug: 'dashboard' },
    { path: '/admin/students', slug: 'students' },
    { path: '/admin/teachers', slug: 'teachers' },
    { path: '/admin/permissions/:id', slug: 'permissions-detail', resolve: { id: 'adminUserId' } },
    { path: '/admin/sync', slug: 'sync' },
    { path: '/admin/faculties', slug: 'faculties' },
    { path: '/admin/courses', slug: 'courses' },
    { path: '/admin/analysis', slug: 'analysis' },
    { path: '/admin/digital', slug: 'digital' },
    { path: '/admin/reports', slug: 'reports' },
    { path: '/admin/settings', slug: 'settings' },
    { path: '/admin/alerts', slug: 'alerts' },
    { path: '/admin/community', slug: 'community' },
    ...SHARED_AUTHED,
    { path: '/owner/users', slug: 'forbidden-owner-users' },
  ],

  quality: [
    { path: '/quality/dashboard', slug: 'dashboard' },
    { path: '/quality/courses', slug: 'courses' },
    { path: '/quality/professors', slug: 'professors' },
    { path: '/quality/engagement', slug: 'engagement' },
    { path: '/quality/reports', slug: 'reports' },
    { path: '/quality/curriculum', slug: 'curriculum' },
    { path: '/quality/notifications', slug: 'notifications' },
    { path: '/quality/alerts', slug: 'alerts' },
    { path: '/quality/exam-moderation', slug: 'exam-moderation' },
    { path: '/quality/community', slug: 'community' },
    ...SHARED_AUTHED,
    { path: '/owner/users', slug: 'forbidden-owner-users' },
  ],

  owner: [
    { path: '/owner/dashboard', slug: 'dashboard' },
    { path: '/owner/users', slug: 'users' },
    { path: '/owner/institutions', slug: 'institutions' },
    { path: '/owner/institutions/:slug', slug: 'institution-detail', resolve: { slug: 'ownerInstitutionSlug' } },
    { path: '/owner/activity', slug: 'activity' },
    { path: '/owner/content', slug: 'content' },
    { path: '/owner/system', slug: 'system' }, // Y7 — main thread never settles; hard timeouts below
    { path: '/owner/education', slug: 'education' },
    { path: '/owner/realtime', slug: 'realtime' },
    { path: '/owner/ai', slug: 'ai' },
    { path: '/owner/notifications', slug: 'notifications' },
    { path: '/owner/alerts', slug: 'alerts' },
    { path: '/owner/governance', slug: 'governance' },
    { path: '/owner/feedback', slug: 'feedback' },
    ...SHARED_AUTHED,
    { path: '/admin/students', slug: 'forbidden-admin-students' },
  ],

  // the academic positions ride the TEACHER shell — dashboards + the
  // position-heavy surfaces, per the task («their dashboards at least»)
  head: [
    { path: '/teacher/dashboard', slug: 'dashboard' },
    { path: '/teacher/profile', slug: 'profile' },
  ],
  dean: [
    { path: '/teacher/dashboard', slug: 'dashboard' },
    { path: '/teacher/profile', slug: 'profile' },
  ],
  vicedean: [
    { path: '/teacher/dashboard', slug: 'dashboard' },
    { path: '/teacher/profile', slug: 'profile' },
  ],
  // the scoped registrar rides the ADMIN shell
  faculty: [
    { path: '/admin/dashboard', slug: 'dashboard' },
    { path: '/admin/students', slug: 'students' },
    { path: '/admin/faculties', slug: 'faculties' },
  ],

  // guest surfaces (no session) — the public funnel sheets
  guest: [
    { path: '/auth', slug: 'auth' },
    { path: '/auth/register', slug: 'register' },
    { path: '/auth/forgot-password', slug: 'forgot-password' },
    { path: '/campus', slug: 'campus' },
    { path: '/capabilities', slug: 'capabilities' },
    { path: '/about', slug: 'about' },
    { path: '/help', slug: 'help' },
    { path: '/contact', slug: 'contact' },
    { path: '/legal/privacy', slug: 'legal-privacy' },
    { path: '/legal/terms', slug: 'legal-terms' },
    { path: '/legal/cookies', slug: 'legal-cookies' },
    { path: '/legal/data', slug: 'legal-data' },
    { path: '/legal/security', slug: 'legal-security' },
    { path: '/legal/accessibility', slug: 'legal-accessibility' },
    // reset-password without a token — the surface must degrade honestly
    { path: '/auth/reset-password', slug: 'reset-password' },
  ],
  system: [
    { path: '/__design', slug: 'design' },
    { path: '/__brand', slug: 'brand' },
    { path: '/404', slug: '404' },
    { path: '/403', slug: '403' },
    { path: '/500', slug: '500' },
    { path: '/maintenance', slug: 'maintenance' },
  ],
};

const ROLE_ORDER = ['student', 'teacher', 'registrar', 'quality', 'owner', 'head', 'dean', 'vicedean', 'faculty', 'guest', 'system'];

/* ── manifest ────────────────────────────────────────────────────── */

function loadManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return { generatedAt: null, captures: {} }; }
}
const manifest = loadManifest();
let manifestDirty = false;
function persistManifest() {
  manifest.generatedAt = new Date().toISOString();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  manifestDirty = false;
}
const capKey = (role, slug, bp, theme, kind) => `${role}/${slug}@${bp}-${theme}${kind === 'mid' ? '-mid' : ''}`;
function isDone(key) {
  const e = manifest.captures[key];
  return !FORCE && e?.status === 'done' && e.file && fs.existsSync(e.file);
}

/* ── console capture + noise filter ──────────────────────────────── */

function attachConsole(page, sink) {
  page.on('pageerror', (e) => sink.push(String(e?.message ?? e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return; // warns excluded (the pdf telemetry warn is a warn)
    const t = m.text?.() ?? '';
    if (NOISE.some((re) => re.test(t))) return;
    sink.push(t.slice(0, 300));
  });
}

/* ── the capture core ───────────────────────────────────────────── */

const SHOT_EXT = FORMAT === 'png' ? 'png' : 'webp';
const slugDir = (role) => path.join(OUT, role);

/** PNG master → webp q90 in place (python3+PIL; absent → keep PNG).
 * Playwright's screenshot API has no webp type (png|jpeg only) and the
 * bundled ffmpeg demuxes no PNG stills — verified — so the conversion
 * is this post-step. Returns the file actually on disk. */
function toWebp(pngFile) {
  const webpFile = pngFile.replace(/\.png$/, '.webp');
  const r = spawnSync('python3', ['-c',
    `import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],'WEBP',quality=90,method=4)`,
    pngFile, webpFile], { timeout: 30_000 });
  if (r.status === 0 && fs.existsSync(webpFile) && fs.statSync(webpFile).size > 0) {
    fs.unlinkSync(pngFile);
    return webpFile;
  }
  return pngFile;
}

async function captureOne(page, { role, route, bp, theme }) {
  const t0 = Date.now();
  const out = { status: 'done', consoleErrors: [], overflow: null, resolvedPath: route.__resolved };
  try {
    await page.setViewportSize(VP_SIZES[bp]);
    await page.goto(BASE + route.__resolved, { waitUntil: 'load', timeout: 30_000, ignoreHTTPSErrors: true });
    // settle: fixed 2.5 s (dev-server chunk latency) + fonts (both bounded —
    // fonts.ready on a wedged renderer never settles otherwise)
    await page.waitForTimeout(2500).catch(() => {});
    await page.evaluate(() => document.fonts?.ready?.catch?.(() => {})).catch(() => {});
    await page.waitForTimeout(300);

    // overflow probe (viewport shots, so scrollWidth vs innerWidth is the honest test)
    out.overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return { scrollW: de.scrollWidth, innerW: window.innerWidth, scrollH: de.scrollHeight, innerH: window.innerHeight };
    }).catch(() => null);

    // top shot — consistent scroll position (top)
    const topFile = path.join(slugDir(role), `${route.slug}-${bp}-${theme}.png`);
    await page.screenshot({ path: topFile, type: 'png', timeout: 15_000, animations: 'disabled' });
    out.file = FORMAT === 'png' ? topFile : toWebp(topFile);

    // mid-scroll shot for long pages at the reading breakpoint (1440)
    if (bp === '1440' && out.overflow && out.overflow.scrollH > out.overflow.innerH * 1.6) {
      out.long = true;
      await page.evaluate(() => {
        const de = document.documentElement;
        window.scrollTo({ top: (de.scrollHeight - window.innerHeight) / 2, behavior: 'instant' });
      }).catch(() => {});
      await page.waitForTimeout(350);
      const midFile = path.join(slugDir(role), `${route.slug}-${bp}-${theme}-mid.png`);
      await page.screenshot({ path: midFile, type: 'png', timeout: 15_000, animations: 'disabled' }).catch(() => {});
      out.midFile = FORMAT === 'png' ? midFile : toWebp(midFile);
    }
  } catch (e) {
    out.status = /Timeout .*exceeded|timed out/i.test(String(e)) && route.slug === 'system' ? 'timeout' : 'error';
    out.error = String(e?.message ?? e).slice(0, 300);
    // salvage a shot if the page painted anything
    try {
      const f = path.join(slugDir(role), `${route.slug}-${bp}-${theme}.png`);
      await page.screenshot({ path: f, type: 'png', timeout: 8000, animations: 'disabled' });
      out.file = FORMAT === 'png' ? f : toWebp(f);
      out.status = 'partial';
    } catch { /* nothing to salvage */ }
  }
  out.ms = Date.now() - t0;
  return out;
}

/** Capture with a HARD watchdog — a wedged renderer (Y7's /owner/system
 * is the known case) must cost the sweep ≤60 s, never the whole run.
 * Returns {res, wedged} — wedged pages are CLOSED by the caller (a
 * renderer that hung once will hang the next evaluate too). */
async function captureGuarded(page, spec) {
  let timer = null;
  const watchdog = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ status: 'timeout', error: `watchdog: capture exceeded ${spec.route.__resolved}`, ms: 60_000 }), 60_000);
  });
  const res = await Promise.race([captureOne(page, spec).catch((e) => ({ status: 'error', error: String(e?.message ?? e).slice(0, 300), ms: 0 })), watchdog]);
  clearTimeout(timer);
  return { res, wedged: res.status === 'timeout' };
}

/* ── per-role sweep: ONE context per (bp, theme), pages inside ───── */

async function sweepRole(browser, role) {
  const email = ROLE_EMAIL[role];
  const routes = [];
  for (const route of ROLE_ROUTES[role]) {
    if (!onlyMatch(role, route.slug)) continue;
    const resolved = await resolveRoute(route).catch(() => null);
    if (!resolved) {
      for (const bp of BPS) for (const theme of THEMES) {
        const k = capKey(role, route.slug, bp, theme, 'top');
        manifest.captures[k] = { status: 'skipped', reason: 'no-id', route: route.path };
      }
      manifestDirty = true;
      continue;
    }
    routes.push({ ...route, __resolved: resolved });
  }
  if (routes.length === 0) return 0;

  // pages for parallelism — one context per (bp,theme), N pages inside
  let done = 0;
  for (const bp of BPS) {
    for (const theme of THEMES) {
      // skip whole (bp,theme) block if every capture already done
      if (routes.every((r) => isDone(capKey(role, r.slug, bp, theme, 'top')))) continue;
      const ctx = await browser.newContext({
        viewport: VP_SIZES[bp],
        deviceScaleFactor: 1,
        locale: 'ar',
        // Ink via colorScheme too (system-mode users) — the seed above pins explicit modes
        colorScheme: theme === 'ink' ? 'dark' : 'light',
        serviceWorkers: 'block',
      });
      await ctx.addInitScript(() => {
        try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* the intro may replay */ }
      });
      // theme seed — modeUpdatedAt:1 (non-zero) beats the profile's
      // themePreference in the useThemeProfileSync tiebreak, so Ink/Paper
      // is pinned regardless of the account's server-side preference.
      await ctx.addInitScript(({ mode }) => {
        try {
          localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode, modeUpdatedAt: 1 }, version: 2 }));
        } catch { /* private mode */ }
      }, { mode: THEME_MODE[theme] ?? theme });
      if (email) {
        const session = await sessionForEmail(email);
        await ctx.addInitScript(({ auth }) => {
          try { localStorage.setItem('mdrk-auth', auth); } catch { /* ignore */ }
        }, { auth: authStorageJson(session) });
      }
      const pages = [];
      for (let i = 0; i < Math.min(PARALLEL, routes.length); i += 1) {
        const page = await ctx.newPage();
        attachConsole(page, page.__errors = []);
        pages.push(page);
      }
      // simple worker pool over routes
      let idx = 0;
      async function worker(page) {
        for (;;) {
          const route = routes[idx];
          idx += 1;
          if (!route) break;
          const kTop = capKey(role, route.slug, bp, theme, 'top');
          const kMid = capKey(role, route.slug, bp, theme, 'mid');
          const prev = manifest.captures[kTop];
          if (!FORCE && prev?.status === 'done' && prev.file && fs.existsSync(prev.file)
            && (bp !== '1440' || prev.long !== true || (prev.midFile && fs.existsSync(prev.midFile)))) continue;
          if (GAP > 0) {
            // GLOBAL start-to-start gate (module scope): with N workers
            // a per-worker gap would let N pages start together and
            // multiply the request rate N× — the budget is per-IP.
            // The slot is RESERVED before sleeping (two workers that
            // wake on the same tick would otherwise start together).
            const now = Date.now();
            const slot = Math.max(now, lastGlobalStart + GAP);
            lastGlobalStart = slot;
            if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
          }
          page.__errors.length = 0;
          const { res, wedged } = await captureGuarded(page, { role, route, bp, theme });
          res.consoleErrors = (page.__errors ?? []).slice(0, 8);
          manifest.captures[kTop] = res;
          if (res.midFile) manifest.captures[kMid] = { status: 'done', file: res.midFile };
          manifestDirty = true;
          persistManifest(); // per-capture — a killed run never loses evidence
          done += 1;
          const mark = res.status === 'done' ? '·' : res.status[0]?.toUpperCase() ?? '?';
          const ovf = res.overflow && res.overflow.scrollW > res.overflow.innerW ? ' OVERFLOW' : '';
          process.stdout.write(`  [${role}] ${route.slug} ${bp} ${theme} ${mark} ${res.ms}ms${res.consoleErrors.length ? ` E:${res.consoleErrors.length}` : ''}${ovf}\n`);
          if (wedged) {
            // the renderer hung — replace the page or this worker wedges forever
            try { await page.close(); } catch { /* already gone */ }
            page = await ctx.newPage();
            attachConsole(page, page.__errors = []);
          }
        }
      }
      await Promise.all(pages.map(worker));
      await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 8000))]);
      if (manifestDirty) persistManifest();
    }
  }
  return done;
}

/* ── zustand persist value (live.ts authStorageJson shape) ──────── */
function authStorageJson(session) {
  const { user, accessToken } = session;
  return JSON.stringify({
    state: {
      user,
      accessToken,
      memberships: user.memberships ?? [],
      currentInstitution: user.currentInstitution ?? null,
      membershipRole: user.membershipRole ?? null,
    },
    version: 1,
  });
}

/* ── main (only when invoked DIRECTLY — route-dom-probe.mjs imports
 *    sessionForEmail/ROLE_EMAIL/RESOLVERS/ROLE_ROUTES from here and
 *    must not trigger a sweep) ───────────────────────────────────── */

export { ROLE_EMAIL, ROLE_ROUTES, apiGet, RESOLVERS, resolveRoute, authStorageJson, BASE, API };

const IS_MAIN = process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href;

if (IS_MAIN) await main();

async function main() {
console.log(`capture-routes: base=${BASE} api=${API} bps=${BPS.join(',')} themes=${THEMES.join(',')} format=${SHOT_EXT} parallel=${PARALLEL}${GAP ? ` gap=${GAP}ms` : ''}${FORCE ? ' FORCE' : ''}${ONLY.length ? ` only=[${ONLY.join(',')}]` : ''}`);
fs.mkdirSync(OUT, { recursive: true });
for (const role of ROLE_ORDER) fs.mkdirSync(slugDir(role), { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
const t0 = Date.now();
let total = 0;
try {
  for (const role of ROLE_ORDER) {
    if (ONLY.length && !ONLY.some((s) => s.split('/')[0] === role)) continue;
    const n = await sweepRole(browser, role);
    total += n;
    console.log(`[${role}] +${n}`);
  }
} finally {
  persistManifest();
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
}
const counts = Object.values(manifest.captures).reduce((acc, e) => { acc[e.status] = (acc[e.status] ?? 0) + 1; return acc; }, {});
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s — new captures this run: ${total}; manifest totals:`, JSON.stringify(counts), `→ ${MANIFEST}`);
} // — main
