#!/usr/bin/env node
/**
 * svg-collisions.mjs — R320 Rule 1 STANDALONE runner: the SVG
 * `<text>` collision sweep on the landing (390/1440 × light/dark by
 * default). Exit 1 on ANY violation (the raw truth — the composed
 * gate `npm run gate:r320` owns the ratchet/baseline semantics).
 *
 *   node scripts/r320/svg-collisions.mjs [--quick] [--viewports 390,1440]
 *     [--themes light] [--base-url http://…] [--port 4257]
 */
import { chromium } from 'playwright-core';
import {
  DEFAULT_ROUTES,
  QUICK_ROUTES,
  ROUTES,
  ensureTransport,
  killTree,
  parseArgs,
  rowKey,
  spawnVite,
  waitReady,
  metricOf,
  sampleOf,
} from './gate-lib.mjs';
import { runSweep } from './sweep.mjs';
import { loadSvgCollisionAllowlist } from './rules-runtime.mjs';

const opt = parseArgs(process.argv.slice(2), {
  routes: 'landing',
  viewports: '390,1440',
  out: 'audits/evidence/r320/svg-collisions.md',
});
opt.routes = opt.routes.split(',').map((r) => r.trim()).filter((r) => ROUTES[r]);
opt.viewports = opt.viewports.split(',').map((v) => parseInt(v, 10)).filter(Boolean);
opt.themes = opt.themes.split(',');
opt.baseUrl = opt.baseUrl || null;

const transport = await ensureTransport();
let vite = null;
if (!opt.baseUrl) {
  opt.baseUrl = `http://127.0.0.1:${opt.port}`;
  vite = spawnVite(opt.port);
  if (!(await waitReady(opt.baseUrl))) {
    console.error(`[svg-collisions] fatal: vite did not come up on :${opt.port}`);
    killTree(vite);
    process.exit(2);
  }
}

const browser = await chromium.launch();
const svgAllow = loadSvgCollisionAllowlist();
let cells = [];
try {
  cells = await runSweep(browser, transport, opt, new Set(['svg-collisions']), [], svgAllow);
} finally {
  await browser.close();
  killTree(vite);
}

const rows = [];
for (const cell of cells) {
  for (const [name, c] of Object.entries(cell.checks)) {
    rows.push({ key: rowKey(cell.route, cell.viewport, cell.theme, name), ...cell, check: name, status: c.status, metric: metricOf(c), sample: String(sampleOf(c)).slice(0, 200) });
  }
}
console.log('\n# svg-collisions (standalone) — ' + new Date().toISOString());
console.log('| route | viewport | theme | check | result | number | worst sample |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const n = `${r.metric} (${r.status === 'NA' ? '—' : 'text×text + text×geom'})`;
  console.log(`| ${r.route} | ${r.viewport} | ${r.theme} | ${r.check} | ${r.status} | ${n} | ${String(r.sample).slice(0, 110).replace(/\|/g, '\\|')} |`);
}
const fails = rows.filter((r) => r.status === 'FAIL');
console.log(`\n${fails.length ? '✗' : '✓'} svg-collisions standalone — ${fails.length} FAIL row(s) of ${rows.length}`);
process.exit(fails.length ? 1 : 0);
