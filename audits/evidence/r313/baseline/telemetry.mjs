#!/usr/bin/env node
/**
 * R313 baseline telemetry — landing CTA (default+hover) + header states at
 * TRUE top/scrolled/down/up (the census headerStates ran after the wheel
 * probe, so every read was already "scrolled" — this re-measures cleanly).
 * Public pages only — no auth.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname);
const URL_ = 'https://madarek.onrender.com/';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PROPS = ['font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','background-image','border-top-width','border-top-style','border-top-color','border-bottom-width','border-bottom-color','border-radius','box-shadow','padding-top','padding-right','padding-bottom','padding-left','width','height','transition','transform','text-transform','gap'];

async function readStyles(page, sel, pseudo = null) {
  return page.evaluate(({ sel, PROPS, pseudo }) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el, pseudo || undefined);
    const o = { selector: sel, tag: el.tagName.toLowerCase(), className: String(el.className), text: (el.textContent || '').trim().slice(0, 60) };
    const st = {};
    PROPS.forEach(p => st[p] = pseudo ? cs.getPropertyValue(p) : cs.getPropertyValue(p));
    o.styles = st;
    const r = el.getBoundingClientRect();
    o.rect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    return o;
  }, { sel, PROPS, pseudo });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // skip the session-gated intro loader — we are measuring steady-state chrome
  await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-seen', '1'); } catch (_) {} });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch (_) {}
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await sleep(3000);

  const result = { capturedAt: new Date().toISOString(), url: URL_ };

  /* ── 1. The landing primary CTA: a.btn.accent.lg.fo-hero-cta ── */
  const ctaSel = 'a.fo-hero-cta';
  const ctaDefault = await readStyles(page, ctaSel);
  // ::before layer (the accent fill)
  const ctaBefore = await readStyles(page, ctaSel, '::before');
  await page.hover(ctaSel);
  await sleep(700); // hover transition (--t-base 200ms + settle)
  const ctaHover = await readStyles(page, ctaSel);
  const ctaHoverBefore = await readStyles(page, ctaSel, '::before');
  result.buttons = [{
    name: 'landing-primary-cta',
    selector: ctaSel,
    text: ctaDefault?.text,
    default: ctaDefault, defaultBefore: ctaBefore,
    hover: ctaHover, hoverBefore: ctaHoverBefore,
  }];

  /* ── 2. Header at TRUE top (no prior scroll) ── */
  const readHeader = () => page.evaluate(() => {
    const h = document.querySelector('header');
    if (!h) return null;
    const cs = getComputedStyle(h);
    const inner = h.querySelector('.fo-header-inner');
    const r = h.getBoundingClientRect();
    return {
      cls: String(h.className),
      height: Math.round(r.height),
      innerHeight: inner ? Math.round(inner.getBoundingClientRect().height) : null,
      y: Math.round(r.y),
      transform: cs.transform,
      opacity: cs.opacity,
      position: cs.position,
      background: cs.backgroundColor,
      borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
      transition: cs.transition,
    };
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(900);
  const atTop = await readHeader();
  // scroll DOWN (should add .scrolled; check any hide class)
  await page.evaluate(() => window.scrollTo(0, 1200));
  await sleep(1000);
  const scrolledDown1 = await readHeader();
  await page.evaluate(() => window.scrollTo(0, 4000));
  await sleep(1000);
  const scrolledDown2 = await readHeader();
  // scroll UP (hide/show behaviour check)
  await page.evaluate(() => window.scrollTo(0, 1000));
  await sleep(1000);
  const scrolledUp = await readHeader();
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1000);
  const backToTop = await readHeader();
  result.headerStates = { atTop, scrolledDown1, scrolledDown2, scrolledUp, backToTop };

  /* ── 3. quick confirmations for NOTES ── */
  result.confirmations = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      htmlFontSize: getComputedStyle(root).fontSize,
      scrollBehavior: getComputedStyle(root).scrollBehavior,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      themeColorMeta: document.querySelector('meta[name="theme-color"]')?.content || null,
      introSeenSession: sessionStorage.getItem('madarek-intro-seen'),
      sheetCursorCanvas: !!document.querySelector('.sc-canvas'),
      cursorLayerCount: document.querySelectorAll('.cursor-layer').length,
      lenisEls: document.querySelectorAll('[class*="lenis"]').length,
      fontFaces: [...document.fonts].map(f => `${f.family} ${f.weight} ${f.style}`),
    };
  });

  fs.writeFileSync(path.join(OUT, 'telemetry.json'), JSON.stringify(result, null, 1));
  console.log('[telemetry] CTA:', result.buttons[0].text);
  console.log('[telemetry] header@top:', JSON.stringify(atTop));
  console.log('[telemetry] header@down1200:', JSON.stringify(scrolledDown1));
  console.log('[telemetry] header@up:', JSON.stringify(scrolledUp));
  await browser.close();
})().catch(e => { console.error('[telemetry] FATAL', e); process.exit(1); });
