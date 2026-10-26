#!/usr/bin/env node
/**
 * hover-guard-lint.mjs — R320 (c1-GATE) Rule 3 — the `:hover` guard gate.
 *
 * THE BUG CLASS (R319 B1, the sibling of the duplicate-selector lint):
 * `:hover` styles applied on a touch device STICK after a tap (there
 * is no hover-end on touch), so an unguarded `.nav-item:hover` wash
 * left «مقرّراتي الدراسية» as a pale ghost on the owner's iPhone. The
 * c1-A fix's convention — now this gate's law — is that EVERY `:hover`
 * rule lives inside `@media (hover: hover)` (the repo's sheets use
 * `(hover: hover) and (pointer: fine)`, which satisfies it).
 *
 * THE RULE THIS SCRIPT ENFORCES:
 *   Every style rule whose selector carries `:hover` (any comma
 *   segment) must have a `(hover: hover)` feature in its @media chain
 *   (nesting at any depth counts — `@media (hover: hover) and
 *   (pointer: fine) { @media (min-width: 992px) { .a:hover { … } } }`
 *   is guarded). `any-hover: hover` is NOT a guard: it asserts some
 *   input CAN hover, not that the primary pointer does — the exact
 *   confusion that bred B1. `:hover` inside @keyframes/@font-face is
 *   not a selector and is skipped by the walker.
 *
 * Exemptions live in scripts/r320/hover-guard-allowlist.json (same
 * conventions as paired-state-allowlist.json: key + reason ≥ 12 chars
 * + stale-guard). `--emit-allowlist` scaffolds the current set.
 * `--json` prints a machine summary (one JSON line, stdout) for the
 * composed gate's ratchet — the human report stays on stderr.
 * `--ratchet` exits 1 only when the fresh count EXCEEDS the accepted
 * number in scripts/r320/gate-baseline.json (the pre-push shape: the
 * 185 known-open unguarded rules are the Cycle-2-6 sweep, a NEW one
 * blocks the push; the baseline file itself is written only by the
 * composed gate — this lint reads, never writes).
 *
 * Plain node, zero deps. Exit 0 = clean, exit 1 = report.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chainHasHoverGuard, cssFiles, normMedia, walkFile } from './css-walk.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const SRC_DIR = join(ROOT, 'frontend', 'src');
const ALLOWLIST_PATH = join(ROOT, 'scripts', 'r320', 'hover-guard-allowlist.json');

const HOVER_SEG = /:hover\b/;

/* ── sweep ─────────────────────────────────────────────────────────── */
const files = cssFiles(SRC_DIR);
const violations = [];
let hoverRuleCount = 0;
let nestedCount = 0;

for (const abs of files) {
  const file = relative(SRC_DIR, abs).replaceAll('\\', '/');
  const { rules, nested } = walkFile(abs);
  nestedCount += nested;
  for (const rule of rules) {
    if (!rule.segs.some((s) => HOVER_SEG.test(s))) continue;
    hoverRuleCount += 1;
    if (chainHasHoverGuard(rule.mediaChain)) continue;
    violations.push({
      file,
      line: rule.line,
      selector: rule.selector,
      media: rule.mediaChain.map(normMedia).join(' && ') || '(root)',
      key: `${file} :: ${rule.selector} @ ${rule.mediaChain.map(normMedia).join('&&') || '(root)'}`,
    });
  }
}

violations.sort((a, b) => (a.file + a.line).localeCompare(b.file + b.line));

/* ── allowlist (written reasons + stale-guard) ─────────────────────── */
let allowlist = [];
let allowlistMalformed = false;
try {
  const parsed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  if (parsed && Array.isArray(parsed.allow)) allowlist = parsed.allow;
  else allowlistMalformed = true;
} catch {
  allowlistMalformed = true;
}

