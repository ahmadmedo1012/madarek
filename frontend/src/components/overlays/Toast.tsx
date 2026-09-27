/**
 * Toast — passive notification overlay primitive.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-3 + --r-lg + --z-toast (500), NO glass (the contract
 * forbids glass on non-overlapping surfaces).
 *
 * Two surfaces live here:
 *
 *   <Toast /> — the original controlled primitive (open/onClose),
 *     portals itself to document.body. Test-pinned contract
 *     (tests/unit/Toast.test.tsx) — see the rules below.
 *
 *   <ToastStack /> — the app-wide stack (audit 0-c P1-7/P1-8) mounted
 *     once at the App root; renders the lib/toast.ts store. Fixed to
 *     the bottom / inline-end corner (RTL-aware), safe-area aware,
 *     clears the mobile bottom-nav, pauses auto-dismiss on hover and
 *     focus, supports swipe-to-dismiss on touch, and plays a
 *     slide-down-fade exit before unmounting.
 *
 * Per the contract's co-existence rules (both surfaces):
 *   - Toasts do NOT steal focus when they appear.
 *   - Click events on a toast do NOT dismiss it; the close affordance
 *     (and the optional action) are the manual dismiss paths.
 *   - `error` variant requires manual dismiss (does NOT auto-dismiss).
 *   - Other variants auto-dismiss after `durationMs` (default 5000).
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Icon } from '../Icon';
import { useToastStore, type ToastItem } from '../../lib/toast';
import { readMotionDurationMs } from './useDelayedUnmount';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  open: boolean;
  onClose: () => void;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms (ignored when variant === 'error'). Default 5000. */
  durationMs?: number;
  /** Optional accessible label for the close button. Default "إغلاق". */
  closeLabel?: string;
  children: ReactNode;
}

const VARIANT_ROLE: Record<ToastVariant, 'status' | 'alert'> = {
  info: 'status',
  success: 'status',
  warning: 'status',
  error: 'alert',
};

export function Toast({
  open,
  onClose,
  variant = 'info',
  durationMs = 5000,
  closeLabel = 'إغلاق',
  children,
}: ToastProps) {
  const labelId = useId();

  // Latest-callback ref (audit 11-e P2-6): an inline onClose from the
  // parent must not re-run the auto-dismiss effect — otherwise every
  // parent re-render restarted the 5s clock and could defer dismissal
  // indefinitely.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (variant === 'error') return; // Error requires manual dismiss.
    const t = window.setTimeout(() => onCloseRef.current(), durationMs);
    return () => window.clearTimeout(t);
  }, [open, variant, durationMs]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`toast toast-${variant}`}
      role={VARIANT_ROLE[variant]}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-labelledby={labelId}
      data-toast
    >
      <div id={labelId} className="toast-body">
        {children}
      </div>
      <button
        type="button"
        className="toast-close"
        aria-label={closeLabel}
        onClick={onClose}
      >
        <Icon icon={X} size={14} />
      </button>
    </div>,
    document.body,
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ToastStack — the app-wide stacking region (wave 7-a).
   ═══════════════════════════════════════════════════════════════════ */

const VARIANT_ICON: Record<ToastVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

/** Horizontal travel (px) after which a touch swipe dismisses. */
const SWIPE_THRESHOLD_PX = 64;

/** Token + slack safety net when animationend never fires (jsdom etc.).
 * Read lazily per close (audit 11-e P2-7) — a module-load read would
 * freeze the value before CSS is parsed and ignore later
 * reduced-motion flips. */
