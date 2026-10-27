#!/usr/bin/env node
/** r321-tick-shape.mjs — the exact shape of the (0,0) orange tick on
 *  /500 @1440 + the full element stack with paint sources. */
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/500`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 20, height: 20 } });
const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
const grid = [];
for (let y = 0; y < 20; y++) {
  const row = [];
  for (let x = 0; x < 20; x++) {
    const i = (y * info.width + x) * info.channels;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    row.push(r > 140 && r - b > 40 ? 'X' : '.');
  }
  grid.push(row.join(''));
}
console.log('SHAPE (X = orange):');
console.log(grid.join('\n'));
const stack = await page.evaluate(() => {
  return document.elementsFromPoint(0.5, 0.5).map((el) => {
    const cs = getComputedStyle(el);
    const be = getComputedStyle(el, '::before');
    const af = getComputedStyle(el, '::after');
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id,
      cls: String(el.className).slice(0, 50),
      bg: cs.backgroundColor,
      bgImg: cs.backgroundImage.slice(0, 60),
      border: `${cs.borderTopColor} ${cs.borderTopWidth}`,
      outline: `${cs.outlineColor} ${cs.outlineWidth}`,
      boxShadow: cs.boxShadow.slice(0, 60),
      before: `${be.content} ${be.backgroundColor} ${be.backgroundImage.slice(0, 40)}`,
      after: `${af.content} ${af.backgroundColor}`,
      rect: (() => { const r = el.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; })(),
    };
  });
});
console.log('STACK:', JSON.stringify(stack, null, 1));
await browser.close();
