import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.dirname(new URL(import.meta.url).pathname) + '/production';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://madarek.onrender.com';
const browser = await chromium.launch();

/* desktop */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 20_000 });
await page.waitForTimeout(500);
/* the loader decision settle + exit */
await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 30_000 });
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/prod-top-1440.png` });
console.log('✓ prod-top-1440');

/* the drawing ink present? */
const ink = await page.evaluate(() => {
  const svg = document.querySelector('.bp-stage .bp-svg');
  const r = svg.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), drawables: svg.querySelectorAll('.bp-drawable').length };
});
console.log('drawing box:', JSON.stringify(ink));

/* journey stage 3 */
const jt = await page.locator('.jt').boundingBox();
if (jt) {
  await page.evaluate((y) => window.scrollTo(0, y), [jt.y + jt.height * 0.85 - 450]);
  await page.waitForTimeout(1800);
  const plan = await page.evaluate(() => {
    let visible = 0; let total = 0;
    for (const el of document.querySelectorAll('.jt-plan .bp-drawable')) {
      total += 1;
      if (getComputedStyle(el).strokeDashoffset === '0px') visible += 1;
    }
    return { visible, total, stage: document.querySelector('.jt').dataset.stage };
  });
  console.log('plan build:', JSON.stringify(plan));
  await page.screenshot({ path: `${OUT}/prod-journey-1440.png` });
  console.log('✓ prod-journey-1440');
}
/* mobile */
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const mpage = await mctx.newPage();
await mpage.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
await mpage.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 20_000 });
await mpage.waitForTimeout(400);
await mpage.waitForFunction(() => !document.querySelector('.sl'), { timeout: 30_000 });
await mpage.waitForTimeout(1800);
await mpage.screenshot({ path: `${OUT}/prod-top-390.png` });
console.log('✓ prod-top-390');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
