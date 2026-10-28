#!/usr/bin/env node
/**
 * r322/perf-baseline.mjs — WP-1e — the DESKTOP 1440 PERFORMANCE BASELINE
 * TRACE of the landing page (kill-list V11: 106/215 frames >33ms, p95 50ms,
 * CLS 0.27, LCP 21s loader-on).
 *
 * Method: extends the R321 §A1 protocol (1440×900 · 4×CPU · wheel-scroll
 * harness, `scripts/r316/perf.mjs` + `scripts/r321/a1-*.mjs`) with
 * full-trace cost attribution (self-time sweep), a layout-shift source
 * census, a paint/invalidation census for the map band, and a loader-on
 * first-visit decomposition (S1) at 4×CPU and at Fast-3G (the owner's
 * LCP-21s methodology).
 *
 * SELF-CONTAINED server lifecycle: the script builds nothing itself — it
 * SERVES the already-built `frontend/dist` via its own `vite preview`
 * child on an IPv4 host (127.0.0.1 — the R321 worklog's ::1 lesson:
 * vite preview binds ::1 by default and breaks 127.0.0.1 navigation),
 * then kills it on exit. NEVER run the root `npm run build` (it deploys
 * DB migrations); build with `npm run build -w frontend` before this.
 *
 * Sessions (one chromium, sequential contexts, @1440×900, DSF 1, en-US):
 *   S1        loader-ON first visit, 4×CPU, no network throttle — the
 *             R321-comparable LCP leg (R321 measured 5.04s); traced for
 *             the whole first ~25s (loader curve, fonts, hydration,
 *             entrance, exit sweep).
 *   S1-net    loader-ON first visit, Fast-3G + 4×CPU — the owner's V11
 *             methodology (the LCP 21s case). Where does the time go?
 *   S2        loader-SKIP steady-state wheel scroll, 4×CPU, TRACED with
 *             invalidation + blink.style categories — the attribution
 *             leg (the 106/215 frames case): 19 × 660px notches @250ms
 *             (≈4 notches/sec, ≈12.5k px — one full descent of the
 *             12.5k document). Includes a mid-map-band pause for the
 *             LayerTree + DOMSnapshot layer census.
 *   S2-clean  same scroll, 4×CPU, NOT traced — the honest frame-health
 *             row (trace instrumentation overhead excluded).
 *   S2-native same scroll, 1×CPU, NOT traced — machine-speed context.
 *
 * Emitted:
 *   audits/evidence/r322/perf.json       — the machine result set
 *   /tmp/mdrk-r322-traces/*.jsonl        — raw CDP traces (outside the
 *                                          repo, the r316 convention)
 *
 * Usage: node scripts/r322/perf-baseline.mjs
 *        [--base-url http://127.0.0.1:4317] [--port 4317] [--cpu 4]
 *        [--sessions s1,s1net,s2,s2clean,s2native] [--keep-server]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const BASE = opt('base-url', 'http://127.0.0.1:4317');
const PORT = opt('port', '4317');
const CPU = Number(opt('cpu', '4'));
const SESSIONS = (opt('sessions', 's1,s1net,s2,s2clean,s2native')).split(',').map((s) => s.trim());
const OUT_JSON = path.join(ROOT, 'audits/evidence/r322/perf.json');
const TRACE_DIR = '/tmp/mdrk-r322-traces';
const VIEWPORT = { width: 1440, height: 900 };
const FAST3G = { latency: 150, download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8 };

/* the newest full chromium build present (the r316 recipe — the pinned
 * build is absent on some sandboxes, headless-shell only). */
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

/* ── stat helpers (r316 lineage) ─────────────────────────────────── */
const quantile = (n, p) => { const a = [...n].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0; };
const r1 = (n) => Math.round(n * 10) / 10;

function summarizeFrames(deltas, from = 0, to = Infinity) {
  const arr = (deltas || []).slice(from, to).map((f) => (typeof f === 'number' ? f : f.d));
  if (!arr.length) return { count: 0, pctGt20: 0, pctGt33: 0, p50: 0, p95: 0, max: 0, avg: 0 };
  const gt20 = arr.filter((d) => d > 20).length;
  const gt33 = arr.filter((d) => d > 33).length;
  return {
    count: arr.length, gt20, gt33,
    pctGt20: Math.round((gt20 / arr.length) * 1000) / 10,
    pctGt33: Math.round((gt33 / arr.length) * 1000) / 10,
    p50: r1(quantile(arr, 50)), p95: r1(quantile(arr, 95)),
    max: Math.round(Math.max(...arr) * 100) / 100,
    avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100,
  };
}
function summarizeLongtasks(lts, sinceMs = -Infinity) {
  const scoped = (lts || []).filter((t) => t.start >= sinceMs);
  return {
    count: scoped.length,
    gt50: scoped.filter((t) => t.dur > 50).length,
    totalMs: Math.round(scoped.reduce((a, b) => a + b.dur, 0)),
    worst: [...scoped].sort((a, b) => b.dur - a.dur).slice(0, 8),
  };
}
/** TBT proxy: Σ max(0, dur−50) over the window [sinceMs, untilMs]. */
function tbtProxy(lts, sinceMs = -Infinity, untilMs = Infinity) {
  return Math.round((lts || []).filter((t) => t.start >= sinceMs && t.start <= untilMs)
    .reduce((a, b) => a + Math.max(0, b.dur - 50), 0));
}
function summarizeCls(shifts, sinceMs = -Infinity, includeInput = false) {
  const scoped = (shifts || []).filter((s) => (includeInput || !s.hadInput) && s.t >= sinceMs);
  const total = scoped.reduce((a, b) => a + b.value, 0);
  const perNode = new Map();
  for (const s of scoped) for (const src of s.sources || []) {
    perNode.set(src.node, (perNode.get(src.node) || 0) + s.value);
  }
  const top = [...perNode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([node, v]) => ({ node, cls: Math.round(v * 1000) / 1000 }));
  return { total: Math.round(total * 1000) / 1000, topShifters: top, entries: scoped.length };
}
function summarizeLoaf(loaf) {
  const invokers = new Map();
  for (const l of loaf || []) for (const s of l.scripts || []) {
    const k = (s.src || '(inline)') + ' :: ' + (s.invoker || '');
    invokers.set(k, (invokers.get(k) || 0) + s.dur);
  }
  return {
    count: (loaf || []).length,
    totalMs: Math.round((loaf || []).reduce((a, b) => a + b.dur, 0)),
    worst: [...(loaf || [])].sort((a, b) => b.dur - a.dur).slice(0, 5)
      .map((l) => ({ start: l.start, dur: l.dur, scripts: l.scripts })),
    topInvokers: [...invokers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([k, ms]) => ({ script: k.slice(0, 130), totalMs: ms })),
  };
}

