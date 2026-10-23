#!/usr/bin/env node
/**
 * R314 task 3-b — PAPER GRAIN TILES, measured against the Heron reference.
 *
 * What this does (fully deterministic, seeded — rerun reproduces byte-identical assets):
 *   1. MEASURE the Heron reference: three 200x200 "empty paper" regions (VLM-verified
 *      bare paper) from the R314 1440x900/light captures -> mean luminance,
 *      std-dev (grain amplitude), mean |laplacian| (high-frequency energy),
 *      3x3 high-pass std, 1px-lag autocorrelation, plus the radial amplitude
 *      spectrum (complex 2D FFT, Tukey-tapered) fitted as plateau + power-law.
 *   2. GENERATE a 256x256 TILEABLE grain tile whose spectrum matches the measured
 *      one. The tile is the inverse-DFT of a seeded random-phase spectrum: exactly
 *      a sum of cos(2*pi*(u*x+v*y)/256 + phi) gratings over EVERY integer lattice
 *      frequency (u,v) — integer frequencies => the tile is periodic in both axes
 *      BY CONSTRUCTION (evaluated via FFT: O(N^2 log N) instead of O(N^4)).
 *      - grain-light: white-anchored (mean ~255) dark-only grain for
 *        mix-blend-mode: multiply over #F4F4EE paper; amplitude iterated on the
 *        DECODED webp until std matches the reference std (±5% gate, target <1%).
 *      - grain-dark : neutral #282828 mean (Madarek charcoal paper), amplitude
 *        0.8x the light reference (no dark Heron captures exist — r314 light-only,
 *        r313 reference is light too), symmetric grain for plain alpha compositing.
 *   3. VERIFY tileability on the decoded files: wrap-seam adjacent-pixel statistics
 *      vs interior statistics (a real seam would show a systematic step/larger
 *      deltas at the wrap), plus a sharp-composited 2x2 proof with column/row-mean
 *      discontinuity metrics.
 *   4. EMIT scripts/r314/grain-measure.json, working copies in scripts/r314/out/,
 *      and the shippable set in frontend/public/media/textures/
 *      (grain-tile-light.webp, grain-tile-dark.webp, micro-grid.svg).
 *
 * Usage:  node scripts/r314/make-grain.mjs
 * Exits non-zero if any gate fails (std delta ±5%, seam stats, size ≤ 60KB).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const req = createRequire(path.join(import.meta.dirname, 'tools', 'package.json'));
const sharp = req('sharp');

const ROOT = path.resolve(import.meta.dirname, '../..');
const CAP = path.join(ROOT, 'audits/evidence/r314/_local/captures/heron/1440x900/light');
const OUT = path.join(import.meta.dirname, 'out');
const TEX = path.join(ROOT, 'frontend/public/media/textures');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TEX, { recursive: true });

const N = 256; // tile size
const SEED_LIGHT = 0x31415; // deterministic seeds
const SEED_DARK = 0x28282;

/* ── seeded PRNG (mulberry32) ─────────────────────────────────────────── */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── FFT (radix-2, in-place complex, rows+cols) ───────────────────────── */
function fft1d(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inv ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cwr - im[i + k + len / 2] * cwi;
        const vi = re[i + k + len / 2] * cwi + im[i + k + len / 2] * cwr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nwr = cwr * wr - cwi * wi; cwi = cwr * wi + cwi * wr; cwr = nwr;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function fft2d(re, im, N_, inv) {
  const r = new Float64Array(N_), c = new Float64Array(N_);
  for (let y = 0; y < N_; y++) {
    for (let x = 0; x < N_; x++) { r[x] = re[y * N_ + x]; c[x] = im[y * N_ + x]; }
    fft1d(r, c, inv);
    for (let x = 0; x < N_; x++) { re[y * N_ + x] = r[x]; im[y * N_ + x] = c[x]; }
  }
  for (let x = 0; x < N_; x++) {
    for (let y = 0; y < N_; y++) { r[y] = re[y * N_ + x]; c[y] = im[y * N_ + x]; }
    fft1d(r, c, inv);
    for (let y = 0; y < N_; y++) { re[y * N_ + x] = r[y]; im[y * N_ + x] = c[y]; }
  }
}

/* ── statistics helpers ───────────────────────────────────────────────── */
function regionStats(px, w, h) {
  let sum = 0, sum2 = 0; const n = w * h;
  for (let i = 0; i < n; i++) { sum += px[i]; sum2 += px[i] * px[i]; }
  const mean = sum / n, std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  let lapSum = 0, lapN = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    lapSum += Math.abs(4 * px[i] - px[i - 1] - px[i + 1] - px[i - w] - px[i + w]) / 4; lapN++;
  }
  let hpSum = 0, hpSum2 = 0, hpN = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const m = (px[i - 1] + px[i + 1] + px[i - w] + px[i + w] + px[i - 1 - w] + px[i + 1 - w] + px[i - 1 + w] + px[i + 1 + w] + px[i]) / 9;
    const d = px[i] - m; hpSum += d; hpSum2 += d * d; hpN++;
  }
  const hpMean = hpSum / hpN, hpStd = Math.sqrt(Math.max(0, hpSum2 / hpN - hpMean * hpMean));
  // 1px-lag autocorrelation (high-passed, removes wash drift)
  let sxy = 0, sxx = 0, syy = 0, cn = 0;
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const i = y * w + x;
    const a = px[i] - (px[i - 1] + px[i + 1] + px[i - w] + px[i + w] + px[i]) / 5;
    const b = px[i + 1] - (px[i] + px[i + 2] + px[i + 1 - w] + px[i + 1 + w] + px[i + 1]) / 5;
    sxy += a * b; sxx += a * a; syy += b * b; cn++;
  }
  const r1 = sxy / Math.sqrt(sxx * syy + 1e-12);
  return { mean, std, meanAbsLaplacian: lapSum / lapN, hpStd3x3: hpStd, autocorr1px: r1 };
}

