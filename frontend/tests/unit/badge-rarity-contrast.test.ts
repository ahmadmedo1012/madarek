/**
 * r171c — WCAG 1.4.3 pins for the achievement badge grammar
 * (training.css §achievements), both themes.
 *
 * The earned rarity chip's TEXT mix was `color-mix(in srgb,
 * var(--rarity) 60%, var(--text))` — the browser-measured worst case
 * was LEGENDARY gold at 4.47:1 in light (11px/600, under the 4.5
 * floor; COMMON grey sat marginal at 4.79). The fix drops the text
 * mix to 45% rarity + 55% --text: because the --text token flips with
 * the theme, the single ratio darkens the ink in light AND lightens
 * it in dark. The chip BACKGROUND mix stays 12% (the badge grammar:
 * fills keep the base tokens) — pinned here so a future "helpful"
 * retune cannot silently drift it.
 *
 * This suite measures, not trusts (the icon-well-contrast.test.ts
 * convention): the percentages are EXTRACTED from the live CSS, the
 * rarity palette comes from lib/gamification.ts, and the pairs are
 * computed against live tokens.css values — so a future token/palette
 * drift re-evaluates instead of passing on stale hexes.
 *
 * Sibling surfaces swept with the same pin:
 *   · locked rarity chips  (surface-3 + --text-muted)
 *   · locked descriptions  (--text-muted on the tile surface — was
 *     --text-faint, the 12px fs-xs case that measured marginal)
 *   · leaderboard rank chips (r313: transparent square hairline tiles
 *     on the card surface; the podium keeps one tiered ink — gold on
 *     rank 1, neutral ink on 2/3)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { __test__ } from '../../src/lib/theme';
import { RARITY_COLOR } from '../../src/lib/gamification';
import type { BadgeRarity } from '../../src/hooks/useResources';

const { parseHex, contrastRatio } = __test__;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

/* ── Live token resolution from tokens.css (icon-well pattern) ─────── */

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
    decls.set(m[1]!, m[2]!.trim());
  }
  return decls;
}

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

/* R326 M0.4 — the shared seats (triads · semantic · status families)
   live in the generated half now; concat it FIRST so extractBlock
   resolves the theme blocks where the values live. */
const TOKENS = read('src/styles/tokens.generated.css') + '\n' + read('src/styles/tokens.css');
const base = parseDecls(extractBlock(TOKENS, ':root {'));
const light = new Map([...base, ...parseDecls(extractBlock(TOKENS, '[data-theme="light"] {'))]);
const dark = new Map([...base, ...parseDecls(extractBlock(TOKENS, '[data-theme="dark"] {'))]);

type Rgb = { r: number; g: number; b: number };

/** color-mix(in srgb, A P%, B) as the browser resolves it: linear on
 * the gamma-encoded sRGB components (verified against the live
 * getComputedStyle values for the COMMON chip: 0.6·#9CA3AF +
 * 0.4·#191918 = rgb(103.6, 107.8, 114.6) exactly). */
function mix(a: Rgb, pct: number, b: Rgb): Rgb {
  return {
    r: (a.r * pct) / 100 + (b.r * (100 - pct)) / 100,
    g: (a.g * pct) / 100 + (b.g * (100 - pct)) / 100,
    b: (a.b * pct) / 100 + (b.b * (100 - pct)) / 100,
  };
}

function hex(name: string, themeMap: Map<string, string>): Rgb {
  const rgb = parseHex(resolveToken(name, themeMap));
  if (!rgb) throw new Error(`unparseable token: ${name}`);
  return rgb;
}

const ratio = (fg: Rgb, bg: Rgb) => contrastRatio(
  { r: Math.round(fg.r), g: Math.round(fg.g), b: Math.round(fg.b) },
  { r: Math.round(bg.r), g: Math.round(bg.g), b: Math.round(bg.b) },
);

/* ── Live rule extraction from training.css ────────────────────────── */

/** Comment-stripped body of the first rule whose selector matches
 * `selectorRegex` (anchored to the rule's opening brace). When
 * `requiredDecl` is given, the FIRST matching body that CONTAINS it
 * wins — that is how the top-3 medal GROUP rule
 * (`.rank-1, .rank-2, .rank-3 { …font-weight… }`) never shadows the
 * individual `.rank-N { background: … }` rules: for rank-3 the group
 * selector line itself ends in `{`. Throws when the pinned structure
 * moved — same contract as extractBlock. */
