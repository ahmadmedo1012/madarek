#!/usr/bin/env node
/* eslint-disable */
/**
 * run.mjs — R329 M1b — the Madarek⇄Heron fidelity metric.
 *
 * Scores Madarek's public pages against the LIVE Heron reference captured by
 * scripts/fidelity/heron-extract.mjs into docs/redesign/r329/heron-live/
 * (10 pages × 4 viewports; geometry + computed styles + motion facts; text
 * never copied — see that script's IP policy).
 *
 * WHAT IT DOES (per page × viewport × theme):
 *   1. boots/reuses Madarek's vite dev server on :5175 (public pages render
 *      without a backend),
 *   2. captures Madarek with the SAME probe family as the reference
 *      extractor — sections (rects + computed styles + heading metadata +
 *      hairline/radius census), rhythm, type ladder, fonts, motion census,
 *      and a trusted-wheel scroll-feel trace fitted to an exponential decay
 *      — under the project's measurement hygiene:
 *        · fresh context per combo, serviceWorkers:'block',
 *        · theme forced BEFORE load via addInitScript (madarek-theme +
 *          mdrk-theme-profile), consent banner pre-accepted (madarek.consent),
 *        · the page is traversed ONCE (stepwise to bottom, back to top) via
 *          window.__mdrkLenis.scrollTo(y,{immediate:true}) so content-
 *          visibility / reveal-in-view states settle before any measurement,
 *        · the Lenis engine is stopped before the full-page screenshot so it
 *          cannot snap the scroll back mid-stitch.
 *   3. aligns Madarek sections to the reference by ORDER + ROLE (documented
 *      DP below) and scores 5 axes (0–100): type-scale ladder, spacing/
 *      rhythm, color/contrast, geometry, motion — see README.md for the
 *      exact formulas and tolerances.
 *   4. emits:
 *        docs/redesign/r329/fidelity/<page>.json     full per-combo results
 *        docs/redesign/r329/fidelity/summary.md      the aggregate tables
 *        docs/redesign/r329/fidelity/contact/*.jpg   Heron|Madarek sheets (q80)
 *        docs/redesign/r329/fidelity/diff/*.png      pixelmatch diff images
 *
 * The pixel diff is EVIDENCE, not a score: the two sites carry different
 * content/languages, so raw pixel equality is neither expected nor aimed
 * for; the 5 axes are the design-language metric.
 *
 * Usage:
 *   node scripts/fidelity/run.mjs                          # full baseline set
 *   node scripts/fidelity/run.mjs --page / --viewport 1440 --theme light
 *   node scripts/fidelity/run.mjs --page home --theme dark # slug aliases work
 *   node scripts/fidelity/run.mjs --no-sheets --no-diff    # scores only
 *
 * Deterministic: fixed viewports/themes/order, animations disabled at
 * screenshot time, no network beyond localhost (+ the already-captured
 * reference JSONs — heronaiapp.com is NEVER contacted by this script).
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/* ── paths + CLI ──────────────────────────────────────────────────── */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const REF_DIR = path.join(ROOT, 'docs', 'redesign', 'r329', 'heron-live');
const OUT_DIR = path.join(ROOT, 'docs', 'redesign', 'r329', 'fidelity');
const TMP_DIR = '/tmp/mdrk-fidelity';
const BASE_URL = process.env.FIDELITY_BASE_URL || 'http://localhost:5175';
const TMP_PORT = 5180;

const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf('--' + name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  const pref = args.find((a) => a.startsWith('--' + name + '='));
  return pref ? pref.split('=').slice(1).join('=') : null;
};
const pageArg = argOf('page');
const vpArg = argOf('viewport');
const themeArg = argOf('theme');
const WANT_SHEETS = !args.includes('--no-sheets');
const WANT_DIFF = !args.includes('--no-diff');

/* Madarek route → Heron reference slug. Rationale in README.md §mapping. */
const PAGE_MAP = [
  { route: '/', slug: 'home', ref: 'home', why: 'homepage ↔ homepage' },
  { route: '/login', slug: 'login', ref: 'contact-us', why: 'the reference has no auth page; contact-us is its only form-centric page' },
  { route: '/about', slug: 'about', ref: 'about-us', why: 'name-matched about pages' },
  { route: '/help', slug: 'help', ref: 'resources', why: 'help/FAQ sheet ↔ resources/docs page' },
  { route: '/app', slug: 'app', ref: 'pricing', why: 'the “obtain the product” page (plans ↔ app download/update channels)' },
];
const VIEWPORTS = [
  { label: '1440', w: 1440, h: 900 },
  { label: '1024', w: 1024, h: 768 },
  { label: '768', w: 768, h: 1024 },
  { label: '390', w: 390, h: 844 },
];
const THEMES = ['light', 'dark'];

const PAGES = PAGE_MAP.filter((p) => !pageArg || pageArg === p.route || pageArg === p.slug || pageArg === p.ref);
const VPS = VIEWPORTS.filter((v) => !vpArg || v.label === String(vpArg));
const THEMES_RUN = THEMES.filter((t) => !themeArg || t === themeArg);
if (!PAGES.length) { console.error('unknown --page:', pageArg); process.exit(1); }
if (!VPS.length) { console.error('unknown --viewport:', vpArg, '(1440|1024|768|390)'); process.exit(1); }
if (!THEMES_RUN.length) { console.error('unknown --theme:', themeArg, '(light|dark)'); process.exit(1); }

fs.mkdirSync(path.join(OUT_DIR, 'contact'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'diff'), { recursive: true });
fs.mkdirSync(path.join(TMP_DIR, 'shots'), { recursive: true });

/* ── color helpers (sRGB → Lab D65, WCAG) ─────────────────────────── */

