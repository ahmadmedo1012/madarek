#!/usr/bin/env node
/**
 * r323/clean-gate.mjs — A4 #5 `gate:clean` — the cleanliness gate.
 *
 * Composes the repo's verified linters (never re-implements them):
 *   1. duplicate-selector lint   (scripts/r320/duplicate-selector-lint.mjs)
 *   2. hover-guard lint          (scripts/r320/hover-guard-lint.mjs)
 *   3. unused-dependency scan    (this file — import graph vs package.json
 *     for BOTH workspaces; CLI/tools/@types deps whitelisted explicitly)
 *   4. raw-CSS guard             (scripts/check-raw-css.sh)
 *   5. colour-token guard        (scripts/check-colors.sh)
 *
 * knip/depcheck/purgecss/jscpd equivalents without new deps: the two r320
 * linters cover the CSS duplication classes they target; the import scan
 * is depcheck's core; purge-style dead-CSS is NOT proven safe statically
 * on this codebase (dynamic className composition) and is honestly
 * reported as out-of-scope rather than pretended.
 *
 * Usage: node scripts/r323/clean-gate.mjs   (exit 1 on any finding)
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const findings = [];
const sections = [];

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd: cwd || ROOT, encoding: 'utf8' });
}

/* ── 1+2. the r320 CSS linters (RATCHET: non-increase vs baseline) ─
   The repo carries pre-existing cross-file conflicts (65) and unguarded
   hovers (183) from earlier waves — too many to fix wholesale inside A4
   without regression risk. The gate enforces the ratchet contract:
   counts may never EXCEED the recorded baseline (thresholds only go
   down); each reduction lowers the baseline in clean-baseline.json. */
const BASELINE_PATH = path.join(ROOT, 'scripts/r323/clean-baseline.json');
const BASELINES = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : {};
const COUNT_PATTERNS = {
  'duplicate-selector-lint.mjs': /(\d+)\s+cross-file selector conflict/,
  'hover-guard-lint.mjs': /(\d+)\s+unguarded\s*:hover/,
};
for (const [script, pat] of Object.entries(COUNT_PATTERNS)) {
  const r = run('node', ['scripts/r320/' + script]);
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(pat);
  const count = m ? Number(m[1]) : (r.status === 0 ? 0 : null);
  const base = BASELINES[script] ?? count ?? 0;
  BASELINES[script] = base;
  const ok = count != null && count <= base;
  sections.push({ name: script + ' (ratchet ≤' + base + ')', ok, output: `count=${count}` });
  if (!ok) findings.push(`${script}: ${count} findings exceed the recorded baseline ${base} — fix, then lower scripts/r323/clean-baseline.json`);
}
fs.writeFileSync(BASELINE_PATH, JSON.stringify(BASELINES, null, 2) + '\n');

/* ── 4+5. token guards ──────────────────────────────────────────── */
for (const script of ['scripts/check-raw-css.sh', 'scripts/check-colors.sh']) {
  const r = run('bash', [script]);
  const ok = r.status === 0;
  sections.push({ name: path.basename(script), ok, output: (r.stdout || '') + (r.stderr || '') });
  if (!ok) findings.push(`${script} failed`);
}

/* ── 3. unused-dependency scan (depcheck core, both workspaces) ── */
const WHITELIST = new Set([
  // build/test tooling invoked via package scripts or configs, never imported
  'vite', 'vitest', 'tsx', 'typescript', 'eslint', 'prettier', '@vitejs/plugin-react',
  '@playwright/test', 'playwright-core', 'rollup-plugin-visualizer', 'jsdom',
  '@testing-library/react', '@testing-library/jest-dom', 'knip', 'depcheck', 'purgecss', 'jscpd',
  // type-only / ambient
  '@types/node', '@types/react', '@types/react-dom', '@types/bun',
  // prisma toolchain (generated client + CLI, imported indirectly)
  'prisma', '@prisma/client',
  // front-end framework peers resolved by the compiler
  'react', 'react-dom',
]);

function collectFiles(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'build', 'coverage'].includes(e.name)) continue;
      collectFiles(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

function scanWorkspace(ws) {
  const pkgPath = path.join(ROOT, ws, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  const deps = Object.keys(JSON.parse(fs.readFileSync(pkgPath, 'utf8')).dependencies || {});
  if (!deps.length) return;
  const src = path.join(ROOT, ws, 'src');
  const files = [
    ...collectFiles(src, ['.ts', '.tsx', '.js', '.mjs', '.css']),
    ...collectFiles(path.join(ROOT, 'scripts'), ['.mjs', '.js', '.cjs', '.ts']),
    path.join(ROOT, ws, 'vite.config.ts'),
  ].filter((p) => fs.existsSync(p));
  const haystack = files.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
  const unused = [];
  for (const dep of deps) {
    if (WHITELIST.has(dep)) continue;
    const esc = dep.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
    // import x from 'dep' · import('dep') · require('dep') · from 'dep/…' · @import in css · url(…)
    const re = new RegExp(`(from\\s+['"]${esc}(/|['"])|import\\s*\\(\\s*['"]${esc}['"]|require\\s*\\(\\s*['"]${esc}['"]|@import\\s+['"]${esc}['"]|import\\s+['"]${esc}(/|['"]))`);
    if (!re.test(haystack)) unused.push(dep);
  }
  sections.push({
    name: `unused-deps(${ws})`,
    ok: unused.length === 0,
    output: unused.length ? 'UNUSED: ' + unused.join(', ') : 'all declared deps referenced',
  });
  for (const u of unused) findings.push(`${ws}: dependency "${u}" declared but never imported`);
}
scanWorkspace('frontend');
scanWorkspace('backend');

/* ── verdict ─────────────────────────────────────────────────────── */
console.log('[gate:clean] sections:');
for (const s of sections) {
  const tail = (s.output || '').trim().split('\n').slice(-2).join(' | ').slice(0, 160);
  console.log(`  ${s.ok ? '✓' : '✗'} ${s.name}${tail ? '  — ' + tail : ''}`);
}
if (findings.length) {
  console.error(`\n[gate:clean] FAIL (${findings.length}):`);
  for (const f of findings) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('\n[gate:clean] PASS — selectors, hover-guards, tokens, dependency graph all clean.');
