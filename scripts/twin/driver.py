#!/usr/bin/env python3
"""driver.py — Heron Twin input primitives, used IDENTICALLY on both sides.

Scroll architecture (spec of record: docs/redesign/r331/heron-program.json):
  · heron   — the window NEVER scrolls. `.body-inner` is overflow:hidden
              height:100vh; `.main-inner` is the Lenis 1.1.5 wrapper AND the
              ScrollTrigger scroller (scrollerProxy). Heron's lenis instance is
              not exposed, so `seek` writes `.main-inner`.scrollTop directly and
              VERIFY-RETRIES: when the engine is idle, Lenis 1.1.5's
              onNativeScroll resyncs its target to the real scroll; when a glide
              is in flight the write would be overwritten, so we re-write and
              re-check until |actual - y| <= tol.
  · madarek — window scroller driven by `window.__mdrkLenis` (the app's own
              e2e seam; sheetLenis.ts:256). `seek` uses
              lenis.scrollTo(y, {immediate:true}) — the ONLY way to seat scroll
              exactly without racing the engine — and falls back to
              window.scrollTo(0, y) when no engine exists (reduced motion / SSR).
"""
from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional, Tuple

# ── locator for the scroller top per side ────────────────────────────────────
SCROLLER_TOP_JS = {
    "heron": "() => { const el = document.querySelector('.main-inner'); return el ? el.scrollTop : 0; }",
    "madarek": "() => window.scrollY || 0",
}

# ── seek ─────────────────────────────────────────────────────────────────────
_HERON_SEEK_JS = """
(y) => {
  const el = document.querySelector('.main-inner');
  if (!el) return { ok: false, reason: 'no .main-inner' };
  el.scrollTop = y;
  return { ok: true, actual: el.scrollTop };
}
"""
_MADAREK_SEEK_JS = """
(y) => {
  if (window.__mdrkLenis && typeof window.__mdrkLenis.scrollTo === 'function') {
    try {
      window.__mdrkLenis.scrollTo(y, { immediate: true });
      return { ok: true, actual: window.scrollY, engine: 'lenis' };
    } catch (e) { /* fall through to native */ }
  }
  window.scrollTo(0, y);
  return { ok: true, actual: window.scrollY, engine: 'native' };
}
"""


def scroller_top(page, side: str) -> float:
    return float(page.evaluate(SCROLLER_TOP_JS[side]) or 0.0)


def max_scroll(page, side: str) -> float:
    if side == "heron":
        return float(page.evaluate(
            "() => { const el = document.querySelector('.main-inner');"
            " return el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0; }"))
    return float(page.evaluate(
        "() => { const d = document.scrollingElement || document.documentElement;"
        " return Math.max(0, d.scrollHeight - window.innerHeight); }"))


def seek(page, side: str, y: float, tol: float = 2.0, retries: int = 8,
         check_wait_ms: int = 120) -> Dict[str, Any]:
    """Seat scroll EXACTLY at y (document px inside the side's scroller).

    Returns {'ok', 'actual', 'engine', 'tries'} — honest about the final offset.
    """
    js = _HERON_SEEK_JS if side == "heron" else _MADAREK_SEEK_JS
    last = {"ok": False, "actual": -1.0, "engine": "n/a", "tries": 0}
    for i in range(retries):
        try:
            r = page.evaluate(js, float(y))
        except Exception as e:  # execution context torn down (navigation) — retry
            last = {"ok": False, "actual": -1.0, "engine": f"err:{e.__class__.__name__}", "tries": i + 1}
            page.wait_for_timeout(check_wait_ms)
            continue
        actual = float(r.get("actual", -1) if isinstance(r, dict) else -1)
        last = {"ok": bool(r.get("ok")), "actual": actual,
                "engine": r.get("engine", "native-scroll"), "tries": i + 1}
        if abs(actual - float(y)) <= tol:
            last["ok"] = True
            return last
        page.wait_for_timeout(check_wait_ms)
    return last