function parseColor(str) {
  if (!str) return null;
  const m = String(str).match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
}
const ln = Math.log;
function srgbToLab(c) {
  const f = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [f(c.r), f(c.g), f(c.b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const g = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [g(X), g(Y), g(Z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}
function deltaE(c1, c2) {
  const A = srgbToLab(c1), B = srgbToLab(c2);
  return Math.sqrt((A.L - B.L) ** 2 + (A.a - B.a) ** 2 + (A.b - B.b) ** 2);
}
function relLum(c) {
  const f = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function contrastRatio(fg, bg) {
  const l1 = relLum(fg), l2 = relLum(bg);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* The paper color: body bg, else html bg, else the dominant effective bg
 * behind text (Heron's body is transparent — the paper sits elsewhere). */
function paperColor(doc) {
  for (const c of [doc.bodyBg, doc.htmlBg]) {
    const p = parseColor(c);
    if (p && p.a > 0) return p;
  }
  const counts = new Map();
  for (const s of doc.sections || []) {
    for (const t of s.textEls || []) {
      if (t.bgEff) counts.set(t.bgEff, (counts.get(t.bgEff) || 0) + 1);
    }
  }
  let best = null;
  for (const [k, v] of counts) if (!best || v > best.v) best = { k, v };
  return best ? (parseColor(best.k) || { r: 255, g: 255, b: 255 }) : { r: 255, g: 255, b: 255 };
}
/* relative-deviation score: 1 at parity, 0 at dev ≥ tol */
const scoreDev = (dev, tol) => clamp01(1 - dev / tol);
const scoreE = (d) => clamp01(1 - d / 60); /* ΔE: 0 at ΔE≥60 */
const LN_175 = ln(1.75);
const LN_25 = ln(2.5);
const LN_2 = ln(2);
const LN_18 = ln(1.8);

/* ── scroll decay fit (identical model to heron-extract.mjs) ──────── */

function fitDecay(samples) {
  if (!samples || samples.length < 8) return { tauMs: null, error: 'too-few-samples' };
  const y0 = samples[0][1];
  const yEnd = samples[samples.length - 1][1];
  const moved = yEnd - y0;
  if (moved < 5) return { tauMs: null, moved: Math.round(moved), error: 'no-movement (native instant or blocked)' };
  let iStart = samples.findIndex((s) => Math.abs(s[1] - y0) > 1);
  if (iStart < 0) iStart = 0;
  const t0 = samples[iStart][0];
  const yEndMax = Math.max(...samples.map((s) => s[1]));
  const pts = [];
  for (let i = iStart; i < samples.length; i++) {
    const [t, y] = samples[i];
    const res = yEndMax - y;
    if (res > 0.5) pts.push([t - t0, Math.log(res)]);
  }
  if (pts.length < 6) return { tauMs: null, moved: Math.round(moved), error: 'instant (no measurable smoothing)' };
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p[0], 0);
  const sy = pts.reduce((a, p) => a + p[1], 0);
  const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0);
  const sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return { tauMs: null, moved: Math.round(moved), error: 'degenerate-fit' };
  const slope = (n * sxy - sx * sy) / denom;
  if (slope >= -1e-6) return { tauMs: null, moved: Math.round(moved), error: 'non-decay' };
  const tau = -1 / slope;
  const intercept = (sy - slope * sx) / n;
  const meanY = sy / n;
  let ssTot = 0, ssRes = 0;
  for (const [x, y] of pts) { ssTot += (y - meanY) ** 2; ssRes += (y - (intercept + slope * x)) ** 2; }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const lerpPerFrame = 1 - Math.exp(-16.7 / tau);
  return { tauMs: Math.round(tau * 10) / 10, lerpPerFrame: Math.round(lerpPerFrame * 1000) / 1000, r2: Math.round(r2 * 1000) / 1000, moved: Math.round(moved), nPts: n };
}

/* ── in-page probes (Madarek flavor of the heron-extract family) ───── */

const PROBE_LIB = () => {
  window.__fq = {
    readY() { return window.scrollY; },
    maxScroll() {
      const se = document.scrollingElement || document.documentElement;
      return Math.max(0, se.scrollHeight - window.innerHeight);
    },
    effectiveHeight(el) {
      let cur = el;
      for (let i = 0; i < 6; i++) {
        if (getComputedStyle(cur).display === 'none') return 0;
        const r = cur.getBoundingClientRect();
        if (r.height > 8) return r.height;
        const kids = [...cur.children];
        if (kids.length === 1) { cur = kids[0]; continue; }
        if (kids.length > 1) return Math.max(0, ...kids.map((k) => this.effectiveHeight(k)));
        return 0;
      }
      return 0;
    },
    resolveContent(el) {
      let cur = el;
      for (let i = 0; i < 6; i++) {
        if (cur.getBoundingClientRect().height > 8) return cur;
        const kids = [...cur.children];
        if (kids.length === 1) { cur = kids[0]; continue; }
        return cur;
      }
      return cur;
    },
    /* Madarek sections = direct sizable children of <main> + the page
     * <footer> when it lives outside <main> (mirrors Heron's content
     * container, whose children include footer-wrap). */
    findSections() {
      const main = document.querySelector('main');
      const footer = document.querySelector('footer');
      if (main) {
        const kids = [...main.children].filter((el) => this.effectiveHeight(el) > 8);
        if (footer && !main.contains(footer)) kids.push(footer);
        return { container: 'main' + (main.className ? '.' + String(main.className).split(/\s+/)[0] : ''), kids };
      }
      let container = document.body;
      for (let i = 0; i < 6; i++) {
        const kids = [...container.children].filter((el) => this.effectiveHeight(el) > 8);
        if (kids.length >= 3) return { container: container.tagName.toLowerCase(), kids };
        const biggest = kids.slice().sort((a, b) => this.effectiveHeight(b) - this.effectiveHeight(a))[0];
        if (!biggest || biggest === container) break;
        container = biggest;
      }
      return { container: 'body', kids: [...container.children].filter((el) => this.effectiveHeight(el) > 8) };
    },
    textMeta(n, cs, r) {
      const raw = (n.textContent || '').replace(/\s+/g, ' ').trim();
      const idx = raw.match(/\[(\d{1,2})\]/);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
      return {
        role: n.tagName === 'H1' ? 'h1' : n.tagName === 'H2' ? 'h2' : n.tagName === 'H3' || n.tagName === 'H4' ? 'h3'
          : n.tagName === 'H5' || n.tagName === 'H6' ? 'h5' : n.tagName === 'P' ? 'p'
          : n.tagName === 'A' ? 'link' : n.tagName === 'BUTTON' ? 'button' : n.tagName === 'LI' ? 'li' : 'span',
        charCount: raw.length,
        lineCount: Math.max(1, Math.round(r.height / Math.max(1, lh))),
        indexLabel: idx ? idx[1] : null,
        style: {
          fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing,
          ff: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          color: cs.color, tt: cs.textTransform, bg: cs.backgroundColor,
        },
        rect: null,
      };
    },
    isTextElement(n) {
      if (!/^H[1-6]|P|A|BUTTON|LI$/.test(n.tagName)) return false;
      const own = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join(' ');
      if (own.length >= 2) return true;
      return ![...n.children].some((c) => c.children.length > 0);
    },
  };
  return true;
};

const EXTRACT_PAGE = (rootFs) => {
  const fq = window.__fq;
  const { container, kids } = fq.findSections();
  const scTop = fq.readY();
  const bgEffOf = (n) => {
    let cur = n;
    for (let i = 0; i < 8 && cur; i++) {
      const bg = getComputedStyle(cur).backgroundColor;
      if (bg && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
      cur = cur.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };
  const censusOf = (measureEl) => {
    const out = { els: 0, hairline1px: 0, borderedAny: 0, radius0: 0, radiusNon0: 0, borders: {} };
    const all = measureEl.querySelectorAll('*');
    const cap = Math.min(all.length, 4000);
    for (let i = 0; i < cap; i++) {
      const cs = getComputedStyle(all[i]);
      const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(parseFloat);
      const mx = Math.max(...bw);
      if (mx > 0) {
        out.borderedAny++;
        const key = bw.filter((v) => v > 0).map((v) => Math.round(v)).sort((a, b) => a - b).join('/') + 'px';
        out.borders[key] = (out.borders[key] || 0) + 1;
        if (mx <= 1.5) out.hairline1px++;
      }
      if (cs.borderRadius === '0px') out.radius0++; else out.radiusNon0++;
      out.els++;
    }
    return out;
  };
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  const sections = kids.map((el, i) => {
    const measureEl = fq.resolveContent(el);
    const r = measureEl.getBoundingClientRect();
    const cs = getComputedStyle(measureEl);
    const textEls = [...measureEl.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button,li')]
      .filter((t) => {
        const tr = t.getBoundingClientRect();
        return tr.height > 4 && tr.width > 4 && fq.isTextElement(t);
      })
      .slice(0, 60)
      .map((t) => {
        const tr = t.getBoundingClientRect();
        const tcs = getComputedStyle(t);
        const m = fq.textMeta(t, tcs, tr);
        m.bgEff = bgEffOf(t);
        m.rect = { x: Math.round(tr.x), y: Math.round(tr.y + scTop), w: Math.round(tr.width), h: Math.round(tr.height) };
        return m;
      });
    const headings = textEls.filter((t) => /^h\d$/.test(t.role));
    const sec = {
      order: i,
      identity: el.tagName.toLowerCase() + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '')
        .split(/\s+/).filter(Boolean).slice(0, 4).join('.'),
      rect: { x: Math.round(r.x), y: Math.round(r.y + scTop), w: Math.round(r.width), h: Math.round(r.height) },
      style: {
        bg: cs.backgroundColor, pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map((v) => parseFloat(v) || 0),
        border: cs.borderTopWidth !== '0px' ? [cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor].join(' ') : null,
        radius: cs.borderRadius, display: cs.display,
        grid: cs.display === 'grid' ? cs.gridTemplateColumns.split(' ').length : null,
        pos: cs.position,
      },
      headings, textEls,
      census: censusOf(measureEl),
      counts: { text: textEls.length, imgs: measureEl.querySelectorAll('img').length, svgs: measureEl.querySelectorAll('svg').length },
    };
    sec.children = [...measureEl.children].filter((c) => c.getBoundingClientRect().height > 8).slice(0, 12).map((c) => {
      const cr = c.getBoundingClientRect();
      return { id: c.tagName.toLowerCase() + '.' + String(c.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.'),
        x: Math.round(cr.x), y: Math.round(cr.y + scTop), w: Math.round(cr.width), h: Math.round(cr.height) };
    });
    return sec;
  });
  const rhythm = sections.map((s, i) => ({
    order: i, top: s.rect.y, h: s.rect.h,
    gapBefore: i === 0 ? 0 : s.rect.y - (sections[i - 1].rect.y + sections[i - 1].rect.h),
  }));
  const sizeMap = new Map();
  for (const s of sections) {
    for (const t of s.headings) {
      const fs = parseFloat(t.style.fs) || 0;
      if (fs < 4) continue;
      const key = Math.round(fs * 100) / 100;
      const e = sizeMap.get(key) || { px: key, count: 0, roles: {}, ffs: {} };
      e.count++;
      e.roles[t.role] = (e.roles[t.role] || 0) + 1;
      e.ffs[t.style.ff] = (e.ffs[t.style.ff] || 0) + 1;
      sizeMap.set(key, e);
    }
  }
  const typeLadder = [...sizeMap.values()].sort((a, b) => b.px - a.px);
  return {
    rootFs,
    scroller: { selector: 'window', maxScroll: fq.maxScroll() },
    bodyBg, htmlBg,
    docH: (document.scrollingElement || document.documentElement).scrollHeight,
    container,
    sections, rhythm, typeLadder,
  };
};

const FONTS_PROBE = () => {
  const fonts = [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, style: f.style, status: f.status }));
  const byFam = {};
  for (const f of fonts) {
    const k = `${f.family} ${f.weight} ${f.style}`;
    byFam[k] = byFam[k] || { family: f.family, weight: f.weight, style: f.style, faces: 0, loaded: 0 };
    byFam[k].faces++;
    if (f.status === 'loaded') byFam[k].loaded++;
  }
  return { total: fonts.length, families: Object.values(byFam) };
};

const MOTION_PROBE = () => {
  const transitions = [];
  const animations = [];
  const keyframes = [];
  const walkRules = (ruleList) => {
    for (const r of ruleList) {
      if (!r) continue;
      if (r.type === 7) { keyframes.push(r.name); continue; }
      if (r.type === 1 && r.style) {
        const t = r.style.getPropertyValue('transition');
        const a = r.style.getPropertyValue('animation');
        if (t && t !== 'none') transitions.push({ sel: String(r.selectorText).slice(0, 90), transition: t.trim().slice(0, 140) });
        if (a && a !== 'none') animations.push({ sel: String(r.selectorText).slice(0, 90), animation: a.trim().slice(0, 140) });
      } else if (r.cssRules) walkRules(r.cssRules);
    }
  };
  let sheets = 0, blocked = 0;
  for (const sheet of document.styleSheets) {
    sheets++;
    let rules;
    try { rules = sheet.cssRules; } catch { blocked++; continue; }
    if (rules) walkRules(rules);
  }
  const dedupe = (arr) => {
    const seen = new Map();
    for (const e of arr) seen.set(e.sel + '|' + (e.transition || e.animation), e);
    return [...seen.values()];
  };
  return {
    sheets, blockedSheets: blocked,
    transitions: dedupe(transitions).slice(0, 260),
    animations: dedupe(animations).slice(0, 160),
    keyframesNames: [...new Set(keyframes)],
    lenis: {
      wrapperClass: !!document.querySelector('.lenis'),
      windowLenis: !!window.__mdrkLenis,
    },
    gsap: { present: typeof window.gsap !== 'undefined', scrollTrigger: typeof window.ScrollTrigger !== 'undefined',
      scrollTriggerCount: window.ScrollTrigger ? window.ScrollTrigger.getAll().length : 0 },
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    revealEls: document.querySelectorAll('[class*="reveal"]').length,
  };
};

const INSTALL_RECORDER = () => {
  window.__scrollSamples = [];
  window.__recT0 = performance.now();
  const read = () => window.scrollY;
  window.__recTimer = setInterval(() => {
    window.__scrollSamples.push([
      Math.round((performance.now() - window.__recT0) * 10) / 10,
      Math.round(read() * 10) / 10,
    ]);
    if (performance.now() - window.__recT0 > 1150) clearInterval(window.__recTimer);
  }, 16);
  return true;
};

const SYNTH_WHEEL = () => {
  const ev = new WheelEvent('wheel', {
    deltaY: 800, deltaMode: 0, bubbles: true, cancelable: true,
    clientX: window.innerWidth / 2, clientY: window.innerHeight / 2,
  });
  (document.querySelector('.lenis') || document.body).dispatchEvent(ev);
  return true;
};

/* ── server management ────────────────────────────────────────────── */

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch { return false; }
}

async function ensureVite() {
  if (await probe(BASE_URL + '/')) return { booted: false };
  console.log('[vite] not reachable on', BASE_URL, '— booting (frontend, port 5175)…');
  const log = fs.openSync('/tmp/mdrk-fidelity-vite.log', 'a');
  spawn('npx', ['vite', '--port', '5175', '--host'], {
    cwd: path.join(ROOT, 'frontend'), detached: true, stdio: ['ignore', log, log],
  }).unref();
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await probe(BASE_URL + '/')) return { booted: true };
  }
  throw new Error('vite did not come up on ' + BASE_URL + ' (see /tmp/mdrk-fidelity-vite.log)');
}

/* tiny static server for the composer (tmp shots + repo reference shots) */
function startTmpServer() {
  const server = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.startsWith('/ref/')) {
        p = path.join(REF_DIR, p.slice('/ref/'.length).replace(/^\/+/, ''));
      } else {
        p = path.join(TMP_DIR, p.replace(/^\/+/, ''));
      }
      if (!fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); res.end(); return; }
      const ext = path.extname(p).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
      res.writeHead(200, { 'content-type': mime });
      fs.createReadStream(p).pipe(res);
    } catch {
      res.writeHead(500); res.end();
    }
  });
  return new Promise((resolve) => server.listen(TMP_PORT, '127.0.0.1', () => resolve(server)));
}