/** 1px-lag autocorrelation of a high-passed image (same estimator as regionStats). */
function r1px(px) {
  let sxy = 0, sxx = 0, syy = 0;
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) {
    const i = y * N + x;
    const a = px[i] - (px[i - 1] + px[i + 1] + px[i - N] + px[i + N] + px[i]) / 5;
    const b = px[i + 1] - (px[i] + px[i + 2] + px[i + 1 - N] + px[i + 1 + N] + px[i + 1]) / 5;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  return sxy / Math.sqrt(sxx * syy + 1e-12);
}

/** mean |4-neighbour laplacian| / 4 (the task's high-frequency-energy metric). */
function meanAbsLap(px) {
  let lapSum = 0, lapN = 0;
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
    const i = y * N + x;
    lapSum += Math.abs(4 * px[i] - px[i - 1] - px[i + 1] - px[i - N] - px[i + N]) / 4; lapN++;
  }
  return lapSum / lapN;
}

async function cropGray(file, x, y, w, h) {
  const { data } = await sharp(file).extract({ left: x, top: y, width: w, height: h }).grayscale().raw().toBuffer({ resolveWithObject: true });
  return data;
}

/* ════════════════════════════════════════════════════════════════════════
 * 1. REFERENCE MEASUREMENT
 * ════════════════════════════════════════════════════════════════════════ */
// Region notes: the task's suggested spots were VLM/content-checked and nudged to
// genuinely bare paper (the fixed .bg-global paper layer — pixel-identical across
// scroll frames, so any clean window measures the same paper).
const REGIONS = [
  { frame: 'p00-0.png', x: 40, y: 80, name: 'top-left-margin',
    note: 'task suggested (20,60) — that spot carries the hero ruler chrome/crosshair (std 5.6); (40,80) is the nearest verified-bare paper' },
  { frame: 'p04-20.png', x: 1150, y: 300, name: 'centre-right',
    note: 'as suggested; VLM-verified pure paper; pixel-identical across p04/p05 (fixed bg layer)' },
  { frame: 'p05-25.png', x: 460, y: 650, name: 'bottom-margin',
    note: 'suggested (200,860) cannot fit a 200px crop in the 900px viewport and (200,700) contains a hairline (std 5.2); (460,650) is the cleanest bottom paper' },
];

const refRegions = [];
for (const r of REGIONS) {
  const file = path.join(CAP, r.frame);
  if (!fs.existsSync(file)) { console.error('MISSING capture:', file); throw new Error('missing capture ' + file); }
  const px = await cropGray(file, r.x, r.y, 200, 200);
  const s = regionStats(px, 200, 200);
  refRegions.push({ ...r, ...s });
}
const agg = (k) => refRegions.reduce((a, r) => a + r[k], 0) / refRegions.length;
const REF = {
  meanLuminance: agg('mean'),
  std: agg('std'),
  meanAbsLaplacian: agg('meanAbsLaplacian'),
  hpStd3x3: agg('hpStd3x3'),
  autocorr1px: agg('autocorr1px'),
};
REF.paperLuminanceHex = '#' + Math.round(REF.meanLuminance).toString(16).padStart(2, '0').repeat(3) + ' (grayscale ≈ Heron paper #F4F4EE, r313 telemetry/paper.json)';

/* radial amplitude spectrum of the reference (shape only — scale refit later) */
{
  var refRings = new Map();
  for (const r of REGIONS) {
    const px = await cropGray(path.join(CAP, r.frame), r.x, r.y, 200, 200);
    const re = new Float64Array(N * N), im = new Float64Array(N * N);
    let mean = 0; for (let i = 0; i < 200 * 200; i++) mean += px[i]; mean /= 200 * 200;
    for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) {
      const wx = 0.5 - 0.5 * Math.cos((2 * Math.PI * (x + 0.5)) / 200);
      const wy = 0.5 - 0.5 * Math.cos((2 * Math.PI * (y + 0.5)) / 200);
      re[y * N + x] = (px[y * 200 + x] - mean) * wx * wy;
    }
    fft2d(re, im, N, false);
    for (let fy = 0; fy < N; fy++) for (let fx = 0; fx < N; fx++) {
      const u = fx <= N / 2 ? fx : fx - N, v = fy <= N / 2 ? fy : fy - N;
      const fm = Math.sqrt(u * u + v * v);
      if (fm < 1.5 || fm > 128.5) continue;
      const p = re[fy * N + fx] ** 2 + im[fy * N + fx] ** 2;
      const k = Math.round(fm);
      if (!refRings.has(k)) refRings.set(k, { p: 0, c: 0 });
      const b = refRings.get(k); b.p += p; b.c++;
    }
  }
}
const ringAmp = new Map();
for (const [k, b] of refRings) ringAmp.set(k, Math.sqrt(b.p / b.c));

