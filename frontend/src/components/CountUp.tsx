import { useEffect, useRef, useState } from 'react';

/**
 * CountUp — animates the numeric part of a marketing stat (e.g. "+50K", "#6",
 * "29", "90") when it scrolls into view, preserving any prefix/suffix.
 *
 * Robust by design: the REAL value is shown by default and is the guaranteed
 * fallback. Animation only ever replaces it temporarily; it can never get
 * stuck at 0 (the previous bug). Honours prefers-reduced-motion.
 * Marketing/hero use only — never for live in-app data.
 */
export function CountUp({ value, duration = 1100 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value); // always start with the real value

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const m = value.match(/([^\d]*)([\d.,]+)(.*)/);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!m || !m[2] || reduced) return; // keep real value, no animation

    const prefix = m[1] ?? '';
    const numStr = m[2];
    const suffix = m[3] ?? '';
    const target = parseFloat(numStr.replace(/,/g, ''));
    const decimals = numStr.includes('.') ? (numStr.split('.')[1]?.length ?? 0) : 0;
    if (Number.isNaN(target)) return;

    const fmt = (n: number) =>
      `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

    let raf = 0;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      let start = 0;
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min((t - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(p < 1 ? fmt(target * eased) : value); // always settle on the real value
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) { obs.disconnect(); run(); }
    }, { threshold: 0.25 });
    obs.observe(el);

    // Fallback: if already in the viewport at mount, animate right away.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) run();

    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);

  return <span ref={ref} data-numeric="true">{display}</span>;
}
