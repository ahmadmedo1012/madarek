#!/usr/bin/env node
/**
 * r321-probe.mjs — the R321 cycle-1 measurement probe (run against
 * `vite preview` of the built frontend; no backend needed for the
 * public surfaces).
 *
 * Measures, per the §A tickets:
 *  · A6 the orange tick: samples the element stack at (1,1) + every
 *    fixed element whose box touches the top-left pixel, on a public
 *    page AND an error page.
 *  · A4 the RTL clip: walks every text-bearing element on the public
 *    sheets at 320/360/390/430 and reports anything outside
 *    [0, innerWidth] (rect-based, not scrollWidth — the owner's
 *    finding: `.lg { overflow-x: clip }` hides overflow from
 *    scrollWidth).
 *  · A8 the auth title scale + the in-row label wrap + the demo panel
 *    open state, at 390 and 1440.
 *  · A5/A6 innerText cleanliness on the error pages: the code reads
 *    once, no `+` mark runs.
 *  · A2 the docH ladder quick read at the five pinned viewports.
 *
 * Usage: node scripts/r321/probe.mjs [--base http://localhost:4173]
 */
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : 'http://localhost:4173';

const browser = await chromium.launch();

const out = { base: BASE, tick: {}, clip: [], auth: {}, innerText: {}, docH: {} };

async function newPage(vp) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
  return ctx;
}

/* ── A6: the orange tick at (0,0) ─────────────────────────────────── */
for (const route of ['/', '/500', '/legal/privacy']) {
  const ctx = await newPage({ width: 390, height: 844 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  out.tick[route] = await page.evaluate(() => {
    const stack = document.elementsFromPoint(1.5, 1.5).map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 60),
        bg: cs.backgroundColor,
        bgImage: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 80) : 'none',
        opacity: cs.opacity,
        display: cs.display,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      };
    });
    // any element painting non-transparently at the pixel
    return stack.slice(0, 6);
  });
  await ctx.close();
}

/* ── A4: rect-clip sweep on the public sheets ─────────────────────── */
const PUBLIC_SHEETS = [
  '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/accessibility',
  '/legal/security', '/legal/data', '/about', '/help', '/contact',
  '/auth', '/auth/forgot-password', '/colleges', '/campus',
  '/capabilities', '/404', '/403', '/500', '/maintenance',
];
for (const vp of [{ width: 320, height: 568 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
  for (const route of PUBLIC_SHEETS) {
    const ctx = await newPage(vp);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(250);
      const bad = await page.evaluate(() => {
        const vw = window.innerWidth;
        const bad = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        let n;
        while ((n = walker.nextNode())) {
          const t = (n.textContent || '').trim();
          if (!t) continue;
          const el = n.parentElement;
          if (!el || seen.has(el)) continue;
          seen.add(el);
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (r.left < -1 || r.right > vw + 1) {
            bad.push({
              text: t.slice(0, 40),
              tag: el.tagName.toLowerCase(),
              cls: String(el.className).slice(0, 50),
              left: Math.round(r.left),
              right: Math.round(r.right),
              vw,
            });
          }
        }
        return bad.slice(0, 8);
      });
      if (bad.length) out.clip.push({ route, vp: vp.width, bad });
    } catch (e) {
      out.clip.push({ route, vp: vp.width, error: String(e).slice(0, 100) });
    }
    await ctx.close();
  }
}

/* ── A8: the auth door at 390 + 1440 ──────────────────────────────── */
for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const ctx = await newPage(vp);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  out.auth[vp.width] = await page.evaluate(() => {
    const h1 = document.querySelector('.auth-form-title');
    const h1r = h1?.getBoundingClientRect();
    const cs = h1 ? getComputedStyle(h1) : null;
    const label = document.querySelector('.auth-cell .form-label');
    const labelLine = label ? Math.round(label.getBoundingClientRect().height) : null;
    const demo = document.querySelector('.auth-demo-hint');
    const rows = document.querySelectorAll('.auth-demo-row').length;
    const groups = [...document.querySelectorAll('.auth-demo-group-label')].map((g) => g.textContent);
    // a pf-page-title comparator from any route is impossible here (auth
    // only) — record the raw computed size + box.
    return {
      h1: cs ? { font: cs.fontSize, lines: h1r ? Math.round(h1r.height / parseFloat(cs.lineHeight)) : 0, boxH: h1r ? Math.round(h1r.height) : 0 } : null,
      labelLineH: labelLine,
      demoOpen: !!demo,
      demoRows: rows,
      groups,
    };
  });
  await ctx.close();
}

/* ── A5/A6: innerText cleanliness on error pages ──────────────────── */
for (const route of ['/500', '/403', '/404', '/maintenance']) {
  const ctx = await newPage({ width: 390, height: 844 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  out.innerText[route] = await page.evaluate(() => {
    const it = (document.querySelector('.nf-scene') || document.body).innerText;
    const norm = it.replace(/[\s\n]+/g, ' ').trim();
    const count = (re) => (norm.match(re) || []).length;
    return {
      plusRuns: count(/\+/g),
      errReads: count(/ERR ?\[?\d+\]?/g) + count(/ERR · \d+/g),
      snippet: norm.slice(0, 220),
    };
  });
  await ctx.close();
}

/* ── A2: docH quick ladder ────────────────────────────────────────── */
for (const vp of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
  const ctx = await newPage(vp);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  out.docH[vp.width] = await page.evaluate(() => Math.round(document.documentElement.scrollHeight));
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 1));
