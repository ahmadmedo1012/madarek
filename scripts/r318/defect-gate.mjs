#!/usr/bin/env node
/**
 * defect-gate.mjs — R318 §B — THE DEFECT GATE.
 *
 * A red gate blocks merges. The foreman runs `npm run gate:r318` before
 * EVERY push; any non-skipped check FAIL → fix first, push never.
 *
 * The gate BUILDS NOTHING — it audits an already-built preview:
 *   cd frontend && npx vite build
 *   npx vite preview --port 4180 --strictPort &   # then, from repo root:
 *   node scripts/r318/defect-gate.mjs --skip=ocr,perf   # cycle-1 shape
 *
 * Checks (per viewport × theme, all against the real page):
 *   1 word-integrity — every `.wr`: aria-label == joined words, every
 *     `.wr-w` aria-hidden="true", direction-aware inter-word gap
 *     ≥ 0.15em (RTL: DOM pair A,B → gap = A.left − B.right).
 *   2 contrast — every visible text node vs its effective backdrop
 *     (first opaque ancestor bg wins; translucent/color-mix layers
 *     composite over it), sampled at map-band scrub states 0/0.5/1
 *     (`--jt-p` on `.jt` + `.jt-intro[data-on=on]`, rAF-settled);
 *     WCAG 4.5:1 <24px, 3:1 ≥24px. Unrevealed scrub words must be
 *     masked — a visibly rendered word under 4.5:1 fails.
 *   3 collisions — text-bearing leaf rects must not intersect >2px²
 *     (allowlist scripts/r318/collision-allowlist.json, written
 *     reasons) and must not cross the viewport's left/right edge
 *     (tolerance 0). Decorative aria-hidden markers ('+') excluded.
 *   4 placeholders — body.innerText must not match
 *     /--%|undefined|NaN|lorem|TODO|\[object/i.
 *   5 overflow — documentElement/body scrollWidth must not exceed
 *     clientWidth (protects docH parity ≈12,340 @1440).
 *   6 ocr — footer wordmark must read «مدارك» via tesseract ara+eng at
 *     1440 & 390. `--skip=ocr` → BLOCKED-with-reason: §A6 wordmark
 *     rebuild owned by C3 (later cycle).
 *   7 perf — CPU 4× throttle + rAF-delta sampling during a CDP wheel
 *     scroll of the full page; thresholds ≥98% frames ≤20ms, 0
 *     longtasks >50ms, CLS ≤0.05. `--skip=perf` → BLOCKED-with-reason:
 *     deep perf harness owned by C2 (cycle 2) — scaffold runs when
 *     invoked (--perf or default on).
 *
 * CLI: node scripts/r318/defect-gate.mjs
 *        [--viewports 360,390,768,1024,1440] [--theme light,dark]
 *        [--skip ocr,perf] [--perf] [--base-url http://localhost:4180]
 *        [--out audits/evidence/r318/defect-gate.md]
 * Exit 0 only when every non-skipped check PASSES. Evidence: the
 * markdown (default audits/evidence/r318/defect-gate.md) + JSON twin
 * alongside; OCR shots under <out-dir>/ocr/ (JPEG q70, <150KB).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import {
  containsWordmark,
  contrastRatio,
  normWs,
  parseColor,
  requiredRatio,
  resolveBackdrop,
  compositeOver,
  visualGap,
  lineOverlapRatio,
} from './gate-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TESSDATA_PREFIX = process.env.TESSDATA_PREFIX || '/home/z/.tessdata';
const VIEWPORT_H = { 360: 800, 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const OCR_VIEWPORTS = [1440, 390];
const GAP_EM_MIN = 0.15; // §B: inter-word visual gap ≥ 0.15em
const SCRUB_STATES = [0, 0.5, 1]; // map-band scrub states (--jt-p)
const PLACEHOLDER_RE = /--%|undefined|NaN|lorem|TODO|\[object/ig;

/* ── CLI ────────────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const opt = { viewports: '360,390,768,1024,1440', theme: 'light,dark', skip: new Set(), baseUrl: 'http://localhost:4180', out: 'audits/evidence/r318/defect-gate.md' };
  const next = (i, dflt) => {
    const v = argv[i + 1];
    return v && !v.startsWith('--') ? v : dflt;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const inline = a.includes('=') ? a.slice(a.indexOf('=') + 1) : undefined;
    if (a.startsWith('--viewports')) { opt.viewports = inline ?? next(i, opt.viewports); i += inline ? 0 : 1; }
    else if (a.startsWith('--theme')) { opt.theme = inline ?? next(i, opt.theme); i += inline ? 0 : 1; }
    else if (a.startsWith('--skip')) { const v = inline ?? next(i, ''); (v || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => opt.skip.add(s)); i += inline ? 0 : 1; }
    else if (a.startsWith('--base-url')) { opt.baseUrl = inline ?? next(i, opt.baseUrl); i += inline ? 0 : 1; }
    else if (a.startsWith('--out')) { opt.out = inline ?? next(i, opt.out); i += inline ? 0 : 1; }
    else if (a === '--perf') opt.perf = true; // explicit opt-in (perf is on by default)
  }
  return opt;
}

/* ── in-page collectors ───────────────────────────────────────────────
 * Playwright serializes these by SOURCE: each one must be fully
 * self-contained (no closure over module scope). Shared geometry /
 * visibility logic is deliberately re-inlined per collector. */
