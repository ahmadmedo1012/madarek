#!/usr/bin/env node
/**
 * r324/height-gate.mjs — X2/X14: the scrollHeight stability gate.
 *
 * At each pinned viewport (1440/1024/768/390/360): load /, read
 * documentElement.scrollHeight at t≈3 s (loader + reveals settled),
 * then walk the full page (viewport-sized steps with settle waits —
 * the walk re-renders every content-visibility skirt), scroll back to
 * top, and read scrollHeight again. PASS requires the two readings to
 * agree within ±0.5 %.
 *
 * The X2 fix this pins: the A4 skirt's per-section measured
 * contain-intrinsic-size (landing.css §r324 X2) — placeholders now
 * sum to the real document height, so the first paint's scrollbar
 * never lies.
 *
 * Usage: node scripts/r324/height-gate.mjs
 * Env:   VITE_URL (default http://localhost:5173/)
 *        CHROME_BIN (default the repo's pinned chromium)
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const VIEWPORTS = [1440, 1024, 768, 390, 360];
const TOLERANCE = 0.005; // ±0.5 %

const results = [];
let failed = false;

const browser = await chromium.launch({ executablePath: EXEC });
for (const width of VIEWPORTS) {
  console.log(`[${width}] opening…`);
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(BASE, { waitUntil: 'load' });
  console.log(`[${width}] loaded; settling 3s…`);
  await page.waitForTimeout(3000);

  const atLoad = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`[${width}] atLoad=${atLoad}`);

  // full walk: viewport-sized steps to the bottom, then back to top
  const steps = await Promise.race([
    page.evaluate(async () => {
      const step = Math.round(window.innerHeight * 0.8);
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let n = 0;
      for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await sleep(60);
        n += 1;
        if (n > 300) break; // hard bound — a walk longer than this is a bug
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(400);
      window.scrollTo(0, 0);
      await sleep(400);
      return n;
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('walk timeout 60s')), 60_000)),
  ]);
  console.log(`[${width}] walk done (${steps} steps)`);
  await page.waitForTimeout(600);

  const afterWalk = await page.evaluate(() => document.documentElement.scrollHeight);
  const drift = Math.abs(afterWalk - atLoad) / afterWalk;
  const ok = drift <= TOLERANCE;
  if (!ok) failed = true;
  results.push({ width, atLoad, afterWalk, driftPct: +(drift * 100).toFixed(3), ok });
  console.log(`[${width}] afterWalk=${afterWalk} drift=${(drift * 100).toFixed(3)}% ${ok ? 'PASS' : 'FAIL'}`);
  await page.close();
}
await browser.close();

const outPath = path.join(ROOT, 'audits', 'evidence', 'r324', 'height-gate.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ tolerancePct: TOLERANCE * 100, results }, null, 2) + '\n');

for (const r of results) {
  console.log(`@${r.width}: load=${r.atLoad} afterWalk=${r.afterWalk} drift=${r.driftPct}% ${r.ok ? 'PASS' : 'FAIL'}`);
}
if (failed) {
  console.error(`height-gate: FAIL — drift exceeded ±${TOLERANCE * 100}% (evidence: ${outPath})`);
  process.exit(1);
}
console.log(`height-gate: PASS (evidence: ${outPath})`);
