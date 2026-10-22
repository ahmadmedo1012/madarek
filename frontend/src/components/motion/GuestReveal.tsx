import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type GuestRevealProps = {
  children: ReactNode;
};

/**
 * GuestReveal — R312 (§R D7): the guest surface's route transition.
 *
 * Found by the frame-by-frame pass (§R R2): the guest surfaces — the
 * landing, the public colleges gallery, /auth — changed routes as a
 * HARD CUT (reproduced on video vs the reference's measured 1.6s
 * two-phase mask sweep, reference-observations §14). The AppShell's
 * keyed PageTransition only ever covered authenticated routes; the
 * guest boundary has no shell, so nothing fired.
 *
 * The declarative translation on the React Router lifecycle (the
 * PageTransition precedent — Barba itself stays rejected per the §H
 * standing decision): the keyed inner remount plays a VIEWPORT-
 * ANCHORED top-down reveal — the perceptible edge sweeps the fold in
 * the first 70% of ~500ms, a traveling 1px rule riding the same
 * curve (the reference's --size-line midpoint spike, translated).
 * Not their 1.6s: the funnel lesson from R308's loader exit — faster
 * than the reference by design; clip-path is paint-only, so CLS
 * stays 0; reduced motion collapses to the standing page.
 *
 * Purely declarative (no JS timing, no effect races, interruptible
 * by nature) — the same contract as PageTransition's header.
 */
export function GuestReveal({ children }: GuestRevealProps): JSX.Element {
  const location = useLocation();

  return (
    <div className="guest-reveal" data-route-key={location.key}>
      <div className="guest-reveal-inner" key={location.pathname}>
        {children}
      </div>
    </div>
  );
}
