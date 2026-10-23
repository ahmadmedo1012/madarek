import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { installSheetExit, sheetExitUntil } from '../../lib/motion/sheetExit';

type GuestRevealProps = {
  children: ReactNode;
};

/**
 * GuestReveal — R312 (§R D7) → R313 (D11): the guest surface's route
 * transition, now the reference's SEQUENTIAL 1.6s two-phase sweep.
 *
 * Phase 1 — COVER (sheetExit.ts): on an internal link click a
 * full-viewport band overlay plays ≈0.9s (the reference's
 * --trans-percent 0→50%) while React Router navigates underneath —
 * never delayed, pointer-events:none, RM/popstate-safe.
 *
 * Phase 2 — REVEAL (this component): the keyed inner remount opens a
 * 4-edge inset mask (the reference's --mask-percent 50%→0%) over
 * ≈0.7s, sequenced to START when the cover ends (the --gr-delay var
 * reads sheetExitUntil()) — total ≈1.6s, matching the measured
 * reference curve (path swap ~142ms → 50% @897ms → open @1616ms).
 * The traveling 1px rule rides the same curve (the reference's
 * --size-line midpoint spike, translated).
 *
 * R313 override (D11): the old ~500ms parallel “funnel-first” reveal
 * is superseded (owner decision — the reference's 1.6s sequence). The
 * funnel stays safe: navigation + data fetch run underneath the cover;
 * clip-path is paint-only so CLS stays 0; reduced motion collapses to
 * the standing page.
 */
export function GuestReveal({ children }: GuestRevealProps): JSX.Element {
  const location = useLocation();

  /* R313 (D11): the cover sweep installs ONCE for the whole guest
   * boundary (idempotent singleton) — every public-page navigation
   * gets the exit sweep, not just the landing. */
  useEffect(() => installSheetExit(document.body), []);

  /* Sequence the reveal after an in-flight cover: the delay is
   * captured at remount time (keyed by pathname). No effect races —
   * the value is a pure function of the in-flight sweep state. */
  const pending = sheetExitUntil() - performance.now();
  const delay = Math.max(0, Math.round(pending));

  return (
    <div className="guest-reveal" data-route-key={location.key}>
      <div
        className="guest-reveal-inner"
        key={location.pathname}
        style={{ '--gr-delay': `${delay}ms` } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
