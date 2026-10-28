#!/usr/bin/env node
/* eslint-disable */
/**
 * heron-map-extract.mjs — R322 «DESIGN DIRECTOR EDITION» · cycle C3 · package 3-a.
 * WP-3a "heron-map": the STRUCTURE + NUMBERS extractor for the `home-map` section
 * of https://heronaiapp.com/ — the transplant basis for Madarek's C3 map rewrite.
 *
 * WHAT THIS IS
 *   One polite Playwright chromium visit per breakpoint (1440×900 / 768×1024 / 390×844)
 *   focused on ONE section: `.home-map` inside the `.main-inner` scroller. It records:
 *     A. the section's scroll-space geometry + a 22-position COMPOSITION PROBE that
 *        answers THE key question — how does the map stay composed across its
 *        ~6300px span with ZERO pins site-wide (sticky? absolute? transforms? nothing?);
 *     B. the 6 narrative states (statement → plan → INTRODUCTION card → findings →
 *        solid-orange room → closing) as full-viewport JPEGs (q70) + JSON snapshots
 *        (visible elements, rects, key styles, changed classes/data-attrs vs previous);
 *     C. the structural tree (depth ≤ 6) in px + rem (site's own fluid root) + % of
 *        section, with the plan-asset census, the intro-card geometry, mono index
 *        furniture and the headline set (distinct-per-state, verified);
 *     D. the full ScrollTrigger table for the map (triggers whose element is inside
 *        `.home-map-wrap` OR whose measured range intersects the map scroll window),
 *        with tween vars VALUES, keyframe offsets (startTime) and sampled eases,
 *        + toggleClass + a post-scroll re-measure (the map's scrub pair only gets
 *        real start/end after the first scroll refresh).
 *
 * REV 2 (same package, same visit budget — one per bp): semantic state picking
 *   (the 6 stages resolved from measured cues in the probe timeline, not guesswork),
 *   pure-forward state capture (jump-to-0 first — reverse-scrolling re-flips the
 *   direction-sensitive .expanded layout class, measured + recorded apart), the
 *   sticky frame + plan column tracked as probe elements, class-watch per row,
 *   the INTRODUCTION card asset detail, and the SVG-rect-clamped orange cue.
 *
 * HARD RULES (owner brief §12 + task 3-a — same family as scripts/r322/heron-extract.mjs)
 *   - NO copying of Heron text / logo / images / artwork. Text nodes: metadata only
 *     {role guess, char count, line count, language}. Text CHANGE detection uses a
 *     non-reversible 8-hex fingerprint ("th") — the fingerprint is recorded, never
 *     the content itself. alt / aria-label: PRESENCE + length only. Media src: LAST
 *     PATH SEGMENT only. Nothing is downloaded.
 *   - No Awwwards badge transplant (flagged DO_NOT_TRANSPLANT if measured in-frame).
 *   - Consent banner: geometry only, ONE Escape press, NEVER click consent buttons.
 *   - Politeness: ONE visit per breakpoint, sequential, human-ish pacing (500–900ms
 *     settles between scroll positions). networkidle / HTTP ≥ 400 ⇒ ONE retry with a
 *     real-Chrome UA in a fresh context (the site has been 200 OK on every probe).
 *
 * SITE FACTS (from the C1 1-c extraction — kept for provenance; re-verified each run)
 *   - Webflow export (html.w-mod-js) + GSAP 3.12.5 + ScrollTrigger + Lenis attached
 *     to the CUSTOM WRAPPER `.main-inner` (carries the `lenis` class). The window
 *     does NOT scroll: body is viewport-locked; every scroll action below drives the
 *     wrapper. Loader `.loading` auto-dismisses ~5.5–6.0s (polled, never clicked).
 *   - ZERO pins site-wide. The map's 2 scrub triggers were measured @1440:
 *     `home-map-wrap` `top bottom→top top` 1465→2352 (y on .home-map-main-inner) and
 *     `home-map-wrap` `top 50%→bottom-=270 bottom` 1908→7495 (the 5.52s map sequence:
 *     2× home-intel-inner autoAlpha/y/scale, map-img opacity, path scale/opacity/x/y).
 *     THIS package measures how that composition holds without pins.
 *
 * OUTPUTS
 *   docs/redesign/r322/heron/map-<bp>.json          (bp ∈ 1440 / 768 / 390)
 *   docs/redesign/r322/heron/map-scroll-spec.json   (merged across the run's bps)
 *   audits/evidence/r322/heron/map-<bp>-<n>-<slug>.jpg (q70 viewport states, <2MB total)
 *
 * USAGE (worktree root — node_modules is symlinked to the main repo; do NOT npm install)
 *   node scripts/r322/heron-map-extract.mjs             # all 3 breakpoints, sequentially
 *   node scripts/r322/heron-map-extract.mjs --bp=1440   # one breakpoint, one visit
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..'); // worktree root

// Browser resolution: the worktree's node_modules symlink carries a playwright whose
// chromium build may not be in this sandbox's cache; the npm-global install
// (1.57 / chromium-1200) is the proven one used by the 1-c family. Env-overridable.
async function loadChromium() {
  try {
    const pw = await import('playwright');
    const exe = pw.chromium.executablePath();
    if (exe && fs.existsSync(exe)) {
      console.log(`playwright: worktree node_modules (${exe.split('/').slice(-3, -1).join('/')})`);
      return pw.chromium;
    }
    console.log(`playwright: bundled browser missing (${exe}) — falling back to the global install`);
  } catch (e) {
    console.log('playwright: worktree import failed (' + String(e && e.message).slice(0, 80) + ') — falling back');
  }
  const req = createRequire(import.meta.url);
  const g = process.env.R322_PLAYWRIGHT_PATH || '/home/z/.npm-global/lib/node_modules/playwright';
  const pw = req(g);
  console.log(`playwright: global install (${g})`);
  return pw.chromium;
}

const URL = 'https://heronaiapp.com/';
const OUT_DIR = path.join(ROOT, 'docs', 'redesign', 'r322', 'heron');
const EV_DIR = path.join(ROOT, 'audits', 'evidence', 'r322', 'heron');
const REAL_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SETTLE_MS = 6000; // entrance loader + Webflow fonts/images settle (family value)
const COARSE_SETTLE_MS = 500; // coarse composition-probe steps (human-ish pacing)
const STATE_SETTLE_MS = 900; // per narrative-state settle (reveal tweens 0.8–1.34s)
const COARSE_N = 22; // composition probe positions across the map scroll window

// the 6 staged narrative slugs (order fixed by the brief; cues recorded per state
// so the foreman can verify the mapping against the JSON)
const STAGE_SLUGS = ['01-statement', '02-plan', '03-card', '04-findings', '05-room', '06-closing'];

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

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj)); // compact (family policy)
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

/** Locate the map: scroller metrics, section + wrap geometry in the scroller's
 *  scroll space, the tracked key elements (with stable nth-child selectors), a
 *  position census of the whole map subtree (sticky? absolute? fixed?) and the
 *  orange-fill shapes (the "solid-orange room" cue). */
