#!/usr/bin/env node
/** r321-lg-box.mjs — the .lg family box model at 320 to explain the
 *  constant ~-28px left shift of the document column. */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 320, height: 568 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/legal/privacy`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const box = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel,
      rect: `${Math.round(r.left)}..${Math.round(r.right)} (w ${Math.round(r.width)})`,
      maxW: cs.maxWidth, width: cs.width,
      margin: `${cs.marginLeft} | ${cs.marginRight}`,
      padding: `${cs.paddingLeft} | ${cs.paddingRight}`,
      gutter: getComputedStyle(el).getPropertyValue('--page-gutter').trim(),
      chProbe: (() => { const s = document.createElement('span'); s.style.cssText = 'position:absolute;visibility:hidden;font:16px '+cs.fontFamily; s.textContent = '0'.repeat(10); document.body.appendChild(s); const w10 = s.getBoundingClientRect().width; s.remove(); return (w10 / 10).toFixed(2); })(),
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    };
  };
  return [
    pick('html'), pick('body'), pick('.lg'), pick('.lg-main'),
    pick('.lg-head'), pick('.lg-title'), pick('.lg-lede'), pick('.lg-bar'),
  ];
});
console.log(JSON.stringify(box, null, 1));
await browser.close();
