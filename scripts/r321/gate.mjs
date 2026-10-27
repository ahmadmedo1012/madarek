#!/usr/bin/env node
/**
 * gate.mjs — R321 — THE COMPOSED STANDING GATE (extends the R320
 * composer exactly the way R320 extended R319: run the predecessor as
 * a child, add the new rules on top, ratchet through an OWN baseline —
 * machinery extended, never loosened).
 *
 * Composition chain: gate:r321 → child gate:r320 → child gate:r319 →
 * (r318's defect gate runs inside r319's evidence flow). A red child
 * blocks here.
 *
 * The new R321 rules (BOARD §A + §I C1):
 *
 *   text-in-viewport  every visible text element's rect ∈ [0,innerWidth]
 *                     on the public sheets × phone widths (the §A4
 *                     RTL-clip class scrollWidth cannot see).
 *   duplicate-text    no two visible text nodes with identical
 *                     normalised text per region (§A5) — allowlisted
 *                     intentional repeats only.
 *   decor-innertext   marks carry no DOM text; mono codes read once
 *                     (§A6).
 *   rename-ledger     the STATIC repo-wide «الإدارة» scan (§A7) —
 *                     scripts/r321/rename-ledger-scan.mjs; CI runs it
 *                     standalone too.
 *
 * CLI: node scripts/r321/gate.mjs [--quick] [--only r320,text-in-viewport,duplicate-text,decor-innertext,rename-ledger]
 *      [--routes …] [--viewports 320,360,390,430] [--themes light,dark]
 *      [--base-url http://…] [--update-baseline]
 *      [--out audits/evidence/r321/gate.md]
 *
 * The sweep runs against vite PREVIEW of the production build when
 * --base-url is absent (spawn: npm --prefix frontend run build is NOT
 * run here — the caller builds; preview is spawned on :4271).
 * Exit 0 green / 1 regressions / 2 harness fatal.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const BASELINE = path.join(HERE, 'gate-baseline.json');

const KNOWN = ['r320', 'text-in-viewport', 'duplicate-text', 'decor-innertext', 'rename-ledger'];
const RUNTIME = ['text-in-viewport', 'duplicate-text', 'decor-innertext'];

function parseArgs(argv) {
  const opt = {
    quick: false, only: new Set(), baseUrl: null, port: 4271,
    routes: null, viewports: '320,360,390,430', themes: 'light,dark',
    updateBaseline: false, out: 'audits/evidence/r321/gate.md',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quick') opt.quick = true;
    else if (a === '--only') for (const k of argv[++i].split(',')) opt.only.add(k.trim());
    else if (a === '--base-url') opt.baseUrl = argv[++i];
    else if (a === '--port') opt.port = parseInt(argv[++i], 10);
    else if (a === '--routes') opt.routes = argv[++i];
    else if (a === '--viewports') opt.viewports = argv[++i];
    else if (a === '--themes') opt.themes = argv[++i];
    else if (a === '--update-baseline') opt.updateBaseline = true;
    else if (a === '--out') opt.out = argv[++i];
  }
  if (opt.only.size) {
    for (const k of [...opt.only]) if (!KNOWN.includes(k)) throw new Error(`unknown --only member: ${k} (known: ${KNOWN.join(',')})`);
  } else KNOWN.forEach((k) => opt.only.add(k));
  return opt;
}

/* ── baseline ratchet (the r320 mechanism, simplified to rule level) ── */
function loadBaseline() {
  try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { return null; }
}
function compareBaseline(rows) {
  const prev = loadBaseline();
  if (!prev) return { regressions: [], mode: `first run — baseline written to ${path.relative(ROOT, BASELINE)}` };
  const regressions = [];
  for (const r of rows) {
    const key = r.key;
    const before = prev.metrics?.[key];
    if (before === undefined) continue; // new row: not a regression
    if (r.metric > before) regressions.push({ key, before, now: r.metric, note: r.sample });
  }
  return { regressions, mode: `${Object.keys(prev.metrics || {}).length} rows` };
}
function writeBaseline(rows) {
  const metrics = {};
  for (const r of rows) metrics[r.key] = r.metric;
  fs.writeFileSync(BASELINE, `${JSON.stringify({ generated: new Date().toISOString(), metrics }, null, 1)}\n`);
}