const COLLECT_WR = () => [...document.querySelectorAll('.wr')].map((wr) => {
  const words = [...wr.querySelectorAll(':scope > .wr-w')];
  const cs = getComputedStyle(wr);
  return {
    sig: wr.tagName.toLowerCase() + (wr.classList.length ? '.' + [...wr.classList].join('.') : ''),
    aria: wr.getAttribute('aria-label'),
    glued: (wr.textContent || '').replace(/\s+/g, ' ').trim(),
    words: words.map((w) => {
      const inner = w.querySelector('.wr-i') || w;
      const r = w.getBoundingClientRect();
      return { t: (inner.textContent || '').trim(), hidden: w.getAttribute('aria-hidden'), x: r.x, y: r.y, width: r.width, height: r.height };
    }),
    dir: cs.direction,
    fs: parseFloat(cs.fontSize) || 16,
  };
});

const COLLECT_TEXT = () => {
  const isOpaque = (s) => {
    const v = (s || '').trim();
    return /^rgb\(/.test(v) || /^rgba\([^)]*,\s*1\)$/.test(v) || /^color\(srgb [^/]+\)$/.test(v) || /^color\(srgb [^/]*\/\s*1\)$/.test(v) || /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
  };
  const isShown = (el) => {
    try { if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; } catch { if (getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return false; }
    let q = el;
    while (q && q.nodeType === 1) { if (parseFloat(getComputedStyle(q).opacity) < 0.05) return false; q = q.parentElement; }
    return true;
  };
  const clipRect = (el, rect) => {
    let r = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    let p = el.parentElement;
    while (p && p.nodeType === 1) {
      const cs = getComputedStyle(p);
      if (/(hidden|clip|auto|scroll)/.test(cs.overflow + ' ' + cs.overflowX + ' ' + cs.overflowY)) {
        const pr = p.getBoundingClientRect();
        const x1 = Math.max(r.x, pr.x); const y1 = Math.max(r.y, pr.y);
        const x2 = Math.min(r.x + r.width, pr.x + pr.width); const y2 = Math.min(r.y + r.height, pr.y + pr.height);
        if (x2 - x1 <= 0 || y2 - y1 <= 0) return null;
        r = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
      }
      p = p.parentElement;
    }
    return r;
  };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => ((n.nodeValue || '').trim() ? 1 : 2) });
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement;
    if (!el || el.closest('svg') || /^(script|style|noscript)$/.test(el.tagName)) continue;
    /* WCAG 1.4.3 exemption (R318 §B): PURE DECORATION — short glyph
       runs ('+','·','|', rules) inside aria-hidden subtrees carry no
       information (drafting registration marks). Same rule as the
       collision check so the two can never disagree. */
    if (/^[+\-–—|·•*.\s]{1,4}$/.test((n.nodeValue || '').trim()) && el.closest('[aria-hidden="true"]')) continue;
    if (!isShown(el)) continue;
    const base = el.getBoundingClientRect();
    if (base.width < 1 || base.height < 1) continue;
    const r = clipRect(el, base);
    if (!r) continue; // fully clipped — e.g. an unrevealed scrub word behind its mask
    const chain = [];
    let grad = false;
    let q = el;
    while (q && q.nodeType === 1 && chain.length < 40) {
      const cs = getComputedStyle(q);
      if (cs.backgroundImage.includes('gradient')) grad = true;
      chain.push(cs.backgroundColor);
      if (isOpaque(cs.backgroundColor)) break;
      q = q.parentElement;
    }
    const cs = getComputedStyle(el);
    out.push({
      text: (n.nodeValue || '').trim().slice(0, 42),
      sig: el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : ''),
      fg: cs.color,
      fs: cs.fontSize,
      chain,
      grad,
      x: Math.round(r.x),
      y: Math.round(r.y),
    });
  }
  return out;
};

