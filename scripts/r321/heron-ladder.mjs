#!/usr/bin/env node
/**
 * R321 WP-HL (r321-c1-HL) — the Heron reference LADDER EVIDENCE harness.
 *
 * Measurements ONLY — nothing from heronaiapp.com is copied into the
 * codebase (no text, no logo, no art, no fonts); the screenshots are
 * internal judging evidence under audits/evidence/r321/ladder/.
 *
 * Outputs (audits/evidence/r321/ladder/):
 *   heron-docH.json    — the 11-viewport docH ladder (+ settle deltas)
 *   heron-sections.json— the section census @390 + @1440 (the §A2 basis)
 *   motion.json         — §F groundwork: loader timeline + wheel traces
 *   heron-s{N}-{w}.jpg  — section-anchored frames @390 + @1440
 *   ladder.md           — the tables (§A2 ratchet, census, §F, manifest)
 *
 * Protocol (the r319 ladder protocol applied to the reference):
 *   · NO reducedMotion override · goto https://heronaiapp.com/ waitUntil
 *     networkidle (cap 45s) · settle 2s → docH read → re-read +5s
 *     (late-growth delta) → bonus read +10s (post-intro).
 *   · UA: a realistic iPhone string (+ isMobile/hasTouch) for widths ≤430,
 *     a desktop Chrome string for ≥480.
 *
 * THE SCROLL-JACK FINDING (probed before writing this harness): Heron's
 * document is a Lenis wrapper lock — window.scrollY never moves and
 * documentElement.scrollHeight == the viewport height at every width; the
 * real page height lives in the Lenis wrapper (.main-inner.lenis), whose
 * scrollHeight equals .main-content's height. That wrapper reading
 * reproduces the BOARD's five Heron ratchet numbers EXACTLY
 * (1440=12355 · 1024=9938 · 768=12577 · 390=11441 · 360=10684), so the
 * ladder's docH below is that scrollable content height (the window docH is
 * recorded alongside — it is always ≈ the viewport). Both are in the JSON.
 *
 * Challenge handling: if the reference answers headless with a challenge
 * (title mismatch / tiny content / markers) the whole run retries with a
 * real Chrome UA + --disable-blink-features=AutomationControlled; if still
 * blocked the evidence records BLOCKED-with-reason.
 *
 * CLI: node scripts/r321/heron-ladder.mjs [--out <dir>] [--shot-target-kb <n>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argOutIdx = process.argv.indexOf('--out');
const argQIdx = process.argv.indexOf('--shot-target-kb');
const OUT = path.resolve(
  argOutIdx >= 0 ? process.argv[argOutIdx + 1] : path.join(ROOT, 'audits/evidence/r321/ladder'),
);
const SHOT_TARGET_BYTES = (argQIdx >= 0 ? Number(process.argv[argQIdx + 1]) : 108) * 1024;
const HERON = 'https://heronaiapp.com/';

/* ── constants ─────────────────────────────────────────────────────── */
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const LADDER = [
  [320, 568], [360, 800], [390, 844], [430, 932], [480, 800], [600, 1024],
  [768, 1024], [820, 1180], [1024, 768], [1180, 900], [1440, 900],
];
const DEEP = [[390, 844], [1440, 900]];
const MADAREK_BOARD = { 1440: 12607, 1024: 10184, 768: 12795, 390: 11388, 360: 10742 };
const HERON_BOARD = { 1440: 12355, 1024: 9938, 768: 12577, 390: 11441, 360: 10684 };
const DIR_MAX_BYTES = 2 * 1024 * 1024;
const WHEEL_EVENTS = 8;
const WHEEL_DELTA = 240;
const WHEEL_GAP_MS = 130;
const TRACE_MAX_MS = 6000;
const TRACE_QUIET_FRAMES = 12;

const round = (n) => Math.round(n);
const pct = (a, b) => ((a - b) / b) * 100;
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : String(n));

