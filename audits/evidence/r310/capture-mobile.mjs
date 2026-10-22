import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.dirname(new URL(import.meta.url).pathname) + '/proof';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const vp of [
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 },
  { name: '430x932', width: 430, height: 932 },
]) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
  await page.waitForTimeout(450);
  await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/m-top-${vp.name}.png` });
  /* the drawing region */
  const sb = await page.locator('div.bp-stage').first().boundingBox();
  if (sb) {
    await page.evaluate((y) => window.scrollTo(0, y), [Math.max(0, sb.y - 80)]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/m-drawing-${vp.name}.png` });
  }
  console.log('✓', vp.name);
  await ctx.close();
}
await browser.close();
