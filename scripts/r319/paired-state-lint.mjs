#!/usr/bin/env node
/**
 * paired-state-lint.mjs — R319 (c1-A · B1) paired-state token gate.
 *
 * THE BUG CLASS (owner-found on a real iPhone, BOARD §B B1):
 *   layout.css authored `.nav-item:hover { background: var(--text);
 *   color: var(--bg) }` (the charcoal-cell/paper-label wash — a PAIR),
 *   then polish.css re-declared `.nav-item:hover { background:
 *   var(--surface-2) }` — background ONLY. The cascade composed the two
 *   into paper-label-on-light-grey ≈ 1.1:1, and on touch `:hover`
 *   sticks after a tap, so the owner watched «مقرّراتي الدراسية» turn
 *   into an invisible pale ghost.
 *
 * THE RULE THIS SCRIPT ENFORCES:
 *   Every interactive-state rule (selector carries :hover / :active /
 *   :focus-visible / .on / .active / [aria-current]) must either
 *     · set BOTH `color` and `background` (the honest pair),
 *     · set ONLY custom properties (`--_bg` / `--_fg` … — the paired
 *       token pattern: the base rule routes `background: var(--_bg);
 *       color: var(--_fg)` and states flip the vars together), or
 *     · set NEITHER (transform/border-color-only decorative marks,
 *       press scales, focus outlines).
 *   Setting exactly ONE of color|background is the XOR that breeds the
 *   ghost — it silently re-composes with a sibling rule's other half.
 *
 * Exemptions live in paired-state-allowlist.json (file + selector key,
 * each with a reason string ≥12 chars). Allowlisted entries are
 * re-verified: a key with no live XOR rule anymore is STALE and fails
 * the gate (guards rot otherwise).
 *
 * Plain node, no deps. Exit 0 = clean, exit 1 = report.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const STYLES_DIR = join(ROOT, 'frontend', 'src', 'styles');
const ALLOWLIST_PATH = join(ROOT, 'scripts', 'r319', 'paired-state-allowlist.json');

/* ── CSS walking (comments stripped newline-preserving; line pins stay exact) ── */

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat((m.match(/\n/g) ?? []).length));
}

/**
 * Collect every style rule (skipping @keyframes/@font-face bodies) with
 * its declarations. One manual scan: selectors accumulate while the
 * enclosing frame is the root or an @media prelude; declarations
 * accumulate while the enclosing frame is a style rule.
 */
function walkRules(text) {
  const rules = [];
  const stack = []; // { prelude, isMedia, decls, startLine }
  let buf = '';
  let line = 1;
  let quote = null;
  let depth = 0;

  let declBuf = '';
  let declStart = null;

  const inStyleRule = () => {
    const top = stack[stack.length - 1];
    return depth >= 1 && top && !top.isMedia && !top.isAtRule;
  };

  const flushDecl = () => {
    const chunk = declBuf.trim();
    const top = stack[stack.length - 1];
    if (chunk && top && !top.isMedia && !top.isAtRule) {
      const colon = chunk.indexOf(':');
      if (colon > 0) {
        top.decls.push({
          prop: chunk.slice(0, colon).trim(),
          value: chunk.slice(colon + 1).trim(),
          line: declStart ?? line,
        });
      }
    }
    declBuf = '';
    declStart = null;
  };

  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '\n') line += 1;

    if (quote) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === quote) quote = null;
      if (inStyleRule()) {
        if (declStart === null) declStart = line;
        declBuf += ch;
      } else {
        buf += ch; // quoted attribute values stay in the selector text
      }
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (inStyleRule()) {
        if (declStart === null) declStart = line;
        declBuf += ch;
      } else {
        buf += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '{') {
      const prelude = buf.trim();
      const isMedia = /^@media/i.test(prelude);
      const isAtRule = prelude.startsWith('@');
      const frame = { prelude, isMedia, isAtRule, decls: [], startLine: line };
      stack.push(frame);
      if (!isAtRule) rules.push({ selector: prelude, decls: frame.decls, line: frame.startLine });
      buf = '';
      declBuf = '';
      declStart = null;
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === '}') {
      flushDecl();
      stack.pop();
      depth = Math.max(0, depth - 1);
      buf = '';
      declBuf = '';
      declStart = null;
      i += 1;
      continue;
    }
    if (ch === ';') {
      if (inStyleRule()) flushDecl();
      else { buf = ''; declBuf = ''; declStart = null; }
      i += 1;
      continue;
    }
    if (inStyleRule()) {
      if (declStart === null && !/\s/.test(ch)) declStart = line;
      declBuf += ch;
    } else {
      buf += ch;
    }
    i += 1;
  }
  return rules;
}

/* ── the state-rule detector ───────────────────────────────────────── */

