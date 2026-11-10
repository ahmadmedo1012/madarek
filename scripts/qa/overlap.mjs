#!/usr/bin/env node
// scripts/qa/overlap.mjs — visual-defect detector. Usage:
//   node scripts/qa/overlap.mjs --url http://localhost:4173 --routes / --bps 1440x900,390x844 --themes light,dark --out /tmp/r346/overlap.json
// Finds, at every scroll stop: (1) TEXT-ON-TEXT overlaps, (2) text overlapping non-text media/plates,
// (3) fixed/sticky elements covering > 6% of the viewport, (4) clipped text, (5) horizontal page overflow.
//
// R347 Lane A — the ONE sanctioned adjustment to the appendix script (per its
// own clause "adjust only if it fails on a real page"): the big-fixed sweep
// flagged div.sheet-frame — the page's intentional 1px drafting frame — at
// every stop. The allowlist ledger (scripts/qa/overlap-allow.json, ≤10
// entries, each with a WRITTEN reason) now filters `fixed` findings whose
// element selector matches an entry. Nothing else is filtered; text-on-text,
// fixed-over-text, clipped and overflow findings are never allowlisted.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const a = Object.fromEntries(process.argv.slice(2).reduce((m, v, i, r) => (v.startsWith('--') ? m.push([v.slice(2), r[i + 1]]) : 0, m), []));
const url = a.url || 'http://localhost:4173';
const routes = (a.routes || '/').split(',');
const bps = (a.bps || '1440x900,390x844').split(',').map(s => s.split('x').map(Number));
const themes = (a.themes || 'light,dark').split(',');
const out = a.out || '/tmp/r346/overlap.json';
const MIN_FRAC = Number(a.minfrac || 0.2);
const MEDIA = a.media === '1';          // overlap area / smaller rect area
/* the intentional-layering ledger (entries: {match, reason}) */
const ALLOW_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'overlap-allow.json');
let ALLOW = [];
try { ALLOW = (JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')).entries || []).map(e => e.match); } catch { ALLOW = []; }
const allowed = (sel) => ALLOW.some(m => typeof m === 'string' && m && sel.startsWith(m));
const PROBE = () => {
  const MEDIA = __MEDIA__;
  const vw = innerWidth, vh = innerHeight, res = { text: [], media: [], fixed: [], clipped: [], hoverflow: 0 };
  const vis = el => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0.08; };
  const eff = el => { let o = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return 0; o *= parseFloat(s.opacity); } return o; };
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const tn = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    if (eff(el) < 0.08) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const b of r.getClientRects()) { if (b.width < 4 || b.height < 6) continue; if (b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) continue; tn.push({ el, x: b.left, y: b.top, w: b.width, h: b.height, t: n.textContent.trim().slice(0, 28) }); }
  }
  const inter = (p, q) => { const x = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), y = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y); return x > 0 && y > 0 ? x * y : 0; };
  for (let i = 0; i < tn.length; i++) for (let j = i + 1; j < tn.length; j++) {
    const p = tn[i], q = tn[j]; if (p.el === q.el || p.el.contains(q.el) || q.el.contains(p.el)) continue;
    const ar = inter(p, q); if (!ar) continue; const f = ar / Math.min(p.w * p.h, q.w * q.h);
    if (f >= MIN) res.text.push({ a: sel(p.el), b: sel(q.el), ta: p.t, tb: q.t, frac: +f.toFixed(2), at: [Math.round(p.x), Math.round(p.y)] });
  }
  for (const el of (MEDIA ? document.querySelectorAll('img,svg,canvas,video,picture') : [])) {
    if (!vis(el) || eff(el) < 0.3) continue; const b = el.getBoundingClientRect(); if (b.width < 60 || b.height < 40) continue;
    for (const p of tn) { if (el.contains(p.el) || p.el.contains(el)) continue; const ar = inter({ x: b.left, y: b.top, w: b.width, h: b.height }, p); if (ar / (p.w * p.h) > 0.6 && getComputedStyle(el).position !== 'static' || ar / (p.w * p.h) > 0.9) res.media.push({ media: sel(el), text: p.t, from: sel(p.el) }); }
  }
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el); if (!(s.position === 'fixed' || s.position === 'sticky') || !vis(el)) continue;
    const b = el.getBoundingClientRect(); const ar = Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0)) * Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0)); const fr = ar / (vw * vh);
    if (fr > 0.06 && !/^(HTML|BODY)$/.test(el.tagName) && b.width < vw * 0.98) res.fixed.push({ el: sel(el), frac: +fr.toFixed(3), rect: [b.left, b.top, b.width, b.height].map(Math.round) });
  }
  res.fixedText = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el); if (!(s.position === 'fixed' || s.position === 'sticky') || !vis(el)) continue;
    const b = el.getBoundingClientRect(); if (b.width < 20 || b.height < 12 || b.width * b.height > 0.2 * vw * vh || !el.textContent.trim()) continue;
    for (const p of tn) { if (el.contains(p.el)) continue; if (inter({ x: b.left, y: b.top, w: b.width, h: b.height }, p) / (p.w * p.h) > 0.3) res.fixedText.push({ fixed: sel(el), under: sel(p.el), t: p.t }); }
  }
  for (const p of tn) { const e = p.el, s = getComputedStyle(e); if ((s.overflow !== 'visible') && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis' && e.clientWidth > 0) res.clipped.push({ el: sel(e), t: p.t }); }
  res.hoverflow = Math.max(0, document.documentElement.scrollWidth - vw);
  return res;
};
const run = async () => {
  const br = await chromium.launch({executablePath: process.env.CHROME_BIN}); const all = [];
  for (const [w, h] of bps) for (const th of themes) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(m => { try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: m }, version: 2 })); } catch {} }, th);
    for (const r of routes) {
      const p = await ctx.newPage(); await p.goto(url + r, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0, i = 0; y < H; y += Math.round(h * 0.6), i++) {
        await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(700);
        const res = await p.evaluate(`(${PROBE.toString().replace('MIN', MIN_FRAC).replace('__MEDIA__', MEDIA)})()`);
        if (ALLOW.length) res.fixed = res.fixed.filter(f => !allowed(f.el));
        const n = res.fixedText.length + res.text.length + res.media.length + res.fixed.length + res.clipped.length + (res.hoverflow > 1 ? 1 : 0);
        if (n) all.push({ route: r, bp: `${w}x${h}`, theme: th, scrollY: y, ...res });
      }
      await p.close();
    }
    await ctx.close();
  }
  await br.close(); fs.mkdirSync(out.replace(/[^/]+$/, '') || '.', { recursive: true }); fs.writeFileSync(out, JSON.stringify(all, null, 1));
  const tot = k => all.reduce((s, c) => s + (Array.isArray(c[k]) ? c[k].length : +(c[k] > 1)), 0);
  console.log(`stops-with-defects=${all.length} fixed-over-text=${tot('fixedText')} text-on-text=${tot('text')} text-on-media=${tot('media')} big-fixed=${tot('fixed')} clipped=${tot('clipped')} hoverflow=${tot('hoverflow')}`);
  process.exit(tot('fixedText') + tot('text') + tot('media') + tot('fixed') + tot('clipped') + tot('hoverflow') ? 1 : 0);
};
run();
