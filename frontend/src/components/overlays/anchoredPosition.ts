/**
 * Anchored-overlay viewport intelligence (audit 0-c P1-6) — shared by
 * Dropdown, Popover and NotificationPanel.
 *
 * Positioning model (physical px, RTL-aware semantics):
 *   - placement "start" — the panel's inline-start edge aligns with the
 *     anchor's inline-start edge (RTL-aware, unlike the old fixed
 *     `left: rect.left` which ignored direction).
 *   - placement "end" — trailing edges align (topbar user menu).
 *   - Vertical flip: when the panel doesn't fit below the anchor and
 *     there is more room above, it flips (data-side="above" re-aims the
 *     transform origin so the exit scale stays anchored to the trigger).
 *   - Clamp: the panel never leaves the viewport horizontally, and
 *     `maxHeight` caps it vertically so the list scrolls internally
 *     (overflow-y: auto — never `clip`, so every item stays reachable).
 *
 * Measurement discipline: two useLayoutEffect phases — an anchor-only
 * estimate mounts the panel, then a refinement pass reads the panel's
 * own box and lands the final position synchronously before paint.
 * Nothing measures per-render; resize/scroll repositions (robust,
 * already the established behavior). A one-shot rAF refine after the
 * initial pass is the post-mount safety net (audit 4-A2 P1-1): any
 * consumer whose panel mounts later than this effect's first run
 * (delayed-unmount wrappers, portal timing edges) still gets exactly
 * one re-measure with the real panel box instead of keeping the
 * pw=0 estimate forever.
 *
 * Wave 12-14 (audit 11-e P2-14): scroll/resize repositioning is
 * rAF-throttled, a scroll that originates INSIDE the panel (its own
 * list scrolling) never repositions it, and an unchanged position
 * bails out of the state write — no re-render per scroll frame.
 */
import { useLayoutEffect, useState, type RefObject } from 'react';

export type AnchorPlacement = 'start' | 'end';

export interface AnchoredPosition {
  top: number;
  left: number;
  /** Vertical px cap so tall panels scroll instead of clipping. */
  maxHeight: number;
  /** True when the panel flipped above the anchor. */
  flipped: boolean;
}

interface AnchoredOptions {
  gap?: number;
  viewportPadding?: number;
  /** Smallest scroll box we ever allow (tiny viewports still scroll). */
  minPanelHeight?: number;
}

const DEFAULT_GAP = 4;
const DEFAULT_PADDING = 8;
const DEFAULT_MIN_HEIGHT = 140;

export function computeAnchoredPosition(
  anchor: HTMLElement,
  panel: HTMLElement | null,
  placement: AnchorPlacement,
  opts: AnchoredOptions = {},
): AnchoredPosition {
  const gap = opts.gap ?? DEFAULT_GAP;
  const pad = opts.viewportPadding ?? DEFAULT_PADDING;
  const minH = opts.minPanelHeight ?? DEFAULT_MIN_HEIGHT;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = anchor.getBoundingClientRect();
  const pw = panel?.offsetWidth ?? 0;
  const ph = panel?.offsetHeight ?? 0;
  const isRtl = document.documentElement.dir === 'rtl';

  // Horizontal — logical placement resolved against writing direction.
  let left: number;
  if (placement === 'end') {
    left = isRtl ? r.left : r.right - pw;
  } else {
    left = isRtl ? r.right - pw : r.left;
  }
  if (pw > vw - pad * 2) {
    left = pad; // Wider than the viewport: pin to the padded edge.
  } else {
    left = Math.min(Math.max(left, pad), vw - pad - pw);
  }

  // Vertical — prefer below, flip above only when it buys real room.
  const roomBelow = vh - pad - r.bottom - gap;
  const roomAbove = r.top - pad - gap;
  const flip = ph > roomBelow && roomAbove > roomBelow;
  let top = flip ? r.top - gap - ph : r.bottom + gap;
  const maxTop = Math.max(pad, vh - pad - ph);
  top = Math.min(Math.max(top, pad), maxTop);

  return {
    top,
    left,
    maxHeight: Math.max(flip ? roomAbove : roomBelow, minH),
    flipped: flip,
  };
}

interface UseAnchoredPositionArgs extends AnchoredOptions {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  placement: AnchorPlacement;
}

/**
 * Two-phase anchored positioning. Returns the final position when
 * refined, else the anchor-only estimate (so the panel can mount), else
 * null (nothing to anchor against yet). While closing, the last
 * position is kept so the exit animation doesn't jump.
 */
export function useAnchoredPosition({
  open,
  anchorRef,
  panelRef,
  placement,
  gap,
  viewportPadding,
  minPanelHeight,
}: UseAnchoredPositionArgs): AnchoredPosition | null {
  const [estimate, setEstimate] = useState<AnchoredPosition | null>(null);
  const [pos, setPos] = useState<AnchoredPosition | null>(null);

  // Phase A — anchor-only estimate (mounts the panel in the DOM).
  useLayoutEffect(() => {
    if (!open) return; // keep the last position through the exit window
    const anchor = anchorRef.current;
    if (!anchor) {
      setEstimate(null);
      return;
    }
    setEstimate(computeAnchoredPosition(anchor, null, placement, { gap, viewportPadding, minPanelHeight }));
  }, [open, placement, anchorRef, gap, viewportPadding, minPanelHeight]);

  // Phase B — refine with the panel's own box + reposition on
  // resize/scroll (measure-on-event, never per-render). Scroll and
  // resize events are coalesced to one pass per animation frame; the
  // panel's own internal scrolling is ignored (it captures through to
  // window, but repositioning on it would both fight the reader and
  // re-render the panel every frame). The initial refine stays
  // synchronous so the first paint lands on the final position; the
  // one-shot schedule() right after it is the 4-A2 P1-1 post-mount
  // pass — if the panel wasn't mounted when the synchronous refine
  // ran (pw=0 estimate), the next frame re-measures with the real box
  // and the equality bail keeps the common case a no-op.
  useLayoutEffect(() => {
    if (!open || !estimate) return;
    let rafId = 0;
    const refine = () => {
      rafId = 0;
      const anchor = anchorRef.current;
      if (!anchor) return;
      const next = computeAnchoredPosition(anchor, panelRef.current, placement, {
        gap,
        viewportPadding,
        minPanelHeight,
      });
      setPos((prev) =>
        prev && prev.top === next.top && prev.left === next.left &&
          prev.maxHeight === next.maxHeight && prev.flipped === next.flipped
          ? prev
          : next,
      );
    };
    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(refine);
    };
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      schedule();
    };
    refine();
    schedule(); // 4-A2 P1-1: one post-mount refine (see the docblock)
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, estimate, placement, anchorRef, panelRef, gap, viewportPadding, minPanelHeight]);

  return pos ?? estimate;
}