/* fit A(f) = A0 (f <= f0), A0*(f0/f)^beta (f > f0) — summary only; generation
 * uses the measured ring curve directly (see ampAt) so the tile spectrum, and
 * therefore std / mean|lap| / hpStd / 1px autocorrelation, track the reference. */
let bestFit = null;
for (const f0 of [8, 12, 16, 20, 24, 32, 40, 48]) {
  const low = [], high = [];
  for (const [k, a] of ringAmp) { if (k >= 5 && k <= f0) low.push([k, a]); else if (k > f0 && k <= 128) high.push([k, a]); }
  if (low.length < 3 || high.length < 6) continue;
  const A0 = low.reduce((s, [, a]) => s + a, 0) / low.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [k, a] of high) { const lx = Math.log(k), ly = Math.log(a); sx += lx; sy += ly; sxx += lx * lx; sxy += lx * ly; }
  const m = high.length;
  const beta = -(sxy - (sx * sy) / m) / (sxx - (sx * sx) / m);
  let sse = 0;
  for (const [k, a] of low) { const d = Math.log(a) - Math.log(A0); sse += d * d; }
  for (const [k, a] of high) { const d = Math.log(a) - Math.log(A0) - beta * Math.log(f0 / k); sse += d * d; }
  if (!bestFit || sse < bestFit.sse) bestFit = { f0, beta, A0, sse };
}
if (!bestFit) bestFit = { f0: 32, beta: 1.0, A0: 280, sse: Infinity };

/* amplitude profile for generation: measured rings 5..128 (log-log interpolated);
 * rings 2..4 held at the ring-5 level (a 200px window cannot resolve below
 * ~1.3 cyc/window — measured low rings are taper-leakage-inflated); f<2 -> 0. */
