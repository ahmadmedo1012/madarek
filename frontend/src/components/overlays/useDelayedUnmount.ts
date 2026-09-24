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
 */
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    const ms = readMotionDurationMs(durationToken, 160) + EXIT_SLACK_MS;
    const t = window.setTimeout(() => setRendered(false), ms);
    return () => window.clearTimeout(t);
  }, [open, durationToken]);

  return { rendered, onExitEnd: () => setRendered(false) };
}
