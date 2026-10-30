#!/usr/bin/env node
/**
 * r324/measure-sections.mjs — X2 evidence: real rendered heights of
 * every skirted landing section, per breakpoint, so the
 * contain-intrinsic-size guesses become measured numbers.
 *
 * For each viewport: load /, wait 3s (loader + reveals settle), then
 * walk section by section — scrollIntoView each, wait 400ms (the
 * engine must actually render the subtree once, which is what locks
 * `auto <n>` last-remembered sizes), and record offsetHeight.
 *
 * Usage: node scripts/r324/measure-sections.mjs [--write]
 * Prints a JSON block; --write merges it into
 * scripts/r324/section-heights.json for the gate to pin.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'scripts', 'r324', 'section-heights.json');

const SECTIONS = [
  '.st-section', // statement
  '.pm-section', // pains
  '.chapters', // map (journey)
  '.pr-section', // platform
  '.wy-section', // why
  '.rl-section', // roles
  '.fo-cta', // cta
];
const BREAKPOINTS = [1440, 1024, 768, 600, 390, 360];
/** X14 (R324): the Heron counterparts were measured at REAL device
 * pairs — 1440×900 · 1024×768 · 768×1024 · 390×844 (heron-extract.mjs
 * §BPS). The dvh-banded sections (the 649dvh map track, the 100dvh
 * hero) inflate/deflate with viewport HEIGHT, so comparing our h=900
 * sweep against Heron's pairs compared apples to oranges (the «+15 %
 * map @1024» was exactly 649dvh × 132px). The ledger anchors re-pin to
 * the same pairs; 600/360 stay as extra sanity rows (no Heron ledger). */
const ANCHORS = {
  1440: 900,
  1024: 768,
  768: 1024,
  600: 900,
  390: 844,
  360: 760,
};
const BASE = process.env.VITE_URL || 'http://localhost:5173/';

const write = process.argv.includes('--write');

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
});
const result = {};
for (const bp of BREAKPOINTS) {
  const vh = ANCHORS[bp] ?? 900;
  const page = await browser.newPage({ viewport: { width: bp, height: vh } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  result[bp] = {};
  for (const sel of SECTIONS) {
    try {
      const h = await page.evaluate(async (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 400));
        return Math.round(el.getBoundingClientRect().height);
      }, sel);
      result[bp][sel] = h;
    } catch {
      result[bp][sel] = null;
    }
  }
  // total docH for X14
  result[bp]['docH'] = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.close();
}
await browser.close();

const json = JSON.stringify(result, null, 2);
console.log(json);
if (write) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + '\n');
  console.log(`written → ${OUT}`);
}
