/**
 * gate-helpers.test.mjs — R318 §B — unit cover for the defect gate's PURE
 * math (scripts/r318/gate-lib.mjs, imported by relative path — the same
 * module the gate itself runs, so tests and gate can never drift).
 *
 * Scope is the pure helpers ONLY: WCAG contrast math, RTL-aware gap
 * geometry, alpha compositing, and Arabic OCR normalization. The
 * WordReveal component test is owned by the C1-W agent (different file).
 */
import { describe, expect, it } from 'vitest';
import {
  compositeOver,
  contrastRatio,
  containsWordmark,
  lineOverlapRatio,
  normWs,
  normalizeArabic,
  parseColor,
  rectsIntersectArea,
  relativeLuminance,
  requiredRatio,
  resolveBackdrop,
  visualGap,
} from '../../../../scripts/r318/gate-lib.mjs';

/* مدارك in Arabic presentation forms (what OCR often emits):
 * م initial \uFEE3 · د final \uFEAA · ا isolated \uFE8D ·
 * ر isolated \uFEAE · ك isolated \uFED9 — NFKC folds all to base letters. */
const WORDMARK_PF = '\uFEE3\uFEAA\uFE8D\uFEAE\uFED9';

describe('parseColor — Chrome computed-value formats', () => {
  it('parses rgb()/rgba() and transparent', () => {
    expect(parseColor('rgb(40, 40, 40)')).toEqual({ r: 40, g: 40, b: 40, a: 1 });
    expect(parseColor('rgba(1, 2, 3, 0.5)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('parses color(srgb …) — the computed form of color-mix()', () => {
    const red = parseColor('color(srgb 1 0 0 / 0.3)');
    expect(red.r).toBeCloseTo(255, 4);
    expect(red.g).toBe(0);
    expect(red.b).toBe(0);
    expect(red.a).toBeCloseTo(0.3, 6);
    const pale = parseColor('color(srgb 0.93725 0.93725 0.93725)');
    expect(pale.r).toBeCloseTo(239, 1);
    expect(pale.a).toBe(1);
  });

  it('parses legacy hex (3/6/8) and rejects unknown formats honestly', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#404040')).toEqual({ r: 64, g: 64, b: 64, a: 1 });
    const semi = parseColor('#40404080');
    expect([semi.r, semi.g, semi.b]).toEqual([64, 64, 64]);
    expect(semi.a).toBeCloseTo(128 / 255, 6);
    expect(parseColor('oklch(0.5 0.1 200)')).toBeNull(); // gate skips + counts, never guesses
  });
});

describe('WCAG contrast math', () => {
  it('black-on-white is exactly 21:1', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 2);
  });

  it('the measured §A9 seat — white on rgb(239,239,239) — near the probe’s ~1.17:1', () => {
    const ratio = contrastRatio({ r: 255, g: 255, b: 255 }, { r: 239, g: 239, b: 239 });
    expect(ratio).toBeGreaterThan(1.1); // ≈1.15 — hard FAIL against 4.5:1
    expect(ratio).toBeLessThan(1.2);
  });

  it('the measured §A2 seat — rgb(65,65,64) on rgb(40,40,40) — far below 4.5:1', () => {
    const ratio = contrastRatio({ r: 65, g: 65, b: 64 }, { r: 40, g: 40, b: 40 });
    expect(ratio).toBeGreaterThan(1); // ≈1.44 — dark ink on a dark card
    expect(ratio).toBeLessThan(4.5);
  });

  it('thresholds: <24px needs 4.5:1, ≥24px needs 3:1', () => {
    expect(requiredRatio(23.99)).toBe(4.5);
    expect(requiredRatio(24)).toBe(3);
  });

  it('relative luminance endpoints', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 6);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 6);
  });
});

