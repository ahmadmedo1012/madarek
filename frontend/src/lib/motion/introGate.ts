/**
 * introGate — R308 → R313 — the loader's pure logic, extracted for
 * honest testing (no DOM inside the decisions).
 *
 * R313 (D10 · owner decision — Heron parity): the gating rule changes
 * class. The reference's loader REPLAYS ON EVERY FULL PAGE LOAD — its
 * own sessionStorage flag exists but never suppresses (measured live:
 * reloadGate replays 15%@258ms → 100%@4680ms; audits/evidence/r313/
 * reference/digest.json → loader.gating). It never plays on
 * client-side route navigations (Barba sub-page transitions keep
 * loaderDisplay:none), never under reduced motion, never in non-visual
 * environments. This module now encodes exactly that:
 *
 *  · the seen-flag (`madarek-intro-seen`) is still WRITTEN when the
 *    entrance plays — the Madarek twin of the reference's inert
 *    `isLoaded` flag — but it no longer suppresses anything;
 *  · a DOCUMENT-LIFETIME flag replaces it as the anti-replay guard:
 *    a full load/reload boots a fresh document (flag unset → plays);
 *    a React Router navigation re-mounts the landing inside the SAME
 *    document (flag set → the loader never replays);
 *  · a dedicated skip key (`madarek-intro-skip`) is the hermetic
 *    opt-out the e2e fixture seeds before app boot so task-focused
 *    journeys boot straight into the page. Real visitors never set it.
 *
 * The module also carries the R313 PROGRESS MODEL (the counter's pure
 * math): the warm-timeline curve shape, the asset-gate plateau, and
 * the accelerated tail. The reference's counter is asset-gated, not a
 * fixed clock (its 60% plateau is a network wait; total 4.9–5.6s
 * depending on the run). The Madarek translation: the counter rides
 * the warm curve below the gate, WAITS at the plateau ceiling while
 * the critical assets (fonts + eager media) pend, then runs the
 * measured tail shape — accelerated when the assets resolved early,
 * never slower than the fallback curve's 100% at ~4.9s.
 */

export const INTRO_SEEN_KEY = 'madarek-intro-seen';
/** R313 — the hermetic-context opt-out (see the fixture's init script). */
export const INTRO_SKIP_KEY = 'madarek-intro-skip';

export interface SessionLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/* ── the document-lifetime guard ──────────────────────────────────────
 * Module state: set once the entrance has played in THIS document.
 * A reload builds a new module graph (fresh flag → the loader replays,
 * matching the reference); an in-app navigation reuses the graph (flag
 * set → no replay — the reference's Barba behaviour). */

let playedInDocument = false;

/** Record (in this document) that the entrance has played. */
export function markIntroPlayed(): void {
  playedInDocument = true;
}

/** Has the entrance already played in this document? */
export function introPlayedInDocument(): boolean {
  return playedInDocument;
}

/** Test-only: reset the document-lifetime guard between cases. */
export function resetIntroDocumentGateForTests(): void {
  playedInDocument = false;
}

/** Should the entrance sequence play for this visitor?
 *
 * R313 override: the session seen-flag no longer suppresses (the
 * reference replays on every full load). */
export function shouldPlayIntro(
  session: SessionLike | null,
  prefersReducedMotion: boolean,
  alreadyPlayedInDocument: boolean = playedInDocument,
): boolean {
  if (prefersReducedMotion) return false;
  if (!session) return false; /* non-visual environments get the page */
  if (alreadyPlayedInDocument) return false; /* same-document (SPA) navigations never replay */
  try {
    if (session.getItem(INTRO_SKIP_KEY) === '1') return false;
  } catch {
    /* storage can throw (privacy modes) — degrade to no intro */
    return false;
  }
  return true; /* every fresh document (full load / reload) replays */
}

/** Record that this session has seen the entrance.
 *
 * R313: INERT by design — written for observability exactly like the
 * reference's own `isLoaded` flag; the decision never reads it. */
export function markIntroSeen(session: SessionLike | null = null): void {
  const store = session ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
  if (!store) return;
  try {
    store.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* best effort only */
  }
}

/* ════════════════════════════════════════════════════════════════════
 * R313 — the loader PROGRESS MODEL (pure math, unit-pinned)
 * ════════════════════════════════════════════════════════════════════
 *
 * The reference's warm counter timeline (r308 measurement, the task's
 * fallback shape): 0 → 7%@440ms → 33%@850ms → 57%@2060ms → a ~59%
 * plateau 2500–2900ms (the asset wait) → 85%@3700ms → 98%@4500ms →
 * 100%@4900ms. Cold runs stretch the plateau (60% for ~0.5s, 100% at
 * 5649ms) — the plateau EMERGES from waiting, it is not authored. */

