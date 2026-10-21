import { cloneElement, forwardRef, useId } from 'react';
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
} from 'react';

/**
 * Button — canonical primitive that consumes the `.btn` token system
 * and adds a `loading` prop with no layout shift.
 *
 * Variants map to existing class names so this primitive is a drop-in
 * for `<button className="btn primary">` etc.
 *
 * Loading semantics:
 *   - Swaps the VISIBLE content to the canonical `.motion-spinner`;
 *     the real label stays in the DOM inside a visually-hidden span, so
 *     screen readers keep the button's actual name while it is busy
 *     (aria-busy announces the loading state).
 *     The button is NOT pixel-width-locked: the hidden span is
 *     absolutely positioned, so the button reflows to the spinner
 *     while loading (audit 11-e P2-5 — the old comment claimed width
 *     preservation it did not deliver).
 *   - Sets aria-busy="true" so screen readers announce the loading
 *     state.
 *   - Disables clicks via `aria-disabled` + native `disabled` so
 *     submission is blocked during the request.
 *
 * r305-A2 (lane 2-b) — opt-in control microinteractions (default OFF,
 * so every existing call site renders pixel-identical markup):
 *
 *   labelMotion?: boolean
 *     Wraps the children in a duplicate-label vertical slide structure
 *     (.btn-motion-label > .btn-motion-label-track, with the duplicate
 *     row .btn-motion-label-dup aria-hidden). The accessible name stays
 *     EXACTLY one copy of the label — the dup is aria-hidden and the
 *     loading branch (spinner + visually-hidden span) still takes
 *     precedence untouched when `loading` is set. leadingIcon renders
 *     outside/before the motion label. CSS lives in components.css
 *     (r305 section): hover rides the hover-capable media gate, the
 *     :focus-visible slide is ungated for keyboard parity; reduced
 *     motion snaps via the global token belt.
 *
 *   iconRight?: ReactNode
 *     Renders a decorative trailing icon AFTER the label inside a
 *     fixed 1.25em square (.btn-motion-icon) with an aria-hidden
 *     duplicate (.btn-motion-icon-dup); hover/focus-visible swaps the
 *     two along a direction-aware diagonal (RTL-safe via
 *     var(--motion-direction)). The whole container is aria-hidden —
 *     iconRight is decorative; the accessible name comes from the
 *     label text alone. Pass a single Lucide icon (e.g. <ArrowLeft />).
 *
 *   When both props are set, both render (label span, then icon span).
 *   The button root carries data-motion-label / data-motion-icon when
 *   the respective prop is active (CSS hooks + QA selectors).
 *
 * See specs/001-premium-motion-system/contracts/interaction-tokens.md
 */
export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'gold'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show in-button spinner; disables click; sets aria-busy. */
  loading?: boolean;
  /** Optional leading icon, rendered before children. */
  leadingIcon?: ReactNode;
  /** r305 (lane 2-b): opt-in duplicate-label vertical slide on
   *  hover/focus-visible. Default off — zero change for callers. The
   *  loading branch always wins over the motion wrapper. */
  labelMotion?: boolean;
  /** r305 (lane 2-b): decorative trailing icon (single Lucide icon)
   *  that swaps with an aria-hidden duplicate on hover/focus-visible
   *  along a direction-aware diagonal. Rendered after the label. */
  iconRight?: ReactNode;
};

const VARIANT_CLASS: Record<Exclude<ButtonVariant, 'default'>, string> = {
  primary: 'primary',
  accent: 'accent',
  gold: 'gold',
  ghost: 'ghost',
  outline: 'outline',
  danger: 'danger',
  // r157 (audit 6A11 #8): the .btn.success rule has been live since
  // the wave-5-c sweep (components.css, audit 0-e P1-28) — its only
  // consumer (OnlineExamsPages moderation) still hand-writes the
  // className; the primitive now carries the variant so the map is
  // honest about the full set.
  success: 'success',
};