describe('alpha compositing + backdrop resolution', () => {
  it('composites a translucent fg over an opaque bg', () => {
    const c = compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
    expect([c.r, c.g, c.b]).toEqual([127.5, 127.5, 127.5]);
  });

  it('first OPAQUE ancestor wins; translucent layers above it composite over it', () => {
    const chain = ['rgba(0, 0, 0, 0.2)', 'rgba(255, 255, 255, 0.5)', 'rgb(100, 100, 100)'];
    // 0.5·white over 100 → 177.5; then 0.2·black over 177.5 → 142
    const bg = resolveBackdrop(chain);
    expect(bg.r).toBeCloseTo(142, 4);
    expect(bg.g).toBeCloseTo(142, 4);
    expect(bg.a).toBe(1);
  });

  it('falls back to the white browser canvas when nothing is opaque', () => {
    expect(resolveBackdrop(['rgba(0, 0, 0, 0.3)'])).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(resolveBackdrop([])).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('returns null (skip+count) when a layer that matters is unparseable', () => {
    expect(resolveBackdrop(['oklch(0.5 0.1 20)', 'rgb(0, 0, 0)'])).toBeNull();
  });
});

describe('RTL-aware word-gap geometry', () => {
  const rtlA = { x: 300, y: 10, width: 50, height: 20 };
  const rtlB = { x: 222.5, y: 10, width: 50, height: 20 }; // 27.5px to the LEFT of A

  it('RTL: the DOM-ordered pair A,B has gap A.left − B.right', () => {
    expect(visualGap(rtlA, rtlB, 'rtl')).toBeCloseTo(27.5, 6);
  });

  it('the naive LTR formula reports the wrong sign on the same RTL rects', () => {
    expect(visualGap(rtlA, rtlB, 'ltr')).toBeCloseTo(222.5 - 350, 6); // −127.5 — a glued-looking false alarm
  });

  it('LTR: gap is B.left − A.right', () => {
    const a = { x: 10, y: 0, width: 30, height: 20 };
    const b = { x: 44, y: 0, width: 30, height: 20 };
    expect(visualGap(a, b, 'ltr')).toBe(4);
  });

  it('glued spans measure exactly 0 in both directions', () => {
    const a = { x: 10, y: 0, width: 30, height: 20 };
    const b = { x: 40, y: 0, width: 30, height: 20 };
    expect(visualGap(a, b, 'ltr')).toBe(0);
    const aR = { x: 40, y: 0, width: 30, height: 20 };
    const bR = { x: 10, y: 0, width: 30, height: 20 };
    expect(visualGap(aR, bR, 'rtl')).toBe(0);
  });

  it('wrapped pairs (different lines) are never spacing pairs', () => {
    const line1 = { x: 0, y: 0, width: 300, height: 20 };
    const line2 = { x: 250, y: 22, width: 50, height: 20 };
    expect(lineOverlapRatio(line1, line2)).toBeLessThan(0.5);
    expect(lineOverlapRatio(line1, { x: 0, y: 2, width: 50, height: 20 })).toBeGreaterThan(0.5);
  });

  it('rect intersection area (>2px² is a gate failure)', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectsIntersectArea(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(25);
    expect(rectsIntersectArea(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(0);
  });
});

describe('Arabic OCR normalization', () => {
  it('folds presentation forms onto base letters (NFKC) so OCR glyphs compare', () => {
    expect(normalizeArabic(WORDMARK_PF)).toBe('مدارك');
  });

  it('strips spaces, diacritics and tatweel before comparing', () => {
    expect(normalizeArabic('مـ دَ ا رَ كـ')).toBe('مدارك');
    expect(normalizeArabic('م\u064Bدارك')).toBe('مدارك'); // fathan on م
  });

  it('drops latin/punctuation noise and keeps only Arabic letters', () => {
    expect(normalizeArabic('MADAREK مدارك — 2026')).toBe('مدارك');
  });

  it('containsWordmark accepts spaced/presentation OCR output and rejects misses', () => {
    expect(containsWordmark('م د ا ر ك')).toBe(true);
    expect(containsWordmark(WORDMARK_PF)).toBe(true);
    expect(containsWordmark('المدارك')).toBe(true); // containment — prefixes survive
    expect(containsWordmark('مراك')).toBe(false);
    expect(containsWordmark('مدراك')).toBe(false); // wrong letter order is a real miss
    expect(containsWordmark('')).toBe(false);
  });
});

describe('normWs — whitespace-normalized comparisons', () => {
  it('collapses runs of whitespace for aria/text equality', () => {
    expect(normWs('  منصّة   واحدة  ')).toBe('منصّة واحدة');
    expect(normWs(null)).toBe('');
  });
});