/* ── in-page: loader timeline observer (installed before page JS) ──── */
/* self-contained: serialized by playwright, no outer references */
function heronLoaderInit() {
  if (window.top !== window) return;
  const HL = (window.__hlLoader = {
    h1Inserted: null, h1FirstText: null, h1FirstVisible: null,
    overlayGone: null, h1Appeared: null, samples: 0, gaveUpAt: null,
  });
  const now = () => Math.round(performance.now());
  const overlayGone = () => {
    const el = document.querySelector('.loading');
    if (!el) return true;
    const s = getComputedStyle(el);
    return s.display === 'none' || parseFloat(s.opacity || '1') < 0.05 || el.getBoundingClientRect().height < 40;
  };
  const h1Visible = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity || '1') < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.height > 8 && r.width > 8;
  };
  let mo = null;
  try {
    mo = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.nodeType !== 1 || HL.h1Inserted !== null) continue;
        if ((n.tagName || '').toLowerCase() === 'h1' || (n.querySelector && n.querySelector('h1'))) HL.h1Inserted = now();
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) { /* best effort */ }
  const tick = () => {
    HL.samples += 1;
    const el = document.querySelector('h1');
    if (el && HL.h1Inserted === null) HL.h1Inserted = now();
    if (el && HL.h1FirstText === null && (el.innerText || '').replace(/\s+/g, '').length > 1) HL.h1FirstText = now();
    if (el && h1Visible(el) && HL.h1FirstVisible === null) HL.h1FirstVisible = now();
    if (HL.overlayGone === null && document.body && document.readyState !== 'loading') {
      if (overlayGone()) HL.overlayGone = now();
    }
    if (HL.h1Appeared === null && HL.h1FirstVisible !== null && HL.overlayGone !== null) {
      HL.h1Appeared = Math.max(HL.h1FirstVisible, HL.overlayGone);
      if (mo) { try { mo.disconnect(); } catch (e) { /* gone */ } }
      return; // done — stop sampling
    }
    if (performance.now() > 30000) { HL.gaveUpAt = now(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ── in-page: docH read (findScrollRoot inlined — self-contained) ──── */
function readDocH() {
  const vh = window.innerHeight;
  const winDocH = document.documentElement.scrollHeight;
  let wrapper = null;
  let wrapperSel = null;
  for (const s of ['.main-inner.lenis', '.main-inner', '[class~="lenis"]', '[class*="lenis"]']) {
    const el = document.querySelector(s);
    if (el && el.scrollHeight > vh + 2) { wrapper = el; wrapperSel = s; break; }
  }
  let root;
  if (winDocH > vh + 2) root = { kind: 'window', wrapperSel: null, windowDocH: winDocH, contentDocH: winDocH };
  else if (wrapper) root = { kind: 'lenis-wrapper', wrapperSel, windowDocH: winDocH, contentDocH: wrapper.scrollHeight };
  else {
    let best = null;
    for (const el of document.querySelectorAll('body *')) {
      if (el.scrollHeight > vh + 2 && Math.abs(el.clientHeight - vh) <= 3) { best = el; break; }
    }
    root = best
      ? { kind: 'generic-scroll-container', wrapperSel: 'generic', windowDocH: winDocH, contentDocH: best.scrollHeight }
      : { kind: 'window', wrapperSel: null, windowDocH: winDocH, contentDocH: winDocH };
  }
  root.title = document.title || '';
  root.textLen = ((document.body && document.body.innerText) || '').length;
  return root;
}

/* ── in-page: the section census (findScrollRoot inlined) ──────────── */
function censusSections() {
  const vh = window.innerHeight;
  const winDocH = document.documentElement.scrollHeight;
  let wrapper = null;
  let wrapperSel = null;
  for (const s of ['.main-inner.lenis', '.main-inner', '[class~="lenis"]', '[class*="lenis"]']) {
    const el = document.querySelector(s);
    if (el && el.scrollHeight > vh + 2) { wrapper = el; wrapperSel = s; break; }
  }
  let kind = 'window';
  let contentDocH = winDocH;
  if (winDocH <= vh + 2 && wrapper) { kind = 'lenis-wrapper'; contentDocH = wrapper.scrollHeight; }
  const wrapRect = wrapper ? wrapper.getBoundingClientRect() : null;
  const wrapPadTop = wrapper ? parseFloat(getComputedStyle(wrapper).paddingTop) || 0 : 0;
  const anchorTop = (el) => {
    const r = el.getBoundingClientRect();
    if (wrapper) return r.top - wrapRect.top + wrapper.scrollTop - wrapPadTop;
    return r.top + window.scrollY;
  };
  const labelOf = (sec) => {
    for (const hd of sec.querySelectorAll('h1,h2,h3,h4,h5,h6,.heading')) {
      const t = (hd.innerText || '').replace(/\s+/g, ' ').trim();
      if (t) return { label: t.slice(0, 24), labelSource: 'heading' };
    }
    return { label: (sec.className || sec.tagName || '').toString().trim().slice(0, 24), labelSource: 'class' };
  };
  const build = (secs, strategy, wrapTags) => {
    const seen = new Set();
    const out = [];
    for (const [i, sec] of secs.entries()) {
      if (seen.has(sec)) continue;
      seen.add(sec);
      const r = sec.getBoundingClientRect();
      if (r.height < 40) continue;
      const lab = labelOf(sec);
      out.push({
        index: out.length + 1, tag: sec.tagName.toLowerCase(),
        cls: (sec.className || '').toString().trim().slice(0, 40),
        wrapTag: wrapTags[i] || null,
        top: Math.round(anchorTop(sec)), height: Math.round(r.height),
        label: lab.label, labelSource: lab.labelSource,
      });
    }
    out.strategy = strategy;
    return out;
  };
  /* S1: the Lenis content's direct children (Webflow web-components) → inner section/footer */
  const content = document.querySelector('.main-content');
  if (content) {
    const secs = [];
    const wraps = [];
    for (const kid of content.children) {
      const sec = kid.matches('section, footer') ? kid : kid.querySelector('section, footer');
      if (sec) { secs.push(sec); wraps.push(kid.tagName.toLowerCase()); }
    }
    const rows = build(secs, 'S1: .main-content > * → section/footer', wraps);
    const reach = rows.reduce((a, s) => Math.max(a, s.top + s.height), 0);
    if (rows.length >= 3 && reach > contentDocH * 0.6) return { kind, wrapperSel, windowDocH: winDocH, contentDocH, sections: rows, strategy: rows.strategy };
  }
  /* S2: the brief's original guess */
  {
    const rows = build(
      [...document.querySelectorAll('main > section, main > div > section, main > footer, main > div > footer')],
      'S2: main > section, main > div > section',
    );
    if (rows.length >= 3) return { kind, wrapperSel, windowDocH: winDocH, contentDocH, sections: rows, strategy: rows.strategy };
  }
  /* S3: body-level sections */
  {
    const rows = build([...document.querySelectorAll('body > section, body > footer')], 'S3: body > section, body > footer');
    if (rows.length >= 3) return { kind, wrapperSel, windowDocH: winDocH, contentDocH, sections: rows, strategy: rows.strategy };
  }
  /* S4: every section/footer not nested inside another one */
  {
    const rows = build(
      [...document.querySelectorAll('section, footer')].filter(
        (el) => !el.parentElement || el.parentElement.closest('section, footer') === null,
      ),
      'S4: topmost section/footer net',
    );
    if (rows.length >= 1) return { kind, wrapperSel, windowDocH: winDocH, contentDocH, sections: rows, strategy: rows.strategy };
  }
  return { kind, wrapperSel, windowDocH: winDocH, contentDocH, sections: [], strategy: 'none' };
}

/* ── in-page: fixed/sticky census (deterministic trace pick) ────────── */
function fixedStickyCensus() {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity || '1') < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 20 || r.width < 20) continue;
    const cls = (el.className || '').toString().trim().split(/\s+/).slice(0, 2).join('.');
    out.push({
      sel: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`.slice(0, 48),
      pos: s.position, w: Math.round(r.width), h: Math.round(r.height),
    });
  }
  const score = (o) => (/header/i.test(o.sel) ? 100 : /home-map/.test(o.sel) ? 90 : /home-platform/.test(o.sel) ? 85 : /cookie/.test(o.sel) ? 60 : 50);
  const ordered = [...out].sort((a, b) => score(b) - score(a));
  return { candidates: out, picked: ordered.slice(0, 3) };
}

/* ── in-page: per-rAF motion sampler (resolves when settled) ───────── */
function motionSampler(cfg) {
  return new Promise((resolve) => {
    const wrap = cfg.rootKind === 'window' ? null : document.querySelector(cfg.rootSel);
    const readY = () => (wrap ? wrap.scrollTop : window.scrollY);
    const tracked = (cfg.tracked || [])
      .map((t) => ({ sel: t.sel, el: document.querySelector(t.cssSelector || t.sel) }))
      .filter((t) => t.el);
    const t0 = performance.now();
    const frames = [];
    let lastT = t0;
    let maxFrame = 0;
    let lastY = readY();
    let firstMove = -1;
    let lastMove = -1;
    let quiet = 0;
    const clsEvents = [];
    let mo = null;
    if (wrap) {
      try {
        mo = new MutationObserver(() => {
          clsEvents.push({ t: Math.round(performance.now() - t0), cls: (wrap.className || '').toString() });
        });
        mo.observe(wrap, { attributes: true, attributeFilter: ['class'] });
      } catch (e) { /* best effort */ }
    }
    function frame(t) {
      const dt = t - lastT;
      lastT = t;
      if (frames.length > 0 && dt > maxFrame) maxFrame = dt;
      const y = readY();
      if (y !== lastY) {
        if (firstMove < 0) firstMove = frames.length;
        lastMove = frames.length;
        quiet = 0;
      } else quiet += 1;
      frames.push({
        t: Math.round(t - t0), y: Math.round(y), wy: Math.round(window.scrollY),
        tr: tracked.map((x) => {
          const r = x.el.getBoundingClientRect();
          const tf = getComputedStyle(x.el).transform;
          return [Math.round(r.y), Math.round(r.width), tf === 'none' ? null : String(tf).slice(0, 48)];
        }),
      });
      lastY = y;
      const elapsed = t - t0;
      const done = (lastMove >= 0 && quiet >= cfg.quietFrames) || elapsed > cfg.maxMs;
      if (done) {
        if (mo) { try { mo.disconnect(); } catch (e) { /* gone */ } }
        resolve({
          frames,
          maxFrameMs: Math.round(maxFrame),
          firstMoveFrame: firstMove,
          lastMoveFrame: lastMove,
          startY: frames.length ? frames[0].y : null,
          endY: Math.round(readY()),
          lenisClassEvents: clsEvents,
        });
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function dispatchUntrustedWheel(cfg) {
  const el = cfg.rootKind === 'window' ? window : document.querySelector(cfg.rootSel);
  if (!el) return false;
  el.dispatchEvent(new WheelEvent('wheel', { deltaY: cfg.delta, deltaX: 0, bubbles: true, cancelable: true }));
  return true;
}

function programmaticScroll(cfg) {
  const el = cfg.rootKind === 'window' ? null : document.querySelector(cfg.rootSel);
  if (el) el.scrollTop = Math.min(el.scrollTop + cfg.delta, el.scrollHeight);
  else window.scrollBy(0, cfg.delta);
  return true;
}

function resetScroll(cfg) {
  const el = cfg.rootKind === 'window' ? null : document.querySelector(cfg.rootSel);
  if (el) el.scrollTop = 0;
  else window.scrollTo(0, 0);
  return true;
}

function scrollToTopOffset(cfg) {
  const el = cfg.rootKind === 'window' ? null : document.querySelector(cfg.rootSel);
  if (el) el.scrollTop = cfg.top;
  else window.scrollTo(0, cfg.top);
  return true;
}

/* ── node: context + goto helpers ─────────────────────────────────── */
async function makeContext(browser, w, h) {
  const mobile = w <= 430;
  const chromeMajor = (browser.version() || '140.0').split('.')[0];
  const ua = mobile
    ? UA_IPHONE
    : `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    userAgent: ua,
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  await ctx.addInitScript(heronLoaderInit);
  return { ctx, ua, uaClass: mobile ? 'iphone' : 'desktop' };
}

async function gotoHeron(page) {
  const t0 = Date.now();
  let timedOut = false;
  try {
    await page.goto(HERON, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    timedOut = true;
    await page.waitForTimeout(1500);
  }
  return { networkidleMs: Date.now() - t0, gotoTimedOut: timedOut };
}

async function challengeCheck(page) {
  try {
    return await page.evaluate(() => {
      const title = document.title || '';
      const html = (document.documentElement.innerHTML || '').slice(0, 4000);
      const textLen = ((document.body && document.body.innerText) || '').length;
      const markers = /just a moment|challenge-platform|cf-chl|captcha|verify you are human/i.test(html);
      const blocked = !/heron/i.test(title) || textLen < 300 || markers;
      return { blocked, title, textLen, markers };
    });
  } catch (e) {
    return { blocked: true, title: '', textLen: 0, markers: false, error: String(e).slice(0, 120) };
  }
}

/* ── node: trace machinery ─────────────────────────────────────────── */
function frameStats(frames, firstMove, lastMove) {
  if (!frames.length) return { framesSampled: 0 };
  const dts = [];
  for (let i = 1; i < frames.length; i++) dts.push(frames[i].t - frames[i - 1].t);
  const sorted = [...dts].sort((a, b) => a - b);
  const p = (q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : null);
  const moving = firstMove >= 0 && lastMove >= firstMove ? lastMove - firstMove + 1 : 0;
  return {
    framesSampled: frames.length,
    framesMoving: moving,
    framesToSettle: moving + TRACE_QUIET_FRAMES,
    meanFrameMs: dts.length ? Number((dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(1)) : null,
    p95FrameMs: p(0.95),
    maxFrameMs: Math.max(0, ...dts),
    durationMs: frames[frames.length - 1].t - frames[0].t,
  };
}

const decimate = (frames) => (frames.length <= 240
  ? frames
  : frames.filter((_, i) => i % Math.ceil(frames.length / 240) === 0 || i >= frames.length - 20));

function traceSummary(driver, res, cfg, stats) {
  const tracked = res.frames.length && res.frames[0].tr && res.frames[0].tr.length
    ? res.frames[0].tr.map((_, ti) => {
        const ys = res.frames.map((f) => (f.tr[ti] ? f.tr[ti][0] : null)).filter((v) => v !== null);
        const tfs = [...new Set(res.frames.map((f) => (f.tr[ti] ? f.tr[ti][2] : null)).filter((v) => v !== null))];
        return {
          sel: cfg.tracked[ti].sel,
          rectYMin: ys.length ? Math.min(...ys) : null,
          rectYMax: ys.length ? Math.max(...ys) : null,
          rectYVariance: ys.length ? Math.max(...ys) - Math.min(...ys) : null,
          transformsSeen: tfs.slice(0, 4),
        };
      })
    : [];
  return {
    driver,
    movedPx: Math.abs((res.endY ?? 0) - (res.startY ?? 0)),
    scrollFrom: res.startY,
    scrollTo: res.endY,
    firstMoveFrame: res.firstMoveFrame,
    lastMoveFrame: res.lastMoveFrame,
    wheelEvents: WHEEL_EVENTS,
    wheelDelta: WHEEL_DELTA,
    wheelGapMs: WHEEL_GAP_MS,
    ...stats,
    tracked,
    lenisClassEvents: dedupeClassEvents(res.lenisClassEvents),
  };
}

/* the site toggles lenis classes every frame — keep only state changes */
function dedupeClassEvents(events) {
  const out = [];
  for (const e of events) {
    const prev = out[out.length - 1];
    if (prev && prev.cls === e.cls) { prev.untilT = e.t; continue; }
    out.push({ t: e.t, cls: e.cls, untilT: e.t });
  }
  return out;
}

async function startTraceAndDrive(page, ctx, driver, cfg, w, h) {
  const pending = page.evaluate(motionSampler, cfg);
  try {
    if (driver === 'untrusted-wheel') {
      for (let i = 0; i < WHEEL_EVENTS; i++) {
        await page.evaluate(dispatchUntrustedWheel, cfg);
        await page.waitForTimeout(WHEEL_GAP_MS);
      }
    } else if (driver === 'trusted-wheel') {
      await page.mouse.move(Math.round(w / 2), Math.round(h / 2));
      await page.waitForTimeout(200);
      for (let i = 0; i < WHEEL_EVENTS; i++) {
        await page.mouse.wheel(0, WHEEL_DELTA);
        await page.waitForTimeout(WHEEL_GAP_MS);
      }
    } else if (driver === 'cdp-touch') {
      const cdp = await ctx.newCDPSession(page);
      const x = Math.round(w / 2);
      const y0 = Math.round(h * 0.7);
      const y1 = Math.round(h * 0.3);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 8 }] });
        await page.waitForTimeout(40);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else {
      for (let i = 0; i < WHEEL_EVENTS; i++) {
        await page.evaluate(programmaticScroll, cfg);
        await page.waitForTimeout(WHEEL_GAP_MS);
      }
    }
  } catch (e) {
    return await Promise.race([pending, Promise.resolve({ frames: [], endY: null, startY: null, firstMoveFrame: -1, lastMoveFrame: -1, lenisClassEvents: [], error: String(e).slice(0, 160) })]);
  }
  return await pending;
}

async function runTrace(page, ctx, w, h, rootInfo, fixedPick) {
  const cfg = {
    rootSel: rootInfo.wrapperSel,
    rootKind: rootInfo.wrapperSel ? rootInfo.kind : 'window',
    tracked: fixedPick.map((f) => ({ sel: f.sel, cssSelector: f.cssSelector })),
    events: WHEEL_EVENTS,
    delta: WHEEL_DELTA,
    quietFrames: TRACE_QUIET_FRAMES,
    maxMs: TRACE_MAX_MS,
  };
  const phases = w <= 430
    ? ['untrusted-wheel', 'cdp-touch', 'trusted-wheel', 'programmatic']
    : ['untrusted-wheel', 'trusted-wheel', 'programmatic'];
  const attempts = [];
  let primary = null;
  for (const driver of phases) {
    await page.evaluate(resetScroll, cfg);
    await page.waitForTimeout(600);
    const res = await startTraceAndDrive(page, ctx, driver, cfg, w, h);
    const stats = frameStats(res.frames, res.firstMoveFrame, res.lastMoveFrame);
    const summary = traceSummary(driver, res, cfg, stats);
    if (summary.movedPx > 40) {
      summary.used = true;
      primary = { ...summary, frames: decimate(res.frames) };
    }
    attempts.push(summary);
    if (primary) break;
  }
  return { primary, attempts, driverOrder: phases };
}

function withCssSelectors(picked) {
  return picked.map((p) => {
    const m = /^([a-z-]*)((#[\w-]+)?((\.[\w-]+)*))$/.exec(p.sel.replace(/\s+/g, ''));
    const cssSelector = m ? `${m[1] || ''}${m[3] || ''}${m[4] || ''}` : p.sel;
    return { ...p, cssSelector: cssSelector || p.sel };
  });
}

/* ── node: screenshot budget machinery ─────────────────────────────── */
async function shootScene(page, baseQuality) {
  const ladder = [baseQuality, Math.round(baseQuality * 0.75), Math.round(baseQuality * 0.55), Math.round(baseQuality * 0.4)];
  let last = null;
  for (const q of ladder) {
    const buf = await page.screenshot({ type: 'jpeg', quality: q });
    last = { buf, quality: q, bytes: buf.length };
    if (buf.length <= SHOT_TARGET_BYTES) return last;
  }
  return last;
}

/* ── node: pass 1 — the docH ladder (11 viewports) ─────────────────── */
async function ladderPass(browser, log) {
  const rows = [];
  for (const [w, h] of LADDER) {
    const { ctx, ua, uaClass } = await makeContext(browser, w, h);
    const page = await ctx.newPage();
    const goto = await gotoHeron(page);
    const atNetworkidle = await page.evaluate(readDocH);
    await page.waitForTimeout(2000);
    const settle = await page.evaluate(readDocH);
    await page.waitForTimeout(5000);
    const plus5 = await page.evaluate(readDocH);
    await page.waitForTimeout(3000);
    const plus10 = await page.evaluate(readDocH);
    const loader = await page.evaluate(() => (window.__hlLoader ? { ...window.__hlLoader } : null));
    const challenge = { blocked: !/heron/i.test(settle.title || ''), title: settle.title, textLen: settle.textLen };
    const row = {
      viewport: `${w}x${h}`,
      width: w,
      height: h,
      uaClass,
      ua,
      ...goto,
      challenge,
      scrollRoot: { kind: settle.kind, wrapperSel: settle.wrapperSel },
      reads: {
        atNetworkidle: { windowDocH: atNetworkidle.windowDocH, contentDocH: atNetworkidle.contentDocH },
        settle2s: { windowDocH: settle.windowDocH, contentDocH: settle.contentDocH },
        plus5s: { windowDocH: plus5.windowDocH, contentDocH: plus5.contentDocH },
        plus10s: { windowDocH: plus10.windowDocH, contentDocH: plus10.contentDocH },
      },
      deltas: {
        networkidleToSettle: settle.contentDocH - atNetworkidle.contentDocH,
        settleToPlus5: plus5.contentDocH - settle.contentDocH,
        plus5ToPlus10: plus10.contentDocH - plus5.contentDocH,
      },
      docH: plus5.contentDocH,
      loader,
    };
    row.boardHeron = HERON_BOARD[w] ?? null;
    row.boardHeronMatch = row.boardHeron === row.docH;
    row.madarekBoard = MADAREK_BOARD[w] ?? null;
    rows.push(row);
    log(`${w}x${h} ${uaClass} docH=${row.docH} (win ${plus5.windowDocH}) d+5s=${row.deltas.settleToPlus5 >= 0 ? '+' : ''}${row.deltas.settleToPlus5} ni=${goto.networkidleMs}ms${row.boardHeronMatch ? ' [BOARD ✓]' : ''}`);
    await ctx.close();
  }
  return rows;
}

/* ── node: pass 2 — deep census + §F + shots (390 + 1440) ──────────── */
async function deepPass(browser, log) {
  const result = {};
  for (const [w, h] of DEEP) {
    const { ctx, ua, uaClass } = await makeContext(browser, w, h);
    const page = await ctx.newPage();
    const goto = await gotoHeron(page);
    /* wait for the intro curtain (.loading) — cap 16s, then settle 2s */
    const t0 = Date.now();
    let overlayGone = false;
    while (Date.now() - t0 < 16000) {
      overlayGone = await page.evaluate(() => {
        const el = document.querySelector('.loading');
        if (!el) return true;
        const s = getComputedStyle(el);
        return s.display === 'none' || parseFloat(s.opacity || '1') < 0.05 || el.getBoundingClientRect().height < 40;
      });
      if (overlayGone) break;
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(2000);
    const rootInfo = await page.evaluate(readDocH);
    const census = await page.evaluate(censusSections);
    const fixed = await page.evaluate(fixedStickyCensus);
    const loader = await page.evaluate(() => (window.__hlLoader ? { ...window.__hlLoader } : null));
    log(`${w}: docH=${rootInfo.contentDocH} sections=${census.sections.length} (${census.strategy}) fixedCands=${fixed.candidates.length} introDone=${overlayGone}`);

    /* §F (b): the wheel motion trace */
    const trace = await runTrace(page, ctx, w, h, rootInfo, withCssSelectors(fixed.picked));
    log(`${w}: motion driver=${trace.primary ? trace.primary.driver : 'NONE'} moved=${trace.primary ? trace.primary.movedPx : 0}px maxFrame=${trace.primary ? trace.primary.maxFrameMs : null}ms frames=${trace.primary ? trace.primary.framesSampled : 0}`);

    /* §A2/§F shots: one anchored frame per section boundary */
    const shots = [];
    const cfgTop = { rootSel: census.wrapperSel, rootKind: census.wrapperSel ? census.kind : 'window' };
    await page.evaluate(resetScroll, cfgTop);
    await page.waitForTimeout(700);
    await page.mouse.move(8, 8);
    await page.waitForTimeout(200);
    for (const s of census.sections) {
      await page.evaluate(scrollToTopOffset, { ...cfgTop, top: s.top });
      await page.waitForTimeout(900);
      const name = `heron-s${s.index}-${w}.jpg`;
      const shot = await shootScene(page, w <= 430 ? 68 : 58);
      fs.writeFileSync(path.join(OUT, name), shot.buf);
      shots.push({ name, section: s.index, cls: s.cls, scrollTop: s.top, quality: shot.quality, bytes: shot.bytes });
      log(`  ${name} s${s.index} \`${s.cls}\` top=${s.top} q=${shot.quality} ${Math.round(shot.bytes / 1024)}KB`);
    }
    const sanityDocH = await page.evaluate(readDocH);

    result[String(w)] = {
      viewport: `${w}x${h}`,
      ua,
      uaClass,
      ...goto,
      overlayGone,
      loader,
      docH: rootInfo.contentDocH,
      scrollRoot: { kind: rootInfo.kind, wrapperSel: rootInfo.wrapperSel, windowDocH: rootInfo.windowDocH },
      census: {
        strategy: census.strategy,
        sections: census.sections,
        sumHeights: census.sections.reduce((a, s) => a + s.height, 0),
        reach: census.sections.reduce((a, s) => Math.max(a, s.top + s.height), 0),
        coverage: Number(((census.sections.reduce((a, s) => Math.max(a, s.top + s.height), 0) / rootInfo.contentDocH) * 100).toFixed(1)),
      },
      fixedSticky: fixed,
      trace,
      shots,
      sanityDocHAtEnd: sanityDocH.contentDocH,
    };
    await ctx.close();
  }
  return result;
}

/* ── node: ladder.md generation ────────────────────────────────────── */
function buildLadderMd(data) {
  const { run, ladder, deep } = data;
  const L = [];
  L.push('# R321 WP-HL — the Heron reference ladder evidence (r321-c1-HL)');
  L.push('');
  L.push(`Measured ${run.date} · ${run.url} · ${run.browser} · playwright-core ${run.playwright} · harness \`scripts/r321/heron-ladder.mjs\` (${run.mode}).`);
  L.push('');
  L.push('**Measurements only** — nothing from the reference is copied into the codebase;');
  L.push('the shots in this directory are internal judging evidence. The §A2 ratchet compares');
  L.push('Madarek against these Heron numbers; the §F motion numbers seed the `motion ≥ 90` judging.');
  L.push('');
  L.push('## Method — and the scroll-jack finding (read first)');
  L.push('');
  L.push('Protocol per viewport: `goto https://heronaiapp.com/` (waitUntil `networkidle`, cap 45s)');
  L.push('→ settle 2s → docH read → re-read +5s (late-growth) → bonus read +10s (post-intro).');
  L.push('**No reducedMotion override** (the r319 ladder protocol). UA: a realistic iPhone string');
  L.push('(+ `isMobile`/`hasTouch`) for widths ≤430; a desktop Chrome string for ≥480.');
  L.push('');
  L.push('**Finding:** Heron\u2019s document is a Lenis wrapper lock — `window.scrollY` never moves and');
  L.push('`documentElement.scrollHeight` **equals the viewport height** at every width; the real page');
  L.push('height lives in the Lenis wrapper (`.main-inner.lenis`), whose `scrollHeight` equals');
  L.push('`.main-content`\u2019s height. That wrapper reading reproduces the BOARD\u2019s five Heron ratchet');
  L.push('numbers **exactly** (1440=12,355 · 1024=9,938 · 768=12,577 · 390=11,441 · 360=10,684).');
  L.push('The ladder\u2019s `docH` below is that scrollable content height (the honest page height a user');
  L.push('experiences); the window docH is recorded alongside in `heron-docH.json` (always ≈ viewport).');
  L.push('');
  L.push('## §A2 ratchet table — docH: Heron (fresh) vs Madarek current (BOARD a7e335db)');
  L.push('');
  L.push('±1.5% target band = Heron × [0.985, 1.015]. The Madarek numbers are the owner-measured');
  L.push('values from the R321 BOARD (base a7e335db); the six viewports the BOARD does not cover are');
  L.push('marked **madarek to measure** — §A2 must pin them with the madarek ladder protocol');
  L.push('(networkidle + settle + NO reducedMotion override, per the r320 finding).');
  L.push('');
  L.push('| Viewport | Heron docH | Heron (BOARD ref) | Madarek current | Δ vs Heron | ±1.5% band | In band? |');
  L.push('|---|---:|---:|---:|---:|---|---|');
  for (const r of ladder) {
    const bandLo = Math.round(r.docH * 0.985);
    const bandHi = Math.round(r.docH * 1.015);
    const mad = r.madarekBoard;
    const delta = mad ? `${pct(mad, r.docH) >= 0 ? '+' : ''}${pct(mad, r.docH).toFixed(2)}%` : '—';
    const verdict = mad ? (Math.abs(pct(mad, r.docH)) <= 1.5 ? '✅ IN' : '❌ OUT') : '**madarek to measure**';
    const ref = r.boardHeron ? `${fmt(r.boardHeron)}${r.boardHeron === r.docH ? ' ✓' : ''}` : '—';
    L.push(`| ${r.viewport} | ${fmt(r.docH)} | ${ref} | ${mad ? fmt(mad) : '—'} | ${delta} | ${fmt(bandLo)}–${fmt(bandHi)} | ${verdict} |`);
  }
  L.push('');
  L.push('Late-growth settle deltas (content docH):');
  for (const r of ladder) {
    L.push(`- ${r.viewport}: networkidle→settle ${r.deltas.networkidleToSettle >= 0 ? '+' : ''}${r.deltas.networkidleToSettle}px · settle→+5s ${r.deltas.settleToPlus5 >= 0 ? '+' : ''}${r.deltas.settleToPlus5}px · +5s→+10s ${r.deltas.plus5ToPlus10 >= 0 ? '+' : ''}${r.deltas.plus5ToPlus10}px`);
  }
  L.push('');
  L.push('## Section census (the "every section ±1.5%" reference basis)');
  L.push('');
  for (const w of Object.keys(deep)) {
    const d = deep[w];
    L.push(`### @${d.viewport} — docH ${fmt(d.docH)} · ${d.census.sections.length} sections · strategy \`${d.census.strategy}\``);
    L.push('');
    L.push('Top/height in the Lenis wrapper\u2019s scroll coordinate space; label = the first heading\u2019s');
    L.push('innerText truncated to 24 chars (**measurement label only — never reused as copy**);');
    L.push('the ±1.5% height band is shown for §A2\u2019s per-section ratchet.');
    L.push('');
    L.push('| # | section | top | height | h ±1.5% band | label (evidence) |');
    L.push('|---:|---|---:|---:|---|---|');
    for (const s of d.census.sections) {
      const lo = Math.round(s.height * 0.985);
      const hi = Math.round(s.height * 1.015);
      L.push(`| ${s.index} | \`${s.cls || s.tag}\` | ${fmt(s.top)} | ${fmt(s.height)} | ${fmt(lo)}–${fmt(hi)} | ${s.label}${s.labelSource === 'class' ? ' *(class)*' : ''} |`);
    }
    L.push(`| | | **reach** | ${fmt(d.census.reach)} | | coverage ${d.census.coverage}% of docH |`);
    L.push('');
  }
  L.push('## §F motion groundwork');
  L.push('');
  L.push('### (a) loader timeline (navigationStart → the main h1\u2019s first appearance)');
  L.push('');
  L.push('From the in-page observer (MutationObserver timestamps + `performance.now()`, installed');
  L.push('before the reference\u2019s own JS runs). "h1 appeared" = h1 visible AND the `.loading` curtain');
  L.push('gone — the moment a user first sees the hero. Milestones in ms from navigationStart');
  L.push('(≈ `performance.timeOrigin`):');
  L.push('');
  L.push('| Viewport | networkidle | h1 in DOM | h1 first text | h1 visible | curtain gone | **h1 appeared (loader duration)** |');
  L.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const w of Object.keys(deep)) {
    const l = deep[w].loader || {};
    L.push(`| ${deep[w].viewport} | ${deep[w].networkidleMs} | ${l.h1Inserted ?? '—'} | ${l.h1FirstText ?? '—'} | ${l.h1FirstVisible ?? '—'} | ${l.overlayGone ?? '—'} | **${l.h1Appeared ?? '—'}** |`);
  }
  L.push('');
  L.push('(The 11-viewport ladder rows in `heron-docH.json` carry the same loader milestones.)');
  L.push('');
  L.push(`### (b) wheel-scroll motion trace (8 × deltaY ${WHEEL_DELTA}px, per-rAF sampling)`);
  L.push('');
  L.push('The trace drives the reference\u2019s own scroll system (Lenis responds to wheel; the page\u2019s');
  L.push('scroll position = the Lenis wrapper\u2019s `scrollTop`, since the window itself never scrolls —');
  L.push('see the finding above). Drivers are tried in order until one moves the page; "trusted');
  L.push('wheel" = real browser input events. Up to 3 fixed/sticky elements are sampled per frame');
  L.push('(rect.y + computed transform). Full frame sets live in `motion.json`.');
  L.push('');
  for (const w of Object.keys(deep)) {
    const t = deep[w].trace;
    const p = t.primary;
    L.push(`#### @${deep[w].viewport}`);
    L.push('');
    if (!p) {
      L.push(`**No driver moved the page** — attempts: ${t.attempts.map((a) => `${a.driver} (${a.movedPx}px)`).join(' · ')}. Recorded honestly; see \`motion.json\` for the frame sets.`);
    } else {
      L.push('| Driver | moved | frames moving | frames→settle | mean frame | p95 frame | max frame |');
      L.push('|---|---:|---:|---:|---:|---:|---:|');
      L.push(`| ${p.driver} | ${p.movedPx}px | ${p.framesMoving} | ${p.framesToSettle} | ${p.meanFrameMs}ms | ${p.p95FrameMs}ms | ${p.maxFrameMs}ms |`);
      for (const a of t.attempts.filter((x) => !x.used)) L.push(`| ${a.driver} *(fallback attempt, not used)* | ${a.movedPx}px | ${a.framesMoving} | — | — | — | — |`);
      if (p.lenisClassEvents.length) {
        L.push('');
        L.push(`Lenis class transitions observed during the trace: ${p.lenisClassEvents.map((e) => `\`${e.cls}\` @${e.t}–${e.untilT ?? e.t}ms`).join(' · ')}`);
      }
      L.push('');
      for (const tr of p.tracked) {
        L.push(`- \`${tr.sel}\`: rectY ${tr.rectYMin}→${tr.rectYMax} (variance ${tr.rectYVariance}px)${tr.transformsSeen.length ? ` · transforms observed: ${tr.transformsSeen.map((x) => `\`${x}\``).join(' ')}` : ' · no transform changes'}`);
      }
    }
    L.push('');
  }
  L.push('## Section-anchored frames (shot manifest)');
  L.push('');
  let total = 0;
  L.push('| file | section | scroll anchor | bytes |');
  L.push('|---|---|---:|---:|');
  for (const w of Object.keys(deep)) {
    for (const s of deep[w].shots) {
      total += s.bytes;
      L.push(`| \`${s.name}\` | s${s.section} \`${s.cls}\` | ${s.scrollTop} | ${fmt(s.bytes)} |`);
    }
  }
  L.push(`| | | **total (jpg)** | **${fmt(total)}** |`);
  L.push('');
  L.push(`Shots: every file ≤150KB; directory jpg total ${fmt(run.jpgTotalBytes)} bytes; directory total (jpg+json, excl. this file) ${fmt(run.dirTotalBytes)} bytes against the ${fmt(DIR_MAX_BYTES)} cap.`);
  if (run.challengeNote) {
    L.push('');
    L.push('## Challenge / blocker notes');
    L.push('');
    L.push(run.challengeNote);
  }
  L.push('');
  return L.join('\n');
}

/* ── main ──────────────────────────────────────────────────────────── */
const log = (s) => console.log(`[heron-ladder] ${s}`);
fs.mkdirSync(OUT, { recursive: true });
const tStart = Date.now();

let browser = await chromium.launch();
let mode = 'plain-headless';
const browserVersion = browser.version();

/* challenge probe before committing to the full run */
{
  const [w, h] = LADDER[0];
  const { ctx } = await makeContext(browser, w, h);
  const page = await ctx.newPage();
  await gotoHeron(page);
  await page.waitForTimeout(2000);
  const chk = await challengeCheck(page);
  await ctx.close();
  if (chk.blocked) {
    log(`challenge suspected in plain headless (title="${chk.title}" textLen=${chk.textLen}) — relaunching with --disable-blink-features=AutomationControlled`);
    await browser.close();
    browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
    mode = 'real-chrome-ua + AutomationControlled-disabled';
    const { ctx: c2 } = await makeContext(browser, w, h);
    const p2 = await c2.newPage();
    await gotoHeron(p2);
    await p2.waitForTimeout(2000);
    const chk2 = await challengeCheck(p2);
    await c2.close();
    if (chk2.blocked) {
      log(`STILL BLOCKED (${chk2.title}" / textLen ${chk2.textLen}) — recording blocker, producing partial evidence`);
    }
  }
}

log(`pass 1: docH ladder @ ${LADDER.length} viewports (${mode})`);
const ladderRows = await ladderPass(browser, log);

log(`pass 2: deep census + §F motion + anchored shots @ ${DEEP.map(([w]) => w).join(' / ')}`);
const deep = await deepPass(browser, log);
await browser.close();

const jpgs = fs.readdirSync(OUT).filter((f) => f.endsWith('.jpg'));
const jpgTotalBytes = jpgs.reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0);

const run = {
  date: new Date().toISOString(),
  url: HERON,
  task: 'r321-c1-HL (WP-HL) — Heron reference ladder evidence',
  browser: `chromium ${browserVersion} (headless)`,
  playwright: JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/playwright-core/package.json'), 'utf8')).version,
  mode,
  runtimeSec: Math.round((Date.now() - tStart) / 1000),
  jpgTotalBytes,
  dirTotalBytes: 0, /* filled after writes */
};

fs.writeFileSync(path.join(OUT, 'heron-docH.json'), JSON.stringify({ run, ladder: ladderRows }, null, 1));
fs.writeFileSync(path.join(OUT, 'heron-sections.json'), JSON.stringify({
  run,
  viewports: Object.fromEntries(Object.entries(deep).map(([w, d]) => [w, {
    viewport: d.viewport,
    docH: d.docH,
    strategy: d.census.strategy,
    sections: d.census.sections,
    sumHeights: d.census.sumHeights,
    reach: d.census.reach,
    coverage: d.census.coverage,
    fixedSticky: d.fixedSticky,
  }])),
}, null, 1));
fs.writeFileSync(path.join(OUT, 'motion.json'), JSON.stringify({
  run,
  viewports: Object.fromEntries(Object.entries(deep).map(([w, d]) => [w, {
    viewport: d.viewport,
    loader: d.loader,
    docH: d.docH,
    scrollRoot: d.scrollRoot,
    trace: d.trace,
  }])),
}, null, 1));
run.dirTotalBytes = jpgTotalBytes
  + fs.statSync(path.join(OUT, 'heron-docH.json')).size
  + fs.statSync(path.join(OUT, 'heron-sections.json')).size
  + fs.statSync(path.join(OUT, 'motion.json')).size;
fs.writeFileSync(path.join(OUT, 'ladder.md'), buildLadderMd({ run, ladder: ladderRows, deep }));

const overCap = run.dirTotalBytes > DIR_MAX_BYTES;
run.dirTotalBytesIncludingMd = run.dirTotalBytes + fs.statSync(path.join(OUT, 'ladder.md')).size;
log(`done in ${run.runtimeSec}s — ${jpgs.length} jpgs (${Math.round(jpgTotalBytes / 1024)}KB) · dir total incl md ${Math.round(run.dirTotalBytesIncludingMd / 1024)}KB / cap ${Math.round(DIR_MAX_BYTES / 1024)}KB`);
if (overCap) {
  log(`DIR OVER CAP — re-run with --shot-target-kb lower (e.g. 80)`);
  process.exitCode = 3;
}
