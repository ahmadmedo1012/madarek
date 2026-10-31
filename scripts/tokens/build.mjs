#!/usr/bin/env node
/**
 * scripts/tokens/build.mjs — R326 M0.4 `npm run tokens:build`.
 *
 * THE ONE SOURCE OF TRUTH: shared/design-tokens.json (the shared Heron
 * set: neutrals · triads · semantic seats · spacing · radius · motion ·
 * the mobile type ladder). This script emits BOTH platform halves:
 *
 *   frontend/src/styles/tokens.generated.css
 *     — web CSS custom properties, wrapped in the SAME `@layer tokens`
 *       as tokens.css and imported BEFORE it (main.tsx): the hand-
 *       written seats in tokens.css compose on top, and its
 *       prefers-reduced-motion kill still wins by import order.
 *   apps/mobile/src/design/tokens.generated.ts
 *     — the typed mobile data (heron palettes · statusTones · tierColors
 *       · type · sp · motion · heronEase · radius · touchFloor). The
 *       public typed surface stays in ./tokens (re-exports + the mapping
 *       functions) so every existing import keeps working.
 *
 * It also VERIFIES the RN brand port: apps/mobile/src/brand/{mark,
 * lockups,wordmark.generated}.ts must be byte-identical to
 * frontend/src/brand/* (the geometry is shared verbatim; only the
 * <Logo> renderer is platform code).
 *
 * Modes:
 *   (bare)   write the outputs (deterministic — no timestamps, so a
 *            committed regeneration is a byte-stable no-op).
 *   --check  regenerate in memory and compare against the committed
 *            files; exit 1 with a readable diff on any drift (the CI
 *            gate — `npm run tokens:check`).
 *
 * Zero dependencies. Plain node ≥ 20.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const SRC = join(ROOT, 'shared', 'design-tokens.json');
const OUT_CSS = join(ROOT, 'frontend', 'src', 'styles', 'tokens.generated.css');
const OUT_TS = join(ROOT, 'apps', 'mobile', 'src', 'design', 'tokens.generated.ts');
const BRAND_WEB = join(ROOT, 'frontend', 'src', 'brand');
const BRAND_RN = join(ROOT, 'apps', 'mobile', 'src', 'brand');
const BRAND_FILES = ['mark.ts', 'lockups.ts', 'wordmark.generated.ts'];

const CHECK = process.argv.includes('--check');

function fail(msg) {
  console.error(`\n✖ tokens:build — ${msg}`);
  process.exit(1);
}

/* ── load + $doc strip ─────────────────────────────────────────────── */
const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const data = JSON.parse(JSON.stringify(raw, (k, v) => (k === '$doc' ? undefined : v)));

const THEMES = ['light', 'dark'];
const NEUTRAL_KEYS = ['0', '50', '100', '150', '200', '300', '400', '500', '700', '800', '900'];
const TRIAD_PARTS = ['bg', 'ink', 'deep'];

/* ── validation (fail loudly, never emit a broken set) ─────────────── */
for (const t of THEMES) {
  const keys = Object.keys(data.color.neutral[t] ?? {}).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...NEUTRAL_KEYS].sort())) {
    fail(`color.neutral.${t} keys drifted: ${keys.join(',')}`);
  }
  for (const [fam, tri] of Object.entries(data.color.triad)) {
    for (const part of TRIAD_PARTS) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(tri?.[t]?.[part] ?? '')) {
        fail(`color.triad.${fam}.${t}.${part} missing or not a 6-digit hex`);
      }
    }
  }
}
const seatsL = Object.keys(data.color.semantic.light);
const seatsD = Object.keys(data.color.semantic.dark);
if (JSON.stringify(seatsL) !== JSON.stringify(seatsD)) {
  fail(`semantic seat sets differ between themes:\n  light: ${seatsL.join(',')}\n  dark:  ${seatsD.join(',')}`);
}
for (const fam of data.color.tones.families) {
  if (!data.color.triad[fam]) fail(`color.tones.families references unknown triad family "${fam}"`);
}
for (const [k, v] of Object.entries(data.spacing.webRungs)) {
  if (data.spacing.px[String(v)] !== v) {
    fail(`spacing.webRungs.${k} = ${v}px has no matching px ladder entry (px keys are the mobile contract)`);
  }
}
if (data.motion.ease.length !== 4) fail('motion.ease must be a 4-number cubic-bezier');
if (typeof data.touchFloor !== 'number') fail('touchFloor must be a number');

