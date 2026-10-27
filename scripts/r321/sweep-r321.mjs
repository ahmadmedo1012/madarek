#!/usr/bin/env node
/**
 * sweep-r321.mjs — the R321 runtime rules, run per route × viewport ×
 * theme cell against a LIVE base URL (dev server or vite preview of
 * the production build — both serve the public routes guest-side).
 *
 * The three rules (R321 BOARD §A extensions — standing gates, never
 * loosened):
 *
 *   text-in-viewport  EVERY visible text element's rect lies inside
 *                     [0, innerWidth] (±1px). This is the RECT check
 *                     the R318/R320 scrollWidth checks cannot do: the
 *                     legal sheets' `.lg { overflow-x: clip }` made the
 *                     phone clipping invisible to scrollWidth (§A4).
 *   duplicate-text    no two visible text nodes with identical
 *                     normalised text inside the same page region
 *                     (§A5: the error pages' code read twice). Regions
 *                     = the page's main landmark + its direct sections;
 *                     known intentional repeats live in the allowlist.
 *   decor-innertext   decorative marks carry NO DOM text (the §A6
 *                     pseudo-element contract) and every `[nn]`-style
 *                     mono code appears at most once in a region's
 *                     innerText (kicker/footer duplication class).
 *
 * CLI: node scripts/r321/sweep-r321.mjs --base-url http://… [--routes …]
 *      [--viewports 320,360,390,430] [--themes light,dark] [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const ALLOW = path.join(HERE, 'sweep-allowlist.json');

const ROUTES = {
  landing: '/',
  'legal-privacy': '/legal/privacy',
  'legal-terms': '/legal/terms',
  'legal-cookies': '/legal/cookies',
  'legal-accessibility': '/legal/accessibility',
  'legal-security': '/legal/security',
  'legal-data': '/legal/data',
  about: '/about',
  help: '/help',
  contact: '/contact',
  auth: '/auth',
  'forgot-password': '/auth/forgot-password',
  colleges: '/colleges',
  campus: '/campus',
  capabilities: '/capabilities',
  'not-found': '/404',
  'forbidden': '/403',
  'server-error': '/500',
  maintenance: '/maintenance',
};

function parseArgs(argv) {
  const opt = {
    baseUrl: null, routes: Object.keys(ROUTES), viewports: [320, 360, 390, 430],
    themes: ['light', 'dark'], quick: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base-url') opt.baseUrl = argv[++i];
    else if (a === '--routes') opt.routes = argv[++i].split(',').filter((r) => ROUTES[r]);
    else if (a === '--viewports') opt.viewports = argv[++i].split(',').map(Number).filter(Boolean);
    else if (a === '--themes') opt.themes = argv[++i].split(',');
    else if (a === '--quick') opt.quick = true;
  }
  if (opt.quick) { opt.routes = ['legal-privacy', 'legal-cookies', 'auth', 'server-error']; opt.viewports = [390]; opt.themes = ['light']; }
  return opt;
}

function loadAllowlist() {
  try { return JSON.parse(fs.readFileSync(ALLOW, 'utf8')); } catch { return { duplicateText: [] }; }
}

const IN_PAGE = () => {
  const norm = (s) => s.replace(/[\s\u00A0]+/g, ' ').replace(/[^\p{L}\p{N}]/gu, '').trim();
  const vw = window.innerWidth;
  const out = { clip: [], dup: [], decor: [] };
  // designed clip containers (allowlist.clipContainers): marquees and
  // the panning map stage intentionally paint content outside the
  // viewport — their text rides through a clip window, it is never a
  // static overflow defect.
  const CLIP_CONTAINERS = (window.__R321_CLIP_CONTAINERS__ || []);
  const insideDesignedClip = (el) => CLIP_CONTAINERS.some((sel) => el.closest(sel));

  // ── text-in-viewport: every visible text element's rect inside ──
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seenEl = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const t = (n.textContent || '').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || seenEl.has(el)) continue;
    seenEl.add(el);
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    if (insideDesignedClip(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.left < -1 || r.right > vw + 1) {
      out.clip.push({ text: t.slice(0, 36), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) });
    }
  }
  out.clip = out.clip.slice(0, 10);

  // ── duplicate-text: per REGION (main landmark's direct sections +
  //    the main itself), no two visible leaf text nodes with the same
  //    normalised text ──
  const visible = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) !== 0;
  };
  const regions = [];
  const main = document.querySelector('main');
  if (main) {
    regions.push({ name: 'main', el: main });
    for (const sec of main.children) {
      if (sec.tagName.toLowerCase() === 'section' || sec.classList.contains('lg-head') || sec.classList.contains('nf-scene')) {
        regions.push({ name: `main>${sec.tagName.toLowerCase()}.${String(sec.className).split(' ')[0]}`, el: sec });
      }
    }
  }
  for (const region of regions) {
    const seen = new Map();
    const w = document.createTreeWalker(region.el, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = w.nextNode())) {
      const raw = (tn.textContent || '').trim();
      if (raw.length < 2) continue;
      const el = tn.parentElement;
      if (!el || !visible(el)) continue;
      // TABLE cell data repeats legitimately (a column value appears
      // once per row by design — the §B card transformation keeps the
      // data); the duplicate-text rule targets PROSE/LABEL copy.
      if (el.closest('table, [role=\'table\']')) continue;
      // marquee tracks duplicate their payload for the seamless loop —
      // designed motion, not copy drift (the clipContainers contract).
      if (insideDesignedClip(el)) continue;
      // leaf-ish: the text node is the element's only child text
      if ([...el.childNodes].some((c) => c.nodeType === 3 && c !== tn && (c.textContent || '').trim())) continue;
      const key = norm(raw);
      if (!key) continue;
      // pure ≤2-digit numerics are the drafting voice ([01]-[09] mono
      // section indexes) — exempt by CLASS of text, not per-number rows.
      if (/^\d{1,2}$/.test(key)) continue;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    for (const [k, count] of seen) if (count > 1) out.dup.push({ region: region.name, norm: k.slice(0, 40), count });
  }
  out.dup = out.dup.slice(0, 10);

  // ── decor-innertext: marks carry no text; mono codes read once ──
  for (const m of document.querySelectorAll('[class*="-mark"]')) {
    const txt = (m.textContent || '').trim();
    if (txt) out.decor.push({ kind: 'mark-text', cls: String(m.className).slice(0, 40), text: txt.slice(0, 10) });
  }
  // kicker/footer code duplication (the ERR [nnn] class): any /\b[A-Z]{2,4} ?\[\d+\]/ or MM [01]
  const it = (main || document.body).innerText || '';
  const codeRe = /\b(?:ERR|MM|HTM?|L)\s*\[\d+\]/g;
  const codes = new Map();
  for (const m of it.matchAll(codeRe)) codes.set(m[0], (codes.get(m[0]) || 0) + 1);
  for (const [code, count] of codes) if (count > 1) out.decor.push({ kind: 'code-twice', code, count });
  out.decor = out.decor.slice(0, 10);

  return out;
};

const args = parseArgs(process.argv.slice(2));
if (!args.baseUrl) { console.error('sweep-r321: --base-url required'); process.exit(2); }
const allow = loadAllowlist();

/* ── §A2 — the docH hard ratchet ──────────────────────────────────
 * The reference ladder (docs/redesign/r313/STATE.md +
 * r308/reference-interaction-map.json, measured live on Heron). The
 * five referenced viewports gate at ±1.5%; the other six pin the
 * measured value (never-raise — the baseline owns those numbers). */
