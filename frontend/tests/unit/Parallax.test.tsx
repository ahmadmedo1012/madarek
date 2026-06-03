/**
 * Parallax primitive unit tests.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { Parallax } from '../../src/components/motion/Parallax';

type IOCallback = (entries: IntersectionObserverEntry[]) => void;
let lastObserver: { cb: IOCallback; observed: Element[] } | null = null;

class FakeObserver {
  cb: IOCallback;
  observed: Element[] = [];
  constructor(cb: IOCallback) {
    this.cb = cb;
    lastObserver = { cb: this.cb, observed: this.observed };
  }
  observe(el: Element) {
    this.observed.push(el);
    if (lastObserver) lastObserver.observed = this.observed;
  }
  unobserve() {
    /* noop for tests */
  }
  disconnect() {
    /* noop */
  }
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = '0px';
  thresholds = [0];
}

function fireRatio(target: Element, ratio: number) {
  if (!lastObserver) return;
  lastObserver.cb([
    {
      isIntersecting: ratio > 0,
      target,
      intersectionRatio: ratio,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: 0,
    } as unknown as IntersectionObserverEntry,
  ]);
}

beforeEach(() => {
  lastObserver = null;
  Object.defineProperty(global, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: FakeObserver,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })),
  });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Parallax', () => {
  it('starts at translation 0px before any intersection report', () => {
    const { container } = render(<Parallax>x</Parallax>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--parallax-y')).toBe('');
    expect(el.style.transform).toContain('var(--parallax-y, 0px)');
  });

  it('writes a negative offset on entry for direction=up (default)', () => {
    const { container } = render(<Parallax>x</Parallax>);
    const el = container.firstChild as HTMLElement;
    act(() => {
      fireRatio(el, 0.5);
    });
    expect(el.style.getPropertyValue('--parallax-y')).toBe('-4.00px');
  });

  it('writes a positive offset on entry for direction=down', () => {
    const { container } = render(<Parallax direction="down">x</Parallax>);
    const el = container.firstChild as HTMLElement;
    act(() => {
      fireRatio(el, 0.5);
    });
    expect(el.style.getPropertyValue('--parallax-y')).toBe('4.00px');
  });

  it('caps amount at the spec maximum (8 px) regardless of prop', () => {
    const { container } = render(<Parallax amount={50}>x</Parallax>);
    const el = container.firstChild as HTMLElement;
    act(() => {
      fireRatio(el, 0);
    });
    expect(el.style.getPropertyValue('--parallax-y')).toBe('-8.00px');
  });

  it('returns to ~0 when fully visible', () => {
    const { container } = render(<Parallax>x</Parallax>);
    const el = container.firstChild as HTMLElement;
    act(() => {
      fireRatio(el, 1);
    });
    // toFixed(2) of (-0) renders as '0.00' in JS.
    expect(el.style.getPropertyValue('--parallax-y')).toBe('0.00px');
  });

  it('pins translation at 0 under prefers-reduced-motion', () => {
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    );
    const { container } = render(<Parallax>x</Parallax>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--parallax-y')).toBe('0px');
    expect(lastObserver).toBeNull();
  });

  it('does not update offset while document.hidden is true', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const { container } = render(<Parallax>x</Parallax>);
    const el = container.firstChild as HTMLElement;
    act(() => {
      fireRatio(el, 0.5);
    });
    expect(el.style.getPropertyValue('--parallax-y')).toBe('');
  });

  it('renders custom tag via `as` prop', () => {
    const { container } = render(<Parallax as="section">x</Parallax>);
    expect(container.querySelector('section')).not.toBeNull();
  });
});
