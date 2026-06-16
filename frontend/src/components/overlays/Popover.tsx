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
 * Positioning: simple fixed-position placement below the anchor's
 * bounding rect. Pass `placement="end"` to anchor the inline-end edge
 * to the trigger's inline-end (useful for menus that pop down-and-end).
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

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

interface Position {
  top: number;
  left: number;
  inlineEnd: boolean;
}

function readPosition(anchor: HTMLElement, placement: 'start' | 'end'): Position {
  const r = anchor.getBoundingClientRect();
  const isRtl = document.documentElement.dir === 'rtl';
  // For RTL, "inline start" is the right edge; "inline end" is the left.
  if (placement === 'end') {
    // Align trailing edges. In LTR, that's right edge. In RTL, that's left.
    return {
      top: r.bottom + 4,
      left: isRtl ? r.left : 0, // left will be derived from `right` below
      inlineEnd: !isRtl, // we'll position via `right: viewport.width - r.right`
    };
  }
  return { top: r.bottom + 4, left: r.left, inlineEnd: false };
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
  const [pos, setPos] = useState<Position | null>(null);

  // Recompute position when opening + on resize/scroll.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }
    const update = () => {
      if (anchorRef.current) setPos(readPosition(anchorRef.current, placement));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, placement, anchorRef]);

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

  if (!open || !pos || typeof document === 'undefined') return null;

  const style: React.CSSProperties = pos.inlineEnd
    ? {
        top: pos.top,
        right: window.innerWidth - (anchorRef.current?.getBoundingClientRect().right ?? 0),
      }
    : { top: pos.top, left: pos.left };

  return createPortal(
    <div
      ref={popoverRef}
      className="popover"
      role={role}
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
