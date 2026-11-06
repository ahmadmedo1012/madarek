#!/usr/bin/env node
/**
 * css-counts.mjs — R339 T-30 · the CSS ratchet counter.
 *
 * Counts the four demolition axes the T-31+ rounds must drive DOWN,
 * comment-stripped so prose mentions ("the .btn !important pins
 * retired") never mask or fake a real finding:
 *
 *   importantDeclarations — live `!important` on real declarations.
 *     (The R339 brief's "109" is the raw grep number; 57 of those
 *     sit inside comments. The gate ratchets the LIVE count —
 *     that is what computed styles actually see. T-34 target: 0.)
 *   rawZIndex   — `z-index: <integer>` literals outside the token
 *     sources (tokens.css / tokens.generated.css define the rungs).
 *   rawHex      — hex color literals outside the sanctioned raw-
 *     value homes (the same five-file wholesale list as
 *     check-colors.sh: tokens pair, fonts, the parity pair).
 *
 * Sanctioned lists are BASENAMES resolved against frontend/src/styles/
 * so the T-30/T-31 folder moves (tokens/ etc.) keep the gate stable.
 *
 * Usage: node scripts/gates/css-counts.mjs   → single JSON line.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'src', 'styles');
const SANCTIONED_HEX = new Set([
  'tokens.css',
  'tokens.generated.css',
  'fonts.css',
  'unified-parity.css',
  'shared-design-system.css',
]);
const SANCTIONED_Z = new Set(['tokens.css', 'tokens.generated.css']);

/** CSS has no line comments — strip /* *‍/ blocks only (strings keep urls). */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (e.endsWith('.css')) files.push(p);
  }
})(ROOT);

let importantDeclarations = 0;
let rawZIndex = 0;
let rawHex = 0;
for (const f of files) {
  const src = strip(readFileSync(f, 'utf8'));
  // BASENAME match — the sanctioned raw-value homes keep their sanction
  // wherever the folder moves seat them (tokens/ etc., T-30/T-31).
  const rel = basename(relative(ROOT, f));
  importantDeclarations += (src.match(/!important\b/g) || []).length;
  if (!SANCTIONED_Z.has(rel)) rawZIndex += (src.match(/z-index\s*:\s*-?\d+/g) || []).length;
  if (!SANCTIONED_HEX.has(rel)) rawHex += (src.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
}

console.log(JSON.stringify({ files: files.length, importantDeclarations, rawZIndex, rawHex }));
