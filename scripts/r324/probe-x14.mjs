#!/usr/bin/env node
/** r324/probe-x14.mjs — X14: what drives each band's height at the
 * Heron anchor pairs (min-height vs padding vs tallest child), so the
 * compaction lands on the real lever, not a guess. */
import { chromium } from 'playwright-core';

const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const ANCHORS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];
const SECTIONS = ['.st-section', '.pm-section', '.chapters', '.pr-section', '.rl-section'];

const browser = await chromium.launch({ executablePath: EXEC });
for (const [w, h] of ANCHORS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(async (sels) => {
    const out = [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) { out.push({ sel, missing: true }); continue; }
      el.scrollIntoView({ block: 'start', behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 350));
      const cs = getComputedStyle(el);
      let tallest = null;
      for (const c of el.children) {
        const hh = Math.round(c.getBoundingClientRect().height);
        if (!tallest || hh > tallest.h) tallest = { cls: c.className?.toString().slice(0, 40) || c.tagName, h: hh };
      }
      out.push({
        sel,
        h: Math.round(el.getBoundingClientRect().height),
        minH: cs.minBlockSize === 'auto' ? 'auto' : cs.minBlockSize,
        padTB: cs.paddingTop + '/' + cs.paddingBottom,
        rootFs: getComputedStyle(document.documentElement).fontSize,
        tallest,
      });
    }
    return out;
  }, SECTIONS);
  console.log(`===== @${w}x${h}`);
  for (const r of rows) console.log(JSON.stringify(r));
  await page.close();
}
await browser.close();
