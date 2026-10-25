#!/usr/bin/env node
/**
 * wordmark-build.mjs — R318 §A6 — the footer wordmark «مدارك» rebuilt
 * from the site's OWN display font (Alexandria 700 — the arabic-subset
 * woff2 fonts.css self-hosts), instead of the retired five disconnected
 * hand-drafted geometric strokes.
 *
 * WHAT IT DOES (build-time only; the app ships ONLY the emitted static
 * path data — zero new runtime dependencies):
 *   1. decompress frontend/public/fonts/alexandria-700-normal-arabic.woff2
 *      → ttf (python3 fontTools woff2; a hash-keyed tmp cache keeps the
 *      run deterministic and the repo clean),
 *   2. SHAPE «مدارك» with harfbuzzjs — REAL contextual joining: م initial
 *      (uniFEE3) connected into د final (uniFEAA); ا/ر/ك isolated. The
 *      output arrives in visual left-to-right order (clusters 4..0) with
 *      per-glyph advances,
 *   3. extract the shaped glyphs' outlines with opentype.js (font units,
 *      y-up, quadratic TrueType contours — outer loops AND counters),
 *   4. compose the word on the drafting sheet: the THREE openable
 *      boundaries (د→ا · ا→ر · ر→ك — the non-joining letter pairs) carry
 *      the construction tracking; the م→د join stays CONNECTED (its
 *      connector strokes overlap collinearly — no boolean union needed),
 *   5. emit BOTH cuts as one path each, FILLED outline letterforms
 *      (fill: currentColor — the token-carried paper↔ink theme swap),
 *      sized from docs/redesign/r318/heron-footer.json + the PROTECTED
 *      docH ladder:
 *        · WIDE (≥768, the strip band's wordmark row): the sheet keeps
 *          the ladder-pinned 1200:92 viewBox aspect BYTE-IDENTICAL (the
 *          row auto-sizes from the svg aspect at 768/1024/1440 — docH
 *          12,627/9,959/12,340 EXACT), spans the FULL 1398px cell @1440,
 *          and seats the ink at 1149/1209 of the sheet = 101.9px @1440 =
 *          73.7% of the 138.4px wordmark row (the manifest's own
 *          "glyph height = 69% of the strip height" ratio, measured
 *          against the row the wordmark owns in our split 314px band —
 *          the reference's full-band 69% = 217px is IMPOSSIBLE here
 *          without killing the §A7 lens row that shares the band);
 *        · COMPACT (<768): the phone band's FIXED 640×180 sheet — the
 *          viewBox aspect is PINNED by the protected docH ladder
 *          (390 = 11,411 · 360 = 10,735 EXACT); the word letterboxes
 *          inside with construction margins.
 *
 * INK MODE — why FILLED, not the reference's stroke-only hollow
 * outlines (MEASURED, the full sweep in
 * audits/evidence/r318/c3-foot/ocr-matrix.md): stroke-only renders FAIL
 * the §A6 OCR gate at EVERY weight (1.25→25 CSS px, miter/round joins,
 * psm 6/7, ara+eng, both themes, both cuts: «صد | ( كم» … «هد»), while
 * the filled letterforms read «مدارك» — the §A6 acceptance (the gate
 * reads «مدارك» at 1440+390) wins over the sketch technique; the
 * drafting voice stays in the '+' reg marks, the construction circles
 * of the mark cell, and the mono line.
 *
 * TRACK — the construction tracking at the three openable boundaries,
 * in font units (of the 1000upem sheet), measured at the FINAL rendered
 * geometry (the gate's own reader: tesseract ara+eng, psm 7→6, dsf2
 * element shot, JPEG q70; ocr-matrix.md):
 *   · WIDE @1440 (ink 101.9px tall): 0/150/300u → «مدارك» ONE WORD both
 *     themes · 450u → light PASS but dark «مد اراك» (a hallucinated
 *     alif — one notch over).
 *   · COMPACT @390 (ink 75.7px tall): ≤450u → «مدارك» at every margin ·
 *     650u → «مد اراك» FAIL.
 *   300u = the widest drafting spread BOTH cuts + BOTH themes honestly
 *   read as one word (gaps ≈ 26.6px @1440 · 14.7px @390 — construction
 *   tracking, never letter-separation). One track, one voice.
 *
 * OUTPUT: frontend/src/components/landing/footer/wordmark-art.generated.ts
 * (committed — this script stays for reproducibility; rerun after any
 * font/word change with:
 *   npm i --no-save opentype.js harfbuzzjs   # build-time only
 *   node scripts/r318/wordmark-build.mjs
 * )
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Blob, Face, Font, Buffer as HbBuffer, shape } from 'harfbuzzjs';
import opentype from 'opentype.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const FONT_WOFF2 = path.join(ROOT, 'frontend/public/fonts/alexandria-700-normal-arabic.woff2');
const OUT_TS = path.join(ROOT, 'frontend/src/components/landing/footer/wordmark-art.generated.ts');
const WORD = 'مدارك';

/* ── the measured wordmark sheet (heron-footer.json + the docH ladder) ─
 * The strip band @1440 = 314.16px, split VERTICALLY (lens row + wordmark
 * row — the R315 B9 composition). The wordmark row @1440 = 138.4px and
 * its svg box is aspect-locked at the retired sheet's 1200:92 — the
 * ladder pin (row = auto at 768-991, 1fr/auto inside the fixed 314 at
 * ≥992; any aspect change moves docH at 768/1024/1440). */
