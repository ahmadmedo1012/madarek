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
import { useRef } from 'react';
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
