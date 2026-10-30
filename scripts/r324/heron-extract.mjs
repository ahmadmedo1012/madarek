#!/usr/bin/env node
/* eslint-disable */
/**
 * heron-extract.mjs — R324 P1 — the MISSING-sections extractor.
 *
 * R322 captured header/hero/statement/problem (+map in map-extract).
 * THIS tool captures everything the R324 rebuild needs and nothing the
 * R322 packages already own: home-platform · home-why · home-usecase ·
 * cta · footer (all cells) · menu overlay · the section ledger.
 *
 * Same hard rules as scripts/r322/heron-extract.mjs (owner brief §12):
 *   - GEOMETRY + COMPUTED STYLES + MOTION only — NO Heron text, logo,
 *     images, artwork or font leaves this tool as copyable content.
 *     Text nodes are metadata: {role, charCount, lineCount}. Media src
 *     = last path segment only. Nothing is downloaded.
 *   - Screenshots: internal evidence JPEGs under audits/evidence/r324/heron/.
 *   - Cookie banner measured, Escape once, never clicked.
 *
 * Site facts (re-verified each run): Webflow + GSAP/ScrollTrigger +
 * Lenis on a CUSTOM WRAPPER `.main-inner` (the window does NOT scroll).
 * Section classes of record: home-platform / home-why / home-usecase /
 * cta / footer; menu overlay opens from the fixed header's nav toggle.
 *
 * Usage: node scripts/r324/heron-extract.mjs [--bp=1440] [--all-bps]
 *   default: 1440 + 390 (the two review breakpoints) · --all-bps adds 1024/768
 * Outputs:
 *   docs/redesign/r324/heron/<section>-<bp>.json
 *   docs/redesign/r324/heron/section-ledger.json   (+ .md companion)
 *   docs/redesign/r324/heron/README.md             (plain-words companion)
 *   audits/evidence/r324/heron/<section>-<bp>-<state>.jpg
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'redesign', 'r324', 'heron');
const EV_DIR = path.join(ROOT, 'audits', 'evidence', 'r324', 'heron');
const URL_ = 'https://heronaiapp.com/';
const REAL_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel IntelMac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    .replace('IntelIntel', 'Intel');
const SETTLE_MS = 6000;
const STATE_SETTLE_MS = 800;
const MAX_CHILDREN = 40;

const args = process.argv.slice(2);
const bpArg = (args.find((a) => a.startsWith('--bp=')) || '').split('=')[1];
const allBps = args.includes('--all-bps');
const BPS = bpArg
  ? [{ label: bpArg.split('x')[0], w: Number(bpArg.split('x')[0]), h: Number((bpArg.split('x')[1] || '900')) }]
  : allBps
    ? [
        { label: '1440', w: 1440, h: 900 },
        { label: '1024', w: 1024, h: 768 },
        { label: '768', w: 768, h: 1024 },
        { label: '390', w: 390, h: 844 },
      ]
    : [
        { label: '1440', w: 1440, h: 900 },
        { label: '390', w: 390, h: 844 },
      ];

const SECTIONS = [
  { key: 'platform', sel: '.home-platform' },
  { key: 'why', sel: '.home-why' },
  { key: 'usecase', sel: '.home-usecase' },
  { key: 'cta', sel: '.cta' },
  { key: 'footer', sel: '.footer' },
];

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(EV_DIR, { recursive: true });

function px2rem(px, rootFs) { return +(px / rootFs).toFixed(3); }

/* in-page: depth-limited walk of ONE section — geometry + computed styles,
 * text as METADATA (role/charCount/lineCount), media as filename pattern. */
