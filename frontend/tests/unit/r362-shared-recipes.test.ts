/**
 * R362 — shared-recipe + state-seat contract belt (Agent 4).
 *
 * Pins the round's three moves as text contracts over the sheets that
 * own them (same scanner grammar as r305-shell-css-contract /
 * r325-app-css-contract):
 *
 *  1. TOKEN LAYER — the AA action-fill seat (--accent-fill-aa) exists
 *     in BOTH theme blocks (light literal · dark alias) + the print
 *     light-lock, and the R362 state-seat map (secondary action ·
 *     selected · hover · disabled) is defined as pure var() aliases.
 *  2. THE RESTORED RECIPES — the four shared rule families the r333
 *     WAVE 7 dead-pool deletion stripped while live consumers kept
 *     rendering the markup (checkbox/radio branded family · disabled
 *     text controls · .table-row-actions reveal · .table-pagination)
 *     are present again and token-routed.
 *  3. DE-DUPLICATION — the retired raw literals (#DB3A00 fills in
 *     components.css/patterns.css, polish.css's #ED4C1F focus twin)
 *     stay retired: their only home is the tokens.css seat.
 *  4. TRUTH ALIGNMENT — the print remap of --text-faint equals the
 *     shipped generated light value (#666660), not the stale #70706A.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STYLES = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  '..',
  'src',
  'styles',
);
const read = (f: string) => readFileSync(path.join(STYLES, f), 'utf-8');

const tokensCss = read('tokens/tokens.css');
const tokensGenerated = read('tokens/tokens.generated.css');
const components = read('components.css');
const patterns = read('patterns.css');
const polish = read('polish.css');

/** Strip CSS comments (newline-preserving) so prose cannot satisfy pins. */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat((m.match(/\n/g) ?? []).length));

const tokensClean = strip(tokensCss);
const componentsClean = strip(components);
const patternsClean = strip(patterns);
const polishClean = strip(polish);

/** Extract one [data-theme="X"] { … } block from a sheet (brace match). */
function themeBlock(sheet: string, theme: 'light' | 'dark'): string {
  const opener = `[data-theme="${theme}"] {`;
  const start = sheet.indexOf(opener);
  expect(start, `[data-theme="${theme}"] block not found`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = start + opener.length - 1; i < sheet.length; i++) {
    if (sheet[i] === '{') depth++;
    else if (sheet[i] === '}') {
      depth--;
      if (depth === 0) return sheet.slice(start, i + 1);
    }
  }
  throw new Error('unterminated theme block');
}

