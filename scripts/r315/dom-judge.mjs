#!/usr/bin/env node
/**
 * R315 · Task 1-c (agent J2) — the DOM-GEOMETRY JUDGE (the R315 primary
 * objective: an objective, language-free parity judge — owner §3.2-1).
 *
 * For every viewport × [Heron live, Madarek localhost:5173] it loads each
 * page once (loader-gated), measures every role pair from
 * scripts/r315/roles.json and compares NORMALIZED geometry + paint:
 *
 *   · boxes:      x/w as fractions of the viewport width AFTER mirroring
 *                 Heron's x-axis (mirrored_x = 1 − (x + w)/vw — Heron is
 *                 LTR, Madarek RTL); y/h as viewport px (fixed elements)
 *                 or document px (in-flow — scroll-independent).
 *   · typography: font-size/line-height (±2px ladder noise), font-weight
 *                 exact. NEVER font-family (Arabic-first is by design),
 *                 NEVER letter-spacing (tracking is banned on Arabic
 *                 cursive), NEVER text content (language-free by
 *                 construction).
 *   · paint:      color/background (exact + ±2/255 per channel — the
 *                 JPEG-era perceptual allowance), 4 border sides
 *                 (±0.5px, l/r sides mirrored), border-radius ±0.5px,
 *                 box-shadow (parsed: lengths ±0.5px + color), opacity.
 *
 * Tolerances + the severity scale that ranks the worst-first list are
 * documented in scripts/r315/roles.json.
 *
 * Loader gates (from the r315 instruments — heron-dom-crawl.mjs and
 * measure-sections.mjs):
 *   Heron  /            : poll `.loading` gone ≤15s + ≥11s from nav + settle.
 *   Heron  /contact-us  : no loader replay (Barba entrance) → ≥4s settle.
 *   Heron  404          : no loader at all → ≥3s settle.
 *   Madarek /           : `.landing.intro-done` + no `.sl` + 2s settle.
 *   Madarek /auth       : `.auth-cell` + no `.sl` + 2s.
 *   Madarek 404         : `.nf-scene` + 2s.
 *
 * Politeness: Heron is a live third-party site — ONE pass per page+
 * viewport, ONE retry, then the failure is recorded and the run moves on.
 * A fresh browser context per viewport = no consent cookie on either
 * site, so the consent banner paints on both (K-C role measurable).
 *
 * Usage (repo root /home/z/madarek):
 *   node scripts/r315/dom-judge.mjs                 # default matrix:
 *                                                   #   1440x900 + 390x844 — ALL roles
 *                                                   #   360x800/768x1024/1024x768/1280x800 — core groups
 *   node scripts/r315/dom-judge.mjs --viewports 1440x900,390x844
 *   node scripts/r315/dom-judge.mjs --viewports 1440x900 --roles header,cta
 *   node scripts/r315/dom-judge.mjs --groups header,hero,consent,footer --viewports 360x800,768x1024,1024x768,1280x800
 *   node scripts/r315/dom-judge.mjs --out _local/dom-judge --max-worst 400
 *
 * Output: <out>/<viewport>.json (per-viewport detail) + <out>/report.json
 * (combined, mismatches ranked WORST-FIRST — the cycle's ticket queue).
 * Re-runs MERGE into the existing report.json per viewport.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

/* ── config ──────────────────────────────────────────────────────────── */
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'; // repo pattern — never `playwright install`
const ROLES_PATH = path.resolve(process.cwd(), 'scripts/r315/roles.json');
const OUT_DEFAULT = '_local/dom-judge';
const GAP_MS = 1500;               // between Heron passes (politeness)
const LOADER_TIMEOUT_MS = 15000;   // heron .loading poll
const MADAREK_GATE_TIMEOUT_MS = 30000;

