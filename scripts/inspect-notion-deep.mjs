import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto('https://www.notion.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.waitForTimeout(2500);
const data = await page.evaluate(() => {
  const get = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
      borderRadius: cs.borderRadius, padding: cs.padding,
      color: cs.color, bg: cs.backgroundColor,
      transitionDuration: cs.transitionDuration, transitionTimingFunction: cs.transitionTimingFunction,
    };
  };
  // Find an h2-styled section heading and a card-like component
  const allH = [...document.querySelectorAll('h1,h2,h3,h4')].slice(0, 6).map((el) => {
    const cs = getComputedStyle(el);
    return { t: el.tagName, fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing };
  });
  const sections = [...document.querySelectorAll('section')].slice(0, 4).map((el) => {
    const cs = getComputedStyle(el);
    return { padding: cs.padding, bg: cs.backgroundColor };
  });
  return { headings: allH, sections, primary: get('button') };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
