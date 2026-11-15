#!/usr/bin/env node
/**
 * copy-budget-mobile gate — R355 P3: the per-screen Arabic-copy ratchet
 * for the MOBILE app (apps/mobile).
 *
 * Same law as the web gate (scripts/gates/copy-budget.mjs), same lexer
 * heuristic (copied verbatim — a ~95% right approximation, see the web
 * gate's HEURISTIC block), applied to the Expo router tree:
 *
 *   ROOT = apps/mobile/app (every .tsx screen/sheet/layout) plus
 *   apps/mobile/src (shared RN components) — tests excluded.
 *
 *   - a screen on disk with NO ratchet entry  -> FAIL (born-under-the-law)
 *   - a ratchet entry with no file on disk    -> FAIL (stale entry)
 *   - a screen over its ceiling              -> FAIL (ratchet only moves DOWN)
 *
 * The first census (R355 P3) sets every ceiling at the CURRENT count —
 * the gate's first job is NO GROWTH; the mobile diet itself is a
 * follow-up wave with the same one-commit law (cut + lower together).
 *
 * Dependency-free; runs in CI (design-gates job) and verify.sh --fast.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..', '..');
const ROOTS = [join(REPO_ROOT, 'apps', 'mobile', 'app'), join(REPO_ROOT, 'apps', 'mobile', 'src')];
const RATCHET_PATH = join(REPO_ROOT, 'docs', 'QA', 'copy-budget-mobile.json');

const AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN = /[A-Za-z]/;

const VISIBLE_PROPS = new Set([
  'title', 'label', 'data-label', 'description', 'desc', 'placeholder',
  'message', 'subtitle', 'note', 'hint', 'eyebrow', 'brow', 'lede', 'lead',
  'leadLabel', 'kicker', 'summary', 'caption', 'alt', 'text', 'detail',
  'confirmLabel', 'cancelLabel', 'submitLabel', 'pendingLabel', 'okLabel',
  'change', 'component', 'actionHint', 'noRecipientsHint', 'emptyText',
  'empty', 'heading', 'tooltip', 'greeting', 'term', 'question', 'answer',
  'prefix', 'suffix', 'name', 'value', 'defaultValue', 'error', 'content',
  'initials', 'meta',
]);
const ARIA_PROPS = new Set(['aria-label', 'ariaLabel', 'aria-labelledby', 'aria-describedby', 'aria-placeholder']);
const STRIP_PROPS = new Set([
  'className', 'class', 'id', 'key', 'to', 'href', 'src', 'testid',
  'data-testid', 'width', 'height', 'size', 'variant', 'tone', 'type',
  'autoComplete', 'htmlFor', 'role', 'dir', 'lang', 'style', 'ref',
  'accept', 'max', 'min', 'step', 'pattern', 'rel', 'target', 'method',
  'action', 'icon', 'color', 'align', 'justify', 'gap', 'offset',
  'position', 'cursor', 'grid', 'flex', 'items', 'self', 'place',
  'overflow', 'object', 'opacity', 'transition', 'duration', 'delay',
  'ease', 'animate', 'animation', 'decoration', 'divide', 'ring',
  'outline', 'fill', 'stroke', 'as', 'is', 'form', 'list', 'media',
  'controls', 'loading', 'disabled', 'required', 'readOnly', 'multiple',
  'rows', 'cols', 'wrap', 'mode', 'kind', 'state', 'status', 'level',
  'query', 'field', 'path', 'url', 'unit', 'format', 'locale',
]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === '__tests__' || e === '__mocks__') continue; // test trees are not product copy
      walk(p, out);
    } else if (p.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(p)) out.push(p);
  }
  return out;
}

/** Look back from an opening quote to find `ident =` / `ident = {`. */
function attrLookback(src, pos) {
  let j = pos - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  if (j >= 0 && src[j] === '{') { j--; while (j >= 0 && /\s/.test(src[j])) j--; }
  if (j < 0 || src[j] !== '=') return null;
  j--;
  if (j >= 0 && /[=!<>+\-*/%&|^]/.test(src[j])) return null; // ==, =>, <= ...
  let end = j;
  while (j >= 0 && /[\w$-]/.test(src[j])) j--;
  const name = src.slice(j + 1, end + 1);
  return /^[A-Za-z_$][\w$-]*$/.test(name) ? name : null;
}

