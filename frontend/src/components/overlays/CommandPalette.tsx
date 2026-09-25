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
 *   - The exit animation plays before unmount (wave 21-a: the delayed
 *     unmount is wired on the component side — data-closing flips the
 *     entrance for the madarek-overlay-out / madarek-modal-out pair
 *     that components.css has been shipping dormant since wave 7-a)
 *
 * Global ⌘K/Ctrl-K triggers that OPEN a palette-like surface must bail
 * out while any overlay is open (audit 11-e P1-6) — see the guard
 * snippet in lib/overlayStack.ts. (Wave 21-a: the shell owns the ⌘K →
 * palette chord in AppShell; the old GlobalSearch ⌘K binding is gone.)
 */
import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';
import { useDelayedUnmount } from './useDelayedUnmount';

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
  // Exit window: keep the portal mounted while the CSS exit animations
  // (keyed on data-closing, components.css wave 7-a) play out. The
  // animationend on the overlay element ends the window immediately;
  // useDelayedUnmount's token-driven timeout is the safety net.
  const { rendered, onExitEnd } = useDelayedUnmount(open);
  useFocusTrap({ open, containerRef: cardRef, closeOnEscape, onClose, overlayKind: 'command-palette' });

  if (!rendered || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="cmd-palette-overlay"
      data-closing={!open ? 'true' : undefined}
      onClick={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
      onAnimationEnd={(e) => {
        // Only an animation that ENDED ON THE OVERLAY ITSELF closes the
        // exit window — the card's madarek-modal-out bubbles here too
        // (target = card ≠ overlay) and must not double-fire the
        // unmount. (The animationName check jsdom can't exercise —
        // it has no AnimationEvent constructor — and the only overlay
        // animations are the entrance pair, filtered by the !open
        // guard, and the exit pair this waits for.)
        if (!open && e.target === e.currentTarget) {
          onExitEnd();
        }
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
