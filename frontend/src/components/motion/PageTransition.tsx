import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from './useReducedMotion';

type PageTransitionProps = {
  children: ReactNode;
  /** Override the default transition class. Rare. */
  className?: string;
};

/**
 * PageTransition — wraps the route outlet to deliver a consistent
 * cross-fade + small lift on every navigation.
 *
 * Behavior:
 *   - On supporting browsers, uses document.startViewTransition() so the
 *     OS-level page transition kicks in.
 *   - On non-supporting browsers, applies `is-route-transitioning` to
 *     the inner wrapper so the CSS keyframe in motion.css runs instead.
 *   - Reduced-motion: caller already gets the <80ms fade via the
 *     reduced-motion CSS override on --motion-duration-page.
 *   - Persistent shell stays mounted: only this component's children
 *     animate. Place this component INSIDE the shell.
 *
 * See specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
 */
export function PageTransition({ children, className }: PageTransitionProps): JSX.Element {
  const location = useLocation();
  const innerRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const previousKey = useRef<string>(location.key);

  useEffect(() => {
    if (location.key === previousKey.current) {
      return;
    }
    previousKey.current = location.key;

    const node = innerRef.current;
    if (!node) return;

    if (reduced) {
      // Reduced-motion: no animation; the new content is already mounted
      // by react-router. We deliberately do nothing here — the static
      // CSS fallback (80ms fade) is handled by the @media block.
      return;
    }

    // Prefer the View Transitions API where available.
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
      }
    ).startViewTransition;

    if (typeof startViewTransition === 'function') {
      // We're already past the React commit — the new content has been
      // painted. View Transitions captures the snapshot on entry, so
      // calling it here animates the just-rendered tree.
      startViewTransition.call(document, () => {
        // No-op: React already updated the DOM.
      });
      return;
    }

    // Fallback: CSS keyframe via class toggle.
    node.classList.remove('is-route-transitioning');
    // force reflow to restart animation
    void node.offsetWidth;
    node.classList.add('is-route-transitioning');
  }, [location.key, reduced]);

  return (
    <div
      ref={innerRef}
      className={`page-transition${className ? ` ${className}` : ''}`}
      data-route-key={location.key}
    >
      {children}
    </div>
  );
}
