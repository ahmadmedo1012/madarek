/**
 * 16-E9 — utils/numbers.ts pins (15-h P1-3 / D16-2 numeral unification;
 * r197 re-key per BLUEPRINT §7).
 *
 * Wave 16 unified every surface on one helper; r197 re-keys its OUTPUT
 * convention. The ar-LY CLDR pattern (dot thousands grouping «2.340»,
 * comma decimal «3,40») read as 2.34 and 340 to the Libyan audience —
 * the walkthrough's measured defects (BLUEPRINT §11: «3,40», «2.340»,
 * «1,0», «61.818…%») were separator ambiguity, not digit shapes. The
 * formatter now emits the Western convention — Latin digits, comma
 * grouping, dot decimal — through the same ar-LY-u-nu-latn locale chain.
 * These pins make the new convention a contract:
 *  - the exact glyph shapes: grouping comma, decimal dot, Latin digits;
 *  - the negative pattern (the sign rides the digits; ar-LY's LRM guard
 *    is preserved by the locale chain — the RTL-side sign placement is
 *    ICU's, not ours to re-derive);
 *  - option pass-through + the r197 explicit fraction-digit helpers
 *    (formatInt / formatPct1) that killed the min-fraction artifacts
 *    («3,40» → «3.4», «1,0» → «1») and the float-noise spray
 *    («61.81818181818181%» → «61.8%»);
 *  - the input pipeline (Arabic-Indic digits sanitized via toWestern,
 *    garbage → '' rather than a rendered "NaN").
 *
 * Date/time fixtures are pinned at noon UTC so the calendar day is
 * stable for any |UTC offset| ≤ 12 h (the suite runs with TZ=UTC).
 * Dates deliberately KEEP the ar-LY pattern (Arabic month names, Latin
 * digits) — «12 مارس 2025» has no separator ambiguity.
 */
import { describe, expect, it } from 'vitest';
import {
  formatInt,
  formatNum,
  formatPct1,
  formatDate,
  formatTime,
  toWestern,
} from '../../src/utils/numbers';

const NOON = '2026-03-05T12:00:00Z'; // a Thursday, noon UTC

describe('formatNum (r197 Western-separator convention, BLUEPRINT §7)', () => {
  it('formats with comma thousands grouping and a dot decimal', () => {
    expect(formatNum(1234567.5)).toBe('1,234,567.5');
  });

  it('groups exactly at the thousands boundaries', () => {
    expect(formatNum(999)).toBe('999');
    expect(formatNum(1000)).toBe('1,000');
    expect(formatNum(2340)).toBe('2,340'); // the walkthrough's «2.340» XP defect, fixed
  });

  it('renders zero and bare decimals with the dot', () => {
    expect(formatNum(0)).toBe('0');
    expect(formatNum(0.5)).toBe('0.5');
    expect(formatNum(12.75)).toBe('12.75');
  });

  it('renders negatives with the sign on the digits (locale LRM preserved)', () => {
    expect(formatNum(-1234.5)).toBe('\u200E-1,234.5');
    expect(formatNum(-0.25)).toBe('\u200E-0.25');
  });

  it('rounds decimals per the passed options', () => {
    expect(formatNum(3.756, { maximumFractionDigits: 2 })).toBe('3.76');
    expect(formatNum(2.5, { maximumFractionDigits: 0 })).toBe('3'); // ICU half-up
    expect(formatNum(1234567.891, { maximumFractionDigits: 2 })).toBe('1,234,567.89');
  });

  it('pads fraction digits per minimumFractionDigits (GPA / animated-stat shapes)', () => {
    expect(formatNum(3.75, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe('3.75');
    expect(formatNum(3, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe('3.00');
    expect(formatNum(94.2, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('94.2');
  });

  it('defaults to ≤3 fraction digits — no CLDR-default float spray', () => {
    expect(formatNum(61.81818181818181)).toBe('61.818');
  });

  it('emits Latin digits only — never Arabic-Indic (D16-2)', () => {
    for (const n of [0, 7, 2340, 1_234_567.5, -1234.5]) {
      expect(formatNum(n)).not.toMatch(/[٠-٩]/);
    }
  });
});

describe('r197 helpers — the measured-defect fixes (BLUEPRINT §7/§11)', () => {
  it('formatInt: integers with grouping, no fraction artifacts («1,0» → «1»)', () => {
    expect(formatInt(1)).toBe('1');
    expect(formatInt(2340)).toBe('2,340');
    expect(formatInt(7.9)).toBe('8');
  });

  it('formatPct1: percent values round to one decimal («61.818…%» → «61.8»)', () => {
    expect(formatPct1(68 / 110 * 100)).toBe('61.8');
    expect(formatPct1(100)).toBe('100');
    expect(formatPct1(0)).toBe('0');
    expect(formatPct1(null)).toBe('');
    expect(formatPct1(undefined)).toBe('');
  });

  it('the GPA shape: no forced minimum («3,40» → «3.4»)', () => {
    expect(formatNum(3.4, { maximumFractionDigits: 2 })).toBe('3.4');
    expect(formatNum(3.75, { maximumFractionDigits: 2 })).toBe('3.75');
  });
});

describe('formatNum input pipeline', () => {
  it('parses numeric strings', () => {
    expect(formatNum('1234')).toBe('1,234');
  });

  it('sanitizes Arabic-Indic digit strings via toWestern', () => {
    expect(formatNum('١٢٣٤')).toBe('1,234');
  });

  it('returns "" for garbage and NaN rather than rendering "NaN"', () => {
    expect(formatNum('abc')).toBe('');
    expect(formatNum('')).toBe('');
    expect(formatNum(NaN)).toBe('');
  });
});

describe('toWestern (input sanitizing)', () => {
  it('maps every Arabic-Indic digit to its Latin counterpart', () => {
    expect(toWestern('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('passes numbers and digit-free strings through untouched', () => {
    expect(toWestern(123)).toBe('123');
    expect(toWestern('مارس')).toBe('مارس');
    expect(toWestern('')).toBe('');
  });
});

describe('formatDate / formatTime (same file, Latin-digit pins)', () => {
  it('formatDate renders Arabic month names with Latin digits', () => {
    expect(formatDate(NOON, { day: 'numeric', month: 'long', year: 'numeric' })).toBe('5 مارس 2026');
  });

  it('formatTime renders the Arabic meridiem with Latin digits', () => {
    expect(formatTime('2026-03-05T14:30:00Z', { hour: 'numeric', minute: '2-digit' })).toBe('2:30 م');
  });

  it('both return "" for invalid dates instead of throwing', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatTime('not-a-date')).toBe('');
  });
});
