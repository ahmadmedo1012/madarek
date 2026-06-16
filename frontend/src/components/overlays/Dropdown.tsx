/**
 * Dropdown — menu-semantic anchored overlay.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-2 + --r-md + --z-dropdown (100). NO glass (per contract:
 * dropdowns are direct UI, not overlapping atmospheric surfaces).
 *
 * Differences from Popover:
 *   - role="menu" + items use role="menuitem"
 *   - Arrow Up / Arrow Down move focus across items
 *   - Home / End jump to first / last item
 *   - Enter activates the focused item
 *   - Tab dismisses (matches OS menu UX)
 *   - First item is auto-focused on open
 *
 * Pair with `<DropdownItem>` for the standard menu row, or render any
 * custom child (the keyboard nav scans for `[role="menuitem"]`).
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  /** 'start' (default) — leading edges align. 'end' — trailing edges align. */
  placement?: 'start' | 'end';
  /** Set false to disable Esc dismissal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Set false to disable click-outside dismissal. Defaults to true. */
  closeOnOutsideClick?: boolean;
  ariaLabel: string;
  children: ReactNode;
}

export interface DropdownItemProps {
  onSelect: () => void;
  disabled?: boolean;
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
  if (placement === 'end') {
    return { top: r.bottom + 4, left: isRtl ? r.left : 0, inlineEnd: !isRtl };
  }
  return { top: r.bottom + 4, left: r.left, inlineEnd: false };
}

export function Dropdown({
  open,
  onClose,
  anchorRef,
  placement = 'start',
  closeOnEscape = true,
  closeOnOutsideClick = true,
  ariaLabel,
  children,
}: DropdownProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<Position | null>(null);

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

  // Auto-focus first item on open.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
      first?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Esc + Tab dismiss + arrow-key nav.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus?.();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        onClose();
        anchorRef.current?.focus?.();
        return;
      }
      if (!menuRef.current) return;
      const items = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
      );
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = idx === -1 || idx === items.length - 1 ? 0 : idx + 1;
        items[next]!.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = idx <= 0 ? items.length - 1 : idx - 1;
        items[prev]!.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0]!.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]!.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, closeOnEscape, onClose, anchorRef]);

  // Click-outside dismiss.
  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
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
      ref={menuRef}
      className="dropdown"
      role="menu"
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}

export function DropdownItem({ onSelect, disabled, children }: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className="dropdown-item"
      aria-disabled={disabled || undefined}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onSelect();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="dropdown-separator" />;
}
