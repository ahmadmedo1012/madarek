/**
 * R311 BEFORE capture — Phase 0/9 evidence.
 *
 * Captures the R310 baseline's POINTER state at 1440×900 so the
 * app-level duplicate-cursor defect (CursorManager's circular dot/ring
 * competing with the landing's square instrument) is on record BEFORE
 * any R311 change. The DOM audit JSON records the smoking-gun values.
 * Run:  node audits/evidence/r311/capture-before.mjs
 * Serves against the Vite dev server on :5173.
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5173';
const OUT = path.dirname(new URL(import.meta.url).pathname);
const DEST = path.join(OUT, 'before');
fs.mkdirSync(DEST, { recursive: true });

const HEAD = execSync('git rev-parse HEAD', { cwd: '/home/z/madarek' }).toString().trim();
const DIRTY = execSync('git status --porcelain', { cwd: '/home/z/madarek' }).toString().trim();

const audit = {
  mission: 'R311 Phase 1 — before evidence',
  served: 'vite dev :5173 (working tree)',
  commit: HEAD,
  dirty: DIRTY || '(clean)',
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

const readPointerDom = () => {
  const layer = document.querySelector('.cursor-layer');
  const core = document.querySelector('.cursor-dot-core');
  const ring = document.querySelector('.cursor-dot-ring');
  const canvas = document.querySelector('.sc-canvas');
  const scRing = document.querySelector('.sc-ring');
  const stage = document.querySelector('.bp-stage');
  const hiLayer = document.querySelector('.hi-layer');
  const cs = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : '(absent)');
  return {
    cursorLayer: {
      present: !!layer,
      state: layer ? layer.getAttribute('data-state') : null,
      active: layer ? layer.getAttribute('data-active') : null,
    },
    dotCore: { present: !!core, opacity: cs(core, 'opacity') },
    dotRing: { present: !!ring, opacity: cs(ring, 'opacity'), transform: cs(ring, 'transform') },
    sheetCanvas: { present: !!canvas },
    sheetRing: {
      present: !!scRing,
      on: scRing ? scRing.getAttribute('data-on') : null,
      pressed: scRing ? scRing.getAttribute('data-pressed') : null,
    },
    heroStage: {
      cursorAttr: stage ? stage.getAttribute('data-cursor') : null,
      nativeCursor: cs(stage, 'cursor'),
      point: hiLayer ? hiLayer.getAttribute('data-point') : null,
    },
    hiddenVocabulary: document.querySelectorAll('[data-cursor="hidden"]').length,
    noneVocabulary: document.querySelectorAll('[data-cursor="none"]').length,
  };
};

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

console.log('» landing (waits for the entrance to finish)');
await waitLanded(page);

/* A1 — pointer at rest on a blank sheet area. The square sits at the
 * pointer; the global layer's circle hides inside it (same color) —
 * the DOM audit still records both systems ALIVE. */
await page.mouse.move(240, 300);
await page.waitForTimeout(600);
audit.rest = await page.evaluate(readPointerDom);
await shot(page, 'a1-rest-1440.png');

/* A2 — link hover: the reference grammar is the square reticle
 * (.sc-ring). The defect: CursorManager ALSO blooms its 28×28 circular
 * ring over the same target. */
const cta = page.locator('.fo-hero-cta').first();
const ctaBox = await cta.boundingBox();
if (ctaBox) {
  await page.mouse.move(ctaBox.x + ctaBox.width / 2, ctaBox.y + ctaBox.height / 2);
  await page.waitForTimeout(500);
  audit.linkHover = await page.evaluate(readPointerDom);
  await shot(page, 'a2-link-hover-1440.png');
}

/* A3 — hero entry: the local plus (.hi-*) owns the zone per the R310
 * ladder; the defect: the global layer's circular dot keeps painting
 * ON TOP of the plus (it does not honor data-cursor="hidden"). */
const stage = page.locator('.bp-stage').first();
const stageBox = await stage.boundingBox();
if (stageBox) {
  await page.mouse.move(stageBox.x + stageBox.width * 0.5, stageBox.y + stageBox.height * 0.45);
  await page.waitForTimeout(700);
  audit.heroEntry = await page.evaluate(readPointerDom);
  await shot(page, 'a3-hero-plus-1440.png');
}

/* A4 — mid-motion: both followers lerp at their own cadence; the
 * capture freezes the divergence (two glyphs in flight). */
await page.mouse.move(1200, 780);
for (let i = 0; i < 22; i += 1) {
  await page.mouse.move(1200 - i * 38, 780 - i * 26, { steps: 1 });
  if (i === 10) await shot(page, 'a4-moving-1440.png');
}
await page.waitForTimeout(400);
audit.afterMove = await page.evaluate(readPointerDom);

/* A5 — loader: clear the once-per-session intro gate, then reload and
 * catch the entrance early. The loader's own cross/readout owns the
 * pointer per the ladder; the defect: the global circular dot rides
 * over the loader instrument. */
await page.evaluate(() => {
  try { sessionStorage.clear(); } catch { /* storage can be locked */ }
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.querySelector('.sl'), { timeout: 8_000 });
await page.waitForTimeout(2000);
await page.mouse.move(720, 420);
await page.waitForTimeout(400);
audit.loaderEarly = await page.evaluate(readPointerDom);
await shot(page, 'a5-loader-early-1440.png');

fs.writeFileSync(path.join(DEST, 'before-dom-audit.json'), JSON.stringify(audit, null, 2));
console.log('  ✓ before-dom-audit.json');
console.log(JSON.stringify(audit, null, 2));

await browser.close();
console.log('» R311 BEFORE capture complete.');
