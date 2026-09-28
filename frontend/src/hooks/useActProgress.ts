import { useEffect, useRef } from 'react';

/**
 * useActProgress — pinned-act scrub progress for the landing's cinema.
 *
 * A "pinned act" is a tall section (e.g. 260vh) whose stage is
 * position: sticky for exactly one viewport. The act's progress `p`
 * runs 0 → 1 across the PIN TRAVEL only:
 *
 *   p = −rect.top / (rect.height − viewportHeight)
 *
 * which is what choreography wants (states cross over while the frame
 * holds still). The value is written to a CSS variable (`--p`) on the
 * element; CSS calc() drives every layer from it. Native scrolling,
 * keyboard, and anchor jumps all keep working — no hijacking.
 *
 * prefers-reduced-motion → writes 1 once (the fully-composed frame),
 * so the complete picture is always reachable without animation.
 */
export function useActProgress<T extends HTMLElement = HTMLElement>(
  varName = '--p',
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
      const travel = Math.max(1, rect.height - vh);
      const p = Math.max(0, Math.min(1, -rect.top / travel));
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
