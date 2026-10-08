/**
 * R131-F12 — WCAG 1.4.11 (non-text contrast, advisory) pin for the
 * status icon wells, both themes.
 *
 * Audit A7 §5-1 measured the light-theme wells at 2.04–2.57:1
 * (success 2.53 · warning 2.04 · danger 2.57; .course-lec-well.done
 * 2.53). The fix (owner.css / student.css) chains the ICON colour to
 * the -ink tier — which in light IS the pastel -deep value
 * (--success-ink: var(--c-mint-deep)), while in dark -ink resolves to
 * the same bright family tone as the base token, so dark stays
 * pixel-identical. This suite pins all three legs:
 *
 *   1. WIRING — the well rules actually consume var(--*-ink) for the
 *      icon colour (a revert to the base token fails here);
 *   2. CONTRAST — the resolved light pairs clear 3:1 (computed from
 *      live tokens.css values, so a future token drift re-evaluates
 *      instead of passing on stale hexes);
 *   3. DARK UNCHANGED — per family, dark --x-ink ≡ dark --x (the swap
 *      is a no-op in dark by construction, asserted forever).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { __test__ } from '../../src/lib/theme';

const { parseHex, contrastRatio } = __test__;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

/* ── Live token resolution from tokens.css ─────────────────────────── */

/** Extract the balanced `{ … }` body that follows the first occurrence
 * of `selector` (throws when absent — the pinned structure moved). */
function extractBlock(source: string, selector: string): string {
  const idx = source.indexOf(selector);
  if (idx === -1) throw new Error(`selector not found in tokens.css: ${selector}`);
  const start = source.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  throw new Error(`unbalanced block for selector: ${selector}`);
}

function parseDecls(body: string): Map<string, string> {
  const decls = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    // Groups are guaranteed by the regex (noUncheckedIndexedAccess).
    decls.set(m[1]!, m[2]!.trim());
  }
  return decls;
}

/** Resolve a token through var() chains inside one theme map. */
function resolveToken(name: string, map: Map<string, string>): string {
  let value = map.get(name);
  if (value === undefined) throw new Error(`token not defined in theme: ${name}`);
  for (let hop = 0; hop < 6; hop++) {
    const v = value.trim();
    const varCall = v.match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/);
    if (!varCall) return v;
    const next = map.get(varCall[1]!);
    if (next === undefined) throw new Error(`chain broken: ${name} → ${varCall[1]}`);
    value = next;
  }
  throw new Error(`var() chain too deep for ${name}`);
}

const TOKENS = read('src/styles/tokens.css');
const base = parseDecls(extractBlock(TOKENS, ':root {'));
const light = new Map([...base, ...parseDecls(extractBlock(TOKENS, '[data-theme="light"] {'))]);
const dark = new Map([...base, ...parseDecls(extractBlock(TOKENS, '[data-theme="dark"] {'))]);

const ratio = (name: string, themeMap: Map<string, string>, well: string, icon: string) => {
  const wellRgb = parseHex(resolveToken(well, themeMap));
  const iconRgb = parseHex(resolveToken(icon, themeMap));
  if (!wellRgb || !iconRgb) throw new Error(`unparseable hex for ${name}`);
  return contrastRatio(iconRgb, wellRgb);
};

const FAMILIES = [
  { key: 'success', label: 'mint' },
  { key: 'warning', label: 'yellow' },
  { key: 'danger', label: 'rose' },
] as const;

