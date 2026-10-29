/**
 * Splash — R323 §A2 (task 1-b) — the boot splash, the orchestrator's
 * FIRST-PAINT layer.
 *
 * Renders while the orchestrator's seat reports `splash` (which is the
 * singleton's initial state: boot + splash) and renders NOTHING
 * otherwise — wiring is one mount next to the app root. It is the
 * replacement surface for the legacy HydrationSplash in the foreman's
 * integration pass (that file is NOT touched here).
 *
 * Contract:
 *  · paper ground — the theme-aware page token `var(--bg)` (tokens.css
 *    §3: --bg IS the page ground / paper; the no-flash theme script in
 *    index.html has already pinned data-theme before this paints).
 *  · ONE mark: <Logo variant="mark" size={96} tone="auto" animated /> —
 *    the stroke-drawing khatam (600–900 ms, the orange point last). The
 *    real R323 Logo (frontend/src/brand/Logo.tsx) carries `data-logo`
 *    on its root svg itself — the overlap audit counts it there.
 *  · The root carries data-fullscreen-layer="splash".
 *  · Exit: when the phase reports ready (or a skip gesture arrives)
 *    the layer fades ≤250 ms (var(--t-fast), killed by the global
 *    reduced-motion belt) then calls splashExited() so the orchestrator
 *    frees the seat (and grants any queued sheet loader). Under reduced
 *    motion the exit timeout is 0 — the splash leaves instantly.
 */
import { useEffect, useRef, useState } from 'react';

import { Logo } from '../../brand/Logo';
import { loaderOrchestrator, useLoaderState } from '../../lib/loaderOrchestrator';

/** ≤250 ms exit contract; --t-fast resolves 200 ms from tokens.css. */
const EXIT_FALLBACK_MS = 240;

export function Splash() {
  const snap = useLoaderState();
  const [exiting, setExiting] = useState(false);
  const exitedRef = useRef(false);

  const active = snap.fullscreen === 'splash';
  const shouldExit = active && (snap.phase === 'ready' || snap.skipRequested);

  useEffect(() => {
    if (!shouldExit || exitedRef.current) return undefined;
    setExiting(true);
    const ms = snap.reducedMotion ? 0 : EXIT_FALLBACK_MS;
    const timer = window.setTimeout(() => {
      if (exitedRef.current) return; // StrictMode / re-run guard
      exitedRef.current = true;
      loaderOrchestrator.splashExited();
    }, ms);
    return () => window.clearTimeout(timer);
  }, [shouldExit, snap.reducedMotion]);

  /* The layer renders NOTHING when its seat is not held — so two
     full-screen layers can never coexist by construction. */
  if (!active) return null;

  return (
    <div
      className="mdk-splash"
      data-fullscreen-layer="splash"
      data-exiting={exiting ? 'true' : 'false'}
      role="status"
      aria-label="جارٍ تهيئة مدارك"
    >
      <Logo
        variant="mark"
        size={96}
        tone="auto"
        animated={!snap.reducedMotion}
        className="mdk-splash-logo"
      />
    </div>
  );
}
