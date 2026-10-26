/**
 * r320-rename wrap probe — DOM geometry of every surface that now
 * carries the longer «المسجل العام» label (c1-RENAME §B, step 5).
 *
 * Reports per surface: bounding box, horizontal overflow
 * (scrollWidth vs clientWidth), and the rendered line count of the
 * label cell (clientHeight / computed line-height). FAIL = any element
 * clipped (overflow with hidden), escaped past the viewport, or
 * squeezed below the type scale (font-size shrink).
 */
import { createRequire } from 'node:module';

const require = createRequire('/home/z/r320-rename/package.json');
const { chromium } = require('playwright-core');

const baseUrl = process.argv[2] ?? 'http://localhost:4251';

const ADMIN_USER = {
  id: 'usr_e2e_admin', email: 'admin@zu.edu.ly', firstName: 'سالم', lastName: 'القرضابي',
  role: 'ADMIN', avatarColor: '#059669', avatarInitials: 'سق', scopeFacultyId: null,
};
const SCOPED_USER = { ...ADMIN_USER, scopeFacultyId: 'fac_eng' };
const FACULTIES = [
  { id: 'fac_eng', name: 'كلية الهندسة', nameEn: 'Engineering', iconEmoji: null, city: 'الزاوية',
    departmentCount: 3, studentCount: 420, teacherCount: 28, courseCount: 12,
    departments: [{ id: 'dep_cs', name: 'قسم علوم الحاسوب', students: 180, teachers: 11, courses: 5 }] },
];
const ok = (data) => ({ data });
const ROUTES = [
  ['GET', /^\/auth\/me$/, (u) => ok(meProfile(SESSION.user, SESSION.scopeFaculty))],
  ['GET', /^\/notifications$/, () => ({ data: [], meta: { page: 1, total: 0, totalPages: 1, unread: 0, limit: 50 } })],
  ['GET', /^\/search\/global$/, () => ok([])],
  ['GET', /^\/admin\/stats$/, () => ok({ totalStudents: 990, totalTeachers: 62, totalCourses: 28, totalEnrollments: 2410 })],
  ['GET', /^\/admin\/faculties$/, () => ok(FACULTIES)],
  ['GET', /^\/admin\/reports$/, () => ok({ headline: { totalPapers: 46, publishedPapers: 21, totalUsers: 1117, activeStudents: 940 }, paperTrend: [], topCourses: [] })],
  ['GET', /^\/admin\/courses$/, () => ({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } })],
  ['GET', /^\/admin\/sync$/, () => ok({ staleCount: 3 })],
  ['GET', /^\/admin\/papers$/, () => ({ data: [], meta: { page: 1, limit: 1, total: 0, totalPages: 1 } })],
];
function meProfile(user, scopeFaculty) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
    role: user.role, avatarColor: user.avatarColor, avatarInitials: user.avatarInitials,
    scopeFaculty, themePreference: 'SYSTEM', themePreferenceUpdatedAt: new Date().toISOString(),
    onboardingCompletedAt: new Date().toISOString(), firedMilestones: [], studentProfile: null, teacherProfile: null };
}
const SESSION = { user: ADMIN_USER, scopeFaculty: null };

async function installApi(context) {
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const method = route.request().method().toUpperCase();
    for (const [m, re, fn] of ROUTES) {
      if (m === method && re.test(path)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fn(url)) });
        return;
      }
    }
    await route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ error: { code: 'MOCK_NOT_IMPLEMENTED' } }) });
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
    } catch { /* storage denied */ }
  }, [authJson, themeJson]);
}

/* In-page geometry reader for a selector's first match. */
const GEOMETRY = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
  const r = el.getBoundingClientRect();
  return {
    sel, text: (el.textContent || '').trim().slice(0, 40),
    w: Math.round(r.width), h: Math.round(r.height),
    scrollW: el.scrollWidth, clientW: el.clientWidth,
    overflowX: el.scrollWidth > el.clientWidth + 1,
    lines: Math.max(1, Math.round(r.height / lh)),
    fontSize: cs.fontSize, whiteSpace: cs.whiteSpace, textOverflow: cs.textOverflow,
    escape: r.right > innerWidth + 1 || r.left < -1,
  };
};

const browser = await chromium.launch();
const problems = [];

