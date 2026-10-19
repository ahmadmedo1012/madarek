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
  // ── :root primitives — radius ladder ──
  ['root', '--r-xs', '2px', 'radius rung 1 (r190 near-square)'],
  ['root', '--r-sm', '2px', 'radius rung 2 (r190 near-square)'],
  ['root', '--r-md', '3px', 'radius rung 3 (r190 near-square)'],
  ['root', '--r-lg', '3px', 'radius rung 4 (r190 near-square)'],
  ['root', '--r-xl', '3px', 'radius rung 5 — cards go square (r190 «مدار المعرفة»)'],
  ['root', '--r-2xl', '4px', 'radius rung 6 (r190 near-square)'],
  ['root', '--r-3xl', '6px', 'radius rung 7 (r190 near-square)'],
  ['root', '--r-full', '9999px', 'pill radius'],
  // ── :root primitives — spacing ──
  ['root', '--sp-1', '4px', 'spacing base'],
  ['root', '--sp-0-5', '2px', 'r185 micro rung (chip 2/8 ladder + optical nudges)'],
  ['root', '--sp-2-5', '10px', 'r185 compact-control rung'],
  ['root', '--sp-7', '32px', 'divergent revision had 28px'],
  ['root', '--sp-8', '40px', 'divergent revision had 32px'],
  ['root', '--sp-10', '56px', 'missing from the divergent revision'],
  ['root', '--sp-16', '240px', 'full ladder top'],
  // ── :root primitives — motion ladder ──
  ['root', '--t-micro', '80ms', 'motion rung 1'],
  ['root', '--t-fast', '160ms', 'motion rung 2 (divergent revision: 100ms)'],
  ['root', '--t-base', '240ms', 'motion rung 3 (divergent revision: 200ms)'],
  ['root', '--t-slow', '380ms', 'motion rung 4 (divergent revision: 300ms)'],
  ['root', '--t-slower', '520ms', 'motion rung 5 (missing before)'],
  ['root', '--t-cinema', '720ms', 'motion rung 6 (missing before)'],
  // ── :root primitives — easings ──
  ['root', '--ease', 'cubic-bezier(0.4,0,0.2,1)', 'standard ease'],
  ['root', '--ease-out', 'cubic-bezier(0.16,1,0.3,1)', 'canonical settle (divergent: 0.2,1 end)'],
  ['root', '--ease-in', 'cubic-bezier(0.7,0,0.84,0)', 'accelerate'],
  ['root', '--ease-soft', 'cubic-bezier(0.22,1,0.36,1)', 'soft emphasis'],
  ['root', '--ease-spring-soft', 'cubic-bezier(0.34,1.18,0.64,1)', 'spring soft tier'],
  ['root', '--ease-spring', 'cubic-bezier(0.34,1.36,0.64,1)', 'spring pop (divergent mislabeled bounce 1.56)'],
  ['root', '--ease-bounce', 'cubic-bezier(0.34,1.56,0.64,1)', 'bounce tier'],
  ['root', '--ease-spring-snappy', 'cubic-bezier(0.5,1.6,0.4,1)', 'snappy rebound'],
  // ── :root primitives — semantic motion ──
  ['root', '--motion-duration-micro', '80ms', 'semantic micro'],
  ['root', '--motion-duration-short', '160ms', 'semantic short'],
  ['root', '--motion-duration-medium', '240ms', 'semantic medium'],
  ['root', '--motion-duration-long', '380ms', 'semantic long'],
  ['root', '--motion-duration-page', '320ms', 'page transition (was missing)'],
  ['root', '--motion-duration-reveal', '360ms', 'reveal (divergent revision: 400ms)'],
  ['root', '--motion-duration-stat', '700ms', 'stat counter + sheen (divergent: 200ms sheen)'],
  ['root', '--motion-duration-skeleton', '1200ms', 'shimmer loop (divergent: 2s)'],
  ['root', '--press-scale', '0.97', 'control press'],
  ['root', '--motion-stagger-step', '60ms', 'stagger step (divergent: 40ms)'],
  ['root', '--motion-stagger-cap', '6', 'stagger cap (missing before)'],
  ['root', '--motion-direction', '1', 'RTL direction multiplier'],
  // ── :root primitives — z ladder (canonical, not the invented 10–90) ──
  ['root', '--z-base', '0', 'z: base'],
  ['root', '--z-dropdown', '100', 'z: dropdown'],
  ['root', '--z-popover', '200', 'z: popover (divergent inverted it above toast)'],
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
    'IBM Plex Sans Arabic first',
  ],
  ['root', '--lh-tight', '1.05', 'divergent revision: 1.15'],
  ['root', '--lh-base', '1.65', 'divergent revision: 1.6'],
  ['root', '--lh-loose', '1.85', 'divergent revision invented 1.75 "relaxed"'],
  ['root', '--fs-xxs', '11px', 'divergent revision invented 10px here'],
  ['root', '--fs-chrome', '0.875rem', 'fleet chrome step 14px (r133 fleet accord — canonized r140)'],
  ['root', '--fs-h1', '34px', 'r190 Alexandria display scale'],
  ['root', '--type-display-line-height', '1.28', 'r192 measured-safe Arabic display leading'],
  // ── :root primitives — layout ──
  ['root', '--sidebar-w', '256px', 'divergent revision fallback: 260px'],
  ['root', '--content-max-w', '1280px', 'content measure'],

  // ── LIGHT theme — grounds, ink, teal (r195 egn re-key) ──
  ['light', '--neutral-0', '#ffffff', 'light surface'],
  ['light', '--neutral-50', '#f7f7f7', 'egn light page ground (r195 gray re-key)'],
  ['light', '--neutral-100', '#eeeeee', 'subtle band (r195)'],
  ['light', '--neutral-150', '#e5e5e5', 'surface-3 (r195)'],
  ['light', '--neutral-200', '#ececec', 'hairline (r195: egn light hairline)'],
  ['light', '--neutral-300', '#d9d9d9', 'divider (r195)'],
  ['light', '--neutral-900', '#333333', 'INK (r195: egn body ink)'],
  ['light', '--text', '#333333', 'light text = ink (r195)'],
  ['light', '--text-muted', '#666666', 'WCAG-fixed muted (r195: cool gray)'],
  ['light', '--text-faint', '#6e6e6e', 'WCAG-fixed faint (r195: AA tier)'],
  ['light', '--accent', '#027380', 'TEAL r195 peacock (eras: violet r190, saffron/ember/copper before)'],
  ['light', '--accent-hover', '#015c66', 'teal hover (r195)'],
  ['light', '--accent-soft', '#e0f2f3', 'teal soft ground (r195)'],
  ['light', '--accent-strong', '#014a52', 'deep teal — 9.06:1 ring tier (r195)'],
  ['light', '--accent-fg', '#ffffff', 'white on teal fill — AA (r195)'],
  ['light', '--accent-ink', '#014a52', 'text-safe teal ink (r195)'],
  ['light', '--state-focus-ring-color', '#014a52', 'light ring = deep teal (9.06:1) (r195)'],
  ['light', '--success', '#027380', 'mint = brand teal (r195: status reads as the accent)'],
  ['light', '--warning', '#a68a2e', 'yellow (r195: egn ochre)'],
  ['light', '--danger', '#b5665f', 'rose (r195: egn muted rose)'],
  ['light', '--info', '#2f6e7e', 'sky (r195: egn steel-teal)'],
  ['light', '--success-ink', '#014a52', 'mint text ink (r195: teal deep)'],
  ['light', '--warning-ink', '#6b5510', 'yellow text ink (r195)'],
  ['light', '--danger-ink', '#7a3028', 'rose text ink (r195)'],
  ['light', '--info-ink', '#1a4a56', 'sky text ink (r195)'],
  ['light', '--danger-fg', '#191918', 'ink on danger fill'],
  ['light', '--primary', '#333333', 'light primary = ink slab (r195)'],
  ['light', '--primary-fg', '#ffffff', 'on primary'],
  // ── LIGHT theme — family triads ──
  ['light', '--c-copper-bg', '#ece4d2', 'copper triad: bg (r195)'],
  ['light', '--c-copper-ink', '#9a7438', 'copper triad: ink (r195)'],
  ['light', '--c-copper-deep', '#5c3416', 'copper triad: deep'],
  ['light', '--c-sand-bg', '#ecece7', 'sand triad: bg (r195)'],
  ['light', '--c-sand-ink', '#8a7a52', 'sand triad: ink (r195)'],
  ['light', '--c-sand-deep', '#5a4a24', 'sand triad: deep (r195)'],
  ['light', '--c-peach-bg', '#fbeded', 'peach triad: bg (r195)'],
  ['light', '--c-mint-ink', '#027380', 'mint triad: ink = brand teal (r195)'],
  ['light', '--c-lavender-deep', '#2a4a56', 'lavender triad: deep (r195: steel-teal)'],
  ['light', '--c-sky-ink', '#2f6e7e', 'sky triad: ink (r195: steel-teal)'],
  ['light', '--c-yellow-bg', '#f7f1d8', 'yellow triad: bg (r195)'],
  ['light', '--c-rose-ink', '#b5665f', 'rose triad: ink (r195)'],
  ['light', '--c-grey-deep', '#2d2a24', 'grey triad: deep'],
  // ── LIGHT theme — glass, elevation, charts ──
  ['light', '--glass-bg', 'rgba(255,255,255,0.78)', 'white glass (r195: egn white — cream tint retired)'],
  ['light', '--glass-blur', '16px', 'glass blur (divergent: 20px)'],
  ['light', '--glass-bg-strong', 'rgba(255,255,255,0.92)', 'strong glass ground (r195 egn white; r140 fleet unification: 0.90/0.92/0.94 → 0.92)'],
  ['light', '--glass-blur-strong', '16px', 'strong tier keeps the canonical 16px blur (r140 ruling: nothing stronger than 16)'],
  ['light', '--chart-6', '#a67a22', 'series amber'],
  ['light', '--chart-text', '#666666', 'chart text ink (r195: cool gray, matches muted)'],
  [
    'light',
    '--elev-1',
    '0 1px 2px rgba(0,0,0,0.04),0 1px 1px rgba(0,0,0,0.06)',
    'elevation 1 (divergent: oklch)',
  ],
  ['light', '--elev-2', '0 4px 8px rgba(0,0,0,0.06),0 2px 4px rgba(0,0,0,0.04)', 'elevation 2'],
  ['light', '--elev-3', '0 8px 16px rgba(0,0,0,0.08),0 4px 8px rgba(0,0,0,0.05)', 'elevation 3 (missing before)'],
  ['light', '--elev-4', '0 16px 32px rgba(0,0,0,0.10),0 8px 16px rgba(0,0,0,0.06)', 'elevation 4 (missing before)'],
  ['light', '--elev-5', '0 32px 64px rgba(0,0,0,0.12),0 16px 32px rgba(0,0,0,0.08)', 'elevation 5 (missing before)'],
  ['light', '--shadow-card', '0 1px 2px rgba(0,0,0,0.04),0 1px 1px rgba(0,0,0,0.06)', 'shadow-card → elev-1'],
  [
    'light',
    '--shadow-modal',
    '0 12px 36px rgba(15,15,15,0.10),0 32px 80px rgba(15,15,15,0.14)',
    'modal shadow (warm rgba, not oklch)',
  ],
  // (r148-d: the journey scene CHECKS rows — node/core light+dark, line
  // dark — retired with the canonical tokens: zero consumers since
  // ConstellationCanvas went away; only --journey-glow survives, on
  // auth.css, and it was never a pinned row.)

  // ── DARK theme — the night gray ramp (r195 egn re-key) ──
  ['dark', '--neutral-0', '#171717', 'night surface 0 (r195)'],
  ['dark', '--neutral-50', '#0a0a0a', 'NIGHT ground (r195: egn near-black)'],
  ['dark', '--neutral-100', '#141414', 'night surface (r195)'],
  ['dark', '--neutral-150', '#1e1e1e', 'night surface-3 (r195)'],
  ['dark', '--neutral-200', '#2a2a2a', 'night hairline (r195: canonical dark neutral-200 — legitimized, see Gate 3)'],
  ['dark', '--neutral-300', '#353535', 'night divider (r195)'],
  ['dark', '--neutral-400', '#666666', 'night faint (r195)'],
  ['dark', '--neutral-500', '#8a8a8a', 'night mist (r195: cool gray)'],
  ['dark', '--neutral-700', '#bfbfbf', 'night secondary (r195)'],
  ['dark', '--neutral-800', '#dddddd', 'night strong (r195)'],
  ['dark', '--neutral-900', '#f2f2f2', 'night ink (r195: near-white — sand retired)'],
  ['dark', '--text', '#f2f2f2', 'dark text = night ink (r195)'],
  ['dark', '--text-muted', '#8a8a8a', 'dark muted = mist (r195)'],
  ['dark', '--text-faint', '#828282', 'dark faint (r195: AA tier, one step under muted)'],
  ['dark', '--text-on-accent', '#05070f', 'void ink on accent'],
  // ── DARK theme — the teal accent family (r195) ──
  ['dark', '--accent', '#2fb6c6', 'TEAL r195 night accent (eras: violet r190, gold/saffron before)'],
  ['dark', '--accent-hover', '#4dc7d6', 'pale teal (r195)'],
  ['dark', '--accent-soft', '#174a52', 'teal soft ground (r195)'],
  ['dark', '--accent-strong', '#7fced9', 'strong teal — 11.06:1 ring tier (r195)'],
  ['dark', '--accent-fg', '#061417', 'void ink on teal (r195)'],
  ['dark', '--primary', '#ffffff', 'dark primary = white slab (r190 void CTA)'],
  ['dark', '--primary-fg', '#05070f', 'void ink on the white slab (r195)'],
  ['dark', '--danger-fg', '#05070f', 'void ink on night rose'],
  ['dark', '--success-ink', '#2fb6c6', 'night mint ink (r195: teal)'],
  // ── DARK theme — night family triads ──
  ['dark', '--c-copper-bg', '#2a2313', 'night copper triad: bg (r195)'],
  ['dark', '--c-copper-ink', '#d8ae5c', 'night copper triad: ink = egn gold (r195)'],
  ['dark', '--c-copper-deep', '#f0d89c', 'night copper triad: deep (r195)'],
  ['dark', '--c-sand-bg', '#252013', 'night sand triad: bg (r195)'],
  ['dark', '--c-sand-ink', '#b7a36a', 'night sand triad: ink (r195)'],
  ['dark', '--c-sand-deep', '#e4d6a6', 'night sand triad: deep (r195)'],
  ['dark', '--c-yellow-ink', '#bfa14e', 'night yellow ink (r195)'],
  ['dark', '--c-rose-ink', '#c07e78', 'night rose ink (r195)'],
  ['dark', '--c-mint-ink', '#2fb6c6', 'night mint ink (r195: teal)'],
  ['dark', '--c-sky-deep', '#a7cbd5', 'night sky deep (r195: fixed the malformed hex)'],
  ['dark', '--c-lavender-ink', '#7ba7b3', 'night lavender ink (r195: steel-teal)'],
  ['dark', '--c-grey-bg', '#161616', 'night grey ground (r195: pure gray — indigo tint retired)'],
  // ── DARK theme — glass, surfaces, charts, motion ──
  ['dark', '--glass-bg', 'rgba(10,10,10,0.78)', 'night glass (r195: neutral tint — indigo retired)'],
  ['dark', '--glass-blur', '16px', 'glass blur'],
  ['dark', '--glass-bg-strong', 'rgba(10,10,10,0.92)', 'night strong glass ground (r195; r140 fleet unification)'],
  ['dark', '--glass-blur-strong', '16px', 'night strong tier keeps the canonical 16px blur'],
  ['dark', '--sidebar-item-active-bg', 'rgb(47 182 198/0.16)', 'sidebar teal wash (r195)'],
  ['dark', '--topbar-bg', 'rgba(10,10,10,0.86)', 'night topbar (r195: neutral chrome)'],
  ['dark', '--chart-6', '#f2c766', 'night gold series'],
  ['dark', '--chart-7', '#5fafaf', 'night teal series'],
  ['dark', '--chart-8', '#c57da9', 'night mauve series'],
  ['dark', '--chart-text', '#8a8a8a', 'night chart text = mist (r195)'],
  [
    'dark',
    '--elev-1',
    '0 1px 2px rgba(0,0,0,0.30),inset 0 1px 0 rgba(255,255,255,0.04)',
    'night elevation 1 (fill-led + hairline)',
  ],
  [
    'dark',
    '--elev-5',
    '0 32px 64px rgba(0,0,0,0.50),inset 0 1px 0 rgba(255,255,255,0.08)',
    'night elevation 5',
  ],
  [
    'dark',
    '--shadow-modal',
    '0 12px 32px rgba(0,0,0,0.66),0 32px 80px rgba(0,0,0,0.70),0 0 0 1px rgba(255,255,255,0.11)',
    'black shadow + white hairline (r195 — indigo/mist retired)',
  ],
  ['dark', '--type-display-line-height', '1.32', 'dark display leading (r192: one step over light)'],
  ['dark', '--state-focus-ring-color', '#7fced9', 'canonical cascade: dark ring → accent-strong (r195 teal)'],
];

/* ── Gate 3: forbidden retired values (scanned on the FULL text) ────── */

const FORBIDDEN_VALUES = [
  '#bc4700', '#a33d00', '#d45500', // retired saffron/ember accents
  '#0f0f0f', '#151515', '#1a1a1a', '#222222', // generic dark grounds
  '#c4c0b8', '#3d3d3d', // divergent dark secondary/borders
  // r195: #2a2a2a legitimized as the egn dark hairline (canonical dark neutral-200); retired from the forbidden list
  '#f7f8fa', '#f0f1f3', '#e5e7eb', '#d1d5db', // Tailwind grays
  '#6b7280', '#9ca3af', // Tailwind gray-500/400
  '#3b82f6', '#dc2626', '#d97706', '#0ea579', // Tailwind status colors
  'oklch(', // oklch shadows (canonical uses warm rgba / indigo rgba)
  'z-index: 99999', // invented z-max — spelled with its property so the
                    // r195 canonical light --neutral-400 #999999 (six
                    // 9s, no property) is export-legal; the invented
                    // --z-max NAME is still blocked by its own needle.
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
