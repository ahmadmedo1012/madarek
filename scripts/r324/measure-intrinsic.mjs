#!/usr/bin/env node
/**
 * r324/measure-intrinsic.mjs — X2 final: per-band CONTENT-BOX
 * intrinsic sizes (border-box minus padding minus border) for every
 * skirted section — the values Chromium's contain-intrinsic-size
 * actually wants (skipped height = intrinsic + own padding + border).
 *
 * Writes scripts/r324/section-heights.json (border-box) AND
 * scripts/r324/section-intrinsic.json (content-box) then prints the
 * CSS block ready to paste into landing.css.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const SECTIONS = ['.st-section', '.pm-section', '.chapters', '.pr-section', '.wy-section', '.rl-section', '.fo-cta'];
const BREAKPOINTS = process.env.BPS ? process.env.BPS.split(',').map(Number) : [1440, 768, 600, 390, 360];

const browser = await chromium.launch({ executablePath: EXEC });
const borderBox = {};
const intrinsic = {};
for (const bp of BREAKPOINTS) {
  /* X14: the Heron ledger anchors are REAL device pairs — width:height.
   * A dvh-banded section inflates with viewport height, so the intrinsic
   * rung must be measured at the same pair the ledger verdict uses. */
  const ANCHORS = { 1440: 900, 1024: 768, 768: 1024, 600: 900, 390: 844, 360: 760 };
  const page = await browser.newPage({ viewport: { width: bp, height: ANCHORS[bp] ?? 900 } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  borderBox[bp] = {};
  intrinsic[bp] = {};
  for (const sel of SECTIONS) {
    const d = await page.evaluate(async (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      el.scrollIntoView({ block: 'start', behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 400));
      const cs = getComputedStyle(el);
      const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const borderV = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      const bb = el.getBoundingClientRect().height;
      return { bb: Math.round(bb), padV: Math.round(padV), borderV: Math.round(borderV) };
    }, sel);
    if (!d) { borderBox[bp][sel] = null; intrinsic[bp][sel] = null; continue; }
    borderBox[bp][sel] = d.bb;
    intrinsic[bp][sel] = Math.round(d.bb - d.padV - d.borderV);
  }
  await page.close();
}
await browser.close();

const dir = path.join(ROOT, 'scripts', 'r324');
fs.writeFileSync(path.join(dir, 'section-heights.json'), JSON.stringify(borderBox, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'section-intrinsic.json'), JSON.stringify(intrinsic, null, 2) + '\n');

// print the CSS block
const rung = (vals) => vals.map(([sel, v]) => `${sel.padEnd(12)}{ contain-intrinsic-size: auto ${v}px; }`).join('\n');
const byBp = (bp) => SECTIONS.map((s) => [s, intrinsic[bp][s]]);
console.log(`/* ≥992 (measured @1440) */\n${rung(byBp(1440))}`);
if (intrinsic[1024]) console.log(`\n/* @1024 (the desktop fit's second anchor) */\n${rung(byBp(1024))}`);
console.log(`\n/* 768–991 (measured @768) */\n${rung(byBp(768))}`);
console.log(`\n/* 480–767 (measured @600) */\n${rung(byBp(600))}`);
console.log(`\n/* ≤479 (measured @390) */\n${rung(byBp(390))}`);
console.log(`\n/* ≤374 (measured @360) */\n${rung(byBp(360))}`);
console.log('\njson →', path.join(dir, 'section-intrinsic.json'));
