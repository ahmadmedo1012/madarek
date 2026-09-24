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
import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../overlays/Modal';
import { Icon } from '../Icon';
import { apiErrorMessage } from '../../hooks/useResources';

export function AuthoringModal({
  title,
  onClose,
  closeOnOverlayClick,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Defaults to true; pass false while a mutation is pending. */
  closeOnOverlayClick?: boolean;
  children: ReactNode;
}) {
  return (
    <Modal open onClose={onClose} ariaLabel={title} closeOnOverlayClick={closeOnOverlayClick}>
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
