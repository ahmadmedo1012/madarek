#!/usr/bin/env node
/**
 * wordmark-build.mjs — the footer wordmark «مدارك» — R318 §A6 built it,
 * R319 §D1 (the owner's top complaint) RE-SEATS it: CONNECTED + OUTLINED
 * + FULL-CELL-WIDTH, from the site's OWN display font (Alexandria 700 —
 * the arabic-subset woff2 fonts.css self-hosts).
 *
 * WHAT IT DOES (build-time only; the app ships ONLY the emitted static
 *   path data — zero new runtime dependencies):
 *   1. decompress frontend/public/fonts/alexandria-700-normal-arabic.woff2
 *      → ttf (python3 fontTools woff2; a hash-keyed tmp cache keeps the
 *      run deterministic and the repo clean),
 *   2. SHAPE «مدارك» with harfbuzzjs — REAL contextual joining: م initial
 *      (uniFEE3) connected into د final (uniFEAA); ا/ر/ك isolated. The
 *      output arrives in visual left-to-right order (clusters 4..0) with
 *      per-glyph advances,
 *   3. extract the shaped glyphs' outlines with opentype.js (font units,
 *      y-up, quadratic TrueType contours — outer loops AND counters),
 *   4. compose the word on ONE full-cell-width drafting sheet: the م→د
 *      join stays CONNECTED and — R319 §D1 — the R318 300u construction
 *      track at the three openable boundaries (د→ا · ا→ر · ر→ك) is
 *      REMOVED (track 0): the owner read the tracked word as
 *      letter-spaced DISCONNECTED letters (م د ا ر ك); real Arabic
 *      shaping carries only the font's own natural inter-letter air,
 *   5. emit the composed word as ONE path — STROKE-ONLY outline
 *      letterforms (fill:none; stroke:currentColor; ~1.7px non-scaling
 *      in landing.css — the heron-footer.json verdict: "STROKE-ONLY …
 *      thin uniform outlines, interior empty (paper shows through)",
 *      strokeWidth "≈1.7px rendered"), spanning the FULL cell width at
 *      1440/1024/768/390/360: the svg is width:100% of the .fo-wordmark
 *      cell and the viewBox carries the sheet (width-driven viewBox
 *      scaling — never font-size hacks). The text alternative (svg
 *      role="img" + aria-label + <title> «مدارك») carries the reading
 *      for assistive tech.
 *
 * INK MODE — the R318 filled decision, REVERSED BY MEASUREMENT at the
 *   new scale (the sweep: audits/evidence/r319/landing/ocr-d1-matrix.md):
 *   R318 measured stroke-only at the OLD 101.9px ink height @1440 and it
 *   failed the OCR gate at every weight (audits/evidence/r318/c3-foot/
 *   ocr-matrix.md); the R319 full-cell-width cut renders the ink 5×
 *   taller @1440 and tesseract ara+eng reads «مدارك» at the ~1.7px
 *   stroke (the §D1 acceptance), so the reference's own stroke-only
 *   technique is restored at the scale where it reads.
 *
 * SHEET — one cut for every viewport (the R318 wide/compact split is
 *   retired with the 1200:92 ladder pin): viewBox = ink + construction
 *   margins 90u x / 20u y (font units). The margins set the sheet aspect
 *   → the wordmark row sizes from the full-width svg, and the docH
 *   ladder holds ±3% at 360/390/768/1024/1440 (the definite 314px strip
 *   band retired in the same cycle funds the height; probe numbers in
 *   the R319 C2-L worklog + BOARD).
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
import ClipperLib from 'clipper-lib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const FONT_WOFF2 = path.join(ROOT, 'frontend/public/fonts/alexandria-700-normal-arabic.woff2');
const OUT_TS = path.join(ROOT, 'frontend/src/components/landing/footer/wordmark-art.generated.ts');
const WORD = 'مدارك';
/* R319 §D1 (kashida seat): the word is elongated with TATWEEL
 * (U+0640) INSIDE the م→د join — the brief's explicit prescription
 * («connected shaping with kashida as needed»). Each tatweel adds
 * 218u of advance (measured). 10 tatweels widen the natural
 * 2928×1149u ink (2.55:1 — the Arabic word is inherently taller than
 * Heron's Latin caps) to ~4.4:1 so the FULL-CELL-WIDTH svg lands at
 * the reference's own strip aspect (heron-footer.json: 1427×314 =
 * 4.545:1) — the svg @1440 ≈ 308px tall ≈ the reference's 314px strip
 * band, and the protected docH ladder stays ±3%. Kashida elongation
 * is REAL Arabic shaping (the connector stroke grows — never a gap),
 * so the owner's «disconnected letters» complaint cannot recur. */