/* ── capture driver ───────────────────────────────────────────────── */

async function traverse(page) {
  const max = await page.evaluate(() => Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - window.innerHeight));
  const step = Math.max(400, Math.round(max / 24)) || 400;
  const seat = (y) => page.evaluate((yy) => {
    const L = window.__mdrkLenis;
    if (L && typeof L.scrollTo === 'function') L.scrollTo(yy, { immediate: true });
    else window.scrollTo(0, yy);
  }, y);
  for (let y = 0; y < max; y += step) { await seat(y); await page.waitForTimeout(50); }
  await seat(max); await page.waitForTimeout(140);
  for (let y = max; y > 0; y -= step) { await seat(y); await page.waitForTimeout(40); }
  await seat(0); await page.waitForTimeout(80);
}

async function captureCombo(browser, route, vp, theme) {
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    colorScheme: theme,
  });
  const page = await context.newPage();
  try {
    await page.addInitScript((mode) => {
      localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode, modeUpdatedAt: Date.now() }, version: 2 }));
      localStorage.setItem('mdrk-theme-profile', mode);
      localStorage.setItem('madarek.consent', 'accepted');
    }, theme);
    const resp = await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (resp && resp.status() >= 400) throw new Error('HTTP ' + resp.status());
    /* entrance/loader settle (the landing plays a one-shot intro; .landing gains intro-done) */
    try { await page.waitForSelector('.landing.intro-done', { timeout: 8000 }); } catch { /* other pages have no such gate */ }
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch { /* api-less envs: fine */ }
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.waitForTimeout(900);
    await traverse(page);
    await page.evaluate(PROBE_LIB);
    const rootFs = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
    const extract = await page.evaluate(EXTRACT_PAGE, rootFs);
    const fonts = await page.evaluate(FONTS_PROBE);
    const motion = await page.evaluate(MOTION_PROBE);
    /* scroll feel: trusted wheel impulse at viewport centre */
    let wheelMode = 'trusted';
    await page.evaluate(INSTALL_RECORDER);
    await page.mouse.move(Math.round(vp.w / 2), Math.round(vp.h / 2));
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(1250);
    let samples = await page.evaluate(() => window.__scrollSamples || []);
    let feel = fitDecay(samples);
    if (feel.tauMs == null && /no-movement/.test(feel.error || '')) {
      wheelMode = 'synthetic';
      await page.evaluate(SYNTH_WHEEL);
      await page.waitForTimeout(700);
      samples = await page.evaluate(() => window.__scrollSamples || []);
      feel = fitDecay(samples);
    }
    feel.wheelMode = wheelMode;
    /* full-page screenshot with the Lenis engine parked (no snap-back) */
    await page.evaluate(() => {
      try { if (window.__mdrkLenis && window.__mdrkLenis.stop) window.__mdrkLenis.stop(); } catch { /* ignore */ }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(200);
    const shot = path.join(TMP_DIR, 'shots', `mdrk-${vp.label}-${theme}.png`);
    await page.screenshot({ path: shot, fullPage: true, type: 'png', animations: 'disabled' });
    return { extract, fonts, motion, feel, shot };
  } finally {
    await context.close();
  }
}

