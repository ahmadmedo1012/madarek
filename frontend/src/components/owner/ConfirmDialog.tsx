import { useState } from 'react';
import { Modal } from '../overlays/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Confirmation dialog for destructive / irreversible actions.
 *
 * Wraps the shared `Modal` primitive so it inherits:
 *   - portal mount (renders above everything, escapes parent stacking contexts)
 *   - focus trap (Tab / Shift-Tab cycle inside the dialog)
 *   - Esc to cancel
 *   - body scroll lock while open
 *   - role="dialog" + aria-modal + accessible name
 *
 * Previously this rendered an inline overlay without any of those, leaving
 * keyboard and screen-reader users stranded on destructive actions.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onCancel} ariaLabel={title} closeOnOverlayClick={!loading}>
      <h3 className="owner-confirm-title">{title}</h3>
      <p className="owner-confirm-message">{message}</p>
      <div className="owner-confirm-actions">
        {/* Both buttons stay disabled while an async confirm runs, and the
            modal's overlay-click path is gated too (closeOnOverlayClick
            above) — a pending confirm can neither double-fire nor be
            dismissed midway. */}
        <button type="button" className="btn ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'danger' : 'primary'}`}
          onClick={() => void handleConfirm()}
          disabled={loading}
        >
          {loading ? 'جارٍ…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
