import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const EXE = (() => { const b = path.join(process.env.HOME, '.cache/ms-playwright'); for (const d of fs.readdirSync(b).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()) { const p = path.join(b, d, 'chrome-linux64/chrome'); if (fs.existsSync(p)) return p; } })();
const browser = await chromium.launch({ executablePath: EXE });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const q = (s) => document.querySelectorAll(s).length;
  return {
    'P_SEAT_SEL (.jt-pin .jt-plan, .jt-pin .jt-statement, .jt-pin .jt-intro)': q('.jt-pin .jt-plan, .jt-pin .jt-statement, .jt-pin .jt-intro'),
    '.jt-plan (anywhere)': q('.jt-plan'),
    '.jt-pin .jt-plan': q('.jt-pin .jt-plan'),
    '.jt-statement': q('.jt-statement'),
    '.jt-intro': q('.jt-intro'),
    '.jt-progress (R seats)': q('.jt-progress'),
    '.jt-pin': q('.jt-pin'),
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
