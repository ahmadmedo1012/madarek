#!/usr/bin/env node
/**
 * css-shots.mjs — R331 A-CSS · deterministic route screenshots for
 * cascade-regression proofs (md5-comparable BEFORE/AFTER pairs).
 *
 * WHY (css-pass1.md §5): the @layer constitution re-ordering must be
 * proven pixel-identical per route. This harness reuses the repo's
 * DB-less audit pattern (tests/audit/surface-inventory.spec.ts mock
 * mode): the e2e mock transport (tests/e2e/fixtures/mock-transport.ts)
 * owns the wire, the persisted zustand stores are seeded BEFORE app
 * boot, and each route × viewport × theme is captured as a viewport
 * screenshot at the top scroll position after a settle that outlasts
 * every entrance animation.
 *
 * ROUTES: the mock-servable set = tests/audit/routes.ts
 * BASELINE_ROUTES (public funnel + the student core the fixture
 * corpus serves with real payloads). Override with --routes.
 *
 * USAGE (from frontend/ — tsx resolves the TS fixtures):
 *   npx vite --port 5175 &   # or any server; pass --base
 *   npx tsx ../scripts/gates/css-shots.mjs --out /tmp/shots-before
 *   …apply the CSS change…
 *   npx tsx ../scripts/gates/css-shots.mjs --out /tmp/shots-after
 *   node /home/z/heron-lab/visual-diff/diff.mjs a.png b.png   # per pair
 *
 * Options:
 *   --out DIR        output tree (default: /tmp/css-shots)
 *   --base URL       app origin (default http://localhost:5175)
 *   --routes LIST    comma list (default: the mock-servable baseline set)
 *   --viewports LIST comma list (default 390,768,1440 — the R331 widths)
 *   --themes LIST    light,dark (default light — cascade changes are
 *                    theme-symmetric; dark spot-checks ride --themes dark)
 *   --settle MS      post-networkidle settle (default 2500)
 *   --fullpage       capture fullPage instead of the viewport clip
 *   --force          recapture even if the file exists
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

/** The pinned playwright-core may be newer than the browsers cached in
 * ~/.cache/ms-playwright (rev mismatch after a dep bump). Fall back to the
 * newest chromium-* / chromium_headless_shell-* executable present so the
 * harness stays runnable without a browser download. */
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
  } catch { /* cache unreadable → let playwright use its default */ }
  return undefined;
}

import { installMockApi } from '../../frontend/tests/e2e/fixtures/mock-transport.ts';
import { ROLE_USERS } from '../../frontend/tests/e2e/fixtures/api-fixtures.ts';

/* ── CLI ─────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes('--' + k);

const BASE = (opt('base', 'http://localhost:5175')).replace(/\/+$/, '');
const OUT = resolve(opt('out', '/tmp/css-shots'));
const ROUTES = (opt('routes', [
  '/', '/auth', '/auth/register', '/404', '/colleges',
  '/student/dashboard', '/student/courses', '/student/online-exams',
  '/student/alerts', '/student/calendar',
].join(','))).split(',').map((s) => s.trim()).filter(Boolean);
const VIEWPORTS = (opt('viewports', '390,768,1440')).split(',').map((s) => Number(s.trim())).filter(Boolean);
const THEMES = (opt('themes', 'light')).split(',').map((s) => s.trim()).filter(Boolean);
const SETTLE_MS = Number(opt('settle', '2500'));
const FULLPAGE = flag('fullpage');
const FORCE = flag('force');

/** Guarding role per route — the audit spec's roleForRoute, trimmed to
 * the mock corpus (only STUDENT fixtures ship role-rich payloads). */
function roleForRoute(route) {
  if (route.startsWith('/student/')) return 'STUDENT';
  return 'guest';
}

const md5 = (buf) => createHash('md5').update(buf).digest('hex');

/* ── run ─────────────────────────────────────────────────────────── */
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(resolveChromiumExecutable() ? { executablePath: resolveChromiumExecutable() } : {});
const manifest = [];
const contexts = new Map(); // role:theme → context (one context per pair)

try {
  for (const route of ROUTES) {
    const role = roleForRoute(route);
    const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/[/:]+/g, '-');
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const file = `${OUT}/${slug}-${vp}-${theme}.png`;
        if (!FORCE && existsSync(file)) {
          const prev = readFileSync(file);
          manifest.push({ route, vp, theme, file, md5: md5(prev), status: 'resumed' });
          continue;
        }
        const key = `${role}:${theme}`;
        if (!contexts.has(key)) {
          const context = await browser.newContext({
            baseURL: BASE,
            viewport: { width: vp, height: 844 },
            colorScheme: theme,
            locale: 'ar',
            deviceScaleFactor: 1,
          });
          const sessionUser = role === 'guest' ? null : ROLE_USERS[role];
          await installMockApi(context, { sessionUser });
          await context.addInitScript(
            ([sessionUser, themeMode]) => {
              try {
                localStorage.setItem(
                  'madarek-theme',
                  JSON.stringify({ state: { mode: themeMode, modeUpdatedAt: Date.now() }, version: 2 }),
                );
              } catch { /* storage unavailable */ }
              try {
                sessionStorage.setItem('madarek-intro-skip', '1');
              } catch { /* ditto */ }
              if (sessionUser) {
                try {
                  localStorage.setItem(
                    'mdrk-auth',
                    JSON.stringify({ state: { user: sessionUser, accessToken: 'css-shot-mock-token' }, version: 0 }),
                  );
                } catch { /* ditto */ }
              }
            },
            [sessionUser, theme],
          );
          contexts.set(key, context);
        }
        const context = contexts.get(key);
        const page = await context.newPage();
        const consoleErrors = [];
        page.on('pageerror', (err) => consoleErrors.push(String(err)));
        try {
          await page.setViewportSize({ width: vp, height: 844 });
          await page.goto(route, { waitUntil: 'networkidle', timeout: 45_000 });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(SETTLE_MS);
          const buf = await page.screenshot({ fullPage: FULLPAGE, animations: 'disabled' });
          writeFileSync(file, buf);
          manifest.push({ route, vp, theme, file, md5: md5(buf), status: 'done', consoleErrors });
          console.log(`shot ${route} @${vp}/${theme} → ${file} md5=${md5(buf).slice(0, 10)}${consoleErrors.length ? ` consoleErrors=${consoleErrors.length}` : ''}`);
        } catch (err) {
          manifest.push({ route, vp, theme, file, status: 'error', error: String(err), consoleErrors });
          console.error(`FAIL ${route} @${vp}/${theme}: ${err}`);
        } finally {
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
const ok = manifest.filter((m) => m.status === 'done' || m.status === 'resumed').length;
console.log(`\ncss-shots: ${ok}/${manifest.length} captures → ${OUT}`);
process.exit(manifest.some((m) => m.status === 'error') ? 1 : 0);
