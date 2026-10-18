export type SkeletonVariant = 'text' | 'kpi' | 'card' | 'chart' | 'list-row' | 'avatar';

type SkeletonProps = {
  variant?: SkeletonVariant;
  /** Override width (e.g., '60%'). */
  width?: string;
  /** Override height. */
  height?: string;
  /** For 'text' / 'list-row' variants — number of repeated rows. */
  rows?: number;
  className?: string;
  /**
   * Opt-in busy semantics (r157, audit 6A11 #5): without it the bars are
   * aria-hidden — decorative layout placeholders, the same contract the
   * States.tsx skeleton family keeps (its bars are aria-hidden inside an
   * explicit aria-busy wrapper). Pass an Arabic label to mark the real
   * loading state for the surface that needs it announced (the role=
   * status + aria-busy land on the element, or on the rows wrapper for
   * repeated rows).
   */
  'aria-label'?: string;
  /** Test hook. */
  'data-testid'?: string;
};

/**
 * Skeleton — variant-driven layout-shape-preserving placeholder.
 * Visual rules live in motion.css (.skeleton + .skeleton[data-variant]).
 *
 * aria contract (r157): the bars are SILENT by default (aria-hidden) —
 * pure layout scaffolding, never a status announcement. The consumer
 * that needs a screen-reader loading cue passes `aria-label`, which
 * upgrades the element (or the rows wrapper) to role="status" +
 * aria-busy with that name.
 *
 * See specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  rows = 1,
  className,
  'aria-label': ariaLabel,
  ...rest
}: SkeletonProps): JSX.Element {
  const cls = ['skeleton', className].filter(Boolean).join(' ');
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  if ((variant === 'text' || variant === 'list-row') && rows > 1) {
    return (
      <span
        role={ariaLabel ? 'status' : undefined}
        aria-label={ariaLabel}
        aria-busy={ariaLabel ? 'true' : undefined}
        aria-hidden={ariaLabel ? undefined : true}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
        {...rest}
      >
        {Array.from({ length: rows }, (_, i) => (
          <span
            key={i}
            className={cls}
            data-variant={variant}
            aria-hidden
            // last text row is a bit shorter — visual rhythm
            style={
              variant === 'text' && i === rows - 1 && !width
                ? { ...style, width: '70%' }
                : style
            }
          />
        ))}
      </span>
    );
  }

  return (
    <span
      role={ariaLabel ? 'status' : undefined}
      aria-label={ariaLabel}
      aria-busy={ariaLabel ? 'true' : undefined}
      aria-hidden={ariaLabel ? undefined : true}
      className={cls}
      data-variant={variant}
      style={style}
      {...rest}
    />
  );
}
