/**
 * R311 BEFORE crop capture — zoomed evidence around the pointer.
 *
 * The full-viewport shots are hard to read for small pointer glyphs;
 * these clips zoom the exact pointer neighbourhood (4× via CSS
 * transform is avoided — physical pixels are cropped, then upscaled
 * with Playwright's deviceScaleFactor=4 on a clipped region).
 * Run:  node audits/evidence/r311/capture-before-crops.mjs
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5173';
const OUT = path.dirname(new URL(import.meta.url).pathname);
const DEST = path.join(OUT, 'before');
fs.mkdirSync(DEST, { recursive: true });

async function waitLanded(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
  await page.waitForTimeout(1200);
}

/** Clip a 360x240 box centred on (x,y), bounded to the viewport, and
 *  shoot it at deviceScaleFactor 4 so the glyphs are unambiguous. */
async function cropAt(page, x, y, file) {
  const W = 360;
  const H = 240;
  const x0 = Math.max(0, Math.min(1440 - W, x - W / 2));
  const y0 = Math.max(0, Math.min(900 - H, y - H / 2));
  await page.screenshot({
    path: path.join(DEST, file),
    clip: { x: x0, y: y0, width: W, height: H },
    scale: 'device',
  });
  console.log('  ✓', file, `@(${x},${y})`);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 4,
});
await waitLanded(page);

/* hover the CTA — the link state: square reticle (reference grammar)
 * + the 28×28 circular ring bloom (the defect). */
const cta = page.locator('.fo-hero-cta').first();
const ctaBox = await cta.boundingBox();
const cx = ctaBox.x + ctaBox.width / 2;
const cy = ctaBox.y + ctaBox.height / 2;
await page.mouse.move(cx, cy);
await page.waitForTimeout(600);
await cropAt(page, cx, cy, 'a2-crop-link-hover-1440.png');

/* press on the CTA — pressed state: contracted square reticle + the
 * global layer's own press scale on the circle. The pointer MOVES
 * AWAY before release so no click fires (down+up on the same target
 * is a click — it would navigate to /auth/register and unmount the
 * landing). */
await page.mouse.down();
await page.waitForTimeout(300);
await cropAt(page, cx, cy, 'a2-crop-link-pressed-1440.png');
await page.mouse.move(120, 160, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(300);

/* hero entry — the local plus owns the zone; the global circle rides
 * on top of it. */
const stage = page.locator('.bp-stage').first();
const sb = await stage.boundingBox();
const sx = sb.x + sb.width * 0.5;
const sy = sb.y + sb.height * 0.45;
await page.mouse.move(sx, sy);
await page.waitForTimeout(800);
await cropAt(page, sx, sy, 'a3-crop-hero-plus-1440.png');

const dom = await page.evaluate(() => {
  const layer = document.querySelector('.cursor-layer');
  const core = document.querySelector('.cursor-dot-core');
  const plus = document.querySelector('.hi-plus');
  return {
    cursorLayer: layer ? layer.getAttribute('data-state') : null,
    dotCoreOpacity: core ? getComputedStyle(core).opacity : null,
    dotCoreTransform: core ? getComputedStyle(core).transform : null,
    plusOpacity: plus ? getComputedStyle(plus).opacity : null,
  };
});
console.log('hero crop DOM:', JSON.stringify(dom));

await browser.close();
console.log('» crop capture complete.');