# ── real input primitives (page.mouse — genuine input events) ────────────────
def wheel(page, dy: float, steps: int = 1, step_delay_ms: int = 60,
          x: Optional[float] = None, y_: Optional[float] = None) -> None:
    """Dispatch `steps` wheel ticks of dy px each (total dy*steps)."""
    vp = page.viewport_size
    cx = x if x is not None else vp["width"] / 2
    cy = y_ if y_ is not None else vp["height"] / 2
    page.mouse.move(cx, cy)
    for _ in range(max(1, steps)):
        page.mouse.wheel(0, dy)
        page.wait_for_timeout(step_delay_ms)


def pagedown(page) -> None:
    vp = page.viewport_size
    wheel(page, vp["height"] * 0.9, steps=1, step_delay_ms=120)


def click_anchor(page, hash_: str) -> None:
    """Click a real in-page anchor (a[href='#…']) — falls back to location.hash."""
    ok = page.evaluate(
        """(h) => {
             const a = document.querySelector(`a[href="${h}"]`);
             if (a) { a.click(); return true; }
             return false;
           }""", hash_)
    if not ok:
        page.evaluate("(h) => { window.location.hash = h; }", hash_)


def hover_path(page, points: List[Tuple[float, float]],
               step_delay_ms: int = 40) -> None:
    """Move the real mouse through an absolute-point path (hover-driven art)."""
    for i, (x, y) in enumerate(points):
        page.mouse.move(x, y, steps=4)
        page.wait_for_timeout(step_delay_ms)


# ── settle + readiness ───────────────────────────────────────────────────────
def settle(page, ms: int = 400) -> None:
    page.wait_for_timeout(ms)


def ready(page, extra_ms: int = 1500) -> None:
    """networkidle + fonts — call once per page before the first capture."""
    page.wait_for_timeout(extra_ms)
    try:
        page.evaluate("() => document.fonts ? document.fonts.ready : true")
    except Exception:
        pass
    page.wait_for_timeout(300)


def motion_state(page, side: str, section_sel: str,
                 key_sels: Optional[List[str]] = None) -> Dict[str, Any]:
    """Best-effort motion state for one frame.

    madarek — window.__mdrkLenis exists (velocity / targetScroll / actualScroll).
              No ScrollTrigger debug handle is exposed by the app (verified in
              source: the only seams are __mdrkLenis + MadarekConsent).
    heron   — window.gsap / window.ScrollTrigger are likely NOT exposed; when
              absent we record computed transform matrices of 2-3 key animated
              elements (the section's first child + any [class*=inner] child).
    """
    if side == "madarek":
        return page.evaluate(
            """() => {
                 const L = window.__mdrkLenis;
                 let lenis = null;
                 if (L) {
                   try { lenis = { velocity: L.velocity, targetScroll: L.targetScroll,
                                   actualScroll: L.actualScroll, stopped: L.isStopped }; }
                   catch (e) { lenis = { err: String(e) }; }
                 }
                 return {
                   lenis,
                   htmlLenisOn: document.documentElement.hasAttribute('data-lenis-on'),
                   gsap: typeof window.gsap,
                   scrollTrigger: typeof window.ScrollTrigger,
                 };
               }""")
    return page.evaluate(
        """(args) => {
             const { sel, keySels } = args;
             const el = document.querySelector(sel);
             const picks = [];
             const push = (e, label) => {
               if (!e || picks.length >= 3) return;
               const cs = getComputedStyle(e);
               picks.push({ label, cls: String(e.className).slice(0, 60),
                            transform: cs.transform, opacity: cs.opacity });
             };
             push(el?.firstElementChild, 'section-first-child');
             if (el) for (const c of el.children) { if (/inner|content|sticky/.test(String(c.className))) push(c, 'inner'); }
             for (const ks of (keySels || [])) push(document.querySelector(ks), ks);
             // heron exposes window.gsap + window.ScrollTrigger (verified live:
             // gsap 3.12.5, ScrollTrigger.getAll() with numeric scroller-coord
             // start/end) — record every trigger whose trigger element is the
             // section itself or a descendant (bounded to 6).
             let st = null;
             try {
               const ST = window.ScrollTrigger;
               if (ST && ST.getAll && el) {
                 const rel = ST.getAll().filter(t => {
                   const tg = t.trigger;
                   return tg && (tg === el || (tg.contains && tg.contains(el)) ||
                                 (el.contains && el.contains(tg)));
                 }).slice(0, 6).map(t => ({
                   triggerCls: (t.trigger && (t.trigger.className || t.trigger.id ||
                                t.trigger.tagName) || '').toString().slice(0, 48),
                   start: Math.round(t.start), end: Math.round(t.end),
                   progress: +(t.progress || 0).toFixed(3), pin: !!t.pin,
                   isActive: !!t.isActive,
                 }));
                 st = rel.length ? rel : [];
               }
             } catch (e) { st = [{ err: String(e).slice(0, 80) }]; }
             return {
               gsap: typeof window.gsap,
               scrollTrigger: typeof window.ScrollTrigger,
               lenis: null,
               transforms: picks,
               scrollTriggers: st,
             };
           }""", {"sel": section_sel, "keySels": key_sels or []})


