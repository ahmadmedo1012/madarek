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

/* R332 split: landing.css is now the per-section family under
 * styles/landing/ (imported in the original cascade order); the stub
 * landing.css is rule-free. The aggregated family text is unchanged. */
const LANDING_FAMILY = [
  'src/styles/landing/chrome.css',
  'src/styles/landing/hero.css',
  'src/styles/landing/statement.css',
  'src/styles/landing/journey.css',
  'src/styles/landing/pains.css',
  'src/styles/landing/roles.css',
  'src/styles/landing/colleges.css',
  'src/styles/landing/cta.css',
  'src/styles/landing/why.css',
  'src/styles/landing/footer.css',
  'src/styles/landing/shared.css',
  'src/styles/landing/platform.css',
  'src/styles/landing/strata.css',
] as const;
const readLanding = () => stripComments(LANDING_FAMILY.map(read).join('\n'));

/* P2-0 (r335 split): the nine bands moved verbatim into
 * components/landing/sections/ — the guest surface is the composer +
 * the sections now (same contract: the page, not the file layout). */
const LANDING_TSX_SURFACE = [
  'src/pages/LandingPage.tsx',
  'src/components/landing/sections/Hero.tsx',
  'src/components/landing/sections/Statement.tsx',
  'src/components/landing/sections/Live.tsx',
  'src/components/landing/sections/Chapters.tsx',
  'src/components/landing/sections/Product.tsx',
  'src/components/landing/sections/Why.tsx',
  'src/components/landing/sections/Roles.tsx',
  'src/components/landing/sections/Vision.tsx',
  'src/components/landing/sections/Footer.tsx',
].map(read).join('\n');

describe('r188 — the scroll-spy system is retired with the Orbit-Ink world', () => {
  const live = readLanding();
  const tsx = LANDING_TSX_SURFACE;

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
  const live = readLanding();
  const tsx = LANDING_TSX_SURFACE;
  /* R331 split: the masthead lives in chrome/SheetNav.tsx + landing/nav.css. */
  const navTsx = read('src/components/landing/chrome/SheetNav.tsx');
  const navCss = stripComments(read('src/styles/landing/nav.css'));

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

  it('the masthead is IN FLOW — the fixed overlay is retired (R347 D2)', () => {
    /* R347 D2 re-key (the defect fix legitimately changed the live
     * contract): the r331 fixed bar printed the nav's links over every
     * section's text that scrolled beneath it (detector fixed-over-text
     * at every stop — the page's worst overlay). The masthead now rides
     * the sheet's top edge in the document flow and scrolls away with
     * the page; the on-scroll/on-hide state machine, its driver and its
     * paint are deleted at the cause. See docs/redesign/r347/DEFECTS-A.md. */
    expect(navTsx).not.toMatch(/on-scroll|on-hide/);
    expect(navCss).not.toContain('.fo-header.on-hide');
    expect(navCss).not.toMatch(/\.fo-header\s*\{[^}]*position:\s*fixed/); // in flow — never a fixed overlay again
    expect(navCss).toMatch(/\.fo-header\s*\{[^}]*position:\s*relative/);
    expect(tsx).not.toContain('fo-progress-bar');
    expect(live).not.toContain('transform: scaleX(var(--p, 0))');
  });

  it('chapter anchors: the R331 register resolves to real destinations', () => {
    /* R313 override (WP-B2 · D8) → R331 register: every landing section
     * id still exists; the on-page chapter seat stays an ANCHOR
     * (#chapters), and the chrome seats resolve to the site's REAL
     * public routes (stronger than in-page anchors). */
    for (const s2 of ['chapters', 'live', 'roles', 'colleges']) {
      expect(tsx).toContain(`id="${s2}"`);
    }
    expect(navTsx).toContain("href: '#chapters'");
    for (const r of ['/colleges', '/campus', '/competitions', '/app']) {
      expect(navTsx).toContain(`href: '${r}'`);
    }
  });
});
