import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5175/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);
const secs = await page.evaluate(() => {
  const sels = ['.fo-hero', '.st-section', '.pm-section', '.chapters', '.pr-section', '.wy-section', '.rl-section', '.fo-cta', '.fo-footer'];
  return sels.map((s) => {
    const el = document.querySelector(s);
    if (!el) return [s, -1];
    return [s, Math.round(el.getBoundingClientRect().height)];
  });
});
console.log('== PRE (stashed) 390x844 ==');
for (const [s, h] of secs) console.log(`  ${s.padEnd(14)} h=${h}`);
console.log('  docH =', await page.evaluate(() => Math.round(document.documentElement.scrollHeight)));
await browser.close();
