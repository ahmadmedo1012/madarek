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
  // ── :root primitives — radius ladder (r305 squared ladder) ──
  ['root', '--r-xs', '2px', 'radius rung 1 — chips (r305 squared ladder)'],
  ['root', '--r-sm', '4px', 'radius rung 2 — small controls (r305)'],
  ['root', '--r-md', '6px', 'radius rung 3 — buttons/inputs (r305)'],
  ['root', '--r-lg', '8px', 'radius rung 4 — cards (r305)'],
  ['root', '--r-xl', '12px', 'radius rung 5 — media/hero frames (r305)'],
  ['root', '--r-2xl', '16px', 'radius rung 6 — modals/sheets (r305)'],
  ['root', '--r-3xl', '20px', 'radius rung 7 — hero-scale surfaces (r305)'],
  ['root', '--r-full', '9999px', 'pill radius — primary CTA + search'],
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
  ['root', '--lh-tight', '1.05', 'Arabic-tuned ladder (unchanged)'],
  ['root', '--lh-base', '1.65', 'body leading (unchanged)'],
  ['root', '--lh-loose', '1.85', 'loose leading (unchanged)'],
  // r305: UNCHANGED — the re-key touches colors/radii/motion only; the
  // type ladder keeps the r197 13px Arabic floor exactly as shipped.
  ['root', '--fs-xxs', '13px', 'the 13px Arabic floor'],
  ['root', '--fs-xs', '13px', 'the 13px Arabic floor'],
  ['root', '--fs-sm', '13px', 'label base'],
  ['root', '--fs-chrome', '0.875rem', 'fleet chrome step 14px'],
  ['root', '--fs-h1', '30px', 'headline top rung'],
  ['root', '--fs-h2', '24px', 'headline mid rung'],
  ['root', '--fs-body', '16px', 'body size'],
  ['root', '--fs-body-lg', '18px', 'body-lg size'],
  ['root', '--type-display-line-height', '1.28', 'r192 measured-safe Arabic display leading'],
  ['root', '--type-metric-letter-spacing', '0', 'tracking misaligns tnum columns'],
  ['root', '--ls-tight', '0', 'zero tracking (Arabic joins; the reference -0.02em stays Latin-only-banned)'],
  ['root', '--ls-snug', '0', 'zero tracking (Arabic joins)'],
  // ── :root primitives — layout ──
  ['root', '--sidebar-w', '256px', 'sidebar width'],
  ['root', '--content-max-w', '1280px', 'content measure'],

  // ── LIGHT theme — the blueprint paper + orange signal (r305) ──
  ['light', '--bg', '#f6f8fa', 'PAPER — page ground (r305 blueprint paper; the reference paints #fafafa/#fff — same family, ratios verified on both)'],
  ['light', '--surface', '#ffffff', 'GROUND — cards/inputs (r305)'],
  ['light', '--neutral-0', '#ffffff', 'ground rung 0'],
  ['light', '--neutral-50', '#f6f8fa', 'paper rung 50 (r305)'],
  ['light', '--neutral-100', '#f0f2f5', 'subtle band (r305)'],
  ['light', '--neutral-150', '#e9ecef', 'surface-3 inset wells (r305)'],
  ['light', '--neutral-200', '#e0e0da', "hairline (r305 — the reference's warm edge)"],
  ['light', '--neutral-300', '#c8c8c8', 'divider (r305)'],
  ['light', '--neutral-900', '#282828', "INK — the charcoal (r305; the reference's --content--primary, 13.85:1 paper AAA)"],
  ['light', '--text', '#282828', 'light text = ink (r305)'],
  ['light', '--text-muted', '#626260', 'r305 granite muted — 5.74:1 ground · 6.11:1 surface'],
  ['light', '--text-faint', '#72726f', "r305 faint — 4.53:1 ground, under AA on soft/wells (deliberate; the reference's own tertiary)"],
  ['light', '--accent', '#fa3600', "VIVID ORANGE signal (r305 — the reference's --content--brand; 3.53:1 paper = UI/large tier; eras: copper r303/r304, ultramarine r197, teal r195)"],
  ['light', '--accent-hover', '#d92f00', 'signal hover — the binary-searched AA floor doubles as hover (r305)'],
  ['light', '--accent-soft', '#fce3d9', 'signal soft ground (r305 ember tint)'],
  ['light', '--accent-strong', '#a32400', 'deep signal — 7.02:1 (r305)'],
  ['light', '--accent-fg', '#191918', "warm-ink labels on the fill — 4.69:1 (r305; white 3.76 banned)"],
  ['light', '--accent-ink', '#c72e00', 'text-safe signal ink — 5.16:1 ground / 5.50:1 surface (r305)'],
  ['light', '--state-focus-ring-color', '#c72e00', 'light ring = accent-ink (5.16:1 paper, >=3:1 every adjacent surface) (r305)'],
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
  ['light', '--glass-bg', 'rgba(246,248,250,0.78)', 'paper glass (r305)'],
  ['light', '--glass-blur', '16px', 'glass blur (r140 ruling stands)'],
  ['light', '--glass-bg-strong', 'rgba(246,248,250,0.92)', 'strong glass ground (r305 paper; 0.92 fleet unification)'],
  ['light', '--glass-blur-strong', '16px', 'strong tier keeps the canonical 16px blur'],
  ['light', '--chart-6', '#a6791f', 'series amber (r305: 3.67:1 on paper — clears the 3:1 non-text bar)'],
  ['light', '--chart-text', '#626260', 'chart text ink (r305: = muted, 5.74:1 paper)'],
  [
    'light',
    '--elev-1',
    '0 1px 2px rgba(28,28,28,0.05)',
    'elevation 1 — hairline tier (r305 charcoal-tinted register)',
  ],
  ['light', '--elev-2', '0 1px 2px rgba(28,28,28,0.05),0 6px 16px rgba(28,28,28,0.06)', 'elevation 2 (r305 layered register)'],
  ['light', '--elev-3', '0 1px 2px rgba(28,28,28,0.06),0 8px 24px rgba(28,28,28,0.08)', 'elevation 3 (r305)'],
  ['light', '--elev-4', '0 12px 36px rgba(28,28,28,0.10),0 32px 80px rgba(28,28,28,0.13)', 'elevation 4 (r305)'],
  ['light', '--elev-5', '0 16px 44px rgba(28,28,28,0.12),0 40px 96px rgba(28,28,28,0.16)', 'elevation 5 (r305)'],
  ['light', '--shadow-card', '0 1px 2px rgba(28,28,28,0.05)', 'shadow-card → elev-1, resolved (r305)'],
  [
    'light',
    '--shadow-modal',
    '0 12px 36px rgba(28,28,28,0.10),0 32px 80px rgba(28,28,28,0.13)',
    'modal shadow → elev-4, resolved (r305)',
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
  ['dark', '--neutral-900', '#f6f8fa', 'night ink — the paper twin (r305; 13.85:1 bg AAA)'],
  ['dark', '--text', '#f6f8fa', 'dark text = night ink (r305)'],
  ['dark', '--text-muted', '#b4b4b0', 'dark muted (r305 — 7.09:1 bg · 6.53:1 surface · 5.90:1 s2)'],
  ['dark', '--text-faint', '#a2a29d', 'dark faint (r305: AA tier — 5.75:1 bg · 5.30:1 surface)'],
  ['dark', '--text-on-accent', '#191918', 'warm-ink on the luminous ember fill — 5.64:1 (r305)'],
  // ── DARK theme — the signal family (r305) ──
  ['dark', '--accent', '#ff5a1f', 'LUMINOUS EMBER fill (r305; 4.73:1 bg — AA-large/UI; eras: copper #E0A067 r304, ultramarine r197)'],
  ['dark', '--accent-hover', '#ff6b33', 'ember hover on dark (r305)'],
  ['dark', '--accent-soft', '#432015', 'ember soft ground on dark (r305)'],
  ['dark', '--accent-strong', '#ffc5ae', 'light ember tier — 9.72:1 text tier (r305)'],
  ['dark', '--accent-fg', '#191918', 'warm-ink on the ember fill — 5.64:1 (r305)'],
  ['dark', '--accent-ink', '#ff5a1f', 'text-safe signal ink on dark — 4.73:1 bg (r305)'],
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
    '0 1px 2px rgba(0,0,0,0.30),inset 0 1px 0 rgba(246,248,250,0.04)',
    'night elevation 1 (fill-led + paper inset, r305)',
  ],
  [
    'dark',
    '--elev-5',
    '0 16px 44px rgba(0,0,0,0.52),0 40px 96px rgba(0,0,0,0.58),inset 0 1px 0 rgba(246,248,250,0.08)',
    'night elevation 5 (r305)',
  ],
  [
    'dark',
    '--shadow-modal',
    '0 12px 32px rgba(0,0,0,0.48),0 32px 80px rgba(0,0,0,0.52),inset 0 1px 0 rgba(246,248,250,0.07)',
    'modal shadow → elev-4, resolved (r305)',
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