const MAP_LOCATE = () => {
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const cs = (el) => getComputedStyle(el);
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  if (!sc) return { error: 'no scroller found' };
  const scRect = sc.getBoundingClientRect();
  const vh = innerHeight;
  const rootFs = parseFloat(cs(document.documentElement).fontSize);
  const docY = (el) => {
    const r = el.getBoundingClientRect();
    return r.top - scRect.top + sc.scrollTop;
  };
  const clsStr = (el) => (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '');
  const clsArr = (el) => clsStr(el).split(/\s+/).filter(Boolean);
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
    return (n === sc ? '.lenis>' : 'body>') + parts.join('>');
  };

  let section = document.querySelector('section.home-map') || document.querySelector('.home-map');
  let wrap = document.querySelector('.home-map-wrap') || section;
  if (!section) {
    section = [...document.querySelectorAll('section')].find((s) => /(^|\s)[\w-]*map[\w-]*(\s|$)/i.test(clsStr(s)));
    if (!wrap) wrap = section;
  }
  if (!section && !wrap) return { error: 'no .home-map / .home-map-wrap found in the scroller' };

  const secR = section.getBoundingClientRect();
  const secTop = docY(section);
  const map = {
    selector: uniqueSel(section), tag: section.tagName.toLowerCase(), cls: clsArr(section).slice(0, 4).join('.'),
    top: r2(secTop), height: r2(secR.height), bottom: r2(secTop + secR.height), width: r2(secR.width),
  };
  let wrapRec = null;
  if (wrap && wrap !== section) {
    const wr = wrap.getBoundingClientRect();
    const wt = docY(wrap);
    wrapRec = { selector: uniqueSel(wrap), tag: wrap.tagName.toLowerCase(), cls: clsArr(wrap).slice(0, 4).join('.'), top: r2(wt), height: r2(wr.height), bottom: r2(wt + wr.height), width: r2(wr.width) };
  }
  const root = section || wrap;
  const scrollWindow = {
    start: r2(Math.max(0, map.top - vh)),
    end: r2(Math.max(0, map.bottom - vh)),
    span: r2(Math.max(0, map.height - vh)),
    note: 'start = section top − viewport, end = section bottom − viewport (scroller scroll space)',
  };

  // — position census over the WHOLE map subtree: the sticky/absolute/fixed evidence —
  const census = { counts: { static: 0, relative: 0, absolute: 0, sticky: 0, fixed: 0 }, stickyEls: [], fixedEls: [], absoluteEls: [] };
  for (const el of root.querySelectorAll('*')) {
    const s = cs(el);
    const p = s.position;
    if (!(p in census.counts)) continue;
    census.counts[p]++;
    if (p === 'sticky' || p === 'fixed') {
      const rec = { sel: uniqueSel(el), tag: el.tagName.toLowerCase(), cls: clsArr(el).slice(0, 3).join('.'), top: s.top, bottom: s.bottom, zIndex: s.zIndex };
      if (p === 'sticky') census.stickyEls.push(rec); else census.fixedEls.push(rec);
    } else if (p === 'absolute' && census.absoluteEls.length < 24 && el.getBoundingClientRect().height > 40) {
      census.absoluteEls.push({ sel: uniqueSel(el), tag: el.tagName.toLowerCase(), cls: clsArr(el).slice(0, 3).join('.'), top: s.top, bottom: s.bottom, left: s.left, right: s.right, z: s.zIndex === 'auto' ? null : parseInt(s.zIndex, 10) });
    }
  }

  // — tracked key elements (geometry + opacity + transform sampled per probe step) —
  const track = [];
  const seen = new Set();
  const addTrack = (el, key, why) => {
    if (!el || seen.has(el)) return;
    const sel = uniqueSel(el);
    if (!sel) return;
    seen.add(el);
    track.push({ key, sel, tag: el.tagName.toLowerCase(), cls: clsArr(el).slice(0, 3).join('.'), why });
  };
  addTrack(section, 'section', 'the map section root');
  if (wrap && wrap !== section) addTrack(wrap, 'wrap', 'ScrollTrigger trigger element');
  // THE composition anchor: the ONE sticky element that holds the whole map
  addTrack(root.querySelector('.home-map-inner'), 'sticky-frame', 'THE sticky viewport (position:sticky top:0 — holds the entire composition)');
  // the plan column (narrows 1427→963 when .expanded opens the closing column)
  addTrack(root.querySelector('.home-map-main-stick'), 'plan-col', 'the plan column (.home-map-main-stick — 963px when .expanded)');
  const mainInner = root.querySelector('.home-map-main-inner');
  addTrack(mainInner, 'main-inner', 'scrub y target (.home-map-main-inner)');
  // ALL the stacked plan layers (each .home-map-main-img-inner carries a scrubbed opacity
  // — the crossfade story lives here; layer7+ would be the img-main variant)
  [...root.querySelectorAll('.home-map-main-img-inner')].slice(0, 8).forEach((el, i) => {
    addTrack(el, 'layer' + (i + 1), 'plan layer ' + (i + 1) + ' (.home-map-main-img-inner — scrub opacity target)');
  });
  addTrack(root.querySelector('.home-map-main-img-main'), 'layer-main', 'the main plan layer (.home-map-main-img-main)');
  // the INTRODUCTION card + its 5 progress items (the [nn/05] furniture)
  addTrack(root.querySelector('.home-map-intro'), 'intro-card', 'the INTRODUCTION card (.home-map-intro)');
  [...root.querySelectorAll('.home-map-intro-content-item')].slice(0, 5).forEach((el, i) => {
    addTrack(el, 'intro-item' + (i + 1), 'intro card progress item #' + (i + 1));
  });
  // the content column (slides in at the closing — x motion)
  addTrack(root.querySelector('.home-map-content'), 'content-col', 'the statement column (.home-map-content)');
  // plan media: the 3 largest media boxes in the map
  const medias = [...root.querySelectorAll('img, svg, canvas, video')]
    .map((m) => ({ m, a: m.getBoundingClientRect().width * m.getBoundingClientRect().height }))
    .filter((x) => x.a > 100)
    .sort((a, b) => b.a - a.a)
    .slice(0, 3);
  medias.forEach((x, i) => addTrack(x.m, 'media' + (i + 1), 'plan media #' + (i + 1) + ' (' + x.m.tagName.toLowerCase() + ')'));
  // the intel cards (outermost [class*=intel] matches — full-plan overlay layers)
  const intelAll = [...root.querySelectorAll('[class*="intel"]')];
  const cards = intelAll.filter((el) => !intelAll.some((o) => o !== el && o.contains(el))).slice(0, 4);
  cards.forEach((el, i) => addTrack(el, 'card' + (i + 1), 'intel overlay layer #' + (i + 1) + ' (carries one display headline)'));
  // headlines (outermost heading-ish)
  const heads = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,[class*="heading"]')];
  const headlines = heads.filter((el) => !heads.some((o) => o !== el && o.contains(el))).slice(0, 6);
  headlines.forEach((el, i) => addTrack(el, 'headline' + (i + 1), 'headline candidate #' + (i + 1)));
  // the plan's room-number furniture (svg groups)
  [...root.querySelectorAll('[class*="number"]')].slice(0, 4).forEach((el, i) => {
    addTrack(el, 'num' + (i + 1), 'room-number group #' + (i + 1));
  });
  // orange-filled SVG shapes (the solid-orange room cue — capped tracking, full list recorded)
  const isOrange = (col) => {
    const m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(col || '');
    if (!m) return false;
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    return r >= 180 && g <= 130 && b <= 110;
  };
  let orangeN = 0;
  const orangeFills = [];
  for (const el of root.querySelectorAll('svg path, svg rect, svg circle, svg polygon, svg ellipse')) {
    const s = cs(el);
    if (isOrange(s.fill)) {
      orangeN++;
      const r = el.getBoundingClientRect();
      orangeFills.push({ fill: s.fill, opacity: s.opacity, box: [r2(r.x), r2(r.y), r2(r.width), r2(r.height)] });
      if (orangeN <= 10) addTrack(el, 'orange' + orangeN, 'orange-filled shape #' + orangeN);
    }
    if (orangeN > 40) break;
  }

  // — class-watch elements (classNames are structural Webflow tokens, not content):
  //  section.expanded (the closing-column layout), intro.active (the progress card)
  //  and the content-wrap (width 0 ↔ 464px) — the two-state layout driver —
  const watch = [
    { key: 'sec', sel: uniqueSel(section), why: 'section.home-map classes (expanded?)' },
  ];
  const introEl = root.querySelector('.home-map-intro');
  if (introEl) watch.push({ key: 'intro', sel: uniqueSel(introEl), why: '.home-map-intro classes (active?)' });
  const cwEl = root.querySelector('.home-map-content-wrap');
  if (cwEl) watch.push({ key: 'cwrap', sel: uniqueSel(cwEl), why: '.home-map-content-wrap (w 0 ↔ 464)' });
  const msEl = root.querySelector('.home-map-main-stick');
  if (msEl) watch.push({ key: 'mstick', sel: uniqueSel(msEl), why: '.home-map-main-stick width (1427 ↔ 963)' });

  // — text-tracked elements (chars + non-reversible fingerprint per probe step) —
  // headings + the mono LEAF text elements (the [nn/05]-style counters, intro-scroll
  // rows, content label — containers with no own text are useless for change detection)
  const txt = [];
  for (const t of track) if (/^headline|^card/.test(t.key)) txt.push({ key: t.key, sel: t.sel });
  let monoN = 0;
  for (const el of root.querySelectorAll('*')) {
    if (monoN >= 12) break;
    const s = cs(el);
    if (!/mono/i.test(s.fontFamily.split(',')[0] || '')) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const sel = uniqueSel(el);
    if (!sel || txt.some((t) => t.sel === sel)) continue;
    monoN++;
    txt.push({ key: 'mtxt' + monoN, sel, why: 'mono text leaf (' + clsArr(el).slice(0, 2).join('.') + ')' });
  }

  return {
    viewport: { w: innerWidth, h: vh },
    rootFontSize: { px: r2(rootFs), vwPct: r2((rootFs / innerWidth) * 100) },
    htmlClass: document.documentElement.className,
    docH: sc.scrollHeight,
    maxScroll: Math.max(0, sc.scrollHeight - sc.clientHeight),
    scroller: {
      selector: sc === document.scrollingElement ? 'html' : sc.tagName.toLowerCase() + '.' + clsArr(sc).join('.'),
      classList: clsArr(sc), clientH: sc.clientHeight, scrollH: sc.scrollHeight,
    },
    map, wrap: wrapRec, scrollWindow, census,
    els: track, txt, watch,
    orangeFills,
    facts: {
      sectionsAll: [...sc.querySelectorAll('section')].map((s) => clsArr(s)[0]).filter(Boolean),
      mapClassFound: !!document.querySelector('section.home-map, .home-map'),
      wrapClassFound: !!document.querySelector('.home-map-wrap'),
    },
  };
};

/** One composition-probe row: per tracked element [x, viewportY, w, h, EFFECTIVE
 *  opacity (ancestors multiplied), translateY, scale] + per text-tracked element
 *  [chars, fingerprint] + per watched element its className list (structural tokens). */
const MAP_PROBE = (arg) => {
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  const out = { y: Math.round(sc.scrollTop * 10) / 10, els: {}, txt: {}, watch: {} };
  const parseTr = (t) => {
    if (!t || t === 'none') return [0, 1];
    try {
      const m = new DOMMatrix(t);
      return [Math.round((m.m42 || 0) * 10) / 10, Math.round(Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12) * 100) / 100];
    } catch { return [null, null]; }
  };
  const root = arg.mapRoot ? document.querySelector(arg.mapRoot) : null;
  const effOpacity = (el) => {
    let op = 1, n = el;
    while (n && n !== document.body) {
      const s = getComputedStyle(n);
      op *= parseFloat(s.opacity);
      if (s.visibility === 'hidden') return 0;
      if (root && n === root) break;
      n = n.parentElement;
    }
    return op;
  };
  for (const e of arg.els || []) {
    let el = null;
    try { el = document.querySelector(e.sel); } catch {}
    if (!el) { out.els[e.key] = null; continue; }
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const p = parseTr(s.transform);
    out.els[e.key] = [
      Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height),
      Math.round(effOpacity(el) * 100) / 100, p[0], p[1],
    ];
  }
  for (const e of arg.txt || []) {
    let el = null;
    try { el = document.querySelector(e.sel); } catch {}
    if (!el) { out.txt[e.key] = null; continue; }
    const t = (el.textContent || '').trim();
    let h = 5381;
    for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) & 0xffffffff;
    out.txt[e.key] = [t.replace(/\s+/g, ' ').length, (h >>> 0).toString(16).slice(0, 8)];
  }
  for (const e of arg.watch || []) {
    let el = null;
    try { el = document.querySelector(e.sel); } catch {}
    if (!el) { out.watch[e.key] = null; continue; }
    const clsArr = (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    const r = el.getBoundingClientRect();
    out.watch[e.key] = { cls: clsArr, w: Math.round(r.width), x: Math.round(r.x) };
  }
  return out;
};

