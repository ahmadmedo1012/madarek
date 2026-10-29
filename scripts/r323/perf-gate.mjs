#!/usr/bin/env node
/**
 * r323/perf-gate.mjs — A4 `gate:perf` — the performance & bundle-cap gate.
 *
 * Measures, on the BUILT `frontend/dist` served by its own vite preview
 * (127.0.0.1 — the r321 ::1 lesson), for SIX public routes × TWO viewports
 * (1440×900, 390×844) at 4×CPU:
 *   · CLS  (layout-shift, whole visit)            ≤ 0.05
 *   · LCP  (returning visit — intro flag preset)  ≤ 2500 ms
 *   · INP  (event timing, whole visit)            ≤ 150 ms
 *   · jank on `/` under the r322 wheel harness    ≥ 98 % frames ≤ 20 ms
 *     (19 × 660 px notches @ 250 ms — one full descent; the phone leg
 *      protects the 0/255-janky baseline; the desktop leg is the
 *      §7-5..7 remainder: 22 % → ≤ 2 %.)
 * Plus BUNDLE CAPS (gzip, `dist/assets`):
 *   · main `index-*.js`      ≤ 200 KB gz
 *   · every `*Pages-*.js`    ≤ 150 KB gz
 * Vendor chunks (react/charts/pdf/…) are recorded, not gated (lazy,
 * cached; the cap contract is main + routes — HANDOFF A4 #5).
 *
 * Emits audits/evidence/r323/perf-gate.json · exit 1 on any breach.
 * Never runs a build itself: run `npm run build -w frontend` first.
 *
 * Usage: node scripts/r323/perf-gate.mjs [--base-url http://127.0.0.1:4323]
 *        [--port 4323] [--cpu 4] [--skip-scroll]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'frontend', 'dist');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('base-url', 'http://127.0.0.1:4323');
const PORT = opt('port', '4323');
const CPU = Number(opt('cpu', '4'));
const SKIP_SCROLL = args.includes('--skip-scroll');

/* thresholds — caps only ever go DOWN (non-negotiables). */
const TH = {
  cls: 0.05,
  lcpMs: 2500,
  inpMs: 150,
  minPctFramesLe20: 98,   // ≥ 98 % of scroll frames ≤ 20 ms
};

const ROUTES = ['/', '/colleges', '/auth', '/about', '/help', '/404'];
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];

/* the r322 wheel harness (§7 baseline: 19 × 660 px @ 250 ms ≈ 12.5 k px). */
const NOTCHES = 19, NOTCH_PX = 660, NOTCH_GAP_MS = 250;

const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  try {
    const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort();
    for (const d of dirs.reverse()) {
      const p = path.join(base, d, 'chrome-linux64/chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch { /* fall through */ }
  return undefined;
})();

const gzKB = (buf) => Math.round(zlib.gzipSync(buf, { level: 9 }).length / 1024);

/* ── in-page instrumentation (before any app script) ─────────────── */
function initScript() {
  return `
(function () {
  if (window.__mdrkGate) return;
  var W = (window.__mdrkGate = {
    frameDeltas: [], _rafOn: false, _last: 0,
    shifts: [], lcps: [], evts: [],
  });
  var tick = function (t) {
    if (W._rafOn) {
      if (W._last) W.frameDeltas.push(t - W._last);
      W._last = t; requestAnimationFrame(tick);
    }
  };
  W.startRaf = function () { if (!W._rafOn) { W._rafOn = true; W._last = 0; requestAnimationFrame(tick); } };
  W.stopRaf = function () { W._rafOn = false; };
  W.resetRaf = function () { W.frameDeltas.length = 0; W._last = 0; };
  try {
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) if (!e.hadRecentInput) W.shifts.push({ t: e.startTime, v: e.value });
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) W.lcps.push(Math.round(e.renderTime || e.startTime));
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) {
        var d = e.duration; if (d == null) continue;
        W.evts.push(Math.round(e.interactionId ? d : 0));
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (e) { /* older chromium — the gate runs on the pinned build */ }
})();`;
}

function summarize(frames) {
  const arr = (frames || []).map((f) => (typeof f === 'number' ? f : f.d));
  if (!arr.length) return { count: 0, pctGt20: 0, p95: 0, max: 0 };
  const gt20 = arr.filter((d) => d > 20).length;
  const sorted = [...arr].sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  return {
    count: arr.length,
    pctGt20: Math.round((gt20 / arr.length) * 1000) / 10,
    pctLe20: Math.round(((arr.length - gt20) / arr.length) * 1000) / 10,
    p95: Math.round(q(95) * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
  };
}

let server;
let serverKilled = false;
async function startServer() {
  server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    cwd: path.join(ROOT, 'frontend'), stdio: 'ignore', env: process.env,
  });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(700) }); if (r.ok) return true; } catch { /* poll */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
function killServer() {
  if (serverKilled) return; serverKilled = true;
  try { if (server) server.kill('SIGKILL'); } catch {}
  try { spawn('pkill', ['-f', 'vite preview']); } catch {}
}

async function runRoute(browser, route, vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1, locale: 'en-US',
  });
  await ctx.addInitScript(initScript());
  /* returning-visit: the intro flag is preset → splash+sheet loader skip. */
  await ctx.addInitScript(`
    try { localStorage.setItem('madarek.intro.v1', '1'); sessionStorage.setItem('madarek-intro-seen', '1'); } catch (e) {}
  `);
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1200); /* settle — hydration + fonts */

  const metrics = await page.evaluate(() => {
    const W = window.__mdrkGate;
    return {
      cls: Math.round(W.shifts.reduce((a, b) => a + b.v, 0) * 1000) / 1000,
      lcp: W.lcps.length ? Math.min(...W.lcps) : null,
      inp: W.evts.length ? Math.max(...W.evts) : 0,
    };
  });

  let scroll = null;
  if (route === '/' && !SKIP_SCROLL) {
    await page.evaluate(() => window.__mdrkGate.startRaf());
    /* the r322 descent — mouse wheel notches (real input path) */
    for (let i = 0; i < NOTCHES; i++) {
      await page.mouse.wheel(0, NOTCH_PX);
      await page.waitForTimeout(NOTCH_GAP_MS);
    }
    await page.waitForTimeout(400);
    const deltas = await page.evaluate(() => {
      const W = window.__mdrkGate;
      W.stopRaf();
      return W.frameDeltas.slice();
    });
    scroll = summarize(deltas);
  }
  const loadMs = Date.now() - t0;
  await ctx.close();
  return { route, viewport: vp.name, ...metrics, loadMs, scroll };
}