function countWords(text) {
  let ar = 0, la = 0;
  for (const t of text.split(/\s+/)) {
    if (!t) continue;
    if (AR.test(t)) ar++;
    else if (LATIN.test(t)) la++;
  }
  return { ar, la };
}

/** Scan one file. Returns per-bucket word counts (see HEURISTIC above). */
function scanFile(src) {
  const n = src.length;
  const masked = src.split('');
  const buckets = {
    props: { ar: 0, la: 0 }, plain: { ar: 0, la: 0 },
    aria: { ar: 0, la: 0 }, jsx: { ar: 0, la: 0 },
  };
  let i = 0;
  let inImport = false;
  let lastWord = '';

  const maskRange = (a, b) => {
    for (let k = a; k < b; k++) if (masked[k] !== '\n') masked[k] = ' ';
  };
  const record = (bucket, text) => {
    const { ar, la } = countWords(text);
    buckets[bucket].ar += ar; buckets[bucket].la += la;
  };

  while (i < n) {
    const c = src[i];
    // ---- comments ----
    if (c === '/' && src[i + 1] === '/') { const s = i; while (i < n && src[i] !== '\n') i++; maskRange(s, i); continue; }
    if (c === '/' && src[i + 1] === '*') { const s = i; i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i = Math.min(n, i + 2); maskRange(s, i); continue; }
    // ---- regex literal heuristic ----
    if (c === '/') {
      let j = i - 1; while (j >= 0 && /\s/.test(src[j])) j--;
      const prev = j >= 0 ? src[j] : '';
      if (prev === '' || '(,=:[!&|?{;'.includes(prev)) {
        const s = i; i++; let inCls = false; let ok = false;
        while (i < n) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === '[') inCls = true;
          else if (src[i] === ']') inCls = false;
          else if (src[i] === '/' && !inCls) { ok = true; break; }
          else if (src[i] === '\n') break; // not a regex after all
          i++;
        }
        if (ok) { i++; while (i < n && 'gimsuyd'.includes(src[i])) i++; maskRange(s, i); continue; }
        i = s; // bail: treat as division
      }
    }
    // ---- words / import tracking ----
    if (/[A-Za-z_$]/.test(c)) {
      const s = i; while (i < n && /[\w$]/.test(src[i])) i++;
      const w = src.slice(s, i);
      if (w === 'import') inImport = true;
      lastWord = w;
      continue;
    }
    if (c === ';') { inImport = false; i++; continue; }
    // ---- template literal ----
    if (c === '`') {
      const start = i; i++;
      let statics = '';
      const attr = attrLookback(src, start);
      while (i < n) {
        if (src[i] === '\\') { statics += src[i + 1] === 'n' ? ' ' : src[i + 1]; i += 2; continue; }
        if (src[i] === '`') { i++; break; }
        if (src[i] === '$' && src[i + 1] === '{') {
          i += 2; let depth = 1;
          while (i < n && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') { depth--; if (!depth) break; }
            else if (src[i] === '\'' || src[i] === '"') { const q = src[i]; i++; while (i < n && src[i] !== q) { if (src[i] === '\\') i++; i++; } }
            else if (src[i] === '`') { i++; while (i < n && src[i] !== '`') { if (src[i] === '\\') i++; i++; } }
            i++;
          }
          i++; // past '}'
          statics += ' ';
          continue;
        }
        statics += src[i]; i++;
      }
      maskRange(start + 1, i - 1);
      const text = statics.replace(/\s+/g, ' ').trim();
      if (!text || inImport) continue;
      if (ARIA_PROPS.has(attr)) { record('aria', text); continue; }
      if (STRIP_PROPS.has(attr)) continue;
      if (attr && (VISIBLE_PROPS.has(attr) || AR.test(text))) record('props', text);
      else if (!attr) {
        if (/^[\w$@][\w$@/.-]*$/.test(text) && /[\/.@]/.test(text)) continue; // module path
        record('plain', text);
      }
      continue;
    }
    // ---- quoted string ----
    if (c === '\'' || c === '"') {
      const start = i; const q = c; i++;
      let text = '';
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') { const nx = src[i + 1]; text += nx === 'n' ? ' ' : nx; i += 2; continue; }
        text += src[i]; i++;
      }
      i++; // closing quote
      maskRange(start + 1, i - 1);
      const wasImport = inImport;
      if (wasImport && lastWord === 'from') inImport = false;
      if (wasImport) continue;
      const attr = attrLookback(src, start);
      const t = text.replace(/\s+/g, ' ').trim();
      if (!t) continue;
      if (ARIA_PROPS.has(attr)) { record('aria', t); continue; }
      if (STRIP_PROPS.has(attr)) continue;
      if (attr && (VISIBLE_PROPS.has(attr) || AR.test(t))) record('props', t);
      else if (!attr) {
        if (/^[\w$@][\w$@/.-]*$/.test(t) && /[\/.@]/.test(t)) continue; // module path
        record('plain', t);
      }
      continue;
    }
    i++;
  }

  // ---- JSX text on the masked source ----
  const maskedSrc = masked.join('');
  const jsxRe = />([^<>{}]+)</g;
  let m;
  while ((m = jsxRe.exec(maskedSrc))) {
    const seg = m[1].replace(/\s+/g, ' ').trim();
    if (!seg) continue;
    const hasAr = AR.test(seg);
    if (!hasAr && (/[();={}|&!]/.test(seg) || !LATIN.test(seg))) continue;
    record('jsx', seg);
  }

  return buckets;
}

