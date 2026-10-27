import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path';
const EXE = (() => { const b = path.join(process.env.HOME, '.cache/ms-playwright'); for (const d of fs.readdirSync(b).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()) { const p = path.join(b, d, 'chrome-linux64/chrome'); if (fs.existsSync(p)) return p; } })();

async function run(label, css) {
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (css) await ctx.addInitScript((c) => { const s = document.createElement('style'); s.textContent = c; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s)); }, css);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
  await page.waitForTimeout(800);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.evaluate(() => {
    window.__frames = []; window.__lt = [];
    window.__raf = (t) => { const d = t - (window.__last || t); window.__last = t; if (window.__rec) { window.__frames.push(d); requestAnimationFrame(window.__raf); } };
    requestAnimationFrame(window.__raf);
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (window.__rec) window.__lt.push(e.duration); }).observe({ entryTypes: ['longtask'] });
  });
  await page.evaluate(() => { window.__rec = true; window.__last = performance.now(); requestAnimationFrame(window.__raf); });
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(80); }
  await page.waitForTimeout(600);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -600); await page.waitForTimeout(80); }
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    window.__rec = false;
    const f = window.__frames;
    return { frames: f.length, pct20: +(f.filter((d) => d > 20).length / f.length * 100).toFixed(1), p95: +f.slice().sort((a, b) => a - b)[Math.floor(f.length * 0.95)].toFixed(0), lt: window.__lt.length, ltMs: +window.__lt.reduce((a, b) => a + b, 0).toFixed(0) };
  });
  await browser.close();
  console.log(label.padEnd(22), JSON.stringify({ ...r, docH }));
}

const CV = `.chapters { content-visibility: auto; contain-intrinsic-size: auto 6301px; }`;
const CV_ALL = `.st-section, .pm-section, .chapters, .pr-section, .wy-section, .rl-section, .fo-cta { content-visibility: auto; }
.st-section { contain-intrinsic-size: auto 723px; } .pm-section { contain-intrinsic-size: auto 743px; }
.chapters { contain-intrinsic-size: auto 6301px; } .pr-section { contain-intrinsic-size: auto 710px; }
.wy-section { contain-intrinsic-size: auto 680px; } .rl-section { contain-intrinsic-size: auto 887px; }
.fo-cta { contain-intrinsic-size: auto 698px; }`;

await run('baseline', null);
await run('cv-chapters', CV);
await run('cv-all-sections', CV_ALL);
