/**
 * R312 — Phase 4 (§R R2): the frame-by-frame transition evidence.
 *
 * Section-level captures (the R308/R310 evidence class) prove the
 * END states; this pass adds the SEQUENCES — every named transition
 * recorded as video, extracted to 10fps frames, tiled into contact
 * sheets, and paired with an in-page instrumented timeline (the
 * phase boundaries in ms). Where the reference has an equivalent
 * transition, the reference is recorded the same way for a
 * side-by-side.
 *
 *  Madarek (localhost:5173):
 *   · mdrk-loader-desktop / mdrk-loader-mobile — the entrance loader
 *     + the hero ink-in (fresh contexts; the loader plays once per
 *     session by contract).
 *   · mdrk-route — the geometric route transition both directions
 *     (footer link to /colleges, then browser back).
 *   · mdrk-camera-mobile — the journey camera: a stepped read-through
 *     of the stations (the crop pans + the zones build).
 *  Reference (heronaiapp.com):
 *   · ref-loader — the Webflow loader on first load.
 *   · ref-route — a header-menu navigation (Barba-class transition).
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'frames');
const RAW = path.join(OUT, 'raw');
fs.mkdirSync(RAW, { recursive: true });

const BASE = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';
const REF = 'https://heronaiapp.com/';
const errors = [];
const timelines = {};

async function closeAndGetVideo(ctx, label) {
  const video = ctx.pages()[0]?.video();
  await ctx.close();
  if (video) {
    const file = await video.path();
    const dest = path.join(RAW, `${label}.webm`);
    fs.renameSync(file, dest);
    return dest;
  }
  return null;
}

/** extract 10fps frames + a 6-per-row contact sheet for one webm */
function extract(label, webm) {
  const dir = path.join(OUT, label);
  fs.mkdirSync(dir, { recursive: true });
  execSync(
    `ffmpeg -y -loglevel error -i ${webm} -vf "fps=10,scale=420:-1" ${path.join(dir, 'f-%03d.png')}`,
  );
  /* this ffmpeg build has no glob demuxer — feed an ffconcat list */
  const frames = fs.readdirSync(dir).filter((f) => /^f-\d+\.png$/.test(f)).sort();
  const list = path.join(dir, 'list.txt');
  fs.writeFileSync(list, "ffconcat version 1.0\n" + frames.map((f) => `file '${f}'`).join("\n"));
  execSync(
    `ffmpeg -y -loglevel error -f concat -safe 0 -i ${list} -vf "tile=6x1" -update 1 ${path.join(dir, 'sheet.png')}`,
  );
  fs.rmSync(list, { force: true });
  return fs.readdirSync(dir).filter((f) => /^f-/.test(f)).length;
}

const browser = await chromium.launch();

