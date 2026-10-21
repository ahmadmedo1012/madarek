import { describe, expect, it, vi } from 'vitest';
import {
  desktopCursorAllowed,
  distance,
  finePointerSupported,
  LERP_FACTOR,
  LINE_LERP_FACTOR,
  lerp,
  MIN_VIEWPORT,
  PointerTracker,
  shouldStop,
  STOP_EPS,
} from '../../src/lib/motion/pointer';

describe('lerp', () => {
  it('returns a at t=0 and b at t=1', () => {
    expect(lerp(10, 30, 0)).toBe(10);
    expect(lerp(10, 30, 1)).toBe(30);
  });

  it('returns the midpoint at t=0.5', () => {
    expect(lerp(10, 30, 0.5)).toBe(20);
  });

  it('interpolates partially at the dot factor', () => {
    expect(lerp(0, 100, LERP_FACTOR)).toBeCloseTo(18, 10);
  });

  it('extrapolates cleanly for repeated convergence', () => {
    // A follower stepping toward a fixed target never overshoots it.
    let x = 0;
    for (let i = 0; i < 200; i++) {
      x = lerp(x, 64, LINE_LERP_FACTOR);
      expect(x).toBeLessThanOrEqual(64);
    }
    expect(x).toBeCloseTo(64, 6);
  });
});

describe('distance', () => {
  it('computes the euclidean distance (3-4-5 triangle)', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it('is zero for identical points and symmetric', () => {
    expect(distance(12, -8, 12, -8)).toBe(0);
    expect(distance(1, 2, 5, 14)).toBe(distance(5, 14, 1, 2));
  });
});

describe('shouldStop', () => {
  it('stops at or below epsilon (inclusive)', () => {
    expect(shouldStop(0.0009, STOP_EPS)).toBe(true);
    expect(shouldStop(STOP_EPS, STOP_EPS)).toBe(true);
  });

  it('keeps going above epsilon', () => {
    expect(shouldStop(0.002, STOP_EPS)).toBe(false);
    expect(shouldStop(42, 0.001)).toBe(false);
  });

  it('stops immediately for a zero epsilon at the target', () => {
    expect(shouldStop(0, 0)).toBe(true);
    expect(shouldStop(0.5, 0)).toBe(false);
  });
});

describe('PointerTracker', () => {
  it('defaults to the dot stiffness and the shared epsilon', () => {
    const tracker = new PointerTracker();
    expect(tracker.factor).toBe(LERP_FACTOR);
    expect(tracker.eps).toBe(STOP_EPS);
    expect(LERP_FACTOR).toBe(0.18);
    expect(LINE_LERP_FACTOR).toBe(0.1);
    expect(STOP_EPS).toBe(0.001);
  });

  it('reset snaps current and target to one position', () => {
    const tracker = new PointerTracker();
    tracker.reset(120, 80);
    expect(tracker.target).toEqual({ x: 120, y: 80 });
    expect(tracker.current).toEqual({ x: 120, y: 80 });
  });

  it('step() reports not-moving when already at the target', () => {
    const tracker = new PointerTracker();
    tracker.reset(50, 60);
    expect(tracker.step()).toBe(false);
  });

  it('converges: distances shrink per step and step() eventually stops', () => {
    const tracker = new PointerTracker();
    tracker.reset(0, 0);
    tracker.target.x = 300;
    tracker.target.y = 200;

    let moving = true;
    let steps = 0;
    let previous = distance(tracker.current.x, tracker.current.y, 300, 200);
    while (moving && steps < 1000) {
      moving = tracker.step();
      const next = distance(tracker.current.x, tracker.current.y, 300, 200);
      expect(next).toBeLessThanOrEqual(previous);
      previous = next;
      steps++;
    }

    expect(moving).toBe(false);
    expect(steps).toBeGreaterThan(0);
    // The loop stops within STOP_EPS (total distance); per-axis
    // residuals are therefore bounded by eps too.
    expect(tracker.current.x).toBeCloseTo(300, 2);
    expect(tracker.current.y).toBeCloseTo(200, 2);
    expect(distance(tracker.current.x, tracker.current.y, 300, 200)).toBeLessThanOrEqual(STOP_EPS);
  });

  it('the lines tracker (softer factor) needs more steps than the dot', () => {
    const run = (factor: number) => {
      const tracker = new PointerTracker(factor, STOP_EPS);
      tracker.reset(0, 0);
      tracker.target.x = 400;
      tracker.target.y = 0;
      let steps = 0;
      while (tracker.step() && steps < 10000) steps++;
      return steps;
    };
    expect(run(LINE_LERP_FACTOR)).toBeGreaterThan(run(LERP_FACTOR));
  });

  it('keeps following a moving target without overshooting', () => {
    const tracker = new PointerTracker();
    tracker.reset(0, 0);
    tracker.target.x = 100;
    tracker.target.y = 0;
    tracker.step();
    tracker.target.x = 40; // pointer reversed — follower chases back
    for (let i = 0; i < 500; i++) tracker.step();
    expect(tracker.current.x).toBeCloseTo(40, 3);
  });
});

describe('finePointerSupported', () => {
  it('is true when the fine-pointer query matches', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: hover) and (pointer: fine)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
    expect(finePointerSupported()).toBe(true);
  });

  it('is false on coarse pointers', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
    expect(finePointerSupported()).toBe(false);
  });

  it('is SSR-safe when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;
    expect(finePointerSupported()).toBe(false);
    window.matchMedia = original;
  });
});

describe('desktopCursorAllowed', () => {
  it('gates at MIN_VIEWPORT (992) inclusive', () => {
    expect(MIN_VIEWPORT).toBe(992);
    expect(desktopCursorAllowed(991)).toBe(false);
    expect(desktopCursorAllowed(992)).toBe(true);
    expect(desktopCursorAllowed(1280)).toBe(true);
    expect(desktopCursorAllowed(0)).toBe(false);
  });
});