// ---- run ----
const CENSUS = process.argv.includes('--census'); // bootstrap: write ceilings = current counts
const ratchet = JSON.parse(readFileSync(RATCHET_PATH, 'utf8'));
const ratchetPages = ratchet.pages ?? {};
const files = [...new Set(ROOTS.flatMap((r) => walk(r)))].sort();
const relOf = (f) => relative(REPO_ROOT, f).split('\\').join('/');
const diskPages = new Set(files.map(relOf));

const rows = [];
for (const f of files) {
  const rel = relOf(f);
  const entry = ratchetPages[rel];
  const buckets = scanFile(readFileSync(f, 'utf8'));
  const arabic = buckets.props.ar + buckets.plain.ar + buckets.jsx.ar;
  const latin = buckets.props.la + buckets.plain.la + buckets.jsx.la;
  rows.push({ file: rel, arabic, latin, aria: buckets.aria.ar, entry });
}
for (const rel of Object.keys(ratchetPages)) {
  if (!diskPages.has(rel)) {
    rows.push({ file: rel, arabic: -1, latin: 0, aria: 0, entry: ratchetPages[rel], stale: true });
  }
}

const unratcheted = rows.filter((r) => !r.entry && !r.stale).map((r) => r.file);
const stale = rows.filter((r) => r.stale).map((r) => r.file);
const enforced = rows.filter((r) => r.entry && Number.isFinite(r.entry.max));
const exempt = rows.filter((r) => r.entry && !Number.isFinite(r.entry.max) && !r.stale);
const over = enforced
  .filter((r) => r.arabic > r.entry.max)
  .sort((a, b) => (b.arabic - b.entry.max) - (a.arabic - a.entry.max));

const totalArabic = rows.reduce((s, r) => s + Math.max(0, r.arabic), 0);
const sumCeilings = enforced.reduce((s, r) => s + r.entry.max, 0);