/* ── 1 · the Madarek loader — desktop + mobile (fresh sessions) ──── */
for (const [label, vp] of [
  ['mdrk-loader-desktop', { width: 1280, height: 800 }],
  ['mdrk-loader-mobile', { width: 390, height: 844 }],
]) {
  const ctx = await browser.newContext({ viewport: vp, recordVideo: { dir: RAW, size: { width: vp.width, height: vp.height } } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${String(e).slice(0, 120)}`));
  const t0 = Date.now();
  await page.goto(BASE + '/', { waitUntil: 'commit', timeout: 30_000 });
  /* instrument the loader lifecycle in-page (timestamps for the
     phases; the video is the visual proof) */
  const timeline = await page.evaluate(async (start) => {
    const log = [];
    let last = '';
    const t = () => Date.now() - start;
    for (let i = 0; i < 400; i += 1) {
      const sl = document.querySelector('.sl');
      const hero = document.querySelector('.fo-hero');
      const drawing = document.querySelectorAll('.bp-stage .bp-drawable');
      const state = sl
        ? `sl:${getComputedStyle(sl).opacity ?? '1'}`
        : hero
          ? `hero:drawables=${drawing.length}`
          : 'pre';
      if (state !== last) {
        log.push({ t: t(), state });
        last = state;
      }
      if (!sl && hero && drawing.length > 200 && log.length > 3) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    return log;
  }, t0);
  timelines[label] = timeline;
  await page.waitForTimeout(2500); /* the hero ink-in plays out on the video */
  const webm = await closeAndGetVideo(ctx, label);
  const n = webm ? extract(label, webm) : 0;
  console.log(`✓ ${label}: ${n} frames; loader phases:`, JSON.stringify(timeline));
}

/* ── 2 · the Madarek route transition (both directions) ──────────── */
{
  const label = 'mdrk-route';
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: RAW, size: { width: 1280, height: 800 } },
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${String(e).slice(0, 120)}`));
  /* skip the loader (seed the session flag exactly like the e2e belt) */
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-seen', '1'); } catch { /* ignore */ }
  });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 20_000 });
  await page.waitForTimeout(600);
  const link = page.locator('a[href="/colleges"]').first();
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const t0 = Date.now();
  const tl = [];
  await link.click();
  for (let i = 0; i < 160; i += 1) {
    const st = await page.evaluate(() => ({
      path: location.pathname,
      mask: !!document.querySelector('[data-transition]') || !!document.querySelector('.page-transition'),
      colleges: !!document.querySelector('.cl-page, .cl-hero, [data-colleges]'),
    }));
    tl.push({ t: Date.now() - t0, ...st });
    if (st.colleges && i > 12) break;
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(800);
  /* the reverse: browser back to the landing */
  const t1 = Date.now();
  await page.goBack();
  for (let i = 0; i < 160; i += 1) {
    const st = await page.evaluate(() => ({
      path: location.pathname,
      hero: !!document.querySelector('.fo-hero-title'),
    }));
    tl.push({ t: Date.now() - t1, ...st });
    if (st.hero && i > 12) break;
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(800);
  timelines[label] = tl.filter((x, i) => i % 2 === 0);
  const webm = await closeAndGetVideo(ctx, label);
  const n = webm ? extract(label, webm) : 0;
  console.log(`✓ ${label}: ${n} frames; route timeline points: ${tl.length}`);
}

/* ── 3 · the Madarek journey camera (mobile read-through) ────────── */
{
  const label = 'mdrk-camera-mobile';
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: RAW, size: { width: 390, height: 844 } },
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${String(e).slice(0, 120)}`));
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-seen', '1'); } catch { /* ignore */ }
  });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 20_000 });
  await page.waitForTimeout(500);
  const stages = await page.evaluate(async () => {
    const flow = document.querySelector('.jt-flow');
    /* engage the camera (retry: the lazy tail grows the page) */
    for (let k = 0; k < 6; k += 1) {
      const t = flow.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: t, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 110));
      if (Math.abs(window.scrollY - t) < 2) break;
    }
    /* the read-through: stepped instant scrolls to the band of each
       card in turn (the crop pans + the zone washes + the status strip
       advances — all on the video) */
    const seen = [];
    for (let i = 0; i < 4; i += 1) {
      const card = document.querySelectorAll('.jt-station')[i];
      for (let k = 0; k < 4; k += 1) {
        const cam = document.querySelector('.jt-cam').getBoundingClientRect();
        const band = cam.bottom + (window.innerHeight - cam.bottom) * 0.45;
        const r = card.getBoundingClientRect();
        const t = window.scrollY + r.top + r.height / 2 - band;
        window.scrollTo({ top: t, behavior: 'instant' });
        await new Promise((res) => setTimeout(res, 110));
        if (Math.abs(window.scrollY - t) < 2) break;
      }
      await new Promise((res) => setTimeout(res, 700));
      seen.push({
        card: i,
        stage: document.querySelector('.jt').dataset.stage,
        viewBox: document.querySelector('.jt-cam .bp-svg').getAttribute('viewBox'),
      });
    }
    /* the side column closes the flow */
    const side = document.querySelector('.jt-side');
    const sr = side.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + sr.top - 80, behavior: 'instant' });
    await new Promise((res) => setTimeout(res, 900));
    return seen;
  });
  timelines[label] = stages;
  await page.waitForTimeout(600);
  const webm = await closeAndGetVideo(ctx, label);
  const n = webm ? extract(label, webm) : 0;
  console.log(`✓ ${label}: ${n} frames; stages:`, JSON.stringify(stages));
}

/* ── 4 · the reference loader (heronaiapp.com, fresh context) ────── */
{
  const label = 'ref-loader';
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: RAW, size: { width: 1280, height: 800 } },
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${String(e).slice(0, 120)}`));
  const t0 = Date.now();
  await page.goto(REF, { waitUntil: 'commit', timeout: 60_000 });
  const timeline = await page.evaluate(async (start) => {
    const log = [];
    let last = '';
    const t = () => Date.now() - start;
    for (let i = 0; i < 600; i += 1) {
      const l = document.querySelector('.loading');
      const bar = document.querySelector('.loading-progress, .loading-bar');
      const state = l
        ? `loading:${getComputedStyle(l).display}:${bar ? 'bar' : 'nobar'}`
        : 'main';
      if (state !== last) {
        log.push({ t: t(), state });
        last = state;
      }
      if (!l && i > 20) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    return log;
  }, t0);
  await page.waitForTimeout(2000);
  timelines[label] = timeline;
  const webm = await closeAndGetVideo(ctx, label);
  const n = webm ? extract(label, webm) : 0;
  console.log(`✓ ${label}: ${n} frames; ref loader phases:`, JSON.stringify(timeline));
}

/* ── 5 · the reference route transition (header menu) ────────────── */
{
  const label = 'ref-route';
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: RAW, size: { width: 1280, height: 800 } } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${String(e).slice(0, 120)}`));
  await page.goto(REF, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  try {
    await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 20_000 });
  } catch { /* the loader may already be gone */ }
  await page.waitForTimeout(1200);
  /* open the header menu, then navigate to an interior page and back */
  const menu = page.locator('.header-menu-btn, [class*="menu-btn"], [aria-label*="menu" i]').first();
  let navigated = false;
  if (await menu.count()) {
    await menu.click().catch(() => { /* menu toggles vary */ });
    await page.waitForTimeout(900);
    const item = page.locator('.header-menu-item a, .header-menu a, nav a[href*="/"]').first();
    if (await item.count()) {
      try {
        await item.click({ timeout: 8000 });
        navigated = true;
      } catch {
        /* the menu may close on hover; fall through to the alt link */
      }
    }
  }
  if (!navigated) {
    const alt = page.locator('a[href*="/"]').first();
    if (await alt.count()) {
      try {
        await alt.click({ timeout: 8000 });
        navigated = true;
      } catch { /* give up quietly — the ref side never fails the run */ }
    }
  }
  await page.waitForTimeout(2500);
  try { await page.goBack(); } catch { /* ignore */ }
  await page.waitForTimeout(2500);
  const webm = await closeAndGetVideo(ctx, label);
  const n = webm ? extract(label, webm) : 0;
  console.log(`✓ ${label}: ${n} frames (menu nav + back)`);
}

fs.writeFileSync(path.join(OUT, 'timelines.json'), JSON.stringify(timelines, null, 2));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