/* ── in-page instrumentation (injected before ANY app script) ─────── */
function initScript({ autoStart, grbcOn }) {
  return `
(function () {
  if (window.__mdrkPerf) return;
  var W = (window.__mdrkPerf = {
    frameDeltas: [], marks: [], recording: ${autoStart ? 'true' : 'false'},
    _rafOn: false, _last: 0,
    longtasks: [], shifts: [], lcps: [], loaf: [], wheelEvents: [],
    grbc: { on: ${grbcOn ? 'true' : 'false'}, count: 0, bySel: {} },
    fontsReadyAt: null,
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
  window.__mdrkPerfStart = function () {
    W.recording = true;
    if (!W._rafOn) {
      W._rafOn = true; W._last = 0;
      requestAnimationFrame(function loop(t) {
        if (!W.recording) { W._rafOn = false; W._last = 0; return; }
        if (W._last) {
          var d = t - W._last;
          if (d > 0 && d < 5000) W.frameDeltas.push({ d: Math.round(d * 100) / 100, t: Math.round(t), y: Math.round(window.scrollY || 0) });
        }
        W._last = t;
        requestAnimationFrame(loop);
      });
    }
  };
  window.__mdrkPerfStop = function () { W.recording = false; };
  window.__mdrkMark = function (label) { W.marks.push({ label: String(label), t: Math.round(performance.now()) }); };
  /* the wheel cadence log — the in-page truth for notch times + scrollY */
  window.addEventListener('wheel', function (e) {
    W.wheelEvents.push({ t: Math.round(performance.now()), y: Math.round(window.scrollY || 0), dy: e.deltaY });
  }, { passive: true, capture: true });
  try {
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) W.longtasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
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
      for (var e of l.getEntries()) W.lcps.push({ t: Math.round(e.startTime), size: e.size, node: desc(e.element), url: (e.url || '').slice(0, 80) });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function (l) {
      for (var e of l.getEntries()) if (W.loaf.length < 500) W.loaf.push({
        start: Math.round(e.startTime), dur: Math.round(e.duration),
        scripts: (e.scripts || []).slice(0, 6).map(function (s) {
          return { dur: Math.round(s.duration), invoker: (s.invoker || '').slice(0, 60), src: (s.sourceURL || '').replace(location.origin, '').slice(0, 70) };
        }),
      });
    }).observe({ entryTypes: ['long-animation-frame'] });
  } catch (e) {}
  /* the gBCR read census (r316 recipe) */
  var gRBC = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    var g = window.__mdrkPerf && window.__mdrkPerf.grbc;
    if (g && g.on) {
      g.count++;
      try { var k = window.__mdrkPerf.desc(this); g.bySel[k] = (g.bySel[k] || 0) + 1; } catch (e) {}
    }
    return gRBC.call(this);
  };
  /* fonts.ready timing (LCP decomposition: the font leg) */
  try { document.fonts.ready.then(function () { window.__mdrkPerf.fontsReadyAt = Math.round(performance.now()); }); } catch (e) {}
  ${autoStart ? 'window.__mdrkPerfStart();' : ''}
})();
`;
}

/* the loader-skip seed (the repo's hermetic mechanism — INTRO_SKIP_KEY) */
const INTRO_SKIP_SEED = `try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch (e) {}`;

/* ── trace collection + streaming reduction ────────────────────────── */
const TRACE_CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.invalidationTracking',
  'disabled-by-default-blink.style',
].join(',');

