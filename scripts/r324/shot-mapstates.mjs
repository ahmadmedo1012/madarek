#!/usr/bin/env node
/**
 * r324/shot-mapstates.mjs — the map's six-state strip (the reference's
 * own state table): viewport shots at fixed scroll offsets into the
 * pin, both themes. Usage:
 *   node scripts/r324/shot-mapstates.mjs [bp] [theme]
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'audits', 'evidence', 'r324');
const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const bp = Number(process.argv[2] || 1440);
const theme = process.argv[3] || 'light';

const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: bp, height: 900 } });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(3000);

const top = await page.evaluate(() => {
  const el = document.querySelector('#chapters');
  return el.getBoundingClientRect().top + window.scrollY;
});
const H = await page.evaluate(() => document.querySelector('#chapters').getBoundingClientRect().height);

// six probes spread across the pin (the pin holds ~top → H-900)
const stops = [0.02, 0.2, 0.38, 0.56, 0.74, 0.95];
for (let i = 0; i < stops.length; i++) {
  const y = Math.round(top + (H - 900) * stops[i]);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(1400);
  const file = path.join(OUT, `map-s${i + 1}-${bp}-${theme}.png`);
  await page.screenshot({ path: file });
  const st = await page.evaluate(() => ({
    stage: document.querySelector('.jt')?.getAttribute('data-stage'),
    finding: document.querySelector('.jt')?.getAttribute('data-finding'),
    wash: document.querySelector('.jt')?.getAttribute('data-wash'),
  }));
  console.log(`map-s${i + 1} @${y} stage=${st.stage} finding=${st.finding} wash=${st.wash} ✓`);
}
await browser.close();