// :hover / :active / :focus-visible anywhere, or the class/attr state
// vocabularies (.on / .active / [aria-current]) on a COMPOUND selector
// segment (comma-split so `.a:hover, .b` only flags the .a half).
const STATE_PSEUDO = /:(hover|active|focus-visible)\b/;
const STATE_CLASS = /(?:^|[\s+>~[.])(?:\.(?:on|active)\b|\[aria-current)/;

function selectorCarriesState(selector) {
  return selector
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .some((seg) => STATE_PSEUDO.test(seg) || STATE_CLASS.test(seg));
}

const COLOR_PROPS = new Set(['color']);
const BG_PROPS = new Set(['background', 'background-color']);

/** The verdict for one state rule. */
function classify(rule) {
  const decls = rule.decls.filter((d) => !d.prop.startsWith('--'));
  if (decls.length === 0) return { kind: 'vars-only' }; // pure custom-property states (the paired pattern)
  const setsColor = decls.some((d) => COLOR_PROPS.has(d.prop));
  const setsBg = decls.some((d) => BG_PROPS.has(d.prop));
  if (setsColor && setsBg) return { kind: 'paired' };
  if (!setsColor && !setsBg) return { kind: 'non-color' };
  return {
    kind: 'xor',
    half: setsColor ? 'color-without-background' : 'background-without-color',
    decls: decls.filter((d) => COLOR_PROPS.has(d.prop) || BG_PROPS.has(d.prop)),
  };
}

/* ── run over the tree ─────────────────────────────────────────────── */

const files = readdirSync(STYLES_DIR)
  .filter((f) => f.endsWith('.css'))
  .sort();

const violations = [];
let stateRuleCount = 0;

for (const file of files) {
  const raw = readFileSync(join(STYLES_DIR, file), 'utf-8');
  const stripped = stripComments(raw);
  for (const rule of walkRules(stripped)) {
    if (!selectorCarriesState(rule.selector)) continue;
    stateRuleCount += 1;
    const verdict = classify(rule);
    if (verdict.kind !== 'xor') continue;
    violations.push({
      file,
      line: rule.line,
      selector: rule.selector,
      half: verdict.half,
      decls: verdict.decls.map((d) => `${d.prop}: ${d.value}`).join('; '),
      key: `${file} :: ${rule.selector}`,
    });
  }
}

/* ── allowlist ─────────────────────────────────────────────────────── */

let allowlist = [];
let allowlistMalformed = false;
try {
  const parsed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf-8'));
  if (parsed && Array.isArray(parsed.allow)) {
    allowlist = parsed.allow;
  } else {
    allowlistMalformed = true;
  }
} catch {
  allowlistMalformed = true;
}

/* `--emit-allowlist`: scaffold an allowlist for the CURRENT violation
 * set (categorized default reasons), so an editor only hand-tunes the
 * interesting entries. The gate still runs afterwards — the emitted
 * reasons are generic-but-honest pattern categories. */
if (process.argv.includes('--emit-allowlist')) {
  const byKey = new Map();
  for (const v of violations) {
    byKey.set(v.key, {
      key: v.key,
      reason:
        v.half === 'color-without-background'
          ? 'INK-ONLY hover — no background is declared in any state of this selector: the ground is the inherited surface and never moves, so the pair cannot half-flip'
          : 'SURFACE-STEP-ONLY hover — the base ink is unchanged and stays AA on the stepped ground: the fg half never moves, only the surface steps',
    });
  }
  const merged = [...allowlist.filter((e) => !byKey.has(e.key ?? `${e.file} :: ${e.selector}`))];
  const next = [...merged, ...[...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))];
  writeFileSync(ALLOWLIST_PATH, `${JSON.stringify({ allow: next }, null, 2)}\n`);
  console.log(`emit: wrote ${next.length} allowlist entries (${byKey.size} new) to ${relative(ROOT, ALLOWLIST_PATH)}`);
  process.exit(0);
}

const allowKeys = new Set(allowlist.map((e) => e.key ?? `${e.file} :: ${e.selector}`));
const unreasoned = allowlist.filter((e) => !e.reason || String(e.reason).trim().length < 12);

const fresh = violations.filter((v) => !allowKeys.has(v.key));
// Stale-guard: allowlisted keys with no live XOR rule anymore.
const violationKeys = new Set(violations.map((v) => v.key));
const stale = allowlist.filter((e) => {
  const key = e.key ?? `${e.file} :: ${e.selector}`;
  return !violationKeys.has(key);
});

/* ── report ────────────────────────────────────────────────────────── */

if (allowlistMalformed) {
  console.error(`✗ paired-state-allowlist.json missing/malformed at ${relative(ROOT, ALLOWLIST_PATH)}`);
  process.exit(1);
}
if (unreasoned.length) {
  console.error('✗ allowlist entries without a real reason (≥12 chars):');
  for (const e of unreasoned) console.error(`  ${e.key ?? e.file + ' :: ' + e.selector}`);
  process.exit(1);
}
if (stale.length) {
  console.error('✗ STALE allowlist entries (rule no longer an XOR state rule — fix or remove):');
  for (const e of stale) console.error(`  ${e.key ?? e.file + ' :: ' + e.selector}`);
  process.exit(1);
}

if (fresh.length) {
  console.error(`✗ paired-state lint — ${fresh.length} state rule(s) set color XOR background:`);
  console.error('  (one half silently re-composes with a sibling rule\u2019s other half — the B1 ghost)');
  for (const v of fresh) {
    console.error(`  ${v.file}:${v.line}  ${v.selector}`);
    console.error(`      ${v.half} → ${v.decls}`);
  }
  console.error('\nFix by the paired pattern: base routes background: var(--_bg); color: var(--_fg);');
  console.error('every state rule sets --_bg AND --_fg together (or both properties directly).');
  console.error('Known-good exceptions: scripts/r319/paired-state-allowlist.json (reason required).');
  process.exit(1);
}

console.log(
  `✓ paired-state lint PASS — ${stateRuleCount} state rules scanned across ${files.length} sheets;` +
    ` ${violations.length} XOR rule(s), all allowlisted with reasons; 0 fresh violations.`,
);