const ringKeys = [...ringAmp.keys()].filter(k => k >= 5 && k <= 128).sort((a, b) => a - b);
function ampAt(f) {
  if (f < 2 || f > 128.5) return 0;
  const a5 = ringAmp.get(5);
  if (f < 5) return a5;
  if (f >= ringKeys[ringKeys.length - 1]) return ringAmp.get(ringKeys[ringKeys.length - 1]);
  let lo = ringKeys[0], hi = ringKeys[ringKeys.length - 1];
  for (let i = 0; i < ringKeys.length - 1; i++) { if (f >= ringKeys[i] && f <= ringKeys[i + 1]) { lo = ringKeys[i]; hi = ringKeys[i + 1]; break; } }
  const t = (Math.log(f) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return Math.exp((1 - t) * Math.log(ringAmp.get(lo)) + t * Math.log(ringAmp.get(hi)));
}

/* ════════════════════════════════════════════════════════════════════════
 * 2. TILE GENERATION (periodic by construction)
 * ════════════════════════════════════════════════════════════════════════ */
/** Build unit-std periodic noise n(x,y): IFFT of the seeded random-phase
 *  spectrum with the reference amplitude profile (optionally tilted: above
 *  64 cyc/256px the amplitude is scaled by (64/f)^gamma — used to pre-compensate
 *  the correlation distortion that half-wave clipping at 255 introduces).
 *  Hermitian symmetry => real output; integer lattice frequencies => exactly
 *  256-periodic. */
function unitNoise(seed, gamma = 0) {
  const rnd = mulberry32(seed);
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  const half = N / 2;
  const put = (u, v, amp, ph) => {
    const k1 = ((u % N) + N) % N, k2 = ((v % N) + N) % N;
    re[k2 * N + k1] += amp * Math.cos(ph); im[k2 * N + k1] += amp * Math.sin(ph);
    const j1 = ((-u % N) + N) % N, j2 = ((-v % N) + N) % N;
    re[j2 * N + j1] += amp * Math.cos(ph); im[j2 * N + j1] -= amp * Math.sin(ph);
  };
  for (let v = -half; v <= half; v++) {
    for (let u = -half; u <= half; u++) {
      // one conjugate half only. NB: u=+half and u=-half are the SAME DFT bin,
      // so the u=half column pairs with itself: process it for v>0 only
      // (put() writes the partner at (half,-v)) or the column would be
      // double-counted and leak a faint vertical Nyquist stripe.
      if (u < 0 || (u === 0 && v < 0) || (u === half && v < 0)) continue;
      const fm = Math.sqrt(u * u + v * v);
      let a = ampAt(fm);
      if (gamma > 0 && fm > 64) a *= Math.pow(64 / fm, gamma);
      if (a === 0) continue;
      const selfConj = (u === 0 || u === half) && (v === 0 || v === half);
      if (selfConj) { // Nyquist/self-conjugate bins must be real
        re[((v + N) % N) * N + ((u + N) % N)] += a * (rnd() < 0.5 ? -1 : 1);
      } else {
        put(u, v, a, rnd() * 2 * Math.PI);
      }
    }
  }
  fft2d(re, im, N, true); // inverse => spatial noise
  const out = new Float64Array(N * N);
  let mean = 0;
  for (let i = 0; i < N * N; i++) { out[i] = re[i]; mean += re[i]; }
  mean /= N * N;
  let v2 = 0;
  for (let i = 0; i < N * N; i++) { out[i] -= mean; v2 += out[i] * out[i]; }
  const sd = Math.sqrt(v2 / (N * N));
  for (let i = 0; i < N * N; i++) out[i] /= sd;
  return out;
}

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

/** Encode a 1-channel raw tile to LOSSLESS webp (pixel-exact roundtrip). */
async function encodeTile(arr, file) {
  const buf = Buffer.alloc(N * N);
  for (let i = 0; i < N * N; i++) buf[i] = clamp(Math.round(arr[i]));
  await sharp(buf, { raw: { width: N, height: N, channels: 1 } })
    .webp({ lossless: true, effort: 6 }).toFile(file);
  // NB: read via Buffer — libvips caches file loads by filename, which would
  // return stale pixels when the same path is rewritten inside the k-loop.
  const { data } = await sharp(fs.readFileSync(file)).grayscale().raw().toBuffer({ resolveWithObject: true });
  return data;
}

/* light tile: white-anchored dark-only grain. Multiply semantics require
 * values <= 255, so the grain is one-sided (dark speckles only):
 *  - the k-loop compensates the ~0.584 clipping factor (and integer rounding)
 *    so the DECODED file's std hits the reference std exactly;
 *  - half-wave clipping at 255 also distorts the fine structure (it shifts
 *    energy across frequencies: symmetric noise with the reference spectrum
 *    comes out ~5% hot on mean|laplacian| and its 1px autocorrelation flips
 *    negative), so a high-frequency tilt gamma (amp(f)*(64/f)^gamma above
 *    64 cyc/256px) is searched until the DECODED tile's mean |laplacian| —
 *    the task's stated high-frequency-energy metric — matches the reference
 *    as well. hpStd and r1 come out within a few % / a few hundredths and
 *    are recorded with honest deltas.
 * The one-sidedness costs a mean of ~254 (multiply darkens the paper by
 * ~1/255 — inside Heron's own ±2/255 sampling variance, documented below). */
async function makeLight(seed, targetStd, targetLap) {
  let gammaLo = 0, gammaHi = null, gamma = 0, best = null, bestBytes = null;
  for (let outer = 0; outer < 9; outer++) {
    const n = unitNoise(seed, gamma);
    // inner: solve std on the decoded file
    let k = targetStd / 0.584, data = null, s = 0, m = 0;
    for (let it = 0; it < 12; it++) {
      const t = new Float64Array(N * N);
      for (let i = 0; i < N * N; i++) t[i] = 255 + k * n[i];
      data = await encodeTile(t, path.join(OUT, '.iter-light.webp'));
      let sum = 0, sum2 = 0;
      for (let i = 0; i < N * N; i++) { sum += data[i]; sum2 += data[i] * data[i]; }
      m = sum / (N * N); s = Math.sqrt(Math.max(0, sum2 / (N * N) - m * m));
      if (Math.abs(s - targetStd) < 0.005) break;
      k *= targetStd / s;
    }
    const lap = meanAbsLap(data);
    const cand = { data, gamma: +gamma.toFixed(3), gainK: +k.toFixed(4), decodedMean: m, decodedStd: s, lap };
    console.log(`    [light γ=${gamma.toFixed(3)}] decoded std=${s.toFixed(3)} mean=${m.toFixed(2)} mean|lap|=${lap.toFixed(3)} (target ${targetLap.toFixed(3)})`);
    if (!best || Math.abs(lap - targetLap) < Math.abs(best.lap - targetLap)) {
      best = cand;
      bestBytes = fs.readFileSync(path.join(OUT, '.iter-light.webp'));
    }
    if (Math.abs(lap - targetLap) < 0.004) break;
    if (lap > targetLap) { gammaLo = gamma; gamma = gammaHi === null ? gamma + 0.25 : (gammaLo + gammaHi) / 2; }
    else { gammaHi = gamma; gamma = (gammaLo + gammaHi) / 2; }
    if (gamma > 3) break;
  }
  // the file on disk holds the LAST probe; restore the winning candidate
  fs.writeFileSync(path.join(OUT, '.iter-light.webp'), bestBytes);
  return best;
}

/* dark tile: symmetric grain around the #282828 charcoal (no clipping at this
 * amplitude); k-loop compensates integer-rounding variance (+1/12). */
async function makeDark(seed, targetStd) {
  const n = unitNoise(seed);
  let k = Math.sqrt(Math.max(0.01, targetStd * targetStd - 1 / 12));
  let data = null, s = 0, m = 0, iters = 0;
  for (let it = 0; it < 12; it++) {
    iters = it + 1;
    const t = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) t[i] = 40 + k * n[i]; // 40 = #28
    data = await encodeTile(t, path.join(OUT, '.iter-dark.webp'));
    let sum = 0, sum2 = 0;
    for (let i = 0; i < N * N; i++) { sum += data[i]; sum2 += data[i] * data[i]; }
    m = sum / (N * N); s = Math.sqrt(Math.max(0, sum2 / (N * N) - m * m));
    if (Math.abs(s - targetStd) < 0.005) break;
    k *= targetStd / s;
  }
  return { data, gamma: 0, gainK: +k.toFixed(4), decodedMean: m, decodedStd: s, lap: meanAbsLap(data) };
}

