#!/usr/bin/env node
/* eslint-disable */
/**
 * heron-extract.mjs — R322 «DESIGN DIRECTOR EDITION» · §2 THE TRANSPLANT METHOD, step 1 (CAPTURE).
 * Package 1-c (heron sub-agent): the STRUCTURE + NUMBERS extractor for https://heronaiapp.com/
 *
 * WHAT THIS IS
 *   One polite Playwright chromium visit per breakpoint (1440×900 / 768×1024 / 390×844)
 *   to the Heron reference site of record. It records GEOMETRY (px + rem on the site's own
 *   fluid root), COMPUTED STYLES, GRID, and MOTION PARAMETERS only, so the Madarek
 *   transplant packages can rebuild the same grammar with our own Arabic copy + artwork.
 *
 * HARD RULES ENCODED HERE (owner brief §12 + task 1-c hard rules)
 *   - NO copying of Heron text / logo / images / artwork. Text nodes are recorded ONLY as
 *     metadata: {role guess, approx char count, line count, language}. alt / aria-label
 *     values are recorded as PRESENCE + character length, never their content. Media src
 *     is recorded as the LAST PATH SEGMENT (filename pattern) only; nothing is downloaded.
 *   - Screenshots are internal evidence captures written under audits/evidence/r322/heron/
 *     (JPEG q70) — reference sheets for side-by-side review; never inlined into product code.
 *   - The Awwwards badge is measured for completeness but flagged DO_NOT_TRANSPLANT
 *     (R322 non-negotiable: no award badges in Madarek).
 *   - Cookie/consent banner: geometry noted, Escape attempted once, consent buttons are
 *     NEVER clicked.
 *
 * SITE FACTS LEARNED FROM THE 2026 PROBES (kept here for provenance; re-verified each run)
 *   - Webflow export (html class `w-mod-js`) + GSAP 3.12.5 + ScrollTrigger (41 triggers
 *     @1440) + Lenis attached to a CUSTOM WRAPPER `.main-inner` (it carries the `lenis`
 *     class; `window.lenis` is NOT exposed). The window itself does not scroll: body is
 *     locked at viewport height and `.main-inner` is the real scroller — every scroll
 *     action below goes through it.
 *   - Entrance loader `.loading` auto-dismisses (ends with class `loaded`, collapses to
 *     0×0); no click is required. We poll it during the settle delay to time it.
 *   - Fixed chrome: `header.header` (7,7 · 1427×56 @1440), `.main-deco` page frame
 *     (7px inset, 1px hairline), custom cursor canvas, awwwards badge on the right rail.
 *   - Sections inside the scroller are class-named: home-hero / home-intro / home-problem /
 *     home-map / home-platform / home-why / home-usecase / cta (+ footer). THIS package
 *     extracts header / hero(home-hero) / statement(home-intro) / problem(home-problem);
 *     map/platform/roles/CTA/footer are later packages (the outline is still recorded).
 *   - Section picking is done by GENERIC HEURISTICS (fixed+small ⇒ header; first ~100vh
 *     section ⇒ hero; next band with a large illustration ⇒ statement; next band with a
 *     3–4 equal-cell grid ⇒ problem) and cross-checked against the known class names;
 *     every matched fact is written to the JSON so the foreman can verify the pick.
 *
 * OUTPUTS (bp label ∈ {1440, 768, 390})
 *   docs/redesign/r322/heron/<section>-<bp>.json   for section ∈ {header, hero, statement, problem}
 *   docs/redesign/r322/heron/scroll-spec.json      (merged across the breakpoints of a run)
 *   audits/evidence/r322/heron/full-<bp>.jpg       (full-page reference sheet — method recorded)
 *   audits/evidence/r322/heron/<section>-<bp>-<state>.jpg (scroll-state viewport captures)
 *
 * USAGE (from the worktree root — node_modules is symlinked to the main repo)
 *   node scripts/r322/heron-extract.mjs                      # all 3 breakpoints, sequentially
 *   node scripts/r322/heron-extract.mjs --bp=1440x900        # one breakpoint, one visit
 *
 * FAILURE POLICY (task 1-c §8): networkidle timeout / HTTP ≥ 400 ⇒ ONE retry in a fresh
 * context with a real-Chrome user agent; if still blocked we would fall back to a curl of
 * the static HTML skeleton (clearly marked "static-HTML basis") — the site has been 200 OK
 * from this sandbox on every probe, so the fallback is a guard rail, not the expected path.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..'); // worktree root

const URL = 'https://heronaiapp.com/';
const OUT_DIR = path.join(ROOT, 'docs', 'redesign', 'r322', 'heron');
const EV_DIR = path.join(ROOT, 'audits', 'evidence', 'r322', 'heron');
const REAL_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SETTLE_MS = 6000; // entrance loader + Webflow fonts/images settle (task 1-c §1)
const STATE_SETTLE_MS = 800; // per scroll-state settle (task 1-c §5)
const MAX_CHILDREN = 40; // JSON size cap per task 1-c practical notes

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const bpArg = args.find((a) => a.startsWith('--bp='));
const ALL_BPS = [
  { label: '1440', w: 1440, h: 900 },
  { label: '768', w: 768, h: 1024 },
  { label: '390', w: 390, h: 844 },
];
const BPS = bpArg
  ? ALL_BPS.filter((b) => `${b.w}x${b.h}` === bpArg.slice(5) || b.label === bpArg.slice(5))
  : ALL_BPS;
if (!BPS.length) {
  console.error('Bad --bp (want 1440x900 / 768x1024 / 390x844 or 1440 / 768 / 390)');
  process.exit(2);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(EV_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// node-side helpers
// ─────────────────────────────────────────────────────────────────────────────
const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/** Parse a JPEG buffer for its pixel size (SOF marker walk) — used to sanity-check
 *  full-page captures on a site whose BODY is locked at viewport height (the real
 *  document lives inside the `.main-inner` scroller, so a naive fullPage screenshot
 *  would only be ~900px tall). */
function jpgSize(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj)); // compact: content-only measured ~55–70KB; indent would triple it over the 150KB budget
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`  wrote ${path.relative(ROOT, file)} (${kb} KB)`);
  if (fs.statSync(file).size > 150 * 1024) {
    console.warn(`  ⚠ over the 150KB budget: ${path.relative(ROOT, file)}`);
  }
}

