#!/usr/bin/env node
/**
 * gate.mjs — R320 §I — THE COMPOSED DEFECT GATE (runs R319's + the
 * five new Cycle-1 rules; extends the machinery, never replaces it).
 *
 * ARCHITECTURE (the "least risk to the existing gate" choice — see
 * scripts/r320/README.md): scripts/r319/gate.mjs is NOT modified, NOT
 * imported and NOT re-implemented — it is RUN, as a child process,
 * with its own CLI/baseline/evidence exactly as `npm run gate:r319`
 * runs it (only --base-url is injected so both halves share the one
 * vite the composed gate spawns on :4257). Its regressions block
 * here. The R320 rules then run on the SAME route × viewport × theme
 * cell contract (scripts/r320/gate-lib.mjs — the r319 recipes copied
 * verbatim, not imported: importing gate.mjs would RUN it) and are
 * ratcheted by their OWN baseline, scripts/r320/gate-baseline.json,
 * through the same first-run-writes / later-runs-exit-1-only-on-
 * regressions mechanism.
 *
 * The five new check families (R320 BOARD §I):
 *
 *   svg-collisions    SVG <text>/<tspan> collision sweep on the
 *                     landing (390/768/1440 × light/dark): text×text
 *                     (any real intersection >0.5px²) and text×geometry
 *                     (>4px², stroke-inflated <line> boxes, ground
 *                     masses ≥2500px² excluded — labels sit ON their
 *                     zones by design). The R318 DOM collision gate
 *                     skips everything inside <svg>; the campus map's
 *                     labels were invisible to it (board §A4).
 *   duplicate-selector  cross-file selector conflict lint (the R319
 *                     B1 bug class: same selector + media context in
 *                     TWO loaded sheets with different values for the
 *                     same property). Spawns scripts/r320/
 *                     duplicate-selector-lint.mjs --json.
 *   hover-guard       every :hover rule inside @media (hover: hover)
 *                     (B1: hover sticks after a tap on touch).
 *                     Spawns scripts/r320/hover-guard-lint.mjs --json.
 *   rename-scan       admin routes carry NO «الإدارة» role label
 *                     outside the keep-list (docs/redesign/r320/
 *                     rename-keep.json — c1-RENAME's ledger; until it
 *                     merges every hit is an honest ratchet row).
 *   cleanliness       ZERO console errors/warnings + ZERO failed
 *                     network requests per route (listeners attach
 *                     before navigation; unique-by-defect dedupe).
 *
 * CLI (the r319 conventions):
 *   node scripts/r320/gate.mjs [--quick]
 *     [--routes landing,student-dashboard,…,admin-students,…]
 *     [--viewports 390,768,1440] [--themes light,dark]
 *     [--only r319,svg-collisions,rename-scan,cleanliness,duplicate-selector,hover-guard]
 *     [--base-url http://…] [--port 4257]
 *     [--out audits/evidence/r320/gate.md]
 *     [--baseline scripts/r320/gate-baseline.json] [--update-baseline]
 *
 * Exit 0 green / 0 with ratchet FAILs / 1 on REGRESSIONS (in EITHER
 * baseline) / 2 harness fatal. Evidence: markdown + JSON twin. The
 * composed gate spawns its OWN vite (--port 4257, strictPort — never
 * 5173, never r319's 4215) and kills it after.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import {
  DEFAULT_ROUTES,
  DEFAULT_VIEWPORTS,
  ROUTES,
  ROOT,
  TICKETS,
  ensureTransport,
  killTree,
  metricOf,
  parseArgs,
  rowKey,
  sampleOf,
  spawnVite,
  waitReady,
  compareBaseline,
} from './gate-lib.mjs';
import { runSweep } from './sweep.mjs';
import { loadRenameKeep, loadSvgCollisionAllowlist } from './rules-runtime.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_RULES = ['svg-collisions', 'rename-scan', 'cleanliness'];
const LINT_RULES = ['duplicate-selector', 'hover-guard'];
const KNOWN = ['r319', ...RUNTIME_RULES, ...LINT_RULES];

TICKETS['r319-gate'] = 'the R319 ratchet (state-contrast/paired/leaks/shell/material) — regressions there block here too (see audits/evidence/r319/gate.md)';

/* ── the R319 child: run it, don't reimplement it ──────────────────── */
function runR319Child(baseUrl, quick, userViewports) {
  const script = path.join(ROOT, 'scripts/r319/gate.mjs');
  if (!fs.existsSync(script)) {
    return { status: 'SKIPPED', metric: 0, reason: 'scripts/r319/gate.mjs not present in this checkout', exitCode: null };
  }
  const args = ['--base-url', baseUrl];
  if (quick) args.push('--quick');
  /* Routes are deliberately NOT passed: the child owns its canonical
   * route set (quick = landing+student-dashboard; full = the six) —
   * widening the R320 route set (admin sub-pages for the rename
   * sweep) must not mint foreign rows in the R319 baseline. */
  if (userViewports) args.push('--viewports', userViewports);
  const res = spawnSync('node', [script, ...args], { encoding: 'utf8', timeout: 45 * 60 * 1000, cwd: ROOT });
  const tail = `${res.stdout || ''}\n${res.stderr || ''}`.trim().split('\n').filter(Boolean).slice(-3).join(' ⏎ ');
  return {
    status: res.status === 0 ? 'PASS' : 'FAIL',
    metric: res.status === 0 ? 0 : 1,
    exitCode: res.status,
    tail: tail.slice(0, 200),
  };
}