/* ── reference resolution ──────────────────────────────────────────── */
function refValue(ref, theme) {
  if (typeof ref !== 'string' || !ref) fail(`bad ref: ${JSON.stringify(ref)}`);
  if (ref.startsWith('#')) return ref;
  if (ref.startsWith('neutral.')) return data.color.neutral[theme][ref.slice(8)];
  if (ref.startsWith('triad.')) {
    const [, fam, part] = ref.split('.');
    return data.color.triad[fam]?.[theme]?.[part];
  }
  if (ref.startsWith('brand.')) return data.color.brand[ref.slice(6)];
  if (data.color.semantic[theme][ref] !== undefined) return data.color.semantic[theme][ref];
  if (data.color.mobile?.[ref]?.[theme] !== undefined) return data.color.mobile[ref][theme];
  return undefined;
}

function resolveMobile(ref, theme, depth = 0) {
  if (depth > 8) fail(`ref cycle/overflow at "${ref}" (${theme})`);
  const next = refValue(ref, theme);
  if (next === undefined) fail(`unresolvable ref "${ref}" (${theme})`);
  if (typeof next === 'string' && next.startsWith('#')) return next;
  return resolveMobile(next, theme, depth + 1);
}

/* every semantic seat must resolve to a literal in BOTH themes — the
 * whole shared contract hangs on this. */
for (const t of THEMES) {
  for (const [seat, ref] of Object.entries(data.color.semantic[t])) {
    const hex = resolveMobile(ref, t);
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) fail(`semantic.${t}.${seat} does not resolve to a hex: ${hex}`);
  }
}

/* ── web emission helpers ──────────────────────────────────────────── */
const kebab = (s) =>
  s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).replace(/([a-z])(\d)/g, '$1-$2');

function webVar(ref) {
  if (ref.startsWith('#')) return ref;
  if (ref.startsWith('neutral.')) return `var(--neutral-${ref.slice(8)})`;
  if (ref.startsWith('triad.')) {
    const [, fam, part] = ref.split('.');
    return `var(--c-${fam}-${part})`;
  }
  if (ref === 'brand.warmInk') return 'var(--warm-ink)'; // external seat — tokens.css base :root
  if (ref.startsWith('brand.')) fail(`web has no seat for "${ref}"`);
  return `var(--${kebab(ref)})`;
}

