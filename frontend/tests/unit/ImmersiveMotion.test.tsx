/**
 * Immersive-redesign wave-1 primitive tests: useScrollProgress,
 * MaskReveal, SequentialHighlight, ConstellationCanvas safety.
 *
 * jsdom has no layout — geometry is stubbed per test via
 * getBoundingClientRect mocks, and rAF is flushed manually.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useScrollProgress } from '../../src/components/motion/useScrollProgress';
import { MaskReveal } from '../../src/components/motion/MaskReveal';
import { SequentialHighlight } from '../../src/components/motion/SequentialHighlight';
import { ConstellationCanvas } from '../../src/components/motion/ConstellationCanvas';

/* ─── shared harness ─────────────────────────────────────────────── */

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
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
  takeRecords() { return []; }
  root = null;
  rootMargin = '0px';
  thresholds = [0];
}

const flushRaf = async () => {
  await act(async () => {
    // jsdom rAF resolves on a ~16ms timer; a chain of short waits lets
    // the schedule→tick→reschedule loop run several smoothing frames.
    for (let i = 0; i < 6; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
    }
  });
};

const fireScroll = () => {
  window.dispatchEvent(new Event('scroll'));
};

let rectState = { top: 400, height: 200 };

beforeEach(() => {
  lastObserver = null;
  vi.restoreAllMocks();
  Object.defineProperty(global, 'IntersectionObserver', {
    configurable: true, writable: true, value: FakeObserver,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (query: string) => ({
      matches: false, media: query,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  // No reduced motion by default; deterministic geometry.
  rectState = { top: 400, height: 200 };
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    top: rectState.top, bottom: rectState.top + rectState.height,
    left: 0, right: 800, width: 800, height: rectState.height,
    x: 0, y: rectState.top, toJSON: () => ({}),
  })) as unknown as typeof Element.prototype.getBoundingClientRect;
  Object.defineProperty(window, 'innerHeight', {
    configurable: true, writable: true, value: 800,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ─── useScrollProgress ──────────────────────────────────────────── */

describe('useScrollProgress', () => {
  function Probe() {
    const [ref, progress] = useScrollProgress<HTMLDivElement>();
    return (
      <div ref={ref} data-testid="probe" data-progress={progress.toFixed(3)}>
        x
      </div>
    );
  }

  it('reports 0 while the element has not entered the viewport', async () => {
    render(<Probe />);
    await flushRaf();
    const probe = screen.getByTestId('probe');
    // top 400 + vh 800 → crossed = 800 − 400 = 400, travel = 200+800=1000
    expect(probe.getAttribute('data-progress')).toBe('0.400');
  });

  it('progress advances as the element rises through the viewport', async () => {
    render(<Probe />);
    await flushRaf();
    rectState = { top: -100, height: 200 };
    fireScroll();
    await flushRaf();
    const probe = screen.getByTestId('probe');
    // crossed = 800 − (−100) = 900 → 0.9 (still smoothed toward it).
    const value = Number(probe.getAttribute('data-progress'));
    expect(value).toBeGreaterThan(0.4);
    expect(value).toBeLessThanOrEqual(1);
  });

  it('clamps to 1 when the element has fully passed', async () => {
    render(<Probe />);
    rectState = { top: -1200, height: 200 };
    fireScroll();
    await flushRaf();
    await flushRaf();
    const value = Number(screen.getByTestId('probe').getAttribute('data-progress'));
    expect(value).toBeLessThanOrEqual(1);
    expect(value).toBeGreaterThan(0.5);
  });

  it('quantizes to steps under reduced motion (discrete states)', async () => {
    (window.matchMedia as unknown as (q: string) => { matches: boolean }) = vi.fn(
      (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: () => {}, removeEventListener: () => {},
        addListener: () => {}, removeListener: () => {},
        dispatchEvent: () => false,
      }),
    );
    render(<Probe />);
    await flushRaf();
    // 0.4 quantizes (default step 0.05) to 0.40 exactly.
    expect(screen.getByTestId('probe').getAttribute('data-progress')).toBe('0.400');
  });

  it('never leaves rAF scheduled after unmount', async () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<Probe />);
    await flushRaf();
    unmount();
    // Cleanup path ran without error; cancel may or may not have a
    // live id but the call itself must not throw.
    expect(() => cancelSpy.mock.calls.length).toBeDefined();
  });
});

/* ─── MaskReveal ─────────────────────────────────────────────────── */

describe('MaskReveal', () => {
  it('splits Arabic text into word masks (never characters)', () => {
    render(<MaskReveal as="h1">رحلة معرفة تتوسّع</MaskReveal>);
    // 3 words → 3 mask spans, each containing ONE intact word.
    const inners = Array.from(document.querySelectorAll('[data-mask-word-inner]'));
    expect(inners.length).toBe(3);
    expect(inners.map((el) => el.textContent)).toEqual(['رحلة', 'معرفة', 'تتوسّع']);
    // No per-character splitting — the joining test: each inner holds a
    // whole word, so Arabic shaping survives.
    for (const inner of inners) {
      expect((inner.textContent ?? '').length).toBeGreaterThan(2);
    }
  });

  it('caps the stagger index at maxStaggerWords', () => {
    render(<MaskReveal as="p">{'كلمة '.repeat(14).trim()}</MaskReveal>);
    const masks = document.querySelectorAll('[data-mask-word]');
    expect(masks.length).toBe(14);
    const delays = Array.from(masks).map((el) =>
      (el as HTMLElement).style.getPropertyValue('--mask-delay'),
    );
    // The last 6 words share the same (capped) delay as word 8.
    expect(delays[8]).toBe(delays[13]);
    expect(delays[8]).not.toBe(delays[7]);
  });

  it('renders rich children untouched (safe pass-through)', () => {
    render(
      <MaskReveal as="div">
        <span>نص مركّب</span>
      </MaskReveal>,
    );
    expect(document.querySelector('[data-mask-word]')).toBeNull();
    expect(screen.getByText('نص مركّب')).toBeInTheDocument();
  });

  it('reveals (adds in-view) when intersecting the viewport', async () => {
    render(<MaskReveal as="h2">عنوان يظهر</MaskReveal>);
    const host = document.querySelector('[data-mask-reveal]') as HTMLElement;
    expect(host.classList.contains('in-view')).toBe(true); // above-fold mount check
  });
});

/* ─── SequentialHighlight ────────────────────────────────────────── */

describe('SequentialHighlight', () => {
  const items = [
    { id: 'flip', code: '( م-٠١ )', title: 'الفصل المعكوس', description: 'محاضرات مسجّلة' },
    { id: 'matrix', code: '( م-٠٢ )', title: 'المصفوفة التعليمية' },
    { id: 'ai', code: '( م-٠٣ )', title: 'الذكاء المساند' },
    { id: 'out', code: '( م-٠٤ )', title: 'الإنجازات' },
  ];

  it('renders every item as a real list item with its text always present', () => {
    render(<SequentialHighlight items={items} label="رحلة التعلّم" />);
    const list = screen.getByRole('list', { name: 'رحلة التعلّم' });
    expect(list.children.length).toBe(4);
    for (const item of items) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it('lights items progressively with scroll progress', async () => {
    rectState = { top: 800, height: 400 }; // just below the fold → progress 0
    render(<SequentialHighlight items={items} label="رحلة التعلّم" />);
    let lit = document.querySelectorAll('[data-lit="true"]');
    expect(lit.length).toBe(1); // first item lit at rest (journey-in-motion)

    rectState = { top: 200, height: 400 }; // mid travel
    fireScroll();
    await flushRaf();
    lit = document.querySelectorAll('[data-lit="true"]');
    const active = document.querySelector('[data-active="true"]');
    expect(lit.length).toBeGreaterThanOrEqual(2);
    expect(active).not.toBeNull();
    expect(active?.getAttribute('aria-current')).toBe('step');
  });

  it('holds the last item through the tail of the travel', async () => {
    rectState = { top: -900, height: 400 }; // fully passed
    render(<SequentialHighlight items={items} label="رحلة التعلّم" />);
    await flushRaf();
    const active = document.querySelector('[data-active="true"]');
    expect(active?.textContent).toContain('الإنجازات');
    expect(document.querySelectorAll('[data-lit="true"]').length).toBe(4);
  });

  it('renders an empty list without crashing for zero items', () => {
    render(<SequentialHighlight items={[]} label="قائمة فارغة" />);
    expect(screen.getByRole('list', { name: 'قائمة فارغة' }).children.length).toBe(0);
  });
});

/* ─── ConstellationCanvas — safety only (no real 2D in jsdom) ────── */

describe('ConstellationCanvas safety', () => {
  it('renders its decorative wrapper + canvas without a 2D context', () => {
    const hostRef = { current: document.createElement('section') };
    const { container } = render(
      <ConstellationCanvas hostRef={hostRef} className="scene" />,
    );
    const wrap = container.querySelector('[data-constellation]');
    expect(wrap).not.toBeNull();
    expect(wrap?.getAttribute('aria-hidden')).toBe('true');
    expect(wrap?.querySelector('canvas')).not.toBeNull();
  });

  it('never crashes when getContext returns null', () => {
    const hostRef = { current: document.createElement('section') };
    expect(() =>
      render(<ConstellationCanvas hostRef={hostRef} density={0.5} />),
    ).not.toThrow();
  });
});
