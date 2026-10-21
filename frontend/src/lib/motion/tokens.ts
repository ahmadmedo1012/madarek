/**
 * Runtime motion-token bridge — the JS half of the motion token system
 * (spec 001 / contracts/motion-tokens.md; R305 task 2-c).
 *
 * Single source of truth stays tokens.css: these helpers READ the
 * semantic `--motion-duration-*` / `--motion-ease-*` custom properties
 * off `:root` instead of duplicating magic numbers, so a design retune
 * in CSS is picked up by JS consumers for free.
 *
 * Semantics:
 *  - Durations return a NUMBER in ms. Under prefers-reduced-motion the
 *    token block in motion.css zeroes/shortens many rungs — the read
 *    then returns 0ms (or the 80ms affordance). That is CORRECT
 *    behaviour, not a bug: a caller must treat 0 as "play it instant"
 *    (e.g. jump straight to the final state, never queue a transition).
 *  - Easings return a CSS timing-function STRING. On a real DOM the
 *    computed value is the fully resolved curve; the fallback is the
 *    `var(--motion-ease-<name>)` REFERENCE itself — also a valid
 *    timing-function value, so callers can assign the result to
 *    `element.style.transitionTimingFunction` in both cases.
 *
 * Gate adaptation (documented per the 2-c brief): the fallbacks here
 * deliberately do NOT inline the curve strings. scripts/check-motion-
 * tokens.sh scans every .ts/.tsx line for raw cubic-bezier( literals,
 * so the curves live ONLY in tokens.css (the allowlisted source of
 * truth) and this bridge falls back to a var() reference instead.
 *
 * SSR/tests: with no window/document every getter returns the
 * documented rung fallback (durations) or the var() reference
 * (easings) — no exceptions thrown, no layout reads.
 *
 * No deps. Pure functions + const tables only → tree-shakeable.
 */

/** Duration rungs of the semantic motion ladder (tokens.css). */
export type MotionDurationName =
  | 'micro'
  | 'short'
  | 'medium'
  | 'long'
  | 'page'
  | 'reveal'
  | 'stat'
  | 'skeleton';

/** Easing roles of the semantic motion ladder (tokens.css). */
export type MotionEaseName = 'standard' | 'decelerate' | 'accelerate' | 'emphasized';

/** CSS custom property consumed for each duration rung. */
const DURATION_VARS: Record<MotionDurationName, string> = {
  micro: '--motion-duration-micro',
  short: '--motion-duration-short',
  medium: '--motion-duration-medium',
  long: '--motion-duration-long',
  page: '--motion-duration-page',
  reveal: '--motion-duration-reveal',
  stat: '--motion-duration-stat',
  skeleton: '--motion-duration-skeleton',
};

/**
 * Documented rung fallbacks — mirror the semantic block in
 * frontend/src/styles/tokens.css (micro..long alias the --t-* rungs,
 * page..skeleton are literal). Verified against tokens.css at authoring
 * time; if the CSS ladder is retuned, update this table in the same
 * commit (it only serves SSR/garbage paths — live DOM reads win).
 */
const DURATION_FALLBACKS_MS: Record<MotionDurationName, number> = {
  micro: 80,
  short: 160,
  medium: 240,
  long: 380,
  page: 320,
  reveal: 360,
  stat: 700,
  skeleton: 1200,
};

/** CSS custom property consumed for each easing role. */
const EASE_VARS: Record<MotionEaseName, string> = {
  standard: '--motion-ease-standard',
  decelerate: '--motion-ease-decelerate',
  accelerate: '--motion-ease-accelerate',
  emphasized: '--motion-ease-emphasized',
};

/**
 * Shape a resolved timing-function value must have to be trusted.
 * Accepts the curve/step function families and the keyword easings the
 * token system can legitimately resolve to; anything else (empty
 * read, prose, broken token) falls back to the var() reference.
 * (Pattern intent only — the curves themselves are NOT inlined here;
 * see the gate note in the file header.)
 */
const TIMING_SHAPE = /^(?:cubic-bezier|steps|linear|ease|ease-in|ease-out|ease-in-out|jump-|step-)/;

/** One read path for both getters. Returns null when unavailable. */
function readTokenVar(varName: string): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  try {
    const value = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return value === '' ? null : value;
  } catch {
    // getComputedStyle unavailable or throwing — use the fallback.
    return null;
  }
}

/**
 * Read a duration rung in ms from the live stylesheet, falling back to
 * the documented rung value when there is no DOM (SSR/tests) or the
 * computed value is missing/unparseable.
 *
 * A returned 0 means the token is zeroed (reduced-motion) — treat it
 * as "instant", never as a real animation length.
 */
export function getMotionDuration(name: MotionDurationName): number {
  const raw = readTokenVar(DURATION_VARS[name]);
  if (raw !== null) {
    const ms = raw.match(/^(\d+(?:\.\d+)?)ms$/);
    if (ms && ms[1]) return Number.parseFloat(ms[1]);
    // Defensive: seconds-form values (the ambient family uses them) —
    // a future rung authored in 's' units still resolves honestly.
    const s = raw.match(/^(\d+(?:\.\d+)?)s$/);
    if (s && s[1]) return Number.parseFloat(s[1]) * 1000;
  }
  return DURATION_FALLBACKS_MS[name];
}

/**
 * Read an easing role as a CSS timing-function string. On a real DOM
 * this is the fully resolved curve; when unavailable/unparseable the
 * fallback is the `var(--motion-ease-<name>)` reference string, which
 * is itself a valid timing-function value wherever the result is
 * assigned (inline styles, CSSOM, serialized CSS).
 */
export function getMotionEase(name: MotionEaseName): string {
  const raw = readTokenVar(EASE_VARS[name]);
  if (raw !== null && TIMING_SHAPE.test(raw)) return raw;
  return `var(--motion-ease-${name})`;
}