function countNodes(node) {
  if (!node) return 0;
  let n = 1;
  if (node.ch) for (const c of node.ch) n += countNodes(c);
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// in-page extraction functions (serialized into the page — must be self-contained)
// ─────────────────────────────────────────────────────────────────────────────

/** Root scan: document metrics, scroller discovery, the fixed page frame + overlays,
 *  the depth≤2 outline, and section picking with recorded heuristics. */
const ROOT_SCAN = () => {
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const cs = (el) => getComputedStyle(el);
  const shortId = (id) => {
    if (!id) return null;
    const m = /^w-node-[a-f0-9-]+-(.+)$/.exec(id); // Webflow node ids: keep the tail only
    return (m ? 'w-node:' + m[1] : id).slice(0, 40);
  };
  const clsOf = (el) =>
    typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0, 6) : [];
  const desc = (el) => {
    const r = el.getBoundingClientRect();
    const s = cs(el);
    return {
      tag: el.tagName.toLowerCase(), id: shortId(el.id), cls: clsOf(el),
      bx: [r2(r.x), r2(r.y), r2(r.width), r2(r.height)],
      pos: s.position, z: s.zIndex === 'auto' ? null : parseInt(s.zIndex, 10), op: s.opacity,
      kids: el.children.length,
    };
  };

  // — scroller discovery (site: .main-inner.lenis; generic fallback for robustness) —
  let scroller = null, scrollerVia = null;
  const lenisEl = document.querySelector('.lenis');
  if (lenisEl && lenisEl.scrollHeight > lenisEl.clientHeight + 10) {
    scroller = lenisEl; scrollerVia = 'class .lenis (custom-wrapper Lenis)';
  } else {
    let best = null;
    for (const el of document.querySelectorAll('body *')) {
      const s = cs(el);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > innerHeight) {
        if (!best || el.scrollHeight > best.scrollHeight) best = el;
      }
    }
    if (best) { scroller = best; scrollerVia = 'overflow heuristic (tallest scrollable)'; }
  }
  if (!scroller) { scroller = document.documentElement; scrollerVia = 'documentElement fallback'; }
  const scCs = cs(scroller);
  const scSelector = scroller === document.documentElement ? 'html'
    : scroller.tagName.toLowerCase() + (clsOf(scroller).length ? '.' + clsOf(scroller).join('.') : '');

  // — document metrics —
  const htmlCs = cs(document.documentElement);
  const rootFs = parseFloat(htmlCs.fontSize);
  const meta = {
    viewport: { w: innerWidth, h: innerHeight },
    rootFontSize: { px: r2(rootFs), vwPct: r2((rootFs / innerWidth) * 100) },
    htmlClass: document.documentElement.className,
    bodyClass: typeof document.body.className === 'string' ? document.body.className : '',
    bodyBg: cs(document.body).backgroundColor,
    htmlBg: htmlCs.backgroundColor,
    bodyScrollH: document.body.scrollHeight,
    docH: scroller.scrollHeight, // the REAL content height (body is viewport-locked)
    scroller: {
      selector: scSelector, via: scrollerVia, classList: clsOf(scroller),
      clientH: scroller.clientHeight, scrollH: scroller.scrollHeight,
      maxScroll: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
      computed: {
        overflow: scCs.overflow, overflowX: scCs.overflowX, overflowY: scCs.overflowY,
        scrollBehavior: scCs.scrollBehavior, overscrollBehavior: scCs.overscrollBehavior,
        webkitOverflowScrolling: scCs.webkitOverflowScrolling || null,
      },
    },
  };

  // — the fixed page frame (Heron: 7px-inset 1px hairline) + fixed overlays —
  const frame = { inset: null, hairline: null, elements: [], fixedOverlays: [] };
  const deco = document.querySelector('.main-deco') ||
    [...document.querySelectorAll('body *')].find((el) => {
      const s = cs(el);
      return s.position === 'fixed' && s.pointerEvents === 'none' && parseInt(s.zIndex, 10) >= 100000;
    }) || null;
  if (deco) {
    const dr = deco.getBoundingClientRect();
    const inner = deco.querySelector('.main-deco-inner') || deco.firstElementChild;
    const ir = inner ? inner.getBoundingClientRect() : dr;
    frame.inset = { top: r2(ir.top), right: r2(innerWidth - ir.right), bottom: r2(innerHeight - ir.bottom), left: r2(ir.left) };
    frame.decoBox = [r2(dr.x), r2(dr.y), r2(dr.width), r2(dr.height)];
    frame.elements = [...deco.querySelectorAll('*')].slice(0, 8).map((el) => {
      const d = desc(el); const s = cs(el);
      d.borders = ['Top', 'Right', 'Bottom', 'Left'].map((side) => {
        const w = s['border' + side + 'Width'], st = s['border' + side + 'Style'], c = s['border' + side + 'Color'];
        return st === 'none' || parseFloat(w) === 0 ? null : `${parseFloat(w)}px ${st} ${c}`;
      }).filter(Boolean);
      return d;
    });
    const firstWithBorder = frame.elements.find((e) => e.borders && e.borders.length);
    frame.hairline = firstWithBorder ? firstWithBorder.borders[0] : null;
  }
  for (const el of document.querySelectorAll('body *')) {
    const s = cs(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 && r.height < 2) continue;
    const d = desc(el);
    d.sticky = s.position === 'sticky';
    const clsStr = typeof el.className === 'string' ? el.className : '';
    if (/awwward/i.test(clsStr + ' ' + (el.id || ''))) {
      d.note = 'DO_NOT_TRANSPLANT — award badge (R322 non-negotiable)';
    }
    if (/cookie|consent|gdpr|banner|privacy/i.test(clsStr)) {
      d.note = (d.note ? d.note + '; ' : '') + 'consent banner — geometry only, never accepted';
    }
    frame.fixedOverlays.push(d);
  }

  // — depth≤2 outline (task 1-c §3): body > *, .body-inner > *, main > *, scroller > *,
  //    + every <section> (the semantic section roots — they sit ~depth 5 inside the scroller) —
  const seen = new Set();
  const outline = [];
  const roots = [
    ...document.querySelectorAll('body > *'),
    ...document.querySelectorAll('.body-inner > *'),
    ...document.querySelectorAll('main > *'),
    ...document.querySelectorAll('body > * > *'),
  ];
  if (scroller !== document.documentElement) roots.push(...scroller.children);
  roots.push(...scroller.querySelectorAll('section'));
  for (const el of roots) {
    if (seen.has(el) || /^(script|style|noscript|link|meta)$/i.test(el.tagName)) continue;
    seen.add(el);
    const d = desc(el);
    const r = el.getBoundingClientRect();
    d.docY = r2(scroller === document.documentElement || scroller.contains(el)
      ? r.top - (scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top) + scroller.scrollTop
      : r.top);
    d.hShareOfDoc = r2(r.height / Math.max(1, scroller.scrollHeight));
    outline.push(d);
  }

  // — section picking: generic heuristics + known-class cross-check (facts recorded) —
  // sections are <section> roots INSIDE the scroller (nested: main-inner > main-content > section)
  let secs = [...scroller.querySelectorAll('section')].filter((el) => el.getBoundingClientRect().height > 50);
  if (!secs.length) secs = [...scroller.children].filter((el) =>
    /^(section|div)$/i.test(el.tagName) && el.getBoundingClientRect().height > 100);
  const facts = { candidateCount: secs.length, heuristics: {}, pinnedByKnownClass: {} };
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top - scroller.getBoundingClientRect().top + scroller.scrollTop, h: r.height, w: r.width };
  };

  const headerEl = document.querySelector('header.header') ||
    [...document.querySelectorAll('body header')].find((el) => {
      const s = cs(el); const r = el.getBoundingClientRect();
      return (s.position === 'fixed' || s.position === 'sticky') && r.height > 20 && r.height <= 90 && r.top <= 30;
    }) || null;
  if (headerEl) {
    const hr = headerEl.getBoundingClientRect();
    facts.heuristics.header = { fixed: true, tag: 'header', h: r2(hr.height), top: r2(hr.top), w: r2(hr.width) };
    facts.pinnedByKnownClass.header = (typeof headerEl.className === 'string' ? headerEl.className.split(/\s+/) : []).includes('header');
  }

  let heroEl = null;
  if (secs.length) {
    const h0 = rectOf(secs[0]).h / scroller.clientHeight;
    heroEl = secs[0];
    facts.heuristics.hero = { firstSection: true, hRatio: r2(h0), matched: h0 >= 0.75, relaxedIfBelow: h0 < 0.75 };
  }

  let statementEl = null;
  for (let i = 1; i < secs.length; i++) {
    const s = secs[i];
    const sr = s.getBoundingClientRect();
    const area = sr.width * sr.height;
    let mediaArea = 0;
    for (const m of s.querySelectorAll('img, svg, canvas, video')) {
      const mr = m.getBoundingClientRect();
      mediaArea = Math.max(mediaArea, mr.width * mr.height);
    }
    let hasDisplay = false;
    for (const t of s.querySelectorAll('h1,h2,h3,h4,p,div,span')) {
      if ([...t.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
        if (parseFloat(cs(t).fontSize) >= 3 * rootFs) { hasDisplay = true; break; }
      }
    }
    if (mediaArea / area >= 0.12 || hasDisplay) {
      statementEl = s;
      facts.heuristics.statement = { index: i, mediaAreaShare: r2(mediaArea / area), displayText: hasDisplay };
      break;
    }
  }

  let problemEl = null;
  for (let i = 1; i < secs.length; i++) {
    const s = secs[i];
    if (s === statementEl || s === heroEl) continue;
    let found = null;
    for (const g of s.querySelectorAll('*')) {
      const gs = cs(g);
      if ((gs.display === 'grid' || gs.display === 'flex') && g.children.length >= 3 && g.children.length <= 6) {
        const hs = [...g.children].map((c) => c.getBoundingClientRect().height).filter((h) => h > 40);
        if (hs.length >= 3) {
          const spread = Math.max(...hs) / Math.min(...hs);
          if (spread <= 1.35) {
            found = { cells: hs.length, spread: r2(spread), display: gs.display, cols: gs.gridTemplateColumns !== 'none' ? gs.gridTemplateColumns.split(' ').length : null };
            break;
          }
        }
      }
    }
    if (found) { problemEl = s; facts.heuristics.problem = Object.assign({ index: i }, found); break; }
  }

  const byClass = (needle) => secs.find((el) => typeof el.className === 'string' && el.className.split(/\s+/).includes(needle));
  const pin = { hero: byClass('home-hero'), statement: byClass('home-intro'), problem: byClass('home-problem') };
  for (const k of Object.keys(pin)) {
    facts.pinnedByKnownClass[k] = !!pin[k];
    const cur = k === 'hero' ? heroEl : k === 'statement' ? statementEl : problemEl;
    if (pin[k] && pin[k] !== cur) facts.heuristics[k + '_overridden_by_class'] = true;
  }
  if (pin.hero) heroEl = pin.hero;
  if (pin.statement) statementEl = pin.statement;
  if (pin.problem) problemEl = pin.problem;

  const selOf = (el) => el ? el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
    ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '') : null;
  const rectRec = (el) => { const x = rectOf(el); return { top: r2(x.top), h: r2(x.h), w: r2(x.w) }; };

  return {
    meta,
    frame,
    outline,
    picks: {
      facts,
      header: { selector: headerEl ? 'header.header' : null },
      hero: { selector: selOf(heroEl), rect: heroEl ? rectRec(heroEl) : null },
      statement: { selector: selOf(statementEl), rect: statementEl ? rectRec(statementEl) : null },
      problem: { selector: selOf(problemEl), rect: problemEl ? rectRec(problemEl) : null },
    },
  };
};

