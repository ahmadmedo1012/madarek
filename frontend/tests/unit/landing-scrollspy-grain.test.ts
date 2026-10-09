/**
 * Landing scroll-spy + grain contract (r132-F5).
 *
 * The scroll-spy mechanism has ONE shape: the IntersectionObserver in
 * LandingPage.tsx writes `data-active-section` on the <header> element,
 * and every CSS rule that consumes it must be scoped
 * `header[data-active-section]` and match its anchor by href.
 *
 * That contract has been repaired three times because blocks kept
 * appearing with the pre-r128 shape:
 *   · r128 — base active-tint block (was `.landing` root-scoped)
 *   · r130-W2-7 — P4-05 active bump + P4-15 RM transition-kill
 *   · r132-F5 — P4-02: root-scoped AND matched an `.active` class /
 *     [aria-current] the markup never carries, so its 2px lime underline
 *     never rendered; re-scoped + re-shaped, redundant tint half deleted
 *
 * This test fails on any regression of that contract, in either the CSS
 * or the TSX — plus pins the r132-F5 grain unification (single source:
 * tokens.css 0.075, no landing re-declaration).
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

const SECTIONS = ['trust', 'colleges', 'journey', 'progress', 'campus', 'roles'] as const;
/** The sections whose anchors exist as plain desktop nav links. */
const PLAIN_NAV_SECTIONS = ['colleges', 'roles', 'progress'] as const;

describe('landing scroll-spy contract (r132-F5)', () => {
  const css = read('src/styles/landing.css');
  const live = stripComments(css);

  it('no scroll-spy rule reads the .landing root — the attribute lives on the header', () => {
    // The thrice-fixed mis-scope: `.landing[data-active-section] …` never
    // matched, because the observer writes the attribute on the <header>,
    // not the page root.
    expect(live).not.toMatch(/\.landing\[data-active-section/);
  });

  it('every data-active-section consumer is header-scoped (base + P4-05 + P4-15 + P4-02)', () => {
    // 4 blocks × 6 section selectors, all spelled `.landing header[…]`.
    const headerScoped = (live.match(/\.landing header\[data-active-section=/g) ?? []).length;
    expect(headerScoped).toBe(SECTIONS.length * 4);
  });

  it('P4-02 underline: 2px lime hairline, header-scoped + href-matched for all six sections', () => {
    for (const s of SECTIONS) {
      expect(live).toContain(
        `.landing header[data-active-section="${s}"] .landing-nav-link[href="#${s}"]::after`,
      );
    }
    // …and the declarations it renders: the rule body after the selector.
    const start = live.indexOf(
      '.landing header[data-active-section="trust"] .landing-nav-link[href="#trust"]::after',
    );
    expect(start).toBeGreaterThanOrEqual(0);
    const body = live.slice(start, live.indexOf('}', start));
    expect(body).toContain('content: ""');
    expect(body).toContain('position: absolute');
    expect(body).toContain('block-size: 2px');
    expect(body).toContain('background: var(--ln-lime)');
    expect(body).toContain('border-radius: var(--ln-radius-pill)');
    expect(body).toContain('opacity: 0.7');
  });

  it('the nav link carries its own positioning context — the underline anchors to the link', () => {
    // Without this, the abs-positioned ::after would anchor to the sticky
    // header (or the .landing-nav-group megamenu anchor) and every
    // underline would paint in the same wrong place.
    const base = live.match(/\.landing \.landing-nav-link\s*\{/)?.index ?? -1;
    expect(base).toBeGreaterThanOrEqual(0);
    const rule = live.slice(base, live.indexOf('}', base));
    expect(rule).toContain('position: relative');
  });

  it('markup side of the contract: observer writes the header, plain href anchors exist', () => {
    const tsx = read('src/pages/LandingPage.tsx');
    // The observer's write site — header.dataset.activeSection.
    expect(tsx).toMatch(/header\.dataset\.activeSection\s*=/);
    expect(tsx).not.toMatch(/(?:^|\W)landing\W*\.dataset\.activeSection/);
    // The anchors the CSS matches (desktop nav).
    for (const s of PLAIN_NAV_SECTIONS) {
      expect(tsx).toContain(`href="#${s}" className="landing-nav-link"`);
    }
  });
});

describe('landing grain single-source (r132-F5)', () => {
  it('tokens.css defines the veil at 0.075; landing.css consumes but never re-declares it', () => {
    const tokens = stripComments(read('src/styles/tokens.css'));
    expect(tokens).toMatch(/--ln-grain-op:\s*0\.075\s*;/);
    // The old split-brain: tokens base 0.05 + a .landing local override.
    const live = stripComments(read('src/styles/landing.css'));
    expect(live).not.toMatch(/--ln-grain-op\s*:/);
    // The veil still consumes the token.
    expect(live).toContain('opacity: var(--ln-grain-op)');
  });
});
