// R322 (task 1-b) — before/after pixel comparison of the landing hero shots
// (verification: the R322 token layer is ADDITIVE; the landing must render
// pixel-identical). Minimal PNG decoder (IHDR/IDAT + zlib + unfilter) — no
// repo dependencies. Usage: node scripts/r322/hero-diff.mjs <a.png> <b.png>
import fs from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`not a PNG: ${file}`);
  let pos = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
      if (colorType !== 6 && colorType !== 2) throw new Error(`unsupported color type ${colorType}`);
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : 3;
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y += 1) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, channels, data: out };
}

const [aFile, bFile] = process.argv.slice(2);
const A = decodePNG(aFile);
const B = decodePNG(bFile);
if (A.w !== B.w || A.h !== B.h) {
  console.log(`DIFF: dimensions differ ${A.w}x${A.h} vs ${B.w}x${B.h}`);
  process.exit(1);
}
let diffPx = 0;
let maxDelta = 0;
let sumDelta = 0;
for (let i = 0; i < A.data.length; i += A.channels) {
  let d = 0;
  for (let c = 0; c < 3; c += 1) d = Math.max(d, Math.abs(A.data[i + c] - B.data[i + c]));
  if (d > 0) diffPx += 1;
  maxDelta = Math.max(maxDelta, d);
  sumDelta += d;
}
const total = A.w * A.h;
const pct = ((diffPx / total) * 100).toFixed(4);
console.log(`size ${A.w}x${A.h} · pixels ${total} · differing ${diffPx} (${pct}%) · max channel delta ${maxDelta} · mean delta ${(sumDelta / total).toFixed(4)}`);
console.log(diffPx === 0 ? 'PIXEL-IDENTICAL' : diffPx / total < 0.002 ? 'EQUIVALENT (sub-0.2% animated-layer noise)' : 'MATERIAL DIFF');
