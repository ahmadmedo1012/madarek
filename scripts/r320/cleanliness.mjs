#!/usr/bin/env node
/**
 * cleanliness.mjs — R320 Rule 5 STANDALONE runner: the console/network
 * cleanliness sweep (ZERO console errors/warnings, ZERO failed
 * requests, ZERO failed font/image loads — captured from before
 * navigation through the settle window). Exit 1 on ANY hit (raw
 * truth; the composed gate `npm run gate:r320` owns the ratchet).
 *
 *   node scripts/r320/cleanliness.mjs [--quick] [--routes …]
 *     [--viewports 390,1440] [--themes light,dark]
 *     [--base-url http://…] [--port 4257]
 *
 * Default = the gate's quick route trio (landing, student-dashboard,
 * admin-dashboard) @390+1440 × light/dark. --quick equals the default.
 */
import { chromium } from 'playwright-core';
import {
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

const opt = parseArgs(process.argv.slice(2), {
  routes: 'landing,student-dashboard,admin-dashboard',
  viewports: '390,1440',
  out: 'audits/evidence/r320/cleanliness.md',
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
    console.error(`[cleanliness] fatal: vite did not come up on :${opt.port}`);
    killTree(vite);
    process.exit(2);
  }
}

const browser = await chromium.launch();
let cells = [];
try {
  cells = await runSweep(browser, transport, opt, new Set(['cleanliness']), []);
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
console.log('\n# cleanliness (standalone) — ' + new Date().toISOString());
console.log('| route | viewport | theme | check | result | number | worst sample |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const c = cells.find((x) => x.route === r.route && x.viewport === r.viewport && x.theme === r.theme).checks[r.check];
  const n = c.occurrences != null ? `${r.metric} unique · ${c.occurrences} occ` : String(r.metric);
  console.log(`| ${r.route} | ${r.viewport} | ${r.theme} | ${r.check} | ${r.status} | ${n} | ${String(r.sample).slice(0, 110).replace(/\|/g, '\\|')} |`);
}
const fails = rows.filter((r) => r.status === 'FAIL');
console.log(`\n${fails.length ? '✗' : '✓'} cleanliness standalone — ${fails.length} FAIL row(s) of ${rows.length}`);
process.exit(fails.length ? 1 : 0);
