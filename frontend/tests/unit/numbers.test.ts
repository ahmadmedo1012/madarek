/**
 * 16-E9 — utils/numbers.ts pins (15-h P1-3 / D16-2 numeral unification).
 *
 * formatNum used to format en-US (`1,234,567.5`) while ~60 sibling
 * surfaces called `toLocaleString('ar-LY')` (`1.234.567,5`) — the SAME
 * metric (totalXp on the colleges leaderboard vs the self-development
 * leaderboard) rendered with different separators on sibling pages.
 * Wave 16 unified everything on ar-LY (CLDR: latn digits, dot thousands
 * grouping, comma decimal). These pins make the convention a contract:
 *  - the exact glyph shapes: grouping dot, decimal comma, Latin digits;
 *  - the negative pattern incl. CLDR's leading LRM (U+200E), ICU's
 *    protection that keeps the minus on the correct side under RTL —
 *    it is locale data, not a stray control character, and must survive
 *    refactors (the 15-j source sweep polices stray controls in
 *    literals; this one is runtime output, and deliberate);
 *  - option pass-through (fraction digits for the CollegePages GPA
 *    column and the animated dashboard stats);
 *  - byte-equivalence with `n.toLocaleString('ar-LY')` so formatNum can
 *    never drift from the majority surfaces again;
 *  - the input pipeline (Arabic-Indic digits sanitized via toWestern,
 *    garbage → '' rather than a rendered "NaN").
 *
 * Date/time fixtures are pinned at noon UTC so the calendar day is
 * stable for any |UTC offset| ≤ 12 h (the suite runs with TZ=UTC).
 */
import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatNum,
  formatTime,
  toWestern,
} from '../../src/utils/numbers';

const NOON = '2026-03-05T12:00:00Z'; // a Thursday, noon UTC

describe('formatNum (ar-LY unified convention, 15-h P1-3 / D16-2)', () => {
  it('formats with dot thousands grouping and a comma decimal', () => {
    expect(formatNum(1234567.5)).toBe('1.234.567,5');
  });

  it('groups exactly at the thousands boundaries', () => {
    expect(formatNum(999)).toBe('999');
    expect(formatNum(1000)).toBe('1.000');
    expect(formatNum(1250)).toBe('1.250'); // the CollegePages leaderboard value from the audit
  });

  it('renders zero and bare decimals with the comma', () => {
    expect(formatNum(0)).toBe('0');
    expect(formatNum(0.5)).toBe('0,5');
    expect(formatNum(12.75)).toBe('12,75');
  });

  it('renders negatives with CLDR’s LRM-guarded minus (kept deliberately)', () => {
    // The leading U+200E is part of ar-LY's negative pattern: it keeps
    // the minus sign on the correct side of the digits under RTL.
    expect(formatNum(-1234.5)).toBe('\u200E-1.234,5');
    expect(formatNum(-0.25)).toBe('\u200E-0,25');
  });

  it('rounds decimals per the passed options', () => {
    expect(formatNum(3.756, { maximumFractionDigits: 2 })).toBe('3,76');
    expect(formatNum(2.5, { maximumFractionDigits: 0 })).toBe('3'); // ICU half-up
    expect(formatNum(1234567.891, { maximumFractionDigits: 2 })).toBe('1.234.567,89');
  });

  it('pads fraction digits per minimumFractionDigits (GPA / animated-stat shapes)', () => {
    // The CollegePages avgGpa column (16-E9 one-line switch).
    expect(formatNum(3.75, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe('3,75');
    expect(formatNum(3, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe('3,00');
    // The DashboardPage CountIn shape (one decimal for fractional stats).
    expect(formatNum(94.2, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe('94,2');
  });

  it('is byte-identical to the majority toLocaleString("ar-LY") surfaces', () => {
    // The whole point of P1-3: whatever a direct surface renders, the
    // unified helper renders exactly the same string — no drift, ever.
    const values = [0, 7, 999, 1000, 1250, 48_210, 1_234_567.5, 0.5, 12.75, -1234.5];
    for (const n of values) {
      expect(formatNum(n)).toBe(n.toLocaleString('ar-LY'));
    }
  });

  it('emits Latin digits only — never Arabic-Indic (D16-2)', () => {
    for (const n of [0, 7, 1250, 1_234_567.5, -1234.5]) {
      expect(formatNum(n)).not.toMatch(/[٠-٩]/);
    }
  });
});

describe('formatNum input pipeline', () => {
  it('parses numeric strings', () => {
    expect(formatNum('1234')).toBe('1.234');
  });

  it('sanitizes Arabic-Indic digit strings via toWestern', () => {
    expect(formatNum('١٢٣٤')).toBe('1.234');
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