/* ════════════════════════════════════════════════════════════════════════
 * 3. TILEABILITY VERIFICATION (on decoded pixels)
 * ════════════════════════════════════════════════════════════════════════ */
function seamCheck(t) {
  // interior adjacent-pixel |Δ| baseline (horizontal + vertical)
  let intSum = 0, intN = 0, intMax = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N - 1; x++) {
    const d = Math.abs(t[y * N + x + 1] - t[y * N + x]); intSum += d; intN++; if (d > intMax) intMax = d;
  }
  for (let y = 0; y < N - 1; y++) for (let x = 0; x < N; x++) {
    const d = Math.abs(t[(y + 1) * N + x] - t[y * N + x]); intSum += d; intN++; if (d > intMax) intMax = d;
  }
  const intMean = intSum / intN;
  // wrap-seam pairs (the pixel pairs that become adjacent when tiled)
  let sSum = 0, sMax = 0;
  for (let y = 0; y < N; y++) { const d = Math.abs(t[y * N] - t[y * N + N - 1]); sSum += d; if (d > sMax) sMax = d; }
  for (let x = 0; x < N; x++) { const d = Math.abs(t[(N - 1) * N + x] - t[x]); sSum += d; if (d > sMax) sMax = d; } // row 255 vs row 0
  const seamMean = sSum / (2 * N);
  // column/row mean steps at the wrap vs interior steps
  const colMean = new Array(N).fill(0), rowMean = new Array(N).fill(0);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { colMean[x] += t[y * N + x] / N; rowMean[y] += t[y * N + x] / N; }
  let intStepMax = 0;
  for (let x = 0; x < N - 1; x++) intStepMax = Math.max(intStepMax, Math.abs(colMean[x + 1] - colMean[x]));
  for (let y = 0; y < N - 1; y++) intStepMax = Math.max(intStepMax, Math.abs(rowMean[y + 1] - rowMean[y]));
  const seamStepX = Math.abs(colMean[0] - colMean[N - 1]);
  const seamStepY = Math.abs(rowMean[0] - rowMean[N - 1]);
  return {
    interiorAdjMeanAbs: +intMean.toFixed(3),
    interiorAdjMax: +intMax.toFixed(1),
    wrapSeamAdjMeanAbs: +seamMean.toFixed(3),
    wrapSeamAdjMax: +sMax.toFixed(1),
    seamAdjRatio: +(seamMean / intMean).toFixed(3),
    seamAdjMaxRatio: +(sMax / intMax).toFixed(3),
    interiorColRowMeanStepMax: +intStepMax.toFixed(3),
    seamColMeanStep: +seamStepX.toFixed(3),
    seamRowMeanStep: +seamStepY.toFixed(3),
  };
}

/** sharp 2x2 composite proof + task-literal metric on the composite. */
async function composite2x2(tileFile, outFile) {
  const tilePng = await sharp(tileFile).png().toBuffer();
  const canvas = sharp({ create: { width: N * 2, height: N * 2, channels: 3, background: { r: 0, g: 0, b: 0 } } });
  await canvas.composite([
    { input: tilePng, left: 0, top: 0 }, { input: tilePng, left: N, top: 0 },
    { input: tilePng, left: 0, top: N }, { input: tilePng, left: N, top: N },
  ]).png().toFile(outFile);
  const { data } = await sharp(outFile).grayscale().raw().toBuffer({ resolveWithObject: true });
  const W = N * 2;
  const colMean = new Array(W).fill(0), rowMean = new Array(W).fill(0);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { colMean[x] += data[y * W + x] / W; rowMean[y] += data[y * W + x] / W; }
  let maxStep = 0, intStepMax = 0;
  for (let x = 0; x < W - 1; x++) {
    const d = Math.abs(colMean[x + 1] - colMean[x]);
    if (x === N - 1 || x === N - 1 + N) maxStep = Math.max(maxStep, d); else intStepMax = Math.max(intStepMax, d);
  }
  for (let y = 0; y < W - 1; y++) {
    const d = Math.abs(rowMean[y + 1] - rowMean[y]);
    if (y === N - 1) maxStep = Math.max(maxStep, d); else intStepMax = Math.max(intStepMax, d);
  }
  return { maxSeamColRowMeanDiscontinuity: +maxStep.toFixed(3), interiorColRowMeanStepMax: +intStepMax.toFixed(3) };
}

/* ════════════════════════════════════════════════════════════════════════
 * RUN
 * ════════════════════════════════════════════════════════════════════════ */
