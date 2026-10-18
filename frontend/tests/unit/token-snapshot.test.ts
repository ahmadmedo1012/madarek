/**
 * T045 — token contrast snapshot.
 *
 * Asserts WCAG AA on body text and AAA on numeric KPI values across
 * the role-accent table that ships in this feature, in both Light
 * and Dark themes.
 *
 * RA1 (r184, from the r183-A3 audit §F10): the tables are now READ
 * FROM `tokens.css` — the live token source — instead of hand-copied
 * hexes. The old copies had already rotted (dark surface #191918 and
 * ink #F2EAD8 while the live dark theme serves --bg #070B16 and
 * --text #F2EFE6): editing tokens.css directly could pass silently.
 * Now a retuned theme table, a swapped role accent, or a renamed role
 * fails HERE first, before any browser check.
 *
 * The contract states role-accents tint chrome only and never carry
 * body text. The check below is therefore the AA-large gate (3.0)
 * for the accent vs the chrome surface (the theme's page ground
 * --bg), plus the body-text gate (4.5) for --text vs --bg — the same
 * pair `gateCollegeAccent` enforces.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __test__ } from '../../src/lib/theme';

const { parseHex, contrastRatio } = __test__;

const STYLES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);
const readStyle = (f: string) => readFileSync(path.join(STYLES_DIR, f), 'utf-8');

// ── RA1: parse the LIVE token source ──────────────────────────
const tokensCss = readStyle('tokens.css');

/** Extract a top-level `[data-theme="X"] { … }` block by brace match. */
function themeBlock(theme: 'light' | 'dark'): string {
  const opener = `[data-theme="${theme}"] {`;
  const start = tokensCss.indexOf(opener);
  expect(start, `tokens.css: [data-theme="${theme}"] block not found`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = start + opener.length - 1; i < tokensCss.length; i++) {
    if (tokensCss[i] === '{') depth++;
    else if (tokensCss[i] === '}') {
      depth--;
      if (depth === 0) return tokensCss.slice(start, i + 1);
    }
  }
  throw new Error(`tokens.css: unterminated [data-theme="${theme}"] block`);
}

/** Read `--name: <value>` from a block (comments stripped). */
function rawVar(block: string, name: string): string {
  const cleaned = block.replace(/\/\*[\s\S]*?\*\//g, '');
  const value = cleaned.match(new RegExp(`--${name.replace(/-/g, '\\-')}:\\s*([^;]+);`))?.[1];
  expect(value, `tokens.css: --${name} missing from a theme block`).toBeTruthy();
  return value!.trim();
}

/** Resolve one `var(--x)` hop inside the same block → a hex literal. */
function resolveHex(block: string, name: string): string {
  const value = rawVar(block, name);
  const ref = value.match(/^var\(--([\w-]+)\)$/)?.[1];
  const literal = ref ? rawVar(block, ref) : value;
  expect(literal, `tokens.css: --${name} (→ ${value}) does not resolve to a hex literal`).toMatch(/^#[0-9a-fA-F]{6}$/);
  return literal.toLowerCase();
}

interface Theme {
  surface: string; // chrome bg (the theme's --bg page ground)
  primaryFg: string; // primary ink (--text)
  numericFg: string; // numeric KPI ink (same ink today; kept separate so a future split stays honest)
}

// Sourced LIVE from tokens.css (RA1) — no hand-copied hexes.
const THEMES: Record<'light' | 'dark', Theme> = {
  light: {
    surface: resolveHex(themeBlock('light'), 'bg'),
    primaryFg: resolveHex(themeBlock('light'), 'text'),
    numericFg: resolveHex(themeBlock('light'), 'text'),
  },
  dark: {
    surface: resolveHex(themeBlock('dark'), 'bg'),
    primaryFg: resolveHex(themeBlock('dark'), 'text'),
    numericFg: resolveHex(themeBlock('dark'), 'text'),
  },
};

// Role-accent 7×2 table, parsed from the :root[data-theme=…]
// body[data-role=…] { --role-accent: #hex; } lines (tokens.css §1).
function parseRoleAccents(): Record<'light' | 'dark', Record<string, string>> {
  const out: Record<'light' | 'dark', Record<string, string>> = { light: {}, dark: {} };
  const re = /:root\[data-theme="(light|dark)"\]\s*body\[data-role="([\w-]+)"\]\s*\{\s*--role-accent:\s*(#[0-9a-fA-F]{6});/g;
  for (const m of tokensCss.matchAll(re)) {
    const theme = m[1] as 'light' | 'dark';
    const role = m[2]!;
    const hex = m[3]!;
    out[theme][role] = hex.toLowerCase();
  }
  for (const themeName of ['light', 'dark'] as const) {
    const roles = Object.keys(out[themeName]);
    expect(
      roles.length,
      `tokens.css: the ${themeName} role-accent table lost rows (found ${roles.length}: ${roles.join(', ')})`,
    ).toBeGreaterThanOrEqual(7);
  }
  return out;
}
const ROLE_ACCENTS = parseRoleAccents();

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
/* (RA1/r184: readStyle + STYLES_DIR moved to the shared header above —
 * one import site serves both the T045 contrast tables and WS-D2.) */
// tokens.css is excluded: it is the one file allowed to define raw values
// (it IS the token source, including --r-full: 9999px).
const STYLESHEET_FILES = [
  'polish.css',
  'components.css',
  'landing.css',
  'colleges.css',
  'colleges-popover.css',
  'admin.css',
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
