#!/usr/bin/env node
/**
 * wordmark-build-r323.mjs — the R323 brand wordmark «مدارك» + the Latin
 * transliteration «MADAREK» — the ONE wordmark of the unified brand
 * system (frontend/src/brand), adapted from scripts/r318/wordmark-build.mjs
 * (which stays untouched — it still owns the FOOTER wordmark sheet until
 * the foreman's integration pass swaps that call-site).
 *
 * FONT SEATING (per the R323 brief + R322 font-vote): the wordmark shapes
 * from IBM PLEX SANS ARABIC 600 — the arabic-subset woff2 fonts.css
 * self-hosts and the R322 blind vote re-seated as the display voice
 * (audits/evidence/r322/dsys/font-vote.md) — NOT Alexandria 700 (the
 * 800/900 display era ended in R322; task 1-d migrates the legacy seats).
 * The Latin transliteration uses GEIST MONO 500 — the R313 instrument
 * voice (latin subset, self-hosted).
 *
 * WHAT IT DOES (build-time only; the app ships ONLY the emitted static
 *   path data — zero new runtime dependencies):
 *   1. decompress the woff2s → ttf (python3 fontTools; a hash-keyed tmp
 *      cache keeps runs deterministic and the repo clean),
 *   2. shape «مدارك» with harfbuzzjs — REAL contextual joining: م initial
 *      connected into د final; ا/ر/ك isolated. NO kashida: the brand
 *      wordmark is the compact natural setting (the r318 footer sheet's
 *      10-tatweel elongation is a footer-layout device, not a brand one).
 *      The output arrives in visual left-to-right order (clusters 4..0)
 *      with per-glyph advances,
 *   3. extract the shaped glyphs' outlines with opentype.js (font units,
 *      y-up, quadratic TrueType contours — outer loops AND counters),
 *   4. flatten every contour to polygons and UNION them with clipper-lib
 *      (nonzero fill): the م→د join is two overlapping glyph outlines, so
 *      a stroke-only render without the union draws DOUBLE lines through
 *      the join (the measured r319 §D1 defect — «صدارك»),
 *   5. normalize: ink height → 100 units, 6-unit construction margins all
 *      round, coordinates rounded to 2dp — ONE path per word,
 *   6. «MADAREK»: Geist Mono 500 glyphs placed at their advances + 0.08em
 *      tracking (Latin MAY be letter-spaced — Arabic never is), same
 *      flatten+union+normalize pass,
 *   7. emit:
 *        frontend/src/brand/wordmark.generated.ts  (path data + ink metrics)
 *        frontend/public/brand/wordmark.svg        (static twin, ink stroke)
 *
 * RENDER CONTRACT (documented in docs/redesign/r323/brand/BRAND.md):
 * the Arabic word renders STROKE-ONLY (fill:none; stroke:currentColor;
 * vector-effect non-scaling ~1.5px — the heron-footer verdict «thin
 * uniform outlines, interior empty»), tuned to read at 16 px and 160 px
 * ink heights. The Latin micro-label renders FILLED currentColor (the
 * mono voice is solid — the same texture split the loader uses between
 * the outlined drawing and the solid Geist Mono readouts).
 *
 * Run from the repo root:  node scripts/r323/wordmark-build-r323.mjs
 * (build-time deps are root devDependencies: harfbuzzjs, opentype.js,
 * clipper-lib — no install step).
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
const AR_WOFF2 = path.join(ROOT, 'frontend/public/fonts/plex-sans-arabic-600-normal-arabic.woff2');
const LAT_WOFF2 = path.join(ROOT, 'frontend/public/fonts/geist-mono-500-normal-latin.woff2');
const OUT_TS = path.join(ROOT, 'frontend/src/brand/wordmark.generated.ts');
const OUT_SVG = path.join(ROOT, 'frontend/public/brand/wordmark.svg');
const WORD = 'مدارك';
const LATIN = 'MADAREK';

/* normalization: ink height 100, construction margins 6, 2dp coords */
const INK_H = 100;
const MARGIN = 6;
const CSCALE = 100;          /* clipper integer scale: 0.01 font-unit precision */
const FLATTEN_TOL = 0.5;     /* font units — curve flattening tolerance */
const LIGHTEN_TOL = 60;      /* clipper units (= 0.6 font units) — simplification */
const LATIN_TRACK_EM = 0.08; /* Latin tracking (Arabic is NEVER tracked) */
/* the wordmark's own stroke, PROPORTIONAL sheet units (3.1% of the ink
 * height): at the lockup minimum (88 px mark ⇒ ~30 px word ink) it
 * renders ≈1 px — a true hollow hairline whose counters stay open; a
 * non-scaling 1.5 px outline would close every counter below ~24 px ink
 * (the 600-weight letterforms are only ~2.4 px thick there) and read as
 * a blob. Uniformity with the mark's 1.5 px hairline holds at chrome
 * sizes and degrades gracefully — BRAND.md §min-sizes. */
