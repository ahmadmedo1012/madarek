import { useEffect, type RefObject } from 'react';

/**
 * useRevealOnScroll - Uses IntersectionObserver to add `.revealed` class to
 * elements with `.reveal` (or `.reveal-up`, `.reveal-scale`, `.reveal-fade`)
 * when they enter the viewport within a scroll container.
 *
 * @param containerRef - ref to the scroll container (e.g., AppShell's .content div)
 * @param options - IntersectionObserver options overrides
 */
export function useRevealOnScroll(
  containerRef: RefObject<HTMLElement | null>,
  options?: {
    threshold?: number;
    rootMargin?: string;
    selector?: string;
  },
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const selector = options?.selector ?? '.reveal, .reveal-up, .reveal-scale, .reveal-fade';
    const elements = container.querySelectorAll(selector);

    if (reducedMotion) {
      elements.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: container,
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '0px 0px -5% 0px',
      },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [containerRef, options?.threshold, options?.rootMargin, options?.selector]);
}
