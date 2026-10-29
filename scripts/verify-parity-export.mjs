#!/usr/bin/env node
/* ═════════════════════════════════════════════════════════════════════
   verify-parity-export.mjs — canonical parity gate for the export pair
   ─────────────────────────────────────────────────────────────────────
   r127-F1 companion to:
     frontend/src/styles/unified-parity.css          (canonical export)
     frontend/src/styles/shared-design-system.css   (structural skeleton)

   Dependency-free (node:fs / node:path / node:url only). Gates:

     1. TOKEN PARITY — parses tokens.css (the source of truth) and the
        parity export, builds resolved light/dark token maps for both
        (theme blocks + var() chains + fallbacks), and asserts 150+ key
        tokens match EXACTLY. For the headline tokens the canonical side
        is additionally pinned to its documented value (r195 egn re-key:
        night ground #0A0A0A, teal #027380/#2FB6C6, light ground #F7F7F7,
        ink #333333/#F2F2F2 …), so a future drift of tokens.css itself
        fails loudly instead of silently dragging the export along.
     2. UNDEFINED-VAR AUDIT — every var(--x) in the export must resolve
        within the export itself (directly, or through a complete
        fallback chain). Opt-in consumer hooks (--reveal-distance,
        --reveal-index) are allowed only with complete fallbacks.
        The shared skeleton is audited against shared ∪ parity ∪ a
        documented shadcn-style host-alias set.
     3. FORBIDDEN VALUES — the retired divergent values (saffron/ember
        hexes, Tailwind grays, generic dark grounds, oklch shadows,
        blur(20px), the wrong ease-out curve, the invented z-bands, …)
        must be absent from BOTH files, comments included.
     4. BRACE BALANCE — both files must parse (balanced braces, no
        negative depth) after comment stripping.

   Exit 0 = pass. Exit 1 = readable diff of every failure.
   ═════════════════════════════════════════════════════════════════════ */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PATHS = {
  canonical: join(ROOT, 'frontend/src/styles/tokens.css'),
  parity: join(ROOT, 'frontend/src/styles/unified-parity.css'),
  shared: join(ROOT, 'frontend/src/styles/shared-design-system.css'),
};
const read = (p) => readFileSync(p, 'utf8');
const lineCount = (s) => s.split('\n').length;

/* ── CSS parsing (comments stripped, blocks walked, @media tracked) ── */

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseDecls(body) {
  const decls = [];
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) decls.push([m[1], m[2].trim()]);
  return decls;
}

/** Walk a CSS string, returning leaf rule blocks in file order.
 *  @media blocks are recursed into and flagged; @layer/@supports are
 *  recursed transparently; @keyframes bodies are skipped. */
function walkBlocks(css, mediaDepth, out) {
  let i = 0;
  let selStart = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      let depth = 1;
      let j = i + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      const selector = css.slice(selStart, i).trim();
      const body = css.slice(i + 1, j - 1);
      if (selector.startsWith('@media')) {
        walkBlocks(body, mediaDepth + 1, out);
      } else if (selector.startsWith('@layer') || selector.startsWith('@supports')) {
        walkBlocks(body, mediaDepth, out);
      } else if (!selector.startsWith('@keyframes')) {
        out.push({ selector, decls: parseDecls(body), media: mediaDepth > 0 });
      }
      i = j;
      selStart = j;
    } else if (ch === '}' || ch === ';') {
      i++;
      selStart = i;
    } else {
      i++;
    }
  }
  return out;
}

const parseCss = (css) => walkBlocks(stripComments(css), 0, []);

/* ── Theme maps (mirrors the CSS cascade: base tier, then scoped tier,
     file order within a tier; @media blocks excluded) ───────────────── */

function selectorTier(part, theme) {
  const attr = `[data-theme="${theme}"]`;
  if (part === ':root' || part === attr) return 1;
  if (part === `:root${attr}`) return 2;
  return 0;
}

function buildThemeMap(blocks, theme) {
  const map = new Map();
  const tier1 = [];
  const tier2 = [];
  for (const b of blocks) {
    if (b.media) continue;
    let best = 0;
    for (const part of b.selector.split(',').map((s) => s.trim()).filter(Boolean)) {
      const t = selectorTier(part, theme);
      if (t > best) best = t;
    }
    if (best === 1) tier1.push(b);
    else if (best === 2) tier2.push(b);
  }
  for (const b of [...tier1, ...tier2]) for (const [k, v] of b.decls) map.set(k, v);
  return map;
}

/* ── var() resolution with nested fallbacks and cycle guard ────────── */

function readBalanced(s, start) {
  let depth = 1;
  let i = start;
  while (i < s.length) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return { inner: s.slice(start, i), end: i + 1 };
    }
    i++;
  }
  return { inner: s.slice(start), end: s.length };
}

function resolveValue(value, map, seen = new Set()) {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const idx = value.indexOf('var(', i);
    if (idx === -1) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, idx);
    const { inner, end } = readBalanced(value, idx + 4);
    const comma = inner.indexOf(',');
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === -1 ? null : inner.slice(comma + 1).trim();
    let sub = null;
    if (name.startsWith('--') && !seen.has(name)) {
      const raw = map.get(name);
      if (raw !== undefined) sub = resolveValue(raw, map, new Set(seen).add(name));
    }
    if (sub === null && fallback !== null) sub = resolveValue(fallback, map, seen);
    if (sub === null) return null;
    out += sub;
    i = end;
  }
  return out;
}

const norm = (v) =>
  v
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*\/\s*/g, '/')
    .trim()
    .toLowerCase();

/* ── var() reference inventory (for the undefined-var audit) ───────── */

