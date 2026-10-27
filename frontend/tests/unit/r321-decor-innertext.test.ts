/**
 * R321 §A6 — the decor-innertext belt (STATIC half; the runtime half
 * lives in scripts/r321/sweep-r321.mjs, per route × viewport × theme).
 *
 * The class of bug: decorative glyphs ('+', '±', '·') rendered as REAL
 * TEXT inside aria-hidden spans. aria-hidden removes an element from
 * the ACCESSIBILITY TREE but NOT from innerText — so every sheet's
 * innerText carried runs like `+ | + | + | +` and screen-reader
 * copy-paste/text-search surfaces read the chrome as words.
 *
 * The contract: every decorative mark family renders its glyph from
 * CSS ::before/::after content (out of the DOM entirely) and the span
 * carries NO text. This belt scans the component sources so a
 * regression fails in the unit suite before any browser run.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '../../src');

/** Every decorative-mark class family the app ships (the §A6 sweep —
 * if you ADD a family, it joins this list; a NEW decorative text
 * glyph anywhere is a finding, not an allowlist row). */
const DECOR_FAMILIES = [
  'auth-mark',
  'nf-mark',
  'sheet-mark',
  'bp-plus',
  'bp-dmark',
  'pr-panel-mark',
  'pr-bar-plus',
  'inkm-sketch-mark',
  'fo-cta-sketch-mark',
  'fo-wordmark-reg',
];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.tsx$/.test(name)) yield p;
  }
}

/** A span whose className contains a decor family AND carries text
 * children (regex: >glyph< inside the element). */
const textChild = (src: string): number => {
  let hits = 0;
  for (const fam of DECOR_FAMILIES) {
    const re = new RegExp(`class(?:Name)?="[^"]*\\b${fam}[^"]*"[^>]*>[^<{}]+<`, 'g');
    for (const m of src.matchAll(re)) {
      const inner = m[0].replace(/^[^>]*>/, '').replace(/<$/, '').trim();
      if (inner) hits += 1;
    }
  }
  return hits;
};

describe('R321 §A6 — decorative marks never carry DOM text (the innerText leak)', () => {
  it('every decorative mark family in the sources renders an EMPTY span', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const src = readFileSync(file, 'utf8');
      const n = textChild(src);
      if (n > 0) offenders.push(`${path.relative(SRC, file)}: ${n} text-bearing mark span(s)`);
    }
    expect(offenders, `decorative glyphs must be CSS ::before content, not text children:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the mark CSS actually paints the glyph (every family has a ::before/::after content rule)', () => {
    const styles = ['auth.css', 'landing.css', 'campus.css', 'r319-shell.css']
      .map((f) => readFileSync(path.join(SRC, 'styles', f), 'utf8'))
      .join('\n');
    for (const fam of DECOR_FAMILIES) {
      const re = new RegExp(`\\.${fam}::(?:before|after)\\s*\\{[^}]*content\\s*:\\s*['"]\\+['"]`);
      expect(re.test(styles), `.${fam}::before { content: '+' } missing from the stylesheets`).toBe(true);
    }
  });
});
