#!/usr/bin/env node
/* eslint-disable */
/**
 * heron-extract.mjs — R329 M1 — the LIVE Heron reference extractor.
 *
 * Purpose: one polite, reproducible crawl of https://heronaiapp.com/ that
 * produces the machine-readable reference the fidelity metric
 * (scripts/fidelity/run.mjs) scores Madarek against. Everything lives in
 * docs/redesign/r329/heron-live/.
 *
 * WHAT IS EXTRACTED (and what is deliberately NOT — same IP policy as
 * scripts/r322 + scripts/r324 extractors, unchanged):
 *   - geometry (bounding boxes, paddings, gaps, rhythm) + computed styles
 *     of text elements + the type-scale ladder + motion facts (CSS
 *     transition/animation rules, Lenis/GSAP presence, a wheel-impulse
 *     scroll trace fitted to an exponential decay) + document.fonts.
 *   - TEXT IS NEVER COPIED. Every text node is reduced to metadata:
 *     {role, charCount, lineCount, indexLabel}. Media src = last path
 *     segment only. Nothing is downloaded.
 *   - Screenshots are internal measurement evidence (the same practice as
 *     audits/evidence/r321 + r324): full-page PNG at 1440/390 (pixelmatch
 *     pairs) and JPEG q80 at 1024/768 (contact sheets only).
 *
 * CRAWLING RULE (deterministic, recorded in manifest.json):
 *   1. load https://heronaiapp.com/ at 1440×900, settle the loader,
 *   2. collect every same-origin <a href> visible in the RENDERED DOM
 *      (header, nav, footer, body — the site's own nav), dedupe by
 *      pathname, drop hash-only/mailto/tel/asset links,
 *   3. crawl each discovered page directly (fresh context per page×viewport).
 *
 * Usage:
 *   node scripts/fidelity/heron-extract.mjs            # all pages × 4 viewports
 *   node scripts/fidelity/heron-extract.mjs --page /   # homepage only
 *   node scripts/fidelity/heron-extract.mjs --viewport 1440
 *
 * Output tree (docs/redesign/r329/heron-live/):
 *   manifest.json                  — index of everything + crawling rule
 *   pages/<slug>-<w>.json          — per page×viewport extraction
 *   shots/<slug>-<w>.{png|jpg}     — full-page evidence shots
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'redesign', 'r329', 'heron-live');
const BASE = 'https://heronaiapp.com';

const REAL_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/* ── CLI ─────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const argOf = (name) => {
  const i = args.indexOf('--' + name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  const pref = args.find((a) => a.startsWith('--' + name + '='));
  return pref ? pref.split('=').slice(1).join('=') : null;
};
const pageFilter = argOf('page');
const vpFilter = argOf('viewport');
const shotMode = argOf('shots') || 'key'; /* key = home+pricing PNG, others JPEG; all = PNG everywhere; none */
const SUPPLEMENT = args.includes('--supplement'); /* re-extract textEl bg + hairline/radius scans + bodyBg for ALREADY-captured pages, merge into the existing JSONs, no screenshots */
const DARK = args.includes('--dark'); /* supplement with colorScheme:dark (Heron auto dark mode reference) */

const VIEWPORTS = [
  { label: '1440', w: 1440, h: 900 },
  { label: '1024', w: 1024, h: 768 },
  { label: '768', w: 768, h: 1024 },
  { label: '390', w: 390, h: 844 },
].filter((v) => !vpFilter || v.label === vpFilter);

const LOADER_SETTLE_MS = 7000;
const SETTLE_POLL = 500;

fs.mkdirSync(path.join(OUT_DIR, 'pages'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'shots'), { recursive: true });

