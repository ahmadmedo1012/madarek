#!/usr/bin/env node
/**
 * R318 C2-P — perf.mjs: the landing smoothness harness.
 *
 * One Node ESM file, zero new dependencies (playwright-core + node builtins).
 * It boots its own chromium against a RUNNING `vite preview` server
 * (`--base-url`, default http://localhost:4183), drives the landing with the
 * seven canonical scenarios, and emits:
 *
 *   audits/evidence/r316/perf.json  — the full machine-readable result set
 *   audits/evidence/r316/perf.md    — the human table (per viewport ×
 *                                     scenario: %frames>20ms, %frames>33ms,
 *                                     p95/max frame, longtask census, CLS
 *                                     with top-3 shifters, LCP, INP p95)
 *   audits/evidence/r316/trace-*.json — raw CDP traces (only with --trace)
 *
 * Scenarios (one scenario run = one page load + one interaction script):
 *   scroll  — full-page wheel scroll (12 × 600px down @80ms, then 12 back up)
 *   touch   — touch-drag scroll via CDP Input.synthesizeScrollGesture
 *   menu    — mobile menu open/close (skipped where .fo-burger is hidden)
 *   theme   — theme toggle dark↔light (header, or inside the mobile menu)
 *   route   — route change / → /auth (the header login link)
 *   typing  — typing into the /auth page inputs (email + password)
 *   cold    — cold load on Fast-3G (LCP/CLS/JS resources; loader ON by
 *             default — the shipped first-visit experience; add
 *             --loader-skip to measure without it)
 *
 * In-page instrumentation (addInitScript, injected on EVERY document):
 *   · PerformanceObserver: longtask, layout-shift (sources → element),
 *     largest-contentful-paint, event (INP, durationThreshold 16),
 *     long-animation-frame.
 *   · a rAF frame-delta recorder armed/disarmed from the harness
 *     (window.__mdrkPerfStart / window.__mdrkPerfStop).
 *   · an OPTIONAL layout-read census (`--grbc`): wraps
 *     Element.prototype.getBoundingClientRect + setAttribute(d/points/
 *     transform/viewBox) + CSSStyleDeclaration.setProperty('—*') while a
 *     window flag is on — counts forced layout reads, SVG geometry
 *     rewrites and CSS-var writes during scroll with the offending
 *     selectors. Off by default because the wrapper itself costs a
 *     little (never used for headline numbers).
 *   · `window.__mdrkMark(label)` — frame-window marks; the scenarios
 *     bracket their ACTIVE interaction (first→last input) so jank is
 *     reported for the scroll window itself, not diluted by the
 *     settle tail (`frames` = whole recording, `framesActive` = the
 *     marked window).
 *
 * CDP: Emulation.setCPUThrottlingRate (--cpu, comma list, default 4),
 * Network.emulateNetworkConditions (Fast-3G, cold runs only),
 * Tracing.start/end (devtools.timeline + frame category, --trace) with the
 * trace parsed into a per-event-name {count, totalDurMs} table.
 *
 * Variants (`--variant`): default | grain-off (hides .fo-grain) |
 * filter-off (kills the InkSketch turbulence filter — a NO-OP on / where
 * no .inkm mounts; kept to PROVE that) | svg-off (visibility:hidden on
 * every svg — isolates the total SVG raster/paint cost of the heavy ink
 * art, layout kept identical). Honest CSS overrides in an init script —
 * no app code touched.
 *
 * Usage:
 *   node scripts/r316/perf.mjs [--viewports 1440,390] [--cpu 4]
 *          [--scenarios scroll,cold] [--base-url http://localhost:4183]
 *          [--variant grain-off] [--trace] [--grbc] [--loader-skip]
 *          [--runs N] [--tag suffix] [--out audits/evidence/r316/perf.json]
 *
 * The server must ALREADY be running (npx vite preview --port 4183
 * --strictPort from frontend/). Kill it when done — the harness never
 * starts or stops servers.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* r321 A1: resolve the newest FULL chromium build present (the pinned
 * 1223 full build is absent on some sandboxes — headless-shell only —
 * so scan for whichever chromium-* full build exists). */
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

/* ── CLI ────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const flag = (k) => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };

const ALL_VIEWPORTS = [320, 360, 390, 430, 768, 1024, 1280, 1440];
const HEIGHTS = { 320: 568, 360: 800, 390: 844, 430: 932, 768: 1024, 1024: 768, 1280: 800, 1440: 900 };
const ALL_SCENARIOS = ['scroll', 'touch', 'menu', 'theme', 'route', 'typing', 'cold'];

const baseUrl = opt('base-url', 'http://localhost:4183');
const viewports = (opt('viewports', ALL_VIEWPORTS.join(','))).split(',').map((v) => parseInt(v, 10)).filter((n) => HEIGHTS[n]);
const cpus = (opt('cpu', '4')).split(',').map((v) => parseInt(v, 10)).filter(Boolean);
const scenarios = (opt('scenarios', ALL_SCENARIOS.join(','))).split(',');
const variant = opt('variant', 'default');
const doTrace = flag('trace');
const doGrbc = flag('grbc');
const loaderSkip = flag('loader-skip');
const keepLoader = flag('keep-loader'); /* loader stays ON for every scenario (the shipped first-visit experience) */
const runsPerCell = parseInt(opt('runs', '1'), 10);
const outJson = path.resolve(ROOT, opt('out', 'audits/evidence/r316/perf.json'));
const outMd = outJson.replace(/\.json$/, '.md');
const tag = opt('tag', ''); // extra suffix for isolation profiles

