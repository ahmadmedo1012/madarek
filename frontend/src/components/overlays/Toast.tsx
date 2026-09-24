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

  useEffect(() => {
    if (!open) return;
    if (variant === 'error') return; // Error requires manual dismiss.
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [open, variant, durationMs, onClose]);

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
/** Token + slack safety net when animationend never fires (jsdom etc.). */
const EXIT_FALLBACK_MS = readExitFallbackMs();

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
    const t = window.setTimeout(() => remove(item.id), EXIT_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [item.closing, item.id, remove]);

  /* ── Swipe-to-dismiss (touch only — pointer events, no capture UI) ── */
  const dragRef = useRef<{ startX: number; dx: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || item.closing) return;
    dragRef.current = { startX: e.clientX, dx: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    pauseTimer();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !cardRef.current) return;
    drag.dx = e.clientX - drag.startX;
    cardRef.current.style.transition = 'none';
    cardRef.current.style.transform = `translateX(${drag.dx}px)`;
  };

  const endDrag = (cancelled: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!cardRef.current) return;
    // Clear the dragged transform so the exit keyframe interpolates
    // cleanly (keyframes beat inline style once the animation starts).
    cardRef.current.style.transition = '';
    cardRef.current.style.transform = '';
    if (!cancelled && Math.abs(drag?.dx ?? 0) > SWIPE_THRESHOLD_PX) {
      dismiss(item.id);
    } else {
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
