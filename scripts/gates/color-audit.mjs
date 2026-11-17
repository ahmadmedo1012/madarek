#!/usr/bin/env node
/**
 * r366 color-audit.mjs (scripts/gates/) — Agent 3 L1: the TOKEN-LEVEL colour audit.
 *
 * Sweeps the shipped token cascade itself (tokens.generated.css +
 * tokens.css, parsed and var()-resolved exactly as the browser
 * cascades them) across THREE theme states — light, dark and
 * prefers-contrast: more (both themes) — and measures every LEGAL
 * design pair with BOTH:
 *   · WCAG 2.2 — 4.5:1 body text / 3:1 large text, UI & borders
 *   · APCA W3 0.1.9 — Lc reported per pair (body ≥ 60 / large ≥ 45 /
 *     non-text ≥ 30 reported; the GATE stays WCAG — APCA is the
 *     second lens, recorded, not the failure source)
 *
 * Pair families (the design's own contracts — see PAIRS below):
 *   text×surface · ink×soft · fg×fill · border×surface (component
 *   borders enforced; decorative hairlines documented) · state seats ·
 *   focus-ring visibility · overlay separation · the text-on-image
 *   scrim guarantee · the chart palette vs its grounds INCLUDING
 *   protan/deuteran/tritan simulation (Machado 2009 matrices).
 *
 * Named exemptions (measured, never silent — mirrors the r323
 * contrast-exemptions.json philosophy): see EXEMPTIONS. Anything else
 * fails the run. Exit 1 on any finding.
 *
 * Usage: node scripts/r323/color-audit.mjs [--write]  (default: report
 * to audits/evidence/r366/color-audit.json — --write always writes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILES = [
  path.join(ROOT, 'frontend/src/styles/tokens/tokens.generated.css'),
  path.join(ROOT, 'frontend/src/styles/tokens/tokens.css'),
];
const OUT = path.join(ROOT, 'audits/evidence/r366/color-audit.json');

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
function parseColor(str) {
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
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
function mix(a, b, t) {
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

/* ── colour maths ─────────────────────────────────────────────────── */
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
function relLum(c) { return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b); }
function wcag(fg, bg) {
  const L1 = relLum(fg), L2 = relLum(bg);
  return Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100;
}

/* APCA W3 0.1.9 (Lc) — the second lens, reported. */
const APCA = {
  mainTRC: 2.4, Rco: 0.2126729, Gco: 0.7151522, Bco: 0.0721750,
  normBG: 0.56, normTXT: 0.57, revTXT: 0.62, revBG: 0.65,
  blkThrs: 0.022, blkClmp: 1.414, scaleBoW: 1.14, scaleWoB: 1.14,
  loBoWoffset: 0.027, loWoBoffset: 0.027, loClip: 0.1,
};
function Ys(c) {
  const s = (v) => Math.pow(v / 255, APCA.mainTRC);
  return APCA.Rco * s(c.r) + APCA.Gco * s(c.g) + APCA.Bco * s(c.b);
}
const fclamp = (Y) => (Y >= APCA.blkThrs ? Y : Y + Math.pow(APCA.blkThrs - Y, APCA.blkClmp));
function apcaLc(txtY, bgY) {
  const BoW = bgY > txtY;
  if (BoW) {
    const b = Math.pow(fclamp(bgY), APCA.normBG), t = Math.pow(fclamp(txtY), APCA.normTXT);
    let sapc = (b - t) * APCA.scaleBoW;
    if (Math.abs(sapc) < APCA.loClip) return 0;
    sapc = sapc > 0 ? sapc - APCA.loBoWoffset : sapc + APCA.loWoBoffset;
    return Math.round(sapc * 100);
  }
  const b = Math.pow(fclamp(bgY), APCA.revBG), t = Math.pow(fclamp(txtY), APCA.revTXT);
  let sapc = (b - t) * APCA.scaleWoB;
  if (Math.abs(sapc) < APCA.loClip) return 0;
  sapc = sapc > 0 ? sapc - APCA.loWoBoffset : sapc + APCA.loWoBoffset;
  return Math.round(sapc * 100);
}

/* CVD simulation — Machado et al. 2009 (severity 1.0), linear RGB. */
const CVD = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
function simulate(cvd, c) {
  const M = CVD[cvd];
  const cl = (v) => Math.min(1, Math.max(0, v));
  const linC = [c.r, c.g, c.b].map((v) => Math.pow(cl(v / 255), 2.2));
  const out = [0, 1, 2].map((i) => cl(M[i][0] * linC[0] + M[i][1] * linC[1] + M[i][2] * linC[2]));
  return { r: Math.pow(out[0], 1 / 2.2) * 255, g: Math.pow(out[1], 1 / 2.2) * 255, b: Math.pow(out[2], 1 / 2.2) * 255, a: c.a };
}