class TraceCollector {
  constructor(file) {
    this.file = file;
    this.events = 0;
    this.rawFh = null;
    /* streaming aggregates */
    this.byName = new Map();          // name -> {count,totalUs}
    this.compact = [];                // [ts, dur, nameIdx, tidKey] quads per complete event
    this.nameTable = new Map();       // name -> idx
    this.names = [];
    this.threadOf = new Map();        // tidKey -> totalUs (complete events)
    /* invalidations: parallel arrays (ts, nodeId, kindIdx, nodeNameIdx, reasonIdx) */
    this.invTs = []; this.invNode = []; this.invKind = []; this.invName = []; this.invReason = [];
    this.invKinds = ['StyleRecalcInvalidationTracking', 'LayoutInvalidationTracking', 'StyleInvalidatorInvalidationTracking', 'PaintInvalidationTracking'];
    this.strTable = new Map(); this.strs = [];
    this.paints = [];                 // {ts, durUs, layerId, nodeName}
    this.styleRecalcs = [];           // {ts, durUs, elementCount}
    this.resolveCounts = new Map();   // nodeId -> StyleResolver::ResolveStyle count
    this.functionCalls = new Map();   // "fn @ url" -> {count,totalUs}
    this.wheelDispatches = [];        // {ts, durUs}
    this.timestamps = [];             // {ts, label}
    this.droppedFrames = 0;
  }
  strIdx(s) { let i = this.strTable.get(s); if (i === undefined) { i = this.strs.length; this.strs.push(s); this.strTable.set(s, i); } return i; }
  handleChunk(value) {
    if (!this.rawFh) { fs.mkdirSync(path.dirname(this.file), { recursive: true }); this.rawFh = fs.openSync(this.file, 'a'); }
    fs.writeSync(this.rawFh, value.map((e) => JSON.stringify(e)).join('\n') + '\n');
    for (const ev of value) {
      if (!ev || typeof ev.name !== 'string') continue;
      this.events++;
      const n = this.nameIdx(ev.name);
      let b = this.byName.get(ev.name);
      if (!b) { b = { count: 0, totalUs: 0 }; this.byName.set(ev.name, b); }
      b.count++;
      if (ev.ph === 'X' && typeof ev.dur === 'number') {
        b.totalUs += ev.dur;
        const tidKey = ev.pid + ':' + ev.tid;
        this.threadOf.set(tidKey, (this.threadOf.get(tidKey) || 0) + ev.dur);
        this.compact.push(ev.ts, ev.dur, n, tidKey);
        if (ev.name === 'UpdateLayoutTree' || ev.name === 'StyleRecalc') {
          const ec = ev.args?.beginData?.elementCount ?? ev.args?.endData?.elementCount ?? ev.args?.elementCount;
          this.styleRecalcs.push({ ts: ev.ts, durUs: ev.dur, elementCount: typeof ec === 'number' ? ec : null, name: ev.name });
        }
        if (ev.name === 'Paint') {
          this.paints.push({ ts: ev.ts, durUs: ev.dur, layerId: ev.args?.data?.layerId ?? null, nodeName: ev.args?.data?.nodeName ? this.strIdx(String(ev.args.data.nodeName).slice(0, 70)) : null });
        }
      }
      if (ev.name === 'EventDispatch' && ev.args?.data?.type === 'wheel') {
        this.wheelDispatches.push({ ts: ev.ts, durUs: ev.dur || 0, tid: ev.pid + ':' + ev.tid });
      }
      if (ev.name === 'TimeStamp' && ev.args?.data) {
        this.timestamps.push({ ts: ev.ts, label: String(ev.args.data.name || ev.args.data.message || '').slice(0, 40) });
      }
      if (ev.name === 'DroppedFrame') this.droppedFrames++;
      const kindIdx = this.invKinds.indexOf(ev.name);
      if (kindIdx >= 0) {
        const d = ev.args?.data || ev.args || {};
        const nodeId = d.nodeId;
        if (typeof nodeId === 'number') {
          this.invTs.push(ev.ts); this.invNode.push(nodeId); this.invKind.push(kindIdx);
          this.invName.push(d.nodeName ? this.strIdx(String(d.nodeName).slice(0, 70)) : -1);
          this.invReason.push(d.reason ? this.strIdx(String(d.reason).slice(0, 48)) : -1);
        }
      }
      if (ev.name === 'StyleResolver::ResolveStyle') {
        const nodeId = ev.args?.data?.nodeId;
        if (typeof nodeId === 'number') this.resolveCounts.set(nodeId, (this.resolveCounts.get(nodeId) || 0) + 1);
      }
      if (ev.name === 'FunctionCall' && ev.ph === 'X') {
        const fn = (ev.args?.data?.functionName || '(anonymous)');
        const url = (ev.args?.data?.url || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 60);
        const k = fn + ' @ ' + url;
        let f = this.functionCalls.get(k);
        if (!f) { f = { count: 0, totalUs: 0 }; this.functionCalls.set(k, f); }
        f.count++; f.totalUs += ev.dur || 0;
      }
    }
  }
  nameIdx(name) { let i = this.nameTable.get(name); if (i === undefined) { i = this.names.length; this.names.push(name); this.nameTable.set(name, i); } return i; }
  finish() {
    if (this.rawFh) { fs.closeSync(this.rawFh); this.rawFh = null; }
    this.fileSize = fs.existsSync(this.file) ? fs.statSync(this.file).size : 0;
  }
}

/** Self-time by event name, computed over the DOMINANT (main) thread only —
 *  compact quads are [ts, dur, nameIdx, tidKey]; the sweep is a classic
 *  containment stack (children subtracted from parents). */
function selfTimeByEvent(tc) {
  let mainTid = null; let max = -1;
  for (const [k, v] of tc.threadOf) if (v > max) { max = v; mainTid = k; }
  if (mainTid === null) return { mainThread: null, top: [] };
  const c = tc.compact;
  const idx = [];
  for (let i = 0; i < c.length; i += 4) {
    if (c[i + 3] !== mainTid) continue;
    if (c[i + 1] <= 0) continue;
    idx.push(i);
  }
  idx.sort((a, b) => (c[a] - c[b]) || (c[b + 1] - c[a + 1]));
  const n = tc.names.length;
  const selfUs = new Float64Array(n);
  const totalUs = new Float64Array(n);
  const counts = new Uint32Array(n);
  const childUs = new Float64Array(idx.length);
  for (let j = 0; j < idx.length; j++) {
    const i = idx[j];
    totalUs[c[i + 2]] += c[i + 1];
    counts[c[i + 2]]++;
  }
  const stack = [];
  for (let j = 0; j < idx.length; j++) {
    const i = idx[j];
    const ts = c[i]; const dur = c[i + 1];
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (c[top] + c[top + 1] <= ts) {
        stack.pop();
        if (stack.length) childUs[stack[stack.length - 1]] += c[top + 1];
      } else break;
    }
    stack.push(i);
  }
  while (stack.length) {
    const top = stack.pop();
    if (stack.length) childUs[stack[stack.length - 1]] += c[top + 1];
  }
  /* re-map childUs (indexed by sorted order) onto the event's compact slot */
  const sortedChild = new Map();
  for (let j = 0; j < idx.length; j++) sortedChild.set(idx[j], childUs[j]);
  for (let j = 0; j < idx.length; j++) {
    const i = idx[j];
    selfUs[c[i + 2]] += Math.max(0, c[i + 1] - (sortedChild.get(i) || 0));
  }
  const top = [];
  for (let i = 0; i < n; i++) {
    if (!counts[i]) continue;
    top.push({ name: tc.names[i], count: counts[i], selfMs: r1(selfUs[i] / 1000), totalMs: r1(totalUs[i] / 1000) });
  }
  top.sort((a, b) => b.selfMs - a.selfMs);
  return { mainThread: mainTid, top: top.slice(0, 30) };
}

