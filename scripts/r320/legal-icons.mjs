#!/usr/bin/env node
/**
 * legal-icons.mjs — R320 §D (c2-LEGAL · PAGES-GAP P2-8): render the
 * PWA/manifest icons from the ONE brand mark (public/brand/
 * madarek-mark.svg) at exact sizes 180/192/512.
 *
 * Why a browser renderer and not sharp/canvas: the worktree ships
 * neither sharp nor a canvas binding, but it ships Playwright +
 * Chromium — and Chromium's SVG rasterizer is the SAME engine that
 * renders the mark in the app favicon, so the icons are pixel-faithful
 * to the product's own rendering of its mark.
 *
 * The recipe (maskable contract):
 *  · full-bleed SQUARE paper ground #F6F6EE — ink-on-paper, the
 *    platform's light theme token (manifest theme_color/background);
 *  · the mark centred at 62% of the tile — inside the maskable safe
 *    zone (the central 80% circle), so every launcher mask (circle,
 *    squircle, rounded) keeps the whole star;
 *  · the mark AS-IS (its own copper→gold ramp — no recolouring, the
 *    «no new art» rule from PAGES-GAP).
 *
 * Output: frontend/public/brand/icon-{180,192,512}.png — the PNG IHDR
 * width/height are asserted exactly before writing (the unit belt
 * re-pins them).
 *
 * Run from the repo root:  node scripts/r320/legal-icons.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MARK_PATH = path.join(ROOT, 'frontend', 'public', 'brand', 'madarek-mark.svg');
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'brand');
const SIZES = [180, 192, 512];
/** The mark's share of the tile — comfortably inside the maskable
 * safe zone (central 80%) with the reference's own breathing room. */
const MARK_RATIO = 0.62;
const PAPER = '#F6F6EE';

/** Read a PNG's IHDR width/height (bytes 16..24, big-endian). */
function pngIhdrSize(buf) {
  if (buf.length < 24) throw new Error('PNG too short for an IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const svg = readFileSync(MARK_PATH, 'utf8');

/* The sandbox convention (frontend/playwright.config.ts c4-E note): the
 * worktree runs against the PRE-INSTALLED Chrome-for-Testing build
 * when the bundled headless-shell revision is absent (CI installs its
 * own and never sets the override). */
const EXECUTABLE = process.env.MADAREK_E2E_EXECUTABLE
  ?? '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
});
try {
  for (const size of SIZES) {
    const mark = Math.round(size * MARK_RATIO);
    /* The SVG is inline (not an <img src>) so the screenshot needs no
       file:// URL resolution and the exact viewBox geometry stands. */
    const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    width: ${size}px; height: ${size}px;
    background: ${PAPER};
    display: grid; place-items: center;
    overflow: hidden;
  }
  svg { display: block; width: ${mark}px; height: ${mark}px; }
</style></head>
<body>${svg}</body></html>`;
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: 'load' });
    const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    const ihdr = pngIhdrSize(png);
    if (ihdr.width !== size || ihdr.height !== size) {
      throw new Error(`icon-${size}: IHDR ${ihdr.width}x${ihdr.height} ≠ ${size}x${size}`);
    }
    const out = path.join(OUT_DIR, `icon-${size}.png`);
    writeFileSync(out, png);
    console.log(`✓ icon-${size}.png — IHDR ${ihdr.width}x${ihdr.height} exact, ${(png.length / 1024).toFixed(1)}KB`);
  }
} finally {
  await browser.close();
}
