/**
 * Toast — passive notification overlay primitive.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-3 + --r-lg + --z-toast (500), NO glass (the contract
 * forbids glass on non-overlapping surfaces).
 *
 * Per the contract's co-existence rules:
 *   - Toast does NOT steal focus when it appears.
 *   - Click events on a toast do NOT dismiss it; the close affordance
 *     is the only manual dismiss path.
 *   - `error` variant requires manual dismiss (does NOT auto-dismiss).
 *   - Other variants auto-dismiss after `durationMs` (default 5000).
 */
import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
        ×
      </button>
    </div>,
    document.body,
  );
}
