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
 * The module also carries the R313 PROGRESS MODEL + the R314 cycle-2
 * retune (V14 — the loader's FRAME SEQUENCE): the reference's counter
 * was re-captured frame-by-frame in R314 (one fresh pass, 13 frames @
 * 500ms — audits notes in the 3-c worklog) and its beat structure is
 * now pinned exactly: a QUIET BOOT (the counter sits at 0 until
 * ~940ms while the chrome + the line-drawn mark arrive), a slow CRAWL
 * (16%@1131ms → 59%@3000ms), the PLATEAU at 60% (3366–3840ms — the
 * asset wait), the accelerating TAIL (67%@3965 → 100%@5649ms), the
 * ~717ms HOLD at 100%, then the 835ms split (exit 6366→7201ms — the
 * counter model's DONE/TAIL/HOLD constants now reproduce the measured
 * exit window to the millisecond). The asset gate keeps Madarek's own
 * honest semantics: an early release still shortens the run, but the
 * R313 1.5× acceleration is retired (measured: the reference's own
 * warm-cache reload finishes 100% at 4680ms — only ~17% faster than
 * its cold 5649ms; a 1.5× cap would compress an instant resolve to
 * ~60%, so the cap is now 1.0× the natural tail rate).
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

/** R318 — the visitor/connection environment the entrance respects.
 * §C of the round brief: the FULL sequence plays on the FIRST visit
 * only; repeat visits (the session seen-flag), saveData, ≤2g
 * networks and ≤2-core devices get the page straight away (the
 * previous R313 replay-always pin is re-pinned per the R318 owner
 * order — an honest override, documented here and in the e2e). */
export interface IntroEnvironment {
  /** navigator.connection.saveData — the visitor asked for restraint. */
  saveData?: boolean;
  /** effectiveType is slow-2g or 2g. */
  slowNetwork?: boolean;
  /** navigator.hardwareConcurrency ≤ 2. */
  lowCores?: boolean;
}

/** Read the live navigator environment (test-safe: absent APIs read
 * as permissive — the entrance plays). */
export function introEnvironment(): IntroEnvironment {
  if (typeof navigator === 'undefined') return {};
  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  return {
    saveData: !!conn?.saveData,
    slowNetwork: conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g',
    lowCores: (navigator.hardwareConcurrency || 8) <= 2,
  };
}

/** Should the entrance sequence play for this visitor?
 *
 * R313: the session seen-flag no longer suppresses.
 * R318 override (§C): it DOES again — the full sequence is a
 * first-visit experience; repeat visits in the same session skip
 * (the ≤600ms-fade/skip allowance), as do saveData, ≤2g and ≤2-core
 * visitors. The e2e pins re-pinned accordingly. */
export function shouldPlayIntro(
  session: SessionLike | null,
  prefersReducedMotion: boolean,
  env: IntroEnvironment = {},
  alreadyPlayedInDocument: boolean = playedInDocument,
): boolean {
  if (prefersReducedMotion) return false;
  if (!session) return false; /* non-visual environments get the page */
  if (alreadyPlayedInDocument) return false; /* same-document (SPA) navigations never replay */
  if (env.saveData || env.slowNetwork || env.lowCores) return false; /* R318 §C */
  try {
    if (session.getItem(INTRO_SKIP_KEY) === '1') return false;
    if (session.getItem(INTRO_SEEN_KEY) === '1') return false; /* R318 §C: repeat visits skip */
  } catch {
    /* storage can throw (privacy modes) — degrade to no intro */
    return false;
  }
  return true; /* first visit in this session: the full sequence plays */
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
 * R313 → R314 — the loader PROGRESS MODEL (pure math, unit-pinned)
 * ════════════════════════════════════════════════════════════════════
 *
 * The reference's counter timeline (R313 digest telemetry, re-confirmed
 * by the R314 frame capture — V14): the counter sits at 0 through the
 * boot (~940ms), crawls 16%@1131 → 59%@3000, plateaus at 60%
 * 3366–3840 (the asset wait — "AI MODELS" in the reference's own log),
 * then the tail 67%@3965 → 100%@5649, holds ~717ms, exits 6366→7201.
 * Warm-cache reloads measured 15%@258ms → 100%@4680ms (the plateau
 * shortens; the beats survive). */

/** The fallback timeline checkpoints: [ms, percent]. */
export const LOADER_CURVE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [943, 0],
  [1131, 16],
  [1358, 26],
  [1565, 34],
  [1800, 41],
  [2040, 47],
  [2400, 53],
  [3000, 59],
  [3366, 60],
  [3840, 60],
  [3965, 67],
  [4200, 78],
  [4440, 86],
  [4688, 92],
  [4920, 96],
  [5280, 99],
  [5649, 100],
];

/** The plateau ceiling — the counter waits at this value while the
 * critical assets pend (the curve reaches it at 3366ms naturally). */
export const LOADER_GATE_PCT = 60;
/** The fallback curve's 100% mark — the counter is NEVER slower
 * (the reference's measured cold-run 100%; exit window 6366→7201). */
export const LOADER_DONE_MS = 5649;
/** The natural plateau→100 tail (3840→5649ms on the fallback curve). */
export const LOADER_TAIL_MS = 1809;
/** How much faster than the natural tail rate the released tail may
 * run. R314 cycle-2 (V14): 1.0 — the reference's own warm-cache reload
 * keeps ~83% of the cold tail duration (100%@4680 vs 5649); the R313
 * 1.5× cap compressed instant resolves to ~60% of that, erasing the
 * crawl beat. At 1.0 an instant resolve still finishes ~20% early
 * (100% ≈ 4.5–4.8s) — the measured warm behaviour. */
export const LOADER_ACCEL_MAX = 1.0;
/** The asset gate's hard timeout — a stalled asset can never trap the
 * visitor; the release lands at the authored plateau's end so the
 * fallback 100% at LOADER_DONE_MS is exactly the slowest run. */
export const LOADER_GATE_TIMEOUT_MS = 3840;
/** The measured hold at 100% before the exit split (reference: 717ms
 * between the counter's 100% and the first clip frame — 5649→6366). */
export const LOADER_HOLD_MS = 717;

/** The tail's internal shape — the accelerating tail's proportions
 * (63.4% of the distance at 40% of the time, 95.1% at 80%), reused
 * for every release so an early run keeps the same instrument feel. */
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
 *    ~60% emerges from the assets actually pending;
 *  · released: from the release value, the measured tail shape over a
 *    duration that is never slower than the fallback curve (100% by
 *    LOADER_DONE_MS) and never faster than LOADER_ACCEL_MAX × the
 *    natural tail rate (so an instant resolve still reads as a load,
 *    not a flash — the reference's own warm reload keeps ~83%). */
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
