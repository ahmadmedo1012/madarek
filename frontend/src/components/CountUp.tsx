import { useEffect, useRef, useState } from 'react';

/**
 * CountUp — animates the numeric part of a marketing stat into view once,
 * preserving any prefix/suffix (e.g. "+50K", "#6", "29"). Triggers when the
 * element scrolls into view. Honours prefers-reduced-motion (shows final
 * value instantly). Marketing/hero use only — never for live in-app data.
 */
export function CountUp({ value, duration = 1100 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const m = value.match(/([^\d]*)([\d.,]+)(.*)/);
    if (!m || !m[2]) { setDisplay(value); return; }
    const prefix = m[1] ?? '';
    const numStr = m[2];
    const suffix = m[3] ?? '';
    const target = parseFloat(numStr.replace(/,/g, ''));
    const decimals = numStr.includes('.') ? (numStr.split('.')[1]?.length ?? 0) : 0;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || Number.isNaN(target)) { setDisplay(value); return; }

    const fmt = (n: number) =>
      `${prefix}${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

    let raf = 0;
    let start = 0;
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      obs.disconnect();
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min((t - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(fmt(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
        else setDisplay(value);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    setDisplay(fmt(0));
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);

  return <span ref={ref} data-numeric="true">{display}</span>;
}
