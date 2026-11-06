/* T-14 (r339) — Hairline: the 1px rule (canonical statement/chrome
 * grammar — bg technique, --rule-strong ink). aria-hidden: purely
 * graphical. variant: 'h' horizontal span (plabel/desc seat) · 'v'
 * vertical span (stmt/ticker seat) · 'border' structural edge. */
export function Hairline({ variant = 'h' }: { variant?: 'h' | 'v' | 'border' }) {
  const cls =
    variant === 'v'
      ? 'lp-hairline lp-hairline--v'
      : variant === 'border'
        ? 'lp-hairline lp-hairline--border'
        : 'lp-hairline lp-hairline--h';
  return <span className={cls} aria-hidden="true" />;
}