function collectVarRefs(css) {
  const text = stripComments(css);
  const refs = new Map(); // name -> { hasFallback: bool, fallbackClean: bool }
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf('var(', i);
    if (idx === -1) break;
    const { inner, end } = readBalanced(text, idx + 4);
    const comma = inner.indexOf(',');
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma === -1 ? null : inner.slice(comma + 1).trim();
    if (name.startsWith('--')) {
      const prev = refs.get(name) || { hasFallback: true, fallbackClean: true };
      if (fallback === null) prev.hasFallback = false;
      else {
        // the fallback must itself contain only resolvable refs
        let f = fallback;
        let ok = true;
        let j = 0;
        while (j < f.length) {
          const k = f.indexOf('var(', j);
          if (k === -1) break;
          const b = readBalanced(f, k + 4);
          const nm = (b.inner.indexOf(',') === -1
            ? b.inner
            : b.inner.slice(0, b.inner.indexOf(','))
          ).trim();
          if (!nm.startsWith('--')) ok = false;
          else if (!refs.has(nm) && nm !== name) {
            // unknown inner ref: only acceptable if it is defined or the
            // whole fallback has its own fallback — approximate with the
            // global definition set later; mark pending by name
            prev._pendingInner = prev._pendingInner || new Set();
            prev._pendingInner.add(nm);
          }
          j = b.end;
        }
        if (!ok) prev.fallbackClean = false;
      }
      refs.set(name, prev);
    }
    i = end;
  }
  return refs;
}

function collectDefs(css) {
  const defs = new Set();
  for (const b of parseCss(css)) for (const [k] of b.decls) defs.add(k);
  return defs;
}

function auditVars(css, defs, label, extraExternals = new Set()) {
  const refs = collectVarRefs(css);
  const broken = [];
  const hooks = [];
  for (const [name, info] of refs) {
    if (defs.has(name) || extraExternals.has(name)) continue;
    if (info.hasFallback && info.fallbackClean) {
      // every var named inside the fallback must be defined (or external)
      const inner = info._pendingInner || new Set();
      const innerOk = [...inner].every((n) => defs.has(n) || extraExternals.has(n));
      if (innerOk) {
        hooks.push(name);
        continue;
      }
    }
    broken.push(name);
  }
  return { label, broken, hooks: [...new Set(hooks)] };
}

/* ── Gate 1: token parity checks ────────────────────────────────────── */

const canonBlocks = parseCss(read(PATHS.canonical));
const parityBlocks = parseCss(read(PATHS.parity));
const maps = {
  canonical: { light: buildThemeMap(canonBlocks, 'light'), dark: buildThemeMap(canonBlocks, 'dark') },
  parity: { light: buildThemeMap(parityBlocks, 'light'), dark: buildThemeMap(parityBlocks, 'dark') },
};

/* [theme, token, pinnedCanonicalValue|null, note, opts?]
   theme 'root' = primitives (looked up on the light/base map).
   Pinned values double-assert the CANONICAL side against its documented
   value, so tokens.css drift fails loudly.
   opts.canonicalUnresolved: mechanism for documented canonical wrinkles
   — a token whose canonical value references an undefined var. Its one
   use is RETIRED (r130-W2-7): tokens.css spelled --journey-core:
   var(--ink) with --ink defined nowhere; --ink is now defined in both
   theme blocks, so those rows assert through the normal path. */
