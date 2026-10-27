#!/usr/bin/env node
/**
 * css-coverage-harness.mjs — WP-C0 §C-6 leg: Playwright CSS-usage
 * coverage over the WORKTREE's own production build (BUNDLE_REPORT
 * build → vite preview :4290, which proxies /api to the shared stack
 * :4000), so authenticated routes render with real seeded data.
 *
 * Method (the §C census ground rule: report only, zero src changes):
 *   · public routes: no auth.
 *   · authenticated routes: real UI login per role (student, teacher,
 *     registrar=admin) through the same field/target contract as
 *     scripts/r320/login-proof.ts (label fill + تسجيل الدخول), one
 *     browser context per role, sessionStorage intro-skip seeded.
 *   · every route: page.coverage.startCSSCoverage() before goto,
 *     settle, then flip <html data-theme> light→dark (both theme
 *     rule-sets apply within one page), settle, stopCSSCoverage.
 *   · all visited at 1440×900; landing + the three dashboards also at
 *     390×844 (the responsive rule sets).
 *   · used ranges are UNIONED per stylesheet URL across every page —
 *     a rule counts used if it applied on ANY visited route.
 *
 * Output: audits/evidence/r321/clean/raw/css-coverage-raw.json
 *   { meta, routes: [{url, title, w, h}], sheets: {url: {len, ranges: [[s,e]…]}} }
 * Ranges only — sheet TEXT is not copied (the dist CSS is rebuilt from
 * the same tree; offsets match dist at the recorded buildId).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audits', 'evidence', 'r321', 'clean', 'raw', 'css-coverage-raw.json');
const BASE = process.env.COVER_BASE || 'http://localhost:4290';

const PUBLIC = ['/', '/auth', '/about', '/help', '/contact', '/legal/privacy', '/legal/terms', '/vision', '/colleges', '/community'];
const ROLES = [
  { name: 'student', email: 'student@test.ly', routes: ['/student/dashboard', '/student/courses', '/student/library', '/student/alerts', '/student/training', '/student/mooc'] },
  { name: 'teacher', email: 'teacher@test.ly', routes: ['/teacher/dashboard', '/teacher/schedule', '/teacher/grades', '/teacher/students'] },
  { name: 'registrar', email: 'registrar@test.ly', routes: ['/admin/dashboard', '/admin/students', '/admin/faculties', '/admin/courses'] },
];
const NARROW = ['/', '/student/dashboard', '/teacher/dashboard', '/admin/dashboard'];

const sheets = new Map(); // cssUrl → { len, ranges: [[s,e]…] }
const routesSeen = [];

async function withCoverage(browser, { width, height }, url, themeFlip = true, doLogin = null) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'ar', colorScheme: 'light' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* ignore */ }
  });
  try {
    if (doLogin) {
      await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill(doLogin.email);
      await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('12345678');
      await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
      await page.waitForURL(/dashboard/, { timeout: 45_000 });
    }
    await page.coverage.startCSSCoverage();
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    } catch { /* coverage must still be stopped */ }
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    if (themeFlip) {
      await page.evaluate(() => {
        const html = document.documentElement;
        const cur = html.getAttribute('data-theme');
        html.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const html = document.documentElement;
        const cur = html.getAttribute('data-theme');
        html.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
      });
      await page.waitForTimeout(500);
    }
    const cov = await page.coverage.stopCSSCoverage();
    for (const entry of cov) {
      if (!entry.url.startsWith('http') || !entry.url.includes('/assets/')) continue;
      let s = sheets.get(entry.url);
      if (!s) { s = { len: entry.text.length, ranges: [] }; sheets.set(entry.url, s); }
      for (const r of entry.ranges) {
        const last = s.ranges[s.ranges.length - 1];
        if (last && r.start <= last[1]) {
          last[1] = Math.max(last[1], r.end);
        } else {
          s.ranges.push([r.start, r.end]);
        }
      }
      s.len = Math.max(s.len, entry.text.length);
    }
    routesSeen.push({ url, title: await page.title().catch(() => ''), w: width, h: height });
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
try {
  for (const r of PUBLIC) await withCoverage(browser, { width: 1440, height: 900 }, r);
  for (const role of ROLES) {
    const ctxRoutes = role.routes;
    for (const r of ctxRoutes) await withCoverage(browser, { width: 1440, height: 900 }, r, true, role);
  }
  for (const r of NARROW) {
    const owner = ROLES.find((x) => x.routes.includes(r));
    await withCoverage(browser, { width: 390, height: 844 }, r, true, owner || null);
  }
} finally {
  await browser.close();
}

mkdirSync(path.dirname(OUT), { recursive: true });
const payload = {
  meta: {
    base: BASE,
    collectedAt: new Date().toISOString(),
    note: 'Union of V8 CSS-coverage used ranges per dist stylesheet across all visited routes/roles/themes; a rule counts USED if its range intersects any used range. Sheet text is NOT stored — offsets match the dist build recorded in baseline.md.',
    publicRoutes: PUBLIC.length,
    authedRoutes: ROLES.reduce((n, r) => n + r.routes.length, 0),
    narrowRoutes: NARROW.length,
  },
  routes: routesSeen,
  sheets: Object.fromEntries([...sheets.entries()].map(([u, s]) => [u.split('/assets/')[1] || u, { len: s.len, ranges: s.ranges }])),
};
writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
console.log(`routes visited: ${routesSeen.length}; stylesheets with coverage: ${sheets.size} → ${path.relative(ROOT, OUT)}`);