/* ── CLI ─────────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(process.cwd(), get('out', OUT_DEFAULT));
fs.mkdirSync(OUT, { recursive: true });
const ROLES = JSON.parse(fs.readFileSync(ROLES_PATH, 'utf8'));
const MAX_WORST = Number(get('max-worst', 400));

const DEFAULT_PLAN = [
  { vp: '1440x900', groups: null },  // null = every role
  { vp: '390x844', groups: null },
  { vp: '360x800', groups: ROLES.groups.core },
  { vp: '768x1024', groups: ROLES.groups.core },
  { vp: '1024x768', groups: ROLES.groups.core },
  { vp: '1280x800', groups: ROLES.groups.core },
];

const argViewports = get('viewports', null);
const argRoles = get('roles', null);
const argGroups = get('groups', null);
let plan;
if (!argViewports && !argRoles && !argGroups) {
  plan = DEFAULT_PLAN;
} else {
  const filter = argRoles || argGroups || null;
  const wanted = filter ? new Set(filter.split(',').map((s) => s.trim()).filter(Boolean)) : null;
  const vps = argViewports ? argViewports.split(',').map((s) => s.trim()).filter(Boolean)
    : ['1440x900', '390x844', '360x800', '768x1024', '1024x768', '1280x800'];
  plan = vps.map((vp) => ({ vp, groups: null, filter: wanted }));
}

/* roles selected for a plan entry */
const rolesFor = (entry) => {
  const w = entry.vp.split('x').map(Number)[0];
  return ROLES.roles.filter((r) => {
    if (entry.groups && !entry.groups.includes(r.group)) return false;
    if (entry.filter && !entry.filter.has(r.id) && !entry.filter.has(r.group)) return false;
    if (r.skipBelow && w < r.skipBelow) return false;
    if (r.skipAbove && w > r.skipAbove) return false;
    return true;
  });
};

/* ── in-page collector (serialized into the page) ────────────────────── */
const COLLECT = (specs) => {
  const R = (n) => Math.round(n * 100) / 100;
  const mi = document.querySelector('.main-inner');
  let originX = 0, originY = 0, docH = 0, scroller = 'window';
  if (mi && (mi.scrollHeight > window.innerHeight)) {
    const mr = mi.getBoundingClientRect();
    originX = mr.left; originY = mr.top; docH = mi.scrollHeight; scroller = '.main-inner';
  } else {
    docH = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  }
  const scrollTop = mi ? mi.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
  const vw = window.innerWidth, vh = window.innerHeight;

  const styleRec = (cs, box, fixedCtx) => ({
    found: true,
    x: R(box.left), y: R(box.top), w: R(box.width), h: R(box.height),
    docY: R(fixedCtx ? box.top : (box.top - originY + scrollTop)),
    fixed: fixedCtx,
    bg: cs.backgroundColor, color: cs.color, opacity: cs.opacity,
    fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
    btw: cs.borderTopWidth, brw: cs.borderRightWidth, bbw: cs.borderBottomWidth, blw: cs.borderLeftWidth,
    btc: cs.borderTopColor, brc: cs.borderRightColor, bbc: cs.borderBottomColor, blc: cs.borderLeftColor,
    bisw: cs.borderInlineStartWidth, bisc: cs.borderInlineStartColor,
    radius: cs.borderTopLeftRadius,
    shadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow,
  });

  const isFixedCtx = (el) => {
    let n = el.parentElement;
    while (n && n !== document.body && n !== document.documentElement) {
      const p = getComputedStyle(n).position;
      if (p === 'fixed') return true;
      n = n.parentElement;
    }
    return false;
  };
  const unionBox = (els) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of els) { const r = e.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  };

  const out = {};
  for (const s of specs) {
    try {
      if (s.agg === 'union') {
        const els = Array.from(document.querySelectorAll(s.sel));
        const vis = els.filter((e) => getComputedStyle(e).display !== 'none');
        if (!vis.length) { out[s.id] = els.length ? { hidden: 'display:none' } : { missing: true }; continue; }
        const box = unionBox(vis);
        const cs = getComputedStyle(vis[0]);
        if (cs.visibility === 'hidden') { out[s.id] = { hidden: 'visibility:hidden' }; continue; }
        out[s.id] = styleRec(cs, box, isFixedCtx(vis[0]));
        continue;
      }
      const els = document.querySelectorAll(s.sel);
      if (!els.length) { out[s.id] = { missing: true }; continue; }
      const el = els[(s.nth || 1) - 1];
      const cs = getComputedStyle(el);
      /* display:contents — the element has no box of its own; its geometry IS
         the union of its children (Heron's mobile footer column does this) */
      const box = cs.display === 'contents'
        ? unionBox(Array.from(el.children).filter((c) => getComputedStyle(c).display !== 'none'))
        : el.getBoundingClientRect();
      if (s.pseudo) {
        const pcs = getComputedStyle(el, s.pseudo);
        if (!pcs.content || pcs.content === 'none' || pcs.content === 'normal') { out[s.id] = { missing: true, why: 'pseudo ' + s.pseudo + ' paints nothing' }; continue; }
        const r = el.getBoundingClientRect();
        const num = (v) => { const f = parseFloat(v); return Number.isFinite(f) ? f : 0; };
        const pt = num(pcs.top), pr = num(pcs.right), pb = num(pcs.bottom), pl = num(pcs.left);
        const box2 = { left: r.left + pl, top: r.top + pt, width: r.width - pl - pr, height: r.height - pt - pb };
        out[s.id] = Object.assign(styleRec(pcs, box2, isFixedCtx(el)), { pseudo: s.pseudo });
        continue;
      }
      if (cs.display === 'none') { out[s.id] = { hidden: 'display:none', w: R(box.width), h: R(box.height) }; continue; }
      if (cs.visibility === 'hidden') { out[s.id] = { hidden: 'visibility:hidden' }; continue; }
      if (box.width < 0.5 && box.height < 0.5) { out[s.id] = { hidden: '0×0 box' }; continue; }
      out[s.id] = styleRec(cs, box, cs.position === 'fixed' || isFixedCtx(el));
    } catch (e) { out[s.id] = { error: String(e).slice(0, 180) }; }
  }
  return {
    vw, vh, docH: R(docH), scroller, dir: (document.documentElement.getAttribute('dir') || 'ltr'),
    title: document.title.slice(0, 90), roles: out,
  };
};