/* ── node descriptor maps (CDP DOM agent) ─────────────────────────── */
function walkDomNodes(root, out) {
  if (!root) return;
  const desc = (node) => {
    let s = (node.nodeName || '?').toLowerCase();
    const attrs = node.attributes || [];
    let id = ''; let cls = []; let dataAttrs = [];
    for (let i = 0; i < attrs.length; i += 2) {
      const k = attrs[i]; const v = attrs[i + 1];
      if (k === 'id') id = v;
      else if (k === 'class') cls = String(v).trim().split(/\s+/).slice(0, 3);
      else if (k.startsWith('data-')) dataAttrs.push(k + '=' + String(v).slice(0, 12));
    }
    if (id) s += '#' + id;
    if (cls.length) s += '.' + cls.join('.');
    if (dataAttrs.length) s += '[' + dataAttrs.slice(0, 2).join(' ') + ']';
    return s;
  };
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.nodeId) out.set(node.nodeId, desc(node));
    for (const ch of node.children || []) stack.push(ch);
    /* shadow DOM / template contents are not needed for this census */
  }
}
async function buildNodeIdMap(cdp) {
  const map = new Map();
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    walkDomNodes(root, map);
  } catch { /* DOM agent unavailable */ }
  return map;
}

/* ── the wheel-scroll driver (the human cadence) ──────────────────── */
const NOTCH_PX = 660;     /* ~600–800px per notch */
const NOTCH_GAP_MS = 250; /* ~4 notches/sec */
const NOTCHES = 19;       /* 19 × 660 ≈ 12.5k px — one full descent */

async function driveWheelScroll(page, cdp, hooks = {}) {
  const scrollYSamples = [];
  let bandCensusDone = false;
  for (let i = 0; i < NOTCHES; i++) {
    await page.mouse.wheel(0, NOTCH_PX);
    const sample = await page.evaluate(() => ({ y: Math.round(window.scrollY || 0), t: Math.round(performance.now()) }));
    scrollYSamples.push(sample);
    if (hooks.midBand && !bandCensusDone && hooks.bandTop !== undefined && sample.y > hooks.bandTop + 600) {
      bandCensusDone = true;
      await page.waitForTimeout(450); /* let the glide settle inside the band */
      hooks.midBandPauseMs = await page.evaluate(() => Math.round(performance.now()));
      await hooks.midBand(cdp);
    }
    await page.waitForTimeout(NOTCH_GAP_MS);
  }
  return { scrollYSamples, bandCensusDone };
}

/* ── page-side data collection ────────────────────────────────────── */
const COLLECT_FN = `(() => {
  const W = window.__mdrkPerf || {};
  const nav = (performance.getEntriesByType('navigation')[0] || {});
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  const res = performance.getEntriesByType('resource').map(function (r) {
    return { n: r.name.replace(location.origin, '').slice(0, 90), t: Math.round(r.startTime), d: Math.round(r.duration), s: r.transferSize || 0, it: r.initiatorType };
  }).sort(function (a, b) { return b.d - a.d; });
  const fonts = res.filter(function (r) { return r.n.indexOf('/fonts/') === 0; });
  const checks = {};
  try {
    checks['400-arabic'] = document.fonts.check('400 16px "IBM Plex Sans Arabic"', 'محاضرة');
    checks['500-arabic'] = document.fonts.check('500 16px "IBM Plex Sans Arabic"', 'محاضرة');
    checks['600-arabic'] = document.fonts.check('600 16px "IBM Plex Sans Arabic"', 'محاضرة');
    checks['700-arabic'] = document.fonts.check('700 16px "IBM Plex Sans Arabic"', 'محاضرة');
  } catch (e) {}
  return {
    frameDeltas: W.frameDeltas || [], marks: W.marks || [], longtasks: W.longtasks || [],
    shifts: W.shifts || [], lcps: W.lcps || [], loaf: W.loaf || [], wheelEvents: W.wheelEvents || [],
    fontsReadyAt: W.fontsReadyAt, grbc: W.grbc,
    nav: {
      t0: 0, domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0), loadEvent: Math.round(nav.loadEventEnd || 0),
      responseEnd: Math.round(nav.responseEnd || 0), type: nav.type,
    },
    fcp: fcp ? Math.round(fcp.startTime) : null,
    resources: res.slice(0, 14), fontResources: fonts,
    fontChecks: checks,
    docH: document.documentElement.scrollHeight,
    scrollYEnd: Math.round(window.scrollY || 0),
  };
})()`;

