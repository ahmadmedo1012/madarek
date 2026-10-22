/**
 * HeroInspect — R308 «محطات الفحص» — the hero's local pointer system.
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
 *    clock; readout is SCENE-relative (origin = the stage box), mono,
 *    `dir="ltr"`, decorative (aria-hidden).
 *  · Markers live in the ARTWORK's viewBox coordinates and are remapped
 *    through the real letterbox transform of the rendered SVG
 *    (`fitViewBox` — preserveAspectRatio "xMidYMid meet"), so they stay
 *    glued to the drawing at every crop/size (never hard-coded px).
 *  · Drag: 2px threshold → a selection box (normalized rect, hairline
 *    coral border, direction-tinted fill). Markers whose box intersects
 *    the live selection open; the box is removed on release and open
 *    markers PERSIST (the reference's release semantics) until the
 *    visitor resets them.
 *  · Every marker is a real <button> — tap/click/Enter/Space open it
 *    (touch parity: the drag system is pointer-fine only, the buttons
 *    are the universal path, aria-pressed carries the state).
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
  viewBoxRectToContainer,
  normalizeDragRect,
  rectsIntersect,
  dragGradientAngle,
  type Rect,
} from '../../../lib/motion/sheetGeometry';

/* The hero drawing's viewBox — must match BlueprintSvg. */
const VB_W = 760;
const VB_H = 460;

/* Drag semantics (measured reference constants). */
const DRAG_THRESHOLD_PX = 2;

const GUIDE_LERP = 0.12;

/* ── The inspection stations — REAL capabilities, placed in the
 * artwork's own coordinate space at each structure's annotation spot
 * (the drafting convention: mark, never mask). Codes ride the mono
 * voice; copy is the honest current capability. */
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
    vx: 520,
    vy: 258,
    w: 204,
    h: 88,
    labelAr: 'نقطة فحص',
    bodyAr: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا قبل المتابعة.',
  },
  {
    id: 'rr',
    code: 'RR',
    vx: 244,
    vy: 252,
    w: 212,
    h: 88,
    labelAr: 'مراجعة بحث',
    bodyAr: 'بحث PDF بملاحظات مشروحة من الأستاذ ثم فهرسة في المكتبة.',
  },
  {
    id: 'mg',
    code: 'MG',
    vx: 98,
    vy: 250,
    w: 204,
    h: 88,
    labelAr: 'فجوة إتقان',
    bodyAr: 'المصفوفة تكشف الفجوة وتربطها بالدرس المناسب لك.',
  },
];

export function HeroInspect() {
  const layerRef = useRef<HTMLDivElement>(null);
  const guideXRef = useRef<HTMLSpanElement>(null);
  const guideYRef = useRef<HTMLSpanElement>(null);
  const plusRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const [openIds, setOpenIds] = useState<string[]>([]);
  const [instrumentOn, setInstrumentOn] = useState(false);

  /* ── The displayed-box mapping (viewBox → stage coordinates). ──── */
  const markerRects = useRef<Map<string, Rect>>(new Map());
  const applyMapping = useCallback(() => {
    const layer = layerRef.current;
    const stage = layer?.closest<HTMLElement>('.bp-stage');
    const svg = stage?.querySelector<SVGSVGElement>('.bp-svg');
    if (!layer || !stage || !svg) return;
    const stageRect = stage.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    /* the SVG fills the stage width; letterbox math against the
     * RENDERED rect (relative to the stage) — the real transform. */
    const rel: Rect = {
      left: svgRect.left - stageRect.left,
      top: svgRect.top - stageRect.top,
      width: svgRect.width,
      height: svgRect.height,
    };
    const fit = fitViewBox(rel.width, rel.height, VB_W, VB_H);
    const next = new Map<string, Rect>();
    for (const m of MARKERS) {
      next.set(
        m.id,
        viewBoxRectToContainer(fit, m.vx, m.vy, m.w, m.h),
      );
    }
    markerRects.current = next;
    for (const m of MARKERS) {
      const r = next.get(m.id);
      const el = layer.querySelector<HTMLElement>(`[data-marker="${m.id}"]`);
      if (r && el) {
        el.style.setProperty('--mk-x', `${r.left + r.width / 2}px`);
        el.style.setProperty('--mk-y', `${r.top + r.height / 2}px`);
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

  /* ── The local instrument: guides + plus + readout + drag box. ─── */
  useEffect(() => {
    if (!instrumentOn) return undefined;
    const layer = layerRef.current;
    const stage = layer?.closest<HTMLElement>('.bp-stage');
    if (!layer || !stage) return undefined;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let inside = false;
    let hasPoint = false;
    let unsubFrame: (() => void) | null = null;

    /* drag state */
    let dragging = false;
    let dragMoved = false;
    const dragStart = { x: 0, y: 0 };
    const dragNow = { x: 0, y: 0 };

    const stageRect = () => stage.getBoundingClientRect();

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
      if (guideXRef.current) {
        guideXRef.current.style.transform = `translateY(${pos.y}px)`;
      }
      if (guideYRef.current) {
        guideYRef.current.style.transform = `translateX(${pos.x}px)`;
      }
      if (plusRef.current) {
        plusRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      }
      if (readoutRef.current) {
        readoutRef.current.textContent = `X:${Math.max(0, Math.round(target.x))}PX Y:${Math.max(0, Math.round(target.y))}PX`;
        readoutRef.current.style.transform = `translate3d(${pos.x + 12}px, ${pos.y - 28}px, 0)`;
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

    const localPoint = (e: PointerEvent) => {
      const r = stageRect();
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
      /* never steal clicks from the real controls (hotspots/markers) */
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
      if (layer) layer.dataset.point = 'on';
    };
    const onPointerLeave = () => {
      inside = false;
      if (layer) layer.dataset.point = 'off';
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
    /* mapping identity is stable; markers never move in viewBox space */
  }, [instrumentOn]);

  const resetMarkers = () => setOpenIds([]);

  return (
    <div ref={layerRef} className="hi-layer" data-point="off">
      {/* the local instrument — decorative drafting chrome (the
          readout is aria-hidden; the hint text below is the visible
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

      {/* the drag selection box — driven imperatively via CSS vars */}
      <div ref={boxRef} className="hi-box" data-on="off" aria-hidden="true" />

      {/* the inspection stations — real buttons, touch/keyboard path */}
      {MARKERS.map((m) => {
        const open = openIds.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            data-marker={m.id}
            className="hi-marker"
            data-open={open ? 'on' : 'off'}
            style={{ ['--mk-w' as string]: `${m.w}px`, ['--mk-h' as string]: `${m.h}px` }}
            aria-pressed={open}
            aria-label={
              open
                ? `محطة فحص مفتوحة — ${m.labelAr}: ${m.bodyAr}`
                : `محطة فحص — ${m.labelAr}. افتحها لقراءة التفصيل`
            }
            onClick={() =>
              setOpenIds((prev) =>
                prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id],
              )
            }
          >
            <span className="hi-marker-dot" aria-hidden="true" />
            <span className="hi-marker-box" aria-hidden={open ? undefined : true}>
              <span className="hi-marker-code fo-mono" dir="ltr">[{m.code}]</span>
              <span className="hi-marker-label">{m.labelAr}</span>
              <span className="hi-marker-body">{m.bodyAr}</span>
            </span>
          </button>
        );
      })}

      {/* the affordance row: how to inspect + the reset (appears once
          any station is open) */}
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
    </div>
  );
}
