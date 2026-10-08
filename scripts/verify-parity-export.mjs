#!/usr/bin/env node
/* ═════════════════════════════════════════════════════════════════════
   verify-parity-export.mjs — canonical parity gate for the export pair
   ─────────────────────────────────────────────────────────────────────
   r127-F1 companion to:
     frontend/src/styles/unified-smart-parity.css   (canonical export)
     frontend/src/styles/shared-design-system.css   (structural skeleton)

   Dependency-free (node:fs / node:path / node:url only). Gates:

     1. TOKEN PARITY — parses tokens.css (the source of truth) and the
        parity export, builds resolved light/dark token maps for both
        (theme blocks + var() chains + fallbacks), and asserts 150+ key
        tokens match EXACTLY. For the headline tokens the canonical side
        is additionally pinned to its documented value (night #070B16,
        gold #E9B44C, copper #B57438, cream #FBFAF9, sand #F2EFE6 …), so
        a future drift of tokens.css itself fails loudly instead of
        silently dragging the export along.
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
  parity: join(ROOT, 'frontend/src/styles/unified-smart-parity.css'),
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
   opts.canonicalUnresolved: for the ONE canonical wrinkle — a token whose
   canonical value references an undefined var (tokens.css spells
   --journey-core: var(--ink); --ink is defined nowhere). There the gate
   asserts canonical is STILL unresolvable and the export binds the value
   the canonical comment documents. */