const SHEET_ASPECT = 1200 / 92; /* vbW / vbH — the docH-pinned sheet aspect */
const CELL_W_1440 = 1398; /* .fo-wordmark cell inner @1440 (1426.69 strip − 2×14 reg gutters) */
const SVG_H_1440 = +(CELL_W_1440 / SHEET_ASPECT).toFixed(2); /* 107.21px — the measured box */
const ROW_H_1440 = 138.4; /* the wordmark row @1440 (probe: svg + pads + mono + gap) */
/* the vertical construction margins of the wide sheet, font units: */
const WIDE_MARGIN_Y = 30;
/* the compact sheet is FIXED 640×180 (the phone-band docH pin); margins: */
const COMPACT_VB = { w: 640, h: 180 };
const COMPACT_MARGIN_X = 10;
const COMPACT_MARGIN_Y = 20;
/* the construction track at the three openable boundaries (see header): */
const TRACK_UNITS = 300;

/* ── 1. woff2 → ttf (hash-cached in tmp; deterministic) ─────────────── */
const woff2 = fs.readFileSync(FONT_WOFF2);
const hash = createHash('md5').update(woff2).digest('hex').slice(0, 16);
const cacheDir = path.join(os.tmpdir(), 'r318-wordmark-cache');
fs.mkdirSync(cacheDir, { recursive: true });
const ttfPath = path.join(cacheDir, `alexandria-700-arabic-${hash}.ttf`);
if (!fs.existsSync(ttfPath)) {
  const tmpIn = path.join(cacheDir, `in-${hash}.woff2`);
  fs.writeFileSync(tmpIn, woff2);
  const res = spawnSync('python3', ['-m', 'fontTools.ttLib.woff2', 'decompress', tmpIn], { encoding: 'utf8' });
  const made = path.join(cacheDir, `in-${hash}.ttf`);
  if (res.status !== 0 || !fs.existsSync(made)) {
    console.error('[wordmark-build] fontTools woff2 decompress failed:');
    console.error(res.stderr || '(no stderr)');
    console.error('install with: pip install fonttools brotli');
    process.exit(1);
  }
  fs.renameSync(made, ttfPath);
  fs.rmSync(tmpIn);
}

