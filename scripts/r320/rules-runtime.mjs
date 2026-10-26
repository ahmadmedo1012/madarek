/**
 * rules-runtime.mjs — the three RUNTIME R320 gate rules (c1-GATE):
 *
 *   Rule 1  svg-collisions  — SVG `<text>`/`<tspan>` collision sweep
 *           on the landing (the R318 DOM-box collision gate skips
 *           everything inside <svg> — `n.closest('svg')` — so the
 *           campus map's labels were invisible to it; R320 BOARD §A4
 *           lists the live defects: «المكتبة والبحوث» × «M2 96»,
 *           «غرفة الإتقان» × furniture lines, «M2 150» × window rule).
 *   Rule 4  rename-scan     — no «الإدارة» used as a ROLE LABEL on
 *           admin routes (lands BEFORE c1-RENAME merges, so today
 *           every hit is an honest baseline ratchet row that flips
 *           to PASS when the rename lands; keep-list:
 *           docs/redesign/r320/rename-keep.json).
 *   Rule 5  cleanliness     — ZERO console errors/warnings, ZERO
 *           failed network requests (404/5xx/ERR), ZERO failed
 *           font/image loads per route (page.on console/response/
 *           requestfailed from before navigation to after settle).
 *
 * Each rule runs on the r319 cell contract (route × viewport ×
 * theme, reducedMotion reduce — which also resolves the journey
 * plan's every layer, so the map is fully drawn deterministically at
 * natural load: landing.css's RM belt sets `.jt .jt-plan text {
 * opacity: 1 }`).
 *
 * The in-page collectors are serialized BY SOURCE (Playwright
 * evaluate) — fully self-contained, no closure over module scope.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  ROOT,
  openDrawer,
  closeDrawer,
} from './gate-lib.mjs';

const RAF2 = '() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))';

/* ══════════════════════════════════════════════════════════════════════
 * Rule 1 — SVG TEXT COLLISIONS
 *
 * Thresholds (rendered client px, viewport-honest):
 *   · text × text        — any real intersection  > 0.5px²
 *     (the mission's "any text×text box intersection"; 0.5px² kills
 *     sub-pixel float dust only);
 *   · text × geometry    — intersection            > 4px²
 *     (the mission's tolerance for glyph-box × line-geometry);
 *   · geometry inflation — the stroke's rendered
 *     half-width (a <line>'s gBCR is zero-thickness);
 *   · mass ceiling       — fill-only geometry > 2500px² is a
 *     ground/wash (the sheet, the paper, a zone) — a label sitting
 *     on its own zone is the DESIGNED grammar, not a collision.
 *
 * Documented exclusions (each commented at the use site):
 *   · `.bp-gridline` — the drafting underlay the whole poché sits on
 *     (every mark crosses the column grid by construction);
 *   · `.pl-l-annot` texts vs geometry — annotation labels RIDE their
 *     rules by design («20.6M» is drawn ON the dimension rule);
 *   · containment — a text box fully inside a geometry box (or vice
 *     versa) is a SEAT, not a collision: grid-bubble letters sit
 *     inside their bubbles, station codes inside their chips.
 * ══════════════════════════════════════════════════════════════════════ */
