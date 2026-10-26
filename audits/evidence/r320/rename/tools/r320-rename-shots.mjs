/**
 * r320-rename BEFORE/AFTER capture — the wrap-check surfaces for the
 * «الإدارة» → «المسجل العام» rename (c1-RENAME §B).
 *
 * Surfaces: auth demo role buttons, admin dashboard (sidebar group
 * label + user role chip + topbar title + page h1) at 390/1440 ×
 * light/dark, the 390 drawer, and the scoped-admin topbar chip.
 *
 * Hermetic: every /api/v1/** call is fulfilled by the embedded route
 * table below (the e2e mock-transport pattern — same envelopes, same
 * storage seeds), so no backend/database is needed.
 *
 * Usage: node r320-rename-shots.mjs <before|after> [baseUrl]
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire('/home/z/r320-rename/package.json');
const { chromium } = require('playwright-core');

const phase = process.argv[2] ?? 'before';
const outDir = `/home/z/r320-rename/audits/evidence/r320/rename/${phase}`;
const baseUrl = process.argv[3] ?? 'http://localhost:4251';
mkdirSync(outDir, { recursive: true });

/* ── fixture payloads (mirroring tests/e2e/fixtures/api-fixtures.ts) ── */

const ADMIN_USER = {
  id: 'usr_e2e_admin',
  email: 'admin@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'القرضابي',
  role: 'ADMIN',
  avatarColor: '#059669',
  avatarInitials: 'سق',
  scopeFacultyId: null,
};

function meProfile(user, scopeFaculty = null) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarColor: user.avatarColor,
    avatarInitials: user.avatarInitials,
    scopeFaculty,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: new Date(Date.now() - 90 * 864e5).toISOString(),
    onboardingCompletedAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    firedMilestones: [],
    studentProfile: null,
    teacherProfile: null,
  };
}

const FACULTIES = [
  { id: 'fac_eng', name: 'كلية الهندسة', nameEn: 'Engineering', iconEmoji: null, city: 'الزاوية',
    departmentCount: 3, studentCount: 420, teacherCount: 28, courseCount: 12,
    departments: [
      { id: 'dep_cs', name: 'قسم علوم الحاسوب', students: 180, teachers: 11, courses: 5 },
      { id: 'dep_civil', name: 'قسم الهندسة المدنية', students: 140, teachers: 9, courses: 4 },
      { id: 'dep_elec', name: 'قسم الهندسة الكهربائية', students: 100, teachers: 8, courses: 3 },
    ] },
  { id: 'fac_sci', name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: null, city: 'الزاوية',
    departmentCount: 2, studentCount: 310, teacherCount: 19, courseCount: 9,
    departments: [
      { id: 'dep_math', name: 'قسم الرياضيات', students: 170, teachers: 10, courses: 5 },
      { id: 'dep_bio', name: 'قسم الأحياء', students: 140, teachers: 9, courses: 4 },
    ] },
  { id: 'fac_arts', name: 'كلية الآداب', nameEn: 'Arts', iconEmoji: null, city: 'الزاوية',
    departmentCount: 2, studentCount: 260, teacherCount: 15, courseCount: 7,
    departments: [
      { id: 'dep_ar', name: 'قسم اللغة العربية', students: 140, teachers: 8, courses: 4 },
      { id: 'dep_hist', name: 'قسم التاريخ', students: 120, teachers: 7, courses: 3 },
    ] },
];

const ok = (data) => ({ data: data });

const ROUTES = [
  ['GET', /^\/auth\/me$/, () => ok(meProfile(SESSION.user, SESSION.scopeFaculty))],
  ['GET', /^\/notifications$/, () => ({ data: [], meta: { page: 1, total: 0, totalPages: 1, unread: 0, limit: 50 } })],
  ['GET', /^\/search\/global$/, () => ok([])],
  ['GET', /^\/admin\/stats$/, () => ok({ totalStudents: 990, totalTeachers: 62, totalCourses: 28, totalEnrollments: 2410 })],
  ['GET', /^\/admin\/faculties$/, () => ok(FACULTIES)],
  ['GET', /^\/admin\/reports$/, () => ok({
    headline: { totalPapers: 46, publishedPapers: 21, totalUsers: 1117, activeStudents: 940 },
    paperTrend: [
      { month: '2026-01', submitted: 12, graded: 9, published: 4 },
      { month: '2026-02', submitted: 15, graded: 12, published: 6 },
      { month: '2026-03', submitted: 11, graded: 8, published: 5 },
    ],
    topCourses: [
      { code: 'CS201', name: 'هندسة البرمجيات', enrollments: 84, lectures: 14 },
      { code: 'CS101', name: 'مقدمة البرمجة', enrollments: 132, lectures: 18 },
      { code: 'MA102', name: 'التفاضل والتكامل', enrollments: 96, lectures: 16 },
    ],
  })],
  ['GET', /^\/admin\/courses$/, () => ({ data: [
    { id: 'c1', code: 'CS201', name: 'هندسة البرمجيات', credits: 3, themeColor: null, faculty: 'كلية الهندسة',
      facultyEmoji: null, department: 'قسم علوم الحاسوب', departmentId: 'dep_cs', offeringCount: 2,
      conceptCount: 24, totalEnrollments: 84, totalLectures: 14, totalMaterials: 9,
      recentOfferings: [{ id: 'o1', term: '2026-الربيع', enrollments: 48, lectures: 7, teacher: 'د. سالم البوسيفي' }] },
    { id: 'c2', code: 'CS101', name: 'مقدمة البرمجة', credits: 3, themeColor: null, faculty: 'كلية الهندسة',
      facultyEmoji: null, department: 'قسم علوم الحاسوب', departmentId: 'dep_cs', offeringCount: 1,
      conceptCount: 18, totalEnrollments: 132, totalLectures: 18, totalMaterials: 12,
      recentOfferings: [{ id: 'o2', term: '2026-الربيع', enrollments: 132, lectures: 18, teacher: 'د. سالم البوسيفي' }] },
  ], meta: { page: 1, limit: 100, total: 2, totalPages: 1 } })],
  ['GET', /^\/admin\/sync$/, () => ok({ staleCount: 3 })],
  ['GET', /^\/admin\/papers$/, () => ({ data: [], meta: { page: 1, limit: 1, total: 0, totalPages: 1 } })],
];

