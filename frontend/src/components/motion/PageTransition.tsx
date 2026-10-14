import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type PageTransitionProps = {
  children: ReactNode;
  /** Override the default transition class. Rare. */
  className?: string;
};

/**
 * PageTransition — the shell's single, deliberate route transition.
 *
 * Wave 7-b consolidation (audit 0-c P2-2/P2-3): route changes used to
 * run THREE compounding animations — (1) the keyed `.content-inner`
 * remount playing the polish `page-enter` fade, (2) an
 * `.is-route-transitioning` class-toggle fallback, and (3) a root
 * View Transition captured AFTER React had already committed (so the
 * old snapshot was the new DOM — a silent no-op that still froze the
 * page for its duration; the `::view-transition-*(route)` rules never
 * matched anything because no element ever set
 * `view-transition-name: route`).
 *
 * The ONE mechanism that survives is the keyed remount: this component
 * keys its inner wrapper on the pathname, so `.content-inner` (and the
 * page tree under it) remounts on every route change. Since r162 (R3)
 * the `page-enter` fade targets `.content-inner > *` (polish.css r162
 * section) — the content child — so it fires on every content MOUNT:
 * the keyed route remount AND the first-visit Suspense resolve (the
 * PageSkeleton fallback and the resolved page that replaces it enter
 * with the same 160ms fade). Purely declarative: no JS timing, no
 * effect races, interruptible by nature, and scroll restoration
 * (which scrolls the persistent `.content` container, not this
 * subtree) is unaffected.
 *
 * The wrapper div stays mounted across routes (stable data-route-key
 * contract) — only the inner node remounts.
 *
 * See specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
 * (the contract's startViewTransition/class-toggle clauses are retired
 * by this wave — docs update flagged in the worklog).
 */
export function PageTransition({ children, className }: PageTransitionProps): JSX.Element {
  const location = useLocation();

  return (
    <div
      className={`page-transition${className ? ` ${className}` : ''}`}
      data-route-key={location.key}
    >
      <div className="page-transition-inner" key={location.pathname}>
        {children}
      </div>
    </div>
  );
}