if (process.argv.includes('--emit-allowlist')) {
  const byKey = new Map();
  for (const v of violations) {
    byKey.set(v.key, {
      key: v.key,
      reason: 'DOCUMENTED EXCEPTION — replace with the real reason (e.g. forced-state e2e test CSS or vendor sheet that cannot take the guard)',
    });
  }
  const merged = [...allowlist.filter((e) => !byKey.has(e.key))];
  const next = [...merged, ...[...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))];
  writeFileSync(ALLOWLIST_PATH, `${JSON.stringify({ allow: next }, null, 2)}\n`);
  console.log(`emit: wrote ${next.length} allowlist entries (${byKey.size} new) to ${relative(ROOT, ALLOWLIST_PATH)}`);
  process.exit(0);
}

const allowKeys = new Set(allowlist.map((e) => e.key));
const unreasoned = allowlist.filter((e) => !e.reason || String(e.reason).trim().length < 12);
const violationKeys = new Set(violations.map((v) => v.key));
const stale = allowlist.filter((e) => !violationKeys.has(e.key));
const fresh = violations.filter((v) => !allowKeys.has(v.key));

/** The accepted fresh count from the composed gate's ratchet baseline
 * (`|—|—|hover-guard`), or null when no baseline exists (→ strict). */
function ratchetCap() {
  try {
    const rows = JSON.parse(readFileSync(join(ROOT, 'scripts/r320/gate-baseline.json'), 'utf8')).rows ?? {};
    const row = rows['|—|—|hover-guard'];
    return row && typeof row.metric === 'number' ? row.metric : null;
  } catch {
    return null;
  }
}

/* ── machine summary for the composed gate (--json) ──────────────── */
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    lint: 'hover-guard',
    exit: fresh.length || stale.length || unreasoned.length || allowlistMalformed ? 1 : 0,
    hoverRules: hoverRuleCount,
    sheets: files.length,
    unguarded: violations.length,
    fresh: fresh.length,
    allowlisted: allowKeys.size,
    stale: stale.length,
    sample: fresh.slice(0, 3).map((v) => `${v.file}:${v.line} ${v.selector.slice(0, 70)} @ ${v.media}`),
  }));
}

/* ── report ────────────────────────────────────────────────────────── */
if (allowlistMalformed) {
  console.error(`✗ hover-guard-allowlist.json missing/malformed at ${relative(ROOT, ALLOWLIST_PATH)}`);
  process.exit(1);
}
if (unreasoned.length) {
  console.error('✗ allowlist entries without a real reason (≥12 chars):');
  for (const e of unreasoned) console.error(`  ${e.key}`);
  process.exit(1);
}
if (stale.length) {
  console.error('✗ STALE allowlist entries (rule no longer an unguarded :hover — fix or remove):');
  for (const e of stale) console.error(`  ${e.key}`);
  process.exit(1);
}

if (fresh.length) {
  console.error(`✗ hover-guard lint — ${fresh.length} unguarded :hover rule(s):`);
  console.error('  (:hover sticks after a tap on touch — every hover rule must live inside @media (hover: hover))');
  for (const v of fresh) {
    console.error(`  ${v.file}:${v.line}  ${v.selector.slice(0, 90)}  ${v.media}`);
  }
  if (process.argv.includes('--ratchet')) {
    const cap = ratchetCap();
    if (cap != null && fresh.length <= cap) {
      console.error(`\nRATCHET: ${fresh.length} fresh ≤ the accepted ${cap} in scripts/r320/gate-baseline.json (the Cycle-2-6 guard sweep) — NOT blocking.`);
      process.exit(0);
    }
    if (cap != null) console.error(`\nRATCHET REGRESSION: ${fresh.length} fresh > the accepted ${cap} in scripts/r320/gate-baseline.json.`);
  }
  console.error('\nFix: wrap the rule in `@media (hover: hover) and (pointer: fine) { … }`');
  console.error('(the R319 B1 convention) or add a documented exception to scripts/r320/hover-guard-allowlist.json.');
  process.exit(1);
}

console.log(
  `✓ hover-guard lint PASS — ${hoverRuleCount} :hover rules across ${files.length} sheets;` +
    ` ${violations.length} unguarded rule(s), all allowlisted with reasons; 0 fresh.`,
);
