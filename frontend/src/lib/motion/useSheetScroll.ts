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
 */
import { useEffect, useRef } from 'react';
import { subscribeSheetFrame, wakeSheet, clamp } from './sheetConductor';

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
}

export function useSheetScroll(
  ref: React.RefObject<HTMLElement | null>,
  frame: (m: ScrollMetrics) => void,
  options: SheetScrollOptions = {},
): void {
  const settleMs = options.settleMs ?? 180;
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;

    let unsub: (() => void) | null = null;
    let settleTimer = 0;

    const run = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
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

    const tick = () => run();

    const kick = () => {
      if (!unsub) {
        unsub = subscribeSheetFrame(tick);
      } else {
        wakeSheet();
      }
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        /* one final frame after quiet, then sleep */
        run();
        if (unsub) {
          unsub();
          unsub = null;
        }
      }, settleMs);
    };

    const onResize = () => kick();

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    if (options.primeOnMount !== false) {
      /* prime the initial state without holding the clock (one frame) */
      requestAnimationFrame(() => {
        run();
      });
    }

    return () => {
      window.clearTimeout(settleTimer);
      if (unsub) unsub();
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options are read once by design
  }, [ref, settleMs, options.primeOnMount]);
}
