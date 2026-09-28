import { useEffect, useRef } from 'react';

/**
 * Marquee — the reference-style infinite tech ticker.
 *
 * · Two identical spans inside a fit-content track; the track is translated
 *   by rAF and wraps at half its width → a seamless loop with zero CSS
 *   keyframes (the reference drives its marquee from JS too, so the speed
 *   can react to scroll velocity).
 * · RTL-native: the page is `dir="rtl"`, the track overflows to the inline-
 *   start (left) and translateX(+n) slides fresh content in from the left —
 *   the mirrored equivalent of the reference's LTR translateX(-n).
 * · Scroll-velocity reactive: flicking the page speeds the ticker up (the
 *   reference feeds `escroll` velocity into its marquee the same way).
 * · Pauses when offscreen (IntersectionObserver) and never animates under
 *   `prefers-reduced-motion` (the static row stays perfectly readable).
 * · Cleans up rAF + both observers on unmount.
 */
export function Marquee({
  items,
  className,
  label,
}: {
  items: string[];
  className?: string;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let running = true;
    let x = 0;
    let vel = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let half = 0;

    const measure = () => {
      // half = width of ONE copy (the wrap distance)
      half = Math.max(1, track.scrollWidth / 2);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    measure();

    const io = new IntersectionObserver(
      (entries) => {
        running = entries[0]?.isIntersecting ?? false;
      },
      { rootMargin: '40px 0px' },
    );
    io.observe(track);

    const BASE_SPEED = 42; // px/s — calm, legible
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      if (!running || !half) return;

      // scroll velocity (clamped, smoothed) boosts the speed
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      vel += (Math.max(-40, Math.min(40, dy)) - vel) * 0.08;

      x += (BASE_SPEED + Math.abs(vel) * 2.6) * dt;
      if (x >= half) x -= half;
      // translate3d keeps the track on its own compositor layer
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const row = items.join('  ·  ');

  return (
    <div className={`ln-marquee ${className ?? ''}`} aria-label={label}>
      <div className="ln-marquee-track" ref={trackRef}>
        <span className="ln-marquee-item">{row}&nbsp;·&nbsp;</span>
        <span className="ln-marquee-item" aria-hidden>
          {row}&nbsp;·&nbsp;
        </span>
      </div>
    </div>
  );
}
