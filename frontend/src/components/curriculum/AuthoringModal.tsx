/**
 * Shared scaffolding for the curriculum authoring dialogs
 * (lectures · chapters · checkpoints) — a consistent header + scrollable
 * body on top of the shared `Modal` primitive (portal, focus trap, Esc,
 * click-outside, body scroll lock) plus the shared FormField primitive
 * from primitives/Form.tsx (23-b migration, A9 P2-4).
 *
 * No new CSS files: everything reuses global classes (.auth-input,
 * .form-field*, .auth-error, .btn) + design tokens inline, so the
 * panel matches the rest of the app without touching styles/.
 */
import { useCallback, useEffect, useId, useState, type ReactElement, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../overlays/Modal';
import { ConfirmDialog } from '../owner/ConfirmDialog';
import { Icon } from '../Icon';
import { Button, FormField as SharedFormField } from '../primitives/Form';
import { apiErrorMessage } from '../../hooks/useResources';

export function AuthoringModal({
  title,
  onClose,
  closeOnOverlayClick,
  closeOnEscape = true,
  pending = false,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Defaults to true; pass false while a mutation is pending. */
  closeOnOverlayClick?: boolean;
  /** Defaults to true; pass false while a stacked dialog (e.g. the
   *  discard-confirm of useDiscardGuard) owns the Escape key. */
  closeOnEscape?: boolean;
  /** True while the form's mutation is in flight — disables the header
   *  X (requestClose is already a no-op while pending via r157; the
   *  exam modals' disabled-X idiom makes that contract visible). */
  pending?: boolean;
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
        {/* The exam modals' X-disable idiom (ExamAuthorPages): while a
         *  mutation is pending the guard's requestClose is a safe no-op,
         *  but a clickable X promises a close it will not deliver. */}
        <button
          type="button"
          className="btn ghost sm"
          onClick={onClose}
          aria-label="إغلاق"
          disabled={pending}
        >
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

/* Thin re-export of the platform FormField under the signature the
 * curriculum builders consume (label + htmlFor + hint + error around a
 * single control). 23-b (21-b hand-off, A9 P2-4): the implementation
 * delegates to primitives/Form.tsx FormField, which adds the half the
 * hand-rolled copy never had — aria-invalid + aria-describedby injected
 * into the control, with the error re-announced via role=alert — while
 * the visual row moves from inline styles to the shared .form-field
 * classes (components.css). Behavior note: the shared primitive keeps
 * the hint rendered beside an error (the old local copy hid it), so the
 * format hint (e.g. «بصيغة دقائق:ثوانٍ») stays available exactly when
 * the teacher needs it to fix the invalid value. */
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
  /** A single control element (input/textarea/TimeInput) — the
   * primitive injects the id + aria wiring into it. */
  children: ReactElement;
}) {
  return (
    <SharedFormField label={label} id={htmlFor} hint={hint} error={error}>
      {children}
    </SharedFormField>
  );
}

/** Form footer with cancel / submit — the submit button is type="submit"
 *  and must live INSIDE the <form> so the form's onSubmit (and Enter key)
 *  drives it; no separate onClick to avoid double submissions.
 *
 *  The shared Button primitive's loading grammar (the exam modals'
 *  idiom): while `pending` the button shows the canonical spinner, sets
 *  aria-busy + data-loading and disables itself, while the label-swap
 *  children (the Arabic pending label) ride the primitive's
 *  visually-hidden span — so screen readers announce «جارٍ الحفظ…»
 *  exactly like the exam surfaces' submits. */
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
      <Button variant="ghost" onClick={onCancel} disabled={pending}>
        إلغاء
      </Button>
      <Button
        variant={danger ? 'danger' : 'primary'}
        type="submit"
        loading={pending}
      >
        {pending ? (pendingLabel ?? 'جارٍ الحفظ…') : submitLabel}
      </Button>
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

/** Time input (mm:ss / seconds) — LTR digits inside an RTL page.
 * 23-b: forwards the ARIA state FormField injects (aria-invalid /
 * aria-describedby) onto the real <input> — the previous explicit-props
 * copy silently swallowed cloned-in attributes. */
export function TimeInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = '12:30',
  invalid,
  ariaLabel,
  ...rest
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel: string;
  /** Injected by FormField — forwarded to the input. */
  'aria-invalid'?: boolean | 'false' | 'true';
  'aria-describedby'?: string;
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
      {...rest}
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
 * window. While `pending` is true `requestClose` is a NO-OP (r157): the
 * form must not unmount with a mutation still in flight.
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
    // r157 (audit 6A11 #2): a no-op while a mutation is in flight —
    // closing the form mid-request would drop the teacher's draft with
    // the mutation still unresolved (its onClose path is exactly the
    // silent drop this guard exists to prevent). ModalActions already
    // disables the cancel button while pending; this closes the Esc /
    // header-X / overlay legs of the same contract (the builders wire
    // closeOnEscape={!escapeLocked && !pending} for the Esc leg).
    if (pending) return;
    if (dirty) {
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
