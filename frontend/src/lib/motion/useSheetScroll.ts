/**
 * useSheetScroll — R308 — the scroll-driver lifecycle for scroll-linked
 * effects on the shared sheet clock.
 *
 * The reference resolves scroll-linked motion from its ONE ticker; on
 * Madarek's native-scroll canon the equivalent discipline is:
 *
 *  · a passive `scroll` listener KICKS the effect awake (subscribing
 *    its frame to the shared conductor clock);
 *  · the frame reads geometry (one `getBoundingClientRect` batched
 *    per frame) and writes CSS vars / data-attrs — never React state;
 *  · a settle timer UNSUBSCRIBES shortly after scrolling stops — no
 *    effect keeps the clock alive while the page sits still.
 *
 * The callback receives measured metrics so consumers never repeat the
 * geometry math (and never read layout twice per frame).
 *
 * R318 C2-S1 — the batch is now REAL and frame-scoped:
 *  · `run(false)` (the rAF tick) reads through the conductor's
 *    generation cache — the first read of an element in a tick serves
 *    every consumer of that same tick; nothing re-reads layout within
 *    the same frame.
 *  · `run(true)` (the settle frame + the mount prime) runs OUTSIDE the
 *    rAF loop, so it bumps the generation first — it is never served a
 *    rect cached by a previous frame, and the one rect it reads serves
 *    any same-tick consumer that follows.
 *  · `options.onRefresh` runs BEFORE the settle frame and on resize —
 *    the hook for consumer-side document-geometry caches (JourneyScene's
 *    stations stack): viewport positions still derive per frame from
 *    `window.scrollY` (free), but the cached document offsets are only
 *    re-measured when layout may actually have changed.
 */
import { useEffect, useRef } from 'react';
import {
  subscribeSheetFrame,
  wakeSheet,
  clamp,
  sheetRect,
  freshSheetRects,
} from './sheetConductor';

export interface ScrollMetrics {
  /** the target's live viewport rect (one read per frame) */
  rect: DOMRect;
  /** viewport height */
  vh: number;
  /**
   * Section traversal progress: 0 = the section's top just entered at
   * the viewport bottom; 1 = the section's bottom just left the top.
   */
  traversal: number;
  /**
   * Pin progress for tall (sticky) sections: 0 = the section's top
   * reaches the viewport top (the pin engages); 1 = the section's
   * bottom reaches the viewport bottom (the pin releases).
   */
  pin: number;
}

export interface SheetScrollOptions {
  /** quiet time after the last scroll before the effect sleeps (ms) */
  settleMs?: number;
  /** run the frame once on mount/resize (initial paint correctness) */
  primeOnMount?: boolean;
  /**
   * R318 C2-S1 — runs BEFORE the settle frame and on resize: the
   * consumer's hook to drop its own document-geometry caches (the
   * settle frame that follows re-measures them lazily). Pure scroll
   * never calls it — only the two moments layout can change.
   */
  onRefresh?: () => void;
}

export function useSheetScroll(
  ref: React.RefObject<HTMLElement | null>,
  frame: (m: ScrollMetrics) => void,
  options: SheetScrollOptions = {},
): void {
  const settleMs = options.settleMs ?? 180;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const refreshRef = useRef(options.onRefresh);
  refreshRef.current = options.onRefresh;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;

    let unsub: (() => void) | null = null;
    let settleTimer = 0;

    /* `fresh` — reading outside the rAF loop (settle/prime): bump the
     * conductor generation first so this run never consumes a rect
     * cached by a previous frame, then read through the same batch. */
    const run = (fresh: boolean) => {
      if (fresh) freshSheetRects();
      const { rect, vh } = sheetRect(el);
      const traversalRaw = (vh - rect.top) / (vh + rect.height);
      const pinRaw =
        rect.height > vh ? -rect.top / (rect.height - vh) : traversalRaw;
      frameRef.current({
        rect,
        vh,
        traversal: clamp(traversalRaw, 0, 1),
        pin: clamp(pinRaw, 0, 1),
      });
    };

    const tick = () => run(false);

    const kick = () => {
      if (!unsub) {
        unsub = subscribeSheetFrame(tick);
      } else {
        wakeSheet();
      }
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        /* layout may have drifted while we were scrolling (fonts,
         * late media) — let the consumer drop its caches, then one
         * final fresh frame, then sleep. */
        refreshRef.current?.();
        run(true);
        if (unsub) {
          unsub();
          unsub = null;
        }
      }, settleMs);
    };

    const onResize = () => {
      refreshRef.current?.();
      kick();
    };

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    if (options.primeOnMount !== false) {
      /* prime the initial state without holding the clock (one frame —
       * fresh: the batch may hold nothing yet, but the bump keeps the
       * prime honest if a tick ran first) */
      requestAnimationFrame(() => {
        run(true);
      });
    }

    return () => {
      window.clearTimeout(settleTimer);
      if (unsub) unsub();
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', onResize);
    };
    /* options are read once by design (the frame + refresh callbacks
     * ride refs; only the settle/prime scalars belong to the deps). */
  }, [ref, settleMs, options.primeOnMount]);
}