const COLLECT_COLLISIONS = () => {
  const DECOR = /^[+\-–—|·•*.\s]{1,4}$/;
  const isShown = (el) => {
    try { if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; } catch { if (getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return false; }
    let q = el;
    while (q && q.nodeType === 1) { if (parseFloat(getComputedStyle(q).opacity) < 0.05) return false; q = q.parentElement; }
    return true;
  };
  const clipRect = (el, rect) => {
    let r = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    let p = el.parentElement;
    while (p && p.nodeType === 1) {
      const cs = getComputedStyle(p);
      if (/(hidden|clip|auto|scroll)/.test(cs.overflow + ' ' + cs.overflowX + ' ' + cs.overflowY)) {
        const pr = p.getBoundingClientRect();
        const x1 = Math.max(r.x, pr.x); const y1 = Math.max(r.y, pr.y);
        const x2 = Math.min(r.x + r.width, pr.x + pr.width); const y2 = Math.min(r.y + r.height, pr.y + pr.height);
        if (x2 - x1 <= 0 || y2 - y1 <= 0) return null;
        r = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
      }
      p = p.parentElement;
    }
    return r;
  };
  const leaves = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = walker.nextNode())) {
    let hasText = false;
    for (const c of n.childNodes) { if (c.nodeType === 3 && (c.nodeValue || '').trim()) { hasText = true; break; } }
    if (!hasText || n.closest('svg')) continue;
    const text = (n.textContent || '').replace(/\s+/g, ' ').trim();
    if (DECOR.test(text) && n.closest('[aria-hidden="true"]')) continue; // decorative reg-marks ('+')
    if (!isShown(n)) continue;
    const base = n.getBoundingClientRect();
    if (base.width < 1 || base.height < 1) continue;
    const r = clipRect(n, base);
    if (!r) continue;
    leaves.push({ sig: n.tagName.toLowerCase() + (n.classList.length ? '.' + [...n.classList].join('.') : ''), text: text.slice(0, 26), el: n, x: r.x, y: r.y, width: r.width, height: r.height });
  }
  const V = window.innerWidth;
  const edges = [];
  for (const L of leaves) {
    if (L.x < 0 || L.x + L.width > V) edges.push({ sig: L.sig, text: L.text, left: +L.x.toFixed(1), right: +(L.x + L.width).toFixed(1), vw: V });
  }
  const viols = [];
  const areaOf = (A, B) => {
    const w = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
    const h = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
    return w > 0 && h > 0 ? w * h : 0;
  };
  for (let i = 0; i < leaves.length; i += 1) {
    for (let j = i + 1; j < leaves.length; j += 1) {
      const A = leaves[i]; const B = leaves[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      const area = areaOf(A, B);
      if (area > 2) viols.push({ a: A.sig, aText: A.text, b: B.sig, bText: B.text, area: +area.toFixed(1), x: Math.round(Math.max(A.x, B.x)), y: Math.round(Math.max(A.y, B.y)) });
    }
  }
  viols.sort((p, q) => q.area - p.area);
  return { leaves: leaves.length, viols: viols.slice(0, 50), violTotal: viols.length, edges: edges.slice(0, 30), edgeTotal: edges.length };
};

