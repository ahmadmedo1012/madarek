#!/usr/bin/env node
/**
 * r366 cls-probe.mjs — Agent 3 L2: the font-swap CLS probe.
 *
 * Loads the built app through `vite preview` under DevTools "Slow 4G"
 * network emulation (400 kbps down · 2,000 ms RTT — the §7 loading
 * condition) and sums the PerformanceObserver `layout-shift` entries
 * for 12 s after navigation, per route. The font path is the target:
 * with the metric-compatible fallback faces + the two preloads, the
 * swap must hold cumulative CLS ≤ 0.02 (the L2 budget).
 *
 * Usage: node scripts/gates/cls-probe.mjs [--routes /,/auth] [--port 4327]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('base-url', 'http://127.0.0.1:4327');
const PORT = opt('port', '4327');
const ROUTES = (opt('routes', '/,/auth')).split(',');

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
import fs from 'node:fs';

let server;
async function startServer() {
  server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    cwd: path.join(ROOT, 'frontend'), stdio: 'ignore', env: process.env,
  });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(700) }); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const results = [];
let browser;
try {
  if (!(await startServer())) { console.error('[cls] FATAL: preview server failed'); process.exit(1); }
  browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 2000, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8,
    });
    await page.addInitScript(() => {
      window.__cls = 0;
      window.__clsSources = {};
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) {
            if (e.hadRecentInput) continue;
            window.__cls += e.value;
            for (const src of e.sources || []) {
              const n = src.node;
              let key = 'unknown';
              try { key = (n && (n.nodeName + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.split(/\s+/).slice(0, 2).join('.') : ''))) || 'anon'; } catch { /* detached */ }
              window.__clsSources[key] = (window.__clsSources[key] || 0) + e.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch { /* unsupported */ }
    });
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(12000);
    const cls = await page.evaluate(() => window.__cls);
    const sources = await page.evaluate(() => Object.entries(window.__clsSources).sort((a, b) => b[1] - a[1]).slice(0, 5));
    results.push({ route, cls: Math.round(cls * 10000) / 10000 });
    if (cls > 0.02) for (const [k, v] of sources) console.log(`    shift-source ${k.slice(0, 60).padEnd(60)} ${v.toFixed(4)}`);
    console.log(`[cls] ${route.padEnd(8)} cumulative layout-shift = ${cls.toFixed(4)} ${cls <= 0.02 ? '✓ ≤ 0.02' : '✗ OVER BUDGET'}`);
    await ctx.close();
  }
} finally {
  try { if (browser) await browser.close(); } catch {}
  try { if (server) server.kill('SIGKILL'); } catch {}
  try { spawn('pkill', ['-f', 'vite preview']); } catch {}
}
const worst = Math.max(...results.map((r) => r.cls));
console.log(`\n[cls] verdict: ${worst <= 0.02 ? 'PASS' : 'FAIL'} — worst ${worst.toFixed(4)} over ${results.length} route(s) (budget ≤ 0.02, Slow 4G + 4× CPU)`);
process.exit(worst <= 0.02 ? 0 : 1);
