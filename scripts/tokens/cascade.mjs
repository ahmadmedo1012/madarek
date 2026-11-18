/**
 * cascade.mjs — the shared token-cascade parser (R366, Agent 3).
 *
 * Parses the shipped token CSS (tokens.generated.css + tokens.css,
 * in import order) into per-theme custom-property maps, honouring
 * @layer transparency, @media prefers-contrast (kept for the hc
 * maps; print/reduced-motion dropped for colour), and resolving
 * var()/color-mix()/alpha chains exactly as the browser cascades
 * them. Consumers: scripts/gates/color-audit.mjs (the L1 colour
 * audit) + scripts/tokens/parity.mjs (the L4a web<->mobile gate).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TOKEN_FILES = [
  path.join(ROOT, 'frontend/src/styles/tokens/tokens.generated.css'),
  path.join(ROOT, 'frontend/src/styles/tokens/tokens.css'),
];

/* ── CSS parsing: custom-property cascade ─────────────────────────── */
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }

/** Recursive-descent rule collector. @layer is transparent; @media is
 *  kept only for prefers-contrast: more (colour-relevant); everything
 *  else (@font-face/@keyframes/@media print) is dropped. */
function collectRules(css) {
  const rules = [];
  let i = 0;
  const len = css.length;
  function readBlock() {
    /* css[i] is just after '{'; consume to the matching '}' */
    let depth = 1, j = i;
    while (j < len && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(i, j - 1);
    i = j;
    return body;
  }
  while (i < len) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    i = open + 1;
    const body = readBlock();
    if (head.startsWith('@media')) {
      const mq = head.slice(head.indexOf('('));
      if (/prefers-contrast\s*:\s*more/.test(mq)) {
        rules.push(...collectRules(body).map((r) => ({ ...r, media: '(prefers-contrast: more)' })));
      }
    } else if (head.startsWith('@layer')) {
      rules.push(...collectRules(body));
    } else if (head.startsWith('@')) {
      /* @font-face, @keyframes, @supports — irrelevant here */
    } else if (head) {
      rules.push({ head, body, media: null });
    }
  }
  return rules;
}

function declsOf(body) {
  const out = new Map();
  for (const m of body.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
}

/* selector → which theme map does it write? */
function selectorThemes(head) {
  const isRoot = /(^|[\s,])(html)?:root/.test(head) || /(^|[\s,>])html\b/.test(head);
  const light = /:root(?![^\[]*\[data-theme)/.test(head) && !/\[data-theme="dark"\]/.test(head);
  const dark = /\[data-theme="dark"\]/.test(head);
  const themes = [];
  if (dark) themes.push('dark');
  else if (isRoot || /\[data-theme="light"\]/.test(head)) themes.push('light');
  return themes;
}

/* ── colour value model ───────────────────────────────────────────── */
export function parseColor(str) {
  if (!str) return null;
  str = str.trim();
  let m = str.match(/^#([0-9a-fA-F]{3,8})$/);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1 };
    }
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = str.match(/^rgba?\(\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    const num = (v) => v.endsWith('%') ? parseFloat(v) * 255 / 100 : parseFloat(v);
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: num(m[1]), g: num(m[2]), b: num(m[3]), a };
  }
  m = str.match(/^transparent$/i);
  if (m) return { r: 0, g: 0, b: 0, a: 0 };
  return null;
}
export const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) {
  const ca = parseColor(a), cb = parseColor(b);
  if (!ca || !cb) return null;
  /* alpha compositing over the base (b treated opaque; if b has alpha
     the caller composites against the page first) */
  const out = {
    r: ca.r * ca.a + cb.r * (1 - ca.a) * cb.a + 0 * 0,
    g: ca.g * ca.a + cb.g * (1 - ca.a) * cb.a,
    b: ca.b * ca.a + cb.b * (1 - ca.a) * cb.a,
    a: ca.a + (1 - ca.a) * cb.a,
  };
  return out;
}


export function resolveVar(map, name, depth = 0) {
  if (depth > 12) return null;
  const raw = map.get(name);
  if (raw === undefined) return null;
  return resolveValue(map, raw, depth);
}
export function resolveValue(map, expr, depth = 0) {
  if (depth > 12) return null;
  expr = expr.trim();
  const vm = expr.match(/^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  if (vm) {
    const got = resolveVar(map, vm[1], depth + 1);
    if (got !== null) return got;
    if (vm[2] !== undefined) return resolveValue(map, vm[2].trim(), depth + 1);
    return null;
  }
  const cm = expr.match(/^color-mix\(\s*in\s+srgb\s*,\s*([\s\S]+?)\s+([\d.]+)%\s*,\s*([\s\S]+?)\s*\)$/);
  if (cm) {
    const A = resolveValue(map, cm[1], depth + 1);
    const B = resolveValue(map, cm[3], depth + 1);
    if (A && B) {
      const t = parseFloat(cm[2]) / 100;
      return { r: A.r * t + B.r * (1 - t), g: A.g * t + B.g * (1 - t), b: A.b * t + B.b * (1 - t), a: A.a * t + B.a * (1 - t) };
    }
    return null;
  }
  return parseColor(expr);
}

/** Resolve a seat to an OPAQUE colour composited over the page bg. */
export function seatColor(map, seat, overSeat = 'bg') {
  let c = resolveVar(map, `--${seat}`);
  if (!c) return null;
  let guard = 0;
  while (c.a < 0.999 && guard++ < 6) {
    const base = resolveVar(map, `--${overSeat}`) ?? parseColor('#ffffff');
    const comp = mix(hex(c), hex(base), 1);
    c = comp;
    if (!c) break;
  }
  return c && c.a >= 0.999 ? c : (c ? { ...c, a: 1 } : null);
}

export function buildMaps(files = TOKEN_FILES) {
  const rules = [];
  for (const f of files) rules.push(...collectRules(stripComments(fs.readFileSync(f, 'utf8'))));
  const light = new Map(), darkRules = [];
  const hcLight = new Map(), hcDarkRules = [];
  for (const r of rules) {
    const decls = declsOf(r.body);
    if (!decls.size) continue;
    const themes = selectorThemes(r.head);
    if (!themes.length) continue;
    const isHC = r.media != null;
    for (const t of themes) {
      if (t === 'light') { for (const [k, v] of decls) (isHC ? hcLight : light).set(k, v); }
      else (isHC ? hcDarkRules : darkRules).push(decls);
    }
  }
  const dark = new Map(light);
  for (const d of darkRules) for (const [k, v] of d) dark.set(k, v);
  const hcDark = new Map(dark);
  for (const d of hcDarkRules) for (const [k, v] of d) hcDark.set(k, v);
  const hcLightFinal = new Map(light);
  for (const [k, v] of hcLight) hcLightFinal.set(k, v);
  return { base: { light, dark }, hc: { light: hcLightFinal, dark: hcDark } };
}