const CHECKS = [
  // ── :root primitives — radius ladder (R313: collapsed to 0) ──
  ['root', '--r-xs', '0px', 'radius rung 1 — 0 (R313 override: 2px → 0px (owner decision — Heron parity; the reference measures radius 0 on 2770/2774 surfaces))'],
  ['root', '--r-sm', '0px', 'radius rung 2 — 0 (R313 override: 4px → 0px (owner decision))'],
  ['root', '--r-md', '0px', 'radius rung 3 — 0 (R313 override: 6px → 0px (owner decision))'],
  ['root', '--r-lg', '0px', 'radius rung 4 — 0 (R313 override: 8px → 0px (owner decision))'],
  ['root', '--r-xl', '0px', 'radius rung 5 — 0 (R313 override: 12px → 0px (owner decision))'],
  ['root', '--r-2xl', '0px', 'radius rung 6 — 0 (R313 override: 16px → 0px (owner decision))'],
  ['root', '--r-3xl', '0px', 'radius rung 7 — 0 (R313 override: 20px → 0px (owner decision))'],
  ['root', '--r-full', '9999px', 'pill radius — circular primitives only (avatars, status dots; kept in R313)'],
  // ── :root primitives — spacing ──
  ['root', '--sp-1', '4px', 'spacing base'],
  ['root', '--sp-0-5', '2px', 'r185 micro rung (chip 2/8 ladder + optical nudges)'],
  ['root', '--sp-2-5', '10px', 'r185 compact-control rung'],
  ['root', '--sp-7', '32px', 'divergent revision had 28px'],
  ['root', '--sp-8', '40px', 'divergent revision had 32px'],
  ['root', '--sp-10', '56px', 'missing from the divergent revision'],
  ['root', '--sp-16', '240px', 'full ladder top'],
  // ── :root primitives — motion ladder (r305: the measured Heron register) ──
  ['root', '--t-micro', '80ms', 'motion rung 1 — press feedback (unranged)'],
  ['root', '--t-fast', '200ms', 'motion rung 2 (r305 Heron re-key; was 160)'],
  ['root', '--t-base', '400ms', 'motion rung 3 — the reference dominant (.4s x174; was 240)'],
  ['root', '--t-slow', '500ms', 'motion rung 4 (r305; was 380)'],
  ['root', '--t-slower', '650ms', 'motion rung 5 (r305; was 520)'],
  ['root', '--t-cinema', '900ms', 'motion rung 6 (r305; was 720)'],
  // R313 (D10) — the measured sheet instruments (loader exit; the
  // route sweep pair joins below in the D11 rows)
  ['root', '--t-sheet-exit', '835ms', 'R313: the loader center-out two-band split (measured on the reference — slit 49.94/50.06% → 0/100%; was the R309 fixed 650ms whose animation raced to ~21ms)'],
  // ── :root primitives — easings (r305: the reference curves) ──
  ['root', '--ease', 'cubic-bezier(0.23,1,0.32,1)', "the reference's decel standard (x11 in bundle)"],
  ['root', '--ease-out', 'cubic-bezier(0.16,1,0.3,1)', 'canonical settle (unchanged)'],
  ['root', '--ease-in', 'cubic-bezier(0.625,0.05,0,1)', "the reference's roll/exit curve (was 0.7,0,0.84,0)"],
  ['root', '--ease-soft', 'cubic-bezier(0.22,1,0.36,1)', 'soft emphasis'],
  ['root', '--ease-spring-soft', 'cubic-bezier(0.34,1.18,0.64,1)', 'spring soft tier'],
  ['root', '--ease-spring', 'cubic-bezier(0.34,1.36,0.64,1)', 'spring pop'],
  ['root', '--ease-bounce', 'cubic-bezier(0.34,1.56,0.64,1)', 'bounce tier'],
  ['root', '--ease-spring-snappy', 'cubic-bezier(0.5,1.6,0.4,1)', 'snappy rebound'],
  // ── :root primitives — semantic motion ──
  ['root', '--motion-duration-micro', '80ms', 'semantic micro'],
  ['root', '--motion-duration-short', '200ms', 'semantic short (r305)'],
  ['root', '--motion-duration-medium', '400ms', 'semantic medium (r305)'],
  ['root', '--motion-duration-long', '500ms', 'semantic long (r305)'],
  ['root', '--motion-duration-page', '400ms', 'page transition (r305 Heron register; was 320)'],
  ['root', '--motion-duration-reveal', '480ms', 'reveal (r305; was 360)'],
  ['root', '--motion-duration-stat', '700ms', 'stat counter + sheen (unchanged)'],
  ['root', '--motion-duration-skeleton', '1200ms', 'shimmer loop (unchanged)'],
  ['root', '--motion-duration-sheet-exit', '835ms', 'R313 (D10): canonical seat for the entrance sheet\'s exit (raw rung --t-sheet-exit)'],
  ['root', '--press-scale', '0.97', 'control press'],
  ['root', '--motion-stagger-step', '60ms', 'stagger step'],
  ['root', '--motion-stagger-cap', '6', 'stagger cap'],
  ['root', '--motion-direction', '1', 'RTL direction multiplier'],
  // ── :root primitives — z ladder ──
  ['root', '--z-base', '0', 'z: base'],
  ['root', '--z-dropdown', '100', 'z: dropdown'],
  ['root', '--z-popover', '200', 'z: popover'],
  ['root', '--z-tooltip', '250', 'z: tooltip'],
  ['root', '--z-sheet', '300', 'z: sheet'],
  ['root', '--z-modal', '400', 'z: modal'],
  ['root', '--z-toast', '500', 'z: toast'],
  ['root', '--z-lightbox', '600', 'z: lightbox'],
  // ── :root primitives — type ──
  ['root', '--fw-black', '700', 'Plex has no 800 — resolves to 700'],
  [
    'root',
    '--font-sans',
    "'ibm plex sans arabic','tajawal',system-ui,-apple-system,'segoe ui',roboto,sans-serif",
    'IBM Plex Sans Arabic first (r305 licensing audit: BT Grotesk not reusable — spec §fonts)',
  ],
  [
    'root',
    '--font-mono',
    "'geist mono','ibm plex mono','ibm plex sans arabic',ui-monospace,'sfmono-regular',monospace",
    'R313 override: IBM Plex Mono first → Geist Mono first (owner decision — the reference\'s OFL instrument voice, self-hosted latin 400/500; Plex Mono stays the fallback)',
  ],
  ['root', '--lh-tight', '1.05', 'Arabic-tuned ladder (unchanged)'],
  ['root', '--lh-base', '1.65', 'body leading (unchanged)'],
  ['root', '--lh-loose', '1.85', 'loose leading (unchanged)'],
  // R313 — the fluid-rem type ladder (root html 0.5787037037vw + the
  // 991/767 bands; 13px Arabic floors; mono micro sizes Latin-only).
  ['root', '--fs-xxs', '13px', 'the 13px Arabic floor (kept in R313)'],
  ['root', '--fs-xs', '13px', 'the 13px Arabic floor (kept in R313)'],
  ['root', '--fs-sm', '13px', 'label base (kept in R313)'],
  ['root', '--fs-chrome', 'max(13px,1.6rem)', 'R313 override: 0.875rem → max(13px,1.6rem) (owner decision — the reference\'s uniform 13.33px chrome/body run on the fluid root, Arabic-floored)'],
  ['root', '--fs-h1', '5.6rem', 'R313 override: 30px → 5.6rem (owner decision — Heron h1 46.67px @1440 on the fluid root)'],
  ['root', '--fs-h2', '4.8rem', 'R313 override: 24px → 4.8rem (owner decision — Heron h2 40px @1440)'],
  ['root', '--fs-h3', '4rem', 'R313: Heron h3 33.33px @1440 on the fluid root'],
  ['root', '--fs-display-xl', '8rem', 'R313: the +0.8rem h-ladder continuation (66.67px @1440)'],
  ['root', '--fs-body', 'max(13px,1.6rem)', 'R313 override: 16px → max(13px,1.6rem) (owner decision — Heron txt-16 13.33px @1440, Arabic-floored)'],
  ['root', '--fs-body-lg', 'max(13px,1.8rem)', 'R313 override: 18px → max(13px,1.8rem) (owner decision — the lead step, Arabic-floored)'],
  ['root', '--fs-mono-md', '1.4rem', 'R313: Heron txt-14 mono micro-label (11.67px @1440, Latin-only, no floor)'],
  ['root', '--fs-mono-sm', '1.2rem', 'R313: Heron txt-12 (10px @1440 — the loader % size)'],
  ['root', '--fs-mono-xs', '1rem', 'R313: Heron txt-10 (8.33px @1440 — the coordinate readout size)'],
  ['root', '--ls-display-tight', '-0.02em', 'R313: the reference\'s Latin display tracking (−0.93px on the 46.67px h1); Arabic stays 0'],
  ['root', '--type-display-line-height', '1.28', 'r192 measured-safe Arabic display leading'],
  ['root', '--type-metric-letter-spacing', '0', 'tracking misaligns tnum columns'],
  ['root', '--ls-tight', '0', 'zero tracking (Arabic joins; the reference -0.02em stays Latin-only-banned)'],
  ['root', '--ls-snug', '0', 'zero tracking (Arabic joins)'],
  // ── :root primitives — layout ──
  ['root', '--sidebar-w', '256px', 'sidebar width'],
  ['root', '--content-max-w', '1280px', 'content measure'],

  // ── LIGHT theme — the warm vintage paper + orange signal (R313) ──
  ['light', '--bg', '#f6f6ee', 'PAPER — page ground (R313 override: #f6f8fa → #f6f6ee (owner decision — the warm vintage paper, live-sampled on the reference; the blue-grey ground is retired))'],
  ['light', '--surface', '#ffffff', 'GROUND — cards/inputs (unchanged: surfaces stay white)'],
  ['light', '--neutral-0', '#ffffff', 'ground rung 0'],
  ['light', '--neutral-50', '#f6f6ee', 'paper rung 50 (R313 override: #f6f8fa → #f6f6ee)'],
  ['light', '--neutral-100', '#f0f0e6', 'R313 override: #f0f2f5 → #f0f0e6 (owner decision — the warm paper hover band; no blue-grey tints)'],
  ['light', '--neutral-150', '#efefe4', 'R313 override: #e9ecef → #efefe4 (owner decision — the warm inset well)'],
  ['light', '--neutral-200', '#e0e0da', "hairline — the reference's guide grey (kept; the --border seat)"],
  ['light', '--neutral-300', '#b3b3af', 'R313 override: #c8c8c8 → #b3b3af (owner decision — the reference\'s --content--border: rule/grid/strong-border seat)'],
  ['light', '--neutral-900', '#282828', "INK — the charcoal (the reference's --content--primary, 13.57:1 paper AAA)"],
  ['light', '--text', '#282828', 'light text = ink'],
  ['light', '--text-muted', '#62625f', 'R313 override: #626260 → #62625f (owner decision — rgba(40,40,40,.72) on #F6F6EE as a solid: 5.63:1 ground · 6.12:1 surface)'],
  ['light', '--text-faint', '#70706a', 'R313 override: #72726f → #70706a (owner decision — warm faint re-derived for the new paper: 4.59:1 ground, AA where it carries text)'],
  ['light', '--accent', '#fa3600', "VIVID ORANGE signal (r305 — the reference's --content--brand; 3.53:1 paper = UI/large tier; eras: copper r303/r304, ultramarine r197, teal r195)"],
  ['light', '--accent-hover', '#d03000', 'signal hover — the binary-searched AA floor doubles as hover (r305); R323 A5 override: the state-contrast round retuned it #d92f00 → #d03000 (tokens.css + the export moved together; this pin follows)'],
  ['light', '--accent-soft', '#fce3d9', 'signal soft ground (r305 ember tint)'],
  ['light', '--accent-strong', '#a32400', 'deep signal — 7.02:1 (r305)'],
  ['light', '--accent-fg', '#ffffff', 'R313 override: #191918 → #ffffff (owner decision — the reference ships white-on-#FA3600 labels, 3.76:1 AA-large; superseded r305 "never white" rule; small Arabic accent labels get weight ≥600 + size ≥14px)'],
  ['light', '--accent-ink', '#c72e00', 'text-safe signal ink — 5.06:1 ground / 5.50:1 surface'],
  ['light', '--state-focus-ring-color', '#c72e00', 'light ring = accent-ink (5.06:1 paper, >=3:1 every adjacent surface)'],
  ['light', '--success', '#3f8f5c', 'mint = success green (r305 computed triad)'],
  ['light', '--warning', '#a8750f', 'yellow/amber (r305)'],
  ['light', '--danger', '#f15534', "rose = the coral (r305 — rhymes with the signal; warm-ink labels 5.10:1)"],
  ['light', '--info', '#4a7fa8', 'sky (r305 slate-blue; the retired #3898EC Webflow leak is forbidden)'],
  ['light', '--success-ink', '#1b5430', 'mint text ink (r305)'],
  ['light', '--warning-ink', '#5e420c', 'yellow text ink (r305)'],
  ['light', '--danger-ink', '#8c230a', 'rose text ink (r305)'],
  ['light', '--info-ink', '#1f4968', 'sky text ink (r305)'],
  ['light', '--danger-fg', '#191918', 'warm-ink on the coral fill — 5.10:1 (r305)'],
  ['light', '--gold', '#b57438', 'achievement gold — the demoted r304 copper seat (r305 circular economy), 3.57:1 large/deco tier'],
  ['light', '--gold-ink', '#8f5a28', 'gold text ink — 5.39:1 ground (r305)'],
  ['light', '--gold-soft', '#f5ebd6', 'soft gold ground → yellow-bg (r305)'],
  ['light', '--primary', '#282828', 'light primary = charcoal slab (r305; white label 14.74:1)'],
  ['light', '--primary-fg', '#ffffff', 'on primary'],
  // ── LIGHT theme — family triads (r305) ──
  ['light', '--c-copper-bg', '#fce3d9', 'ember triad: bg (r305; name kept as the compatible seat)'],
  ['light', '--c-copper-ink', '#fa3600', 'ember triad: ink = the vivid signal (r305)'],
  ['light', '--c-copper-deep', '#a32400', 'ember triad: deep (r305)'],
  ['light', '--c-sand-bg', '#f1ecdf', 'sand triad: bg (unchanged)'],
  ['light', '--c-sand-ink', '#b59868', 'sand triad: ink (unchanged)'],
  ['light', '--c-sand-deep', '#5a4623', 'sand triad: deep (unchanged)'],
  ['light', '--c-peach-bg', '#fce5de', 'peach triad: bg (r305 — re-keyed to the coral seat)'],
  ['light', '--c-mint-ink', '#3f8f5c', 'mint triad: ink = success green (r305)'],
  ['light', '--c-lavender-deep', '#3f2d7a', 'lavender triad: deep (unchanged)'],
  ['light', '--c-sky-ink', '#4a7fa8', 'sky triad: ink (r305)'],
  ['light', '--c-yellow-bg', '#f5ebd6', 'yellow triad: bg (r305)'],
  ['light', '--c-rose-ink', '#f15534', 'rose triad: ink = the coral (r305)'],
  ['light', '--c-grey-deep', '#282828', 'grey triad: deep (r305 — the charcoal)'],
  // ── LIGHT theme — glass, elevation, charts (r305) ──
  ['light', '--glass-bg', 'rgba(246,246,238,0.78)', 'R313 override: rgba(246,248,250,0.78) → rgba(246,246,238,0.78) (owner decision — the warm paper glass)'],
  ['light', '--glass-blur', '16px', 'glass blur (r140 ruling stands)'],
  ['light', '--glass-bg-strong', 'rgba(246,246,238,0.92)', 'R313 override: rgba(246,248,250,0.92) → rgba(246,246,238,0.92) (strong tier, warm paper)'],
  ['light', '--glass-blur-strong', '16px', 'strong tier keeps the canonical 16px blur'],
  ['light', '--chart-6', '#a6791f', 'series amber (r305: 3.67:1 on paper — clears the 3:1 non-text bar)'],
  ['light', '--chart-text', '#62625f', 'R313: chart text ink (= muted, 5.63:1 paper)'],
  ['light', '--border', '#e0e0da', 'R313 hairline seat — the reference\'s guide grey #E0E0DA (unchanged value, re-seated)'],
  ['light', '--rule', '#b3b3af', 'R313 override: #c8c8c8 → #b3b3af (owner decision — the reference\'s construction hairline)'],
  ['light', '--grid-line', '#b3b3af', 'R313 override: #b4b4b0 → #b3b3af (owner decision — via --neutral-300 now)'],
  ['light', '--elev-1', 'none', 'R313 override: 0 1px 2px rgba(28,28,28,0.05) → none (owner decision — decorative shadows removed, depth via hairlines only)'],
  ['light', '--elev-2', 'none', 'R313 override: layered elev-2 → none (owner decision)'],
  ['light', '--elev-3', 'none', 'R313 override: layered elev-3 → none (owner decision)'],
  ['light', '--elev-4', 'none', 'R313 override: layered elev-4 → none (owner decision)'],
  ['light', '--elev-5', 'none', 'R313 override: layered elev-5 → none (owner decision)'],
  ['light', '--shadow-card', 'none', 'R313 override: elev-1 shadow → none (owner decision)'],
  [
    'light',
    '--shadow-modal',
    'none',
    'R313 override: elev-4 modal shadow → none (owner decision)',
  ],

  // ── DARK theme — the charcoal night (r305) ──
  ['dark', '--bg', '#282828', 'NIGHT charcoal ground (r305 — the reference ink promoted to ground)'],
  ['dark', '--surface', '#2e2e2e', 'night ground — cards/inputs (r305)'],
  ['dark', '--neutral-0', '#2e2e2e', 'night ground rung 0 (r305)'],
  ['dark', '--neutral-50', '#282828', 'night charcoal rung 50 (r305)'],
  ['dark', '--neutral-100', '#353535', 'night raised step (r305)'],
  ['dark', '--neutral-150', '#3d3d3d', 'night inset well (r305)'],
  ['dark', '--neutral-200', '#4a4a48', 'night hairline (r305)'],
  ['dark', '--neutral-300', '#5c5c5a', 'night divider (r305)'],
  ['dark', '--neutral-400', '#8a8a86', 'night non-text rung (r305)'],
  ['dark', '--neutral-500', '#b4b4b0', "night ink-muted (r305 — the reference's disable grey redeemed as TEXT: 7.09:1)"],
  ['dark', '--neutral-700', '#c9c9c5', 'night ink-secondary (r305)'],
  ['dark', '--neutral-800', '#e0e0dc', 'night strong (r305)'],
  ['dark', '--neutral-900', '#f6f8fa', 'night ink — the paper twin (KEPT in R313: readability on #282828; the reference\'s own dark body #B4B4B0 is the muted tier. This is the ONE remaining #F6F8FA seat — it is NOT a forbidden needle for exactly this reason)'],
  ['dark', '--text', '#f6f8fa', 'dark text = night ink (the same single remaining #F6F8FA use)'],
  ['dark', '--text-muted', '#b4b4b0', 'dark muted (r305 — 7.09:1 bg · 6.53:1 surface · 5.90:1 s2)'],
  ['dark', '--text-faint', '#a2a29d', 'dark faint (r305: AA tier — 5.75:1 bg · 5.30:1 surface)'],
  ['dark', '--text-on-accent', '#191918', 'warm-ink on the luminous ember fill — 5.64:1 (r305)'],
  // ── DARK theme — the signal family (r305) ──
  ['dark', '--accent', '#ff5a1f', 'LUMINOUS EMBER fill (r305; 4.73:1 bg — AA-large/UI; eras: copper #E0A067 r304, ultramarine r197)'],
  ['dark', '--accent-hover', '#ff6b33', 'ember hover on dark (r305)'],
  ['dark', '--accent-soft', '#432015', 'ember soft ground on dark (r305)'],
  ['dark', '--accent-strong', '#ffc5ae', 'light ember tier — 9.72:1 text tier (r305)'],
  ['dark', '--accent-fg', '#191918', 'warm-ink on the ember fill — 5.64:1 (r305)'],
  ['dark', '--accent-ink', '#ff6b33', 'text-safe signal ink on dark — 4.79:1 surface / 5.20:1 bg (r315 C4-D: raised off the #FF5A1F fill, 4.35:1 surface < the 4.5 AA floor for 13px labels; rides the accent hover rung)'],
  ['dark', '--primary', '#ffffff', 'dark primary = white slab'],
  ['dark', '--primary-fg', '#191918', 'warm-ink on the white slab (r305)'],
  ['dark', '--danger-fg', '#191918', 'warm-ink on the night coral fill — 7.81:1 (r305)'],
  ['dark', '--success-ink', '#84d0a0', 'night mint ink (r305)'],
  ['dark', '--gold', '#e0a067', 'night achievement gold — the demoted r304 seat (r305 circular economy)'],
  ['dark', '--gold-ink', '#f2b782', 'night gold text ink (r305)'],
  ['dark', '--gold-soft', '#3b331f', 'soft gold ground → yellow-bg dark (r305)'],
  // ── DARK theme — night family triads (r305) ──
  ['dark', '--c-copper-bg', '#432015', 'night ember triad: bg (r305)'],
  ['dark', '--c-copper-ink', '#ff5a1f', 'night ember triad: ink (r305)'],
  ['dark', '--c-copper-deep', '#ffc5ae', 'night ember triad: deep (r305)'],
  ['dark', '--c-sand-bg', '#2d2820', 'night sand triad: bg (unchanged)'],
  ['dark', '--c-sand-ink', '#d9c18c', 'night sand triad: ink (unchanged)'],
  ['dark', '--c-sand-deep', '#efe2c5', 'night sand triad: deep (unchanged)'],
  ['dark', '--c-yellow-ink', '#efc87b', 'night yellow ink (r305)'],
  ['dark', '--c-rose-ink', '#ff8e68', 'night rose ink = the luminous coral (r305)'],
  ['dark', '--c-mint-ink', '#84d0a0', 'night mint ink (r305)'],
  ['dark', '--c-sky-deep', '#c9e2f5', 'night sky deep (r305)'],
  ['dark', '--c-lavender-ink', '#b7a0f4', 'night lavender ink (unchanged)'],
  ['dark', '--c-grey-bg', '#2a2a28', 'night grey ground (r305)'],
  ['dark', '--success', '#84d0a0', 'night success green (r305)'],
  ['dark', '--warning', '#efc87b', 'night warning amber (r305)'],
  ['dark', '--danger', '#ff8e68', 'night danger coral (r305)'],
  ['dark', '--info', '#93c2e9', 'night info slate (r305)'],
  // ── DARK theme — glass, surfaces, charts, motion (r305) ──
  ['dark', '--glass-bg', 'rgba(30,30,30,0.78)', 'night glass (r305 charcoal tint)'],
  ['dark', '--glass-blur', '16px', 'glass blur'],
  ['dark', '--glass-bg-strong', 'rgba(30,30,30,0.92)', 'night strong glass ground (r305)'],
  ['dark', '--glass-blur-strong', '16px', 'night strong tier keeps the canonical 16px blur'],
  ['dark', '--sidebar-item-active-bg', 'rgb(255 90 31/0.16)', 'sidebar ember wash (r305)'],
  ['dark', '--topbar-bg', 'rgba(30,30,30,0.86)', 'night topbar (r305 charcoal chrome)'],
  ['dark', '--chart-6', '#e8c064', 'night amber series (unchanged)'],
  ['dark', '--chart-7', '#6fb3d9', 'night cyan-blue series (unchanged)'],
  ['dark', '--chart-8', '#d18ab4', 'night mauve series (unchanged)'],
  ['dark', '--chart-text', '#b4b4b0', 'night chart text = muted (r305)'],
  [
    'dark',
    '--elev-1',
    'none',
    'R313 override: night elev-1 → none (owner decision — decorative shadows removed)',
  ],
  [
    'dark',
    '--elev-5',
    'none',
    'R313 override: night elev-5 → none (owner decision)',
  ],
  [
    'dark',
    '--shadow-modal',
    'none',
    'R313 override: night modal shadow → none (owner decision)',
  ],
  ['dark', '--type-display-line-height', '1.30', 'dark display leading'],
  ['dark', '--state-focus-ring-color', '#ff6b33', 'canonical cascade: dark ring → accent-hover (r305 ember)'],
];

