import { describe, expect, it } from 'vitest';
import { gateCollegeAccent, __test__ } from '../../src/lib/theme';

const { parseHex, contrastRatio } = __test__;

describe('parseHex', () => {
  it('parses 6-digit hex with leading #', () => {
    expect(parseHex('#3B5BDB')).toEqual({ r: 0x3b, g: 0x5b, b: 0xdb });
  });
  it('parses 6-digit hex without leading #', () => {
    expect(parseHex('3B5BDB')).toEqual({ r: 0x3b, g: 0x5b, b: 0xdb });
  });
  it('parses 3-digit hex shorthand', () => {
    expect(parseHex('#3bd')).toEqual({ r: 0x33, g: 0xbb, b: 0xdd });
  });
  it('rejects malformed input', () => {
    expect(parseHex('not a hex')).toBeNull();
    expect(parseHex('#GGGGGG')).toBeNull();
    expect(parseHex('#1234')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('returns ≈21 for black-on-white', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
  });
  it('returns 1 for identical colours', () => {
    const c = { r: 100, g: 100, b: 100 };
    expect(contrastRatio(c, c)).toBe(1);
  });
});

describe('gateCollegeAccent', () => {
  it('returns the original hex when contrast against light chrome passes', () => {
    // A deep saturated colour that easily clears AA against a cream
    // background AND against ink-black foreground.
    expect(gateCollegeAccent('#A33A4F', 'light')).toBe('#A33A4F');
  });

  it('returns null when contrast against light chrome fails', () => {
    // A near-white colour will fail against the cream background
    // (low contrast) — the gate must reject it so the caller can
    // fall back to var(--role-accent).
    expect(gateCollegeAccent('#FBFAF9', 'light')).toBeNull();
  });

  it('returns null on invalid hex input', () => {
    expect(gateCollegeAccent('not-a-colour', 'light')).toBeNull();
    expect(gateCollegeAccent('#GG0000', 'light')).toBeNull();
  });

  it('respects the dark surface when surface="dark"', () => {
    // A near-black hex fails the dark surface gate (low contrast vs
    // dark chrome bg), but a vivid mid-tone passes.
    expect(gateCollegeAccent('#0A0A0A', 'dark')).toBeNull();
    expect(gateCollegeAccent('#3CC2B0', 'dark')).toBe('#3CC2B0');
  });

  it('honours a custom threshold', () => {
    // Mid-grey clears 3.0 against light fg, fails 7.0.
    expect(gateCollegeAccent('#666666', 'light', 3.0)).toBe('#666666');
    expect(gateCollegeAccent('#666666', 'light', 7.0)).toBeNull();
  });

  it('normalises hex without a leading hash', () => {
    expect(gateCollegeAccent('A33A4F', 'light')).toBe('#A33A4F');
  });
});
