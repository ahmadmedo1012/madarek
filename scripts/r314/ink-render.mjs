#!/usr/bin/env node
/**
 * R314 §3-a — ink-render.mjs (fresh rewrite, task 3-a)
 *
 * Reproducible photo → "rich tonal pencil/ink architectural rendering" pipeline.
 * Renders Madarek's own Commons-licensed campus photos into grayscale WebP
 * artwork — solid XDoG ink strokes, broken hand-wobbled cross-hatch mid-tones,
 * clustered stippled deep shadows, subtle graphite wash, paper-white sky.
 *
 * Design notes (what makes it read as a DRAWING, not a filter):
 *   • TONAL LADDER — a graphite wash layer fills mid-tones with real grays
 *     (paper-white → wash → light hatch → cross-hatch → stipple → solid ink),
 *     so the result has a full value range instead of binary black/white.
 *   • BROKEN HATCH — hatch "lines" are dashed strokes with per-segment alpha,
 *     tapered ends, per-line jitter and two-frequency hand wobble; the second
 *     (135°) direction uses a different spacing, so no moiré/diamond mesh.
 *   • GRADED STROKES — XDoG contours get a value hierarchy: bold structure
 *     edges render near #0A0A0A, secondary edges render as gray pencil lines,
 *     then are dilated to a solid 2–4px weight at 1600px reference width.
 *   • CLUSTERED STIPPLE — dot density ∝ darkness, modulated by low-frequency
 *     noise so dots cluster the way a hand clusters them; dot value darkens
 *     with zone darkness.
 *   • DETAIL-GATED LAYERS — noisy/organic zones (foliage) get stipple instead
 *     of straight hatch; flat sky is flood-filled to pure paper white.
 *
 * Everything is deterministic (seeded PRNG, ordered loops); re-running
 * reproduces byte-identical WebP output.
 *
 * No new npm deps — sharp loads from scripts/r314/tools/node_modules.
 *
 * Usage:
 *   node scripts/r314/ink-render.mjs [--only hero|crop-garyounis-1|…]
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/z/madarek';
const MEDIA = path.join(ROOT, 'frontend/public/media');
const OUT_DIR = path.join(MEDIA, 'renders');

const require = createRequire(path.join(ROOT, 'scripts/r314/tools/'));
const sharp = require('sharp');

// ---------------------------------------------------------------------------
// tunables — single source of truth (mirrored in renders/README.md)
// sigma/spacing/width values are px at a 1600px RENDER width, scaled by k = w/1600
// ---------------------------------------------------------------------------
const P = {
  // denoise: gaussian σ (×k) after sharp median(3) — kills webp/sensor noise
  denoise: 1.4,
  // local contrast: high-pass gain against a large blur
  lc: { sigmaDiv: 38, gain: 1.5 },
  // XDoG — σ2 = 1.6·σ1, τ ("p") = 25, soft-threshold at eps, dilated to weight
  xdog: { sigma1: 1.0, ratio: 1.6, tau: 25, eps: 30, phi: 1.1, dilate: 1,
          gateRel: 1.0, gateMin: 0.8, gateMax: 5.0, brightShare: 0.55, shadowSoften: 0.4 },
  // tone layer (drives wash / hatch / stipple decisions) — γ > 1 LIFTS shadows
  // the way a draftsman compresses values (dark walls = rich dark hatch, not void)
  tone: { loPct: 0.02, hiPct: 0.98, smooth: 2.0, gamma: 1.9, contrast: 1.05, skyCut: 240 },
  // detail energy (structure gate for strokes, hatch, background detection)
  detail: { blur: 1.5, avgSigma: 5, bgDetThr: 7.0, hatchDetK: 9, scribLo: 6.0, scribHi: 12.0 },
  // graphite wash: light gray under mid/dark tones (fills the tonal ladder)
  wash: { top: 240, floorT: 90, floorV: 175 },
  // cross-hatch: mid-tones L 90–216. spacing 6px (dark) → 14px (light) at 1600w.
  // lines are pencil-gray, broken into long dashes with tapered ends; the
  // second direction (135°) is slightly sparser so the weave stays visible.
  hatch: {
    lo: 90, hi: 210,
    spacingDark: 12, spacingLight: 18,
    widthLight: 1.6, widthDark: 2.2,
    valLight: 150, valDark: 72,
    crossAt: 0.32, crossSpacingMul: 1.18,
    wobble1: 0.4, wobble2: 0.3,
    dashMin: 8, dashMax: 18,    // dash length in units of spacing
    gapP: 0.10,                 // fraction of dashes fully lifted (skipped)
  },
  // stipple: darkest zones, density ∝ darkness, clustered by low-freq noise.
  // kept as an ACCENT (visible paper between dots) — dense dot fields read as
  // digital noise, not as hand stippling
  stipple: { thr: 80, tail: 135, tailP: 0.035,
             minP: 0.06, maxP: 0.15,
             valHi: 160, valLo: 60,
             dotMin: 0.9, dotMax: 2.6,
             clusterCell: 34, clusterAmt: 0.5 },
  // background/sky: border flood-fill over (bright ∧ smooth) → pure white
  bg: { toneThr: 200 },
  // paper tooth on near-whites
  grain: { p: 0.035, amt: 7 },
  webpQuality: 82,
  finalGain: 1.05,  // gentle output S-slope ("contrast-boosted")
  blackFloor: 10,   // deepest black = #0A0A0A
};

// per-job overrides (hero source is upscaled ~2.15× → needs stronger smoothing
// and a slightly larger XDoG σ so strokes follow structure, not upscale mush)
const OVERRIDES = {
  /* R314 foreman tune (VLM round 2): the reference hero reads CRISP —
   * deep ink blacks, controlled stipple — not a soft pencil sketch.
   * Lower γ keeps the shadow mass DEEP (γ>1 lifts shadows), a stronger
   * tone curve snaps the range, and the wash floor drops so mid-tones
   * sit darker against paper. Source swapped to uob-1600 (the single
   * admin-building mass — the panorama read as a wide landscape). */
  hero: {
    denoise: 2.8,
    xdog: { sigma1: 1.25, dilate: 1 },
    tone: { gamma: 1.45, contrast: 1.3, loPct: 0.02, hiPct: 0.98, smooth: 2.0, skyCut: 240 },
    wash: { top: 240, floorT: 90, floorV: 150 },
  },
};