const slugOf = (urlStr) => {
  const u = new URL(urlStr);
  const p = u.pathname.replace(/\/+$/, '') || '';
  return (p === '' ? 'home' : p.replace(/^\//, '').replace(/[\/]+/g, '-')).slice(0, 40) || 'home';
};

/* ── in-page probes ───────────────────────────────────────────────── */

const PROBE_LIB = () => {
  /* Installed once per document; every later evaluate() reuses these. */
  window.__fq = {
    /* The scroller: Lenis wrapper if present, else the document. */
    scroller() {
      return document.querySelector('.lenis') || document.scrollingElement || document.documentElement;
    },
    scrollerSel() {
      const sc = document.querySelector('.lenis');
      if (sc) {
        const cls = String(sc.className).split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        return sc.tagName.toLowerCase() + (cls ? '.' + cls : '');
      }
      return 'document.scrollingElement';
    },
    readY() {
      const sc = document.querySelector('.lenis');
      return sc ? sc.scrollTop : window.scrollY;
    },
    maxScroll() {
      const sc = document.querySelector('.lenis');
      if (sc) return sc.scrollHeight - sc.clientHeight;
      const se = document.scrollingElement;
      return se ? se.scrollHeight - se.clientHeight : 0;
    },
    /* Sections = element children of the content container. The container
     * is the scroller itself if it has ≥3 sizable children, else we
     * descend through single-wrapper levels (max 5).
     * Heron quirk: sections are <x-wrap.web-component> custom elements
     * whose OWN rect is 0×0 — the height lives in the first in-flow
     * descendant. effectiveHeight()/resolveContent() see through those
     * wrappers (both the 0-height web-component AND single-child chains). */
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
    /* The element whose rect/style we actually measure for a section:
     * descend single-child chains until a real box appears; on a
     * multi-child 0-height wrapper, measure the wrapper itself (children
     * carry the geometry). */
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
    findSections() {
      let container = document.querySelector('.lenis') || document.querySelector('main') || document.body;
      for (let i = 0; i < 6; i++) {
        const kids = [...container.children].filter((el) => this.effectiveHeight(el) > 8);
        if (kids.length >= 3) return { container, kids };
        const biggest = kids.slice().sort((a, b) => this.effectiveHeight(b) - this.effectiveHeight(a))[0];
        if (!biggest || biggest === container) break;
        container = biggest;
      }
      return { container, kids: [...container.children].filter((el) => this.effectiveHeight(el) > 8) };
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
        rect: null, // filled by caller
      };
    },
    /* A text ELEMENT is one whose own text (not descendants') dominates. */
    isTextElement(n) {
      if (!/^H[1-6]|P|A|BUTTON|LI$/.test(n.tagName)) return false;
      const own = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join(' ');
      if (own.length >= 2) return true;
      /* leaf links/buttons wrapping a span are still text elements */
      return ![...n.children].some((c) => c.children.length > 0);
    },
  };
  return true;
};

const EXTRACT_PAGE = (rootFs) => {
  const fq = window.__fq;
  const { container, kids } = fq.findSections();
  const scTop = fq.readY();
  /* effective bg of a text element: nearest ancestor (incl. self) with a
   * non-transparent background — needed for WCAG contrast off the JSON. */
  const bgEffOf = (n) => {
    let cur = n;
    for (let i = 0; i < 8 && cur; i++) {
      const bg = getComputedStyle(cur).backgroundColor;
      if (bg && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
      cur = cur.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };
  /* per-section border/radius census (capped) — the hairline grammar */
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
    /* heading + text-element metas INSIDE this section, capped */
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
        m.rect = {
          x: Math.round(tr.x), y: Math.round(tr.y + scTop),
          w: Math.round(tr.width), h: Math.round(tr.height),
        };
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
    /* key children boxes (first 12 sizable children) for geometry axis */
    sec.children = [...measureEl.children].filter((c) => c.getBoundingClientRect().height > 8).slice(0, 12).map((c) => {
      const cr = c.getBoundingClientRect();
      return { id: c.tagName.toLowerCase() + '.' + String(c.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.'),
        x: Math.round(cr.x), y: Math.round(cr.y + scTop), w: Math.round(cr.width), h: Math.round(cr.height) };
    });
    return sec;
  });

  /* rhythm: heights, tops, inter-section gaps */
  const rhythm = sections.map((s, i) => ({
    order: i, top: s.rect.y, h: s.rect.h,
    gapBefore: i === 0 ? 0 : s.rect.y - (sections[i - 1].rect.y + sections[i - 1].rect.h),
  }));

  /* type ladder: distinct rendered font sizes over ALL text elements */
  const sizeMap = new Map();
  for (const s of sections) {
    for (const t of s.textEls) {
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
  const headingLadder = typeLadder.filter((e) => Object.keys(e.roles).some((r) => /^h\d$/.test(r)));

  return {
    rootFs,
    scroller: { selector: fq.scrollerSel(), maxScroll: fq.maxScroll() },
    bodyBg, htmlBg,
    docH: (document.querySelector('.lenis') || document.scrollingElement)?.scrollHeight || 0,
    container: container.tagName.toLowerCase() + '.' + String(container.className || '').split(/\s+/).slice(0, 2).join('.'),
    sections, rhythm, typeLadder, headingLadder,
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
  /* CSS transition/animation declarations from reachable stylesheets */
  const transitions = [];
  const animations = [];
  const keyframes = [];
  const walkRules = (ruleList) => {
    for (const r of ruleList) {
      if (!r) continue;
      if (r.type === 7) { keyframes.push(r.name); continue; } /* CSSKeyframesRule */
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
      windowLenis: typeof window.lenis !== 'undefined',
      windowUnderscoreLenis: typeof window.__lenis !== 'undefined',
    },
    gsap: { present: typeof window.gsap !== 'undefined', scrollTrigger: typeof window.ScrollTrigger !== 'undefined',
      scrollTriggerCount: window.ScrollTrigger ? window.ScrollTrigger.getAll().length : 0 },
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
};

/* wheel impulse trace: 16ms interval recorder started BEFORE the trusted
 * wheel from Node; samples [tMs, scrollY] for ~1.15s (rAF proved too sparse
 * on the heavily-animated reference — ~9fps headless on 2 CPUs). */
const INSTALL_RECORDER = () => {
  window.__scrollSamples = [];
  window.__recT0 = performance.now();
  const read = () => {
    const sc = document.querySelector('.lenis');
    return sc ? sc.scrollTop : window.scrollY;
  };
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
  /* fallback when the trusted wheel is swallowed: synthetic WheelEvent */
  const ev = new WheelEvent('wheel', {
    deltaY: 800, deltaMode: 0, bubbles: true, cancelable: true,
    clientX: window.innerWidth / 2, clientY: window.innerHeight / 2,
  });
  (document.querySelector('.lenis') || document.body).dispatchEvent(ev);
  return true;
};

/* ── decay fit (Node side) ──────────────────────────────────────────
 * Model: y(t) = yEnd − A·e^(−(t−t0)/τ). Least squares on ln(residual)
 * for samples with residual > 0.5px after the impulse start.
 * Returns {tauMs, lerpPerFrame, fitQuality, moved}. */
function fitDecay(samples) {
  if (!samples || samples.length < 8) return { tauMs: null, error: 'too-few-samples' };
  const y0 = samples[0][1];
  const yEnd = samples[samples.length - 1][1];
  const moved = yEnd - y0;
  if (moved < 5) return { tauMs: null, moved: Math.round(moved), error: 'no-movement (native instant or blocked)' };
  /* impulse start = first sample that moves > 1px */
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
  /* linear regression ln(res) = ln A − t/τ */
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p[0], 0);
  const sy = pts.reduce((a, p) => a + p[1], 0);
  const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0);
  const sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return { tauMs: null, moved: Math.round(moved), error: 'degenerate-fit' };
  const slope = (n * sxy - sx * sy) / denom;
  if (slope >= -1e-6) return { tauMs: null, moved: Math.round(moved), error: 'non-decay' };
  const tau = -1 / slope; /* slope = −1/τ in ln(res) per ms → τ in ms */
  /* r² of the fit */
  const intercept = (sy - slope * sx) / n;
  const meanY = sy / n;
  let ssTot = 0, ssRes = 0;
  for (const [x, y] of pts) { ssTot += (y - meanY) ** 2; ssRes += (y - (intercept + slope * x)) ** 2; }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  /* Lenis lerp-per-frame equivalent: e^(−16.7/τ) */
  const lerpPerFrame = 1 - Math.exp(-16.7 / tau);
  return { tauMs: Math.round(tau * 10) / 10, lerpPerFrame: Math.round(lerpPerFrame * 1000) / 1000, r2: Math.round(r2 * 1000) / 1000, moved: Math.round(moved), nPts: n };
}

/* ── page driver ──────────────────────────────────────────────────── */

async function openSettled(browser, url, vp, { ua = null, dark = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    colorScheme: dark ? 'dark' : 'light',
    ...(ua ? { userAgent: ua } : {}),
  });
  const page = await context.newPage();
  let status = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = resp ? resp.status() : null;
    if (status && status >= 400) throw new Error('HTTP ' + status);
  } catch (e) {
    if (ua) throw e; /* already the retry */
    await context.close();
    return openSettled(browser, url, vp, { ua: REAL_CHROME_UA });
  }
  await page.waitForSelector('body *', { timeout: 30000 });
  await page.evaluate(PROBE_LIB);
  /* loader settle poll: watch .loading / [class*=preloader] boxes */
  const loaderTimeline = [];
  for (let i = 0; i < LOADER_SETTLE_MS / SETTLE_POLL; i++) {
    await page.waitForTimeout(SETTLE_POLL);
    const st = await page.evaluate(() => {
      const l = document.querySelector('.loading, .loader, [class*=preloader]');
      if (!l) return null;
      const r = l.getBoundingClientRect();
      const cs = getComputedStyle(l);
      return { cls: String(l.className).split(/\s+/).slice(0, 3), visible: cs.opacity !== '0' && cs.display !== 'none' && r.width > 0 };
    });
    loaderTimeline.push(st);
    if (st === null) break; /* loader gone from DOM */
  }
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  return { context, page, status, loaderTimeline };
}

/* traverse once so content-visibility / lazy sections settle */
async function traverse(page) {
  const max = await page.evaluate(() => window.__fq.maxScroll());
  const step = 900;
  for (let y = 0; y < max; y += step) {
    await page.evaluate((yy) => {
      const sc = document.querySelector('.lenis');
      if (sc) sc.scrollTop = yy; else window.scrollTo(0, yy);
    }, y);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(250);
  for (let y = max; y > 0; y -= step * 2) {
    await page.evaluate((yy) => {
      const sc = document.querySelector('.lenis');
      if (sc) sc.scrollTop = yy; else window.scrollTo(0, yy);
    }, y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => {
    const sc = document.querySelector('.lenis');
    if (sc) sc.scrollTop = 0; else window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

async function capturePageViewport(browser, pageDef, vp, manifest) {
  const slug = pageDef.slug;
  const tag = `${slug}-${vp.label}`;
  console.log(`▶ ${tag} ${pageDef.url} (${vp.w}×${vp.h})`);
  const { context, page, status, loaderTimeline } = await openSettled(browser, pageDef.url, vp);
  try {
    await traverse(page);
    const rootFs = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const title = await page.title();

    const extraction = await page.evaluate(EXTRACT_PAGE, rootFs);
    const fonts = await page.evaluate(FONTS_PROBE);
    const motion = await page.evaluate(MOTION_PROBE);

    /* wheel impulse trace (trusted wheel; synthetic fallback) */
    await page.mouse.move(Math.round(vp.w / 2), Math.round(vp.h / 2));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => { const sc = document.querySelector('.lenis'); if (sc) sc.scrollTop = 0; });
    await page.waitForTimeout(250);
    await page.evaluate(INSTALL_RECORDER);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(1250);
    let samples = await page.evaluate(() => window.__scrollSamples);
    let wheelMode = 'trusted';
    let fit = fitDecay(samples);
    if (!fit.tauMs && (fit.error || '').includes('no-movement')) {
      await page.evaluate(() => { const sc = document.querySelector('.lenis'); if (sc) sc.scrollTop = 0; else window.scrollTo(0, 0); });
      await page.waitForTimeout(300);
      await page.evaluate(INSTALL_RECORDER);
      await page.evaluate(SYNTH_WHEEL);
      await page.waitForTimeout(1250);
      samples = await page.evaluate(() => window.__scrollSamples);
      wheelMode = 'synthetic';
      fit = fitDecay(samples);
    }
    /* back to top for the shot */
    await page.evaluate(() => { const sc = document.querySelector('.lenis'); if (sc) sc.scrollTop = 0; else window.scrollTo(0, 0); });
    await page.waitForTimeout(400);

    /* ScrollTrigger params (if present) — geometry-level facts only */
    const triggers = await page.evaluate(() => {
      if (!window.ScrollTrigger) return [];
      return window.ScrollTrigger.getAll().slice(0, 40).map((t) => {
        const el = t.trigger || t.vars?.trigger;
        return {
          triggerCls: el ? String(el.className || '').split(/\s+/).slice(0, 3).join('.') : null,
          start: t.vars?.start || null, end: t.vars?.end || null,
          scrub: t.vars?.scrub ?? false, pin: !!(t.vars?.pin || t.pin),
          animationDur: t.animation ? Math.round(t.animation.duration() * 100) / 100 : null,
        };
      });
    });

    const doc = {
      capturedAt: new Date().toISOString(),
      url: pageDef.url, title, httpStatus: status, viewport: { w: vp.w, h: vp.h },
      loaderSettle: { polls: loaderTimeline.length, lastState: loaderTimeline[loaderTimeline.length - 1] },
      ...extraction, fonts, motion: { ...motion, triggers },
      scrollFeel: { wheelMode, impulse: { dy: 800, mode: wheelMode }, fit, samples },
    };

    /* screenshot policy: PNG at 1440/390 for the key design-bearing pages
     * (home, pricing — pixelmatch pairs); JPEG q80 elsewhere; none mode */
    const isKeyPage = slug === 'home' || slug === 'pricing';
    const isPngVp = vp.label === '1440' || vp.label === '390';
    let shotRel = null;
    let shotBytes = 0;
    if (shotMode !== 'none') {
      const ext = (shotMode === 'all' || (isKeyPage && isPngVp)) ? 'png' : 'jpg';
      shotRel = `shots/${tag}.${ext}`;
      const shotPath = path.join(OUT_DIR, shotRel);
      await page.screenshot({ path: shotPath, fullPage: true, ...(ext === 'png' ? {} : { type: 'jpeg', quality: 80 }) });
      shotBytes = fs.statSync(shotPath).size;
    }

    const jsonRel = `pages/${tag}.json`;
    const jsonPath = path.join(OUT_DIR, jsonRel);
    fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 1));

    const sizes = { json: fs.statSync(jsonPath).size, shot: shotBytes };
    console.log(`  ✓ sections=${doc.sections.length} docH=${doc.docH} ladder=${doc.headingLadder.map((l) => l.px).join('/')} τ=${fit.tauMs ?? '—'}ms shot=${Math.round(shotBytes / 1024)}KB`);
    manifest.files.push({ page: slug, viewport: vp.label, json: jsonRel, shot: shotRel, bytes: sizes });
    return doc;
  } finally {
    await context.close();
  }
}

/* ── main ─────────────────────────────────────────────────────────── */
let browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
});
let captureCount = 0;
const RESTART_EVERY = 6; /* 2-CPU sandbox: restart chromium every N captures to dodge cumulative OOM ("Failed to open a new tab" after ~20 contexts) */
async function relaunchBrowser() {
  try { await browser.close(); } catch { /* already dead */ }
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  });
}