const KASHIDA_COUNT = 10;
const WORD_SHAPED = 'م' + 'ـ'.repeat(KASHIDA_COUNT) + 'دارك';

/* ── the full-cell-width sheet (heron-footer.json + the docH ladder) ──
 * R319 §D1: ONE cut at every viewport — the svg spans the full
 * .fo-wordmark cell (1398px inner @1440) and the viewBox carries the
 * sheet: ink + construction margins. marginX 90u / marginY 20u set the
 * sheet aspect ≈ 2.614 → svg ≈ 534.6px tall @1440 · 375.7 @1024 · 277.7
 * @768 · 133.1 @390 · 121.7 @360 (docH ladder re-measured ±3% at every
 * rung; the retired 314px definite band funds the height). The ink
 * spans 94.3% of the cell width — the reference's own ink spans 86% of
 * its strip (heron-footer.json inkBbox 1228/1427). */
const SHEET_MARGIN_X = 148; /* construction margins, font units (1000upem) — 148 seats the
 * sheet aspect at the reference strip's own 4.545:1 with the 10-tatweel
 * ink (see KASHIDA_COUNT above) */
const SHEET_MARGIN_Y = 20;
const CELL_W_1440 = 1398; /* .fo-wordmark cell inner @1440 (1426.69 strip − 2×14 reg gutters) */
/* R319 §D1: the construction track is REMOVED — the owner read the R318
 * 300u tracked word as letter-spaced DISCONNECTED letters; track 0 ships
 * the font's own natural shaping (the م→د join + the isolated forms at
 * their harfbuzz advances) and NOTHING else. */
const TRACK_UNITS = 0;

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
buffer.addText(WORD_SHAPED);
buffer.guessSegmentProperties();
shape(font, buffer);
const shaped = buffer.getGlyphInfosAndPositions();
const nGlyphs = 5 + KASHIDA_COUNT;
if (shaped.length !== nGlyphs) {
  console.error(`[wordmark-build] expected ${nGlyphs} shaped glyphs for «${WORD_SHAPED}», got ${shaped.length}`);
  process.exit(1);
}
const expectedClusters = Array.from({ length: nGlyphs }, (_, i) => nGlyphs - 1 - i); /* harfbuzz RTL output = visual LTR */
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
    letter: WORD_SHAPED[g.cluster],
    commands: glyph.path.commands.map((c) => ({ ...c })),
  };
});
/* the shaped forms must be the KASHIDA-ELONGATED JOINED pair
 * (م initial + uni0640×N + د final — one connected chain) + the
 * three isolated letters — the §A6/§D1 contract, asserted so a
 * font/HB change fails loudly instead of shipping disconnected
 * letterforms: */
const expectForms = ['uni0643', 'uni0631', 'uni0627', 'uniFEAA',
  ...Array.from({ length: KASHIDA_COUNT }, () => 'uni0640'), 'uniFEE3'];
const gotForms = glyphs.map((g) => g.name);
if (JSON.stringify(gotForms) !== JSON.stringify(expectForms)) {
  console.error(`[wordmark-build] shaped forms ${JSON.stringify(gotForms)} ≠ ${JSON.stringify(expectForms)} (ك ر ا + د FINAL + م INITIAL)`);
  process.exit(1);
}
console.log(`[wordmark-build] shaped «${WORD}» → visual LTR ${gotForms.join(' · ')} (advances ${glyphs.map((g) => g.advance).join('/')})`);

/* ── 4. compose on the full-cell-width drafting sheet ──────────────── */
/* natural ink bbox of the PLACED word (glyph-local coords offset by each
 * pen position; envelope of on+off curve points — conservative, never
 * clips a curve overshoot): */
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
 * glyph stream [ك][ر][ا][د][م] the boundaries ride AFTER glyph index 0,
 * 1, 2. R319 §D1 sets TRACK_UNITS = 0 — the mechanism (and this map)
 * stays so the track can be re-measured deliberately, never by drift. */
