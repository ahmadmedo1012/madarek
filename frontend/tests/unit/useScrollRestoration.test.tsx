/**
 * useScrollRestoration — regression pins (r164-j, deliverable: the
 * list→detail→back journey).
 *
 * The shell contract (layout.css "SHELL SCROLL ARCHITECTURE"):
 * `.content` is the app's scroll container; the hook persists its
 * scrollTop per history entry and answers navigations —
 *   POP  (browser back/forward) → restore the entry's saved position
 *   PUSH/REPLACE                  → top of the new route
 * with sessionStorage guarded (r152a A4 P3) and the restore deferred
 * one rAF so content is laid out first.
 *
 * jsdom notes (probed): requestAnimationFrame EXISTS in the vitest
 * env (pretendToBeVisual), but Element.scrollTo is NOT a function —
 * the harness installs a faithful stub (records calls, writes
 * scrollTop) so both the POP restore and the PUSH top-scroll are
 * observable.
 */
import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { useEffect, useRef, useState } from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useScrollRestoration } from '../../src/components/layout/useScrollRestoration';

const flushFrame = () =>
  act(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      ),
  );

const flushFrames = async (n: number) => {
  for (let i = 0; i < n; i += 1) await flushFrame();
};

const sleep = (ms: number) =>
  act(
    async () =>
      await new Promise<void>((resolve) => setTimeout(resolve, ms)),
  );

function Harness() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollerRef);
  const navigate = useNavigate();
  return (
    <div
      ref={scrollerRef}
      data-testid="scroller"
      style={{ height: 120, overflow: 'auto' }}
    >
      <button type="button" onClick={() => navigate('/detail')}>
        go-detail
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
      <Routes>
        <Route path="/list" element={<div style={{ height: 2000 }}>list page</div>} />
        <Route path="/detail" element={<div style={{ height: 2000 }}>detail page</div>} />
      </Routes>
    </div>
  );
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/list']}>
      <Harness />
    </MemoryRouter>,
  );
}

const scrollerOf = () => document.querySelector<HTMLElement>('[data-testid="scroller"]')!;
/** Drive the scroller to a position the way a real user would. */
const scrollToPosition = (top: number) => {
  const el = scrollerOf();
  el.scrollTop = top;
  fireEvent.scroll(el);
};

describe('useScrollRestoration', () => {
  beforeAll(() => {
    // jsdom has no Element.scrollTo — stub it faithfully.
    if (typeof HTMLElement.prototype.scrollTo !== 'function') {
      (HTMLElement.prototype as unknown as {
        scrollTo: (opts?: ScrollToOptions | number) => void;
      }).scrollTo = function (this: HTMLElement, opts?: ScrollToOptions | number) {
        const top = typeof opts === 'number' ? opts : (opts?.top ?? 0);
        this.scrollTop = top;
      };
    }
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('list → detail → back: the list position is restored on POP', async () => {
    mount();
    scrollToPosition(800);

    // PUSH to the detail route → top of the new page.
    fireEvent.click(document.querySelector<HTMLButtonElement>('button')!);
    await flushFrame();
    expect(scrollerOf().scrollTop).toBe(0);

    // Read on the detail page, then browser-back.
    scrollToPosition(300);
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>('button')[1]!);
    await flushFrame();
    expect(scrollerOf().textContent).toContain('list page');
    expect(scrollerOf().scrollTop).toBe(800);
  });

  it('a PUSH navigation always lands at the top, never the previous offset', async () => {
    mount();
    scrollToPosition(900);
    fireEvent.click(document.querySelector<HTMLButtonElement>('button')!);
    await flushFrame();
    expect(scrollerOf().textContent).toContain('detail page');
    expect(scrollerOf().scrollTop).toBe(0);
  });

  it('POP with no stored position falls back to the top (deep-link back)', async () => {
    mount();
    scrollToPosition(800);
    fireEvent.click(document.querySelector<HTMLButtonElement>('button')!);
    await flushFrame();
    // Simulate the stored entry being unavailable (expired tab restore,
    // storage cleared between navigations).
    sessionStorage.clear();
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>('button')[1]!);
    await flushFrame();
    expect(scrollerOf().scrollTop).toBe(0);
  });

  it('persists per history key under the madarek.scroll: prefix', async () => {
    mount();
    scrollToPosition(640);
    fireEvent.click(document.querySelector<HTMLButtonElement>('button')!);
    await flushFrame();
    const keys = Object.keys(sessionStorage).filter((k) =>
      k.startsWith('madarek.scroll:'),
    );
    expect(keys).toHaveLength(1);
    expect(sessionStorage.getItem(keys[0]!)).toBe('640');
  });

  it('a throwing sessionStorage degrades silently — no crash, POP falls back to top', async () => {
    const getSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError: opaque origin');
      });
    const setSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('SecurityError: opaque origin');
      });

    mount();
    scrollToPosition(800);
    // PUSH with a throwing setItem — the persist step is skipped, not fatal.
    fireEvent.click(document.querySelector<HTMLButtonElement>('button')!);
    await flushFrame();
    expect(scrollerOf().textContent).toContain('detail page');

    // POP with a throwing getItem — restore degrades to top, no throw.
    scrollToPosition(0);
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>('button')[1]!);
    await flushFrame();
    expect(scrollerOf().textContent).toContain('list page');
    expect(scrollerOf().scrollTop).toBe(0);

    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});

