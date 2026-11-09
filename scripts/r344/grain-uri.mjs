#!/usr/bin/env node
/**
 * grain-uri.mjs — R344 C-6: the paper-grain tiles as deterministic inline
 * SVG data-URIs (feTurbulence), tuned against the r314 measurement record
 * (scripts/r314/grain-measure.json — the same std/mean/laplacian targets the
 * webp tiles were built to):
 *   light: white-anchored dark-only speckle, mean 253.83, std 1.739,
 *          mean|laplacian| 0.813 (multiply-safe: pixels ≤ 255, dips only)
 *   dark:  #282828-anchored symmetric grain, mean 40, std 1.392, lap 0.679
 *
 * Method: candidate SVG (feTurbulence fractalNoise + feColorMatrix) →
 * data-URI → in-page canvas decode → measure (mean/std/|lap| over the
 * 256×256 tile, 4-neighbour laplacian /4 — the r314 metric) → sweep
 * baseFrequency (the high-frequency character) and gain/threshold (the
 * amplitude) until every target matches within the r314 tolerances.
 * feTurbulence is deterministic per seed: the emitted URI renders
 * byte-identically on every load — no raster asset needed.
 *
 * Usage: node scripts/r344/grain-uri.mjs          (tune + print the URIs)
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKTREE = join(__dirname, "..", "..");
const { chromium } = createRequire(join(WORKTREE, "frontend", "package.json"))("playwright");
const rec = JSON.parse(readFileSync(join(WORKTREE, "scripts", "r314", "grain-measure.json"), "utf8"));
const T = {
  light: { mean: rec.tiles["grain-tile-light.webp"].meanLuminance, std: rec.tiles["grain-tile-light.webp"].std, lap: rec.tiles["grain-tile-light.webp"].meanAbsLaplacian },
  dark: { mean: rec.tiles["grain-tile-dark.webp"].meanLuminance, std: rec.tiles["grain-tile-dark.webp"].std, lap: rec.tiles["grain-tile-dark.webp"].meanAbsLaplacian },
};
console.log("targets:", T);

/* the micro-grid stays an inline SVG data-URI too (1px dot, 24px cell) */
const microGrid =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='12' y='12' width='1' height='1' fill='%23B3B3AF' fill-opacity='0.4'/%3E%3C/svg%3E";

const svgUri = (svg) => "data:image/svg+xml," + encodeURIComponent(svg);

function lightSvg(freq, oct, seed, gain, thr) {
  // R_out = 1 - gain*(R_in - thr)  (clamped [0,1] by feColorMatrix) — white
  // with dark dips only (multiply-safe); same for G/B.
  const off = (1 + gain * thr).toFixed(4);
  const g = (-gain).toFixed(4), o = (gain * thr).toFixed(4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="f" x="0" y="0" width="256" height="256" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 ${off} ${g} 0 0 0 ${off} 0 ${g} 0 0 ${off} 0 0 0 0 1"/></filter><rect width="256" height="256" filter="url(#f)"/></svg>`;
}
function darkSvg(freq, oct, seed, gain, off) {
  // R_out = 40/255 + gain*(R_in - 0.5) — symmetric around the charcoal
  // (#282828); alpha stays 1 (opaque tile).
  // feTurbulence's per-channel values empirically average ~5.09 in this
  // filter chain (Chromium; measured in-page) — the offset calibrates the
  // anchor to #282828 against that empirical mean.
  const g = gain; // off arrives as the 5th parameter (calibrated per gain)
  const M = `${g.toFixed(4)} 0 0 0 ${off.toFixed(4)} 0 ${g.toFixed(4)} 0 0 ${off.toFixed(4)} 0 0 ${g.toFixed(4)} 0 ${off.toFixed(4)} 0 0 0 0 1`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="f" x="0" y="0" width="256" height="256" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="${M}"/></filter><rect width="256" height="256" filter="url(#f)"/></svg>`;
}

const MEASURE_JS = `async (uri) => {
  const img = new Image();
  img.decoding = "sync";
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = uri; });
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 256, 256);
  const d = ctx.getImageData(0, 0, 256, 256).data;
  const N = 256 * 256;
  const lum = new Float64Array(N);
  for (let i = 0; i < N; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  let mean = 0; for (let i = 0; i < N; i++) mean += lum[i];
  mean /= N;
  let v = 0; for (let i = 0; i < N; i++) v += (lum[i] - mean) ** 2;
  const std = Math.sqrt(v / N);
  let lap = 0, cnt = 0;
  for (let y = 1; y < 255; y++) for (let x = 1; x < 255; x++) {
    const i = y * 256 + x;
    lap += Math.abs(4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - 256] - lum[i + 256]);
    cnt++;
  }
  return { mean, std, lap: lap / (4 * cnt) };
}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
await page.goto("about:blank");
const measure = (uri) => page.evaluate(`(${MEASURE_JS})(${JSON.stringify(uri)})`).catch((e) => ({ error: String(e) }));

/* ── tune: light ──────────────────────────────────────────────────────────── */
let bestL = null;
for (const freq of [0.18, 0.22, 0.25, 0.3, 0.4, 0.55]) {
  // per freq: solve gain for std — the std of x=clamp(1-g(n-thr)) is roughly
  // g * std_n_eff; sweep gain finely.
  for (const gain of [0.02, 0.04, 0.06, 0.08, 0.12, 0.16, 0.24, 0.36, 0.5]) {
    for (const thr of [0.0, 0.15, 0.3]) {
      const uri = svgUri(lightSvg(freq, 1, 11, gain, thr));
      const m = await measure(uri);
      if (m.error) continue;
      const err = Math.abs(m.std - T.light.std) / T.light.std + Math.abs(m.lap - T.light.lap) / T.light.lap + Math.abs(m.mean - T.light.mean) / T.light.mean;
      if (!bestL || err < bestL.err) bestL = { err, freq, gain, thr, ...m };
    }
  }
}
console.log("light best:", bestL);

/* ── tune: dark ───────────────────────────────────────────────────────────── */
let bestD = null;
for (const freq of [0.2, 0.25, 0.3, 0.4, 0.55]) {
  for (const gain of [0.02, 0.028, 0.04, 0.055, 0.075, 0.1]) {
    let lo = -1.2, hi = 0.6, off = 0, m = null;
    for (let i = 0; i < 7; i++) {
      off = (lo + hi) / 2;
      m = await measure(svgUri(darkSvg(freq, 1, 11, gain, off)));
      if (!m || m.error) { m = null; break; }
      if (m.mean > T.dark.mean) hi = off; else lo = off;
    }
    if (!m) continue;
    const err = Math.abs(m.std - T.dark.std) / T.dark.std + Math.abs(m.lap - T.dark.lap) / T.dark.lap + Math.abs(m.mean - T.dark.mean) / T.dark.mean;
    if (!bestD || err < bestD.err) bestD = { err, freq, gain, off, ...m };
  }
}
console.log("dark best:", bestD);
await browser.close();

const out = {
  microGrid,
  light: svgUri(lightSvg(bestL.freq, 1, 11, bestL.gain, bestL.thr)),
  dark: svgUri(darkSvg(bestD.freq, 1, 11, bestD.gain, bestD.off)),
  measured: { light: bestL, dark: bestD },
};
writeFileSync("/tmp/r344/grain-uri.json", JSON.stringify(out, null, 1));
console.log("→ /tmp/r344/grain-uri.json");
console.log("light uri len:", out.light.length, "| dark uri len:", out.dark.length);
