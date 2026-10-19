import { useEffect, useRef } from 'react';

/**
 * useScrollStage — r191 scroll-choreography engine.
 *
 * The Turion reference (measured in docs/design/r191-turion-fidelity-spec.md)
 * drives its pinned narrative by mapping page scroll to a per-scene progress
 * value. This hook is Madarek's equivalent primitive: it measures where the
 * viewport is relative to a container's scroll span and writes ONE CSS
 * custom property (`--sp`, 0→1) on that container, coalesced to a single
 * rAF per frame, with ZERO React re-renders.
 *
 * All scene geometry (frame crossfades, node light-ups, ring rotation,
 * parallax translate, stat marching) is then derived from `--sp` in pure
 * CSS calc() — JS never touches elements per frame.
 *
 * Reduced motion: the caller's CSS is responsible for stacking frames in
 * normal flow under `prefers-reduced-motion` (the hook still writes --sp,
 * but the sheet ignores it); content stays fully readable, nothing hidden.
 */

export type ScrollStageOptions = {
  /** Progress = 0 when the element's top reaches this fraction of the
   * viewport (default 1.0 = element top at viewport bottom). */
  startOffset?: number;
  /** Progress = 1 when the element's bottom reaches this fraction of the
   * viewport (default 0.0 = element bottom at viewport top). */
  endOffset?: number;
};

export function useScrollStage<T extends HTMLElement>(
  opts: ScrollStageOptions = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const startOffset = opts.startOffset ?? 1;
    const endOffset = opts.endOffset ?? 0;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // y positions of the element's top/bottom in viewport space
      const top = rect.top;
      const bottom = rect.bottom;
      const startY = vh * startOffset; // where progress begins
      const endY = vh * endOffset - rect.height; // where it completes
      const span = startY - endY;
      const p = span > 0 ? (startY - top) / span : bottom < 0 ? 1 : 0;
      el.style.setProperty('--sp', p < 0 ? '0' : p > 1 ? '1' : p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Layout settles (fonts/images) can shift geometry — re-measure once
    // painted and again after load.
    const t1 = window.setTimeout(apply, 400);
    window.addEventListener('load', apply);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('load', apply);
      window.clearTimeout(t1);
      if (raf) cancelAnimationFrame(raf);
    };
    // opts are stable by design (inline literals at the single call site).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