/* ── section matching: order + role DP (Needleman–Wunsch flavour) ──── */

function sectionSim(a, b, i, n, j, m) {
  let s = 1 - Math.abs((i + 1) / n - (j + 1) / m); /* normalized doc position */
  const ar = new Set((a.headings || []).map((h) => h.role));
  const br = new Set((b.headings || []).map((h) => h.role));
  if (ar.has('h1') && br.has('h1')) s += 2;
  else if (ar.has('h1') !== br.has('h1')) s -= 0.5;
  if (ar.has('h2') && br.has('h2')) s += 1;
  if (ar.size === 0 && br.size === 0) s += 0.4;
  const fa = /footer/i.test(a.identity), fb = /footer/i.test(b.identity);
  if (fa && fb) s += 2;
  else if (fa !== fb) s -= 0.75;
  if (/hero/i.test(a.identity) && /hero/i.test(b.identity)) s += 1;
  return s;
}

function alignSections(ref, md) {
  const n = ref.length, m = md.length;
  if (!n || !m) return { pairs: [], coverage: 0 };
  const SKIP = 0.35;
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(-1e9));
  const bt = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
  dp[0][0] = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i === 0 && j === 0) continue;
      let best = -1e9, from = 0;
      if (i > 0 && j > 0) { const v = dp[i - 1][j - 1] + sectionSim(ref[i - 1], md[j - 1], i - 1, n, j - 1, m); if (v > best) { best = v; from = 1; } }
      if (i > 0) { const v = dp[i - 1][j] - SKIP; if (v > best) { best = v; from = 2; } }
      if (j > 0) { const v = dp[i][j - 1] - SKIP; if (v > best) { best = v; from = 3; } }
      dp[i][j] = best; bt[i][j] = from;
    }
  }
  const pairs = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const from = bt[i][j];
    if (from === 1) { pairs.push([i - 1, j - 1]); i--; j--; }
    else if (from === 2) i--;
    else if (from === 3) j--;
    else break;
  }
  pairs.reverse();
  return { pairs, coverage: (2 * pairs.length) / (n + m) };
}

