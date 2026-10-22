import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.dirname(new URL(import.meta.url).pathname) + '/proof';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
await page.waitForTimeout(400);
await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
await page.waitForTimeout(1000);

const jt = page.locator('.jt');
await jt.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/j-0-approach.png` });

const jb = await jt.boundingBox();
if (jb) {
  const positions = [
    ['j-1-stage0', 0.16],
    ['j-2-stage1', 0.38],
    ['j-3-stage2', 0.60],
    ['j-4-stage3', 0.85],
    ['j-5-resolved', 0.97],
  ];
  for (const [name, frac] of positions) {
    await page.evaluate((y) => window.scrollTo(0, y), [jb.y + jb.height * frac - 450]);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('✓', name);
  }
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
