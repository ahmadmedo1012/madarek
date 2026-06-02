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
 * Used by the bell icon in the topbar to drop down a list of recent
 * notifications.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

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

interface Position {
  top: number;
  inlineEndPx: number; // distance from viewport's inline-end (rtl-aware)
}

function readPosition(anchor: HTMLElement): Position {
  const r = anchor.getBoundingClientRect();
  const isRtl = document.documentElement.dir === 'rtl';
  // The panel hangs from the anchor's inline-end edge.
  if (isRtl) {
    // In RTL, "inline-end" is the LEFT side of the viewport.
    return { top: r.bottom + 4, inlineEndPx: r.left };
  }
  return { top: r.bottom + 4, inlineEndPx: window.innerWidth - r.right };
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
  const [pos, setPos] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }
    const update = () => {
      if (anchorRef.current) setPos(readPosition(anchorRef.current));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef]);

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

  if (!open || !pos || typeof document === 'undefined') return null;

  const isRtl = document.documentElement.dir === 'rtl';
  const style: React.CSSProperties = isRtl
    ? { top: pos.top, left: pos.inlineEndPx }
    : { top: pos.top, right: pos.inlineEndPx };

  return createPortal(
    <div
      ref={panelRef}
      className="notification-panel"
      role="dialog"
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