const COLLECT_MISC = () => ({
  overflow: {
    htmlSW: document.documentElement.scrollWidth,
    htmlCW: document.documentElement.clientWidth,
    bodySW: document.body.scrollWidth,
    bodyCW: document.body.clientWidth,
  },
  placeholders: (() => {
    const t = document.body.innerText || '';
    const re = /--%|undefined|NaN|lorem|TODO|\[object/ig;
    const hits = [];
    let m;
    while ((m = re.exec(t)) && hits.length < 8) hits.push({ match: m[0], context: t.slice(Math.max(0, m.index - 12), m.index + 14).replace(/\n/g, ' ') });
    return hits;
  })(),
});

const SET_SCRUB = (p) => {
  /* R318 c2-s1 follow-up: the driver publishes --jt-p on the pin root
     (.jt-pin) — seed BOTH the track and the pin root so the seed always
     wins the cascade (seeding only .jt left the statement box reading
     the pin's own 0 and seeded box-model false hits @1440). */
  for (const sel of ['.jt', '.jt-pin']) {
    const el = document.querySelector(sel);
    if (el) el.style.setProperty('--jt-p', String(p));
  }
  for (const sel of ['.jt-intro', '.jt-intro-m']) {
    const el = document.querySelector(sel);
    if (el) el.dataset.on = 'on';
  }
};

const RAF2 = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));

const PERF_SETUP = () => {
  const g = { on: true, last: 0, frames: [], long: [], cls: 0 };
  window.__gatePerf = g;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > 50) g.long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) g.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  const tick = (t) => { if (!g.on) return; if (g.last) g.frames.push(t - g.last); g.last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};
const PERF_TEARDOWN = () => {
  const g = window.__gatePerf;
  g.on = false;
  const over = (ms) => g.frames.filter((d) => d > ms).length;
  return {
    total: g.frames.length,
    over20: over(20),
    over33: over(33),
    maxFrame: g.frames.length ? Math.round(Math.max(...g.frames)) : 0,
    longTasks: g.long,
    cls: +g.cls.toFixed(4),
  };
};

/* ── browser plumbing ────────────────────────────────────────────────── */
async function newCtx(browser, theme, width, height, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, ...extra });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* storage off */ } // loader bypass (probe recipe)
  });
  await ctx.addInitScript(([t]) => {
    try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t, modeUpdatedAt: 0 }, version: 2 })); } catch { /* storage off */ }
  }, [theme]);
  // Belt & braces (§B): the store's useThemeSync() re-applies the same
  // value on mount, but seed <html data-theme> too so the theme is right
  // even before/if React hydration touches it. tokens.css keys on
  // [data-theme="light"]/[data-theme="dark"] — verified working both ways.
  await ctx.addInitScript(([t]) => {
    try { document.documentElement.dataset.theme = t; } catch { /* no DOM */ }
  }, [theme]);
  return ctx;
}

async function openLanding(ctx, baseUrl) {
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1000); // banner/intro entrance settle
  await page.waitForSelector('.jt', { timeout: 8000 }).catch(() => null);
  await page.waitForSelector('.cb-banner', { timeout: 4500 }).catch(() => null);
  return page;
}

