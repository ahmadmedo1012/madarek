#!/usr/bin/env node
/**
 * 6-i (WP-I) visual pairs — R313 after vs reference composites.
 * For scroll ratios 0/25/50/75/100% (frames f00/f05/f10/f15/f20):
 * render reference + after side by side (50% width each) into one JPEG
 * composite, and compute STRUCTURAL metrics per side (band ink profile,
 * edge density, dominant colours) for the manifest. Content differs by
 * design (Madarek's own copy) — only STRUCTURE/GEOMETRY/COLOUR/TYPE are
 * compared.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const REPO = '/home/z/madarek';
const REF = path.join(REPO, 'audits/evidence/r313/reference/primary/frames');
const AFT = path.join(REPO, 'audits/evidence/r313/after/primary/frames');
const OUT = path.join(REPO, 'audits/evidence/r313/after');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchBrowser() {
  try { return await chromium.launch({ headless: true }); }
  catch (e) {
    const cacheDir = path.join(process.env.HOME, '.cache/ms-playwright');
    const dirs = fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter((d) => d.startsWith('chromium-')).sort() : [];
    for (const d of dirs) {
      for (const p of [`${cacheDir}/${d}/chrome-linux/chrome`, `${cacheDir}/${d}/chrome-linux/headless_shell`]) {
        if (fs.existsSync(p)) return await chromium.launch({ headless: true, executablePath: p });
      }
    }
    throw e;
  }
}

const MEASURE = (imgEl) => {
  const cv = document.createElement('canvas');
  const W = 240, H = 150; /* analysis grid */
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.drawImage(imgEl, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  /* band ink profile: fraction of pixels darker than paper-contrast per horizontal band */
  const bands = 12, cols = 12;
  const bandInk = new Array(bands).fill(0), colInk = new Array(cols).fill(0), bandEdge = new Array(bands).fill(0);
  const colors = {};
  let paper = 0, total = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const L = lum(i);
    total++;
    if (L > 228) paper++;
    const key = `${Math.round(d[i] / 32) * 32},${Math.round(d[i + 1] / 32) * 32},${Math.round(d[i + 2] / 32) * 32}`;
    colors[key] = (colors[key] || 0) + 1;
    if (L < 190) { bandInk[Math.floor((y / H) * bands)]++; colInk[Math.floor((x / W) * cols)]++; }
  }
  /* edge density per band (horizontal gradient) */
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4;
    const gx = Math.abs(lum(i) - lum(i + 4));
    if (gx > 28) bandEdge[Math.floor((y / H) * bands)]++;
  }
  const topColors = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => [c, Math.round((n / total) * 1000) / 10]);
  const pct = (a) => a.map((v) => Math.round((v / (total / bands)) * 1000) / 10);
  return {
    paperPct: Math.round((paper / total) * 1000) / 10,
    bandInkPct: pct(bandInk),
    colInkPct: pct(colInk),
    bandEdgePct: pct(bandEdge),
    topColors,
  };
};
globalThis.__measure = MEASURE;

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  const pairs = [
    { ratio: 0, ref: 'f00.jpg', aft: 'f00.jpg' },
    { ratio: 25, ref: 'f05.jpg', aft: 'f05.jpg' },
    { ratio: 50, ref: 'f10.jpg', aft: 'f10.jpg' },
    { ratio: 75, ref: 'f15.jpg', aft: 'f15.jpg' },
    { ratio: 100, ref: 'f20.jpg', aft: 'f20.jpg' },
  ];
  const manifest = [];
  for (const p of pairs) {
    const refPath = path.join(REF, p.ref);
    const aftPath = path.join(AFT, p.aft);
    const b64 = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
    const html = `<!doctype html><html><body style="margin:0;background:#fff">
      <div style="display:flex;align-items:flex-start;gap:4px">
        <div style="width:732px"><div style="font:12px monospace;background:#000;color:#fff;padding:2px 6px">REFERENCE (heron) @${p.ratio}%</div><img src="${b64(refPath)}" style="width:730px;display:block"></div>
        <div style="width:732px"><div style="font:12px monospace;background:#FA3600;color:#fff;padding:2px 6px">MADAREK (after) @${p.ratio}%</div><img src="${b64(aftPath)}" style="width:730px;display:block"></div>
      </div></body></html>`;
    await page.setContent(html, { waitUntil: 'load' });
    await sleep(350);
    await page.screenshot({ path: path.join(OUT, `pair-${String(p.ratio).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 78, fullPage: true });
    const metrics = await page.evaluate(() => {
      const MEASURE = (imgEl) => {
        const cv = document.createElement('canvas');
        const W = 240, H = 150;
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        ctx.drawImage(imgEl, 0, 0, W, H);
        const d = ctx.getImageData(0, 0, W, H).data;
        const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        const bands = 12, cols = 12;
        const bandInk = new Array(bands).fill(0), colInk = new Array(cols).fill(0), bandEdge = new Array(bands).fill(0);
        const colors = {};
        let paper = 0, total = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const L = lum(i);
          total++;
          if (L > 228) paper++;
          const key = `${Math.round(d[i] / 32) * 32},${Math.round(d[i + 1] / 32) * 32},${Math.round(d[i + 2] / 32) * 32}`;
          colors[key] = (colors[key] || 0) + 1;
          if (L < 190) { bandInk[Math.floor((y / H) * bands)]++; colInk[Math.floor((x / W) * cols)]++; }
        }
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4;
          const gx = Math.abs(lum(i) - lum(i + 4));
          if (gx > 28) bandEdge[Math.floor((y / H) * bands)]++;
        }
        const topColors = Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => [c, Math.round((n / total) * 1000) / 10]);
        const pct = (a) => a.map((v) => Math.round((v / (total / bands)) * 1000) / 10);
        return {
          paperPct: Math.round((paper / total) * 1000) / 10,
          bandInkPct: pct(bandInk),
          colInkPct: pct(colInk),
          bandEdgePct: pct(bandEdge),
          topColors,
        };
      };
      const imgs = [...document.querySelectorAll('img')];
      return { ref: MEASURE(imgs[0]), aft: MEASURE(imgs[1]) };
    });
    /* structural similarity of band/col profiles */
    const cos = (a, b) => {
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
      return na && nb ? Math.round((dot / Math.sqrt(na * nb)) * 1000) / 1000 : null;
    };
    manifest.push({
      ratio: p.ratio,
      composite: `pair-${String(p.ratio).padStart(3, '0')}.jpg`,
      bandProfileCosine: cos(metrics.ref.bandInkPct, metrics.aft.bandInkPct),
      colProfileCosine: cos(metrics.ref.colInkPct, metrics.aft.colInkPct),
      edgeProfileCosine: cos(metrics.ref.bandEdgePct, metrics.aft.bandEdgePct),
      ref: metrics.ref,
      aft: metrics.aft,
    });
    console.log(`[pair ${p.ratio}%] bandCos=${manifest.at(-1).bandProfileCosine} colCos=${manifest.at(-1).colProfileCosine} edgeCos=${manifest.at(-1).edgeProfileCosine} paper ${metrics.ref.paperPct}/${metrics.aft.paperPct}`);
  }
  fs.writeFileSync(path.join(OUT, 'pairs-manifest.json'), JSON.stringify(manifest, null, 1));
  await browser.close();
  console.log('[pairs] DONE');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
