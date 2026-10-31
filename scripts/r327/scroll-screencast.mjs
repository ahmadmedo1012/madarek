#!/usr/bin/env node
/**
 * r327/scroll-screencast.mjs — THE HERON↔MADAREK SCROLL SCREENCAST (P3).
 *
 * Records both sites scrolling under ONE viewport (1440×900) and ONE
 * scroll program — fixed-pace wheel downs to the bottom, a pause, then
 * wheel ups partway (35% of the page) — plus the quantitative glide
 * curve that makes the video falsifiable:
 *
 *   · the VIDEOS:   audits/evidence/r327/p3/{heron,madarek-landing}-1440x900.webm
 *   · the CURVES:   audits/evidence/r327/p3/scroll-curve.json — one wheel
 *     impulse of deltaY=720 (the r313 reference probe's own delta) on
 *     each site, sampled every animation frame: first-motion latency,
 *     t63 / t98.6 crossing times, settle time, decimated series. The
 *     r313 recorded reference (probeTailMs 1540, exponential ease-out)
 *     rides along for the verdict.
 *
 * Honest differences are recorded, not hidden: Heron replays its
 * entrance loader on every full load (~5–7s, measured r313) — the
 * recording starts at page load on BOTH sites so the timing context is
 * real; Madarek's intro is hermetically skipped (the audit fixture's
 * own opt-out — the screencast's subject is scroll feel, not the
 * entrance); Heron's cookie banner is dismissed best-effort before the
 * program starts. Heron scrolls an inner wrapper (.main-inner.lenis —
 * window.scrollY stays 0); Madarek scrolls the window (owner decision,
 * D6) — the sampler records both and picks the one that moves.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = (process.env.VITE_URL || 'http://localhost:5173/').replace(/\/$/, '');
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const DIR = process.env.OUT || path.join(ROOT, 'audits', 'evidence', 'r327', 'p3');
const SITES = [
  { id: 'heron', url: 'https://heronaiapp.com/', guestInit: false },
  { id: 'madarek-landing', url: `${BASE}/`, guestInit: true },
];

const VIEWPORT = { width: 1440, height: 900 };
/* ONE program, both sites: wheel 320px every 120ms (≈2667px/s) to the
 * bottom (25s cap), pause 1.2s, wheel up to 35% of the page (12s cap),
 * pause 1.2s. */
const STEP_PX = 320;
const STEP_MS = 120;
const DOWN_CAP_MS = 25000;
const UP_CAP_MS = 12000;
const PAUSE_MS = 1200;

const launch = () => chromium.launch({
  executablePath: EXEC,
  args: ['--disable-dev-shm-usage', '--disable-gpu', '--renderer-process-limit=4', '--process-per-site'],
});

/* The scroller position, both architectures at once (window-Lenis vs
 * wrapper-Lenis) — runs INSIDE the page. */
const POS = () => {
  const w = document.querySelector('.main-inner') || document.querySelector('[class*="lenis"]');
  return { y: Math.round(window.scrollY), wrap: w ? Math.round(w.scrollTop) : null };
};

/* In-page rAF sampler: records [t, y, wrap] every frame for `ms`. */
async function sample(page, ms) {
  return page.evaluate(([duration]) => new Promise((resolve) => {
    const t0 = performance.now();
    const out = [];
    const tick = () => {
      const w = document.querySelector('.main-inner') || document.querySelector('[class*="lenis"]');
      out.push([Math.round(performance.now() - t0), Math.round(window.scrollY), w ? Math.round(w.scrollTop) : null]);
      if (performance.now() - t0 < duration) requestAnimationFrame(tick);
      else resolve(out);
    };
    requestAnimationFrame(tick);
  }), [ms]);
}

const seriesY = (rows) => rows.map((r) => (r[2] !== null && r[2] > 0 ? r[2] : r[1]));

/* Curve metrics from a sampled series (the r313 probe's own shape). */
function curveMetrics(rows) {
  const y0 = seriesY(rows)[0] ?? 0;
  const last = seriesY(rows).at(-1) ?? 0;
  const target = last - y0;
  if (target < 50) return { target, error: 'target too small — no glide captured' };
  let firstMotion = null; let t63 = null; let t986 = null; let settle = null;
  for (const [t, y] of rows.map((r) => [r[0], (r[2] !== null && r[2] > 0 ? r[2] : r[1]) - y0])) {
    if (firstMotion === null && y > 2) firstMotion = t;
    if (t63 === null && y >= target * 0.63) t63 = t;
    if (t986 === null && y >= target * 0.986) t986 = t;
    if (settle === null && y >= target * 0.99) settle = t;
  }
  /* decimate to ≤60 points for the evidence file */
  const stepN = Math.max(1, Math.floor(rows.length / 60));
  const series = rows.filter((_, i) => i % stepN === 0).map((r) => [r[0], (r[2] !== null && r[2] > 0 ? r[2] : r[1]) - y0]);
  return { target, firstMotionMs: firstMotion, t63Ms: t63, t98_6Ms: t986, settleMs: settle, series };
}