/* ── cascade resolution ───────────────────────────────────────────── */
function buildMaps() {
  const rules = [];
  for (const f of FILES) rules.push(...collectRules(stripComments(fs.readFileSync(f, 'utf8'))));
  /* two passes: the light cascade first (plain :root + [data-theme="light"]),
     then dark rules layer ON TOP of a light clone (that is exactly how the
     browser resolves [data-theme="dark"]: higher specificity wins, and the
     plain-:root defaults still apply underneath). */
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

function resolveVar(map, name, depth = 0) {
  if (depth > 12) return null;
  const raw = map.get(name);
  if (raw === undefined) return null;
  return resolveValue(map, raw, depth);
}
function resolveValue(map, expr, depth = 0) {
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
function seatColor(map, seat, overSeat = 'bg') {
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

/* ── the PAIR matrix (the design's own contracts) ─────────────────── */
const SURFACES = ['bg', 'surface', 'surface-1', 'surface-2', 'surface-3', 'bg-soft', 'surface-elevated', 'surface-sunken'];
const TEXTS = ['text', 'text-strong', 'text-secondary', 'text-muted', 'text-faint'];
const INK_ON_SOFT = [
  ['accent-ink', 'accent-soft'], ['success-ink', 'success-soft'], ['warning-ink', 'warning-soft'],
  ['danger-ink', 'danger-soft'], ['info-ink', 'info-soft'], ['gold-ink', 'gold-soft'],
];
const FG_ON_FILL = [
  ['accent-fg', 'accent-fill-aa'], ['primary-fg', 'primary'], ['secondary-fg', 'secondary'],
  ['text-on-accent', 'accent'], ['accent-fg', 'accent'], ['accent-fg', 'accent-hover'],
  ['danger-fg', 'danger'],
];
/* Control boundaries — the seats that IDENTIFY a control (WCAG
 * 1.4.11 scope): enforced at 3:1. The construction hairlines below are
 * the reference's own decorative grid (the Heron canon documents the
 * grid grey as decorative at 1.95:1) — reported, never gated. */
const CONTROL_BOUNDARIES = ['input-border', 'input-border-hover', 'state-input-focus-border', 'state-input-error-border', 'state-selected-border'];
const DECORATIVE_RULES = ['border', 'border-strong', 'rule', 'rule-strong', 'surface-border', 'surface-divider'];
const TRIAD_FAMILIES = ['peach', 'mint', 'lavender', 'sky', 'yellow', 'rose', 'sand', 'grey', 'copper'];
const CHARTS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6', 'chart-7', 'chart-8'];

/* Named exemptions — measured, never silent. */
const EXEMPTIONS = [
  {
    id: 'r313-heron-accent-fg-on-accent',
    seat: 'accent-fg × accent',
    reason: 'The R313 canon: the reference ships WHITE labels on the raw #FA3600 accent fill at its frozen seats (.pill.on, wipe hovers); the BUTTON system itself rides --accent-fill-aa (4.55:1) for every primary/accent action. Mitigation pinned at the seat: weight >= 600 + size >= 14px. Dark resolves 5.64:1 (ink on ember) and passes on its own.',
    themes: ['light'],
  },
  {
    id: 'r313-heron-text-on-accent',
    seat: 'text-on-accent × accent',
    reason: 'Same R313 ruling as accent-fg: --text-on-accent is the legacy name of the white-on-#FA3600 label family (3.76:1); the enforced action fill remains --accent-fill-aa (4.55:1). Documented at its seat in tokens.css.',
    themes: ['light'],
  },
];

function exemptionFor(pairId, theme) {
  return EXEMPTIONS.find((e) => e.seat === pairId && e.themes.includes(theme)) ?? null;
}

/* ── the audit ────────────────────────────────────────────────────── */
const { base, hc } = buildMaps();
const findings = [];
const passes = [];
const reports = [];
const exemptionsHit = [];
const apcaRows = [];

function measure(themeSet, themeName, mode) {
  const get = (seat) => seatColor(themeSet, seat);

  const check = (fgSeat, bgSeat, min, family, { largeMin = 3, report = false } = {}) => {
    const fg = get(fgSeat), bg = get(bgSeat);
    const pairId = `${fgSeat} × ${bgSeat}`;
    if (!fg || !bg) { reports.push({ pair: pairId, theme: themeName, mode, note: 'UNRESOLVED SEAT', family }); return; }
    const ratio = wcag(fg, bg);
    const lc = apcaLc(Ys(fg), Ys(bg));
    apcaRows.push({ pair: pairId, theme: themeName, mode, ratio, lc });
    const row = { pair: pairId, family, theme: themeName, mode, ratio, min, apcaLc: lc, fg: hex(fg), bg: hex(bg) };
    const ex = exemptionFor(pairId, themeName);
    if (ratio < min) {
      if (ex) { exemptionsHit.push({ ...row, exemption: ex.id }); return; }
      if (report) { reports.push({ ...row, note: 'below floor (documented family)' }); return; }
      findings.push(row);
    } else passes.push(row);
  };

  for (const t of TEXTS) for (const s of SURFACES) check(t, s, 4.5, 'text×surface');
  for (const [ink, soft] of INK_ON_SOFT) check(ink, soft, 4.5, 'ink×soft');
  for (const [fg, fill] of FG_ON_FILL) check(fg, fill, 4.5, 'fg×fill');
  for (const b of CONTROL_BOUNDARIES) for (const s of ['surface', 'bg', 'surface-2', 'surface-3']) check(b, s, 3, 'control-boundary×surface');
  /* the triad families: deep is the TEXT tier on the soft ground (the
     badge contract, verified in components.css BADGES); ink is the
     glyph/dot tier — measured on the soft ground and the neutral
     grounds at the 3:1 non-text floor. */
  for (const fam of TRIAD_FAMILIES) {
    check(`c-${fam}-deep`, `c-${fam}-bg`, 4.5, 'triad-text');
    check(`c-${fam}-ink`, `c-${fam}-bg`, 3, 'triad-glyph');
    check(`c-${fam}-ink`, 'surface', 3, 'triad-glyph');
    check(`c-${fam}-ink`, 'bg', 3, 'triad-glyph');
  }
  for (const r of DECORATIVE_RULES) for (const s of ['surface', 'bg']) check(r, s, 3, 'decorative-rule (report)', { report: true });

  /* state seats */
  check('state-selected-ink', 'state-selected-bg', 4.5, 'state');
  check('state-selected-border', 'surface', 3, 'state');
  check('state-focus-ring-color', 'bg', 3, 'state');
  check('state-focus-ring-color', 'surface', 3, 'state');
  /* disabled — WCAG exempts; house floor is REPORTED at 3:1 */
  check('state-disabled-ink', 'state-disabled-bg', 3, 'disabled (report)', { report: true });
  /* input focus signal vs surface (the visible focus border) */
  check('input-focus-signal', 'surface', 3, 'state');

  /* text-on-image guarantee: ink over the scrim over the worst-case
     pixel (#FFFFFF — measured in the token seat comment). */
  const scrimRaw = resolveVar(themeSet, '--scrim-text');
  const inkOnImage = resolveVar(themeSet, '--text-on-image-ink');
  if (scrimRaw && inkOnImage) {
    const worst = { r: 255, g: 255, b: 255 };
    const eff = mix(hex(scrimRaw), '#ffffff', 1);
    const ratio = wcag(inkOnImage, eff);
    apcaRows.push({ pair: 'text-on-image (worst-case white)', theme: themeName, mode, ratio, lc: apcaLc(Ys(inkOnImage), Ys(eff)) });
    const row = { pair: 'text-on-image × scrim-text × #FFFFFF', family: 'text-on-image', theme: themeName, mode, ratio, min: 4.5, fg: hex(inkOnImage), bg: hex(eff) };
    if (ratio < 4.5) findings.push(row); else passes.push(row);
  }

  /* overlay separation: veil over bg vs surface (modal pop) — enforced
     floor 1.5, reported APCA. */
  for (const veil of ['overlay-veil', 'overlay-veil-deep', 'overlay-veil-max']) {
    const v = resolveVar(themeSet, `--${veil}`);
    const bgC = get('bg'), sf = get('surface');
    if (v && bgC && sf) {
      const veiled = mix(hex(v), hex(bgC), 1);
      const ratio = wcag(sf, veiled);
      apcaRows.push({ pair: `surface × ${veil}(veiled bg)`, theme: themeName, mode, ratio, lc: apcaLc(Ys(sf), Ys(veiled)) });
      const row = { pair: `surface vs ${veil}`, family: 'overlay', theme: themeName, mode, ratio, min: 1.5, fg: hex(sf), bg: hex(veiled) };
      if (ratio < 1.5) findings.push(row); else passes.push(row);
    }
  }

  /* chart palette vs its grounds + CVD simulation */
  for (const ground of ['bg', 'surface']) {
    const g = get(ground);
    if (!g) continue;
    for (const c of CHARTS) {
      const col = resolveVar(themeSet, `--${c}`);
      if (!col) continue;
      const ratio = wcag(col, g);
      apcaRows.push({ pair: `${c} × ${ground}`, theme: themeName, mode, ratio, lc: apcaLc(Ys(col), Ys(g)) });
      const row = { pair: `${c} × ${ground}`, family: 'chart', theme: themeName, mode, ratio, min: 3, fg: hex(col), bg: hex(g) };
      if (ratio < 3) findings.push(row); else passes.push(row);
      for (const cvd of Object.keys(CVD)) {
        const sim = simulate(cvd, col), simG = simulate(cvd, g);
        const r2 = wcag(sim, simG);
        const row2 = { pair: `${c} × ${ground} (${cvd})`, family: 'chart-cvd', theme: themeName, mode, ratio: r2, min: 3, fg: hex(sim), bg: hex(simG) };
        if (r2 < 3) findings.push(row2); else passes.push(row2);
      }
    }
  }
}

measure(base.light, 'light', 'default');
measure(base.dark, 'dark', 'default');
measure(hc.light ?? base.light, 'light', 'prefers-contrast: more');
measure(hc.dark ?? base.dark, 'dark', 'prefers-contrast: more');

/* chart series distinctness under CVD — REPORT (ΔE76 < 10) */
function deltaE(a, b) {
  const toLab = (c) => {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    let [R, G, B] = [f(c.r), f(c.g), f(c.b)];
    let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const g = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const [fx, fy, fz] = [g(X), g(Y), g(Z)];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const [L1, a1, b1] = toLab(a), [L2, a2, b2] = toLab(b);
  return Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}
for (const themeName of ['light', 'dark']) {
  const set = base[themeName];
  const cols = CHARTS.map((c) => ({ c, v: resolveVar(set, `--${c}`) })).filter((x) => x.v);
  for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) {
    const d = deltaE(cols[i].v, cols[j].v);
    if (d < 10) reports.push({ pair: `${cols[i].c} vs ${cols[j].c}`, theme: themeName, mode: 'default', note: `ΔE76 ${d.toFixed(1)} < 10 (series distinctness, report)` });
    for (const cvd of Object.keys(CVD)) {
      const d2 = deltaE(simulate(cvd, cols[i].v), simulate(cvd, cols[j].v));
      if (d2 < 10) reports.push({ pair: `${cols[i].c} vs ${cols[j].c} (${cvd})`, theme: themeName, mode: 'default', note: `ΔE76 ${d2.toFixed(1)} < 10 under ${cvd} (report)` });
    }
  }
}

/* ── output ───────────────────────────────────────────────────────── */
const summary = {
  swept: passes.length + findings.length + exemptionsHit.length,
  pass: passes.length, fail: findings.length, exempted: exemptionsHit.length, reported: reports.length,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  meta: { gate: 'r366 color-audit (Agent 3 L1)', generatedAt: new Date().toISOString(), lenses: ['WCAG 2.2 AA', 'APCA W3 0.1.9 (reported)'] },
  summary, findings, exemptionsHit, reports, apca: apcaRows,
}, null, 2));

console.log(`[color-audit] swept ${summary.sweeped ?? summary.swept} pairs · ${summary.pass} pass · ${summary.fail} FAIL · ${summary.exempted} exempted (named) · ${summary.reported} reported`);
for (const f of findings) console.log(`  ✗ [${f.theme}/${f.mode}] ${f.pair} — ${f.ratio}:1 < ${f.min}:1  (${f.fg} on ${f.bg})`);
for (const e of exemptionsHit) console.log(`  ⚠ exempt ${e.exemption}: [${e.theme}] ${e.pair} — ${e.ratio}:1 (documented)`);
const shown = reports.slice(0, 24);
for (const r of shown) console.log(`  · report [${r.theme}] ${r.pair} — ${r.note}`);
if (reports.length > shown.length) console.log(`  … and ${reports.length - shown.length} more reports`);
console.log(`[color-audit] artifact → ${path.relative(ROOT, OUT)}`);
process.exit(findings.length ? 1 : 0);
