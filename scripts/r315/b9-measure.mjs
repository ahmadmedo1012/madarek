import { chromium } from 'playwright-core';
/* R315 B9: viewport arg — node scripts/r315/b9-measure.mjs [WxH] */
const [W, H] = (process.argv[2] ?? '1440x900').split('x').map(Number);
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: 'ar-LY' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
try { await page.evaluate(() => document.fonts.ready); } catch {}
await page.evaluate(() => { const f = document.querySelector('.fo-footer'); if (f) f.scrollIntoView(); });
await page.waitForTimeout(1200);
const out = await page.evaluate(() => {
  const f = document.querySelector('.fo-footer');
  const fr = f.getBoundingClientRect();
  const pick = (sel) => {
    const el = f.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { sel, y: Math.round(r.y - fr.y), h: Math.round(r.height), w: Math.round(r.width), x: Math.round(r.x - fr.x) };
  };
  return {
    footer: { h: Math.round(fr.height) },
    inner: pick('.fo-footer-inner'),
    grid: pick('.fo-fgrid'),
    strip: pick('.fo-fstrip'),
    lens: pick('.fo-fstrip .fl'),
    lensSvg: pick('.fo-fstrip .fl-svg'),
    wordmark: pick('.fo-fstrip .fo-wordmark'),
    bottom: pick('.fo-footer-bottom'),
    cells: [...f.querySelectorAll('.fo-fcell')].map((c) => {
      const r = c.getBoundingClientRect();
      return { cls: c.className.replace('fo-fcell ', ''), y: Math.round(r.y - fr.y), h: Math.round(r.height), w: Math.round(r.width), x: Math.round(r.x - fr.x) };
    }),
    taglineKids: [...f.querySelectorAll('.fo-fcell-tagline > *')].map((c) => {
      const r = c.getBoundingClientRect();
      return { cls: c.className, h: Math.round(r.height) };
    }),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
