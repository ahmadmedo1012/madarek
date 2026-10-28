import { chromium } from 'playwright';
const widths = [1440, 1200, 1024, 992, 991, 900, 820, 768, 767, 720, 640, 480, 430, 390, 360, 320];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5175/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
console.log('width  rootPx   d1px    d2px    d3px    stpx');
for (const w of widths) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;';
    document.body.appendChild(probe);
    const fs = (v) => { probe.style.fontSize = v; return parseFloat(getComputedStyle(probe).fontSize); };
    const d1 = fs('var(--fs-d1)'), d2 = fs('var(--fs-d2)'), d3 = fs('var(--fs-d3)'), st = fs('var(--fs-st)');
    probe.remove();
    return { root, d1, d2, d3, st };
  });
  console.log(String(w).padStart(5), String((Math.round(r.root*100)/100)).padStart(6), String((Math.round(r.d1*100)/100)).padStart(6), String((Math.round(r.d2*100)/100)).padStart(6), String((Math.round(r.d3*100)/100)).padStart(6), String((Math.round(r.st*100)/100)).padStart(6));
}
await browser.close();
