import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from '../../src/components/motion/useReducedMotion';

type Listener = (e: MediaQueryListEvent) => void;

function makeMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const media = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_type: 'change', cb: Listener) => listeners.add(cb)),
    removeEventListener: vi.fn((_type: 'change', cb: Listener) => listeners.delete(cb)),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  const fire = (matches: boolean) => {
    media.matches = matches;
    listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
  };
  return { media, fire };
}

describe('useReducedMotion', () => {
  let mm: ReturnType<typeof makeMatchMedia>;

  beforeEach(() => {
    mm = makeMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mm.media);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when reduce is not active', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when reduce is active at mount', () => {
    mm = makeMatchMedia(true);
    window.matchMedia = vi.fn().mockReturnValue(mm.media);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates when the OS-level preference toggles', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    act(() => mm.fire(true));
    expect(result.current).toBe(true);
    act(() => mm.fire(false));
    expect(result.current).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useReducedMotion());
    expect(mm.media.addEventListener).toHaveBeenCalledTimes(1);
    unmount();
    expect(mm.media.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