/* ── loader gates ────────────────────────────────────────────────────── */
async function gateHeron(page, pageKey, t0) {
  try {
    await page.waitForFunction(() => {
      const l = document.querySelector('.loading');
      if (!l) return true;
      const cs = getComputedStyle(l);
      if (cs.display === 'none') return true;
      if (l.classList.contains('loaded') && parseFloat(cs.opacity) < 0.05) return true;
      return false;
    }, { timeout: LOADER_TIMEOUT_MS, polling: 250 });
  } catch { /* record: loader never left — measure anyway */ }
  const minWait = pageKey === 'landing' ? 11000 : pageKey === 'contact' ? 4000 : 3000;
  const elapsed = Date.now() - t0;
  if (elapsed < minWait) await page.waitForTimeout(minWait - elapsed);
  try { await page.evaluate(() => document.fonts.ready); } catch {}
  await page.waitForTimeout(1500);
}
async function gateMadarek(page, pageKey, t0) {
  const fn = pageKey === 'landing'
    ? () => { const r = document.querySelector('.landing'); return !!(r && r.classList.contains('intro-done')) && !document.querySelector('.sl'); }
    : pageKey === 'contact'
      ? () => !!document.querySelector('.auth-cell') && !document.querySelector('.sl')
      : () => !!document.querySelector('.nf-scene');
  try {
    await page.waitForFunction(fn, { timeout: MADAREK_GATE_TIMEOUT_MS, polling: 250 });
  } catch { /* gate timed out — measure what is there */ }
  try { await page.evaluate(() => document.fonts.ready); } catch {}
  const elapsed = Date.now() - t0;
  const minWait = pageKey === 'landing' ? 11000 : 3000;
  if (elapsed < minWait) await page.waitForTimeout(minWait - elapsed);
  await page.waitForTimeout(2000);
}

