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
 * already the established behavior).
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
  // resize/scroll (measure-on-event, never per-render).
  useLayoutEffect(() => {
    if (!open || !estimate) return;
    const refine = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      setPos(
        computeAnchoredPosition(anchor, panelRef.current, placement, {
          gap,
          viewportPadding,
          minPanelHeight,
        }),
      );
    };
    refine();
    window.addEventListener('resize', refine);
    window.addEventListener('scroll', refine, true);
    return () => {
      window.removeEventListener('resize', refine);
      window.removeEventListener('scroll', refine, true);
    };
  }, [open, estimate, placement, anchorRef, panelRef, gap, viewportPadding, minPanelHeight]);

  return pos ?? estimate;
}
