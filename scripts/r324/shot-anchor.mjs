#!/usr/bin/env node
/**
 * r324/shot-anchor.mjs — a VIEWPORT screenshot at a scroll anchor
 * (element shots break on pinned/6dvh tracks: the intro state must be
 * judged at what the visitor actually sees). Usage:
 *   node scripts/r324/shot-anchor.mjs <selector> <name> [bp] [theme]
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'audits', 'evidence', 'r324');
const BASE = process.env.VITE_URL || 'http://localhost:5173/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const selector = process.argv[2] || '.chapters';
const name = process.argv[3] || 'anchor';
const bp = Number(process.argv[4] || 1440);
const theme = process.argv[5] || 'light';

const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: bp, height: 900 } });
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(3000);
await page.evaluate(({ sel, t }) => {
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  const el = document.querySelector(sel);
  if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
}, { sel: selector, t: theme });
await page.waitForTimeout(1800);
await page.screenshot({ path: path.join(OUT, `${name}-${bp}-${theme}-anchor.png`) });
console.log(`${name}-${bp}-${theme}-anchor.png ✓`);
await browser.close();
