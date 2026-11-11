#!/usr/bin/env node
/**
 * identity-guard.mjs — R349 Q4 · the identity ratchet.
 *
 * The owner's word: «المشروع لا ينتمي لأي جامعة — احذفهم نهائيًا».
 * This gate fails the build when forbidden identity strings appear in
 * PRODUCT surfaces (code, data, seeds, copy, docs, config, workflows):
 *
 *   · the removed real-university proper names (Libyan universities —
 *     «جامعة <المكان>» compounds + their English forms);
 *   · the Zawia-sync residue: `zu-sync` / `zu_sync`, `inst-zawia`,
 *     latin `Zawia`, «جامعة الزاوية»;
 *   · the word `showcase` (the synthetic-tenant branding the rounds
 *     retired — «مؤسسة مدارك النموذجية» is the neutral tenant);
 *   · the `UniversityFact` model family (U3 replaces it with the
 *     generic my-institution page);
 *   · the SINGLE-MARK guard (lane B): the mark's literal diamond path
 *     may exist ONLY in the sanctioned geometry sources — any other
 *     file carrying it is a drifting twin of the ONE logo.
 *
 * «زاوية» the bare common noun (a corner) is NOT blocked — only the
 * university compound. Eastern-Arabic copy legitimately says «في زاوية
 * الشاشة». The latin token `zawia` IS blocked (it only ever named the
 * sync source / the institution id).
 *
 * STRUCTURAL exemptions (not allowlist — immutable or self-referential):
 *   · backend/prisma/migrations/**   (append-only history)
 *   · scripts/qa/identity-guard.mjs + identity-allow.json (this gate)
 *   · docs/redesign/** + docs/archive/** (round history — the ledgers
 *     that NAME the residue being removed; product docs are scanned)
 *   · audits/** (evidence captures, round artifacts)
 *
 * ALLOWLIST (scripts/qa/identity-allow.json): { path, patterns, reason,
 * owner } — every entry names the lane that will delete it. Lane U's
 * exit is an allowlist emptied to zero product files (U5).
 *
 * Dependency-free (node:fs / node:path / node:child_process only) so it
 * runs in verify.sh AND the CI design-gates job with no install.
 *
 * Usage: node scripts/qa/identity-guard.mjs [--root <repo>] [--quiet]
 * Exit 0 = clean (or fully allowlisted) · exit 1 = drift, with a table.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(
  here,
  arg('--root') ?? '../..',
);

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/* ── the forbidden patterns ────────────────────────────────────────── */

// Latin, case-insensitive, on word-ish boundaries.
const LATIN_PATTERNS = [
  { id: 'inst-zawia', re: /\binst-zawia\b/i },
  { id: 'zu-sync', re: /\bzu[-_]sync\b/i },
  { id: 'zawia', re: /\bzawia\b/i },
  { id: 'showcase', re: /\bshowcase\b/i },
  { id: 'UniversityFact', re: /\buniversit(yfact|yfacts)\b/i },
  { id: 'University of Zawia', re: /\buniversity of zawia\b/i },
  { id: 'Zawia University', re: /\bzawia university\b/i },
];

// Arabic proper-name compounds — the removed showcase + the Libyan
// public universities (city hosts). Adjectival/generic use of «جامعة»
// (e.g. «جامعة حكومية», «الجامعة») is NOT a violation.
/* R349 U4 — the names live in identity-banned.json (shared with the
   brand tests — the deliberate consumers); this gate is their reader. */
const BANNED_DATA = JSON.parse(
  fs.readFileSync(path.join(here, 'identity-banned.json'), 'utf8'),
);
const ARABIC_NAMES = BANNED_DATA.universities.concat(BANNED_DATA.latinForms).map((name) => ({
  id: name,
  re: new RegExp(name.replace(/\s+/g, '\\s+')),
}));

// The single-mark guard (lane B): the mark's literal diamond path.
const MARK_PATH_LITERAL = 'M16 5L27 16L16 27L5 16Z';
const MARK_PATTERN = {
  id: 'mark-path-twin',
  re: new RegExp(MARK_PATH_LITERAL.replace(/\s+/g, '\\s*')),
};
// Files allowed to carry the literal geometry: the canonical source,
// its committed static twins (public assets), the sanctioned tooling
// (r323 assets script, r324 optical script, the pin test) and the
// mobile port. Lane B's generator outputs land here too.
const MARK_SANCTIONED = new Set([
  'frontend/src/brand/mark.ts',
  'apps/mobile/src/brand/mark.ts',
  'shared/brand/mark.svg',
  'frontend/public/favicon.svg',
  'frontend/public/brand/mark.svg',
  'frontend/public/brand/lockup.svg',
  'frontend/public/brand/lockup-stacked.svg',
  'frontend/public/brand/madarek-mark.svg',
  'scripts/r323/brand-assets.mjs',
  'scripts/r324/shot-logo-optical.mjs',
  'frontend/tests/unit/r323-brand-system.test.ts',
  'scripts/brand/build-app-icons.mjs',
]);

