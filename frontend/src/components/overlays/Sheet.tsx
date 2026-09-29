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
 * Wave 5-C4 (A10 P2-2) — the mobile package: header / body / footer
 * slots (the body is the scrolling region, so any content that
 * overflows the panel scrolls instead of being silently clipped by
 * the panel's `overflow: clip`), a `size` control ('fit' hugs the
 * content — bottom sheets default to it; 'full' stretches: side
 * sheets default to the contract's full-height panel), a grabber with
 * drag-to-dismiss on the bottom variant (the Toast's pointer-capture
 * swipe pattern, vertical), and `env(safe-area-inset-bottom)` padding
 * on the bottom panel (home-indicator clearance, .toast-stack parity).
 *
 * Usage:
 *   <Sheet open={isOpen} onClose={close} side="bottom" title="تصفية"
 *          footer={<Actions />}>
 *     …scrollable body…
 *   </Sheet>
 *
 *   side="end"   — sheet slides from the inline-end edge (right in LTR,
 *                  left in RTL). Best for filter / detail panels.
 *   side="start" — opposite edge.
 *   side="bottom"— slides up from the bottom; ideal for mobile.
 */
import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Icon } from '../Icon';
import { useFocusTrap } from './useFocusTrap';
import { useDelayedUnmount } from './useDelayedUnmount';

export type SheetSide = 'start' | 'end' | 'bottom';

/** Block-size control.
 *  - 'fit'  — the panel hugs its content: bottom sheets cap at
 *             min(85dvh, 720px) (the default there), side sheets
 *             center on the block axis instead of stretching.
 *  - 'full' — the panel stretches: side sheets take the full edge
 *             height (the elevation contract's filter/detail panel
 *             look — the default there), bottom sheets fill their
 *             85dvh cap. */
export type SheetSize = 'fit' | 'full';

/** Downward travel (px) after which a grabber drag dismisses the sheet. */
const DRAG_DISMISS_THRESHOLD_PX = 72;

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Edge from which the sheet slides in. Default 'end'. */
  side?: SheetSide;
  /** Block-size control; defaults per side (see SheetSize). */
  size?: SheetSize;
  /** Set false to disable click-outside dismissal. Defaults to true. */
  closeOnOverlayClick?: boolean;
  /** Set false to disable Esc dismissal. Defaults to true. */
  closeOnEscape?: boolean;
  /** Accessible name; required by ARIA. */
  ariaLabel: string;
  /** Visible header title — renders the .sheet-header row with the
   *  sheet's own close (X) affordance. Omit for a bare panel. */
  title?: string;
  /** Docked action row (.sheet-footer) — stays above the scrolling
   *  body instead of scrolling away with it. */
  footer?: ReactNode;
  children: ReactNode;
}

export function Sheet({
  open,
  onClose,
  side = 'end',
  size,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  title,
  footer,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({ open, containerRef: panelRef, closeOnEscape, onClose, overlayKind: 'sheet' });
  const { rendered, onExitEnd } = useDelayedUnmount(open, '--motion-duration-medium');
  const resolvedSize: SheetSize = size ?? (side === 'bottom' ? 'fit' : 'full');

  /* Grabber drag-to-dismiss (bottom sheets, touch only) — the Toast's
   * pointer-capture swipe pattern, vertical. Cascade note (measured
   * live, 5-C4): the entrance animation's `both` fill keeps applying
   * `transform: none` after it finishes, and animation declarations
   * outrank inline styles — a bare `panel.style.transform` never
   * painted (finger at −90px, computed transform still identity).
   * While a drag owns the panel, `data-dragging` suspends the
   * animation (components.css) so the inline transform is the truth;
   * the active phase tracks the finger directly, the release phase
   * springs a cancelled drag back. The drag state persists after a
   * cancelled drag — removing it would REPLAY the entrance keyframes —
   * and the exit animations (0,3,0) outspecify the suspension (0,2,0).
   * On dismissal the state is cleared but the dragged transform is
   * KEPT, so the exit keyframes' implicit `from` continues from the
   * finger instead of snapping back to rest. */
  const dragRef = useRef<{ startY: number; dy: number; moved: boolean } | null>(null);

  const onGrabPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || !open) return;
    const panel = panelRef.current;
    dragRef.current = { startY: e.clientY, dy: 0, moved: false };
    if (panel) {
      panel.dataset.dragging = 'true';
      panel.dataset.dragPhase = 'active';
    }
    // Touch pointers are implicitly captured per the pointer-events
    // model; the explicit call makes it airtight (absent in jsdom).
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onGrabPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const panel = panelRef.current;
    if (!drag || !panel) return;
    drag.dy = e.clientY - drag.startY;
    // Only downward travel drags the panel; an upward gesture is
    // scroll-intent and the panel returns to its resting position.
    if (drag.dy > 0) {
      drag.moved = true;
      panel.style.transform = `translateY(${drag.dy}px)`;
    } else {
      panel.style.transform = '';
    }
  };

  const endGrabDrag = (cancelled: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    const panel = panelRef.current;
    if (!panel || !drag) return;
    if (!cancelled && drag.moved && drag.dy > DRAG_DISMISS_THRESHOLD_PX) {
      panel.removeAttribute('data-dragging');
      panel.removeAttribute('data-drag-phase');
      onClose();
    } else {
      // Cancelled / short: spring back under the release-phase
      // transition; state persists (see docblock above).
      panel.dataset.dragPhase = 'release';
      panel.style.transform = '';
    }
  };

  if (!rendered || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`sheet-overlay sheet-overlay-${side}`}
      data-size={resolvedSize}
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
        /* Programmatic focus target for the trap's initial-focus fallback
           (A10 P2-1); -1 keeps the panel out of the Tab cycle. */
        tabIndex={-1}
      >
        {side === 'bottom' && (
          <div
            className="sheet-grabber"
            aria-hidden="true"
            onPointerDown={onGrabPointerDown}
            onPointerMove={onGrabPointerMove}
            onPointerUp={() => endGrabDrag(false)}
            onPointerCancel={() => endGrabDrag(true)}
          />
        )}
        {title !== undefined && (
          <header className="sheet-header">
            <h2 className="sheet-title">{title}</h2>
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              aria-label="إغلاق"
              data-close-button
            >
              <Icon icon={X} size={16} />
            </button>
          </header>
        )}
        <div className="sheet-body">{children}</div>
        {footer !== undefined && <footer className="sheet-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