const opt = parseArgs(process.argv.slice(2));
const t0 = Date.now();
process.stderr.write(`[gate:r321] only=${[...opt.only].join(',') || 'all'} quick=${opt.quick}\n`);

const rows = [];

/* 1 · the R320 child (own baseline + evidence; quick flag forwarded) */
if (opt.only.has('r320')) {
  const args = [];
  if (opt.quick) args.push('--quick');
  if (opt.baseUrl) args.push('--base-url', opt.baseUrl);
  const res = spawnSync('node', [path.join(ROOT, 'scripts/r320/gate.mjs'), ...args], { encoding: 'utf8', timeout: 45 * 60 * 1000, cwd: ROOT });
  const tail = `${res.stdout || ''}\n${res.stderr || ''}`.trim().split('\n').filter(Boolean).slice(-2).join(' ⏎ ');
  rows.push({ key: 'child|r320-gate', check: 'r320-gate', status: res.status === 0 ? 'PASS' : 'FAIL', metric: res.status === 0 ? 0 : 1, sample: tail.slice(0, 160) });
  process.stderr.write(`[gate:r321] r320 child exit ${res.status}\n`);
}

/* 2 · the static rename-ledger scan */
if (opt.only.has('rename-ledger')) {
  const res = spawnSync('node', [path.join(HERE, 'rename-ledger-scan.mjs'), '--json'], { encoding: 'utf8', timeout: 60000, cwd: ROOT });
  let parsed = null;
  for (const line of (res.stdout || '').split('\n').reverse()) {
    const t = line.trim();
    if (t.startsWith('{')) { try { parsed = JSON.parse(t); break; } catch { /* keep */ } }
  }
  const metric = parsed ? parsed.uncovered : 1;
  rows.push({
    key: 'static|rename-ledger', check: 'rename-ledger',
    status: metric ? 'FAIL' : 'PASS', metric,
    sample: parsed && parsed.sample && parsed.sample[0] ? `${parsed.sample[0].file}:${parsed.sample[0].line}` : `scanned ${parsed?.files ?? '?'} files · ${parsed?.occurrences ?? '?'} occurrences all covered`,
  });
  process.stderr.write(`[gate:r321] rename-ledger: ${metric} off-list\n`);
}