function readExitFallbackMs(): number {
  return readMotionDurationMs('--motion-duration-short', 160) + 80;
}

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const remove = useToastStore((s) => s.remove);
  const cardRef = useRef<HTMLDivElement | null>(null);

  /* ── Auto-dismiss timer with pause-on-hover / pause-on-focus ── */
  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef(0);
  const remainingRef = useRef(item.durationMs);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current === null) return;
    remainingRef.current = Math.max(0, deadlineRef.current - Date.now());
    clearTimer();
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (item.variant === 'error' || item.closing || timerRef.current !== null) return;
    deadlineRef.current = Date.now() + remainingRef.current;
    timerRef.current = window.setTimeout(() => dismiss(item.id), remainingRef.current);
  }, [item.variant, item.closing, item.id, dismiss]);

  useEffect(() => {
    if (item.variant === 'error' || item.closing) {
      clearTimer();
      return;
    }
    remainingRef.current = item.durationMs;
    deadlineRef.current = Date.now() + item.durationMs;
    timerRef.current = window.setTimeout(() => dismiss(item.id), item.durationMs);
    return clearTimer;
  }, [item.id, item.variant, item.durationMs, item.closing, dismiss, clearTimer]);

  /* ── Exit: animationend drives the unmount, timer is the net ── */
  useEffect(() => {
    if (!item.closing) return;
    const fallbackMs = readExitFallbackMs();
    const t = window.setTimeout(() => remove(item.id), fallbackMs);
    return () => window.clearTimeout(t);
  }, [item.closing, item.id, remove]);

  /* ── Swipe-to-dismiss (touch only — pointer events, no capture UI) ──
   * Cascade note (measured live, 5-C4 — same defect as the Sheet
   * grabber): the entrance animation's `both` fill keeps applying
   * `transform: none` after it finishes and animation declarations
   * outrank inline styles, so the old bare `style.transform` never
   * painted (finger at −90px, computed transform still identity).
   * `data-dragging` suspends the animation while a drag owns the
   * card (notifications.css two-phase pattern); on dismissal the
   * state is cleared but the transform is KEPT so the exit keyframes'
   * implicit `from` continues from the finger. */
  const dragRef = useRef<{ startX: number; dx: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || item.closing) return;
    dragRef.current = { startX: e.clientX, dx: 0 };
    if (cardRef.current) {
      cardRef.current.dataset.dragging = 'true';
      cardRef.current.dataset.dragPhase = 'active';
    }
    // Touch pointers are implicitly captured per the pointer-events
    // model; the explicit call makes it airtight (absent in jsdom).
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pauseTimer();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !cardRef.current) return;
    drag.dx = e.clientX - drag.startX;
    cardRef.current.style.transform = `translateX(${drag.dx}px)`;
  };

  const endDrag = (cancelled: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    const card = cardRef.current;
    if (!card) return;
    if (!cancelled && Math.abs(drag?.dx ?? 0) > SWIPE_THRESHOLD_PX) {
      card.removeAttribute('data-dragging');
      card.removeAttribute('data-drag-phase');
      dismiss(item.id);
    } else {
      // Cancelled / short: spring back under the release-phase
      // transition; the state persists — removing it would REPLAY the
      // entrance keyframes (the exit rule outspecifies it, 0,3,0 both).
      card.dataset.dragPhase = 'release';
      card.style.transform = '';
      resumeTimer();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`toast toast-${item.variant}`}
      role={VARIANT_ROLE[item.variant]}
      aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
      data-closing={item.closing ? 'true' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => endDrag(false)}
      onPointerCancel={() => endDrag(true)}
      onPointerEnter={pauseTimer}
      onPointerLeave={resumeTimer}
      onFocusCapture={pauseTimer}
      onBlurCapture={(e) => {
        // Resume only when focus actually left the toast (not an
        // internal hop between the action and close buttons).
        if (!cardRef.current?.contains(e.relatedTarget as Node | null)) resumeTimer();
      }}
      onAnimationEnd={(e) => {
        if (e.animationName === 'madarek-toast-out') remove(item.id);
      }}
    >
      <span className={`toast-icon toast-icon-${item.variant}`} aria-hidden>
        <Icon icon={VARIANT_ICON[item.variant]} size={16} />
      </span>
      <div className="toast-body">
        <div className="toast-title">{item.title}</div>
        <div className="toast-desc">{item.message}</div>
        {item.action && (
          <button
            type="button"
            className="toast-action"
            onClick={() => {
              item.action?.onClick();
              dismiss(item.id);
            }}
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        className="toast-close"
        aria-label="إغلاق"
        onClick={() => dismiss(item.id)}
      >
        <Icon icon={X} size={14} />
      </button>
    </div>
  );
}

/**
 * The global toast region — mount ONCE (App root). Reads the toast
 * store; renders nothing when the stack is empty so it costs nothing
 * on pages that never toast.
 */
export function ToastStack() {
  const items = useToastStore((s) => s.items);
  if (items.length === 0 || typeof document === 'undefined') return null;
  return createPortal(
    <div className="toast-stack">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>,
    document.body,
  );
}