if (viewports.length === 0 || cpus.length === 0) { console.error('bad --viewports/--cpu'); process.exit(2); }

/* Fast-3G (Lighthouse profile): 150ms RTT, 1.6Mbps down, 750Kbps up. */
const FAST3G = { latency: 150, download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8 };

const commit = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { return 'unknown'; } })();

/* ── In-page instrumentation (one string, injected per document) ──── */
function initScript({ loaderSkip, variant, grbc }) {
  const cssOverride =
    variant === 'grain-off'
      ? `var s=document.createElement("style");s.textContent=".fo-grain{display:none !important}";document.documentElement.appendChild(s);`
      : variant === 'filter-off'
        ? `var s=document.createElement("style");s.textContent=".inkm-sketch{filter:none !important}";document.documentElement.appendChild(s);`
        : variant === 'svg-off'
          ? `var s=document.createElement("style");s.textContent="svg{visibility:hidden !important}";document.documentElement.appendChild(s);`
          : '';
  return `
(function () {
  if (window.__mdrkPerf) return;
  var W = (window.__mdrkPerf = {
    frameDeltas: [], marks: [], recording: false, _rafOn: false, _last: 0,
    longtasks: [], shifts: [], lcps: [], events: [], loaf: [],
    grbc: { on: ${grbc ? 'true' : 'false'}, count: 0, dSets: 0, cssVars: 0, bySel: {} },
    dmut: { count: 0, byEl: {} },
  });
  function desc(el) {
    if (!el) return '(gone)';
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'body';
    var s = el.tagName ? el.tagName.toLowerCase() : '#node';
    if (el.id) s += '#' + el.id;
    var c = '';
    try { c = (el.className && typeof el.className === 'string') ? el.className.trim().split(/\\s+/).slice(0, 3).join('.') : ''; } catch (e) {}
    if (c) s += '.' + c;
    return s;
  }
  W.desc = desc;
  /* rAF frame-delta recorder — armed from the harness only */
  window.__mdrkPerfStart = function () {
    W.recording = true;
    if (!W._rafOn) {
      W._rafOn = true; W._last = 0;
      requestAnimationFrame(function loop(t) {
        if (!W.recording) { W._rafOn = false; W._last = 0; return; }
        if (W._last) { var d = t - W._last; if (d > 0 && d < 5000) W.frameDeltas.push({ d: Math.round(d * 100) / 100, t: Math.round(t) }); }
        W._last = t;
        requestAnimationFrame(loop);
      });
    }
  };
  window.__mdrkPerfStop = function () { W.recording = false; };
  /* frame-window marks — the scenarios bracket their ACTIVE input window */
  window.__mdrkMark = function (label) {
    W.marks.push({ label: String(label), idx: W.frameDeltas.length, t: Math.round(performance.now()) });
  };
  /* observers */
  try {
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) W.longtasks.push({
        start: Math.round(e.startTime), dur: Math.round(e.duration),
        attr: (e.attribution || []).map(function (a) { return a.containerType + ':' + (a.containerName || a.containerId || ''); }),
      });
    }).observe({ entryTypes: ['longtask'] });
  } catch (e) {}
  try {
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) W.shifts.push({
        t: Math.round(e.startTime), value: e.value, hadInput: e.hadRecentInput,
        sources: (e.sources || []).map(function (s) {
          return { node: desc(s.node),
                   prev: s.previousRect ? [Math.round(s.previousRect.x), Math.round(s.previousRect.y), Math.round(s.previousRect.width), Math.round(s.previousRect.height)] : null,
                   cur: s.currentRect ? [Math.round(s.currentRect.x), Math.round(s.currentRect.y), Math.round(s.currentRect.width), Math.round(s.currentRect.height)] : null };
        }),
      });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) W.lcps.push({
        t: Math.round(e.startTime), size: e.size, node: desc(e.element), url: (e.url || '').slice(0, 80),
      });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) if (e.interactionId > 0) W.events.push({
        name: e.name, start: Math.round(e.startTime), dur: Math.round(e.duration), iid: e.interactionId,
      });
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) if (W.loaf.length < 400) W.loaf.push({
        start: Math.round(e.startTime), dur: Math.round(e.duration), block: Math.round(e.blockingDuration || 0),
        scripts: (e.scripts || []).slice(0, 6).map(function (s) { return { dur: Math.round(s.duration), invoker: (s.invoker || '').slice(0, 60), src: (s.sourceURL || '').replace(location.origin, '').slice(0, 70) }; }),
      });
    }).observe({ entryTypes: ['long-animation-frame'] });
  } catch (e) {}
  /* SVG geometry-churn census (cause b): a MutationObserver on every
   * 'd' attribute mutation, ALWAYS on — the engine filters by
   * attribute name, so pages that never rewrite path geometry pay
   * nothing, and pages that do (campus .inkm mask scrub) get counted
   * with the exact element. Zero on / by design (no .inkm mounts). */
  try {
    new MutationObserver(function (muts) {
      for (var m of muts) {
        W.dmut.count++;
        var k = W.desc(m.target);
        W.dmut.byEl[k] = (W.dmut.byEl[k] || 0) + 1;
      }
    }).observe(document.documentElement, {
      subtree: true, attributes: true, attributeFilter: ['d'],
    });
  } catch (e) {}
  /* OPTIONAL layout-read census (armed per-run by the harness) */
  var gRBC = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    var g = window.__mdrkPerf && window.__mdrkPerf.grbc;
    if (g && g.on) {
      g.count++;
      try { var k = window.__mdrkPerf.desc(this); g.bySel[k] = (g.bySel[k] || 0) + 1; } catch (e) {}
    }
    return gRBC.call(this);
  };
  var sAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) {
    var g = window.__mdrkPerf && window.__mdrkPerf.grbc;
    if (g && g.on && (n === 'd' || n === 'points' || n === 'transform' || n === 'viewBox')) g.dSets++;
    return sAttr.call(this, n, v);
  };
  var sProp = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (k, v, p) {
    var g = window.__mdrkPerf && window.__mdrkPerf.grbc;
    if (g && g.on && String(k).indexOf('--') === 0) g.cssVars = (g.cssVars || 0) + 1;
    return sProp.call(this, k, v, p);
  };
  /* loader bypass + CSS variant overrides — before ANY app script */
  try { ${loaderSkip ? "sessionStorage.setItem('madarek-intro-skip', '1');" : "sessionStorage.removeItem('madarek-intro-skip');"} } catch (e) {}
  ${cssOverride}
})();
`;
}

