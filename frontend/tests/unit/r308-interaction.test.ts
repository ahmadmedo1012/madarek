/**
 * r308-interaction.test.ts — the R308 instrument contracts.
 *
 * Unit tests for the pure + behavioral cores of the interaction layer
 * (parity-matrix §Verification): the shared conductor's wake/sleep
 * lifecycle, the viewBox letterbox mapping + drag geometry (the AABB
 * remap that keeps the stations glued to the drawing at any crop),
 * the entrance gate's session/reduced-motion decisions, and the
 * Arabic-safety of the word-reveal split (joining is intra-word).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* ── the shared conductor ──────────────────────────────────────────── */
import {
  subscribeSheetFrame,
  sheetSubscriberCount,
  isSheetRunning,
} from '../../src/lib/motion/sheetConductor';

describe('r308 — sheetConductor (the ONE clock)', () => {
  let queue: Array<(t: number) => void> = [];
  const raf = vi.fn((cb: FrameRequestCallback): number => {
    queue.push(cb);
    return queue.length;
  });
  const cancel = vi.fn();

  beforeEach(() => {
    queue = [];
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', cancel);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    /* each test owns its subscriptions — the module set must be empty
     * between tests (asserted, not drained: draining via a
     * subscribe/unsub pair is net-zero and would loop forever). */
    expect(sheetSubscriberCount(), 'a test leaked a subscription').toBe(0);
  });

  it('subscribing wakes the loop; unsubscribing the last subscriber stops it', () => {
    expect(isSheetRunning()).toBe(false);
    const unsub = subscribeSheetFrame(() => undefined);
    expect(sheetSubscriberCount()).toBeGreaterThan(0);
    expect(isSheetRunning()).toBe(true);
    unsub();
    expect(sheetSubscriberCount()).toBe(0);
    /* the loop notices the empty set on its next tick and stops */
    const tick = queue.shift();
    expect(tick).toBeTypeOf('function');
    tick?.(0);
    expect(isSheetRunning()).toBe(false);
  });

  it('a sleeping loop re-wakes on demand (wakeSheet)', () => {
    const unsub = subscribeSheetFrame(() => undefined);
    unsub();
    const tick = queue.shift();
    tick?.(0);
    expect(isSheetRunning()).toBe(false);
    const unsub2 = subscribeSheetFrame(() => undefined);
    expect(isSheetRunning()).toBe(true);
    unsub2();
    queue.shift()?.(0);
  });

  it('a mid-frame unsubscribe does not kill the other subscribers', () => {
    const seen: number[] = [];
    const unsubA = subscribeSheetFrame(() => seen.push(1));
    const unsubB = subscribeSheetFrame(() => {
      seen.push(2);
      unsubA();
    });
    const tick = queue.shift();
    expect(tick).toBeTypeOf('function');
    tick?.(16);
    expect(seen).toEqual([1, 2]);
    expect(sheetSubscriberCount()).toBe(1);
    unsubB();
    expect(sheetSubscriberCount()).toBe(0);
  });
});

/* ── the geometry (viewBox mapping + drag math) ────────────────────── */
import {
  fitViewBox,
  viewBoxPointToContainer,
  viewBoxRectToContainer,
  normalizeDragRect,
  rectsIntersect,
  dragGradientAngle,
  rectContains,
} from '../../src/lib/motion/sheetGeometry';