/* ── checks (node-side math over in-page facts) ─────────────────────── */
function checkWordIntegrity(rows) {
  let ariaMissing = 0; let ariaMismatch = 0; let notHidden = 0; let gapFails = 0; let textMismatch = 0;
  const samples = [];
  for (const wr of rows) {
    const expected = normWs(wr.words.map((w) => w.t).join(' '));
    if (!expected) continue;
    if (wr.aria == null) ariaMissing += 1;
    else if (normWs(wr.aria) !== expected) ariaMismatch += 1;
    notHidden += wr.words.filter((w) => w.hidden !== 'true').length;
    // §B 1(a): the DOM textContent itself must equal the aria-label —
    // glued spans (no real space text nodes) are a FAIL, not an info note.
    if (normWs(wr.glued) !== normWs(wr.aria ?? '')) textMismatch += 1;
    const need = GAP_EM_MIN * wr.fs;
    for (let i = 1; i < wr.words.length; i += 1) {
      const a = wr.words[i - 1]; const b = wr.words[i];
      if (lineOverlapRatio(a, b) < 0.5) continue; // wrapped onto another line — not a spacing pair
      const gap = visualGap(a, b, wr.dir);
      if (gap < need) {
        gapFails += 1;
        if (samples.length < 12) samples.push(`«${a.t} ${b.t}» gap ${gap.toFixed(2)}px < ${GAP_EM_MIN}em (${need.toFixed(2)}px) [${wr.dir}] ${wr.sig}`);
      }
    }
  }
  const fails = ariaMissing + ariaMismatch + notHidden + gapFails + textMismatch;
  return { status: fails ? 'FAIL' : 'PASS', wrTotal: rows.length, ariaMissing, ariaMismatch, wordsNotAriaHidden: notHidden, gapFails, textVsAriaMismatch: textMismatch, samples };
}

function checkContrast(textRows, state) {
  const fails = [];
  let unknown = 0; let gradientWarn = 0; let total = 0;
  for (const row of textRows) {
    total += 1;
    const fg = parseColor(row.fg);
    const bg = resolveBackdrop(row.chain);
    if (!fg || !bg) { unknown += 1; continue; }
    if (row.grad) gradientWarn += 1;
    const fs = parseFloat(row.fs) || 16;
    const effFg = fg.a < 1 ? compositeOver(fg, bg) : fg;
    const ratio = contrastRatio(effFg, bg);
    const need = requiredRatio(fs);
    if (ratio < need - 1e-9) {
      fails.push({ ratio: +ratio.toFixed(2), need, fs, text: row.text, sig: row.sig, fg: row.fg, bg: row.chain[0], grad: row.grad, state });
    }
  }
  fails.sort((a, b) => a.ratio - b.ratio);
  return { state, total, unknown, gradientWarn, failCount: fails.length, samples: fails.slice(0, 10) };
}

function checkCollisions(fact, allowlist) {
  const allow = (v) => {
    for (const e of allowlist) {
      if ((e.a === v.a && e.b === v.b) || (e.a === v.b && e.b === v.a)) return e.reason || 'allowlisted';
    }
    return null;
  };
  const kept = [];
  let allowlisted = 0;
  for (const v of fact.viols) {
    const reason = allow(v);
    if (reason) { allowlisted += 1; continue; }
    kept.push(v);
  }
  return {
    status: kept.length || fact.edgeTotal ? 'FAIL' : 'PASS',
    leafCount: fact.leaves,
    overlapFails: kept.length,
    allowlisted,
    edgeCrossings: fact.edgeTotal,
    samples: kept.slice(0, 8).map((v) => `${v.a} «${v.aText}» ✕ ${v.b} «${v.bText}» ${v.area}px² @(${v.x},${v.y})`)
      .concat(fact.edges.slice(0, 6).map((e) => `edge ${e.sig} «${e.text}» x ${e.left}..${e.right} (vw ${e.vw})`)),
  };
}

