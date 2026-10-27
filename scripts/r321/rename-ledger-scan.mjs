#!/usr/bin/env node
/**
 * rename-ledger-scan.mjs — R321 §A7 — THE STATIC LEDGER SCAN.
 *
 * The R320 rename-scan was RUNTIME (admin routes' visible text); this is
 * the repo-wide STATIC sweep the R321 brief orders into CI: every
 * «الإدارة / الادارة» (both hamza spellings) in the working trees —
 * frontend/backend source, tests, prisma, scripts, shared, docs (less
 * archive + the redesign ledgers themselves), root README/AGENTS/… —
 * must be covered by the machine-readable allowlist
 * scripts/r321/r321-rename-keep.json (file + phrase + reason), else
 * exit 1. One term per concept: the role is «المسجل العام», the
 * governance bucket is «الحوكمة»; generic office/building/finance
 * concepts stay allowed WITH a reason row.
 *
 * CLI: node scripts/r321/rename-ledger-scan.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const KEEP = path.join(HERE, 'r321-rename-keep.json');

const SCAN_ROOTS = [
  'frontend/src',
  'frontend/tests',
  'backend/src',
  'backend/tests',
  'backend/prisma',
  'shared',
  'scripts',
  'docs',
  '.github',
];
const SCAN_FILES = [
  'README.md', 'AGENTS.md', 'DESIGN.md', 'CLAUDE.md', 'BACKEND.md',
  'CHANGELOG.md', 'CONTRIBUTING.md', 'render.yaml',
];
const EXCLUDE_DIR_PARTS = ['node_modules', 'archive', 'redesign'];
const EXCLUDE_FILE_RE = [/\.png$|\.jpg$|\.jpeg$|\.webp$|\.gif$|\.ico$|\.pdf$|\.zip$/];
const SCAN_EXT_RE = /\.(ts|tsx|js|mjs|cjs|css|scss|json|md|ya?ml|html|svg|sql|sh|txt)$/;

const RE = /ال[إأا]دارة/g;

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE_DIR_PARTS.includes(e.name)) continue;
      yield* walk(p);
    } else if (e.isFile()) {
      if (EXCLUDE_FILE_RE.some((re) => re.test(e.name))) continue;
      if (!SCAN_EXT_RE.test(e.name)) continue;
      yield p;
    }
  }
}

function loadKeep() {
  try {
    const d = JSON.parse(fs.readFileSync(KEEP, 'utf8'));
    return { rows: Array.isArray(d.keeps) ? d.keeps : [], missing: false };
  } catch {
    return { rows: [], missing: true };
  }
}

function keepCovers(rows, fileRel, phrase) {
  return rows.some((r) => {
    if (!fileRel.startsWith(r.file.replace(/\/$/, ''))) return false;
    // phrase '' = file-level wildcard
    return r.phrase === '' || phrase.includes(r.phrase);
  });
}

const asJson = process.argv.includes('--json');
const { rows: keeps, missing } = loadKeep();

const hits = [];
let files = 0;
for (const root of SCAN_ROOTS) {
  const abs = path.join(ROOT, root);
  if (!fs.existsSync(abs)) continue;
  for (const f of walk(abs)) {
    files += 1;
    const rel = path.relative(ROOT, f).replaceAll('\\', '/');
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(RE)) {
      const idx = m.index ?? 0;
      // a 40-char window around the hit for the report
      const window = text.slice(Math.max(0, idx - 20), idx + 30).replace(/\s+/g, ' ');
      const line = text.slice(0, idx).split('\n').length;
      hits.push({ file: rel, line, window: window.trim() });
    }
  }
}
for (const rel of SCAN_FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  files += 1;
  const text = fs.readFileSync(abs, 'utf8');
  for (const m of text.matchAll(RE)) {
    const idx = m.index ?? 0;
    const window = text.slice(Math.max(0, idx - 20), idx + 30).replace(/\s+/g, ' ');
    const line = text.slice(0, idx).split('\n').length;
    hits.push({ file: rel, line, window: window.trim() });
  }
}

const uncovered = hits.filter((h) => !keepCovers(keeps, h.file, h.window));

if (asJson) {
  console.log(JSON.stringify({
    exit: uncovered.length ? 1 : 0,
    files,
    occurrences: hits.length,
    covered: hits.length - uncovered.length,
    uncovered: uncovered.length,
    keepFileMissing: missing,
    sample: uncovered.slice(0, 8),
  }));
} else {
  const byFile = new Map();
  for (const h of hits) byFile.set(h.file, (byFile.get(h.file) || 0) + 1);
  console.log(`[rename-ledger] scanned ${files} files · ${hits.length} «الإدارة» occurrence(s) · ${uncovered.length} OFF-LIST`);
  for (const [f, n] of byFile) console.log(`  ${f}: ${n}`);
  if (uncovered.length) {
    console.log('\nOFF-LIST hits (add a keep row with a reason, or rename):');
    for (const h of uncovered.slice(0, 20)) console.log(`  ${h.file}:${h.line}  …${h.window}…`);
  }
}
process.exitCode = uncovered.length ? 1 : 0;
