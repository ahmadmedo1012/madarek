/**
 * R312 — the production verification belt: the camera + the guest
 * reveal re-captured LIVE on madarek.onrender.com (fresh contexts;
 * the build identity recorded first). The same states as the local
 * evidence, against the deployed bundle.
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'production');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://madarek.onrender.com';
const errors = [];
const report = {};

const browser = await chromium.launch();

/* 0 — the build identity (node fetch — no cross-origin page) */
{
  const health = await (await fetch(BASE + '/api/v1/health')).json();
  report.identity = { buildId: health.buildId, ok: health.ok, dbLatency: health.dbLatencyMs ?? null };
  console.log('build identity:', JSON.stringify(report.identity));
}

/* 1 — the camera, live: mobile 390 + the crossing + the invariant */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`390: ${String(e).slice(0, 120)}`));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 30_000 });
  await page.waitForTimeout(800);

  /* the loader may play on the fresh session — wait it out */
  await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 30_000 }).catch(() => { /* already gone */ });
  await page.waitForTimeout(600);

  const camState = (label) =>
    page.evaluate((l) => {
      const camSvg = document.querySelector('.jt-cam .bp-svg');
      const cam = document.querySelector('.jt-cam');
      const pinWin = document.querySelector('.jt-pin .jt-window');
      const camRect = cam.getBoundingClientRect();
      window.__lastState = {
        label: l,
        stage: document.querySelector('.jt').dataset.stage,
        cam: camSvg
          ? { viewBox: camSvg.getAttribute('viewBox'), par: camSvg.getAttribute('preserveAspectRatio'), flag: camSvg.dataset.cam ?? null, display: getComputedStyle(cam).display, position: getComputedStyle(cam).position, top: Math.round(camRect.top), h: Math.round(camRect.height) }
          : null,
        pinWindow: getComputedStyle(pinWin).display,
        pinSvg: document.querySelector('.jt-pin .bp-svg')?.getAttribute('viewBox'),
      };
      return window.__lastState;
    }, label);

  /* engage + read card 2 */
  await page.evaluate(async () => {
    const flow = document.querySelector('.jt-flow');
    for (let k = 0; k < 6; k += 1) {
      const t = flow.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: t, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 110));
      if (Math.abs(window.scrollY - t) < 2) break;
    }
    const card = document.querySelectorAll('.jt-station')[2];
    for (let k = 0; k < 4; k += 1) {
      const cam = document.querySelector('.jt-cam').getBoundingClientRect();
      const band = cam.bottom + (window.innerHeight - cam.bottom) * 0.45;
      const r = card.getBoundingClientRect();
      const t = window.scrollY + r.top + r.height / 2 - band;
      window.scrollTo({ top: t, behavior: 'instant' });
      await new Promise((res) => setTimeout(res, 110));
      if (Math.abs(window.scrollY - t) < 2) break;
    }
  });
  await page.waitForTimeout(900);
  const stage2 = await camState('card2-band');
  await page.screenshot({ path: `${OUT}/camera-stage2-390.png` });

  /* the invariant sweep */
  const invariant = await page.evaluate(async () => {
    const jt = document.querySelector('.jt');
    const bad = [];
    const jtTop = jt.getBoundingClientRect().top + window.scrollY;
    const h = jt.getBoundingClientRect().height;
    for (let step = 0; step <= 20; step += 1) {
      window.scrollTo({ top: jtTop - 40 + ((h + 80) * step) / 20, behavior: 'instant' });
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
        if (centre > band - 90 && centre < band + 90 && atBand.top < cam.bottom - 8) bad.push(`card${atBand.i} behind the frame`);
      }
      const sideVisible = side.bottom > 40 && side.top < window.innerHeight;
      const sideOv = Math.max(0, Math.min(cam.bottom, side.bottom) - Math.max(cam.top, side.top));
      if (sideVisible && sideOv > 8) bad.push(`side covered +${Math.round(sideOv)}px`);
    }
    return bad;
  });

  /* the crossing to desktop + back */
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  await page.waitForTimeout(700);
  const crossed = await camState('crossed-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const jt = document.querySelector('.jt');
    window.scrollTo({ top: jt.getBoundingClientRect().top + window.scrollY - 60, behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const flow = document.querySelector('.jt-flow');
    for (let k = 0; k < 6; k += 1) {
      const t = flow.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: t, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 110));
      if (Math.abs(window.scrollY - t) < 2) break;
    }
    const card = document.querySelectorAll('.jt-station')[2];
    for (let k = 0; k < 4; k += 1) {
      const cam = document.querySelector('.jt-cam').getBoundingClientRect();
      const band = cam.bottom + (window.innerHeight - cam.bottom) * 0.45;
      const r = card.getBoundingClientRect();
      const t = window.scrollY + r.top + r.height / 2 - band;
      window.scrollTo({ top: t, behavior: 'instant' });
      await new Promise((res) => setTimeout(res, 110));
      if (Math.abs(window.scrollY - t) < 2) break;
    }
  });
  await page.waitForTimeout(900);
  const back = await camState('crossed-back');
  report.camera = { stage2, crossed, back, invariant };
  console.log('camera live:', JSON.stringify({ stage: stage2.stage, invariant: invariant.length }));
  await ctx.close();
}

/* 2 — the guest reveal, live: the measured clip-path trajectory */
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 640 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`reveal: ${String(e).slice(0, 120)}`));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 30_000 });
  await page.waitForTimeout(1200);
  /* warm the chunk, then measure the SECOND crossing */
  await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
  await page.locator('a[href="/colleges"]').first().click();
  await page.waitForFunction(() => !!document.querySelector('.guest-reveal-inner'), { timeout: 30_000 });
  await page.waitForTimeout(1000);
  await page.goBack();
  await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 30_000 });
  await page.waitForTimeout(1000);

  await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
  const clickP = page.locator('a[href="/colleges"]').first().click();
  const seen = [];
  for (let i = 0; i < 14; i += 1) {
    const clip = await page.evaluate(() => {
      const inner = document.querySelector('.guest-reveal-inner');
      return inner ? getComputedStyle(inner).clipPath : 'none';
    });
    seen.push(clip);
    await page.waitForTimeout(55);
  }
  await clickP;
  await page.waitForTimeout(900);
  const settled = await page.evaluate(() => getComputedStyle(document.querySelector('.guest-reveal-inner')).clipPath);
  report.reveal = { distinctStates: new Set(seen).size, settled, samples: seen.slice(0, 6) };
  await page.screenshot({ path: `${OUT}/colleges-reveal-1024.png` });
  console.log('reveal live:', JSON.stringify({ distinct: new Set(seen).size, settled }));
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'production-report.json'), JSON.stringify(report, null, 2));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
