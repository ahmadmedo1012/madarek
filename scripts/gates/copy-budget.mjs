#!/usr/bin/env node
/**
 * copy-budget gate — R353 lane P2: the per-page Arabic-copy ratchet.
 *
 * LAW (docs/QA/copy-budget.json): every page file under
 * frontend/src/pages carries a ceiling `maxWords`. This gate counts the
 * human-visible Arabic words per page with the SAME lexer heuristic the
 * baseline census used (copied verbatim from the analyzer's
 * /tmp/copy-budget/count.mjs — see the HEURISTIC block below), compares
 * each page against its ceiling, and exits 1 on ANY page over budget —
 * plus on any DRIFT that would let copy grow back silently:
 *
 *   - a page .tsx on disk with NO ratchet entry  -> FAIL (new page must
 *     be born under a ceiling; add it to the ratchet in the same PR);
 *   - a ratchet entry with NO file on disk        -> FAIL (stale entry);
 *   - a page over its ceiling                    -> FAIL (the ratchet
 *     may only move DOWN — cut the page, never raise the ceiling).
 *
 * Exemptions (documented in the ratchet's class field, printed as
 * EXEMPT, never compared): `max: null` — the dev specimen pages
 * (DesignPage / PlatesPage / BrandPage — /__* reading specimens) and
 * router barrels (owner/OwnerPages.tsx, 0 words).
 *
 * The ratchet is a RATCHET: to tighten it, lower a ceiling in
 * docs/QA/copy-budget.json in the same commit that cuts the page. The
 * gate prints headroom (ceiling − words) so a page flirting with its
 * ceiling is visible before it breaks.
 *
 * Dependency-free (node:fs / node:path / node:url) — runs in CI's
 * design-gates job and in scripts/verify.sh (both modes) like the
 * identity guard.
 *
 * ==================================================================
 *  R366 (Agent 3 · L4b) — THE STYLE MODE: --style [report|enforce]
 *
 *  The quality layer over the quantity layer: the machine-checkable
 *  rules of docs/DESIGN-COPY-GUIDE-AR.md applied to the SAME lexer
 *  harvest (per-string, with attr context + line numbers):
 *    title/heading <= 4 words · hint/error/description/placeholder/
 *    message/tooltip <= 12 words · confirmLabel/cancelLabel/submit-
 *    Label/okLabel/pendingLabel <= 2 words · banned fillers (يرجى/
 *    الرجاء/من فضلك/حدث خطأ ما/…) · marketing adjectives inside app
 *    chrome · Arabic-Indic digits ٠-٩ · trailing ellipsis/punctuation
 *    on titles and button labels · standalone «تأكيد» as a
 *    destructive confirm.
 *
 *  REPORT (default): prints every finding, exits 0 — the census that
 *  sizes the cleanup. ENFORCE: exits 1 ONLY for findings in the
 *  design-system-owned files (components/patterns/** + the /__design
 *  lab page); other agents' files stay report-only until their lanes
 *  adopt the standard (file a REQUEST — never edit their files).
 *  The word ceilings are NEVER touched by this mode.
 *==================================================================
 * ==================================================================
 *  HEURISTIC (copied verbatim from the baseline census count.mjs — a
 *  lexer approximation, not a compiler; ~95% right, not perfect):
 *
 *  1. Single left-to-right char scan tracks: line comments (//...),
 *     block comments, single/double-quoted strings, template literals
 *     (recursing into ${...} expressions naively), and regex literals
 *     (a "/" preceded by one of (,=:[!&|?{; or start-of-file and not
 *     followed by space — standard JS heuristic). Comments and regexes
 *     are dropped entirely.
 *
 *  2. IMPORTS: from the `import` keyword to the terminating ";" (or the
 *     module specifier after `from`), all strings are treated as module
 *     paths -> dropped.
 *
 *  3. STRING CLASSIFICATION via look-back from the opening quote:
 *     an identifier immediately followed by "=" (optional "{") means a
 *     JSX-attribute-like string — e.g. title="...", description={`...`}.
 *       - attr name in VISIBLE_PROPS (title, label, description,
 *         placeholder, message, subtitle, hint, ...) -> bucket `props`
 *         (COUNTED).
 *       - attr name in STRIP_PROPS (className, id, key, to, href, src,
 *         variant, tone, ...) -> dropped (machine strings).
 *       - unknown attr name + Arabic value -> counted in `props`
 *         (Arabic attr values in this repo are always labels);
 *         unknown attr without Arabic -> dropped (enum/config values).
 *       - no attr pattern -> bucket `plain`: string literals rendered
 *         as children, stored in label maps, or concatenated into
 *         visible text. Plain strings that look like module paths
 *         ("./x/y", "lucide-react") are dropped.
 *     NOTE: `const title = 'x'` also matches the attr look-back; such
 *     assignment RHS strings are still rendered copy — counting them in
 *     `props` only mislabels the bucket, not the total. aria-label /
 *     ariaLabel go to a separate `aria` bucket that is NOT part of the
 *     visible totals (screen-reader only) but is reported alongside.
 *
 *  4. JSX TEXT: after masking comments+string contents (quotes kept,
 *     newlines preserved), visible text is ">...<" segments with no
 *     <>{} chars inside. Segments containing Arabic are counted in
 *     full; non-Arabic segments are counted only if they contain no
 *     code artifacts "( );={}|&!" and contain at least one Latin letter.
 *
 *  5. WORDS: whitespace-split tokens. arabic token = contains any
 *     Arabic-range char (U+0600-06FF, 0750-077F, 08A0-08FF, FB50-FDFF,
 *     FE70-FEFF). latin token = has A-z and no Arabic. Digits-only
 *     tokens count as neither (numbers are data, not copy).
 *
 *  KNOWN LIMITATIONS (accepted): a regex literal containing a quote
 *  could desync the scanner (none observed in pages/); template
 *  statics are joined but interpolated expressions are not measured;
 *  copy injected from other files (shared components' own literals,
 *  API data) is out of scope (pages only); `const label = '...'`
 *  assignments land in the `props` bucket (total unaffected).
 * ==================================================================
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..', '..');
const ROOT = join(REPO_ROOT, 'frontend', 'src', 'pages');
const RATCHET_PATH = join(REPO_ROOT, 'docs', 'QA', 'copy-budget.json');

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
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
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

/** Scan one file. Returns per-bucket word counts (see HEURISTIC above).
 * R366 style mode: pass a `harvest` array to also collect every
 * counted string with its attr context, RAW text (pre-normalisation)
 * and line number — the budget maths itself is untouched. */