/* ── Gate 3: forbidden retired values (scanned on the FULL text) ────── */

const FORBIDDEN_VALUES = [
  '#bc4700', '#a33d00', '#d45500', // retired saffron/ember accents
  '#0f0f0f', '#151515', '#1a1a1a', '#222222', // generic dark grounds
  '#c4c0b8', // divergent dark borders
  // r195: #2a2a2a legitimized as the egn dark hairline. r305: #3d3d3d
  // legitimized as the charcoal-night inset well (dark neutral-150) —
  // same mechanism: the value re-enters the canonical ramp, so the
  // needle is dropped and the CHECKS row documents it.
  '#f7f8fa', '#e5e7eb', '#d1d5db', // Tailwind grays (#f0f1f3 dropped r305: unrelated to the new cool ramp, kept guard below via #f0f2f5's distinctness)
  '#6b7280', '#9ca3af', // Tailwind gray-500/400
  '#3b82f6', '#dc2626', '#d97706', '#0ea579', // Tailwind status colors
  'oklch(', // oklch shadows (canonical uses charcoal rgba / ember rgba)
  'z-index: 99999', // invented z-max — spelled with its property
  'blur(20px)', // non-canonical glass blur
  '0.16, 1, 0.2, 1', '0.16,1,0.2,1', // the WRONG ease-out curve
  '--lh-relaxed', // invented line-height name
  '--z-max', '--z-sticky', '--z-drawer', '--z-header', '--z-overlay', // invented z bands
  '--btn-primary-bg', '--btn-primary-hover', '--primary-hover', '--primary-text', // invented button tokens
  '--elev-card', '--elev-modal', // invented elevation aliases
  '--surface-raised', // invented surface name (canonical: --surface-elevated)
  '--glass-shadow', '--shadow-glow', '--shadow-glow-strong', // invented shadows
  '--motion-ease-decalerate', // the shared-file typo (fixed r127-F1)
  '.input-field', // renamed to canonical .input
  // r195: the egn/teal identity era retired end-to-end
  '#027380', '#2fb6c6', '#015c66', '#014a52', '#e0f2f3',
  '#4dc7d6', '#7fced9', '#061417', '#174752', '#a7cbd5', '#f9a09c',
  '#3f8b8b', '#5fafaf',
  '#f2c766', '#c57da9', '#a67a22',
  // r305: the ultramarine r197 era retired end-to-end
  '#2e45e6', '#2337c8', '#4157ee', '#8e9bff', '#1f2fa8', '#e4e8fa', '#262b54',
  // r305: the warm-paper/Notion r197-r304 era retired end-to-end (the
  // copper FAMILY hexes survive ONLY in the gold achievement slots —
  // the accent seat values below are dead)
  '#f3eee4', '#16140f', '#fbfaf9', '#9a5f25', '#6b675c', '#726c5e',
  '#948d7e', '#8c8674', '#c9c3b4', '#f0eadd', '#ede6d8', '#ded5c3', '#c9bea8',
  '#f4e4d2', '#5c3416', '#f0e6d2', '#9a7438', '#f8ddbc', '#3d2d1b',
  '#f0f1f3',
  // r305: the retired r304 dark-night ramp
  '#1f1f1e', '#232322', '#353532', '#46453f', '#6e6b61', '#9a968a',
  '#c8c2b2', '#ddd7c5', '#f2ead8', '#201d17', '#262219', '#1d1a14',
  '#37322a', '#4a443a', '#6e675c',
  // r305: the retired r304 pastel triads (superseded by the computed r305 set)
  '#ffe9dc', '#e07856', '#6b2d1a', '#dcf1e2', '#4fa66d', '#1f4f30',
  '#ddebf7', '#1f3d63', '#fcf1cd', '#d6a330', '#6b4c0b',
  '#fce0e2', '#dd6e78', '#6b2128', '#efece7', '#2d2a24',
  '#3d2a23', '#fcd9c4', '#1f3429', '#c9ead3', '#1f2f45', '#c9dcee',
  '#3a3017', '#ecc97d', '#f8e5b5', '#3d2126', '#facdd2', '#2a2823',
  // NB: #5c8fce is NOT here — it survives as the LIGHT admin
  // role-accent (a value can retire from one seat and stay live in
  // another; the role-accent table owns it now).
  // r305: the Webflow-default link blue leak (the reference's own vestige)
  '#3898ec',
  // R313: the retired blue-grey light-paper ramp (the warm vintage paper
  // re-key — #F6F8FA itself is deliberately NOT here: it survives as
  // the DARK ink --neutral-900/--text, its one remaining seat, pinned
  // in CHECKS above with the same note).
  '#f0f2f5', '#F0F2F5', '#e9ecef', '#E9ECEF', '#c8c8c8', '#C8C8C8',
  '--ln-', '--stage-', '--aura-', '--glow-accent', '--shell-aurora-azure', // retired landing vocabulary
  // r306: the poster divergence namespace retired with the Heron-only
  // landing rebuild (the spelling guards BOTH export files — a future
  // reintroduction of the alias layer fails the gate)
  '--poster-paper', '--poster-ink', '--poster-signal',
];
const FORBIDDEN_PARITY_ONLY = [];