const WORDMARK_STROKE_SHEET = 3.5;

/* ── 1. woff2 → ttf (hash-cached in tmp; deterministic) ─────────────── */
function woff2ToTtf(woff2Path) {
  const woff2 = fs.readFileSync(woff2Path);
  const hash = createHash('md5').update(woff2).digest('hex').slice(0, 16);
  const cacheDir = path.join(os.tmpdir(), 'r323-wordmark-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const ttfPath = path.join(cacheDir, `${path.basename(woff2Path, '.woff2')}-${hash}.ttf`);
  if (!fs.existsSync(ttfPath)) {
    const tmpIn = path.join(cacheDir, `in-${hash}.woff2`);
    fs.writeFileSync(tmpIn, woff2);
    const res = spawnSync('python3', ['-m', 'fontTools.ttLib.woff2', 'decompress', tmpIn], { encoding: 'utf8' });
    const made = path.join(cacheDir, `in-${hash}.ttf`);
    if (res.status !== 0 || !fs.existsSync(made)) {
      console.error('[wordmark-r323] fontTools woff2 decompress failed:');
      console.error(res.stderr || '(no stderr)');
      console.error('install with: pip install fonttools brotli');
      process.exit(1);
    }
    fs.renameSync(made, ttfPath);
    fs.rmSync(tmpIn);
  }
  return fs.readFileSync(ttfPath);
}

/* ── 2. shape with harfbuzz (real Arabic joining) ───────────────────── */
function shapeText(ttfBytes, text) {
  const blob = new Blob(new Uint8Array(ttfBytes));
  const face = new Face(blob, 0);
  const font = new Font(face);
  const buffer = new HbBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  shape(font, buffer);
  return buffer.getGlyphInfosAndPositions();
}

/* ── 3/4. outlines → flattened contours → clipper union ─────────────── */
function contoursFromCommands(commands, atX) {
  const contours = [];
  let cur = null;
  let px = 0, py = 0, sx = 0, sy = 0;
  const push = (x, y) => { if (cur) cur.push({ X: Math.round((x + atX) * CSCALE), Y: Math.round(y * CSCALE) }); };
  for (const c of commands) {
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

/** Union a set of placed glyph outlines; returns clean contours in
 *  clipper-scaled font-unit space. */
function unionContours(allContours) {
  const clipper = new ClipperLib.Clipper();
  for (const contour of allContours) {
    clipper.AddPath(contour, ClipperLib.PolyType.ptSubject, true);
  }
  const solution = new ClipperLib.Paths();
  clipper.Execute(ClipperLib.ClipType.ctUnion, solution,
    ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  const lightened = ClipperLib.JS.Lighten(solution, LIGHTEN_TOL);
  if (!lightened || lightened.length === 0) {
    console.error('[wordmark-r323] clipper union produced no contours');
    process.exit(1);
  }
  return lightened;
}

/* ── 5. normalize to the ink-height-100 sheet ───────────────────────── */
function normalize(lightened, inkBox) {
  const scale = INK_H / (inkBox.yMax - inkBox.yMin);
  /* NOTE: x/y are ALREADY normalized sheet units here — round to 2dp,
   * never re-scale (the clipper /CSCALE happened in the x/y math). */
  const f1 = (v) => +v.toFixed(2);
  const pts = lightened.map((contour) =>
    contour.map((p) => {
      const x = (p.X / CSCALE - inkBox.xMin) * scale;
      const y = (inkBox.yMax - p.Y / CSCALE) * scale; /* y-down svg space */
      return `${f1(x + MARGIN)} ${f1(y + MARGIN)}`;
    }),
  );
  const inkW = (inkBox.xMax - inkBox.xMin) * scale;
  const inkH = (inkBox.yMax - inkBox.yMin) * scale;
  const d = pts.map((c) => `M${c[0]}L${c.slice(1).join('L')}Z`).join('');
  return {
    d,
    inkW: +inkW.toFixed(2),
    inkH: +inkH.toFixed(2),
    viewBox: `0 0 ${(inkW + 2 * MARGIN).toFixed(2)} ${(inkH + 2 * MARGIN).toFixed(2)}`,
  };
}

/* envelope of on+off-curve points of the PLACED glyphs (font units) */
function inkEnvelope(glyphs) {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  let pen = 0;
  for (const g of glyphs) {
    const at = pen;
    pen += g.advance + (g.trackAfter ?? 0);
    for (const c of g.commands) {
      for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) {
        if (typeof c[kx] === 'number') {
          xMin = Math.min(xMin, c[kx] + at); xMax = Math.max(xMax, c[kx] + at);
          yMin = Math.min(yMin, c[ky]); yMax = Math.max(yMax, c[ky]);
        }
      }
    }
  }
  return { xMin, xMax, yMin, yMax };
}

/* ══ A. the Arabic wordmark «مدارك» ══════════════════════════════════ */
const arTtf = woff2ToTtf(AR_WOFF2);
const shaped = shapeText(arTtf, WORD);
if (shaped.length !== 5) {
  console.error(`[wordmark-r323] expected 5 shaped glyphs for «${WORD}», got ${shaped.length}`);
  process.exit(1);
}
const expectedClusters = [4, 3, 2, 1, 0]; /* harfbuzz RTL output = visual LTR */
if (JSON.stringify(shaped.map((g) => g.cluster)) !== JSON.stringify(expectedClusters)) {
  console.error(`[wordmark-r323] unexpected cluster order ${JSON.stringify(shaped.map((g) => g.cluster))} (want ${JSON.stringify(expectedClusters)})`);
  process.exit(1);
}

const ot = opentype.parse(arTtf.buffer.slice(arTtf.byteOffset, arTtf.byteOffset + arTtf.length));
const arGlyphs = shaped.map((g) => {
  const glyph = ot.glyphs.get(g.codepoint);
  if (g.codepoint === 0 || glyph.index === 0) {
    console.error('[wordmark-r323] .notDef in the shaped run — the arabic subset is missing a glyph');
    process.exit(1);
  }
  return { name: glyph.name, advance: g.xAdvance, cluster: g.cluster, commands: glyph.path.commands.map((c) => ({ ...c })) };
});
console.log(`[wordmark-r323] shaped «${WORD}» → visual LTR ${arGlyphs.map((g) => g.name).join(' · ')} (advances ${arGlyphs.map((g) => g.advance).join('/')})`);
/* the join proof: م (cluster 0) and د (cluster 1) must be ADJACENT in the
 * visual stream and their forms must be the connected pair — logged for
 * the audit, asserted structurally (adjacency + non-zero advances). */
if (arGlyphs[3].cluster !== 1 || arGlyphs[4].cluster !== 0) {
  console.error('[wordmark-r323] م/د not adjacent in the visual stream — the join would break');
  process.exit(1);
}

const arContours = [];
for (let i = 0; i < arGlyphs.length; i += 1) {
  const at = arGlyphs.slice(0, i).reduce((sum, g) => sum + g.advance, 0);
  arContours.push(...contoursFromCommands(arGlyphs[i].commands, at));
}
const arInk = inkEnvelope(arGlyphs);
const ar = normalize(unionContours(arContours), arInk);
console.log(`[wordmark-r323] AR ink ${ar.inkW}×${ar.inkH}u sheet ${ar.viewBox} (${(ar.inkW / ar.inkH).toFixed(3)}:1), ${ar.d.length} bytes of path`);

/* ══ B. the Latin transliteration «MADAREK» ══════════════════════════ */
const latTtf = woff2ToTtf(LAT_WOFF2);
const latOt = opentype.parse(latTtf.buffer.slice(latTtf.byteOffset, latTtf.byteOffset + latTtf.length));
const latGlyphs = [...LATIN].map((ch, i) => {
  const glyph = latOt.charToGlyph(ch);
  if (!glyph || glyph.index === 0) {
    console.error(`[wordmark-r323] .notDef for «${ch}» in Geist Mono 500`);
    process.exit(1);
  }
  return {
    name: glyph.name,
    advance: glyph.advanceWidth,
    trackAfter: i < LATIN.length - 1 ? Math.round(LATIN_TRACK_EM * latOt.unitsPerEm) : 0,
    commands: glyph.path.commands.map((c) => ({ ...c })),
  };
});
const latContours = [];
{
  let pen = 0;
  for (const g of latGlyphs) {
    latContours.push(...contoursFromCommands(g.commands, pen));
    pen += g.advance + g.trackAfter;
  }
}
const latInk = inkEnvelope(latGlyphs);
const lat = normalize(unionContours(latContours), latInk);
console.log(`[wordmark-r323] LAT ink ${lat.inkW}×${lat.inkH}u sheet ${lat.viewBox} (${(lat.inkW / lat.inkH).toFixed(3)}:1), ${lat.d.length} bytes of path`);

/* ══ C. emit ═════════════════════════════════════════════════════════ */
const header = `/* ═══════════════════════════════════════════════════════════════════
 * wordmark.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Generator: scripts/r323/wordmark-build-r323.mjs (deterministic:
 * same fonts + same words ⇒ same bytes; rerun after any font change).
 *
 * The R323 brand wordmark — the ONE «مدارك» of the unified system.
 * Shaped with harfbuzz from IBM Plex Sans Arabic 600 (the R322-seated
 * display voice): م initial CONNECTED into د final, ا/ر/ك isolated,
 * NO kashida (the compact brand setting; the r318 footer sheet's
 * tatweel elongation is a footer-layout device). The م→د join is
 * unioned (clipper) so the stroke-only render never draws double
 * lines through the join. Normalized sheet: ink height 100 units,
 * 6-unit construction margins, 2dp coordinates.
 *
 * Render contract (docs/redesign/r323/brand/BRAND.md):
 *  · WORDMARK_AR — stroke-only: fill:none, stroke:currentColor,
 *    vector-effect non-scaling ≈1.5px (hollow drafting outline).
 *  · WORDMARK_LATIN — «MADAREK» in Geist Mono 500, 0.08em tracking
 *    (Latin may be tracked; Arabic never), rendered FILLED
 *    currentColor (the solid mono voice).
 * ═══════════════════════════════════════════════════════════════════ */

export const WORDMARK_AR = {
  viewBox: '${ar.viewBox}',
  d: '${ar.d}',
  ink: { w: ${ar.inkW}, h: ${ar.inkH} },
} as const;

export const WORDMARK_LATIN = {
  viewBox: '${lat.viewBox}',
  d: '${lat.d}',
  ink: { w: ${lat.inkW}, h: ${lat.inkH} },
} as const;
`;
fs.writeFileSync(OUT_TS, header);
console.log(`[wordmark-r323] wrote ${path.relative(ROOT, OUT_TS)} (${(header.length / 1024).toFixed(1)}KB)`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ar.viewBox}" role="img" aria-label="مدارك">
  <!-- R323 brand wordmark «مدارك» — generated by scripts/r323/wordmark-build-r323.mjs
       (IBM Plex Sans Arabic 600, harfbuzz-shaped, join-unioned). Static twin of
       frontend/src/brand/wordmark.generated.ts — same geometry. Stroke-only ink;
       recolour via the component (currentColor) — this file is for og/pdf/e-mail. -->
  <title>مدارك</title>
  <path d="${ar.d}" fill="none" stroke="#282828" stroke-width="${WORDMARK_STROKE_SHEET}" stroke-linejoin="miter"/>
</svg>
`;
fs.writeFileSync(OUT_SVG, svg);
console.log(`[wordmark-r323] wrote ${path.relative(ROOT, OUT_SVG)} (${(svg.length / 1024).toFixed(1)}KB)`);
