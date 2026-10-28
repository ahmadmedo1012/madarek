import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const [name, w, h] of [['390', 390, 844], ['360', 360, 800]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5175/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3000);
  const secs = await page.evaluate(() => {
    const sels = ['.fo-hero', '.st-section', '.pm-section', '.chapters', '.pr-section', '.wy-section', '.rl-section', '.fo-cta', '.fo-footer'];
    return sels.map((s) => {
      const el = document.querySelector(s);
      if (!el) return [s, -1];
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return [s, Math.round(r.height), Math.round(parseFloat(cs.paddingBlockStart)), Math.round(parseFloat(cs.paddingBlockEnd))];
    });
  });
  console.log(`== ${name}x${h} ==`);
  for (const [s, height, pbs, pbe] of secs) console.log(`  ${s.padEnd(14)} h=${String(height).padStart(6)}  pad ${pbs}/${pbe}`);
  await ctx.close();
}
await browser.close();