const COLLECT_SVG_COLLISIONS = () => {
  const isShown = (el) => {
    try { if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; }
    catch { const cs0 = getComputedStyle(el); if (cs0.display === 'none' || cs0.visibility === 'hidden') return false; }
    let q = el;
    while (q && q.nodeType === 1) { if (parseFloat(getComputedStyle(q).opacity) < 0.05) return false; q = q.parentElement; }
    return true;
  };
  const containsBox = (o, i, slack) => o.x - slack <= i.x && o.y - slack <= i.y && o.x + o.width + slack >= i.x + i.width && o.y + o.height + slack >= i.y + i.height;
  const out = { svgs: 0, texts: 0, geoms: 0, textText: [], textGeom: [] };
  for (const svg of document.querySelectorAll('svg')) {
    if (!isShown(svg)) continue;
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width < 4 || svgRect.height < 4) continue;
    const isPlan = !!svg.closest('.jt-plan');
    const clip = (r) => {
      // the SVG canvas is the crop window (the ≤991px camera twin
      // crops by viewBox — anything outside the canvas is not drawn)
      const x1 = Math.max(r.x, svgRect.x);
      const y1 = Math.max(r.y, svgRect.y);
      const x2 = Math.min(r.x + r.width, svgRect.x + svgRect.width);
      const y2 = Math.min(r.y + r.height, svgRect.y + svgRect.height);
      if (x2 - x1 < 1 || y2 - y1 < 1) return null;
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    };

    /* texts — every <text>/<tspan> with content, visible, on-canvas */
    const texts = [];
    for (const t of svg.querySelectorAll('text, tspan')) {
      const content = (t.textContent || '').trim();
      if (!content) continue;
      if (t.closest('defs')) continue;
      if (!isShown(t)) continue;
      const r = clip(t.getBoundingClientRect());
      if (!r) continue;
      texts.push({
        content,
        cls: (t.getAttribute('class') || '').split(/\s+/)[0] || t.tagName.toLowerCase(),
        annot: !!t.closest('.pl-l-annot'),
        x: r.x, y: r.y, width: r.width, height: r.height,
        el: t,
      });
    }

    /* text × text — any real intersection; text↔its-own-tspan skipped */
    for (let i = 0; i < texts.length; i += 1) {
      for (let j = i + 1; j < texts.length; j += 1) {
        const A = texts[i];
        const B = texts[j];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const ix = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
        const iy = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
        const area = ix > 0 && iy > 0 ? ix * iy : 0;
        if (area > 0.5) {
          out.textText.push({
            a: A.content.slice(0, 18), aCls: A.cls,
            b: B.content.slice(0, 18), bCls: B.cls,
            area: +area.toFixed(1),
            x: Math.round(Math.max(A.x, B.x)), y: Math.round(Math.max(A.y, B.y)),
          });
        }
      }
    }

    /* geometry — the map plan only (mission scope: the map's
     * rule/line/furniture elements); stroked elements always count,
     * fill-only ones only at furniture scale (≤2500px²) */
    let geoms = [];
    if (isPlan) {
      geoms = [];
      for (const g of svg.querySelectorAll('line, rect, circle, ellipse, path, polyline, polygon')) {
        if (g.closest('defs')) continue;
        if (g.classList.contains('bp-gridline')) continue; // the drafting underlay — everything crosses the grid by construction
        if (!isShown(g)) continue;
        const cs = getComputedStyle(g);
        const stroke = (cs.stroke || '').trim();
        const fill = (cs.fill || '').trim();
        const sw = parseFloat(cs.strokeWidth) || 0;
        const so = cs.strokeOpacity === '' ? 1 : parseFloat(cs.strokeOpacity);
        const fo = cs.fillOpacity === '' ? 1 : parseFloat(cs.fillOpacity);
        const strokeOk = !!stroke && stroke !== 'none' && sw > 0 && (Number.isNaN(so) || so > 0.05);
        const fillOk = !!fill && fill !== 'none' && !/transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(fill) && (Number.isNaN(fo) || fo > 0.05);
        if (!strokeOk && !fillOk) continue; // bounds-only / invisible
        let scale = 1;
        try { const m = g.getScreenCTM(); if (m) scale = Math.hypot(m.a, m.b) || 1; } catch { /* keep 1 */ }
        const half = strokeOk ? (sw * scale) / 2 : 0; // a <line>'s gBCR is zero-thickness — inflate by the rendered stroke
        const base = g.getBoundingClientRect();
        if (base.width < 0.5 && base.height < 0.5) continue;
        const r = clip({ x: base.x - half, y: base.y - half, width: base.width + half * 2, height: base.height + half * 2 });
        if (!r) continue;
        if (!strokeOk && r.width * r.height > 2500) continue; // a ground/wash mass — labels live ON their zones by design
        geoms.push({
          cls: (g.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.') || g.tagName.toLowerCase(),
          x: r.x, y: r.y, width: r.width, height: r.height,
        });
      }
      for (const t of texts) {
        if (t.annot) continue; // annotation labels ride their rules by design («20.6M» ON the dim rule)
        for (const g of geoms) {
          const ix = Math.min(t.x + t.width, g.x + g.width) - Math.max(t.x, g.x);
          const iy = Math.min(t.y + t.height, g.y + g.height) - Math.max(t.y, g.y);
          const area = ix > 0 && iy > 0 ? ix * iy : 0;
          if (area <= 4) continue;
          if (containsBox(g, t, 1.5) || containsBox(t, g, 1.5)) continue; // a SEAT (bubble letters in bubbles, codes in chips)
          out.textGeom.push({
            t: t.content.slice(0, 18), tCls: t.cls,
            g: g.cls,
            area: +area.toFixed(1),
            x: Math.round(Math.max(t.x, g.x)), y: Math.round(Math.max(t.y, g.y)),
          });
        }
      }
    }
    out.svgs += 1;
    out.texts += texts.length;
    out.geoms += geoms.length;
  }
  out.textText.sort((a, b) => b.area - a.area);
  out.textGeom.sort((a, b) => b.area - a.area);
  return {
    svgs: out.svgs,
    texts: out.texts,
    geoms: out.geoms,
    textText: out.textText,
    textGeom: out.textGeom,
  };
};

