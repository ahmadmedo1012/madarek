/**
 * gate-lib.mjs — R318 §B — the defect gate's PURE math, shared by two
 * consumers so the gate and its unit tests can never drift:
 *
 *   · scripts/r318/defect-gate.mjs      (the gate itself, Node ESM)
 *   · frontend/src/__tests__/r318/*.test.mjs (Vitest — pure helpers ONLY)
 *
 * No DOM, no Node APIs in here — every function is a pure transform so
 * jsdom tests cover the real gate arithmetic (WCAG contrast, RTL gap
 * geometry, alpha compositing, Arabic OCR normalization).
 */

/* ── CSS color parsing ────────────────────────────────────────────────
 * Chrome's computed styles for this app arrive as: rgb(r, g, b) ·
 * rgba(r, g, b, a) · color(srgb r g b / a) (the computed form of
 * color-mix()) · transparent · legacy hex. Anything else (oklch etc.)
 * returns null and the gate SKIPS the node, counting it honestly
 * instead of guessing. */

const RE_RGB = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/;
const RE_COLOR_SRGB = /^color\(srgb\s+([\d.]+)(?:\s+|%)([\d.]+)(?:\s+|%)([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/;
const RE_HEX = /^#([0-9a-f]{3,8})$/i;

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Parse a computed CSS color string → { r, g, b, a } (0..255, a 0..1) or
 * null when the format is unknown to the gate (caller must skip+count).
 */
export function parseColor(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const hex = RE_HEX.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }
  const isSrgbFn = RE_COLOR_SRGB.test(s);
  const m = RE_RGB.exec(s) ?? RE_COLOR_SRGB.exec(s);
  if (!m) return null;
  const parts = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  if (parts.some((n) => Number.isNaN(n))) return null;
  // color(srgb …) channels are 0..1 floats (×255); rgb()/rgba()
  // channels already arrive as 0..255.
  const chan = (c) => Math.min(255, Math.max(0, isSrgbFn ? c * 255 : c));
  return {
    r: chan(parts[0]),
    g: chan(parts[1]),
    b: chan(parts[2]),
    a: clamp01(parts[3]),
  };
}

/** Composite a (possibly translucent) fg over an opaque bg → opaque RGB. */
export function compositeOver(fg, bg) {
  const a = clamp01(fg.a ?? 1);
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

/** WCAG relative luminance of an sRGB color. */
export function relativeLuminance({ r, g, b }) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio of two opaque colors (1..21). */
export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** The required ratio at a font size: <24px → 4.5:1, ≥24px → 3:1. */
export function requiredRatio(fontSizePx) {
  return fontSizePx >= 24 ? 3 : 4.5;
}

/**
 * Resolve the effective backdrop behind a text node.
 *
 * `chain` is the ancestor background-color list in DOM order, [0] = the
 * text element's own background, walking up. The first OPAQUE color
 * wins as the base (per the §B contract); every translucent color
 * above it composites over the layer beneath, nearest first. When no
 * opaque layer exists at all the browser canvas (white) is the base.
 * Returns the opaque backdrop {r,g,b,a:1}, or null if any layer that
 * MATTERS (below/at the opaque base) is unparseable — the caller then
 * skips the node and counts it instead of guessing.
 */
export function resolveBackdrop(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return { r: 255, g: 255, b: 255, a: 1 };
  let baseIdx = -1;
  for (let i = 0; i < chain.length; i += 1) {
    const c = parseColor(chain[i]);
    if (!c) return null; // unknown format somewhere that matters
    if (c.a >= 1) { baseIdx = i; break; }
  }
  if (baseIdx === -1) return { r: 255, g: 255, b: 255, a: 1 };
  let acc = parseColor(chain[baseIdx]);
  for (let i = baseIdx - 1; i >= 0; i -= 1) {
    acc = compositeOver(parseColor(chain[i]), acc);
  }
  return acc;
}

/* ── RTL-aware word-gap geometry ──────────────────────────────────────
 * In RTL, consecutive inline spans flow right→left: for the DOM-order
 * pair A-then-B the visual gap is A.left − B.right (NOT B.left −
 * A.right — that sign is the LTR rule). */

/**
 * The signed visual gap in px between two rects in DOM order (A laid
 * out before B). Positive = separated; 0 = glued; negative = overlap.
 */
export function visualGap(rectA, rectB, direction) {
  if (direction === 'rtl') return rectA.x - (rectB.x + rectB.width);
  return rectB.x - (rectA.x + rectA.width);
}

/**
 * How much two rects share vertically (0..1) — a same-line check so a
 * wrapped pair (last word of line n, first word of line n+1) is never
 * measured as a "gap" in either direction.
 */
export function lineOverlapRatio(rectA, rectB) {
  const top = Math.max(rectA.y, rectB.y);
  const bottom = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);
  const shared = Math.max(0, bottom - top);
  const minH = Math.max(1e-6, Math.min(rectA.height, rectB.height));
  return shared / minH;
}

/** Intersection area of two rects (px²) — 0 when disjoint. */
export function rectsIntersectArea(a, b) {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/* ── Arabic OCR normalization ─────────────────────────────────────────
 * Tesseract on the drafted wordmark returns presentation forms,
 * diacritics, tatweels and stray joins. Before comparing against
 * «مدارك»: NFKC (folds ﻣ ﻤ … presentation forms onto the base
 * letters), then strip EVERYTHING that is not an Arabic letter. */

const AR_LETTER = /[\u0621-\u063A\u0641-\u064A\u0671-\u06D3]/;

/**
 * Normalize an OCR/expected string for wordmark comparison: NFKC,
 * diacritics + tatweel + direction marks + spaces + non-Arabic noise
 * stripped; only Arabic letters survive.
 */
export function normalizeArabic(text) {
  if (typeof text !== 'string') return '';
  let out = text.normalize('NFKC');
  // strip harakat, shadda, sukun, Quranic marks, tatweel, bidi controls
  out = out.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200B-\u200F\u202A-\u202E\u2066-\u2069\u061C]/g, '');
  // keep Arabic letters only (dropping latin/punct/space noise)
  out = [...out].filter((ch) => AR_LETTER.test(ch)).join('');
  return out;
}

/** Does OCR output contain the wordmark «مدارك» after normalization? */
export function containsWordmark(ocrText) {
  return normalizeArabic(ocrText).includes(normalizeArabic('مدارك'));
}

/** Whitespace-normalize for aria/text comparisons (any lang). */
export function normWs(s) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}
