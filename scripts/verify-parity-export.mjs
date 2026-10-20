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
  // ── :root primitives — radius ladder (r197 soft ladder) ──
  ['root', '--r-xs', '4px', 'radius rung 1 — chips/inputs (r197 soft ladder)'],
  ['root', '--r-sm', '6px', 'radius rung 2 — small controls (r197)'],
  ['root', '--r-md', '8px', 'radius rung 3 — buttons (r197)'],
  ['root', '--r-lg', '10px', 'radius rung 4 — cards (r197)'],
  ['root', '--r-xl', '14px', 'radius rung 5 — media frames (r197)'],
  ['root', '--r-2xl', '16px', 'radius rung 6 — modals/sheets (r197)'],
  // (r197: --r-3xl retired — its ladder slot was absorbed by --r-2xl)
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
  // ── :root primitives — type (r197 Arabic-tuned scale) ──
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
  ['root', '--fs-xxs', '13px', 'r197: the 13px Arabic floor (BLUEPRINT §4)'],
  ['root', '--fs-xs', '13px', 'r197: the 13px Arabic floor'],
  ['root', '--fs-sm', '13px', 'label base'],
  ['root', '--fs-chrome', '0.875rem', 'fleet chrome step 14px (r133 fleet accord — canonized r140)'],
  ['root', '--fs-h1', '30px', 'r197 §4 scale (13/14/16/18/20/24/30/38/48/64)'],
  ['root', '--fs-h2', '24px', 'r197 §4 scale'],
  ['root', '--fs-body', '16px', 'r197 §4 scale (was 15)'],
  ['root', '--fs-body-lg', '18px', 'r197 §4 scale (was 17)'],
  ['root', '--type-display-line-height', '1.28', 'r192 measured-safe Arabic display leading'],
  ['root', '--type-metric-letter-spacing', '0', 'r197: tracking misaligns tnum columns'],
  ['root', '--ls-tight', '0', 'r197: negative tracking retired (Arabic joins)'],
  ['root', '--ls-snug', '0', 'r197: negative tracking retired (Arabic joins)'],
  // ── :root primitives — poster namespace (r197 stage-2 contract) ──
  ['root', '--poster-paper', '#f3eee4', 'poster paper alias → --bg (light resolution)'],
  ['root', '--poster-ink', '#16140f', 'poster ink alias → --text'],
  ['root', '--poster-signal', '#2e45e6', 'poster signal alias → --accent'],
  // ── :root primitives — layout ──
  ['root', '--sidebar-w', '256px', 'divergent revision fallback: 260px'],
  ['root', '--content-max-w', '1280px', 'content measure'],

  // ── LIGHT theme — paper, ink, signal (r197 BLUEPRINT §4) ──
  ['light', '--bg', '#f3eee4', 'PAPER — page ground (§4)'],
  ['light', '--surface', '#fbfaf7', 'GROUND — cards/inputs (§4 two-surface rule)'],
  ['light', '--neutral-0', '#fbfaf7', 'ground rung 0'],
  ['light', '--neutral-50', '#f3eee4', 'paper rung 50 (r197 warm ramp)'],
  ['light', '--neutral-100', '#f0eadd', 'subtle band (r197)'],
  ['light', '--neutral-150', '#ede6d8', 'surface-3 inset wells (r197)'],
  ['light', '--neutral-200', '#ded5c3', 'hairline (r197)'],
  ['light', '--neutral-300', '#c9bea8', 'divider (r197)'],
  ['light', '--neutral-900', '#16140f', 'INK (§4 — 15.92:1 paper AAA)'],
  ['light', '--text', '#16140f', 'light text = ink (§4)'],
  ['light', '--text-muted', '#6b675c', '§4 ink-muted — 5.41:1 ground'],
  ['light', '--text-faint', '#726c5e', 'r197 AA faint — 5.00:1 ground, <4.5 on soft (r183 tripwire)'],
  ['light', '--accent', '#2e45e6', 'ULTRAMARINE signal (§4 — 5.84:1 paper; eras: teal r195, violet r190, copper before)'],
  ['light', '--accent-hover', '#2337c8', 'signal hover (r197)'],
  ['light', '--accent-soft', '#e4e8fa', 'signal soft ground (r197)'],
  ['light', '--accent-strong', '#1f2fa8', 'deep signal — 8.95:1 ring tier (r197)'],
  ['light', '--accent-fg', '#ffffff', 'white on signal fill — 6.75:1 AA (r197)'],
  ['light', '--accent-ink', '#2e45e6', 'text-safe signal ink (r197: AA as text on paper)'],
  ['light', '--state-focus-ring-color', '#1f2fa8', 'light ring = deep signal (8.95:1) (r197)'],
  ['light', '--success', '#217a48', 'mint = success green (r197: egn teal retired)'],
  ['light', '--warning', '#9a7b1f', 'yellow (r197 warm re-key)'],
  ['light', '--danger', '#a63f35', 'rose (r197: darker for white-label AA)'],
  ['light', '--info', '#46618c', 'sky (r197: slate-blue — steel-teal retired)'],
  ['light', '--success-ink', '#175c36', 'mint text ink (r197)'],
  ['light', '--warning-ink', '#6e5410', 'yellow text ink (r197)'],
  ['light', '--danger-ink', '#7c2a22', 'rose text ink (r197)'],
  ['light', '--info-ink', '#33496b', 'sky text ink (r197)'],
  ['light', '--danger-fg', '#ffffff', 'white on danger fill — 6.21:1 both themes (r197)'],
  ['light', '--gold', '#b57438', '§4 achievement gold — decorative/large tier on paper'],
  ['light', '--gold-ink', '#8f5a28', '§4 gold text ink — 5.50:1 ground'],
  ['light', '--gold-soft', '#f6efd5', 'soft gold ground → yellow-bg (r197)'],
  ['light', '--primary', '#16140f', 'light primary = ink slab (r197)'],
  ['light', '--primary-fg', '#ffffff', 'on primary'],
  // ── LIGHT theme — family triads (r197 warm re-key) ──
  ['light', '--c-copper-bg', '#f0e6d2', 'copper triad: bg (r197)'],
  ['light', '--c-copper-ink', '#9a7438', 'copper triad: ink'],
  ['light', '--c-copper-deep', '#5c3416', 'copper triad: deep'],
  ['light', '--c-sand-bg', '#efe9da', 'sand triad: bg (r197)'],
  ['light', '--c-sand-ink', '#8a7a52', 'sand triad: ink'],
  ['light', '--c-sand-deep', '#5a4a24', 'sand triad: deep'],
  ['light', '--c-peach-bg', '#f8e7de', 'peach triad: bg (r197)'],
  ['light', '--c-mint-ink', '#217a48', 'mint triad: ink = success green (r197)'],
  ['light', '--c-lavender-deep', '#4a3c73', 'lavender triad: deep (r197 violet)'],
  ['light', '--c-sky-ink', '#46618c', 'sky triad: ink (r197 slate-blue)'],
  ['light', '--c-yellow-bg', '#f6efd5', 'yellow triad: bg (r197)'],
  ['light', '--c-rose-ink', '#a63f35', 'rose triad: ink (r197)'],
  ['light', '--c-grey-deep', '#2d2a24', 'grey triad: deep'],
  // ── LIGHT theme — glass, elevation, charts (r197) ──
  ['light', '--glass-bg', 'rgba(251,250,247,0.78)', 'warm ground glass (r197)'],
  ['light', '--glass-blur', '16px', 'glass blur (divergent: 20px)'],
  ['light', '--glass-bg-strong', 'rgba(251,250,247,0.92)', 'strong glass ground (r197 warm; r140 fleet unification: 0.92)'],
  ['light', '--glass-blur-strong', '16px', 'strong tier keeps the canonical 16px blur (r140 ruling: nothing stronger than 16)'],
  ['light', '--chart-6', '#a6791f', 'series amber (r197: 3.38:1 on paper)'],
  ['light', '--chart-text', '#6b675c', 'chart text ink (r197: matches muted, 4.88:1 paper)'],
  [
    'light',
    '--elev-1',
    '0 1px 2px rgba(22,20,15,0.06)',
    'elevation 1 — hairline tier (r197 single-shadow grammar)',
  ],
  ['light', '--elev-2', '0 10px 15px rgba(22,20,15,0.08)', 'elevation 2 — the §4 card recipe'],
  ['light', '--elev-3', '0 18px 40px rgba(22,20,15,0.12)', 'elevation 3 (r197)'],
  ['light', '--elev-4', '0 24px 56px rgba(22,20,15,0.14)', 'elevation 4 (r197)'],
  ['light', '--elev-5', '0 32px 72px rgba(22,20,15,0.16)', 'elevation 5 (r197)'],
  ['light', '--shadow-card', '0 1px 2px rgba(22,20,15,0.06)', 'shadow-card → elev-1 (r197)'],
  [
    'light',
    '--shadow-modal',
    '0 24px 56px rgba(22,20,15,0.14)',
    'modal shadow → elev-4 (r197)',
  ],
  // (r148-d: the journey scene CHECKS rows — node/core light+dark, line
  // dark — retired with the canonical tokens: zero consumers since
  // ConstellationCanvas went away; only --journey-glow survives, on
  // auth.css, and it was never a pinned row.)

  // ── DARK theme — the warm night ramp (r197 BLUEPRINT §4) ──
  ['dark', '--bg', '#16140f', 'NIGHT paper ground (§4)'],
  ['dark', '--surface', '#201d17', 'night ground — cards/inputs (§4)'],
  ['dark', '--neutral-0', '#201d17', 'night ground rung 0 (r197)'],
  ['dark', '--neutral-50', '#16140f', 'night paper rung 50 (r197 warm night)'],
  ['dark', '--neutral-100', '#262219', 'night raised step (r197)'],
  ['dark', '--neutral-150', '#1d1a14', 'night inset well (r197)'],
  ['dark', '--neutral-200', '#37322a', 'night hairline (r197 warm)'],
  ['dark', '--neutral-300', '#4a443a', 'night divider (r197)'],
  ['dark', '--neutral-400', '#6e675c', 'night non-text rung (r197)'],
  ['dark', '--neutral-500', '#948d7e', 'night ink-muted (r283 — 5.10:1 ground · 4.81:1 surface-2)'],
  ['dark', '--neutral-700', '#c9c3b4', 'night §4 ink-secondary (r197)'],
  ['dark', '--neutral-800', '#e0dacd', 'night strong (r197)'],
  ['dark', '--neutral-900', '#f3eee4', 'night ink (§4 — 15.92:1 bg AAA)'],
  ['dark', '--text', '#f3eee4', 'dark text = night ink (§4)'],
  ['dark', '--text-muted', '#948d7e', 'dark muted (r283 §4 — ≥4.81:1 on every dark surface)'],
  ['dark', '--text-faint', '#8c8674', 'dark faint (r197: AA tier, one step under muted)'],
  ['dark', '--text-on-accent', '#ffffff', 'white on signal fills — both themes (r197)'],
  // ── DARK theme — the signal family (r197) ──
  ['dark', '--accent', '#2e45e6', 'ULTRAMARINE fill — same as light (§4; eras: teal r195, violet r190)'],
  ['dark', '--accent-hover', '#4157ee', 'signal hover on dark (r197)'],
  ['dark', '--accent-soft', '#262b54', 'signal soft ground on dark (r197)'],
  ['dark', '--accent-strong', '#8e9bff', 'light signal tier — 7.26:1 ring/text (r197)'],
  ['dark', '--accent-fg', '#ffffff', 'white on the signal fill (r197)'],
  ['dark', '--accent-ink', '#8e9bff', 'text-safe signal ink on dark (r197: 7.26:1 bg)'],
  ['dark', '--primary', '#ffffff', 'dark primary = white slab (r190 void CTA)'],
  ['dark', '--primary-fg', '#16140f', 'night ink on the white slab (r197)'],
  ['dark', '--danger-fg', '#16140f', 'ink on night rose (r197: 6.58:1)'],
  ['dark', '--success-ink', '#6fcb93', 'night mint ink (r197 green)'],
  ['dark', '--gold', '#d9a05b', '§4 dark achievement gold — 8.00:1 bg'],
  ['dark', '--gold-ink', '#e3b273', 'r197 dark gold text ink — 9.42:1 bg'],
  ['dark', '--gold-soft', '#322a12', 'soft gold ground → yellow-bg dark (r197)'],
  // ── DARK theme — night family triads (r197 warm re-key) ──
  ['dark', '--c-copper-bg', '#2e2513', 'night copper triad: bg (r197)'],
  ['dark', '--c-copper-ink', '#d8ae5c', 'night copper triad: ink'],
  ['dark', '--c-copper-deep', '#efd9a4', 'night copper triad: deep (r197)'],
  ['dark', '--c-sand-bg', '#2a2416', 'night sand triad: bg (r197)'],
  ['dark', '--c-sand-ink', '#b7a36a', 'night sand triad: ink'],
  ['dark', '--c-sand-deep', '#dccb94', 'night sand triad: deep (r197)'],
  ['dark', '--c-yellow-ink', '#ddb75e', 'night yellow ink (r197)'],
  ['dark', '--c-rose-ink', '#e08074', 'night rose ink (r197)'],
  ['dark', '--c-mint-ink', '#6fcb93', 'night mint ink (r197 green)'],
  ['dark', '--c-sky-deep', '#c0d2e8', 'night sky deep (r197)'],
  ['dark', '--c-lavender-ink', '#a78be8', 'night lavender ink (r197 violet)'],
  ['dark', '--c-grey-bg', '#1e1c18', 'night grey ground (r197 warm)'],
  ['dark', '--success', '#6fcb93', 'night success green (r197)'],
  ['dark', '--warning', '#ddb75e', 'night warning amber (r197)'],
  ['dark', '--danger', '#e08074', 'night danger rose (r197)'],
  ['dark', '--info', '#8fa8ce', 'night info slate (r197)'],
  // ── DARK theme — glass, surfaces, charts, motion (r197) ──
  ['dark', '--glass-bg', 'rgba(22,20,15,0.78)', 'night glass (r197 warm tint)'],
  ['dark', '--glass-blur', '16px', 'glass blur'],
  ['dark', '--glass-bg-strong', 'rgba(22,20,15,0.92)', 'night strong glass ground (r197; r140 fleet unification)'],
  ['dark', '--glass-blur-strong', '16px', 'night strong tier keeps the canonical 16px blur'],
  ['dark', '--sidebar-item-active-bg', 'rgb(142 155 255/0.16)', 'sidebar signal wash (r197)'],
  ['dark', '--topbar-bg', 'rgba(22,20,15,0.86)', 'night topbar (r197 warm chrome)'],
  ['dark', '--chart-6', '#e8c064', 'night amber series (r197)'],
  ['dark', '--chart-7', '#6fb3d9', 'night cyan-blue series (r197)'],
  ['dark', '--chart-8', '#d18ab4', 'night mauve series (r197)'],
  ['dark', '--chart-text', '#948d7e', 'night chart text = muted (r283)'],
  [
    'dark',
    '--elev-1',
    '0 1px 2px rgba(0,0,0,0.40),inset 0 1px 0 rgba(243,238,228,0.04)',
    'night elevation 1 (fill-led + warm inset, r197)',
  ],
  [
    'dark',
    '--elev-5',
    '0 32px 72px rgba(0,0,0,0.55),inset 0 1px 0 rgba(243,238,228,0.08)',
    'night elevation 5 (r197)',
  ],
  [
    'dark',
    '--shadow-modal',
    '0 24px 56px rgba(0,0,0,0.50),inset 0 1px 0 rgba(243,238,228,0.07)',
    'modal shadow → elev-4 (r197 — mist rings retired)',
  ],
  ['dark', '--type-display-line-height', '1.30', 'dark display leading (r197: top of the §4 range)'],
  ['dark', '--state-focus-ring-color', '#8e9bff', 'canonical cascade: dark ring → accent-strong (r197 signal)'],
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
  // r197: the egn/teal identity era is retired end-to-end (BLUEPRINT §1)
  '#027380', '#2fb6c6', '#015c66', '#014a52', '#e0f2f3', // egn light teal family
  '#4dc7d6', '#7fced9', '#061417', '#174752', '#a7cbd5', '#f9a09c', // egn night teal + horizon
  '#3f8b8b', '#5fafaf', // retired teal chart series
  '#f2c766', '#c57da9', '#a67a22', // retired chart ambers/mauves (r197 re-key)
  '--ln-', '--stage-', '--aura-', '--glow-accent', '--shell-aurora-azure', // retired landing vocabulary
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
