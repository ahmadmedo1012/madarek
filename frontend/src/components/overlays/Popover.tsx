/**
 * Popover — anchored overlay primitive.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-3 + --r-lg + --z-popover (200), subtle glass.
 *
 * Differences from Modal/Sheet:
 *   - NO focus trap (per contract: "Popovers and Dropdowns do NOT
 *     trap focus").
 *   - NO body scroll lock (popover doesn't take over the viewport).
 *   - DOES dismiss on click-outside.
 *   - DOES dismiss on Esc.
 *   - Positioned relative to an `anchorRef` element, below by default.
 *
 * Viewport intelligence (wave 7-a, audit 0-c P1-6): flips above the
 * anchor when there is no room below, clamps inside the horizontal
 * bounds (RTL-aware logical placement), caps its height with internal
 * scrolling (never `clip`), and plays a scale-out exit before
 * unmounting. Repositions on resize/scroll — measured on event, never
 * per-render.
 */
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPosition } from './anchoredPosition';
import { useDelayedUnmount } from './useDelayedUnmount';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** Element to anchor against. The popover is positioned below it. */
  anchorRef: RefObject<HTMLElement | null>;
  /** 'start' (default) — leading edges align. 'end' — trailing edges align. */
  placement?: 'start' | 'end';
  /** Set false to disable Esc dismissal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Set false to disable click-outside dismissal. Defaults to true. */
  closeOnOutsideClick?: boolean;
  /** Accessible name; required by ARIA when role="dialog". */
  ariaLabel?: string;
  /** Custom role (defaults to "dialog"). Use "menu" for Dropdowns. */
  role?: 'dialog' | 'menu';
  children: ReactNode;
}

export function Popover({
  open,
  onClose,
  anchorRef,
  placement = 'start',
  closeOnEscape = true,
  closeOnOutsideClick = true,
  ariaLabel,
  role = 'dialog',
  children,
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const { rendered, onExitEnd } = useDelayedUnmount(open);
  const pos = useAnchoredPosition({ open, anchorRef, panelRef: popoverRef, placement });

  // Esc dismiss.
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeOnEscape, onClose]);

  // Click-outside dismiss. The trigger element's click is excluded so
  // the toggle pattern (click trigger to open OR close) keeps working.
  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, closeOnOutsideClick, onClose, anchorRef]);

  if (!rendered || !pos || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="popover"
      role={role}
      aria-label={ariaLabel}
      style={{ top: pos.top, left: pos.left, maxHeight: pos.maxHeight }}
      data-side={pos.flipped ? 'above' : 'below'}
      data-closing={!open ? 'true' : undefined}
      onAnimationEnd={(e) => {
        if (!open && e.animationName === 'madarek-popover-out') onExitEnd();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
