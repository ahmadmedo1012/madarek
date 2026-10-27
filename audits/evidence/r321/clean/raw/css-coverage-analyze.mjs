#!/usr/bin/env node
/**
 * css-coverage-analyze.mjs — WP-C0 §C-6 leg: diff the V8 CSS-coverage
 * used ranges (css-coverage-raw.json, collected by the harness over 28
 * route-visits × 3 roles × both themes × 1440/390) against the FULL
 * rule inventory parsed from the worktree dist CSS with postcss.
 *
 * Unit of truth: the RULE (V8 coverage reports used ranges per rule
 * text — comma segments inside one rule cannot be split). A rule is
 * USED when its [start,end] range intersects any used range of its
 * stylesheet on ANY visited route.
 *
 * Classification (a deletion NEVER happens on this output — cycle 6
 * verifies each candidate rule against the app's dynamic states):
 *   unused-static      never applied; all selector segments are
 *                      state-free (no :hover/:focus/…, no [aria-]/[data-]
 *                      state attrs, no @media state) → candidate.
 *   unused-stateful    never applied, but carries :hover/:focus/…
 *                      segments (state can't fire on a passive visit)
 *                      → N/A for coverage-based proof.
 *   unused-attr-state  never applied; selectors key on [aria-]/[data-]
 *                      toggles → hand-verify tier.
 *   print/media-only   inside @media print → N/A.
 *   not-loaded        the stylesheet never loaded on the visited
 *                      routes (its owning route wasn't visited) → N/A.
 * keyframes/font-face/@property/@layer statements are not rules and
 * are skipped by the walker.
 *
 * Output: audits/evidence/r321/clean/raw/css-usage-diff.json (machine)
 * + a human summary on stdout.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WT = path.resolve(HERE, '..', '..', '..', '..', '..'); // /home/z/wt/c0
const DIST = path.join(WT, 'frontend', 'dist', 'assets');
const RAW = JSON.parse(readFileSync(path.join(HERE, 'css-coverage-raw.json'), 'utf8'));

const STATEFUL = /:(hover|focus|focus-visible|focus-within|active|visited|target|checked|disabled|enabled|placeholder-shown|read-only|required|optional|valid|invalid|user-invalid|autofill|playing|paused|empty|first-child|last-child|nth-|not|is|where|has|dir|lang)\b/;
const ATTR_STATE = /\[(aria-|data-|hidden|open|disabled|checked|selected|readonly|required|multiple|controls|autoplay|loop|muted)\b/;

const distCss = readdirSync(DIST).filter((f) => f.endsWith('.css'));
const covered = new Map(Object.entries(RAW.sheets));

function lineOffsets(text) {
  const offs = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') offs.push(i + 1);
  return offs;
}
const cache = new Map();
function sheet(name) {
  if (cache.has(name)) return cache.get(name);
  const text = readFileSync(path.join(DIST, name), 'utf8');
  const offs = lineOffsets(text);
  const parsed = postcss.parse(text, { from: name });
  cache.set(name, { text, offs, parsed });
  return cache.get(name);
}
function offsetOf(name, pos) {
  const { offs } = sheet(name);
  return offs[pos.line - 1] + pos.column - 1;
}

const rules = [];
function walk(node, name, mediaChain, layerChain) {
  if (node.type === 'atrule') {
    if (node.name === 'media' || node.name === 'supports') {
      node.nodes?.forEach((c) => walk(c, name, [...mediaChain, node.params], layerChain));
    } else if (node.name === 'layer') {
      node.nodes?.forEach((c) => walk(c, name, mediaChain, [...layerChain, node.params]));
    } else if (node.name === 'keyframes' || node.name === 'font-face' || node.name === 'property') {
      /* not a rule */
    }
    return;
  }
  if (node.type !== 'rule') return;
  const start = offsetOf(name, node.source.start);
  const end = offsetOf(name, node.source.end) + 1;
  rules.push({
    sheet: name,
    selector: node.selector.replace(/\s+/g, ' ').trim(),
    start,
    end,
    size: end - start,
    line: node.source.start.line,
    media: mediaChain.join(' && ') || '(root)',
    layers: layerChain.join('.') || null,
  });
}

for (const name of distCss) {
  const { parsed } = sheet(name);
  parsed.nodes?.forEach((n) => walk(n, name, [], []));
}

function usedOn(name, start, end) {
  const s = covered.get(name);
  if (!s) return false;
  return s.ranges.some(([a, b]) => a < end && start < b);
}

const out = {
  unusedStatic: [],
  unusedStateful: [],
  unusedAttrState: [],
  printOnly: [],
  notLoadedSheets: [],
  loadedSheets: [],
  ruleCount: rules.length,
};

out.notLoadedSheets = distCss.filter((f) => !covered.has(f));
out.loadedSheets = [...covered.keys()];

for (const r of rules) {
  const isPrint = r.media.includes('print');
  const used = usedOn(r.sheet, r.start, r.end);
  const entry = { ...r };
  delete entry.start; delete entry.end;
  if (isPrint) { out.printOnly.push(entry); continue; }
  if (used) continue;
  const segs = entry.selector.split(',').map((s) => s.trim()).filter(Boolean);
  if (segs.some((s) => STATEFUL.test(s))) out.unusedStateful.push(entry);
  else if (segs.some((s) => ATTR_STATE.test(s))) out.unusedAttrState.push(entry);
  else out.unusedStatic.push(entry);
}

writeFileSync(path.join(HERE, 'css-usage-diff.json'), `${JSON.stringify(out, null, 1)}\n`);

const pct = (arr) => ((arr.length / rules.length) * 100).toFixed(1);
console.log(`rules parsed: ${rules.length} across ${distCss.length} dist sheets`);
console.log(`  used on ≥1 visited route     : ${rules.length - out.unusedStatic.length - out.unusedStateful.length - out.unusedAttrState.length - out.printOnly.length}`);
console.log(`  unused-static candidates     : ${out.unusedStatic.length} (${pct(out.unusedStatic)}%)`);
console.log(`  unused-stateful (N/A)        : ${out.unusedStateful.length}`);
console.log(`  unused-attr-state (hand)     : ${out.unusedAttrState.length}`);
console.log(`  print-only (N/A)             : ${out.printOnly.length}`);
console.log(`  sheets never loaded (N/A)    : ${out.notLoadedSheets.length} → ${out.notLoadedSheets.join(', ')}`);
const bySheet = new Map();
for (const r of out.unusedStatic) bySheet.set(r.sheet, (bySheet.get(r.sheet) ?? 0) + r.size);
console.log('  unused-static bytes by sheet :');
for (const [s, b] of [...bySheet.entries()].sort((x, y) => y[1] - x[1])) console.log(`    ${String(b).padStart(7)}  ${s}`);