/* ── the five axes ────────────────────────────────────────────────── */

function pairTypeScore(a, b) {
  /* the section's TITLE RUNG — the largest rendered text size on each side,
   * tag-agnostic (Heron carries several titles as styled divs, Madarek as
   * semantic h2; the visual ladder is what the redesign is about). */
  const maxFs = (sec) => {
    let m = 0;
    for (const t of sec.textEls || []) {
      const f = parseFloat(t.style.fs);
      if (f > m) m = f;
    }
    return m;
  };
  const fa = maxFs(a), fb = maxFs(b);
  if (fa < 4 || fb < 4) return null; /* a side carries no comparable text */
  return scoreDev(Math.abs(ln(fb / fa)), LN_175);
}

function ladderScore(refLadder, mdLadder) {
  if (!refLadder.length || !mdLadder.length) return null;
  let wsum = 0, wtot = 0;
  for (const rung of refLadder) {
    let best = null;
    for (const r of mdLadder) {
      const d = Math.abs(ln(r.px / rung.px));
      if (best === null || d < best.d) best = { d };
    }
    const s = scoreDev(best.d, LN_175);
    wsum += s * (rung.count || 1);
    wtot += rung.count || 1;
  }
  return wsum / wtot;
}

function padScore(a, b) {
  const ph = Math.max(...a.style.pad), pm = Math.max(...b.style.pad);
  return scoreDev(Math.abs(ln((pm + 8) / (ph + 8))), LN_25);
}

const GAP_TOL_PX = 48; /* one vertical-rhythm unit at 1440 (8.33 root × ~6) */
function gapScore(gh, gm) {
  return clamp01(1 - Math.abs(gm - gh) / GAP_TOL_PX);
}

/* top content inset — where the first text starts inside the section —
 * nesting-independent visual breathing (Heron pads inner containers while
 * the x-wrap itself reads pad=0; Madarek pads the section directly).
 * Only text INSIDE the section's span counts — sticky/out-of-flow children
 * (e.g. the chapters strip's pinned nav at −616px) are rhythm outliers. */
function topInset(sec) {
  const y0 = sec.rect.y, y1 = sec.rect.y + sec.rect.h;
  let top = Infinity;
  for (const t of sec.textEls || []) {
    if (t.rect && t.rect.y >= y0 && t.rect.y <= y1) top = Math.min(top, t.rect.y);
  }
  if (top === Infinity) return null;
  return top - y0;
}
function insetScore(a, b) {
  const ia = topInset(a), ib = topInset(b);
  if (ia == null || ib == null) return null;
  const ratio = (ib + 8) / (ia + 8);
  if (!(ratio > 0)) return null;
  return scoreDev(Math.abs(ln(ratio)), LN_25);
}

function pairColorScore(a, b) {
  const ah = (a.headings || [])[0], bh = (b.headings || [])[0];
  if (!ah || !bh) return null;
  const ca = parseColor(ah.style.color), cb = parseColor(bh.style.color);
  if (!ca || !cb) return null;
  const inkS = scoreE(deltaE(ca, cb));
  const ba = parseColor(ah.bgEff), bb = parseColor(bh.bgEff);
  let contrastS = null;
  if (ba && bb) {
    const ra = contrastRatio(ca, ba), rb = contrastRatio(cb, bb);
    contrastS = scoreDev(Math.abs(ln(rb / ra)), LN_18);
  }
  if (contrastS == null) return inkS;
  return 0.6 * inkS + 0.4 * contrastS;
}

