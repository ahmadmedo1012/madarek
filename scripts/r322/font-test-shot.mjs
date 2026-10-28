// R322 (task 1-b) — screenshot the BLIND font-test page at 1440, full height.
// Usage: node scripts/r322/font-test-shot.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'audits', 'evidence', 'r322', 'dsys', 'font-test-1440.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5175/r322-font-test.html', { waitUntil: 'load', timeout: 60000 });
// the CDN faces must be IN before the shot (swap would lie about the faces)
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
await page.screenshot({ path: OUT, fullPage: true });
const height = await page.evaluate(() => document.documentElement.scrollHeight);
await browser.close();
console.log(`shot → ${OUT} (${height}px tall)`);