/* ── one site/page pass (retry once) ─────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function measurePage(ctx, site, pageKey, vp, roleSpecs) {
  const url = ROLES.pages[pageKey][site];
  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const page = await ctx.newPage();
    const t0 = Date.now();
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (site === 'heron') await gateHeron(page, pageKey, t0);
      else await gateMadarek(page, pageKey, t0);
      const data = await page.evaluate(COLLECT, roleSpecs);
      const rec = {
        site, page: pageKey, url, vp, status: resp ? resp.status() : null,
        ok: true, attempts: attempt, totalMs: Date.now() - t0,
        vw: data.vw, vh: data.vh, docH: data.docH, scroller: data.scroller,
        dir: data.dir, title: data.title, roles: data.roles,
      };
      await page.close();
      return rec;
    } catch (e) {
      lastErr = String(e).slice(0, 300);
      await page.close().catch(() => {});
      if (attempt === 1) { console.log(`  ↻ retry ${site}:${pageKey}@${vp} — ${lastErr.slice(0, 110)}`); await sleep(2500); }
    }
  }
  return { site, page: pageKey, url, vp, ok: false, error: lastErr, roles: {} };
}

/* ── comparison ──────────────────────────────────────────────────────── */
const TOL = ROLES.tolerances;
const parseColor = (str) => {
  if (!str) return null;
  const m = String(str).match(/rgba?\(([^)]+)\)/i);
  if (!m) return { raw: String(str) };
  const parts = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
  return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts.length > 3 ? parts[3] : 1 };
};
const parseShadow = (str) => {
  if (!str || str === 'none') return null;
  const c = parseColor(str);
  const lens = (String(str).match(/(-?[\d.]+)px/g) || []).map((s) => parseFloat(s));
  return { color: c, lens: lens.slice(0, 4) };
};
const round = (v, p = 3) => Math.round(v * 10 ** p) / 10 ** p;

function cmpColor(hv, mv, tolChannel = TOL.colorChannel, tolAlpha = 0.05) {
  const hc = parseColor(hv), mc = parseColor(mv);
  if (!hc || !mc) return { pass: String(hv) === String(mv), delta: 0, maxCh: 0, dAlpha: 0 };
  const maxCh = Math.max(Math.abs(hc.r - mc.r), Math.abs(hc.g - mc.g), Math.abs(hc.b - mc.b));
  const dAlpha = Math.abs((hc.a ?? 1) - (mc.a ?? 1));
  return { pass: maxCh <= tolChannel && dAlpha <= tolAlpha, maxCh: round(maxCh, 1), dAlpha: round(dAlpha, 3) };
}

