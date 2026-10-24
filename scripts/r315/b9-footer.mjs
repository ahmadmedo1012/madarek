#!/usr/bin/env node
/**
 * R315 B9 — footer verification harness (footer defect §0-F).
 *
 * Captures the landing footer at a viewport × theme, measures the footer
 * band height + the wordmark band's inline size, and runs an overlap
 * census (bounding-box intersections) over every visible footer text
 * node — the mobile-collision gate.
 *
 * Usage:
 *   node scripts/r315/b9-footer.mjs --viewport 1440x900 --theme light
 *   node scripts/r315/b9-footer.mjs --viewport 390x844 --theme dark --overlap
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const [w, h] = get('viewport', '1440x900').split('x').map(Number);
const theme = get('theme', 'light');
const outDir = '/home/z/madarek/_local/b9-preview';

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const ctx = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
  locale: 'ar-LY',
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('  [pageerror]', String(e).slice(0, 200)));

await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 60000 });
if (theme === 'dark') {
  await page.evaluate(() => {
    try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 })); } catch {}
  });
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
}
try { await page.evaluate(() => document.fonts.ready); } catch {}
await page.evaluate(() => {
  try { localStorage.setItem('madarek.consent', JSON.stringify({ v: 1, t: Date.now() })); } catch {}
  window.__lenisOff = true;
});
await page.waitForTimeout(1200);

// scroll to the footer, let reveals settle
await page.evaluate(() => { const f = document.querySelector('.fo-footer'); if (f) f.scrollIntoView(); });
await page.waitForTimeout(flag('still') ? 400 : 1400);

const metrics = await page.evaluate(() => {
  const footer = document.querySelector('.fo-footer');
  if (!footer) return null;
  const fr = footer.getBoundingClientRect();
  const doc = document.documentElement;
  const scrollY = window.scrollY;
  const strip = footer.querySelector('.fo-fstrip');
  const wm = footer.querySelector('.fo-wordmark');
  const wmSvg = footer.querySelector('.fo-wordmark svg');
  const inner = footer.querySelector('.fo-footer-inner');
  const ir = inner ? inner.getBoundingClientRect() : null;
  const sr = strip ? strip.getBoundingClientRect() : null;
  const wr = wm ? wm.getBoundingClientRect() : null;
  const wrSvg = wmSvg ? wmSvg.getBoundingClientRect() : null;
  const links = footer.querySelectorAll('a').length;
  return {
    footerHeight: Math.round(fr.height),
    footerTop: Math.round(fr.top + scrollY),
    docHeight: Math.round(doc.scrollHeight),
    innerWidth: ir ? Math.round(ir.width) : null,
    innerLeft: ir ? Math.round(ir.left) : null,
    innerRight: ir ? Math.round(ir.right) : null,
    stripHeight: sr ? Math.round(sr.height) : null,
    stripWidth: sr ? Math.round(sr.width) : null,
    stripLeft: sr ? Math.round(sr.left) : null,
    wmHeight: wr ? Math.round(wr.height) : null,
    wmWidth: wr ? Math.round(wr.width) : null,
    wmSvgWidth: wrSvg ? Math.round(wrSvg.width) : null,
    wmSvgLeft: wrSvg ? Math.round(wrSvg.left) : null,
    wmSvgRight: wrSvg ? Math.round(wrSvg.right) : null,
    footerLinks: links,
  };
});

// overlap census: every visible element pair inside the footer (text-bearing)
const overlaps = await page.evaluate(() => {
  const footer = document.querySelector('.fo-footer');
  if (!footer) return [];
  const els = [...footer.querySelectorAll('*')].filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    // text-bearing elements or links/headings only (skip pure containers
    // that legitimately enclose children)
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    const isInteractive = el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'svg';
    return hasOwnText || isInteractive;
  });
  const out = [];
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      const a = els[i];
      const b = els[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
      const iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      if (ix > 2 && iy > 2) {
        out.push({
          a: (a.textContent || a.tagName).trim().slice(0, 40),
          b: (b.textContent || b.tagName).trim().slice(0, 40),
          ix: Math.round(ix), iy: Math.round(iy),
        });
      }
    }
  }
  return out.slice(0, 20);
});

const tag = `${w}x${h}-${theme}`;
fs.mkdirSync(outDir, { recursive: true });
const footerEl = await page.$('.fo-footer');
await footerEl.screenshot({ path: path.join(outDir, `footer-${tag}.png`) });
// full footer band including a little context
await page.screenshot({ path: path.join(outDir, `viewport-${tag}.png`) });

console.log(JSON.stringify({ tag, metrics, overlaps }, null, 1));
await browser.close();

/* ── deep cell census (run with --cells) ───────────────────────────── */
if (flag('cells')) {
  const b2 = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  const c2 = await b2.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'no-preference', locale: 'ar-LY' });
  const p2 = await c2.newPage();
  await p2.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 60000 });
  if (theme === 'dark') {
    await p2.evaluate(() => {
      try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 })); } catch {}
    });
    await p2.reload({ waitUntil: 'load' });
    await p2.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  }
  try { await p2.evaluate(() => document.fonts.ready); } catch {}
  await p2.evaluate(() => { const f = document.querySelector('.fo-footer'); if (f) f.scrollIntoView(); });
  await p2.waitForTimeout(1300);
  const cells = await p2.evaluate(() => {
    const footer = document.querySelector('.fo-footer');
    if (!footer) return null;
    return [...footer.querySelectorAll('.fo-fcell')].map((cell, i) => {
      const r = cell.getBoundingClientRect();
      const kids = [...cell.querySelectorAll('*')].map((k) => {
        const kr = k.getBoundingClientRect();
        const cs = getComputedStyle(k);
        return {
          tag: k.tagName,
          cls: (k.className.baseVal ?? k.className ?? '').toString().slice(0, 40),
          text: (k.textContent || '').trim().slice(0, 30),
          x: Math.round(kr.x), y: Math.round(kr.y), w: Math.round(kr.width), h: Math.round(kr.height),
          clipped: k.scrollWidth > k.clientWidth + 1,
          outside:
            kr.left < r.left - 1 || kr.right > r.right + 1 || kr.top < r.top - 1 || kr.bottom > r.bottom + 1,
        };
      });
      return {
        i,
        cls: (cell.className.baseVal ?? cell.className).toString(),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        clippedSelf: cell.scrollWidth > cell.clientWidth + 1,
        kids,
      };
    });
  });
  console.log(JSON.stringify(cells, null, 1));
  await b2.close();
}