/* ── stat helpers ───────────────────────────────────────────────── */
const quantile = (n, p) => { const a = [...n].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0; };
const median = (n) => quantile(n, 50);
/* frame entries are {d,t}; optionally slice by index window [from,to) */
const summarizeFrames = (deltas, from = 0, to = Infinity) => {
  const arr = (deltas || []).slice(from, to).map((f) => (typeof f === 'number' ? f : f.d));
  if (arr.length === 0) return { count: 0, pctGt20: 0, pctGt33: 0, p95: 0, max: 0, avg: 0 };
  const gt20 = arr.filter((d) => d > 20).length;
  const gt33 = arr.filter((d) => d > 33).length;
  return {
    count: arr.length,
    pctGt20: Math.round((gt20 / arr.length) * 1000) / 10,
    pctGt33: Math.round((gt33 / arr.length) * 1000) / 10,
    p95: quantile(arr, 95), max: Math.round(Math.max(...arr) * 100) / 100,
    avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100,
  };
};
const summarizeLongtasks = (lts) => {
  const gt50 = lts.filter((t) => t.dur > 50);
  return {
    count: lts.length, gt50: gt50.length,
    totalMs: lts.reduce((a, b) => a + b.dur, 0),
    worst: [...lts].sort((a, b) => b.dur - a.dur).slice(0, 5),
  };
};
const summarizeCls = (shifts, sinceMs, includeInput = false) => {
  const scoped = shifts.filter((s) => (includeInput || !s.hadInput) && (sinceMs === undefined || s.t >= sinceMs));
  const total = scoped.reduce((a, b) => a + b.value, 0);
  const perNode = new Map();
  for (const s of scoped) for (const src of s.sources) {
    perNode.set(src.node, (perNode.get(src.node) || 0) + s.value);
  }
  const top = [...perNode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([node, v]) => ({ node, cls: Math.round(v * 1000) / 1000 }));
  return { total: Math.round(total * 1000) / 1000, topShifters: top, entries: scoped.length };
};
const summarizeInp = (events) => {
  if (!events.length) return { count: 0, p95: 0, worst: [] };
  const worstByIid = new Map();
  for (const e of events) {
    const w = worstByIid.get(e.iid) || { name: e.name, dur: 0 };
    w.dur = Math.max(w.dur, e.dur); w.name = e.name; worstByIid.set(e.iid, w);
  }
  return {
    count: events.length,
    p95: quantile([...worstByIid.values()].map((w) => w.dur), 95),
    worst: [...worstByIid.values()].sort((a, b) => b.dur - a.dur).slice(0, 3),
  };
};
const summarizeLoaf = (loaf) => {
  const invokers = new Map();
  for (const l of loaf) for (const s of l.scripts) {
    const k = (s.src || '(inline)') + ' :: ' + s.invoker;
    invokers.set(k, (invokers.get(k) || 0) + s.dur);
  }
  return {
    count: loaf.length, gt100: loaf.filter((l) => l.dur > 100).length,
    totalMs: Math.round(loaf.reduce((a, b) => a + b.dur, 0)),
    worst: [...loaf].sort((a, b) => b.dur - a.dur).slice(0, 3).map((l) => ({ start: l.start, dur: l.dur, scripts: l.scripts })),
    topInvokers: [...invokers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, ms]) => ({ script: k, totalMs: ms })),
  };
};