/** Resolve the ≤991px camera twin to the FULL plan (the exact recipe
 * JourneyScene.restoreCam() uses when the viewport crosses ≥992px — a
 * real app state, not a synthetic one) so every zone's labels are
 * on-canvas at mobile/tablet widths. `.jt-plan` IS the svg element
 * itself (JourneyScene's own contract), so the selectors address it
 * directly. Returns true when the cam carried a crop (i.e. the sweep
 * should also measure the natural crop as pass 1). Saved attrs come
 * back on RESTORE. */
const SEED_PLAN_FULL_VIEW = () => {
  const pin = document.querySelector('.jt-pin .jt-plan');
  const full = pin ? pin.getAttribute('viewBox') : null;
  if (!full) return false;
  let touched = false;
  for (const svg of document.querySelectorAll('.jt-cam .jt-plan')) {
    const vb = svg.getAttribute('viewBox');
    if (vb && vb !== full) {
      svg.setAttribute('data-gate-vb', vb);
      svg.setAttribute('viewBox', full);
      touched = true;
    }
    const par = svg.getAttribute('preserveAspectRatio');
    if (par && par !== 'xMidYMid meet') {
      svg.setAttribute('data-gate-par', par);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      touched = true;
    }
  }
  return touched;
};

const RESTORE_PLAN_VIEW = () => {
  for (const svg of document.querySelectorAll('.jt-cam .jt-plan')) {
    const vb = svg.getAttribute('data-gate-vb');
    if (vb) { svg.setAttribute('viewBox', vb); svg.removeAttribute('data-gate-vb'); }
    const par = svg.getAttribute('data-gate-par');
    if (par) { svg.setAttribute('preserveAspectRatio', par); svg.removeAttribute('data-gate-par'); }
  }
};

/** Merge two sweep passes of one list: the same physical collision
 * appears in both (the natural crop at real mobile scale, the full
 * plan at letterbox scale) — keep one row per pair identity, the MAX
 * area (the honest rendered severity). */
function mergeLists(a, b, keyOf) {
  const map = new Map();
  for (const v of [...a, ...b]) {
    const k = keyOf(v);
    const prev = map.get(k);
    if (!prev || v.area > prev.area) map.set(k, v);
  }
  return [...map.values()].sort((x, y) => y.area - x.area);
}

/** Load the SVG collision allowlist (written reasons, the r318
 * collision-allowlist discipline — entries {a, b, reason}: a
 * violation is allowlisted when BOTH sides match (order-independent
 * for text×text; text-content vs geometry-class for text×geom). */
export function loadSvgCollisionAllowlist() {
  const p = path.join(ROOT, 'scripts/r320/svg-collision-allowlist.json');
  if (!existsSync(p)) return [];
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    if (parsed && Array.isArray(parsed.allow)) {
      return parsed.allow.filter((e) => e.a && e.b && e.reason && String(e.reason).trim().length >= 12);
    }
  } catch { /* fall through */ }
  return [];
}