/** State snapshot: depth≤6 walk of the map; keep nodes that are visible (effective
 *  opacity > .05, in viewport), carry text, or are media. Records rect + key styles
 *  + own/total char counts + data-attr names (for the changed-vs-previous diff). */
const MAP_SAMPLE = (selArg) => {
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  const root = document.querySelector(selArg);
  if (!root) return { error: 'not found' };
  const vh = innerHeight;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'TITLE', 'DEFS', 'SOURCE', 'TRACK', 'BR', 'WBR']);
  const MEDIA = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'PICTURE']);
  const nodes = [];
  const MAX_NODES = 130;
  const walk = (el, depth, ipath, effOp, effVis) => {
    if (nodes.length >= MAX_NODES || depth > 6) return;
    if (SKIP.has(el.tagName)) return;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1 && s.position !== 'fixed') return;
    const ownOp = parseFloat(s.opacity);
    const op = effOp * (isFinite(ownOp) ? ownOp : 1);
    const visNow = effVis && s.visibility !== 'hidden' && op > 0.05 && r.bottom > -40 && r.top < vh + 40;
    let chars = 0;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3) continue;
      const t = n.textContent.trim();
      if (t) chars += t.replace(/\s+/g, ' ').length;
    }
    const isMedia = MEDIA.has(el.tagName);
    if (visNow || chars > 0 || isMedia) {
      const node = {
        p: ipath, t: el.tagName.toLowerCase(),
        bx: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        o: Math.round(op * 100) / 100,
      };
      const cls = (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
      if (cls.length) node.c = cls.slice(0, 3).join('.');
      if (chars) node.ch = chars;
      const tch = (el.textContent || '').trim().replace(/\s+/g, ' ').length;
      if (tch && tch <= 600) node.tch = tch;
      if (s.position !== 'static') node.pos = s.position;
      if (s.zIndex !== 'auto') node.z = parseInt(s.zIndex, 10);
      if (s.transform !== 'none') node.tr = s.transform.length > 48 ? s.transform.slice(0, 48) + '…' : s.transform;
      if (chars) {
        const fs = parseFloat(s.fontSize);
        node.fs = Math.round(fs * 10) / 10;
        node.fw = s.fontWeight;
        node.ff = (s.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim().slice(0, 24);
      }
      if (s.visibility === 'hidden') node.hd = true;
      const da = el.getAttributeNames().filter((a) => /^data-/.test(a));
      if (da.length) node.da = da.slice(0, 6).join(',');
      if (el.getAttribute('aria-hidden') === 'true') node.ah = true;
      if (MEDIA.has(el.tagName)) node.media = true;
      nodes.push(node);
    }
    const kids = [...el.children].slice(0, 40);
    for (let i = 0; i < kids.length; i++) {
      walk(kids[i], depth + 1, ipath + '/' + i, op, effVis && s.visibility !== 'hidden');
    }
  };
  walk(root, 0, '', 1, true);
  return { scrollTop: Math.round(sc.scrollTop * 10) / 10, nodes };
};

/** The structural walk (family WALK_SECTION adapted): depth ≤ 6, children ≤ 40;
 *  every element gets px (scroller-content coords) + rem (site root) + % of
 *  section; texty elements get the full type record; media go to the inventory
 *  (src = LAST PATH SEGMENT only). Text = metadata {role, chars, lines, lang}. */
