/* r325 Y2 evidence — sheet the §05 platform band (.pr-section) at
 * 1440/768/390 × Paper(light)/Ink(dark), full-section webp.
 *   node y2-sheet.mjs <before|after> [outdir]
 * PNG masters are converted to webp (ffmpeg q 88) and removed. */
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const tag = process.argv[2] || 'after';
const outdir = process.argv[3] || '/home/z/wt/y2/audits/evidence/r325/y2';
const FFMPEG = '/usr/bin/ffmpeg';

const BPS = [
  { w: 1440, h: 900, name: '1440' },
  { w: 768, h: 1024, name: '768' },
  { w: 390, h: 844, name: '390' },
];
const THEMES = [
  { key: 'paper', attr: 'light' },
  { key: 'ink', attr: 'dark' },
];

const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
/* this box's renderer crashes across repeated navigations — one fresh
 * browser per SHEET (slow, but every shot lands) */
for (const th of THEMES) {
  for (const bp of BPS) {
    const browser = await chromium.launch({
      executablePath: EXE,
      args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-gpu'],
    });
    const ctx = await browser.newContext({
      viewport: { width: bp.w, height: bp.h },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5202/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate((attr) => {
      document.documentElement.setAttribute('data-theme', attr);
      try { localStorage.setItem('madarek-theme', attr); } catch {}
    }, th.attr);
    await page.waitForTimeout(1000);
    await page.evaluate(async () => { await document.fonts.ready; });
    const section = page.locator('#product.pr-section, section.pr-section').first();
    try {
      await section.scrollIntoViewIfNeeded({ timeout: 8000 });
    } catch {
      await page.evaluate(() => document.querySelector('.pr-section')?.scrollIntoView());
    }
    await page.waitForTimeout(1400); // reveals settle
    const png = path.join(outdir, `platform-${tag}-${bp.name}-${th.key}.png`);
    const webp = png.replace(/\.png$/, '.webp');
    try {
      await section.screenshot({ path: png, animations: 'disabled' });
    } catch (e) {
      console.error('element shot failed → viewport fallback:', e.message.split('\n')[0]);
      await page.screenshot({ path: png, animations: 'disabled' });
    }
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', png, '-quality', '88', webp]);
    fs.unlinkSync(png);
    console.log('sheet', path.basename(webp), fs.statSync(webp).size, 'bytes');
    await browser.close();
  }
}
