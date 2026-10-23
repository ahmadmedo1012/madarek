#!/usr/bin/env node
/**
 * R314 §3.2 — Pixel + structural judge.
 * For every aligned frame pair (heron | madarek):
 *  - pixelmatch diff (threshold 0.1), worst-region clustering (grid cells,
 *    ranked by differing area) — the gate is WORST REGION, not global %.
 *  - structural metrics robust to language: per-region ink coverage,
 *    edge density, high-frequency energy (grain), dominant colour ΔE.
 * Writes audits/evidence/r314/_local/judge-report.json + heat diff images.
 * Committed artefact: compact DIFFS-relevant summary only (manifest).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TOOLS = path.resolve(import.meta.dirname, 'tools/node_modules');
const req = (m) => createRequire(path.join(TOOLS, 'noop.js'))(m);
const pixelmatch = req('pixelmatch');
const sharp = req('sharp');

const ROOT = path.resolve(import.meta.dirname, '../..');
const CAP = path.join(ROOT, 'audits/evidence/r314/_local/captures');
const OUT = path.join(ROOT, 'audits/evidence/r314/_local/judge');
fs.mkdirSync(OUT, { recursive: true });

const GRID = 8; // 8x8 cells → worst-region clustering

async function analyze(buf) {
  const img = sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = await img;
  const { width: w, height: h, channels } = info;
  const cells = new Float64Array(GRID * GRID);
  const edges = new Float64Array(GRID * GRID);
  const hf = new Float64Array(GRID * GRID); // high-frequency energy (grain proxy)
  let inkTotal = 0, n = 0;
  const lum = new Float64Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += channels, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum[p] = l;
    if (l < 200) inkTotal++; // dark ink on paper
    n++;
    const cx = Math.min(GRID - 1, Math.floor((p % w) / (w / GRID)));
    const cy = Math.min(GRID - 1, Math.floor(Math.floor(p / w) / (h / GRID)));
    cells[cy * GRID + cx] += l < 200 ? 1 : 0;
  }
  // edge density + HF energy per cell (|laplacian|)
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const p = y * w + x;
      const lap = Math.abs(4 * lum[p] - lum[p - 1] - lum[p + 1] - lum[p - w] - lum[p + w]);
      const cx = Math.min(GRID - 1, Math.floor(x / (w / GRID)));
      const cy = Math.min(GRID - 1, Math.floor(y / (h / GRID)));
      const ci = cy * GRID + cx;
      edges[ci] += lap > 24 ? 1 : 0;
      hf[ci] += lap;
    }
  }
  const cellPx = (w / GRID) * (h / GRID);
  const cellsN = Array.from(cells, (v) => v / cellPx);
  const edgesN = Array.from(edges, (v) => v / cellPx);
  const hfN = Array.from(hf, (v) => v / cellPx);
  // dominant colour: mean of light pixels (paper) + mean of dark pixels (ink)
  let pr = 0, pg = 0, pb = 0, pc = 0, ir = 0, ig = 0, ib = 0, ic = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (l > 180) { pr += r; pg += g; pb += b; pc++; } else { ir += r; ig += g; ib += b; ic++; }
  }
  return {
    w, h, ink: inkTotal / n,
    cells: cellsN, edges: edgesN, hf: hfN,
    paper: pc ? [pr / pc, pg / pc, pb / pc] : [255, 255, 255],
    inkCol: ic ? [ir / ic, ig / ic, ib / ic] : [0, 0, 0],
  };
}

function deltaE(a, b) {
  const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  return d;
}

const viewports = fs.readdirSync(CAP).length ? fs.readdirSync(path.join(CAP, 'heron')) : [];
const report = { generatedAt: new Date().toISOString(), pairs: [] };

for (const vp of viewports) {
  for (const theme of fs.readdirSync(path.join(CAP, 'heron', vp))) {
    const heronDir = path.join(CAP, 'heron', vp, theme);
    const madDir = path.join(CAP, 'madarek', vp, theme);
    if (!fs.existsSync(madDir)) continue;
    const files = fs.readdirSync(heronDir).filter((f) => /^p\d+/.test(f)).sort();
    for (const f of files) {
      if (!fs.existsSync(path.join(madDir, f))) continue;
      const a = fs.readFileSync(path.join(heronDir, f));
      const b = fs.readFileSync(path.join(madDir, f));
      const A = await analyze(a);
      const B = await analyze(b);
      // pixelmatch at common size
      const W = Math.min(A.w, B.w), H = Math.min(A.h, B.h);
      const imgA = await sharp(a).resize(W, H).ensureAlpha().raw().toBuffer();
      const imgB = await sharp(b).resize(W, H).ensureAlpha().raw().toBuffer();
      const diffBuf = Buffer.alloc(W * H * 4);
      const diffPx = pixelmatch(imgA, imgB, diffBuf, W, H, { threshold: 0.1 });
      // worst-region clustering: per-pixel distance mask computed directly
      const dcells = new Float64Array(GRID * GRID);
      for (let p = 0, i = 0; p < W * H; p++, i += 4) {
        const dr = imgA[i] - imgB[i], dg = imgA[i + 1] - imgB[i + 1], db = imgA[i + 2] - imgB[i + 2];
        const dist = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
        if (dist > 60) {
          const x = p % W, y = Math.floor(p / W);
          const cx = Math.min(GRID - 1, Math.floor(x / (W / GRID)));
          const cy = Math.min(GRID - 1, Math.floor(y / (H / GRID)));
          dcells[cy * GRID + cx]++;
        }
      }
      const cellPx = (W / GRID) * (H / GRID);
      const ranked = Array.from(dcells).map((v, i) => ({ cell: i, frac: v / cellPx })).sort((x, y2) => y2.frac - x.frac);
      const worstRegion = ranked[0].frac;
      // structural deltas
      const inkDelta = Math.abs(A.ink - B.ink);
      const cellDeltas = A.cells.map((v, i) => Math.abs(v - B.cells[i]));
      const structWorst = Math.max(...cellDeltas);
      const dEpaper = deltaE(A.paper, B.paper);
      const dEink = deltaE(A.inkCol, B.inkCol);
      const grainDelta = Math.abs(A.hf.reduce((s, v) => s + v, 0) - B.hf.reduce((s, v) => s + v, 0)) / (GRID * GRID);
      await sharp(diffBuf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(OUT, `diff-${vp}-${theme}-${f.replace('.png', '')}.png`));
      report.pairs.push({
        viewport: vp, theme, frame: f,
        globalDiff: +(diffPx / (W * H)).toFixed(4),
        worstRegion: +worstRegion.toFixed(4),
        worstRegions: ranked.slice(0, 3).map((r) => ({ cell: `r${Math.floor(r.cell / GRID)}c${r.cell % GRID}`, frac: +r.frac.toFixed(3) })),
        inkDelta: +inkDelta.toFixed(4), structWorstCell: +structWorst.toFixed(4),
        dEpaper: +dEpaper.toFixed(1), dEink: +dEink.toFixed(1),
        grainDelta: +grainDelta.toFixed(2),
      });
    }
  }
}
report.summary = {
  pairs: report.pairs.length,
  worstRegionAvg: +(report.pairs.reduce((s, p) => s + p.worstRegion, 0) / (report.pairs.length || 1)).toFixed(4),
  globalAvg: +(report.pairs.reduce((s, p) => s + p.globalDiff, 0) / (report.pairs.length || 1)).toFixed(4),
  dEpaperAvg: +(report.pairs.reduce((s, p) => s + p.dEpaper, 0) / (report.pairs.length || 1)).toFixed(1),
};
fs.writeFileSync(path.join(OUT, 'judge-report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.summary));
const worst = [...report.pairs].sort((a, b) => b.worstRegion - a.worstRegion).slice(0, 8);
for (const w of worst) console.log(`  ${w.viewport} ${w.theme} ${w.frame}: worstRegion=${(w.worstRegion * 100).toFixed(1)}% global=${(w.globalDiff * 100).toFixed(1)}% dEpaper=${w.dEpaper}`);