console.log('── reference (Heron 1440x900 light, DPR1, verified bare paper) ──');
for (const r of refRegions) {
  console.log(`  ${r.frame} (${r.x},${r.y}) ${r.name.padEnd(16)} mean=${r.mean.toFixed(2)} std=${r.std.toFixed(3)} mean|lap|=${r.meanAbsLaplacian.toFixed(3)} hpStd=${r.hpStd3x3.toFixed(3)} r1=${r.autocorr1px.toFixed(3)}`);
}
console.log(`  AGGREGATE mean=${REF.meanLuminance.toFixed(2)} (Heron paper #F4F4EE)  std=${REF.std.toFixed(3)}  mean|lap|=${REF.meanAbsLaplacian.toFixed(3)}  hpStd=${REF.hpStd3x3.toFixed(3)}  r1=${REF.autocorr1px.toFixed(3)}`);
console.log(`  spectrum fit (summary): plateau A0=${bestFit.A0.toFixed(1)} up to f0=${bestFit.f0} cyc/256px, then (f0/f)^${bestFit.beta.toFixed(3)} decay; generation uses the measured ring curve directly`);

const light = await makeLight(SEED_LIGHT, REF.std, REF.meanAbsLaplacian);
const darkTargetStd = 0.8 * REF.std;
const dark = await makeDark(SEED_DARK, darkTargetStd);

fs.renameSync(path.join(OUT, '.iter-light.webp'), path.join(OUT, 'grain-light.webp'));
fs.renameSync(path.join(OUT, '.iter-dark.webp'), path.join(OUT, 'grain-dark.webp'));

const lightStats = regionStats(light.data, N, N);
const darkStats = regionStats(dark.data, N, N);
const lightSeam = seamCheck(light.data);
const darkSeam = seamCheck(dark.data);
const lightComp = await composite2x2(path.join(OUT, 'grain-light.webp'), path.join(OUT, 'grain-light-2x2.png'));
const darkComp = await composite2x2(path.join(OUT, 'grain-dark.webp'), path.join(OUT, 'grain-dark-2x2.png'));

