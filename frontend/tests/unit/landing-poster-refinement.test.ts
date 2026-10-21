/**
 * r304 — the landing editorial-reconstruction contract.
 *
 * r303 replaced the static Constellation with the persistent
 * MadarekWorld (canvas + conductor); r304 rebuilds the DOM
 * composition around it — every act reserves its intentional
 * empty-space zone so the sculpture never simply washes across
 * content. This sheet pins the r304 geometry that interaction tests
 * cannot see cheaply:
 *   · the hero drafting grid + the world layer stacking;
 *   · the copper-climax slab (the inverted ledger) + its annotated
 *     empty window;
 *   · the bleed chapter's viewport-gutter geometry (kept from the
 *     final-homepage move);
 *   · the panorama index rows, the ghost registry numeral, the
 *     passage centering;
 *   · the hygiene contract: one dark re-point block, the RM belt
 *     covering every mover, one keyframe set.
 *
 * Pure fs assertions (landing-scrollspy-grain.test.ts convention):
 * comments are stripped so tombstone prose quoting OLD values can
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
const tsx = read('src/pages/LandingPage.tsx');
const liveTsx = stripComments(tsx);

describe('r304 — the world layer and the drafting grid', () => {
  it('the persistent world stays a fixed backdrop under the content stack', () => {
    expect(live).toMatch(/\.world-layer\s*\{[^}]*position:\s*fixed/);
    expect(live).toMatch(/\.world-layer\s*\{[^}]*z-index:\s*0/);
    expect(live).toMatch(/\.world-layer\s*\{[^}]*pointer-events:\s*none/);
    // the content bands ride ABOVE the canvas (z-index: 1 family)
    expect(live).toMatch(/\.fo-header,[\s\S]*?main,[\s\S]*?\.fo-footer\s*\{[^}]*z-index:\s*1/);
  });

  it('the hero carries the OPTIKKA drafting grid (dotted thirds, masked)', () => {
    expect(live).toMatch(/\.fo-hero-gridlines\s*\{[^}]*repeating-linear-gradient/);
    expect(live).toMatch(/\.fo-hero-gridlines\s*\{[^}]*33\.3334%\s*100%/);
    expect(live).toMatch(/\.fo-hero-gridlines\s*\{[^}]*mask-image:\s*linear-gradient/);
  });
});

describe('r304 — the copper climax (the inverted ledger slab)', () => {
  it('the slab inverts the ground (the fragment-video recipe) and owns the reading-start column', () => {
    expect(live).toMatch(/\.lv-slab\s*\{[^}]*background:\s*var\(--neutral-900\)/);
    expect(live).toMatch(/\.lv-slab\s*\{[^}]*color:\s*var\(--neutral-50\)/);
    expect(live).toMatch(
      /\.lv-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*29fr\)\s*minmax\(0,\s*20fr\)/,
    );
  });

  it('the slab re-points the signal per theme so numerals stay AA on both grounds', () => {
    expect(live).toMatch(/\.lv-slab\s*\{[^}]*--poster-signal:\s*var\(--c-copper-ink\)/);
    expect(live).toMatch(/\[data-theme="dark"\] \.lv-slab\s*\{[^}]*--poster-signal:\s*var\(--c-copper-bg\)/);
  });

  it('the annotated empty window marks the intentional negative space', () => {
    expect(live).toMatch(/\.lv-window\s*\{[^}]*border:\s*1px dashed/);
    expect(live).toMatch(/\.lv-window-caption\s*\{/);
    // …and it is a wide-canvas device: gone under 960px.
    const mq = live.match(/@media \(max-width: 960px\)\s*\{([\s\S]*?)\n\}\n\n@media \(max-width: 640px\)/)?.[1] ?? '';
    expect(mq).toMatch(/\.lv-window\s*\{\s*display:\s*none/);
  });
});

describe('r304 — chapter geometry kept + the new editorial moves', () => {
  it('.ch--bleed composes a two-column chapter (the head takes the narrow column)', () => {
    expect(live).toMatch(
      /\.ch--bleed\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*8fr\)\s*minmax\(0,\s*5fr\)/,
    );
    expect(live).toMatch(/\.ch--bleed \.ch-mini\s*\{[^}]*grid-column:\s*1/);
    expect(live).toMatch(/\.ch--bleed \.ch-head\s*\{[^}]*grid-column:\s*2/);
  });

  it('the bleed pulls the mini into the viewport gutter, capped at the 1240 measure', () => {
    expect(live).toMatch(
      /margin-inline-start:\s*min\(calc\(620px - 50vw\),\s*0px\)/,
    );
    // the spacing gate documents the 620px layout constant (the marker
    // lives in a comment, so the RAW sheet carries it).
    expect(css).toMatch(/spacing-gate: allow — half the 1240px poster measure/);
  });

  it('the statement spread leaves the reading-end third open', () => {
    expect(live).toMatch(
      /\.st-spread\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*7fr\)\s*minmax\(0,\s*4fr\)/,
    );
    // …and the copy pins to the reading-start track.
    expect(live).toMatch(/\.st-copy\s*\{\s*grid-column:\s*1/);
  });

  it('the roles panorama runs as full-width index rows', () => {
    expect(live).toMatch(/\.rl-item\s*\{[^}]*grid-template-columns:\s*minmax\(150px,\s*230px\)\s*1fr/);
  });

  it('the colleges ghost numeral floats in the open third (decorative, poster-scale)', () => {
    expect(live).toMatch(/\.cg-count\s*\{[^}]*clamp\(120px,\s*15vw,\s*220px\)/);
    expect(live).toMatch(/\.cg-count\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--poster-ink\) 9%, transparent\)/);
  });

  it('the vision passage centers the composition', () => {
    const vs = live.match(/\.vs-section\s*\{[^}]*\}/)?.[0] ?? '';
    expect(vs).toContain('text-align: center');
    expect(vs).toMatch(/padding-block:\s*var\(--sp-16\)/);
  });
});

describe('r304 — the fragment chrome (honest demo frames)', () => {
  it('every fragment ships the window chrome + the caption pair', () => {
    expect(live).toMatch(/\.mini-chrome\s*\{/);
    expect(live).toMatch(/\.mini-dots\s*\{/);
    expect(live).toMatch(/\.mini-caption-tag::before\s*\{/);
    expect(liveTsx).toContain('mini-chrome-tag');
    expect(liveTsx).toContain('عرض توضيحي');
  });

  it('the fragments stay opaque elevated surfaces (proof above the world)', () => {
    expect(live).toMatch(/\.mini\s*\{[^}]*background:\s*var\(--surface\)/);
    expect(live).toMatch(/\.mini\s*\{[^}]*box-shadow:\s*var\(--elev-2\)/);
    expect(live).toMatch(/\.mini\s*\{[^}]*overflow:\s*clip/);
  });
});

describe('r304 — the semantic story hooks', () => {
  it('every act mirrors its data-cam with a data-story-chapter', () => {
    for (const id of ['hero', 'statement', 'chapters', 'live', 'roles', 'colleges', 'vision', 'cta', 'footer']) {
      expect(liveTsx, id).toContain(`data-story-chapter="${id}"`);
    }
  });

  it('reveal beats, media frames and focus points carry the contract hooks', () => {
    expect((liveTsx.match(/data-story-reveal/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect((liveTsx.match(/data-story-media/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((liveTsx.match(/data-story-focus/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('r304 hygiene — the sheet stays clean', () => {
  it('no duplicated [data-theme="dark"] .landing signal blocks', () => {
    const count = (live.match(/\[data-theme="dark"\] \.landing\s*\{/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('hover washes are guarded to real pointers (the r283 convention)', () => {
    expect(live).toMatch(/@media \(hover: hover\) and \(pointer: fine\)/);
  });

  it('the reduced-motion static poster still covers every mover', () => {
    for (const cls of ['.fo-footer-inner', '.fo-footer-mark']) {
      expect(live, `${cls} must reset under RM`).toContain(cls);
    }
    expect(live).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.reveal-up\s*\{\s*opacity:\s*1/,
    );
    expect(live).toMatch(/\.fo-scroll-cue-dot\s*\{\s*animation:\s*none/);
  });

  it('no new animation keyframes beyond the scroll cue bob', () => {
    const keyframes = (live.match(/@keyframes/g) ?? []).length;
    expect(keyframes).toBe(1);
  });
});
