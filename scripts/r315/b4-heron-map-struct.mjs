/** B4 helper — structural dump of Heron's home-map section: every
 * descendant block (not path/svg text) with its doc offset, height,
 * position and text — so the band's sub-scene composition (what pins
 * where, for how long) reads off directly. One load. */
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
  const wrapTop = wrap.getBoundingClientRect().top;
  const mapTop = map.getBoundingClientRect().top - wrapTop + wrap.scrollTop;
  const rows = [];
  const walk = (el, depth) => {
    for (const c of el.children) {
      const tag = c.tagName.toLowerCase();
      if (tag === 'path' || tag === 'svg' || tag === 'g' || tag === 'line' || tag === 'circle' || tag === 'rect') continue;
      const cs = getComputedStyle(c);
      const r = c.getBoundingClientRect();
      const top = r.top - wrapTop + wrap.scrollTop - mapTop;
      const txt = (c.innerText || '').replace(/\s+/g, ' ').trim();
      rows.push({
        depth,
        tag,
        cls: (c.className.toString() || '').slice(0, 70),
        top: Math.round(top),
        h: Math.round(r.height),
        w: Math.round(r.width),
        pos: cs.position,
        disp: cs.display,
        z: cs.zIndex,
        txt: txt.slice(0, 100),
      });
      if (depth < 6) walk(c, depth + 1);
    }
  };
  walk(map, 0);
  return { mapTop: Math.round(mapTop), rows };
});
fs.writeFileSync('_local/b4-preview/heron-map-struct.json', JSON.stringify(out, null, 1));
console.log('rows', out.rows.length);
await browser.close();
