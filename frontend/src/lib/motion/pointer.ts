/* ═════════════════════════════════════════════════════════════════════
   R305-A2 — pointer math for the cursor layer (pure, dependency-free).

   Heron-inspired MECHANICS, original Madarek implementation:
   normalized-follow with per-frame lerp toward the pointer and a
   SELF-CANCELLING rAF loop — the loop stops once the follower is
   within STOP_EPS of the target (idle stop = zero perpetual work)
   and restarts on the next pointermove. No gsap, no ticker.

   Everything here is pure DOM-free logic except the two gate helpers,
   which are SSR-safe reads. Consumed by components/motion/CursorManager.tsx.
   ═════════════════════════════════════════════════════════════════════ */

/** Dot follow stiffness — snappier than the construction lines. */
export const LERP_FACTOR = 0.18;

/** Construction-lines follow stiffness — more lag than the dot. */
export const LINE_LERP_FACTOR = 0.1;

/** Distance (px) below which a tracker is considered converged; the
 *  rAF loop stops when BOTH trackers report under this. */
export const STOP_EPS = 0.001;

/** Minimum viewport width for the desktop cursor layer (matches the
 *  reference mechanic's own desktop gate of w > 991). */
export const MIN_VIEWPORT = 992;

/** Linear interpolation from a toward b by factor t (0..1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Euclidean distance between two points. */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/** True when the follower may stop moving (converged within eps). */
export function shouldStop(dist: number, eps: number): boolean {
  return dist <= eps;
}

export type PointerPoint = { x: number; y: number };

/**
 * PointerTracker — one follow element (the dot, or the construction
 * lines). `step()` advances `current` toward `target` by one lerp
 * tick and returns whether the movement still exceeds `eps`
 * (true = keep the rAF loop alive, false = the loop may cancel).
 */
export class PointerTracker {
  target: PointerPoint = { x: 0, y: 0 };
  current: PointerPoint = { x: 0, y: 0 };
  factor: number;
  eps: number;

  constructor(factor: number = LERP_FACTOR, eps: number = STOP_EPS) {
    this.factor = factor;
    this.eps = eps;
  }

  /** Snap both points to one position — used on the first pointermove
   *  so the follower never flies in from the layer origin. */
  reset(x: number, y: number): void {
    this.target.x = x;
    this.target.y = y;
    this.current.x = x;
    this.current.y = y;
  }

  /** Advance one tick. Returns true while movement still exceeds eps. */
  step(): boolean {
    this.current.x = lerp(this.current.x, this.target.x, this.factor);
    this.current.y = lerp(this.current.y, this.target.y, this.factor);
    return !shouldStop(distance(this.current.x, this.current.y, this.target.x, this.target.y), this.eps);
  }
}

/**
 * True on devices with a fine pointer AND hover capability
 * (mouse/trackpad). SSR-safe: false without a window. Touch and
 * stylus-only surfaces never activate the cursor layer.
 */
export function finePointerSupported(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Desktop gate — the layer only mounts at MIN_VIEWPORT and wider. */
export function desktopCursorAllowed(width: number): boolean {
  return width >= MIN_VIEWPORT;
}
