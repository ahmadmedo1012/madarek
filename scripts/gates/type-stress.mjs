#!/usr/bin/env node
/**
 * r366 type-stress.mjs — Agent 3 L2c: the typography stress probe.
 *
 * Numeric stress (no eyeballing): for each route × width × text-scale
 * it reports whether the document horizontally overflows (the Arabic
 * long-word / mixed-bidi / zoom matrix of §7). PASS = zero overflowing
 * viewports. Emulates text scale via CDP page-scale (visual zoom —
 * the honest proxy for the 130 %/200 % user settings).
 *
 * Usage: node scripts/gates/type-stress.mjs [--routes /__design,/,/auth]
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* R366-final (CI repair): the design-gates job installs NOTHING — the
 * gate set is dependency-free by contract. playwright-core lives in the
 * FRONTEND workspace's node_modules (hoisted or local), so resolve it
 * from there; a bare specifier works only when a root install exists
 * (local verify.sh) and failed on CI with ERR_MODULE_NOT_FOUND. */
const require = createRequire(path.join(ROOT, 'frontend', 'package.json'));
const { chromium } = require('playwright-core');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('base-url', 'http://127.0.0.1:4328');
const PORT = opt('port', '4328');
const ROUTES = (opt('routes', '/__design,/,/auth')).split(',');
const WIDTHS = [320, 390, 768, 1440];
const SCALES = [1, 1.3, 2];

const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  try {
    const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort();
    for (const d of dirs.reverse()) {
      const p = path.join(base, d, 'chrome-linux64/chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch { /* fall through */ }
  return undefined;
})();

let server;
async function startServer() {
  /* R366-final (CI repair): `vite preview` needs a built dist/ — the
   * conform-gate job installs and boots the DEV server but never builds,
   * so the gate FATALed there ("preview server failed"). Serve from the
   * build when one exists (the local verify.sh flow — build precedes),
   * otherwise boot the dev server (geometry probes don't need the
   * production bundle; the styles are identical). */
  const hasBuild = fs.existsSync(path.join(ROOT, 'frontend', 'dist', 'index.html'));
  const cmd = hasBuild
    ? ['vite', 'preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort']
    : ['vite', '--host', '127.0.0.1', '--port', PORT, '--strictPort'];
  server = spawn('npx', cmd, {
    cwd: path.join(ROOT, 'frontend'), stdio: 'ignore', env: process.env,
  });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(700) }); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/* long-word / bidi stress injected into the auth form + any input */
const STRESS_JS = `(() => {
  const inputs = [...document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], textarea')];
  const long = 'التنظيم المؤسسي للمسابقات الأكاديمية بين الكليات — CS301 · قواعد البيانات ٢٠٢٥';
  for (const el of inputs.slice(0, 3)) {
    el.focus();
    el.value = long;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return inputs.length;
})()`;

const results = [];
let browser;
try {
  if (!(await startServer())) { console.error('[type-stress] FATAL: preview server failed'); process.exit(1); }
  browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      for (const scale of SCALES) {
        const ctx = await browser.newContext({ viewport: { width, height: 844 }, locale: 'ar' });
        const page = await ctx.newPage();
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: scale });
        await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(700);
        try { await page.evaluate(STRESS_JS); } catch { /* no inputs */ }
        await page.waitForTimeout(250);
        const m = await page.evaluate(() => {
          const se = document.scrollingElement || document.documentElement;
          return { sw: se.scrollWidth, cw: se.clientWidth, zoom: window.innerWidth };
        });
        const overflow = m.sw - m.cw;
        results.push({ route, width, scale, overflow });
        if (overflow > 1) console.log(`  ✗ ${route} @${width} scale ${scale} — horizontal overflow ${overflow}px (scrollWidth ${m.sw} > clientWidth ${m.cw})`);
        await ctx.close();
      }
    }
  }
} finally {
  try { if (browser) await browser.close(); } catch {}
  try { if (server) server.kill('SIGKILL'); } catch {}
  try { spawn('pkill', ['-f', 'vite preview']); } catch {}
}
const bad = results.filter((r) => r.overflow > 1);
console.log(`\n[type-stress] ${results.length} viewport probes (4 widths × 3 scales × ${ROUTES.length} routes) — ${bad.length} overflowing`);
if (bad.length === 0) console.log('[type-stress] verdict: PASS — no horizontal overflow under the long-word/bidi/zoom matrix');
else for (const b of bad) console.log(`  ✗ ${b.route} @${b.width} ×${b.scale}: ${b.overflow}px`);
process.exit(bad.length ? 1 : 0);
