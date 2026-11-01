import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:390,height:844} });
const page = await ctx.newPage();
await page.goto('http://localhost:3000', { waitUntil:'networkidle' });
await page.waitForTimeout(2500);
const m = await page.evaluate(() => {
  const lead = document.querySelector('.fo-hero-lead');
  const range = document.createRange();
  range.selectNodeContents(lead);
  const rects = range.getClientRects();
  const lines = [];
  for (const r of rects) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - r.top) < 2) { last.w = Math.max(last.w, r.width); }
    else lines.push({ y: Math.round(r.top), w: Math.round(r.width) });
  }
  // also check the hero's grid computed rows and whether intro classes affect
  const hero = document.querySelector('.fo-hero');
  const heroCs = getComputedStyle(hero);
  return {
    lineCount: lines.length,
    lines: lines.slice(0, 12),
    heroRows: heroCs.gridTemplateRows,
    heroClass: hero.className,
    landingClass: document.querySelector('.landing').className,
    bodyHasBanner: !!document.querySelector('.cb-banner'),
    rootVar: getComputedStyle(document.documentElement).getPropertyValue('--app-bottom-stack'),
  };
});
console.log(JSON.stringify(m, null, 1));
await browser.close();
