/**
 * R310 baseline capture — Phase 0 evidence.
 *
 * Captures the R309 starting point at the spec's required viewports
 * and interaction states, into audits/evidence/r310/baseline/.
 * Run:  node audits/evidence/r310/capture-baseline.mjs
 * Serves against the Vite dev server on :5173.
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5173';
const OUT = path.dirname(new URL(import.meta.url).pathname);

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 },
  { name: '430x932', width: 430, height: 932 },
];

const LOADER_TIMEOUT = 22_000; /* the R309 entrance clock ≈9.3s + margin */

async function waitLanded(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  /* Stage 1 — the app shell mounts (.fo-hero exists). NOTE: the
   * loader renders null during its first effect cycle (play=false
   * until shouldPlayIntro resolves), so .sl's ABSENCE alone proves
   * nothing at this point. */
  await page.waitForFunction(() => !!document.querySelector('.fo-hero'), {
    timeout: 15_000,
  });
  /* Stage 2 — let the loader decision settle (one macrotask + margin):
   * after this, .sl either exists (the entrance is playing) or will
   * never exist (gate skipped it). */
  await page.waitForTimeout(400);
  /* Stage 3 — if the entrance is playing, wait for its full exit
   * (.sl unmounts ≈10.6s later under the R309 clock). */
  await page.waitForFunction(() => !document.querySelector('.sl'), {
    timeout: LOADER_TIMEOUT,
  });
  await page.waitForTimeout(1200);
}

async function shot(page, file) {
  await page.screenshot({ path: path.join(OUT, 'baseline', file), fullPage: false });
  console.log('  ✓', file);
}

const browser = await chromium.launch();

/* ══ 1 · Desktop 1440×900 — the full state matrix ══════════════════ */
{
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[0], deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await waitLanded(page);

  /* 1a · clean top */
  await shot(page, 'desktop/d01-top-1440.png');

  /* 1b · cursor idle over blank area (square dot, no trail) */
  await page.mouse.move(700, 500);
  await page.waitForTimeout(700); /* settle + sleep */
  await shot(page, 'cursor/c01-idle-1440.png');

  /* 1c · cursor moving (trail visible) — sweep + mid-sweep shot */
  await page.mouse.move(200, 480, { steps: 2 });
  for (let i = 0; i < 12; i += 1) {
    await page.mouse.move(200 + i * 90, 480 + Math.sin(i) * 120, { steps: 3 });
  }
  await shot(page, 'cursor/c02-moving-trail-1440.png');

  /* 1d · hover over a link/button (ring state) */
  await page.mouse.move(1210, 40, { steps: 8 }); /* header nav area */
  await page.waitForTimeout(350);
  await shot(page, 'cursor/c03-hover-link-1440.png');

  /* 1e · hero inspection instrument (guides + plus + readout) */
  const stage = page.locator('div.bp-stage').first();
  const sb = await stage.boundingBox();
  if (sb) {
    await page.mouse.move(sb.x + sb.width * 0.55, sb.y + sb.height * 0.45, { steps: 10 });
    await page.waitForTimeout(500);
    await shot(page, 'cursor/c04-hero-guides-1440.png');

    /* 1f · active drag (selection box + revealed markers) */
    await page.mouse.move(sb.x + sb.width * 0.22, sb.y + sb.height * 0.35, { steps: 4 });
    await page.mouse.down();
    for (let i = 1; i <= 14; i += 1) {
      await page.mouse.move(
        sb.x + sb.width * 0.22 + (sb.width * 0.6 * i) / 14,
        sb.y + sb.height * 0.35 + (sb.height * 0.42 * i) / 14,
        { steps: 2 },
      );
    }
    await shot(page, 'cursor/c05-drag-box-1440.png');
    await page.mouse.up();
    await page.waitForTimeout(400);
    await shot(page, 'cursor/c06-drag-released-markers-1440.png');
  }

  /* 1g · scroll states */
  const states = [
    ['d02-statement', '#statement'],
    ['d03-journey-start', '#chapters'],
    ['d04-journey-mid', null], /* mid-journey: scroll set below */
    ['d05-product', '#product'],
    ['d06-roles', '#roles'],
    ['d07-footer', '.fo-footer'],
  ];
  for (const [name, sel] of states) {
    if (sel) await page.locator(sel).scrollIntoViewIfNeeded();
    if (name === 'd04-journey-mid') {
      const jt = await page.locator('.jt').boundingBox();
      if (jt) await page.evaluate((y) => window.scrollTo(0, y), jt.y + jt.height * 0.45);
    }
    await page.waitForTimeout(1100);
    await shot(page, `desktop/${name}-1440.png`);
  }

  /* 1h · footer lens over the strip */
  const strip = page.locator('.fl');
  const fb = await strip.boundingBox();
  if (fb) {
    await page.mouse.move(fb.x + fb.width * 0.35, fb.y + fb.height * 0.5, { steps: 12 });
    await page.waitForTimeout(800);
    await shot(page, 'cursor/c07-footer-lens-1440.png');
  }
  await ctx.close();
}

/* ══ 2 · The other viewports — top + journey ═══════════════════════ */
for (const vp of VIEWPORTS.slice(1)) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await waitLanded(page);
  const dir = vp.width <= 430 ? 'mobile' : 'desktop';
  await shot(page, `${dir}/top-${vp.name}.png`);
  const jt = page.locator('.jt');
  if (await jt.count()) {
    await jt.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await shot(page, `${dir}/journey-${vp.name}.png`);
  }
  await ctx.close();
}

/* ══ 3 · Reduced-motion desktop — static contract ══════════════════ */
{
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[0],
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await waitLanded(page);
  await shot(page, 'desktop/reduced-motion-top-1440.png');
  await ctx.close();
}

await browser.close();
console.log('R310 baseline capture complete.');
