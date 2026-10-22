/**
 * sheetGeometry — R308 — pure geometry for the interactive sheet.
 *
 * The reference's drag-to-inspect runs on «plain DOM + coordinate
 * math»: the hero artwork is a letterboxed drawing (object-fit /
 * preserveAspectRatio), so markers defined in the ARTWORK's own
 * coordinate space must be remapped onto the DISPLAYED box before any
 * hit-testing — «the code measures the image as displayed and remaps
 * each marker». These are the pure functions that make that mapping
 * real and testable, independent of React or the DOM.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FitResult {
  /** uniform display scale of the viewBox inside the container */
  scale: number;
  /** offsets of the letterboxed content box inside the container */
  offsetX: number;
  offsetY: number;
}

/**
 * Fit a viewBox (vbW × vbH) inside a container rect the way
 * `preserveAspectRatio="xMidYMid meet"` does: uniform scale, centered,
 * letterboxed. Returns the scale + the centered offsets.
 */
export function fitViewBox(
  containerWidth: number,
  containerHeight: number,
  vbW: number,
  vbH: number,
): FitResult {
  if (vbW <= 0 || vbH <= 0) return { scale: 0, offsetX: 0, offsetY: 0 };
  const scale = Math.min(containerWidth / vbW, containerHeight / vbH);
  return {
    scale,
    offsetX: (containerWidth - vbW * scale) / 2,
    offsetY: (containerHeight - vbH * scale) / 2,
  };
}

/**
 * Map a point from viewBox coordinates to CONTAINER-relative display
 * coordinates (relative to the container's top-left corner), through
 * the letterbox transform. This is the real coordinate transformation
 * the R308 contract requires — never hard-coded pixel positions.
 */
export function viewBoxPointToContainer(
  fit: FitResult,
  vx: number,
  vy: number,
): { x: number; y: number } {
  return { x: fit.offsetX + vx * fit.scale, y: fit.offsetY + vy * fit.scale };
}

/** Map a viewBox-space rect (cx/cy centered anchor + w/h) to a
 *  container-relative rect (the marker's display box). */
export function viewBoxRectToContainer(
  fit: FitResult,
  cx: number,
  cy: number,
  w: number,
  h: number,
): Rect {
  const c = viewBoxPointToContainer(fit, cx, cy);
  const dw = w * fit.scale;
  const dh = h * fit.scale;
  return { left: c.x - dw / 2, top: c.y - dh / 2, width: dw, height: dh };
}

/** Axis-aligned bounding-box intersection (the marker activation test). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

/**
 * Normalize a drag gesture (start → current) into a canonical rect,
 * exactly like the reference's selection box: `Math.min` per axis.
 */
export function normalizeDragRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Rect {
  return {
    left: Math.min(x0, x1),
    top: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  };
}

/** The direction-tinted gradient angle (deg) for a drag start→current
 *  vector: the orange corner of the selection fill tracks the drag
 *  direction (the reference hard-codes 315deg for a down-right drag;
 *  this generalizes it to any direction). */
export function dragGradientAngle(x0: number, y0: number, x1: number, y1: number): number {
  const deg = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  // CSS gradient angles grow clockwise from «to top»; the tint corner
  // sits opposite the movement direction so the fill leads the drag.
  return Math.round(((((90 - deg) % 360) + 360) % 360 + 180) % 360);
}

/** Point-in-rect containment test (tap-to-inspect hit detection). */
export function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height;
}

/* ═══ R309 — the annotation-card layout ═════════════════════════════════
 *
 * The drag-reveal cards must never clip the frame or collide with each
 * other (the R308 production audit found both). This is the pure
 * placement pass: each card anchors to its marker dot — centered above
 * it when there is room, below otherwise — clamps inside the drawing
 * frame, and then a deterministic collision resolution nudges
 * overlapping cards apart.
 *
 * The layout is a PURE function of (frame, anchors, sizes). It never
 * looks at which cards are currently open, so positions are stable as
 * cards appear and disappear (R309 §2.4: "The layout must remain
 * stable as cards appear"). */

