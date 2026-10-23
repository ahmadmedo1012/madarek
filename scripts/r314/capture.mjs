#!/usr/bin/env node
/**
 * R314 §3.1 — Aligned capture harness (deterministic).
 * Captures a site at a viewport: settled viewport frames at document-progress
 * steps (pinned sections resolved by settling + scrub), a scroll-stitch
 * fullpage, and optional loader frames. Progress-relative alignment is the
 * R314 ruling: page heights differ, sections are compared by relative
 * traversal, not absolute pixels.
 *
 * Usage:
 *   node scripts/r314/capture.mjs --site heron|madarek --viewport 1440x900 \
 *        [--frames 21] [--settle 900] [--stitch] [--loader-frames] [--theme light|dark]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SITES = {
  heron: { url: 'https://heronaiapp.com/', wait: 11000 },
  madarek: { url: 'http://localhost:3000/', wait: 9000 },
};

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const site = get('site', 'madarek');
const [w, h] = get('viewport', '1440x900').split('x').map(Number);
const frames = Number(get('frames', 21));
const settle = Number(get('settle', 900));
const theme = get('theme', 'light');
const outRoot = get("out", `audits/evidence/r314/_local/captures/${site}/${w}x${h}/${theme}`);
const url = flag('--url') ? get('url', SITES[site].url) : SITES[site].url;

fs.mkdirSync(outRoot, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const ctx = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
  locale: 'en-US',
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('  [pageerror]', String(e).slice(0, 160)));

console.log(`▸ ${site} ${w}x${h} ${theme} → ${outRoot}`);
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch {}
if (theme === 'dark' && site === 'madarek') {
  // Madarek theme is a localStorage/class toggle; force dark palette.
  await page.evaluate(() => {
    try { localStorage.setItem('madarek.theme', 'dark'); } catch {}
    try { localStorage.setItem('theme', 'dark'); } catch {}
    document.documentElement.classList.add('dark');
  });
  await page.reload({ waitUntil: 'load' });
  try { await page.evaluate(() => document.fonts.ready); } catch {}
}

// loader frames (first pass only, before banner/state capture)
if (flag('--loader-frames')) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => { try { localStorage.removeItem('madarek.loader-seen'); localStorage.removeItem('loaderSeen'); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < 10000) {
    await page.screenshot({ path: path.join(outRoot, `loader-${String(i).padStart(3, '0')}.png`) });
    await page.waitForTimeout(500);
    i++;
  }
}

// settle: loader + entrance animations. Heron ~7.2s + exit; Madarek gated.
await page.waitForTimeout(SITES[site].wait);
// dismiss heron cookie banner? NO — the banner is part of the chrome we judge.
// (Madarek banner is being added in R314; both stay as-is.)

const meta = { site, url, viewport: `${w}x${h}`, theme, frames, capturedAt: new Date().toISOString() };
// R314: detect the real scroll container (Heron scrolls .main-inner via Lenis,
// overflow hidden; Madarek scrolls the window). Progress is container-relative.
const scrollInfo = await page.evaluate(() => {
  const lenisEl = document.querySelector('.lenis, [data-lenis-wrapper]');
  const winH = document.documentElement.scrollHeight;
  if (lenisEl && lenisEl.scrollHeight > window.innerHeight + 200) {
    return { mode: 'element', max: lenisEl.scrollHeight - lenisEl.clientHeight, docHeight: lenisEl.scrollHeight };
  }
  return { mode: 'window', max: winH - window.innerHeight, docHeight: winH };
});
meta.docHeight = scrollInfo.docHeight;
meta.scrollMode = scrollInfo.mode;
const maxScroll = scrollInfo.max;

const scrollTo = async (y) => {
  await page.evaluate(({ mode, y }) => {
    if (mode === 'element') { document.querySelector('.lenis, [data-lenis-wrapper]').scrollTop = y; }
    else { window.scrollTo(0, y); }
  }, { mode: scrollInfo.mode, y });
};

// viewport frames at document progress
for (let f = 0; f < frames; f++) {
  const p = frames === 1 ? 0 : f / (frames - 1);
  const y = Math.round(maxScroll * p);
  await scrollTo(y);
  await page.waitForTimeout(settle);
  await page.screenshot({ path: path.join(outRoot, `p${String(f).padStart(2, '0')}-${Math.round(p * 100)}.png`) });
}
console.log(`  ${frames} progress frames @ docH=${scrollInfo.docHeight} maxScroll=${maxScroll} (${scrollInfo.mode})`);

// scroll-stitch fullpage (handles pin/fixed correctly, fullPage API does not)
if (flag('--stitch')) {
  const shots = [];
  await scrollTo(0);
  await page.waitForTimeout(settle);
  for (let y = 0; y <= maxScroll; y += h) {
    await scrollTo(y);
    await page.waitForTimeout(Math.max(settle, 700));
    const buf = await page.screenshot();
    shots.push(buf);
  }
  fs.writeFileSync(path.join(outRoot, 'stitch-manifest.json'), JSON.stringify({ count: shots.length, docH: scrollInfo.docHeight, viewH: h }, null, 2));
  shots.forEach((b, i) => fs.writeFileSync(path.join(outRoot, `stitch-${String(i).padStart(4, '0')}.png`), b));
  console.log(`  ${shots.length} stitch frames`);
}

// chrome state: header + hover on first visible nav CTA
if (flag('--chrome')) {
  await scrollTo(0);
  await page.waitForTimeout(settle);
  await page.screenshot({ path: path.join(outRoot, 'chrome-top.png') });
}

fs.writeFileSync(path.join(outRoot, 'meta.json'), JSON.stringify(meta, null, 2));
await browser.close();
console.log('✓ done');