// ---------------------------------------------------------------------------
// deterministic randomness
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash01(n, salt) {
  let h = (Math.imul(n | 0, 2654435761) + Math.imul(salt | 0, 40503)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// float blurs (deterministic, no 8-bit round-trips inside the XDoG math)
// ---------------------------------------------------------------------------
function gaussKernel(sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + r] = v; s += v; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  return { k, r };
}
function convSep(src, w, h, kern) {
  const { k, r } = kern;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  // border handling: clamp + RENORMALISE the actually-used kernel taps
  // (unrenormalised truncation darkens the outer ring toward black, which
  // fakes a dark noisy frame and breaks the sky flood-fill)
  for (let y = 0; y < h; y++) {
    const off = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0, wsum = 0;
      const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
      for (let i = x0; i <= x1; i++) { const kk = k[i - x + r]; acc += kk * src[off + i]; wsum += kk; }
      tmp[off + x] = acc / wsum;
    }
  }
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      let acc = 0, wsum = 0;
      for (let i = y0; i <= y1; i++) { const kk = k[i - y + r]; acc += kk * tmp[i * w + x]; wsum += kk; }
      out[y * w + x] = acc / wsum;
    }
  }
  return out;
}
function box1D(src, dst, w, h, r, horizontal) {
  const n = 2 * r + 1;
  if (horizontal) {
    for (let y = 0; y < h; y++) {
      const off = y * w;
      let sum = src[off] * (r + 1);
      for (let i = 1; i <= r; i++) sum += src[off + Math.min(w - 1, i)];
      for (let x = 0; x < w; x++) {
        dst[off + x] = sum / n;
        sum += src[off + Math.min(w - 1, x + r + 1)] - src[off + Math.max(0, x - r)];
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let sum = src[x] * (r + 1);
      for (let i = 1; i <= r; i++) sum += src[Math.min(h - 1, i) * w + x];
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum / n;
        sum += src[Math.min(h - 1, y + r + 1) * w + x] - src[Math.max(0, y - r) * w + x];
      }
    }
  }
}
function blur(src, w, h, sigma) {
  if (sigma < 0.35) return Float32Array.from(src);
  if (sigma <= 4) return convSep(src, w, h, gaussKernel(sigma));
  // ≥4: 3× box-blur approximation of a Gaussian (O(N) running sums)
  const n = Math.max(3, Math.round(Math.sqrt(4 * sigma * sigma + 1)));
  const r = (n - 1) >> 1;
  let a = Float32Array.from(src);
  let b = new Float32Array(a.length);
  for (let it = 0; it < 3; it++) { box1D(a, b, w, h, r, true); box1D(b, a, w, h, r, false); }
  return a;
}
// separable min-filter (erode) — used for stroke opening (kills speckle)
function erodeMin(src, w, h, r) {
  if (r <= 0) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const off = y * w;
    for (let x = 0; x < w; x++) {
      let m = Infinity;
      const x1 = Math.min(w - 1, x + r);
      for (let i = Math.max(0, x - r); i <= x1; i++) { const v = src[off + i]; if (v < m) m = v; }
      tmp[off + x] = m;
    }
  }
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      let m = Infinity;
      for (let i = y0; i <= y1; i++) { const v = tmp[i * w + x]; if (v < m) m = v; }
      out[y * w + x] = m;
    }
  }
  return out;
}

// separable max-filter — dilates stroke ink by r px (stroke WEIGHT)
function dilateMax(src, w, h, r) {
  if (r <= 0) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const off = y * w;
    for (let x = 0; x < w; x++) {
      let m = 0;
      const x1 = Math.min(w - 1, x + r);
      for (let i = Math.max(0, x - r); i <= x1; i++) { const v = src[off + i]; if (v > m) m = v; }
      tmp[off + x] = m;
    }
  }
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let i = y0; i <= y1; i++) { const v = tmp[i * w + x]; if (v > m) m = v; }
      out[y * w + x] = m;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// input: focal cover-crop → grayscale pixels