/* ── one-time DOM census (post-load; runs only for scroll/touch) ─── */
const CENSUS_FN = `(() => {
  const all = document.querySelectorAll('*');
  const W = window.__mdrkPerf;
  const out = { totalNodes: all.length, svg: 0, pattern: 0, filterEl: 0, clipPath: 0, symbol: 0, path: 0 };
  for (const el of all) {
    const tag = el.tagName;
    if (tag === 'svg') out.svg++;
    else if (tag === 'pattern') out.pattern++;
    else if (tag === 'filter') out.filterEl++;
    else if (tag === 'clipPath') out.clipPath++;
    else if (tag === 'symbol') out.symbol++;
    else if (tag === 'path') out.path++;
  }
  const probe = {};
  for (const sel of ['.fo-grain', '.inkm-sketch', '.jt-window', '.bp-svg']) {
    const el = document.querySelector(sel);
    if (el) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      probe[sel] = { mixBlend: cs.mixBlendMode, filter: cs.filter.slice(0, 80), position: cs.position, willChange: cs.willChange, mask: (cs.maskImage || '').slice(0, 60), w: Math.round(r.width), h: Math.round(r.height) };
    }
  }
  out.probe = probe;
  let wc = 0, filt = 0, blend = 0, fixed = 0, backdrop = 0, maskCount = 0, contain = 0, contVis = 0;
  const list = [];
  const seen = new Set();
  for (const el of all) {
    const cs = getComputedStyle(el);
    const reasons = [];
    if (cs.willChange && cs.willChange !== 'auto') { wc++; reasons.push('will-change:' + cs.willChange.slice(0, 24)); }
    if (cs.filter && cs.filter !== 'none') { filt++; reasons.push('filter'); }
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') { blend++; reasons.push('blend:' + cs.mixBlendMode); }
    if (cs.position === 'fixed') { fixed++; reasons.push('fixed'); }
    if (cs.backdropFilter && cs.backdropFilter !== 'none') { backdrop++; reasons.push('backdrop-filter'); }
    if ((cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none')) { maskCount++; reasons.push('mask'); }
    if (cs.contentVisibility === 'auto') contVis++;
    if (cs.contain && cs.contain !== 'none') contain++;
    if (reasons.length && !seen.has(el) && list.length < 40) { seen.add(el); list.push(W.desc(el) + ' [' + reasons.join(',') + ']'); }
  }
  out.layerCandidates = { willChange: wc, filter: filt, mixBlend: blend, fixed: fixed, backdropFilter: backdrop, mask: maskCount, contain, contentVisibilityAuto: contVis };
  out.layerCandidateList = list;
  return out;
})()`;

/* ── trace summarising (from collected ReportEvents chunks) ───────── */
function summarizeTrace(events) {
  const byName = new Map();
  for (const ev of events) {
    if (!ev || ev.name === 'AnimationFrame' || ev.cat === '__metadata') continue;
    if (!ev.name || !ev.cat || !ev.cat.includes('devtools.timeline')) continue;
    const cur = byName.get(ev.name) || { count: 0, totalDurMs: 0 };
    cur.count++;
    cur.totalDurMs += (ev.dur || 0) / 1000;
    byName.set(ev.name, cur);
  }
  const top = [...byName.entries()].sort((a, b) => b[1].totalDurMs - a[1].totalDurMs).slice(0, 40)
    .map(([name, v]) => ({ name, count: v.count, totalMs: Math.round(v.totalDurMs * 10) / 10 }));
  return { top, eventsTotal: [...byName.values()].reduce((a, b) => a + b.count, 0) };
}
/* raw traces can be tens of MB — they go OUTSIDE the repo (/tmp); the
 * parsed per-event summary is the durable evidence. */
const TRACE_DIR = '/tmp/mdrk-r316-traces';
function dumpTrace(events, file) {
  try {
    fs.mkdirSync(TRACE_DIR, { recursive: true });
    fs.writeFileSync(path.join(TRACE_DIR, file), events.map((e) => JSON.stringify(e)).join('\n'));
    return path.join(TRACE_DIR, file);
  } catch { return null; }
}