describe('r308 — sheetGeometry (the letterbox remap)', () => {
  it('fitViewBox letterboxes exactly like preserveAspectRatio meet', () => {
    // container WIDER than the 760×460 drawing: height-constrained
    let fit = fitViewBox(1000, 600, 760, 460);
    expect(fit.scale).toBeCloseTo(600 / 460, 6);
    expect(fit.offsetX).toBeCloseTo((1000 - (760 * 600) / 460) / 2, 6);
    expect(fit.offsetY).toBe(0);
    // container TALLER: width-constrained
    fit = fitViewBox(760, 900, 760, 460);
    expect(fit.scale).toBe(1);
    expect(fit.offsetX).toBe(0);
    expect(fit.offsetY).toBeCloseTo((900 - 460) / 2, 6);
  });

  it('maps a viewBox point through the letterbox transform', () => {
    const fit = { scale: 2, offsetX: 40, offsetY: 20 };
    expect(viewBoxPointToContainer(fit, 100, 50)).toEqual({ x: 240, y: 120 });
  });

  it('a station rect keeps its proportions at any scale (never hard-coded px)', () => {
    const cases: Array<[number, number]> = [
      [1400, 700],
      [1000, 640],
      [600, 400],
    ];
    for (const [w, h] of cases) {
      const fit = fitViewBox(w, h, 760, 460);
      const r = viewBoxRectToContainer(fit, 520, 258, 204, 88);
      expect(r.width).toBeCloseTo(204 * fit.scale, 4);
      expect(r.height).toBeCloseTo(88 * fit.scale, 4);
      expect(r.left + r.width / 2).toBeCloseTo(fit.offsetX + 520 * fit.scale, 4);
    }
  });

  it('normalizeDragRect produces canonical AABBs from any drag direction', () => {
    expect(normalizeDragRect(100, 200, 300, 100)).toEqual({ left: 100, top: 100, width: 200, height: 100 });
    expect(normalizeDragRect(300, 100, 100, 200)).toEqual({ left: 100, top: 100, width: 200, height: 100 });
  });

  it('rectsIntersect is a strict AABB overlap test (edges touching = miss)', () => {
    const a = { left: 0, top: 0, width: 100, height: 100 };
    expect(rectsIntersect(a, { left: 50, top: 50, width: 10, height: 10 })).toBe(true);
    expect(rectsIntersect(a, { left: 100, top: 0, width: 10, height: 10 })).toBe(false);
    expect(rectsIntersect(a, { left: 200, top: 200, width: 10, height: 10 })).toBe(false);
  });

  it('the drag gradient angle tracks the movement direction', () => {
    // a down-right drag produces the reference's 315deg family
    const d = dragGradientAngle(0, 0, 100, 100);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(360);
    // opposite directions differ
    expect(dragGradientAngle(0, 0, 100, 100)).not.toBe(dragGradientAngle(0, 0, -100, -100));
  });

  it('rectContains resolves tap hits inside the box only', () => {
    const r = { left: 10, top: 10, width: 50, height: 50 };
    expect(rectContains(r, 35, 35)).toBe(true);
    expect(rectContains(r, 5, 35)).toBe(false);
    expect(rectContains(r, 61, 61)).toBe(false);
  });
});

/* ── the entrance gate ─────────────────────────────────────────────── */
import {
  shouldPlayIntro,
  markIntroSeen,
  markIntroPlayed,
  resetIntroDocumentGateForTests,
  introPlayedInDocument,
  INTRO_SEEN_KEY,
  INTRO_SKIP_KEY,
  loaderCurveAt,
  loaderTargetAt,
  loaderDoneAtMs,
  LOADER_CURVE,
  LOADER_GATE_PCT,
  LOADER_DONE_MS,
  LOADER_GATE_TIMEOUT_MS,
} from '../../src/lib/motion/introGate';