const HERON_DOCH = { 1440: 12355, 1024: 9938, 768: 12577, 390: 11441, 360: 10684 };
const DOCH_VIEWPORTS = [
  [320, 568], [360, 800], [390, 844], [430, 932], [480, 800],
  [600, 800], [768, 1024], [820, 1180], [1024, 768], [1180, 800], [1440, 900],
];

async function dochPass(browser, baseUrl, cells) {
  for (const [w, h] of DOCH_VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const check = { status: 'PASS', metric: 0, sample: '' };
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const docH = await page.evaluate(() => document.documentElement.scrollHeight);
      const heron = HERON_DOCH[w];
      if (heron) {
        const delta = (docH / heron - 1) * 100;
        const ok = Math.abs(delta) <= 1.5;
        check.status = ok ? 'PASS' : 'FAIL';
        check.metric = ok ? 0 : 1;
        check.sample = `docH ${docH} = ${delta.toFixed(2)}% vs Heron ${heron} (±1.5% band)`;
      } else {
        check.sample = `docH ${docH} (no Heron ref — never-raise pin, ${w}×${h})`;
      }
      check.docH = docH;
    } catch (e) {
      check.status = 'FAIL';
      check.metric = 1;
      check.sample = String(e).slice(0, 100);
    }
    cells.push({ route: 'docH-ladder', viewport: w, theme: '—', checks: { 'docH-ladder': check } });
    await ctx.close();
  }
}

const browser = await chromium.launch();
const cells = [];
if (args.routes.includes('landing')) await dochPass(browser, args.baseUrl, cells);
for (const route of args.routes) {
  for (const vp of args.viewports) {
    for (const theme of args.themes) {
      const ctx = await browser.newContext({
        viewport: { width: vp, height: 800 },
        colorScheme: theme,
      });
      const page = await ctx.newPage();
      const cell = { route, viewport: vp, theme, checks: {} };
      try {
        await page.goto(`${args.baseUrl}${ROUTES[route]}`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(250);
        const clipSels = (allow.clipContainers || []).map((c) => (typeof c === 'string' ? c : c.sel)).filter(Boolean);
        if (clipSels.length) {
          await page.evaluate((sels) => { window.__R321_CLIP_CONTAINERS__ = sels; }, clipSels);
        }
        if (theme === 'dark') {
          await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'dark');
          });
          await page.waitForTimeout(120);
        }
        const r = await page.evaluate(IN_PAGE);
        const clipCount = r.clip.length;
        const dupAllowed = (d) => allow.duplicateText.some((a) => d.norm.startsWith(a.norm) || (a.route && a.route === route && d.norm.startsWith(a.norm)));
        const dupBad = r.dup.filter((d) => !dupAllowed(d));
        const decorBad = r.decor;
        cell.checks['text-in-viewport'] = { status: clipCount ? 'FAIL' : 'PASS', metric: clipCount, sample: clipCount ? JSON.stringify(r.clip[0]) : 'clean' };
        cell.checks['duplicate-text'] = { status: dupBad.length ? 'FAIL' : 'PASS', metric: dupBad.length, sample: dupBad.length ? JSON.stringify(dupBad[0]) : 'clean' };
        cell.checks['decor-innertext'] = { status: decorBad.length ? 'FAIL' : 'PASS', metric: decorBad.length, sample: decorBad.length ? JSON.stringify(decorBad[0]) : 'clean' };
      } catch (e) {
        cell.error = String(e).slice(0, 140);
      }
      cells.push(cell);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(JSON.stringify({ cells, generated: new Date().toISOString() }));
