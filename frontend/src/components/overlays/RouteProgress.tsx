/**
 * RouteProgress — R323 §A2 (task 1-b) — the route-transition strip.
 *
 * A 2 px orange top line: NO logo, NO spinner, NO text. It renders ONLY
 * while the orchestrator's route-transition side state is open (and
 * nothing at all otherwise), so it can mount permanently next to the
 * app root without ever becoming a layer.
 *
 *  · data-fullscreen-layer="route-progress" — tagged for the overlap
 *    audit, but it is a STRIP, not a full-screen layer: it never
 *    participates in the one-fullscreen-layer invariant.
 *  · aria-hidden — decorative; the new page's own content announces
 *    itself.
 *  · Indeterminate start (an eased sweep loop) → determinate fill as
 *    soon as the wiring reports progress (loaderOrchestrator
 *    .reportRouteProgress(0..1)); requestRouteTransition()'s returned
 *    done-callback (or endRouteTransition()) unmounts the strip.
 *  · GPU-cheap by construction: every animated property is transform
 *    (scaleX/translateX) — layout is never touched.
 */
import { useLoaderState } from '../../lib/loaderOrchestrator';

export function RouteProgress() {
  const snap = useLoaderState();

  if (!snap.routeTransition) return null;

  const determinate = typeof snap.routeProgress === 'number';

  return (
    <div
      className="mdk-route-progress"
      data-fullscreen-layer="route-progress"
      data-mode={determinate ? 'determinate' : 'indeterminate'}
      aria-hidden="true"
    >
      <span
        className="mdk-route-progress-bar"
        style={
          determinate
            ? { transform: `scaleX(${Math.min(1, Math.max(0, snap.routeProgress ?? 0))})` }
            : undefined
        }
      />
    </div>
  );
}