const SESSION = { user: ADMIN_USER, scopeFaculty: null };

async function installApi(context) {
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const method = route.request().method().toUpperCase();
    for (const [m, re, fn] of ROUTES) {
      if (m === method && re.test(path)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fn(url)),
        });
        return;
      }
    }
    console.error(`[shots] no fixture for ${method} ${path} — 501`);
    await route.fulfill({
      status: 501,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'MOCK_NOT_IMPLEMENTED', message: `no fixture for ${method} ${path}` } }),
    });
  });
}

async function seedSession(context, user, theme) {
  const authJson = JSON.stringify({ state: { user, accessToken: 'e2e-token-admin' }, version: 0 });
  const themeJson = theme ? JSON.stringify({ state: { mode: theme, modeUpdatedAt: 0 }, version: 2 }) : null;
  await context.addInitScript(([auth, th]) => {
    try {
      sessionStorage.setItem('madarek-intro-skip', '1');
      if (localStorage.getItem('mdrk-auth') === null && auth) localStorage.setItem('mdrk-auth', auth);
      if (localStorage.getItem('madarek-theme') === null && th) localStorage.setItem('madarek-theme', th);
      try {
        Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get: () => 8 });
      } catch { /* engine truth */ }
    } catch { /* storage denied */ }
  }, [authJson, themeJson]);
}

async function shot(page, name) {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/${phase}-${name}.png` });
  console.log(`[shots] ${phase}-${name}.png`);
}

const browser = await chromium.launch();

async function authSurface() {
  for (const [theme, width, height] of [['light', 390, 844], ['dark', 390, 844], ['light', 1440, 900]]) {
    const context = await browser.newContext({
      viewport: { width, height }, locale: 'ar', colorScheme: theme, timezoneId: 'UTC',
    });
    await seedSession(context, null, theme);
    await installApi(context);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle' });
    // Open the demo-accounts panel (dev-only surface carrying the role buttons).
    const open = page.getByRole('button', { name: 'عرض الحسابات التجريبية' });
    if (await open.count()) {
      await open.click();
      await page.waitForTimeout(400);
    }
    const actions = page.locator('.auth-demo-actions');
    if (await actions.count()) {
      await actions.screenshot({ path: `${outDir}/${phase}-auth-demo-buttons-${width}-${theme}.png` });
      console.log(`[shots] ${phase}-auth-demo-buttons-${width}-${theme}.png`);
    }
    await shot(page, `auth-${width}-${theme}`);
    await context.close();
  }
}

async function adminSurface() {
  for (const [theme, width, height] of [
    ['light', 390, 844], ['dark', 390, 844], ['light', 1440, 900], ['dark', 1440, 900],
  ]) {
    SESSION.user = ADMIN_USER;
    SESSION.scopeFaculty = null;
    const context = await browser.newContext({
      viewport: { width, height }, locale: 'ar', colorScheme: theme, timezoneId: 'UTC',
    });
    await seedSession(context, ADMIN_USER, theme);
    await installApi(context);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle' });
    await shot(page, `admin-dashboard-${width}-${theme}`);
    if (width === 390) {
      // Open the drawer — the sidebar group label + user role chip.
      await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
      await page.waitForTimeout(600);
      await shot(page, `admin-drawer-${width}-${theme}`);
    }
    await context.close();
  }
}

async function scopedAdminSurface() {
  for (const [theme, width, height] of [['light', 1440, 900], ['light', 390, 844], ['dark', 390, 844]]) {
    SESSION.user = { ...ADMIN_USER, scopeFacultyId: 'fac_eng' };
    SESSION.scopeFaculty = { id: 'fac_eng', name: 'كلية الهندسة' };
    const context = await browser.newContext({
      viewport: { width, height }, locale: 'ar', colorScheme: theme, timezoneId: 'UTC',
    });
    await seedSession(context, SESSION.user, theme);
    await installApi(context);
    const page = await context.newPage();
    await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle' });
    await shot(page, `admin-scoped-${width}-${theme}`);
    await context.close();
  }
  SESSION.user = ADMIN_USER;
  SESSION.scopeFaculty = null;
}

await authSurface();
await adminSurface();
await scopedAdminSurface();
await browser.close();
console.log(`[shots] ${phase} capture complete → ${outDir}`);
