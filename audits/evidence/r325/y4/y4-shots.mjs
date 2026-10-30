#!/usr/bin/env node
/**
 * r325/y4 — before/after sheets for the heading-census defect: the
 * legal sheets + /help at 390 and 1440 (light theme, guest chrome).
 * Usage: node y4-shots.mjs before|after
 * Output: audits/evidence/r325/y4/<tag>-<route>-<bp>.png (+ .full.png)
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = process.argv[2] || 'before';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const BASE = process.env.VITE_URL || 'http://localhost:5204/';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const OUT = path.join(ROOT, 'audits', 'evidence', 'r325', 'y4');
const ROUTES = ['/legal/privacy', '/help'];
const BPS = [390, 1440];

const browser = await chromium.launch({ executablePath: EXEC });
for (const bp of BPS) {
  for (const route of ROUTES) {
    const page = await browser.newPage({
      viewport: { width: bp, height: bp === 390 ? 844 : 900 },
      deviceScaleFactor: 2,
    });
    try {
      await page.goto(BASE + route.replace(/^\//, ''), { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(2500);
      const name = `${TAG}-${route.replace(/\//g, '')}-${bp}`;
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      await page.screenshot({ path: path.join(OUT, `${name}.full.png`), fullPage: true });
      console.log(`${name}.png ✓`);
    } catch (e) {
      console.error(`${route}@${bp}: ${e.message.slice(0, 120)}`);
    }
    await page.close();
  }
}
await browser.close();
