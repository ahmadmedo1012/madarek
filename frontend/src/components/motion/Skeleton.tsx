import { useEffect, useRef, useState, type ReactNode } from 'react';

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
  /** Test hook. */
  'data-testid'?: string;
};

/**
 * Skeleton — variant-driven layout-shape-preserving placeholder.
 * Visual rules live in motion.css (.skeleton + .skeleton[data-variant]).
 *
 * See specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  rows = 1,
  className,
  ...rest
}: SkeletonProps): JSX.Element {
  const cls = ['skeleton', className].filter(Boolean).join(' ');
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  if ((variant === 'text' || variant === 'list-row') && rows > 1) {
    return (
      <span
        role="status"
        aria-label="جارٍ التحميل…"
        aria-busy="true"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2, 8px)' }}
        {...rest}
      >
        {Array.from({ length: rows }, (_, i) => (
          <span
            key={i}
            className={cls}
            data-variant={variant}
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
      role="status"
      aria-label="جارٍ التحميل…"
      aria-busy="true"
      className={cls}
      data-variant={variant}
      style={style}
      {...rest}
    />
  );
}

type SkeletonGroupProps = {
  children: ReactNode;
  className?: string;
  /** Threshold (ms) before the "still loading" cue appears. Default 4000. */
  stillLoadingAfterMs?: number;
};

/**
 * SkeletonGroup — wraps a set of Skeletons in a grid with the canonical
 * gap, and emits the "still loading…" reassurance cue after the
 * configured threshold (FR Edge Case: 4 seconds).
 */
export function SkeletonGroup({
  children,
  className,
  stillLoadingAfterMs = 4000,
}: SkeletonGroupProps): JSX.Element {
  const [stillLoading, setStillLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setStillLoading(true), stillLoadingAfterMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stillLoadingAfterMs]);

  const cls = ['skeleton-group', className].filter(Boolean).join(' ');
  return (
    <div className={cls} aria-live="polite">
      {children}
      <div
        className="skeleton-still-loading"
        data-visible={stillLoading || undefined}
      >
        لا يزال التحميل جارياً…
      </div>
    </div>
  );
}
