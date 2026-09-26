import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * useScrollProgress — maps an element's travel through the viewport to a
 * 0…1 progress value, the scrub foundation for scroll-choreographed
 * scenes (immersive-redesign wave 1).
 *
 * Definition: progress 0 when the element's box START enters the bottom
 * of the viewport, 1 when its END leaves the top (configurable via
 * `start`/`end` insets). This is the "scroll as timeline" primitive the
 * reference-site analysis recommends — a continuous, reversible signal
 * (not a one-shot reveal like Reveal.tsx).
 *
 * Engineering rules honored (see scripts/check-motion-tokens.sh policy):
 *   · rAF-throttled scroll listener (passive) — no layout thrash:
 *     geometry is read once per frame in the callback, never per event.
 *   · Optional inertial smoothing (lerp toward the raw value) gives the
 *     "expensive feel" of momentum WITHOUT hijacking scroll — the
 *     element eases, the scroll stays native (immersive plan §5).
 *   · prefers-reduced-motion: smoothing is disabled and updates are
 *     quantized (default 0.05 steps) so consumers render discrete
 *     states, not continuous animation. Quantization also caps render
 *     count for every consumer at ~20 per crossing.
 *   · Cleans up listeners + frames on unmount; pauses when the tab is
 *     hidden (visibilitychange) and while the element is fully outside
 *     the viewport with no pending lerp (IntersectionObserver gate —
 *     off-screen scenes cost zero main-thread work).
 *   · SSR/jsdom-safe: no window at module scope; missing APIs degrade
 *     to progress 0 with listeners intact where possible.
 *
 * See docs/immersive-redesign-plan.md §8.
 */
export type UseScrollProgressOptions = {
  /**
   * Viewport inset (px) at which progress starts: the element edge must
   * rise above (viewport bottom − start). Default 0.
   */
  start?: number;
  /**
   * Viewport inset (px) at which progress completes: the element edge
   * must fall below (viewport top + end). Default 0.
   */
  end?: number;
  /**
   * Lerp factor per frame toward the raw value (0 = instant, 1 = never
   * arrives). Clamped to (0, 0.5]. Ignored under reduced motion.
   * Default 0.18 — one settling arc in ~10 frames at 60fps.
   */
  smoothing?: number;
  /**
   * Reduced-motion quantization step. The reported progress snaps to
   * multiples of this step (0 disables snapping). Default 0.05.
   */
  step?: number;
};

/**
 * Returns a ref to attach to the scene element and the live 0…1
 * progress. The third tuple slot is the smooth-value REF (stable
 * identity) for consumers that paint on rAF — e.g. ConstellationCanvas
 * — so they read live values without subscribing to re-renders.
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollProgressOptions = {},
): [React.RefObject<T>, number, React.MutableRefObject<number>] {
  const { start = 0, end = 0, smoothing = 0.18, step = 0.05 } = options;
  const reduced = useReducedMotion();
  const ref = useRef<T | null>(null);
  // Raw + smoothed live in refs; only quantized/committed values go
  // through setState to bound re-render count.
  const rawRef = useRef(0);
  const smoothRef = useRef(0);
  const frameRef = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    const computeRaw = () => {
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Travel distance: from (top at viewport bottom) to (bottom at
      // viewport top). Guard against zero-height elements.
      const travel = rect.height + vh - start - end;
      if (travel <= 1) return clamp01(rect.top < vh ? 1 : 0);
      const crossed = vh - start - rect.top;
      return clamp01(crossed / travel);
    };

    const publish = () => {
      const value = reduced
        ? step > 0
          ? Math.round(smoothRef.current / step) * step
          : smoothRef.current
        : smoothRef.current;
      setProgress((prev) => (Math.abs(prev - value) < 1e-4 ? prev : value));
    };

    const tick = () => {
      frameRef.current = 0;
      const raw = rawRef.current;
      if (reduced || smoothing <= 0) {
        smoothRef.current = raw;
      } else {
        // Exponential approach — frame-rate independent enough for
        // ambient scrub (the visual target, not a physics sim).
        smoothRef.current += (raw - smoothRef.current) * Math.min(Math.max(smoothing, 0.01), 0.5);
        if (Math.abs(raw - smoothRef.current) < 0.001) smoothRef.current = raw;
      }
      publish();
      // Keep easing only while the value is still in flight.
      if (smoothRef.current !== rawRef.current) schedule();
    };

    const schedule = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      rawRef.current = computeRaw();
      schedule();
    };

    const onResizeOrSettle = () => {
      rawRef.current = computeRaw();
      smoothRef.current = rawRef.current;
      publish();
    };

    // Visibility gate: compute while near the viewport only.
    let near = true;
    let observer: IntersectionObserver | null = null;
    const setNear = (value: boolean) => {
      near = value;
      if (near) onScroll();
    };

    if (typeof IntersectionObserver !== 'undefined') {
      near = false;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) setNear(entry.isIntersecting);
        },
        // A generous margin: scenes one viewport away pre-warm so the
        // first visible frame already carries the right progress.
        { rootMargin: '100% 0px' },
      );
      observer.observe(node);
    }

    // Initial state (fonts/layout may not have settled — resize +
    // load belts below reconcile).
    onResizeOrSettle();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResizeOrSettle, { passive: true });
    const onVisibility = () => {
      if (!document.hidden) onScroll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onSettle = () => onResizeOrSettle();
    if (document.readyState === 'complete') {
      onSettle();
    } else {
      window.addEventListener('load', onSettle, { once: true, passive: true });
    }
    document.fonts?.ready?.then(onSettle).catch(() => {
      /* fonts API rejected — resize/load belts still cover */
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResizeOrSettle);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('load', onSettle);
      observer?.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [reduced, start, end, smoothing, step]);

  return [ref as React.RefObject<T>, progress, smoothRef];
}
