/**
 * HeroInspect — R308 «محطات الفحص» · R309 the corrected frame.
 *
 * The reference replaces the global cursor over its hero drawing with
 * a LOCAL drafting instrument (reference-observations.md §3.3–3.4):
 * full-span guide lines + an 8×8 plus + a scene-relative coordinate
 * readout, and a drag-to-inspect gesture whose selection box reveals
 * annotation markers by AABB overlap. This is Madarek's original
 * implementation of that grammar over «مخطط مدارك»:
 *
 *  · Guides + plus + readout: `(hover:hover) and (min-width:992px)`
 *    only (the reference's own gate); eased follow on the shared
 *    clock; readout is SCENE-relative (origin = the drawing frame),
 *    mono, `dir="ltr"`, decorative (aria-hidden), and clamped inside
 *    the frame.
 *  · ONE PHYSICAL FRAME (R309 §2.2): the interaction layer is sized
 *    in JS to the SVG's own box, and every positioned child — guides,
 *    plus, readout, drag box, dots, cards — anchors with PHYSICAL
 *    left/top against that box. The R308 defect used logical
 *    `inset-inline-start` inside the RTL document, which mirrors
 *    every element against its left-based coordinate math (cards
 *    clipped the viewport, the vertical guide crossed into the hero
 *    copy). Physical anchoring keeps the visible instrument and the
 *    logical geometry in the same frame at every size and direction.
 *  · Markers live in the ARTWORK's viewBox coordinates and are remapped
 *    through the real letterbox transform of the rendered SVG
 *    (`fitViewBox` — preserveAspectRatio "xMidYMid meet"), so they stay
 *    glued to the drawing at every crop/size (never hard-coded px).
 *  · Drag: 2px threshold → a selection box (normalized rect, hairline
 *    coral border, direction-tinted fill — R309 makes the CSS actually
 *    consume --bx/--by/--bw/--bh, so the box is VISIBLE while
 *    dragging). Markers whose box intersects the live selection open;
 *    the box is removed on release and open markers PERSIST (the
 *    reference's release semantics) until the visitor resets them.
 *  · The revealed cards (R309 §2.4): anchored to their dot, clamped
 *    inside the frame, and laid out by `layoutAnnotationCards` — a
 *    pure collision-aware pass, independent of open state, so cards
 *    never clip, never overlap, and never jump when a sibling opens.
 *    ≤760px the cards leave the overlay and flow as readable blocks
 *    under the drawing (the same breakpoint where the hotspot pins
 *    already flow — R309 §2.5's separate mobile contract).
 *  · Every marker is a real <button> (44×44 dot target) — tap/click/
 *    Enter/Space open it (touch parity: the drag system is
 *    pointer-fine only, the buttons are the universal path,
 *    aria-pressed carries the state).
 *  · State contract (R309 §6): selection opens; release persists;
 *    re-tap toggles; the reset control clears; navigating away
 *    unmounts; RETURNING TO THE TOP after leaving the hero resets the
 *    stations to their clean initial state (the audit's confusing
 *    persistent card after the footer return-to-top link).
 *  · All per-frame work is imperative on the shared conductor clock —
 *    zero React renders per pointermove (the r172 pattern).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  subscribeSheetFrame,
  wakeSheet,
  lerp,
} from '../../../lib/motion/sheetConductor';
import {
  fitViewBox,
  viewBoxPointToContainer,
  viewBoxRectToContainer,
  normalizeDragRect,
  rectsIntersect,
  dragGradientAngle,
  layoutAnnotationCards,
  type Rect,
} from '../../../lib/motion/sheetGeometry';
import { ELEVATION_VB } from '../ElevationDrawing';

/* The hero drawing's viewBox — the SINGLE shared frame (R310 §6):
 * pins, stations, guides, and drag math all remap through it. */
const VB_W = ELEVATION_VB.w;
const VB_H = ELEVATION_VB.h;

/* Drag semantics (measured reference constants). */
const DRAG_THRESHOLD_PX = 2;

const GUIDE_LERP = 0.12;

/* The station dot's hit target (touch floor) and visual dot. */
const DOT_TARGET_PX = 44;

