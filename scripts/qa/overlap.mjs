#!/usr/bin/env node
// scripts/qa/overlap.mjs — visual-defect detector. Usage:
//   node scripts/qa/overlap.mjs --url http://localhost:4173 --routes / --bps 1440x900,390x844 --themes light,dark --out /tmp/r346/overlap.json
//   Authed routes: --storage /tmp/state.json (a Playwright storageState — see
//   frontend/tests/e2e/fixtures/auth-storage.ts; R349 P5: the people surfaces).
//   R353 P1 — hermetic per-role crawl: --seed student|teacher|registrar|quality|owner
//   bundles frontend/tests/e2e/fixtures/mock-transport.ts (esbuild), installs the
//   mock API + seeds that role's session in every context (the pages-*.mjs
//   harness method) — no backend needed; the role's /auth/me override keeps
//   role guards honest. --routes then accepts that role's authed paths.
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
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const a = Object.fromEntries(process.argv.slice(2).reduce((m, v, i, r) => (v.startsWith('--') ? m.push([v.slice(2), r[i + 1]]) : 0, m), []));
const url = a.url || 'http://localhost:4173';
const routes = (a.routes || '/').split(',');
const bps = (a.bps || '1440x900,390x844').split(',').map(s => s.split('x').map(Number));
const themes = (a.themes || 'light,dark').split(',');
const out = a.out || '/tmp/r346/overlap.json';
const storage = a.storage || null;   /* R349 P5 — Playwright storageState for authed routes */
const stress = a.stress === '1' || a.stress === 'true';  /* R354-UI-2 — hostile content pass (see STRESS below) */
const fontScale = Number(a.fontscale || 0);              /* R354-UI-2 — 1.3 / 2 => html font-size 130% / 200% */
const seedRole = a.seed || null;      /* R353 P1 — hermetic per-role session (mock API) */
const shotsDir = a.shots || null;    /* R349 P5 — evidence PNGs (route at top per bp×theme) */
/* R366 L1 (agent 4) — the blind-spot extensions. All opt-in, defaults
 * keep the historical behavior byte-identical:
 *   --workers N   route-level parallelism inside each bp×theme context
 *                 (findings interleave; the verdict math is unchanged)
 *   --popovers 1  open every disclosure surface (closed <details>
 *                 summaries, [aria-haspopup] triggers, [popovertarget])
 *                 and probe the top stop WITH them open before the
 *                 normal sweep (the bell panel, menus, disclosure
 *                 sheets — geometry nobody swept before)
 *   --focus N     Tab through the first N focusables; a focused
 *                 element whose rect leaves the viewport is a
 *                 focus-clip finding (focus rings half-cut by shell
 *                 edges / sticky bars)
 *   --contrast more | --reducedmotion reduce  context emulations
 *                 (prefers-contrast: more / prefers-reduced-motion) */
const workers = Math.max(1, Number(a.workers || 1));
const popovers = a.popovers === '1' || a.popovers === 'true';
const focusN = Number(a.focus || 0);
const contrast = a.contrast === 'more' || a.contrast === 'less' || a.contrast === 'forced' ? a.contrast : undefined;
const reducedMotion = a.reducedmotion === 'reduce' ? 'reduce' : undefined;
const MIN_FRAC = Number(a.minfrac || 0.2);
const MEDIA = a.media === '1';          // overlap area / smaller rect area
/* the intentional-layering ledger (entries: {match, reason}); a match may
 * list sibling selectors with '|' (R369 C2: twin-frame consolidation holds
 * the ≤10 cap) — semantics unchanged, still prefix-matches only big-fixed */
