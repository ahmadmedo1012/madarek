import sharp from 'sharp';
import fs from 'node:fs';
const OUT = '/home/z/madarek-wt/c3-h/audits/evidence/r318/ref';
const PAPER = '#F4F4EE';
async function tile(src, w, h, label) {
  const img = await sharp(src).resize(w, h, { fit: 'fill' }).jpeg({ quality: 82 }).toBuffer();
  const svg = Buffer.from(`<svg width="${w}" height="20" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="20" fill="${PAPER}"/><text x="4" y="14" font-family="monospace" font-size="11" fill="#282828">${label}</text></svg>`);
  return sharp({ create: { width: w, height: h + 20, channels: 3, background: PAPER } })
    .composite([{ input: img, top: 0, left: 0 }, { input: svg, top: h, left: 0 }]).jpeg({ quality: 90 }).toBuffer();
}
async function grid(names, labels, tw, th, gap, outName) {
  const cols = 3, rows = Math.ceil(names.length / cols);
  const W = cols * tw + (cols - 1) * gap, Hh = rows * (th + 20) + (rows - 1) * gap;
  const comps = [];
  for (let i = 0; i < names.length; i++) {
    const buf = await tile(`${OUT}/${names[i]}`, tw, th, labels[i]);
    comps.push({ input: buf, left: (i % cols) * (tw + gap), top: Math.floor(i / cols) * (th + 20 + gap) });
  }
  await sharp({ create: { width: W, height: Hh, channels: 3, background: PAPER } }).composite(comps).jpeg({ quality: 70 }).toFile(`${OUT}/${outName}`);
  const kb = Math.round(fs.statSync(`${OUT}/${outName}`).size / 1024);
  console.log(outName, W + 'x' + Hh, kb + 'KB');
}
const p9 = [0, 125, 250, 375, 500, 625, 750, 875, 1000];
const nn = (p) => 'p' + String(p).padStart(3, '0');
await grid(p9.map(p => `map-1440-${nn(p)}.jpg`), p9.map(p => `band ${p / 10}%  y=${Math.round(2358 + 5400 * p / 1000)}`), 480, 300, 8, 'map-states-1440.jpg');
await grid(p9.map(p => `map-390-${nn(p)}.jpg`), p9.map(p => `390 ${p / 10}%`), 130, 281, 6, 'map-states-390.jpg');
// platform: s01 | s02
{
  const a = await tile(`${OUT}/platform-1440-s01.jpg`, 720, 450, 'platform state [01]  y=7765');
  const b = await tile(`${OUT}/platform-1440-s02.jpg`, 720, 450, 'platform state [02]  y=9362');
  await sharp({ create: { width: 1448, height: 470, channels: 3, background: PAPER } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: 728, top: 0 }])
    .jpeg({ quality: 70 }).toFile(`${OUT}/platform-1440.jpg`);
  console.log('platform-1440.jpg', Math.round(fs.statSync(`${OUT}/platform-1440.jpg`).size / 1024) + 'KB');
}
// footer: crop of footer-1440-bottom
await sharp(`${OUT}/footer-1440-bottom.jpg`).extract({ left: 7, top: 183, width: 1427, height: 711 }).jpeg({ quality: 70 }).toFile(`${OUT}/footer-1440.jpg`);
console.log('footer-1440.jpg', Math.round(fs.statSync(`${OUT}/footer-1440.jpg`).size / 1024) + 'KB');
