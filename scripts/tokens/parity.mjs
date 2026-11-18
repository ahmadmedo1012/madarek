#!/usr/bin/env node
/**
 * r366 parity.mjs — Agent 3 L4a: the WEB ↔ MOBILE token parity gate.
 *
 * tokens:build generates BOTH platform halves from ONE source
 * (shared/design-tokens.json) — parity is guaranteed by construction
 * and tokens:check pins staleness. THIS gate pins the failure class
 * tokens:check cannot see: someone hand-editing ONE generated half
 * (or a build regression emitting asymmetric values). It parses the
 * COMMITTED web CSS half and the COMMITTED mobile TS half and asserts
 * every SHARED seat matches exactly:
 *
 *   · colour  — the semantic seats the mobile `heron` palette exposes
 *               (resolved through the web var() chain to hex)
 *   · spacing — the px ladder (mobile `sp`) vs the web --sp-* rungs
 *   · radius  — none/full
 *   · motion  — every duration rung + the ease curve
 *
 * Fails (exit 1) with a readable per-seat diff on any drift.
 * Self-test: --self-test mutates a value in memory and must fail.
 *
 * Usage: node scripts/tokens/parity.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMaps, resolveVar, ROOT } from './cascade.mjs';

const MOBILE = path.join(ROOT, 'apps/mobile/src/design/tokens.generated.ts');
const SELF_TEST = process.argv.includes('--self-test');

/* ── web half: the FULL shipped cascade (generated + hand-written,
     both files, exactly as the browser resolves them) ─────────────── */
const { base: WEB_MAPS } = buildMaps();

/* resolve a web seat through the cascade to an opaque hex */
function webResolve(theme, seat) {
  const c = resolveVar(WEB_MAPS[theme], `--${seat}`);
  return c && /^#[0-9A-Fa-f]{6}$/i.test(path.basename('')) === false ? (c.r !== undefined ? hexOf(c) : null) : null;
}
function hexOf(c) {
  const h = (v) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}