const ALLOW_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'overlap-allow.json');
let ALLOW = [];
try { ALLOW = (JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf8')).entries || []).map(e => e.match); } catch { ALLOW = []; }
const allowed = (sel) => ALLOW.some(m => typeof m === 'string' && m && m.split('|').some(p => sel.startsWith(p)));
/* ── R354-UI-2 · STRESS — hostile content, applied in-page before the
 * probe. A clean mock crawl only proves the happy path; the owner's
 * complaints are the real-world shapes (long Arabic names, unbroken
 * emails, 100-row tables, 99+ badges, a 200% zoom). Nothing here
 * changes React state — it mutates rendered text/rows/images so the
 * EXISTING detectors meet realistic content. */
const STRESS = (scale) => {
  const AR = 'الطلبة المسجّلون في برنامج الهندسة البرمجية للفصل الدراسي';
  const LONG = 'ahmed.abdulrahman.almansouri@university-of-benghazi.edu.ly';
  const DIGITS = '١٢٣٤٥٦٧٨٩'; /* Arabic-Indic */
  /* The landing is a FROZEN conformance surface: its labels live inside
     measured absolute seats, so lengthening them only fabricates overlaps
     the art direction cannot absorb. Its data/rows/images still get
     stressed; its type does not. */
  const landing = !!document.querySelector('.landing');
  let i = 0;
  const walker = landing ? null : document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const w = walker ?? { nextNode: () => null };
  for (let n; (n = w.nextNode());) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    const t = n.textContent.trim();
    if (/^\s*[\d١٢٣٤٥٦٧٨٩.,%$\/:-]+\s*$/.test(t)) continue; /* numeric cells: leave the numbers alone */
    /* r366: authored control labels are TYPE, not data — the same class
     * as the landing exemption above. A «حذف»/«حفظ» verb is a compile-time
     * constant; lengthening it fabricates clipping no real datum could
     * produce (hostile data lands in cells, links and row bodies — those
     * keep getting stressed). Short labels only: a row-button CARRYING
     * data (a person's name, a file title) is long enough to stay in. */
    if (t.length <= 16 && el.closest('button, [role="button"], .btn, .search-tip-pill, .pill')) continue;
    i += 1;
    if (i % 5 === 0) n.textContent = `${t} ${AR.slice(0, 34)} — ${AR}`;
    else if (i % 7 === 0) n.textContent = `${t} ${LONG}`;
    else if (i % 11 === 0) n.textContent = `${t} ${DIGITS}`;
    else if (el.matches('h1,h2,h3,.pf-page-title,.topbar-title')) n.textContent = `${t} ${AR}`;
  }
  /* 100+ rows: clone the last row of every table and the last few list rows */
  for (const tb of document.querySelectorAll('tbody')) {
    const rows = tb.querySelectorAll('tr'); if (!rows.length) continue;
    const last = rows[rows.length - 1];
    for (let k = 0; k < 100; k++) tb.appendChild(last.cloneNode(true));
  }
  for (const list of document.querySelectorAll('ul,ol,[role="list"]')) {
    const items = list.querySelectorAll(':scope > li, :scope > [role="listitem"]');
    if (!items.length || items.length > 60) continue;
    const last = items[items.length - 1];
    for (let k = 0; k < 20; k++) list.appendChild(last.cloneNode(true));
  }
  /* broken media + a monstrous avatar */
  document.querySelectorAll('img').forEach((img, k) => {
    if (k % 3 === 0) img.src = '/__stress-missing.png';
    if (k % 9 === 0) { img.style.inlineSize = '320px'; img.style.blockSize = '320px'; }
  });
  /* 99+ badges on every unread chip — LEAF text only (a container whose
     textContent is replaced loses its children and manufactures layout
     damage that no real data could): short, childless, chip-shaped. */
  document.querySelectorAll('[class*="badge"],[class*="count"],[class*="unread"]').forEach((el) => {
    if (el.children.length || el.matches('input,textarea')) return;
    const t = el.textContent.trim();
    if (!t || t.length > 6) return;
    el.textContent = '99+';
  });
  if (scale > 0) document.documentElement.style.fontSize = `${scale * 100}%`;
  window.dispatchEvent(new Event('resize'));
};

const PROBE = () => {
  const MEDIA = __MEDIA__;
  const vw = innerWidth, vh = innerHeight, res = { text: [], media: [], fixed: [], clipped: [], hoverflow: 0 };
  /* R353 P1 — OCCLUSION: a text rect genuinely COVERED by an opaque
   * higher-layer element is invisible to the eye, not a defect. The
   * sticky/fixed header bars now carry opaque backgrounds (the 82%
   * translucent bleed-through was fixed in patterns.css); the geometry
   * probe must respect that or every scrolled-under-header paragraph
   * reads as an overlap. opaqueBar(el): the nearest sticky/fixed
   * ancestor with a solid background that owns the space. */
  const opaqueBar = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const st = getComputedStyle(e); if (st.position === 'fixed' || st.position === 'sticky') { const bg = st.backgroundColor; if (bg && !/rgba\([^)]*,\s*0\)|transparent/.test(bg)) return e; } } return null; };
  const coveredBy = (a, b) => { const barA = opaqueBar(a), barB = opaqueBar(b); if (barA && barA === barB) return false; const bar = barA || barB; if (!bar) return false; const other = barA ? b : a; if (bar.contains(other) || other.contains(bar)) return false; const r = bar.getBoundingClientRect(), o = other.getBoundingClientRect(); const ix = Math.max(0, Math.min(r.right, o.right) - Math.max(r.left, o.left)), iy = Math.max(0, Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top)); return ix * iy > 0; }; /* R353 P1: ANY intersection with an opaque bar = hidden or boundary-straddle (the universal scroll-under-header reality); the defect class this check guards — text showing THROUGH an overlay — requires a translucent bar, which the patterns now forbid */

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
    /* R353 P1b — sr-only/visually-hidden never paint (deliberate a11y
     * hiding, the same law the clipped check enforces): a fixed element
     * "covering" an sr-only rect is a phantom pair (fb-fab over the
     * exams count on /student/exams, 1024x768). Excluded from the text
     * rect set entirely. */
    if (el.classList.contains('sr-only') || el.classList.contains('visually-hidden')) continue;
    /* R353 P1b — a CLOSED <details> paints nothing: the UA hides the
     * slot content (::details-content content-visibility) but the layout
     * rects survive getClientRects — collapsed FAQ answers park their
     * phantom rects on the question headings (1266 phantom pairs on
     * /help alone in the first full-width crawl). The <summary> itself
     * stays painted. Same family as .sr-only/occlusion: deliberate
     * hiding, never a defect. */
    const dt = el.closest('details');
    if (dt && !dt.open && !el.closest('summary')) continue;
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
    if (coveredBy(p.el, q.el)) continue;
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
    for (const p of tn) { if (el.contains(p.el)) continue; if (inter({ x: b.left, y: b.top, w: b.width, h: b.height }, p) / (p.w * p.h) > 0.3) { if (coveredBy(el, p.el)) continue; res.fixedText.push({ fixed: sel(el), under: sel(p.el), t: p.t }); } }
  }
  for (const p of tn) { const e = p.el, s = getComputedStyle(e); if (e.classList.contains('sr-only') || e.classList.contains('visually-hidden')) continue; /* R353 P1 — sr-only/visually-hidden are deliberate a11y hiding (the clip IS the technique), never a clipped defect — the visually-hidden twin found on /student/colleges' landmark helpers (32 phantom clips) */ if ((s.overflow !== 'visible') && e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== 'ellipsis' && e.clientWidth > 0) res.clipped.push({ el: sel(e), t: p.t }); }
  res.hoverflow = Math.max(0, document.documentElement.scrollWidth - vw);
  /* R354-UI-2 — WHICH element overflows: when the document grows past the
   * viewport, name the widest in-flow offenders (clipped by vw, top 6), so
   * a finding is actionable without a second debugging pass. Ignore
   * pointer decorations and parked off-screen chrome (cursor readouts). */
  res.overflowEls = [];
  if (res.hoverflow > 1) {
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      if (s.position === 'fixed' || s.visibility === 'hidden' || s.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      /* RTL overflows to the LEFT: the document starts scrolled to the
       * inline start, so the offender's rect sits at negative x, not past
       * the viewport's right edge. Both sides count. */
      if (r.right <= vw + 1 && r.left >= -1) continue;
      res.overflowEls.push({ el: sel(el), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), of: s.overflowX });
    }
    res.overflowEls.sort((a, b) => b.w - a.w);
    res.overflowEls = res.overflowEls.slice(0, 6);
  }
  return res;
};
/* ── R353 P1 — the hermetic per-role seed (the pages-*.mjs method) ── */
const SEED_USERS = { student: 'STUDENT_USER', teacher: 'TEACHER_USER', registrar: 'ADMIN_USER', quality: 'QUALITY_USER', owner: 'OWNER_USER' };
let seedInstall = null; /* { ctx(c, theme), me(p) } — mock API + session + per-page /auth/me */
if (seedRole) {
  if (!SEED_USERS[seedRole]) { console.error(`--seed: unknown role '${seedRole}' (student|teacher|registrar|quality|owner)`); process.exit(2); }
  const require_ = (await import('node:module')).createRequire(import.meta.url);
  const esbuild = require_('esbuild');
  const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/tests/e2e/fixtures');
  const sources = ['mock-transport.ts', 'api-fixtures.ts'].map((f) => path.join(srcDir, f));
  const stdinContents = `export { installMockApi, seedSession, standardRoutes } from ${JSON.stringify(sources[0])}; export { STUDENT_USER, TEACHER_USER, ADMIN_USER, QUALITY_USER, OWNER_USER, meProfile } from ${JSON.stringify(sources[1])};`;
  const hash = crypto.createHash('sha1').update(stdinContents + sources.map((f) => fs.readFileSync(f)).join('')).digest('hex').slice(0, 12);
  const dir = path.join(os.tmpdir(), `r353-overlap-seed-${hash}`);
  const out = path.join(dir, 'transport.mjs');
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
    fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
    esbuild.buildSync({
      stdin: { contents: stdinContents, resolveDir: srcDir, loader: 'ts' },
      bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent',
    });
  }
  const T = await import(`${pathToFileURL(out).href}?v=${hash}`);
  const user = T[SEED_USERS[seedRole]];
  /* the per-role /auth/me override keeps role guards honest (the pages-*.mjs
   * meJson precedent — installMockApi answers /auth/me for the bare session
   * user, which carries no institution context; a PAGE-level route overrides
   * it with the enriched profile). */
  const roleExtras = {
    teacher: { teacherProfile: { position: null, facultyId: 'fac_e2e_eng', departmentId: 'dep_e2e_cs', faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' }, department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' } }, studentProfile: null },
    registrar: { scopeFaculty: null, staffRole: 'REGISTRAR_GENERAL' },
    quality: { staffRole: 'EXAMS_CONTROLLER' },
    owner: {},
    student: {},
  };
  const seededUser = { ...user, memberships: [], currentInstitution: { id: 'inst_e2e_zu', name: 'مؤسسة مدارك النموذجية', nameEn: 'Madarek Model Institution', slug: 'zu' }, membershipRole: user.role };
  seedInstall = {
    ctx: async (c, theme) => {
      await T.installMockApi(c, { sessionUser: user });
      await T.seedSession(c, seededUser, { token: `e2e-token-${seedRole}`, theme: theme === 'dark' ? 'dark' : undefined });
    },
    /* applied per PAGE (page.route outranks the context route) */
    me: async (p) => {
      await p.route('**/auth/me', async (route) => {
        if (route.request().method().toUpperCase() !== 'GET') { await route.fallback(); return; }
        await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ data: { ...T.meProfile(user), memberships: [], currentInstitution: seededUser.currentInstitution, membershipRole: user.role, ...roleExtras[seedRole] } }) });
      });
    },
  };
}