// (extract in SOURCE space, then resize; median(3) kills webp edge ringing)
// ---------------------------------------------------------------------------
async function loadGray(srcPath, tw, th, fx, fy) {
  const meta = await sharp(srcPath).metadata();
  const W = meta.width, H = meta.height;
  const s = Math.max(tw / W, th / H);
  const rw = Math.min(W, Math.round(tw / s));
  const rh = Math.min(H, Math.round(th / s));
  const x0 = Math.min(W - rw, Math.max(0, Math.round(fx * W - rw / 2)));
  const y0 = Math.min(H - rh, Math.max(0, Math.round(fy * H - rh / 2)));
  const buf = await sharp(srcPath)
    .flatten({ background: '#ffffff' })
    .extract({ left: x0, top: y0, width: rw, height: rh })
    .resize(tw, th, { kernel: 'lanczos3' })
    .median(3)
    .grayscale()
    .raw()
    .toBuffer();
  if (buf.length !== tw * th) throw new Error(`loadGray channel mismatch: ${buf.length} ≠ ${tw * th}`);
  if (process.env.DBG) {
    let s = 0; for (let x = 0; x < tw; x++) s += buf[x];
    console.log(`   DBG loadGray ${W}×${H} -> crop ${rw}×${rh} @(${x0},${y0}) -> ${tw}×${th}; row0 mean ${(s / tw).toFixed(1)}`);
  }
  return { data: buf, w: tw, h: th };
}

// percentile stretch (2%..98%) → Float32 [0..255].
// optional mask: histogram counts only unmasked (subject) pixels — exposure is
// set for the subject, never dragged by a hazy sky filling half the frame.
function stretch(L, w, h, loPct, hiPct, mask) {
  const n = w * h;
  const hist = new Uint32Array(256);
  let count = 0;
  for (let i = 0; i < n; i++) { if (mask && mask[i]) continue; hist[L[i]]++; count++; }
  if (count < n * 0.2) {
    mask = null; hist.fill(0);
    for (let i = 0; i < n; i++) hist[L[i]]++;
    count = n;
  }
  const loN = Math.floor(count * loPct), hiN = Math.ceil(count * hiPct);
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= loN) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= count - hiN) { hi = v; break; } }
  if (hi - lo < 24) { lo = Math.max(0, lo - 12); hi = Math.min(255, hi + 12); }
  const scale = 255 / (hi - lo);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = (L[i] - lo) * scale;
    out[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return { img: out, lo, hi };
}

// background flood fill seeded from a border band (sky/plaza → paper white).
// adaptive thresholds probed on the top rows: tone from the sky's median
// brightness, detail from the sky's own noise level.
function backgroundMask(detAvg, tone, w, h, detP90Subject) {
  const n = w * h;
  const probeRows = Math.max(2, Math.round(h * 0.08));
  const dVals = [], lVals = [];
  for (let y = 0; y < probeRows; y += 2) {
    for (let x = 0; x < w; x += 4) { dVals.push(detAvg[y * w + x]); lVals.push(tone[y * w + x]); }
  }
  dVals.sort((a, b) => a - b); lVals.sort((a, b) => a - b);
  const skyDetP50 = dVals[dVals.length >> 1];
  const skyDetP90 = dVals[Math.floor(dVals.length * 0.9)];
  const skyMedian = lVals[lVals.length >> 1];

  let toneThr = P.bg.toneThr;
  if (skyMedian >= 150 && skyMedian < 215) toneThr = Math.max(120, skyMedian - 12);

  let detThr = P.detail.bgDetThr;
  if (skyDetP50 < 3.5) detThr = Math.min(13, Math.max(P.detail.bgDetThr, skyDetP90 * 1.2 + 2));
  detThr = Math.min(detThr, 2.2 * detP90Subject); // never eat the subject

  const bg = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const push = (i) => { if (!bg[i] && detAvg[i] < detThr && tone[i] > toneThr) { bg[i] = 1; stack[sp++] = i; } };
  const band = 6;
  for (let y = 0; y < h; y++) for (let bx = 0; bx < band; bx++) { push(y * w + bx); push(y * w + w - 1 - bx); }
  for (let x = 0; x < w; x++) for (let by = 0; by < band; by++) { push(by * w + x); push((h - 1 - by) * w + x); }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  // dilate 2px to absorb residual ringing on the image border
  let cur = bg;
  for (let it = 0; it < 2; it++) {
    const dil = new Uint8Array(cur);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (cur[i]) continue;
      if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) || (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) dil[i] = 1;
    }
    cur = dil;
  }
  return { bg: cur, skyMedian, toneThr, detThr };
}