/* ── run ────────────────────────────────────────────────────────────── */

const failures = [];
let passCount = 0;

console.log('verify-parity-export — canonical parity gate (r127-F1)');
console.log(`  canonical: frontend/src/styles/tokens.css (${lineCount(read(PATHS.canonical))} lines)`);
console.log(`  export:    frontend/src/styles/unified-parity.css (${lineCount(read(PATHS.parity))} lines)`);
console.log(`  companion: frontend/src/styles/shared-design-system.css (${lineCount(read(PATHS.shared))} lines)`);
console.log('');

/* Gate 1 — token parity */
let unresolvedWrinkles = 0;
for (const [theme, token, pinned, note, opts = {}] of CHECKS) {
  const mapKey = theme === 'root' ? 'light' : theme;
  const canon = resolveValue(maps.canonical[mapKey].get(token) ?? '', maps.canonical[mapKey]);
  const parity = resolveValue(maps.parity[mapKey].get(token) ?? '', maps.parity[mapKey]);
  const canonN = canon === null ? null : norm(canon);
  const parityN = parity === null ? null : norm(parity);
  const where = theme === 'root' ? 'root' : `${theme} theme`;

  if (canonN === null && opts.canonicalUnresolved) {
    // documented canonical wrinkle: tokens.css references an undefined
    // var here. Assert the wrinkle still exists and the export binds the
    // documented value instead of replicating the broken reference.
    if (parityN === norm(pinned)) {
      unresolvedWrinkles++;
      passCount++;
      continue;
    }
    failures.push(`✗ [${where}] ${token} (${note})\n    canonical: <unresolved var(--ink) — expected wrinkle>\n    export:    ${parityN ?? '<undefined>'} (expected ${norm(pinned)} — the value the canonical comment documents)`);
    continue;
  }
  if (canonN === null) {
    failures.push(`✗ [${where}] ${token} (${note})\n    canonical: <unresolved in tokens.css — parser gap or canonical change>`);
    continue;
  }
  if (pinned !== null && canonN !== norm(pinned)) {
    failures.push(
      `✗ [${where}] ${token} (${note})\n    canonical drifted from the documented pin: tokens.css=${canonN}  pin=${norm(pinned)}\n    → update the export AND this pin together (intentional change), or fix tokens.css.`
    );
    continue;
  }
  if (parityN === null) {
    failures.push(`✗ [${where}] ${token} (${note})\n    canonical: ${canonN}\n    export:    <undefined or unresolvable in the parity export>`);
    continue;
  }
  if (parityN !== canonN) {
    failures.push(`✗ [${where}] ${token} (${note})\n    canonical: ${canonN}\n    export:    ${parityN}`);
    continue;
  }
  passCount++;
}

