#!/usr/bin/env node
/** r321-c1 WP-B2 — the §B visual gate for the two converted pages.
 * ONE chromium context (390×844, ar, dsf 2, intro-skip): login as
 * student@test.ly at :4293/auth, then /student/map + /student/live —
 * per page: ONE h1 measured ≤32px, zero console errors, scrollWidth
 * ≤390, fullPage jpg q42 ≤150KB. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:4293';
const SHOTS = path.join(HERE, 'audits/evidence/r321/student');
fs.mkdirSync(SHOTS, { recursive: true });

const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const p = path.join(base, d, 'chrome-linux64/chrome');
    if (fs.existsSync(p)) return p;
  }
})();

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'ar',
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

/** console errors collected since the last fence. */
let errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill('student@test.ly');
await page.getByRole('textbox', { name: 'كلمة المرور' }).fill('12345678');
await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
await page.waitForURL(/student/, { timeout: 20_000 });
await page.waitForTimeout(1200);
console.log('login →', page.url());

const results = {};
for (const [key, route] of [['map', '/student/map'], ['live', '/student/live']]) {
  errors = [];
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const geo = await page.evaluate(() => {
    const h1s = [...document.querySelectorAll('h1')];
    const h1 = h1s[0] ?? null;
    const cs = h1 ? getComputedStyle(h1) : null;
    return {
      h1Count: h1s.length,
      h1FontPx: cs ? parseFloat(cs.fontSize) : -1,
      h1Text: h1 ? (h1.textContent || '').trim().slice(0, 40) : '',
      scrollWidth: document.documentElement.scrollWidth,
      bars: document.querySelectorAll('.r319s-bar').length,
      empties: document.querySelectorAll('.r319s-empty').length,
    };
  });
  const shot = path.join(SHOTS, `b2-${key}-390.jpg`);
  await page.screenshot({ path: shot, fullPage: true, type: 'jpeg', quality: 42 });
  const bytes = fs.statSync(shot).size;
  results[key] = { ...geo, consoleErrors: [...errors], shotKB: Math.round(bytes / 1024) };
  console.log(key, JSON.stringify(results[key]));
}

const fail = [];
for (const k of Object.keys(results)) {
  const r = results[k];
  if (r.h1Count !== 1) fail.push(`${k}: h1Count=${r.h1Count}`);
  if (!(r.h1FontPx > 0 && r.h1FontPx <= 32)) fail.push(`${k}: h1FontPx=${r.h1FontPx}`);
  if (r.scrollWidth > 390) fail.push(`${k}: scrollWidth=${r.scrollWidth}`);
  if (r.consoleErrors.length > 0) fail.push(`${k}: consoleErrors=${r.consoleErrors.length}`);
  if (r.shotKB > 150) fail.push(`${k}: shotKB=${r.shotKB}`);
}
console.log(fail.length === 0 ? 'B2 VISUAL GATES: ALL PASS' : `B2 FAIL: ${fail.join(' · ')}`);
await browser.close();
process.exit(fail.length === 0 ? 0 : 1);