function accentColor(extract) {
  /* the most saturated text color that is neither paper nor the dominant ink */
  const paper = parseColor(extract.bodyBg);
  const colors = [];
  for (const s of extract.sections) {
    for (const h of s.headings || []) {
      const c = parseColor(h.style.color);
      if (!c) continue;
      if (paper && deltaE(c, paper) < 25) continue;
      colors.push(c);
    }
  }
  if (!colors.length) return null;
  /* dominant = ink: the cluster midpoint; accent = most saturated non-ink */
  const inkish = colors.filter((c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 28);
  const others = colors.filter((c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) >= 28);
  if (!others.length) return null;
  const sat = (c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  others.sort((x, y) => sat(y) - sat(x));
  void inkish;
  return others[0];
}

function distinctEdges(children) {
  const xs = [];
  for (const c of children || []) { xs.push(c.x, c.x + c.w); }
  xs.sort((p, q) => p - q);
  let n = 0, last = -1e9;
  for (const x of xs) { if (x - last > 4) { n++; last = x; } }
  return n;
}

function pairGeometryScore(a, b) {
  const hS = scoreDev(Math.abs(ln(b.rect.h / a.rect.h)), LN_25);
  const share = (c) => (c.borderedAny ? c.hairline1px / c.borderedAny : 1);
  const hairS = clamp01(1 - Math.abs(share(b.census) - share(a.census)));
  const radShare = (c) => (c.els ? c.radius0 / c.els : 1);
  const radS = clamp01(1 - Math.abs(radShare(b.census) - radShare(a.census)));
  const eM = distinctEdges(b.children), eH = distinctEdges(a.children);
  const edgeS = clamp01(1 - Math.abs(eM - eH) / Math.max(eM, eH, 1));
  return { hS, hairS, radS, edgeS, score: 0.45 * hS + 0.2 * hairS + 0.2 * radS + 0.15 * edgeS };
}

function transitionDurations(transitions) {
  const out = [];
  for (const t of transitions || []) {
    for (const chunk of String(t.transition).split(',')) {
      const m = chunk.trim().match(/([\d.]+)(m?s)\b/);
      if (m) out.push(m[2] === 'ms' ? +m[1] / 1000 : +m[1]);
    }
  }
  return out;
}
const median = (arr) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

function motionScore(refMotion, refFeel, mdMotion, mdFeel) {
  const factors = [];
  /* (1) scroll feel: the wheel-impulse decay constant */
  if (refFeel && refFeel.fit && refFeel.fit.tauMs && mdFeel && mdFeel.tauMs) {
    factors.push({ k: 'tau', w: 0.4, s: scoreDev(Math.abs(ln(mdFeel.tauMs / refFeel.fit.tauMs)), LN_2) });
  } else factors.push({ k: 'tau', w: 0.4, s: 0, note: 'unmeasured on ' + (!refFeel?.fit?.tauMs ? 'reference' : 'madarek') });
  /* (2) CSS transition durations (median + spread) */
  const dH = transitionDurations(refMotion.transitions);
  const dM = transitionDurations(mdMotion.transitions);
  const medH = median(dH), medM = median(dM);
  if (medH != null && medM != null) {
    const medS = scoreDev(Math.abs(ln((medM + 0.05) / (medH + 0.05))), LN_25);
    const spreadH = dH.length > 1 ? Math.sqrt(dH.reduce((s, v) => s + (v - medH) ** 2, 0) / dH.length) : 0;
    const spreadM = dM.length > 1 ? Math.sqrt(dM.reduce((s, v) => s + (v - medM) ** 2, 0) / dM.length) : 0;
    const sprS = scoreDev(Math.abs(ln((spreadM + 0.05) / (spreadH + 0.05))), LN_25);
    factors.push({ k: 'durations', w: 0.3, s: 0.7 * medS + 0.3 * sprS });
  } else factors.push({ k: 'durations', w: 0.3, s: 0, note: 'no transitions on one side' });
  /* (3) smooth-scroll engine presence (Lenis) */
  const lenisH = !!(refMotion.lenis && (refMotion.lenis.wrapperClass || refMotion.lenis.windowLenis));
  const lenisM = !!(mdMotion.lenis && mdMotion.lenis.windowLenis);
  factors.push({ k: 'lenis', w: 0.15, s: lenisH === lenisM ? 1 : 0 });
  /* (4) scroll-triggered reveal system presence (GSAP ScrollTrigger vs CSS/IO reveals) */
  const trigH = !!((refMotion.gsap && refMotion.gsap.scrollTriggerCount) || (refMotion.triggers && refMotion.triggers.length));
  const trigM = (mdMotion.revealEls || 0) > 0 || !!((mdMotion.gsap && mdMotion.gsap.scrollTriggerCount));
  factors.push({ k: 'triggers', w: 0.15, s: trigH === trigM ? 1 : 0 });
  const wtot = factors.reduce((s, f) => s + f.w, 0);
  return { score: factors.reduce((s, f) => s + f.w * f.s, 0) / wtot, factors };
}

/* ── per-combo scoring ────────────────────────────────────────────── */

function round1(v) { return v == null ? null : Math.round(v * 10) / 10; }

function scoreCombo(refDoc, md) {
  const ref = refDoc.sections || [];
  const mdSecs = md.extract.sections || [];
  const { pairs, coverage } = alignSections(ref, mdSecs);

  /* per-pair axis samples */
  const typeSamples = [], padSamples = [], colorSamples = [], geoSamples = [];
  const pairDetails = [];
  for (const [i, j] of pairs) {
    const a = ref[i], b = mdSecs[j];
    const t = pairTypeScore(a, b);
    if (t != null) typeSamples.push(t);
    padSamples.push(padScore(a, b));
    const c = pairColorScore(a, b);
    if (c != null) colorSamples.push(c);
    const g = pairGeometryScore(a, b);
    geoSamples.push(g.score);
    pairDetails.push({
      ref: { order: a.order, identity: a.identity, h: a.rect.h },
      md: { order: b.order, identity: b.identity, h: b.rect.h },
      type: round1(t), color: round1(c), geo: round1(g.score),
      geoParts: { h: round1(g.hS), hairline: round1(g.hairS), radius: round1(g.radS), edges: round1(g.edgeS) },
    });
  }
  const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

  /* (أ) type-scale ladder: 70% matched-pair heading rungs + 30% page ladder */
  const ladderS = ladderScore(refDoc.headingLadder || [], md.extract.typeLadder || []);
  const pairTypeMean = mean(typeSamples);
  const typeAxis = pairTypeMean != null && ladderS != null
    ? 0.7 * pairTypeMean + 0.3 * ladderS
    : (pairTypeMean != null ? pairTypeMean : (ladderS != null ? ladderS : 0));

  /* (ب) spacing/rhythm: 45% inter-section gaps + 35% top content inset +
   * 20% section paddings (the DOM-level component — kept at low weight,
   * honest about nesting differences) — × coverage */
  const gapSamples = [];
  for (let k = 0; k + 1 < pairs.length; k++) {
    const [i1, j1] = pairs[k], [i2, j2] = pairs[k + 1];
    if (i2 === i1 + 1 && j2 === j1 + 1) {
      gapSamples.push(gapScore((refDoc.rhythm || [])[i2]?.gapBefore ?? 0, (md.extract.rhythm || [])[j2]?.gapBefore ?? 0));
    }
  }
  const insetSamples = [];
  for (const [i, j] of pairs) {
    const s = insetScore(ref[i], mdSecs[j]);
    if (s != null) insetSamples.push(s);
  }
  const gapMean = mean(gapSamples);
  const insetMean = mean(insetSamples);
  const padMean = mean(padSamples);
  let spacingAxis = 0;
  {
    const parts = [
      { w: 0.45, v: gapMean },
      { w: 0.35, v: insetMean },
      { w: 0.20, v: padMean },
    ].filter((p) => p.v != null);
    const w = parts.reduce((s, p) => s + p.w, 0);
    spacingAxis = w ? (parts.reduce((s, p) => s + p.w * p.v, 0) / w) * coverage : 0;
  }

  /* (ج) color/contrast: paper ΔE + ink ΔE + accent ΔE + matched-pair heading contrast */
  const paperH = paperColor(refDoc), paperM = paperColor(md.extract);
  const colorFactors = [];
  if (paperH && paperM) colorFactors.push({ k: 'paper', w: 0.25, s: scoreE(deltaE(paperM, paperH)) });
  const inkH = parseColor((ref.find((s) => (s.headings || []).length)?.headings || [])[0]?.style?.color);
  const inkM = parseColor((mdSecs.find((s) => (s.headings || []).length)?.headings || [])[0]?.style?.color);
  if (inkH && inkM) colorFactors.push({ k: 'ink', w: 0.3, s: scoreE(deltaE(inkM, inkH)) });
  const pairColorMean = mean(colorSamples);
  if (pairColorMean != null) colorFactors.push({ k: 'contrast', w: 0.3, s: pairColorMean });
  const accH = accentColor(refDoc), accM = accentColor(md.extract);
  if (accH && accM) colorFactors.push({ k: 'accent', w: 0.15, s: scoreE(deltaE(accM, accH)) });
  const cw = colorFactors.reduce((s, f) => s + f.w, 0);
  const colorAxis = cw ? colorFactors.reduce((s, f) => s + f.w * f.s, 0) / cw : 0;

  /* (د) geometry × coverage */
  const geoMean = mean(geoSamples);
  const geometryAxis = (geoMean != null ? geoMean : 0) * coverage;

  /* (هـ) motion */
  const motion = motionScore(refDoc.motion || {}, refDoc.scrollFeel || {}, md.motion, md.feel);

  const axes = {
    type: round1(typeAxis * 100),
    spacing: round1(spacingAxis * 100),
    color: round1(colorAxis * 100),
    geometry: round1(geometryAxis * 100),
    motion: round1(motion.score * 100),
  };
  const total = round1((axes.type + axes.spacing + axes.color + axes.geometry + axes.motion) / 5);
  return { axes, total, coverage: round1(coverage * 100), pairs: pairDetails, colorFactors, motionFactors: motion.factors };
}

/* ── pixel diff (evidence, not score) ─────────────────────────────── */

function pngPadTo(img, W, H, bg) {
  if (img.width === W && img.height === H) return img;
  const out = new PNG({ width: W, height: H });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = bg.r; out.data[i + 1] = bg.g; out.data[i + 2] = bg.b; out.data[i + 3] = 255;
  }
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

async function fullResDiff(composerPage, heronPngPath, mdrkPngPath, outPath, bgH, bgM) {
  const A = PNG.sync.read(fs.readFileSync(heronPngPath));
  const B = PNG.sync.read(fs.readFileSync(mdrkPngPath));
  const W = Math.max(A.width, B.width);
  const H = Math.max(A.height, B.height);
  const a = pngPadTo(A, W, H, bgH);
  const b = pngPadTo(B, W, H, bgM);
  const diff = new PNG({ width: W, height: H });
  const nDiff = pixelmatch(a.data, b.data, diff.data, W, H, { threshold: 0.1, alpha: 0.15 });
  const diffTmp = path.join(TMP_DIR, 'diff-full.png');
  fs.writeFileSync(diffTmp, PNG.sync.write(diff));
  /* downscale for the committed artifact */
  const url = await downscale(composerPage, diffTmp, W > 700 ? 560 : W);
  fs.writeFileSync(outPath, Buffer.from(url.split(',')[1], 'base64'));
  return { ratio: Math.round((nDiff / (W * H)) * 10000) / 100, mode: 'full', W, H };
}

async function downscale(page, imgPath, targetW) {
  return page.evaluate(async ({ url, targetW }) => {
    const img = await new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error('img load ' + url));
      el.src = url;
    });
    const h = Math.max(1, Math.round(img.height * targetW / img.width));
    const c = document.createElement('canvas');
    c.width = targetW; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, h);
    ctx.drawImage(img, 0, 0, targetW, h);
    return c.toDataURL('image/png');
  }, { url: `http://127.0.0.1:${TMP_PORT}${imgPath.startsWith(TMP_DIR) ? imgPath.slice(TMP_DIR.length) : imgPath}`, targetW });
}

