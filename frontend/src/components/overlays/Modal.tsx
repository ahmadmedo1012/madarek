/**
 * Modal — first overlay primitive of the elevation language
 * (012-design-graphics-uplift contracts/elevation-language.md).
 *
 * Wraps the existing `.modal-overlay` / `.modal-card` markup
 * (already uses --elev-4 + --z-modal after the T060 sweep) with:
 *   - portal mount on document.body
 *   - focus trap (Tab/Shift-Tab cycle) via useFocusTrap
 *   - Esc to close — one layer per press (overlayStack, wave 12-14)
 *   - click-outside on the overlay to close
 *   - body scroll lock while open (ref-counted scrollLock, wave 12-14)
 *   - wave 7-a: scale-fade EXIT animation before unmount
 *     (useDelayedUnmount + data-closing — audit 0-c P2-1)
 *
 * Other primitives (Sheet, Popover, Dropdown, Toast, …) follow the
 * same pattern.
 */
import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';
import { useDelayedUnmount } from './useDelayedUnmount';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Set false to disable click-outside dismissal. Defaults to true. */
  closeOnOverlayClick?: boolean;
  /** Set false to disable Esc dismissal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Accessible name; required by ARIA. */
  ariaLabel: string;
  /** Optional children replacing the default body. */
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({ open, containerRef: cardRef, closeOnEscape, onClose, overlayKind: 'modal' });
  const { rendered, onExitEnd } = useDelayedUnmount(open, '--motion-duration-medium');

  if (!rendered || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay"
      data-closing={!open ? 'true' : undefined}
      onClick={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
      onAnimationEnd={(e) => {
        if (!open && e.animationName === 'madarek-overlay-out') onExitEnd();
      }}
    >
      <div
        ref={cardRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        /* Programmatic focus target for the trap's initial-focus fallback
           (A10 P2-1): a dialog with no content focusables opens on its
           own context instead of the close (X) button. -1 keeps the card
           out of the Tab cycle. */
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
