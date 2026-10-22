/**
 * R312 — Phase 3 (§R R1) evidence capture: the mobile camera of the
 * learning plan.
 *
 * Captures, at mobile widths (390 primary; 430/360 spot checks):
 *  · the camera engaged at every reading band (station i at the
 *    viewport centre → the sheet cropped to that stage's zone);
 *  · the sticky frame geometry (data-stage, live viewBox, computed
 *    sticky position, the twin/pin display states) → mobile-dom-audit.json;
 *  · the end-of-flow side column + the desktop crossing (resize to
 *    1280 → the twin restored, the pin's window back with the FULL
 *    sheet) → crossing-dom-audit.json;
 *  · the desktop journey regression frame (1440, full sheet).
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname);
fs.mkdirSync(OUT, { recursive: true });

const BASE = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';
const errors = [];

async function land(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  /* the 3-stage loader wait (the r310 lesson — .sl absence proves
     nothing until the decision settles) */
  await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
  await page.waitForTimeout(400);
  await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
  await page.waitForTimeout(600);
}

function camState(page) {
  return page.evaluate(() => {
    const track = document.querySelector('.jt');
    const camSvg = document.querySelector('.jt-cam .bp-svg');
    const cam = document.querySelector('.jt-cam');
    const pinWindow = document.querySelector('.jt-pin .jt-window');
    const pinSvg = document.querySelector('.jt-pin .bp-svg');
    const stations = document.querySelector('.jt-stations');
    const camRect = cam?.getBoundingClientRect();
    return {
      stage: track?.dataset.stage ?? null,
      cam: camSvg
        ? {
            viewBox: camSvg.getAttribute('viewBox'),
            par: camSvg.getAttribute('preserveAspectRatio'),
            flagged: camSvg.dataset.cam ?? null,
            display: getComputedStyle(cam).display,
            position: getComputedStyle(cam).position,
            top: camRect ? Math.round(camRect.top) : null,
            height: camRect ? Math.round(camRect.height) : null,
          }
        : null,
      pinWindow: pinWindow ? { display: getComputedStyle(pinWindow).display } : null,
      pinSvg: pinSvg ? { viewBox: pinSvg.getAttribute('viewBox'), par: pinSvg.getAttribute('preserveAspectRatio') } : null,
      stationsHeight: stations ? Math.round(stations.getBoundingClientRect().height) : null,
      statusPosition: getComputedStyle(document.querySelector('.jt-status')).position,
    };
  });
}

/** scroll so the i-th station card sits at the READING band — the
 * driver's own formula: the open region below the camera frame's live
 * bottom edge (JourneyScene's contract). */
async function readAt(page, i) {
  await page.evaluate((idx) => {
    const card = document.querySelectorAll('.jt-station')[idx];
    const cam = document.querySelector('.jt-cam').getBoundingClientRect();
    const band = cam.bottom + (window.innerHeight - cam.bottom) * 0.45;
    const r = card.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - band, behavior: 'instant' });
  }, i);
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch();
const audit = {};

/* ── the primary mobile pass: 390×844 ───────────────────────────── */
{
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  page.on('pageerror', (e) => errors.push(`390: ${String(e).slice(0, 150)}`));
  await land(page, BASE + '/');

  await page.evaluate(() => {
    const jt = document.querySelector('.jt');
    window.scrollTo({ top: jt.getBoundingClientRect().top + window.scrollY - 60, behavior: 'instant' });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/cam-a-entry-390.png` });
  audit.entry = await camState(page);

  await readAt(page, 0);
  await page.screenshot({ path: `${OUT}/cam-b-stage0-390.png` });
  audit.stage0 = await camState(page);

  await readAt(page, 1);
  await page.screenshot({ path: `${OUT}/cam-c-stage1-390.png` });
  audit.stage1 = await camState(page);

  await readAt(page, 2);
  await page.screenshot({ path: `${OUT}/cam-d-stage2-390.png` });
  audit.stage2 = await camState(page);

  await readAt(page, 3);
  await page.screenshot({ path: `${OUT}/cam-e-stage3-390.png` });
  audit.stage3 = await camState(page);

  /* the end of flow: the side column closes (order 3) */
  await page.evaluate(() => {
    const side = document.querySelector('.jt-side');
    const r = side.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top - 80, behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/cam-f-side-390.png` });
  audit.sideEnd = await camState(page);

  /* the full-page flow frame */
  await page.screenshot({ path: `${OUT}/cam-g-fullpage-390.png`, fullPage: true });

  /* the ≥992px crossing: resize to 1280 in the SAME session */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  await page.waitForTimeout(1200);
  const crossing = await camState(page);
  audit.crossingToDesktop = crossing;
  await page.screenshot({ path: `${OUT}/cam-h-crossing-desktop.png` });

  /* and back down to mobile — re-enter the journey first (the reflow
     after the resize lands deep past the section), then read card 2 */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const jt = document.querySelector('.jt');
    window.scrollTo({ top: jt.getBoundingClientRect().top + window.scrollY - 60, behavior: 'instant' });
  });
  await page.waitForTimeout(900);
  await readAt(page, 2);
  await page.screenshot({ path: `${OUT}/cam-i-crossing-back-390.png` });
  audit.crossingBackMobile = await camState(page);
  await page.close();
}

/* ── spot widths: 430 · 360 ─────────────────────────────────────── */
for (const w of [430, 360]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${String(e).slice(0, 150)}`));
  await land(page, BASE + '/');
  const jt = page.locator('.jt');
  await jt.scrollIntoViewIfNeeded();
  await readAt(page, 2);
  await page.screenshot({ path: `${OUT}/cam-spot-stage2-${w}.png` });
  audit[`spot${w}`] = await camState(page);
  await page.close();
}

/* ── the desktop regression frame: 1440, the pin's full sheet ───── */
{
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', (e) => errors.push(`1440: ${String(e).slice(0, 150)}`));
  await land(page, BASE + '/');
  const jt = page.locator('.jt');
  await jt.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const t = document.querySelector('.jt');
    const r = t.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + r.height * 0.6 - window.innerHeight / 2, behavior: 'instant' });
  });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/cam-desktop-1440-stage2.png` });
  audit.desktop1440 = await camState(page);
  await page.close();
}

fs.writeFileSync(`${OUT}/mobile-dom-audit.json`, JSON.stringify(audit, null, 2));
console.log('audit states:', Object.keys(audit).length);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
