/**
 * Lightbox — fullscreen image / media viewer.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-5 + --z-lightbox (600). NO glass — the contract uses an
 * 85% black scrim instead so media reads cleanly above it.
 *
 * Per the contract:
 *   - DOES trap focus (uses the shared useFocusTrap hook).
 *   - DOES lock body scroll while open.
 *   - DOES dismiss on Esc, on backdrop click, and via the close button.
 *   - z-index 600 — above every other overlay.
 */
import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';

export interface LightboxProps {
  open: boolean;
  onClose: () => void;
  /** Set false to disable backdrop click dismissal. Defaults to true. */
  closeOnOverlayClick?: boolean;
  /** Set false to disable Esc dismissal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Accessible name; required by ARIA. */
  ariaLabel: string;
  /** Optional accessible label for the close button. Default "إغلاق". */
  closeLabel?: string;
  children: ReactNode;
}

export function Lightbox({
  open,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  closeLabel = 'إغلاق',
  children,
}: LightboxProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({ open, containerRef: contentRef, closeOnEscape, onClose });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="lightbox-overlay"
      onClick={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={contentRef}
        className="lightbox-content"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <button
          type="button"
          className="lightbox-close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
