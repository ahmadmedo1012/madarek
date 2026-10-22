/**
 * sheetConductor — R308 «الناظم» — the ONE shared timing system.
 *
 * The reference's published implementation resolves smooth scrolling,
 * pointer effects, masks, and scroll-linked motion from a single
 * gsap.ticker frame state («one clock — no drift»). This module is
 * Madarek's original equivalent, on the platform's own rules:
 *
 *  · ONE requestAnimationFrame loop for the whole landing sheet —
 *    effects subscribe (`subscribeSheetFrame`) and unsubscribe; there
 *    are no independent perpetual animation loops anywhere.
 *  · Sleep-when-idle by construction: when the last subscriber leaves
 *    (or every subscriber sleeps — see below), the rAF chain stops.
 *    `wakeSheet()` restarts it on the next input. The cursor, the hero
 *    instrument, and the scroll-linked scenes all follow this
 *    wake/sleep contract, so an idle page costs zero frames.
 *  · No scrolljacking: native scroll stays native; scroll-linked
 *    effects read `window.scrollY` inside their frame callback (one
 *    read per frame, no layout thrash — reads happen before writes
 *    in each consumer by convention).
 *
 * jsdom/SSR-safe: nothing here touches `window` at import time; the
 * loop guards non-browser environments. Consumers must still guard
 * their own listeners (the React effects own their lifecycle).
 */

export type SheetFrameFn = (now: number) => void;

const subscribers = new Set<SheetFrameFn>();

let rafId = 0;
let running = false;

function frameLoop(now: number): void {
  rafId = 0;
  if (subscribers.size === 0) {
    running = false;
    return;
  }
  // Copy-on-iterate: a subscriber may unsubscribe (sleep) mid-frame.
  for (const fn of [...subscribers]) {
    fn(now);
  }
  if (subscribers.size > 0 && !rafId) {
    rafId = requestAnimationFrame(frameLoop);
  } else {
    running = false;
  }
}

/**
 * Subscribe a frame callback to the shared sheet clock. Returns the
 * unsubscribe function. Starting the subscription (re)wakes the loop;
 * the loop dies on its own when no subscribers remain.
 */
export function subscribeSheetFrame(fn: SheetFrameFn): () => void {
  subscribers.add(fn);
  wakeSheet();
  return () => {
    subscribers.delete(fn);
  };
}

/**
 * Wake the shared loop if it is stopped and there is work (used after
 * pointer/scroll/resize input re-activates a sleeping subscriber).
 * Invisible tabs never spin: `requestAnimationFrame` is throttled by
 * the browser and `visibilitychange` consumers sleep themselves.
 */
export function wakeSheet(): void {
  if (running || subscribers.size === 0) return;
  if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
    return;
  }
  if (typeof document !== 'undefined' && document.hidden) return;
  running = true;
  rafId = requestAnimationFrame(frameLoop);
}

/** Test/introspection hook: how many effects currently hold the clock. */
export function sheetSubscriberCount(): number {
  return subscribers.size;
}

/** Test hook: is the shared loop currently running? */
export function isSheetRunning(): boolean {
  return running;
}

/**
 * The canonical sheet easing as a WAAPI-usable string, READ FROM THE
 * TOKEN SYSTEM (--ease in tokens.css) — JS consumers never re-hardcode
 * the curve (the motion-token gate's rule applies to runtime strings
 * as much as to stylesheets).
 */
export function sheetEase(): string {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') {
    return 'ease';
  }
  const v = getComputedStyle(document.documentElement).getPropertyValue('--ease').trim();
  return v || 'ease';
}

/* A read-only introspection handle for interaction tests (the R308
 * wake/sleep contract: an idle page must hold ZERO awake frames).
 * Harmless in production — it exposes nothing mutable. */
if (typeof window !== 'undefined') {
  const w = window as unknown as {
    __sheetConductor?: { running: boolean; subscribers: number };
  };
  w.__sheetConductor = {
    get running() {
      return running;
    },
    get subscribers() {
      return subscribers.size;
    },
  };
}

/* ── Small shared math (the reference's measured constants) ────────── */

/** Linear interpolation toward `to` by factor `k` (0..1). */
export function lerp(from: number, to: number, k: number): number {
  return from + (to - from) * k;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Distance between two points. */
export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}
