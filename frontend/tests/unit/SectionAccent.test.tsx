/**
 * useSectionAccent + <SectionAccent /> unit tests.
 *
 * IntersectionObserver is mocked per-test; we drive entries manually.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useSectionAccent } from '../../src/components/motion/useSectionAccent';
import { SectionAccent } from '../../src/components/motion/SectionAccent';

type IOCallback = (entries: IntersectionObserverEntry[]) => void;
let lastObserver: { cb: IOCallback; observed: Element[]; disconnect: () => void } | null = null;

class FakeObserver {
  cb: IOCallback;
  observed: Element[] = [];
  constructor(cb: IOCallback) {
    this.cb = cb;
    lastObserver = {
      cb: this.cb,
      observed: this.observed,
      disconnect: () => this.disconnect(),
    };
  }
  observe(el: Element) {
    this.observed.push(el);
    if (lastObserver) lastObserver.observed = this.observed;
  }
  unobserve(el: Element) {
    this.observed = this.observed.filter((x) => x !== el);
    if (lastObserver) lastObserver.observed = this.observed;
  }
  disconnect() {
    this.observed = [];
  }
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = '0px';
  thresholds = [0];
}

function fireEntries(target: Element, isIntersecting: boolean) {
  if (!lastObserver) return;
  lastObserver.cb([
    {
      isIntersecting,
      target,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: isIntersecting ? 1 : 0,
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
  // Default reduced-motion = false
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

describe('SectionAccent', () => {
  it('starts unfired and applies the accent kind class', () => {
    render(<SectionAccent kind="underline-draw">hi</SectionAccent>);
    const el = screen.getByText('hi');
    expect(el.className).toContain('section-accent');
    expect(el.className).toContain('section-accent-underline-draw');
    expect(el.className).not.toContain('is-fired');
    expect(el.dataset.accentKind).toBe('underline-draw');
  });

  it('fires once when the IntersectionObserver reports the element in view', () => {
    render(<SectionAccent kind="scene-paint">hi</SectionAccent>);
    const el = screen.getByText('hi');
    expect(lastObserver?.observed).toContain(el);
    act(() => {
      fireEntries(el, true);
    });
    expect(el.className).toContain('is-fired');
    expect(el.dataset.accentFired).toBe('true');
  });

  it('does NOT re-fire on a second viewport entry', () => {
    render(<SectionAccent kind="scene-paint">hi</SectionAccent>);
    const el = screen.getByText('hi');
    act(() => {
      fireEntries(el, true);
    });
    // Confirm unobserve was called.
    expect(lastObserver?.observed).not.toContain(el);
    // Even if a stale callback fires again, the dataset already has
    // accentFired=true so the cascade does not re-run.
    act(() => {
      fireEntries(el, true);
    });
    expect(el.dataset.accentFired).toBe('true');
  });

  it('does NOT fire while document.hidden is true', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    render(<SectionAccent kind="quote-fade">hi</SectionAccent>);
    const el = screen.getByText('hi');
    act(() => {
      fireEntries(el, true);
    });
    expect(el.className).not.toContain('is-fired');
    expect(el.dataset.accentFired).toBeUndefined();
  });

  it('renders fired immediately when prefers-reduced-motion is on', () => {
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
    render(<SectionAccent kind="parallax-shift">hi</SectionAccent>);
    const el = screen.getByText('hi');
    expect(el.className).toContain('is-fired');
    expect(el.dataset.accentFired).toBe('true');
  });

  it('useSectionAccent returns a fired flag matching the data attribute', () => {
    function Probe() {
      const { ref, fired } = useSectionAccent<HTMLDivElement>('underline-draw');
      return (
        <div ref={ref} data-testid="probe" data-fired={fired ? 'true' : 'false'}>
          x
        </div>
      );
    }
    render(<Probe />);
    const el = screen.getByTestId('probe');
    expect(el.dataset.fired).toBe('false');
    act(() => {
      fireEntries(el, true);
    });
    expect(el.dataset.fired).toBe('true');
  });

  it('disabled=true skips observation', () => {
    function Probe() {
      const { ref } = useSectionAccent<HTMLDivElement>('underline-draw', { disabled: true });
      return <div ref={ref} data-testid="probe">x</div>;
    }
    render(<Probe />);
    expect(lastObserver).toBeNull();
  });
});
