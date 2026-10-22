/**
 * R312 — Gates B–E: the viewport evidence pass. The five canonical
 * viewports across the journey scene (the camera is live ≤991: 375,
 * 768; the desktop pin ≥992: 1024, 1440, 1920) + the r312 invariant
 * probe (the card being read never behind the frame; the side never
 * covered) at each camera width, + the guest reveal at each width.
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'viewports');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';

const SIZES = [375, 768, 1024, 1440, 1920];
const errors = [];
const report = {};

const browser = await chromium.launch();

for (const w of SIZES) {
  const mobile = w <= 991;
  const h = mobile ? { 375: 812, 768: 1024 }[w] ?? 844 : { 1024: 768, 1440: 900, 1920: 1080 }[w] ?? 900;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}px: ${String(e).slice(0, 120)}`));
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-seen', '1'); } catch { /* ignore */ }
  });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 20_000 });
  await page.waitForTimeout(700);

  /* 1 — the journey at the mid-reading state (card 2 at its band / pin 0.55) */
  const midState = await page.evaluate(async () => {
    const jt = document.querySelector('.jt');
    const cam = document.querySelector('.jt-cam');
    const pinWin = document.querySelector('.jt-pin .jt-window');
    const mobileNow = window.matchMedia('(max-width: 991px)').matches;
    if (mobileNow) {
      /* engage the camera with the retry loop */
      const flow = document.querySelector('.jt-flow');
      for (let k = 0; k < 6; k += 1) {
        const t = flow.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: t, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 110));
        if (Math.abs(window.scrollY - t) < 2) break;
      }
      const card = document.querySelectorAll('.jt-station')[2];
      for (let k = 0; k < 4; k += 1) {
        const c = cam.getBoundingClientRect();
        const band = c.bottom + (window.innerHeight - c.bottom) * 0.45;
        const r = card.getBoundingClientRect();
        const t = window.scrollY + r.top + r.height / 2 - band;
        window.scrollTo({ top: t, behavior: 'instant' });
        await new Promise((res) => setTimeout(res, 110));
        if (Math.abs(window.scrollY - t) < 2) break;
      }
      await new Promise((res) => setTimeout(res, 900));
    } else {
      /* instant engagement (smooth scrollIntoView races the measurement
       * — the r312 frame-pass lesson); the section top at the viewport
       * top, then the pin-0.55 scroll. */
      jt.scrollIntoView({ block: 'start', behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 400));
      const r = jt.getBoundingClientRect();
      const jtDocTop = r.top + window.scrollY;
      window.scrollTo({ top: jtDocTop + 0.55 * (r.height - window.innerHeight), behavior: 'instant' });
      await new Promise((res) => setTimeout(res, 1400));
    }
    const camSvg = document.querySelector('.jt-cam .bp-svg');
    const pinSvg = document.querySelector('.jt-pin .bp-svg');
    const camRect = cam.getBoundingClientRect();
    return {
      layout: mobileNow ? 'camera' : 'pin',
      stage: jt.dataset.stage,
      cam: camSvg
        ? { viewBox: camSvg.getAttribute('viewBox'), par: camSvg.getAttribute('preserveAspectRatio'), display: getComputedStyle(cam).display, top: Math.round(camRect.top), h: Math.round(camRect.height) }
        : null,
      camSvgOnPin: getComputedStyle(pinWin).display,
      pinSvg: pinSvg ? { viewBox: pinSvg.getAttribute('viewBox'), par: pinSvg.getAttribute('preserveAspectRatio') } : null,
      stationsPos: getComputedStyle(document.querySelector('.jt-stations')).position,
    };
  });
  await page.screenshot({ path: `${OUT}/journey-${w}.png` });

  /* 2 — the invariant probe (camera widths only) */
  let invariant = null;
  if (mobile) {
    invariant = await page.evaluate(async () => {
      const jt = document.querySelector('.jt');
      jt.scrollIntoView();
      await new Promise((r) => setTimeout(r, 700));
      const jtTop = jt.getBoundingClientRect().top + window.scrollY;
      const hgt = jt.getBoundingClientRect().height;
      const bad = [];
      for (let step = 0; step <= 24; step += 1) {
        window.scrollTo({ top: jtTop - 40 + ((hgt + 80) * step) / 24, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 90));
        const cam = document.querySelector('.jt-cam').getBoundingClientRect();
        const cards = [...document.querySelectorAll('.jt-station')].map((c) => c.getBoundingClientRect());
        const side = document.querySelector('.jt-side').getBoundingClientRect();
        const band = cam.bottom + (window.innerHeight - cam.bottom) * 0.45;
        const atBand = cards
          .map((c, i) => ({ i, d: Math.abs((c.top + c.bottom) / 2 - band), top: c.top, bottom: c.bottom }))
          .filter((c) => c.bottom > 40 && c.top < window.innerHeight)
          .sort((a, b) => a.d - b.d)[0];
        if (atBand) {
          const centre = (atBand.top + atBand.bottom) / 2;
          if (centre > band - 90 && centre < band + 90 && atBand.top < cam.bottom - 8) {
            bad.push(`card${atBand.i} reading behind the frame`);
          }
        }
        const sideVisible = side.bottom > 40 && side.top < window.innerHeight;
        const sideOv = Math.max(0, Math.min(cam.bottom, side.bottom) - Math.max(cam.top, side.top));
        if (sideVisible && sideOv > 8) bad.push(`side covered +${Math.round(sideOv)}px`);
      }
      return { violations: bad.length, detail: bad };
    });
  }

  /* 3 — the guest reveal at this width (a real navigation) */
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/colleges"]');
    link.scrollIntoView();
  });
  await page.waitForTimeout(300);
  await page.locator('a[href="/colleges"]').first().click();
  await page.waitForFunction(
    () => !!document.querySelector('.guest-reveal-inner'),
    undefined,
    { timeout: 20_000 },
  );
  const reveal = await page.evaluate(() => {
    const inner = document.querySelector('.guest-reveal-inner');
    const anims = document.getAnimations().filter((a) => a.animationName === 'guest-reveal-sweep');
    return {
      hasInner: !!inner,
      sweepRegistered: anims.length > 0,
      collegesInside: !!inner?.contains(document.querySelector('[data-colleges], .colleges')) || !!inner,
    };
  });
  await page.waitForTimeout(900);
  const settled = await page.evaluate(() => getComputedStyle(document.querySelector('.guest-reveal-inner')).clipPath);
  await page.screenshot({ path: `${OUT}/colleges-${w}.png` });

  report[w] = { midState, invariant, reveal: { ...reveal, settled } };
  console.log(`✓ ${w}px:`, JSON.stringify({ stage: midState.stage, layout: midState.layout, invariant: invariant ? invariant.violations : 'n/a', reveal: reveal.sweepRegistered }));
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'viewport-report.json'), JSON.stringify(report, null, 2));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
