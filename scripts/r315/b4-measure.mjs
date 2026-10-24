/** B4 helper — live geometry of the chapters/map band on the dev
 * server: docH + the band's internal breakdown per viewport (head,
 * track, ch-rows, stations, cam, side) after the loader gate. */
import { chromium } from 'playwright-core';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const VPS = [
  [1440, 900], [1024, 768], [768, 1024], [390, 844],
];
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const results = {};
for (const [w, h] of VPS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(
    () => document.querySelector('.landing')?.classList.contains('intro-done') && !document.querySelector('.sl'),
    { timeout: 20000 },
  );
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const r = (s) => { const el = q(s); return el ? { top: Math.round(el.getBoundingClientRect().top + window.scrollY), h: Math.round(el.getBoundingClientRect().height) } : null; };
    return {
      docH: document.documentElement.scrollHeight,
      chapters: r('.chapters'),
      head: r('.chapters-head'),
      jt: r('.jt'),
      jtPin: r('.jt-pin'),
      chRows: r('.ch-rows'),
      flow: r('.jt-flow'),
      stations: r('.jt-stations'),
      cam: r('.jt-cam'),
      side: r('.jt-side'),
      product: r('.pr-section'),
      problem: r('.pm-section'),
    };
  });
  results[`${w}x${h}`] = m;
  console.log(`${w}x${h}: docH=${m.docH} chapters=${m.chapters?.h} head=${m.head?.h} jt=${m.jt?.h} chRows=${m.chRows?.h} flow=${m.flow?.h} stations=${m.stations?.h} cam=${m.cam?.h} side=${m.side?.h}`);
  await page.close();
}
await browser.close();