/* ── the cheap lints: spawnSync --json (the r319 checkPaired shape) ── */
const LINT_SCRIPTS = {
  'duplicate-selector': 'duplicate-selector-lint.mjs',
  'hover-guard': 'hover-guard-lint.mjs',
};
function runLint(name) {
  const script = path.join(HERE, LINT_SCRIPTS[name] || `${name}.mjs`);
  if (!fs.existsSync(script)) {
    return { status: 'SKIPPED', metric: 0, reason: `scripts/r320/${LINT_SCRIPTS[name] || `${name}.mjs`} missing`, exitCode: null };
  }
  const res = spawnSync('node', [script, '--json'], { encoding: 'utf8', timeout: 120000, cwd: ROOT });
  let parsed = null;
  for (const line of (res.stdout || '').split('\n').reverse()) {
    const t = line.trim();
    if (t.startsWith('{')) {
      try { parsed = JSON.parse(t); break; } catch { /* keep looking */ }
    }
  }
  if (!parsed) {
    return {
      status: res.status === 0 ? 'PASS' : 'FAIL',
      metric: res.status === 0 ? 0 : 1,
      exitCode: res.status,
      reason: `${name}.mjs produced no --json summary (exit ${res.status}) — run it standalone for the full report`,
    };
  }
  return {
    status: parsed.exit ? 'FAIL' : 'PASS',
    metric: parsed.fresh ?? (parsed.exit ? 1 : 0),
    exitCode: parsed.exit,
    counts: parsed,
    sample: (parsed.sample || [])[0] || `${name} clean`,
  };
}

