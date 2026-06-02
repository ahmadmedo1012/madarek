import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

type AnimatedNumberProps = {
  value: number;
  /** BCP-47 locale; defaults to document language. */
  locale?: string;
  /** Intl.NumberFormat options. */
  format?: Intl.NumberFormatOptions;
  /** Override duration in ms. Default: 700. */
  durationMs?: number;
  /** Use tabular-nums to avoid digit-width jitter during count-up. */
  tabular?: boolean;
  className?: string;
  'data-testid'?: string;
};

/**
 * AnimatedNumber — smoothly animates from a previous value to the
 * current value when first activated (viewport entry) and on each
 * subsequent value change. Mid-flight retarget never restarts from
 * zero. Reduced-motion: snaps to the formatted target.
 *
 * See specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
 */
export function AnimatedNumber({
  value,
  locale,
  format,
  durationMs = 700,
  tabular = false,
  className,
  'data-testid': testId,
}: AnimatedNumberProps): JSX.Element {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [activated, setActivated] = useState(false);
  const [display, setDisplay] = useState<number>(0);
  const reduced = useReducedMotion();

  // Resolve locale once per change.
  const resolvedLocale =
    locale ??
    (typeof document !== 'undefined' ? document.documentElement.lang || undefined : undefined);

  // Activate on viewport entry.
  useEffect(() => {
    if (activated) return;
    const node = ref.current;
    if (!node) return;

    if (reduced) {
      setActivated(true);
      setDisplay(value);
      return;
    }

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setActivated(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setActivated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActivated(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [activated, reduced, value]);

  // Drive the count-up. Retarget mid-flight without restart.
  useEffect(() => {
    if (!activated) return;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const from = display;
    const to = value;
    if (from === to) return;

    let raf = 0;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic for natural deceleration.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // We intentionally exclude `display` so a retarget restarts from
    // the current displayed value without re-running the integrator
    // every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activated, reduced, value, durationMs]);

  // Format the displayed number per locale.
  const formatter = new Intl.NumberFormat(resolvedLocale, format);
  // Display integers crisply during count-up; preserve format precision at rest.
  const renderValue = activated ? display : 0;
  const isFloat = !!format && (format.maximumFractionDigits ?? 0) > 0;
  const text = formatter.format(isFloat ? renderValue : Math.round(renderValue));

  const style = tabular ? { fontVariantNumeric: 'tabular-nums' as const } : undefined;

  return (
    <span ref={ref} className={className} style={style} data-testid={testId}>
      {text}
    </span>
  );
}