// ── 1. the token layer ───────────────────────────────────────────────
describe('r362 · the AA action-fill + state seats (tokens.css)', () => {
  it('seats --accent-fill-aa in both theme blocks + the print light-lock', () => {
    const light = themeBlock(tokensClean, 'light');
    const dark = themeBlock(tokensClean, 'dark');
    expect(light).toMatch(/--accent-fill-aa:\s*#DB3A00\s*;/);
    expect(dark).toMatch(/--accent-fill-aa:\s*var\(--accent\)\s*;/);
    // the print remap (dark-theme users printing on white) carries the seat too
    expect(tokensCss).toMatch(/--accent-fill-aa:\s*#DB3A00\s*;/);
  });

  it('defines the state-seat map as pure var() aliases (no raw literals)', () => {
    const seats: Array<[string, RegExp]> = [
      ['secondary', /^var\(--primary\)$/],
      ['secondary-fg', /^var\(--primary-fg\)$/],
      ['state-selected-bg', /^var\(--accent-soft\)$/],
      ['state-selected-ink', /^var\(--accent-ink\)$/],
      ['state-selected-border', /^var\(--accent\)$/],
      ['state-hover-bg', /^var\(--surface-2\)$/],
      ['state-disabled-bg', /^var\(--surface-2\)$/],
      ['state-disabled-ink', /^var\(--text-faint\)$/],
      ['state-disabled-border', /^var\(--border\)$/],
    ];
    for (const [name, value] of seats) {
      const m = tokensClean.match(new RegExp(`--${name}:\\s*([^;]+);`));
      expect(m, `tokens.css: --${name} missing`).toBeTruthy();
      expect(m?.[1]?.trim() ?? '', `--${name} must be a pure alias`).toMatch(value);
    }
  });

  it('aligns the print remap of --text-faint with the shipped light value', () => {
    const generated = tokensGenerated.match(/--text-faint:\s*(#[0-9A-Fa-f]{6})\s*;/);
    expect(generated, 'tokens.generated.css: light --text-faint missing').toBeTruthy();
    const print = tokensCss.match(/--text-faint:\s*(#[0-9A-Fa-f]{6})\s*;/);
    expect(print, 'tokens.css print remap: --text-faint missing').toBeTruthy();
    const printHex = print?.[1]?.toLowerCase() ?? '';
    expect(printHex).toBe(generated?.[1]?.toLowerCase() ?? '');
    expect(printHex).not.toBe('#70706a'); // the stale pre-R362 value
  });
});

// ── 2. the restored recipes ──────────────────────────────────────────
describe('r362 · the restored shared recipes (components.css)', () => {
  it('checkbox/radio branded family: square + hairline + accent + both radii', () => {
    expect(componentsClean).toMatch(/input\[type="checkbox"\],\s*\n\s*input\[type="radio"\]\s*\{[^}]*appearance:\s*none/s);
    const base = componentsClean.match(/input\[type="checkbox"\],\s*\n\s*input\[type="radio"\]\s*\{([\s\S]*?)\n\s*\}/);
    expect(base, 'the shared checkbox/radio base rule is missing').toBeTruthy();
    const body = base![1];
    expect(body).toContain('inline-size: 18px');
    expect(body).toContain('block-size: 18px');
    /* R366 (Agent 3 · WCAG 1.4.11): the unchecked box boundary rides
       the CONTROL seat --input-border (3:1+ on every ground; the old
       --rule-strong hairline measured 2.1:1 — under the non-text floor
       for identifying the control). */
    expect(body).toContain('border: 1px solid var(--input-border)');
    expect(body).toContain('transition: var(--t-clean)');
    expect(componentsClean).toMatch(/input\[type="checkbox"\]\s*\{\s*border-radius:\s*var\(--r-xs\);\s*\}/);
    expect(componentsClean).toMatch(/input\[type="radio"\]\s*\{\s*border-radius:\s*50%;\s*\}/);
    expect(componentsClean).toMatch(/input\[type="checkbox"\]:checked,\s*\n\s*input\[type="radio"\]:checked\s*\{[\s\S]*?background:\s*var\(--accent\);[\s\S]*?border-color:\s*var\(--accent\);/);
    expect(componentsClean).toMatch(/input\[type="checkbox"\]:hover,\s*\n\s*input\[type="radio"\]:hover\s*\{[^}]*border-color:\s*var\(--accent\)/);
    // the checkmark + radio dot pseudos are drawn, not font glyphs
    expect(componentsClean).toMatch(/input\[type="checkbox"\]:checked::after\s*\{[^}]*border-width:\s*0 0 2px 2px/s);
    expect(componentsClean).toMatch(/input\[type="radio"\]:checked::after\s*\{[^}]*border-radius:\s*50%;[^}]*background:\s*var\(--accent-fg\)/s);
  });

  it('disabled text controls: opacity + not-allowed + the disabled seat', () => {
    const rule = componentsClean.match(/\.input:disabled,\s*\n\s*input:disabled[\s\S]*?\{([\s\S]*?)\n\s*\}/);
    expect(rule, 'the shared disabled-input rule is missing').toBeTruthy();
    expect(rule![1]).toContain('opacity: var(--state-input-disabled-opacity)');
    expect(rule![1]).toContain('cursor: not-allowed');
    expect(rule![1]).toContain('background: var(--state-disabled-bg)');
  });

  it('table-row-actions reveal: hover + focus-within + touch-persistent', () => {
    expect(componentsClean).toMatch(/\.table-row-actions\s*\{[^}]*opacity:\s*0/s);
    expect(componentsClean).toMatch(/\.table tbody tr:hover \.table-row-actions,\s*\n\s*\.table tbody tr:focus-within \.table-row-actions\s*\{\s*opacity:\s*1;\s*\}/);
    expect(componentsClean).toMatch(/@media \(hover: none\)\s*\{\s*\.table-row-actions\s*\{\s*opacity:\s*1;\s*\}\s*\}/);
  });

  it('table-pagination: the rail + the selected/hover state seats', () => {
    expect(componentsClean).toMatch(/\.table-pagination\s*\{[^}]*border-block-start:\s*1px solid var\(--rule\)/s);
    const current = componentsClean.match(
      /\.table-pagination-actions button\.active,\s*\n\s*\.table-pagination-actions button\[aria-current="page"\]\s*\{([\s\S]*?)\n\s*\}/,
    );
    expect(current, 'the pagination current-page rule is missing').toBeTruthy();
    expect(current![1]).toContain('background: var(--state-selected-bg)');
    expect(current![1]).toContain('color: var(--state-selected-ink)');
    expect(current![1]).toContain('border-color: var(--state-selected-border)');
    expect(componentsClean).toMatch(/\.table-pagination-actions button:hover:not\(:disabled\)\s*\{[^}]*background:\s*var\(--state-hover-bg\)/s);
    // 44px touch floors at ≤640 (the r151b RTL wrap fix rides with them)
    expect(componentsClean).toMatch(/\.table-pagination-actions button\s*\{\s*min-inline-size:\s*44px;\s*min-block-size:\s*44px;/s);
  });
});

// ── 3. de-duplication stays retired ─────────────────────────────────
describe('r362 · retired raw literals stay retired', () => {
  it('no #DB3A00 literal outside tokens.css (the seat owns the value)', () => {
    expect(componentsClean).not.toContain('#DB3A00');
    expect(patternsClean).not.toContain('#DB3A00');
  });

  it('no #ED4C1F literal in the shared sheets (the token owns the value)', () => {
    expect(polishClean).not.toContain('#ED4C1F');
    expect(componentsClean).not.toContain('#ED4C1F');
    expect(patternsClean).not.toContain('#ED4C1F');
    // …and the input focus recipe consumes the token seat
    expect(componentsClean).toMatch(/input:focus,\s*textarea:focus,\s*select:focus\s*\{[^}]*border-color:\s*var\(--input-focus-signal\)/s);
  });

  it('the button variants ride the AA fill seat (no light-theme fill forks)', () => {
    expect(componentsClean).toMatch(/\.btn\.primary\s*\{[^}]*--_btn-bg:\s*var\(--accent-fill-aa\);[^}]*--_btn-bd:\s*var\(--accent-fill-aa\);/s);
    expect(componentsClean).toMatch(/\.btn\.accent,\s*\n\s*\.btn\.gold\s*\{[^}]*--_btn-bg:\s*var\(--accent-fill-aa\);/s);
    expect(componentsClean).not.toMatch(/\[data-theme='light'\]\s*\.btn\./);
    expect(componentsClean).toMatch(/\.btn\.outline\s*\{[^}]*--_btn-bg:\s*var\(--secondary\);[^}]*--_btn-wipe:\s*var\(--accent-fill-aa\);/s);
  });

  it('.auth-submit rides the AA wipe ground (patterns.css)', () => {
    expect(patternsClean).toMatch(/\.auth-submit::before\s*\{[^}]*background:\s*var\(--accent-fill-aa\);/s);
    expect(patternsClean).not.toMatch(/\[data-theme='light'\]\s*\.auth-submit/);
  });
});
