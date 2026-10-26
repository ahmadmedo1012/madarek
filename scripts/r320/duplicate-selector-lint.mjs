#!/usr/bin/env node
/**
 * duplicate-selector-lint.mjs — R320 (c1-GATE) Rule 2 — the
 * duplicate-selector gate.
 *
 * THE BUG CLASS (R319 B1, owner-found on a real iPhone): the same
 * selector — `.nav-item:hover` — was defined in TWO CSS files
 * (layout.css authored the charcoal-cell/paper-label PAIR, polish.css
 * re-declared background ONLY). The cascade silently COMPOSED the two
 * rules across files: paper label on light-grey cell ≈ 1.1:1, and on
 * touch `:hover` sticks after a tap → «مقرّراتي الدراسية» turned into
 * an invisible pale ghost. The paired-state lint (r319) catches the
 * one-half-only SHAPE inside one rule; this lint catches the other
 * half of the class — the same selector reaching across FILES with
 * conflicting values for the SAME property, where no single rule
 * looks wrong.
 *
 * THE RULE THIS SCRIPT ENFORCES:
 *   The same selector segment (comma-split, normalized), in the SAME
 *   media context (equivalent @media chain — `(hover: hover)` and
 *   `(hover:hover)` are the same context), defined in TWO DIFFERENT
 *   files:
 *     · with DIFFERENT values for the SAME property → FAIL (the B1
 *       shape: which file wins is import-order luck);
 *     · with identical values everywhere → WARN only (harmless
 *       duplication — dead weight, not a defect).
 *   Same-file re-definitions are NOT this lint's concern (internal
 *   cascade layering is normal specificity practice). @layer chains
 *   are recorded and shown, but deliberately NOT part of the key —
 *   an intentional cross-layer override is an ALLOWLIST reason
 *   (duplicate-selector-allowlist.json), not an auto-pass.
 *
 * Exemptions live in scripts/r320/duplicate-selector-allowlist.json
 * (same conventions as paired-state-allowlist.json: key + reason
 * ≥ 12 chars; stale keys — pair no longer duplicated — FAIL the gate
 * so the allowlist cannot rot). It carries TWO sections: `allow`
 * (per conflict-pair written reasons) and `unloadedFiles` (stylesheets
 * not in the app's import graph — the parity EXPORT artifacts that
 * deliberately mirror app sheets for external hosts but never load in
 * the app, so they cannot compose into the B1 bug class; the lint
 * verifies the claim itself against a scan of every .ts/.tsx import
 * statement, and an entry going stale — the file starts being imported
 * — FAILS). `--emit-allowlist` scaffolds the current conflict set with
 * categorized default reasons.
 *
 * Modes: bare (strict — exit 1 on ANY fresh conflict; the composed
 * gate + standalone runs) · `--ratchet` (exit 1 only when the fresh
 * count EXCEEDS the accepted number in scripts/r320/gate-baseline.json
 * — the pre-push shape: the 65 known-open conflicts are Cycle-2-6
 * tickets, a NEW one blocks the push) · `--json` (machine summary on
 * stdout for the composed gate's ratchet rows).
 *
 * Plain node, zero deps. Exit 0 = clean, exit 1 = report.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cssFiles, importedCssBasenames, normMedia, normValue, walkFile } from './css-walk.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const SRC_DIR = join(ROOT, 'frontend', 'src');
const ALLOWLIST_PATH = join(ROOT, 'scripts', 'r320', 'duplicate-selector-allowlist.json');

/* ── index every rule by (selector segment × media context) ───────── */
const files = cssFiles(SRC_DIR);
const imported = importedCssBasenames(SRC_DIR);
const isLoaded = (file) => imported.has(file.split('/').pop());
/** key → Map(file → [{ rule, declMap }]) */
const index = new Map();
let ruleCount = 0;
let nestedCount = 0;

for (const abs of files) {
  const file = relative(SRC_DIR, abs).replaceAll('\\', '/');
  const { rules, nested } = walkFile(abs);
  nestedCount += nested;
  for (const rule of rules) {
    ruleCount += 1;
    /* The context key: the equivalent @media chain PLUS the @supports
     * chain (both are conditions that scope when the rule applies —
     * a rule inside @supports(...) is not the same context as a bare
     * one). @layer is deliberately NOT in the key: an intentional
     * cross-layer override is an allowlist reason, not an auto-pass. */
    const context = [...rule.mediaChain, ...rule.supportsChain].map(normMedia).join(' && ');
    for (const seg of rule.segs) {
      const key = `${seg} @ ${context || '(root)'}`;
      if (!index.has(key)) index.set(key, new Map());
      const byFile = index.get(key);
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file).push(rule);
    }
  }
}

/* ── compare across files ──────────────────────────────────────────── */
const conflicts = [];
const harmless = [];

