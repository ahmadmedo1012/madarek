/* R310 hero-proof capture — the full state matrix on the current build. */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname) + '/proof';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

const waitLanded = async () => {
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
  await page.waitForTimeout(450);
  await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
  await page.waitForTimeout(2600);
};

await waitLanded();
await page.screenshot({ path: `${OUT}/01-top.png` });
console.log('✓ 01-top');

/* cursor idle */
await page.mouse.move(700, 650);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/02-cursor-idle.png` });

/* cursor moving (trail) */
for (let i = 0; i < 14; i += 1) {
  await page.mouse.move(200 + i * 85, 650 + Math.sin(i) * 100, { steps: 3 });
}
await page.screenshot({ path: `${OUT}/03-cursor-moving.png` });
console.log('✓ 02/03 cursor');

/* hero instrument (guides + readout) */
const sb = await page.locator('div.bp-stage').first().boundingBox();
await page.mouse.move(sb.x + sb.width * 0.55, sb.y + sb.height * 0.5, { steps: 10 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-hero-guides.png` });
console.log('✓ 04-hero-guides');

/* drag + released */
await page.mouse.move(sb.x + sb.width * 0.18, sb.y + sb.height * 0.4, { steps: 4 });
await page.mouse.down();
for (let i = 1; i <= 14; i += 1) {
  await page.mouse.move(
    sb.x + sb.width * 0.18 + (sb.width * 0.68 * i) / 14,
    sb.y + sb.height * 0.4 + (sb.height * 0.5 * i) / 14,
    { steps: 2 },
  );
}
await page.screenshot({ path: `${OUT}/05-drag.png` });
await page.mouse.up();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/06-drag-released.png` });
console.log('✓ 05/06 drag');

/* stage pin interaction (click pin 03) */
const pins = page.locator('.bp-hotspot');
await pins.nth(2).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/07-stage-active.png` });
console.log('✓ 07-stage-active');

/* footer lens */
await page.locator('.fo-footer').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
const fb = await page.locator('.fl').boundingBox();
if (fb) {
  await page.mouse.move(fb.x + fb.width * 0.4, fb.y + fb.height * 0.5, { steps: 12 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/08-footer-lens.png` });
  console.log('✓ 08-footer-lens');
}
console.log('errors:', errors.length ? errors : 'none');
await ctx.close();
await browser.close();