/* ── cell runner ────────────────────────────────────────────────────── */
async function runCell(browser, opt, { width, theme }) {
  const height = VIEWPORT_H[width] || 900;
  const cell = { viewport: width, theme, checks: {} };
  const ctx = await newCtx(browser, theme, width, height);
  try {
    const page = await openLanding(ctx, opt.baseUrl);
    cell.checks['word-integrity'] = checkWordIntegrity(await page.evaluate(COLLECT_WR));
    const states = [];
    for (const p of SCRUB_STATES) {
      await page.evaluate(SET_SCRUB, p);
      await page.evaluate(RAF2);
      states.push(checkContrast(await page.evaluate(COLLECT_TEXT), p));
    }
    const worst = states.flatMap((s) => s.samples).sort((a, b) => a.ratio - b.ratio);
    cell.checks.contrast = {
      status: states.some((s) => s.failCount) ? 'FAIL' : 'PASS',
      states: states.map((s) => ({ state: s.state, total: s.total, fails: s.failCount, unknownSkipped: s.unknown, gradientWarn: s.gradientWarn })),
      samples: worst.slice(0, 8),
    };
    cell.checks.collisions = checkCollisions(await page.evaluate(COLLECT_COLLISIONS), opt.allowlist);
    const misc = await page.evaluate(COLLECT_MISC);
    cell.checks.placeholders = { status: misc.placeholders.length ? 'FAIL' : 'PASS', matches: misc.placeholders };
    cell.checks.overflow = {
      status: misc.overflow.htmlSW > misc.overflow.htmlCW || misc.overflow.bodySW > misc.overflow.bodyCW ? 'FAIL' : 'PASS',
      ...misc.overflow,
    };
    await page.close();
  } finally {
    await ctx.close();
  }
  if (!OCR_VIEWPORTS.includes(width)) cell.checks.ocr = { status: 'NA' };
  else if (opt.skip.has('ocr')) cell.checks.ocr = { status: 'BLOCKED', reason: 'skipped via --skip=ocr — §A6 wordmark rebuild owned by C3 (later cycle)' };
  else cell.checks.ocr = await runOcr(browser, opt, { width, theme });
  if (opt.skip.has('perf')) cell.checks.perf = { status: 'BLOCKED', reason: 'skipped via --skip=perf — deep perf harness owned by C2 (cycle 2)' };
  else cell.checks.perf = await runPerf(browser, opt, { width, height, theme });
  return cell;
}

/* ── ocr check ──────────────────────────────────────────────────────── */
async function runOcr(browser, opt, { width, theme }) {
  const height = VIEWPORT_H[width] || 900;
  const shotPath = path.join(path.dirname(path.resolve(ROOT, opt.out)), 'ocr', `wordmark-${width}-${theme}.jpg`);
  fs.mkdirSync(path.dirname(shotPath), { recursive: true });
  let read = '';
  let ocrError = null;
  try {
    const ctx = await newCtx(browser, theme, width, height, { deviceScaleFactor: 2 });
    try {
      const page = await openLanding(ctx, opt.baseUrl);
      const el = page.locator('.fo-wordmark .fo-wordmark-svg:visible').first();
      await el.waitFor({ state: 'visible', timeout: 9000 });
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await el.screenshot({ path: shotPath, type: 'jpeg', quality: 70 });
      await page.close();
    } finally {
      await ctx.close();
    }
    for (const psm of [7, 6]) {
      const res = spawnSync('tesseract', [shotPath, 'stdout', '-l', 'ara+eng', '--psm', String(psm)], { env: { ...process.env, TESSDATA_PREFIX }, encoding: 'utf8', timeout: 60000 });
      if (res.stdout && res.stdout.trim()) { read = res.stdout; break; }
      if (res.status !== 0) ocrError = (res.stderr || `tesseract exited ${res.status}`).slice(0, 140);
    }
  } catch (err) {
    ocrError = String(err && err.message ? err.message : err).slice(0, 160);
  }
  const ok = !ocrError && containsWordmark(read);
  return {
    status: ok ? 'PASS' : 'FAIL',
    viewport: width,
    theme,
    shot: path.relative(ROOT, shotPath),
    ocrSample: read.replace(/\s+/g, ' ').trim().slice(0, 80),
    normalizedContainsWordmark: ok,
    error: ocrError,
  };
}