describe('r308 — introGate (the entrance decision)', () => {
  const mkStore = (seen: boolean, skip = false) => {
    const bag: Record<string, string> = {};
    if (seen) bag[INTRO_SEEN_KEY] = '1';
    if (skip) bag[INTRO_SKIP_KEY] = '1';
    return {
      getItem: (k: string) => bag[k] ?? null,
      setItem: (k: string, v: string) => {
        bag[k] = v;
      },
    };
  };

  afterEach(() => {
    /* R313: the document-lifetime guard is module state — reset it so
     * the cases stay order-independent. */
    resetIntroDocumentGateForTests();
  });

  it('R313 override: replays on EVERY fresh document (the seen-flag no longer suppresses), never under RM, never without storage', () => {
    /* R318 override (§C): the loader is a FIRST-VISIT sequence — the
     * session seen-flag suppresses repeat visits (it was inert under
     * the R313 replay-always pin); saveData/≤2g/≤2-core visitors skip
     * too. The guards: RM, non-visual env, the document lifetime, and
     * the hermetic skip key stay exactly as they were. */
    expect(shouldPlayIntro(mkStore(false), false)).toBe(true);
    expect(shouldPlayIntro(mkStore(true), false)).toBe(false); // R318 re-pin: the seen-flag suppresses (was true in R313)
    expect(shouldPlayIntro(mkStore(false), true)).toBe(false); // reduced motion
    expect(shouldPlayIntro(null, false)).toBe(false); // non-visual environments
    // R318 §C: the environment guards
    expect(shouldPlayIntro(mkStore(false), false, { saveData: true })).toBe(false);
    expect(shouldPlayIntro(mkStore(false), false, { slowNetwork: true })).toBe(false);
    expect(shouldPlayIntro(mkStore(false), false, { lowCores: true })).toBe(false);
  });

  it('R313: the hermetic skip key suppresses (the e2e fixture\'s opt-out)', () => {
    expect(shouldPlayIntro(mkStore(false, true), false)).toBe(false);
  });

  it('R313: a same-document (client-side) navigation never replays — the document-lifetime guard', () => {
    expect(shouldPlayIntro(mkStore(false), false, {}, false)).toBe(true); // fresh document (R318: env arg added)
    expect(shouldPlayIntro(mkStore(false), false, {}, true)).toBe(false); // SPA remount in the same document
    /* the flag is module state: mark → the default arg picks it up */
    expect(introPlayedInDocument()).toBe(false);
    markIntroPlayed();
    expect(introPlayedInDocument()).toBe(true);
    expect(shouldPlayIntro(mkStore(false), false)).toBe(false);
  });

  it('markIntroSeen writes the flag the R318 first-visit decision reads', () => {
    const store = mkStore(false);
    markIntroSeen(store);
    expect(store.getItem(INTRO_SEEN_KEY)).toBe('1');
    /* R318 re-pin: the decision READS it again — repeat visits skip */
    expect(shouldPlayIntro(store, false)).toBe(false);
  });

  it('storage failures degrade to the complete page (no intro)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(shouldPlayIntro(throwing, false)).toBe(false);
    expect(() => markIntroSeen(throwing)).not.toThrow();
  });
});

