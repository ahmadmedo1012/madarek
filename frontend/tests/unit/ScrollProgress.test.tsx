/**
 * ScrollProgress — scroller retarget pin (r157, 6A4-2).
 *
 * The shell scrolls `.content`, not the window (wave 7-b bounded
 * .has-shell to 100dvh and made .content the real scroller). The old
 * component listened to window scroll, so the bar was dead chrome —
 * it sat at scaleX(0) forever while the user scrolled the page.
 *
 * These pins hold the retarget:
 *   1. the bar is decorative + idle on mount (aria-hidden, scaleX(0))
 *   2. progress derives from the .content scroller's geometry
 *   3. the WINDOW listener is really gone (dead-chrome regression)
 *   4. a missing .content is guarded (chrome-less public layouts)
 *   5. prefers-reduced-motion gates the listener — and flipping the
 *      OS flag mid-session re-arms it (reactive useReducedMotion)
 *
 * The reduced-motion stub is controllable (live `matches` getter +
 * captured change listeners) so pin 5 can flip the flag under a
 * mounted component — the same controllable-band shape the shell
 * suites use for the drawer's ≤920px media query.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';

import { ScrollProgress } from '../../src/components/layout/ScrollProgress';

/* ── controllable matchMedia ─────────────────────────────────────── */
let rmMatches = false;
const rmListeners = new Set<(e: { matches: boolean }) => void>();

function installControllableMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      if (query.includes('prefers-reduced-motion')) {
        return {
          get matches() {
            return rmMatches;
          },
          media: query,
          onchange: null,
          addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
            rmListeners.add(cb);
          },
          removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
            rmListeners.delete(cb);
          },
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      }
      // Every other query (hover, width bands): desktop default.
      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    },
  });
}

/** Flip the reduced-motion flag and notify every captured listener. */
function setReducedMotion(matches: boolean) {
  rmMatches = matches;
  for (const cb of rmListeners) cb({ matches });
}

/* ── controllable .content scroller ──────────────────────────────── */
/**
 * jsdom has no layout engine: scrollHeight/clientHeight are frozen at
 * 0 and scrollTop is a plain settable field. Give the element a real
 * geometry so the progress math is exercised, not stubbed.
 */
function mountContentScroller(scrollHeight = 2000, clientHeight = 500) {
  const el = document.createElement('div');
  el.className = 'content';
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
  el.scrollTop = 0;
  document.body.appendChild(el);
  return el;
}

const bar = () => document.querySelector('.scroll-progress') as HTMLElement;

beforeEach(() => {
  installControllableMatchMedia();
  rmMatches = false;
  rmListeners.clear();
});

afterEach(() => {
  document.querySelectorAll('.content').forEach((el) => el.remove());
});

describe('ScrollProgress — scroller retarget (r157, 6A4-2)', () => {
  it('renders a decorative bar that is idle on mount (aria-hidden, scaleX(0), opacity 0)', () => {
    const el = mountContentScroller();
    render(<ScrollProgress />);
    const node = bar();
    expect(node).not.toBeNull();
    expect(node.getAttribute('aria-hidden')).toBe('true');
    expect(node.className).toBe('scroll-progress');
    expect(node.style.transform).toBe('scaleX(0)');
    expect(node.style.opacity).toBe('0');
    expect(document.querySelectorAll('.scroll-progress')).toHaveLength(1); // single decorative node
    expect(el.scrollTop).toBe(0);
  });

  it('derives its progress from the .content scroller, not the document', () => {
    const el = mountContentScroller(2000, 500); // scrollable range: 1500px
    render(<ScrollProgress />);
    const node = document.querySelector('.scroll-progress') as HTMLElement;

    // Half the range: 750/1500 = 0.5.
    el.scrollTop = 750;
    fireEvent.scroll(el);
    expect(node.style.transform).toBe(`scaleX(${750 / 1500})`);
    expect(node.style.opacity).toBe('1');

    // Sub-1% scroll keeps the bar invisible.
    el.scrollTop = 5;
    fireEvent.scroll(el);
    expect(node.style.transform).toBe(`scaleX(${5 / 1500})`);
    expect(node.style.opacity).toBe('0');
  });

  it('never listens to the window — the old dead-chrome wiring must not return', () => {
    const el = mountContentScroller(2000, 500);
    const { unmount } = render(<ScrollProgress />);
    const node = document.querySelector('.scroll-progress') as HTMLElement;

    // Move the scroller to a visible state first…
    el.scrollTop = 1000;
    fireEvent.scroll(el);
    expect(node.style.transform).toBe(`scaleX(${1000 / 1500})`);

    // …then fire a WINDOW scroll event: the retargeted component must
    // not react (the pre-r157 listener lived here and never fired
    // because the document never scrolls).
    fireEvent.scroll(window);
    expect(node.style.transform).toBe(`scaleX(${1000 / 1500})`);

    // Cleanup discipline: the .content listener is removed on unmount.
    const removeSpy = vi.spyOn(el, 'removeEventListener');
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    removeSpy.mockRestore();
    // And scrolling after unmount updates nothing.
    el.scrollTop = 1400;
    fireEvent.scroll(el);
    expect(node.style.transform).toBe(`scaleX(${1000 / 1500})`);
  });

  it('guards a missing .content (chrome-less public layouts) without falling back to the window', () => {
    // No .content in the document — the component must render idle
    // (the querySelector guard) and must not silently re-attach to
    // the window, which would resurrect the dead-chrome wiring.
    render(<ScrollProgress />);
    const node = document.querySelector('.scroll-progress') as HTMLElement;
    expect(node).not.toBeNull();
    expect(node.style.transform).toBe('scaleX(0)');

    fireEvent.scroll(window);
    expect(node.style.transform).toBe('scaleX(0)');
  });

  it('gates on reduced motion AND re-arms when the OS flag flips mid-session', async () => {
    // Mounted under prefers-reduced-motion: reduce — no listener, the
    // scroller can scroll all it wants, the bar stays idle.
    setReducedMotion(true);
    const el = mountContentScroller(2000, 500);
    const { rerender } = render(<ScrollProgress />);
    el.scrollTop = 900;
    fireEvent.scroll(el);
    let node = document.querySelector('.scroll-progress') as HTMLElement;
    expect(node.style.transform).toBe('scaleX(0)');

    // The user un-checks reduced motion while the app is open — the
    // shared reactive hook flips the state, the effect re-runs, the
    // listener (re-)attaches and the initial measure runs.
    act(() => {
      setReducedMotion(false);
    });
    rerender(<ScrollProgress />);
    node = document.querySelector('.scroll-progress') as HTMLElement;
    expect(node.style.transform).toBe(`scaleX(${900 / 1500})`);
    expect(node.style.opacity).toBe('1');

    // …and flipping it back re-tears-down the listener.
    act(() => {
      setReducedMotion(true);
    });
    rerender(<ScrollProgress />);
    el.scrollTop = 1200;
    fireEvent.scroll(el);
    node = document.querySelector('.scroll-progress') as HTMLElement;
    expect(node.style.transform).toBe(`scaleX(${900 / 1500})`);
  });
});
