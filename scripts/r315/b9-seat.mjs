#!/usr/bin/env node
/**
 * R315 B9 — footer seat probe: the measured column system of the page's
 * bands (header / hero / sections / footer) at a viewport, so the footer
 * rides the same sheet measure as the rest of the drawing (the judge's
 * footer roles are pinned to Heron's 1426.69-wide frame measure).
 *
 * Usage: node scripts/r315/b9-seat.mjs --viewport 1440x900
 */
import { chromium } from 'playwright-core';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const args = process.argv.slice(2);
const [w, h] = (args[0] ?? '1440x900').split('x').map(Number);

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ar-LY' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(
  () => document.querySelector('.landing')?.classList.contains('intro-done') && !document.querySelector('.sl'),
  { timeout: 20000 },
);
await page.evaluate(() => { const f = document.querySelector('.fo-footer'); if (f) f.scrollIntoView(); });
await page.waitForTimeout(900);

const out = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      sel, x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height),
      padInline: cs.paddingInlineStart + '/' + cs.paddingInlineEnd,
    };
  };
  return {
    vw: window.innerWidth,
    header: pick('.fo-header-inner'),
    hero: pick('.fo-hero-inner') ?? pick('.fo-hero'),
    statement: pick('.st-section'),
    cta: pick('.fo-cta-inner') ?? pick('.fo-cta'),
    footer: pick('.fo-footer'),
    footerInner: pick('.fo-footer-inner'),
    grid: pick('.fo-fgrid'),
    strip: pick('.fo-fstrip'),
    wordmark: pick('.fo-fstrip .fo-wordmark'),
    bottom: pick('.fo-footer-bottom'),
    tagline: pick('.fo-fcell-tagline'),
    linksA: pick('.fo-fcell:nth-child(3)'),
    linksC: pick('.fo-fcell:nth-child(5)'),
    mark: pick('.fo-fcell-mark'),
    markSvg: pick('.fo-footer-mark-svg'),
    addrA: pick('.fo-fcell:nth-child(6)'),
    addrB: pick('.fo-fcell:nth-child(7)'),
    subscribeRow: pick('.fo-subscribe-row'),
    subscribeInput: pick('.fo-subscribe-input'),
    subscribeBtn: pick('.fo-subscribe-btn'),
    /* the grid's row heights + what pushes the tagline cell */
    gridRows: (() => {
      const g = document.querySelector('.fo-fgrid');
      if (!g) return null;
      const cs = getComputedStyle(g);
      return { cols: cs.gridTemplateColumns, rows: cs.gridTemplateRows, h: Math.round(g.getBoundingClientRect().height) };
    })(),
    taglineKids: [...document.querySelectorAll('.fo-fcell-tagline > *')].map((k) => {
      const r = k.getBoundingClientRect();
      return { cls: k.className.toString(), h: Math.round(r.height), w: Math.round(r.width) };
    }),
    linksKids: [...document.querySelectorAll('.fo-fcell:nth-child(3) > *')].map((k) => {
      const r = k.getBoundingClientRect();
      return { cls: k.className.toString() || k.tagName, h: Math.round(r.height) };
    }),
    markCellKids: [...document.querySelectorAll('.fo-fcell-mark .fo-footer-mark')].map((k) => {
      const r = k.getBoundingClientRect();
      return { h: Math.round(r.height), w: Math.round(r.width) };
    }),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
