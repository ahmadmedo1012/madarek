/* R310 diag — verify the elevation's render state after landing. */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
/* robust: wait for the app, let the loader DECISION settle, then wait for its exit */
await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
await page.waitForTimeout(450);
await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
await page.waitForTimeout(2600);

const report = await page.evaluate(() => {
  const svg = document.querySelector('.bp-stage .bp-svg');
  if (!svg) return { error: 'no .bp-svg in .bp-stage' };
  const r = svg.getBoundingClientRect();
  const layers = {};
  for (const g of svg.querySelectorAll('[data-ink]')) {
    const k = g.getAttribute('data-ink');
    layers[k] = g.querySelectorAll('[pathLength]').length;
  }
  const probe = svg.querySelector('.bp-vol-4 .bp-fill');
  const probeStyle = probe ? getComputedStyle(probe) : null;
  const texts = svg.querySelectorAll('text').length;
  const pins = [...document.querySelectorAll('.bp-hotspot')].map((el) => {
    const st = getComputedStyle(el);
    return {
      num: el.textContent?.trim().slice(0, 2),
      left: st.left,
      top: st.top,
      w: el.getBoundingClientRect().width,
    };
  });
  return {
    svgBox: { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) },
    layers,
    totalPaths: svg.querySelectorAll('[pathLength]').length,
    texts,
    towerFill: probeStyle
      ? { dashoffset: probeStyle.strokeDashoffset, fillOpacity: probeStyle.fillOpacity, stroke: probeStyle.stroke }
      : null,
    landingClass: document.querySelector('.landing')?.className,
    pins,
  };
});
console.log(JSON.stringify(report, null, 1));
await browser.close();
