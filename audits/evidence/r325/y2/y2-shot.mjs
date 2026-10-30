/* Y2 evidence — shot the §05 platform band (.pr-section) at
 * 1440/768/390 × Paper(light)/Ink(dark). Usage:
 *   node y2-shot.mjs <before|after> [outdir]
 * Writes platform-<tag>-<bp>-<theme>.webp full-section sheets.
 * One reused page (fresh contexts crashed the renderer on this box). */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const tag = process.argv[2] || 'before';
const outdir = process.argv[3] || '/home/z/wt/y2/audits/evidence/r325/y2/' + tag;
const only = process.argv[4] || ''; // optional "1440-paper" filter — one shot per run on low-RAM boxes
fs.mkdirSync(outdir, { recursive: true });

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
const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-gpu'],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();

for (const th of THEMES) {
  for (const bp of BPS) {
    const key = `${bp.name}-${th.key}`;
    if (only && key !== only) continue;
    await page.setViewportSize({ width: bp.w, height: bp.h });
    await page.goto('http://localhost:5202/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate((attr) => {
      document.documentElement.setAttribute('data-theme', attr);
      try { localStorage.setItem('madarek-theme', attr); } catch {}
    }, th.attr);
    await page.waitForTimeout(1200);
    await page.evaluate(async () => { await document.fonts.ready; });
    const section = page.locator('#product.pr-section, section.pr-section').first();
    try {
      await section.scrollIntoViewIfNeeded({ timeout: 8000 });
    } catch { await page.evaluate(() => document.querySelector('.pr-section')?.scrollIntoView()); }
    await page.waitForTimeout(1400); // reveals settle
    const file = path.join(outdir, `platform-${tag}-${bp.name}-${th.key}.png`);
    try {
      await section.screenshot({ path: file, animations: 'disabled' });
      console.log('shot', file);
    } catch (e) {
      console.error('element shot failed, fallback viewport:', e.message.split('\n')[0]);
      await page.screenshot({ path: file.replace('.png', '-vp.png') });
      console.log('shot(fallback)', file);
    }
  }
}
await browser.close();