const CENSUS_FN = `(() => {
  const all = document.querySelectorAll('*');
  const out = { totalNodes: all.length, svg: 0, path: 0 };
  let wc = 0, filt = 0, blend = 0, fixed = 0, backdrop = 0, maskCount = 0, contain = 0, contVis = 0;
  const list = [];
  for (const el of all) {
    const tag = el.tagName;
    if (tag === 'svg') out.svg++;
    else if (tag === 'path') out.path++;
    const cs = getComputedStyle(el);
    const reasons = [];
    if (cs.willChange && cs.willChange !== 'auto') { wc++; reasons.push('will-change:' + cs.willChange.slice(0, 20)); }
    if (cs.filter && cs.filter !== 'none') { filt++; reasons.push('filter'); }
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') { blend++; reasons.push('blend'); }
    if (cs.position === 'fixed') { fixed++; reasons.push('fixed'); }
    if (cs.backdropFilter && cs.backdropFilter !== 'none') { backdrop++; reasons.push('backdrop-filter'); }
    if ((cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none')) { maskCount++; reasons.push('mask'); }
    if (cs.contentVisibility === 'auto') contVis++;
    if (cs.contain && cs.contain !== 'none') { contain++; reasons.push('contain:' + cs.contain.slice(0, 20)); }
    if (reasons.length && list.length < 24) list.push((el.tagName.toLowerCase() + '.' + String(el.className || '').trim().split(/\\s+/).slice(0, 2).join('.')) + ' [' + reasons.join(',') + ']');
  }
  out.layers = { willChange: wc, filter: filt, mixBlend: blend, fixed, backdropFilter: backdrop, mask: maskCount, contain, contentVisibilityAuto: contVis };
  out.layerCandidates = list;
  return out;
})()`;

/* ── sessions ─────────────────────────────────────────────────────── */
async function runLoaderOnSession(browser, { tag, net, windowMs }) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'en-US' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await cdp.send('DOM.enable');
  if (net) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: FAST3G.latency, downloadThroughput: FAST3G.download, uploadThroughput: FAST3G.upload });
  }
  /* The R318 §C gate: the entrance NEVER plays on ≤2-core devices
   * (introGate.introEnvironment().lowCores) — this sandbox reports
   * hardwareConcurrency=2, so the loader-ON leg must honestly OVERRIDE
   * the core count (visitors on ≥3-core desktops get the loader; the
   * ≤2-core skip is itself a finding, named in the report). */
  await page.addInitScript(() => {
    try { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); } catch (e) {}
  });
  await page.addInitScript(initScript({ autoStart: true, grbcOn: false }));

  const tc = new TraceCollector(path.join(TRACE_DIR, `trace-1440-loader-on${tag}.jsonl`));
  cdp.on('Tracing.dataCollected', (d) => tc.handleChunk(d.value || d.data || []));
  const traceDone = new Promise((r) => cdp.on('Tracing.tracingComplete', r));

  const result = { session: `s1${tag}`, cpu: CPU, net: net ? 'Fast-3G' : 'none', notes: [] };
  try {
    await cdp.send('Tracing.start', { transferMode: 'ReportEvents', streamFormat: 'json', categories: TRACE_CATEGORIES });
    const navStart = Date.now();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    result.loaderGateProbe = await page.evaluate(() => ({
      cores: navigator.hardwareConcurrency,
      gateOpen: (() => {
        try { return !sessionStorage.getItem('madarek-intro-skip') && !sessionStorage.getItem('madarek-intro-seen'); } catch (e) { return false; }
      })(),
    })).catch(() => null);
    /* loader mount + auto-dismiss + exit */
    const sl = await page.waitForSelector('.sl', { timeout: 30000 }).catch(() => null);
    result.loaderPlayed = !!sl;
    if (sl) {
      result.loaderMountMs = await page.evaluate(() => Math.round(performance.now()));
      await page.waitForFunction(() => !document.querySelector('.sl'), null, { timeout: 120000 }).catch(() => result.notes.push('loader still mounted at end of wait'));
      result.loaderExitMs = await page.evaluate(() => Math.round(performance.now()));
    } else {
      result.notes.push('loader .sl never mounted');
    }
    /* hold the window: first ~25s of document life (the loader curve +
     * entrance + settle) — the loader exit may itself land late under 3G */
    await page.waitForFunction(
      (w) => performance.now() > w && !document.querySelector('.sl'),
      windowMs, { timeout: Math.max(60000, windowMs + 60000) },
    ).catch(() => result.notes.push('25s window wait timed out'));
    await page.waitForTimeout(1500);

    await page.evaluate(() => window.__mdrkPerfStop());
    await cdp.send('Tracing.end');
    await Promise.race([traceDone, new Promise((r) => setTimeout(r, 15000))]);
    tc.finish();

    const data = await page.evaluate(COLLECT_FN);
    const lcp = data.lcps[data.lcps.length - 1] || null;
    result.frames = summarizeFrames(data.frameDeltas);
    result.longtasks = summarizeLongtasks(data.longtasks);
    result.tbtProxy = {
      total: tbtProxy(data.longtasks),
      toLoaderExit: result.loaderExitMs != null ? tbtProxy(data.longtasks, data.fcp ?? 0, result.loaderExitMs) : null,
      postLoader: result.loaderExitMs != null ? tbtProxy(data.longtasks, result.loaderExitMs) : null,
    };
    result.cls = summarizeCls(data.shifts);
    result.clsRaw = { total: summarizeCls(data.shifts, -Infinity, true).total, entries: data.shifts.length };
    result.topShifts = (data.shifts || []).filter((s) => !s.hadInput)
      .sort((a, b) => b.value - a.value).slice(0, 10)
      .map((s) => ({ t: s.t, value: Math.round(s.value * 1000) / 1000, sources: s.sources }));
    result.lcp = lcp ? { ms: lcp.t, element: lcp.node, size: lcp.size } : null;
    result.lcpEntries = data.lcps;
    result.fcp = data.fcp;
    result.nav = data.nav;
    result.fontsReadyAt = data.fontsReadyAt;
    result.fontChecks = data.fontChecks;
    result.fontResources = data.fontResources;
    result.resources = data.resources;
    result.docH = data.docH;
    result.wheelEvents = data.wheelEvents;
    result.loaf = summarizeLoaf(data.loaf);
      /* invalidation + resolve census for the LOAD phase too */
      const invAgg = new Map();
      const kinds = ['style', 'layout', 'styleInvalidator', 'paint'];
      for (let i = 0; i < tc.invTs.length; i++) {
        const kind = kinds[tc.invKind[i]] || 'other';
        const node = tc.invName[i] >= 0 ? tc.strs[tc.invName[i]] : ('nodeId:' + tc.invNode[i]);
        const reason = tc.invReason[i] >= 0 ? tc.strs[tc.invReason[i]] : '(none)';
        const k = node + ' | ' + reason;
        let e = invAgg.get(k);
        if (!e) { e = { node, reason, total: 0, byKind: {} }; invAgg.set(k, e); }
        e.total++;
        e.byKind[kind] = (e.byKind[kind] || 0) + 1;
      }
      /* trace attribution */
      const st = selfTimeByEvent(tc);
      result.trace = {
        events: tc.events, rawDump: tc.file, rawMB: r1(tc.fileSize / 1048576),
        selfTimeTop: st.top.slice(0, 14),
        byNameTop: [...tc.byName.entries()].sort((a, b) => b[1].totalUs - a[1].totalUs).slice(0, 14)
          .map(([name, v]) => ({ name, count: v.count, totalMs: r1(v.totalUs / 1000) })),
        functionCallTop: [...tc.functionCalls.entries()].sort((a, b) => b[1].totalUs - a[1].totalUs).slice(0, 12)
          .map(([k, v]) => ({ fn: k.slice(0, 120), count: v.count, totalMs: r1(v.totalUs / 1000) })),
        invalidations: {
          total: tc.invTs.length,
          topNodes: [...invAgg.values()].sort((a, b) => b.total - a.total).slice(0, 20),
        },
        paints: {
          total: tc.paints.length,
          topNodes: [...tc.paints.reduce((m, p) => {
            const d = p.nodeName != null ? tc.strs[p.nodeName] : '(unknown)';
            m.set(d, (m.get(d) || 0) + 1); return m;
          }, new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([node, count]) => ({ node, paints: count })),
        },
        styleRecalcs: {
          count: tc.styleRecalcs.length,
          totalMs: r1(tc.styleRecalcs.reduce((a, b) => a + b.durUs, 0) / 1000),
          worst: [...tc.styleRecalcs].sort((a, b) => b.durUs - a.durUs).slice(0, 6)
            .map((r) => ({ ts: r.ts, durMs: r1(r.durUs / 1000), elementCount: r.elementCount })),
        },
      };
      result.navStartWall = navStart;
  } catch (e) {
    result.error = String(e).slice(0, 300);
  } finally {
    await ctx.close().catch(() => {});
  }
  return result;
}