/* ── the CSS half ──────────────────────────────────────────────────── */
function buildCss() {
  const L = [];
  L.push('/* ═════════════════════════════════════════════════════════════════════');
  L.push('   tokens.generated.css — GENERATED FILE — DO NOT EDIT BY HAND.');
  L.push('   Source of truth: shared/design-tokens.json (R326 M0.4).');
  L.push('   Regen: npm run tokens:build · Drift gate: npm run tokens:check');
  L.push('');
  L.push('   The WEB half of the shared Heron token set: the spacing/radius/');
  L.push('   motion ladder + both theme palettes (neutrals · triads · semantic');
  L.push('   seats). Imported by main.tsx BEFORE tokens.css, inside the same');
  L.push('   @layer tokens — the hand-written seats in tokens.css compose on');
  L.push('   top, and its prefers-reduced-motion kill still wins by order.');
  L.push('   The MOBILE half: apps/mobile/src/design/tokens.generated.ts.');
  L.push('   ═════════════════════════════════════════════════════════════════════ */');
  L.push('');
  L.push('@layer tokens {');
  L.push('');
  L.push('  :root {');
  L.push('    /* ── Spacing — the 4px base ladder (historical rung names — index ≠ px/4 above --sp-6) ── */');
  for (const [name, px] of Object.entries(data.spacing.webRungs)) {
    L.push(`    --sp-${name}: ${px}px;`);
  }
  L.push('');
  L.push('    /* ── Radius — R313: the ladder collapses to 0; full = circular primitives ── */');
  for (const [k, v] of Object.entries(data.radius)) L.push(`    --r-${k}: ${v}px;`);
  L.push('');
  L.push('    /* ── Motion — the measured Heron register (r305) ── */');
  for (const [k, v] of Object.entries(data.motion)) {
    if (k === 'ease') continue;
    L.push(`    --t-${kebab(k)}: ${v}ms;`);
  }
  const [e1, e2, e3, e4] = data.motion.ease;
  L.push(`    --ease: cubic-bezier(${e1}, ${e2}, ${e3}, ${e4});`);
  L.push('  }');
  L.push('');

  const themeBlock = (theme, selectorLines) => {
    /* selectorLines carries its own opening brace on the LAST line —
     * `[data-theme="light"] {` exactly as tokens.css spells it, so the
     * tests that brace-match on that literal keep finding the block. */
    const B = [];
    B.push(...selectorLines);
    B.push(`    /* The warm vintage-paper neutral ramp (${theme}) */`);
    for (const [k, v] of Object.entries(data.color.neutral[theme])) B.push(`    --neutral-${k}: ${v};`);
    B.push('');
    B.push('    /* The 9 section families — soft ground · saturated ink · deep text */');
    for (const [fam, tri] of Object.entries(data.color.triad)) {
      const p = tri[theme];
      B.push(`    --c-${fam}-bg: ${p.bg};  --c-${fam}-ink: ${p.ink};  --c-${fam}-deep: ${p.deep};`);
    }
    B.push('');
    B.push('    /* r305 — the coral alias namespace (resolves onto the peach seat) */');
    for (const [k, v] of Object.entries(data.color.webAliases)) B.push(`    --${k}: ${v};`);
    B.push('');
    B.push('    /* Role tokens — components consume these */');
    for (const [seat, ref] of Object.entries(data.color.semantic[theme])) {
      B.push(`    --${kebab(seat)}: ${webVar(ref)};`);
    }
    B.push('  }');
    return B;
  };

  L.push('  /* LIGHT THEME — the Heron blueprint paper */');
  L.push(...themeBlock('light', ['  :root,', '  [data-theme="light"] {']));
  L.push('');
  L.push('  /* DARK THEME — the charcoal night */');
  L.push(...themeBlock('dark', ['  [data-theme="dark"] {']));
  L.push('}');
  L.push('');
  return L.join('\n');
}

/* ── the TS half ───────────────────────────────────────────────────── */
function buildTs() {
  const T = [];
  T.push('/**');
  T.push(' * tokens.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.');
  T.push(' * Source of truth: shared/design-tokens.json (R326 M0.4).');
  T.push(' * Regen (repo root): npm run tokens:build · Gate: npm run tokens:check');
  T.push(' *');
  T.push(' * The MOBILE half of the shared Heron set. The typed public surface');
  T.push(' * (HeronPalette · StatusTone · the toneFor* mappers) lives in ./tokens,');
  T.push(' * which re-exports this data — every existing import keeps working.');
  T.push(' */');
  T.push('');

  const palette = (theme) => {
    const s = data.color.semantic[theme];
    const m = (seat) => resolveMobile(s[seat], theme);
    const mo = (seat) => resolveMobile(data.color.mobile[seat][theme], theme);
    return {
      bg: m('bg'),
      surface: m('surface'),
      surfaceHover: mo('surfaceHover'),
      overlay: mo('overlay'),
      text: m('text'),
      textSecondary: m('textSecondary'),
      textMuted: m('textMuted'),
      textFaint: m('textFaint'),
      accent: m('accent'),
      accentHover: m('accentHover'),
      accentInk: m('accentInk'),
      accentSoft: m('accentSoft'),
      accentStrong: m('accentStrong'),
      accentFg: m('accentFg'),
      primary: m('primary'),
      primaryFg: m('primaryFg'),
      border: m('border'),
      rule: m('rule'),
      gold: m('gold'),
      goldInk: m('goldInk'),
      onSurface: m('text'),
      onSurfaceMuted: m('textMuted'),
    };
  };

  T.push('export const heron = {');
  for (const t of THEMES) {
    T.push(`  ${t}: {`);
    for (const [k, v] of Object.entries(palette(t))) T.push(`    ${k}: "${v}",`);
    T.push('  },');
  }
  T.push('};');
  T.push('');

  T.push('export const statusTones = {');
  for (const t of THEMES) {
    T.push(`  ${t}: {`);
    for (const fam of data.color.tones.families) {
      const p = data.color.triad[fam][t];
      T.push(`    ${fam}: { bg: "${p.bg}", ink: "${p.ink}", deep: "${p.deep}" },`);
    }
    T.push('  },');
  }
  T.push('};');
  T.push('');

  T.push('export const tierColors = {');
  for (const [k, v] of Object.entries(data.color.tiers)) T.push(`  ${k}: "${v}",`);
  T.push('};');
  T.push('');

  T.push('// The mobile px type ladder (Arabic 13px floor) — the web runs the');
  T.push('// fluid-rem ladder in tokens.css, platform-specific by design.');
  T.push('export const type = {');
  for (const [k, v] of Object.entries(data.typography.mobile)) T.push(`  ${k}: ${v},`);
  T.push('} as const;');
  T.push('');

  T.push('// The spacing ladder (px-keyed — the mobile half of webRungs).');
  T.push('export const sp = {');
  for (const p of Object.keys(data.spacing.px).map(Number).sort((a, b) => a - b)) {
    T.push(`  ${p}: ${p},`);
  }
  T.push('} as const;');
  T.push('');

  T.push('export const motion = {');
  for (const [k, v] of Object.entries(data.motion)) {
    if (k === 'ease') continue;
    T.push(`  ${k}: ${v},`);
  }
  T.push('} as const;');
  T.push('');

  const [e1, e2, e3, e4] = data.motion.ease;
  T.push(`export const heronEase = [${e1}, ${e2}, ${e3}, ${e4}] as const;`);
  T.push('');

  T.push('// Heron radius discipline: 0 everywhere; circles only for round elements.');
  T.push('export const radius = {');
  T.push(`  none: ${data.radius.xs},`);
  T.push(`  full: ${data.radius.full},`);
  T.push('} as const;');
  T.push('');

  T.push(`export const touchFloor = ${data.touchFloor};`);
  T.push('');
  return T.join('\n');
}

