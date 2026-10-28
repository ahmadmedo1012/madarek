import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) { const p = path.join(base, d, 'chrome-linux64/chrome'); if (fs.existsSync(p)) return p; }
})();
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const chunks = [];
cdp.on('Tracing.dataCollected', (d) => chunks.push(...(d.value || d.data || [])));
await page.goto('http://127.0.0.1:4317/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
await cdp.send('Tracing.start', { transferMode: 'ReportEvents', streamFormat: 'json',
  categories: 'devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.timeline.invalidationTracking,disabled-by-default-blink.style' });
await page.evaluate(() => { window.__anchor = performance.now(); });
const pEval = await page.evaluate(() => { const t0 = performance.now(); const e = performance.now(); while (performance.now() - t0 < 30) {} return { t0, e }; });
await page.mouse.wheel(0, 300);
await page.evaluate(() => console.timeStamp('mdrk-notch-0'));
await page.waitForTimeout(150);
await page.mouse.wheel(0, 300);
await page.evaluate(() => console.timeStamp('mdrk-notch-1'));
await page.waitForTimeout(150);
await cdp.send('Tracing.end');
await new Promise((r) => { const t = setTimeout(r, 8000); cdp.on('Tracing.tracingComplete', () => { clearTimeout(t); r(); }); });
await page.waitForTimeout(300);
const names = {};
for (const e of chunks) names[e.name] = (names[e.name] || 0) + 1;
console.log('total events:', chunks.length);
console.log('names:', JSON.stringify(Object.fromEntries(Object.entries(names).sort((a,b)=>b[1]-a[1]).slice(0, 45)), null, 1));
const interesting = chunks.filter((e) => /Timestamp|EventDispatch|Evaluate|mouse|wheel|Mouse/i.test(e.name || ''));
for (const e of interesting.slice(0, 25)) console.log('INT', e.name, '| cat', e.cat, '| ts', e.ts, '| dur', e.dur, '| args', JSON.stringify(e.args || {}).slice(0, 140));
console.log('pEval', JSON.stringify(pEval));
await browser.close();
