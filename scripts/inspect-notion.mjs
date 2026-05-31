import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto('https://www.notion.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.waitForTimeout(2500);
const meta = await page.evaluate(() => {
  const styles = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      color: cs.color,
      bg: cs.backgroundColor,
    };
  };
  return {
    h1: styles('h1'),
    h2: styles('h2'),
    body: styles('body'),
    button: styles('button'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
});
console.log(JSON.stringify(meta, null, 2));
await page.screenshot({ path: '/tmp/notion_hero.png', fullPage: false });
await page.evaluate(() => window.scrollTo(0, 1500));
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/notion_mid.png', fullPage: false });
await browser.close();