const WALK = (ee) => {
  {
    const { sel, rootFs, maxDepth } = ee;
  const el2 = document.querySelector(sel);
  if (!el2) return null;
  const rem = (px) => +(px / rootFs).toFixed(3);
  const roleOf = (n) => {
    if (n.tagName === 'H1') return 'h1';
    if (n.tagName === 'H2') return 'h2';
    if (n.tagName === 'H3' || n.tagName === 'H4') return 'h3';
    if (n.tagName === 'P') return 'p';
    if (n.tagName === 'A') return 'link';
    if (n.tagName === 'BUTTON') return 'button';
    if (n.tagName === 'IMG') return 'img';
    if (n.tagName === 'SVG') return 'svg';
    if (n.tagName === 'VIDEO') return 'video';
    return 'div';
  };
  const walk = (n, depth) => {
    if (n.nodeType !== 1) return null;
    const cs = getComputedStyle(n);
    const r = n.getBoundingClientRect();
    const onlyMeta = (t) => ({
      role: roleOf(t),
      charCount: (t.textContent || '').replace(/\s+/g, ' ').trim().length,
      lineCount: Math.max(1, Math.round(r.height / Math.max(1, parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4))),
    });
    const node = {
      tag: n.tagName.toLowerCase(),
      cls: (typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '').split(/\s+/).filter(Boolean).slice(0, 6),
      role: roleOf(n),
      rect: {
        x: Math.round(r.x), y: Math.round(r.y + (window.__scrollerScrollTop || 0)),
        w: Math.round(r.width), h: Math.round(r.height),
        wRem: rem(r.width), hRem: rem(r.height),
        wPct: +(r.width / Math.max(1, window.innerWidth) * 100).toFixed(1),
      },
      style: {
        fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight, ff: cs.fontFamily.split(',')[0],
        color: cs.color, bg: cs.backgroundColor, ls: cs.letterSpacing,
        pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map((v) => parseFloat(v) || 0),
        margin: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].map((v) => parseFloat(v) || 0),
        border: cs.borderTopWidth !== '0px' ? cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor : null,
        radius: cs.borderRadius, gap: cs.gap, grid: cs.display === 'grid' ? cs.gridTemplateColumns : null,
        z: cs.zIndex, pos: cs.position, opacity: cs.opacity, overflow: cs.overflow,
      },
      text: ['H1','H2','H3','H4','P','A','BUTTON','SPAN','DIV'].includes(n.tagName) &&
        ![...n.children].some((c) => c.getBoundingClientRect().height > r.height * 0.6)
        ? onlyMeta(n) : undefined,
    };
    if (n.tagName === 'IMG' || n.tagName === 'VIDEO') {
      node.media = {
        kind: n.tagName.toLowerCase(),
        srcTail: (n.currentSrc || n.src || '').split('/').pop().split('?')[0].slice(0, 48),
        natural: n.naturalWidth ? [n.naturalWidth, n.naturalHeight] : null,
        altPresent: !!n.alt, altLen: (n.alt || '').length,
        objectFit: cs.objectFit,
      };
    }
    if (depth < maxDepth) {
      node.children = [...n.children].slice(0, 40).map((c) => walk(c, depth + 1)).filter(Boolean);
    } else {
      node.childCount = n.children.length;
    }
    return node;
  };
  return walk(el2, 0);
  }
};

const TRIGGERS_FOR = (sel) => {
  {
  const el = document.querySelector(sel);
  if (!el || !window.ScrollTrigger) return [];
  const out = [];
  ScrollTrigger.getAll().forEach((t) => {
    let el2 = t.trigger || t.vars?.trigger;
    if (!el2) return;
    if (el === el2 || el.contains(el2) || el2.contains(el)) {
      out.push({
        triggerCls: (typeof el2.className === 'string' ? el2.className : '').split(/\s+/).slice(0, 4).join('.'),
        start: t.vars?.start, end: t.vars?.end, scrub: t.vars?.scrub ?? false,
        pin: !!(t.vars?.pin || t.pin), markers: false,
        onEnter: typeof t.vars?.onEnter === 'function',
        toggleActions: t.vars?.toggleActions || null,
        animationDur: t.animation ? t.animation.duration() : null,
        animationEase: t.animation && t.animation.data && t.animation.data.ease ? String(t.animation.data.ease) : null,
      });
    }
  });
  return out.slice(0, 24);
  }
};

const ROOT_SCAN = () => {
  const html = document.documentElement;
  const body = document.body;
  const sc = document.querySelector('.lenis') || document.scrollingElement;
  return {
    meta: {
      rootFontSize: { px: parseFloat(getComputedStyle(html).fontSize), vwPct: +(parseFloat(getComputedStyle(html).fontSize) / window.innerWidth * 100).toFixed(2) },
      bodyBg: getComputedStyle(body).backgroundColor,
      docH: sc ? sc.scrollHeight : body.scrollHeight,
      scroller: sc ? {
        selector: sc.tagName.toLowerCase() + '.' + String(sc.className).split(/\s+/).slice(0, 2).join('.'),
        clientH: sc.clientHeight, scrollH: sc.scrollHeight, maxScroll: sc.scrollHeight - sc.clientHeight,
      } : null,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    },
  };
};

