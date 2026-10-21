import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { Reveal } from '../../src/components/motion/Reveal';

/**
 * Reveal variant="line" plumbing (task 2-c). House style mirrors
 * tests/motion/Reveal.test.tsx: silent IO stub + matchMedia mock +
 * rect stubs. CSS behaviour itself (the wipe, RM handling) is verified
 * by the QA agent in a real browser per the 2-c brief.
 */

interface StubIOInstance {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

let createdObservers: StubIOInstance[] = [];

beforeEach(() => {
  createdObservers = [];
  // Default: don't auto-fire; the belt observes and the tests assert
  // the plumbing around it.
  class StubIO {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
    root = null;
    rootMargin = '';
    thresholds: ReadonlyArray<number> = [];
    constructor() {
      createdObservers.push(this);
    }
  }
  (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
    StubIO as unknown as typeof IntersectionObserver;
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const stubBelowFold = () => {
  const origRect = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
    top: 9999,
    bottom: 10999,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 9999,
    toJSON: () => ({}),
  }));
  return () => {
    HTMLElement.prototype.getBoundingClientRect = origRect;
  };
};

describe('Reveal variant="line"', () => {
  it('default Reveal renders WITHOUT data-reveal-variant (zero DOM diff)', () => {
    const restore = stubBelowFold();
    const { container } = render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    );
    const el = container.querySelector('[data-reveal]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-reveal-variant')).toBeNull();
    restore();
  });

  it('variant="line" renders WITH data-reveal-variant="line"', () => {
    const restore = stubBelowFold();
    const { container } = render(
      <Reveal variant="line">
        <p>rule</p>
      </Reveal>,
    );
    const el = container.querySelector('[data-reveal]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-reveal-variant')).toBe('line');
    restore();
  });

  it('reduced-motion: line variant still reveals immediately (data-revealed="true")', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    });
    const { container } = render(
      <Reveal variant="line">
        <p>any</p>
      </Reveal>,
    );
    const el = container.querySelector('[data-reveal]');
    expect(el?.getAttribute('data-revealed')).toBe('true');
    expect(el?.getAttribute('data-reveal-variant')).toBe('line');
  });

  it('lifecycle untouched: below-the-fold line Reveal observes, unmount disconnects', () => {
    const restore = stubBelowFold();
    const { unmount } = render(
      <Reveal variant="line">
        <p>late</p>
      </Reveal>,
    );
    expect(createdObservers.length).toBe(1);
    expect(createdObservers[0]?.observe).toHaveBeenCalledTimes(1);
    unmount();
    expect(createdObservers[0]?.disconnect).toHaveBeenCalledTimes(1);
    restore();
  });
});