const MAP_WALK = (arg) => {
  const { sel, rootFs, mapTop, mapW, mapH } = arg || {};
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  const root = document.querySelector(sel);
  if (!root) return { error: 'selector not found: ' + sel };
  const scRect = sc.getBoundingClientRect();
  const inSc = sc.contains(root);
  const MAX_CHILDREN = 40;
  const cs = (el) => getComputedStyle(el);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'TITLE', 'DEFS', 'SOURCE', 'TRACK', 'BR', 'WBR']);
  const MEDIA = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'PICTURE']);
  const TEXTY = new Set(['H1','H2','H3','H4','H5','H6','P','A','BUTTON','LI','SPAN','LABEL','BLOCKQUOTE','FIGCAPTION','TD','TH','TIME','SMALL','STRONG','EM','B','I','DT','DD','SUMMARY','LEGEND','OPTION']);
  const cleanCls = (el) => {
    const raw = typeof el.className === 'string' ? el.className : el.getAttribute('class') || '';
    const out = [];
    for (let c of raw.split(/\s+/).filter(Boolean)) {
      c = c.replace(/__[A-Za-z0-9_-]{4,}$/, '').replace(/--[A-Za-z0-9_-]{4,}$/, '');
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
    const map = { H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading', P: 'paragraph', A: el.getAttribute('href') ? 'link' : null, BUTTON: 'button', IMG: 'img', NAV: 'navigation', HEADER: 'banner', FOOTER: 'contentinfo', MAIN: 'main', SECTION: 'region', UL: 'list', OL: 'list', LI: 'listitem', FIGURE: 'figure', FIGCAPTION: 'caption', SVG: 'graphics-document', CANVAS: 'canvas', VIDEO: 'video', IFRAME: 'iframe', FORM: 'form', INPUT: 'textbox', LABEL: 'label', TABLE: 'table' };
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
    if (r.width < 1 && r.height < 1 && s.position !== 'fixed') return null;
    if (s.visibility === 'hidden' && !el.children.length) return null;
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
    node.pc = [
      r2((r.width / Math.max(1, mapW)) * 100), r2((r.height / Math.max(1, mapH)) * 100),
      r2((r.x / Math.max(1, mapW)) * 100), r2(((y - mapTop) / Math.max(1, mapH)) * 100),
    ];
    const da = el.getAttributeNames().filter((a) => /^data-/.test(a));
    if (da.length) node.da = da.slice(0, 6).join(',');

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
    if (s.borderRadius !== '0px') node.rad = String(s.borderRadius).slice(0, 32);
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
    if (s.transform !== 'none') node.tr = s.transform.length > 72 ? s.transform.slice(0, 72) + '…' : s.transform;
    if (s.overflow !== 'visible') node.ovf = s.overflow;
    if (s.willChange && s.willChange !== 'auto') node.wc = s.willChange;

    if (MEDIA.has(el.tagName)) {
      const m = { p: ipath, tag: el.tagName.toLowerCase() };
      m.rendered = [r2(r.width), r2(r.height)];
      m.renderedRem = [r2(r.width / rootFs), r2(r.height / rootFs)];
      m.pctOfSection = [r2((r.width / Math.max(1, mapW)) * 100), r2((r.height / Math.max(1, mapH)) * 100)];
      const areaShare = (r.width * r.height) / rootArea;
      m.role = areaShare > 0.15 ? 'illustration' : r.width < 40 ? 'icon' : 'figure';
      if (el.tagName === 'IMG') {
        m.intrinsic = [el.naturalWidth, el.naturalHeight];
        m.objectFit = s.objectFit !== 'fill' ? s.objectFit : null;
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
        try { const cl = el.getAttribute('class'); if (cl) m.cls = cl.split(/\s+/).filter(Boolean).slice(0, 4).join('.'); } catch {}
      } else if (el.tagName === 'CANVAS') {
        m.intrinsic = [el.width, el.height];
        if (el.id) m.id = shortId(el.id);
      } else if (el.tagName === 'VIDEO') {
        m.intrinsic = [el.videoWidth, el.videoHeight];
        if (el.getAttribute('poster')) m.posterFile = el.getAttribute('poster').split('/').pop().slice(0, 60);
      }
      media.push(m);
    }

    const kids = [...el.children].filter((c) => !SKIP.has(c.tagName));
    if (kids.length > MAX_CHILDREN) node.trunc = { children: kids.length, walked: MAX_CHILDREN };
    const children = [];
    for (let i = 0; i < Math.min(kids.length, MAX_CHILDREN); i++) {
      if (MEDIA.has(kids[i].tagName) && kids[i].tagName !== 'PICTURE') continue;
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

/** Map asset detail: the plan media (intrinsic + rendered + objectFit), the SVG
 *  depth≤3 census, the intel cards (geometry + grid cell + stacking vs plan), the
 *  mono index furniture and the headline set. Runs AFTER the coarse pass so lazy
 *  images are loaded. */
const MAP_ASSET_DETAIL = (arg) => {
  const { sel, rootFs } = arg || {};
  const root = document.querySelector(sel);
  if (!root) return { error: 'not found' };
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const cs = (el) => getComputedStyle(el);
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  const scRect = sc.getBoundingClientRect();
  const docY = (el) => { const r = el.getBoundingClientRect(); return r.top - scRect.top + sc.scrollTop; };
  const clsArr = (el) => (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
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
    return (n === sc ? '.lenis>' : 'body>') + parts.join('>');
  };
  const mapW = root.getBoundingClientRect().width;
  const mapH = root.getBoundingClientRect().height;
  const mapTop = docY(root);

  // — plan media ranking —
  const planMedia = [...root.querySelectorAll('img, svg, canvas, video')]
    .map((m) => {
      const r = m.getBoundingClientRect();
      const s = cs(m);
      const rec = {
        sel: uniqueSel(m), tag: m.tagName.toLowerCase(), cls: clsArr(m).slice(0, 3).join('.'),
        rendered: [r2(r.width), r2(r.height)], renderedRem: [r2(r.width / rootFs), r2(r.height / rootFs)],
        pctOfSection: [r2((r.width / mapW) * 100), r2((r.height / mapH) * 100)],
        docY: r2(docY(m) - mapTop), pos: s.position, z: s.zIndex === 'auto' ? null : parseInt(s.zIndex, 10),
        objectFit: s.objectFit || null, opacity: r2(parseFloat(s.opacity)),
      };
      if (m.tagName === 'IMG') {
        rec.intrinsic = [m.naturalWidth, m.naturalHeight];
        rec.alt = m.alt != null && m.alt.length ? { present: true, chars: m.alt.trim().length } : { present: false, chars: 0 };
        if (m.getAttribute('src')) rec.srcFile = m.getAttribute('src').split('?')[0].split('/').pop().slice(0, 60);
        const ss = m.getAttribute('srcset');
        if (ss) rec.srcset = { count: ss.split(',').length, widths: ss.split(',').map((x) => (x.trim().match(/(\d+)w/) || [])[1]).filter(Boolean).map(Number) };
      } else if (m.tagName === 'SVG') {
        const vb = m.getAttribute('viewBox');
        if (vb) rec.viewBox = vb.split(/\s+/).map(Number);
        rec.childCount = m.children.length;
      } else if (m.tagName === 'CANVAS') {
        rec.intrinsic = [m.width, m.height];
      }
      return { rec, area: r.width * r.height };
    })
    .sort((a, b) => b.area - a.area)
    .slice(0, 8)
    .map((x) => x.rec);

  // — SVG census (depth ≤ 3) for every inline SVG in the map —
  const svgCensus = [];
  for (const svg of [...root.querySelectorAll('svg')].slice(0, 8)) {
    const counts = { d1: 0, d2: 0, d3: 0 };
    const tags = {};
    const walk = (el, d) => {
      for (const c of el.children) {
        counts['d' + d] = (counts['d' + d] || 0) + 1;
        tags[c.tagName] = (tags[c.tagName] || 0) + 1;
        if (d < 3) walk(c, d + 1);
      }
    };
    walk(svg, 1);
    const r = svg.getBoundingClientRect();
    svgCensus.push({
      sel: uniqueSel(svg), cls: clsArr(svg).slice(0, 2).join('.'),
      rendered: [r2(r.width), r2(r.height)], renderedRem: [r2(r.width / rootFs), r2(r.height / rootFs)],
      viewBox: (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number).slice(2),
      childCount: svg.children.length, census: counts, tags,
    });
  }

  // — the intel cards —
  const intelAll = [...root.querySelectorAll('[class*="intel"]')];
  const cardEls = intelAll.filter((el) => !intelAll.some((o) => o !== el && o.contains(el))).slice(0, 4);
  const plan = planMedia[0] ? document.querySelector(planMedia[0].sel) : null;
  const cards = cardEls.map((el, i) => {
    const r = el.getBoundingClientRect();
    const s = cs(el);
    const parent = el.parentElement;
    const ps = parent ? cs(parent) : null;
    let cell = null;
    if (ps && (ps.display === 'grid' || ps.display === 'inline-grid') && ps.gridTemplateColumns !== 'none') {
      const cols = ps.gridTemplateColumns.split(/\s+/).map(parseFloat);
      let acc = 0, col = 1;
      for (const c of cols) { if (r.x < acc + c) break; acc += c; col++; }
      cell = { parentDisplay: 'grid', colIndex: col, cols: cols.map((c) => r2(c)) };
    } else if (ps && (ps.display === 'flex' || ps.display === 'inline-flex')) {
      cell = { parentDisplay: 'flex', itemIndex: [...parent.children].indexOf(el) + 1 };
    } else {
      cell = { parentDisplay: ps ? ps.display : null, note: 'free placement (not a grid/flex child)' };
    }
    const head = el.querySelector('h1,h2,h3,h4,h5,h6,[class*="heading"]');
    const hs = head ? cs(head) : null;
    const hr = head ? head.getBoundingClientRect() : null;
    const pad = ['Top', 'Right', 'Bottom', 'Left'].map((side) => parseFloat(s['padding' + side]));
    // overlap with the plan asset
    let overlapPct = null;
    if (plan) {
      const pr = plan.getBoundingClientRect();
      const ix = Math.max(0, Math.min(r.right, pr.right) - Math.max(r.left, pr.left));
      const iy = Math.max(0, Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top));
      overlapPct = r2((ix * iy) / Math.max(1, r.width * r.height) * 100);
    }
    return {
      n: i + 1, sel: uniqueSel(el), tag: el.tagName.toLowerCase(), cls: clsArr(el).slice(0, 4).join('.'),
      bx: [r2(r.x), r2(docY(el)), r2(r.width), r2(r.height)],
      rem: [r2(r.width / rootFs), r2(r.height / rootFs)],
      pctOfSection: [r2((r.width / mapW) * 100), r2((r.height / mapH) * 100)],
      xPct: r2((r.x / mapW) * 100), yInSectionRem: r2((docY(el) - mapTop) / rootFs),
      position: s.position, z: s.zIndex === 'auto' ? null : parseInt(s.zIndex, 10),
      pad: pad.map(r2), padRem: pad.map((v) => r2(v / rootFs)),
      bg: s.backgroundColor !== 'rgba(0, 0, 0, 0)' ? s.backgroundColor : null,
      border: ['Top', 'Right', 'Bottom', 'Left'].map((side) => {
        const w = s['border' + side + 'Width'], st = s['border' + side + 'Style'], c = s['border' + side + 'Color'];
        return st === 'none' || parseFloat(w) === 0 ? null : `${parseFloat(w)}px ${st} ${c}`;
      }).filter(Boolean),
      radius: s.borderRadius !== '0px' ? String(s.borderRadius).slice(0, 32) : null,
      opacity: r2(parseFloat(s.opacity)), transform: s.transform === 'none' ? null : String(s.transform).slice(0, 60),
      cell,
      headline: head ? {
        cls: clsArr(head).slice(0, 3).join('.'), fs: r2(parseFloat(hs.fontSize)), fsRem: r2(parseFloat(hs.fontSize) / rootFs),
        fw: hs.fontWeight, lh: r2(parseFloat(hs.lineHeight) / parseFloat(hs.fontSize)),
        ls: isFinite(parseFloat(hs.letterSpacing)) ? r2(parseFloat(hs.letterSpacing)) : null,
        tt: hs.textTransform !== 'none' ? hs.textTransform : null,
        chars: (head.textContent || '').trim().replace(/\s+/g, ' ').length,
        bx: [r2(hr.x), r2(hr.y), r2(hr.width), r2(hr.height)],
      } : null,
      textChars: (el.textContent || '').trim().replace(/\s+/g, ' ').length,
      stackingVsPlan: plan ? {
        cardZ: s.zIndex, planZ: cs(plan).zIndex,
        domOrder: (function () { // 1 = card paints above plan (later in DOM or higher z)
          if (plan.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) return 'card-after-plan';
          return 'card-before-plan';
        })(),
        overlapAreaPctOfCard: overlapPct,
      } : null,
    };
  });

  // — the INTRODUCTION card (.home-map-intro) — geometry + placement + type —
  const introCardRec = (() => {
    const el = root.querySelector('.home-map-intro');
    if (!el) return null;
    const s = cs(el);
    const r = el.getBoundingClientRect();
    const head = el.querySelector('.home-map-intro-head');
    const items = [...el.querySelectorAll('.home-map-intro-content-item')].slice(0, 6);
    const pad = ['Top', 'Right', 'Bottom', 'Left'].map((side) => parseFloat(s['padding' + side]));
    return {
      sel: uniqueSel(el), cls: clsArr(el).slice(0, 4).join('.'),
      bx: [r2(r.x), r2(docY(el)), r2(r.width), r2(r.height)],
      rem: [r2(r.width / rootFs), r2(r.height / rootFs)],
      xPct: r2((r.x / mapW) * 100),
      position: s.position, top: s.top, left: s.left, bottom: s.bottom, right: s.right,
      z: s.zIndex === 'auto' ? null : parseInt(s.zIndex, 10),
      pad: pad.map(r2), padRem: pad.map((v) => r2(v / rootFs)),
      bg: s.backgroundColor !== 'rgba(0, 0, 0, 0)' ? s.backgroundColor : null,
      border: ['Top', 'Right', 'Bottom', 'Left'].map((side) => {
        const w = s['border' + side + 'Width'], st = s['border' + side + 'Style'], c = s['border' + side + 'Color'];
        return st === 'none' || parseFloat(w) === 0 ? null : `${parseFloat(w)}px ${st} ${c}`;
      }).filter(Boolean),
      opacity: r2(parseFloat(s.opacity)),
      head: head ? (() => {
        const hs = cs(head); const hr = head.getBoundingClientRect();
        return {
          cls: clsArr(head).slice(0, 3).join('.'),
          bx: [r2(hr.x), r2(hr.y), r2(hr.width), r2(hr.height)], rem: [r2(hr.width / rootFs), r2(hr.height / rootFs)],
          ff: (hs.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim().slice(0, 24),
          fs: r2(parseFloat(hs.fontSize)), fsRem: r2(parseFloat(hs.fontSize) / rootFs), fw: hs.fontWeight,
          lh: r2(parseFloat(hs.lineHeight) / parseFloat(hs.fontSize)),
          ls: isFinite(parseFloat(hs.letterSpacing)) ? r2(parseFloat(hs.letterSpacing)) : null,
          tt: hs.textTransform !== 'none' ? hs.textTransform : null,
          color: hs.color, bg: hs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? hs.backgroundColor : null,
          chars: (head.textContent || '').trim().replace(/\s+/g, ' ').length,
        };
      })() : null,
      items: items.map((it, i) => {
        const is = cs(it); const ir = it.getBoundingClientRect();
        return {
          n: i + 1, cls: clsArr(it).slice(0, 3).join('.'),
          bx: [r2(ir.x), r2(ir.y), r2(ir.width), r2(ir.height)], rem: [r2(ir.width / rootFs), r2(ir.height / rootFs)],
          ff: (is.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim().slice(0, 24),
          fs: r2(parseFloat(is.fontSize)), fsRem: r2(parseFloat(is.fontSize) / rootFs), fw: is.fontWeight,
          lh: r2(parseFloat(is.lineHeight) / parseFloat(is.fontSize)),
          ls: isFinite(parseFloat(is.letterSpacing)) ? r2(parseFloat(is.letterSpacing)) : null,
          tt: is.textTransform !== 'none' ? is.textTransform : null,
          color: is.color, chars: (it.textContent || '').trim().replace(/\s+/g, ' ').length,
        };
      }),
      note: 'bottom-left of the sticky frame; bottom-anchored (grows upward while items show); watch .active + item opacities in compositionProbe',
    };
  })();

  // — mono index/progress furniture —
  const mono = [];
  const seen = new Set();
  for (const el of root.querySelectorAll('*')) {
    if (mono.length >= 24) break;
    if (seen.has(el)) continue;
    const s = cs(el);
    if (!/mono/i.test(s.fontFamily.split(',')[0] || '')) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const clsMatch = /index|progress|count|num|intel|label/i.test(clsArr(el).join(' '));
    if (!hasText && !clsMatch) continue;
    seen.add(el);
    if (el.parentElement && seen.has(el.parentElement) && mono.some((m) => m.sel === uniqueSel(el.parentElement))) continue;
    const r = el.getBoundingClientRect();
    let chars = 0, lines = 0;
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
    }
    const fs = parseFloat(s.fontSize);
    mono.push({
      sel: uniqueSel(el), tag: el.tagName.toLowerCase(), cls: clsArr(el).slice(0, 3).join('.'),
      bx: [r2(r.x), r2(docY(el) - mapTop), r2(r.width), r2(r.height)],
      rem: [r2(r.width / rootFs), r2(r.height / rootFs)],
      fs: r2(fs), fsRem: r2(fs / rootFs), fw: s.fontWeight,
      lh: r2(parseFloat(s.lineHeight) / fs), ls: isFinite(parseFloat(s.letterSpacing)) ? r2(parseFloat(s.letterSpacing)) : null,
      tt: s.textTransform !== 'none' ? s.textTransform : null,
      chars, lines: Math.min(lines, 8), color: s.color,
    });
  }

  // — headlines —
  const heads = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,[class*="heading"]')];
  const headlineEls = heads.filter((el) => !heads.some((o) => o !== el && o.contains(el))).slice(0, 8);
  const headlines = headlineEls.map((el) => {
    const s = cs(el);
    const r = el.getBoundingClientRect();
    const parent = el.parentElement;
    const ps = parent ? cs(parent) : null;
    let cell = null;
    if (ps && (ps.display === 'grid' || ps.display === 'inline-grid') && ps.gridTemplateColumns !== 'none') {
      const cols = ps.gridTemplateColumns.split(/\s+/).map(parseFloat);
      let acc = 0, col = 1;
      for (const c of cols) { if (r.x < acc + c) break; acc += c; col++; }
      cell = { parentDisplay: 'grid', colIndex: col, cols: cols.map((c) => r2(c)) };
    }
    let chars = 0, lines = 0;
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
    }
    const tch = (el.textContent || '').trim().replace(/\s+/g, ' ').length;
    return {
      sel: uniqueSel(el), tag: el.tagName.toLowerCase(), cls: clsArr(el).slice(0, 4).join('.'),
      ff: (s.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim().slice(0, 28),
      fs: r2(parseFloat(s.fontSize)), fsRem: r2(parseFloat(s.fontSize) / rootFs), fw: s.fontWeight,
      lh: r2(parseFloat(s.lineHeight) / parseFloat(s.fontSize)),
      ls: isFinite(parseFloat(s.letterSpacing)) ? r2(parseFloat(s.letterSpacing)) : null,
      tt: s.textTransform !== 'none' ? s.textTransform : null, col: s.color,
      chars, totalChars: tch, lines: Math.min(lines, 10),
      bx: [r2(r.x), r2(docY(el) - mapTop), r2(r.width), r2(r.height)],
      rem: [r2(r.width / rootFs), r2(r.height / rootFs)],
      yInSectionRem: r2((docY(el) - mapTop) / rootFs), cell,
    };
  });

  return { planMedia, svgCensus, cards, introCard: introCardRec, monoFurniture: mono, headlines };
};

/** The map's ScrollTrigger table — every trigger whose element is inside the map
 *  wrap OR whose measured range intersects the map scroll window. Tween vars are
 *  recorded as VALUES (numbers are motion parameters, not content); eases that are
 *  functions are SAMPLED at t=.25/.5/.75 (curve shape, not source). */
const MAP_TRIGGERS = (arg) => {
  if (!window.ScrollTrigger || !window.ScrollTrigger.getAll) return { error: 'ScrollTrigger not present' };
  const { wrapSel, winStart, winEnd, vh } = arg || {};
  const wrap = wrapSel ? document.querySelector(wrapSel) : null;
  const asNode = (x) => {
    if (x && typeof x === 'string') { try { return document.querySelector(x); } catch { return null; } }
    return x && x.nodeType === 1 ? x : null;
  };
  const describe = (el) => {
    el = asNode(el);
    if (!el || !el.tagName) return typeof el === 'string' ? el.slice(0, 40) : null;
    const cls = (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    return el.tagName.toLowerCase() + (cls.length ? '.' + cls.slice(0, 2).join('.') : '');
  };
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const META = new Set(['ease','duration','delay','paused','immediateRender','repeat','yoyo','stagger','onStart','onComplete','onUpdate','onReverseComplete','onRepeat','overwrite','keyframes','defaults','runBackwards','startAt','id','data','inherit','callbacks','repeatDelay','useFrames','lazy','onStartParams','onCompleteParams','onUpdateParams','parent','targets','onUpdateParams','onOverwrite']);
  const easeInfo = (e) => {
    if (e == null) return null;
    if (typeof e === 'string') return { kind: 'string', name: e };
    if (typeof e === 'function') {
      try { return { kind: 'fn', sampled: [r2(e(0.25)), r2(e(0.5)), r2(e(0.75))] }; } catch { return { kind: 'fn' }; }
    }
    if (typeof e === 'object' && e.type) return { kind: 'named', name: String(e.type) + (e.power != null ? '(' + e.power + ')' : '') };
    return { kind: typeof e };
  };
  const val = (v) => {
    if (v == null) return null;
    if (typeof v === 'function') return 'fn';
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (typeof v === 'object') { try { return JSON.stringify(v).slice(0, 60); } catch { return 'obj'; } }
    return String(v).slice(0, 40);
  };
  const list = window.ScrollTrigger.getAll().filter((t) => {
    const v = t.vars || {};
    const trig = asNode(v.trigger);
    if (wrap && trig && wrap.contains(trig)) return true;
    return t.start <= winEnd + vh && t.end >= winStart - vh;
  });
  return {
    totalTriggers: window.ScrollTrigger.getAll().length,
    matched: list.length,
    triggers: list.map((t) => {
      const v = t.vars || {};
      const rec = {
        trigger: describe(v.trigger), start: v.start ?? null, end: v.end ?? null,
        scrub: v.scrub === true ? true : (v.scrub ?? null),
        pin: v.pin === true ? true : (v.pin && v.pin.tagName ? describe(v.pin) : v.pin ?? null),
        pinSpacing: v.pinSpacing ?? null,
        snap: v.snap == null ? null : (typeof v.snap === 'object' ? 'obj' : v.snap),
        anticipatePin: v.anticipatePin ?? null, toggleActions: v.toggleActions ?? null,
        toggleClass: v.toggleClass == null ? null : {
          className: typeof v.toggleClass === 'string' ? v.toggleClass : (v.toggleClass.className ?? null),
          targets: typeof v.toggleClass === 'object' && v.toggleClass.targets
            ? (v.toggleClass.targets.tagName ? describe(v.toggleClass.targets) : String(v.toggleClass.targets).slice(0, 40))
            : 'trigger itself',
        },
        once: v.once ?? null, id: v.id ?? null,
        measured: { start: Math.round(t.start), end: Math.round(t.end) },
        triggerInMap: !!(wrap && asNode(v.trigger) && wrap.contains(asNode(v.trigger))),
      };
      try {
        if (t.animation) {
          const kids = t.animation.getChildren ? t.animation.getChildren(true, true, true) : [];
          rec.anim = {
            totalDuration: r2(t.animation.totalDuration()),
            tweens: kids.slice(0, 24).map((k) => {
              const vars = k.vars || {};
              const props = {};
              for (const key of Object.keys(vars)) if (!META.has(key)) props[key] = val(vars[key]);
              let targets = null;
              try { targets = k.targets ? [...k.targets()].slice(0, 6).map(describe) : null; } catch { targets = 'err'; }
              let startTime = null;
              try { startTime = r2(k.startTime()); } catch {}
              return { dur: r2(k.duration()), delay: r2(k.delay()), startTime, ease: easeInfo(vars.ease), props, targets };
            }),
          };
        }
      } catch (e) { rec.anim = { err: String(e).slice(0, 60) }; }
      return rec;
    }),
  };
};

/** Lenis observables (the instance is not exposed — record what IS observable). */
const LENIS_OBS = () => {
  const sc = document.querySelector('.lenis');
  const out = {
    windowLenis: !!window.lenis, window__lenis: !!window.__lenis,
    globalsMatched: [], wrapper: null, wrapperClassList: null, wrapperDataAttrs: null,
    wrapperComputed: null, optionsReachable: false, options: null,
  };
  try {
    for (const k of Object.keys(window)) if (/lenis/i.test(k)) out.globalsMatched.push(k);
  } catch {}
  if (sc) {
    const s = getComputedStyle(sc);
    out.wrapper = 'div.' + (typeof sc.className === 'string' ? sc.className.split(/\s+/).filter(Boolean).join('.') : '');
    out.wrapperClassList = (typeof sc.className === 'string' ? sc.className : '').split(/\s+/).filter(Boolean);
    out.wrapperDataAttrs = [...sc.attributes].filter((a) => /^data-lenis/i.test(a.name)).map((a) => a.name);
    out.wrapperComputed = { overflow: s.overflow, overflowY: s.overflowY, scrollBehavior: s.scrollBehavior };
    for (const key of ['lenis', '__lenis', 'lenisInstance', 'smooth']) {
      const g = sc[key];
      if (g && typeof g === 'object' && typeof g.scrollTo === 'function') {
        out.optionsReachable = true;
        out.detectedVia = 'wrapper element property "' + key + '"';
        const o = g.options || {};
        out.options = {
          lerp: o.lerp ?? null, duration: o.duration ?? null, wheelMultiplier: o.wheelMultiplier ?? null,
          syncTouch: o.syncTouch ?? null, touchMultiplier: o.touchMultiplier ?? null, smoothWheel: o.smoothWheel ?? null,
        };
      }
    }
  }
  return out;
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
    });
  }
  return hits;
};

// ─────────────────────────────────────────────────────────────────────────────
// node-side analysis
// ─────────────────────────────────────────────────────────────────────────────

/** Change-point signature: visibility tokens (with opacity buckets) + text fingerprints. */
function signature(s, vh) {
  const vis = [];
  for (const [k, v] of Object.entries(s.els || {})) {
    if (!v) continue;
    const on = v[4] > 0.05 && v[1] < vh && v[1] + v[3] > 0;
    vis.push(k + (on ? ':1@' + Math.min(4, Math.round(v[4] * 4)) : ':0'));
  }
  vis.sort();
  const txt = Object.entries(s.txt || {}).map(([k, v]) => (v ? k + ':' + v[1] : k + ':-')).sort();
  return vis.join('|') + '##' + txt.join('|');
}

function detectChanges(samples, vh) {
  const changes = [];
  let prev = signature(samples[0], vh);
  for (let i = 1; i < samples.length; i++) {
    const cur = signature(samples[i], vh);
    if (cur !== prev) {
      const a = new Set(prev.split(/[\|#]/).filter(Boolean));
      const b = new Set(cur.split(/[\|#]/).filter(Boolean));
      let diff = 0;
      for (const t of a) if (!b.has(t)) diff++;
      for (const t of b) if (!a.has(t)) diff++;
      changes.push({ i, y: samples[i].y, diff });
    }
    prev = cur;
  }
  return changes;
}

/** Pick exactly 6 state positions from the change clusters (first cluster = the
 *  statement's arrival; last = the closing; fill evenly if the story is quiet). */
function pickStates(samples, changes, scanStart, scanEnd) {
  const GAP = 320;
  const clusters = [];
  for (const c of changes) {
    const last = clusters[clusters.length - 1];
    if (last && c.y - last.maxY <= GAP) {
      last.items.push(c); last.maxY = c.y; last.maxDiff = Math.max(last.maxDiff, c.diff);
    } else {
      clusters.push({ items: [c], minY: c.y, maxY: c.y, maxDiff: c.diff });
    }
  }
  const cand = clusters.map((cl) => ({ y: Math.round(cl.minY + 80), sig: cl.maxDiff, from: cl.minY, to: cl.maxY }));
  const first = cand.length ? cand[0].y : scanStart;
  let picks = [first];
  const mid = cand.filter((c) => c.y > first + 250 && c.y < scanEnd - 250);
  mid.sort((a, b) => b.sig - a.sig || a.y - b.y);
  picks.push(...mid.slice(0, 4).map((c) => c.y));
  picks.push(scanEnd);
  picks = [...new Set(picks)].sort((a, b) => a - b);
  const dedup = [];
  for (const y of picks) if (!dedup.length || y - dedup[dedup.length - 1] > 240) dedup.push(y);
  let guard = 12;
  while (dedup.length < 6 && guard-- > 0) {
    let bestGap = -1, bestY = null;
    for (let i = 0; i < dedup.length - 1; i++) {
      const gap = dedup[i + 1] - dedup[i];
      if (gap > bestGap) { bestGap = gap; bestY = Math.round((dedup[i] + dedup[i + 1]) / 2); }
    }
    if (bestGap < 300 || bestY == null) break;
    dedup.push(bestY);
    dedup.sort((a, b) => a - b);
  }
  return { positions: dedup.slice(0, 6), clusters: cand };
}

/** THE composition verdict: per tracked element, how much scroll advance it stays
 *  put on screen (locked) vs moves (normal flow), plus the transform variance while
 *  locked (transform-driven lock?) — combined with the position census upstream. */
function compositionAnalysis(samples, vh) {
  const keys = [];
  for (const s of samples) for (const k of Object.keys(s.els || {})) if (s.els[k] && !keys.includes(k)) keys.push(k);
  const per = {};
  for (const k of keys) {
    let locked = 0, moved = 0;
    const tyVals = [];
    const ratios = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1].els[k], b = samples[i].els[k];
      if (!a || !b) continue;
      const ds = samples[i].y - samples[i - 1].y;
      if (ds < 5) continue;
      const dv = b[1] - a[1];
      const ratio = dv / ds;
      ratios.push(ratio);
      if (Math.abs(ratio) < 0.18 && b[3] > 60) { locked += ds; tyVals.push(b[5]); }
      else moved += Math.abs(dv);
    }
    const tySpread = tyVals.length ? Math.max(...tyVals) - Math.min(...tyVals) : 0;
    per[k] = {
      lockedScrollPx: Math.round(locked),
      movedPx: Math.round(moved),
      tySpreadWhileLocked: Math.round(tySpread * 10) / 10,
      avgRatio: ratios.length ? Math.round((ratios.reduce((x, y) => x + y, 0) / ratios.length) * 100) / 100 : null,
    };
  }
  return { note: 'ratio = ΔviewportY/Δscroll per probe step; locked = |ratio|<0.18 while element height>60px', per };
}

/** Headline story: per headline key the visible scroll ranges + DISTINCT text
 *  fingerprints (non-reversible) with their own ranges — counts distinct headlines. */
function headlineStory(samples, vh, headlineKeys) {
  const out = {};
  for (const k of headlineKeys) {
    const ranges = [];
    let cur = null;
    const hashes = new Map();
    for (const s of samples) {
      const v = (s.els || {})[k];
      const t = (s.txt || {})[k];
      const on = v && v[4] > 0.05 && v[1] < vh && v[1] + v[3] > 0;
      if (on) {
        if (cur) cur.to = s.y; else cur = { from: s.y, to: s.y };
        if (t) {
          if (!hashes.has(t[1])) hashes.set(t[1], { th: t[1], chars: t[0], from: s.y, to: s.y });
          const e = hashes.get(t[1]); e.to = s.y;
        }
      } else if (cur) { ranges.push([cur.from, cur.to]); cur = null; }
    }
    if (cur) ranges.push([cur.from, cur.to]);
    out[k] = { ranges, distinctTexts: [...hashes.values()] };
  }
  return out;
}

/** SEMANTIC state picker — the 6 narrative stages resolved from the probe-row
 *  timeline itself (measured cues, not guesses). Each stage rule scans the coarse
 *  rows; unresolved stages fall back to interpolation between resolved neighbours
 *  (method recorded per stage for the foreman's verification). */
function pickStatesSemantic(samples, vh, scanStart, scanEnd) {
  const rows = samples;
  const el = (r, k) => (r.els && r.els[k]) || null;
  const op = (r, k) => { const v = el(r, k); return v ? v[4] : 0; };
  const yOf = (r, k) => { const v = el(r, k); return v ? v[1] : null; };
  const wOf = (r, k) => { const v = el(r, k); return v ? v[2] : null; };
  const layerKeys = rows.length && Object.keys(rows[0].els || {}).filter((k) => /^layer\d+$/.test(k)).sort();
  const hasIntro = rows.some((r) => el(r, 'intro-card'));
  const stages = [];
  const resolved = [];
  const push = (n, y, method, cue) => { stages[n - 1] = { n, y, method, cue }; resolved.push(y); };

  // 01-statement: intel card 1 fully ON over the settled plan (section engaged)
  let row = rows.find((r) => op(r, 'card1') > 0.9 && yOf(r, 'section') <= 0);
  if (row) push(1, row.y, 'semantic: card1 op>0.9 ∧ section top ≤ 0', 'card1 ' + op(row, 'card1'));

  // 02-plan: the pure paper — card1 out, card2 not yet in, no intro card
  row = rows.find((r) => op(r, 'card1') < 0.2 && op(r, 'card2') < 0.15 && (!hasIntro || op(r, 'intro-card') < 0.3));
  if (row && (!stages[0] || row.y > stages[0].y)) push(2, row.y, 'semantic: card1<0.2 ∧ card2<0.15 ∧ no intro', 'c1 ' + op(row, 'card1') + ' c2 ' + op(row, 'card2'));

  // 03-card: the INTRODUCTION card + its first progress item fully on
  row = rows.find((r) => op(r, 'intro-card') > 0.8 && op(r, 'intro-item1') > 0.8);
  if (row) push(3, row.y, 'semantic: intro-card>0.8 ∧ item1>0.8', 'icard ' + op(row, 'intro-card'));

  // 04-findings: layers mid-build, the first progress item already gone
  row = rows.find((r) => op(r, 'layer1') > 0.8 && op(r, 'intro-item1') < 0.2);
  if (row) push(4, row.y, 'semantic: layer1>0.8 ∧ item1 gone', 'L1 ' + op(row, 'layer1'));

  // 05-room: every scrubbed layer on (the finished plan + orange marks)
  row = rows.find((r) => layerKeys.length && layerKeys.every((k) => op(r, k) > 0.8));
  if (row) push(5, row.y, 'semantic: all ' + layerKeys.length + ' layers >0.8', 'L* on');

  // 06-closing: the last scan position (released + the closing column)
  push(6, scanEnd, 'semantic: scanEnd (release + closing column)', 'end of window');

  // fill unresolved stages between resolved anchors
  for (let n = 1; n <= 6; n++) {
    if (stages[n - 1]) continue;
    const prev = [...stages.slice(0, n - 1)].reverse().find(Boolean);
    const next = stages.slice(n).find(Boolean);
    let y;
    if (prev && next) y = Math.round((prev.y + next.y) / 2);
    else if (prev) y = Math.min(scanEnd, prev.y + Math.round((scanEnd - prev.y) / Math.max(1, 7 - n)));
    else if (next) y = Math.max(scanStart, next.y - Math.round((next.y - scanStart) / Math.max(1, n)));
    else y = Math.round(scanStart + ((scanEnd - scanStart) * (n - 1)) / 5);
    stages[n - 1] = { n, y, method: 'fallback: interpolated (stage cue unresolved at this bp)', cue: null };
  }
  // enforce monotonic + spaced
  const ys = stages.map((s) => s.y).sort((a, b) => a - b);
  for (let i = 0; i < 6; i++) stages[i].y = ys[i];
  return { positions: stages.map((s) => s.y), stages };
}

/** Diff two state snapshots: newly visible/hidden paths, class/data-attr/text changes. */
function diffSamples(prev, cur) {
  if (!prev) return { note: 'first state — no previous' };
  const mapOf = (s) => {
    const m = new Map();
    for (const n of s.nodes || []) m.set(n.p, n);
    return m;
  };
  const a = mapOf(prev), b = mapOf(cur);
  const newlyVisible = [], newlyHidden = [], changed = [];
  for (const [p, n] of b) {
    const o = a.get(p);
    const visNow = n.o > 0.05 && n.bx[1] < 1e9; // visibility already filtered in-page
    if (!o) { if (visNow) newlyVisible.push(p + ':' + (n.c || n.t)); continue; }
    const diffs = [];
    if ((o.c || '') !== (n.c || '')) diffs.push('cls');
    if ((o.da || '') !== (n.da || '')) diffs.push('data-attrs');
    if ((o.ch || 0) !== (n.ch || 0) || (o.tch || 0) !== (n.tch || 0)) diffs.push('text-chars');
    if (Math.round(o.o * 10) !== Math.round(n.o * 10)) diffs.push('opacity');
    if (diffs.length) changed.push(p + ':' + (n.c || n.t) + '(' + diffs.join('+') + ')');
  }
  for (const [p, n] of a) if (!b.has(p)) newlyHidden.push(p + ':' + (n.c || n.t));
  return {
    newlyVisible: newlyVisible.slice(0, 40), newlyHidden: newlyHidden.slice(0, 40),
    changed: changed.slice(0, 40),
    counts: { newlyVisible: newlyVisible.length, newlyHidden: newlyHidden.length, changed: changed.length },
  };
}

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

  // entrance loader + settle, polling every 500ms (times the sequence; never clicked)
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

  // consent: geometry only, one Escape press, never click
  const cookieBefore = await page.evaluate(COOKIE_SCAN);
  let cookieAfter = cookieBefore;
  if (cookieBefore.length) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(600);
    cookieAfter = await page.evaluate(COOKIE_SCAN);
  }

  // — locate the map —
  const locate = await page.evaluate(MAP_LOCATE);
  if (locate.error) {
    await context.close();
    return { bp: bp.label, ok: false, error: 'MAP_LOCATE: ' + locate.error };
  }
  const vh = bp.h;
  const mapTop = locate.map.top, mapH = locate.map.height, mapBottom = locate.map.bottom;
  const winStart = locate.scrollWindow.start, winEnd = locate.scrollWindow.end;
  console.log(`  rootFs=${locate.rootFontSize.px}px · docH=${locate.docH} · maxScroll=${locate.maxScroll}`);
  console.log(`  map: top=${mapTop} height=${mapH} bottom=${mapBottom} (scrollWindow ${winStart}→${winEnd}, span ${locate.scrollWindow.span})`);
  console.log(`  census: ${JSON.stringify(locate.census.counts)} · tracked els=${locate.els.length} (sticky=${locate.census.stickyEls.length}, fixed=${locate.census.fixedEls.length})`);

  // — scroll helper (drives the SCROLLER; the window does not scroll on this site) —
  const scrollerSel = locate.scroller.selector.includes('lenis') ? '.lenis' : locate.scroller.selector;
  const currentScroll = () => page.evaluate((sel) => document.querySelector(sel).scrollTop, scrollerSel);
  const setScroll = (y) => page.evaluate(({ sel, y }) => { const sc = document.querySelector(sel); if (sc) sc.scrollTop = y; }, { sel: scrollerSel, y });
  const scrollTo = async (y, settleMs) => {
    await setScroll(y);
    await page.waitForTimeout(120);
    if (Math.abs((await currentScroll()) - y) > 25) {
      await page.mouse.move(Math.round(bp.w / 2), Math.round(bp.h / 2));
      for (let i = 0; i < 14; i++) {
        const c = await currentScroll();
        if (Math.abs(c - y) < 30) break;
        await page.mouse.wheel(0, Math.round(y - c));
        await page.waitForTimeout(220);
      }
    }
    await page.waitForTimeout(Math.max(0, (settleMs ?? STATE_SETTLE_MS) - 120));
    return currentScroll();
  };

  // — D. pristine ScrollTrigger table (before any scrolling) —
  const wrapSel = locate.wrap ? locate.wrap.selector : locate.map.selector;
  const triggersA = await page.evaluate(MAP_TRIGGERS, { wrapSel, winStart, winEnd, vh });
  console.log(`  triggers: ${triggersA.matched}/${triggersA.totalTriggers} matched the map window`);

  // — LOAD state (scroll 0, pristine): the layout classes BEFORE any scrolling —
  //  (the .expanded two-state layout is direction-sensitive: reversing the scrub
  //  re-flips classes, so the pristine + pure-forward values are recorded apart)
  const loadState = await page.evaluate((w) => {
    const out = {};
    for (const e of w || []) {
      let el = null;
      try { el = document.querySelector(e.sel); } catch {}
      if (!el) { out[e.key] = null; continue; }
      const r = el.getBoundingClientRect();
      out[e.key] = {
        cls: (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '').split(/\s+/).filter(Boolean),
        w: Math.round(r.width), x: Math.round(r.x), y: Math.round(r.y),
      };
    }
    return out;
  }, locate.watch);
  console.log(`  load-state: ${JSON.stringify(loadState)}`);

  // — C. structural walk at scroll 0 (initial state — family convention) —
  const walkData = await page.evaluate(MAP_WALK, { sel: locate.map.selector, rootFs: locate.rootFontSize.px, mapTop, mapW: locate.map.width, mapH });
  console.log(`  tree: ${countNodes(walkData.tree)} nodes, ${walkData.media.length} media`);

  // — A. the composition probe: COARSE_N positions across the map scroll window —
  const scanStart = Math.max(0, Math.round(winStart));
  const scanEnd = Math.min(locate.maxScroll, Math.round(Math.max(scanStart + 10, mapBottom - vh * 0.2)));
  const positions = [];
  for (let i = 0; i < COARSE_N; i++) {
    positions.push(Math.round(scanStart + ((scanEnd - scanStart) * i) / (COARSE_N - 1)));
  }
  const probeArg = { els: locate.els.map(({ key, sel }) => ({ key, sel })), txt: locate.txt, watch: locate.watch };
  const samples = [];
  for (let i = 0; i < positions.length; i++) {
    const actual = await scrollTo(positions[i], COARSE_SETTLE_MS);
    const row = await page.evaluate(MAP_PROBE, probeArg);
    row.target = positions[i];
    row.actual = Math.round(actual * 10) / 10;
    samples.push(row);
    if (i % 5 === 0) console.log(`  probe ${i + 1}/${positions.length} @${row.y}`);
  }
  const composition = compositionAnalysis(samples, vh);

  // — change points → cluster baseline, then the SEMANTIC stage picks (measured cues) —
  const changes = detectChanges(samples, vh);
  const clusterPicked = pickStates(samples, changes, scanStart, scanEnd);
  const semantic = pickStatesSemantic(samples, vh, scanStart, scanEnd);
  const semanticResolved = semantic.stages.filter((s) => s.method.startsWith('semantic')).length;
  const useSemantic = semanticResolved >= 4;
  const picked = useSemantic
    ? { positions: semantic.positions, clusters: clusterPicked.clusters, stages: semantic.stages }
    : clusterPicked;
  console.log(`  changes: ${changes.length} (clusters ${clusterPicked.clusters.length}) · semantic stages ${semanticResolved}/6 → states [${picked.positions.join(', ')}]`);

  // — B. the states: PURE FORWARD. The coarse sweep ended at scanEnd; jump back to 0
  //  (records the reversed class state — itself evidence of direction sensitivity),
  //  then walk the 6 positions in ascending order so every state is entered the way a
  //  first-scroll user enters it. —
  await scrollTo(0, 1200);
  const resetState = await page.evaluate((w) => {
    const out = {};
    for (const e of w || []) {
      let el = null;
      try { el = document.querySelector(e.sel); } catch {}
      if (!el) { out[e.key] = null; continue; }
      const r = el.getBoundingClientRect();
      out[e.key] = { cls: (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean), w: Math.round(r.width), x: Math.round(r.x), y: Math.round(r.y) };
    }
    return out;
  }, locate.watch);
  console.log(`  reset-state (after reverse to 0): ${JSON.stringify(resetState)}`);

  const states = [];
  let prevSample = null;
  for (let i = 0; i < picked.positions.length && i < STAGE_SLUGS.length; i++) {
    const y = picked.positions[i];
    const actual = await scrollTo(y, STATE_SETTLE_MS);
    const sample = await page.evaluate(MAP_SAMPLE, locate.map.selector);
    const probe = await page.evaluate(MAP_PROBE, probeArg);
    const slug = STAGE_SLUGS[i];
    const shot = path.join(EV_DIR, `map-${bp.label}-${i + 1}-${slug}.jpg`);
    await page.screenshot({ path: shot, type: 'jpeg', quality: 70 });
    // cues for the narrative mapping (verified, not guessed)
    let maxOrangeA = 0;
    const cues = { visibleKeys: [], orangeAreaPct: null, cardKeys: [], headlineKeys: [], counterHashes: {}, layout: null, sticky: null };
    for (const [k, v] of Object.entries(probe.els)) {
      if (!v) continue;
      const on = v[4] > 0.05 && v[1] < vh && v[1] + v[3] > 0;
      if (!on) continue;
      cues.visibleKeys.push(k);
      if (/^card/.test(k)) cues.cardKeys.push(k);
      if (/^headline/.test(k)) cues.headlineKeys.push(k);
      if (/^orange/.test(k)) {
        // clamp the rect to the viewport first — SVG path getBoundingClientRect can
        // include stray control points (a 10^6-px box would poison the cue)
        const x0 = Math.max(0, v[0]), y0 = Math.max(0, v[1]);
        const x1 = Math.min(bp.w, v[0] + v[2]), y1 = Math.min(vh, v[1] + v[3]);
        if (x1 > x0 && y1 > y0) maxOrangeA = Math.max(maxOrangeA, ((x1 - x0) * (y1 - y0) * v[4]) / (bp.w * vh));
      }
    }
    cues.orangeAreaPct = maxOrangeA > 0 ? Math.round(maxOrangeA * 1000) / 10 : null;
    const ccVis = probe.els['content-col'];
    const planW = probe.els['plan-col'] ? probe.els['plan-col'][2] : null;
    cues.layout = (ccVis && ccVis[0] < bp.w - 100) || (planW != null && planW < bp.w * 0.75) ? 'expanded (plan narrowed + closing column)' : 'full-width plan';
    const sf = probe.els['sticky-frame'];
    cues.sticky = sf ? (sf[1] >= 0 && sf[1] < 30 ? 'engaged (stuck at top)' : (sf[1] < 0 ? 'released (riding up)' : 'approaching (natural flow)')) : null;
    for (const [k, v] of Object.entries(probe.txt)) if (v && /^(mtxt|headline|card)/.test(k)) cues.counterHashes[k] = v;
    states.push({
      n: i + 1, slug, stage: STAGE_SLUGS[i].replace(/^\d+-/, ''),
      method: (picked.stages && picked.stages[i] && picked.stages[i].method) || 'cluster change-point pick',
      cue: (picked.stages && picked.stages[i] && picked.stages[i].cue) || null,
      targetScrollTop: y, actualScrollTop: Math.round(actual * 10) / 10,
      screenshot: path.relative(ROOT, shot),
      watch: probe.watch || null,
      probe, cues,
      visible: (sample.nodes || []).filter((n) => n.o > 0.05).slice(0, 110),
      diffVsPrev: diffSamples(prevSample, sample),
    });
    prevSample = sample;
    console.log(`  state ${i + 1} ${slug} @${y} — vis:${cues.visibleKeys.length} cards:${cues.cardKeys.join('+') || '-'} heads:${cues.headlineKeys.join('+') || '-'} orange:${cues.orangeAreaPct}% layout:${cues.layout} sticky:${cues.sticky}`);
  }

  // — C (cont). asset detail AFTER the coarse pass (lazy images loaded) —
  await scrollTo(0, 600);
  const assets = await page.evaluate(MAP_ASSET_DETAIL, { sel: locate.map.selector, rootFs: locate.rootFontSize.px });

  // — D (cont). post-scroll trigger re-measure (drift check on the scrub pair). The
  // site creates/refreshes the map's scrub triggers on first scroll (pristine A
  // missed them: pre-refresh start/end read 0) — so B carries the AUTHORITATIVE
  // anim detail for the scrub pair; keep FULL records, not just start/end. —
  const triggersB = await page.evaluate(MAP_TRIGGERS, { wrapSel, winStart, winEnd, vh });
  const scrubAfter = (triggersB.triggers || []).filter((t) => t.scrub);

  // — Lenis observables —
  const lenis = await page.evaluate(LENIS_OBS);

  // — headline story (distinct texts + ranges) —
  const headlineKeys = locate.els.filter((e) => /^headline/.test(e.key)).map((e) => e.key);
  const heads = headlineStory(samples, vh, headlineKeys);

  // merge for the authoritative table: A rows, scrub rows REPLACED by B's
  // (same trigger+start+end identity ⇒ B has the post-refresh anim detail)
  const mergedTriggers = (triggersA.triggers || []).filter((t) => !t.scrub);
  for (const t of scrubAfter) {
    const dup = mergedTriggers.some((m) => m.trigger === t.trigger && m.start === t.start && m.end === t.end);
    if (!dup) mergedTriggers.push(t);
  }
  mergedTriggers.sort((a, b) => (a.measured.start || 0) - (b.measured.start || 0));
  const triggersFinal = { totalTriggers: triggersA.totalTriggers, matched: mergedTriggers.length, triggers: mergedTriggers, note: 'scrub rows re-measured post-scroll (pristine pass had stale 0 start/end for the map pair); toggle rows are the pristine pass' };

  // — assemble the per-bp JSON —
  const meta = {
    bp: bp.label, capturedAt: nowIso(), url: URL, httpStatus: status, uaUsed,
    viewport: locate.viewport, rootFontSize: locate.rootFontSize,
    docH: locate.docH, maxScroll: locate.maxScroll, scroller: locate.scroller,
    htmlClass: locate.htmlClass,
    cookieBanner: { before: cookieBefore, afterEscape: cookieAfter, accepted: false, escapeDismissed: cookieAfter.length < cookieBefore.length },
    loader: { autoDismissed: true, timeline: loaderTimeline.filter((s) => s.loaderCls) },
    mapSection: Object.assign({}, locate.map, { scrollWindow: locate.scrollWindow, wrap: locate.wrap }),
    facts: locate.facts,
    trackedEls: locate.els,
    watchedEls: locate.watch,
    loadState,
    resetState,
    statePickNote: 'states are picked SEMANTICALLY from the coarse-probe timeline (per-stage method recorded in each state) then captured PURE FORWARD from scroll 0 — the load/reset class states are recorded apart because the .expanded layout toggle is direction-sensitive (reverse-scrolling the scrub re-flips it)',
    probeNote: 'compositionProbe rows: [x, viewportY, w, h, opacity, translateY, scale] per tracked element; txt rows: [chars, 8-hex non-reversible fingerprint]; watch rows: {cls, w, x} per watched element',
    thNote: '"th" values are djb2 fingerprints of text content — used ONLY to detect/count distinct strings; content itself is never recorded',
  };
  const doc = {
    meta,
    census: locate.census,
    composition: Object.assign({}, composition, {
      verdictInputs: { stickyEls: locate.census.stickyEls, fixedEls: locate.census.fixedEls, absoluteEls: locate.census.absoluteEls },
    }),
    tree: walkData.tree,
    media: walkData.media,
    ladder: walkData.ladder,
    spacing: walkData.spacing,
    colors: walkData.colors,
    grids: walkData.grids,
    assets,
    headlineStory: heads,
    compositionProbe: { positions: samples.map((s) => s.y), els: samples[0] ? Object.keys(samples[0].els) : [], rows: samples },
    states,
    triggers: triggersFinal,
    triggersPristine: triggersA,
    triggersAfterScroll: { scrub: scrubAfter },
    lenis,
  };
  writeJson(path.join(OUT_DIR, `map-${bp.label}.json`), doc);

  // — merge map-scroll-spec.json —
  const specFile = path.join(OUT_DIR, 'map-scroll-spec.json');
  let spec = {
    meta: {
      url: URL, package: '3-a (heron-map, cycle C3)', generatedAt: nowIso(),
      note: 'merged across breakpoints; scroller is .main-inner (Lenis wrapper) — the window does not scroll. Map ScrollTrigger table with tween vars, keyframe offsets and sampled eases.',
    },
    bps: {},
  };
  if (fs.existsSync(specFile)) { try { spec = JSON.parse(fs.readFileSync(specFile, 'utf8')); } catch {} }
  spec.bps[bp.label] = {
    capturedAt: nowIso(),
    viewport: locate.viewport, rootFontSize: locate.rootFontSize,
    docH: locate.docH, maxScroll: locate.maxScroll,
    map: { top: mapTop, height: mapH, bottom: mapBottom, width: locate.map.width, cls: locate.map.cls },
    wrap: locate.wrap,
    scrollWindow: locate.scrollWindow,
    census: { counts: locate.census.counts, sticky: locate.census.stickyEls.length, fixed: locate.census.fixedEls.length },
    loadState,
    resetState,
    statePicks: (picked.stages || []).map((s) => ({ n: s.n, y: s.y, method: s.method })),
    triggers: triggersFinal,
    triggersPristineCount: triggersA.matched,
    triggersAfterScrollScrub: scrubAfter,
    lenis,
  };
  fs.writeFileSync(specFile, JSON.stringify(spec));
  console.log(`  wrote ${path.relative(ROOT, specFile)}`);

  await context.close();
  console.log(`✔ ${bp.label} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return { bp: bp.label, ok: true, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────
const chromium = await loadChromium();
const browser = await chromium.launch();
const results = [];
for (const bp of BPS) {
  try {
    results.push(await runBreakpoint(browser, bp));
  } catch (e) {
    console.error(`✖ ${bp.label} FAILED:`, (e && e.stack) || e);
    results.push({ bp: bp.label, ok: false, error: String((e && e.message) || e) });
  }
  if (BPS.length > 1) await sleep(15000); // politeness gap between breakpoints
}
await browser.close();
console.log('\nRUN SUMMARY');
for (const r of results) console.log(`  ${r.bp}: ${r.ok ? 'OK' : 'FAILED — ' + (r.error || r.status)}`);