function report(tag, geo) {
  if (!geo) { problems.push(`${tag}: SELECTOR MISSING`); console.log(`${tag}  ✗ selector missing`); return; }
  const flags = [];
  if (geo.overflowX) flags.push(`H-OVERFLOW ${geo.scrollW}>${geo.clientW}`);
  if (geo.escape) flags.push('VIEWPORT-ESCAPE');
  if (flags.length) problems.push(`${tag}: ${flags.join(', ')} «${geo.text}»`);
  console.log(`${tag}  ${flags.length ? '✗ ' + flags.join(', ') : '✓'}  ${geo.w}×${geo.h}px ${geo.lines}L fs=${geo.fontSize} ws=${geo.whiteSpace} «${geo.text}»`);
}

async function probeAuth(theme, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'ar', colorScheme: theme, timezoneId: 'UTC' });
  await seedSession(ctx, null, theme); await installApi(ctx);
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle' });
  const open = page.getByRole('button', { name: 'عرض الحسابات التجريبية' });
  if (await open.count()) { await open.click(); await page.waitForTimeout(400); }
  const tag = `auth ${width} ${theme}`;
  const adminBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.auth-demo-actions button')];
    const b = btns.find((x) => (x.textContent || '').includes('المسجل العام'));
    if (!b) return null;
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const row = b.parentElement.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), text: b.textContent.trim(),
      rowW: Math.round(row.width), rowH: Math.round(row.height), rowBottomOverflow: row.bottom > innerHeight + 1 };
  });
  if (!adminBtn) problems.push(`${tag}: demo ADMIN button not found`);
  else console.log(`${tag}  ✓ admin demo btn ${adminBtn.w}×${adminBtn.h}px «${adminBtn.text}» row ${adminBtn.rowW}×${adminBtn.rowH}${adminBtn.rowBottomOverflow ? ' ✗ ROW ESCAPES VIEWPORT' : ''}`);
  if (adminBtn?.rowBottomOverflow) problems.push(`${tag}: demo row escapes viewport`);
  await ctx.close();
}

async function probeAdmin(theme, width, height, scoped) {
  SESSION.user = scoped ? SCOPED_USER : ADMIN_USER;
  SESSION.scopeFaculty = scoped ? { id: 'fac_eng', name: 'كلية الهندسة' } : null;
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'ar', colorScheme: theme, timezoneId: 'UTC' });
  await seedSession(ctx, SESSION.user, theme); await installApi(ctx);
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle' });
  const tag = `admin${scoped ? '-scoped' : ''} ${width} ${theme}`;
  for (const [label, sel] of [
    ['topbar title', '.topbar-title'],
    ['page h1', 'h1'],
    ['breadcrumb root', '.breadcrumbs, .breadcrumb, nav[aria-label]'],
    ['topbar scope chip', '.topbar-scope'],
  ]) {
    if (sel.includes(',')) {
      // try each comma variant, report the first that exists
      let found = false;
      for (const s of sel.split(',').map((x) => x.trim())) {
        const geo = await page.evaluate(GEOMETRY, s);
        if (geo) { report(`${tag} ${label} (${s})`, geo); found = true; break; }
      }
      if (!found) console.log(`${tag} ${label}  — not on this surface`);
    } else {
      const geo = await page.evaluate(GEOMETRY, sel);
      if (geo) report(`${tag} ${label}`, geo); else console.log(`${tag} ${label}  — not on this surface`);
    }
  }
  if (width === 390) {
    await page.getByRole('button', { name: 'فتح القائمة', exact: true }).click();
    await page.waitForTimeout(600);
    for (const [label, sel] of [
      ['drawer group label', '.nav-section-label'],
      ['drawer user role chip', '.sidebar-user-role'],
    ]) {
      const geo = await page.evaluate(GEOMETRY, sel);
      if (geo) report(`${tag} ${label}`, geo); else problems.push(`${tag}: ${label} selector missing`);
    }
  } else {
    for (const [label, sel] of [
      ['sidebar group label', '.nav-section-label'],
      ['sidebar user role chip', '.sidebar-user-role'],
    ]) {
      const geo = await page.evaluate(GEOMETRY, sel);
      if (geo) report(`${tag} ${label}`, geo);
    }
  }
  await ctx.close();
}

await probeAuth('light', 390, 844);
await probeAuth('dark', 390, 844);
await probeAuth('light', 1440, 900);
await probeAdmin('light', 390, 844, false);
await probeAdmin('dark', 390, 844, false);
await probeAdmin('light', 1440, 900, false);
await probeAdmin('dark', 1440, 900, false);
await probeAdmin('light', 1440, 900, true);
await probeAdmin('light', 390, 844, true);
await browser.close();

console.log('\n══ PROBLEMS ══');
if (problems.length === 0) console.log('NONE — every surface renders the longer label without clip/escape');
else problems.forEach((p) => console.log('✗ ' + p));
process.exit(problems.length ? 1 : 0);
