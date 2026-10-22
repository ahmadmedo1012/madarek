/**
 * R312 — Phase 5 (§R R3): the scroll-engine reproduction ATTEMPT.
 *
 * The §7.1 standing decision: the native 480dvh CSS-sticky engine
 * stays until a user-facing gap is REPRODUCED against the reference's
 * Lenis+ScrollTrigger. This probe is the reproduction attempt — a
 * fair A/B of the two engines' user-facing smoothness on their own
 * pinned/scrub sections:
 *
 *  · Madarek: the journey walkthrough (the pin + the camera + the
 *    staged build — the heaviest scrub section);
 *  · the reference: its map section (the deepest ScrollTrigger work).
 *
 * Method: rAF frame-time sampling while a programmatic wheel-like
 * scroll traverses the section (instant step-scrolls in reading-sized
 * steps — the same gesture class on both sites). Per frame: the
 * delta, and the count of frames >20ms (jank) / >34ms (visible
 * stutter) / >50ms. Also sampled: the pin's positional fidelity (the
 * sticky pin must stay put — the sticky rect fixed during the pin
 * window) on the Madarek side.
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'scroll-engine');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';

/** sample rAF frame deltas while a stepwise traversal runs */
async function sampleJank(page, runScroll) {
  return page.evaluate(async (fnSource) => {
    /* the frame-time sampler */
    const frames = [];
    let last = performance.now();
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const t = performance.now();
      frames.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const runScroll = eval(`(${fnSource})`);
    await runScroll(window, document);
    alive = false;
    await new Promise((r) => setTimeout(r, 120));
    const over = (ms) => frames.filter((d) => d > ms).length;
    const sorted = [...frames].sort((a, b) => a - b);
    const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
    return {
      frames: frames.length,
      totalMs: Math.round(frames.reduce((a, b) => a + b, 0)),
      mean: +(frames.reduce((a, b) => a + b, 0) / frames.length).toFixed(2),
      p50: +pct(50).toFixed(2),
      p95: +pct(95).toFixed(2),
      max: +Math.max(...frames).toFixed(2),
      over20: over(20),
      over34: over(34),
      over50: over(50),
    };
  }, runScroll.toString());
}

/** the Madarek traversal: the journey section, reading-sized instant steps */
const MDRK_SCROLL = async (window, document) => {
  const jt = document.querySelector('.jt');
  jt.scrollIntoView();
  await new Promise((r) => setTimeout(r, 400));
  const top = jt.getBoundingClientRect().top + window.scrollY;
  const h = jt.getBoundingClientRect().height;
  for (let i = 0; i <= 46; i += 1) {
    window.scrollTo({ top: top - 40 + ((h + 80) * i) / 46, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 70));
  }
};

/** the reference traversal: WHEEL-driven (the r310 lesson — Lenis
 * intercepts wheel and documentElement never scrolls on the reference;
 * a programmatic scrollTo there scrolls nothing, so the sampler would
 * measure an idle page). The traversal drives real wheel ticks through
 * the map region — the same gesture class the r310 captures used. */
const REF_WHEEL_STEPS = 34;

const browser = await chromium.launch();
const report = {};

/* ── Madarek: the journey (desktop pin + the mobile camera) ─────── */
for (const [label, vp, mobile] of [
  ['mdrk-journey-1440', { width: 1440, height: 900 }, false],
  ['mdrk-journey-390', { width: 390, height: 844 }, true],
]) {
  const ctx = await browser.newContext({ viewport: vp, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-seen', '1'); } catch { /* ignore */ }
  });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 20_000 });
  await page.waitForTimeout(600);
  /* warm the lazy tail: one soft pass through the section first */
  await page.evaluate(async () => {
    const jt = document.querySelector('.jt');
    jt.scrollIntoView();
    await new Promise((r) => setTimeout(r, 300));
    const t = jt.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: t + jt.getBoundingClientRect().height * 0.5, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 400));
  });
  const jank = await sampleJank(page, MDRK_SCROLL);
  /* the pin's positional fidelity: the sticky pin rect must hold during
   * the pin window (the engine's core promise — no jump when the pin
   * engages/releases) */
  const fidelity = await page.evaluate(async () => {
    const pin = document.querySelector('.jt-pin') ?? document.querySelector('.jt-cam');
    const samples = [];
    const jt = document.querySelector('.jt');
    const top = jt.getBoundingClientRect().top + window.scrollY;
    const h = jt.getBoundingClientRect().height;
    for (let i = 0; i <= 30; i += 1) {
      window.scrollTo({ top: top + (h * i) / 30, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 40));
      const r = pin.getBoundingClientRect();
      samples.push(Math.round(r.top));
    }
    const stuck = samples.filter((t) => t >= -1 && t <= 70).length;
    return { samples, stuckFrames: stuck, jumps: samples.filter((t, i) => i > 0 && Math.abs(t - samples[i - 1]) > 120).length };
  });
  report[label] = { jank, fidelity };
  console.log(`✓ ${label}:`, JSON.stringify(jank));
  await ctx.close();
}

/* ── the reference: its map section (wheel-driven) ────────────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://heronaiapp.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  try {
    await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 20_000 });
  } catch { /* may already be gone */ }
  await page.waitForTimeout(1500);

  /* reach the map region: hero+intro+problem ≈ 2353px of Lenis space —
   * the r310 map script's arithmetic (11 ticks of 240px) */
  const reach = async (ticks) => {
    for (let i = 0; i < ticks; i += 1) {
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(1200);
  };
  await reach(11);

  /* the sampler lives in-page; the wheels are driven from Node */
  await page.evaluate(() => {
    window.__frames = [];
    const frames = window.__frames;
    let last = performance.now();
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const t = performance.now();
      frames.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__collect = () => {
      alive = false;
      const over = (ms) => frames.filter((d) => d > ms).length;
      const sorted = [...frames].sort((a, b) => a - b);
      const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
      return {
        frames: frames.length,
        totalMs: Math.round(frames.reduce((a, b) => a + b, 0)),
        mean: +(frames.reduce((a, b) => a + b, 0) / frames.length).toFixed(2),
        p50: +pct(50).toFixed(2),
        p95: +pct(95).toFixed(2),
        max: +Math.max(...frames).toFixed(2),
        over20: over(20),
        over34: over(34),
        over50: over(50),
      };
    };
  });

  /* the traversal: wheel ticks at the reading cadence through the map region */
  for (let i = 0; i < REF_WHEEL_STEPS; i += 1) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(200);
  const jank = await page.evaluate(() => window.__collect());
  report['ref-map-1440'] = { jank };
  console.log('✓ ref-map-1440:', JSON.stringify(jank));
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'ab-report.json'), JSON.stringify(report, null, 2));
console.log('saved', path.join(OUT, 'ab-report.json'));
await browser.close();
