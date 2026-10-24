#!/usr/bin/env node
/**
 * R315 B9 — mobile footer computed-style probe (the phone band bring-up:
 * mark cell padding, bottom rows, subscribe row) at a viewport.
 *
 * Usage: node scripts/r315/b9-mprobe.mjs [WxH]
 */
import { chromium } from 'playwright-core';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const [W, H] = (process.argv[2] ?? '390x844').split('x').map(Number);
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(
  () => document.querySelector('.landing')?.classList.contains('intro-done') && !document.querySelector('.sl'),
  { timeout: 20000 },
);
await page.evaluate(() => document.querySelector('.fo-footer')?.scrollIntoView());
await page.waitForTimeout(700);
const out = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return { sel, w: +b.width.toFixed(1), h: +b.height.toFixed(1), padB: cs.paddingBlock, minH: cs.minHeight, inline: cs.inlineSize };
  };
  return {
    markCell: pick('.fo-fcell-mark'),
    markSvg: pick('.fo-footer-mark-svg'),
    stripCell: pick('.fo-fcell-strip'),
    bottom: pick('.fo-footer-bottom'),
    bottomRow1: pick('.fo-footer-bottom > span:first-child'),
    bottomRow2: pick('.fo-footer-bottom > span:last-child'),
    subscribeRow: pick('.fo-subscribe-row'),
    subscribeInput: pick('.fo-subscribe-input'),
    subscribeBtn: pick('.fo-subscribe-btn'),
    tagline: pick('.fo-fcell-tagline'),
    linksC: pick('.fo-fgrid > .fo-fcell:nth-child(5)'),
    addrB: pick('.fo-fgrid > .fo-fcell:nth-child(7)'),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
