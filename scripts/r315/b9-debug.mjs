#!/usr/bin/env node
/**
 * R315 B9 — strip-band sizing debug (footer defect §0-F): the computed
 * grid rows / lens svg resolved sizes at a viewport, for the 314px band
 * bring-up.
 *
 * Usage: node scripts/r315/b9-debug.mjs [WxH]
 */
import { chromium } from 'playwright-core';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const [W, H] = (process.argv[2] ?? '1440x900').split('x').map(Number);
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(
  () => document.querySelector('.landing')?.classList.contains('intro-done') && !document.querySelector('.sl'),
  { timeout: 20000 },
);
await page.evaluate(() => document.querySelector('.fo-footer')?.scrollIntoView());
await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const strip = document.querySelector('.fo-fstrip');
  if (!strip) return null;
  const fl = strip.querySelector('.fl');
  const svg = strip.querySelector('.fl-svg');
  const wm = strip.querySelector('.fo-wordmark');
  const cs = getComputedStyle(strip);
  const scs = svg ? getComputedStyle(svg) : null;
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  return {
    vw: window.innerWidth,
    strip: { rows: cs.gridTemplateRows, minH: cs.minHeight, containerType: cs.containerType, ...r(strip) },
    fl: fl ? r(fl) : null,
    svg: svg ? { inlineSize: scs.inlineSize, blockSize: scs.blockSize, maxBlockSize: scs.maxBlockSize, minBlockSize: scs.minBlockSize, aspect: scs.aspectRatio, ...r(svg) } : null,
    wordmark: r(wm),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