function trainingRule(selectorRegex: string, requiredDecl?: string): string {
  const css = read('src/styles/training.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const re = new RegExp(`${selectorRegex}\\s*\\{([^{}]*)\\}`, 'g');
  for (const m of css.matchAll(re)) {
    if (!requiredDecl || m[1]!.includes(requiredDecl)) return m[1]!;
  }
  throw new Error(`rule not found in training.css: ${selectorRegex}${requiredDecl ? ` (with ${requiredDecl})` : ''}`);
}

const EARNED_CHIP = trainingRule(String.raw`\.badge-tile\.earned \.badge-tile-rarity`);

/** The `color-mix(in srgb, var(--rarity) N%, var(--x))` percentage of
 * the named property inside a rule body. */
function rarityMixPct(ruleBody: string, prop: 'background' | 'color'): number {
  const m = ruleBody.match(
    new RegExp(`${prop}\\s*:\\s*color-mix\\(in srgb, var\\(--rarity\\) (\\d+)%, var\\(--[\\w-]+\\)\\)`),
  );
  if (!m) throw new Error(`no ${prop} rarity mix found in rule`);
  return Number(m[1]!);
}

describe('earned rarity chips — WCAG 1.4.3 (r171c, browser-verified fix)', () => {
  it('wires the text mix at 45% rarity + 55% --text and keeps the 12% background fill', () => {
    // The chosen value: 45% clears the worst rarity (LEGENDARY light)
    // with margin — recorded browser measurements at 45%: light
    // 6.23–10.14, dark 7.18–9.82. A revert to the failing 60% mix
    // fails the ratio pins below, not just this wiring line.
    expect(rarityMixPct(EARNED_CHIP, 'color')).toBe(45);
    // The badge grammar: fills keep the base tokens — the background
    // mix is unchanged from the 21-c grammar (12%).
    expect(rarityMixPct(EARNED_CHIP, 'background')).toBe(12);
  });

  it.each(Object.entries(RARITY_COLOR) as Array<[BadgeRarity, string]>)(
    '%s: every rarity chip clears 4.5:1 in light AND dark (computed from live tokens)',
    (rarity, rarityHex) => {
      const rarityRgb = parseHex(rarityHex);
      if (!rarityRgb) throw new Error(`unparseable rarity hex: ${rarityHex}`);
      const textPct = rarityMixPct(EARNED_CHIP, 'color');
      const bgPct = rarityMixPct(EARNED_CHIP, 'background');
      for (const [themeName, themeMap] of [['light', light], ['dark', dark]] as const) {
        const fg = mix(rarityRgb, textPct, hex('--text', themeMap));
        const bg = mix(rarityRgb, bgPct, hex('--surface', themeMap));
        const value = ratio(fg, bg);
        expect(value, `${rarity} chip, ${themeName} (pre-fix: ${rarity === 'LEGENDARY' && themeName === 'light' ? '4.47' : '≥4.47 band'})`).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});

describe('locked chip + locked description — WCAG 1.4.3 (r171c sweep)', () => {
  it('locked rarity chips: --text-muted on --surface-3 clears 4.5:1 in both themes', () => {
    const rule = trainingRule(String.raw`\.badge-tile\.locked \.badge-tile-rarity`);
    expect(rule).toContain('background: var(--surface-3);');
    expect(rule).toContain('color: var(--text-muted);');
    for (const themeMap of [light, dark]) {
      const value = ratio(hex('--text-muted', themeMap), hex('--surface-3', themeMap));
      // recorded: 4.58 light / 5.44 dark — ≥4.5, kept as the locked
      // grammar (no fix needed; pinned so a token drift re-evaluates).
      expect(value).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('locked descriptions use --text-muted on the tile surface (was --text-faint) and clear 4.5:1 in both themes', () => {
    const rule = trainingRule(String.raw`\.badge-tile\.locked \.badge-tile-desc`);
    expect(rule).toContain('color: var(--text-muted);');
    expect(rule).not.toContain('var(--text-faint)');
    for (const themeMap of [light, dark]) {
      const value = ratio(hex('--text-muted', themeMap), hex('--surface', themeMap));
      // recorded (browser-measured): 5.26 light / 6.33 dark.
      expect(value).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('leaderboard rank chips — WCAG 1.4.3 (r171c sweep → r313 re-pin)', () => {
  /* R313 (wpG): the rank chips became SQUARE hairline index tiles on a
   * TRANSPARENT ground (the reference's map-number grammar) — the
   * surface-3 well and the pastel medal fills are retired. The chips
   * sit on the leaderboard rows' Card surface, so every ink is
   * measured against --surface (the locked-descriptions precedent).
   * The podium keeps exactly ONE tiered ink: gold on rank 1 (the r197
   * gold discipline — achievements only). */
  it('the base rank chip (transparent + --text-muted on the card surface) clears 4.5:1 in both themes', () => {
    const rule = trainingRule(String.raw`\.leaderboard-rank\b`);
    expect(rule).toContain('background: transparent;');
    expect(rule).toContain('color: var(--text-muted);');
    expect(rule).toContain('border: 1px solid var(--rule);');
    for (const themeMap of [light, dark]) {
      expect(ratio(hex('--text-muted', themeMap), hex('--surface', themeMap))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    ['rank-1', '--gold-ink'],
    ['rank-2', '--text'],
    ['rank-3', '--text-secondary'],
  ] as const)('%s: the podium ink on the card surface clears 4.5:1 in both themes', (cls, inkToken) => {
    const rule = trainingRule(
      String.raw`\.leaderboard-rank\.${cls}\b`,
      `color: var(${inkToken})`,
    );
    expect(rule).toContain(`color: var(${inkToken});`);
    // No pastel fill survives the r313 tint sweep.
    expect(rule).not.toMatch(/background:\s*var\(--c-(yellow|grey|peach)-bg\)/);
    for (const themeMap of [light, dark]) {
      const value = ratio(hex(inkToken, themeMap), hex('--surface', themeMap));
      expect(value, `${cls} podium pair`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