async function runScrollSession(browser, { tag, cpu, traced, clean }) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'en-US' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await cdp.send('DOM.enable');
  /* the loader-skip seed BEFORE any app script (the r319/r320 recipe) */
  await ctx.addInitScript(INTRO_SKIP_SEED);
  await ctx.addInitScript(initScript({ autoStart: false, grbcOn: !clean }));

  const result = { session: `s2${tag}`, cpu, traced: !!traced, notes: [] };
  const tc = traced ? new TraceCollector(path.join(TRACE_DIR, `trace-1440-scroll${tag}.jsonl`)) : null;
  if (tc) {
    cdp.on('Tracing.dataCollected', (d) => tc.handleChunk(d.value || d.data || []));
  }
  const traceDone = tc ? new Promise((r) => cdp.on('Tracing.tracingComplete', r)) : null;

  let bandTop = 0; let bandHeight = 0; let vh = VIEWPORT.height;
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('.jt', { timeout: 30000 }).catch(() => result.notes.push('.jt never mounted'));
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
    await page.waitForTimeout(800);
    const geo = await page.evaluate(() => {
      const jt = document.querySelector('.jt');
      if (!jt) return null;
      const r = jt.getBoundingClientRect();
      return { top: Math.round(r.top + window.scrollY), height: Math.round(r.height), vh: window.innerHeight,
               docH: document.documentElement.scrollHeight };
    });
    if (geo) { bandTop = geo.top; bandHeight = geo.height; vh = geo.vh; result.mapBand = geo; }
    result.census = await page.evaluate(CENSUS_FN);

    if (tc) {
      await cdp.send('Tracing.start', { transferMode: 'ReportEvents', streamFormat: 'json', categories: TRACE_CATEGORIES });
    }
    const startMs = await page.evaluate(() => Math.round(performance.now()));
    await page.evaluate(() => window.__mdrkPerfStart());
    await page.evaluate(() => window.__mdrkMark('active-start'));

    const { scrollYSamples } = await driveWheelScroll(page, cdp, {});

    await page.evaluate(() => window.__mdrkMark('active-end'));
    await page.waitForTimeout(1200); /* the Lenis glide tail */
    const endMs = await page.evaluate(() => { window.__mdrkPerfStop(); return Math.round(performance.now()); });

    if (tc) {
      await cdp.send('Tracing.end');
      await Promise.race([traceDone, new Promise((r) => setTimeout(r, 20000))]);
      tc.finish();
    }

    const data = await page.evaluate(COLLECT_FN);
    const mStart = (data.marks || []).find((m) => m.label === 'active-start');
    const mEnd = (data.marks || []).find((m) => m.label === 'active-end');
    const fIdx = (t) => {
      const arr = data.frameDeltas || [];
      for (let i = 0; i < arr.length; i++) if (arr[i].t >= t) return i;
      return arr.length;
    };
    result.frames = summarizeFrames(data.frameDeltas);
    if (mStart && mEnd) {
      result.framesActive = summarizeFrames(data.frameDeltas, fIdx(mStart.t), fIdx(mEnd.t));
      result.activeWindowMs = mEnd.t - mStart.t;
    }
    /* the map-band frame slice: frames whose scrollY sits inside .jt */
    {
      const arr = data.frameDeltas || [];
      const bandFrames = arr.filter((f) => f.y + vh > bandTop && f.y < bandTop + bandHeight).map((f) => f.d);
      result.framesMapBand = summarizeFrames(bandFrames.map((d) => ({ d })));
    }
    result.longtasks = summarizeLongtasks(data.longtasks, mStart ? mStart.t : 0);
    result.cls = { total: summarizeCls(data.shifts).total, interact: summarizeCls(data.shifts, startMs).total };
    result.topShifts = (data.shifts || []).filter((s) => !s.hadInput)
      .sort((a, b) => b.value - a.value).slice(0, 10)
      .map((s) => ({ t: s.t, value: Math.round(s.value * 1000) / 1000, sources: s.sources }));
    result.lcp = data.lcps[data.lcps.length - 1] || null;
    result.loaf = summarizeLoaf(data.loaf);
    result.grbc = data.grbc ? {
      count: data.grbc.count,
      top: Object.entries(data.grbc.bySel || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, c]) => ({ sel: k, reads: c })),
    } : null;
    result.scrollYSamples = scrollYSamples;
    result.wheelEvents = data.wheelEvents;
    result.docH = data.docH;
    result.fontsReadyAt = data.fontsReadyAt;
    result.fontChecks = data.fontChecks;
    result.interactWindowMs = endMs - startMs;

    /* ── trace attribution (the S2 money analysis) ── */
    if (tc) {
      const st = selfTimeByEvent(tc);
      /* page-time ↔ trace-time anchors: wheel EventDispatch pairs */
      const wheels = (data.wheelEvents || []).map((w) => w.t).sort((a, b) => a - b);
      const traceWheels = [...tc.wheelDispatches].sort((a, b) => a.ts - b.ts);
      let offsetUs = null; const pairOffsets = [];
      const k = Math.min(wheels.length, traceWheels.length);
      for (let i = 0; i < k; i++) pairOffsets.push(traceWheels[i].ts - wheels[i] * 1000);
      if (pairOffsets.length >= 3) pairOffsets.sort((a, b) => a - b), offsetUs = pairOffsets[Math.floor(pairOffsets.length / 2)];
      result.traceAnchors = { wheelPairs: k, offsetMs: offsetUs != null ? r1(offsetUs / 1000) : null, spreadMs: pairOffsets.length ? r1((pairOffsets[pairOffsets.length - 1] - pairOffsets[0]) / 1000) : null };
      const pageToTrace = (pageMs) => (offsetUs != null ? pageMs * 1000 + offsetUs : null);

      /* the map band in trace time — from the frame recorder's y track */
      let bandTraceStart = null; let bandTraceEnd = null;
      if (offsetUs != null) {
        const arr = data.frameDeltas || [];
        let lo = Infinity; let hi = -Infinity;
        for (const f of arr) if (f.y + vh > bandTop && f.y < bandTop + bandHeight) { lo = Math.min(lo, f.t); hi = Math.max(hi, f.t); }
        if (hi > lo) { bandTraceStart = pageToTrace(lo); bandTraceEnd = pageToTrace(hi); }
      }
      const inBand = (ts) => bandTraceStart != null && ts >= bandTraceStart && ts <= bandTraceEnd;

      /* invalidation census — node + reason (the events carry their own
       * nodeName descriptor, so no DOM map is needed for these) */
      const invAgg = new Map(); // "node|reason" -> {node, reason, total, inBand, byKind}
      const kinds = ['style', 'layout', 'styleInvalidator', 'paint'];
      const invTotal = tc.invTs.length;
      for (let i = 0; i < invTotal; i++) {
        const ts = tc.invTs[i];
        const kind = kinds[tc.invKind[i]] || 'other';
        const node = tc.invName[i] >= 0 ? tc.strs[tc.invName[i]] : ('nodeId:' + tc.invNode[i]);
        const reason = tc.invReason[i] >= 0 ? tc.strs[tc.invReason[i]] : '(none)';
        const k = node + ' | ' + reason;
        let e = invAgg.get(k);
        if (!e) { e = { node, reason, total: 0, inBand: 0, byKind: {} }; invAgg.set(k, e); }
        e.total++;
        if (inBand(ts)) e.inBand++;
        e.byKind[kind] = (e.byKind[kind] || 0) + 1;
      }
      /* paint census per paint-root node + per layer */
      const paintByNode = new Map(); const paintByLayer = new Map(); const paintMsByNode = new Map();
      let paintsInBand = 0; let paintsOutBand = 0; let paintMsInBand = 0;
      for (const p of tc.paints) {
        if (inBand(p.ts)) { paintsInBand++; paintMsInBand += p.durUs; } else paintsOutBand++;
        const d = p.nodeName != null ? tc.strs[p.nodeName] : '(unknown)';
        paintByNode.set(d, (paintByNode.get(d) || 0) + 1);
        paintMsByNode.set(d, (paintMsByNode.get(d) || 0) + p.durUs);
        if (p.layerId != null) paintByLayer.set(p.layerId, (paintByLayer.get(p.layerId) || 0) + 1);
      }
      /* style RESOLUTION census — the 756-family finally NAMED: which
       * nodes actually resolve style, joined with the DOM-agent map */
      const nodeMap = await buildNodeIdMap(cdp);
      const resolveAgg = new Map(); // nodeDesc -> resolves
      for (const [nodeId, count] of tc.resolveCounts) {
        const d = nodeMap.get(nodeId) || ('nodeId:' + nodeId);
        resolveAgg.set(d, (resolveAgg.get(d) || 0) + count);
      }
      /* style recalc family clustering (the 756-family hunt) */
      const recalcs = tc.styleRecalcs.filter((r) => r.elementCount != null);
      const inBandRecalcs = recalcs.filter((r) => inBand(r.ts));
      const clusters = {};
      for (const r of recalcs) {
        const bucket = r.elementCount >= 2000 ? '2000+' : r.elementCount >= 1000 ? '1000-1999' : r.elementCount >= 700 ? '700-999' : r.elementCount >= 400 ? '400-699' : r.elementCount >= 100 ? '100-399' : '1-99';
        clusters[bucket] = (clusters[bucket] || 0) + 1;
      }
      result.trace = {
        events: tc.events, rawDump: tc.file, rawMB: r1(tc.fileSize / 1048576),
        bandTraceWindowMs: bandTraceStart != null ? { start: r1(bandTraceStart / 1000), end: r1(bandTraceEnd / 1000) } : null,
        selfTimeTop: st.top.slice(0, 16),
        byNameTop: [...tc.byName.entries()].sort((a, b) => b[1].totalUs - a[1].totalUs).slice(0, 16)
          .map(([name, v]) => ({ name, count: v.count, totalMs: r1(v.totalUs / 1000) })),
        functionCallTop: [...tc.functionCalls.entries()].sort((a, b) => b[1].totalUs - a[1].totalUs).slice(0, 14)
          .map(([k, v]) => ({ fn: k.slice(0, 120), count: v.count, totalMs: r1(v.totalUs / 1000) })),
        invalidations: {
          total: invTotal,
          topNodes: [...invAgg.values()].sort((a, b) => b.inBand - a.inBand || b.total - a.total).slice(0, 26),
        },
        resolves: {
          total: [...tc.resolveCounts.values()].reduce((a, b) => a + b, 0),
          distinctNodes: tc.resolveCounts.size,
          topNodes: [...resolveAgg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 26).map(([node, resolves]) => ({ node, resolves })),
        },
        paints: {
          total: tc.paints.length, inBand: paintsInBand, outBand: paintsOutBand, inBandMs: r1(paintMsInBand / 1000),
          distinctLayers: paintByLayer.size,
          topNodes: [...paintByNode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([node, count]) => ({ node, paints: count, ms: r1(paintMsByNode.get(node) / 1000) })),
        },
        styleRecalc: {
          count: tc.styleRecalcs.length,
          totalMs: r1(tc.styleRecalcs.reduce((a, b) => a + b.durUs, 0) / 1000),
          inBandMs: r1(inBandRecalcs.reduce((a, b) => a + b.durUs, 0) / 1000),
          clusters,
          worst: [...recalcs].sort((a, b) => b.durUs - a.durUs).slice(0, 8)
            .map((r) => ({ tsMs: r1(r.ts / 1000), durMs: r1(r.durUs / 1000), elementCount: r.elementCount, inBand: inBand(r.ts) })),
        },
        droppedFrames: tc.droppedFrames,
        wheelDispatchCount: tc.wheelDispatches.length,
      };
    }
  } catch (e) {
    result.error = String(e).slice(0, 300);
  } finally {
    await ctx.close().catch(() => {});
  }
  return result;
}