/* ── 2. shape «مدارك» (harfbuzz — real Arabic joining) ──────────────── */
const hbFontBytes = fs.readFileSync(ttfPath);
const blob = new Blob(new Uint8Array(hbFontBytes));
const face = new Face(blob, 0);
const font = new Font(face);
const buffer = new HbBuffer();
buffer.addText(WORD);
buffer.guessSegmentProperties();
shape(font, buffer);
const shaped = buffer.getGlyphInfosAndPositions();
if (shaped.length !== 5) {
  console.error(`[wordmark-build] expected 5 shaped glyphs for «${WORD}», got ${shaped.length}`);
  process.exit(1);
}
const expectedClusters = [4, 3, 2, 1, 0]; /* harfbuzz RTL output = visual LTR */
const gotClusters = shaped.map((g) => g.cluster);
if (JSON.stringify(gotClusters) !== JSON.stringify(expectedClusters)) {
  console.error(`[wordmark-build] unexpected cluster order ${JSON.stringify(gotClusters)} (want visual LTR ${JSON.stringify(expectedClusters)})`);
  process.exit(1);
}

/* ── 3. glyph outlines (opentype.js, font units, y-up) ─────────────── */
const ot = opentype.parse(hbFontBytes.buffer.slice(hbFontBytes.byteOffset, hbFontBytes.byteOffset + hbFontBytes.length));
const upem = ot.unitsPerEm;
if (upem !== 1000) {
  console.error(`[wordmark-build] unexpected upem ${upem} (Alexandria is 1000)`);
  process.exit(1);
}
const glyphs = shaped.map((g) => {
  const glyph = ot.glyphs.get(g.codepoint);
  return {
    name: glyph.name,
    advance: g.xAdvance,
    cluster: g.cluster,
    letter: WORD[g.cluster],
    commands: glyph.path.commands.map((c) => ({ ...c })),
  };
});
/* the shaped forms must be the JOINED pair (م initial + د final) + the
 * three isolated letters — the §A6 contract, asserted so a font/HB change
 * fails loudly instead of shipping disconnected letterforms: */
const expectForms = ['uni0643', 'uni0631', 'uni0627', 'uniFEAA', 'uniFEE3'];
const gotForms = glyphs.map((g) => g.name);
if (JSON.stringify(gotForms) !== JSON.stringify(expectForms)) {
  console.error(`[wordmark-build] shaped forms ${JSON.stringify(gotForms)} ≠ ${JSON.stringify(expectForms)} (ك ر ا + د FINAL + م INITIAL)`);
  process.exit(1);
}
console.log(`[wordmark-build] shaped «${WORD}» → visual LTR ${gotForms.join(' · ')} (advances ${glyphs.map((g) => g.advance).join('/')})`);

/* ── 4. compose on the drafting sheet ──────────────────────────────── */
/* natural ink bbox of the PLACED word (track = 0 — glyph-local coords
 * offset by each pen position; envelope of on+off curve points —
 * conservative, never clips a curve overshoot): */
let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
const envelope = (trackWidth) => {
  xMin = Infinity; xMax = -Infinity; yMin = Infinity; yMax = -Infinity;
  let pen = 0;
  for (let i = 0; i < glyphs.length; i += 1) {
    const g = glyphs[i];
    const at = pen;
    pen += g.advance + (GAP_AFTER.includes(i) ? trackWidth : 0);
    for (const c of g.commands) {
      for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) {
        if (typeof c[kx] === 'number') {
          xMin = Math.min(xMin, c[kx] + at); xMax = Math.max(xMax, c[kx] + at);
          yMin = Math.min(yMin, c[ky]); yMax = Math.max(yMax, c[ky]);
        }
      }
    }
  }
};
/* the openable tracking boundaries: the non-joining letter pairs of
 * «مدارك» are د→ا · ا→ر · ر→ك (م→د stays CONNECTED). In the visual LTR
 * glyph stream [ك][ر][ا][د][م] the gaps ride AFTER glyph index 0, 1, 2
 * (the boundaries [ك|ر] [ر|ا] [ا|د]) — the measured OCR-safe track
 * (TRACK_UNITS above) spreads the drafting sheet without breaking the
 * reading: */
