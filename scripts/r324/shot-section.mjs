#!/usr/bin/env node
/**
 * r324/shot-section.mjs — the X-sweep before/after evidence sheets.
 * Loads /, scrolls to a section, waits for the reveal transitions to
 * settle, and screenshots the ELEMENT (not the viewport) in light and
 * dark. Usage:
 *   node scripts/r324/shot-section.mjs <selector> <name> [bp]
 *   → audits/evidence/r324/<name>-<bp>-light.png / -dark.png
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'audits', 'evidence', 'r324');
const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const selector = process.argv[2] || '#product';
const name = process.argv[3] || 'section';
const bp = Number(process.argv[4] || 1440);

const browser = await chromium.launch({ executablePath: EXEC });
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: bp, height: 900 } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(3000); // the loader + the intro settle
  await page.evaluate(({ sel, t }) => {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, { sel: selector, t: theme });
  // the reveal ladder: every RevealCssClass in the section must land
  await page.waitForTimeout(1800);
  const el = page.locator(selector).first();
  await el.screenshot({ path: path.join(OUT, `${name}-${bp}-${theme}.png`) });
  console.log(`${name}-${bp}-${theme}.png ✓`);
  await page.close();
}
await browser.close();
