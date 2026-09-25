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
 * Viewport intelligence (wave 7-a, audit 0-c P1-6): flips above the
 * anchor when there is no room below, clamps inside the horizontal
 * bounds (RTL-aware logical placement), and caps its height so long
 * menus scroll internally instead of clipping. Closing plays a
 * scale-out exit before unmount (useDelayedUnmount).
 *
 * Wave 12-14 (audit 11-e P1-2 + P2 polish): the menu registers in
 * lib/overlayStack.ts while open — Escape answers only the topmost
 * layer (one press, one layer) and is consumed via
 * stopImmediatePropagation. The trigger's aria-expanded/aria-haspopup
 * are synced onto the anchor unless the consumer declares them itself.
 *
 * Pair with `<DropdownItem>` for the standard menu row, or render any
 * custom child (the keyboard nav scans for `[role="menuitem"]`).
 *
 * Non-item chrome (a user name/email card, 15-g P2-9): pass it via
 * `header` — it renders inside the panel but OUTSIDE the role=menu
 * element, because ARIA menus may own only menuitem/separator
 * children and a plain div inside the menu was announced as an
 * unnamed item in some screen-reader modes. Keyboard navigation
 * (arrows/Home/End scan menuitem roles) never reaches the header.
 */
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { overlayStack } from '../../lib/overlayStack';
import { useAnchoredPosition } from './anchoredPosition';
import { useAnchorAria } from './useAnchorAria';
import { useDelayedUnmount } from './useDelayedUnmount';
import { useOverlayRegistration } from './useOverlayRegistration';

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
  /**
   * Non-interactive chrome rendered above the list but outside the
   * role=menu element (15-g P2-9) — e.g. the account header card in
   * the topbar user menu. Styling belongs to the consumer's own
   * classes; the slot only owns placement.
   */
  header?: ReactNode;
  children: ReactNode;
}

export interface DropdownItemProps {
  onSelect: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export function Dropdown({
  open,
  onClose,
  anchorRef,
  placement = 'start',
  closeOnEscape = true,
  closeOnOutsideClick = true,
  ariaLabel,
  header,
  children,
}: DropdownProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const overlayId = useOverlayRegistration(open, 'dropdown');
  useAnchorAria(open, anchorRef, 'menu');
  const { rendered, onExitEnd } = useDelayedUnmount(open);
  const pos = useAnchoredPosition({ open, anchorRef, panelRef: menuRef, placement });

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
      if (e.key === 'Escape') {
        // Only the topmost overlay answers Escape (P1-2) — one press
        // dismisses one layer. The key is consumed even when Esc-dismiss
        // is disabled: layers below and global shortcuts must not act.
        if (!overlayStack.isTop(overlayId)) return;
        e.stopImmediatePropagation();
        if (closeOnEscape) {
          onClose();
          anchorRef.current?.focus?.();
        }
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
  }, [open, closeOnEscape, onClose, anchorRef, overlayId]);

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

  if (!rendered || !pos || typeof document === 'undefined') return null;

  return createPortal(
    // 15-g P2-9: the positioned panel is a plain container; the menu
    // SEMANTICS live on the inner list, so the optional header can sit
    // in the panel without violating the menu's owned-children contract.
    // menuRef stays on the outer panel: positioning measures the full
    // panel (header included) and click-outside must treat header
    // clicks as inside.
    <div
      ref={menuRef}
      className="dropdown"
      style={{ top: pos.top, left: pos.left, maxHeight: pos.maxHeight }}
      data-side={pos.flipped ? 'above' : 'below'}
      data-closing={!open ? 'true' : undefined}
      onAnimationEnd={(e) => {
        if (!open && e.animationName === 'madarek-popover-out') onExitEnd();
      }}
    >
      {header}
      <div role="menu" aria-label={ariaLabel} className="dropdown-list">
        {children}
      </div>
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