/* shippable copies (identical bytes) */
fs.copyFileSync(path.join(OUT, 'grain-light.webp'), path.join(TEX, 'grain-tile-light.webp'));
fs.copyFileSync(path.join(OUT, 'grain-dark.webp'), path.join(TEX, 'grain-tile-dark.webp'));
fs.writeFileSync(path.join(TEX, 'micro-grid.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <!-- R314 3-b micro-grid: 1px dot #B3B3AF @40%, 24x24px cell, seamless tile.
       Integer-aligned 1x1 rect = crisp 1px dot at any DPR (Heron's own micro-dot
       vocabulary is 1x1/2x2px elements, r313 D2); dot centred in the cell so
       nothing crosses the tile edges. -->
  <rect x="12" y="12" width="1" height="1" fill="#B3B3AF" fill-opacity="0.4"/>
</svg>
`);

/* gates */
const sizeOf = (f) => fs.statSync(f).size;
const lightSize = sizeOf(path.join(TEX, 'grain-tile-light.webp'));
const darkSize = sizeOf(path.join(TEX, 'grain-tile-dark.webp'));
const lightDeltaPct = ((lightStats.std - REF.std) / REF.std) * 100;
const darkDeltaPct = ((darkStats.std - darkTargetStd) / darkTargetStd) * 100;
const gates = {
  lightStdWithin5pct: Math.abs(lightDeltaPct) <= 5,
  darkStdWithin5pct: Math.abs(darkDeltaPct) <= 5,
  lightLapWithin5pct: Math.abs(((lightStats.meanAbsLaplacian - REF.meanAbsLaplacian) / REF.meanAbsLaplacian) * 100) <= 5,
  lightSeamOk: lightSeam.seamAdjRatio >= 0.8 && lightSeam.seamAdjRatio <= 1.2 && lightSeam.seamAdjMaxRatio <= 1.3 && lightSeam.seamColMeanStep < 0.5 && lightSeam.seamRowMeanStep < 0.5,
  darkSeamOk: darkSeam.seamAdjRatio >= 0.8 && darkSeam.seamAdjRatio <= 1.2 && darkSeam.seamAdjMaxRatio <= 1.3 && darkSeam.seamColMeanStep < 0.5 && darkSeam.seamRowMeanStep < 0.5,
  compositeDiscontinuityLt1_5: lightComp.maxSeamColRowMeanDiscontinuity < 1.5 && darkComp.maxSeamColRowMeanDiscontinuity < 1.5,
  sizesOk: lightSize <= 60 * 1024 && darkSize <= 60 * 1024,
};

/* CSS recipe math (both the task's linear model and the full multiply model) */
const paperB = Math.round(REF.meanLuminance); // 244 (#F4F4EE)
const X = REF.std / lightStats.std;           // task model: applied = tile_std * X
const cssRecipe = {
  light: {
    css: `background-image: url(/media/textures/grain-tile-light.webp); background-size: 256px; mix-blend-mode: multiply; opacity: ${X.toFixed(3)};`,
    appliedAmplitudeTaskModel: +(lightStats.std * X).toFixed(3),
    appliedAmplitudeFullMultiplyModel: +(lightStats.std * X * (paperB / 255)).toFixed(3),
    referenceStd: +REF.std.toFixed(3),
    deltaTaskModelPct: +(((lightStats.std * X - REF.std) / REF.std) * 100).toFixed(2),
    deltaFullMultiplyModelPct: +(((lightStats.std * X * (paperB / 255) - REF.std) / REF.std) * 100).toFixed(2),
  },
  dark: {
    css: `background-image: url(/media/textures/grain-tile-dark.webp); background-size: 256px; opacity: ${(darkTargetStd / darkStats.std).toFixed(3)};`,
    note: 'dark tile mean = #282828 = Madarek charcoal paper -> use plain alpha compositing (NO blend mode): zero colour shift, full amplitude transfer; applied sigma = tile_std * opacity',
    appliedAmplitude: +(darkStats.std * (darkTargetStd / darkStats.std)).toFixed(3),
    target: +darkTargetStd.toFixed(3),
  },
};

const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const measurement = {
  task: 'R314 3-b — paper grain tiles measured against Heron reference',
  generatedAt: new Date().toISOString(),
  generator: 'scripts/r314/make-grain.mjs',
  reference: {
    source: 'audits/evidence/r314/_local/captures/heron/1440x900/light/ (Playwright PNG, DPR 1, srgb, 1440x900)',
    method: 'three VLM-verified bare-paper 200x200 crops; the paper is a fixed .bg-global layer (pixel-identical across scroll frames), so any bare window samples the same paper',
    regions: refRegions.map(r => ({
      frame: r.frame, x: r.x, y: r.y, name: r.name, note: r.note,
      meanLuminance: +r.mean.toFixed(2), std: +r.std.toFixed(3),
      meanAbsLaplacian: +r.meanAbsLaplacian.toFixed(3), hpStd3x3: +r.hpStd3x3.toFixed(3),
      autocorr1px: +r.autocorr1px.toFixed(3),
    })),
    aggregate: {
      meanLuminance: +REF.meanLuminance.toFixed(2), paperNote: REF.paperLuminanceHex,
      std: +REF.std.toFixed(3), meanAbsLaplacian: +REF.meanAbsLaplacian.toFixed(3),
      hpStd3x3: +REF.hpStd3x3.toFixed(3), autocorr1px: +REF.autocorr1px.toFixed(3),
    },
    spectrum: {
      model: 'generation profile = measured radial amplitude rings 5..128 (log-log interpolated), rings 2..4 held at ring-5 level (below 200px-window resolution; measured low rings are taper-leakage-inflated), f<2 zero',
      plateauPowerLawSummary: { f0: bestFit.f0, beta: +bestFit.beta.toFixed(3), A0: +bestFit.A0.toFixed(1) },
    },
  },
  tiles: {
    'grain-tile-light.webp': {
      path: 'frontend/public/media/textures/grain-tile-light.webp',
      workingCopy: 'scripts/r314/out/grain-light.webp',
      bytes: lightSize, sha256_16: sha256(path.join(TEX, 'grain-tile-light.webp')),
      encoding: 'webp lossless (pixel-exact roundtrip)',
      meanLuminance: +lightStats.mean.toFixed(2),
      std: +lightStats.std.toFixed(3),
      meanAbsLaplacian: +lightStats.meanAbsLaplacian.toFixed(3),
      hpStd3x3: +lightStats.hpStd3x3.toFixed(3),
      autocorr1px: +lightStats.autocorr1px.toFixed(3),
      generation: { highFreqTiltGamma: light.gamma, stdGainK: light.gainK, note: 'gamma pre-compensates the high-frequency distortion introduced by white-anchored clipping at 255, so the decoded mean |laplacian| matches the reference' },
      anchor: `white-anchored dark-only grain (multiply-safe): decoded mean ${lightStats.mean.toFixed(2)} -> multiply darkens #F4F4EE paper by ${(244 * (255 - lightStats.mean) / 255).toFixed(2)}/255 at opacity 1 (inside Heron's ±2/255 sampling variance)`,
      tileability: { ...lightSeam, ...lightComp },
    },
    'grain-tile-dark.webp': {
      path: 'frontend/public/media/textures/grain-tile-dark.webp',
      workingCopy: 'scripts/r314/out/grain-dark.webp',
      bytes: darkSize, sha256_16: sha256(path.join(TEX, 'grain-tile-dark.webp')),
      encoding: 'webp lossless (pixel-exact roundtrip)',
      meanLuminance: +darkStats.mean.toFixed(2),
      std: +darkStats.std.toFixed(3),
      meanAbsLaplacian: +darkStats.meanAbsLaplacian.toFixed(3),
      hpStd3x3: +darkStats.hpStd3x3.toFixed(3),
      autocorr1px: +darkStats.autocorr1px.toFixed(3),
      anchor: '#282828 (40,40,40) = Madarek dark paper --neutral-50; symmetric grain (both polarities)',
      targetStd: +darkTargetStd.toFixed(3),
      targetRationale: 'no dark Heron captures exist (r314 light-only; r313 reference light-only) -> task fallback: amplitude x0.8 of light reference, neutral #282828',
      tileability: { ...darkSeam, ...darkComp },
    },
  },
  deltas: {
    'light.std vs reference.std': { tile: +lightStats.std.toFixed(3), reference: +REF.std.toFixed(3), deltaPct: +lightDeltaPct.toFixed(2), gate: '|delta| <= 5%', pass: gates.lightStdWithin5pct },
    'dark.std vs 0.8*reference.std': { tile: +darkStats.std.toFixed(3), target: +darkTargetStd.toFixed(3), deltaPct: +darkDeltaPct.toFixed(2), gate: '|delta| <= 5%', pass: gates.darkStdWithin5pct },
    'light.meanAbsLaplacian vs reference': { tile: +lightStats.meanAbsLaplacian.toFixed(3), reference: +REF.meanAbsLaplacian.toFixed(3), deltaPct: +(((lightStats.meanAbsLaplacian - REF.meanAbsLaplacian) / REF.meanAbsLaplacian) * 100).toFixed(2), gate: '|delta| <= 5% (self-imposed: the task\'s high-frequency-energy metric)', pass: gates.lightLapWithin5pct },
    'light.hpStd3x3 vs reference': { tile: +lightStats.hpStd3x3.toFixed(3), reference: +REF.hpStd3x3.toFixed(3), deltaPct: +(((lightStats.hpStd3x3 - REF.hpStd3x3) / REF.hpStd3x3) * 100).toFixed(1), note: 'informational (recorded, not gated)' },
    'light.autocorr1px vs reference': { tile: +lightStats.autocorr1px.toFixed(3), reference: +REF.autocorr1px.toFixed(3), note: 'informational grain character; one-sided (dark-only) multiply grain cannot keep the symmetric reference\'s small positive lag-1 correlation while also matching std + mean|lap| — the residual is imperceptible at 0.7% amplitude' },
  },
  tileabilityVerdict: {
    method: 'wrap-seam adjacent-pixel |Δ| stats vs interior baseline (a real seam = systematic step/larger deltas at the wrap); plus col/row-mean steps; plus 2x2 composite col/row-mean discontinuity (<1.5 gate)',
    light: gates.lightSeamOk && gates.compositeDiscontinuityLt1_5,
    dark: gates.darkSeamOk && gates.compositeDiscontinuityLt1_5,
  },
  cssRecipe,
  gates,
  allGatesPass: Object.values(gates).every(Boolean),
};
fs.writeFileSync(path.join(import.meta.dirname, 'grain-measure.json'), JSON.stringify(measurement, null, 1) + '\n');