/* scaled indicative diff: both shots drawn at equal width, pixelmatch in-page */
async function scaledDiff(composerPage, refShotUrl, mdShotUrl) {
  return composerPage.evaluate(async ({ aUrl, bUrl }) => {
    const pm = window.__pm;
    const load = (u) => new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error('img load'));
      el.src = u;
    });
    const [A, B] = await Promise.all([load(aUrl), load(bUrl)]);
    const W = 420;
    const hA = Math.max(1, Math.round(A.height * W / A.width));
    const hB = Math.max(1, Math.round(B.height * W / B.width));
    const H = Math.max(hA, hB);
    const mk = (img, h) => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, h);
      return ctx.getImageData(0, 0, W, H);
    };
    const dA = mk(A, hA), dB = mk(B, hB);
    const dOut = new ImageData(W, H);
    const n = pm(dA.data, dB.data, dOut.data, W, H, { threshold: 0.1, alpha: 0.15 });
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    c.getContext('2d').putImageData(dOut, 0, 0);
    return { ratio: Math.round((n / (W * H)) * 10000) / 100, dataUrl: c.toDataURL('image/png'), W, H };
  }, { aUrl: refShotUrl, bUrl: mdShotUrl });
}

/* ── contact sheets ───────────────────────────────────────────────── */

async function contactSheet(page, { refUrl, mdUrl, refLabel, mdLabel, outPath, score }) {
  const html = `<!doctype html><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#1a1a1a; font: 12px/1.4 ui-monospace, Menlo, monospace; color:#eee; }
  #sheet { display:flex; gap:10px; padding:10px; width:max-content; }
  figure { width:420px; }
  figcaption { padding:6px 8px; background:#000; color:#fff; letter-spacing:.04em; }
  figcaption b { color:#ff5a26; }
  img { display:block; width:420px; }
</style>
<div id="sheet">
  <figure><figcaption>HERON · ${refLabel}</figcaption><img src="${refUrl}"></figure>
  <figure><figcaption>MADAREK · ${mdLabel} · <b>${score}%</b></figcaption><img src="${mdUrl}"></figure>
</div>`;
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  await page.locator('#sheet').screenshot({ path: outPath, type: 'jpeg', quality: 80, animations: 'disabled' });
}

/* ── main ─────────────────────────────────────────────────────────── */

