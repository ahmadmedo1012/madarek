// R322 (task 1-b) — per-panel crops of the blind font-test page (legibility
// aid for the vision reviewers: the full-height shot alone downscales the
// 32px specimens past judgment). Labels [A]–[E] stay in-frame; faces stay blind.
// Usage: node scripts/r322/font-test-panels.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'audits', 'evidence', 'r322', 'dsys');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5175/r322-font-test.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
const tags = await page.$$eval('.panel .p-head .tag', (els) => els.map((e) => e.textContent.trim().replace(/[[\]]/g, '')));
const panels = await page.$$('.panel');
for (let i = 0; i < panels.length; i += 1) {
  const tag = tags[i] || String(i + 1);
  await panels[i].screenshot({ path: path.join(OUT_DIR, `font-test-panel-${tag}.png`) });
  console.log(`panel [${tag}] shot`);
}
await browser.close();
