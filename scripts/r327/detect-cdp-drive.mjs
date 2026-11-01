#!/usr/bin/env node
/**
 * r327/detect-cdp-drive.mjs — the authenticated detector matrix (F · P7).
 *
 * Opens the key authenticated screens in a long-lived Chromium (DevTools
 * port 9222), authed via the REAL login API, parked on each screen so
 * `impeccable detect --cdp 9222 --target <url-fragment>` can scan each
 * page as shown (the detector's own URL mode cannot log in).
 *
 *   1. chrome --headless=new --remote-debugging-port=9222 (background)
 *   2. node scripts/r327/detect-cdp-drive.mjs   (opens the matrix)
 *   3. for each screen: impeccable detect --cdp 9222 --target <frag>
 *      (run by the orchestrator; this script only parks the pages)
 *
 * Ink theme (dark) — where contrast bugs live; P2.6 verified @1440-ink
 * on the same stack. Viewport 1280×800.
 */
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:4000';
const CDP = 'http://localhost:9222';

const MATRIX = [
  { role: 'student', email: 'student@test.ly', routes: ['/student/dashboard', '/student/courses', '/student/library', '/student/ai', '/student/results', '/student/profile'] },
  { role: 'teacher', email: 'teacher@test.ly', routes: ['/teacher/dashboard', '/teacher/exams', '/teacher/grading'] },
  { role: 'registrar', email: 'registrar@test.ly', routes: ['/admin/students'] },
  { role: 'owner', email: 'owner@test.ly', routes: ['/owner/system', '/owner/users', '/owner/feedback'] },
  { role: 'quality', email: 'quality@test.ly', routes: ['/quality/dashboard'] },
];

async function login(email) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.AUDIT_PASSWORD || '12345678' }),
  });
  if (!res.ok) throw new Error(`login ${email} ${res.status}`);
  const env = await res.json();
  return env?.data ?? env;
}

const browser = await chromium.connectOverCDP(CDP);
const ctx = browser.contexts()[0];

for (const { role, email, routes } of MATRIX) {
  let session;
  try { session = await login(email); } catch (e) { console.error(`✗ ${role}: ${e.message}`); continue; }
  console.log(`── ${role} (${session.user?.role ?? role})`);
  for (const route of routes) {
    try {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.addInitScript(([s]) => {
        try {
          sessionStorage.setItem('madarek-intro-skip', '1');
          localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: Date.now() }, version: 2 }));
          localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user: s.user, accessToken: s.accessToken }, version: 0 }));
        } catch { /* n/a */ }
      }, [session]);
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      const title = await page.title();
      console.log(`   parked ${route} — ${title.slice(0, 50)}`);
    } catch (e) {
      console.error(`   ✗ ${route}: ${e.message.slice(0, 90)}`);
    }
  }
}
console.log(`\n${ctx.pages().length} pages open — run the detector with --cdp 9222 --target <url-fragment>`);
process.exit(0);