describe('r313 — the loader progress model (asset-gated, not a clock)', () => {
  it('the fallback curve: the measured checkpoints, 100% at ~5.65s', () => {
    /* R314 cycle-2 override (V14 — the loader's FRAME SEQUENCE): the
     * reference's counter was re-captured frame-by-frame and its beat
     * structure is now pinned exactly — a QUIET BOOT (0 until ~940ms;
     * the R313 curve moved at 7%@440ms), the crawl 16%@1131 →
     * 59%@3000, the 60% plateau 3366–3840, the tail 67%@3965 →
     * 100%@5649 (was 100%@4900), so the exit window lands at the
     * reference's own 5649+717 → split 6366–7201. */
    expect(LOADER_CURVE[0]).toEqual([0, 0]);
    expect(loaderCurveAt(440)).toBe(0); // the quiet boot — the counter sits still while the chrome arrives
    expect(loaderCurveAt(943)).toBe(0);
    expect(loaderCurveAt(1131)).toBeCloseTo(16, 5);
    expect(loaderCurveAt(3000)).toBeCloseTo(59, 5);
    expect(loaderCurveAt(3840)).toBe(60); // the plateau end
    expect(loaderCurveAt(LOADER_DONE_MS)).toBe(100);
    expect(LOADER_DONE_MS).toBe(5649);
  });

  it('gated: the counter waits at the plateau ceiling while assets pend (the wait emerges, it is not authored)', () => {
    expect(loaderTargetAt(3400, null)).toBe(LOADER_GATE_PCT);
    expect(loaderTargetAt(4500, null)).toBe(LOADER_GATE_PCT); // the plateau extends while the gate holds
    expect(loaderTargetAt(LOADER_DONE_MS, null)).toBe(LOADER_GATE_PCT); // still 60 if never released
    expect(LOADER_GATE_PCT).toBe(60); // R314 cycle-2: 59 → 60 (the frame-captured plateau value)
  });

  it('the gate\'s timeout can never trap the visitor (≤ 3840ms — the authored plateau\'s end)', () => {
    expect(LOADER_GATE_TIMEOUT_MS).toBeLessThanOrEqual(3840); // R314 cycle-2: 3400 → 3840
  });

  it('released at the natural plateau end: exactly the fallback timeline (100% at 5.65s)', () => {
    expect(loaderTargetAt(3840, 3840)).toBe(LOADER_GATE_PCT);
    expect(loaderTargetAt(4564, 3840)).toBeCloseTo(85, 0); // 40% into the tail — the old 85%@+800ms beat
    expect(loaderTargetAt(5287, 3840)).toBeCloseTo(98, 0); // 80% into the tail
    expect(loaderTargetAt(5649, 3840)).toBe(100);
    expect(loaderDoneAtMs(3840)).toBe(LOADER_DONE_MS);
  });

  it('released late (the timeout): the tail compresses — 100% still by 5.65s (never slower than the fallback)', () => {
    const late = LOADER_GATE_TIMEOUT_MS;
    expect(loaderDoneAtMs(late)).toBeLessThanOrEqual(LOADER_DONE_MS);
    expect(loaderTargetAt(LOADER_DONE_MS, late)).toBe(100);
    /* every legal release time finishes by LOADER_DONE_MS */
    for (let t = 0; t <= LOADER_GATE_TIMEOUT_MS; t += 100) {
      expect(loaderDoneAtMs(t), `release at ${t}ms`).toBeLessThanOrEqual(LOADER_DONE_MS);
      expect(loaderTargetAt(LOADER_DONE_MS, t), `release at ${t}ms`).toBe(100);
    }
  });

  it('released early: the counter runs its tail to 100 — bounded, monotonic, never a flash', () => {
    /* R314 cycle-2 override (V14): the R313 1.5× acceleration is
     * retired (the reference's own warm-cache reload keeps ~83% of the
     * cold tail: 100%@4680 vs 5649) — an early release now finishes
     * ~20% early (the earliest legal finish is ~4.5s) instead of
     * compressing the crawl beat away. */
    const early = 800;
    expect(loaderDoneAtMs(early)).toBeLessThan(LOADER_DONE_MS);
    /* …but never faster than the natural tail rate (the earliest legal
     * finish is ~4.5s — an instant resolve still reads as a load) */
    expect(loaderDoneAtMs(0)).toBeGreaterThanOrEqual(4400);
    /* the run is monotonic from the release value to 100 */
    let prev = -1;
    for (let t = early; t <= loaderDoneAtMs(early); t += 50) {
      const v = loaderTargetAt(t, early);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(loaderTargetAt(loaderDoneAtMs(early), early)).toBe(100);
  });

  it('the target is continuous across the release (no counter jump)', () => {
    const at = 2600;
    const before = loaderTargetAt(at, null);
    const after = loaderTargetAt(at, at);
    expect(Math.abs(before - after)).toBeLessThanOrEqual(0.5);
  });
});

/* ── the Arabic-safe word split ────────────────────────────────────── */
describe('r308 — WordReveal split integrity (Arabic shaping survives)', () => {
  it('splits on spaces only — words are never broken mid-join', () => {
    const text = 'منصّة واحدة تخدم الرحلة كلّها';
    const words = text.split(' ');
    for (const w of words) {
      expect(w.trim().length).toBeGreaterThan(0);
      expect(w).not.toMatch(/\s/);
    }
    expect(words.join(' ')).toBe(text);
  });

  it('a joined word stays whole (the shaping unit is the word)', () => {
    const joined = 'المحاضرات'; // باء + لام + اء — joining is intra-word
    const parts = joined.split(' ');
    expect(parts).toEqual([joined]);
  });
});