/* ── run one scenario ────────────────────────────────────────────── */
async function runScenario({ browser, vp, cpu, scenario, variant, loaderSkip, grbc, trace, outDir, runIdx }) {
  const ctx = await browser.newContext({
    viewport: { width: vp, height: HEIGHTS[vp] },
    deviceScaleFactor: 1,
    isMobile: vp <= 430,
    hasTouch: vp <= 430,
  });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: cpu });

  const jsFetched = new Set();
  page.on('response', (res) => {
    try {
      const u = res.request().url();
      if (u.includes('/assets/') && u.endsWith('.js') && res.status() === 200) jsFetched.add(u.replace(baseUrl, ''));
    } catch {}
  });

  /* CDP tracing (ReportEvents): collected via session events. */
  const traceEvents = [];
  let traceDone = null;
  client.on('Tracing.dataCollected', (d) => { traceEvents.push(...(d.value || d.data || [])); });
  client.on('Tracing.tracingComplete', () => { if (traceDone) traceDone(); });

  await page.addInitScript(initScript({ loaderSkip, variant, grbc }));

  const result = { viewport: vp, height: HEIGHTS[vp], cpu, scenario, variant, loaderSkip, run: runIdx, notes: [] };
  const traceFile = `trace-${vp}x${HEIGHTS[vp]}-${scenario}-${variant}${tag ? '-' + tag : ''}${runIdx > 1 ? '-' + runIdx : ''}.jsonl`;

  let startMs = 0;
  try {
    const cold = scenario === 'cold';
    let armed = false;
    if (cold) {
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', { offline: false, latency: FAST3G.latency, downloadThroughput: FAST3G.download, uploadThroughput: FAST3G.upload });
    }
    await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    if (cold) {
      /* the cold run records from DOMContentLoaded: the loader animation,
       * hydration, the exit sweep — the whole first-visit experience. */
      startMs = await page.evaluate(() => Math.round(performance.now()));
      if (grbc) await page.evaluate(() => { window.__mdrkPerf.grbc.on = true; });
      await page.evaluate(() => window.__mdrkPerfStart());
      armed = true;
      await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 80000 }).catch(() => result.notes.push('load wait timeout'));
      /* the loader mounts with the lazy route chunk — under throttling that
       * can land AFTER loadEvent; give it a real window before deciding. */
      const sl = await page.waitForSelector('.sl', { timeout: 20000 }).catch(() => null);
      result.loaderPlayed = !!sl;
      if (sl) {
        result.slMountMs = await page.evaluate(() => Math.round(performance.now()));
        await page.waitForFunction(() => !document.querySelector('.sl'), null, { timeout: 60000 }).catch(() => result.notes.push('loader still mounted at end of wait'));
        result.slExitMs = await page.evaluate(() => Math.round(performance.now()));
      }
      await page.waitForTimeout(3000);
      result.docHeight = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => null);
    } else {
      await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 30000 }).catch(() => {});
      /* the landing mounts through a lazy route chunk — wait for the
       * journey track (the heaviest subscriber) to exist, then fonts,
       * then a short settle, so the recorder never catches hydration. */
      await page.waitForSelector('.jt', { timeout: 20000 }).catch(() => result.notes.push('.jt never mounted'));
      await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
      await page.waitForTimeout(800);
    }
    result.docHeight = result.docHeight ?? (await page.evaluate(() => document.documentElement.scrollHeight).catch(() => null));

    const traceOn = trace && (scenario === 'scroll' || scenario === 'touch');
    if (traceOn) {
      await client.send('Tracing.start', {
        transferMode: 'ReportEvents',
        streamFormat: 'json',
        categories: 'devtools.timeline,disabled-by-default-devtools.timeline.frame',
      });
    }

    /* arm the recorders around the interaction (cold armed at DCL) */
    if (!armed) {
      startMs = await page.evaluate(() => Math.round(performance.now()));
      if (grbc) await page.evaluate(() => { window.__mdrkPerf.grbc.on = true; });
      await page.evaluate(() => window.__mdrkPerfStart());
    }

    const scrollYSamples = [];
    if (scenario === 'scroll') {
      await page.evaluate(() => window.__mdrkMark('active-start'));
      for (let i = 0; i < 12; i++) {
        await page.mouse.wheel(0, 600); await page.waitForTimeout(80);
        scrollYSamples.push(await page.evaluate(() => Math.round(window.scrollY)).catch(() => null));
      }
      await page.waitForTimeout(600);
      for (let i = 0; i < 12; i++) {
        await page.mouse.wheel(0, -600); await page.waitForTimeout(80);
        scrollYSamples.push(await page.evaluate(() => Math.round(window.scrollY)).catch(() => null));
      }
      await page.evaluate(() => window.__mdrkMark('active-end'));
      await page.waitForTimeout(900);
    } else if (scenario === 'touch') {
      const cx = Math.floor(vp / 2), cy = Math.floor(HEIGHTS[vp] / 2);
      /* negative yDistance = finger swipes UP = content scrolls DOWN */
      await page.evaluate(() => window.__mdrkMark('active-start'));
      for (let i = 0; i < 12; i++) {
        await client.send('Input.synthesizeScrollGesture', { x: cx, y: cy, xDistance: 0, yDistance: -600, speed: 1400 });
        await page.waitForTimeout(80);
        scrollYSamples.push(await page.evaluate(() => Math.round(window.scrollY)).catch(() => null));
      }
      await page.waitForTimeout(600);
      for (let i = 0; i < 12; i++) {
        await client.send('Input.synthesizeScrollGesture', { x: cx, y: cy, xDistance: 0, yDistance: 600, speed: 1400 });
        await page.waitForTimeout(80);
        scrollYSamples.push(await page.evaluate(() => Math.round(window.scrollY)).catch(() => null));
      }
      await page.evaluate(() => window.__mdrkMark('active-end'));
      await page.waitForTimeout(900);
    } else if (scenario === 'menu') {
      const burger = page.locator('.fo-burger');
      if (!(await burger.isVisible().catch(() => false))) {
        result.notes.push('skipped: .fo-burger not visible at this width');
      } else {
        await burger.click(); await page.waitForTimeout(1300);
        await page.keyboard.press('Escape'); await page.waitForTimeout(1300);
      }
    } else if (scenario === 'theme') {
      /* the toggle lives in the header ≥992px and INSIDE the mobile
       * menu below it — probe both, click the one that exists. */
      const inMenu = '.fo-mobile-menu .theme-toggle-option[aria-label="داكن"]';
      const inHeader = '.theme-toggle-option[aria-label="داكن"]';
      let dark = page.locator(inHeader).first();
      if (!(await dark.isVisible().catch(() => false))) {
        const burger = page.locator('.fo-burger');
        if (await burger.isVisible().catch(() => false)) { await burger.click(); await page.waitForTimeout(900); result.notes.push('theme toggled via mobile menu'); }
        dark = page.locator(inMenu).first();
      }
      await dark.click({ timeout: 5000 }).catch(() => result.notes.push('dark toggle not found'));
      await page.waitForTimeout(1500);
      const light = page.locator('.theme-toggle-option[aria-label="فاتح"]').first();
      await light.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1500);
    } else if (scenario === 'route') {
      const login = page.locator('a[href="/auth"]').first();
      if (!(await login.isVisible().catch(() => false))) {
        const burger = page.locator('.fo-burger');
        if (await burger.isVisible().catch(() => false)) { await burger.click(); await page.waitForTimeout(900); result.notes.push('route change via mobile menu'); }
      }
      await login.click({ timeout: 5000 }).catch(() => result.notes.push('login link not found'));
      await page.waitForFunction(() => location.pathname === '/auth', null, { timeout: 15000 }).catch(() => result.notes.push('route wait timeout'));
      await page.waitForTimeout(2500);
    } else if (scenario === 'typing') {
      await page.goto(baseUrl + '/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.auth-input', { timeout: 20000 }).catch(() => result.notes.push('auth inputs not found'));
      await page.waitForTimeout(1200);
      /* the goto opened a NEW document — re-arm the recorders on it */
      startMs = await page.evaluate(() => Math.round(performance.now()));
      await page.evaluate(() => window.__mdrkPerfStart());
      const email = page.locator('.auth-input[type="email"]').first();
      const emailFallback = page.locator('input[dir="ltr"]').first();
      const emailInput = (await email.count()) ? email : emailFallback;
      await emailInput.click().catch(() => {});
      await emailInput.type('smoothness.probe@madarek.test', { delay: 45 }).catch(() => {});
      const pass = page.locator('.auth-input[type="password"]').first();
      if (await pass.count()) { await pass.click().catch(() => {}); await pass.type('Madarek#Probe2026', { delay: 45 }).catch(() => {}); }
      await page.waitForTimeout(800);
    } else if (scenario === 'cold') {
      await page.waitForTimeout(2000); // extra LCP/CLS settle
    }

    await page.evaluate(() => window.__mdrkPerfStop());
    if (grbc) await page.evaluate(() => { window.__mdrkPerf.grbc.on = false; });
    const endMs = await page.evaluate(() => Math.round(performance.now()));
    result.scrollYSamples = scrollYSamples.length ? scrollYSamples : undefined;
    result.interactWindowMs = endMs - startMs;

    if (traceOn) {
      traceDone = () => {};
      await client.send('Tracing.end');
      await new Promise((r) => { traceDone = r; setTimeout(r, 8000); });
      traceDone = null;
      const rawPath = dumpTrace(traceEvents, path.basename(traceFile));
      result.trace = { ...summarizeTrace(traceEvents), rawDump: rawPath, eventsCaptured: traceEvents.length };
    }

    const data = await page.evaluate(() => {
      const W = window.__mdrkPerf;
      return {
        frameDeltas: W.frameDeltas, marks: W.marks, longtasks: W.longtasks, shifts: W.shifts,
        lcps: W.lcps, events: W.events, loaf: W.loaf, grbc: W.grbc,
        dmut: W.dmut,
      };
    });
    /* cause (b): d-attribute mutations, rate over the ACTIVE window */
    {
      const d = data.dmut || { count: 0, byEl: {} };
      const mA = (data.marks || []).find((m) => m.label === 'active-start');
      const mB = (data.marks || []).find((m) => m.label === 'active-end');
      const secs = ((mA && mB) ? (mB.t - mA.t) : (endMs - startMs)) / 1000;
      result.dmut = {
        count: d.count,
        perSec: secs > 0 ? Math.round((d.count / secs) * 10) / 10 : 0,
        top: Object.entries(d.byEl || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => ({ el: k, count: c })),
      };
    }
    const totalCls = summarizeCls(data.shifts);
    const interactCls = summarizeCls(data.shifts, startMs);
    const interactRaw = summarizeCls(data.shifts, startMs, true);
    result.frames = summarizeFrames(data.frameDeltas);
    /* the ACTIVE window (first→last input) — the honest scroll jank slice */
    const mStart = (data.marks || []).find((m) => m.label === 'active-start');
    const mEnd = (data.marks || []).find((m) => m.label === 'active-end');
    if (mStart && mEnd && mEnd.idx > mStart.idx) {
      result.framesActive = summarizeFrames(data.frameDeltas, mStart.idx, mEnd.idx);
      result.activeWindowMs = mEnd.t - mStart.t;
    }
    result.longtasks = summarizeLongtasks(data.longtasks);
    result.cls = {
      total: totalCls.total,
      loadPhase: Math.round((totalCls.total - interactCls.total) * 1000) / 1000,
      interactPhase: interactCls.total,
      topShifters: totalCls.topShifters, entries: totalCls.entries,
      /* diagnostics: EVERY shift in the interaction window, including
       * the input-adjacent ones standard CLS excludes — names the
       * elements that move under the wheel/touch. */
      interactRaw: { total: interactRaw.total, count: interactRaw.entries, topShifters: interactRaw.topShifters },
    };
    const lcp = data.lcps[data.lcps.length - 1] || null;
    result.lcp = lcp ? { ms: lcp.t, element: lcp.node, url: lcp.url, size: lcp.size } : null;
    result.inp = summarizeInp(data.events);
    result.loaf = summarizeLoaf(data.loaf);
    result.grbc = grbc ? {
      count: data.grbc.count, dSets: data.grbc.dSets, cssVars: data.grbc.cssVars || 0,
      perSec: result.interactWindowMs ? Math.round((data.grbc.count / (result.interactWindowMs / 1000)) * 10) / 10 : null,
      top: Object.entries(data.grbc.bySel || {}).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, c]) => ({ sel: k, reads: c })),
    } : null;
    result.finalScrollY = await page.evaluate(() => Math.round(window.scrollY)).catch(() => null);
    result.docHeightEnd = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => null);
    if (cold) {
      result.resources = await page.evaluate(() => performance.getEntriesByType('resource')
        .filter((r) => r.name.includes('/assets/') && r.name.endsWith('.js'))
        .map((r) => ({ url: r.name.replace(location.origin, ''), transferKB: Math.round((r.transferSize || 0) / 102.4) / 10, decodedKB: Math.round((r.decodedBodySize || 0) / 102.4) / 10 }))
      ).catch(() => []);
      result.jsFetchedUrls = [...jsFetched];
      result.navigation = await page.evaluate(() => {
        const n = performance.getEntriesByType('navigation')[0];
        return n ? { domContentLoadedMs: Math.round(n.domContentLoadedEventEnd), loadMs: Math.round(n.loadEventEnd) } : null;
      }).catch(() => null);
    }
    if (scenario === 'scroll' || scenario === 'touch') {
      result.dom = await page.evaluate(CENSUS_FN).catch((e) => ({ error: String(e).slice(0, 200) }));
    }
  } catch (err) {
    result.error = String(err).slice(0, 300);
  }
  await ctx.close();
  return result;
}