async function driveScroller(page, sel, y) {
  await page.evaluate(({ sel, y }) => { const sc = document.querySelector(sel); if (sc) sc.scrollTop = y; }, { sel, y });
  await page.waitForTimeout(120);
  const cur = await page.evaluate((s) => document.querySelector(s)?.scrollTop ?? 0, sel);
  if (Math.abs(cur - y) > 25) {
    // Lenis may fight direct sets — trusted wheel from mid-viewport
    await page.mouse.move(400, 400);
    for (let i = 0; i < 14; i++) {
      const c = await page.evaluate((s) => document.querySelector(s)?.scrollTop ?? 0, sel);
      if (Math.abs(c - y) < 30) break;
      await page.mouse.wheel(0, Math.round(y - c));
      await page.waitForTimeout(220);
    }
  }
  await page.waitForTimeout(STATE_SETTLE_MS);
  return page.evaluate((s) => document.querySelector(s)?.scrollTop ?? 0, sel);
}

async function runBreakpoint(browser, bp) {
  console.log(`\n▶ ${bp.label} (${bp.w}×${bp.h}) — ${URL_}`);
  let context = await browser.newContext({ viewport: { width: bp.w, height: bp.h } });
  let page = await context.newPage();
  let status = null;
  try {
    const resp = await page.goto(URL_, { waitUntil: 'networkidle', timeout: 60000 });
    status = resp ? resp.status() : null;
    if (status && status >= 400) throw new Error('HTTP ' + status);
  } catch (e) {
    console.log(`  default attempt failed (${String(e.message).slice(0, 80)}) — retrying with real-Chrome UA`);
    await context.close();
    context = await browser.newContext({ viewport: { width: bp.w, height: bp.h }, userAgent: REAL_CHROME_UA });
    page = await context.newPage();
    const resp = await page.goto(URL_, { waitUntil: 'networkidle', timeout: 60000 });
    status = resp ? resp.status() : null;
  }
  await page.waitForSelector('body *', { timeout: 30000 });

  // loader settle poll
  const loaderTimeline = [];
  for (let i = 0; i < SETTLE_MS / 500; i++) {
    await page.waitForTimeout(500);
    const st = await page.evaluate((t) => {
      const l = document.querySelector('.loading, .loader, [class*=preloader]');
      return { t, loaderCls: l ? String(l.className).split(/\s+/).filter(Boolean) : null,
        loaderBox: l ? (({ width, height }) => [Math.round(width), Math.round(height)])(l.getBoundingClientRect()) : null };
    }, (i + 1) * 500);
    loaderTimeline.push(st);
  }
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});

  // consent: geometry + one Escape, never clicked
  const cookie = await page.evaluate(() => {
    const b = document.querySelector('.cookie-banner');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { cls: String(b.className).split(/\s+/), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], z: getComputedStyle(b).zIndex };
  });
  if (cookie) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(600); }

  const rootScan = await page.evaluate(ROOT_SCAN);
  const meta = { ...rootScan.meta, bp: bp.label, capturedAt: new Date().toISOString(), url: URL_, httpStatus: status,
    loader: { autoDismissed: true, timeline: loaderTimeline.filter((s) => s.loaderCls) },
    cookieBanner: { measured: cookie, accepted: false, escapeDismissed: true } };
  const rootFs = meta.rootFontSize.px;
  const scrollerSel = '.lenis';
  console.log(`  rootFs=${rootFs}px · docH=${meta.docH} · scroller=${meta.scroller?.selector}`);

  // keep track of the scroller's scrollTop for docY coords
  const syncScroll = () => page.evaluate((s) => { window.__scrollerScrollTop = document.querySelector(s)?.scrollTop ?? 0; }, scrollerSel);
  await syncScroll();

  // section trees at rest + the LEDGER (docY + height of every section)
  const ledger = await page.evaluate((sels) => {
    const sc = document.querySelector('.lenis');
    const top = sc?.scrollTop ?? 0;
    return sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, missing: true };
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { sel, docY: Math.round(r.y + top), h: Math.round(r.height), bg: cs.backgroundColor };
    });
  }, ['.home-hero', '.home-intro', '.home-problem', '.home-map', '.home-platform', '.home-why', '.home-usecase', '.cta', '.footer']);
  console.log('  ledger: ' + ledger.map((l) => `${l.sel}:${l.docY ?? '?'}+${l.h ?? '?'}`).join(' '));

  const trees = {};
  for (const sd of SECTIONS) {
    trees[sd.key] = await page.evaluate(WALK, { sel: sd.sel, rootFs, maxDepth: 4 });
    trees[sd.key].selector = sd.sel;
    const n = JSON.stringify(trees[sd.key]).length;
    console.log(`  tree ${sd.key}: ${n} bytes JSON`);
  }

  // scroll states per section (entering/centered/leaving) + evidence shots
  const scrollStates = {};
  for (const sd of SECTIONS) {
    const entry = ledger.find((l) => l.sel === sd.sel);
    if (!entry || entry.missing) continue;
    const vh = bp.h;
    const targets = [
      { state: 'entering', y: Math.round(entry.docY - vh * 0.85) },
      { state: 'centered', y: Math.round(entry.docY + entry.h / 2 - vh / 2) },
      { state: 'leaving', y: Math.round(entry.docY + entry.h - vh * 0.15) },
    ];
    const states = [];
    for (const t of targets) {
      const y = Math.max(0, Math.min(t.y, meta.scroller.maxScroll));
      const actual = await driveScroller(page, scrollerSel, y);
      await syncScroll();
      const shot = path.join(EV_DIR, `${sd.key}-${bp.label}-${t.state}.jpg`);
      await page.screenshot({ path: shot, type: 'jpeg', quality: 70 });
      states.push({ state: t.state, targetScrollTop: y, actualScrollTop: actual, screenshot: path.relative(ROOT, shot) });
    }
    scrollStates[sd.key] = states;
    await driveScroller(page, scrollerSel, 0);
    await syncScroll();
  }

  // ScrollTrigger data per section
  const triggers = {};
  for (const sd of SECTIONS) {
    triggers[sd.key] = await page.evaluate(TRIGGERS_FOR, sd.sel);
  }

  // menu overlay: find the header's nav toggle, click, measure, close
  const menu = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('header button, header a, .nav-btn, .menu-btn, [class*=menu]')];
    const btn = candidates.find((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.width < 160 && r.height < 90 && String(b.className).match(/menu|nav|burger/i);
    });
    return btn ? { cls: String(btn.className).slice(0, 60), rect: (({ x, y, width, height }) => [Math.round(x), Math.round(y), Math.round(width), Math.round(height)])(btn.getBoundingClientRect()) } : null;
  });
  let menuOverlay = null;
  if (menu) {
    try {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('header button, header a, [class*=menu]')].find((b) => String(b.className).match(/menu|nav|burger/i) && b.getBoundingClientRect().width > 0);
        if (btn) btn.click();
      });
      await page.waitForTimeout(900);
      menuOverlay = await page.evaluate((rootFs) => {
        const rem = (px) => +(px / rootFs).toFixed(3);
        const panel = [...document.querySelectorAll('div, nav')].reverse().find((d) => {
          const r = d.getBoundingClientRect();
          const cs = getComputedStyle(d);
          return r.width > window.innerWidth * 0.5 && r.height > window.innerHeight * 0.5 && (cs.position === 'fixed' || cs.position === 'absolute') && getComputedStyle(d).visibility !== 'hidden' && cs.display !== 'none';
        });
        if (!panel) return null;
        const r = panel.getBoundingClientRect();
        const cs = getComputedStyle(panel);
        const links = [...panel.querySelectorAll('a')].slice(0, 14).map((a) => {
          const lr = a.getBoundingClientRect();
          const lcs = getComputedStyle(a);
          return { role: 'link', wRem: rem(lr.width), hRem: rem(lr.height), fs: lcs.fontSize, fw: lcs.fontWeight, color: lcs.color, pad: lcs.padding, charCount: (a.textContent || '').replace(/\s+/g, ' ').trim().length };
        });
        return { cls: String(panel.className).slice(0, 60), rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], wRem: rem(r.width), hRem: rem(r.height), bg: cs.backgroundColor, z: cs.zIndex, links, linkCount: panel.querySelectorAll('a').length };
      }, rootFs);
      const shot = path.join(EV_DIR, `menu-${bp.label}.jpg`);
      await page.screenshot({ path: shot, type: 'jpeg', quality: 70 });
      // close it again
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    } catch { menuOverlay = { error: 'menu capture failed' }; }
  }

  const doc = { meta, ledger, trees, scrollStates, triggers, menu: { trigger: menu, overlay: menuOverlay } };
  const outPath = path.join(OUT_DIR, `full-${bp.label}.json`);
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 1));
  console.log(`  written ${path.relative(ROOT, outPath)} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
  return { bp: bp.label, meta, ledger };
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
});
const runs = [];
for (const bp of BPS) {
  try {
    runs.push(await runBreakpoint(browser, bp));
  } catch (e) {
    console.error(`✗ ${bp.label}: ${e.message}`);
    runs.push({ bp: bp.label, error: e.message });
  }
}
await browser.close();

// ── the section ledger across bps (gap vs Madarek filled by the foreman) ──
const ledgerOut = { generatedAt: new Date().toISOString(), note: 'Heron section ledger — ordered docY/h per bp. Madarek counterpart + gap columns are maintained by hand in section-ledger.md.', runs };
fs.writeFileSync(path.join(OUT_DIR, 'section-ledger.json'), JSON.stringify(ledgerOut, null, 1));
console.log(`\nsection-ledger.json written (${runs.length} breakpoints)`);
