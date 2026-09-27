import { useEffect, useRef } from 'react';

/**
 * useMagnetic — a subtle magnetic pull for primary CTAs.
 *
 * Desktop-hover devices only: the element drifts a few pixels toward the
 * cursor (max 6px) and springs back on leave. Disabled entirely for
 * touch devices, reduced-motion users, and when the element is offscreen.
 * Uses transform only — no layout cost, compositor-friendly.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>(strength = 6) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    if (reduced || !canHover) return;

    let raf = 0;
    let visible = true;

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (!visible) reset();
    });
    io.observe(el);

    const reset = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty('--mag-x', '0px');
      el.style.setProperty('--mag-y', '0px');
    };

    const onMove = (e: MouseEvent) => {
      if (!visible) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) / (r.width / 2);
        const dy = (e.clientY - cy) / (r.height / 2);
        // clamped, eased pull — never more than `strength` px
        const mx = Math.max(-1, Math.min(1, dx)) * strength;
        const my = Math.max(-1, Math.min(1, dy)) * strength * 0.7;
        el.style.setProperty('--mag-x', `${mx.toFixed(1)}px`);
        el.style.setProperty('--mag-y', `${my.toFixed(1)}px`);
      });
    };

    const onLeave = () => reset();

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      reset();
    };
  }, [strength]);

  return ref;
}