for (const [key, byFile] of index) {
  if (byFile.size < 2) continue; // same-file duplicates are not this rule
  const [keySeg, keyMedia = '(root)'] = key.split(' @ ');
  const names = [...byFile.keys()];
  for (let a = 0; a < names.length; a += 1) {
    for (let b = a + 1; b < names.length; b += 1) {
      const fileA = names[a];
      const fileB = names[b];
      for (const ruleA of byFile.get(fileA)) {
        for (const ruleB of byFile.get(fileB)) {
          const declA = new Map(ruleA.decls.map((d) => [d.prop, d.value]));
          const declB = new Map(ruleB.decls.map((d) => [d.prop, d.value]));
          const diffProps = [];
          const sameProps = [];
          for (const [prop, valueA] of declA) {
            if (!declB.has(prop)) continue;
            const valueB = declB.get(prop);
            if (normValue(valueA) === normValue(valueB)) sameProps.push(prop);
            else diffProps.push({ prop, a: valueA, b: valueB });
          }
          const layersA = ruleA.layerChain.length ? `@${ruleA.layerChain.join('@')}` : '(none)';
          const layersB = ruleB.layerChain.length ? `@${ruleB.layerChain.join('@')}` : '(none)';
          const entry = {
            key: `${fileA} ↔ ${fileB} :: ${key}`,
            fileA,
            lineA: ruleA.line,
            fileB,
            lineB: ruleB.line,
            selector: keySeg,
            media: keyMedia,
            layers: layersA !== '(none)' || layersB !== '(none)' ? `${layersA} vs ${layersB}` : null,
            diffProps,
            sharedCount: sameProps.length,
          };
          if (diffProps.length) conflicts.push(entry);
          else if (sameProps.length) harmless.push(entry);
        }
      }
    }
  }
}

conflicts.sort((x, y) => x.key.localeCompare(y.key));
harmless.sort((x, y) => x.key.localeCompare(y.key));

/* ── the app's import graph: a conflict pair can only compose into
 * the B1 bug class when BOTH sheets actually LOAD. Stylesheets that
 * are not imported anywhere (the parity EXPORT artifacts) mirror app
 * sheets by design for external hosts — conflicts against them are
 * informational, exempt ONLY when the file is declared in the
 * allowlist's unloadedFiles section with a written reason. ─────── */
const unloadedDeclared = new Set();
let allowlist = [];
let allowlistMalformed = false;
try {
  const parsed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  if (parsed && Array.isArray(parsed.allow)) {
    allowlist = parsed.allow;
    if (parsed.unloadedFiles != null) {
      if (!Array.isArray(parsed.unloadedFiles)) allowlistMalformed = true;
      else for (const e of parsed.unloadedFiles) {
        if (!e.file || !e.reason || String(e.reason).trim().length < 12) allowlistMalformed = true;
        else unloadedDeclared.add(e.file);
      }
    }
  } else allowlistMalformed = true;
} catch {
  allowlistMalformed = true;
}

/* stale-guard the unloadedFiles declarations themselves: a declared
 * file that IS imported now (or no longer exists) fails — the
 * exemption must never silently outlive its premise. */
const walkedFiles = new Set(files.map((abs) => relative(SRC_DIR, abs).replaceAll('\\', '/')));
const staleUnloaded = [...unloadedDeclared].filter(
  (f) => !walkedFiles.has(f) || isLoaded(f),
);
const undeclaredUnloaded = files
  .map((abs) => relative(SRC_DIR, abs).replaceAll('\\', '/'))
  .filter((f) => !isLoaded(f) && !unloadedDeclared.has(f));

const exemptByArtifact = (c) =>
  (!isLoaded(c.fileA) && unloadedDeclared.has(c.fileA)) ||
  (!isLoaded(c.fileB) && unloadedDeclared.has(c.fileB));
const artifactConflicts = conflicts.filter(exemptByArtifact);
const realConflicts = conflicts.filter((c) => !exemptByArtifact(c));
const harmlessArtifact = harmless.filter(exemptByArtifact);
const harmlessReal = harmless.filter((c) => !exemptByArtifact(c));

if (process.argv.includes('--emit-allowlist')) {
  const byKey = new Map();
  for (const c of realConflicts) {
    byKey.set(c.key, {
      key: c.key,
      reason: 'INTENTIONAL CASCADE OVERRIDE — documented exception: the later sheet deliberately re-seats this value (verify the pair still composes safely, then keep this reason specific)',
    });
  }
  const merged = [...allowlist.filter((e) => !byKey.has(e.key))];
  const next = [...merged, ...[...byKey.values()].sort((x, y) => x.key.localeCompare(y.key))];
  writeFileSync(
    ALLOWLIST_PATH,
    `${JSON.stringify({ unloadedFiles: [...unloadedDeclared].sort().map((file) => ({ file, reason: (JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')).unloadedFiles || []).find((e) => e.file === file)?.reason || '' })) , allow: next }, null, 2)}\n`,
  );
  console.log(`emit: wrote ${next.length} allow entries to ${relative(ROOT, ALLOWLIST_PATH)} (${realConflicts.length} app×app conflicts scaffolded; ${artifactConflicts.length} artifact-pair conflicts exempt via unloadedFiles)`);
  process.exit(0);
}