// ---------------------------------------------------------------------------
// hatch: one direction at a fixed angle. returns ink darkness ∈ [0..1]
// (0 = paper, 1 = full line value). Lines are BROKEN into dashes with
// per-segment alpha + tapered ends + two-frequency hand wobble.
// ---------------------------------------------------------------------------
function hatchInk(u, along, spacing, hw, salt, w1, w2) {
  const lineIdx = Math.floor(u / spacing);
  const phase = 6.2831853 * hash01(lineIdx, salt + 7);
  const jitter = (hash01(lineIdx, salt) - 0.5) * 2 * 0.16 * spacing;
  // hand wobble: slow drift + faster tremor (bends the ruled line)
  const uu = u + jitter + w1 * Math.sin(0.046 * along + phase) + w2 * Math.sin(0.017 * along + phase * 0.7);
  let r = uu % spacing;
  if (r < 0) r += spacing;
  const dist = Math.min(r, spacing - r);
  const cov = hw + 0.5 - dist;
  if (cov <= 0) return 0;
  // dash structure: segment length varies per line; some segments lifted
  const segLen = spacing * (P.hatch.dashMin + (P.hatch.dashMax - P.hatch.dashMin) * hash01(lineIdx, salt + 3));
  const seg = Math.floor(along / segLen);
  const a = hash01(lineIdx * 131 + seg, salt + 5);
  if (a < P.hatch.gapP) return 0;
  // taper inside the segment (soft stroke ends), per-segment pressure
  const frac = (along - seg * segLen) / segLen;
  const taper = Math.min(1, Math.min(frac, 1 - frac) / 0.14);
  const pressure = 0.55 + 0.45 * a;
  const shape = (cov > 1 ? 1 : cov) * (0.25 + 0.75 * taper) * pressure;
  return shape < 0 ? 0 : shape > 1 ? 1 : shape;
}

