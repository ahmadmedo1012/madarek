/**
 * progressRegistry — R340 T-P1x — the landing's scroll-tied progress
 * seat register.
 *
 * The blind panel's criterion 7 (scroll feel & progress) measured the
 * reference at 7 scroll-tied progress elements (the boot-log, the
 * edge-to-edge rule, the % readout, …) against our 1. The fix is a
 * family of progress seats (ScrollRule's split rule pair + % readout +
 * tick rail, BootLog's counter + stage word + fill rail), and THIS
 * register is the honest inventory the conformance instrument reads
 * (`scripts/conformance/panel.mjs` — scrollProgress check):
 *
 *   window.__madarekProgress = [
 *     { el, label, range: [startPx, endPx] }  // document-scroll scrub range
 *   ]
 *
 * Honesty rules (the instrument enforces them, so a fake seat fails):
 *   · every entry must be a CONNECTED element with a non-degenerate
 *     range (end > start) — dead seats are unregistered on unmount;
 *   · every entry must actually MOVE with scroll — the instrument
 *     samples scroll 0 / 40% / 90% and diffs text/transform/opacity/
 *     background, so a registered-but-static element FAILS the check;
 *   · the visual accent must be the brand accent or ink family.
 *
 * The register is deliberately tiny (an array on window): it is
 * read-only surface for the instrument, never a render input. jsdom
 * safe (plain window property, no matchMedia dependency here).
 */

/** One scroll-tied progress seat (a real DOM element + its scrub range). */
export interface ProgressSeat {
  /** The element that visibly changes with document scroll. */
  el: HTMLElement;
  /** Short instrument-facing label, e.g. "scr-rule-top". */
  label: string;
  /**
   * Document-scroll scrub range in px: the seat animates while
   * window.scrollY moves through [start, end]. Components refresh the
   * array in place on resize (ranges are viewport-derived).
   */
  range: [number, number];
}

declare global {
  interface Window {
    __madarekProgress?: ProgressSeat[];
  }
}

/**
 * Register a progress seat; returns the unregister function (call on
 * unmount — the instrument fails seats that stopped moving, so a stale
 * entry is worse than none).
 */
export function registerProgressSeat(seat: ProgressSeat): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const w = window as Window & { __madarekProgress?: ProgressSeat[] };
  const list = (w.__madarekProgress ??= []);
  list.push(seat);
  return () => {
    const i = list.indexOf(seat);
    if (i >= 0) list.splice(i, 1);
  };
}