function svgViolationAllowed(allow, v) {
  if (!allow.length) return false;
  const aTxt = v.a ?? v.t ?? '';
  const bTxt = v.b ?? v.g ?? '';
  return allow.some((e) =>
    (aTxt.includes(e.a) && bTxt.includes(e.b)) || (aTxt.includes(e.b) && bTxt.includes(e.a)));
}

/** Rule 1 driver — one landing page, two passes when the mobile cam
 * carries a crop (natural crop = the real mobile render scale; full
 * plan = cross-zone coverage), restored after. */
export async function checkSvgCollisions(page, allow = []) {
  const pass1 = await page.evaluate(COLLECT_SVG_COLLISIONS);
  const seeded = await page.evaluate(SEED_PLAN_FULL_VIEW);
  let textText = pass1.textText;
  let textGeom = pass1.textGeom;
  const meta = { svgs: pass1.svgs, texts: pass1.texts, geoms: pass1.geoms };
  let camOverride = false;
  if (seeded) {
    await page.evaluate(RAF2);
    await sleep(120);
    const pass2 = await page.evaluate(COLLECT_SVG_COLLISIONS);
    await page.evaluate(RESTORE_PLAN_VIEW);
    textText = mergeLists(pass1.textText, pass2.textText, (v) => `${v.a}|${v.aCls}|${v.b}|${v.bCls}`);
    textGeom = mergeLists(pass1.textGeom, pass2.textGeom, (v) => `${v.t}|${v.tCls}|${v.g}`);
    meta.svgs = Math.max(pass1.svgs, pass2.svgs);
    meta.texts = Math.max(pass1.texts, pass2.texts);
    meta.geoms = Math.max(pass1.geoms, pass2.geoms);
    camOverride = true;
  }
  const allowlisted = textText.filter((v) => svgViolationAllowed(allow, v)).length
    + textGeom.filter((v) => svgViolationAllowed(allow, v)).length;
  textText = textText.filter((v) => !svgViolationAllowed(allow, v));
  textGeom = textGeom.filter((v) => !svgViolationAllowed(allow, v));
  const total = textText.length + textGeom.length;
  const samples = [
    ...textText.map((v) => `text×text «${v.a}» × «${v.b}» ${v.area}px² @${v.x},${v.y}`),
    ...textGeom.map((v) => `«${v.t}» × ${v.g} ${v.area}px² @${v.x},${v.y}`),
  ];
  return {
    status: total ? 'FAIL' : 'PASS',
    metric: total,
    textText: textText.length,
    textGeom: textGeom.length,
    allowlisted,
    svgs: meta.svgs,
    texts: meta.texts,
    geoms: meta.geoms,
    camOverride,
    samples: samples.slice(0, 8),
  };
}

/* ══════════════════════════════════════════════════════════════════════
 * Rule 4 — RENAME SCAN (no «الإدارة» as a role label on admin routes)
 *
 * «الإدارة»/«الادارة» (both hamza spellings) in visible admin-route
 * text is a rename-register hit UNLESS a keep-list entry matches the
 * line (exact-string + context: e.g. «الإدارة المركزية» building
 * captions are KEEP — the c1-RENAME ledger owns the list at
 * docs/redesign/r320/rename-keep.json).
 * ══════════════════════════════════════════════════════════════════════ */
const COLLECT_RENAME = () => {
  const lines = (document.body.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const hits = [];
  for (const line of lines) {
    if (!/الإدارة|الادارة/.test(line)) continue;
    hits.push(line.slice(0, 64));
  }
  return { hits, lineCount: lines.length };
};

export function loadRenameKeep() {
  const p = path.join(ROOT, 'docs/redesign/r320/rename-keep.json');
  if (!existsSync(p)) return { keep: [], missing: true };
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    /* c1-RENAME's ledger sidecar (the authority, merged after c1-GATE)
     * carries keeps[]{file,phrase,reason}; the rule's own provisional
     * schema was keep[]{match,reason}. Accept BOTH — normalised to
     * {match, reason} so the ledger drives the scan directly. */
    if (parsed && Array.isArray(parsed.keeps)) {
      return {
        keep: parsed.keeps.map((k) => ({ match: k.phrase ?? k.match, reason: k.reason })),
        missing: false,
      };
    }
    if (parsed && Array.isArray(parsed.keep)) return { keep: parsed.keep, missing: false };
  } catch { /* fall through */ }
  return { keep: [], missing: true };
}

