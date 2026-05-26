/**
 * useReveal — IntersectionObserver-based reveal hook.
 *
 * Adds a class (default `in-view`) to the target ref when it enters
 * the viewport, used by `.reveal-up` / `.reveal-fade` CSS classes
 * for premium scroll-triggered fade/translate animations.
 *
 * Lightweight, no library, respects prefers-reduced-motion.
 */
import { useEffect, useRef } from 'react';

export function useReveal<T extends HTMLElement = HTMLElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour reduced-motion preference — show content immediately, no animation
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      el.classList.add('in-view');
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            if (options?.once !== false) obs.unobserve(e.target);
          } else if (options?.once === false) {
            e.target.classList.remove('in-view');
          }
        });
      },
      {
        threshold: options?.threshold ?? 0.12,
        rootMargin: options?.rootMargin ?? '0px 0px -8% 0px',
      },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return ref;
}

/**
 * Helper: wrap any block with a reveal-up animation.
 * Usage:
 *   <Reveal as="section" className="...">...</Reveal>
 */
import { createElement, type ReactNode, type ElementType } from 'react';

export function Reveal({
  as = 'div',
  className = '',
  children,
  delay,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  delay?: 1 | 2 | 3 | 4 | 5;
  [k: string]: unknown;
}) {
  const ref = useReveal<HTMLElement>();
  const cls = ['reveal-up', delay ? `reveal-d-${delay}` : '', className]
    .filter(Boolean)
    .join(' ');
  return createElement(as, { ref, className: cls, ...rest }, children);
}