// ---------------------------------------------------------------------------
// main render
// ---------------------------------------------------------------------------
async function renderInk(job, primary) {
  const t0 = Date.now();
  const ov = OVERRIDES[job.id] || {};
  const srcPath = path.join(ROOT, job.src);
  const { data: L, w, h } = await loadGray(srcPath, primary.w, primary.h, job.focal[0], job.focal[1]);
  const n = w * h;
  const k = w / 1600;                 // stroke/texture scale vs 1600px reference
  const kTex = Math.min(1.4, Math.max(0.85, k));
  const denoise = ov.denoise ?? P.denoise;
  const ovX = { ...P.xdog, ...(ov.xdog || {}) };
  const sigma1 = ovX.sigma1 * k;

  // ---- PASS A: global normalisation + background (sky) detection
  const strA = stretch(L, w, h, P.tone.loPct, P.tone.hiPct);
  const LnA = blur(strA.img, w, h, denoise * k);
  if (process.env.DBG) {
    console.log(`   DBG strA lo=${strA.lo} hi=${strA.hi} buf[0]=${L[0]} strImg[0]=${strA.img[0].toFixed(0)} LnA[0]=${LnA[0].toFixed(0)} LnA[10*w]=${LnA[10 * w].toFixed(0)}`);
  }
  const detAK = blur(LnA, w, h, P.detail.blur * k);
  const detA = new Float32Array(n);
  for (let i = 0; i < n; i++) detA[i] = Math.abs(LnA[i] - detAK[i]);
  const detAvgA = blur(detA, w, h, P.detail.avgSigma * k);
  const LtA = blur(LnA, w, h, P.tone.smooth * k);
  const dSortA = Float32Array.from(detAvgA).sort();
  const detP90SubjectA = dSortA.subarray(Math.floor(n * 0.25))[Math.floor(n * 0.75 * 0.9)];
  const { bg, skyMedian, toneThr, detThr } = backgroundMask(detAvgA, LtA, w, h, detP90SubjectA);
  let bgCount = 0;
  for (let i = 0; i < n; i++) bgCount += bg[i];
  if (process.env.DBG) {
    let bandPass = 0, bandTot = 0, detMax = 0;
    for (let y = 0; y < 6; y++) for (let x = 0; x < w; x++) {
      bandTot++; const d = detAvgA[y * w + x]; detMax = Math.max(detMax, d);
      if (d < detThr && LtA[y * w + x] > toneThr) bandPass++;
    }
    const lTop = [], dTop = [];
    for (let y = 0; y < 85; y += 2) for (let x = 0; x < w; x += 4) { lTop.push(LtA[y * w + x]); dTop.push(detAvgA[y * w + x]); }
    lTop.sort((a, b) => a - b); dTop.sort((a, b) => a - b);
    console.log(`   DBG bandPass=${bandPass}/${bandTot} detMaxBorder=${detMax.toFixed(2)} toneRow0=${LtA[0].toFixed(0)} detThr=${detThr.toFixed(2)} toneThr=${toneThr}`);
    console.log(`   DBG top85 tone p10/50/90 = ${lTop[lTop.length * 0.1 | 0].toFixed(0)}/${lTop[lTop.length * 0.5 | 0].toFixed(0)}/${lTop[lTop.length * 0.9 | 0].toFixed(0)}  det p50/90 = ${dTop[dTop.length * 0.5 | 0].toFixed(2)}/${dTop[dTop.length * 0.9 | 0].toFixed(2)}`);
  }

  // ---- PASS B: subject-relative tonal mapping (sky excluded from histogram)
  const stretchInfo = stretch(L, w, h, P.tone.loPct, P.tone.hiPct, bg);
  const Ln = blur(stretchInfo.img, w, h, denoise * k);

  // local contrast boost (high-pass) → XDoG input
  const B = blur(Ln, w, h, Math.max(6, w / P.lc.sigmaDiv));
  const HP = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = 128 + (Ln[i] - B[i]) * P.lc.gain;
    HP[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }

  // XDoG → stroke strength ∈ [0..1]
  const s2 = sigma1 * ovX.ratio;
  const G1 = blur(HP, w, h, sigma1);
  const G2 = blur(HP, w, h, s2);
  const str = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const S = G1[i] + ovX.tau * (G1[i] - G2[i]);
    const v = 0.5 * (1 + Math.tanh(ovX.phi * (S - ovX.eps))); // 1 paper … 0 ink
    str[i] = 1 - v;
  }

  // detail energy map (structure gates)
  const detK = blur(Ln, w, h, P.detail.blur * k);
  const det = new Float32Array(n);
  for (let i = 0; i < n; i++) det[i] = Math.abs(Ln[i] - detK[i]);
  const detAvg = blur(det, w, h, P.detail.avgSigma * k);
  const detSorted = Float32Array.from(detAvg).sort();
  const detP90 = detSorted[Math.floor(n * 0.9)];
  const detP98 = detSorted[Math.floor(n * 0.98)];
  const strokeGate = Math.min(ovX.gateMax, Math.max(ovX.gateMin, ovX.gateRel * detP90));
  // in near-white zones (bright walls, cloud shading) only STRONG architecture
  // lines may be drawn — faint energy there is haze, not structure
  const brightGate = Math.min(detP98, strokeGate + ovX.brightShare * (detP98 - strokeGate));

  // tone layer for wash / hatch / stipple decisions
  const Lt = blur(Ln, w, h, P.tone.smooth * k);
  const Tt = new Float32Array(n);
  const invGamma = 1 / P.tone.gamma;
  for (let i = 0; i < n; i++) {
    const g = 255 * Math.pow(Lt[i] / 255, invGamma); // γ>1 lifts shadows (draftsman's compression)
    const v = 128 + (g - 128) * P.tone.contrast;
    Tt[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }

  // ground-plane attenuation (per-job groundY): below groundY the image is
  // plaza/terrain — a draftsman keeps it as calm paper with light marks, so
  // strokes fade, hatch lightens and stipple thins out toward the bottom.
  let gf = null;
  if (job.groundY != null) {
    gf = new Float32Array(h);
    const gy0 = (job.groundY - 0.12) * h, gy1 = job.groundY * h;
    for (let y = 0; y < h; y++) {
      let f = (y - gy0) / (gy1 - gy0);
      f = f < 0 ? 0 : f > 1 ? 1 : f;
      f = f * f * (3 - 2 * f);
      gf[y] = 1 - 0.88 * f; // 1 above the fade → 0.12 deep in the ground band
    }
  }

  // graded stroke VALUES: bold structure edges → near #0A0A0A; secondary
  // edges → gray pencil lines. Then dilate to solid 2–4px weight.
  const strokeVal = new Float32Array(n); // 255 = no stroke
  const gateHigh = strokeGate * 1.6;
  let rowI = -1, rowY = 0;
  for (let i = 0; i < n; i++) {
    if (i % w === 0) { rowI = i; rowY++; }
    let d = str[i];
    if (gf) d *= gf[(i / w) | 0];
    if (bg[i] || Tt[i] >= P.tone.skyCut) { strokeVal[i] = 255; continue; }
    // bright zones (sunlit walls, cloud shading): only VERY strong edges may
    // ink — soft cloud gradients must never become "sky squiggles"
    if (Tt[i] > 200 && d < 0.82) { strokeVal[i] = 255; continue; }
    const e = detAvg[i];
    const g = Tt[i] > P.hatch.hi ? Math.max(strokeGate, brightGate) : strokeGate;
    if (e <= g) { strokeVal[i] = 255; continue; }
    if (e < gateHigh) {
      let f = (e - strokeGate) / (gateHigh - strokeGate);
      f = f < 0 ? 0 : f > 1 ? 1 : f;
      d *= 0.55 + 0.45 * (f * f * (3 - 2 * f));
    }
    // inside deep shadow the hatching carries the mass — soften stroke ink
    if (Tt[i] < 130) {
      let s = (130 - Tt[i]) / 130;
      s = s < 0 ? 0 : s > 1 ? 1 : s;
      d *= 1 - ovX.shadowSoften * (s * s * (3 - 2 * s));
    }
    // value hierarchy: strength 0.35 → gray … 1.0 → #0A0A0A
    let f2 = (d - 0.35) / 0.65;
    f2 = f2 < 0 ? 0 : f2 > 1 ? 1 : f2;
    strokeVal[i] = 255 - (255 - P.blackFloor) * (f2 * f2 * (3 - 2 * f2)) * Math.min(1, d * 1.6);
  }
  // dilate on an ink-likelihood proxy, then re-apply values (keeps hierarchy)
  const inkProb = new Float32Array(n);
  for (let i = 0; i < n; i++) inkProb[i] = strokeVal[i] < 200 ? 1 - strokeVal[i] / 255 : 0;
  // morphological OPENING (erode 1px → dilate): isolated 1–2px speckle strokes
  // (webp noise, leaf glare) vanish; long contour lines survive and gain weight
  const dilR = Math.max(1, ovX.dilate);
  const inkOpen = dilateMax(erodeMin(inkProb, w, h, dilR > 1 ? 1 : 1), w, h, dilR);
  for (let i = 0; i < n; i++) {
    if (inkProb[i] > 0 && inkOpen[i] < 0.15) { strokeVal[i] = 255; continue; } // speckle killed
    if (inkOpen[i] > inkProb[i]) {
      // dilated shoulder: medium-gray stroke edge (rounds the ink line)
      const shoulder = 255 - inkOpen[i] * 140;
      if (shoulder < strokeVal[i]) strokeVal[i] = shoulder;
    }
  }

  // clustered stipple — seeded, stamped into a darkness buffer
  const rnd = mulberry32(job.seed);
  const stip = new Float32Array(n);
  const cell = P.stipple.clusterCell * kTex;
  const clW = Math.ceil(w / cell) + 2, clH = Math.ceil(h / cell) + 2;
  const clNoise = new Float32Array(clW * clH);
  for (let i = 0; i < clNoise.length; i++) clNoise[i] = rnd();
  const clusterAt = (x, y) => {
    const cx = x / cell, cy = y / cell;
    const x0 = Math.floor(cx), y0 = Math.floor(cy);
    const fx = cx - x0, fy = cy - y0;
    const v00 = clNoise[y0 * clW + x0], v10 = clNoise[y0 * clW + x0 + 1];
    const v01 = clNoise[(y0 + 1) * clW + x0], v11 = clNoise[(y0 + 1) * clW + x0 + 1];
    return (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
  };
  const stamp = (cx, cy, r, dark) => {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx - cx, dy = yy - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const cov = r + 0.5 - d;
        if (cov <= 0) continue;
        const v = dark * (cov > 1 ? 1 : cov);
        const i = yy * w + xx;
        if (v > stip[i]) stip[i] = v;
      }
    }
  };
  let stipCount = 0;
  // foliage scribble: short curved pen marks where detail energy is high
  // (trees/shrubs) — straight ruled hatch reads wrong on organic masses
  const scribRnd = mulberry32((job.seed ^ 0x5bf03635) >>> 0);
  const scribble = (x, y, f, dark) => {
    const ang = 6.2831853 * scribRnd();
    const bend = (scribRnd() - 0.5) * 0.5;
    const len = (3.5 + 6.5 * scribRnd()) * kTex;
    const r = (0.7 + 0.6 * scribRnd()) * kTex;
    const val = 50 + 90 * scribRnd();
    const cA = Math.cos(ang), sA = Math.sin(ang);
    const cP = -sA, sP = cA;
    const steps = Math.max(2, Math.ceil(len));
    for (let st = 0; st <= steps; st++) {
      const u = (st / steps) * len;
      const w2 = bend * u * u * 0.06;
      const px = x + cA * u + cP * w2, py = y + sA * u + sP * w2;
      stamp(px, py, r, (1 - val / 255) * Math.min(1, 0.55 + 0.45 * (1 - st / steps)));
    }
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = Tt[i];
      // foliage scribble (independent of the stipple tone band)
      const dAvg = detAvg[i];
      if (!bg[i] && dAvg > P.detail.scribLo && t < 216) {
        let fF = (dAvg - P.detail.scribLo) / (P.detail.scribHi - P.detail.scribLo);
        fF = fF < 0 ? 0 : fF > 1 ? 1 : fF;
        fF = fF * fF * (3 - 2 * fF);
        const dark = t < 140 ? 1 : 0.5;
        if (scribRnd() < fF * 0.028 * dark * (gf ? 0.4 + 0.6 * gf[y] : 1)) scribble(x, y, fF, dark);
      }
      if (bg[i] || t >= P.stipple.tail) continue;
      let dd, p;
      if (t >= P.stipple.thr) { dd = 0; p = P.stipple.tailP; }   // sparse tail into lower mids
      else {
        dd = (P.stipple.thr - t) / P.stipple.thr;                 // 0..1 darkness
        p = P.stipple.minP + (P.stipple.maxP - P.stipple.minP) * Math.pow(dd, 1.1);
      }
      p *= 1 - P.stipple.clusterAmt / 2 + P.stipple.clusterAmt * clusterAt(x, y); // clustering
      if (gf) p *= 0.45 + 0.55 * gf[y];
      { const dA = detAvg[i];
        if (dA > P.detail.scribLo) { let fF = (dA - P.detail.scribLo) / (P.detail.scribHi - P.detail.scribLo);
          fF = fF < 0 ? 0 : fF > 1 ? 1 : fF; p *= 1 - 0.55 * fF; } } // scribble carries foliage
      if (rnd() >= p) continue;
      stipCount++;
      const val = (P.stipple.valHi - (P.stipple.valHi - P.stipple.valLo) * dd) * (0.7 + 0.6 * rnd());
      const r = (P.stipple.dotMin + rnd() * (P.stipple.dotMax - P.stipple.dotMin)) * kTex;
      stamp(x + (rnd() - 0.5) * 0.9, y + (rnd() - 0.5) * 0.9, r, 1 - val / 255);
    }
  }

