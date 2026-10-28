#!/usr/bin/env node
/* eslint-disable */
/**
 * heron-header-media.mjs — R322 package 1-c SUPPLEMENT (continuation agent).
 *
 * WHY THIS EXISTS (gaps found while verifying the main extraction):
 *   1. heron-extract.mjs's walk() skips <img>/<svg>/<canvas>/<video> CHILDREN
 *      (they are "media"), but its media-inventory branch only fires when walk()
 *      is called on the element — and for SVG the tagName check is case-broken
 *      ('svg' vs 'SVG'). Net effect: <svg> nodes are in the tree (geometry ok)
 *      but NOT in `media`; <img> elements are in NEITHER. The artwork behind
 *      .ink-mask-img / .home-problem-item-img-inner is <img>-based and was
 *      therefore missing from the asset inventory. This script re-inventories
 *      every img/svg/canvas/video inside the 4 picked sections per breakpoint.
 *   2. The header has NO scroll-state evidence shots (the main run only shot
 *      hero/statement/problem). This script captures header viewport shots at
 *      the states where the class machine flips: 0 / on-scroll / on-hide.
 *
 * Same hard rules as the main extractor: text is NEVER recorded (alt only as
 * presence+chars); media src only as last path segment; internal evidence
 * shots only, JPEG q70, under audits/evidence/r322/heron/.
 *
 * USAGE: node scripts/r322/heron-header-media.mjs [--bp=1440|768|390|1440x900|…]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const URL = 'https://heronaiapp.com/';
const OUT = path.join(ROOT, 'docs', 'redesign', 'r322', 'heron', 'media-inventory.json');
const EV_DIR = path.join(ROOT, 'audits', 'evidence', 'r322', 'heron');

const SETTLE_MS = 6000;
const args = process.argv.slice(2);
const bpArg = args.find((a) => a.startsWith('--bp='));
const ALL = [
  { label: '1440', w: 1440, h: 900 },
  { label: '768', w: 768, h: 1024 },
  { label: '390', w: 390, h: 844 },
];
const BPS = bpArg ? ALL.filter((b) => `${b.w}x${b.h}` === bpArg.slice(5) || b.label === bpArg.slice(5)) : ALL;

fs.mkdirSync(EV_DIR, { recursive: true });

const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);

/** Inventory of media elements inside a section root. Serialized into the page. */
const MEDIA_IN_SECTION = (arg) => {
  const { sel, rootFs } = arg || {};
  const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v);
  const root = document.querySelector(sel);
  if (!root) return { error: 'selector not found: ' + sel };
  const out = [];
  const seen = new Set();
  for (const el of root.querySelectorAll('img, svg, canvas, video, iframe, picture, source')) {
    if (seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const m = {
      tag: el.tagName.toLowerCase(),
      p: (() => { // index path inside the section, for cross-referencing the tree JSON
        const parts = [];
        let n = el;
        while (n && n !== root && n.parentElement) {
          parts.unshift([...n.parentElement.children].indexOf(n));
          n = n.parentElement;
        }
        return parts.join('/');
      })(),
      cls: (typeof el.className === 'string' && el.className ? el.className.split(/\s+/).slice(0, 4).join('.') : null),
      rendered: [r2(r.width), r2(r.height)],
      renderedRem: [r2(r.width / rootFs), r2(r.height / rootFs)],
      hidden: r.width < 1 && r.height < 1,
    };
    if (el.tagName === 'IMG') {
      m.intrinsic = [el.naturalWidth, el.naturalHeight];
      m.alt = el.alt != null && el.alt.length ? { present: true, chars: el.alt.trim().length } : { present: false, chars: 0 };
      if (el.getAttribute('src')) m.srcFile = el.getAttribute('src').split('?')[0].split('/').pop().slice(0, 60);
      const ss = el.getAttribute('srcset');
      if (ss) m.srcsetWidths = ss.split(',').map((x) => (x.trim().match(/(\d+)w/) || [])[1]).filter(Boolean).map(Number);
      if (el.getAttribute('loading')) m.loading = el.getAttribute('loading');
      if (s.objectFit && s.objectFit !== 'fill') m.objectFit = s.objectFit;
    } else if (el.tagName.toLowerCase() === 'svg') {
      const vb = el.getAttribute('viewBox');
      if (vb) m.viewBox = vb.split(/\s+/).map(Number);
      m.childCount = el.children.length;
      if (el.getAttribute('aria-hidden') === 'true') m.ariaHidden = true;
    } else if (el.tagName === 'CANVAS') {
      m.intrinsic = [el.width, el.height];
    } else if (el.tagName === 'VIDEO') {
      m.intrinsic = [el.videoWidth, el.videoHeight];
      m.duration = r2(el.duration);
      m.muted = el.muted; m.loop = el.loop; m.autoplay = el.autoplay; m.playsInline = el.playsInline;
      if (el.getAttribute('poster')) m.posterFile = el.getAttribute('poster').split('/').pop().slice(0, 60);
    }
    // role guess by rendered share of the section box
    const area = (r.width * r.height) / Math.max(1, root.getBoundingClientRect().width * root.getBoundingClientRect().height);
    m.role = m.hidden ? 'hidden' : area > 0.15 ? 'illustration' : r.width < 40 ? 'icon' : 'figure';
    out.push(m);
  }
  return { count: out.length, items: out };
};