function scanFile(src, harvest = null) {
  const n = src.length;
  const masked = src.split('');
  const buckets = {
    props: { ar: 0, la: 0 }, plain: { ar: 0, la: 0 },
    aria: { ar: 0, la: 0 }, jsx: { ar: 0, la: 0 },
  };
  let i = 0;
  let inImport = false;
  let lastWord = '';
  const lineOf = (idx) => src.slice(0, idx).split('\n').length;

  const maskRange = (a, b) => {
    for (let k = a; k < b; k++) if (masked[k] !== '\n') masked[k] = ' ';
  };
  const record = (bucket, text, attr = null, raw = null, idx = 0, tpl = false) => {
    const { ar, la } = countWords(text);
    buckets[bucket].ar += ar; buckets[bucket].la += la;
    if (harvest && (ar > 0 || la > 0)) harvest.push({ bucket, attr, text, raw: raw ?? text, line: lineOf(idx), tpl });
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
      if (ARIA_PROPS.has(attr)) { record('aria', text, attr, statics, start, true); continue; }
      if (STRIP_PROPS.has(attr)) continue;
      if (attr && (VISIBLE_PROPS.has(attr) || AR.test(text))) record('props', text, attr, statics, start, true);
      else if (!attr) {
        if (/^[\w$@][\w$@/.-]*$/.test(text) && /[\/.@]/.test(text)) continue; // module path
        record('plain', text, null, statics, start, true);
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
      if (ARIA_PROPS.has(attr)) { record('aria', t, attr, text, start); continue; }
      if (STRIP_PROPS.has(attr)) continue;
      if (attr && (VISIBLE_PROPS.has(attr) || AR.test(t))) record('props', t, attr, text, start);
      else if (!attr) {
        if (/^[\w$@][\w$@/.-]*$/.test(t) && /[\/.@]/.test(t)) continue; // module path
        record('plain', t, null, text, start);
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
if (process.argv.includes('--style')) {
  /* R366 · the STYLE MODE — see the header block. Report by default;
   * `--style enforce` fails ONLY on design-system-owned files. */
  const ENFORCE = process.argv.includes('enforce');
  const STYLE_ROOTS = [
    join(REPO_ROOT, 'frontend', 'src', 'pages'),
    join(REPO_ROOT, 'frontend', 'src', 'components'),
  ];
  const OWNED = (rel) => rel.startsWith('components/patterns/') || rel === 'pages/DesignPage.tsx';

  const TITLE_ATTRS = new Set(['title', 'heading']);
  const HELPER_ATTRS = new Set(['hint', 'error', 'description', 'placeholder', 'note', 'summary', 'caption', 'message', 'tooltip', 'emptyText', 'subtitle']);
  const BUTTON_ATTRS = new Set(['confirmLabel', 'cancelLabel', 'submitLabel', 'okLabel', 'pendingLabel']);
  const FILLERS = ['يرجى', 'الرجاء', 'من فضلك', 'حدث خطأ ما', 'Oops', 'بنجاح!', 'مرحبًا بك في', 'أحسنت!'];
  const MARKETING = ['مذهل', 'رائع', 'ثوري', 'فريد من نوعه'];
  const AR_INDIC = /[\u0660-\u0669]/;
  const words = (t) => t.split(/\s+/).filter(Boolean).length;

  const findings = [];
  for (const root of STYLE_ROOTS) {
    for (const f of walk(root)) {
      const rel = relative(join(REPO_ROOT, 'frontend', 'src'), f).split('\\').join('/');
      const harvest = [];
      scanFile(readFileSync(f, 'utf8'), harvest);
      for (const h of harvest) {
        const isAr = AR.test(h.text);
        if (!isAr && !/^[A-Za-z]/.test(h.text)) continue;
        const at = `${rel}:${h.line}`;
        const W = words(h.text);
        if (h.attr && TITLE_ATTRS.has(h.attr) && isAr && W > 4)
          findings.push({ rule: `title>${4}`, at, text: h.text, owned: OWNED(rel) });
        if (h.attr && HELPER_ATTRS.has(h.attr) && isAr && W > 12)
          findings.push({ rule: 'helper>12', at, text: h.text, owned: OWNED(rel) });
        if (h.attr && BUTTON_ATTRS.has(h.attr) && isAr && W > 2)
          findings.push({ rule: 'button>2', at, text: h.text, owned: OWNED(rel) });
        for (const f2 of FILLERS) if (h.text.includes(f2))
          findings.push({ rule: `filler «${f2}»`, at, text: h.text, owned: OWNED(rel) });
        for (const mk of MARKETING) if (h.text.includes(mk))
          findings.push({ rule: `marketing «${mk}»`, at, text: h.text, owned: OWNED(rel) });
        if (isAr && AR_INDIC.test(h.text))
          findings.push({ rule: 'arabic-indic digits', at, text: h.text, owned: OWNED(rel) });
        if (isAr && h.attr && (TITLE_ATTRS.has(h.attr) || BUTTON_ATTRS.has(h.attr)) && /[!؟،؛…]$/.test(h.text.trim()))
          findings.push({ rule: 'trailing punctuation', at, text: h.text, owned: OWNED(rel) });
        if (h.attr === 'confirmLabel' && h.text.trim() === 'تأكيد')
          findings.push({ rule: 'standalone تأكيد confirm', at, text: h.text, owned: OWNED(rel) });
        /* templates: the scanner substitutes ONE space per ${...}
         * junction — a raw double-space there is usually an
         * interpolation artifact, not authored copy. */
        if (!h.tpl && /  +/.test(h.raw) && isAr)
          findings.push({ rule: 'double space', at, text: h.text, owned: OWNED(rel) });
      }
    }
  }
  const mine = findings.filter((f) => f.owned);
  const theirs = findings.filter((f) => !f.owned);
  console.log(`[copy-style] ${findings.length} style finding(s) — ${mine.length} in design-system files, ${theirs.length} in other agents' files (report-only)`);
  for (const f of findings.slice(0, 60)) {
    console.log(`  ${f.owned ? (ENFORCE ? '✗' : '·') : '·'} [${f.rule}] ${f.at} — «${f.text.slice(0, 60)}»`);
  }
  if (findings.length > 60) console.log(`  … and ${findings.length - 60} more`);
  if (ENFORCE && mine.length) {
    console.error(`\n✖ copy-style ENFORCE — ${mine.length} finding(s) in design-system files`);
    process.exit(1);
  }
  console.log(`\n✔ copy-style ${ENFORCE ? 'ENFORCE' : 'REPORT'} — ${ENFORCE ? 'design-system files clean' : 'census only'}`);
  process.exit(0);
}

const ratchet = JSON.parse(readFileSync(RATCHET_PATH, 'utf8'));
const ratchetPages = ratchet.pages ?? {};
const files = walk(ROOT).sort();
const diskPages = new Set(files.map((f) => relative(ROOT, f).split('\\').join('/')));

const rows = [];
for (const f of files) {
  const rel = relative(ROOT, f).split('\\').join('/');
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

// Drift: a page on disk with no ratchet entry can grow unbounded.
const unratcheted = rows.filter((r) => !r.entry && !r.stale).map((r) => r.file);
// Stale: ratchet entry whose file is gone.
const stale = rows.filter((r) => r.stale).map((r) => r.file);

const enforced = rows.filter((r) => r.entry && Number.isFinite(r.entry.max));
const exempt = rows.filter((r) => r.entry && !Number.isFinite(r.entry.max) && !r.stale);
const over = enforced
  .filter((r) => r.arabic > r.entry.max)
  .sort((a, b) => (b.arabic - b.entry.max) - (a.arabic - a.entry.max));

const totalArabic = rows.reduce((s, r) => s + Math.max(0, r.arabic), 0);
const sumCeilings = enforced.reduce((s, r) => s + r.entry.max, 0);
const baselineTotal = ratchet.meta?.baselineTotalArabic ?? null;

const pad = (v, w) => String(v).padStart(w);
console.log(`copy-budget ratchet — docs/QA/copy-budget.json`);
console.log(`pages on disk: ${rows.filter((r) => !r.stale).length} | enforced: ${enforced.length} | exempt: ${exempt.length} (dev specimens + barrels)`);
if (baselineTotal) {
  const pct = ((1 - totalArabic / baselineTotal) * 100).toFixed(1);
  console.log(`arabic words: ${totalArabic} (baseline ${baselineTotal} → −${pct}%) | enforced ceilings sum: ${sumCeilings}`);
} else {
  console.log(`arabic words: ${totalArabic} | enforced ceilings sum: ${sumCeilings}`);
}
console.log('');
console.log('status | page | words | ceiling | headroom');
console.log('-'.repeat(96));

const status = (r) =>
  r.stale ? 'STALE ' : !r.entry ? 'NO-RATCHET' : r.entry.max == null ? 'EXEMPT' : r.arabic > r.entry.max ? 'OVER ' : 'ok ';
const ordered = [...over, ...rows.filter((r) => !over.includes(r))];
const seen = new Set();
for (const r of ordered) {
  if (seen.has(r)) continue;
  seen.add(r);
  const st = status(r);
  const ceiling = r.entry?.max == null ? '—' : r.entry.max;
  const head = r.entry?.max == null ? '—' : r.entry.max - r.arabic;
  console.log(`${st} | ${r.file.padEnd(52)} | ${pad(r.arabic < 0 ? 'GONE' : r.arabic, 6)} | ${pad(ceiling, 7)} | ${typeof head === 'number' ? pad(head, 8) : head}`);
}

let bad = 0;
if (over.length) {
  console.log('');
  console.log(`✗ ${over.length} page(s) over ceiling (cut the page — the ratchet only moves DOWN):`);
  for (const r of over) console.log(`  ${r.file}: ${r.arabic} > ${r.entry.max} (−${r.arabic - r.entry.max} needed)`);
  bad = 1;
}
if (unratcheted.length) {
  console.log('');
  console.log(`✗ ${unratcheted.length} page(s) on disk with NO ratchet entry — add a ceiling in docs/QA/copy-budget.json (born-under-the-law rule):`);
  for (const f of unratcheted) console.log(`  ${f}`);
  bad = 1;
}
if (stale.length) {
  console.log('');
  console.log(`✗ ${stale.length} stale ratchet entr(ies) — file gone, remove the entry:`);
  for (const f of stale) console.log(`  ${f}`);
  bad = 1;
}

console.log('');
if (bad) {
  console.log('COPY-BUDGET: FAIL');
  process.exit(1);
} else {
  console.log('COPY-BUDGET: CLEAN — every enforced page under its ceiling');
  process.exit(0);
}
