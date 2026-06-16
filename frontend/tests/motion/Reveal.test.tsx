import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { Reveal, RevealGroup } from '../../src/components/motion/Reveal';

describe('Reveal', () => {
  let originalIO: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    originalIO = window.IntersectionObserver;
    // Default: don't auto-fire; test reveals manually.
    class StubIO {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
      root = null;
      rootMargin = '';
      thresholds: ReadonlyArray<number> = [];
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
    if (originalIO) {
      (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
        originalIO;
    }
    vi.restoreAllMocks();
  });

  it('renders with data-reveal and starts unrevealed when below the fold', () => {
    // jsdom getBoundingClientRect returns zeros — that means top:0 < innerHeight(default 768),
    // so by default the element is treated as above-the-fold and reveals immediately.
    // Force "below the fold" by stubbing getBoundingClientRect.
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

    const { container } = render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    );
    const el = container.querySelector('[data-reveal]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-revealed')).toBe('false');

    HTMLElement.prototype.getBoundingClientRect = origRect;
  });

  it('reveals immediately if above the fold', () => {
    // jsdom returns all-zero rects by default. Stub a positive rect so
    // our above-the-fold check (top < innerHeight && bottom > 0) passes.
    const origRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 200,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    }));

    const { container } = render(
      <Reveal>
        <p>visible</p>
      </Reveal>,
    );
    expect(container.querySelector('[data-reveal]')?.getAttribute('data-revealed')).toBe('true');

    HTMLElement.prototype.getBoundingClientRect = origRect;
  });

  it('reduced-motion: reveals immediately, regardless of position', () => {
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
      <Reveal>
        <p>any</p>
      </Reveal>,
    );
    expect(container.querySelector('[data-reveal]')?.getAttribute('data-revealed')).toBe('true');
  });
});

describe('RevealGroup', () => {
  it('assigns staggerIndex 0..N to direct Reveal children', () => {
    const { container } = render(
      <RevealGroup>
        <Reveal>
          <p>a</p>
        </Reveal>
        <Reveal>
          <p>b</p>
        </Reveal>
        <Reveal>
          <p>c</p>
        </Reveal>
      </RevealGroup>,
    );
    const reveals = container.querySelectorAll('[data-reveal]');
    expect(reveals.length).toBe(3);
    // --reveal-index is set inline.
    expect((reveals[0] as HTMLElement).style.getPropertyValue('--reveal-index')).toBe('0');
    expect((reveals[1] as HTMLElement).style.getPropertyValue('--reveal-index')).toBe('1');
    expect((reveals[2] as HTMLElement).style.getPropertyValue('--reveal-index')).toBe('2');
  });

  it('caps staggerIndex at the configured max (default 6)', () => {
    const { container } = render(
      <RevealGroup>
        {Array.from({ length: 10 }, (_, i) => (
          <Reveal key={i}>
            <p>{i}</p>
          </Reveal>
        ))}
      </RevealGroup>,
    );
    const reveals = container.querySelectorAll('[data-reveal]');
    const last = reveals[reveals.length - 1] as HTMLElement;
    expect(Number(last.style.getPropertyValue('--reveal-index'))).toBeLessThanOrEqual(6);
  });
});
