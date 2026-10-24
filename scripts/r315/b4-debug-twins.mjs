import { chromium } from 'playwright-core';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(
  () => document.querySelector('.landing')?.classList.contains('intro-done') && !document.querySelector('.sl'),
  { timeout: 20000 },
);
const out = await page.evaluate(() => {
  const rows = [];
  for (const sel of ['.jt-statement-m', '.jt-intro-m', '.jt-pin .jt-statement', '.jt-pin .jt-intro', '.jt-flow']) {
    const el = document.querySelector(sel);
    if (!el) { rows.push([sel, 'MISSING']); continue; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    rows.push([sel, cs.display, cs.visibility, 'rect ' + Math.round(r.width) + 'x' + Math.round(r.height), 'txt=' + (el.textContent || '').slice(0, 20)]);
  }
  return rows;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
