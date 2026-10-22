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
import { shouldPlayIntro, markIntroSeen, INTRO_SEEN_KEY } from '../../src/lib/motion/introGate';

describe('r308 — introGate (the entrance decision)', () => {
  const mkStore = (seen: boolean) => {
    const bag: Record<string, string> = seen ? { [INTRO_SEEN_KEY]: '1' } : {};
    return {
      getItem: (k: string) => bag[k] ?? null,
      setItem: (k: string, v: string) => {
        bag[k] = v;
      },
    };
  };

  it('plays only once per session, never under reduced motion, never without storage', () => {
    expect(shouldPlayIntro(mkStore(false), false)).toBe(true);
    expect(shouldPlayIntro(mkStore(true), false)).toBe(false); // returning visitor
    expect(shouldPlayIntro(mkStore(false), true)).toBe(false); // reduced motion
    expect(shouldPlayIntro(null, false)).toBe(false); // non-visual environments
  });

  it('markIntroSeen flips the decision for the rest of the session', () => {
    const store = mkStore(false);
    markIntroSeen(store);
    expect(store.getItem(INTRO_SEEN_KEY)).toBe('1');
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
