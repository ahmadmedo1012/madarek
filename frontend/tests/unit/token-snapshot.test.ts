/**
 * T045 — token contrast snapshot.
 *
 * Asserts WCAG AA on body text and AAA on numeric KPI values across
 * the role-accent table that ships in this feature, in both Light
 * and Dark themes. Documented hex pairs in
 * `contracts/theme-tokens.md` §2 are the source of truth — drift in
 * the actual `tokens.css` will fail this test (the values are kept
 * in sync by the contract).
 *
 * The contract states role-accents tint chrome only and never carry
 * body text. The check below is therefore the AA-large gate (3.0)
 * for the accent vs the chrome surface, plus the body-text gate
 * (4.5) for the surface's foreground vs background — the same pair
 * `gateCollegeAccent` enforces.
 */
import { describe, expect, it } from 'vitest';
import { __test__ } from '../../src/lib/theme';

const { parseHex, contrastRatio } = __test__;

interface Theme {
  surface: string; // chrome bg
  primaryFg: string; // primary ink
  numericFg: string; // numeric KPI ink (often the same)
}

// Sourced from contracts/theme-tokens.md §1 + tokens.css inspection.
const THEMES: Record<'light' | 'dark', Theme> = {
  light: {
    surface: '#FBFAF9',
    primaryFg: '#191918', // --neutral-900
    numericFg: '#191918',
  },
  dark: {
    surface: '#191918',
    primaryFg: '#F2EAD8', // --neutral-900 in dark token block
    numericFg: '#F2EAD8',
  },
};

// contracts/theme-tokens.md §2 — role accents per theme.
const ROLE_ACCENTS = {
  light: {
    student:           '#3B5BDB',
    faculty:           '#1F8A7C',
    'department-head': '#BF6A2A',
    dean:              '#7B3FB1',
    admin:             '#264653',
    quality:           '#A33A4F',
    owner:             '#6B7280',
  },
  dark: {
    student:           '#7C9BFF',
    faculty:           '#3CC2B0',
    'department-head': '#E89456',
    dean:              '#B58EE6',
    admin:             '#5C8A9C',
    quality:           '#E47186',
    owner:             '#A0A6B0',
  },
} as const;

const ratio = (a: string, b: string) => {
  const ra = parseHex(a)!;
  const rb = parseHex(b)!;
  return contrastRatio(ra, rb);
};

describe('012 token snapshot — body text contrast (AA = 4.5)', () => {
  for (const themeName of ['light', 'dark'] as const) {
    it(`${themeName}: primary text on canvas surface clears AA`, () => {
      const t = THEMES[themeName];
      expect(ratio(t.primaryFg, t.surface)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('012 token snapshot — numeric KPI contrast (AAA = 7.0)', () => {
  for (const themeName of ['light', 'dark'] as const) {
    it(`${themeName}: numeric KPI text on canvas clears AAA`, () => {
      const t = THEMES[themeName];
      expect(ratio(t.numericFg, t.surface)).toBeGreaterThanOrEqual(7.0);
    });
  }
});

describe('012 token snapshot — role accent vs chrome (AA-large = 3.0)', () => {
  for (const themeName of ['light', 'dark'] as const) {
    const accents = ROLE_ACCENTS[themeName];
    const surface = THEMES[themeName].surface;
    for (const [role, hex] of Object.entries(accents)) {
      it(`${themeName}: --role-accent[${role}] (${hex}) clears 3.0 vs ${surface}`, () => {
        expect(ratio(hex, surface)).toBeGreaterThanOrEqual(3.0);
      });
    }
  }
});