def geometry_record(page, side: str, section_sel: str, vp: Dict[str, int]) -> Dict[str, Any]:
    """Per-frame geometry: section box, first-level child boxes, gutters,
    heading computed type, img/p boxes, fonts status, rem base."""
    return page.evaluate(
        """(args) => {
             const { sel, vw, vh, sc } = args;
             const el = document.querySelector(sel);
             const fontsStatus = document.fonts ? document.fonts.status : 'n/a';
             const remBase = getComputedStyle(document.documentElement).fontSize;
             if (!el) return { found: false, fontsStatus, remBase };
             const r = el.getBoundingClientRect();
             const box = { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1),
                           h: +r.height.toFixed(1), topDoc: +(r.top + sc).toFixed(1) };
             const kids = [...el.children].map(c => {
               const cr = c.getBoundingClientRect();
               return { tag: c.tagName.toLowerCase(), cls: String(c.className).slice(0, 80),
                        x: +cr.x.toFixed(1), y: +cr.y.toFixed(1), w: +cr.width.toFixed(1),
                        h: +cr.height.toFixed(1) };
             });
             /* vertical rhythm: descend (max depth 3) to the shallowest level
                with >=2 'major' boxes (h>=24, w>=48) inside the section and
                take the vertical gaps between consecutive boxes there.
                (Many Webflow/React wraps have a single-child chain at level 1,
                which made level-1 gutters degenerate.) */
             let gutterLevel = 0, gutters = [], rowsN = 0;
             let frontier = [el];
             for (let depth = 1; depth <= 3 && gutters.length === 0; depth++) {
               const next = [];
               for (const f of frontier) next.push(...f.children);
               const boxes = [...next].map(c => c.getBoundingClientRect())
                 .filter(r => r.height >= 24 && r.width >= 48)
                 .sort((a, b) => a.top - b.top);
               if (boxes.length >= 2) {
                 gutterLevel = depth; rowsN = boxes.length;
                 for (let i = 1; i < boxes.length; i++) {
                   gutters.push(+(boxes[i].top - (boxes[i - 1].top + boxes[i - 1].height)).toFixed(1));
                 }
               }
               frontier = next;
             }
             const heads = [...el.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="heading"]')].slice(0, 6).map(h => {
               const cs = getComputedStyle(h);
               const hr = h.getBoundingClientRect();
               return { tag: h.tagName.toLowerCase(), cls: String(h.className).slice(0, 60),
                        text: (h.textContent || '').trim().slice(0, 40),
                        fontSizePx: +cs.fontSize.replace('px', ''), fontWeight: cs.fontWeight,
                        lineHeightPx: +cs.lineHeight.replace('px', ''),
                        letterSpacingPx: +cs.letterSpacing.replace('px', '') || 0,
                        y: +(hr.top + sc).toFixed(1) };
             });
             const imgs = [...el.querySelectorAll('img,svg')].slice(0, 6).map(i2 => {
               const ir = i2.getBoundingClientRect();
               return { tag: i2.tagName.toLowerCase(), w: +ir.width.toFixed(1), h: +ir.height.toFixed(1) };
             });
             const pcount = el.querySelectorAll('p').length;
             return { found: true, box, children: kids, gutterLevel, rowsN,
                      gutters, headings: heads,
                      imgs, pCount: pcount, fontsStatus, remBase,
                      viewport: { vw, vh } };
           }""",
        {"sel": section_sel, "vw": vp["width"], "vh": vp["height"], "sc": scroller_top(page, side)})


def dump_records(path, records: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