async function settleForSite(page, site) {
  await page.waitForLoadState('load', { timeout: 45000 }).catch(() => { /* load event racing assets — the stability poll below owns readiness */ });
  if (site.guestInit) {
    /* the engine must be live before the program runs */
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-lenis-on'), null, { timeout: 15000 });
  }
  /* Heron replays its entrance loader on every full load (~5–7s) —
   * wait for the document height to go stable AND a generous floor. */
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0 || document.body?.childElementCount > 0, null, { timeout: 30000 }).catch(() => { /* heron has no #root */ });
  let stable = 0; let lastH = -1;
  for (let i = 0; i < 40 && stable < 3; i++) {
    await page.waitForTimeout(500);
    const h = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0));
    stable = h === lastH ? stable + 1 : 0;
    lastH = h;
  }
  await page.waitForTimeout(site.id === 'heron' ? 8000 : 1200);
  /* Heron's cookie banner — dismiss best-effort so it does not cover the
   * program's read; its absence is not required for the scroll verdict. */
  if (site.id === 'heron') {
    for (const label of ['Reject', 'reject', 'Refuse', 'Accept']) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      if (await btn.isVisible({ timeout: 400 }).catch(() => false)) { await btn.click().catch(() => {}); break; }
    }
  }
}

/* ── the identical scroll program ──────────────────────────────────── */
async function runProgram(page) {
  await page.mouse.move(720, 450);
  const pos = () => page.evaluate(POS);
  const maxY = async () => page.evaluate(() => {
    const w = document.querySelector('.main-inner') || document.querySelector('[class*="lenis"]');
    const wy = w ? w.scrollHeight - w.clientHeight : 0;
    const dy = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(wy, dy);
  });
  /* DOWN */
  const downStart = Date.now();
  let top = await maxY();
  while (Date.now() - downStart < DOWN_CAP_MS) {
    await page.mouse.wheel(0, STEP_PX);
    await page.waitForTimeout(STEP_MS);
    const p = await pos();
    const y = Math.max(p.y, p.wrap ?? 0);
    if (y >= top - 6) break;
    top = await maxY();
  }
  await page.waitForTimeout(PAUSE_MS);
  /* UP — partway (35% of the page) */
  const target = Math.round((await maxY()) * 0.35);
  const upStart = Date.now();
  while (Date.now() - upStart < UP_CAP_MS) {
    const p = await pos();
    const y = Math.max(p.y, p.wrap ?? 0);
    if (y <= target + 6) break;
    await page.mouse.wheel(0, -STEP_PX);
    await page.waitForTimeout(STEP_MS);
  }
  await page.waitForTimeout(PAUSE_MS);
  const end = await pos();
  return { end, target };
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const browser = await launch();
  const out = { capturedAt: new Date().toISOString(), viewport: VIEWPORT, program: { stepPx: STEP_PX, stepMs: STEP_MS, downCapMs: DOWN_CAP_MS, upCapMs: UP_CAP_MS, upTargetPct: 0.35 }, referenceR313: { engine: 'lenis 1.1.5 (wrapper) + gsap ticker', lerp: 0.1, probeTailMs: 1540, probeDeltaPx: 720, shape: 'exponential ease-out glide: 720px target — first motion +156ms, 456px (63%) by 637ms, 710px (98.6%) by 1181ms, settled 720px at 1695ms' }, sites: {} };

  for (const site of SITES) {
    console.log(`── ${site.id}: ${site.url}`);
    /* 1 · the glide curve (measured first, no video) */
    {
      const ctx = await browser.newContext({ viewport: VIEWPORT });
      if (site.guestInit) await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* n/a */ } });
      const page = await ctx.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await settleForSite(page, site);
      /* park at the very top, quiet, then ONE 720px impulse */
      await page.evaluate(() => {
        const w = document.querySelector('.main-inner') || document.querySelector('[class*="lenis"]');
        if (w) w.scrollTop = 0; else window.scrollTo(0, 0);
      });
      await page.waitForTimeout(600);
      const sampler = sample(page, 2800); /* started inside the page on next rAF */
      await page.mouse.move(720, 450);
      await page.mouse.wheel(0, 720);
      const rows = await sampler;
      out.sites[site.id] = out.sites[site.id] || {};
      out.sites[site.id].curve = curveMetrics(rows);
      console.log(`   curve: ${JSON.stringify({ ...out.sites[site.id].curve, series: undefined })}`);
      await ctx.close();
    }
    /* 2 · the screencast */
    {
      const videoDir = path.join(DIR, 'video', site.id);
      fs.mkdirSync(videoDir, { recursive: true });
      /* stale .webm from earlier runs must never be renameable as this
       * run's take (the first cut of this script grabbed files[0] and
       * shipped a dead 3.8KB file as «heron») — start the dir clean. */
      for (const stale of fs.readdirSync(videoDir)) {
        if (stale.endsWith('.webm')) fs.rmSync(path.join(videoDir, stale));
      }
      const ctx = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: videoDir, size: VIEWPORT } });
      if (site.guestInit) await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* n/a */ } });
      const page = await ctx.newPage();
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await settleForSite(page, site);
      const doc = await page.evaluate(() => ({
        height: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
        engine: Boolean(document.querySelector('.main-inner, [class*="lenis"]')),
        lenisAttr: document.documentElement.hasAttribute('data-lenis-on'),
      }));
      const result = await runProgram(page);
      /* the video handle is taken BEFORE close; .path() resolves to the
       * finalized file after the context closes — no dir guessing. */
      const video = page.video();
      await ctx.close();
      const saved = video ? await video.path() : null;
      const final = path.join(DIR, `${site.id}-1440x900.webm`);
      if (saved) fs.renameSync(saved, final);
      out.sites[site.id].page = doc;
      out.sites[site.id].programEnd = result;
      out.sites[site.id].video = path.relative(ROOT, final);
      console.log(`   video: ${path.relative(ROOT, final)} (${doc.height}px page)`);
    }
  }

  await browser.close();
  const outPath = path.join(DIR, 'scroll-curve.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`── curves + program evidence → ${path.relative(ROOT, outPath)}`);
}

main().catch((e) => { console.error(e); process.exit(2); });