/* 3 · the runtime sweep (own vite preview unless --base-url) */
if (RUNTIME.some((r) => opt.only.has(r))) {
  let baseUrl = opt.baseUrl;
  let preview = null;
  if (!baseUrl) {
    const dist = path.join(ROOT, 'frontend/dist');
    if (!fs.existsSync(path.join(dist, 'index.html'))) {
      process.stderr.write('[gate:r321] fatal: frontend/dist missing — build first (npm run build -w frontend)\n');
      process.exitCode = 2;
    } else {
      preview = spawnSync('node', [
        path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview',
        '--outDir', dist, '--port', String(opt.port), '--strictPort',
      ], { cwd: path.join(ROOT, 'frontend'), stdio: 'ignore', detached: true });
      // vite.js preview is async — poll readiness instead
      preview = null;
      baseUrl = `http://127.0.0.1:${opt.port}`;
      const { spawn } = await import('node:child_process');
      preview = spawn('node', [
        path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview',
        `--outDir=${dist}`, `--port=${opt.port}`, '--strictPort',
      ], { cwd: path.join(ROOT, 'frontend'), stdio: 'ignore', detached: true });
      preview.unref();
      let ready = false;
      for (let i = 0; i < 40 && !ready; i++) {
        await new Promise((r) => setTimeout(r, 500));
        try {
          const res = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
          ready = res.ok;
        } catch { /* not yet */ }
      }
      if (!ready) {
        process.stderr.write(`[gate:r321] fatal: vite preview did not come up on :${opt.port}\n`);
        if (preview.pid) process.kill(-preview.pid, 'SIGTERM').catch?.(() => {});
        process.exit(2);
      }
      process.stderr.write(`[gate:r321] vite preview up on :${opt.port}\n`);
    }
  }
  if (baseUrl) {
    const args = ['--base-url', baseUrl];
    if (opt.routes) args.push('--routes', opt.routes);
    args.push('--viewports', opt.viewports, '--themes', opt.themes);
    if (opt.quick) args.push('--quick');
    const res = spawnSync('node', [path.join(HERE, 'sweep-r321.mjs'), ...args], { encoding: 'utf8', timeout: 20 * 60 * 1000, cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
    let parsed = null;
    for (const line of (res.stdout || '').split('\n').reverse()) {
      const t = line.trim();
      if (t.startsWith('{')) { try { parsed = JSON.parse(t); break; } catch { /* keep */ } }
    }
    if (!parsed) {
      rows.push({ key: 'runtime|sweep', check: 'sweep-harness', status: 'FAIL', metric: 1, sample: String(res.stderr || '').slice(0, 160) });
    } else {
      for (const cell of parsed.cells || []) {
        if (cell.error) {
          rows.push({ key: `cell|${cell.route}|${cell.viewport}|${cell.theme}|harness`, check: 'sweep-harness', status: 'FAIL', metric: 1, sample: cell.error });
          continue;
        }
        for (const [name, c] of Object.entries(cell.checks || {})) {
          if (!opt.only.has(name)) continue;
          rows.push({
            key: `${cell.route}|${cell.viewport}|${cell.theme}|${name}`,
            check: name, route: cell.route, viewport: cell.viewport, theme: cell.theme,
            status: c.status, metric: c.metric, sample: String(c.sample).slice(0, 160),
          });
        }
      }
    }
  }
  if (preview && preview.pid) {
    try { process.kill(-preview.pid, 'SIGTERM'); } catch { /* already gone */ }
  }
}

/* 4 · ratchet + report */
const baselineInfo = opt.updateBaseline ? { regressions: [], mode: 'baseline UPDATED by --update-baseline' } : compareBaseline(rows);
if (opt.updateBaseline || !loadBaseline()) writeBaseline(rows);

const fails = rows.filter((r) => r.status === 'FAIL');
const outPath = path.resolve(ROOT, opt.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const L = [];
L.push(`# R321 composed gate — ${new Date().toISOString()}`, '');
L.push(`Runs gate:r320 as a child (which runs gate:r319) + the R321 rules: text-in-viewport (public sheets × phone widths, RECT-based) · duplicate-text (per-region normalised) · decor-innertext (marks/code) · rename-ledger (static repo scan).`, '');
L.push('| key | check | result | number | sample |');
L.push('|---|---|---|---|---|');
for (const r of rows) {
  const reg = baselineInfo.regressions.some((x) => x.key === r.key) ? ' **↗REGRESSION**' : '';
  L.push(`| ${r.key} | ${r.check} | ${r.status}${reg} | ${r.metric} | ${String(r.sample).slice(0, 120).replace(/\|/g, '\\|')} |`);
}
L.push('', `**${fails.length} FAIL · ${baselineInfo.regressions.length} regression(s) → exit ${baselineInfo.regressions.length ? 1 : fails.length ? 0 : 0}** (ratchet FAILs map to open tickets; only REGRESSIONS block)`, '');
fs.writeFileSync(outPath, L.join('\n'));
fs.writeFileSync(outPath.replace(/\.md$/, '.json'), `${JSON.stringify({ generated: new Date().toISOString(), rows, summary: { fails: fails.length, regressions: baselineInfo.regressions.length } }, null, 1)}\n`);

const secs = ((Date.now() - t0) / 1000).toFixed(0);
process.stderr.write(`[gate:r321] ${fails.length} FAIL · ${baselineInfo.regressions.length} regression(s) in ${secs}s → ${opt.out}\n`);
process.exitCode = baselineInfo.regressions.length ? 1 : 0;
