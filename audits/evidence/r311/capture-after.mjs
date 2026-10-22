/**
 * R311 AFTER capture — Gate A evidence.
 *
 * Mirrors capture-before.mjs state-for-state on the FIXED tree: the
 * landing must show exactly ONE pointer glyph per state — the square
 * sheet instrument — and the app-level circular layer must be absent
 * (DOM count zero) across rest, link hover, hero entry, motion, and
 * the loader. Crops (4×) around the pointer make the glyphs readable
 * for independent review.
 * Run:  node audits/evidence/r311/capture-after.mjs
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5173';
const OUT = path.dirname(new URL(import.meta.url).pathname);
const DEST = path.join(OUT, 'after');
fs.mkdirSync(DEST, { recursive: true });

const HEAD = execSync('git rev-parse HEAD', { cwd: '/home/z/madarek' }).toString().trim();
const audit = {
  mission: 'R311 Phase 1 — after (Gate A) evidence',
  served: 'vite dev :5173 (working tree)',
  commit: HEAD,
  viewport: '1440x900',
  captured: [],
};

async function waitLanded(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
  await page.waitForTimeout(1200);
}

async function shot(page, file) {
  await page.screenshot({ path: path.join(DEST, file), fullPage: false });
  console.log('  ✓', file);
  audit.captured.push(file);
}

async function cropAt(page, x, y, file) {
  const W = 360;
  const H = 240;
  const x0 = Math.max(0, Math.min(1440 - W, x - W / 2));
  const y0 = Math.max(0, Math.min(900 - H, y - H / 2));
  await page.screenshot({ path: path.join(DEST, file), clip: { x: x0, y: y0, width: W, height: H }, scale: 'device' });
  console.log('  ✓', file, `@(${Math.round(x)},${Math.round(y)})`);
  audit.captured.push(file);
}

const readPointerDom = () => {
  const layer = document.querySelector('.cursor-layer');
  const core = document.querySelector('.cursor-dot-core');
  const canvas = document.querySelector('.sc-canvas');
  const scRing = document.querySelector('.sc-ring');
  const stage = document.querySelector('.bp-stage');
  const hiLayer = document.querySelector('.hi-layer');
  const plus = document.querySelector('.hi-plus');
  const sl = document.querySelector('.sl');
  const cs = (el, p) => (el ? getComputedStyle(el).getPropertyValue(p) : '(absent)');
  return {
    cursorLayerCount: document.querySelectorAll('.cursor-layer').length,
    dotCoreCount: document.querySelectorAll('.cursor-dot-core').length,
    sheetCanvas: !!canvas,
    sheetRing: { on: scRing ? scRing.getAttribute('data-on') : null, pressed: scRing ? scRing.getAttribute('data-pressed') : null },
    heroStage: {
      cursorAttr: stage ? stage.getAttribute('data-cursor') : null,
      nativeCursor: cs(stage, 'cursor'),
      point: hiLayer ? hiLayer.getAttribute('data-point') : null,
      plusOpacity: cs(plus, 'opacity'),
    },
    loader: sl ? { attr: sl.getAttribute('data-cursor') } : null,
    hiddenVocabulary: document.querySelectorAll('[data-cursor="hidden"]').length,
    noneVocabulary: document.querySelectorAll('[data-cursor="none"]').length,
  };
};

/* ── full-context pass (hover + hero + motion) ── */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
console.log('» landing (waits for the entrance to finish)');
await waitLanded(page);

/* A1 — rest */
await page.mouse.move(240, 300);
await page.waitForTimeout(600);
audit.rest = await page.evaluate(readPointerDom);
await shot(page, 'a1-rest-1440.png');

/* A2 — link hover (square reticle; NO circular ring) */
const cta = page.locator('.fo-hero-cta').first();
const ctaBox = await cta.boundingBox();
const cx = ctaBox.x + ctaBox.width / 2;
const cy = ctaBox.y + ctaBox.height / 2;
await page.mouse.move(cx, cy);
await page.waitForTimeout(500);
audit.linkHover = await page.evaluate(readPointerDom);
await shot(page, 'a2-link-hover-1440.png');

/* A3 — hero entry (local plus owns; no circle) */
const stage = page.locator('.bp-stage').first();
const sb = await stage.boundingBox();
const sx = sb.x + sb.width * 0.5;
const sy = sb.y + sb.height * 0.45;
await page.mouse.move(sx, sy);
await page.waitForTimeout(700);
audit.heroEntry = await page.evaluate(readPointerDom);
await shot(page, 'a3-hero-plus-1440.png');

/* A4 — mid-motion (square + trail in flight; no second glyph) */
await page.mouse.move(1200, 780);
for (let i = 0; i < 22; i += 1) {
  await page.mouse.move(1200 - i * 38, 780 - i * 26, { steps: 1 });
  if (i === 10) await shot(page, 'a4-moving-1440.png');
}
await page.waitForTimeout(400);
audit.afterMove = await page.evaluate(readPointerDom);
await browser.close();

/* ── 4× crop pass (readable glyphs for independent review) ── */
const bCrop = await chromium.launch();
const page2 = await bCrop.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 });
await waitLanded(page2);
const cta2 = page2.locator('.fo-hero-cta').first();
const b2 = await cta2.boundingBox();
await page2.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
await page2.waitForTimeout(600);
await cropAt(page2, b2.x + b2.width / 2, b2.y + b2.height / 2, 'a2-crop-link-hover-1440.png');
const stage2 = page2.locator('.bp-stage').first();
const s2 = await stage2.boundingBox();
await page2.mouse.move(s2.x + s2.width * 0.5, s2.y + s2.height * 0.45);
await page2.waitForTimeout(800);
await cropAt(page2, s2.x + s2.width * 0.5, s2.y + s2.height * 0.45, 'a3-crop-hero-plus-1440.png');
const dom2 = await page2.evaluate(readPointerDom);
console.log('crop-pass DOM:', JSON.stringify(dom2));
await bCrop.close();

/* ── loader pass (fresh session) ── */
const bLoad = await chromium.launch();
const page3 = await bLoad.newPage({ viewport: { width: 1440, height: 900 } });
await page3.addInitScript(() => {
  try { sessionStorage.clear(); } catch { /* ignore */ }
});
await page3.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page3.waitForFunction(() => !!document.querySelector('.sl'), { timeout: 8_000 });
await page3.waitForTimeout(2000);
await page3.mouse.move(720, 420);
await page3.waitForTimeout(400);
audit.loaderEarly = await page3.evaluate(readPointerDom);
await shot(page3, 'a5-loader-early-1440.png');
await bLoad.close();

fs.writeFileSync(path.join(DEST, 'after-dom-audit.json'), JSON.stringify(audit, null, 2));
console.log('  ✓ after-dom-audit.json');
console.log(JSON.stringify(audit, null, 2));
console.log('» R311 AFTER (Gate A) capture complete.');
