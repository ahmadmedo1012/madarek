/**
 * Sheet — overlay primitive that slides in from a viewport edge.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-4 + --z-sheet + --r-2xl on the leading edge of the sheet
 * (top-radius for `bottom`, leading-edge radius for `start`/`end`).
 *
 * Wave 7-a (audit 0-c P2-1): the exit animation plays before unmount
 * (useDelayedUnmount + data-closing) — side sheets slide back toward
 * their own edge (direction-aware via --motion-direction), bottom
 * sheets slide down. Wave 12-14: Escape answers one layer per press
 * and the scroll lock is ref-counted (overlayStack + scrollLock).
 * Wave 21-b (A9 P1-1): the ENTRANCE keyframes are direction-aware
 * too (madarek-sheet-slide-end/-start in components.css multiply the
 * translateX offset by --motion-direction), so an `end` sheet now
 * arrives FROM its own edge in RTL (left) instead of entering out of
 * the page interior.
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
import { useDelayedUnmount } from './useDelayedUnmount';

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
  useFocusTrap({ open, containerRef: panelRef, closeOnEscape, onClose, overlayKind: 'sheet' });
  const { rendered, onExitEnd } = useDelayedUnmount(open, '--motion-duration-medium');

  if (!rendered || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`sheet-overlay sheet-overlay-${side}`}
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