const MIN_CHECKS = 100; // the export header promises "100+ key tokens"
console.log(`[1/4] Token parity … ${passCount}/${CHECKS.length} PASS${unresolvedWrinkles ? ` (incl. ${unresolvedWrinkles} documented canonical wrinkle binding: --journey-core)` : ''}`);
if (CHECKS.length < MIN_CHECKS) {
  failures.push(`✗ meta: only ${CHECKS.length} token checks defined — the gate requires ≥ ${MIN_CHECKS}.`);
}
if (passCount !== CHECKS.length) {
  console.log('      FAIL — divergences:');
  for (const f of failures.splice(0)) console.log(`      ${f}`);
}

/* Gate 2 — undefined-var audit */
const parityDefs = collectDefs(read(PATHS.parity));
const sharedDefs = collectDefs(read(PATHS.shared));
const HOST_ALIASES = new Set(['--foreground', '--muted-foreground', '--card', '--card-muted', '--ring']);

const auditParity = auditVars(read(PATHS.parity), parityDefs, 'unified-parity.css (self-contained)');
const auditShared = auditVars(read(PATHS.shared), new Set([...sharedDefs, ...parityDefs]), 'shared-design-system.css (∪ parity defs)', HOST_ALIASES);

const auditFail =
  auditParity.broken.length > 0 || auditShared.broken.length > 0;