const pad = (v, w) => String(v).padStart(w);
console.log(`copy-budget-mobile ratchet — docs/QA/copy-budget-mobile.json`);
console.log(`screens on disk: ${rows.filter((r) => !r.stale).length} | enforced: ${enforced.length} | exempt: ${exempt.length}`);
console.log(`arabic words: ${totalArabic} | enforced ceilings sum: ${sumCeilings}`);
console.log('');
console.log('status | screen | words | ceiling | headroom');
console.log('-'.repeat(96));

const status = (r) =>
  r.stale ? 'STALE ' : !r.entry ? 'NO-RATCHET' : r.entry.max == null ? 'EXEMPT' : r.arabic > r.entry.max ? 'OVER ' : 'ok ';
const ordered = [...over, ...rows.filter((r) => !over.includes(r))];
const seen = new Set();
let shown = 0;
for (const r of ordered) {
  if (seen.has(r)) continue;
  seen.add(r);
  // keep the table readable: show OVER/STALE/NO-RATCHET always; ok rows only the 15 tightest
  const st = status(r);
  if (st === 'ok ' && shown >= 15) continue;
  if (st === 'ok ') shown++;
  const ceiling = r.entry?.max == null ? '—' : r.entry.max;
  const head = r.entry?.max == null ? '—' : r.entry.max - r.arabic;
  console.log(`${st} | ${r.file.padEnd(52)} | ${pad(r.arabic < 0 ? 'GONE' : r.arabic, 6)} | ${pad(ceiling, 7)} | ${typeof head === 'number' ? pad(head, 8) : head}`);
}
if (rows.filter((r) => !r.stale).length - over.length > 15) console.log(`… ${rows.filter((r) => !r.stale).length - over.length - 15} more screens under their ceiling`);

let bad = 0;
if (over.length) {
  console.log('');
  console.log(`\u2717 ${over.length} screen(s) over ceiling (cut the screen — the ratchet only moves DOWN):`);
  for (const r of over) console.log(`  ${r.file}: ${r.arabic} > ${r.entry.max} (−${r.arabic - r.entry.max} needed)`);
  bad = 1;
}
if (unratcheted.length) {
  console.log('');
  console.log(`\u2717 ${unratcheted.length} screen(s) on disk with NO ratchet entry — add a ceiling in docs/QA/copy-budget-mobile.json (born-under-the-law rule):`);
  for (const f of unratcheted.slice(0, 20)) console.log(`  ${f}`);
  if (unratcheted.length > 20) console.log(`  … ${unratcheted.length - 20} more`);
  bad = 1;
}
if (stale.length) {
  console.log('');
  console.log(`\u2717 ${stale.length} stale ratchet entr(ies) — file gone, remove the entry:`);
  for (const f of stale.slice(0, 20)) console.log(`  ${f}`);
  bad = 1;
}

console.log('');
if (CENSUS) {
  // Bootstrap: write every on-disk screen's ceiling at its CURRENT count
  // (only for files with no entry, or entries higher than the count — a
  // census never RAISES a ceiling). Existing lower ceilings survive.
  const { writeFileSync } = await import('node:fs');
  const next = { ...ratchet, pages: { ...ratchetPages } };
  for (const r of rows) {
    if (r.stale || r.arabic < 0) continue;
    const cur = next.pages[r.file];
    if (!cur || !Number.isFinite(cur.max) || cur.max > r.arabic) {
      next.pages[r.file] = { ...(cur ?? {}), max: r.arabic };
    }
  }
  writeFileSync(RATCHET_PATH, JSON.stringify(next, null, 2) + '\n');
  console.log(`CENSUS: ratchet written — ${Object.keys(next.pages).length} screens, ceilings at current counts`);
  process.exit(0);
}
if (bad) {
  console.log('COPY-BUDGET-MOBILE: FAIL');
  process.exit(1);
} else {
  console.log('COPY-BUDGET-MOBILE: CLEAN — every enforced screen under its ceiling');
  process.exit(0);
}