export interface CardAnchor {
  id: string;
  /** the marker dot's position in frame coordinates */
  x: number;
  y: number;
  /** the card's display size */
  w: number;
  h: number;
}

export interface CardPlacement {
  id: string;
  left: number;
  top: number;
}

/** Default insets/gaps of the annotation-card layout (px). */
export const CARD_LAYOUT_DEFAULTS = {
  /** min distance between the frame edge and a card */
  pad: 6,
  /** min distance between the dot and the card it annotates */
  anchorGap: 14,
  /** min distance between two colliding cards */
  gap: 10,
  /** collision-resolution iteration bound (3 cards → 2 max rounds) */
  maxRounds: 8,
};

/**
 * Lay out annotation cards inside a drawing frame. Deterministic:
 * cards are processed in x-order and overlaps resolve by moving the
 * right-hand card fully below (or above) the earlier one; if neither
 * side has room the card is placed below and clamped.
 */
export function layoutAnnotationCards(
  frame: { width: number; height: number },
  anchors: Array<CardAnchor>,
  overrides?: Partial<typeof CARD_LAYOUT_DEFAULTS>,
): Map<string, CardPlacement> {
  const { pad, anchorGap, gap, maxRounds } = {
    ...CARD_LAYOUT_DEFAULTS,
    ...overrides,
  };
  const W = frame.width;
  const H = frame.height;

  /* pass 1 — anchor each card to its dot, clamped to the frame on
   * BOTH axes (containment is guaranteed before any collision work). */
  const rects = new Map<string, Rect>();
  const ordered = [...anchors].sort((a, b) => a.x - b.x || a.y - b.y);
  for (const a of ordered) {
    const w = Math.min(a.w, Math.max(0, W - 2 * pad));
    const h = Math.min(a.h, Math.max(0, H - 2 * pad));
    const left = clampNum(a.x - w / 2, pad, Math.max(pad, W - pad - w));
    let top = a.y - h - anchorGap;
    if (top < pad) top = a.y + anchorGap;
    top = clampNum(top, pad, Math.max(pad, H - pad - h));
    rects.set(a.id, { left, top, width: w, height: h });
  }

  /* pass 2 — resolve pairwise overlaps deterministically (x-order;
   * the right-hand card yields). A per-pair attempt budget keeps
   * over-constrained frames (cards that physically cannot all fit)
   * from oscillating: after two tries the pair keeps its best seat.
   * Repeat to a fixed point. */
  const attempts = new Map<string, number>();
  const pairKey = (i: number, j: number) => `${i}:${j}`;
  for (let round = 0; round < maxRounds; round += 1) {
    let moved = false;
    for (let i = 0; i < ordered.length; i += 1) {
      for (let j = i + 1; j < ordered.length; j += 1) {
        const a = ordered[i];
        const b = ordered[j];
        if (!a || !b) continue;
        const key = pairKey(i, j);
        if ((attempts.get(key) ?? 0) >= 2) continue;
        const A = rects.get(a.id);
        const B = rects.get(b.id);
        if (!A || !B) continue;
        if (!rectsIntersect(A, B)) continue;
        attempts.set(key, (attempts.get(key) ?? 0) + 1);
        /* try to seat B fully below A … */
        let top = A.top + A.height + gap;
        if (top + B.height > H - pad) {
          /* … else fully above A … */
          const above = A.top - gap - B.height;
          if (above >= pad) {
            top = above;
          }
          /* … else below-and-clamped (readability over perfection) */
        }
        const clamped = clampNum(top, pad, Math.max(pad, H - pad - B.height));
        if (clamped !== B.top) {
          B.top = clamped;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  const out = new Map<string, CardPlacement>();
  for (const [id, r] of rects) out.set(id, { id, left: r.left, top: r.top });
  return out;
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}
