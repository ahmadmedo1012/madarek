/**
 * final-homepage — the poster-refinement contract (workstream A).
 *
 * The r198 poster shipped with five visual defects, each measured live
 * before the fix (evidence/REFERENCE-MATRIX.md):
 *   · D1 the constellation centerpiece rendered weightless (rings 22%
 *     ink @1px, chords 9%, ≈3px dots) in BOTH themes — the OPTIKKA
 *     «distinctive visual centerpiece» mapping was not achieved;
 *   · D2 `.ch--bleed` had NO rule — chapters 02/06 stacked a full-width
 *     1192px mini over the head, breaking the alternating rhythm;
 *   · D3 the hero read as two disconnected islands (ghost graphic vs
 *     heavy text column);
 *   · D4 the closing wordmark at 7% ink never registered;
 *   · D5 section separators were uneven (lv/cg/cta had them; st/rl/vs
 *     did not).
 *
 * Pure fs assertions (landing-scrollspy-grain.test.ts convention):
 * comments are stripped so tombstone prose quoting the OLD values can
 * never satisfy a pin.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so comments quoting old values can't satisfy pins. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

const css = read('src/styles/landing.css');
const live = stripComments(css);
const tsx = read('src/components/landing/Constellation.tsx');
const liveTsx = stripComments(tsx);

describe('final-homepage D1 — the constellation carries mass', () => {
  it('rings and chords hold real ink, not the r198 ghost hairlines', () => {
    // Before: ring 22% @1px, chord 9% @1px (measured: read as a
    // wireframe placeholder in both themes).
    expect(live).toMatch(/\.const-ring\s*\{[^}]*var\(--poster-ink\) 3[0-9]%/);
    expect(live).toMatch(/\.const-chord\s*\{[^}]*var\(--poster-ink\) 1[0-9]%/);
  });

  it('the hero stage carries the radial signal field behind the rings', () => {
    // The field is what gives the focal object gravity — one quiet
    // wash, color-mix only (no third hue, no raster).
    expect(live).toMatch(/\.fo-hero-stage::before\s*\{/);
    expect(live).toMatch(/radial-gradient\(/);
    expect(live).toContain('--poster-signal');
  });

  it('the colleges map carries the same field treatment', () => {
    expect(live).toMatch(/\.cg-map::before\s*\{/);
  });

  it('the SVG nodes are drawn at poster scale (Constellation.tsx)', () => {
    // Before: r=4.5 default / r=6 signal / r=7 center → ≈3px dots at
    // hero scale. The regex pins the RENDERED radius attributes.
    expect(liveTsx).toMatch(/r=\{active \|\| isSignal \? 7 : 5\.5\}/);
    expect(liveTsx).toMatch(/<circle cx="380" cy="380" r="9"/);
    expect(liveTsx).toMatch(/r="18" className="const-node-halo"/);
  });
});

describe('final-homepage D2 — the bleed chapter layout exists', () => {
  it('.ch--bleed composes a two-column chapter (the head takes the narrow column)', () => {
    // Before: no .ch--bleed rule at all — chapters 02/06 stacked a
    // full-measure 1192px mini under the head (measured live).
    expect(live).toMatch(
      /\.ch--bleed\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*8fr\)\s*minmax\(0,\s*5fr\)/,
    );
    expect(live).toMatch(/\.ch--bleed \.ch-mini\s*\{[^}]*grid-column:\s*1/);
    expect(live).toMatch(/\.ch--bleed \.ch-head\s*\{[^}]*grid-column:\s*2/);
  });

  it('the bleed pulls the mini into the viewport gutter, capped at the 1240 measure', () => {
    // min(calc(620px − 50vw), 0) ≤ 0 only above 1240px — it can never
    // overflow; below the poster measure it collapses to zero.
    expect(live).toMatch(
      /margin-inline-start:\s*min\(calc\(620px - 50vw\),\s*0px\)/,
    );
    // …and the spacing gate documents the 620px layout constant (the
    // marker lives in a comment, so the RAW sheet carries it).
    expect(css).toMatch(/spacing-gate: allow — half the 1240px poster measure/);
  });

  it('the stacking reset (≤960px) includes the bleed chapter', () => {
    const mq = live.match(/@media \(max-width: 960px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(mq).toMatch(/\.ch--bleed\b/);
    expect(mq).toMatch(/\.ch--bleed \.ch-mini\s*\{\s*margin-inline-start:\s*0/);
  });
});

describe('final-homepage D3/D4/D5 — hero balance, wordmark, rhythm', () => {
  it('the hero grid favors the constellation column (the focal object)', () => {
    expect(live).toMatch(
      /\.fo-hero-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1\.06fr\)/,
    );
    expect(live).toMatch(/\.fo-hero-constellation\s*\{[^}]*min\(100%,\s*620px\)/);
  });

  it('the closing wordmark registers as a watermark (≥10% ink)', () => {
    // Before: 7% — invisible on both grounds (VLM: «ghost element»).
    const mark = live.match(/\.fo-footer-mark\s*\{[^}]*\}/)?.[0] ?? '';
    expect(mark).toMatch(/var\(--poster-ink\) 1[0-9]%, transparent/);
  });

  it('every top-level band after the hero carries the hairline separator', () => {
    // Before: st/rl/vs had none — the section ladder was irregular.
    for (const sec of ['.st-section', '.rl-section', '.vs-section']) {
      const block = live.match(new RegExp(`${sec.replace('.', '\\.')}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(block, `${sec} should separate`).toContain('border-block-start');
    }
  });

  it('the chapter numeral draws its editorial rule', () => {
    expect(live).toMatch(/\.ch-num::after\s*\{/);
    expect(live).toMatch(/\.ch-num\s*\{[^}]*display:\s*flex/);
  });
});

describe('final-homepage hygiene — the sheet stays clean', () => {
  it('no duplicated [data-theme="dark"] .landing signal blocks', () => {
    const count = (live.match(/\[data-theme="dark"\] \.landing\s*\{/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('the reduced-motion static poster still covers every mover', () => {
    // The refinement added no new animation, and the RM contract must
    // keep covering the three --sp consumers + the cue + the reveals.
    // (Two RM blocks ship in the sheet — the stage trio and the
    // reveal-up reset — so the pins walk the whole live sheet.)
    for (const cls of ['.fo-hero-constellation', '.fo-footer-inner', '.fo-footer-mark']) {
      expect(live, `${cls} must reset under RM`).toContain(cls);
    }
    expect(live).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.reveal-up\s*\{\s*opacity:\s*1/,
    );
    expect(live).toMatch(/\.fo-scroll-cue-dot\s*\{\s*animation:\s*none/);
  });

  it('no new animation keyframes beyond the scroll cue bob', () => {
    // One keyframe set total — the refinement stays motion-free.
    const keyframes = (live.match(/@keyframes/g) ?? []).length;
    expect(keyframes).toBe(1);
  });
});
