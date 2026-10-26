/**
 * r320-rename evidence re-encode — PNG → WebP ≤150KB each (c1-RENAME
 * step 5 evidence budget). Chromium page canvas encodes WebP (the
 * playwright screenshot API only does png/jpeg in this build):
 * load the PNG at native size → drawImage → toBlob('image/webp', q),
 * stepping quality down until under budget.
 */
import { createRequire } from 'node:module';
import { readdirSync, statSync, unlinkSync, readFileSync, writeFileSync } from 'node:fs';

const require = createRequire('/home/z/r320-rename/package.json');
const { chromium } = require('playwright-core');

const ROOT = '/home/z/r320-rename/audits/evidence/r320/rename';
const BUDGET = 150 * 1024;
const QUALITY_LADDER = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

const browser = await chromium.launch();
const page = await browser.newPage();

let worst = 0;
for (const phase of ['before', 'after']) {
  const dir = `${ROOT}/${phase}`;
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  for (const f of files) {
    const png = `${dir}/${f}`;
    const buf = readFileSync(png);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    const webp = png.replace(/\.png$/, '.webp');
    let ok = false;
    for (const q of QUALITY_LADDER) {
      const bytes = await page.evaluate(async ([url, qw, qh, quality]) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const canvas = document.createElement('canvas');
        canvas.width = qw; canvas.height = qh;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));
        const arr = new Uint8Array(await blob.arrayBuffer());
        return Array.from(arr);
      }, [dataUrl, w, h, q]);
      const kb = bytes.length;
      worst = Math.max(worst, kb);
      if (kb <= BUDGET) {
        writeFileSync(webp, Buffer.from(bytes));
        console.log(`${phase}/${f.replace('.png','')} ${w}x${h} q${q} → ${(kb / 1024).toFixed(0)}KB`);
        ok = true;
        break;
      }
      if (q === QUALITY_LADDER[QUALITY_LADDER.length - 1]) {
        writeFileSync(webp, Buffer.from(bytes));
        console.log(`⚠ ${webp} still ${(kb / 1024).toFixed(0)}KB at q${q}`);
      }
    }
    if (ok) unlinkSync(png);
  }
}
await browser.close();
console.log(`worst file: ${(worst / 1024).toFixed(0)}KB (budget 150KB)`);
