#!/usr/bin/env node
/** r321-tick-owner.mjs — walk EVERY element whose rect contains (1,1)
 *  (elementsFromPoint skips pointer-events:none layers) and report each
 *  one's paint sources — the tick's owner must be in this list. */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/500`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const owners = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.x <= 1 && r.y <= 1 && r.x + r.width > 1 && r.y + r.height > 1) {
      const cs = getComputedStyle(el);
      const be = getComputedStyle(el, '::before');
      const af = getComputedStyle(el, '::after');
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 60),
        pe: cs.pointerEvents,
        pos: cs.position,
        z: cs.zIndex,
        rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
        bg: cs.backgroundColor,
        bgImg: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 70) : 'none',
        borderTop: `${cs.borderTopWidth} ${cs.borderTopColor}`,
        borderLeft: `${cs.borderLeftWidth} ${cs.borderLeftColor}`,
        boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow.slice(0, 70) : 'none',
        outline: `${cs.outlineWidth} ${cs.outlineColor}`,
        before: be.content !== 'none' ? `${be.content.slice(0, 20)} bg=${be.backgroundColor} img=${be.backgroundImage.slice(0, 50)} w=${be.width} h=${be.height}` : 'none',
        after: af.content !== 'none' ? `${af.content.slice(0, 20)} bg=${af.backgroundColor}` : 'none',
      });
    }
  }
  return out;
});
console.log(JSON.stringify(owners, null, 1));
await browser.close();
