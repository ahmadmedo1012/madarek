#!/usr/bin/env node
/**
 * css-shots.mjs — R331 A-CSS · BEFORE/AFTER screenshot pairs.
 *
 * Drives the SAME routes/viewports against N dev servers (typically
 * the worktree under test + clean main) and saves full-page PNGs for
 * pixel-diffing (python PIL, see css-pass1.md §5). Public routes only
 * — no auth plumbing — because the pass-1 diffs are cascade-neutrality
 * proofs: identical pixels across a @layer constitution landing is
 * the whole point.
 *
 * Deterministic by construction:
 *   · prefers-reduced-motion: reduce (freezes the reveal-up family —
 *     otherwise the shot depends on how long the page had to animate);
 *   · document.fonts.ready + a settle wait before capture;
 *   · fullPage: false — one consistent viewport per shot (fullPage
 *     height varies with late hydration and manufactures diffs).
 *
 * USAGE (from frontend/ or anywhere — playwright-core resolves from
 * the root node_modules):
 *   CSS_SHOTS_BASES="wt=http://localhost:5173,main=http://localhost:5179" \
 *   CSS_SHOTS_ROUTES="/,/login,/about" \
 *   CSS_SHOTS_VPS="1440,390" \
 *   node ../scripts/gates/css-shots.mjs
 *
 * OUTPUT: ${CSS_SHOTS_OUT:-/home/z/heron-lab/css-shots}/<base>-<route>-<vp>.png
 * (route slugged: "/" → home, "/login" → login …). Prints each path.
 */
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const BASES = (process.env.CSS_SHOTS_BASES ?? 'wt=http://localhost:5173,main=http://localhost:5179')
  .split(',')
  .map((s) => {
    const [name, url] = s.split('=');
    return { name, url: url.replace(/\/+$/, '') };
  });
const ROUTES = (process.env.CSS_SHOTS_ROUTES ?? '/,/login,/about').split(',');
const VPS = (process.env.CSS_SHOTS_VPS ?? '1440,390').split(',').map(Number);
const OUT = process.env.CSS_SHOTS_OUT ?? '/home/z/heron-lab/css-shots';
const SETTLE_MS = Number(process.env.CSS_SHOTS_SETTLE ?? 2000);

const slug = (r) => (r === '/' ? 'home' : r.replace(/^[/?&]+|\/+/g, (m) => (m === '/' ? '-' : '-')).replace(/-+$/, '') || 'home');

function resolveChromiumExecutable() {
  if (process.env.CSS_SHOTS_CHROMIUM) return process.env.CSS_SHOTS_CHROMIUM;
  const cache = resolve(process.env.HOME ?? '', '.cache/ms-playwright');
  try {
    const dirs = readdirSync(cache)
      .filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d))
      .sort((a, b) => Number(b.match(/\d+$/)[0]) - Number(a.match(/\d+$/)[0]));
    for (const d of dirs) {
      for (const exe of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = resolve(cache, d, exe);
        if (existsSync(p)) return p;
      }
    }
  } catch { /* unreadable → default */ }
  return undefined;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(resolveChromiumExecutable() ? { executablePath: resolveChromiumExecutable() } : {});

try {
  for (const { name, url } of BASES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 844 }, locale: 'ar' });
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem('madarek-intro-skip', '1');
      } catch { /* storage unavailable */ }
    });
    for (const vp of VPS) {
      for (const route of ROUTES) {
        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
        const file = resolve(OUT, `${name}-${slug(route)}-${vp}.png`);
        try {
          await page.setViewportSize({ width: vp, height: 844 });
          await page.goto(url + route, { waitUntil: 'networkidle', timeout: 45_000 });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(SETTLE_MS);
          await page.screenshot({ path: file, fullPage: false });
          console.log(`shot ${file}`);
        } catch (err) {
          console.error(`FAIL ${name}${route} @${vp}: ${err}`);
        } finally {
          await page.close().catch(() => {});
        }
      }
    }
    await context.close().catch(() => {});
  }
} finally {
  await browser.close();
}