/* ── r305-A4 (task 2-e): POP through late-arriving content height ──
 *
 * The one-rAF restore apply can land while the destination's height
 * hasn't arrived yet — the shell's inner Suspense fallback on a cold
 * chunk, or a page whose data (lists/charts/media) lands after mount.
 * A real scroller CLAMPS the programmatic write to
 * scrollHeight − clientHeight, so the stored offset silently degrades
 * to whatever the short state could hold, and the user loses their
 * position the moment the real content replaces it.
 *
 * jsdom has no layout, so these two tests install a CLAMPING scrollTo
 * stub (faithful to a real scroller) scoped to themselves, with
 * clientHeight/scrollHeight defined on the scroller node.
 */
describe('useScrollRestoration — POP restores through the late content height (r305-A4)', () => {
  /** Shared, mutable "layout": the scroller reads these via getters. */
  function makeLateHarness() {
    const layout = { contentHeight: 100, clientHeight: 600 };

    // The destination mounts SHORT (Suspense fallback / pre-data state)
    // and grows once its payload lands (~20ms after mount).
    function LateHeightPage() {
      const [tall, setTall] = useState(false);
      useEffect(() => {
        layout.contentHeight = 100;
        const t = setTimeout(() => {
          layout.contentHeight = 2000;
          setTall(true);
        }, 20);
        return () => clearTimeout(t);
      }, []);
      return <div>{tall ? 'late list tall' : 'late list short'}</div>;
    }

    function LateHarness() {
      const scrollerRef = useRef<HTMLDivElement>(null);
      useScrollRestoration(scrollerRef);
      const navigate = useNavigate();
      return (
        <div ref={scrollerRef} data-testid="scroller" style={{ overflow: 'auto' }}>
          <button type="button" onClick={() => navigate('/detail')}>
            go-detail
          </button>
          <button type="button" onClick={() => navigate(-1)}>
            back
          </button>
          <Routes>
            <Route path="/list" element={<LateHeightPage />} />
            <Route path="/detail" element={<div>detail page</div>} />
          </Routes>
        </div>
      );
    }

    return {
      layout,
      mountLate: () =>
        render(
          <MemoryRouter initialEntries={['/list']}>
            <LateHarness />
          </MemoryRouter>,
        ),
    };
  }

  /** jsdom-faithful scrollTo: clamps to the scrollable overflow, exactly
   *  like a real scroller (the file-wide stub writes scrollTop raw). */
  function installClampingStub(layout: { contentHeight: number; clientHeight: number }) {
    const previous = HTMLElement.prototype.scrollTo;
    const el = document.querySelector<HTMLElement>('[data-testid="scroller"]')!;
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => layout.clientHeight });
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => layout.contentHeight });
    (HTMLElement.prototype as unknown as { scrollTo: (opts?: ScrollToOptions) => void }).scrollTo =
      function (this: HTMLElement, opts?: ScrollToOptions) {
        const top = typeof opts === 'number' ? opts : (opts?.top ?? 0);
        const max = Math.max(0, this.scrollHeight - this.clientHeight);
        this.scrollTop = Math.min(top, max);
      };
    return () => {
      HTMLElement.prototype.scrollTo = previous;
      delete (el as unknown as { clientHeight?: number }).clientHeight;
      delete (el as unknown as { scrollHeight?: number }).scrollHeight;
    };
  }

  it('re-applies the stored offset once the destination height arrives', async () => {
    const { layout, mountLate } = makeLateHarness();
    mountLate();
    const remove = installClampingStub(layout);
    try {
      // Wait out the first mount's short→tall flip, then scroll for real.
      await sleep(40);
      scrollToPosition(800);

      // PUSH to /detail → top; read a bit; then browser-back to /list.
      fireEvent.click(document.querySelector<HTMLButtonElement>('button')!);
      await flushFrame();
      expect(scrollerOf().scrollTop).toBe(0);
      scrollToPosition(300);

      // POP lands while /list is SHORT again (its payload is pending):
      // the first rAF apply clamps to 0 — measured symptom.
      fireEvent.click(document.querySelectorAll<HTMLButtonElement>('button')[1]!);
      await flushFrame();
      expect(scrollerOf().textContent).toContain('late list short');
      expect(scrollerOf().scrollTop).toBe(0);

      // The payload lands (~20ms) → the restore completes on its own.
      await sleep(40);
      await flushFrames(6);
      expect(scrollerOf().textContent).toContain('late list tall');
      expect(scrollerOf().scrollTop).toBe(800);
    } finally {
      remove();
    }
  });

  it('stands down the moment the user scrolls the container themselves', async () => {
    const { layout, mountLate } = makeLateHarness();
    mountLate();
    const remove = installClampingStub(layout);
    try {
      await sleep(40);
      scrollToPosition(800);
      fireEvent.click(document.querySelector<HTMLButtonElement>('button')!);
      await flushFrame();
      scrollToPosition(300);

      // POP → clamped apply (0) arms the watcher; the user then takes
      // the scroller — their intent wins, the pending restore aborts.
      fireEvent.click(document.querySelectorAll<HTMLButtonElement>('button')[1]!);
      await flushFrame();
      expect(scrollerOf().scrollTop).toBe(0);
      const el = scrollerOf();
      el.scrollTop = 120;
      fireEvent.scroll(el);

      await sleep(40);
      await flushFrames(6);
      expect(scrollerOf().textContent).toContain('late list tall');
      expect(scrollerOf().scrollTop).toBe(120);
    } finally {
      remove();
    }
  });
});
