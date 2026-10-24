/** B4 helper — coarse composition probe of a screenshot frame.
 * Grids the image into blocks and reports: dark-pixel density, red-pixel
 * density (#FA3600 family), and mean color — enough to locate the plan,
 * the dark INTRODUCTION card, and the solid red rooms in a frame. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const file = process.argv[2];
const cols = Number(process.argv[3] ?? 12);
const rows = Number(process.argv[4] ?? 12);
const b64 = fs.readFileSync(file).toString('base64');
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage();
const out = await page.evaluate(async ({ b64, cols, rows }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await new Promise((r) => { img.onload = r; img.onerror = r; });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const W = c.width, H = c.height;
  const bw = Math.floor(W / cols), bh = Math.floor(H / rows);
  const grid = [];
  for (let gy = 0; gy < rows; gy++) {
    const line = [];
    for (let gx = 0; gx < cols; gx++) {
      const d = ctx.getImageData(gx * bw, gy * bh, bw, bh).data;
      let dark = 0, red = 0, sr = 0, sg = 0, sb = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        sr += r; sg += g; sb += b; n++;
        if (r < 100 && g < 100 && b < 100) dark++;
        if (r > 180 && g < 110 && b < 90) red++;
      }
      line.push({ d: +(dark / n).toFixed(3), r: +(red / n).toFixed(3), m: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)].join(',') });
    }
    grid.push(line);
  }
  return { W, H, grid };
}, { b64, cols, rows });
await browser.close();
console.log(JSON.stringify(out, null, 0));