const GAP_AFTER = [0, 1, 2];
const nGaps = GAP_AFTER.length;
envelope(0);
const inkWNatural = xMax - xMin;
const inkH = yMax - yMin;
const track = TRACK_UNITS;
if (!(track > 0)) {
  console.error('[wordmark-build] bad track');
  process.exit(1);
}
console.log(`[wordmark-build] natural ink ${inkWNatural}×${inkH}u (y ${yMin}..${yMax}) · track ${track.toFixed(1)}u at each of ${nGaps} open boundaries`);

/* pen positions in font units, visual LTR (with the track): */
let pen = 0;
const placed = glyphs.map((g, i) => {
  const at = pen;
  pen += g.advance + (GAP_AFTER.includes(i) ? track : 0);
  return { ...g, at };
});
envelope(track);
const inkWComposed = xMax - xMin;

/* path command transform → a viewBox space (y-down):
 *   xT(x) = (x + at − xMin)·s + ox · yT(y) = (yMax − y)·s + oy */
function composeCommands(scale, ox, oy) {
  const f = (v) => +v.toFixed(1);
  const parts = [];
  for (const g of placed) {
    for (const c of g.commands) {
      const X = (v) => f((v + g.at - xMin) * scale + ox);
      const Y = (v) => f((yMax - v) * scale + oy);
      switch (c.type) {
        case 'M': parts.push(`M${X(c.x)} ${Y(c.y)}`); break;
        case 'L': parts.push(`L${X(c.x)} ${Y(c.y)}`); break;
        case 'C': parts.push(`C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}`); break;
        case 'Q': parts.push(`Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}`); break;
        case 'Z': parts.push('Z'); break;
        default: throw new Error(`unknown command ${c.type}`);
      }
    }
  }
  return parts.join('');
}

/* ── 5a. the WIDE cut (≥768) — the ladder-pinned full-cell sheet ────── */
/* vbH = the ink + symmetric construction margins; vbW = vbH × the pinned
 * sheet aspect → the svg box lands 1398×107.21 @1440 (byte-identical to
 * the retired sheet — docH 12,340/9,959/12,627 untouched) and the ink
 * fills 1149/1209 of it vertically: */
const vbWideH = inkH + 2 * WIDE_MARGIN_Y;
const vbWideW = vbWideH * SHEET_ASPECT;
if (Math.abs(vbWideW / vbWideH - SHEET_ASPECT) > 1e-9) {
  console.error('[wordmark-build] wide sheet aspect drift');
  process.exit(1);
}
const wideInkHpx = +(inkH / vbWideH * SVG_H_1440).toFixed(1);
const wideInkWpx = +(inkWComposed * (CELL_W_1440 / vbWideW)).toFixed(1);
if (wideInkWpx > CELL_W_1440 * 0.95) {
  console.error(`[wordmark-build] composed ink width ${wideInkWpx}px overfills the ${CELL_W_1440}px cell`);
  process.exit(1);
}
const marginXUnitsWide = (vbWideW - inkWComposed) / 2;
const wideD = composeCommands(1, marginXUnitsWide, WIDE_MARGIN_Y);
const wideVb = `0 0 ${vbWideW.toFixed(1)} ${vbWideH.toFixed(1)}`;

/* ── 5b. the COMPACT cut (<768) — the FIXED 640×180 sheet ─────────── */
const compactS = Math.min((COMPACT_VB.w - 2 * COMPACT_MARGIN_X) / inkWComposed, (COMPACT_VB.h - 2 * COMPACT_MARGIN_Y) / inkH);
const compactD = composeCommands(compactS, (COMPACT_VB.w - inkWComposed * compactS) / 2, (COMPACT_VB.h - inkH * compactS) / 2);
const compactVb = `0 0 ${COMPACT_VB.w} ${COMPACT_VB.h}`;

