#!/usr/bin/env node
/** r321-a1-experiment.mjs — isolate the desktop scroll-jank driver.
 *  Loads the landing, injects ONE neutering at a time BEFORE app
 *  scripts, drives the same 12×600px wheel + 12 back scroll as the
 *  r316 harness, reports frames>20ms + longtasks per condition.
 *  Conditions: baseline | no-io (reveals off) | no-lenis | no-jt */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:4173';
const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const p = path.join(base, d, 'chrome-linux64/chrome');
    if (fs.existsSync(p)) return p;
  }
})();

const CONDITIONS = {
  baseline: null,
  'rm-native': null, // reducedMotion: reduce — Lenis never inits, native scroll
};

// A cleaner no-lenis: block the lenis module by breaking its detect —
// instead we neuter the smooth scroll by patching scrollTo? Lenis wraps
// window scroll. Simplest honest probe: freeze scrollY writes via
// overriding window.scrollTo to no-op AFTER app load is hard. We test
// no-io first; lenis via a second variant only if needed.

async function run(condition, initScript) {
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: condition === 'rm-native' ? 'reduce' : undefined,
  });
  if (initScript) await ctx.addInitScript(initScript);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => sessionStorage.setItem('madarek-intro-skip', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
  await page.waitForTimeout(800);

  // frame recorder + longtask observer
  await page.evaluate(() => {
    window.__frames = []; window.__lt = [];
    window.__t0 = performance.now();
    window.__raf = (t) => {
      const d = t - (window.__last || t); window.__last = t;
      if (window.__rec) { window.__frames.push(d); requestAnimationFrame(window.__raf); }
    };
    requestAnimationFrame(window.__raf);
    window.__armRec = () => { window.__last = performance.now(); requestAnimationFrame(window.__raf); };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (window.__rec) window.__lt.push(e.duration); }).observe({ entryTypes: ['longtask'] });
  });

  await page.evaluate(() => { window.__rec = true; window.__armRec(); });
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(80); }
  await page.waitForTimeout(600);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -600); await page.waitForTimeout(80); }
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    window.__rec = false;
    const f = window.__frames;
    const gt20 = f.filter((d) => d > 20).length;
    const gt33 = f.filter((d) => d > 33).length;
    const p95 = f.slice().sort((a, b) => a - b)[Math.floor(f.length * 0.95)] || 0;
    return { frames: f.length, gt20, gt33, pct20: +(gt20 / f.length * 100).toFixed(1), p95: +p95.toFixed(1), lt: window.__lt.length, ltMs: +window.__lt.reduce((a, b) => a + b, 0).toFixed(0) };
  });
  await browser.close();
  return r;
}

for (const [name, script] of Object.entries(CONDITIONS)) {
  const r = await run(name, script);
  console.log(name.padEnd(10), JSON.stringify(r));
}
