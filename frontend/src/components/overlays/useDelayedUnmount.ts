/**
 * useDelayedUnmount — lets an overlay's exit animation play before
 * React removes it from the DOM (audit 0-c P2-1: every primitive
 * unmounted the instant `open` flipped false).
 *
 * Pattern: keep rendering after `open` goes false with a `closing`
 * marker (data-closing) that swaps the entrance animation for an exit
 * keyframe. The exit ends via `onExitEnd` (animationend) — this hook's
 * timeout is only the safety net for environments where animationend
 * never fires (jsdom, `animation: none` edges, background-tab
 * throttling). Durations come from the --motion-duration-* tokens, so
 * the wait collapses to ~nothing under prefers-reduced-motion.
 *
 * The OPEN branch runs as a useLayoutEffect (audit 4-A2 P1-1): with a
 * passive effect, `rendered` flipped one commit AFTER the anchored-
 * position hooks had already run their refine pass — with the panel
 * still unmounted, `panelRef.current` was null, the refine saw a 0px
 * panel and the horizontal clamp never moved the panel off the
 * viewport edge (26px of the notification panel sat off-screen on a
 * 390px phone, every open, every role). Flipping `rendered` in the
 * same pre-paint layout flush means the re-render that mounts the
 * panel also re-runs the refine — now with a real panel box — before
 * anything paints. Same latent fix for Dropdown/Popover consumers.
 */
import { useEffect, useLayoutEffect, useState } from 'react';

/** Event-delivery slack added on top of the token duration so the
 * safety net never cuts a playing exit animation short. (Not a motion
 * declaration — the rendered durations stay token-driven in CSS.) */
const EXIT_SLACK_MS = 80;

/** Reads a --motion-duration-* token from <html> in ms. Custom
 * properties resolve var() references in computed style, so this
 * returns the real used value (and 0 under reduced motion). Shared
 * with overlay components that drive unmounts from animationend. */
export function readMotionDurationMs(token: string, fallbackMs: number): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallbackMs;
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const ms = raw ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(ms) ? ms : fallbackMs;
}

export interface DelayedUnmount {
  /** Render the overlay while this is true (includes the exit window). */
  rendered: boolean;
  /** Call from the exit animation's onAnimationEnd — immediate unmount. */
  onExitEnd: () => void;
}

export function useDelayedUnmount(
  open: boolean,
  /** Token that matches the CSS exit animation duration. */
  durationToken = '--motion-duration-short',
): DelayedUnmount {
  const [rendered, setRendered] = useState(open);

  // Open branch: layout-phase flip so the panel mounts in the SAME
  // pre-paint flush the anchored-position refine re-runs in (see the
  // docblock). Close branch: plain timeout — the exit window is
  // asynchronous by design.
  useLayoutEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (open) return;
    const ms = readMotionDurationMs(durationToken, 160) + EXIT_SLACK_MS;
    const t = window.setTimeout(() => setRendered(false), ms);
    return () => window.clearTimeout(t);
  }, [open, durationToken]);

  return { rendered, onExitEnd: () => setRendered(false) };
}
