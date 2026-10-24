import { chromium } from 'playwright-core';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ar-LY' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.landing')?.classList.contains('intro-done') && !document.querySelector('.sl'), { timeout: 20000 });
  await page.evaluate(() => { const f = document.querySelector('.fo-footer'); if (f) f.scrollIntoView(); });
  await page.waitForTimeout(800);
  const out = await page.evaluate(() => {
    const cell = document.querySelector('.fo-fcell-tagline');
    const brand = cell.querySelector('.fo-brand');
    const ccs = getComputedStyle(cell);
    const bcs = getComputedStyle(brand);
    const r = brand.getBoundingClientRect();
    const stack = brand.querySelector('.fo-brand-stack');
    return {
      vp: innerWidth,
      cellJustifyItems: ccs.justifyItems,
      brandJustifySelf: bcs.justifySelf,
      brandW: Math.round(r.width),
      brandDisplay: bcs.display,
      stackCS: { disp: getComputedStyle(stack).display, w: Math.round(stack.getBoundingClientRect().width), direction: getComputedStyle(stack).direction },
      cellW: Math.round(cell.getBoundingClientRect().width),
    };
  });
  console.log(JSON.stringify(out));
  await ctx.close();
}
await browser.close();
