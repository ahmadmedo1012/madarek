/** B4 helper — walk Heron's home-map band state machine.
 * One pass: load @1440x900, wait for the loader, then step the inner
 * Lenis scroller through the .home-map band in 5% steps, dumping at
 * each step every map-child layer's opacity/visibility/text so the
 * state list + dwell ratios can be read off. Gentleness: single load. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://heronaiapp.com/', { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch {}
await page.waitForTimeout(11000);
const out = await page.evaluate(() => {
  const wrap = document.querySelector('.lenis, [data-lenis-wrapper]');
  const map = document.querySelector('.home-map');
  const mapTop = map.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop;
  const mapH = map.getBoundingClientRect().height;
  const steps = [];
  const layers = [...map.querySelectorAll('.home-map-main-stick-inner > *')].map((el, i) => ({
    i,
    cls: el.className.toString().slice(0, 80),
  }));
  for (let p = 0; p <= 100; p += 2.5) {
    wrap.scrollTop = mapTop + (mapH - window.innerHeight) * (p / 100);
    const y = wrap.scrollTop;
    // force layout settle
    const snap = [...map.querySelectorAll('.home-map-main-stick-inner > *')].map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const txt = (el.innerText || '').replace(/\s+/g, ' ').slice(0, 120);
      return {
        cls: el.className.toString().slice(0, 60),
        op: cs.opacity,
        vis: cs.visibility,
        disp: cs.display,
        y: Math.round(r.top),
        h: Math.round(r.height),
        w: Math.round(r.width),
        x: Math.round(r.left),
        txt,
      };
    });
    // also the img layers inside the stick
    const imgs = [...map.querySelectorAll('.home-map-main-img')].map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { op: cs.opacity, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    });
    steps.push({ p, y: Math.round(y - mapTop), stick: snap, imgs });
  }
  return { mapTop: Math.round(mapTop), mapH: Math.round(mapH), layers, steps };
});
fs.writeFileSync('_local/b4-preview/heron-map-states.json', JSON.stringify(out, null, 1));
console.log('mapTop', out.mapTop, 'mapH', out.mapH, 'layers', out.layers.length, 'steps', out.steps.length);
await browser.close();