/* ── main ────────────────────────────────────────────────────────── */
(async () => {
  const outDir = path.dirname(outJson);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--disable-dev-shm-usage', '--force-color-profile=srgb'] });
  /* --append: merge into an existing perf.json (the cause profile runs
   * in several harness invocations: baseline, variants, traces). */
  let results = [];
  let existingMeta = {};
  if (flag('append') && fs.existsSync(outJson)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outJson, 'utf8'));
      results = prev.results || [];
      existingMeta = prev.meta || {};
    } catch {}
  }
  const started = Date.now();
  const queue = [];
  for (const vp of viewports) for (const cpu of cpus) for (const sc of scenarios) {
    const scLoader = sc === 'cold' ? loaderSkip : !keepLoader;
    for (let r = 0; r < runsPerCell; r++) queue.push({ vp, cpu, sc, scLoader, r });
  }
  console.log(`perf.mjs — ${queue.length} runs against ${baseUrl} (commit ${commit}, variant=${variant}, trace=${doTrace}, grbc=${doGrbc})`);
  let i = 0;
  for (const job of queue) {
    i++;
    const t0 = Date.now();
    const res = await runScenario({ browser, vp: job.vp, cpu: job.cpu, scenario: job.sc, variant, loaderSkip: job.scLoader, grbc: doGrbc, trace: doTrace, outDir, runIdx: job.r + 1 });
    results.push(res);
    const dm = res.dmut && res.dmut.count ? ` dmut=${res.dmut.count}` : '';
    const f = res.frames && res.frames.count ? `${res.frames.pctGt33}%>33ms p95=${res.frames.p95} max=${res.frames.max}${dm}` : (res.error ? 'ERROR ' + res.error : '—');
    console.log(`  [${i}/${queue.length}] ${job.vp}×${HEIGHTS[job.vp]} cpu${job.cpu} ${job.sc.padEnd(7)} ${variant.padEnd(10)}#${job.r + 1} → ${f} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    fs.writeFileSync(outJson, JSON.stringify({
      meta: { ...(existingMeta || {}), baseUrl, commit, variant, grbc: doGrbc, trace: doTrace, started: new Date(started).toISOString(), chromium: EXE, runs: (existingMeta.runs || 0) + 1 },
      results,
    }, null, 2));
  }
  await browser.close();

  /* ── markdown table ── */
  /* aggregate per cell (viewport × cpu × scenario × variant × loader),
   * medians across runs; every raw run is listed in the appendix. */
  const cells = new Map();
  for (const r of results) {
    const key = `${r.viewport}|${r.cpu}|${r.scenario}|${r.variant}|${r.scenario === 'cold' ? (r.loaderSkip ? 'loader-off' : 'loader-on') : 'loader-off'}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(r);
  }
  const num = (v) => typeof v === 'number' && !Number.isNaN(v) ? v : 0;
  const rows = [];
  for (const [key, runs] of cells) {
    const pick = (fn) => median(runs.map(fn).map(num));
    const r0 = runs[0];
    const fa = runs.map((r) => (r.framesActive && r.framesActive.count ? r.framesActive : r.frames));
    const frameSource = fa.some((f) => f && f.count) ? fa : runs.map((r) => r.frames);
    const fr = frameSource.some((f) => f && f.count)
      ? `${pick((_, i) => (frameSource[i] || {}).pctGt20)}% / ${pick((_, i) => (frameSource[i] || {}).pctGt33)}% · p95 ${pick((_, i) => (frameSource[i] || {}).p95)}ms · max ${pick((_, i) => (frameSource[i] || {}).max)}ms`
      : '—';
    const lt = runs[0].longtasks ? `${pick((r) => (r.longtasks || {}).gt50)} / ${pick((r) => (r.longtasks || {}).totalMs)}ms` : '—';
    const shiftMerge = new Map();
    for (const r of runs) for (const s of (r.cls && r.cls.topShifters) || []) {
      shiftMerge.set(s.node, (shiftMerge.get(s.node) || 0) + s.cls);
    }
    const rawMerge = new Map();
    for (const r of runs) for (const s of ((r.cls && r.cls.interactRaw && r.cls.interactRaw.topShifters) || [])) {
      rawMerge.set(s.node, (rawMerge.get(s.node) || 0) + s.cls);
    }
    const top = [...shiftMerge.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, v]) => `${n} (${Math.round(v * 100) / 100})`).join(', ');
    const topRaw = [...rawMerge.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, v]) => `${n} (${Math.round(v * 100) / 100})`).join(', ');
    const cls = runs[0].cls ? `${pick((r) => (r.cls || {}).total)} (load ${pick((r) => (r.cls || {}).loadPhase)} / act ${pick((r) => (r.cls || {}).interactPhase)})` : '—';
    const lcpEl = runs.map((r) => (r.lcp && r.lcp.ms ? r.lcp : null)).filter(Boolean).sort((a, b) => b.ms - a.ms)[0];
    const lcp = lcpEl ? `${(lcpEl.ms / 1000).toFixed(2)}s ${lcpEl.element}` : '—';
    const inpAll = runs.flatMap((r) => (r.inp && r.inp.worst) || []);
    const inp = inpAll.length ? `p95 ${quantile(inpAll.map((w) => w.dur), 95)}ms (${inpAll.length} ev)` : '—';
    const [vpK, cpuK, scK, vaK, loK] = key.split('|');
    const label = `${scK}${vaK !== 'default' ? ' ·' + vaK : ''}${loK === 'loader-on' ? ' ·loader-ON' : ''}`;
    rows.push(`| ${vpK}×${r0.height} | ${cpuK}× | ${label} | ${fr} | ${lt} | ${cls}${top ? ' · ' + top : ''}${topRaw ? ' · under-input: ' + topRaw : ''} | ${lcp} | ${inp} | ×${runs.length} |`);
  }
  const appendix = results.map((r) => {
    const f = r.frames || {}, fa = r.framesActive || {};
    const fas = fa.count ? ` · active ${fa.pctGt33}%/${fa.count}f p95 ${fa.p95}` : '';
    const g = r.grbc ? ` · grbc ${r.grbc.count}reads(${r.grbc.perSec}/s) ${r.grbc.dSets}attr ${r.grbc.cssVars}vars` : '';
    const d = r.dmut && r.dmut.count ? `d-mut ${r.dmut.count} (${r.dmut.perSec}/s)` : (r.dmut ? 'd-mut 0' : '');
    return `| ${r.viewport}×${r.height} | ${r.cpu}× | ${r.scenario}${r.variant !== 'default' ? '·' + r.variant : ''}${r.scenario === 'cold' && !r.loaderSkip ? '·loader' : ''} #${r.run} | ${f.count ? `${f.pctGt33}%/${f.count}f p95 ${f.p95} max ${f.max}${fas}` : (r.error ? 'ERR ' + r.error : '—')} | ${(r.longtasks || {}).gt50 ?? '—'} | ${r.cls ? r.cls.total : '—'} | ${r.lcp ? (r.lcp.ms / 1000).toFixed(2) + 's' : '—'} |${g}| ${d} | ${((r.notes || []).join('; ') || '').slice(0, 60)} |`;
  });
  const md = `# R318 C2-P — landing smoothness harness results

- commit \`${commit}\` · base \`${baseUrl}\` · trace \`${doTrace}\` · grbc \`${doGrbc}\` · \`${results.length}\` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
${appendix.join('\n')}
`;
  fs.writeFileSync(outMd, md);
  console.log(`wrote ${path.relative(ROOT, outJson)} + ${path.relative(ROOT, outMd)} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