/* ── per-check number formatting (the r319 report conventions) ─────── */
function numberFor(name, c) {
  if (c.status === 'NA' || c.status === 'SKIPPED') return '—';
  switch (name) {
    case 'svg-collisions':
      return `${c.metric} (${c.textText} text×text + ${c.textGeom} text×geom of ${c.texts} texts · ${c.geoms} geoms${c.camOverride ? ' · cam full-view 2nd pass' : ''}${c.allowlisted ? ` · ${c.allowlisted} allowlisted` : ''})`;
    case 'rename-scan':
      return `${c.metric} hit(s) · ${c.occurrences} occ · ${c.kept} kept · drawer ${c.drawerOpened ? 'open' : '—'}`;
    case 'cleanliness/console':
      return `${c.metric} unique · ${c.occurrences} occ (${c.errors}E/${c.warnings}W)`;
    case 'cleanliness/network':
      return `${c.metric} unique · ${c.occurrences} occ`;
    case 'duplicate-selector': {
      const p = c.counts || {};
      return `${c.metric} fresh of ${p.conflictsApp ?? '?'} app×app (${p.conflictsArtifact ?? '?'} artifact pairs exempt · ${p.harmless ?? '?'} harmless dups) · ${p.rules ?? '?'} rules/${p.sheets ?? '?'} sheets`;
    }
    case 'hover-guard': {
      const p = c.counts || {};
      return `${c.metric} fresh of ${p.unguarded ?? '?'} unguarded (${p.hoverRules ?? '?'} :hover rules/${p.sheets ?? '?'} sheets · ${p.allowlisted ?? '?'} allowlisted)`;
    }
    case 'r319-gate':
      return `exit ${c.exitCode ?? '—'}`;
    default:
      return String(c.metric ?? '—');
  }
}

