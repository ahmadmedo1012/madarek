/**
 * Sheet — overlay primitive that slides in from a viewport edge.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-4 + --z-sheet + --r-2xl on the leading edge of the sheet
 * (top-radius for `bottom`, leading-edge radius for `start`/`end`).
 *
 * Usage:
 *   <Sheet open={isOpen} onClose={() => setIsOpen(false)} side="end" ariaLabel="Filters">
 *     ...
 *   </Sheet>
 *
 *   side="end"   — sheet slides from the inline-end edge (right in LTR,
 *                  left in RTL). Best for filter / detail panels.
 *   side="start" — opposite edge.
 *   side="bottom"— slides up from the bottom; ideal for mobile.
 */
import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';

export type SheetSide = 'start' | 'end' | 'bottom';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Edge from which the sheet slides in. Default 'end'. */
  side?: SheetSide;
  /** Set false to disable click-outside dismissal. Defaults to true. */
  closeOnOverlayClick?: boolean;
  /** Set false to disable Esc dismissal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Accessible name; required by ARIA. */
  ariaLabel: string;
  children: ReactNode;
}

export function Sheet({
  open,
  onClose,
  side = 'end',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({ open, containerRef: panelRef, closeOnEscape, onClose });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`sheet-overlay sheet-overlay-${side}`}
      onClick={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`sheet-panel sheet-panel-${side}`}
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
