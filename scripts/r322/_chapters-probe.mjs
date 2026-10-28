import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5175/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);
const blocks = await page.evaluate(() => {
  const sels = ['.chapters-head', '.chapters-title', '.chapters-lede', '.jt-flow', '.jt-cam', '.jt-statement-m', '.jt-intro-m', '.jt-stations', '.jt-station', '.jt-side', '.jt-checklist'];
  return sels.map((s) => {
    const el = document.querySelector(s);
    return [s, el ? Math.round(el.getBoundingClientRect().height) : -1];
  });
});
console.log('== PRE chapters internals 390 ==');
for (const [s, h] of blocks) console.log(`  ${s.padEnd(18)} h=${h}`);
await browser.close();
