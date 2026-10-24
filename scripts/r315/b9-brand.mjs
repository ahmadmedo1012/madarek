import { chromium } from 'playwright-core';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-LY' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('.landing')?.classList.contains('intro-done') && !document.querySelector('.sl'), { timeout: 20000 });
await page.evaluate(() => { const f = document.querySelector('.fo-footer'); if (f) f.scrollIntoView(); });
await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const sel = ['.fo-brand', '.fo-brand-mark', '.fo-brand-stack', '.fo-brand-name', '.fo-brand-sub', '.fo-fcell-tagline', '.fo-footer-about', '.fo-subscribe', '.fo-footer-heading', '.fo-fcell-addr', '.fo-footer-repo', '.fo-wordmark', '.fo-wordmark-ar', '.fo-wordmark-en', '.fo-footer-bottom'];
  return sel.map((s) => {
    const els = [...document.querySelectorAll(s)];
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { s, text: (el.textContent || '').slice(0, 25).trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), disp: cs.display, fs: cs.fontSize, lh: cs.lineHeight, pos: cs.position };
    });
  }).flat();
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
