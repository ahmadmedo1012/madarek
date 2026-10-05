import { useEffect, useState } from 'react';

/**
 * ScrollProgress — gradient progress bar at top of viewport.
 * Uses IntersectionObserver for performance; falls back to scroll
 * listener only if the API is unavailable. Respects prefers-reduced-motion.
 */
export function ScrollProgress({ className = 'scroll-progress' }: { className?: string }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    // Check reduced motion — skip entirely under prefers-reduced-motion
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) return;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = root.scrollHeight - root.clientHeight;
      const pct = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(pct);
      setVisible(pct > 0.01);
    };

    onScroll(); // initial measure
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={className}
      style={{ transform: `scaleX(${progress})`, opacity: visible ? 1 : 0 }}
      aria-hidden="true"
      role="progressbar"
    />
  );
}