console.log(
  `[2/4] Undefined-var audit … ${auditFail ? 'FAIL' : 'PASS'} — parity: ${auditParity.broken.length} broken, ${auditParity.hooks.length} opt-in hook(s)${auditParity.hooks.length ? ` (${auditParity.hooks.join(', ')})` : ''}; shared: ${auditShared.broken.length} broken, ${auditShared.hooks.length} hook(s)`
);
if (auditParity.broken.length) {
  console.log(`      parity exports undefined tokens: ${auditParity.broken.join(', ')}`);
}
if (auditShared.broken.length) {
  console.log(`      shared file references tokens defined nowhere (parity ∪ shared ∪ host aliases): ${auditShared.broken.join(', ')}`);
}
if (auditFail) process.exitCode = 1;

/* Gate 3 — forbidden retired values */
const scanText = (css) => css.replace(/\s+/g, ' ');
const forbiddenHits = [];
for (const [file, css] of [
  ['unified-parity.css', read(PATHS.parity)],
  ['shared-design-system.css', read(PATHS.shared)],
]) {
  const text = scanText(css);
  const list = file.startsWith('unified') ? [...FORBIDDEN_VALUES, ...FORBIDDEN_PARITY_ONLY] : FORBIDDEN_VALUES;
  for (const needle of list) {
    if (text.includes(needle)) forbiddenHits.push(`${file}: contains retired value "${needle}"`);
  }
}
console.log(`[3/4] Forbidden retired values … ${forbiddenHits.length ? 'FAIL' : 'PASS'} — ${FORBIDDEN_VALUES.length} retired spellings scanned in both files`);
for (const h of forbiddenHits) console.log(`      ${h}`);

/* Gate 4 — brace balance */
const braceIssues = [];
for (const [file, css] of [
  ['unified-parity.css', read(PATHS.parity)],
  ['shared-design-system.css', read(PATHS.shared)],
]) {
  const text = stripComments(css);
  let depth = 0;
  for (const ch of text) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) braceIssues.push(`${file}: unbalanced braces (depth ${depth} at EOF)`);
}
console.log(`[4/4] Brace balance … ${braceIssues.length ? 'FAIL' : 'PASS'}`);
for (const b of braceIssues) console.log(`      ${b}`);

const failed = process.exitCode === 1 || forbiddenHits.length > 0 || braceIssues.length > 0 || (passCount !== CHECKS.length) || CHECKS.length < MIN_CHECKS;
console.log('');
if (failed) {
  console.log(`FAIL — parity export does not match tokens.css (${passCount}/${CHECKS.length} token checks passed).`);
  process.exit(1);
} else {
  console.log(`PASS — ${passCount} token checks verified against tokens.css; 0 broken var() refs; 0 retired values; both files parse.`);
  process.exit(0);
}
