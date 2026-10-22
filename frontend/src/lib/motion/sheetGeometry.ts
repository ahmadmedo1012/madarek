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