/* ── 6. emit the generated asset ───────────────────────────────────── */
const ts = `/* ═══════════════════════════════════════════════════════════════════
 * wordmark-art.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Generator: scripts/r318/wordmark-build.mjs (R318 §A6 — commit both
 * together; the generator is deterministic: same font + same word ⇒
 * same bytes).
 *
 * The footer wordmark «مدارك» — Madarek's own name drawn in OUR display
 * font (Alexandria 700, the arabic subset fonts.css self-hosts), shaped
 * with harfbuzz (م initial CONNECTED into د final; ا/ر/ك isolated) and
 * emitted as FILLED outline paths (fill: currentColor in landing.css —
 * solid ink letterforms, the token-carried paper↔ink theme swap; the
 * reference's stroke-only hollow outlines FAIL the §A6 OCR gate at
 * every measured weight — see the generator's header + ocr-matrix.md).
 * Construction tracking rides ONLY the three non-joining letter
 * boundaries (د→ا · ا→ر · ر→ك) — the join itself is never gapped; the
 * 300u track is the widest spread BOTH cuts + BOTH themes read as one
 * word.
 *
 * Cuts:
 *  · WIDE (≥768px): the ladder-pinned full-cell sheet — viewBox aspect
 *    1200:92 byte-identical to the retired sheet (docH 12,340 @1440 ·
 *    9,959 @1024 · 12,627 @768 EXACT), box ${CELL_W_1440}×${SVG_H_1440}px @1440 ·
 *    ${+(726).toFixed(0)}×55.7px @768; ink ${wideInkHpx}px tall = ${(wideInkHpx / ROW_H_1440 * 100).toFixed(1)}% of the
 *    ${ROW_H_1440}px wordmark row (the manifest's glyph-height ratio,
 *    measured against the row the wordmark owns in the split 314px band)
 *    × ${wideInkWpx}px wide (${((wideInkWpx / CELL_W_1440) * 100).toFixed(1)}% of the cell — the natural
 *    Arabic aspect at the OCR-true track).
 *  · COMPACT (<768px): the FIXED 640×180 phone sheet — its aspect is
 *    pinned by the protected docH ladder (390 = 11,411 · 360 = 10,735
 *    EXACT); the word letterboxes inside with ≥${COMPACT_MARGIN_X}/${COMPACT_MARGIN_Y}u construction margins.
 * ═══════════════════════════════════════════════════════════════════ */

/* the wide construction sheet (≥768) — viewBox ${wideVb} */
export const WORDMARK_WIDE = {
  viewBox: '${wideVb}',
  d: '${wideD}',
} as const;

/* the compact phone sheet (<768) — viewBox ${compactVb} */
export const WORDMARK_COMPACT = {
  viewBox: '${compactVb}',
  d: '${compactD}',
} as const;
`;
fs.writeFileSync(OUT_TS, ts);
console.log(`[wordmark-build] wrote ${path.relative(ROOT, OUT_TS)} (${(ts.length / 1024).toFixed(1)}KB)`);
console.log(`[wordmark-build] WIDE   viewBox ${wideVb} (aspect ${(vbWideW / vbWideH).toFixed(4)} = the pinned 1200:92) → box ${CELL_W_1440}×${SVG_H_1440}px @1440 · ink ${wideInkWpx}×${wideInkHpx}px (${(wideInkHpx / ROW_H_1440 * 100).toFixed(1)}% of the ${ROW_H_1440}px wordmark row)`);
console.log(`[wordmark-build] COMPACT viewBox ${compactVb} → ink ${(inkWComposed * compactS).toFixed(1)}×${(inkH * compactS).toFixed(1)}u of 640×180`);