/* ── perf scaffold (C2 owns the deep harness) ───────────────────────── */
async function runPerf(browser, opt, { width, height, theme }) {
  const ctx = await newCtx(browser, theme, width, height);
  try {
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); // CPU 4× throttle
    await page.goto(`${opt.baseUrl}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(800);
    await page.evaluate(PERF_SETUP);
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    const maxScroll = Math.max(0, docH - height);
    await page.mouse.move(width / 2, height / 2);
    const step = Math.max(300, Math.round(maxScroll / 100) || 300);
    let sent = 0;
    for (let guard = 0; guard < 400 && sent < maxScroll; guard += 1) {
      await page.mouse.wheel(0, step); // CDP wheel — real scroll workload
      sent += step;
      await page.waitForTimeout(42);
    }
    await page.waitForTimeout(900); // settle before stopping the sampler
    const m = await page.evaluate(PERF_TEARDOWN);
    const pctLe20 = m.total ? +(((m.total - m.over20) / m.total) * 100).toFixed(1) : 0;
    const status = (m.total < 20 || pctLe20 < 98 || m.longTasks.length > 0 || m.cls > 0.05) ? 'FAIL' : 'PASS';
    return {
      status,
      reason: m.total < 20 ? 'insufficient frames sampled' : undefined,
      frames: m.total,
      pctFramesLe20: pctLe20,
      over20: m.over20,
      over33: m.over33,
      maxFrameMs: m.maxFrame,
      longTasksOver50ms: m.longTasks.length,
      longestTaskMs: m.longTasks.length ? Math.max(...m.longTasks) : 0,
      cls: m.cls,
      thresholds: '≥98% frames ≤20ms · 0 longtasks >50ms · CLS ≤0.05',
    };
  } finally {
    await ctx.close();
  }
}

/* ── report ─────────────────────────────────────────────────────────── */
function sampleOf(name, c) {
  if (name === 'word-integrity') return c.samples.length ? c.samples[0] : '—';
  if (name === 'contrast') { if (!c.samples.length) return '—'; const s = c.samples[0]; return `«${s.text}» ${s.ratio}:1 < ${s.need}:1 (${s.fs}) ${s.sig.slice(0, 26)}`; }
  if (name === 'collisions') return c.samples.length ? c.samples[0] : '—';
  if (name === 'placeholders') return c.matches.length ? `«${c.matches[0].match}» …${c.matches[0].context}…` : '—';
  if (name === 'overflow') return c.status === 'FAIL' ? 'scrollWidth exceeds clientWidth' : '—';
  if (name === 'ocr') return c.status === 'FAIL' ? `ocr «${c.ocrSample}» ${c.error ? '· ' + c.error : ''}` : '—';
  if (name === 'perf') return c.status === 'FAIL' ? (c.reason || c.thresholds) : '—';
  return '—';
}

function writeReport(opt, cells, startedAt) {
  const outPath = path.resolve(ROOT, opt.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const L = [];
  L.push(`# R318 defect gate — ${new Date(startedAt).toISOString()}`, '');
  L.push(`Base \`${opt.baseUrl}\` · Viewports ${opt.viewports} · Themes ${opt.theme} · Skipped: ${[...opt.skip].join(',') || 'none'}`, '');
  L.push('| viewport | theme | check | result | count | worst sample |');
  L.push('|---|---|---|---|---|---|');
  for (const cell of cells) {
    for (const [name, c] of Object.entries(cell.checks)) {
      let count = '—';
      if (name === 'word-integrity' && c.status !== 'PASS') count = [c.ariaMissing && `${c.ariaMissing} aria-missing`, c.ariaMismatch && `${c.ariaMismatch} aria-mismatch`, c.wordsNotAriaHidden && `${c.wordsNotAriaHidden} not-aria-hidden`, c.gapFails && `${c.gapFails} gaps<0.15em`, c.textVsAriaMismatch && `${c.textVsAriaMismatch} text≠aria`].filter(Boolean).join(' · ') || '—';
      if (name === 'contrast') count = c.states.map((s) => `p=${s.state}: ${s.fails}/${s.total}`).join(' · ');
      if (name === 'collisions') count = `${c.overlapFails} overlaps · ${c.edgeCrossings} edge · ${c.allowlisted} allowlisted`;
      if (name === 'placeholders' && c.matches.length) count = `${c.matches.length} matches`;
      if (name === 'overflow') count = `doc ${c.htmlSW}/${c.htmlCW} · body ${c.bodySW}/${c.bodyCW}`;
      if (name === 'ocr' && (c.status === 'PASS' || c.status === 'FAIL')) count = c.error ? 'tesseract-error' : (c.normalizedContainsWordmark ? 'مدارك found' : 'مدارك NOT read');
      if (name === 'perf' && c.status !== 'BLOCKED') count = `${c.pctFramesLe20}% ≤20ms · ${c.longTasksOver50ms} longtasks · CLS ${c.cls}`;
      let sample = String(sampleOf(name, c)).slice(0, 110);
      if (c.status === 'BLOCKED') { count = '—'; sample = c.reason; }
      if (c.status === 'NA') { count = '—'; sample = '—'; }
      L.push(`| ${cell.viewport} | ${cell.theme} | ${name} | ${c.status} | ${count} | ${sample} |`);
    }
  }
  const all = cells.flatMap((c) => Object.values(c.checks));
  const fails = all.filter((c) => c.status === 'FAIL').length;
  const blockedReasons = [...new Set(all.filter((c) => c.status === 'BLOCKED').map((c) => c.reason))];
  L.push('', '## Blocked-with-reason', '');
  blockedReasons.forEach((r) => L.push(`- ${r}`));
  if (!blockedReasons.length) L.push('- (none)');
  L.push('', `**${fails} failing check(s) → exit ${fails ? 1 : 0}** (a red gate blocks merges).`, '');
  fs.writeFileSync(outPath, L.join('\n'));
  fs.writeFileSync(outPath.replace(/\.md$/, '.json'), `${JSON.stringify({ generated: new Date().toISOString(), baseUrl: opt.baseUrl, viewports: opt.viewports, themes: opt.theme, skipped: [...opt.skip], cells, summary: { fails, exit: fails ? 1 : 0 } }, null, 1)}\n`);
  return fails;
}

/* ── main ───────────────────────────────────────────────────────────── */
async function main() {
  const opt = parseArgs(process.argv.slice(2));
  opt.viewports = opt.viewports.split(',').map((v) => parseInt(v, 10)).filter(Boolean);
  opt.theme = opt.theme.split(',').map((t) => t.trim()).filter((t) => t === 'light' || t === 'dark');
  const allowPath = path.join(ROOT, 'scripts/r318/collision-allowlist.json');
  opt.allowlist = fs.existsSync(allowPath) ? (JSON.parse(fs.readFileSync(allowPath, 'utf8')).pairs ?? []) : [];
  const t0 = Date.now();
  process.stderr.write(`[gate] viewports=${opt.viewports.join(',')} themes=${opt.theme.join(',')} skip=${[...opt.skip].join(',') || 'none'} base=${opt.baseUrl}\n`);
  const browser = await chromium.launch();
  const cells = [];
  try {
    for (const theme of opt.theme) {
      for (const width of opt.viewports) {
        process.stderr.write(`[gate] cell ${width}×${VIEWPORT_H[width] || 900} ${theme} …\n`);
        cells.push(await runCell(browser, opt, { width, theme }));
      }
    }
  } finally {
    await browser.close();
  }
  const fails = writeReport(opt, cells, t0);
  process.stderr.write(`[gate] ${fails} failing check(s) in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${opt.out} (+ .json)\n`);
  process.exitCode = fails ? 1 : 0;
}

main().catch((err) => { process.stderr.write(`[gate] fatal: ${err && err.stack ? err.stack : err}\n`); process.exitCode = 2; });
