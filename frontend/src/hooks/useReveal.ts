/**
 * useReveal — IntersectionObserver-based reveal hook.
 *
 * Adds `.revealed` to the target ref when it enters the viewport, used by
 * `.reveal-up` / `.reveal` / `.reveal-scale` CSS classes for premium
 * scroll-triggered fade/translate animations.
 *
 * Lightweight, no library, respects prefers-reduced-motion. Falls back
 * to immediately revealing content if IntersectionObserver is missing
 * or if the element is already in view at mount.
 */
import { useEffect, useRef, createElement, type ReactNode, type ElementType } from 'react';

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

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      el.classList.add('revealed');
      return;
    }

    // If element is already on screen at mount, reveal immediately so we
    // never get stuck at opacity:0 (this was happening on the landing page
    // because the hero is in view at first paint).
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('revealed');
      if (options?.once !== false) return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            if (options?.once !== false) obs.unobserve(e.target);
          } else if (options?.once === false) {
            e.target.classList.remove('revealed');
          }
        });
      },
      {
        threshold: options?.threshold ?? 0.05,
        rootMargin: options?.rootMargin ?? '0px 0px -5% 0px',
      },
    );

    obs.observe(el);

    // Safety net: after 800ms, force-reveal anything still hidden to avoid
    // permanently invisible content on browsers/contexts where the observer
    // never fires (e.g. fixed-height ancestors with overflow:hidden).
    const safety = window.setTimeout(() => {
      el.classList.add('revealed');
    }, 800);

    return () => {
      obs.disconnect();
      window.clearTimeout(safety);
    };
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return ref;
}

/**
 * Helper: wrap any block with a reveal-up animation.
 * Usage:
 *   <Reveal as="section" className="...">...</Reveal>
 */
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
