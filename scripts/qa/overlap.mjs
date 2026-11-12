#!/usr/bin/env node
// scripts/qa/overlap.mjs — visual-defect detector. Usage:
//   node scripts/qa/overlap.mjs --url http://localhost:4173 --routes / --bps 1440x900,390x844 --themes light,dark --out /tmp/r346/overlap.json
//   Authed routes: --storage /tmp/state.json (a Playwright storageState — see
//   frontend/tests/e2e/fixtures/auth-storage.ts; R349 P5: the people surfaces).
//   Evidence shots: --shots /tmp/dir (one PNG per route×bp×theme at the top stop).
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
//
// R347-Z — the SECOND sanctioned adjustment (same clause): CLIP-AWARE text
// rects. A text rect now counts only where it is actually PAINTED —
// intersected with every ancestor that clips (overflow ≠ visible OR
// contain:paint). The landing's journey stack drifts one frame above its
// contain:paint window before the walkthrough descends; the layout rects
// still exist there but nothing paints — the first pass reported ~250
// phantom text-on-text findings (pains × plan) at scrolls where the plan
// was clipped out entirely. Same fix Lane D shipped for the app variant.
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
const storage = a.storage || null;   /* R349 P5 — Playwright storageState for authed routes */
const shotsDir = a.shots || null;    /* R349 P5 — evidence PNGs (route at top per bp×theme) */
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
  /* R347-Z — clip a rect to every ancestor that clips painting
   * (overflow ≠ visible, or contain:paint). Returns null when nothing
   * survives — the rect is not painted at all (phantom). */
  const clipToAncestors = (el, b) => {
    let r = { x: b.left, y: b.top, w: b.width, h: b.height };
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.overflow !== 'visible' || s.overflowY !== 'visible' || (s.contain && s.contain.includes('paint'))) {
        const eb = e.getBoundingClientRect();
        const x0 = Math.max(r.x, eb.left), y0 = Math.max(r.y, eb.top);
        const x1 = Math.min(r.x + r.w, eb.right), y1 = Math.min(r.y + r.h, eb.bottom);
        if (x1 - x0 < 1 || y1 - y0 < 1) return null;
        r = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
    }
    return r;
  };
  const tn = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    if (eff(el) < 0.08) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const b of r.getClientRects()) { if (b.width < 4 || b.height < 6) continue; if (b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) continue; const c = clipToAncestors(el, b); if (!c || c.w < 4 || c.h < 6) continue;
      /* R347-Z — viewport clip: only the part INSIDE the viewport counts
       * (two elements both in the invisible strip above the fold once
       * phantom-overlapped — the parked skip link vs a half-scrolled
       * roles title).
       *
       * Lane B's svg-crop case is subsumed by clipToAncestors: an inline
       * <svg> computes overflow:hidden (verified live on .jt-plan), so
       * svg text rects clip to the svg's element box (the viewBox crop) —
       * out-of-crop labels' rects park on neighbouring content and the
       * detector counted them (phantom pairs at 768/390, straddling
       * included); the ancestor walk clips them away. */
      const vx = Math.max(c.x, 0), vy = Math.max(c.y, 0), vx1 = Math.min(c.x + c.w, vw), vy1 = Math.min(c.y + c.h, vh);
      /* R347-Z v2 — the edge-sliver minimum is 8px (the appendix's own
       * 6px sub-fragment floor, raised one step): a rect contributing
       * less than 8px inside the viewport is an unreadable edge sliver,
       * and its only possible "overlap" is the font-box overhang the
       * ink never touches (the statement's flush lh-1.35 lines measured
       * a 3px Range-box overlap at a 7px top-edge sliver — the ink gap
       * was 1px). Real collisions show at full visibility. */
      if (vx1 - vx < 4 || vy1 - vy < 8) continue;
      tn.push({ el, x: vx, y: vy, w: vx1 - vx, h: vy1 - vy, t: n.textContent.trim().slice(0, 28) }); }
  }
  const inter = (p, q) => { const x = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), y = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y); return x > 0 && y > 0 ? x * y : 0; };
  /* R347-Z — OCCLUSION-AWARENESS: text under an OPAQUE element does
   * not paint (the eye sees the card, not the text beneath it). For
   * each text element we find the nearest ancestor with an opaque
   * background (alpha > 0.9) that is positioned/transformed — a real
   * paint layer. A pair is skipped when one side's cover-box contains
   * the other text's centre AND the cover paints above it (the cover
   * FOLLOWS the covered text in document order — later positioned
   * boxes paint over earlier siblings at the same stacking level).
   * This killed the phantom «12.3M» under the intro card's paper
   * ground and the grid letters under the counter chip's paper seat. */
  const bgAlpha = (c) => { if (!c || c === 'transparent') return 0; const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(',').map(v => parseFloat(v)); return p.length > 3 ? p[3] : 1; };
  const coverCache = new Map();
  const coverOf = (el) => {
    if (coverCache.has(el)) return coverCache.get(el);
    let cover = null;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (bgAlpha(s.backgroundColor) > 0.9 && (s.position !== 'static' || s.transform !== 'none')) { cover = e; break; }
    }
    const rec = cover ? { el: cover, r: cover.getBoundingClientRect(), after: new Map() } : null;
    coverCache.set(el, rec);
    return rec;
  };
  const occludes = (p, q) => {
    const c = coverOf(p.el); if (!c || c.el.contains(q.el)) return false;
    let after = c.after.get(q.el);
    if (after === undefined) { after = !!(c.el.compareDocumentPosition(q.el) & Node.DOCUMENT_POSITION_PRECEDING); c.after.set(q.el, after); }
    if (!after) return false;
    /* p∩q lies inside p's box, and p's box must lie inside its opaque
     * cover (p does not overflow its card) — then the overlap itself is
     * under the card (a room label sliding under the counter chip's
     * paper seat: the label's visible part clears the chip's text). */
    const px = p.x, py = p.y, px1 = p.x + p.w, py1 = p.y + p.h, r = c.r;
    return px >= r.left && px1 <= r.right && py >= r.top && py1 <= r.bottom;
  };
  /* R347-Z — LAYOUT-BLOCK DISJOINTNESS: a Range rect carries the
   * FONT's bounding box (Arabic mark allowances ≈ 1.4em), so tightly
   * pitched consecutive lines can report rect overlap where the INK
   * never touches (the statement's lh-1.35 lines measured flush boxes
   * with 6px of font-box overhang). When the two texts live in
   * DIFFERENT layout blocks and those blocks do not overlap, the
   * rects' overlap is font-box overhang across a clean layout — not
   * text printed on text. Blocks that DO overlap (absolute overlays,
   * the pinned layers) keep their findings. */
  const blkCache = new Map();
  const blkOf = (el) => {
    if (blkCache.has(el)) return blkCache.get(el);
    let b = null;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const d = getComputedStyle(e).display;
      if (d === 'block' || d === 'flow-root' || d === 'flex' || d === 'grid' || d === 'table-cell') { b = e; break; }
    }
    blkCache.set(el, b);
    return b;
  };
  const blkRectCache = new Map();
  const blkRect = (b) => {
    if (!b) return null;
    if (!blkRectCache.has(b)) blkRectCache.set(b, b.getBoundingClientRect());
    return blkRectCache.get(b);
  };
  for (let i = 0; i < tn.length; i++) for (let j = i + 1; j < tn.length; j++) {
    const p = tn[i], q = tn[j]; if (p.el === q.el || p.el.contains(q.el) || q.el.contains(p.el)) continue;
    if (occludes(p, q) || occludes(q, p)) continue;
    const bp = blkOf(p.el), bq = blkOf(q.el);
    if (bp && bq && bp !== bq) {
      const r1 = blkRect(bp), r2 = blkRect(bq);
      const ovY = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
      const ovX = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
      if (ovY <= 0 || ovX <= 0) continue;
    }
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
    const bRaw = el.getBoundingClientRect(); if (bRaw.width < 20 || bRaw.height < 12 || bRaw.width * bRaw.height > 0.2 * vw * vh || !el.textContent.trim()) continue;
    /* R347-Z — the visible part only: clamp to the viewport (a parked
     * off-screen fixed element covers nothing the eye can see). */
    const bx = Math.max(bRaw.left, 0), by = Math.max(bRaw.top, 0), bx1 = Math.min(bRaw.right, vw), by1 = Math.min(bRaw.bottom, vh);
    if (bx1 - bx < 20 || by1 - by < 12) continue;
    const b = { left: bx, top: by, right: bx1, bottom: by1, width: bx1 - bx, height: by1 - by };
    for (const p of tn) { if (el.contains(p.el)) continue; if (inter({ x: b.left, y: b.top, w: b.width, h: b.height }, p) / (p.w * p.h) > 0.3) res.fixedText.push({ fixed: sel(el), under: sel(p.el), t: p.t }); }
  }
  for (const p of tn) { const e = p.el, s = getComputedStyle(e); if ((s.overflow !== 'visible') && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis' && e.clientWidth > 0) res.clipped.push({ el: sel(e), t: p.t }); }
  res.hoverflow = Math.max(0, document.documentElement.scrollWidth - vw);
  return res;
};
const run = async () => {
  const br = await chromium.launch({executablePath: process.env.CHROME_BIN}); const all = [];
  const st = storage ? JSON.parse(fs.readFileSync(storage, 'utf8')) : undefined;
  for (const [w, h] of bps) for (const th of themes) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, ...(st ? { storageState: st } : {}) });
    await ctx.addInitScript(m => { try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: m }, version: 2 })); } catch {} }, th);
    for (const r of routes) {
      const p = await ctx.newPage(); await p.goto(url + r, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
      /* R347-Z — wait for the landing's intro gate to settle: the
       * preloader's mono percentage counter + its clip-path wipe overlay
       * print over content mid-exit, and on a cold dev server the gate
       * outlives the initial wait (CI measured the counter's final
       * «100» over a statement word at the second stop). The sweep
       * measures the SETTLED page — bounded 12s, 250ms polls, and
       * routes without the gate proceed immediately. */
      await p.waitForFunction(() => { const l = document.querySelector('.landing'); return !l || l.classList.contains('intro-done'); }, { timeout: 12000, polling: 250 }).catch(() => {});
      /* R349 P5 — authed routes fetch their data AFTER mount (react-query);
       * a cold dev-server compile can outlive networkidle. Settle once
       * more before the evidence shot so it shows DATA, not the first
       * pending frame (the first P5 run shot the directory's skeleton). */
      await p.waitForTimeout(2500);
      if (shotsDir) {
        fs.mkdirSync(shotsDir, { recursive: true });
        const slug = r.split('?')[0].split('/').filter(Boolean).join('-') || 'root';
        await p.screenshot({ path: `${shotsDir}/${slug}-${w}x${h}-${th}.png`, fullPage: false }).catch(() => {});
      }
      await p.waitForTimeout(400);
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