console.log('\n── generated tiles ──');
console.log(`  grain-tile-light.webp  ${lightSize}B  mean=${lightStats.mean.toFixed(2)} std=${lightStats.std.toFixed(3)} (ref ${REF.std.toFixed(3)}, Δ${lightDeltaPct >= 0 ? '+' : ''}${lightDeltaPct.toFixed(2)}%)  mean|lap|=${lightStats.meanAbsLaplacian.toFixed(3)} (ref ${REF.meanAbsLaplacian.toFixed(3)})  hpStd=${lightStats.hpStd3x3.toFixed(3)} (ref ${REF.hpStd3x3.toFixed(3)})  r1=${lightStats.autocorr1px.toFixed(3)} (ref ${REF.autocorr1px.toFixed(3)})`);
console.log(`  grain-tile-dark.webp   ${darkSize}B  mean=${darkStats.mean.toFixed(2)} std=${darkStats.std.toFixed(3)} (target ${darkTargetStd.toFixed(3)}, Δ${darkDeltaPct >= 0 ? '+' : ''}${darkDeltaPct.toFixed(2)}%)`);
console.log(`  micro-grid.svg         ${sizeOf(path.join(TEX, 'micro-grid.svg'))}B`);
console.log('\n── tileability ──');
console.log(`  light: seamAdjRatio=${lightSeam.seamAdjRatio} seamAdjMaxRatio=${lightSeam.seamAdjMaxRatio} colStep=${lightSeam.seamColMeanStep} rowStep=${lightSeam.seamRowMeanStep} 2x2MaxDisc=${lightComp.maxSeamColRowMeanDiscontinuity}`);
console.log(`  dark : seamAdjRatio=${darkSeam.seamAdjRatio} seamAdjMaxRatio=${darkSeam.seamAdjMaxRatio} colStep=${darkSeam.seamColMeanStep} rowStep=${darkSeam.seamRowMeanStep} 2x2MaxDisc=${darkComp.maxSeamColRowMeanDiscontinuity}`);
console.log('\n── css recipe ──');
console.log('  light:', cssRecipe.light.css);
console.log(`         task model applied σ = ${cssRecipe.light.appliedAmplitudeTaskModel} (Δ${cssRecipe.light.deltaTaskModelPct}%) | full multiply model σ = ${cssRecipe.light.appliedAmplitudeFullMultiplyModel} (Δ${cssRecipe.light.deltaFullMultiplyModelPct}%)`);
console.log('  dark :', cssRecipe.dark.css);
console.log('\n── gates ──');
for (const [g, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : 'FAIL'}  ${g}`);
if (!measurement.allGatesPass) {
  console.error('\nGATE FAILURE');
  process.exitCode = 1;
} else {
  console.log('\nall gates pass →', path.join(import.meta.dirname, 'grain-measure.json'));
}
