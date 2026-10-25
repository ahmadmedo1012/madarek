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
 * R318 C2-S1 — the frame-scoped geometry batch + idempotent writes:
 *  · `sheetRect(el)` — ONE `getBoundingClientRect` per element per
 *    rAF tick: the first consumer that reads an element in a tick
 *    caches its rect (+ `innerHeight`) for every later consumer in
 *    the SAME tick. The cache is generation-stamped; the generation
 *    bumps on every `frameLoop` tick and on every out-of-loop read
 *    (`freshSheetRects()`), so a cached rect never crosses a frame
 *    boundary. This is what makes the useSheetScroll contract real:
 *    "one gBCR pass per frame, never re-read within the same frame".
 *  · `setSheetVar(style, name, value)` — idempotent CSS-var write:
 *    the last written value per (style, name) is cached and an
 *    unchanged value string is SKIPPED (clamped pin dwells, idle
 *    settle frames and quantized values stop dirtying style).
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
  /* R318 C2-S1 — a new frame invalidates every cached rect: geometry
   * read this tick must be re-read next tick (scroll moved the page). */
  nextRectGen();
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

/* ── R318 C2-S1 — the frame-scoped geometry batch ────────────────────
 *
 * One gBCR pass per rAF tick, shared by every scroll consumer on the
 * clock. The generation is the cache key: `frameLoop` bumps it at the
 * start of every tick (geometry read this frame is stale next frame);
 * `freshSheetRects()` bumps it for reads that run OUTSIDE the loop
 * (the settle frame, the mount prime) so they can never be served a
 * cross-frame cached rect. Within one tick the reads stay batched:
 * all subscribers read before any of them re-reads the same element,
 * and a cached hit costs no layout at all. */

interface RectSnapshot {
  gen: number;
  rect: DOMRect;
  vh: number;
}

let rectGen = 0;
const rectCache = new WeakMap<Element, RectSnapshot>();

function nextRectGen(): void {
  rectGen += 1;
}

/** The element's viewport rect + `innerHeight`, cached for the
 *  current generation (one batched read per element per tick). */
export function sheetRect(el: Element): { rect: DOMRect; vh: number } {
  const hit = rectCache.get(el);
  if (hit && hit.gen === rectGen) return hit;
  const snap: RectSnapshot = {
    gen: rectGen,
    rect: el.getBoundingClientRect(),
    vh: window.innerHeight,
  };
  rectCache.set(el, snap);
  return snap;
}

/** Invalidate every cached rect (settle frames / mount primes —
 *  anything that reads geometry outside the rAF loop). */
export function freshSheetRects(): void {
  nextRectGen();
}

/* ── R318 C2-S1 — idempotent scroll-frame writes ─────────────────────
 *
 * The scroll driver writes the same CSS var every tick even while the
 * value is pinned (clamped dwells at 0/1, quantized 4-decimal values,
 * idle settle frames). `setProperty` always dirties style, so the
 * writer caches the last written value per (style, name) and skips
 * the call when the value string is unchanged. Keyed weakly on the
 * style object: a remount gets a fresh object (fresh cache), and an
 * element removed from the DOM releases its entry. */
const writtenVars = new WeakMap<CSSStyleDeclaration, Map<string, string>>();

/** Write a custom property, skipping unchanged values. Returns
 *  whether the DOM was touched. */
export function setSheetVar(
  style: CSSStyleDeclaration,
  name: string,
  value: string,
): boolean {
  let last = writtenVars.get(style);
  if (!last) {
    last = new Map<string, string>();
    writtenVars.set(style, last);
  }
  if (last.get(name) === value) return false;
  last.set(name, value);
  style.setProperty(name, value);
  return true;
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