try {
  if (SUPPLEMENT) {
    /* ── supplement mode: merge bgEff/bodyBg/census into existing JSONs ── */
    const manifestPath = path.join(OUT_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error('manifest.json missing — run the full extraction first');
    const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const targets = man.pages
      .filter((p) => !pageFilter || p.pathname === pageFilter || (pageFilter === '/' && p.pathname === '/'))
      .flatMap((p) => VIEWPORTS.map((vp) => ({ ...p, vp })))
      .filter((t) => fs.existsSync(path.join(OUT_DIR, 'pages', `${t.slug}-${t.vp.label}.json`)));
    console.log(`▶ supplement: ${targets.length} captures ${DARK ? '(colorScheme:dark)' : ''}`);
    for (const t of targets) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          if (captureCount > 0 && captureCount % RESTART_EVERY === 0) await relaunchBrowser();
          const { context, page } = await openSettled(browser, t.url, t.vp, { dark: DARK });
          try {
            await traverse(page);
            const rootFs = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
            const extraction = await page.evaluate(EXTRACT_PAGE, rootFs);
            const outName = DARK ? `${t.slug}-${t.vp.label}-dark.json` : `${t.slug}-${t.vp.label}.json`;
            const outPath = path.join(OUT_DIR, 'pages', outName);
            let doc;
            if (DARK && !fs.existsSync(outPath)) {
              doc = { capturedAt: new Date().toISOString(), url: t.url, title: await page.title(), colorScheme: 'dark', ...extraction };
            } else {
              doc = JSON.parse(fs.readFileSync(outPath, 'utf8'));
              Object.assign(doc, extraction, { supplementedAt: new Date().toISOString(), ...(DARK ? { colorScheme: 'dark' } : {}) });
            }
            fs.writeFileSync(outPath, JSON.stringify(doc, null, 1));
            console.log(`  ✓ ${outName} — census ok (sections=${extraction.sections.length})`);
            captureCount++;
            break;
          } finally {
            await context.close();
          }
        } catch (e) {
          console.error(`  ✗ ${t.slug}-${t.vp.label} (attempt ${attempt}): ${String(e.message).slice(0, 120)}`);
          if (attempt === 2) console.error('  giving up on this capture');
          await relaunchBrowser().catch(() => {});
        }
      }
    }
    if (DARK) {
      man.darkSupplement = { generatedAt: new Date().toISOString(), note: 'pages/<slug>-<vp>-dark.json = same extraction with colorScheme:dark (Heron auto dark mode)' };
      fs.writeFileSync(manifestPath, JSON.stringify(man, null, 1));
    }
    console.log('\nsupplement done');
  } else {
  /* PASS 1 — discover pages via the site's own rendered nav (crawl rule) */
  console.log('▶ crawl: discovering pages from rendered nav @1440×900');
  const { context: cctx, page: cpage } = await openSettled(browser, BASE + '/', { w: 1440, h: 900 });
  const discovered = await cpage.evaluate((base) => {
    const found = new Map();
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
      let u;
      try { u = new URL(href, base); } catch { continue; }
      if (u.origin !== new URL(base).origin) continue;
      if (/\.(css|js|png|jpe?g|webp|avif|svg|gif|pdf|ico|mp4|woff2?)$/i.test(u.pathname)) continue;
      const key = u.pathname.replace(/\/+$/, '') || '/';
      if (!found.has(key)) found.set(key, u.origin + key);
    }
    return [...found.entries()].map(([pathname, url]) => ({ pathname, url }));
  }, BASE);
  await cctx.close();
  const pages = discovered
    .slice(0, 12) /* safety cap */
    .map((d) => ({ url: d.url, pathname: d.pathname, slug: slugOf(d.url) }))
    .filter((p) => !pageFilter || p.pathname === pageFilter || (pageFilter === '/' && p.pathname === '/'));
  console.log(`  discovered ${discovered.length} same-origin pages: ${pages.map((p) => p.pathname).join(', ')}`);

  /* PASS 2 — capture each page × viewport */
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: BASE,
    extractor: 'scripts/fidelity/heron-extract.mjs',
    crawlRule: 'load / at 1440×900, settle loader, collect same-origin <a href> from the rendered DOM (header/nav/footer/body), dedupe by pathname, crawl each with a fresh context per page×viewport',
    ipPolicy: 'geometry + computed styles + motion facts only; text recorded as {role,charCount,lineCount,indexLabel} metadata; media = filename tail only; no content downloaded',
    viewports: VIEWPORTS,
    pages: pages.map((p) => ({ url: p.url, slug: p.slug })),
    shotPolicy: `full-page PNG for the key design pages (home, pricing) at 1440/390 — the pixelmatch pairs; JPEG q80 for every other page/viewport (contact sheets); mode=${shotMode}`,
    scrollFeelRule: 'trusted mouse.wheel(0,800) at viewport centre, 16ms samples of the Lenis scroller scrollTop for ~1.15s, least-squares exponential-decay fit → τ (ms) + Lenis-equivalent lerp/frame; synthetic WheelEvent fallback if the trusted wheel is swallowed',
    files: [],
  };
  for (const pageDef of pages) {
    for (const vp of VIEWPORTS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          if (captureCount > 0 && captureCount % RESTART_EVERY === 0) {
            console.log('  · restarting chromium (memory hygiene)');
            await relaunchBrowser();
          }
          await capturePageViewport(browser, pageDef, vp, manifest);
          captureCount++;
          break;
        } catch (e) {
          console.error(`  ✗ ${pageDef.slug}-${vp.label} (attempt ${attempt}): ${String(e.message).slice(0, 120)}`);
          if (attempt === 2) manifest.files.push({ page: pageDef.slug, viewport: vp.label, error: String(e.message).slice(0, 200) });
          await relaunchBrowser().catch(() => {});
        }
      }
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const totalKB = manifest.files.reduce((a, f) => a + (f.bytes ? f.bytes.json + f.bytes.shot : 0), 0);
  console.log(`\nmanifest.json written — ${manifest.files.length} captures, ${(totalKB / 1024 / 1024).toFixed(1)} MB total`);
  }
} finally {
  await browser.close();
}
