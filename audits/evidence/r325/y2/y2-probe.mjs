/* Y2 probe — measure the §05 platform band geometry per breakpoint.
 * Usage: node y2-probe.mjs [before|after]  → JSON to stdout */
import { chromium } from 'playwright-core';

const tag = process.argv[2] || 'before';
const BPS = [
  { w: 1440, h: 900, name: '1440' },
  { w: 768, h: 1024, name: '768' },
  { w: 390, h: 844, name: '390' },
];
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const out = { tag, bps: {} };

for (const bp of BPS) {
  const ctx = await browser.newContext({
    viewport: { width: bp.w, height: bp.h },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem('madarek-theme', 'light'); } catch {}
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.goto('http://localhost:5202/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(1200);
  await page.evaluate(async () => { await document.fonts.ready; });
  const section = page.locator('#product.pr-section, section.pr-section').first();
  try { await section.scrollIntoViewIfNeeded({ timeout: 8000 }); } catch {}
  await page.waitForTimeout(1200);

  out.bps[bp.name] = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: +b.x.toFixed(1), y: +b.y.toFixed(1),
        w: +b.width.toFixed(1), h: +b.height.toFixed(1),
        fs: cs.fontSize, fw: cs.fontWeight, disp: cs.display,
      };
    };
    const sec = document.querySelector('.pr-section');
    const q = (s) => document.querySelector(s);
    const qall = (s) => [...document.querySelectorAll(s)];
    // blank zone finder: inside .pr-frame-body, the largest vertical gap
    // between consecutive child boxes in the player cell
    const playerList = q('.pr-chapters');
    const check = q('.pr-check');
    const blankUnderList = playerList && check
      ? Math.round(check.getBoundingClientRect().top - playerList.getBoundingClientRect().bottom)
      : null;
    // mono font sizes present in the band
    const monoSizes = {};
    qall('.pr-section .fo-mono').forEach((el) => {
      const fs = getComputedStyle(el).fontSize;
      monoSizes[fs] = (monoSizes[fs] || 0) + 1;
    });
    const pin = q('.pr-pin');
    const planwrap = q('.pr-planwrap');
    let pinOverArt = null;
    if (pin && planwrap) {
      const p = pin.getBoundingClientRect();
      const a = planwrap.getBoundingClientRect();
      pinOverArt = {
        overlapsPlan: p.top < a.bottom && p.bottom > a.top && p.left < a.right && p.right > a.left,
        insetX: +(p.left - a.left).toFixed(1),
        insetY: +(p.top - a.top).toFixed(1),
      };
    }
    return {
      section: r(sec),
      head: r(q('.pr-head')),
      title: r(q('.pr-title')),
      lede: r(q('.pr-lede')),
      drawing: r(q('.pr-drawing')),
      stage: r(q('.pr-stage')),
      frame: r(q('.pr-frame')),
      frameHead: r(q('.pr-frame-head')),
      frameBody: r(q('.pr-frame-body')),
      cellPlayer: r(q('.pr-cell-player')),
      cellMatrix: r(q('.pr-cell-matrix')),
      cellAi: r(q('.pr-cell-ai')),
      chapters: r(playerList),
      check: r(check),
      blankUnderList,
      note: r(q('.pr-note')),
      pin: r(pin),
      pinOverArt,
      monoSizes,
    };
  });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