/* ── The inspection stations — REAL capabilities, placed in the
 * ARTWORK's own coordinate space at each drawn feature's annotation
 * spot (R310: anchored to the elevation's real geometry — the
 * checkpoint pulse square on the bridge glass, the library's
 * reading-room glazing, the tower's rising mastery line). Codes
 * ride the mono voice; copy is the honest current capability. */
interface MarkerDef {
  id: string;
  code: string;
  /** viewBox-space anchor (the dot position) */
  vx: number;
  vy: number;
  /** display box size, px (the reference's fixed 200×80 grammar) */
  w: number;
  h: number;
  labelAr: string;
  bodyAr: string;
}

const MARKERS: MarkerDef[] = [
  {
    id: 'cp',
    code: 'CP',
    vx: 970,
    vy: 452,
    w: 204,
    h: 88,
    labelAr: 'نقطة فحص',
    bodyAr: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا قبل المتابعة.',
  },
  {
    id: 'rr',
    code: 'RR',
    vx: 585,
    vy: 440,
    w: 212,
    h: 88,
    labelAr: 'مراجعة بحث',
    bodyAr: 'بحث PDF بملاحظات مشروحة من الأستاذ ثم فهرسة في المكتبة.',
  },
  {
    id: 'mg',
    code: 'MG',
    vx: 340,
    vy: 360,
    w: 204,
    h: 88,
    labelAr: 'فجوة إتقان',
    bodyAr: 'المصفوفة تكشف الفجوة وتربطها بالدرس المناسب لك.',
  },
];

/* The return-to-top reset contract (R309 §6): once the visitor has
 * left the hero (scrolled past half a viewport), returning to the top
 * band resets the stations — the hero presents its clean initial state
 * instead of a stale card. The band is 120px: the footer's
 * return-to-top anchor (#main) lands at scrollY ≈ 57 under the smooth
 * scroll, and the band absorbs header offsets and rounding. */
const SCROLL_AWAY_PX_FACTOR = 0.5;
const SCROLL_TOP_BAND_PX = 120;