const GAP_AFTER = [0, 1, 2];
const nGaps = GAP_AFTER.length;
envelope(0);
const inkWNatural = xMax - xMin;
const inkH = yMax - yMin;
const track = TRACK_UNITS;
if (!(track >= 0)) {
  console.error('[wordmark-build] bad track');
  process.exit(1);
}
console.log(`[wordmark-build] natural ink ${inkWNatural}×${inkH}u (y ${yMin}..${yMax}) · track ${track}u at each of ${nGaps} open boundaries`);

/* pen positions in font units, visual LTR (with the track): */
let pen = 0;
const placed = glyphs.map((g, i) => {
  const at = pen;
  pen += g.advance + (GAP_AFTER.includes(i) ? track : 0);
  return { ...g, at };
});
envelope(track);
const inkWComposed = xMax - xMin;

/* ── 4b. R319 §D1 join-union pass (clipper-lib) ───────────────────────
 * The R318 filled render hid a seam: the م→د join is two overlapping
 * glyph outlines (their connector strokes overlap collinearly), so a
 * STROKE-ONLY render drew DOUBLE lines through the join — measured by
 * the VLM («a visible vertical line/gap… doubled/overlapping geometry»)
 * and by OCR (tesseract read the doubled join as an extra ص: «صدارك»).
 * The fix: flatten every glyph contour to polygons (0.12u tolerance —
 * invisible at display size), UNION them with clipper (nonzero fill —
 * TrueType's own winding rule), lighten the result, and emit ONE clean
 * contour set: the join renders as single strokes, the counters stay
 * open, and both the outline and the tint twin ride the same region. */
const CSCALE = 100; /* clipper integer scale: 0.01u precision */
const FLATTEN_TOL = 0.12; /* font units — curve flattening tolerance */
const LIGHTEN_TOL = 30; /* clipper units (= 0.3u) — polyline simplification */

const toSVG = (x, y, g) => ({
  X: Math.round((x + g.at - xMin + SHEET_MARGIN_X) * CSCALE),
  Y: Math.round((yMax - y + SHEET_MARGIN_Y) * CSCALE),
});

function flattenGlyph(g) {
  const contours = [];
  let cur = null;
  let px = 0, py = 0, sx = 0, sy = 0;
  const push = (x, y) => { const p = toSVG(x, y, g); if (cur) cur.push({ X: p.X, Y: p.Y }); };
  for (const c of g.commands) {
    if (c.type === 'M') {
      if (cur && cur.length > 2) contours.push(cur);
      cur = [];
      px = c.x; py = c.y; sx = px; sy = py; push(px, py);
    } else if (c.type === 'L') {
      push(c.x, c.y); px = c.x; py = c.y;
    } else if (c.type === 'Q') {
      const steps = Math.max(2, Math.ceil(Math.hypot(c.x - px, c.y - py) / FLATTEN_TOL));
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps, u = 1 - t;
        push(u * u * px + 2 * u * t * c.x1 + t * t * c.x,
             u * u * py + 2 * u * t * c.y1 + t * t * c.y);
      }
      px = c.x; py = c.y;
    } else if (c.type === 'C') {
      const steps = Math.max(2, Math.ceil(Math.hypot(c.x - px, c.y - py) / FLATTEN_TOL));
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps, u = 1 - t;
        push(u * u * u * px + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
             u * u * u * py + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y);
      }
      px = c.x; py = c.y;
    } else if (c.type === 'Z') {
      if (cur && cur.length > 2) { push(sx, sy); contours.push(cur); }
      cur = null;
    }
  }
  if (cur && cur.length > 2) contours.push(cur);
  return contours;
}

