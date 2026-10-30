#!/usr/bin/env node
/** r324/probe-x14-chrome.mjs — X14: measure the UNSWEPT chrome bands
 * (hero, footer, everything between/around the tracked sections) at the
 * Heron anchors, so the docH verdict sees the whole ledger. */
import { chromium } from 'playwright-core';

const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const ANCHORS = [[1440, 900], [1024, 768], [768, 1024], [390, 844]];

const browser = await chromium.launch({ executablePath: EXEC });
for (const [w, h] of ANCHORS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const bands = await page.evaluate(async () => {
    // walk top-level flow children of body (and the main landmark) —
    // every direct band of the document with its docY/height
    const seen = [];
    const root = document.querySelector('#__next') || document.body;
    const walk = (parent, depth) => {
      for (const el of parent.children) {
        const r = el.getBoundingClientRect();
        const top = r.top + window.scrollY;
        const cs = getComputedStyle(el);
        if (r.height > 8 && cs.position !== 'fixed' && r.height < document.documentElement.scrollHeight * 0.9) {
          seen.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className?.toString() || '').slice(0, 44) || el.id,
            docY: Math.round(top),
            h: Math.round(r.height),
          });
        }
        if (depth < 2 && seen.length < 60) walk(el, depth + 1);
      }
    };
    walk(root, 0);
    // dedupe keep order
    const out = [];
    for (const b of seen) if (!out.some((o) => o.cls === b.cls && o.docY === b.docY)) out.push(b);
    return out.sort((a, b) => a.docY - b.docY).slice(0, 40);
  });
  console.log(`===== @${w}x${h} docH=${bands.length ? '' : ''}${await page.evaluate(() => document.documentElement.scrollHeight)}`);
  for (const b of bands) console.log(`  y=${String(b.docY).padStart(6)} h=${String(b.h).padStart(5)}  <${b.tag}> ${b.cls}`);
  await page.close();
}
await browser.close();