const SIZE_CLASS: Partial<Record<ButtonSize, string>> = {
  sm: 'sm',
  lg: 'lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'md',
    loading = false,
    disabled,
    leadingIcon,
    labelMotion = false,
    iconRight,
    children,
    className,
    type = 'button',
    'aria-busy': ariaBusyProp,
    ...rest
  },
  ref,
) {
  const classes = [
    'btn',
    variant !== 'default' ? VARIANT_CLASS[variant] : null,
    SIZE_CLASS[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // While loading, the spinner replaces the visible content and the
  // real children move into a visually-hidden span: the accessible
  // name survives (the hidden span still names the button) while
  // aria-busy flags the in-flight request. See the header note on
  // width behavior.
  const isBusy = loading || ariaBusyProp === true || ariaBusyProp === 'true';
  const isDisabled = disabled === true || loading === true;

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={isBusy || undefined}
      data-loading={loading || undefined}
      data-motion-label={labelMotion || undefined}
      data-motion-icon={iconRight != null || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <span className="motion-spinner" aria-hidden="true" />
          <span className="visually-hidden">
            {leadingIcon}
            {children}
          </span>
        </>
      ) : (
        <>
          {leadingIcon}
          {labelMotion ? (
            /* r305 (lane 2-b): duplicate-label slide. The dup row is
               aria-hidden so the accessible name stays one copy of the
               label; testing-library's name computation skips it. */
            <span className="btn-motion-label">
              <span className="btn-motion-label-track">
                {children}
                <span className="btn-motion-label-dup" aria-hidden="true">
                  {children}
                </span>
              </span>
            </span>
          ) : (
            children
          )}
          {iconRight != null && (
            /* r305 (lane 2-b): decorative trailing arrow. The whole
               container is aria-hidden — decorative icons must not
               pollute the accessible name (the label names the button). */
            <span className="btn-motion-icon" aria-hidden="true">
              {iconRight}
              <span className="btn-motion-icon-dup" aria-hidden="true">
                {iconRight}
              </span>
            </span>
          )}
        </>
      )}
    </button>
  );
});

/* ─── Input ─────────────────────────────────────────────────
   Canonical input primitive. Adds a `loading` slot for
   data-bound inputs (e.g., async validation, autocomplete).
   The .input class itself lives in components.css and now
   consumes the focus / error / disabled tokens. */

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Right-aligned in-input spinner; sets cursor: progress. */
  loading?: boolean;
  /** Render an error border + ring; pair with aria-invalid. */
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { loading = false, error = false, className, ...rest },
  ref,
) {
  const cls = [
    'input',
    error && 'input-error',
    loading && 'input-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!loading) {
    return (
      <input
        ref={ref}
        className={cls}
        aria-invalid={error || undefined}
        {...rest}
      />
    );
  }

  return (
    <span className="input-affix" data-loading="true">
      <input
        ref={ref}
        className={cls}
        aria-invalid={error || undefined}
        aria-busy="true"
        {...rest}
      />
      <span className="motion-spinner input-affix-spinner" aria-hidden="true" />
    </span>
  );
});

/* ─── FormField ────────────────────────────────────────────
   Label + control + hint/error with the FULL ARIA association
   contract (A9 P2-4, 21-b): the label is htmlFor-wired, the error
   message is role="alert", and — the part every hand-rolled copy in
   the app was missing — the control itself gets aria-invalid plus
   aria-describedby pointing at the message id, so the error state is
   announced again on re-focus instead of living only in the initial
   alert. The control keeps its own consumer props; only the
   association attributes are injected (merged with any
   consumer-passed aria-describedby).

   Drop-in replacement for the hand-rolled patterns in
   TeacherPages.tsx (grade modal), ResearchReviewPage.tsx and
   curriculum/AuthoringModal.tsx (FormField/TimeInput) — migrating
   those callers is the page-wave hand-off.

   Usage:
     <FormField label="الدرجة" error={scoreError}>
       <Input type="number" value={score} onChange={…} />
     </FormField>
*/

/** Props FormField may inject into its child control element. */
type FieldControlProps = {
  id?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  'aria-describedby'?: string;
};

export function FormField({
  label,
  hint,
  error,
  id,
  className,
  style,
  children,
}: {
  /** Visible control label (htmlFor-wired to the control id). */
  label: ReactNode;
  /** Static helper copy under the control — always rendered when set. */
  hint?: ReactNode;
  /** Validation message — its presence marks the control aria-invalid. */
  error?: ReactNode;
  /** Explicit control id; defaults to a stable useId(). */
  id?: string;
  /** Extra classes on the field row (e.g. 'flex-1' inside a shared row
   *  grid — 5-C4: ExamAuthorPages' side-by-side field pairs). */
  className?: string;
  /** Inline row styles (same escape hatch as Card). */
  style?: CSSProperties;
  /** The control (input/select/textarea/Input …) — a single element. */
  children: ReactElement<FieldControlProps>;
}) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy =
    [hintId, errorId, children.props['aria-describedby']]
      .filter(Boolean)
      .join(' ') || undefined;

  const control = cloneElement(children, {
    id: controlId,
    ...(error ? { 'aria-invalid': true as const } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
  });

  return (
    <div className={['form-field', className].filter(Boolean).join(' ')} style={style}>
      <label className="form-field-label" htmlFor={controlId}>
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="form-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="form-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
