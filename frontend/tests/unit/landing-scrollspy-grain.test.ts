/**
 * Landing chrome contract (r132-F5 → r198 poster rebuild → r306 sheet).
 *
 * The r188 editorial redesign RETIRED two landing mechanisms outright:
 *   · the scroll-spy underline system (IntersectionObserver →
 *     header[data-active-section] → per-section ::after underlines) —
 *     the nav is three plain anchor links with hover washes;
 *   · the film-grain veil (the Orbit-Ink texture layer) — the paper
 *     world is clean flat ink, no texture.
 *
 * r198 (stage 2, the OPTIKKA-direction poster — since RETIRED by the
 * r306 Heron-only drawing-sheet rebuild) also retired the r191 pinned
 * mega-stage vocabulary (the mg-, pd-, pf- card families, the
 * telemetry strip, data-pinned stages). r306 keeps this chrome
 * contract verbatim on the new sheet: the imperative scroll-progress
 * ribbon (--p on .fo-progress-bar, the r172 zero-setState pattern)
 * and the .scrolled header hairline. The nav anchors resolve to the
 * sheet's section ids (chapters / live / roles / colleges).
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

  it('R315 override: the top progress ribbon is RETIRED (the reference has nothing at the frame top edge)', () => {
    // R315 override (K-A5): the owner's §0-A.5 verdict + E-crawl ground
    // truth (nothing above the header band) retire the ribbon. The pin
    // flips from "the bar exists and is driven" to "the bar is gone
    // from the markup, the CSS and the imperative loop".
    expect(tsx).not.toContain('fo-progress-bar');
    expect(tsx).not.toMatch(/style\.setProperty\('--p'/);
    expect(live).not.toContain('transform: scaleX(var(--p, 0))');
    expect(live).toContain('background: var(--accent)');
  });

  it('the fixed masthead rides the reference class vocabulary imperatively (on-scroll / on-hide)', () => {
    /* R313 override (WP-B2 · D8): `.scrolled` is retired for the
     * reference's own class system (telemetry/header-states.json):
     * top = `header` → scrolled = `header on-scroll on-hide` →
     * back-to-top = `header on-hide` (the LATCH — on-scroll drops,
     * on-hide stays once the visitor has scrolled down). `on-scroll`
     * toggles at y>6 (the old .scrolled seat); `on-hide` is added,
     * never removed. The visual lift itself is an imperative
     * style.transform written from the same rAF (the reference drives
     * its bar from GSAP — the classes alone carry no transform, and
     * neither do ours). The --p progress ribbon contract is
     * unchanged. */
    expect(tsx).toMatch(/classList\.toggle\('on-scroll'/);
    expect(tsx).toMatch(/classList\.add\('on-hide'/);
    expect(tsx).toMatch(/header\.style\.transform/);
    expect(tsx).not.toMatch(/classList\.toggle\('scrolled'/);
    expect(live).toContain('.fo-header.on-scroll');
    expect(live).not.toContain('.fo-header.scrolled');
  });

  it('chapter anchors: the nav links resolve to real section ids (r198 poster chapters)', () => {
    /* R313 override (WP-B2 · D8): the four-seat nav is registry-driven
     * (NAV_SEATS — the reference's PRODUCT▾/PRICING/RESOURCES▾/ABOUT
     * shape), so the anchors render as `href={seat.href}` from the
     * object literals, not as literal JSX attributes. The pin follows
     * the registry: every section id exists AND is carried by a seat
     * (a top-level link or a dropdown child). */
    for (const s of ['chapters', 'live', 'roles', 'colleges']) {
      expect(tsx).toContain(`id="${s}"`);
      expect(tsx).toContain(`href: '#${s}'`);
    }
  });
});
