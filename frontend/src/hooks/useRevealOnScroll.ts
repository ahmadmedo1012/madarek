import { useEffect, type RefObject } from 'react';

/**
 * useRevealOnScroll - Defensive reveal layer.
 *
 * Adds `.revealed` to elements with `.reveal*` classes when they enter
 * the viewport within the scroll container. Also reveals immediately
 * any element already in view at mount. This is a safety net on top of
 * useReveal so we never end up with permanently invisible content.
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

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const selector =
      options?.selector ??
      '.reveal, .reveal-up, .reveal-scale, .reveal-fade';

    const reveal = () => {
      const elements = container.querySelectorAll(selector);
      if (reducedMotion || typeof IntersectionObserver === 'undefined') {
        elements.forEach((el) => el.classList.add('revealed'));
        return null;
      }

      // Reveal anything currently in view (handles initial render)
      const containerRect = container.getBoundingClientRect();
      elements.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
          el.classList.add('revealed');
        }
      });

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
          threshold: options?.threshold ?? 0.05,
          rootMargin: options?.rootMargin ?? '0px 0px -5% 0px',
        },
      );
      elements.forEach((el) => observer.observe(el));
      return observer;
    };

    const observer = reveal();

    // Watch for new .reveal-* elements that mount after first paint
    // (lazy-loaded route content) and re-run the reveal pass.
    const mutationObs = new MutationObserver(() => {
      const elements = container.querySelectorAll(selector);
      const containerRect = container.getBoundingClientRect();
      elements.forEach((el) => {
        if (el.classList.contains('revealed')) return;
        if (reducedMotion) {
          el.classList.add('revealed');
          return;
        }
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
          el.classList.add('revealed');
        } else if (observer) {
          observer.observe(el);
        }
      });
    });
    mutationObs.observe(container, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      mutationObs.disconnect();
    };
  }, [containerRef, options?.threshold, options?.rootMargin, options?.selector]);
}
