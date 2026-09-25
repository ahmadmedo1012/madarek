import { forwardRef } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
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
 * See specs/001-premium-motion-system/contracts/interaction-tokens.md
 */
export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'gold'
  | 'ghost'
  | 'outline'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show in-button spinner; disables click; sets aria-busy. */
  loading?: boolean;
  /** Optional leading icon, rendered before children. */
  leadingIcon?: ReactNode;
};

const VARIANT_CLASS: Record<Exclude<ButtonVariant, 'default'>, string> = {
  primary: 'primary',
  accent: 'accent',
  gold: 'gold',
  ghost: 'ghost',
  outline: 'outline',
  danger: 'danger',
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
          {children}
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
