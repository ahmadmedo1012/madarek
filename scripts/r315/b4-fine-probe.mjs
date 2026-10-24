import { chromium } from 'playwright-core';
import fs from 'node:fs';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const file = process.argv[2];
const b64 = fs.readFileSync(file).toString('base64');
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage();
const out = await page.evaluate(async ({ b64 }) => {
  const img = new Image(); img.src = 'data:image/png;base64,'+b64;
  await new Promise(r => { img.onload = r; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const W = c.width, H = c.height;
  const cols = 24, rows = 16, bw = W/cols, bh = H/rows;
  const grid = [];
  for (let gy = 0; gy < rows; gy++) {
    const line = [];
    for (let gx = 0; gx < cols; gx++) {
      const d = ctx.getImageData(Math.floor(gx*bw), Math.floor(gy*bh), Math.ceil(bw), Math.ceil(bh)).data;
      let ink = 0, red = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        n++;
        if (r < 215 && g < 215 && b < 210) ink++;
        if (r > 170 && g < 120 && b < 100) red++;
      }
      const ik = ink/n, rd = red/n;
      line.push((ik > 0.12 ? '#' : ik > 0.03 ? '+' : ik > 0.004 ? '.' : ' ') + (rd > 0.01 ? 'R' : ''));
    }
    grid.push(line.join(''));
  }
  return {W,H,grid};
}, { b64 });
console.log(out.grid.join('\n'));
await browser.close();
