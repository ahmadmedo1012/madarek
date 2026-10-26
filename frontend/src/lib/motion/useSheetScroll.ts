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
 * R318 C2-S1 — the batch is now REAL and frame-scoped, and the tick is
 *  TWO-PHASE (read → write):
 *  · `run(false)` (the rAF tick) reads through the conductor's
 *    generation cache — the first read of an element in a tick serves
 *    every consumer of that same tick; nothing re-reads layout within
 *    the same frame.
 *  · the consumer's WRITE callback runs in a MICROTASK queued by the
 *    tick: all subscribers' reads happen in phase 1 (inside the one
 *    rAF task), all writes in phase 2 (when that task's stack empties,
 *    still before this frame's style/layout/paint). No consumer's
 *    geometry read can flush another consumer's var/dataset write —
 *    that interleave measured 2+ forced UpdateLayoutTree passes per
 *    scroll frame (~19ms each at 4×CPU); one flush per frame remains.
 *  · `run(true)` (the settle frame + the mount prime) runs OUTSIDE the
 *    rAF loop, so it bumps the generation first — it is never served a
 *    rect cached by a previous frame — and writes synchronously (it
 *    runs alone; nothing follows it in the same frame).
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
  /**
   * R319 §E-13 — the target's viewport rect, DERIVED per frame from a
   * document-space cache + `window.scrollY` (both free) on steady
   * ticks; only settle/prime/resize frames pay a real
   * `getBoundingClientRect`. Structural subset of DOMRect — every
   * field scrolls exactly (top/bottom shift by scrollY, the
   * horizontal box never moves on a vertical scroll).
   */
  rect: SheetRect;
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

/** the rect shape `ScrollMetrics.rect` carries (DOMRect satisfies it). */
export interface SheetRect {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly width: number;
  readonly height: number;
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
  /* R319 §E-13 — the target's DOCUMENT-space geometry. In-flow
   * elements never move in document space on pure scroll, so steady
   * ticks derive the viewport rect from this cache + scrollY with
   * ZERO layout reads. Measured on the R319 build @1440 4×CPU: the
   * old one-gBCR-per-consumer-per-frame (3 consumers: .jt/.wy/
   * #statement ≈ 450 reads per wheel run) averaged **1.42ms/read**
   * when style was dirty — the read FLUSHED the pending recalc of
   * that frame's IntersectionObserver `.in-view` writes + the
   * previous microtask's var writes inside the rAF task (a second
   * full pass then ran at render — 2× UpdateLayoutTree per frame,
   * the desktop's dominant remaining cost). The cache is dropped on
   * every fresh pass (settle/prime) and on resize — the same epochs
   * `onRefresh` covers; a mid-gesture layout change (late media)
   * drifts at most until the 180ms settle re-measures it, exactly
   * the trade JourneyScene's stationsDocRef already ships.
   * CONSTRAINT: the target must be in-flow (not `position: sticky` —
   * a stuck element's viewport rect drifts while its doc box does
   * not; sticky seats like the ≤991 `.jt-cam` keep their own live
   * `sheetRect` read). */
  const docGeoRef = useRef<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;

    let unsub: (() => void) | null = null;
    let settleTimer = 0;

    /* `fresh` — reading outside the rAF loop (settle/prime): bump the
     * conductor generation first so this run never consumes a rect
     * cached by a previous frame, then read through the same batch.
     * `deferred` — the rAF tick: the write callback moves to a
     * microtask so every subscriber reads (phase 1) before any of them
     * writes (phase 2). */
    const run = (fresh: boolean, deferred: boolean) => {
      if (fresh) {
        freshSheetRects();
        docGeoRef.current = null; // re-measure through the real batch
      }
      const vh = window.innerHeight;
      const cached = docGeoRef.current;
      let rect: SheetRect;
      if (cached) {
        const top = cached.top - window.scrollY;
        rect = {
          top,
          bottom: top + cached.height,
          left: cached.left,
          right: cached.left + cached.width,
          width: cached.width,
          height: cached.height,
        };
      } else {
        const live = sheetRect(el).rect;
        docGeoRef.current = {
          top: live.top + window.scrollY,
          left: live.left + window.scrollX,
          width: live.width,
          height: live.height,
        };
        rect = live;
      }
      const traversalRaw = (vh - rect.top) / (vh + rect.height);
      const pinRaw =
        rect.height > vh ? -rect.top / (rect.height - vh) : traversalRaw;
      const m: ScrollMetrics = {
        rect,
        vh,
        traversal: clamp(traversalRaw, 0, 1),
        pin: clamp(pinRaw, 0, 1),
      };
      if (deferred) {
        /* phase 2 — microtasks drain when the rAF task's stack empties:
         * after every subscriber's tick (their reads), before the
         * frame's style/layout/paint. Zero React renders, same frame. */
        queueMicrotask(() => {
          frameRef.current(m);
        });
      } else {
        frameRef.current(m);
      }
    };

    const tick = () => run(false, true);

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
         * final fresh frame (synchronous: it runs alone), then sleep. */
        refreshRef.current?.();
        run(true, false);
        if (unsub) {
          unsub();
          unsub = null;
        }
      }, settleMs);
    };

    const onResize = () => {
      /* layout CHANGED — the doc-geometry cache is stale by
       * construction (the whole point of the resize epoch). */
      docGeoRef.current = null;
      refreshRef.current?.();
      kick();
    };

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    if (options.primeOnMount !== false) {
      /* prime the initial state without holding the clock (one frame —
       * fresh: the batch may hold nothing yet, but the bump keeps the
       * prime honest if a tick ran first; synchronous: it runs alone) */
      requestAnimationFrame(() => {
        run(true, false);
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
