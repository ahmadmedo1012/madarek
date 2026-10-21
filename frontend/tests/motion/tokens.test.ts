import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMotionDuration, getMotionEase } from '../../src/lib/motion/tokens';

/**
 * tokens.ts — runtime motion-token bridge (task 2-c).
 *
 * The bridge reads the semantic --motion-duration-* / --motion-ease-*
 * custom properties off :root; these tests pin the read behaviour and
 * the SSR/garbage fallbacks (documented rung values that mirror
 * tokens.css). Raw curve strings are legal in tests — frontend/tests/**
 * is outside the motion gate's scan root (see check-motion-tokens.sh).
 */

const mockComputed = (values: Record<string, string>) => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (() => ({
      getPropertyValue: (prop: string) => values[prop] ?? '',
    })) as unknown as typeof window.getComputedStyle,
  );
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('getMotionDuration', () => {
  it('SSR (no window/document) falls back to the documented rung values', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    expect(getMotionDuration('micro')).toBe(80);
    expect(getMotionDuration('short')).toBe(160);
    expect(getMotionDuration('medium')).toBe(240);
    expect(getMotionDuration('long')).toBe(380);
    expect(getMotionDuration('page')).toBe(320);
    expect(getMotionDuration('reveal')).toBe(360);
    expect(getMotionDuration('stat')).toBe(700);
    expect(getMotionDuration('skeleton')).toBe(1200);
  });

  it('reads the computed custom property (ms) — same source as CSS', () => {
    mockComputed({ '--motion-duration-long': '380ms' });
    expect(getMotionDuration('long')).toBe(380);
  });

  it('returns 0 when reduced-motion zeroed the rung (callers treat 0 as instant)', () => {
    mockComputed({ '--motion-duration-medium': '0ms' });
    expect(getMotionDuration('medium')).toBe(0);
  });

  it('unparseable value falls back to the documented rung', () => {
    mockComputed({ '--motion-duration-reveal': 'over-nine-thousand' });
    expect(getMotionDuration('reveal')).toBe(360);
  });

  it('missing value falls back to the documented rung', () => {
    mockComputed({});
    expect(getMotionDuration('page')).toBe(320);
    expect(getMotionDuration('skeleton')).toBe(1200);
  });
});

describe('getMotionEase', () => {
  it('SSR falls back to the var() reference (gate-safe: curves live only in tokens.css)', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    expect(getMotionEase('standard')).toBe('var(--motion-ease-standard)');
    expect(getMotionEase('decelerate')).toBe('var(--motion-ease-decelerate)');
    expect(getMotionEase('accelerate')).toBe('var(--motion-ease-accelerate)');
    expect(getMotionEase('emphasized')).toBe('var(--motion-ease-emphasized)');
  });

  it('returns the resolved curve string read from computed style', () => {
    mockComputed({ '--motion-ease-decelerate': 'cubic-bezier(0.16, 1, 0.3, 1)' });
    expect(getMotionEase('decelerate')).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('unparseable/unknown curve falls back to the var() reference', () => {
    mockComputed({ '--motion-ease-standard': 'very-moody-curve' });
    expect(getMotionEase('standard')).toBe('var(--motion-ease-standard)');
  });

  it('missing value falls back to the var() reference', () => {
    mockComputed({});
    expect(getMotionEase('emphasized')).toBe('var(--motion-ease-emphasized)');
  });
});
