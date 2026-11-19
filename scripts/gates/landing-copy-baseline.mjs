#!/usr/bin/env node
/**
 * landing-copy-baseline — R368 T8-a (Mission A): the LANDING copy baseline.
 *
 * WHY: spec docs/specs/heron-fidelity.md acceptance 7 requires "landing copy
 * … at least 20 % below the committed baseline", but the only committed copy
 * numbers were the GLOBAL copy-budget sum (frontend/src/pages/**, ceiling
 * ratchet docs/QA/copy-budget.json) and the R366 mobile diet (13 043 → 10 419
 * on apps/mobile). No landing-only baseline existed (checklist gap A7) — a
 * landing percentage could not be computed without inventing a denominator.
 * This script pins that denominator.
 *
 * WHAT IT MEASURES (the INCLUSION LAW — exact, deterministic):
 *
 *   1. frontend/src/pages/LandingPage.tsx — full scan.
 *   2. frontend/src/components/landing/** — every .tsx file (recursive,
 *      sorted; the mounted sections/chrome/hero/journey/cursor/patterns
 *      seats plus the retired-from-mount SheetLoader.tsx, which the brief's
 *      "all .tsx" law includes — see the KNOWN CAVEATS note below).
 *   3. The landing shared-copy module. The task brief names
 *      `frontend/src/data/copy.ts`; THAT PATH DOES NOT EXIST in this tree —
 *      the module lives at frontend/src/components/landing/copy.ts (a .ts
 *      file, not matched by rule 2's .tsx glob), so it is included
 *      explicitly, full scan.
 *   4. frontend/src/data/landing-ledger.ts — full scan (the landing-owned
 *      ledger; NOTE: its LIVE_CAPABILITIES / VISION_STATUS exports render on
 *      /capabilities, only HERO_WORK_ITEMS + LIVE_COUNT render on the
 *      landing itself — kept whole per the brief's unqualified file list;
 *      recorded as a caveat in docs/audit/evidence/landing-copy-baseline.md).
 *   5. frontend/src/data/colleges.config.ts — LANDING-CONSUMED STRINGS ONLY:
 *      the landing (components/landing/sections/Vision.tsx) consumes exactly
 *      the registry cloud `colleges.slice(0, 14).map(c => c.nameAr)` — so the
 *      FIRST 14 `nameAr` string literals in file order are counted.
 *      Everything else in that file (nameEn, slug, accent, icon, cityAr,
 *      comments) is machine data or renders only as a count
 *      (`new Set(cityAr).size`, `colleges.length`) and is EXCLUDED.
 *   6. frontend/src/styles/landing — every .css file under it (recursive),
 *      `content:` string declarations only. Scanned for Arabic words;
 *      measured 0 in this tree (every content: string is '' or '+').
 *
 * HOW IT COUNTS (the COUNTING LAW): the lexer below is copied VERBATIM from
 * scripts/gates/copy-budget.mjs (the repo's copy-counting law since R353 —
 * see that file's HEURISTIC block for the full commentary): a char-scanner
 * that drops comments/imports/regexes, classifies string literals via
 * attr-look-back into props/plain buckets, and counts JSX text segments on
 * the masked source. Buckets: `props` + `plain` + `jsx` = VISIBLE copy (the
 * pinned total); `aria` (aria-label & friends) is REPORTED ALONGSIDE but NOT
 * in the total — the same split copy-budget.mjs uses. Arabic word = a
 * whitespace-split token containing any Arabic-range char
 * (U+0600-06FF, 0750-077F, 08A0-08FF, FB50-FDFF, FE70-FEFF). Latin words and
 * digit-only tokens are reported but not part of the Arabic total.
 *
 * KNOWN CAVEATS (documented, not silently absorbed — see the .md artifact):
 *   · SheetLoader.tsx is retired-from-mount (R333 P-D; kept for rollback) —
 *     its copy is counted (brief law: all .tsx) but does NOT render.
 *   · Landing modules that import Arabic copy from OUTSIDE the surface
 *     (data/product-media.ts via WhyScene, illustrations/interactive/
 *     {ConceptField,RouteSurvey}.tsx via Concepts) are NOT in this baseline
 *     — the brief's file list is authoritative; the exclusions are recorded
 *     in the .md so the lead can see them.
 *
 * OUTPUT: human table on stdout (default); `--json` prints the JSON payload;
 * `--write` writes the pinned artifact to
 * docs/audit/evidence/landing-copy-baseline.json (byte-stable: no dates, no
 * timestamps, sorted file order — two runs on the same tree are identical).
 * Exit 0 on success, 1 on any missing surface file. Measurement only — this
 * is the baseline PINNER, not a gate; ceilings/ratchets are lead-owned.
 *
 * Dependency-free (node:fs / node:path / node:url) — node stdlib only.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..', '..');
const FRONTEND_SRC = join(REPO_ROOT, 'frontend', 'src');
const OUT_PATH = join(REPO_ROOT, 'docs', 'audit', 'evidence', 'landing-copy-baseline.json');

/* ═══ The surface (the INCLUSION LAW, as paths) ═══ */
const LANDING_PAGE = 'pages/LandingPage.tsx';
const LANDING_COMPONENTS_DIR = 'components/landing';
const LANDING_COPY_MODULE = 'components/landing/copy.ts'; // brief's data/copy.ts — actual home
const LANDING_LEDGER = 'data/landing-ledger.ts';
const COLLEGES_CONFIG = 'data/colleges.config.ts';
const LANDING_CSS_DIR = 'styles/landing';
/* colleges.config.ts: Vision.tsx renders colleges.slice(0, 14).map(c => c.nameAr) */
const COLLEGES_NAMEAR_LIMIT = 14;