/* R349 U4 — the shared fragments (zu.edu.ly …): banned everywhere the
   compounds are, enforced from the same single source. */
const FRAGMENT_PATTERNS = BANNED_DATA.fragments.map((frag) => ({
  id: frag,
  re: new RegExp(frag.replace(/\./g, '\\.'), 'i'),
}));

const ALL_PATTERNS = [...LATIN_PATTERNS, ...ARABIC_NAMES, ...FRAGMENT_PATTERNS];

/* ── scan scope ────────────────────────────────────────────────────── */

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.jsonc', '.md',
  '.mdx', '.sql', '.yml', '.yaml', '.html', '.htm', '.css', '.scss',
  '.svg', '.txt', '.sh', '.bash', '.prisma', '.webmanifest', '.xml',
  '.env', '.example', '.gitignore', '.dockerignore', '.toml', '.cfg',
  '.ini', '.conf', '.properties', '.kt', '.swift', '.java', '.plist',
]);
const TEXT_NAMES = new Set([
  'Dockerfile', 'Caddyfile', 'Makefile', 'LICENSE', 'Procfile',
  'render.yaml', '.nvmrc', '.node-version', '.gitattributes',
]);

const STRUCTURAL_EXEMPT = [
  /^backend\/prisma\/migrations\//, // append-only history
  /^scripts\/qa\/identity-guard\.mjs$/, // this gate (names the tokens)
  /^scripts\/qa\/identity-allow\.json$/, // the allowlist itself
  /^scripts\/qa\/identity-banned\.json$/, // the shared banned list (U4: the gate + brand tests read it)
  /^docs\/redesign\//, // round ledgers — they NAME the residue
  /^docs\/archive\//, // archived history
  /^audits\//, // evidence captures (round artifacts)
];

function isText(file) {
  const base = path.basename(file);
  if (TEXT_NAMES.has(base)) return true;
  return TEXT_EXT.has(path.extname(file).toLowerCase());
}

function listTracked() {
  const out = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

/* ── allowlist ─────────────────────────────────────────────────────── */

const allowPath = path.join(here, 'identity-allow.json');
let allowlist = [];
if (fs.existsSync(allowPath)) {
  try {
    allowlist = JSON.parse(fs.readFileSync(allowPath, 'utf8')).entries ?? [];
  } catch (err) {
    console.error(`identity-guard: identity-allow.json is not valid JSON — ${err.message}`);
    process.exit(1);
  }
}

function globToRegExp(glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${esc}$`);
}

function allowed(file, patternId) {
  return allowlist.some(
    (e) =>
      globToRegExp(e.path).test(file) &&
      (e.patterns.includes('*') || e.patterns.includes(patternId)),
  );
}

/* ── scan ──────────────────────────────────────────────────────────── */

const files = listTracked().filter(isText);
const findings = [];
let allowlisted = 0;
let scanned = 0;

for (const file of files) {
  if (STRUCTURAL_EXEMPT.some((re) => re.test(file))) continue;
  scanned += 1;

  let text;
  try {
    text = fs.readFileSync(path.join(root, file), 'utf8');
  } catch {
    continue; // unreadable (submodule pointer etc.) — skip
  }

  const patterns = [...ALL_PATTERNS];
  if (!MARK_SANCTIONED.has(file)) patterns.push(MARK_PATTERN);

  const lines = text.split('\n');
  const seenOnLine = new Set();
  lines.forEach((line, i) => {
    for (const p of patterns) {
      const key = `${p.id}:${i + 1}`;
      if (seenOnLine.has(key)) continue;
      if (!p.re.test(line)) continue;
      seenOnLine.add(key);
      if (allowed(file, p.id)) {
        allowlisted += 1;
      } else {
        findings.push({ file, line: i + 1, pattern: p.id, excerpt: line.trim().slice(0, 100) });
      }
    }
  });
}

/* ── report ────────────────────────────────────────────────────────── */

if (findings.length > 0) {
  console.error('identity-guard: DRIFT — forbidden identity strings outside the allowlist:');
  console.error('');
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, hits] of byFile) {
    console.error(`  ${file}`);
    for (const h of hits.slice(0, 4)) {
      console.error(`    L${h.line} [${h.pattern}] ${h.excerpt}`);
    }
    if (hits.length > 4) console.error(`    … +${hits.length - 4} more`);
  }
  console.error('');
  console.error(
    `${findings.length} finding(s) across ${byFile.size} file(s). ` +
      'Fix at the cause, or add a reasoned, lane-owned allowlist entry.',
  );
  process.exit(1);
}

if (!arg('--quiet')) {
  console.log(
    `identity-guard: CLEAN — ${scanned} tracked text files scanned, ` +
      `${allowlisted} allowlisted hit(s), 0 drift. ` +
      `Allowlist: ${allowlist.length} entr(ies).`,
  );
}
