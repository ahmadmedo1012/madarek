/* R327 E5 (P2.4) — student/courses wedged-thread re-verification.
 *
 * The r325 route-dom-probe recorded student/courses as
 *   "probe-timeout: evaluate did not settle (Y7-class wedged main
 *    thread)" — the 20-s-raced inspectors() evaluate never returned.
 * The Y7 fix (e7301d94, /owner/system's bounded 30-s visible poll)
 * landed AFTER that capture; this probe re-tests the route on the
 * LIVE stack with the SAME contract plus the Y7-verification
 * instruments:
 *
 *   · the SAME inspectors() evaluate, SAME 6 s settle + fonts.ready,
 *     SAME 20 s race → does it settle now?
 *   · rAF frame count over a 3 s window + PerformanceObserver
 *     longtask count (the e7301d94 verification method: a settled
 *     main thread renders a bounded frame count and reports 0 long
 *     tasks; a wedged one spins or stalls)
 *   · screenshot duration (Y7's screenshot hung 260 s at the wedge)
 *
 * Output: audits/evidence/r327/p2p6/p2p4/student-courses-settle.json
 *         + student-courses-1440-paper.webp shot.
 *
 * USAGE
 *   node scripts/r327/student-courses-settle.mjs --base http://localhost:5173
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sessionForEmail, authStorageJson } from '../r325/capture-routes.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = (opt('base', 'http://localhost:5173')).replace(/\/+$/, '');
const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'audits/evidence/r327/p2p6/p2p4');
const EXE = path.join(process.env.HOME || '', '.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell');

/* the inspectors() body, verbatim contract from route-dom-probe.mjs */
function inspectors() {
  const W = window.innerWidth, H = window.innerHeight;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    return r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  };
  const txt = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const out = { skeleton: 0, errorText: [], jargon: [], fixedOverlaps: [] };
  const ERR_RE = /حدث خطأ|تعذر(?:ت)?|فشل(?:ت)? (?:في)?(?:التحميل|العملية|الرفع)|جلسة منتهية|غير متوفر حالياً|خطأ (?:في|غير)|Something went wrong|Failed to load|Error loading|Network Error/i;
  const RAW_RE = /\bundefined\b|\bNaN\b|\[object Object\]/;
  const JARGON_RE = /\bTODO\b|\bFIXME\b|\bXXX\b|lorem ipsum|localhost:\d+|debugger|\bconsole\.log\b|\bstack trace\b/i;
  const fixedEls = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const cls = String(el.className?.baseVal ?? el.className ?? '');
    const isSkeleton = el.matches('[class*="skeleton" i],[class*="shimmer" i],[class*="pulse" i],[data-skeleton],[aria-busy="true"]');
    if (isSkeleton) out.skeleton += (r.width * r.height) / (W * H);
    if ((s.position === 'fixed' || s.position === 'sticky') && r.width * r.height > 400) {
      fixedEls.push({ tag: el.tagName.toLowerCase(), cls: cls.slice(0, 40), r });
    }
    if (el.children.length === 0) {
      const t = txt(el);
      if (!t) continue;
      if (RAW_RE.test(t)) out.errorText.push(`raw: ${t.slice(0, 90)}`);
      else if (ERR_RE.test(t)) out.errorText.push(`${t.slice(0, 90)}`);
      else if (JARGON_RE.test(t)) out.jargon.push(`${t.slice(0, 90)}`);
    }
  }
  for (let i = 0; i < fixedEls.length; i += 1) {
    for (let j = i + 1; j < fixedEls.length; j += 1) {
      const a = fixedEls[i].r, b = fixedEls[j].r;
      const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const inter = ox * oy;
      const smaller = Math.min(a.width * a.height, b.width * b.height);
      if (inter / smaller > 0.3 && smaller > 2000) {
        const A = fixedEls[i], B = fixedEls[j];
        const label = (e) => `${e.tag}.${e.cls.split(' ').slice(0, 2).join('.')}`;
        const pair = `${label(A)} × ${label(B)}`;
        if (!out.fixedOverlaps.includes(pair)) out.fixedOverlaps.push(pair);
      }
    }
  }
  return out;
}

