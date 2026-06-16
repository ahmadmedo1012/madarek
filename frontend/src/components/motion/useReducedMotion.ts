import { useEffect, useState } from 'react';

/**
 * useReducedMotion — single source of truth for prefers-reduced-motion in JS.
 *
 * Subscribes to the matchMedia query and re-evaluates on OS-level toggles
 * without page reload. SSR-safe: returns false during server rendering;
 * hydrates to the correct value on the client.
 *
 * See specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event: MediaQueryListEvent) => {
      setReduced(event.matches);
    };

    // Sync on subscribe in case the value changed between initial render and effect mount.
    setReduced(media.matches);

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  return reduced;
}
