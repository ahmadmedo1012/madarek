#!/usr/bin/env node
/** r321-tick.mjs — pixel-level hunt for the orange tick at (0,0):
 *  screenshots the top-left 40×40 of several routes at several states
 *  (fresh load, after scroll) and reports any non-paper pixel with its
 *  colour, plus which element covers it. */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await chromium.launch();
const report = [];

for (const route of ['/', '/500', '/legal/privacy', '/auth']) {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const states = { top: null };
    if (route === '/') {
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(300);
      states.scrolled = null;
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
    }
    for (const state of Object.keys(states)) {
      const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 40, height: 40 } });
      const { createCanvas } = await import('canvas').catch(() => ({}));
      // decode via sharp (available in the repo root deps? fall back to pngjs)
      let pixels;
      try {
        const sharp = (await import('sharp')).default;
        const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
        pixels = { data, info };
      } catch {
        const { PNG } = await import('pngjs');
        const png = PNG.sync.read(buf);
        pixels = { data: png.data, info: { width: png.width, height: png.height } };
      }
      const found = [];
      const { data, info } = pixels;
      for (let y = 0; y < Math.min(14, info.height); y++) {
        for (let x = 0; x < Math.min(14, info.width); x++) {
          const i = (y * info.width + x) * (info.channels || 4);
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          // paper is ~(246,246,238) light / ~(40,40,40) dark; ink hairlines
          // are grey. Report anything strongly warm/orange or clearly not
          // paper/ink-family in the top-left corner.
          const warm = r > 140 && r - b > 40 && g < r - 20;
          if (warm) found.push({ x, y, rgb: [r, g, b] });
        }
      }
      if (found.length) {
        const el = await page.evaluate(([px, py]) => {
          const e = document.elementFromPoint(px, py);
          return e ? `${e.tagName}.${String(e.className).slice(0, 40)}` : 'none';
        }, [found[0].x + 0.5, found[0].y + 0.5]);
        report.push({ route, vp: w, state, count: found.length, first: found[0], el });
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(JSON.stringify(report, null, 1) || '[]');
console.log(report.length ? 'TICK FOUND' : 'NO WARM PIXEL IN TOP-LEFT 14×14');