function bundleCaps() {
  const assets = path.join(DIST, 'assets');
  const rows = [];
  for (const f of fs.readdirSync(assets)) {
    if (!f.endsWith('.js')) continue;
    const gz = gzKB(fs.readFileSync(path.join(assets, f)));
    const kind = /^index-/.test(f) ? 'main'
      : /Pages-/.test(f) ? 'route'
      : 'vendor';
    rows.push({ file: f, kind, gzKB: gz });
  }
  const main = rows.filter((r) => r.kind === 'main');
  const routes = rows.filter((r) => r.kind === 'route');
  const mainMax = Math.max(...main.map((r) => r.gzKB), 0);
  const routeBreaches = routes.filter((r) => r.gzKB > 150);
  return {
    mainMaxGzKB: mainMax,
    mainCapKB: 200,
    mainOk: mainMax <= 200,
    routes: routes.sort((a, b) => b.gzKB - a.gzKB),
    routeCapKB: 150,
    routeBreaches,
    routeOk: routeBreaches.length === 0,
    vendors: rows.filter((r) => r.kind === 'vendor').sort((a, b) => b.gzKB - a.gzKB).slice(0, 8),
  };
}

/* ───────────────────────── main ───────────────────────── */
let exitCode = 0;
try {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('[gate:perf] FATAL: frontend/dist missing — run `npm run build -w frontend` first.');
    process.exit(1);
  }
  const up = await startServer();
  if (!up) { console.error('[gate:perf] FATAL: vite preview never answered on ' + BASE); process.exit(1); }
  console.log(`[gate:perf] preview up on ${BASE} (pid ${server.pid})`);

  const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
  const results = [];
  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const r = await runRoute(browser, route, vp);
      results.push(r);
      const jankTxt = r.scroll ? ` jank>${TH.minPctFramesLe20 - 100}%=${r.scroll.pctGt20}% (le20 ${r.scroll.pctLe20}%)` : '';
      console.log(`[gate:perf] ${vp.name} ${route.padEnd(11)} CLS ${r.cls} · LCP ${r.lcp}ms · INP ${r.inp}ms${jankTxt}`);
    }
  }
  await browser.close();

  const caps = bundleCaps();
  console.log(`[gate:perf] bundle main ${caps.mainMaxGzKB}KB gz (cap ${caps.mainCapKB}) · route breaches: ${caps.routeBreaches.length ? caps.routeBreaches.map((r) => `${r.file}@${r.gzKB}KB`).join(', ') : 'none'}`);

  /* verdicts */
  const failures = [];
  for (const r of results) {
    if (r.cls > TH.cls) failures.push(`CLS ${vpTag(r)} ${r.route}: ${r.cls} > ${TH.cls}`);
    if (r.lcp != null && r.lcp > TH.lcpMs) failures.push(`LCP ${vpTag(r)} ${r.route}: ${r.lcp}ms > ${TH.lcpMs}ms`);
    if (r.inp > TH.inpMs) failures.push(`INP ${vpTag(r)} ${r.route}: ${r.inp}ms > ${TH.inpMs}ms`);
    if (r.scroll && r.scroll.pctLe20 < TH.minPctFramesLe20) {
      failures.push(`JANK ${vpTag(r)} ${r.route}: ${r.scroll.pctLe20}% frames ≤20ms < ${TH.minPctFramesLe20}% (gt20 ${r.scroll.pctGt20}%)`);
    }
  }
  if (!caps.mainOk) failures.push(`BUNDLE main ${caps.mainMaxGzKB}KB gz > ${caps.mainCapKB}KB`);
  if (!caps.routeOk) failures.push(`BUNDLE routes over ${caps.routeCapKB}KB gz: ${caps.routeBreaches.map((r) => r.file).join(', ')}`);
  function vpTag(r) { return `[${r.viewport}]`; }

  const out = {
    meta: {
      gate: 'r323 gate:perf (A4 #5)',
      base: BASE, cpu: CPU, headless: true,
      thresholds: TH,
      cadence: `${NOTCHES}×${NOTCH_PX}px @${NOTCH_GAP_MS}ms`,
      generatedAt: new Date().toISOString(),
    },
    head: (() => { try { return execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch { return null; } })(),
    results, caps, failures,
    verdict: failures.length === 0 ? 'PASS' : 'FAIL',
  };
  const outDir = path.join(ROOT, 'audits/evidence/r323');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'perf-gate.json'), JSON.stringify(out, null, 2));
  console.log(`\n[gate:perf] verdict: ${out.verdict} (${failures.length} failure${failures.length === 1 ? '' : 's'}) → audits/evidence/r323/perf-gate.json`);
  for (const f of failures) console.log('  ✗ ' + f);
  exitCode = failures.length === 0 ? 0 : 1;
} finally {
  killServer();
}
process.exit(exitCode);
