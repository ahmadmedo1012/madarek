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
        <button type="button" className="btn ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'danger' : 'primary'}`}
          onClick={() => void handleConfirm()}
          disabled={loading}
          // Disable the cancel button's underlying click-outside path
          // while async confirm is running: Modal's closeOnOverlayClick
          // already gates on `loading`, but the cancel button itself
          // is also disabled to avoid double-submits.
        >
          {loading ? '...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