async function main() {
  const viteInfo = await ensureVite();
  console.log(`[vite] ${BASE_URL} ${viteInfo.booted ? '(booted by this run)' : '(already up)'}`);
  const server = await startTmpServer();
  const browser = await chromium.launch();

  /* composer page: injects pixelmatch for in-page scaled diffs */
  const pmSource = fs.readFileSync(path.join(ROOT, 'node_modules', 'pixelmatch', 'index.js'), 'utf8')
    .replace('export default function pixelmatch', 'function pixelmatch') + '\nwindow.__pm = pixelmatch;';
  const composerCtx = await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' });
  const composer = await composerCtx.newPage();
  await composer.addInitScript(pmSource);
  await composer.goto(`http://127.0.0.1:${TMP_PORT}/`, { waitUntil: 'domcontentloaded' }).catch(() => {});

  const results = {};
  for (const P of PAGES) {
    const pageResult = { route: P.route, slug: P.slug, ref: P.ref, refWhy: P.why, generatedAt: new Date().toISOString(), viewports: {} };
    for (const vp of VPS) {
      for (const theme of THEMES_RUN) {
        const key = `${vp.label}:${theme}`;
        process.stdout.write(`[${P.slug}] ${key} … `);
        const refPath = path.join(REF_DIR, 'pages', `${P.ref}-${vp.label}.json`);
        if (!fs.existsSync(refPath)) { console.log('NO REFERENCE — skipped'); continue; }
        const refDoc = JSON.parse(fs.readFileSync(refPath, 'utf8'));
        let cap;
        try {
          cap = await captureCombo(browser, P.route, vp, theme);
        } catch (e) {
          console.log('CAPTURE FAILED:', e.message);
          pageResult.viewports[key] = { error: e.message };
          continue;
        }
        const scored = scoreCombo(refDoc, cap);
        /* trim the capture before persisting: headings + censuses stay, full textEls do not */
        const extractSlim = {
          url: BASE_URL + P.route, viewport: vp, theme,
          rootFs: cap.extract.rootFs, scroller: cap.extract.scroller,
          bodyBg: cap.extract.bodyBg, htmlBg: cap.extract.htmlBg, docH: cap.extract.docH,
          container: cap.extract.container,
          sections: cap.extract.sections.map((s) => ({
            order: s.order, identity: s.identity, rect: s.rect, style: s.style,
            headings: (s.headings || []).map((h) => ({ role: h.role, indexLabel: h.indexLabel, charCount: h.charCount, style: h.style, bgEff: h.bgEff, rect: h.rect })),
            census: s.census, counts: s.counts, children: s.children,
          })),
          rhythm: cap.extract.rhythm, typeLadder: cap.extract.typeLadder,
        };
        const combo = {
          ref: `${P.ref}-${vp.label}`, scored,
          capture: extractSlim,
          fonts: { total: cap.fonts.total, loaded: cap.fonts.families.filter((f) => f.loaded > 0).map((f) => f.family + ' ' + f.weight) },
          motion: {
            sheets: cap.motion.sheets, transitions: cap.motion.transitions.length, animations: cap.motion.animations.length,
            keyframes: cap.motion.keyframesNames.length, lenis: cap.motion.lenis, gsap: cap.motion.gsap,
            revealEls: cap.motion.revealEls, reducedMotion: cap.motion.reducedMotion,
            durationsS: transitionDurations(cap.motion.transitions).slice(0, 40),
          },
          scrollFeel: cap.feel,
        };

        /* pixel evidence (light theme vs the light reference; dark is compared
         * visually via the contact sheet only) */
        const refShot = path.join(REF_DIR, 'shots', `${P.ref}-${vp.label}.${fs.existsSync(path.join(REF_DIR, 'shots', `${P.ref}-${vp.label}.png`)) ? 'png' : 'jpg'}`);
        if (WANT_DIFF && theme === 'light' && fs.existsSync(refShot)) {
          try {
            if (refShot.endsWith('.png')) {
              const r = await fullResDiff(composer, refShot, cap.shot,
                path.join(OUT_DIR, 'diff', `${P.slug}-${vp.label}.png`),
                paperColor(refDoc), paperColor(cap.extract));
              combo.pixelDiff = r;
            } else {
              const r = await scaledDiff(composer, `http://127.0.0.1:${TMP_PORT}/ref/shots/${path.basename(refShot)}`, `http://127.0.0.1:${TMP_PORT}/shots/${path.basename(cap.shot)}`);
              combo.pixelDiff = { ratio: r.ratio, mode: 'scaled@420' };
              fs.writeFileSync(path.join(OUT_DIR, 'diff', `${P.slug}-${vp.label}.png`), Buffer.from(r.dataUrl.split(',')[1], 'base64'));
            }
          } catch (e) {
            combo.pixelDiff = { error: e.message };
          }
        }

        if (WANT_SHEETS) {
          try {
            await contactSheet(composer, {
              refUrl: `http://127.0.0.1:${TMP_PORT}/ref/shots/${path.basename(refShot)}`,
              mdUrl: `http://127.0.0.1:${TMP_PORT}/shots/${path.basename(cap.shot)}`,
              refLabel: `${P.ref}@${vp.label}`,
              mdLabel: `${P.route}@${vp.label} ${theme}`,
              outPath: path.join(OUT_DIR, 'contact', `${P.slug}-${vp.label}-${theme}.jpg`),
              score: scored.total,
            });
          } catch (e) { console.log('sheet failed:', e.message); }
        }
        pageResult.viewports[key] = combo;
        console.log(`${scored.total}% (t${scored.axes.type} s${scored.axes.spacing} c${scored.axes.color} g${scored.axes.geometry} m${scored.axes.motion}) cov ${scored.coverage}%`);
        results[`${P.slug}|${key}`] = scored;
      }
    }
    fs.writeFileSync(path.join(OUT_DIR, `${P.slug}.json`), JSON.stringify(pageResult, null, 1));
    console.log(`→ ${path.join(OUT_DIR, P.slug + '.json')}`);
  }

  await composerCtx.close();
  await browser.close();
  await new Promise((r) => server.close(r));

  /* summary.md — only over what this run produced */
  writeSummary();
}

function writeSummary() {
  const lines = [];
  lines.push('# Fidelity baseline — Madarek vs Heron (live reference)');
  lines.push('');
  lines.push('Generated by `scripts/fidelity/run.mjs` (see `scripts/fidelity/README.md` for the metric).');
  lines.push('Reference: `docs/redesign/r329/heron-live/` — 0 content copied; geometry/styles/motion facts only.');
  lines.push('');
  const rows = [];
  for (const P of PAGES) {
    const f = path.join(OUT_DIR, `${P.slug}.json`);
    if (!fs.existsSync(f)) continue;
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    const cells = {};
    for (const vp of VPS) for (const th of THEMES) {
      const c = doc.viewports[`${vp.label}:${th}`];
      if (c && c.scored) cells[`${vp.label}:${th}`] = c.scored;
    }
    rows.push({ P, cells });
  }
  lines.push('## Per page × viewport × theme — total fidelity %');
  lines.push('');
  const keys = [];
  for (const vp of VPS) for (const th of THEMES) keys.push(`${vp.label}:${th}`);
  lines.push('| page | ' + keys.join(' | ') + ' | mean |');
  lines.push('|---|' + keys.map(() => '---:').join('|') + '|---:|');
  for (const { P, cells } of rows) {
    const vals = keys.map((k) => cells[k]);
    const mean = vals.filter((v) => v != null);
    lines.push(`| \`${P.route}\` | ${vals.map((v) => (v == null ? '—' : v.total)).join(' | ')} | ${mean.length ? round1(mean.reduce((s, v) => s + v.total, 0) / mean.length) : '—'} |`);
  }
  lines.push('');
  lines.push('## Homepage 5-axis breakdown (all viewports × themes)');
  lines.push('');
  const hf = path.join(OUT_DIR, 'home.json');
  if (fs.existsSync(hf)) {
    const doc = JSON.parse(fs.readFileSync(hf, 'utf8'));
    lines.push('| viewport:theme | type | spacing | color | geometry | motion | total | coverage |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
    for (const vp of VPS) for (const th of THEMES) {
      const c = doc.viewports[`${vp.label}:${th}`];
      if (!c || !c.scored) continue;
      const a = c.scored.axes;
      lines.push(`| ${vp.label}:${th} | ${a.type} | ${a.spacing} | ${a.color} | ${a.geometry} | ${a.motion} | ${c.scored.total} | ${c.scored.coverage} |`);
    }
  }
  lines.push('');
  lines.push('## Pixel diffs (evidence, not score)');
  lines.push('');
  for (const P of PAGES) {
    const f = path.join(OUT_DIR, `${P.slug}.json`);
    if (!fs.existsSync(f)) continue;
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const vp of VPS) {
      const c = doc.viewports[`${vp.label}:light`];
      if (c && c.pixelDiff && c.pixelDiff.ratio != null) {
        lines.push(`- \`${P.route}\` @${vp.label}: ${c.pixelDiff.ratio}% differing pixels (${c.pixelDiff.mode}) → \`fidelity/diff/${P.slug}-${vp.label}.png\``);
      }
    }
  }
  lines.push('');
  fs.writeFileSync(path.join(OUT_DIR, 'summary.md'), lines.join('\n'));
  console.log('→', path.join(OUT_DIR, 'summary.md'));
}

main().catch((e) => { console.error(e); process.exit(1); });