const CHECKS = [
  // ── :root primitives — radius ladder ──
  ['root', '--r-xs', '6px', 'radius rung 1'],
  ['root', '--r-sm', '8px', 'radius rung 2'],
  ['root', '--r-md', '10px', 'radius rung 3 (was shifted to 8px by the divergent revision)'],
  ['root', '--r-lg', '12px', 'radius rung 4'],
  ['root', '--r-xl', '16px', 'radius rung 5 (cards; divergent revision painted 20px)'],
  ['root', '--r-2xl', '20px', 'radius rung 6 (divergent revision invented 24px here)'],
  ['root', '--r-3xl', '28px', 'radius rung 7 (missing from the divergent revision)'],
  ['root', '--r-full', '9999px', 'pill radius'],
  // ── :root primitives — spacing ──
  ['root', '--sp-1', '4px', 'spacing base'],
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
  ['root', '--fs-h1', '30px', 'divergent revision: 24px fs-2xl'],
  ['root', '--type-display-line-height', '1.15', 'Arabic display leading floor'],
  // ── :root primitives — layout ──
  ['root', '--sidebar-w', '256px', 'divergent revision fallback: 260px'],
  ['root', '--content-max-w', '1280px', 'content measure'],

  // ── LIGHT theme — grounds, ink, copper ──
  ['light', '--neutral-0', '#ffffff', 'light surface'],
  ['light', '--neutral-50', '#fbfaf9', 'CREAM page ground (divergent: #ffffff)'],
  ['light', '--neutral-100', '#f7f6f3', 'subtle band'],
  ['light', '--neutral-150', '#f1efec', 'surface-3'],
  ['light', '--neutral-200', '#e9e7e2', 'hairline (divergent: Tailwind gray-200)'],
  ['light', '--neutral-300', '#d9d6d0', 'divider (divergent: Tailwind gray-300)'],
  ['light', '--neutral-900', '#191918', 'INK (divergent: #151515)'],
  ['light', '--text', '#191918', 'light text = ink'],
  ['light', '--text-muted', '#6e6c65', 'WCAG-fixed muted'],
  ['light', '--text-faint', '#74706a', 'WCAG-fixed faint'],
  ['light', '--accent', '#b57438', 'COPPER (divergent: saffron/ember)'],
  ['light', '--accent-hover', '#9a5f25', 'copper hover'],
  ['light', '--accent-soft', '#f4e4d2', 'copper soft ground'],
  ['light', '--accent-strong', '#5c3416', 'deep copper'],
  ['light', '--accent-fg', '#1a0f06', 'espresso ink on copper'],
  ['light', '--accent-ink', '#5c3416', 'text-safe copper ink'],
  ['light', '--state-focus-ring-color', '#5c3416', 'light ring = deep copper (10.29:1)'],
  ['light', '--success', '#4fa66d', 'mint (divergent: Tailwind emerald)'],
  ['light', '--warning', '#d6a330', 'yellow (divergent: Tailwind amber)'],
  ['light', '--danger', '#dd6e78', 'rose (divergent: Tailwind red)'],
  ['light', '--info', '#5c8fce', 'sky (divergent: Tailwind blue)'],
  ['light', '--success-ink', '#1f4f30', 'mint text ink'],
  ['light', '--warning-ink', '#6b4c0b', 'yellow text ink'],
  ['light', '--danger-ink', '#6b2128', 'rose text ink'],
  ['light', '--info-ink', '#1f3d63', 'sky text ink'],
  ['light', '--danger-fg', '#191918', 'ink on danger fill'],
  ['light', '--primary', '#191918', 'light primary = ink slab'],
  ['light', '--primary-fg', '#ffffff', 'on primary'],
  // ── LIGHT theme — family triads ──
  ['light', '--c-copper-bg', '#f4e4d2', 'copper triad: bg'],
  ['light', '--c-copper-ink', '#b57438', 'copper triad: ink'],
  ['light', '--c-copper-deep', '#5c3416', 'copper triad: deep'],
  ['light', '--c-sand-bg', '#f1ecdf', 'sand triad: bg'],
  ['light', '--c-sand-ink', '#b59868', 'sand triad: ink'],
  ['light', '--c-sand-deep', '#5a4623', 'sand triad: deep'],
  ['light', '--c-peach-bg', '#ffe9dc', 'peach triad: bg'],
  ['light', '--c-mint-ink', '#4fa66d', 'mint triad: ink'],
  ['light', '--c-lavender-deep', '#3f2d7a', 'lavender triad: deep'],
  ['light', '--c-sky-ink', '#5c8fce', 'sky triad: ink'],
  ['light', '--c-yellow-bg', '#fcf1cd', 'yellow triad: bg'],
  ['light', '--c-rose-ink', '#dd6e78', 'rose triad: ink'],
  ['light', '--c-grey-deep', '#2d2a24', 'grey triad: deep'],
  // ── LIGHT theme — glass, elevation, charts ──
  ['light', '--glass-bg', 'rgba(251,250,249,0.78)', 'cream glass (divergent: white 0.82)'],
  ['light', '--glass-blur', '16px', 'glass blur (divergent: 20px)'],
  ['light', '--chart-6', '#a67a22', 'series amber'],
  ['light', '--chart-text', '#6e6c65', 'chart text ink'],
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
  ['light', '--journey-node', '#b57438', 'journey: copper node'],
  ['light', '--journey-core', '#191918', 'journey core: canonical var(--ink) is UNDEFINED — export binds the documented ink', { canonicalUnresolved: true }],

  // ── DARK theme — the night indigo ramp ──
  ['dark', '--neutral-0', '#0d1428', 'night surface 0 (divergent: #151515)'],
  ['dark', '--neutral-50', '#070b16', 'NIGHT ground (divergent: generic #0f0f0f)'],
  ['dark', '--neutral-100', '#121a36', 'night surface (divergent: #1a1a1a)'],
  ['dark', '--neutral-150', '#182142', 'sky-2 (divergent file referenced it undefined)'],
  ['dark', '--neutral-200', '#1b2444', 'night hairline (divergent: #2a2a2a)'],
  ['dark', '--neutral-300', '#263052', 'night divider (divergent: #3d3d3d)'],
  ['dark', '--neutral-400', '#7a83a0', 'night faint'],
  ['dark', '--neutral-500', '#8e97b8', 'night mist (divergent: Tailwind gray-400)'],
  ['dark', '--neutral-700', '#c3c8dc', 'night secondary (divergent: #c4c0b8)'],
  ['dark', '--neutral-800', '#dde1ee', 'night strong'],
  ['dark', '--neutral-900', '#f2efe6', 'SAND text (divergent file had this one right)'],
  ['dark', '--text', '#f2efe6', 'dark text = sand'],
  ['dark', '--text-muted', '#8e97b8', 'dark muted = mist'],
  ['dark', '--text-faint', '#7a83a0', 'dark faint'],
  ['dark', '--text-on-accent', '#05070f', 'void ink on accent'],
  // ── DARK theme — the gold accent family ──
  ['dark', '--accent', '#e9b44c', 'GOLD (divergent file had this one right)'],
  ['dark', '--accent-hover', '#f5d48a', 'PALE gold'],
  ['dark', '--accent-soft', '#2c2312', 'gold soft ground (divergent: oklch alpha)'],
  ['dark', '--accent-strong', '#c9962f', 'STRONG gold'],
  ['dark', '--accent-fg', '#05070f', 'void ink on gold (divergent: #1a0f06)'],
  ['dark', '--primary', '#e9b44c', 'dark primary = gold'],
  ['dark', '--primary-fg', '#05070f', 'on gold'],
  ['dark', '--danger-fg', '#05070f', 'void ink on night rose'],
  ['dark', '--success-ink', '#7fd39a', 'night mint ink'],
  // ── DARK theme — night family triads ──
  ['dark', '--c-copper-bg', '#2c2312', 'night copper triad: bg'],
  ['dark', '--c-copper-ink', '#e9b44c', 'night copper triad: ink = gold'],
  ['dark', '--c-copper-deep', '#f5d48a', 'night copper triad: deep = pale gold'],
  ['dark', '--c-sand-bg', '#241f14', 'night sand triad: bg'],
  ['dark', '--c-sand-ink', '#d9c18c', 'night sand triad: ink'],
  ['dark', '--c-sand-deep', '#efe2c5', 'night sand triad: deep'],
  ['dark', '--c-yellow-ink', '#ecc97d', 'night yellow ink'],
  ['dark', '--c-rose-ink', '#f0938f', 'night rose ink'],
  ['dark', '--c-mint-ink', '#7fd39a', 'night mint ink'],
  ['dark', '--c-sky-deep', '#c9dcee', 'night sky deep'],
  ['dark', '--c-lavender-ink', '#b7a0f4', 'night lavender ink'],
  ['dark', '--c-grey-bg', '#161d33', 'night grey ground'],
  // ── DARK theme — glass, surfaces, charts, motion ──
  ['dark', '--glass-bg', 'rgba(11,16,32,0.78)', 'night glass (divergent: rgba(15,15,15,0.9))'],
  ['dark', '--glass-blur', '16px', 'glass blur'],
  ['dark', '--sidebar-item-active-bg', 'rgb(233 180 76/0.10)', 'sidebar gold wash'],
  ['dark', '--topbar-bg', 'rgba(7,11,22,0.86)', 'night topbar'],
  ['dark', '--chart-6', '#f2c766', 'night gold series'],
  ['dark', '--chart-7', '#5fafaf', 'night teal series'],
  ['dark', '--chart-8', '#c57da9', 'night mauve series'],
  ['dark', '--chart-text', '#8e97b8', 'night chart text = mist'],
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
    '0 12px 32px rgba(2,4,12,0.66),0 32px 80px rgba(2,4,12,0.70),0 0 0 1px rgba(142,151,184,0.12)',
    'indigo shadow + mist hairline',
  ],
  ['dark', '--type-display-line-height', '1.2', 'dark display leading step'],
  ['dark', '--state-focus-ring-color', '#c9962f', 'canonical cascade: dark ring → accent-strong'],
  ['dark', '--journey-node', '#e9b44c', 'night journey: gold node'],
  ['dark', '--journey-line', 'rgba(233,180,76,0.34)', 'night journey: gold thread'],
  ['dark', '--journey-core', '#f2efe6', 'journey core: canonical var(--ink) is UNDEFINED — export binds the night sand', { canonicalUnresolved: true }],
];

/* ── Gate 3: forbidden retired values (scanned on the FULL text) ────── */

const FORBIDDEN_VALUES = [
  '#bc4700', '#a33d00', '#d45500', // retired saffron/ember accents
  '#0f0f0f', '#151515', '#1a1a1a', '#222222', // generic dark grounds
  '#c4c0b8', '#2a2a2a', '#3d3d3d', // divergent dark secondary/borders
  '#f7f8fa', '#f0f1f3', '#e5e7eb', '#d1d5db', // Tailwind grays
  '#6b7280', '#9ca3af', // Tailwind gray-500/400
  '#3b82f6', '#dc2626', '#d97706', '#0ea579', // Tailwind status colors
  'oklch(', // oklch shadows (canonical uses warm rgba / indigo rgba)
  '99999', // invented z-max
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
console.log(`  export:    frontend/src/styles/unified-smart-parity.css (${lineCount(read(PATHS.parity))} lines)`);
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

const auditParity = auditVars(read(PATHS.parity), parityDefs, 'unified-smart-parity.css (self-contained)');
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
  ['unified-smart-parity.css', read(PATHS.parity)],
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
  ['unified-smart-parity.css', read(PATHS.parity)],
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
