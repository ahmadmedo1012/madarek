/**
 * Shared scaffolding for the curriculum authoring dialogs
 * (lectures · chapters · checkpoints) — a consistent header + scrollable
 * body on top of the shared `Modal` primitive (portal, focus trap, Esc,
 * click-outside, body scroll lock) plus a labelled form field with an
 * inline Arabic error slot.
 *
 * No new CSS files: everything reuses global classes (.auth-input,
 * .auth-field-error, .auth-error, .btn) + design tokens inline, so the
 * panel matches the rest of the app without touching styles/.
 */
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../overlays/Modal';
import { ConfirmDialog } from '../owner/ConfirmDialog';
import { Icon } from '../Icon';
import { apiErrorMessage } from '../../hooks/useResources';

export function AuthoringModal({
  title,
  onClose,
  closeOnOverlayClick,
  closeOnEscape = true,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Defaults to true; pass false while a mutation is pending. */
  closeOnOverlayClick?: boolean;
  /** Defaults to true; pass false while a stacked dialog (e.g. the
   *  discard-confirm of useDiscardGuard) owns the Escape key. */
  closeOnEscape?: boolean;
  children: ReactNode;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel={title}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--sp-3)',
          padding: 'var(--sp-4) var(--sp-5) 0',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-h3)',
            fontWeight: 'var(--fw-bold, 700)',
          }}
        >
          {title}
        </h2>
        <button type="button" className="btn ghost sm" onClick={onClose} aria-label="إغلاق">
          <Icon icon={X} size={14} />
        </button>
      </header>
      <div
        style={{
          padding: 'var(--sp-4) var(--sp-5) var(--sp-5)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-3)',
        }}
      >
        {children}
      </div>
    </Modal>
  );
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={htmlFor} className="text-sm" style={{ fontWeight: 'var(--fw-semibold, 600)' }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <span className="text-xs text-muted" style={{ margin: 0 }}>{hint}</span>
      )}
      {error && (
        <span className="auth-field-error" role="alert" style={{ margin: 0 }}>
          {error}
        </span>
      )}
    </div>
  );
}

/** Form footer with cancel / submit — the submit button is type="submit"
 *  and must live INSIDE the <form> so the form's onSubmit (and Enter key)
 *  drives it; no separate onClick to avoid double submissions. */
export function ModalActions({
  pending,
  pendingLabel,
  submitLabel,
  onCancel,
  danger,
}: {
  pending: boolean;
  pendingLabel?: string;
  submitLabel: string;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 'var(--sp-2)',
        paddingTop: 'var(--sp-2)',
        borderTop: '1px solid var(--rule)',
        marginTop: 'var(--sp-1)',
      }}
    >
      <button type="button" className="btn ghost" onClick={onCancel} disabled={pending}>
        إلغاء
      </button>
      <button type="submit" className={`btn ${danger ? 'danger' : 'primary'}`} disabled={pending}>
        {pending ? (pendingLabel ?? 'جارٍ الحفظ…') : submitLabel}
      </button>
    </div>
  );
}

/** Inline mutation failure banner — prefers the API's Arabic message. */
export function MutationError({ error, fallback }: { error: unknown; fallback: string }) {
  if (!error) return null;
  return (
    <div className="auth-error" role="alert">
      {apiErrorMessage(error, fallback)}
    </div>
  );
}

/** Time input (mm:ss / seconds) — LTR digits inside an RTL page. */
export function TimeInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = '12:30',
  invalid,
  ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel: string;
}) {
  return (
    <input
      id={id}
      type="text"
      dir="ltr"
      inputMode="numeric"
      className="auth-input"
      style={invalid ? { borderColor: 'var(--danger)' } : undefined}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

/** Auto-generated id for FormField htmlFor wiring. */
export function useFieldId(prefix: string) {
  const uid = useId();
  return `${prefix}-${uid}`;
}

/**
 * Dirty-state close guard for the authoring form dialogs.
 *
 * Every close path of an authoring modal (Esc, the header X button, the overlay
 * click, the footer cancel button) normally calls onClose directly — with
 * unsaved edits that silently drops the teacher's draft. While `dirty` is
 * true and no mutation is pending, `requestClose` reroutes those paths
 * into a blocking ConfirmDialog instead, and a `beforeunload` listener
 * covers browser-level navigation (reload / tab close) for the same
 * window.
 *
 * While the discard-confirm is stacked, `escapeLocked` is true — pass it
 * to AuthoringModal's closeOnEscape so a stray Esc cannot dismiss both
 * dialogs at once (the topmost confirm handles Esc as its cancel).
 *
 * In-app SPA route changes (e.g. the browser back button) are NOT
 * interceptable from here: react-router's useBlocker requires a data
 * router and App still mounts a plain BrowserRouter — follow-up for the
 * routing wave once a createBrowserRouter migration lands.
 */
export function useDiscardGuard({
  dirty,
  pending,
  onClose,
}: {
  dirty: boolean;
  pending: boolean;
  onClose: () => void;
}): {
  /** Guarded close — wire to AuthoringModal onClose + ModalActions onCancel. */
  requestClose: () => void;
  /** True while the discard-confirm is stacked — disables Esc on the form modal. */
  escapeLocked: boolean;
  /** The stacked ConfirmDialog (portal-mounted) — render inside the modal tree. */
  guard: ReactNode;
} {
  const [confirming, setConfirming] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty && !pending) {
      setConfirming(true);
      return;
    }
    onClose();
  }, [dirty, pending, onClose]);

  // Browser unload (reload / tab close / external link) while dirty —
  // same pattern as the exam taker's live-attempt guard.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy requirement for Chrome/Edge to show the native prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const guard = confirming ? (
    <ConfirmDialog
      open
      title="تعديلات غير محفوظة"
      message="لديك تعديلات لم تُحفظ بعد. الإغلاق الآن يتخلّى عنها نهائياً."
      confirmLabel="التخلّي عن التعديلات"
      cancelLabel="متابعة التحرير"
      danger
      onConfirm={() => {
        setConfirming(false);
        onClose();
      }}
      onCancel={() => setConfirming(false)}
    />
  ) : null;

  return { requestClose, escapeLocked: confirming, guard };
}