/** The warm-timeline checkpoints: [ms, percent]. */
export const LOADER_CURVE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [440, 7],
  [850, 33],
  [2060, 57],
  [2500, 59],
  [2900, 59],
  [3700, 85],
  [4500, 98],
  [4900, 100],
];

/** The plateau ceiling — the counter waits at this value while the
 * critical assets pend (the curve reaches it at 2500ms naturally). */
export const LOADER_GATE_PCT = 59;
/** The fallback curve's 100% mark — the counter is NEVER slower. */
export const LOADER_DONE_MS = 4900;
/** The natural plateau→100 tail (2900→4900ms on the warm curve). */
export const LOADER_TAIL_MS = 2000;
/** How much faster than the natural tail rate the accelerated tail may
 * run (keeps an early asset resolve from flashing the counter). */
export const LOADER_ACCEL_MAX = 1.5;
/** The asset gate's hard timeout — a stalled asset can never trap the
 * visitor; the counter continues to the fallback 100% at LOADER_DONE_MS. */
export const LOADER_GATE_TIMEOUT_MS = 3400;
/** The measured hold at 100% before the exit split (reference: 717ms
 * between the counter's 100% and the first clip frame). */
export const LOADER_HOLD_MS = 700;

/** The tail's internal shape — the natural tail's proportions
 * (59→85 is 63.4% of the distance at 40% of the time, 59→98 is 95.1%
 * at 80%), reused for every release so the accelerated run keeps the
 * same instrument feel. */
const TAIL_SHAPE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.4, 0.634],
  [0.8, 0.951],
  [1, 1],
];

function interpCurve(
  points: ReadonlyArray<readonly [number, number]>,
  t: number,
): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const [x1, y1] = a;
    const [x2, y2] = b;
    if (t <= x2) {
      const u = x2 === x1 ? 1 : (t - x1) / (x2 - x1);
      return y1 + (y2 - y1) * u;
    }
  }
  return last[1];
}

/** The warm fallback curve at `ms` (unclamped by the asset gate). */
export function loaderCurveAt(ms: number): number {
  return interpCurve(LOADER_CURVE, Math.max(0, ms));
}

/** The counter's target at `elapsedMs`, given the asset gate released
 * at `releasedAtMs` (null while the critical assets still pend).
 *
 *  · gated: the curve, clamped at the plateau ceiling — the wait at
 *    ~59% emerges from the assets actually pending;
 *  · released: from the release value, the measured tail shape over a
 *    duration that is never slower than the fallback curve (100% by
 *    LOADER_DONE_MS) and never faster than LOADER_ACCEL_MAX × the
 *    natural tail rate (so an instant resolve still reads as a load,
 *    not a flash). */
export function loaderTargetAt(
  elapsedMs: number,
  releasedAtMs: number | null,
): number {
  const elapsed = Math.max(0, elapsedMs);
  if (releasedAtMs === null) {
    return Math.min(loaderCurveAt(elapsed), LOADER_GATE_PCT);
  }
  const releasedAt = Math.max(0, releasedAtMs);
  const vRelease = Math.min(loaderCurveAt(releasedAt), LOADER_GATE_PCT);
  const naturalRate = (100 - LOADER_GATE_PCT) / LOADER_TAIL_MS; /* pct/ms */
  const rateLimited = (100 - vRelease) / (naturalRate * LOADER_ACCEL_MAX);
  const deadline = Math.max(400, LOADER_DONE_MS - releasedAt);
  const tailMs = Math.min(deadline, Math.max(LOADER_TAIL_MS, rateLimited));
  const u = Math.min(1, Math.max(0, (elapsed - releasedAt) / tailMs));
  const shape = interpCurve(TAIL_SHAPE, u);
  return vRelease + (100 - vRelease) * shape;
}

/** When will the counter reach 100%? (the exit schedules HOLD_MS after
 * this) — pure, so the sequence can precompute its own clock. */
export function loaderDoneAtMs(releasedAtMs: number | null): number {
  if (releasedAtMs === null) return LOADER_DONE_MS;
  const releasedAt = Math.max(0, releasedAtMs);
  const vRelease = Math.min(loaderCurveAt(releasedAt), LOADER_GATE_PCT);
  const naturalRate = (100 - LOADER_GATE_PCT) / LOADER_TAIL_MS;
  const rateLimited = (100 - vRelease) / (naturalRate * LOADER_ACCEL_MAX);
  const deadline = Math.max(400, LOADER_DONE_MS - releasedAt);
  const tailMs = Math.min(deadline, Math.max(LOADER_TAIL_MS, rateLimited));
  return releasedAt + tailMs;
}
