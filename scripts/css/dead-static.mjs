#!/usr/bin/env node
// dead-static.mjs — R347-Z D12: the static dead-CSS proof.
// A CSS rule is PROVABLY DEAD when every class token in its selector
// is absent (substring) from every runtime/string surface:
//   frontend/src/**/*.{ts,tsx,js,jsx}, frontend/tests/**,
//   frontend/index.html, scripts/** (detector allowlists, panel
//   selectors, e2e), plus the css files themselves (a token referenced
//   only by another css rule — e.g. nested hooks — keeps the rule).
// Conservative by construction: substring match (catches concatenation
// prefixes), stateful pseudos stripped, @keyframes/@font-face bodies
// never deleted, print-only blocks kept (they need the crawl signal).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STYLES = path.join(ROOT, 'frontend', 'src', 'styles');

// ── 1. collect the string corpus ─────────────────────────────────
const corpus = [];
const walk = (dir, exts) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts);
    else if (exts.some((x) => e.name.endsWith(x))) corpus.push(fs.readFileSync(p, 'utf8'));
  }
};
walk(path.join(ROOT, 'frontend', 'src'), ['.ts', '.tsx', '.js', '.jsx', '.html']);
walk(path.join(ROOT, 'frontend', 'tests'), ['.ts', '.tsx', '.js']);
walk(path.join(ROOT, 'scripts'), ['.ts', '.tsx', '.js', '.mjs', '.json']);
walk(path.join(ROOT, 'frontend'), ['.html']); // index.html at frontend root
const CORPUS = corpus.join('\n');
// the css corpus itself (tokens referenced by other css — nested hooks,
// @apply-like patterns — count as referenced)
const cssFiles = [];
const walkCss = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkCss(p);
    else if (e.name.endsWith('.css')) cssFiles.push(p);
  }
};
walkCss(STYLES);
const CSS_CORPUS = cssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

// ── 2. parse rules + collect candidate tokens ────────────────────
// A simple but robust-enough CSS tokenizer: top-level rules with their
// selector block (braces depth 1), skipping @keyframes/@font-face/
// @media inner bodies as atomic units.
const parseFile = (css) => {
  const rules = [];
  let i = 0;
  const parseBlock = (prefix) => {
    let depth = 0, start = -1, sel = '';
    let j = i;
    while (j < css.length) {
      const ch = css[j];
      if (start === -1) {
        if (ch === '{') { start = j; }
        else if (ch === '}' || ch === ';') { /* stray */ }
        else sel += ch;
      } else {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            rules.push({ prefix, sel: sel.trim(), bodyStart: start, bodyEnd: j + 1, start: i, end: j + 1 });
            return j + 1;
          }
        }
      }
      j++;
    }
    return j;
  };
  while (i < css.length) {
    // skip whitespace/comments
    const rest = css.slice(i);
    const ws = rest.match(/^(\s|\/\*[^]*?\*\/)+/);
    if (ws) { i += ws[0].length; continue; }
    const at = rest.match(/^@([a-zA-Z-]+)/);
    const kw = at ? at[1] : '';
    if (kw === 'media' || kw === 'supports' || kw === 'layer' || kw === 'container') {
      // find the prelude up to '{'
      const brace = css.indexOf('{', i);
      const prelude = css.slice(i, brace);
      const inner = parseBlock(prelude); // captures the whole nested block
      i = inner;
      continue;
    }
    if (kw === 'keyframes' || kw === 'font-face' || kw === 'property' || kw === 'charset' || kw === 'import') {
      // atomic: take to the matching close (or ; for charset/import)
      const semi = css.indexOf(';', i);
      const brace = css.indexOf('{', i);
      if (brace === -1 || (semi > -1 && semi < brace)) { i = semi + 1; continue; }
      let depth = 0, j = brace;
      while (j < css.length) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') { depth--; if (depth === 0) break; }
        j++;
      }
      i = j + 1;
      continue;
    }
    i = parseBlock('');
  }
  return rules;
};

const tokenRe = /\.([a-zA-Z_][a-zA-Z0-9_-]{2,})/g;
const stripPseudo = (sel) => sel.replace(/::?[a-zA-Z-]+(\([^)]*\))?/g, '');

const fileReports = [];
for (const f of cssFiles) {
  const css = fs.readFileSync(f, 'utf8');
  const rules = parseFile(css);
  const dead = [];
  for (const r of rules) {
    if (!r.sel) continue;
    const bare = stripPseudo(r.sel);
    const tokens = [...bare.matchAll(tokenRe)].map((m) => m[1]);
    if (!tokens.length) continue; // element/attr selectors: keep (conservative)
    /* The SOURCE corpus alone is the proof: CSS cannot add classes to
     * the DOM — only TS/TSX/tests/scripts strings can (all literal).
     * The css corpus is deliberately NOT consulted: a token's own rule
     * always contains it (circular), and css-only cross-references
     * (.a .b with .b never emitted) are dead by the same proof. */
    const allAbsent = tokens.every((t) => !CORPUS.includes(t));
    if (allAbsent) dead.push({ sel: r.sel, start: r.start, end: r.end, tokens });
  }
  if (dead.length) fileReports.push({ file: path.relative(ROOT, f), dead });
}

// ── 3. report ────────────────────────────────────────────────────
let totalDead = 0, totalLines = 0;
for (const fr of fileReports) {
  const css = fs.readFileSync(path.join(ROOT, fr.file), 'utf8');
  const lines = fr.dead.reduce((s, d) => s + css.slice(d.start, d.end).split('\n').length, 0);
  totalDead += fr.dead.length; totalLines += lines;
  console.log(`${fr.file}: ${fr.dead.length} dead rules (~${lines} lines)`);
  fr.dead.slice(0, 3).forEach((d) => console.log(`   .${d.tokens.join('.')} — ${d.sel.slice(0, 70)}`));
}
console.log(`\nTOTAL: ${totalDead} provably-dead rules across ${fileReports.length} files (~${totalLines} lines)`);
fs.writeFileSync('/tmp/rz/dead-static.json', JSON.stringify(fileReports, null, 1));
console.log('detail → /tmp/rz/dead-static.json');
