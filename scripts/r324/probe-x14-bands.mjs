#!/usr/bin/env node
/** r324/probe-x14-bands.mjs — X14: the full band map (hero→footer) at
 * the Heron anchor pairs, diffed against the Heron ledger rows, so every
 * compaction/extension lands on an exact target. */
import { chromium } from 'playwright-core';

const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const ANCHORS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
/* Heron ledger rows per anchor (heron/full-<w>.json §ledger) */
const HERON = {
  1440: { 'fo-hero': 887, 'st-section': 723, 'pm-section': 743, chapters: 6300, 'pr-section': 710, 'wy-section': 681, 'rl-section': 887, 'fo-cta': 698, 'fo-footer': 711, docH: 12338 },
  1024: { 'fo-hero': 759, 'st-section': 514, 'pm-section': 528, chapters: 5376, 'pr-section': 505, 'wy-section': 484, 'rl-section': 759, 'fo-cta': 496, 'fo-footer': 505, docH: 9926 },
  768: { 'fo-hero': 1009, 'st-section': 527, 'pm-section': 1333, chapters: 5454, 'pr-section': 508, 'wy-section': 877, 'rl-section': 1336, 'fo-cta': 541, 'fo-footer': 949, docH: 12535 },
  390: { 'fo-hero': 828, 'st-section': 837, 'pm-section': 869, chapters: 4819, 'pr-section': 517, 'wy-section': 806, 'rl-section': 948, 'fo-cta': 500, 'fo-footer': 1239, docH: 11363 },
};
/* our section classes ↔ heron rows */
const MAP = {
  'fo-hero': 'fo-hero', 'st-section': 'st-section', 'pm-section': 'pm-section',
  chapters: 'chapters', 'pr-section': 'pr-section', 'wy-section': 'wy-section',
  'rl-section': 'rl-section', 'fo-cta': 'fo-cta', 'fo-footer': 'fo-footer',
};

const browser = await chromium.launch({ executablePath: EXEC });
for (const [w, h] of ANCHORS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(async (sels) => {
    const out = {};
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el) {
        // content-visibility: auto — the section must RENDER before its
        // real border-box exists (the skipped box reports the
        // contain-intrinsic-size guess). Scroll to it, settle, then read.
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 450));
        out[sel] = Math.round(el.getBoundingClientRect().height);
      }
    }
    out.docH = await (async () => {
      // walk the whole page first so every skirt renders, then read docH
      const step = Math.round(window.innerHeight * 0.8);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
      return document.documentElement.scrollHeight;
    })();
    return out;
  }, Object.keys(MAP).map((s) => '.' + s));
  const rows2 = {};
  for (const [k, v] of Object.entries(rows)) rows2[k.replace(/^\./, '')] = v;
  const her = HERON[w];
  console.log(`===== @${w}x${h}`);
  for (const [sel, hh] of Object.entries(her)) {
    const ours = rows2[sel];
    if (ours === undefined) { console.log(`  ${sel.padEnd(14)} heron ${hh}`); continue; }
    if (sel === 'docH') {
      console.log(`  ${'docH'.padEnd(14)} ours ${String(ours).padStart(5)} heron ${String(hh).padStart(5)}  ${ours - hh >= 0 ? '+' : ''}${ours - hh}px (${(100 * (ours - hh) / hh).toFixed(2)}%)`);
    } else {
      console.log(`  ${sel.padEnd(14)} ours ${String(ours).padStart(5)} heron ${String(hh).padStart(5)}  ${ours - hh >= 0 ? '+' : ''}${ours - hh}px`);
    }
  }
  await page.close();
}
await browser.close();