/* ── report (the r319 gate.md schema, extended) ────────────────────── */
function writeReport(opt, cells, lintRows, r319Row, rowList, baselineInfo, startedAt) {
  const outPath = path.resolve(ROOT, opt.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const L = [];
  L.push(`# R320 composed gate — ${new Date(startedAt).toISOString()}`, '');
  L.push(`Base \`${opt.baseUrl}\` · Routes ${opt.routes.join(',')} · Viewports ${opt.viewports.join(',')} · Themes ${opt.themes.join(',')} · Mode ${opt.quick ? 'quick' : 'full'} · Only ${[...opt.only].join(',') || 'all'}`, '');
  L.push('Runs the R319 gate (child process, own baseline: scripts/r319/gate-baseline.json) + the five R320 rules: svg-collisions (landing, text×text + text×geometry) · duplicate-selector (cross-file B1 class) · hover-guard (:hover inside @media (hover:hover)) · rename-scan (admin routes, «الإدارة» register) · cleanliness (console + network). Hermetic: the REAL e2e mock transport serves every /api/ call — no backend needed.', '');
  L.push('| route | viewport | theme | check | result | number | worst sample / failing selectors |');
  L.push('|---|---|---|---|---|---|---|');
  for (const cell of cells) {
    for (const [name, c] of Object.entries(cell.checks)) {
      const ticket = TICKETS[name];
      const reg = baselineInfo.regressionKeys.has(rowKey(cell.route, cell.viewport, cell.theme, name)) ? ' **↗REGRESSION**' : '';
      const badge = c.status === 'FAIL' && ticket ? ` → ${ticket}` : '';
      L.push(`| ${cell.route} | ${cell.viewport} | ${cell.theme} | ${name} | ${c.status}${badge}${reg} | ${numberFor(name, c)} | ${String(sampleOf(c)).slice(0, 120).replace(/\|/g, '\\|')} |`);
    }
    if (cell.error) L.push(`| ${cell.route} | ${cell.viewport} | ${cell.theme} | (cell) | **ERROR** | — | ${cell.error.replace(/\|/g, '\\|')} |`);
  }
  for (const r of [...lintRows, r319Row]) {
    if (!r || r.status === 'NA') continue;
    const reg = baselineInfo.regressionKeys.has(r.key) ? ' **↗REGRESSION**' : '';
    const ticket = TICKETS[r.check];
    L.push(`| — | — | — | ${r.check} | ${r.status}${r.status === 'FAIL' && ticket ? ` → ${ticket}` : ''}${reg} | ${numberFor(r.check, r)} | ${String(r.sample ?? r.reason ?? r.tail ?? '—').slice(0, 120).replace(/\|/g, '\\|')} |`);
  }
  L.push('', '## Ratchet (baseline)', '');
  L.push(`- baseline: \`${opt.baseline}\` — ${baselineInfo.mode}`);
  for (const r of baselineInfo.regressions) L.push(`- ↗ REGRESSION ${r.key}: ${r.status} (metric ${r.metric} > baseline ${r.prevMetric ?? '—'}) — ${r.note}`);
  if (!baselineInfo.regressions.length) L.push('- no regressions vs baseline (ratchet holds)');
  const failRows = rowList.filter((r) => r.status === 'FAIL');
  const warnRows = rowList.filter((r) => r.status === 'WARN');
  const errorCells = cells.filter((c) => c.error).length;
  L.push('', `**${failRows.length} FAIL · ${warnRows.length} WARN · ${errorCells} cell error(s) · ${baselineInfo.regressions.length} regression(s) → exit ${errorCells || baselineInfo.regressions.length ? (baselineInfo.regressions.length ? 1 : 2) : 0}** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).`, '');
  fs.writeFileSync(outPath, L.join('\n'));
  fs.writeFileSync(outPath.replace(/\.md$/, '.json'), `${JSON.stringify({ generated: new Date().toISOString(), baseUrl: opt.baseUrl, routes: opt.routes, viewports: opt.viewports, themes: opt.themes, quick: opt.quick, cells, lints: lintRows, r319: r319Row, rows: rowList, summary: { fails: failRows.length, warns: warnRows.length, regressions: baselineInfo.regressions.length, errorCells, exit: baselineInfo.regressions.length ? 1 : 0 } }, null, 1)}\n`);
  return { failRows, warnRows };
}

/* ── main ──────────────────────────────────────────────────────────── */
async function main() {
  const opt = parseArgs(process.argv.slice(2), { out: 'audits/evidence/r320/gate.md' });
  if (opt.only.size) {
    for (const k of [...opt.only]) {
      if (!KNOWN.includes(k)) throw new Error(`unknown --only member: ${k} (known: ${KNOWN.join(',')})`);
    }
  } else KNOWN.forEach((k) => opt.only.add(k));
  const userViewports = process.argv.some((a) => a.startsWith('--viewports'))
    ? (process.argv.find((a) => a.startsWith('--viewports')).split('=')[1] || process.argv[process.argv.indexOf('--viewports') + 1] || null)
    : null;

  opt.viewports = opt.viewports.split(',').map((v) => parseInt(v, 10)).filter(Boolean);
  opt.routes = opt.routes.split(',').map((r) => r.trim()).filter((r) => ROUTES[r]);
  if (!opt.routes.length) throw new Error(`no known routes in --routes (known: ${Object.keys(ROUTES).join(',')})`);
  opt.themes = opt.themes.split(',');

  const t0 = Date.now();
  process.stderr.write(`[gate:r320] routes=${opt.routes.join(',')} viewports=${opt.viewports.join(',')} only=${[...opt.only].join(',') || 'all'} quick=${opt.quick}\n`);

  /* 1 · the cheap lints (no browser, ~2s) */
  const lintRows = [];
  for (const name of LINT_RULES) {
    if (!opt.only.has(name)) continue;
    const c = runLint(name);
    process.stderr.write(`[gate:r320] lint ${name}: ${c.status} (${c.metric} fresh)\n`);
    lintRows.push({ key: `|—|—|${name}`, route: '—', viewport: '—', theme: '—', check: name, status: c.status, metric: c.metric ?? 0, ...c });
  }

  /* 2 · one vite for both halves (the r319 child gets --base-url) */
  const wantRuntime = RUNTIME_RULES.some((r) => opt.only.has(r));
  const transport = wantRuntime || opt.only.has('r319') ? await ensureTransport() : null;
  if (wantRuntime || opt.only.has('r319')) {
    process.stderr.write('[gate:r320] hermetic transport ready (mock-transport.ts + api-fixtures.ts bundled)\n');
  }
  let vite = null;
  if (!opt.baseUrl) {
    opt.baseUrl = `http://127.0.0.1:${opt.port}`;
    if (wantRuntime || opt.only.has('r319')) {
      vite = spawnVite(opt.port);
      if (!(await waitReady(opt.baseUrl))) {
        killTree(vite);
        process.stderr.write(`[gate:r320] fatal: vite did not come up on :${opt.port}\n`);
        process.exitCode = 2;
        return;
      }
      process.stderr.write(`[gate:r320] vite up on :${opt.port} (pid ${vite.pid})\n`);
    }
  }

  let r319Row = null;
  const cells = [];
  let browser = null;
  try {
    /* 3 · the R319 child — its own CLI, baseline and evidence */
    if (opt.only.has('r319')) {
      process.stderr.write('[gate:r320] running the R319 gate (child) …\n');
      const c = runR319Child(opt.baseUrl, opt.quick, userViewports);
      process.stderr.write(`[gate:r320] r319 child exit ${c.exitCode} — see audits/evidence/r319/gate.md\n`);
      r319Row = { key: '|—|—|r319-gate', route: '—', viewport: '—', theme: '—', check: 'r319-gate', status: c.status, metric: c.metric ?? 0, ...c };
    }

    /* 4 · the R320 runtime rules on the same cell contract */
    if (wantRuntime) {
      const want = new Set(RUNTIME_RULES.filter((r) => opt.only.has(r)));
      const { keep, missing } = loadRenameKeep();
      if (want.has('rename-scan') && missing) {
        process.stderr.write('[gate:r320] rename-scan: keep-list docs/redesign/r320/rename-keep.json missing/malformed — rows will be SKIPPED\n');
      }
      const keepList = missing ? [] : keep;
      const svgAllow = loadSvgCollisionAllowlist();
      browser = await chromium.launch();
      cells.push(...await runSweep(browser, transport, opt, want, keepList, svgAllow));
    }
  } finally {
    if (browser) await browser.close();
    killTree(vite);
  }

  if (!r319Row) r319Row = { key: '|—|—|r319-gate', route: '—', viewport: '—', theme: '—', check: 'r319-gate', status: 'NA', metric: 0, reason: '--only without r319' };

  /* 5 · rows + ratchet + report */
  const rowList = [];
  for (const cell of cells) {
    for (const [name, c] of Object.entries(cell.checks)) {
      rowList.push({
        key: rowKey(cell.route, cell.viewport, cell.theme, name),
        route: cell.route, viewport: cell.viewport, theme: cell.theme, check: name,
        status: c.status, metric: metricOf(c), sample: String(sampleOf(c)).slice(0, 200),
      });
    }
  }
  for (const r of [...lintRows, r319Row]) {
    rowList.push({ key: r.key, route: '—', viewport: '—', theme: '—', check: r.check, status: r.status, metric: r.metric, sample: String(r.sample ?? r.reason ?? r.tail ?? '—').slice(0, 200) });
  }
  const baselineInfo = compareBaseline(opt, rowList);
  const report = writeReport(opt, cells, lintRows, r319Row, rowList, baselineInfo, t0);
  const errorCells = cells.filter((c) => c.error).length;
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const r319Exit = r319Row.exitCode ?? 0;
  const exit = baselineInfo.regressions.length ? 1 : (errorCells ? 2 : r319Exit);
  process.stderr.write(`[gate:r320] ${report.failRows.length} FAIL · ${report.warnRows.length} WARN · ${errorCells} cell error(s) · ${baselineInfo.regressions.length} regression(s) · r319 child exit ${r319Exit} in ${secs}s → ${opt.out} (+.json)\n`);
  process.exitCode = exit;
}

main().catch((err) => {
  process.stderr.write(`[gate:r320] fatal: ${err && err.stack ? err.stack : err}\n`);
  process.exitCode = 2;
});