/* ═══ The lexer — copied verbatim from scripts/gates/copy-budget.mjs ═══
 * (minus the R366 --style harvest machinery, which this baseline does not
 * use; the classification logic and word law are byte-identical). */
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

/** Scan one .ts/.tsx file (see copy-budget.mjs HEURISTIC). */
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

/* ═══ Surface walking ═══ */

function walkTsxDirectories(dirAbs, relDir, out = []) {
  for (const e of readdirSync(dirAbs).sort()) {
    const p = join(dirAbs, e);
    if (statSync(p).isDirectory()) walkTsxDirectories(p, join(relDir, e), out);
    else if (e.endsWith('.tsx')) out.push(join(relDir, e));
  }
  return out;
}

function walkCss(dirAbs, relDir, out = []) {
  for (const e of readdirSync(dirAbs).sort()) {
    const p = join(dirAbs, e);
    if (statSync(p).isDirectory()) walkCss(p, join(relDir, e), out);
    else if (e.endsWith('.css')) out.push(join(relDir, e));
  }
  return out;
}

/** Rule 5 — the landing-consumed strings of colleges.config.ts:
 *  the FIRST 14 `nameAr` string literals in file order (Vision.tsx renders
 *  colleges.slice(0, 14) in the registry cloud). */
function scanCollegesConfig(src) {
  const re = /nameAr:\s*'((?:[^'\\]|\\.)*)'/g;
  const values = [];
  let m;
  while ((m = re.exec(src)) && values.length < COLLEGES_NAMEAR_LIMIT) {
    values.push(m[1].replace(/\\'/g, "'"));
  }
  if (values.length < COLLEGES_NAMEAR_LIMIT) {
    throw new Error(
      `${COLLEGES_CONFIG}: expected >=${COLLEGES_NAMEAR_LIMIT} nameAr literals, found ${values.length}`,
    );
  }
  let ar = 0, la = 0;
  for (const v of values) {
    const c = countWords(v);
    ar += c.ar; la += c.la;
  }
  return { values, arabic: ar, latin: la };
}

/** Rule 6 — `content:` strings in styles/landing CSS. */
function scanCssContentStrings(src) {
  const re = /content:\s*(['"])([^'"]*)\1/g;
  let ar = 0, la = 0, strings = 0;
  let m;
  while ((m = re.exec(src))) {
    strings++;
    const c = countWords(m[2]);
    ar += c.ar; la += c.la;
  }
  return { arabic: ar, latin: la, strings };
}

/* ═══ Run ═══ */

function measure() {
  const files = [];

  const pushScanned = (relPath, role, mounted) => {
    const abs = join(FRONTEND_SRC, relPath);
    let src;
    try {
      src = readFileSync(abs, 'utf8');
    } catch {
      throw new Error(`surface file missing: ${relPath}`);
    }
    const b = scanFile(src);
    files.push({
      file: `frontend/src/${relPath.split('\\').join('/')}`,
      role,
      mounted,
      arabicVisible: b.props.ar + b.plain.ar + b.jsx.ar,
      latinVisible: b.props.la + b.plain.la + b.jsx.la,
      ariaArabic: b.aria.ar,
      buckets: { props: b.props.ar, plain: b.plain.ar, jsx: b.jsx.ar },
    });
  };

  // Rule 1 — the composer page.
  pushScanned(LANDING_PAGE, 'landing-page', true);

  // Rule 2 — components/landing/**.tsx (sorted, recursive).
  const compDir = join(FRONTEND_SRC, ...LANDING_COMPONENTS_DIR.split('/'));
  const RETIRED_FROM_MOUNT = new Set(['components/landing/SheetLoader.tsx']);
  for (const rel of walkTsxDirectories(compDir, LANDING_COMPONENTS_DIR).sort()) {
    pushScanned(rel, 'landing-component', !RETIRED_FROM_MOUNT.has(rel));
  }

  // Rule 3 — the shared copy module (brief's data/copy.ts, actual home).
  pushScanned(LANDING_COPY_MODULE, 'copy-module', true);

  // Rule 4 — the landing ledger (whole file, per the brief's unqualified list).
  pushScanned(LANDING_LEDGER, 'landing-ledger', true);

  // Rule 5 — colleges.config.ts, first-14 nameAr only.
  const colleges = scanCollegesConfig(
    readFileSync(join(FRONTEND_SRC, COLLEGES_CONFIG), 'utf8'),
  );
  files.push({
    file: `frontend/src/${COLLEGES_CONFIG}`,
    role: 'colleges-config (first 14 nameAr — landing-consumed only)',
    mounted: true,
    arabicVisible: colleges.arabic,
    latinVisible: colleges.latin,
    ariaArabic: 0,
    buckets: { props: 0, plain: colleges.arabic, jsx: 0 },
    strings: colleges.values,
  });

  // Rule 6 — styles/landing CSS content: strings.
  const cssDir = join(FRONTEND_SRC, ...LANDING_CSS_DIR.split('/'));
  let cssAr = 0, cssLa = 0, cssStrings = 0, cssFiles = 0;
  for (const rel of walkCss(cssDir, LANDING_CSS_DIR).sort()) {
    cssFiles++;
    const r = scanCssContentStrings(readFileSync(join(FRONTEND_SRC, rel), 'utf8'));
    cssAr += r.arabic; cssLa += r.latin; cssStrings += r.strings;
  }
  if (cssAr > 0 || cssLa > 0) {
    files.push({
      file: `frontend/src/${LANDING_CSS_DIR}/**.css (content: strings)`,
      role: 'css-content-strings',
      mounted: true,
      arabicVisible: cssAr,
      latinVisible: cssLa,
      ariaArabic: 0,
      buckets: { props: 0, plain: 0, jsx: 0 },
    });
  }

  const arabicVisible = files.reduce((s, f) => s + f.arabicVisible, 0);
  const latinVisible = files.reduce((s, f) => s + f.latinVisible, 0);
  const ariaArabic = files.reduce((s, f) => s + f.ariaArabic, 0);
  const mountedArabic = files.filter((f) => f.mounted).reduce((s, f) => s + f.arabicVisible, 0);
  const reductionPct = 20;
  const maxAllowed = Math.floor((arabicVisible * (100 - reductionPct)) / 100);
  const reductionRequired = arabicVisible - maxAllowed;

  return {
    tool: 'scripts/gates/landing-copy-baseline.mjs',
    round: 'r368',
    task: 'T8-a',
    pinned: true,
    countingLaw:
      'lexer copied verbatim from scripts/gates/copy-budget.mjs (R353/R366 copy law): visible = props+plain+jsx buckets; aria reported separately, NOT in the total; Arabic word = whitespace token containing U+0600-06FF/0750-077F/08A0-08FF/FB50-FDFF/FE70-FEFF',
    inclusionLaw: [
      `1. frontend/src/${LANDING_PAGE} — full scan`,
      `2. frontend/src/${LANDING_COMPONENTS_DIR}/** — every .tsx (recursive, sorted)`,
      `3. frontend/src/${LANDING_COPY_MODULE} — the landing shared-copy module (the brief's "frontend/src/data/copy.ts" does not exist in this tree; the module lives here)`,
      `4. frontend/src/${LANDING_LEDGER} — full scan`,
      `5. frontend/src/${COLLEGES_CONFIG} — first ${COLLEGES_NAMEAR_LIMIT} nameAr literals only (Vision.tsx renders colleges.slice(0, 14).map(c => c.nameAr)); nameEn/slug/accent/icon/cityAr excluded (machine data or count-only)`,
      `6. frontend/src/${LANDING_CSS_DIR}/**.css — content: strings only (${cssStrings} declarations scanned across ${cssFiles} files; ${cssAr} Arabic words)`,
    ],
    files,
    totals: {
      files: files.length,
      arabicVisible,
      latinVisible,
      ariaArabic,
      mountedArabicVisible: mountedArabic,
      unmountedCaveat:
        'SheetLoader.tsx (retired from mount, R333 P-D) is counted per the all-.tsx law; mountedArabicVisible excludes it. The PINNED total is arabicVisible.',
    },
    target: {
      reductionPct,
      specAcceptance: 'docs/specs/heron-fidelity.md acceptance 7 — landing copy at least 20% below this baseline',
      maxAllowed,
      reductionRequired,
      formula: `maxAllowed = floor(${arabicVisible} x 0.8) = ${maxAllowed}; reductionRequired = ${arabicVisible} - ${maxAllowed} = ${reductionRequired}`,
    },
  };
}

const report = measure();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2) + '\n');
} else {
  const pad = (v, w) => String(v).padStart(w);
  console.log('landing-copy-baseline — R368 T8-a — the PINNED landing copy measurement');
  console.log('counting law: copy-budget.mjs lexer (visible = props+plain+jsx; aria excluded from totals)');
  console.log('');
  console.log('role | file | ar-visible | latin | aria(ar) | mounted');
  console.log('-'.repeat(110));
  for (const f of report.files) {
    console.log(
      `${f.role.slice(0, 22).padEnd(22)} | ${f.file.replace('frontend/src/', '').padEnd(58)} | ${pad(f.arabicVisible, 10)} | ${pad(f.latinVisible, 5)} | ${pad(f.ariaArabic, 8)} | ${f.mounted ? 'yes' : 'NO (retired)'}`,
    );
  }
  console.log('-'.repeat(110));
  const t = report.totals;
  console.log(`TOTAL Arabic visible words (PINNED): ${t.arabicVisible}`);
  console.log(`  (mounted-only view: ${t.mountedArabicVisible} — SheetLoader.tsx excluded; not the pinned number)`);
  console.log(`  latin visible: ${t.latinVisible} · aria(ar): ${t.ariaArabic} (reported, not in total)`);
  const g = report.target;
  console.log('');
  console.log(`-20% TARGET (spec acceptance 7): <= ${g.maxAllowed} Arabic words (cut >= ${g.reductionRequired})`);
  console.log(`  ${g.formula}`);
}

if (process.argv.includes('--write')) {
  writeFileSync(OUT_PATH, JSON.stringify(report, null, 2) + '\n');
  console.log(`wrote ${relative(REPO_ROOT, OUT_PATH)}`);
}