async function runBp(browser, bp) {
  console.log(`\n▶ ${bp.label} (${bp.w}×${bp.h})`);
  const context = await browser.newContext({ viewport: { width: bp.w, height: bp.h } });
  const page = await context.newPage();
  const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  if (!resp || resp.status() >= 400) throw new Error('HTTP ' + (resp && resp.status()));
  await page.waitForSelector('body *', { timeout: 30000 });
  await page.waitForTimeout(SETTLE_MS); // loader auto-dismisses ~5.5–6s
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});

  // same section picking as the main extractor (known classes win)
  const picks = await page.evaluate(() => {
    const sc = document.querySelector('.lenis') || document.scrollingElement;
    const secs = [...sc.querySelectorAll('section')].filter((el) => el.getBoundingClientRect().height > 50);
    const find = (n) => secs.find((el) => typeof el.className === 'string' && el.className.split(/\s+/).includes(n)) || null;
    const uniqueSel = (el) => {
      if (!el) return null;
      const parts = [];
      let n = el;
      while (n && n !== document.body && n !== sc && n !== document.documentElement) {
        parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${[...n.parentElement.children].indexOf(n) + 1})`);
        n = n.parentElement;
      }
      return (n === sc ? '.lenis>' : 'body>') + parts.join('>');
    };
    return {
      header: document.querySelector('header.header') ? 'header.header' : null,
      hero: uniqueSel(find('home-hero')),
      statement: uniqueSel(find('home-intro')),
      problem: uniqueSel(find('home-problem')),
      scroller: sc.classList.contains('lenis') ? '.lenis' : 'html',
    };
  });
  const rootFs = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));

  // — media inventory per section —
  const inv = { capturedAt: new Date().toISOString(), rootFontSize: rootFs, sections: {} };
  for (const key of ['header', 'hero', 'statement', 'problem']) {
    if (!picks[key]) continue;
    inv.sections[key] = await page.evaluate(MEDIA_IN_SECTION, { sel: picks[key], rootFs });
    console.log(`  media ${key}: ${inv.sections[key].count} elements`);
  }

  // — header state shots —
  const scSel = picks.scroller;
  const setScroll = (y) => page.evaluate(({ sel, y }) => { const sc = document.querySelector(sel); if (sc) sc.scrollTop = y; }, { sel: scSel, y });
  const headerState = async (y, tag) => {
    await setScroll(y);
    await page.waitForTimeout(700); // class machine + CSS transition settle
    const cls = await page.evaluate(() => {
      const h = document.querySelector('header.header');
      const s = getComputedStyle(h);
      const r = h.getBoundingClientRect();
      return { cls: (typeof h.className === 'string' ? h.className : '').split(/\s+/).filter(Boolean),
        rect: [r2x(r.x), r2x(r.y), r2x(r.width), r2x(r.height)],
        tr: s.transform === 'none' ? null : s.transform.slice(0, 60), o: s.opacity,
        // child probes: what visually changes with the class (menu/cta/logo boxes)
        kids: [...h.querySelectorAll('.header-menu-wrap, .header-logo, .header-cta-new, .header-inner')].map((el) => {
          const rr = el.getBoundingClientRect(); const ss = getComputedStyle(el);
          return { cls: (typeof el.className === 'string' ? el.className : '').split(/\s+/).slice(0, 2).join('.'),
            rect: [r2x(rr.x), r2x(rr.y), r2x(rr.width), r2x(rr.height)],
            tr: ss.transform === 'none' ? null : ss.transform.slice(0, 48), o: ss.opacity };
        }) };
      function r2x(v) { return Math.round(v * 100) / 100; }
    });
    const shot = path.join(EV_DIR, `header-${bp.label}-${tag}.jpg`);
    await page.screenshot({ path: shot, type: 'jpeg', quality: 70 });
    console.log(`  header ${tag} @${y} cls=${cls.cls.join('.') || '(none)'}`);
    return { state: tag, scrollTop: y, ...cls, screenshot: path.relative(ROOT, shot) };
  };
  const states = [];
  states.push(await headerState(0, 'top'));
  states.push(await headerState(300, 'scrolled-down'));       // on-scroll (down)
  states.push(await headerState(600, 'hidden-down'));          // on-hide @1440 (down)
  states.push(await headerState(300, 'back-up'));              // scrolled again (up)

  await context.close();
  return { bp: bp.label, rootFs, media: inv, headerStates: states };
}

const browser = await chromium.launch();
let doc = { meta: { url: URL, package: '1-c supplement', generatedAt: new Date().toISOString(),
  note: 'img/svg/canvas/video inventory per section (fills the walk-skip gap) + header scroll-class state evidence; text-free by construction' }, bps: {} };
if (fs.existsSync(OUT)) { try { doc = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {} }
for (const bp of BPS) {
  try {
    const r = await runBp(browser, bp);
    doc.bps[bp.label] = r;
    fs.writeFileSync(OUT, JSON.stringify(doc));
    console.log(`✔ ${bp.label} done`);
  } catch (e) {
    console.error(`✖ ${bp.label} FAILED:`, (e && e.message) || e);
  }
  await new Promise((res) => setTimeout(res, 15000)); // politeness gap
}
await browser.close();
console.log('wrote', path.relative(ROOT, OUT));
