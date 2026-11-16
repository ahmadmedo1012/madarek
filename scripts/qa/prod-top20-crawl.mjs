#!/usr/bin/env node
/**
 * r357 L7 — the top-20 REAL-app crawl against production.
 *
 * Logs in the documented @test.ly seats through the REAL auth API,
 * seeds the same localStorage substrate the SPA persists, then walks
 * the 20 headline routes across the four roles on the LIVE origin
 * (default: the R357 canonical https://madarek-app.vercel.app).
 * Per page it records:
 *   · every /api/ call that answered ≥ 400 (path + status)
 *   · every console error (page errors + console.error)
 *   · visible Arabic error states («تعذّر» surfaces)
 * and captures ONE contact-sheet row (≤ 6 screenshots total, the
 * brief's cap) for the headline pages.
 *
 * Zero findings = the crawl's pass bar. Output: JSON transcript at
 * --out (default /tmp/prod-top20.json) + a compact stdout table.
 *
 * Usage:
 *   node scripts/qa/prod-top20-crawl.mjs [--base https://madarek-app.vercel.app] \
 *     [--out /tmp/prod-top20.json] [--shots /tmp/prod-top20-shots]
 *   (run from the repo root; uses frontend's installed playwright)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('../../node_modules/playwright/index.js');

const BASE = (process.argv.find((a, i) => a === '--base' && process.argv[i + 1]) && process.argv[process.argv.indexOf('--base') + 1]) || 'https://madarek-app.vercel.app';
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/prod-top20.json';
const SHOTS = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : '/tmp/prod-top20-shots';
const PASSWORD = '12345678'; // the documented test-account password (seed.ts)

/* The top-20: the headline routes per role (public + one per seat family). */
const PLAN = [
  { role: 'guest', path: '/', name: 'landing' },
  { role: 'guest', path: '/auth/login', name: 'login' },
  { role: 'guest', path: '/colleges', name: 'colleges' },
  { role: 'STUDENT', email: 'student@test.ly', path: '/student/dashboard', name: 'student-dashboard' },
  { role: 'STUDENT', email: 'student@test.ly', path: '/student/courses', name: 'student-courses' },
  { role: 'STUDENT', email: 'student@test.ly', path: '/student/exams', name: 'student-exams' },
  { role: 'STUDENT', email: 'student@test.ly', path: '/student/ai', name: 'student-ai' },
  { role: 'STUDENT', email: 'student@test.ly', path: '/training', name: 'training-catalog' },
  { role: 'TEACHER', email: 'teacher@test.ly', path: '/teacher/dashboard', name: 'teacher-dashboard' },
  { role: 'TEACHER', email: 'teacher@test.ly', path: '/teacher/attendance', name: 'teacher-attendance' },
  { role: 'TEACHER', email: 'teacher@test.ly', path: '/teacher/grades', name: 'teacher-grades' },
  { role: 'ADMIN', email: 'registrar@test.ly', path: '/admin/dashboard', name: 'admin-dashboard' },
  { role: 'ADMIN', email: 'registrar@test.ly', path: '/admin/people', name: 'admin-people' },
  { role: 'ADMIN', email: 'registrar@test.ly', path: '/admin/faculties', name: 'admin-faculties' },
  { role: 'ADMIN', email: 'registrar@test.ly', path: '/admin/reports', name: 'admin-reports' },
  { role: 'ADMIN', email: 'registrar@test.ly', path: '/admin/mail', name: 'admin-mail' },
  { role: 'ADMIN', email: 'registrar@test.ly', path: '/search', name: 'search' },
  { role: 'QUALITY', email: 'quality@test.ly', path: '/quality/dashboard', name: 'quality-dashboard' },
  { role: 'QUALITY', email: 'exams@test.ly', path: '/quality/exam-moderation', name: 'quality-moderation' },
  { role: 'OWNER', email: 'owner@test.ly', path: '/owner/users', name: 'owner-users' },
];
const SHOT_SET = new Set(['landing', 'student-dashboard', 'teacher-dashboard', 'admin-dashboard', 'quality-moderation', 'admin-people']);

async function login(email) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${email} → ${res.status}`);
  const d = await res.json();
  return d.data;
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const tokens = {};
  const results = [];
  let shots = 0;

  for (const stop of PLAN) {
    const entry = { role: stop.role, path: stop.path, name: stop.name, apiErrors: [], consoleErrors: [], errorStates: 0, shot: null };
    try {
      if (stop.email && !tokens[stop.email]) {
        const session = await login(stop.email);
        tokens[stop.email] = session;
      }
      const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'ar-LY', timezoneId: 'Africa/Tripoli' });
      if (stop.email) {
        const session = tokens[stop.email];
        await context.addInitScript(([u, t]) => {
          try { localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user: u, accessToken: t }, version: 0 })); } catch { /* ignore */ }
        }, [session.user, session.accessToken]);
      }
      const page = await context.newPage();
      page.on('response', (res) => {
        if (res.url().includes('/api/') && res.status() >= 400) {
          entry.apiErrors.push({ path: new URL(res.url()).pathname, status: res.status() });
        }
      });
      page.on('pageerror', (err) => entry.consoleErrors.push(String(err).slice(0, 160)));
      page.on('console', (msg) => {
        if (msg.type() === 'error') entry.consoleErrors.push(msg.text().slice(0, 160));
      });
      await page.goto(`${BASE}${stop.path}`, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => {});
      await page.waitForTimeout(1800); // the entrance loader + first paint
      // The honest error-state probe: Arabic failure surfaces visible.
      entry.errorStates = await page.getByText(/تعذّر الوصول|خطأ غير متوقّع|فشل تحميل/).count().catch(() => 0);
      if (SHOT_SET.has(stop.name) && shots < 6) {
        const file = `${SHOTS}/${stop.name}.png`;
        await page.screenshot({ path: file }).catch(() => {});
        if (file) { entry.shot = file; shots += 1; }
      }
      await context.close();
    } catch (err) {
      entry.consoleErrors.push(`CRAWL: ${String(err).slice(0, 160)}`);
    }
    results.push(entry);
    const flag = entry.apiErrors.length + entry.consoleErrors.length + entry.errorStates === 0 ? '✓' : '✗';
    console.log(`${flag} ${stop.role.padEnd(7)} ${stop.path.padEnd(26)} api≥400:${entry.apiErrors.length} console:${entry.consoleErrors.length} errStates:${entry.errorStates}`);
  }
  await browser.close();

  const findings = results.filter((r) => r.apiErrors.length + r.consoleErrors.length + r.errorStates > 0);
  writeFileSync(OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), results, findings }, null, 2));
  console.log(`\n${findings.length === 0 ? 'ZERO findings — the top-20 crawl is green' : `${findings.length} page(s) with findings:`}`);
  for (const f of findings) {
    console.log(`  ${f.path}: api=${JSON.stringify(f.apiErrors)} console=${f.consoleErrors.slice(0, 2).join(' | ')} errStates=${f.errorStates}`);
  }
  console.log(`→ ${OUT} (${shots} contact-sheet shots in ${SHOTS})`);
  process.exit(findings.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error('CRAWL FAILED:', e.message); process.exit(1); });
