#!/usr/bin/env node
/**
 * R314 §3.1 — Aligned capture harness (deterministic).
 * Captures a site at a viewport: settled viewport frames at section-relative
 * progress steps (pinned sections resolved by settling + scrub), a scroll-stitch
 * fullpage, and optional loader frames. Progress-relative alignment is the
 * R314 ruling: page heights differ, sections are compared by relative
 * traversal, not absolute pixels.
 *
 * R315 upgrade (J1, backward-compatible): `--url <url>` and `--out <dir>` now
 * cleanly override the SITES entry (any page of any site, any output dir);
 * `--wait <ms>` overrides the per-site settle; meta.json additionally records
 * finalUrl/title/mainStatus so redirected or 404 routes are documented.
 * Loader-gate + theme-gate logic untouched.
 *
 * Usage:
 *   node scripts/r314/capture.mjs --site heron|madarek --viewport 1440x900 \
 *        [--url <url>] [--out <dir>] [--frames 21] [--settle 900] [--wait <ms>]
 *        [--stitch] [--loader-frames] [--theme light|dark] [--chrome]
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SITES = {
  heron: { url: 'https://heronaiapp.com/', wait: 11000 },
  // R315: vite dev server moved 3000 → 5173 (r314 default was stale/dead).
  madarek: { url: 'http://localhost:5173/', wait: 9000 },
};

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
// R315 fix (J1): flag() used to be called as flag('--stitch') producing '----stitch'
// — --stitch/--loader-frames/--chrome silently NEVER fired in r314. Normalize so
// both flag('stitch') and flag('--stitch') resolve to '--stitch'.
const flag = (k) => args.includes('--' + k.replace(/^--/, ''));
const site = get('site', 'madarek');
const [w, h] = get('viewport', '1440x900').split('x').map(Number);
const frames = Number(get('frames', 21));
const settle = Number(get('settle', 900));
const theme = get('theme', 'light');
const outRoot = get('out', `audits/evidence/r314/_local/captures/${site}/${w}x${h}/${theme}`);
const url = get('url', SITES[site].url);          // --url overrides the SITES entry
const wait = Number(get('wait', SITES[site].wait)); // --wait overrides the per-site settle

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
console.log(`  url: ${url}`);
const mainResp = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch {}
if (theme === 'dark' && site === 'madarek') {
  // Madarek theme = zustand persist store, localStorage key 'madarek-theme'
  // ({state:{mode,modeUpdatedAt},version:2}), resolved BEFORE first paint by
  // the index.html bootstrap into <html data-theme="…">. R315 fix (J1): the
  // old 'madarek.theme'/'theme' keys + html.dark class were no-ops — dark
  // captures silently came out LIGHT. Legacy keys kept for compatibility.
  await page.evaluate(() => {
    try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: Date.now() }, version: 2 })); } catch {}
    try { localStorage.removeItem('mdrk-theme-profile'); } catch {} // cached profile pref must not override
    try { localStorage.setItem('madarek.theme', 'dark'); } catch {}
    try { localStorage.setItem('theme', 'dark'); } catch {}
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.reload({ waitUntil: 'load' });
  try { await page.evaluate(() => document.fonts.ready); } catch {}
  const themeState = await page.evaluate(() => ({
    dataTheme: document.documentElement.getAttribute('data-theme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  console.log(`  dark gate: data-theme=${themeState.dataTheme} bodyBg=${themeState.bodyBg}`);
  if (themeState.dataTheme !== 'dark') console.error('  ⚠ dark gate FAILED — capturing anyway');
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
await page.waitForTimeout(wait);
// dismiss heron cookie banner? NO — the banner is part of the chrome we judge.
// (Madarek banner is being added in R314; both stay as-is.)

const meta = { site, url, viewport: `${w}x${h}`, theme, frames, capturedAt: new Date().toISOString() };
// R315: record what ACTUALLY loaded (redirects, soft-404s, titles).
meta.finalUrl = page.url();
meta.mainStatus = mainResp ? mainResp.status() : null;
try { meta.title = await page.title(); } catch { meta.title = null; }
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

// R314 §3.1 — SECTION-RELATIVE alignment (the ruling fix): page shares
// differ between the two sites, so document-progress frames compare the
// WRONG scenes. Each site exposes 9 sections in DOM order; we capture
// every section at its own traversal progress p ∈ {0, .5, 1} (pinned
// sections get denser sampling below). Frame ids: s<NN>-<p> (section
// index + intra-section progress).
const sectionInfo = await page.evaluate((mode) => {
  const secs = [];
  for (const el of document.querySelectorAll('section, footer')) {
    const r = el.getBoundingClientRect();
    if (r.height > 300 && el.offsetParent !== null) {
      // top within the scroll content:
      let top = r.top;
      if (mode === 'element') {
        const wrap = document.querySelector('.lenis, [data-lenis-wrapper]');
        top = r.top - wrap.getBoundingClientRect().top + wrap.scrollTop;
      } else {
        top = r.top + window.scrollY;
      }
      secs.push({ cls: String(el.className).split(' ')[0], top: Math.round(top), h: Math.round(r.height) });
    }
  }
  return secs;
}, scrollInfo.mode);
meta.sections = sectionInfo;

const sectFrames = [];
sectionInfo.forEach((sec, i) => {
  // pinned/long sections (map) get 5 samples; standard sections 3
  const steps = sec.h > maxScroll * 0.25 ? 5 : 3;
  for (let k = 0; k < steps; k++) {
    const p = steps === 1 ? 0 : k / (steps - 1);
    const y = Math.max(0, Math.min(maxScroll, Math.round(sec.top - h * 0.15 + (sec.h - h * 0.7) * p)));
    sectFrames.push({ id: `s${String(i).padStart(2, '0')}-${Math.round(p * 100)}`, y });
  }
});
// R315 fallback (J1): inner pages with no >300px section band would otherwise
// yield ZERO frames — fall back to 7 document-progress frames so every page
// capture still has frames + stitch. Landings are unaffected (9 bands found).
if (sectFrames.length === 0 && maxScroll > 0) {
  for (let k = 0; k < 7; k++) {
    const p = k / 6;
    sectFrames.push({ id: `f-${String(Math.round(p * 100)).padStart(3, '0')}`, y: Math.round(maxScroll * p) });
  }
  console.log('  no section bands >300px — using 7 document-progress fallback frames');
}
for (const sf of sectFrames) {
  await scrollTo(sf.y);
  await page.waitForTimeout(settle);
  await page.screenshot({ path: path.join(outRoot, `p-${sf.id}.png`) });
}
console.log(`  ${sectFrames.length} section-relative frames @ docH=${scrollInfo.docHeight} maxScroll=${maxScroll} (${scrollInfo.mode})`);
console.log('  sections: ' + sectionInfo.map((x) => `${x.cls}:${x.h}`).join(' · '));

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