const allowKeys = new Set(allowlist.map((e) => e.key));
const unreasoned = allowlist.filter((e) => !e.reason || String(e.reason).trim().length < 12);
const conflictKeys = new Set(realConflicts.map((c) => c.key));
const stale = allowlist.filter((e) => !conflictKeys.has(e.key));

const fresh = realConflicts.filter((c) => !allowKeys.has(c.key));

/** The accepted fresh count from the composed gate's ratchet baseline
 * (`|—|—|duplicate-selector`), or null when no baseline exists (→
 * strict). NEVER a second source of truth: the gate writes the
 * baseline, this only reads it. */
function ratchetCap() {
  try {
    const rows = JSON.parse(readFileSync(join(ROOT, 'scripts/r320/gate-baseline.json'), 'utf8')).rows ?? {};
    const row = rows['|—|—|duplicate-selector'];
    return row && typeof row.metric === 'number' ? row.metric : null;
  } catch {
    return null;
  }
}

/* ── machine summary for the composed gate (--json) ──────────────── */
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    lint: 'duplicate-selector',
    exit: fresh.length || stale.length || unreasoned.length || staleUnloaded.length || allowlistMalformed ? 1 : 0,
    rules: ruleCount,
    sheets: files.length,
    conflictsApp: realConflicts.length,
    conflictsArtifact: artifactConflicts.length,
    harmless: harmlessReal.length + harmlessArtifact.length,
    fresh: fresh.length,
    allowlisted: allowKeys.size,
    unloadedDeclared: [...unloadedDeclared].sort(),
    undeclaredUnloaded,
    stale: stale.length + staleUnloaded.length,
    sample: fresh.slice(0, 3).map((c) => `${c.fileA}:${c.lineA} ↔ ${c.fileB}:${c.lineB} ${c.selector} [${c.diffProps.map((d) => d.prop).join(',')}]`),
  }));
}

/* ── report ────────────────────────────────────────────────────── */
if (allowlistMalformed) {
  console.error(`✗ duplicate-selector-allowlist.json missing/malformed at ${relative(ROOT, ALLOWLIST_PATH)}`);
  process.exit(1);
}
if (unreasoned.length) {
  console.error('✗ allowlist entries without a real reason (≥12 chars):');
  for (const e of unreasoned) console.error(`  ${e.key}`);
  process.exit(1);
}
if (staleUnloaded.length) {
  console.error('✗ STALE unloadedFiles entries (file is imported by the app now, or gone — the exemption\'s premise is dead):');
  for (const f of staleUnloaded) console.error(`  ${f}`);
  process.exit(1);
}
if (stale.length) {
  console.error('✗ STALE allowlist entries (pair no longer a cross-file duplicate — fix or remove):');
  for (const e of stale) console.error(`  ${e.key}`);
  process.exit(1);
}

if (fresh.length) {
  console.error(`✗ duplicate-selector lint — ${fresh.length} cross-file selector conflict(s) between APP-LOADED sheets:`);
  console.error('  (same selector + media context, two files, different values for the same property — the B1 ghost class)');
  for (const c of fresh) {
    console.error(`  ${c.fileA}:${c.lineA} ↔ ${c.fileB}:${c.lineB}  ${c.selector}  ${c.media}`);
    for (const d of c.diffProps) {
      console.error(`      ${d.prop}: ${String(d.a).slice(0, 60)}  vs  ${String(d.b).slice(0, 60)}`);
    }
  }
  console.error(`\n(${artifactConflicts.length} further conflict(s) involve unloaded export artifacts — see unloadedFiles in the allowlist.)`);
  if (process.argv.includes('--ratchet')) {
    const cap = ratchetCap();
    if (cap != null && fresh.length <= cap) {
      console.error(`\nRATCHET: ${fresh.length} fresh ≤ the accepted ${cap} in scripts/r320/gate-baseline.json (known-open Cycle-2-6 tickets) — NOT blocking.`);
      process.exit(0);
    }
    if (cap != null) console.error(`\nRATCHET REGRESSION: ${fresh.length} fresh > the accepted ${cap} in scripts/r320/gate-baseline.json.`);
  }
  console.error('Fix by ONE definition per selector+context per sheet (or the paired-token pattern for states).');
  console.error('Known-good exceptions: scripts/r320/duplicate-selector-allowlist.json (reason required).');
  process.exit(1);
}

console.log(
  `✓ duplicate-selector lint PASS — ${ruleCount} rules across ${files.length} sheets;` +
    ` ${realConflicts.length} app×app conflict(s) all allowlisted with reasons;` +
    ` ${artifactConflicts.length} export-artifact pair(s) exempt (unloadedFiles);` +
    ` ${harmlessReal.length + harmlessArtifact.length} harmless identical-value duplication(s) (WARN-tier); 0 fresh conflicts.`,
);
if (!existsSync(ALLOWLIST_PATH)) {
  console.log(`  (no allowlist file yet — none needed: 0 conflicts)`);
}
