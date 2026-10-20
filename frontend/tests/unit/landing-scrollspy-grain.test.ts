/**
 * Landing chrome contract (r132-F5 → r198 poster rebuild).
 *
 * The r188 editorial redesign RETIRED two landing mechanisms outright:
 *   · the scroll-spy underline system (IntersectionObserver →
 *     header[data-active-section] → per-section ::after underlines) —
 *     the nav is three plain anchor links with hover washes;
 *   · the film-grain veil (the Orbit-Ink texture layer) — the paper
 *     world is clean flat ink, no texture.
 *
 * r198 (stage 2, the OPTIKKA-direction poster) RETIRES the r191 pinned
 * mega-stage vocabulary too (the mg-, pd-, pf- card families, the
 * telemetry strip, data-pinned stages) and
 * re-pins the chrome that still ships: the imperative scroll-progress
 * ribbon (--p on .fo-progress-bar, the r172 zero-setState pattern) and
 * the .scrolled header hairline. The nav anchors now resolve to the
 * poster's chapter ids (chapters / live / roles / colleges).
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
    // The token was retired with the --ln-* family (r197); the landing
    // must not paint a grain layer again.
    expect(live).not.toMatch(/--ln-grain-op/);
    expect(live).not.toContain('.ln-grain');
    expect(tsx).not.toContain('ln-grain');
  });

  it('the Orbit-Ink scene vocabulary is gone from the poster sheet', () => {
    for (const cls of ['ln-hero', 'ln-marquee', 'ln-constellation', 'ln-cta-orbits', 'landing-megamenu']) {
      expect(live, `${cls} should be retired`).not.toContain(cls);
    }
  });

  it('r198 — the r191 pinned-mega-stage vocabulary is retired with the poster rebuild', () => {
    // Stage 2 replaced the 700vh pinned narrative with stacked poster
    // chapters: no pinning, no telemetry strip, no scene components.
    for (const cls of ['mg-stage', 'mg-pin', 'pd-card', 'pf-card', 'fo-telemetry', 'data-pinned']) {
      expect(live, `${cls} should be retired (r198)`).not.toContain(cls);
      expect(tsx).not.toContain(cls);
    }
    expect(tsx).not.toContain('KnowledgeMap');
    expect(tsx).not.toContain('OrbitPath');
    expect(tsx).not.toContain('TestimonialSection');
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
    // CSS (r190): the bar consumes --p via transform (GPU-composited —
    // no per-scroll layout paint; the width-based recipe retired) and
    // the paint is the canonical accent token (routed to its stage
    // expression on the fixed-dark chrome — see landing.css).
    expect(live).toContain('transform: scaleX(var(--p, 0))');
    expect(live).toContain('background: var(--accent)');
  });

  it('the sticky masthead toggles a .scrolled hairline imperatively', () => {
    expect(tsx).toMatch(/classList\.toggle\('scrolled'/);
    expect(live).toContain('.fo-header.scrolled');
  });

  it('chapter anchors: the nav links resolve to real section ids (r198 poster chapters)', () => {
    // r198: the poster's nav anchors — chapters (01–06), the honest
    // ledger, the roles strip, and the colleges constellation.
    for (const s of ['chapters', 'live', 'roles', 'colleges']) {
      expect(tsx).toContain(`id="${s}"`);
      expect(tsx).toContain(`href="#${s}"`);
    }
  });
});