/* R366 L1 — the popover-opening pass: click every closed disclosure
 * (details>summary), [aria-haspopup] trigger and [popovertarget]
 * button that is NOT a link (no navigation), waiting briefly between
 * clicks so anchored layers land. Returns the list of triggers that
 * opened something (for the finding rows). */
const OPEN_POPOVERS = async () => {
  const opened = [];
  const cands = Array.from(document.querySelectorAll('details:not([open]) > summary, [aria-haspopup], [popovertarget]'))
    .filter((el) => {
      if (el.tagName === 'A' || el.closest('a')) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return false;
      const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none';
    })
    .slice(0, 12);
  for (const el of cands) {
    try { el.click(); } catch { continue; }
    await new Promise((r2) => setTimeout(r2, 220));
    opened.push(el.tagName.toLowerCase() + (el.getAttribute('aria-label') ? `[aria-label="${el.getAttribute('aria-label')}"]` : ''));
  }
  return opened;
};

/* R366 L1 — the focus probe: Tab through the first N focusables; the
 * focused element's rect must sit fully inside the viewport (a focus
 * ring half-cut by the shell edge is a real keyboard-trap-adjacent
 * defect). Returns findings [{el, rect}] for rects that leave the
 * viewport. Focus moves forward via sequential Tab presses on the
 * body — the app's own tab order decides where the ring lands. */