/** Rule 4 driver — admin pages only; the drawer is opened on touch
 * viewports first (the nav group label «الإدارة» lives in it). */
export async function checkRenameScan(page, width, keepList) {
  let drawerOpened = false;
  if (width <= 920) drawerOpened = await openDrawer(page);
  const fact = await page.evaluate(COLLECT_RENAME);
  if (drawerOpened) await closeDrawer(page);
  const kept = [];
  const fails = [];
  for (const hit of fact.hits) {
    const entry = keepList.find((k) => k.match && hit.includes(k.match));
    if (entry) kept.push(hit);
    else fails.push(hit);
  }
  const uniq = [...new Set(fails)];
  return {
    status: fails.length ? 'FAIL' : 'PASS',
    metric: fails.length,
    occurrences: fact.hits.length,
    uniqueLabels: uniq.length,
    kept: kept.length,
    keepEntries: keepList.length,
    drawerOpened,
    samples: uniq.slice(0, 5).map((s) => `«${s}»`),
  };
}

/* ══════════════════════════════════════════════════════════════════════
 * Rule 5 — CONSOLE / NETWORK CLEANLINESS
 *
 * Listeners attach BEFORE navigation and stay through the settle
 * window. Dedup keeps the ratchet metric stable against react-query
 * retries/StrictMode double-invocations: the metric counts UNIQUE
 * (type|location|text) console rows and UNIQUE (status|path) failed
 * requests — a repeat of the same failure is the same defect.
 * ══════════════════════════════════════════════════════════════════════ */
export function attachCleanliness(page) {
  const consoleMap = new Map();
  const networkMap = new Map();
  const record = (map, key, sample) => {
    const prev = map.get(key);
    if (prev) prev.count += 1;
    else map.set(key, { count: 1, sample });
  };
  page.on('console', (m) => {
    const type = m.type();
    if (type !== 'error' && type !== 'warning') return;
    let loc = '';
    try {
      const l = m.location();
      if (l && l.url) {
        let u = l.url;
        try { u = new URL(l.url).pathname; } catch { /* keep raw */ }
        loc = `${u}${l.lineNumber != null ? `:${l.lineNumber}` : ''}`;
      }
    } catch { /* no location */ }
    const text = m.text().replace(/\s+/g, ' ').slice(0, 150);
    record(consoleMap, `${type}|${loc}|${text}`, `${type} ${loc ? `@${loc} ` : ''}«${text.slice(0, 90)}»`);
  });
  page.on('response', (r) => {
    if (r.status() < 400) return;
    let p = r.url();
    try { p = new URL(r.url()).pathname; } catch { /* keep raw */ }
    record(networkMap, `${r.status()}|${p}`, `${r.status()} ${p}`);
  });
  page.on('requestfailed', (r) => {
    let p = r.url();
    try { p = new URL(r.url()).pathname; } catch { /* keep raw */ }
    const err = (r.failure() && r.failure().errorText) || 'FAILED';
    record(networkMap, `ERR:${err}|${p}`, `${err} ${p}`);
  });
  return {
    rows() {
      const consoleEntries = [...consoleMap.values()];
      const networkEntries = [...networkMap.values()];
      const consoleRows = {
        status: consoleEntries.length ? 'FAIL' : 'PASS',
        metric: consoleEntries.length,
        occurrences: consoleEntries.reduce((n, e) => n + e.count, 0),
        errors: [...consoleMap.entries()].filter(([k]) => k.startsWith('error')).length,
        warnings: [...consoleMap.entries()].filter(([k]) => k.startsWith('warning')).length,
        samples: consoleEntries.slice(0, 4).map((e) => `${e.sample}${e.count > 1 ? ` ×${e.count}` : ''}`),
      };
      const networkRows = {
        status: networkEntries.length ? 'FAIL' : 'PASS',
        metric: networkEntries.length,
        occurrences: networkEntries.reduce((n, e) => n + e.count, 0),
        samples: networkEntries.slice(0, 4).map((e) => `${e.sample}${e.count > 1 ? ` ×${e.count}` : ''}`),
      };
      return { consoleRows, networkRows };
    },
  };
}
