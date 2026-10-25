// R318 C3-H retry — builds statement-1440.jpg (statement band sheet) + map-states-768.jpg (tablet sheet)
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
// statement-1440.jpg — full band + illustration detail (sun disc + facade)
{
  const a = await tile(`${OUT}/intro-band-1440-top.jpg`, 956, 597, 'statement band home-intro @1440 band-top');
  const illus = await sharp(`${OUT}/intro-band-1440-top.jpg`).extract({ left: 7, top: 0, width: 713, height: 723 }).toBuffer();
  const b = await tile(illus, 486, 492, 'detail: solid #FA3600 sun disc ~243px + hatched facade');
  await sharp({ create: { width: 1450, height: 617, channels: 3, background: PAPER } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: 956 + 8, top: 0 }])
    .jpeg({ quality: 70 }).toFile(`${OUT}/statement-1440.jpg`);
  console.log('statement-1440.jpg', Math.round(fs.statSync(`${OUT}/statement-1440.jpg`).size / 1024) + 'KB');
}
// map-states-768.jpg — 5 tablet states
{
  const p5 = [['p000', 2876], ['p250', 3988], ['p500', 5101], ['p750', 6213], ['p1000', 7325]];
  const comps = [];
  for (let i = 0; i < p5.length; i++) {
    const buf = await tile(`${OUT}/map-768-${p5[i][0]}.jpg`, 260, 347, `768x1024 band ${p5[i][0].slice(1) / 10}% y=${p5[i][1]}`);
    comps.push({ input: buf, left: (i % 3) * (260 + 6), top: Math.floor(i / 3) * (347 + 20 + 6) });
  }
  await sharp({ create: { width: 3 * 260 + 2 * 6, height: 2 * (347 + 20) + 6, channels: 3, background: PAPER } })
    .composite(comps).jpeg({ quality: 70 }).toFile(`${OUT}/map-states-768.jpg`);
  console.log('map-states-768.jpg', Math.round(fs.statSync(`${OUT}/map-states-768.jpg`).size / 1024) + 'KB');
}
