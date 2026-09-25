/**
 * CommandPalette — Cmd-K-style search-first overlay.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-5 + --z-modal (400, NOT --z-lightbox — Lightbox is for
 * media; CommandPalette sits at the modal level). Heavier blur than
 * Modal (per the contract).
 *
 * Per the contract:
 *   - DOES trap focus (uses useFocusTrap)
 *   - DOES lock body scroll (ref-counted scrollLock, wave 12-14)
 *   - DOES dismiss on Esc + backdrop click — Escape answers one layer
 *     per press while stacked (overlayStack, wave 12-14)
 *   - The search input is auto-focused on open
 *
 * Global ⌘K/Ctrl-K triggers that OPEN a palette-like surface must bail
 * out while any overlay is open (audit 11-e P1-6) — see the guard
 * snippet in lib/overlayStack.ts.
 */
import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Set false to disable backdrop click dismissal. Defaults to true. */
  closeOnOverlayClick?: boolean;
  /** Set false to disable Esc dismissal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Accessible name; required by ARIA. */
  ariaLabel: string;
  children: ReactNode;
}

export function CommandPalette({
  open,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  children,
}: CommandPaletteProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({ open, containerRef: cardRef, closeOnEscape, onClose, overlayKind: 'command-palette' });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="cmd-palette-overlay"
      onClick={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="cmd-palette-card"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
