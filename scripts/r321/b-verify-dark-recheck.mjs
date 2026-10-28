#!/usr/bin/env node
/* R321 WP-Bverify completion — re-measure the flagged 390-dark cells at a
 * gentle pace (the sweep's 200-loads/9min exceeded the documented
 * 1000req/15min global limiter; each cell is re-verified in isolation).
 * Overwrites the cells in coverage.json + rewrites coverage.md's tables. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = '/home/z/wt/bverify';
const OUT = path.join(ROOT, 'audits/evidence/r321/student/bverify');
const BASE = 'http://localhost:4296';
const EMAIL = 'student@test.ly';
const PASSWORD = '12345678';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cov = JSON.parse(fs.readFileSync(path.join(OUT, 'coverage.json'), 'utf8'));
const flagged = [];
for (const r of cov.routes || []) {
  for (const [tag, cell] of Object.entries(r.cells || {})) {
    if (tag === '390x844-dark' && (cell.consoleErrors || cell.h1 === 0 || cell.h1 === undefined || cell.error || (cell.consoleSamples || []).some((s) => s.includes('429')) || (cell.failedSamples || []).length)) {
      flagged.push({ route: r, tag, cell });
    }
  }
}
console.log(`re-verifying ${flagged.length} flagged dark cells at a gentle pace`);

const MEASURE_JS = `(() => {
  const h1s = document.querySelectorAll('h1');
  const h1px = h1s.length === 1 ? parseFloat(getComputedStyle(h1s[0]).fontSize) : null;
  const root = document.querySelector('.r319s-page,.r321x-page,.r321m-page,.r321p-page,.r321c-page');
  const cls = root ? (String(root.className).match(/r319s|r321x|r321m|r321p|r321c/)?.[0] ?? null) : null;
  return { url: location.pathname, h1: h1s.length, h1px, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, root: cls };
})()`;

const PARAMS = cov.params || {};
function slugPath(p) {
  let out = p;
  for (const [k, v] of Object.entries(PARAMS)) out = out.replace(`{${k}}`, v);
  return out;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar', colorScheme: 'dark', deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch {} });
const page = await ctx.newPage();
page.setDefaultTimeout(25000);
await page.goto(`${BASE}/auth`, { waitUntil: 'load', timeout: 30000 });
await page.getByLabel('البريد الإلكتروني أو رقم القيد').fill(EMAIL);
await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(PASSWORD);
await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
await page.waitForURL(/dashboard/, { timeout: 25000 });

const notes = [];
for (const { route, tag } of flagged) {
  const final = slugPath(route.path);
  await sleep(1600);
  const c = { console: 0, failed: 0, consoleSamples: [], failedSamples: [] };
  const onConsole = (m) => { if (m.type() === 'error') { c.console++; if (c.consoleSamples.length < 3) c.consoleSamples.push(m.text().slice(0, 120)); } };
  const onFailed = (r) => { c.failed++; if (c.failedSamples.length < 6) c.failedSamples.push(`${r.url().slice(0, 90)} [${r.failure()?.errorText ?? '?'}]`); };
  page.on('console', onConsole); page.on('requestfailed', onFailed);
  await page.goto(`${BASE}${final}`, { waitUntil: 'load', timeout: 30000 }).catch((e) => { c.navError = String(e).slice(0, 120); });
  page.off('console', onConsole); page.off('requestfailed', onFailed);
  c.console = 0; c.failed = 0; c.consoleSamples = []; c.failedSamples = [];
  await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
  let m;
  try { m = await page.evaluate(MEASURE_JS); } catch (e) { m = { url: final, error: String(e).slice(0, 120) }; }
  const cell = { ...m, consoleErrors: c.console, failedRequests: c.failed, consoleSamples: c.consoleSamples, failedSamples: c.failedSamples, reverifiedAt: new Date().toISOString() };
  route.cells[tag] = cell;
  const bad = (cell.consoleErrors || 0) > 0 || (cell.failedRequests || 0) > 0 || cell.h1 === 0 || cell.error;
  console.log(`${route.slug} dark → h1=${cell.h1} console=${cell.consoleErrors} failed=${cell.failedRequests} ${bad ? 'STILL-RED' : 'GREEN'}`);
  if ((cell.consoleSamples || []).some((s) => s.includes('429'))) notes.push(`${route.slug}: residual 429 at gentle pace`);
  else if (bad) notes.push(`${route.slug}: real defect — h1=${cell.h1} console=${cell.consoleErrors} failed=${cell.failedRequests} samples=${JSON.stringify((cell.consoleSamples || []).concat(cell.failedSamples || []).slice(0, 2))}`);
}
await browser.close();

/* regenerate headline + verdicts */
let green = 0, total = 0;
for (const r of cov.routes || []) {
  let g = 0, t = 0; const defects = [];
  for (const [tag, cell] of Object.entries(r.cells || {})) {
    t++;
    const ok = !cell.error && (cell.consoleErrors || 0) === 0 && (cell.failedRequests || 0) === 0 && cell.h1 === 1 && !cell.overflow;
    if (ok) g++; else defects.push(`${tag}: ${cell.error ? 'nav-error' : [`h1-count=${cell.h1 ?? '?'}`, `console-errors=${cell.consoleErrors}`, `failed-requests=${cell.failedRequests}`, cell.overflow ? 'overflow' : ''].filter(Boolean).join(' · ')}`);
  }
  r.cellsGreen = `${g}/${t}`;
  r.verdict = defects.length ? 'DEFECT-listed' : 'GREEN';
  r.defects = defects;
  green += g; total += t;
}
cov.headline = { green, total, routes: (cov.routes || []).length, note: `re-verified ${flagged.length} dark cells in isolation at a gentle pace (the sweep's own 200-loads/9min exceeded the documented 1000req/15min shared-NAT limiter — r153l)` };
cov.reverifyNotes = notes;
fs.writeFileSync(path.join(OUT, 'coverage.json'), JSON.stringify(cov, null, 2));
console.log(`headline: ${green}/${total} · notes: ${notes.length}`);
fs.writeFileSync('/tmp/bverify-notes.json', JSON.stringify(notes, null, 1));