export function HeroInspect() {
  const layerRef = useRef<HTMLDivElement>(null);
  const guideXRef = useRef<HTMLSpanElement>(null);
  const guideYRef = useRef<HTMLSpanElement>(null);
  const plusRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const [openIds, setOpenIds] = useState<string[]>([]);
  const [instrumentOn, setInstrumentOn] = useState(false);

  /* ── The displayed-box mapping (viewBox → frame coordinates). ──── */
  const markerRects = useRef<Map<string, Rect>>(new Map());
  /* the frame's live size — read by the per-frame instrument (clamped
   * readout) without touching layout in the frame loop. */
  const frameSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const applyMapping = useCallback(() => {
    const layer = layerRef.current;
    const stage = layer?.closest<HTMLElement>('.bp-stage');
    const svg = stage?.querySelector<SVGSVGElement>('.bp-svg');
    if (!layer || !stage || !svg) return;
    const stageRect = stage.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    /* R309: the interaction layer IS the drawing frame — the SVG's own
     * box, expressed against the stage in PHYSICAL coordinates. Every
     * child then shares one left/top-based frame with the geometry
     * math (no logical-property mirroring in the RTL document). */
    layer.style.left = `${svgRect.left - stageRect.left}px`;
    layer.style.top = `${svgRect.top - stageRect.top}px`;
    layer.style.width = `${svgRect.width}px`;
    layer.style.height = `${svgRect.height}px`;
    frameSize.current = { w: svgRect.width, h: svgRect.height };

    /* the letterbox transform inside the SVG element itself */
    const fit = fitViewBox(svgRect.width, svgRect.height, VB_W, VB_H);
    const next = new Map<string, Rect>();
    for (const m of MARKERS) {
      next.set(m.id, viewBoxRectToContainer(fit, m.vx, m.vy, m.w, m.h));
    }
    markerRects.current = next;

    /* the readout chip's width is FROZEN at the worst-case coordinate
     * text for this frame size (the flip math in the frame loop must
     * never work with a stale width — the text grows as the pointer
     * moves and the chip used to escape the frame's right edge). */
    const readout = layer.querySelector<HTMLElement>('.hi-readout');
    if (readout) {
      const dx = String(Math.max(1, Math.ceil(svgRect.width))).length;
      const dy = String(Math.max(1, Math.ceil(svgRect.height))).length;
      const prevText = readout.textContent;
      readout.textContent = `X:${'9'.repeat(dx)}PX Y:${'9'.repeat(dy)}PX`;
      readout.style.minInlineSize = `${Math.ceil(readout.offsetWidth)}px`;
      readout.textContent = prevText ?? 'X:0PX Y:0PX';
    }

    /* dots — glued to the artwork through the real transform */
    for (const m of MARKERS) {
      const el = layer.querySelector<HTMLElement>(`[data-marker="${m.id}"]`);
      const c = viewBoxPointToContainer(fit, m.vx, m.vy);
      if (el) {
        el.style.setProperty('--mk-x', `${c.x}px`);
        el.style.setProperty('--mk-y', `${c.y}px`);
      }
    }

    /* R310 §6 — the [NN] pins join the SAME frame: the hotspots
     * container is sized to the SVG box (like the layer), and each
     * pin's data-vx/data-vy remaps through the same letterbox
     * transform. Pins, stations, guides, and drag math now share one
     * measured mapping at every size. (≤760px the flow-mode CSS
     * resets the container to the document flow — the vars go inert.) */
    const pins = stage.querySelector<HTMLElement>('.bp-hotspots');
    if (pins) {
      pins.style.left = `${svgRect.left - stageRect.left}px`;
      pins.style.top = `${svgRect.top - stageRect.top}px`;
      pins.style.width = `${svgRect.width}px`;
      pins.style.height = `${svgRect.height}px`;
      for (const pin of Array.from(pins.querySelectorAll<HTMLElement>('.bp-hotspot'))) {
        const vx = Number(pin.dataset.vx);
        const vy = Number(pin.dataset.vy);
        if (!Number.isFinite(vx) || !Number.isFinite(vy)) continue;
        const c = viewBoxPointToContainer(fit, vx, vy);
        pin.style.setProperty('--hot-x', `${c.x}px`);
        pin.style.setProperty('--hot-y', `${c.y}px`);
      }
    }

    /* cards — the pure collision-aware layout (frame-relative, stable
     * across open/close because it never depends on open state) */
    const placement = layoutAnnotationCards(
      { width: svgRect.width, height: svgRect.height },
      MARKERS.map((m) => {
        const c = viewBoxPointToContainer(fit, m.vx, m.vy);
        const el = layer.querySelector<HTMLElement>(`.hi-card[data-marker="${m.id}"]`);
        /* measured when rendered; the authored box is the floor */
        const w = el ? Math.max(el.offsetWidth, 0) || m.w : m.w;
        const h = el ? Math.max(el.offsetHeight, 0) || m.h : m.h;
        return { id: m.id, x: c.x, y: c.y, w: Math.max(w, m.w), h: Math.max(h, m.h) };
      }),
    );
    for (const m of MARKERS) {
      const el = layer.querySelector<HTMLElement>(`.hi-card[data-marker="${m.id}"]`);
      const p = placement.get(m.id);
      if (el && p) {
        el.style.setProperty('--c-x', `${p.left}px`);
        el.style.setProperty('--c-y', `${p.top}px`);
      }
    }
  }, []);

  useEffect(() => {
    applyMapping();
    const layer = layerRef.current;
    const svg = layer?.closest<HTMLElement>('.bp-stage')?.querySelector('svg');
    if (!layer || !svg || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => applyMapping());
    ro.observe(svg);
    return () => ro.disconnect();
  }, [applyMapping]);

  /* ── Eligibility for the pointer instrument (guides/readout/drag):
   *     the reference gates at (hover:hover) and (min-width:992px);
   *     reduced motion keeps the markers (buttons) but drops the
   *     moving instrument. ───────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const wide = window.matchMedia('(hover: hover) and (min-width: 992px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const evaluate = () => setInstrumentOn(wide.matches && !reduced.matches);
    evaluate();
    wide.addEventListener('change', evaluate);
    reduced.addEventListener('change', evaluate);
    return () => {
      wide.removeEventListener('change', evaluate);
      reduced.removeEventListener('change', evaluate);
    };
  }, []);

  /* ── The return-to-top reset contract (R309 §6). ───────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let scrolledAway = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > window.innerHeight * SCROLL_AWAY_PX_FACTOR) {
        scrolledAway = true;
        return;
      }
      if (scrolledAway && y <= SCROLL_TOP_BAND_PX) {
        scrolledAway = false;
        setOpenIds([]);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── The local instrument: guides + plus + readout + drag box. ─── */
  useEffect(() => {
    if (!instrumentOn) return undefined;
    const layer = layerRef.current;
    const stage = layer?.closest<HTMLElement>('.bp-stage');
    if (!layer || !stage) return undefined;
    /* the readout may mount with the instrument (the ≥992px gate can
     * flip after the first mapping) — re-run the mapping so its frozen
     * width is measured before the first pointer enters. */
    applyMapping();

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let inside = false;
    let hasPoint = false;
    let shown = false; /* the instrument turns visible on its FIRST
     * frame write — never before it actually tracks (pointerenter
     * alone must not reveal the pre-frame initial transforms) */
    let unsubFrame: (() => void) | null = null;
    let readoutW = 108; /* re-measured on entry; the mono chip is stable */
    let readoutH = 28;

    /* drag state */
    let dragging = false;
    let dragMoved = false;
    const dragStart = { x: 0, y: 0 };
    const dragNow = { x: 0, y: 0 };

    const layerRect = () => layer.getBoundingClientRect();

    const openMarkersInRect = (box: Rect) => {
      const hits: string[] = [];
      for (const [id, r] of markerRects.current) {
        if (rectsIntersect(box, r)) hits.push(id);
      }
      if (hits.length > 0) {
        /* monotonic within a session — opening never closes (the
         * reference's persist-after-release semantics). */
        setOpenIds((prev) => {
          const merged = new Set(prev);
          let changed = false;
          for (const h of hits) {
            if (!merged.has(h)) {
              merged.add(h);
              changed = true;
            }
          }
          return changed ? [...merged] : prev;
        });
      }
    };

    const drawBox = () => {
      const box = boxRef.current;
      if (!box) return;
      if (!dragging || !dragMoved) {
        box.dataset.on = 'off';
        return;
      }
      const rect = normalizeDragRect(dragStart.x, dragStart.y, dragNow.x, dragNow.y);
      box.dataset.on = 'on';
      box.style.setProperty('--bx', `${rect.left}px`);
      box.style.setProperty('--by', `${rect.top}px`);
      box.style.setProperty('--bw', `${rect.width}px`);
      box.style.setProperty('--bh', `${rect.height}px`);
      box.style.setProperty('--ba', `${dragGradientAngle(dragStart.x, dragStart.y, dragNow.x, dragNow.y)}deg`);
    };

    const frame = () => {
      /* read-then-write, one pass */
      pos.x = lerp(pos.x, target.x, GUIDE_LERP);
      pos.y = lerp(pos.y, target.y, GUIDE_LERP);
      const { w: fw, h: fh } = frameSize.current;
      /* the instrument is CONFINED to the frame (R309 §2.2/§5.1):
       * the eased position is clamped to the drawing box before any
       * write — the guides can never leave the drawing region. The
       * plus clamps one half-width further in so its whole 8×8 body
       * stays inside the frame. */
      const cx = Math.min(Math.max(pos.x, 0), fw);
      const cy = Math.min(Math.max(pos.y, 0), fh);
      const px = Math.min(Math.max(pos.x, 4), Math.max(4, fw - 4));
      const py = Math.min(Math.max(pos.y, 4), Math.max(4, fh - 4));
      if (!shown) {
        shown = true;
        layer.dataset.point = 'on'; /* visible only once tracking */
      }
      if (guideXRef.current) {
        guideXRef.current.style.transform = `translateY(${cy}px)`;
      }
      if (guideYRef.current) {
        guideYRef.current.style.transform = `translateX(${cx}px)`;
      }
      if (plusRef.current) {
        plusRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
      if (readoutRef.current) {
        /* the readout follows the pointer but stays INSIDE the frame
         * on every edge (left flip, floor of 6, top clamp, and the
         * bottom seat measured from the chip's own height) */
        let rx = cx + 12;
        if (rx + readoutW > fw - 6) rx = cx - readoutW - 12;
        const ry = Math.min(Math.max(6, cy - 28), Math.max(6, fh - readoutH - 6));
        readoutRef.current.textContent = `X:${Math.max(0, Math.round(target.x))}PX Y:${Math.max(0, Math.round(target.y))}PX`;
        readoutRef.current.style.transform = `translate3d(${Math.max(6, rx)}px, ${ry}px, 0)`;
      }
      if (dragging) drawBox();
      /* sleep: the instrument unsubscribes when the pointer leaves or
       * the eased position has settled on the target. */
      const settled =
        Math.abs(target.x - pos.x) < 0.1 && Math.abs(target.y - pos.y) < 0.1;
      if (!dragging && (!inside || settled)) {
        if (unsubFrame) {
          unsubFrame();
          unsubFrame = null;
        }
      }
    };

    const wake = () => {
      if (!unsubFrame) {
        unsubFrame = subscribeSheetFrame(frame);
      } else {
        wakeSheet();
      }
    };

    /* scene-relative point: the FRAME is the drawing (the SVG box) —
     * R309 §2.2 ("scene-relative X/Y computed from the active frame's
     * actual bounding rectangle"). Events are captured on the STAGE
     * (the layer stays pointer-transparent so the hotspot pins keep
     * their clicks); the coordinates are rebased to the frame. */
    const localPoint = (e: PointerEvent) => {
      const r = layerRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = localPoint(e);
      target.x = p.x;
      target.y = p.y;
      if (!hasPoint) {
        pos.x = p.x;
        pos.y = p.y;
        hasPoint = true;
      }
      if (dragging) {
        dragNow.x = p.x;
        dragNow.y = p.y;
        if (!dragMoved) {
          const d = Math.hypot(dragNow.x - dragStart.x, dragNow.y - dragStart.y);
          if (d >= DRAG_THRESHOLD_PX) {
            dragMoved = true;
            stage.dataset.dragging = 'on';
          }
        }
        if (dragMoved) {
          const box = normalizeDragRect(dragStart.x, dragStart.y, dragNow.x, dragNow.y);
          openMarkersInRect(box);
        }
      }
      wake();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = e.target instanceof Element ? e.target : null;
      /* never steal clicks from the real controls (dots) */
      if (el?.closest('button, a')) return;
      const p = localPoint(e);
      dragStart.x = p.x;
      dragStart.y = p.y;
      dragNow.x = p.x;
      dragNow.y = p.y;
      dragging = true;
      dragMoved = false;
      inside = true;
      wake();
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      dragMoved = false;
      delete stage.dataset.dragging;
      drawBox(); /* clears the box — markers persist (reference) */
    };

    const onPointerEnter = () => {
      inside = true;
      if (readoutRef.current) {
        readoutW = readoutRef.current.offsetWidth || 108;
        readoutH = readoutRef.current.offsetHeight || 28;
      }
      /* visibility is granted by the first frame write, not here */
    };
    const onPointerLeave = () => {
      inside = false;
      shown = false;
      layer.dataset.point = 'off';
      endDrag();
    };

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerenter', onPointerEnter);
    stage.addEventListener('pointerleave', onPointerLeave);

    return () => {
      if (unsubFrame) unsubFrame();
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', endDrag);
      stage.removeEventListener('pointercancel', endDrag);
      stage.removeEventListener('pointerenter', onPointerEnter);
      stage.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [instrumentOn, applyMapping]);

  const toggleMarker = (id: string) =>
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const resetMarkers = () => setOpenIds([]);

  return (
    <>
      {/* the interaction layer — JS-sized to the SVG's own box; every
          child anchors PHYSICALLY (left/top) inside that one frame. */}
      <div ref={layerRef} className="hi-layer" data-point="off">
        {/* the local instrument — decorative drafting chrome (the
            readout is aria-hidden; the hint text is the visible
            affordance, and the marker buttons are the control path). */}
        {instrumentOn && (
          <span className="hi-instrument" aria-hidden="true">
            <span ref={guideXRef} className="hi-guide hi-guide-x" />
            <span ref={guideYRef} className="hi-guide hi-guide-y" />
            <span ref={plusRef} className="hi-plus">
              <span className="hi-plus-h" />
              <span className="hi-plus-v" />
            </span>
            <span ref={readoutRef} className="hi-readout fo-mono" dir="ltr">
              X:0PX Y:0PX
            </span>
          </span>
        )}

        {/* the drag selection box — driven imperatively via CSS vars
            (R309: the CSS finally consumes them — a visible box) */}
        <div ref={boxRef} className="hi-box" data-on="off" aria-hidden="true" />

        {/* the inspection stations — real buttons (the universal
            path: tap, click, Enter/Space); 44px dot targets glued to
            the artwork through the letterbox transform. */}
        {MARKERS.map((m) => {
          const open = openIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              data-marker={m.id}
              className="hi-marker"
              data-open={open ? 'on' : 'off'}
              style={{ ['--mk-w' as string]: `${DOT_TARGET_PX}px`, ['--mk-h' as string]: `${DOT_TARGET_PX}px` }}
              aria-pressed={open}
              aria-label={
                open
                  ? `محطة فحص مفتوحة — ${m.labelAr}: ${m.bodyAr}`
                  : `محطة فحص — ${m.labelAr}. افتحها لقراءة التفصيل`
              }
              onClick={() => toggleMarker(m.id)}
            >
              <span className="hi-marker-dot" aria-hidden="true" />
            </button>
          );
        })}

        {/* the revealed cards — OVERLAY presentation (>760px): pure
            presentation laid out by the collision-aware pass; never
            interactive (the dots + reset own the control path), never
            clipped, never overlapping. */}
        {MARKERS.map((m) => {
          const open = openIds.includes(m.id);
          return (
            <div
              key={m.id}
              className="hi-card"
              data-marker={m.id}
              data-open={open ? 'on' : 'off'}
              style={{ ['--c-w' as string]: `${m.w}px`, ['--c-h' as string]: `${m.h}px` }}
              aria-hidden="true"
            >
              <span className="hi-marker-code fo-mono" dir="ltr">[{m.code}]</span>
              <span className="hi-marker-label">{m.labelAr}</span>
              <span className="hi-marker-body">{m.bodyAr}</span>
            </div>
          );
        })}
      </div>

      {/* the flow rail — the affordance row + (≤760px) the revealed
          cards as readable blocks under the drawing. Above 760px the
          rail is a transparent overlay (the hint chip keeps its R308
          stage-bottom position WITHOUT growing the stage, so the
          percentage-positioned hotspot pins never drift); at ≤760px —
          the same breakpoint where the pins already flow — the rail
          enters the document flow. The dots above carry the same
          real station state (R309 §2.5). */}
      <div className="hi-flow" data-any-open={openIds.length > 0 ? 'on' : 'off'}>
        <div className="hi-hint">
          <span className="hi-hint-text fo-mono">
            {instrumentOn ? 'اسحب فوق الرسم لكشف محطات الفحص' : 'انقر محطة الفحص لقراءتها'}
          </span>
          {openIds.length > 0 && (
            <button type="button" className="hi-reset" onClick={resetMarkers}>
              إعادة ضبط المحطات
            </button>
          )}
        </div>
        {MARKERS.map((m) => {
          const open = openIds.includes(m.id);
          return (
            <div
              key={m.id}
              className="hi-flow-card"
              data-marker={m.id}
              data-open={open ? 'on' : 'off'}
            >
              <span className="hi-marker-code fo-mono" dir="ltr">[{m.code}]</span>
              <span className="hi-marker-label">{m.labelAr}</span>
              <span className="hi-marker-body">{m.bodyAr}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