/* the rAF + longtask instrument (the e7301d94 Y7 verification method) */
function settleInstrument() {
  return new Promise((resolve) => {
    let frames = 0;
    let longTasks = 0;
    const t0 = performance.now();
    const po = new PerformanceObserver((list) => { longTasks += list.getEntries().length; });
    try { po.observe({ entryTypes: ['longtask'] }); } catch { /* longtask unsupported */ }
    const tick = () => { frames += 1; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setTimeout(() => {
      po.disconnect();
      resolve({ rafFrames3s: frames, longTasks, ms: Math.round(performance.now() - t0) });
    }, 3100);
  });
}

function toWebp(pngFile) {
  const webpFile = pngFile.replace(/\.png$/, '.webp');
  const r = spawnSync('python3', ['-c',
    'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],"WEBP",quality=90,method=4)',
    pngFile, webpFile], { timeout: 30_000 });
  if (r.status === 0 && fs.existsSync(webpFile) && fs.statSync(webpFile).size > 0) { fs.unlinkSync(pngFile); return webpFile; }
  return pngFile;
}

const session = await sessionForEmail('student@test.ly');
const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ar', colorScheme: 'light', serviceWorkers: 'block' });
await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { } });
await ctx.addInitScript(() => {
  try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'light', modeUpdatedAt: 1 }, version: 2 })); } catch { }
});
await ctx.addInitScript(({ auth }) => { try { localStorage.setItem('mdrk-auth', auth); } catch { } }, { auth: authStorageJson(session) });
const page = await ctx.newPage();

const report = { route: 'student/courses', path: '/student/courses', attempts: [] };
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const a = { attempt };
  const t0 = Date.now();
  try {
    await page.goto(BASE + '/student/courses', { waitUntil: 'load', timeout: 30_000 });
    a.gotoMs = Date.now() - t0;
    await page.waitForTimeout(6000).catch(() => { });
    await page.evaluate(() => document.fonts?.ready?.catch?.(() => { })).catch(() => { });
    /* the settle instrument FIRST — if the thread is wedged this hangs too */
    a.settle = await Promise.race([
      page.evaluate(settleInstrument).catch(() => null),
      new Promise((r) => setTimeout(() => r(null), 10_000)),
    ]);
    /* the original probe contract: inspectors() raced at 20 s */
    const t1 = Date.now();
    const res = await Promise.race([
      page.evaluate(inspectors).catch(() => null),
      new Promise((r) => setTimeout(() => r(null), 20_000)),
    ]);
    a.inspectorsMs = Date.now() - t1;
    a.inspectors = res;
    a.verdict = res ? 'settled' : 'probe-timeout (still wedged)';
    /* the Y7 hang signature: screenshot duration */
    const t2 = Date.now();
    const png = path.join(OUT, `student-courses-1440-paper-a${attempt}.png`);
    await page.screenshot({ path: png, type: 'png', timeout: 15_000, animations: 'disabled' });
    a.shotMs = Date.now() - t2;
    a.shot = toWebp(png);
  } catch (e) {
    a.error = String(e?.message ?? e).slice(0, 300);
    a.verdict = 'goto-error';
  }
  report.attempts.push(a);
  process.stdout.write(`  attempt ${attempt}: ${a.verdict} inspectors=${a.inspectorsMs ?? '—'}ms shot=${a.shotMs ?? '—'}ms settle=${JSON.stringify(a.settle) ?? '—'}\n`);
}

await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))]);
fs.mkdirSync(OUT, { recursive: true });
const out = path.join(OUT, 'student-courses-settle.json');
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, ...report }, null, 1));
console.log(`→ ${out}`);
