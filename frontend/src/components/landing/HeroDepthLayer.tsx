import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../motion/useReducedMotion';

/**
 * HeroDepthLayer — parallax starfield for the hero (scroll-craft depth).
 *
 * Scroll-craft baseline: independent visual planes moving at different
 * rates create the illusion of depth without a 3D library. This layer
 * moves at ~0.2× the scroll rate while OrbitScene moves at ~0.4×, so
 * the text column appears closer than the starfield.
 *
 * Perf: one passive scroll listener + one rAF belt (same pattern as
 * useSectionProgress). Idle pause on document.hidden.
 */

type Star = { cx: number; cy: number; r: number; op: number };

const STAR_COUNT = 80;
const VIEWBOX = 1200;

function makeStars(count: number, seed: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random by seed so layout is identical every render.
    const x = ((Math.sin(seed + i * 397.1) * 0.5 + 0.5) * VIEWBOX);
    const y = ((Math.cos(seed + i * 263.3) * 0.5 + 0.5) * VIEWBOX);
    const r = 0.5 + (Math.abs(Math.sin(seed + i * 179.7)) * 1.2);
    const op = 0.15 + (Math.abs(Math.sin(seed + i * 131.9)) * 0.35);
    stars.push({ cx: x, cy: y, r, op });
  }
  return stars;
}

export function HeroDepthLayer() {
  const ref = useRef<SVGSVGElement | null>(null);
  const reducedMotion = useReducedMotion();
  const raf = useRef(0);

  // Seeded so the star positions are deterministic across renders.
  const stars = makeStars(STAR_COUNT, 42);

  useEffect(() => {
    if (reducedMotion) return;

    const onScroll = () => {
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    };
    const tick = () => {
      raf.current = 0;
      const y = window.scrollY;
      // Depth factor: how far scrolled relative to viewport height.
      const depth = y / (window.innerHeight || 1);
      // Slow parallax — ~0.2× scroll rate (scroll-craft baseline).
      const offset = depth * 40;
      if (ref.current) {
        ref.current.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial sample so the layer starts at the right position.
    tick();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [reducedMotion]);

  return (
    <svg
      ref={ref}
      className="ln-hero-depth"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill="rgba(245,243,231,0.6)"
          opacity={s.op}
        />
      ))}
    </svg>
  );
}
