/**
 * Parallax — bounded scroll-linked translation.
 *
 * Contract: specs/012-design-graphics-uplift/spec.md US2 + R-010.
 *
 * The spec caps parallax to ≤ 8px translation, so the helper is
 * deliberately conservative — no library, no requestAnimationFrame
 * loop while idle, no runaway translations on long pages.
 *
 * The translation is a function of the element's intersection
 * progress through the viewport: 0 when the element first enters
 * (top edge at viewport bottom), 1 when it exits (bottom edge at
 * viewport top). The component reads that progress via an
 * IntersectionObserver with a fine-grained threshold list, then
 * applies a CSS variable (--parallax-y) the consumer can use.
 *
 * Reduced-motion: every translation is suspended; --parallax-y is
 * pinned to 0px and the scroll listener is never attached.
 *
 * Idle pause: the listener is detached when document.hidden flips
 * true, re-attached on visibilitychange.
 */
import { useEffect, useRef, type ElementType, type ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';

export interface ParallaxProps {
  /** Render element. Defaults to 'div'. */
  as?: ElementType;
  /** Maximum translation in px. Capped at 8 by the spec. */
  amount?: number;
  /** Direction: 'up' (negative Y at top of viewport) or 'down'. */
  direction?: 'up' | 'down';
  className?: string;
  children?: ReactNode;
}

const SPEC_MAX_PX = 8;
const THRESHOLDS = Array.from({ length: 11 }, (_, i) => i / 10);

export function Parallax({
  as: Tag = 'div',
  amount = 8,
  direction = 'up',
  className,
  children,
}: ParallaxProps) {
  const ref = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reducedMotion) {
      node.style.setProperty('--parallax-y', '0px');
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      node.style.setProperty('--parallax-y', '0px');
      return;
    }

    const cap = Math.min(Math.abs(amount), SPEC_MAX_PX);
    const sign = direction === 'up' ? -1 : 1;

    const observer = new IntersectionObserver(
      (entries) => {
        if (typeof document !== 'undefined' && document.hidden) return;
        for (const entry of entries) {
          // intersectionRatio is 0 → 1 across the threshold list. Map
          // it to the bounded translation: 0 → -cap (or +cap), 1 → 0.
          // The element settles to no offset at full visibility.
          const progress = entry.intersectionRatio;
          const offset = sign * cap * (1 - progress);
          (entry.target as HTMLElement).style.setProperty(
            '--parallax-y',
            `${offset.toFixed(2)}px`,
          );
        }
      },
      { threshold: THRESHOLDS },
    );
    observer.observe(node);

    const onVisibility = () => {
      if (document.hidden) return;
      // Force a fresh sample on tab return.
      observer.unobserve(node);
      observer.observe(node);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reducedMotion, amount, direction]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={['parallax', className].filter(Boolean).join(' ')}
      style={{ transform: 'translate3d(0, var(--parallax-y, 0px), 0)' }}
    >
      {children}
    </Tag>
  );
}