/* ── main ─────────────────────────────────────────────────────────── */
console.log(`[wp-1e] chromium: ${EXE || '(bundled)'} · base ${BASE} · cpu ${CPU}× · sessions: ${SESSIONS.join(', ')}`);

/* serve dist/ ourselves (IPv4; killed on exit) */
let server = null; let serverKilled = false;
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

try {
  const up = await startServer();
  if (!up) { console.error('[wp-1e] FATAL: vite preview never answered on ' + BASE); process.exit(1); }
  console.log(`[wp-1e] preview up on ${BASE} (pid ${server.pid})`);

  const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
  const out = {
    meta: {
      task: 'r322-c3-WP1e desktop 1440 perf baseline',
      base: BASE, viewport: '1440x900', dsf: 1, locale: 'en-US',
      cpu: CPU, cadence: `${NOTCHES}×${NOTCH_PX}px @${NOTCH_GAP_MS}ms (≈${(NOTCHES * NOTCH_PX / 1000).toFixed(1)}k px)`,
      categories: TRACE_CATEGORIES,
      generatedAt: new Date().toISOString(),
    },
    sessions: {},
  };
  try {
    const { execFileSync } = await import('node:child_process');
    out.meta.head = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']).toString().trim();
  } catch { /* non-fatal */ }

  for (const s of SESSIONS) {
    console.log(`\n[wp-1e] session ${s} …`);
    let r;
    if (s === 's1') r = await runLoaderOnSession(browser, { tag: '', net: false, windowMs: 24000 });
    else if (s === 's1net') r = await runLoaderOnSession(browser, { tag: '-fast3g', net: true, windowMs: 24000 });
    else if (s === 's2') r = await runScrollSession(browser, { tag: '-traced', cpu: CPU, traced: true });
    else if (s === 's2clean') r = await runScrollSession(browser, { tag: '-clean', cpu: CPU, traced: false, clean: true });
    else if (s === 's2native') r = await runScrollSession(browser, { tag: '-native', cpu: 1, traced: false, clean: true });
    else { console.log('unknown session ' + s); continue; }
    out.sessions[s] = r;
    const f = r.frames || {};
    console.log(`  frames ${f.count} · >20ms ${f.pctGt20}% · >33ms ${f.pctGt33}% · p95 ${f.p95} · max ${f.max}` +
      (r.cls ? ` · CLS ${r.cls.total ?? r.cls}` : '') + (r.lcp ? ` · LCP ${r.lcp.ms}ms (${r.lcp.element})` : '') +
      (r.error ? ` · ERROR ${r.error}` : ''));
  }

  await browser.close();
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  /* merge with an existing perf.json so partial re-runs
   * (--sessions …) compose instead of clobbering */
  let merged = out;
  try {
    if (fs.existsSync(OUT_JSON)) {
      const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
      if (prev && prev.sessions) {
        merged = { ...prev, meta: out.meta, sessions: { ...prev.sessions, ...out.sessions } };
      }
    }
  } catch { /* fresh write */ }
  fs.writeFileSync(OUT_JSON, JSON.stringify(merged, null, 1));
  console.log(`\n[wp-1e] wrote ${OUT_JSON} (${r1(fs.statSync(OUT_JSON).size / 1024)}KB)`);
} finally {
  killServer();
  console.log('[wp-1e] preview server killed');
}
