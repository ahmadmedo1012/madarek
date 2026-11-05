import { useEffect, useState } from 'react';

/**
 * usePrefersReducedMotion — one home for the '(prefers-reduced-motion:
 * reduce)' media query (R337 bundle diet: ten files carried the literal;
 * the landing chunk paid it every time). SSR-safe, listener-backed.
 */
const MQ = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MQ).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(MQ);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** The literal itself, for non-hook call sites (matchMedia checks in
 *  effects/lib code) — one constant, imported. */
export const PREFERS_REDUCED_MOTION = MQ;