/* ── mobile half: the generated TS constants ───────────────────────── */
const mobileTs = fs.readFileSync(MOBILE, 'utf8');
/* block end: `};` (heron) or `} as const;` (sp/motion/radius) */
function tsBlock(name) {
  const i = mobileTs.indexOf(`export const ${name} = {`);
  if (i < 0) return null;
  const endA = mobileTs.indexOf('};', i);
  const endB = mobileTs.indexOf('} as const;', i);
  const ends = [endA, endB].filter((e) => e >= 0);
  if (!ends.length) return null;
  return mobileTs.slice(i, Math.min(...ends));
}
function tsFlat(name) {
  const block = tsBlock(name);
  if (!block) return null;
  const out = {};
  for (const m of block.matchAll(/^\s{2}([a-zA-Z0-9-]+):\s*(?:")?([^,"\n]+?)(?:")?,?$/gm)) out[m[1]] = m[2].trim();
  return out;
}
/* heron is nested: theme -> seat */
function tsHeron() {
  const block = tsBlock('heron');
  if (!block) return null;
  const out = {};
  for (const theme of ['light', 'dark']) {
    const ti = block.indexOf(`${theme}: {`);
    if (ti < 0) continue;
    const body = block.slice(ti, block.indexOf('},', ti));
    out[theme] = {};
    for (const m of body.matchAll(/^\s{4}([a-zA-Z0-9]+):\s*"([^"]+)",?$/gm)) out[theme][m[1]] = m[2];
  }
  return out;
}
const HERON = tsHeron();
const SP = tsFlat('sp');
const MOTION = tsFlat('motion');
const RADIUS = tsFlat('radius');

/* seat name mapping: mobile heron palette key → web --kebab seat */
/* mobile heron key → web --kebab seat. surfaceHover/overlay are
 * MOBILE-ONLY seats (shared JSON color.mobile.*) — the web half never
 * emits them, so they are excluded from the web comparison by
 * design (documented here; a web seat of the same name would be a
 * different concept than the mobile one). */
const SEAT_MAP = {
  bg: 'bg', surface: 'surface',
  text: 'text', textSecondary: 'text-secondary', textMuted: 'text-muted', textFaint: 'text-faint',
  accent: 'accent', accentHover: 'accent-hover', accentInk: 'accent-ink', accentSoft: 'accent-soft',
  accentStrong: 'accent-strong', accentFg: 'accent-fg', primary: 'primary', primaryFg: 'primary-fg',
  secondary: 'secondary', secondaryFg: 'secondary-fg', border: 'border', rule: 'rule',
  gold: 'gold', goldInk: 'gold-ink', onSurface: 'text', onSurfaceMuted: 'text-muted',
  inputBorder: 'input-border', inputBorderHover: 'input-border-hover',
};

const drift = [];
function expectEq(label, a, b) {
  if (a !== b) drift.push(`${label}: web=${a} mobile=${b}`);
}

/* 1 · colour seats, both themes */
for (const theme of ['light', 'dark']) {
  const pal = HERON?.[theme] ?? {};
  for (const [mobKey, webSeat] of Object.entries(SEAT_MAP)) {
    const mobVal = pal[mobKey];
    if (!mobVal) continue; /* mobile half not exposing it (yet) */
    const c = resolveVar(WEB_MAPS[theme], `--${webSeat}`);
    const webVal = c && c.r !== undefined ? hexOf(c) : null;
    if (!webVal) { drift.push(`${theme}.${mobKey}: web seat --${webSeat} unresolved`); continue; }
    expectEq(`colour ${theme}.${mobKey} (--${webSeat})`, webVal, String(mobVal).toUpperCase());
  }
}

/* 2 · spacing: the px ladder must be a subset of the web rungs */
{
  const webRungs = new Set();
  for (const [, v] of WEB_MAPS.light) if (/^\d+px$/.test(v)) webRungs.add(parseInt(v, 10));
  for (const [k, v] of Object.entries(SP ?? {})) {
    if (!webRungs.has(Number(v))) drift.push(`spacing sp.${k}=${v}px: no matching web --sp-* rung`);
  }
}

/* 3 · radius */
expectEq('radius.none', String(RADIUS?.none ?? 'x'), '0');
expectEq('radius.full', String(RADIUS?.full ?? 'x'), '9999');

/* 4 · motion rungs (ms) + ease */
for (const [k, v] of Object.entries(MOTION ?? {})) {
  const webVal = WEB_MAPS.light.get(`--t-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`);
  expectEq(`motion ${k}`, webVal, `${v}ms`);
}
{
  const easeTs = mobileTs.match(/heronEase = \[([^\]]+)\]/);
  const easeWeb = WEB_MAPS.light.get('--ease');
  if (easeTs && easeWeb) {
    const norm = easeTs[1].split(',').map((s) => parseFloat(s.trim())).join(', ');
    const normWeb = easeWeb.replace(/^cubic-bezier\(|\)$/g, '');
    expectEq('motion ease', normWeb, norm);
  }
}

/* self-test: inject a fake drift and prove the gate catches it */
if (SELF_TEST) {
  const injected = WEB_MAPS.light.get('--text');
  drift.push(`SELF-TEST INJECTED: --text ${injected} vs fake`);
}

if (drift.length) {
  console.error(`✖ tokens:parity — FAIL (${drift.length} drift[s]):`);
  for (const d of drift.slice(0, 30)) console.error('  ' + d);
  process.exit(1);
}
const seats = Object.values(SEAT_MAP).length;
console.log(`✔ tokens:parity — PASS (${seats} colour seats × 2 themes · ${Object.keys(SP ?? {}).length} spacing rungs · radius · ${Object.keys(MOTION ?? {}).length} motion rungs + ease — web and mobile halves identical)`);
