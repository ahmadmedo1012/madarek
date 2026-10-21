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
  /** Accessible name; required by ARIA. Ignored when `labelledById`
   *  points at a DOM title node (aria-labelledby then wins). */
  ariaLabel: string;
  /** r170-e (WCAG 2.4.6 / dialog practice): optional id of the element
   *  that carries the dialog's visible title — switches the card from
   *  aria-label to aria-labelledby so the name tracks the rendered
   *  heading (screen readers read what sighted users read). Optional on
   *  purpose: every existing ariaLabel-only caller keeps its contract. */
  labelledById?: string;
  /** r170-e: optional id of the element that describes the dialog body —
   *  rendered as aria-describedby so confirm bodies («تسليم نهائي»…)
   *  are announced instead of silently appearing. */
  describedById?: string;
  /** Optional children replacing the default body. */
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  labelledById,
  describedById,
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({ open, containerRef: cardRef, closeOnEscape, onClose, overlayKind: 'modal' });
  // r305 token alignment: the exit window must read the SAME token the
  // data-closing CSS animation consumes (components.css wave 7-a pins
  // every exit — .modal-overlay's madarek-overlay-out included — at
  // var(--motion-duration-short)). The old --motion-duration-medium read
  // only stretched the no-animationend safety net (320ms) past the real
  // 160ms exit; animationend-driven unmounts are unchanged.
  const { rendered, onExitEnd } = useDelayedUnmount(open, '--motion-duration-short');

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
        /* r170-e: when the caller renders a real title node, the name
           comes from it (aria-labelledby beats aria-label in the acc-name
           computation anyway — dropping the attribute keeps one source).
           ariaLabel-only callers are untouched. */
        aria-label={labelledById ? undefined : ariaLabel}
        aria-labelledby={labelledById}
        aria-describedby={describedById}
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
