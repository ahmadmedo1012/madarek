/* P2.2 evidence — screenshot /__design at 1440/768/390 × Paper/Ink.
 * Usage: node scripts/r325/gallery-evidence.mjs [--base http://127.0.0.1:5210] */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('base', 'http://127.0.0.1:5210');
const OUT = path.resolve('audits/evidence/r325/gallery');
fs.mkdirSync(OUT, { recursive: true });

const EXE = path.join(process.env.HOME || '', '.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell');

const VPS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '768', width: 768, height: 900 },
  { name: '390', width: 390, height: 844 },
];
const THEMES = ['light', 'dark'];

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
const shots = [];
for (const vp of VPS) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1, locale: 'ar',
    });
    await ctx.addInitScript((t) => {
      localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t, modeUpdatedAt: 1 }, version: 2 }));
    }, theme);
    const page = await ctx.newPage();
    await page.goto(BASE + '/__design', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1200);
    const file = path.join(OUT, `design-${vp.name}-${theme}.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file);
    await ctx.close();
    console.log('shot', file);
  }
}
await browser.close();
console.log(`done — ${shots.length} screenshots → ${OUT}`);