const clipper = new ClipperLib.Clipper();
for (const g of placed) {
  for (const contour of flattenGlyph(g)) {
    clipper.AddPath(contour, ClipperLib.PolyType.ptSubject, true);
  }
}
const solution = new ClipperLib.Paths();
clipper.Execute(ClipperLib.ClipType.ctUnion, solution,
  ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
const lightened = ClipperLib.JS.Lighten(solution, LIGHTEN_TOL);
if (!lightened || lightened.length === 0) {
  console.error('[wordmark-build] clipper union produced no contours');
  process.exit(1);
}
console.log(`[wordmark-build] union: ${placed.reduce((n, g) => n + g.commands.length, 0)} commands → ${solution.length} contours → lightened ${lightened.length} contours, ${lightened.reduce((n, c) => n + c.length, 0)} pts`);

/* the ONE clean region — polygonal contours in viewBox space (÷CSCALE) */
const f1 = (v) => +(v / CSCALE).toFixed(1);
const unionD = lightened
  .map((contour) => {
    const pts = contour.map((p) => `${f1(p.X)} ${f1(p.Y)}`);
    return `M${pts[0]}L${pts.slice(1).join('L')}Z`;
  })
  .join('');

/* ── 5. the ONE full-cell-width sheet (every viewport) ─────────────── */
/* vbW = ink + 2·marginX · vbH = ink + 2·marginY; the svg spans the cell
 * width and its height follows the sheet aspect (viewBox scaling). */
const vbW = inkWComposed + 2 * SHEET_MARGIN_X;
const vbH = inkH + 2 * SHEET_MARGIN_Y;
const sheetD = unionD;
const sheetVb = `0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;
const svgH1440 = +(CELL_W_1440 / (vbW / vbH)).toFixed(1);
const inkW1440 = +(inkWComposed * (CELL_W_1440 / vbW)).toFixed(1);
const inkH1440 = +(inkH * (svgH1440 / vbH)).toFixed(1);

/* ── 6. emit the generated asset ───────────────────────────────────── */
const ts = `/* ═══════════════════════════════════════════════════════════════════
 * wordmark-art.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Generator: scripts/r318/wordmark-build.mjs (R318 §A6 → R319 §D1 —
 * commit both together; the generator is deterministic: same font +
 * same word ⇒ same bytes).
 *
 * The footer wordmark «مدارك» — Madarek's own name drawn in OUR display
 * font (Alexandria 700, the arabic subset fonts.css self-hosts), shaped
 * with harfbuzz (م initial CONNECTED into د final; ا/ر/ك isolated) and
 * emitted as ONE composed path for ONE full-cell-width sheet.
 *
 * R319 §D1 (the owner's top complaint): STROKE-ONLY OUTLINED letterforms
 * (fill:none; stroke:currentColor; ~1.7px non-scaling — landing.css)
 * spanning the FULL cell width at 1440/1024/768/390/360 (svg width:100%
 * + viewBox scaling; ink ${inkW1440}px = ${(inkW1440 / CELL_W_1440 * 100).toFixed(1)}% of the ${CELL_W_1440}px cell @1440 —
 * the reference's own ink spans 86% of its strip), with the R318 300u
 * construction track REMOVED (the owner read the tracked word as
 * letter-spaced disconnected letters — real Arabic shaping only). The
 * reading is carried by the svg's own text alternative
 * (role="img" + aria-label + <title> «مدارك») AND by OCR: tesseract
 * ara+eng reads the outlined word at the full-width scale (the R318
 * stroke-only failure was measured at the old 101.9px ink; the sweep:
 * audits/evidence/r319/landing/ocr-d1-matrix.md).
 *
 * The ONE sheet (every viewport): viewBox ${sheetVb} — ink + construction
 * margins ${SHEET_MARGIN_X}u x / ${SHEET_MARGIN_Y}u y → svg ≈ ${svgH1440}px tall @1440 ·
 * ${(982 / (vbW / vbH)).toFixed(1)} @1024 · ${(726 / (vbW / vbH)).toFixed(1)} @768 · ${(348 / (vbW / vbH)).toFixed(1)} @390 ·
 * ${(318 / (vbW / vbH)).toFixed(1)} @360; ink ${inkW1440}×${inkH1440}px @1440.
 * ═══════════════════════════════════════════════════════════════════ */

/* the full-cell-width sheet — viewBox ${sheetVb} */
export const WORDMARK_SHEET = {
  viewBox: '${sheetVb}',
  d: '${sheetD}',
} as const;
`;
fs.writeFileSync(OUT_TS, ts);
console.log(`[wordmark-build] wrote ${path.relative(ROOT, OUT_TS)} (${(ts.length / 1024).toFixed(1)}KB)`);
console.log(`[wordmark-build] SHEET  viewBox ${sheetVb} (aspect ${(vbW / vbH).toFixed(4)}) → svg ${CELL_W_1440}×${svgH1440}px @1440 · ink ${inkW1440}×${inkH1440}px (${(inkW1440 / CELL_W_1440 * 100).toFixed(1)}% of the cell, ${(inkW1440 / inkH1440).toFixed(2)}:1)`);