function compareRole(role, h, m, hMeta, mMeta) {
  const res = { role: role.id, group: role.group, page: role.page, checks: [], status: 'ok' };
  const vw = hMeta.vw, vh = hMeta.vh;

  const push = (prop, type, hVal, mVal, delta, sev, tolDesc, pass) => {
    res.checks.push({
      prop, type, heron: hVal, madarek: mVal, delta, severity: round(sev, 4), tol: tolDesc, pass,
    });
    if (!pass) res.status = 'mismatch';
  };

  /* presence / visibility */
  if (h.missing && m.missing) return { ...res, status: 'skipped', why: 'missing on both sites' };
  if (h.missing || m.missing) {
    return {
      ...res, status: 'unmeasurable', why: h.missing ? 'heron selector matched nothing' : 'madarek selector matched nothing',
      detail: { heron: h.missing ? 'missing' : 'present', madarek: m.missing ? 'missing' : 'present' },
    };
  }
  if (h.error || m.error) return { ...res, status: 'unmeasurable', why: 'collector error', detail: { heron: h.error, madarek: m.error } };
  if (h.hidden && m.hidden) return { ...res, status: 'skipped', why: 'hidden on both sites (' + (h.hidden || m.hidden) + ')' };
  if (h.hidden || m.hidden) {
    push('visibility', 'visibility', h.hidden ? 'hidden (' + h.hidden + ')' : 'visible', m.hidden ? 'hidden (' + m.hidden + ')' : 'visible', 1, 0.8, 'both must paint', false);
    return res;
  }

  const fixed = !!h.fixed;
  const docY = (rec) => (fixed ? rec.y : rec.docY);
  const hpx = { x: h.x, w: h.w, y: docY(h), h: h.h };
  const mpx = { x: m.x, w: m.w, y: docY(m), h: m.h };

  /* box checks: heron x mirrored; y/h in doc px (flow) or viewport px (fixed).
     Roles with a custom `compare` list (cross-read roles: line-DIV on one side,
     border edge on the other) skip the box checks — their boxes are not the
     same object and the custom entries carry the honest comparison. */
  if (!role.compare) {
  const hmX = 1 - (h.x + h.w) / vw;
  const mmX = m.x / vw;
  push('x', 'box-x', round(hmX, 4), round(mmX, 4), round(Math.abs(hmX - mmX), 4),
    Math.abs(h.x + h.w - (vw - m.x)) / vw, `±${TOL.boxVPct * 100}% of vw (mirrored)`,
    Math.abs(hmX - mmX) <= TOL.boxVPct);
  push('w', 'box-w', round(h.w / vw, 4), round(m.w / vw, 4), round(Math.abs(h.w - m.w), 2),
    Math.abs(h.w - m.w) / vw, `±${TOL.boxVPct * 100}% of vw`,
    Math.abs(h.w / vw - m.w / vw) <= TOL.boxVPct);
  const dyPx = Math.abs(hpx.y - mpx.y);
  push('y', fixed ? 'box-y-fixed' : 'box-y-doc', round(hpx.y, 1), round(mpx.y, 1), round(dyPx, 1),
    dyPx / vh, `±${TOL.boxVPct * 100}% of vh`, dyPx / vh <= TOL.boxVPct);
  const dhPx = Math.abs(hpx.h - mpx.h);
  push('h', fixed ? 'box-h-fixed' : 'box-h-doc', round(hpx.h, 1), round(mpx.h, 1), round(dhPx, 1),
    dhPx / vh, `±${TOL.boxVPct * 100}% of vh`, dhPx / vh <= TOL.boxVPct);
  }

  /* the standard + custom prop expansion */
  const compareList = role.compare
    ? role.compare
    : (role.props || []).flatMap((p) => (
        p === 'box' ? []
          : p === 'font' ? [
            { prop: 'fontSize', heronKey: 'fontSize', madKey: 'fontSize', type: 'fontSize' },
            { prop: 'fontWeight', heronKey: 'fontWeight', madKey: 'fontWeight', type: 'weight' },
            { prop: 'lineHeight', heronKey: 'lineHeight', madKey: 'lineHeight', type: 'lineHeight' }]
          : p === 'color' ? [{ prop: 'color', heronKey: 'color', madKey: 'color', type: 'color' }]
          : p === 'bg' ? [{ prop: 'bg', heronKey: 'bg', madKey: 'bg', type: 'color' }]
          : p === 'border' ? [
            { prop: 'border-top-w', heronKey: 'btw', madKey: 'btw', type: 'strokePx' },
            { prop: 'border-right-w', heronKey: 'blw', madKey: 'brw', type: 'strokePx' },   /* l/r mirrored */
            { prop: 'border-bottom-w', heronKey: 'bbw', madKey: 'bbw', type: 'strokePx' },
            { prop: 'border-left-w', heronKey: 'brw', madKey: 'blw', type: 'strokePx' },    /* l/r mirrored */
            { prop: 'border-top-c', heronKey: 'btc', madKey: 'btc', type: 'color', condW: ['btw', 'btw'] },
            { prop: 'border-right-c', heronKey: 'blc', madKey: 'brc', type: 'color', condW: ['blw', 'brw'] },
            { prop: 'border-bottom-c', heronKey: 'bbc', madKey: 'bbc', type: 'color', condW: ['bbw', 'bbw'] },
            { prop: 'border-left-c', heronKey: 'brc', madKey: 'blc', type: 'color', condW: ['brw', 'blw'] }]
          : p === 'radius' ? [{ prop: 'radius', heronKey: 'radius', madKey: 'radius', type: 'radiusPx' }]
          : p === 'shadow' ? [{ prop: 'shadow', heronKey: 'shadow', madKey: 'shadow', type: 'shadow' }]
          : p === 'opacity' ? [{ prop: 'opacity', heronKey: 'opacity', madKey: 'opacity', type: 'opacity' }]
          : [{ prop: p, heronKey: p, madKey: p, type: p }]
      ));

  for (const c of compareList) {
    const hv = h[c.heronKey], mv = m[c.madKey];
    /* a border side's COLOR is only comparable when both sides actually paint
       that side (width ≥ 0.5px) — a 0-width border's computed color is noise;
       the width check already files the missing side. */
    if (c.condW) {
      const hw = parseFloat(h[c.condW[0]]), mw = parseFloat(m[c.condW[1]]);
      if (!(hw >= 0.5 && mw >= 0.5)) {
        res.checks.push({ prop: c.prop, type: 'color', heron: hv, madarek: mv, delta: '—', severity: 0, tol: 'skipped: side not painted on both', pass: true });
        continue;
      }
    }
    if (c.type === 'color') {
      const r = cmpColor(hv, mv);
      push(c.prop, 'color', hv, mv, `Δchannel ${r.maxCh}/255, Δalpha ${r.dAlpha}`, Math.max(r.maxCh / 128, r.dAlpha * 0.5), `±${TOL.colorChannel}/255 per channel`, r.pass);
    } else if (c.type === 'strokePx' || c.type === 'radiusPx') {
      const d = Math.abs(parseFloat(hv) - parseFloat(mv));
      push(c.prop, c.type, hv, mv, round(d, 2) + 'px', d / 50, `±${c.type === 'strokePx' ? TOL.strokePx : TOL.radiusPx}px`, d <= (c.type === 'strokePx' ? TOL.strokePx : TOL.radiusPx));
    } else if (c.type === 'fontSize' || c.type === 'lineHeight') {
      if (String(hv) === 'normal' || String(mv) === 'normal') {
        push(c.prop, c.type, hv, mv, '—', 0, '±2px (skipped when normal)', String(hv) === String(mv));
      } else {
        const d = Math.abs(parseFloat(hv) - parseFloat(mv));
        push(c.prop, c.type, hv, mv, round(d, 2) + 'px', d / 50, `±${c.type === 'fontSize' ? TOL.fontSizePx : TOL.lineHeightPx}px`, d <= (c.type === 'fontSize' ? TOL.fontSizePx : TOL.lineHeightPx));
      }
    } else if (c.type === 'weight') {
      const d = Math.abs(parseInt(hv, 10) - parseInt(mv, 10));
      push(c.prop, 'weight', hv, mv, String(d), d / 300, 'exact', d === 0);
    } else if (c.type === 'opacity') {
      const d = Math.abs(parseFloat(hv) - parseFloat(mv));
      push(c.prop, 'opacity', hv, mv, round(d, 3), d, `±${TOL.opacityAbs}`, d <= TOL.opacityAbs);
    } else if (c.type === 'shadow') {
      const hs = parseShadow(hv), ms = parseShadow(mv);
      if (!hs && !ms) push(c.prop, 'shadow', 'none', 'none', 0, 0, 'both none', true);
      else if (!hs || !ms) push(c.prop, 'shadow', hv, mv, 'none↔shadow', 0.5, 'both none or both present', false);
      else {
        const dl = hs.lens.map((v, i) => Math.abs(v - (ms.lens[i] ?? 0)));
        const maxL = dl.length ? Math.max(...dl) : 0;
        const cr = cmpColor(String(hv), String(mv));
        push(c.prop, 'shadow', hv, mv, `Δlen ${round(maxL, 2)}px, Δchannel ${cr.maxCh}/255`, Math.max(maxL / 50, cr.maxCh / 128), 'lengths ±0.5px, color ±2/255', maxL <= TOL.strokePx && cr.pass);
      }
    } else if (c.type === 'px') {
      const d = Math.abs(parseFloat(hv) - parseFloat(mv));
      push(c.prop, 'px', hv, mv, round(d, 2) + 'px', d / 50, `±${TOL.strokePx}px`, d <= TOL.strokePx);
    } else {
      push(c.prop, c.type || 'raw', String(hv), String(mv), '—', 0, 'exact', String(hv) === String(mv));
    }
  }
  return res;
}

