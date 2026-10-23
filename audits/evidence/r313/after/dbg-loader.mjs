import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  window.__dbg = [];
  const t0 = performance.now();
  const tick = () => {
    try {
      window.__dbg.push([Math.round(performance.now() - t0), !!document.querySelector('.sl'), document.querySelector('.sl-pct')?.textContent || null]);
    } catch (e) { window.__err = String(e); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const page = await ctx.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'commit', timeout: 30000 });
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 600));
  const st = await page.evaluate(() => ({ n: window.__dbg?.length, last: window.__dbg?.at(-1), err: window.__err || null, sl: !!document.querySelector('.sl'), pct: document.querySelector('.sl-pct')?.textContent || null }));
  console.log(i, JSON.stringify(st));
}
await browser.close();