const w1 = P.hatch.wobble1 * kTex, w2 = P.hatch.wobble2 * kTex;
  // ---- debug dumps (DBG=1): tonal bands / bg mask / det map / final
  if (process.env.DBG) {
    const dbg = (name, fn) => {
      const px = new Uint8Array(n * 3);
      for (let i = 0; i < n; i++) { const c = fn(i); px[i * 3] = c & 255; px[i * 3 + 1] = (c >> 8) & 255; px[i * 3 + 2] = (c >> 16) & 255; }
      sharp(Buffer.from(px), { raw: { width: w, height: h, channels: 3 } })
        .png({ compressionLevel: 9 }).toFile(`/tmp/dbg-${name}.png`).catch(() => {});
    };
    dbg('tt', (i) => { const t = Tt[i]; return t >= 240 ? 0xffffff : t >= 205 ? 0xffc0c0 : t >= 160 ? 0xff8080 : t >= 90 ? 0xc04040 : 0x404040; });
    dbg('bg', (i) => bg[i] ? 0xffffff : (Tt[i] >= 205 ? 0xffa0a0 : 0x202020));
    dbg('det', (i) => { const d = Math.min(1, detAvg[i] / 15); return Math.round(255 * d) * 0x010101; });
    dbg('strokes', (i) => { const v = Math.round(strokeVal[i]); return v * 0x010101; });
    dbg('stipple', (i) => { const v = Math.round((1 - stip[i]) * 255); return v * 0x010101; });
    dbg('hatch', (i) => {
      const t = Tt[i];
      if (bg[i] || t >= P.hatch.hi) return 0xffffff;
      const d = t <= P.hatch.lo ? 1 : (P.hatch.hi - t) / (P.hatch.hi - P.hatch.lo);
      const spacing = (P.hatch.spacingLight + (P.hatch.spacingDark - P.hatch.spacingLight) * d) * kTex;
      const hw = (P.hatch.widthLight + (P.hatch.widthDark - P.hatch.widthLight) * d) * 0.5 * kTex;
      const lineVal = P.hatch.valLight - (P.hatch.valLight - P.hatch.valDark) * d;
      const x = i % w, y = (i / w) | 0;
      const uA = (x + y) * 0.70710678, aA = (x - y) * 0.70710678;
      let m = 1 - hatchInk(uA, aA, spacing, hw, job.seed & 0xffff, w1, w2) * (lineVal / 255);
      if (d > P.hatch.crossAt) {
        const uB = (x - y) * 0.70710678, aB = (x + y) * 0.70710678;
        m *= 1 - hatchInk(uB, aB, spacing * P.hatch.crossSpacingMul, hw, (job.seed >>> 8) & 0xffff, w1, w2) * (Math.min(200, lineVal * 0.88) / 255);
      }
      return Math.round(m * 255) * 0x010101;
    });
  }

  // ---- composite: wash → hatch → stipple → strokes → grain → S-curve
  const grainRnd = mulberry32(job.seed ^ 0x9e3779b9);
  const out = new Uint8Array(n);
  const SALT_A = job.seed & 0xffff, SALT_B = (job.seed >>> 8) & 0xffff;
    const hatchLo = P.hatch.lo, hatchHi = P.hatch.hi;
  const washTop = P.wash.top, washFloorT = P.wash.floorT, washFloorV = P.wash.floorV;
  const detK_H = P.detail.hatchDetK * k;
  let hatchCount = 0, strokeCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i]) { out[i] = 255; continue; }
      const t = Tt[i];

      // 1. graphite wash — real gray mid-tone under everything
      let v;
      if (t >= washTop) v = 255;
      else {
        let f = (washTop - t) / (washTop - washFloorT);
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        v = 255 - (255 - washFloorV) * (f * f * (3 - 2 * f));
      }

      // 2. cross-hatch — mid-tone band (L 90–205), attenuated in noisy zones
      if (t < hatchHi) {
        let d = t <= hatchLo ? 1 : (hatchHi - t) / (hatchHi - hatchLo); // 0 light … 1 dark
        d = Math.min(1, d * 0.84); // density saturation — spreads the value gradient
        if (gf) d *= 0.5 + 0.5 * gf[y]; // ground plane: lighter, sparser hatch
        // organic/noisy texture (foliage) gets stipple, not ruled lines
        const detFade = 1 / (1 + Math.pow(detAvg[i] / detK_H, 2));
        const spacing = (P.hatch.spacingLight + (P.hatch.spacingDark - P.hatch.spacingLight) * d) * kTex;
        const hw = (P.hatch.widthLight + (P.hatch.widthDark - P.hatch.widthLight) * d) * 0.5 * kTex;
        const lineVal = P.hatch.valLight - (P.hatch.valLight - P.hatch.valDark) * d;
        const uA = (x + y) * 0.70710678, aA = (x - y) * 0.70710678;
        let m = 1 - hatchInk(uA, aA, spacing, hw, SALT_A, w1, w2) * detFade * (lineVal / 255);
        if (d > P.hatch.crossAt) {
          const uB = (x - y) * 0.70710678, aB = (x + y) * 0.70710678;
          const inkB = hatchInk(uB, aB, spacing * P.hatch.crossSpacingMul, hw, SALT_B, w1, w2);
          m *= 1 - inkB * detFade * (Math.min(200, lineVal * 0.88) / 255);
        }
        v *= m;
        if (m < 0.97) hatchCount++;
      }

      // 3. stipple (multiply)
      if (stip[i] > 0) v *= 1 - stip[i];

      // 4. strokes — REPLACE value (keeps the authored line hierarchy)
      if (strokeVal[i] < v) { v = strokeVal[i]; strokeCount++; }

      // 5. paper tooth on near-whites (subject only)
      if (v > 246 && t < P.tone.skyCut && grainRnd() < P.grain.p) v -= 2 + P.grain.amt * grainRnd();

      // 6. gentle contrast S-slope, black floor #0A0A0A
      v = 128 + (v - 128) * P.finalGain;
      if (v < P.blackFloor) v = P.blackFloor;
      if (v > 255) v = 255;
      out[i] = v | 0;
    }
  }

  // ---- encode (each variant is rendered NATIVELY at its own geometry —
  // downscaling a 2200 render to 1100 aliases the hatch into noise)
  const results = [];
  {
    const raw = { raw: { width: w, height: h, channels: 1 } };
    const pipe = sharp(Buffer.from(out.buffer, out.byteOffset, out.byteLength), raw);
    const buf = await pipe.toColourspace('b-w').webp({ quality: P.webpQuality, effort: 4 }).toBuffer();
    fs.writeFileSync(path.join(OUT_DIR, primary.file), buf);
    results.push({ file: primary.file, bytes: buf.length });
  }

  // diagnostics — tonal histogram proves this is NOT a flat binary outline
  const pct = (c) => (100 * c / n).toFixed(1) + '%';
  const bins = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const v = out[i];
    bins[v < 30 ? 0 : v < 90 ? 1 : v < 160 ? 2 : v < 215 ? 3 : v < 250 ? 4 : 5]++;
  }
  const histStr = bins.map((b) => (100 * b / n).toFixed(0) + '%').join(' ');
  console.log(`▸ ${job.id}  ${w}×${h}  (src ${job.src.split('/').pop()}, k=${k.toFixed(2)})  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`   bg=${pct(bgCount)} strokes=${pct(strokeCount)} hatch=${pct(hatchCount)} stippleDots=${pct(stipCount)}  stretch[${stretchInfo.lo}..${stretchInfo.hi}] detP90=${detP90.toFixed(1)} gate=${strokeGate.toFixed(1)} skyMedian=${skyMedian.toFixed(0)} bgThr(t=${toneThr.toFixed(0)},d=${detThr.toFixed(1)})`);
  console.log(`   tones [<30|30-90|90-160|160-215|215-250|≥250] = ${histStr}`);
  for (const r of results) console.log(`   → ${r.file}  ${(r.bytes / 1024).toFixed(0)} KB`);
}

// ---------------------------------------------------------------------------
const JOBS = [
  {
    id: 'hero',
    src: 'frontend/public/media/universities/uob-1600.webp',
    focal: [0.5, 0.42],
    seed: 31400,
    groundY: 0.75,
    outputs: [
      { file: 'hero-ink-2200.webp', w: 2200, h: 1100 },
      { file: 'hero-ink-1100.webp', w: 1100, h: 550 },
    ],
  },
  {
    id: 'crop-garyounis-1',
    src: 'frontend/public/media/universities/garyounis-1-1200.webp',
    focal: [0.5, 0.45],
    seed: 31401,
    outputs: [{ file: 'crop-garyounis-1-960.webp', w: 960, h: 960 }],
  },
  {
    id: 'crop-garyounis-classic',
    src: 'frontend/public/media/universities/garyounis-classic-1200.webp',
    focal: [0.5, 0.4],
    seed: 31402,
    outputs: [{ file: 'crop-garyounis-classic-960.webp', w: 960, h: 960 }],
  },
  {
    // R314 foreman: fateh-science is an INTERIOR corridor — renders flat/
    // dithered (VLM 3/10). Swapped for uob-science (exterior faculty block).
    id: 'crop-fateh-science',
    src: 'frontend/public/media/universities/uob-science-1200.webp',
    focal: [0.5, 0.45],
    seed: 31403,
    outputs: [{ file: 'crop-fateh-science-960.webp', w: 960, h: 960 }],
  },
  {
    id: 'crop-omu-agri',
    src: 'frontend/public/media/universities/omu-agri-1200.webp',
    focal: [0.5, 0.45],
    seed: 31404,
    outputs: [{ file: 'crop-omu-agri-960.webp', w: 960, h: 960 }],
  },
];

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
fs.mkdirSync(OUT_DIR, { recursive: true });

const t0 = Date.now();
for (const job of JOBS) {
  if (only && job.id !== only) continue;
  for (const o of job.outputs) await renderInk(job, o);
}
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${OUT_DIR}`);