describe('status icon wells — WCAG 1.4.11 (R131-F12, audit A7 §5-1)', () => {
  it.each(FAMILIES)('%key: light -ink-on-soft clears 3:1 (was 2.04–2.57)', ({ key }) => {
    const value = ratio(`${key} light`, light, `--${key}-soft`, `--${key}-ink`);
    // 1.4.11 non-text minimum. Pre-fix values for the record:
    // success 2.53 · warning 2.04 · danger 2.57 (computed, audit A7).
    expect(value, `${key} light -ink on -soft`).toBeGreaterThanOrEqual(3);
  });

  it.each(FAMILIES)('%key: dark -ink-on-soft stays ≥3:1 (unchanged by the fix)', ({ key }) => {
    const value = ratio(`${key} dark`, dark, `--${key}-soft`, `--${key}-ink`);
    expect(value, `${key} dark -ink on -soft`).toBeGreaterThanOrEqual(3);
  });

  it.each(FAMILIES)('%key: dark --x-ink ≡ dark --x — the swap is a dark no-op', ({ key }) => {
    // "Verify dark unchanged" as a permanent pin: in the dark theme the
    // -ink tokens resolve to the same value as the base tokens, so
    // routing the icon colour through -ink cannot move a single pixel.
    expect(resolveToken(`--${key}-ink`, dark)).toBe(resolveToken(`--${key}`, dark));
  });

  it('owner.css wires the event-icon wells through the -ink tier', () => {
    const css = read('src/styles/owner.css');
    const wells: Array<[string, string]> = [
      ['.owner-event-icon.green', 'var(--success-ink)'],
      ['.owner-event-icon.amber', 'var(--warning-ink)'],
      ['.owner-event-icon.red', 'var(--danger-ink)'],
    ];
    for (const [selector, decl] of wells) {
      const idx = css.indexOf(`${selector} {`);
      expect(idx, selector).toBeGreaterThan(-1);
      const body = css.slice(idx, css.indexOf('}', idx));
      expect(body, selector).toContain(`color: ${decl};`);
      // The pastel well itself is untouched — the fix is icon-colour-only.
      expect(body, selector).toMatch(/background: var\(--\w+-soft\);/);
    }
  });

  it('student.css wires .course-lec-well.done through --success-ink', () => {
    const css = read('src/styles/student.css');
    const idx = css.indexOf('.course-lec-well.done {');
    expect(idx).toBeGreaterThan(-1);
    const body = css.slice(idx, css.indexOf('}', idx));
    expect(body).toContain('background: var(--success-soft);');
    expect(body).toContain('color: var(--success-ink);');
  });

  it('the passing wells stay untouched (blue 3.06:1, purple 3.18:1 — no restyle)', () => {
    // The audit's failing range was 2.04–2.57:1; copper and lavender
    // already clear 3:1, so their rules keep their original tokens.
    const css = read('src/styles/owner.css');
    const kept: Array<[string, string]> = [
      ['.owner-event-icon.blue', 'color: var(--accent);'],
      ['.owner-event-icon.purple', 'color: var(--c-lavender-ink);'],
    ];
    for (const [selector, decl] of kept) {
      const idx = css.indexOf(`${selector} {`);
      expect(idx, selector).toBeGreaterThan(-1);
      const body = css.slice(idx, css.indexOf('}', idx));
      expect(body, selector).toContain(decl);
    }
    // And their computed ratios still clear the bar today.
    expect(ratio('copper light', light, '--accent-soft', '--accent')).toBeGreaterThanOrEqual(3);
    expect(ratio('lavender light', light, '--c-lavender-bg', '--c-lavender-ink')).toBeGreaterThanOrEqual(3);
  });

  /* ── R131-F12b completion: the two INLINE wells the css sweep missed ── */

  it('ErrorBoundary crash-scene well chains through --danger-ink (States.tsx 5-D1 grammar)', () => {
    // The full-viewport state-icon copy of ErrorState's danger well had
    // kept the pre-5-D1 base token (2.57:1 light) — pinned to the -ink
    // tier so it can never drift from States.tsx:168 again.
    const tsx = read('src/components/ErrorBoundary.tsx');
    expect(tsx).toContain("background: 'var(--danger-soft)',");
    expect(tsx).toContain("color: 'var(--danger-ink)',");
    expect(tsx).not.toContain("color: 'var(--danger)',");
  });

  it('CollegePages LIVE badge chains through --danger-ink (was 2.57:1 — TEXT, 1.4.3)', () => {
    // The "مباشر الآن" pill is a text-bearing wash, so the light pair
    // must clear 4.5:1 (1.4.3), not just the 3:1 non-text floor: the
    // base --danger managed 2.57:1; --danger-ink gives 9.02:1.
    const tsx = read('src/pages/colleges/CollegePages.tsx');
    expect(tsx).toContain(
      "style={{ background: 'var(--danger-soft)', color: 'var(--danger-ink)' }}",
    );
    const value = ratio('live badge light', light, '--danger-soft', '--danger-ink');
    expect(value).toBeGreaterThanOrEqual(4.5);
  });

  it('fleet sweep: no remaining base-status token as a well icon colour (css + tsx)', () => {
    // The completion sweep's regression net: any NEW well pairing a
    // `color: var(--<family>)` base token with a `-soft`/`-bg` wash
    // (stylesheet rule or inline style) fails here — the grammar is
    // -ink-on-soft everywhere (dark is a no-op by construction, pinned
    // per-family above). Border rails (border-inline-start-color) and
    // input aria-invalid borders are state boundaries, not wells, and
    // stay exempt.
    const families = ['success', 'warning', 'danger', 'info', 'gold'];
    // Every stylesheet + every TSX with an inline style object — the
    // two files F12b repaired are in the walk like any other, no
    // special-casing.
    const walk = (dir: string): string[] =>
      readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
        const rel = `${dir}/${e.name}`;
        return e.isDirectory() ? walk(rel) : e.name.endsWith('.tsx') ? [rel] : [];
      });
    const sources = [
      ...readdirSync(path.join(root, 'src/styles'))
        .filter((f) => f.endsWith('.css'))
        .map((f) => `src/styles/${f}`),
      ...walk('src'),
    ];
    for (const file of sources) {
      const text = read(file);
      // css: `background: var(--x-soft|-bg)` and `color: var(--family);` in one rule
      const rules = text.match(/[^{}]+\{[^{}]+\}/g) ?? [];
      for (const rule of rules) {
        if (!/--[\w-]+-(?:soft|bg)\)/.test(rule)) continue;
        for (const f of families) {
          // The lookbehind keeps border rails (border-inline-start-color)
          // and custom-prop sets (--_x-color) out of scope — icon/text
          // colour declarations only.
          expect(
            new RegExp(`(?<![\\w-])color:\\s*var\\(--${f}\\);`).test(rule),
            `${file}: base --${f} icon colour inside a washed rule`,
          ).toBe(false);
        }
      }
      // inline style objects: any base-family token in a color-ish prop
      // (plain or ternary) inside a washed style object.
      for (const style of text.match(/style=\{\{[^}]+\}\}/g) ?? []) {
        if (!/--[\w-]+-(?:soft|bg)\)/.test(style)) continue;
        for (const f of families) {
          expect(
            new RegExp(`color[^:]*:\\s*[^\\n]*['"]var\\(--${f}\\)['"]`).test(style),
            `${file}: base --${f} inline well colour`,
          ).toBe(false);
        }
      }
    }
  });
});
