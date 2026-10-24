import { chromium } from 'playwright-core';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
for (const [w, h] of [[1440, 900], [820, 1024], [768, 1024]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ar-LY' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  try { await page.evaluate(() => document.fonts.ready); } catch {}
  await page.evaluate(() => { const f = document.querySelector('.fo-footer'); if (f) f.scrollIntoView(); });
  await page.waitForTimeout(1000);
  const out = await page.evaluate(([w, h]) => {
    const f = document.querySelector('.fo-footer');
    const repo = f.querySelector('.fo-footer-repo');
    const rr = repo.getBoundingClientRect();
    const cell = repo.closest('.fo-fcell').getBoundingClientRect();
    const grid = f.querySelector('.fo-fgrid').getBoundingClientRect();
    const colStarts = getComputedStyle(f.querySelector('.fo-fgrid')).gridTemplateColumns;
    const addrCells = [...f.querySelectorAll('.fo-fcell-addr')].map((c) => {
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) };
    });
    const wmAr = f.querySelector('.fo-wordmark-ar');
    const war = wmAr ? wmAr.getBoundingClientRect() : null;
    return {
      vp: w + 'x' + h,
      footerH: Math.round(f.getBoundingClientRect().height),
      gridH: Math.round(grid.height),
      cols: colStarts,
      repo: { w: Math.round(rr.width), cellW: Math.round(cell.width), spill: Math.round(rr.right - cell.right), font: getComputedStyle(repo).fontSize },
      addrCells,
      wordmarkAr: war ? { w: Math.round(war.width), h: Math.round(war.height) } : null,
    };
  }, [w, h]);
  console.log(JSON.stringify(out));
  await ctx.close();
}
await browser.close();
