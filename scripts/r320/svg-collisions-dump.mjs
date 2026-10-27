#!/usr/bin/env node
/**
 * R320 §A4 probe — dump EVERY SVG text collision on the landing the
 * way the GATE counts them (same exemptions: bp-gridline underlay,
 * fill-only ground masses >2500px², .pl-l-annot riders, full-
 * containment seats, stroke-inflated line boxes, ≤991 camera resolved
 * to the full plan) — samples NOT truncated. Usage:
 *   node scripts/r320/svg-collisions-dump.mjs [--base-url http://…] [--port 4259]
 */
import { chromium } from 'playwright-core';
import { spawnVite, waitReady, killTree, parseArgs } from './gate-lib.mjs';

const opt = parseArgs(process.argv.slice(2), { port: 4259 });

/* ── the gate's own collector (rules-runtime.mjs COLLECT_SVG_COLLISIONS
 *    verbatim, minus the allowlist) ── */
const COLLECT = () => {
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
      const x1 = Math.max(r.x, svgRect.x);
      const y1 = Math.max(r.y, svgRect.y);
      const x2 = Math.min(r.x + r.width, svgRect.x + svgRect.width);
      const y2 = Math.min(r.y + r.height, svgRect.y + svgRect.height);
      if (x2 - x1 < 1 || y2 - y1 < 1) return null;
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    };
    const texts = [];
    for (const t of svg.querySelectorAll('text, tspan')) {
      const content = (t.textContent || '').trim();
      if (!content) continue;
      if (t.closest('defs')) continue;
      if (!isShown(t)) continue;
      const r = clip(t.getBoundingClientRect());
      if (!r) continue;
      texts.push({
        content, cls: (t.getAttribute('class') || '').split(/\s+/)[0] || t.tagName.toLowerCase(),
        annot: !!t.closest('.pl-l-annot'), x: r.x, y: r.y, width: r.width, height: r.height, el: t,
      });
    }
    for (let i = 0; i < texts.length; i += 1) {
      for (let j = i + 1; j < texts.length; j += 1) {
        const A = texts[i]; const B = texts[j];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const ix = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
        const iy = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
        const area = ix > 0 && iy > 0 ? ix * iy : 0;
        if (area > 0.5) out.textText.push({ a: A.content.slice(0, 18), aCls: A.cls, b: B.content.slice(0, 18), bCls: B.cls, area: +area.toFixed(1), x: Math.round(Math.max(A.x, B.x)), y: Math.round(Math.max(A.y, B.y)), ax: Math.round(A.x), ay: Math.round(A.y), aw: Math.round(A.width), ah: Math.round(A.height), by: Math.round(B.y), bh: Math.round(B.height) });
      }
    }
    let geoms = [];
    if (isPlan) {
      for (const g of svg.querySelectorAll('line, rect, circle, ellipse, path, polyline, polygon')) {
        if (g.closest('defs')) continue;
        if (g.classList.contains('bp-gridline')) continue;
        if (!isShown(g)) continue;
        const cs = getComputedStyle(g);
        const stroke = (cs.stroke || '').trim();
        const fill = (cs.fill || '').trim();
        const sw = parseFloat(cs.strokeWidth) || 0;
        const so = cs.strokeOpacity === '' ? 1 : parseFloat(cs.strokeOpacity);
        const fo = cs.fillOpacity === '' ? 1 : parseFloat(cs.fillOpacity);
        const strokeOk = !!stroke && stroke !== 'none' && sw > 0 && (Number.isNaN(so) || so > 0.05);
        const fillOk = !!fill && fill !== 'none' && !/transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(fill) && (Number.isNaN(fo) || fo > 0.05);
        if (!strokeOk && !fillOk) continue;
        let scale = 1;
        try { const m = g.getScreenCTM(); if (m) scale = Math.hypot(m.a, m.b) || 1; } catch { /* keep 1 */ }
        const half = strokeOk ? (sw * scale) / 2 : 0;
        const base = g.getBoundingClientRect();
        if (base.width < 0.5 && base.height < 0.5) continue;
        const r = clip({ x: base.x - half, y: base.y - half, width: base.width + half * 2, height: base.height + half * 2 });
        if (!r) continue;
        if (!strokeOk && r.width * r.height > 2500) continue;
        geoms.push({ cls: (g.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.') || g.tagName.toLowerCase(), x: r.x, y: r.y, width: r.width, height: r.height });
      }
      for (const t of texts) {
        if (t.annot) continue;
        for (const g of geoms) {
          const ix = Math.min(t.x + t.width, g.x + g.width) - Math.max(t.x, g.x);
          const iy = Math.min(t.y + t.height, g.y + g.height) - Math.max(t.y, g.y);
          const area = ix > 0 && iy > 0 ? ix * iy : 0;
          if (area <= 4) continue;
          if (containsBox(g, t, 1.5) || containsBox(t, g, 1.5)) continue;
          out.textGeom.push({ t: t.content.slice(0, 18), tCls: t.cls, g: g.cls, area: +area.toFixed(1), x: Math.round(Math.max(t.x, g.x)), y: Math.round(Math.max(t.y, g.y)), tx: Math.round(t.x), ty: Math.round(t.y), tw: Math.round(t.width), th: Math.round(t.height), gx: Math.round(g.x), gy: Math.round(g.y), gw: Math.round(g.width), gh: Math.round(g.height) });
        }
      }
    }
    out.svgs += 1;
    out.texts += texts.length;
    out.geoms += geoms.length;
  }
  out.textText.sort((a, b) => b.area - a.area);
  out.textGeom.sort((a, b) => b.area - a.area);
  return out;
};

const SEED = () => {
  const pin = document.querySelector('.jt-pin .jt-plan');
  const full = pin ? pin.getAttribute('viewBox') : null;
  if (!full) return false;
  const saved = { viewBox: full, camStage: pin.getAttribute('data-camera-stage') };
  try {
    pin.setAttribute('viewBox', '0 0 1200 760');
    const wrap = pin.closest('.jt-pin');
    if (wrap) {
      const cam = wrap.querySelector('.jt-cam');
      if (cam) cam.style.display = 'none';
      const stage = wrap.querySelector('.jt-stages');
      if (stage) stage.style.display = 'none';
    }
    pin.setAttribute('data-svg-probe-seeded', JSON.stringify(saved));
    return true;
  } catch { return false; }
};
const RESTORE = () => {
  const pin = document.querySelector('.jt-pin .jt-plan');
  if (!pin) return;
  try {
    const saved = JSON.parse(pin.getAttribute('data-svg-probe-seeded') || 'null');
    if (saved) {
      pin.setAttribute('viewBox', saved.viewBox);
      const wrap = pin.closest('.jt-pin');
      if (wrap) {
        const cam = wrap.querySelector('.jt-cam');
        if (cam) cam.style.display = '';
        const stage = wrap.querySelector('.jt-stages');
        if (stage) stage.style.display = '';
      }
    }
  } catch { /* noop */ }
  pin.removeAttribute('data-svg-probe-seeded');
};

let vite = null;
const baseUrl = opt.baseUrl || `http://127.0.0.1:${opt.port}`;
if (!opt.baseUrl) {
  vite = spawnVite(opt.port);
  if (!(await waitReady(baseUrl))) { console.error('vite not up'); killTree(vite); process.exit(2); }
}
const browser = await chromium.launch();
try {
  for (const vp of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const touch = vp.width <= 920;
    const ctx = await browser.newContext({
      viewport: vp,
      ...(touch ? { hasTouch: true, isMobile: true } : {}),
      reducedMotion: 'reduce',
      locale: 'ar',
    });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* storage off */ } });
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => { await page.waitForTimeout(1500); });
    await page.waitForTimeout(1000);
    await page.waitForSelector('.jt', { timeout: 6000 }).catch(() => null);
    await page.waitForTimeout(700);
    const r1 = await page.evaluate(COLLECT);
    const seeded = await page.evaluate(SEED);
    let r2 = null;
    if (seeded) { await page.waitForTimeout(150); r2 = await page.evaluate(COLLECT); await page.evaluate(RESTORE); }
    const seen = new Set();
    const tt = [...r1.textText, ...(r2 ? r2.textText : [])].filter((v) => { const k = `${v.a}|${v.b}|${v.x},${v.y}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const seenG = new Set();
    const tg = [...r1.textGeom, ...(r2 ? r2.textGeom : [])].filter((v) => { const k = `${v.t}|${v.g}|${v.x},${v.y}`; if (seenG.has(k)) return false; seenG.add(k); return true; });
    console.log(`\n═══ ${vp.width}×${vp.height} — text×text ${tt.length} · text×geom ${tg.length} ═══`);
    for (const v of tt) console.log(`  T×T «${v.a}»(x=${v.ax},y=${v.ay},w=${v.aw},h=${v.ah}) × «${v.b}»(y=${v.by},h=${v.bh}) — ${v.area}px²`);
    for (const v of tg) console.log(`  T×G «${v.t}»(x=${v.tx},y=${v.ty},w=${v.tw},h=${v.th}) × ${v.g}(x=${v.gx},y=${v.gy},w=${v.gw},h=${v.gh}) — ${v.area}px²`);
    await ctx.close();
  }
} finally {
  await browser.close();
  if (vite) killTree(vite);
}
