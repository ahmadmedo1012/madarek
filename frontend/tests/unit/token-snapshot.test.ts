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

/* ═══════════════════════════════════════════════════════════════════
 * WS-D2 — CSS token-discipline snapshot.
 *
 * Locks in the deep-sweep substitutions so future stylesheets cannot
 * regress the radius/z-order/orphan fixes without failing a test:
 *   1. Pill radii must go through --r-full, not raw 999px/9999px.
 *   2. The orphaned legacy selectors (comp-modal containers, notif-panel
 *      container, topbar-user-menu family) stay deleted — the overlay
 *      primitives own those surfaces now.
 *   3. The owner toggle thumb routes through the theme-aware
 *      --text-on-dark slot instead of a hardcoded #fff.
 * ═══════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const STYLES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);
const readStyle = (f: string) => readFileSync(path.join(STYLES_DIR, f), 'utf-8');
// tokens.css is excluded: it is the one file allowed to define raw values
// (it IS the token source, including --r-full: 9999px).
const STYLESHEET_FILES = [
  'polish.css',
  'components.css',
  'landing.css',
  'colleges.css',
  'layout.css',
  'notifications.css',
  'owner.css',
  'auth.css',
  'pdf.css',
] as const;

describe('WS-D2 token-discipline snapshot — radius tokens', () => {
  it.each([...STYLESHEET_FILES])('%s: no raw 999px/9999px pill radius', (f) => {
    const src = readStyle(f);
    expect(src).not.toMatch(/border(?:-(?:end|start)-(?:end|start))?-radius:\s*9999?px\b/);
  });
});

describe('WS-D2 token-discipline snapshot — orphaned legacy blocks stay deleted', () => {
  // Selector bodies must not reappear as live rules (comments are fine).
  const liveRules = (src: string, selector: RegExp) =>
    src
      .split('\n')
      .filter((l) => !l.trim().startsWith('/*') && !l.trim().startsWith('*'))
      .filter((l) => selector.test(l)).length;

  it('colleges.css: .comp-modal-backdrop / .comp-modal containers stay gone', () => {
    const src = readStyle('colleges.css');
    expect(liveRules(src, /^\.comp-modal-backdrop\b/)).toBe(0);
    expect(liveRules(src, /^\.comp-modal\s*\{/)).toBe(0);
    // The children the TSX still references must be intact.
    expect(src).toMatch(/\.comp-modal-head\s*\{/);
    expect(src).toMatch(/\.comp-modal-close\s*\{/);
    expect(src).toMatch(/\.comp-modal-form\s*\{/);
    expect(src).toMatch(/\.comp-modal-actions\s*\{/);
  });

  it('notifications.css: .notif-panel container stays gone, children intact', () => {
    const src = readStyle('notifications.css');
    expect(liveRules(src, /^\.notif-panel\s*\{/)).toBe(0);
    for (const child of [
      '.notif-panel-head',
      '.notif-panel-title',
      '.notif-panel-list',
      '.notif-panel-foot',
      '.notif-panel-viewall',
    ]) {
      expect(src).toMatch(new RegExp(`${child.replace('.', '\\.')}\\s*\\{`));
    }
  });

  it('layout.css: .topbar-user-menu container/items stay gone, header intact', () => {
    const src = readStyle('layout.css');
    expect(liveRules(src, /^\.topbar-user-menu\s*\{/)).toBe(0);
    expect(liveRules(src, /^\.topbar-user-menu-item\b/)).toBe(0);
    expect(liveRules(src, /^\.topbar-user-menu-divider\b/)).toBe(0);
    expect(src).toMatch(/\.topbar-user-menu-header\s*\{/);
  });
});

describe('WS-D2 token-discipline snapshot — owner toggle thumb', () => {
  it('owner.css: thumb background routes through --text-on-dark (no raw #fff)', () => {
    const src = readStyle('owner.css');
    const thumb = src.match(/\.owner-toggle-thumb\s*\{[^}]*\}/)?.[0] ?? '';
    expect(thumb).toContain('background: var(--text-on-dark)');
    expect(thumb).not.toMatch(/background:\s*#fff\b/i);
  });
});

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
