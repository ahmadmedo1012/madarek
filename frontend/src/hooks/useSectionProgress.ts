import { useEffect, useRef } from 'react';

/**
 * useSectionProgress — rAF-throttled scroll progress (0…1) for a section,
 * written into a CSS variable (`--sp` by default) on the section element.
 *
 * The progress is 0 when the section's top hits the bottom of the
 * viewport and 1 when its bottom leaves the top — the classic
 * "scrub" range. Used by the landing's journey path and progress
 * orbit for scroll-linked storytelling WITHOUT pinning or scroll
 * hijacking: native scrolling, keyboard and reduced-motion all stay
 * untouched.
 *
 * prefers-reduced-motion → progress snaps to 1 (final composed state)
 * so no animation is required to see the complete picture.
 */
export function useSectionProgress<T extends HTMLElement = HTMLElement>(
  varName = '--sp',
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = rect.height + vh;
      const passed = vh - rect.top;
      const p = Math.max(0, Math.min(1, passed / total));
      el.style.setProperty(varName, p.toFixed(4));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    if (reduced) {
      el.style.setProperty(varName, '1');
      return;
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [varName]);

  return ref;
}
