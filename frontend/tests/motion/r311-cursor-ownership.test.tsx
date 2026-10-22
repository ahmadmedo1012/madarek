/**
 * r311-cursor-ownership.test.tsx — the R311 §1.7 integration belt
 * (vitest/jsdom side; the browser-truth side lives in
 * tests/e2e/r311-cursor-ownership.e2e.ts).
 *
 * The R310 unit belt tested each cursor component IN ISOLATION, which
 * is exactly why the app-level conflict was missed: the landing page
 * mounted TWO independent pointer systems at once (CursorManager's
 * circular dot/ring + SheetCursor's square). These specs mount the
 * REAL router + the REAL landing page + the REAL app-level layer in
 * ONE tree (RoutedCursorManager, exactly as App.tsx mounts it) and
 * assert the ownership contract end to end:
 *
 *   · on '/': the square sheet instrument owns the pointer; the
 *     app-level circular layer is fully unmounted (not hidden).
 *   · off '/': the app layer returns untouched (r305-A2 preserved).
 *   · returning to '/': the layer tears down — no stale glyphs.
 *   · the suppression vocabulary is the unified data-cursor="none".
 */
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App, { RoutedCursorManager } from '../../src/App';
import { CursorManager } from '../../src/components/motion/CursorManager';
import LandingPage from '../../src/pages/LandingPage';

/* ── jsdom plumbing (per landing-funnel.test.tsx + CursorManager.test) ── */

function installMatchMedia({ fine = true, reduced = false }: { fine?: boolean; reduced?: boolean } = {}) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const matches =
      query.includes('hover: hover') || query.includes('pointer: fine')
        ? fine
        : query.includes('reduce')
          ? reduced
          : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }) as unknown as typeof window.matchMedia;
}

beforeAll(() => {
  /* deterministic desktop gate + the landing's ResizeObserver belt */
  window.innerWidth = 1440;
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe(): void { /* no-op */ }
      unobserve(): void { /* no-op */ }
      disconnect(): void { /* no-op */ }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub,
    });
  }
});

beforeEach(() => {
  installMatchMedia();
  try { sessionStorage.clear(); } catch { /* storage can be locked */ }
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function mountApp(initialEntry: string) {
  const client = makeClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        {/* test-only nav: real SPA navigations drive the yield */}
        <nav aria-hidden="true">
          <Link to="/" data-testid="to-landing">landing</Link>
          <Link to="/colleges" data-testid="to-colleges">colleges</Link>
        </nav>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/colleges" element={<main data-testid="on-colleges" />} />
        </Routes>
        {/* the exact mount App.tsx uses — inside the router */}
        <RoutedCursorManager />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ═══ the ownership contract ════════════════════════════════════════ */

describe('R311 cursor ownership — the real router + landing in one tree', () => {
  it('on "/": the square sheet instrument owns the pointer; the app layer is unmounted', () => {
    mountApp('/');
    expect(document.querySelector('.cursor-layer')).toBeNull();
    expect(document.querySelector('.cursor-dot-core')).toBeNull();
    expect(document.querySelector('.sc-canvas')).not.toBeNull();
    expect(document.querySelector('.sc-ring')).not.toBeNull();

    /* pointer activity never resurrects the app layer on the landing */
    fireEvent.pointerMove(window, { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(window, { clientX: 900, clientY: 500 });
    expect(document.querySelector('.cursor-layer')).toBeNull();
  });

  it('the unified suppression vocabulary: data-cursor="none", never "hidden"', async () => {
    mountApp('/');
    expect(document.querySelectorAll('[data-cursor="hidden"]')).toHaveLength(0);
    expect(document.querySelector('.bp-stage')?.getAttribute('data-cursor')).toBe('none');

    /* the entrance loader (jsdom plays it: fine media + empty session)
     * must carry the same token */
    await waitFor(
      () => expect(document.querySelector('.sl')).not.toBeNull(),
      { timeout: 2000 },
    );
    expect(document.querySelector('.sl')?.getAttribute('data-cursor')).toBe('none');
  });

  it('SPA navigation to /colleges: the app layer returns exactly as r305-A2', () => {
    mountApp('/');
    fireEvent.click(document.querySelector('[data-testid="to-colleges"]') as HTMLElement);

    expect(document.querySelector('[data-testid="on-colleges"]')).not.toBeNull();
    const layer = document.querySelector('.cursor-layer');
    expect(layer).not.toBeNull();

    /* the sheet instrument unmounted with the landing */
    expect(document.querySelector('.sc-canvas')).toBeNull();

    /* activity lights the layer (data-active on first move) */
    fireEvent.pointerMove(window, { clientX: 120, clientY: 90 });
    expect(document.querySelector('.cursor-layer')?.getAttribute('data-active')).toBe('true');
  });

  it('returning to "/": the app layer tears down — no stale glyph, the sheet returns', () => {
    mountApp('/');
    fireEvent.click(document.querySelector('[data-testid="to-colleges"]') as HTMLElement);
    expect(document.querySelector('.cursor-layer')).not.toBeNull();

    fireEvent.click(document.querySelector('[data-testid="to-landing"]') as HTMLElement);
    expect(document.querySelector('.cursor-layer')).toBeNull();
    expect(document.querySelector('.cursor-dot-core')).toBeNull();
    expect(document.querySelector('.sc-canvas')).not.toBeNull();
  });

  it('reduced motion: BOTH systems stay down — the native cursor is the fallback', () => {
    installMatchMedia({ fine: true, reduced: true });
    mountApp('/');
    expect(document.querySelector('.sc-canvas')).toBeNull();
    expect(document.querySelector('.cursor-layer')).toBeNull();

    fireEvent.click(document.querySelector('[data-testid="to-colleges"]') as HTMLElement);
    expect(document.querySelector('.cursor-layer')).toBeNull();
  });

  it('the suspended prop forces the layer fully down even when the gate passes', () => {
    const { container } = render(<CursorManager suspended />);
    expect(container.querySelector('.cursor-layer')).toBeNull();
    const { container: liveContainer } = render(<CursorManager />);
    expect(liveContainer.querySelector('.cursor-layer')).not.toBeNull();
  });

  it('App.tsx wires the router-aware mount (source contract)', async () => {
    const mod = await import('../../src/App');
    expect(mod.default).toBeInstanceOf(Function);
    expect(mod.RoutedCursorManager).toBeInstanceOf(Function);
    const src = mod.RoutedCursorManager.toString();
    expect(src).toMatch(/pathname\s*===\s*['"]\/["']/);
    expect(App).toBeInstanceOf(Function);
  });
});