/* ── per-viewport run ────────────────────────────────────────────────── */
async function runViewport(browser, entry) {
  const vp = entry.vp;
  const [w, h] = vp.split('x').map(Number);
  const roles = rolesFor(entry);
  const byPage = {};
  for (const r of roles) (byPage[r.page] ||= []).push(r);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'en-US', reducedMotion: 'no-preference' });

  const data = { heron: {}, madarek: {} };
  for (const pageKey of ['landing', 'contact', 'nf']) {
    if (!byPage[pageKey]) continue;
    const specs = byPage[pageKey].map((r) => {
      const s = { id: r.id, sel: r.heron.sel };
      if (r.heron.nth) s.nth = r.heron.nth;
      if (r.heron.agg) s.agg = r.heron.agg;
      if (r.heron.pseudo) s.pseudo = r.heron.pseudo;
      return s;
    });
    console.log(`  ▸ heron ${pageKey}@${vp} …`);
    data.heron[pageKey] = await measurePage(ctx, 'heron', pageKey, vp, specs);
    if (!data.heron[pageKey].ok) await sleep(GAP_MS);
  }
  for (const pageKey of ['landing', 'contact', 'nf']) {
    if (!byPage[pageKey]) continue;
    const specs = byPage[pageKey].map((r) => {
      const s = { id: r.id, sel: r.madarek.sel };
      if (r.madarek.nth) s.nth = r.madarek.nth;
      if (r.madarek.agg) s.agg = r.madarek.agg;
      if (r.madarek.pseudo) s.pseudo = r.madarek.pseudo;
      return s;
    });
    console.log(`  ▸ madarek ${pageKey}@${vp} …`);
    data.madarek[pageKey] = await measurePage(ctx, 'madarek', pageKey, vp, specs);
  }
  await ctx.close();

  /* compare */
  const results = [];
  const unmeasurable = [];
  for (const r of roles) {
    const hp = data.heron[r.page], mp = data.madarek[r.page];
    if (!hp || !mp) continue;
    if (!hp.ok || !mp.ok) {
      unmeasurable.push({ role: r.id, viewport: vp, why: !hp.ok ? 'heron pass failed: ' + (hp.error || '') : 'madarek pass failed: ' + (mp.error || '') });
      continue;
    }
    const out = compareRole(r, hp.roles[r.id] || { missing: true }, mp.roles[r.id] || { missing: true }, hp, mp);
    results.push(out);
    if (out.status === 'unmeasurable') unmeasurable.push({ role: r.id, viewport: vp, why: out.why, detail: out.detail });
  }

  const mismatches = [];
  for (const rr of results) {
    if (rr.status !== 'mismatch') continue;
    for (const c of rr.checks) {
      if (c.pass) continue;
      mismatches.push({
        viewport: vp, role: rr.role, group: rr.group, page: rr.page,
        prop: c.prop, type: c.type, heron: c.heron, madarek: c.madarek,
        delta: c.delta, tol: c.tol, severity: c.severity,
      });
    }
  }
  mismatches.sort((a, b) => b.severity - a.severity);

  const file = {
    meta: {
      viewport: vp, generatedAt: new Date().toISOString(),
      judge: 'scripts/r315/dom-judge.mjs (R315 J2)', rolesFile: 'scripts/r315/roles.json',
      rolesPlanned: roles.length, rolesCompared: results.filter((r) => r.status === 'ok' || r.status === 'mismatch').length,
      mismatches: mismatches.length, skipped: results.filter((r) => r.status === 'skipped').length,
      unmeasurable: unmeasurable.filter((u) => !u.why.includes('pass failed')).length,
      tolerances: TOL, mirror: 'heron x mirrored: 1-(x+w)/vw; heron border l↔r swapped',
    },
    sites: {
      heron: Object.fromEntries(Object.entries(data.heron).map(([k, v]) => [k, { ok: v.ok, status: v.status, attempts: v.attempts, totalMs: v.totalMs, vw: v.vw, vh: v.vh, docH: v.docH, scroller: v.scroller, dir: v.dir, title: v.title, error: v.error }])),
      madarek: Object.fromEntries(Object.entries(data.madarek).map(([k, v]) => [k, { ok: v.ok, status: v.status, attempts: v.attempts, totalMs: v.totalMs, vw: v.vw, vh: v.vh, docH: v.docH, scroller: v.scroller, dir: v.dir, title: v.title, error: v.error }])),
    },
    roles: results,
    mismatches,
    unmeasurable: unmeasurable.filter((u) => !u.why.includes('pass failed')),
    raw: {
      heron: Object.fromEntries(Object.entries(data.heron).map(([k, v]) => [k, v.roles])),
      madarek: Object.fromEntries(Object.entries(data.madarek).map(([k, v]) => [k, v.roles])),
    },
  };
  const outFile = path.join(OUT, `${vp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(file));
  console.log(`✓ ${vp}: ${mismatches.length} mismatches / ${file.meta.rolesCompared} compared (${file.meta.skipped} skipped, ${file.meta.unmeasurable} unmeasurable) → ${path.relative(process.cwd(), outFile)}`);
  return { vp, mismatches, unmeasurable, counts: file.meta };
}

/* ── main ────────────────────────────────────────────────────────────── */
console.log(`▸ dom-judge: ${plan.length} viewport(s) · roles table ${ROLES.roles.length} entries → ${OUT}`);
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const perViewport = {};
const allMismatchInstances = [];
for (const entry of plan) {
  const r = await runViewport(browser, entry);
  perViewport[r.vp] = { mismatches: r.mismatches.length, skipped: r.skipped, unmeasurable: r.unmeasurable.length, counts: r.counts };
  allMismatchInstances.push(...r.mismatches);
  await sleep(GAP_MS);
}
await browser.close();

/* aggregate: worst instance per (role,prop) across viewports */
const byKey = new Map();
for (const m of allMismatchInstances) {
  const key = m.role + '·' + m.prop;
  const prev = byKey.get(key);
  if (!prev || m.severity > prev.severity) byKey.set(key, m);
}
const worst = [...byKey.values()].sort((a, b) => b.severity - a.severity).slice(0, MAX_WORST);
const worstAll = [...allMismatchInstances].sort((a, b) => b.severity - a.severity);

/* merge into an existing report.json (per-viewport upsert) */
const reportPath = path.join(OUT, 'report.json');
let report = null;
if (fs.existsSync(reportPath)) { try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch { report = null; } }
if (!report || !report.viewports) report = { generatedAt: null, viewports: {}, worst: [], worstAllViewports: [] };
report.generatedAt = new Date().toISOString();
report.judge = 'scripts/r315/dom-judge.mjs + scripts/r315/roles.json (R315 · Task 1-c · agent J2)';
report.method = 'language-free DOM geometry: normalized boxes (heron x mirrored), typography size/lh/weight, colors ±2/255, strokes ±0.5px, radius/shadow/opacity — see roles.json tolerances + severity docs';
report.tolerances = TOL;
for (const [vp, info] of Object.entries(perViewport)) report.viewports[vp] = info;

/* rebuild the aggregate lists from ALL viewports present in the report
   (each viewport file carries its own mismatch list — reload them) */
const aggInstances = [];
for (const vp of Object.keys(report.viewports)) {
  const vf = path.join(OUT, `${vp}.json`);
  if (fs.existsSync(vf)) { try { aggInstances.push(...JSON.parse(fs.readFileSync(vf, 'utf8')).mismatches); } catch {} }
}
const aggByKey = new Map();
for (const m of aggInstances) {
  const key = m.role + '·' + m.prop;
  const prev = aggByKey.get(key);
  if (!prev || m.severity > prev.severity) aggByKey.set(key, m);
}
report.worst = [...aggByKey.values()].sort((a, b) => b.severity - a.severity).slice(0, MAX_WORST);
report.worstAllViewports = aggInstances.sort((a, b) => b.severity - a.severity).slice(0, MAX_WORST * 3);
report.totals = {
  viewportRuns: Object.keys(report.viewports).length,
  mismatchInstances: aggInstances.length,
  distinctIssues: aggByKey.size,
};
fs.writeFileSync(reportPath, JSON.stringify(report));
console.log(`✓ report → ${path.relative(process.cwd(), reportPath)}  (${report.totals.distinctIssues} distinct issues, ${report.totals.mismatchInstances} instances across ${report.totals.viewportRuns} viewports)`);
console.log('\nTOP 12 (worst instance per role·prop):');
report.worst.slice(0, 12).forEach((m, i) => {
  console.log(`${String(i + 1).padStart(2)}. [${m.severity.toFixed(3)}] ${m.viewport} ${m.role}.${m.prop}  heron=${String(m.heron).slice(0, 40)}  madarek=${String(m.madarek).slice(0, 40)}  Δ=${String(m.delta).slice(0, 30)}`);
});
