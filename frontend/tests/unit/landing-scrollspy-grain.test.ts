/**
 * Landing chrome contract (r132-F5 → r188 folio).
 *
 * The r188 editorial redesign RETIRED two landing mechanisms outright:
 *   · the scroll-spy underline system (IntersectionObserver →
 *     header[data-active-section] → per-section ::after underlines) —
 *     the folio nav is four plain anchor links with hover washes;
 *   · the film-grain veil (the Orbit-Ink texture layer) — the paper
 *     world is clean flat ink, no texture.
 *
 * This file pins the RETIRED state so neither mechanism (nor the
 * Orbit-Ink scene vocabulary it belonged to) can silently re-appear,
 * and pins the chrome the folio landing DOES ship: the imperative
 * scroll-progress ribbon (--p on .fo-progress-bar, the r172 zero-setState
 * pattern) and the .scrolled header hairline.
 *
 * Pure fs assertions (assets.test.ts pattern) — no jsdom interaction.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so tombstone prose can't satisfy a selector pin. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('r188 — the scroll-spy system is retired with the Orbit-Ink world', () => {
  const css = read('src/styles/landing.css');
  const live = stripComments(css);
  const tsx = read('src/pages/LandingPage.tsx');

  it('no data-active-section consumer exists in CSS or TSX', () => {
    expect(live).not.toContain('data-active-section');
    expect(tsx).not.toMatch(/dataset\.activeSection/);
  });

  it('no film-grain veil: --ln-grain-op is unconsumed by the landing', () => {
    // The token stays defined in tokens.css (parity pins); the landing
    // must not paint a grain layer again.
    expect(live).not.toMatch(/--ln-grain-op/);
    expect(live).not.toContain('.ln-grain');
    expect(tsx).not.toContain('ln-grain');
  });

  it('the Orbit-Ink scene vocabulary is gone from the folio sheet', () => {
    for (const cls of ['ln-hero', 'ln-marquee', 'ln-constellation', 'ln-cta-orbits', 'landing-megamenu']) {
      expect(live, `${cls} should be retired`).not.toContain(cls);
    }
  });
});

describe('r188 — the folio chrome that ships', () => {
  const css = read('src/styles/landing.css');
  const live = stripComments(css);
  const tsx = read('src/pages/LandingPage.tsx');

  it('the scroll-progress ribbon: --p driven, accent-painted', () => {
    // markup: the bar ref + the imperative --p write (r172 pattern).
    expect(tsx).toContain('fo-progress-bar');
    expect(tsx).toMatch(/style\.setProperty\('--p'/);
    // CSS: the width consumes --p; the paint is the canonical accent.
    expect(live).toContain('inline-size: calc(var(--p, 0) * 100%)');
    expect(live).toContain('background: var(--accent)');
  });

  it('the sticky masthead toggles a .scrolled hairline imperatively', () => {
    expect(tsx).toMatch(/classList\.toggle\('scrolled'/);
    expect(live).toContain('.fo-header.scrolled');
  });

  it('chapter anchors: the four nav links resolve to real section ids', () => {
    for (const s of ['journey', 'roles', 'ledger', 'independence']) {
      expect(tsx).toContain(`id="${s}"`);
      expect(tsx).toContain(`href="#${s}"`);
    }
  });
});
