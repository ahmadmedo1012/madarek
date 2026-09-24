/**
 * NotificationPanel — anchored panel for the notifications inbox.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-3 + --r-xl + --z-popover (200), glass.
 *
 * Behaviour mirrors Popover (anchored, click-outside dismiss, Esc
 * dismiss, no focus trap, no scroll lock) but uses the panel-shape
 * surface (--r-xl rounded only on the bottom corners — top corners
 * meet the topbar).
 *
 * Anchoring (wave 7-a, audit 0-c P1-6): the panel hangs from the
 * anchor's inline-end edge (RTL-aware), flips above the anchor when
 * there is no room below, and clamps inside the viewport — long lists
 * already scroll inside .notif-panel-list.
 *
 * Used by the bell icon in the topbar to drop down a list of recent
 * notifications.
 */
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPosition } from './anchoredPosition';
import { useDelayedUnmount } from './useDelayedUnmount';

export interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  /** Set false to disable Esc dismissal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Set false to disable click-outside dismissal. Defaults to true. */
  closeOnOutsideClick?: boolean;
  ariaLabel: string;
  children: ReactNode;
}

export function NotificationPanel({
  open,
  onClose,
  anchorRef,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  ariaLabel,
  children,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { rendered, onExitEnd } = useDelayedUnmount(open);
  // The panel hangs from the anchor's inline-end edge — the shared
  // "end" placement resolves that per writing direction.
  const pos = useAnchoredPosition({ open, anchorRef, panelRef, placement: 'end' });

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

  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, closeOnOutsideClick, onClose, anchorRef]);

  if (!rendered || !pos || typeof document === 'undefined') return null;

  // Keep the design cap from components.css (.notification-panel
  // max-block-size: min(540px, 80dvh)) — an inline max-height would
  // otherwise override the stylesheet's logical cap when the viewport
  // allows more room.
  const maxH = Math.min(pos.maxHeight, 540);

  return createPortal(
    <div
      ref={panelRef}
      className="notification-panel"
      role="dialog"
      aria-label={ariaLabel}
      style={{ top: pos.top, left: pos.left, maxHeight: maxH }}
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
