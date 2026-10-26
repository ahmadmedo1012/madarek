#!/usr/bin/env node
/**
 * rename-scan.mjs — R320 Rule 4 STANDALONE runner: the «الإدارة»
 * role-label scan on the ADMIN routes of the gate's route set
 * (authenticated via the gate's own hermetic session seed — the same
 * mechanism gate.mjs logs in with). Exit 1 on ANY unkept hit (raw
 * truth; the composed gate `npm run gate:r320` owns the ratchet).
 *
 *   node scripts/r320/rename-scan.mjs [--quick] [--routes admin-dashboard,…]
 *     [--viewports 390,1440] [--themes light,dark] [--base-url http://…]
 *     [--port 4257]
 *
 * Default = admin-dashboard @390+1440 × light/dark (the gate's quick
 * route set member). Pass --routes admin-students,admin-teachers,… to
 * widen to the whole المسجل-العام surface (11 admin sub-pages are in
 * the gate-lib route table for exactly this).
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
import { loadRenameKeep } from './rules-runtime.mjs';

const ADMIN_ROUTE_NAMES = Object.keys(ROUTES).filter((r) => ROUTES[r].path.startsWith('/admin'));
const opt = parseArgs(process.argv.slice(2), {
  routes: 'admin-dashboard',
  viewports: '390,1440',
  out: 'audits/evidence/r320/rename-scan.md',
});
opt.routes = (opt.routes.split(',').map((r) => r.trim()).filter((r) => ADMIN_ROUTE_NAMES.includes(r)));
if (!opt.routes.length) opt.routes = ['admin-dashboard'];
opt.viewports = opt.viewports.split(',').map((v) => parseInt(v, 10)).filter(Boolean);
opt.themes = opt.themes.split(',');
opt.baseUrl = opt.baseUrl || null;

const { keep, missing } = loadRenameKeep();
if (missing) {
  console.error('✗ rename-scan: docs/redesign/r320/rename-keep.json missing/malformed (c1-RENAME owns the ledger)');
  process.exit(2);
}

const transport = await ensureTransport();
let vite = null;
if (!opt.baseUrl) {
  opt.baseUrl = `http://127.0.0.1:${opt.port}`;
  vite = spawnVite(opt.port);
  if (!(await waitReady(opt.baseUrl))) {
    console.error(`[rename-scan] fatal: vite did not come up on :${opt.port}`);
    killTree(vite);
    process.exit(2);
  }
}

const browser = await chromium.launch();
let cells = [];
try {
  cells = await runSweep(browser, transport, opt, new Set(['rename-scan']), keep);
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
console.log('\n# rename-scan (standalone) — ' + new Date().toISOString());
console.log('| route | viewport | theme | check | result | number | worst sample |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const c = cells.find((x) => x.route === r.route && x.viewport === r.viewport && x.theme === r.theme).checks[r.check];
  const n = `${r.metric} hit(s) · ${c.occurrences} occ · ${c.kept} kept · drawer ${c.drawerOpened ? 'open' : '—'}`;
  console.log(`| ${r.route} | ${r.viewport} | ${r.theme} | ${r.check} | ${r.status} | ${n} | ${String(r.sample).slice(0, 110).replace(/\|/g, '\\|')} |`);
}
const fails = rows.filter((r) => r.status === 'FAIL');
console.log(`\n${fails.length ? '✗' : '✓'} rename-scan standalone — ${fails.length} FAIL row(s) of ${rows.length} (keep-list: ${keep.length} entr${keep.length === 1 ? 'y' : 'ies'})`);
process.exit(fails.length ? 1 : 0);