/* ── write / check ─────────────────────────────────────────────────── */
const outputs = [
  { path: OUT_CSS, content: buildCss(), label: 'frontend/src/styles/tokens.generated.css' },
  { path: OUT_TS, content: buildTs(), label: 'apps/mobile/src/design/tokens.generated.ts' },
];

const drift = [];

for (const out of outputs) {
  if (CHECK) {
    if (!existsSync(out.path)) {
      drift.push(`${out.label}: MISSING — run npm run tokens:build and commit`);
      continue;
    }
    const current = readFileSync(out.path, 'utf8');
    if (current !== out.content) {
      const a = current.split('\n');
      const b = out.content.split('\n');
      let first = 0;
      while (first < Math.min(a.length, b.length) && a[first] === b[first]) first++;
      drift.push(
        `${out.label}: STALE — first difference at line ${first + 1}\n` +
          `    committed: ${JSON.stringify(a[first])}\n` +
          `    expected:  ${JSON.stringify(b[first])}\n` +
          `    → run npm run tokens:build and commit the result`,
      );
    }
  } else {
    writeFileSync(out.path, out.content);
    console.log(`✓ wrote ${out.label} (${out.content.split('\n').length} lines)`);
  }
}

/* the RN brand port must mirror the web geometry byte-for-byte */
for (const f of BRAND_FILES) {
  const web = join(BRAND_WEB, f);
  const rn = join(BRAND_RN, f);
  if (!existsSync(web)) fail(`web brand source missing: ${f}`);
  if (!existsSync(rn)) {
    drift.push(`apps/mobile/src/brand/${f}: MISSING — copy it verbatim from frontend/src/brand/${f}`);
    continue;
  }
  if (readFileSync(web, 'utf8') !== readFileSync(rn, 'utf8')) {
    drift.push(
      `apps/mobile/src/brand/${f}: DRIFTED from frontend/src/brand/${f}\n` +
        `    → re-copy the file verbatim (only the <Logo> renderer is platform code)`,
    );
  }
}

if (drift.length) {
  console.error('\n✖ tokens:check — FAIL');
  for (const d of drift) console.error('  ' + d);
  process.exit(1);
}

const seats = Object.keys(data.color.semantic.light).length;
const triads = Object.keys(data.color.triad).length;
console.log(
  `\n✔ tokens:${CHECK ? 'check' : 'build'} — PASS` +
    `\n  source:  shared/design-tokens.json (${triads} triads · ${seats} semantic seats · both themes)` +
    `\n  web:     frontend/src/styles/tokens.generated.css` +
    `\n  mobile:  apps/mobile/src/design/tokens.generated.ts` +
    `\n  brand:   mark/lockups/wordmark byte-identical web ↔ RN`,
);