/** Stable unique selectors for the picked sections + the scroller (2nd pass, same page state). */
const PICK_SELECTORS = () => {
  const sc = document.querySelector('.lenis') ||
    [...document.querySelectorAll('body *')].find((el) => {
      const s = getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > innerHeight;
    }) || document.documentElement;
  const scSelector = sc === document.documentElement ? 'html'
    : (sc.classList.contains('lenis') ? '.lenis' : '.' + (typeof sc.className === 'string' ? sc.className.split(/\s+/).filter(Boolean)[0] : 'main-inner'));
  const secs = [...sc.querySelectorAll('section')].filter((el) => el.getBoundingClientRect().height > 50);
  if (!secs.length) secs = [...sc.children].filter((el) => el.getBoundingClientRect().height > 100);
  const find = (n) => secs.find((el) => typeof el.className === 'string' && el.className.split(/\s+/).includes(n)) || null;
  const heroEl = find('home-hero') || secs.find((el) => el.getBoundingClientRect().height > sc.clientHeight * 0.75) || null;
  const rest = secs.filter((s) => s !== heroEl);
  const statementEl = find('home-intro') || rest[0] || null;
  const problemEl = find('home-problem') || rest[1] || null;
  const uniqueSel = (el) => {
    if (!el) return null;
    const parts = [];
    let n = el;
    while (n && n !== document.body && n !== sc && n !== document.documentElement) {
      const parent = n.parentElement;
      const idx = parent ? [...parent.children].indexOf(n) + 1 : 1;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${idx})`);
      n = parent;
    }
    if (!parts.length) return null;
    const rootPrefix = n === sc ? '' : 'body>';
    // sections sit inside the scroller; anchor on its stable class
    return (n === sc ? '.lenis>' : rootPrefix) + parts.join('>');
  };
  return {
    header: document.querySelector('header.header') ? 'header.header' : null,
    hero: uniqueSel(heroEl), statement: uniqueSel(statementEl), problem: uniqueSel(problemEl),
    heroCls: heroEl ? heroEl.className : null,
    statementCls: statementEl ? statementEl.className : null,
    problemCls: problemEl ? problemEl.className : null,
    scroller: scSelector,
  };
};

/** Deep walk of one section (depth ≤ 6, children ≤ 40, skip script/style/defs +
 *  zero-size subtrees; opacity-0 nodes are KEPT — they are the reveal targets).
 *  Text nodes → metadata only {role, chars, lines, lang}. Media → separate array.
 *  Takes ONE object arg {sel, rootFs} (playwright evaluate passes a single argument). */
const WALK_SECTION = (arg) => {
  const { sel, rootFs } = arg || {};
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  const root = document.querySelector(sel);
  if (!root) return { error: 'selector not found: ' + sel };
  const scRect = sc.getBoundingClientRect();
  const inSc = sc.contains(root);
  const MAX_CHILDREN = 40; // children cap per node (JSON size) — inlined: page.evaluate cannot close over node scope
  const cs = (el) => getComputedStyle(el);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'TITLE', 'DEFS', 'SOURCE', 'TRACK', 'BR', 'WBR']);
  const MEDIA = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'PICTURE']);
  const TEXTY = new Set(['H1','H2','H3','H4','H5','H6','P','A','BUTTON','LI','SPAN','LABEL','BLOCKQUOTE','FIGCAPTION','TD','TH','TIME','SMALL','STRONG','EM','B','I','DT','DD','SUMMARY','LEGEND','OPTION']);

  const cleanCls = (el) => {
    if (typeof el.className !== 'string') return null;
    const out = [];
    for (let c of el.className.split(/\s+/).filter(Boolean)) {
      c = c.replace(/__[A-Za-z0-9_-]{4,}$/, '').replace(/--[A-Za-z0-9_-]{4,}$/, ''); // strip css-module hashes
      if (c && !out.includes(c)) out.push(c);
    }
    return out.length ? out.slice(0, 6).join('.') : null;
  };
  const shortId = (id) => {
    if (!id) return null;
    const m = /^w-node-[a-f0-9-]+-(.+)$/.exec(id);
    return (m ? 'w-node:' + m[1] : id).slice(0, 40);
  };
  const implicitRole = (el) => {
    const map = { H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading', P: 'paragraph', A: el.getAttribute('href') ? 'link' : null, BUTTON: 'button', IMG: 'img', NAV: 'navigation', HEADER: 'banner', FOOTER: 'contentinfo', MAIN: 'main', SECTION: 'region', UL: 'list', OL: 'list', LI: 'listitem', FIGURE: 'figure', FIGCAPTION: 'caption', SVG: 'graphics-document', CANVAS: 'canvas', VIDEO: 'video', IFRAME: 'iframe', FORM: 'form', INPUT: 'textbox', LABEL: 'label', TABLE: 'table', TH: 'columnheader', TD: 'cell', TR: 'row' };
    return map[el.tagName] || null;
  };
  const langOf = (s) => {
    let ar = 0, la = 0, other = 0;
    for (const ch of s) {
      if (/[\u0600-\u06FF\u0750-\u077F]/.test(ch)) ar++;
      else if (/[A-Za-z]/.test(ch)) la++;
      else if (/\S/.test(ch)) other++;
    }
    if (!ar && !la && !other) return 'none';
    if (ar && la) return ar > la * 2 ? 'ar' : la > ar * 2 ? 'en' : 'mixed';
    return ar ? 'ar' : la ? 'en' : 'other';
  };
  const textMeta = (el, s) => {
    let chars = 0, lines = 0, all = '';
    for (const n of el.childNodes) {
      if (n.nodeType !== 3) continue;
      const t = n.textContent.trim();
      if (!t) continue;
      chars += t.replace(/\s+/g, ' ').length;
      try {
        const range = document.createRange();
        range.selectNodeContents(n);
        const tops = new Set();
        for (const rc of range.getClientRects()) tops.add(Math.round(rc.top / 3));
        lines += Math.max(1, tops.size);
      } catch { lines += 1; }
      all += t;
    }
    if (!chars) return null;
    const fsPx = parseFloat(s.fontSize);
    const mono = /mono|jetbrains|fira|plex.*mono|space.*mono|geist.*mono/i.test(s.fontFamily);
    const fsRem = fsPx / rootFs;
    const role = fsRem >= 3.2 ? 'display' : mono ? 'label' : fsRem <= 1.5 ? 'meta' : 'body';
    return { role, chars, lines: Math.min(lines, 12), lang: langOf(all) };
  };
  const compactTransform = (s) => {
    const tr = s.transform;
    if (!tr || tr === 'none') return null;
    return tr.length > 72 ? tr.slice(0, 72) + '…' : tr;
  };
  const media = [];
  const ladderMap = new Map();
  const spacingMap = new Map();
  const colorMap = { text: new Map(), bg: new Map(), border: new Map() };
  const grids = [];
  const noteSpacing = (v) => { if (v > 0) spacingMap.set(Math.round(v * 10) / 10, (spacingMap.get(Math.round(v * 10) / 10) || 0) + 1); };
  const rootArea = Math.max(1, root.getBoundingClientRect().width * root.getBoundingClientRect().height);

  const walk = (el, depth, ipath) => {
    const s = cs(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1 && s.position !== 'fixed') return null; // display:none-ish subtree
    if (s.visibility === 'hidden') return null;
    const node = { t: el.tagName.toLowerCase() };
    if (el.id) node.id = shortId(el.id);
    const cls = cleanCls(el);
    if (cls) node.cls = cls;
    const role = el.getAttribute('role') || implicitRole(el);
    if (role) node.role = role;
    if (el.getAttribute('aria-hidden') === 'true') node.ah = true;
    const y = inSc ? r.top - scRect.top + sc.scrollTop : r.top;
    node.bx = [r2(r.x), r2(y), r2(r.width), r2(r.height)];
    node.br = [r2(r.x / rootFs), r2(y / rootFs), r2(r.width / rootFs), r2(r.height / rootFs)];

    const tm = textMeta(el, s);
    if (tm) {
      node.text = tm;
      const fsPx = parseFloat(s.fontSize);
      const ff = (s.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim();
      const key = `${ff}|${Math.round(fsPx)}|${s.fontWeight}`;
      const lhPx = parseFloat(s.lineHeight);
      const lsPx = parseFloat(s.letterSpacing);
      const e = ladderMap.get(key) || {
        ff: ff.slice(0, 28), fsPx: r2(fsPx), fsRem: r2(fsPx / rootFs), fw: s.fontWeight,
        count: 0, chars: 0, roles: {},
        lh: isFinite(lhPx) ? r2(lhPx / fsPx) : null,
        ls: isFinite(lsPx) ? r2(lsPx) : null,
        tt: s.textTransform !== 'none' ? s.textTransform : null,
      };
      e.count++; e.chars += tm.chars; e.roles[tm.role] = (e.roles[tm.role] || 0) + 1;
      ladderMap.set(key, e);
    }
    if (tm || TEXTY.has(el.tagName)) {
      const ff = (s.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim();
      if (ff) node.ff = ff.slice(0, 28);
      const fsPx = parseFloat(s.fontSize);
      node.fs = r2(fsPx); node.fsr = r2(fsPx / rootFs); node.fw = s.fontWeight;
      const lhPx = parseFloat(s.lineHeight);
      if (isFinite(lhPx)) { node.lh = r2(lhPx); node.lhr = r2(lhPx / fsPx); }
      const ls = parseFloat(s.letterSpacing);
      if (isFinite(ls) && ls !== 0) node.ls = r2(ls);
      if (s.color !== 'rgba(0, 0, 0, 0)') node.col = s.color;
      if (s.textTransform !== 'none') node.tt = s.textTransform;
      if (s.textAlign !== 'start' && s.textAlign !== 'left') node.ta = s.textAlign;
      if (s.whiteSpace === 'nowrap') node.ws = 'nowrap';
    }
    if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      node.bg = s.backgroundColor;
      colorMap.bg.set(s.backgroundColor, (colorMap.bg.get(s.backgroundColor) || 0) + 1);
    }
    // background-image assets (the hero/statement illustrations are CSS backgrounds on
    // otherwise childless divs — record file pattern + size/pos, never the asset itself)
    if (s.backgroundImage && s.backgroundImage !== 'none') {
      const urls = [];
      try {
        for (const m of s.backgroundImage.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) urls.push(m[2]);
      } catch {}
      node.bgi = {
        files: urls.map((u) => u.split('?')[0].split('/').pop().slice(0, 60)),
        size: s.backgroundSize !== 'auto' ? String(s.backgroundSize).slice(0, 40) : null,
        pos: s.backgroundPosition !== '0% 0%' ? String(s.backgroundPosition).slice(0, 40) : null,
      };
      media.push({
        p: ipath, tag: 'div-bg',
        rendered: [r2(r.width), r2(r.height)], renderedRem: [r2(r.width / rootFs), r2(r.height / rootFs)],
        srcFile: node.bgi.files[0] || null, files: node.bgi.files,
        bgSize: node.bgi.size, bgPos: node.bgi.pos,
        role: (r.width * r.height) / rootArea > 0.15 ? 'illustration' : 'figure',
      });
    }
    if (tm) colorMap.text.set(s.color, (colorMap.text.get(s.color) || 0) + 1);
    const bd = ['Top', 'Right', 'Bottom', 'Left'].map((side) => {
      const w = s['border' + side + 'Width'], st = s['border' + side + 'Style'], c = s['border' + side + 'Color'];
      if (st === 'none' || parseFloat(w) === 0) return null;
      return `${parseFloat(w)}px ${st} ${c}`;
    });
    if (bd.some(Boolean)) {
      node.bd = bd.every((x) => x && x === bd[0]) ? bd[0] : bd;
      for (const b of bd) if (b) colorMap.border.set(b, (colorMap.border.get(b) || 0) + 1);
    }
    const pad = ['Top', 'Right', 'Bottom', 'Left'].map((side) => parseFloat(s['padding' + side]));
    if (pad.some((v) => v > 0)) { node.pad = pad.map(r2); pad.forEach(noteSpacing); }
    const mar = ['Top', 'Right', 'Bottom', 'Left'].map((side) => parseFloat(s['margin' + side]));
    if (mar.some((v) => v > 0)) { node.mar = mar.map(r2); mar.forEach(noteSpacing); }
    if (s.display === 'grid' || s.display === 'inline-grid') {
      if (s.gridTemplateColumns !== 'none') {
        const cols = s.gridTemplateColumns.split(/\s+/);
        node.gtc = cols.length <= 14 ? cols.map((c) => r2(parseFloat(c))) : { n: cols.length, first: cols.slice(0, 14).map((c) => r2(parseFloat(c))) };
        grids.push({ p: ipath, cols: cols.map((c) => r2(parseFloat(c))), gap: [r2(parseFloat(s.rowGap)), r2(parseFloat(s.columnGap))] });
      }
      if (s.gridTemplateRows !== 'none') {
        const rows = s.gridTemplateRows.split(/\s+/);
        if (rows.length <= 8) node.gtr = rows.map((c) => r2(parseFloat(c)));
      }
      const gap = [parseFloat(s.rowGap), parseFloat(s.columnGap)];
      if (gap[0] || gap[1]) { node.gap = gap.map(r2); gap.forEach(noteSpacing); }
    } else if (s.display === 'flex' || s.display === 'inline-flex') {
      const gap = [parseFloat(s.rowGap), parseFloat(s.columnGap)];
      if (gap[0] || gap[1]) { node.gap = gap.map(r2); gap.forEach(noteSpacing); }
    }
    if (s.zIndex !== 'auto') node.z = parseInt(s.zIndex, 10);
    if (s.display !== 'block') node.disp = s.display;
    if (s.position !== 'static') node.pos = s.position;
    if (s.opacity !== '1') node.op = r2(parseFloat(s.opacity));
    const tr = compactTransform(s);
    if (tr) node.tr = tr;
    if (s.overflow !== 'visible') node.ovf = s.overflow;
    if (s.willChange && s.willChange !== 'auto') node.wc = s.willChange;

    // media inventory (type / dimensions / role / filename pattern ONLY)
    if (MEDIA.has(el.tagName)) {
      const m = { p: ipath, tag: el.tagName.toLowerCase() };
      m.rendered = [r2(r.width), r2(r.height)];
      m.renderedRem = [r2(r.width / rootFs), r2(r.height / rootFs)];
      const areaShare = (r.width * r.height) / rootArea;
      m.role = areaShare > 0.15 ? 'illustration' : r.width < 40 ? 'icon' : 'figure';
      if (el.tagName === 'IMG') {
        m.intrinsic = [el.naturalWidth, el.naturalHeight];
        m.alt = el.alt != null && el.alt.length ? { present: true, chars: el.alt.trim().length } : { present: false, chars: 0 };
        if (el.getAttribute('src')) m.srcFile = el.getAttribute('src').split('?')[0].split('/').pop().slice(0, 60);
        const ss = el.getAttribute('srcset');
        if (ss) m.srcset = { count: ss.split(',').length, widths: ss.split(',').map((x) => (x.trim().match(/(\d+)w/) || [])[1]).filter(Boolean).map(Number) };
        if (el.getAttribute('loading')) m.loading = el.getAttribute('loading');
      } else if (el.tagName === 'SVG') {
        const vb = el.getAttribute('viewBox');
        if (vb) m.viewBox = vb.split(/\s+/).map(Number).slice(2);
        m.childCount = el.children.length;
        if (el.getAttribute('aria-hidden') === 'true') m.ariaHidden = true;
        try { if (el.className && el.className.baseVal) m.cls = el.className.baseVal.split(/\s+/).filter(Boolean).slice(0, 4).join('.'); } catch {}
      } else if (el.tagName === 'CANVAS') {
        m.intrinsic = [el.width, el.height];
        if (el.id) m.id = shortId(el.id);
      } else if (el.tagName === 'VIDEO') {
        m.intrinsic = [el.videoWidth, el.videoHeight];
        m.duration = r2(el.duration);
        m.muted = el.muted; m.loop = el.loop; m.autoplay = el.autoplay; m.playsInline = el.playsInline;
        if (el.getAttribute('poster')) m.posterFile = el.getAttribute('poster').split('/').pop().slice(0, 60);
      } else if (el.tagName === 'IFRAME') {
        if (el.getAttribute('src')) m.srcFile = el.getAttribute('src').split('?')[0].split('/').pop().slice(0, 60);
      }
      media.push(m);
    }

    // children (cap 40; skip junk tags; do not descend into media internals)
    const kids = [...el.children].filter((c) => !SKIP.has(c.tagName));
    if (kids.length > MAX_CHILDREN) node.trunc = { children: kids.length, walked: MAX_CHILDREN };
    const children = [];
    for (let i = 0; i < Math.min(kids.length, MAX_CHILDREN); i++) {
      if (MEDIA.has(kids[i].tagName) && kids[i].tagName !== 'PICTURE') continue; // media are inventoried above
      const c = walk(kids[i], depth + 1, ipath + '/' + i);
      if (c) children.push(c);
    }
    if (children.length) node.ch = children;
    return node;
  };

  const tree = walk(root, 0, '');
  const ladder = [...ladderMap.values()].sort((a, b) => b.chars - a.chars).slice(0, 24);
  const spacing = [...spacingMap.entries()].map(([v, n]) => ({ px: r2(v), rem: r2(v / rootFs), n })).sort((a, b) => a.px - b.px).slice(0, 40);
  const colors = {
    text: [...colorMap.text.entries()].map(([c, n]) => ({ c, n })).sort((a, b) => b.n - a.n).slice(0, 16),
    bg: [...colorMap.bg.entries()].map(([c, n]) => ({ c, n })).sort((a, b) => b.n - a.n).slice(0, 16),
    border: [...colorMap.border.entries()].map(([c, n]) => ({ c, n })).sort((a, b) => b.n - a.n).slice(0, 16),
  };
  return { tree, media, ladder, spacing, colors, grids: grids.slice(0, 12), coords: inSc ? 'scroller-content' : 'viewport-fixed' };
};

/** Light sample of a section at a scroll state (depth ≤ 3) — used to diff reveal motion. */
const SAMPLE_SECTION = (selArg) => {
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const MAX_CHILDREN = 40; // inlined: page.evaluate cannot close over node scope
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  const root = document.querySelector(selArg);
  if (!root) return { error: 'not found' };
  const scRect = sc.getBoundingClientRect();
  const nodes = [];
  const walk = (el, depth, ipath) => {
    if (depth > 3) return;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1 && s.position !== 'fixed') return;
    const n = { p: ipath, bx: [r2(r.x), r2(r.top - scRect.top + sc.scrollTop), r2(r.width), r2(r.height)] };
    if (s.opacity !== '1') n.o = r2(parseFloat(s.opacity));
    if (s.transform !== 'none') n.tr = s.transform.length > 56 ? s.transform.slice(0, 56) + '…' : s.transform;
    const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [];
    if (cls.length) n.c = cls.slice(0, 4).join('.');
    nodes.push(n);
    const kids = [...el.children].slice(0, MAX_CHILDREN);
    for (let i = 0; i < kids.length; i++) walk(kids[i], depth + 1, ipath + '/' + i);
  };
  walk(root, 0, '');
  return { scrollTop: r2(sc.scrollTop), nodes };
};

/** Motion globals: gsap + full ScrollTrigger table (with tween details), Lenis discovery. */
const MOTION_SCAN = () => {
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const str = (v) => (v == null ? null : (typeof v === 'function' ? 'fn:' + (v.name || 'anon') : String(v))).slice(0, 60);
  const shortId = (id) => {
    if (!id) return null;
    const m = /^w-node-[a-f0-9-]+-(.+)$/.exec(id);
    return (m ? 'w-node:' + m[1] : id).slice(0, 40);
  };
  const describe = (el) => {
    if (el && typeof el === 'string') { try { el = document.querySelector(el); } catch { return el.slice(0, 40); } } // ScrollTrigger vars.trigger may be a selector string
    if (!el || !el.tagName) return null;
    return el.tagName.toLowerCase() + (el.id ? '#' + shortId(el.id) : '') +
      (typeof el.className === 'string' && el.className ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '');
  };
  const asNode = (x) => {
    if (x && typeof x === 'string') { try { return document.querySelector(x); } catch { return null; } }
    return x && x.nodeType === 1 ? x : null;
  };
  const out = {
    gsap: { present: typeof window.gsap !== 'undefined', version: window.gsap ? window.gsap.version : null },
    scrollTrigger: { present: typeof window.ScrollTrigger !== 'undefined', count: null, triggers: [] },
    lenis: { windowLenis: !!window.lenis, window__lenis: !!window.__lenis, windowLenisClass: typeof window.Lenis !== 'undefined', globalsMatched: [], detectedVia: null, wrapper: null, optionsReachable: false, options: null },
    otherLibs: {
      webflow: typeof window.Webflow !== 'undefined',
      webflowIx2: !!(window.Webflow && window.Webflow.require && window.Webflow.require('ix2')),
      barba: typeof window.Barba !== 'undefined',
      locomotive: typeof window.LocomotiveScroll !== 'undefined',
    },
  };
  try {
    for (const k of Object.keys(window)) if (/lenis/i.test(k)) out.lenis.globalsMatched.push(k);
  } catch {}
  const sc = document.querySelector('.lenis');
  if (sc) {
    out.lenis.detectedVia = 'class .lenis on the scroller wrapper';
    out.lenis.wrapper = describe(sc);
    out.lenis.wrapperClassList = (typeof sc.className === 'string' ? sc.className : '').split(/\s+/).filter(Boolean);
    out.lenis.wrapperDataAttrs = [...sc.attributes].filter((a) => /^data-lenis/i.test(a.name)).map((a) => a.name);
  }
  const readOpts = (inst) => {
    const o = inst.options || {};
    return {
      lerp: o.lerp ?? null, duration: o.duration ?? null, wheelMultiplier: o.wheelMultiplier ?? null,
      syncTouch: o.syncTouch ?? null, syncTouchLerp: o.syncTouchLerp ?? null, touchMultiplier: o.touchMultiplier ?? null,
      smoothWheel: o.smoothWheel ?? null, easing: str(o.easing), orientation: o.orientation ?? null,
      gestureOrientation: o.gestureOrientation ?? null, infinite: o.infinite ?? null,
    };
  };
  for (const g of [window.lenis, window.__lenis]) {
    if (g && typeof g === 'object' && typeof g.scrollTo === 'function') {
      out.lenis.optionsReachable = true; out.lenis.options = readOpts(g); out.lenis.detectedVia = 'window global';
    }
  }
  if (sc && !out.lenis.optionsReachable) {
    for (const key of ['lenis', '__lenis', 'lenisInstance', 'smooth']) {
      const g = sc[key];
      if (g && typeof g === 'object' && typeof g.scrollTo === 'function') {
        out.lenis.optionsReachable = true; out.lenis.options = readOpts(g); out.lenis.detectedVia = 'wrapper element property "' + key + '"';
      }
    }
  }
  if (window.ScrollTrigger && window.ScrollTrigger.getAll) {
    const META = new Set(['ease','duration','delay','paused','immediateRender','repeat','yoyo','stagger','onStart','onComplete','onUpdate','onReverseComplete','onRepeat','overwrite','keyframes','defaults','runBackwards','startAt','id','data','inherit','callbacks','repeatDelay','useFrames','lazy','onStartParams','onCompleteParams','onUpdateParams']);
    out.scrollTrigger.count = window.ScrollTrigger.getAll().length;
    out.scrollTrigger.triggers = window.ScrollTrigger.getAll().map((t) => {
      const v = t.vars || {};
      const rec = {
        trigger: describe(v.trigger),
        start: v.start ?? null, end: v.end ?? null,
        scrub: v.scrub === true ? true : (v.scrub ?? null),
        pin: v.pin === true ? true : (v.pin && v.pin.tagName ? describe(v.pin) : v.pin ?? null),
        pinSpacing: v.pinSpacing ?? null, snap: v.snap ?? null, anticipatePin: v.anticipatePin ?? null,
        toggleActions: v.toggleActions ?? null, once: v.once ?? null, id: v.id ?? null,
        measured: { start: Math.round(t.start), end: Math.round(t.end) },
      };
      try {
        if (t.animation) {
          const kids = t.animation.getChildren ? t.animation.getChildren(true, true, true) : [];
          rec.anim = {
            totalDuration: r2(t.animation.totalDuration()),
            tweens: kids.slice(0, 6).map((k) => ({
              dur: r2(k.duration()), delay: r2(k.delay()),
              ease: str(k.vars && k.vars.ease),
              props: k.vars ? Object.keys(k.vars).filter((p) => !META.has(p)).slice(0, 8) : [],
              target: k.targets ? describe(k.targets()[0]) : null,
            })),
          };
        }
      } catch (e) { rec.anim = { err: String(e).slice(0, 60) }; }
      return rec;
    });
  }
  return out;
};

/** ScrollTriggers whose trigger element lives inside a given section. */
const TRIGGERS_FOR = (selArg) => {
  const root = document.querySelector(selArg);
  if (!root || !window.ScrollTrigger || !window.ScrollTrigger.getAll) return [];
  const asNode = (x) => {
    if (x && typeof x === 'string') { try { return document.querySelector(x); } catch { return null; } }
    return x && x.nodeType === 1 ? x : null;
  };
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const describe = (el) => {
    el = asNode(el);
    if (!el || !el.tagName) return (typeof el === 'string' ? el.slice(0, 40) : null);
    return el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '');
  };
  const META = new Set(['ease','duration','delay','paused','immediateRender','repeat','yoyo','stagger','onStart','onComplete','onUpdate','onReverseComplete','onRepeat','overwrite','keyframes','defaults','runBackwards','startAt','id','data','inherit','callbacks','repeatDelay','useFrames','lazy']);
  return window.ScrollTrigger.getAll()
    .filter((t) => t.vars && asNode(t.vars.trigger) && root.contains(asNode(t.vars.trigger)))
    .map((t) => {
      const v = t.vars || {};
      const trig = v.trigger;
      const rec = {
        trigger: describe(trig), start: v.start ?? null, end: v.end ?? null,
        scrub: v.scrub === true ? true : (v.scrub ?? null),
        pin: v.pin === true ? true : (v.pin && v.pin.tagName ? describe(v.pin) : v.pin ?? null),
        pinSpacing: v.pinSpacing ?? null, snap: v.snap ?? null, anticipatePin: v.anticipatePin ?? null,
        toggleActions: v.toggleActions ?? null, once: v.once ?? null, id: v.id ?? null,
        measured: { start: Math.round(t.start), end: Math.round(t.end) },
      };
      try {
        if (t.animation) {
          const kids = t.animation.getChildren ? t.animation.getChildren(true, true, true) : [];
          rec.anim = {
            totalDuration: r2(t.animation.totalDuration()),
            tweens: kids.slice(0, 6).map((k) => ({
              dur: r2(k.duration()), delay: r2(k.delay()),
              ease: k.vars && k.vars.ease ? String(k.vars.ease).slice(0, 48) : null,
              props: k.vars ? Object.keys(k.vars).filter((p) => !META.has(p)).slice(0, 8) : [],
              target: k.targets ? describe(k.targets()[0]) : null,
            })),
          };
        }
      } catch (e) { rec.anim = { err: String(e).slice(0, 60) }; }
      return rec;
    });
};

/** Header sample at a scroll step (rect / transform / opacity / class). */
const HEADER_SAMPLE = () => {
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const h = document.querySelector('header.header');
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  if (!h) return null;
  const s = getComputedStyle(h);
  const r = h.getBoundingClientRect();
  return {
    scrollTop: r2(sc.scrollTop),
    rect: [r2(r.x), r2(r.y), r2(r.width), r2(r.height)],
    tr: s.transform === 'none' ? null : (s.transform.length > 56 ? s.transform.slice(0, 56) + '…' : s.transform),
    o: r2(parseFloat(s.opacity)),
    cls: (typeof h.className === 'string' ? h.className : '').split(/\s+/).filter(Boolean),
  };
};

/** Inertia sampler install (node drives a real trusted wheel right after). */
const INERTIA_INSTALL = () => {
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  window.__inertia = { samples: [], t0: performance.now() };
  const tick = () => {
    const I = window.__inertia;
    I.samples.push([Math.round(performance.now() - I.t0), Math.round(sc.scrollTop * 10) / 10]);
    if (performance.now() - I.t0 < 2800) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
};

/** Cookie/consent banner geometry (never accepted; Escape attempted from node side). */
const COOKIE_SCAN = () => {
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const hits = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    const clsStr = typeof el.className === 'string' ? el.className : '';
    if (s.position !== 'fixed' || !/cookie|consent|gdpr|banner|privacy/i.test(clsStr)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 10) continue;
    hits.push({
      cls: clsStr.split(/\s+/).filter(Boolean).slice(0, 4),
      rect: [r2(r.x), r2(r.y), r2(r.width), r2(r.height)],
      z: s.zIndex === 'auto' ? null : parseInt(s.zIndex, 10),
      opacity: r2(parseFloat(s.opacity)),
      buttonCount: el.querySelectorAll('button, a[class*=btn], a[class*=button]').length,
      textChars: (el.textContent || '').trim().length,
      blocksViewport: r.width > innerWidth * 0.6 && r.height > innerHeight * 0.3,
    });
  }
  return hits;
};

// ─────────────────────────────────────────────────────────────────────────────
// per-breakpoint run
// ─────────────────────────────────────────────────────────────────────────────
async function runBreakpoint(browser, bp) {
  const t0 = Date.now();
  console.log(`\n▶ ${bp.label} (${bp.w}×${bp.h}) — one visit to ${URL}`);
  const attempts = [
    { ua: undefined, tag: 'playwright-default' },
    { ua: REAL_CHROME_UA, tag: 'real-chrome-ua-retry' },
  ];
  let page = null, context = null, status = null, finalError = null, uaUsed = null;
  for (const att of attempts) {
    try {
      context = await browser.newContext({ viewport: { width: bp.w, height: bp.h }, userAgent: att.ua });
      page = await context.newPage();
      const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
      status = resp ? resp.status() : null;
      if (status && status >= 400) throw new Error('HTTP ' + status);
      uaUsed = att.tag;
      break;
    } catch (e) {
      finalError = String((e && e.message) || e);
      console.log(`  attempt "${att.tag}" failed: ${finalError}`);
      if (context) await context.close();
      context = null; page = null;
    }
  }
  if (!page) return { bp: bp.label, ok: false, status, error: finalError };
  console.log(`  loaded (status ${status}, ua=${uaUsed}) — waiting for content + settle`);

  await page.waitForSelector('body *', { timeout: 30000 });

  // entrance loader + settle, polling the loader state every 500ms (times the sequence)
  const loaderTimeline = [];
  for (let i = 0; i < SETTLE_MS / 500; i++) {
    await page.waitForTimeout(500);
    const st = await page.evaluate((t) => {
      const l = document.querySelector('.loading, .loader, [class*=preloader]');
      const sc = document.querySelector('.lenis');
      return {
        t,
        loaderCls: l ? (typeof l.className === 'string' ? l.className : '').split(/\s+/).filter(Boolean) : null,
        loaderBox: l ? (() => { const r = l.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() : null,
        scrollerCls: sc ? (typeof sc.className === 'string' ? sc.className : '').split(/\s+/).filter(Boolean) : null,
      };
    }, (i + 1) * 500);
    loaderTimeline.push(st);
  }
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});

  // consent: note geometry, try Escape once, never click
  const cookieBefore = await page.evaluate(COOKIE_SCAN);
  let cookieAfter = cookieBefore;
  if (cookieBefore.length) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(600);
    cookieAfter = await page.evaluate(COOKIE_SCAN);
  }

  // — root scan + picks —
  const rootScan = await page.evaluate(ROOT_SCAN);
  const picks = await page.evaluate(PICK_SELECTORS);
  const scrollerSel = picks.scroller;
  const meta = Object.assign(rootScan.meta, {
    bp: bp.label, capturedAt: nowIso(), url: URL, httpStatus: status, uaUsed,
    cookieBanner: { before: cookieBefore, afterEscape: cookieAfter, accepted: false, escapeDismissed: cookieAfter.length < cookieBefore.length },
    loader: { autoDismissed: true, timeline: loaderTimeline.filter((s) => s.loaderCls) },
    picks,
    outlineNote: 'depth≤2 blocks; docY is scroller-content coords (body is viewport-locked on this site)',
  });
  console.log(`  rootFs=${meta.rootFontSize.px}px · docH=${meta.docH}px · scroller=${meta.scroller.selector}`);
  console.log(`  picks: hero=${picks.heroCls} · statement=${picks.statementCls} · problem=${picks.problemCls}`);

  // — scroll helper: drives the SCROLLER (the window does not scroll on this site) —
  const currentScroll = () => page.evaluate((sel) => document.querySelector(sel).scrollTop, scrollerSel);
  const setScroll = (y) => page.evaluate(({ sel, y }) => { const sc = document.querySelector(sel); if (sc) sc.scrollTop = y; }, { sel: scrollerSel, y });
  const scrollTo = async (y) => {
    await setScroll(y);
    await page.waitForTimeout(120);
    if (Math.abs((await currentScroll()) - y) > 25) {
      // Lenis may fight direct sets — drive real trusted wheel events from mid-viewport instead
      await page.mouse.move(Math.round(bp.w / 2), Math.round(bp.h / 2));
      for (let i = 0; i < 14; i++) {
        const c = await currentScroll();
        if (Math.abs(c - y) < 30) break;
        await page.mouse.wheel(0, Math.round(y - c));
        await page.waitForTimeout(220);
      }
    }
    await page.waitForTimeout(STATE_SETTLE_MS - 120 > 0 ? STATE_SETTLE_MS - 120 : 0);
    return currentScroll();
  };

  // — tree captures at scroll 0 (initial state, before any scrolling) —
  const sectionDefs = [
    { key: 'header', sel: picks.header },
    { key: 'hero', sel: picks.hero },
    { key: 'statement', sel: picks.statement },
    { key: 'problem', sel: picks.problem },
  ];
  const trees = {};
  for (const sd of sectionDefs) {
    if (!sd.sel) { console.log(`  ⚠ no selector for ${sd.key}`); continue; }
    trees[sd.key] = await page.evaluate(WALK_SECTION, { sel: sd.sel, rootFs: meta.rootFontSize.px });
    trees[sd.key].selector = sd.sel;
    console.log(`  tree ${sd.key}: ${countNodes(trees[sd.key].tree)} nodes, ${trees[sd.key].media.length} media`);
  }

  // — scroll states (hero/statement/problem): entering / centered / leaving —
  const scrollStates = {};
  for (const key of ['hero', 'statement', 'problem']) {
    const sd = sectionDefs.find((s) => s.key === key);
    if (!sd || !sd.sel) continue;
    const rect = rootScan.picks[key].rect;
    if (!rect) continue;
    const vh = bp.h;
    const targets = key === 'hero'
      ? [{ state: 'initial', y: 0 }, { state: 'centered', y: Math.round(rect.h * 0.5) }, { state: 'leaving', y: Math.round(rect.h * 0.9) }]
      : [
          { state: 'entering', y: Math.round(rect.top - vh * 0.85) },
          { state: 'centered', y: Math.round(rect.top + rect.h / 2 - vh / 2) },
          { state: 'leaving', y: Math.round(rect.top + rect.h - vh * 0.15) },
        ];
    const seen = new Set();
    const states = [];
    for (const t of targets) {
      const y = Math.max(0, Math.min(t.y, meta.scroller.maxScroll));
      if (seen.has(y)) continue;
      seen.add(y);
      const actual = await scrollTo(y);
      const sample = await page.evaluate(SAMPLE_SECTION, sd.sel);
      const shot = path.join(EV_DIR, `${key}-${bp.label}-${t.state}.jpg`);
      await page.screenshot({ path: shot, type: 'jpeg', quality: 70 });
      states.push({ state: t.state, targetScrollTop: y, actualScrollTop: actual, screenshot: path.relative(ROOT, shot), nodes: sample.nodes });
      console.log(`  state ${key}/${t.state} @${y} (actual ${actual})`);
    }
    scrollStates[key] = states;
  }
  await scrollTo(0);

  // — header show/hide: scripted scroller 0→600→0 in 50px steps every 150ms —
  const headerSteps = [];
  const hT0 = Date.now();
  const drive = async (y) => {
    await setScroll(y);
    await page.waitForTimeout(150);
    const s = await page.evaluate(HEADER_SAMPLE);
    if (s) { s.t = Date.now() - hT0; headerSteps.push(s); }
  };
  for (let y = 50; y <= 600; y += 50) await drive(y);
  for (let y = 550; y >= 0; y -= 50) await drive(y);

  // — motion scan + per-section triggers (measured BEFORE any style unlock below) —
  const motion = await page.evaluate(MOTION_SCAN);
  const sectionTriggers = {};
  for (const sd of sectionDefs) {
    sectionTriggers[sd.key] = sd.sel ? await page.evaluate(TRIGGERS_FOR, sd.sel) : [];
  }

  // — Lenis feel: empirical inertia via one real trusted wheel + rAF sampling —
  await scrollTo(0);
  await page.evaluate(INERTIA_INSTALL);
  await page.mouse.move(Math.round(bp.w / 2), Math.round(bp.h / 2));
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(2800);
  const inertiaRaw = await page.evaluate(() => (window.__inertia ? window.__inertia.samples : []));
  let inertia = { method: 'trusted wheel Δ1200px + rAF sampling 2.8s', samples: inertiaRaw.filter((_, i) => i % 3 === 0), wheelResponsive: inertiaRaw.length > 2 && inertiaRaw.some((s) => s[1] > 0) };
  if (!inertia.wheelResponsive) {
    await scrollTo(0);
    await page.evaluate(INERTIA_INSTALL);
    await page.evaluate((sel) => {
      const sc = document.querySelector(sel);
      if (sc) sc.dispatchEvent(new WheelEvent('wheel', { deltaY: 1200, deltaMode: 0, bubbles: true, cancelable: true }));
    }, scrollerSel);
    await page.waitForTimeout(2800);
    const synth = await page.evaluate(() => (window.__inertia ? window.__inertia.samples : []));
    inertia = { method: 'synthetic wheel Δ1200 + rAF sampling 2.8s (trusted wheel unresponsive)', samples: synth.filter((_, i) => i % 3 === 0), wheelResponsive: synth.length > 2 && synth.some((s) => s[1] > 0) };
  }
  const samp = inertia.samples || [];
  const maxS = Math.max(0, ...samp.map((s) => s[1]));
  if (maxS > 0) {
    const tAt = (f) => { const hit = samp.find((s) => s[1] >= maxS * f); return hit ? hit[0] : null; };
    const t90 = tAt(0.9), t50 = tAt(0.5);
    inertia.maxScroll = maxS;
    inertia.t50ms = t50; inertia.t90ms = t90;
    inertia.fittedK = t90 ? Math.round((-Math.log(1 - 0.9) / (t90 / 1000)) * 1000) / 1000 : null; // 1/s, s(t)=S(1−e^(−kt))
    inertia.fittedLerpPerFrame60 = inertia.fittedK ? Math.round((1 - Math.exp(-inertia.fittedK / 60)) * 1000) / 1000 : null;
    inertia.nativeJump = samp.length > 2 && samp[1] !== undefined && samp[1][1] >= maxS * 0.95; // target reached in ~1 frame ⇒ no smoothing
  }
  await scrollTo(0);

  // — full-page reference sheet: body is locked ⇒ try fullPage, then CSS-unlock, then strip —
  let fullShot = { method: null, file: null };
  const docH = meta.docH;
  try {
    const tryShot = async (tag) => {
      const buf = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });
      const size = jpgSize(buf);
      if (size && size.h >= docH * 0.8) {
        const file = path.join(EV_DIR, `full-${bp.label}.jpg`);
        fs.writeFileSync(file, buf);
        fullShot = { method: tag, file: path.relative(ROOT, file), px: size };
        return true;
      }
      return false;
    };
    if (!(await tryShot('playwright fullPage (document height)'))) {
      // CSS-unlock: let the viewport-locked layout flow so fullPage sees the whole content
      await page.evaluate(() => {
        const sels = ['html', 'body', '.body-inner', 'main', '.main-inner', '.lenis'];
        for (const sel of sels) {
          for (const el of document.querySelectorAll(sel)) {
            el.style.setProperty('height', 'auto', 'important');
            el.style.setProperty('overflow', 'visible', 'important');
            el.style.setProperty('min-height', '0', 'important');
          }
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(900);
      if (!(await tryShot('fullPage after CSS-unlock of the Lenis wrapper'))) {
        const parts = [];
        const step = Math.floor(bp.h * 0.9);
        for (let y = 0, n = 0; y <= Math.max(0, meta.scroller.maxScroll); y += step, n++) {
          await setScroll(y);
          await page.waitForTimeout(400);
          const file = path.join(EV_DIR, `full-${bp.label}-part${String(n).padStart(2, '0')}.jpg`);
          await page.screenshot({ path: file, type: 'jpeg', quality: 70 });
          parts.push(path.relative(ROOT, file));
        }
        fullShot = { method: 'strip of viewport captures (10% overlap)', files: parts };
      }
    }
  } catch (e) {
    fullShot = { method: 'failed', error: String((e && e.message) || e) };
  }
  console.log(`  full sheet: ${fullShot.method || 'FAILED'} ${fullShot.file || (fullShot.files || []).length + ' parts'}`);
  meta.fullPageShot = fullShot;

  // — per-section JSON files —
  for (const sd of sectionDefs) {
    const tr = trees[sd.key];
    if (!tr) continue;
    const doc = {
      meta: Object.assign({}, meta, { selector: sd.sel, coords: tr.coords }),
      frame: rootScan.frame,
      tree: tr.tree,
      scrollStates: sd.key === 'header' ? headerSteps : (scrollStates[sd.key] || []),
      media: tr.media,
      ladder: tr.ladder,
      spacing: tr.spacing,
      colors: tr.colors,
      grids: tr.grids,
      triggers: sectionTriggers[sd.key] || [],
    };
    writeJson(path.join(OUT_DIR, `${sd.key}-${bp.label}.json`), doc);
  }

  // — merge scroll-spec.json —
  const specFile = path.join(OUT_DIR, 'scroll-spec.json');
  let spec = { meta: { url: URL, package: '1-c', generatedAt: nowIso(), note: 'merged across breakpoints; scroller is .main-inner (Lenis wrapper), the window does not scroll' }, bps: {} };
  if (fs.existsSync(specFile)) { try { spec = JSON.parse(fs.readFileSync(specFile, 'utf8')); } catch {} }
  spec.bps[bp.label] = {
    capturedAt: nowIso(),
    viewport: meta.viewport, rootFontSize: meta.rootFontSize, docH: meta.docH, maxScroll: meta.scroller.maxScroll,
    scroller: meta.scroller, picks: rootScan.picks, loader: meta.loader, cookieBanner: meta.cookieBanner,
    motion, inertia, headerBehavior: { method: 'scripted scroller scrollTop 0→600→0, 50px steps @150ms', steps: headerSteps },
    fullPageShot: fullShot,
  };
  fs.writeFileSync(specFile, JSON.stringify(spec)); // compact — see writeJson
  console.log(`  wrote ${path.relative(ROOT, specFile)}`);

  await context.close();
  console.log(`✔ ${bp.label} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return { bp: bp.label, ok: true, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const results = [];
for (const bp of BPS) {
  try {
    results.push(await runBreakpoint(browser, bp));
  } catch (e) {
    console.error(`✖ ${bp.label} FAILED:`, (e && e.stack) || e);
    results.push({ bp: bp.label, ok: false, error: String((e && e.message) || e) });
  }
  await sleep(15000); // politeness gap between breakpoints (separate viewport visits, not a reload loop)
}
await browser.close();
console.log('\nRUN SUMMARY');
for (const r of results) console.log(`  ${r.bp}: ${r.ok ? 'OK' : 'FAILED — ' + (r.error || r.status)}`);