async function focusProbe(p, n) {
  const findings = [];
  await p.evaluate(() => { const f = document.querySelector('.skip-link, a, button'); if (f && f.focus) f.focus(); });
  for (let i = 0; i < n; i++) {
    await p.keyboard.press('Tab');
    await p.waitForTimeout(60);
    const f = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return null;
      const out = r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5;
      if (!out) return null;
      return { el: el.tagName.toLowerCase() + '.' + String(el.className).split(/\s+/).slice(0, 2).join('.'), rect: [r.left, r.top, r.right, r.bottom].map(Math.round) };
    }).catch(() => null);
    if (f) findings.push(f);
  }
  return findings;
}

const run = async () => {
  const br = await chromium.launch({executablePath: process.env.CHROME_BIN}); const all = [];
  const st = storage ? JSON.parse(fs.readFileSync(storage, 'utf8')) : undefined;
  for (const [w, h] of bps) for (const th of themes) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, ...(st ? { storageState: st } : {}), ...(contrast ? { contrast } : {}), ...(reducedMotion ? { reducedMotion } : {}) });
    if (seedInstall) { await seedInstall.ctx(ctx, th); }
    await ctx.addInitScript(m => { try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: m }, version: 2 })); } catch {} }, th);
    /* R366 L1 — the per-route crawl, optionally N routes at a time.
     * Workers share the bp×theme CONTEXT (the mock transport + theme
     * seed are context-scoped); each worker owns its page. Findings
     * push to the shared `all` (order interleaves; the totals math is
     * order-independent). */
    const probePage = async (r) => {
      const p = await ctx.newPage();
      if (seedInstall) { await seedInstall.me(p); }
      await p.goto(url + r, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(1200);
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
      /* R366 L1 — the popover pass: probe the top stop with every
       * disclosure surface OPEN (before any scrolling), then close
       * them (Esc per open layer) and continue with the normal
       * sweep. Rows carry pass: 'popovers' + the opened trigger list. */
      if (popovers) {
        const opened = await p.evaluate(OPEN_POPOVERS).catch(() => []);
        if (opened.length) {
          await p.waitForTimeout(400);
          const res = await p.evaluate(`(${PROBE.toString().replace('MIN', MIN_FRAC).replace('__MEDIA__', MEDIA)})()`);
          if (ALLOW.length) res.fixed = res.fixed.filter(f => !allowed(f.el));
          const n = res.fixedText.length + res.text.length + res.media.length + res.fixed.length + res.clipped.length + (res.hoverflow > 1 ? 1 : 0);
          if (n) all.push({ route: r, bp: `${w}x${h}`, theme: th, scrollY: 0, pass: 'popovers', opened, ...res });
        }
        for (let k = 0; k < 4; k++) { await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(120); }
      }
      if (stress) {
        await p.evaluate(`(${STRESS.toString()})(${fontScale})`).catch(() => {});
        await p.waitForTimeout(600);
      } else if (fontScale) {
        await p.evaluate((s) => { document.documentElement.style.fontSize = `${s * 100}%`; window.dispatchEvent(new Event('resize')); }, fontScale).catch(() => {});
        await p.waitForTimeout(400);
      }
      /* R366 L1 — the focus probe (after popovers closed, before the
       * stress mutations — the ring must survive the real layout). */
      if (focusN > 0) {
        const ff = await focusProbe(p, focusN).catch(() => []);
        if (ff.length) all.push({ route: r, bp: `${w}x${h}`, theme: th, scrollY: 0, pass: 'focus', focusClip: ff, text: [], media: [], fixed: [], fixedText: [], clipped: [], hoverflow: 0, overflowEls: [] });
      }
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
    };
    if (workers <= 1) {
      for (const r of routes) await probePage(r);
    } else {
      let idx = 0;
      await Promise.all(Array.from({ length: Math.min(workers, routes.length) }, async () => {
        for (let r = routes[idx++]; r !== undefined; r = routes[idx++]) { await probePage(r).catch(() => {}); }
      }));
    }
    await ctx.close();
  }
  await br.close(); fs.mkdirSync(out.replace(/[^/]+$/, '') || '.', { recursive: true }); fs.writeFileSync(out, JSON.stringify(all, null, 1));
  const tot = k => all.reduce((s, c) => s + (Array.isArray(c[k]) ? c[k].length : +(c[k] > 1)), 0);
  console.log(`stops-with-defects=${all.length} fixed-over-text=${tot('fixedText')} text-on-text=${tot('text')} text-on-media=${tot('media')} big-fixed=${tot('fixed')} clipped=${tot('clipped')} hoverflow=${tot('hoverflow')}${focusN ? ` focus-clip=${tot('focusClip')}` : ''}`);
  process.exit(tot('fixedText') + tot('text') + tot('media') + tot('fixed') + tot('clipped') + tot('hoverflow') + tot('focusClip') ? 1 : 0);
};
run();
