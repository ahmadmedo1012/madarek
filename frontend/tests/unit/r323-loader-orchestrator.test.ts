/**
 * R323 §A2 (task 1-b) — the loaderOrchestrator state machine, pinned.
 *
 * Covers: the boot → hydrating → ready walk; the illegal-transition
 * guards; the ONE-fullscreen-layer seat invariant (activeFullscreen is
 * 0 or 1 at EVERY step — the queue and the slow-server preemption
 * included); the first-visit flag logic (fake localStorage); the skip()
 * paths; the reduced-motion exposure; the route-transition side state;
 * and the useLoaderState() hook.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_PERSISTENCE_KEY,
  INTRO_FLAG_KEY,
  activeFullscreenCount,
  activateSheetLoader,
  endRouteTransition,
  getSnapshot,
  isPersistedAuthenticated,
  loaderOrchestrator,
  markHydrating,
  markIntroPlayed,
  markReady,
  reducedMotion,
  releaseSheetLoader,
  reportRouteProgress,
  requestRouteTransition,
  resetLoaderOrchestratorForTests,
  setServerSlow,
  shouldPlayIntro,
  skip,
  splashExited,
  subscribe,
  useLoaderState,
  type LoaderSnapshot,
  type StorageLike,
} from '../../src/lib/loaderOrchestrator';

/** A fresh Map-backed storage (the shape of the setup.ts polyfill). */
function fakeStorage(): StorageLike & { dump(): Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

/** A FRESH permissive decision context — every call gets new storages
 *  so tests never leak a flag into each other. */
function playing() {
  return {
    authenticated: false,
    reducedMotion: false,
    storage: fakeStorage(),
    session: fakeStorage(),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  resetLoaderOrchestratorForTests();
});

describe('R323 loaderOrchestrator — the boot walk', () => {
  it('boots ON the splash seat (first paint) and never double-shows', () => {
    const snap = getSnapshot();
    expect(snap.phase).toBe('boot');
    expect(snap.fullscreen).toBe('splash');
    expect(activeFullscreenCount()).toBe(1);
  });

  it('walks boot → hydrating → ready, and the splash owns its own exit', () => {
    expect(markHydrating()).toBe(true);
    expect(getSnapshot().phase).toBe('hydrating');
    expect(getSnapshot().fullscreen).toBe('splash');

    expect(markReady()).toBe(true);
    expect(getSnapshot().phase).toBe('ready');
    // ready does NOT free the seat — the ≤250ms exit is the splash's
    expect(getSnapshot().fullscreen).toBe('splash');
    expect(activeFullscreenCount()).toBe(1);

    splashExited();
    expect(getSnapshot().fullscreen).toBeNull();
    expect(activeFullscreenCount()).toBe(0);
  });

  it('refuses demotion: markHydrating after ready is rejected', () => {
    markReady();
    expect(markHydrating()).toBe(false);
    expect(getSnapshot().phase).toBe('ready');
  });

  it('getSnapshot is referentially stable between changes', () => {
    const a = getSnapshot();
    expect(getSnapshot()).toBe(a);
    markHydrating();
    expect(getSnapshot()).not.toBe(a);
  });
});

describe('R323 loaderOrchestrator — the ONE-fullscreen-layer invariant', () => {
  it('queues the sheet loader behind the splash, grants it when the splash exits', () => {
    expect(activateSheetLoader()).toBe(false); // rejected — queued
    expect(getSnapshot().fullscreen).toBe('splash'); // never two
    expect(activeFullscreenCount()).toBe(1);

    markReady();
    splashExited(); // frees the seat → the queued request grants
    expect(getSnapshot().fullscreen).toBe('sheet-loader');
    expect(activeFullscreenCount()).toBe(1);

    releaseSheetLoader();
    expect(getSnapshot().fullscreen).toBeNull();
    expect(activeFullscreenCount()).toBe(0);
  });

  it('keeps activeFullscreen at 0 or 1 through a chaotic interleaving', () => {
    const events: Array<() => unknown> = [
      markHydrating,
      activateSheetLoader,
      () => setServerSlow(true),
      () => setServerSlow(false),
      skip,
      splashExited,
      markReady,
      activateSheetLoader,
      () => setServerSlow(true),
      splashExited, // wrong seat — ignored
      releaseSheetLoader,
      () => setServerSlow(false),
      splashExited,
      releaseSheetLoader,
      splashExited,
      releaseSheetLoader,
    ];
    for (const event of events) {
      event();
      const count = activeFullscreenCount();
      expect([0, 1]).toContain(count);
      const layer = getSnapshot().fullscreen;
      if (count === 1) {
        expect(['splash', 'sheet-loader', 'slow-server']).toContain(layer);
      } else {
        expect(layer).toBeNull();
      }
    }
  });

  it('slow-server preempts the boot splash and restores it while still booting', () => {
    expect(getSnapshot().fullscreen).toBe('splash');
    setServerSlow(true);
    expect(getSnapshot().fullscreen).toBe('slow-server');
    expect(getSnapshot().serverSlow).toBe(true);
    expect(activeFullscreenCount()).toBe(1); // still exactly one layer
    setServerSlow(false);
    expect(getSnapshot().serverSlow).toBe(false);
    expect(getSnapshot().fullscreen).toBe('splash'); // boot not finished
  });

  it('a splash restored after ready is voided — nothing re-mounts the boot splash', () => {
    setServerSlow(true);
    markReady();
    splashExited(); // ignored — the slow card holds the seat
    expect(getSnapshot().fullscreen).toBe('slow-server');
    setServerSlow(false);
    expect(getSnapshot().fullscreen).toBeNull();
  });

  it('slow-server restores a pre-empted sheet loader', () => {
    markReady();
    splashExited();
    expect(activateSheetLoader()).toBe(true);
    setServerSlow(true);
    expect(getSnapshot().fullscreen).toBe('slow-server');
    setServerSlow(false);
    expect(getSnapshot().fullscreen).toBe('sheet-loader');
  });

  it('a sheet request queued during a cold start grants when the card resolves', () => {
    markReady();
    splashExited();
    setServerSlow(true);
    expect(activateSheetLoader()).toBe(false); // queued behind the card
    setServerSlow(false);
    expect(getSnapshot().fullscreen).toBe('sheet-loader');
  });
});

describe('R323 loaderOrchestrator — skip() paths', () => {
  it('flags the sheet loader; the seat frees only on its own release', () => {
    markReady();
    splashExited();
    activateSheetLoader();
    expect(skip()).toBe(true);
    expect(getSnapshot().skipRequested).toBe(true);
    expect(getSnapshot().fullscreen).toBe('sheet-loader'); // exit is the sheet's
    releaseSheetLoader();
    expect(getSnapshot().fullscreen).toBeNull();
    expect(getSnapshot().skipRequested).toBe(false); // consumed
  });

  it('flags the splash for a fast exit', () => {
    expect(skip()).toBe(true);
    expect(getSnapshot().skipRequested).toBe(true);
    expect(getSnapshot().fullscreen).toBe('splash');
    splashExited();
    expect(getSnapshot().fullscreen).toBeNull();
  });

  it('never dismisses the slow-server card — it is informational', () => {
    setServerSlow(true);
    expect(skip()).toBe(false);
    expect(getSnapshot().fullscreen).toBe('slow-server');
    expect(getSnapshot().skipRequested).toBe(false);
  });

  it('is a no-op with no active layer', () => {
    markReady();
    splashExited();
    expect(skip()).toBe(false);
    expect(getSnapshot().skipRequested).toBe(false);
  });
});

describe('R323 loaderOrchestrator — the first-visit contract', () => {
  it('plays only on a true first visit (fake localStorage)', () => {
    const ctx = playing();
    expect(shouldPlayIntro(ctx)).toBe(true);
    ctx.storage.setItem(INTRO_FLAG_KEY, '1');
    expect(shouldPlayIntro(ctx)).toBe(false); // a returning visit
  });

  it('never plays for an authenticated visitor', () => {
    expect(shouldPlayIntro({ ...playing(), authenticated: true })).toBe(false);
  });

  it('reads the persisted mdrk-auth session for authentication', () => {
    expect(isPersistedAuthenticated()).toBe(false);
    window.localStorage.setItem(
      AUTH_PERSISTENCE_KEY,
      JSON.stringify({ state: { user: { id: 'u1' }, accessToken: 'tok' }, version: 1 }),
    );
    expect(isPersistedAuthenticated()).toBe(true);
    // the live auth read suppresses the intro without an injected flag
    expect(shouldPlayIntro({ storage: fakeStorage(), session: fakeStorage() })).toBe(false);
  });

  it('survives a corrupted mdrk-auth payload (reads as guest)', () => {
    window.localStorage.setItem(AUTH_PERSISTENCE_KEY, '{not json');
    expect(isPersistedAuthenticated()).toBe(false);
  });

  it('markIntroPlayed writes madarek.intro.v1 into localStorage', () => {
    expect(window.localStorage.getItem(INTRO_FLAG_KEY)).toBeNull();
    markIntroPlayed();
    expect(window.localStorage.getItem(INTRO_FLAG_KEY)).toBe('1');
    // the LIVE localStorage now carries the flag (session injected fresh
    // so only the flag distinguishes this decision)
    expect(shouldPlayIntro({ session: fakeStorage() })).toBe(false);
  });

  it('the hermetic e2e skip key and the R313 seen flag suppress (never cause a play)', () => {
    const session = fakeStorage();
    session.setItem('madarek-intro-skip', '1');
    expect(shouldPlayIntro({ ...playing(), session })).toBe(false);
    const seen = fakeStorage();
    seen.setItem('madarek-intro-seen', '1');
    expect(shouldPlayIntro({ ...playing(), session: seen })).toBe(false);
  });
});

describe('R323 loaderOrchestrator — reduced motion exposure', () => {
  it('reducedMotion() mirrors matchMedia', () => {
    expect(reducedMotion()).toBe(false); // the setup.ts default mock
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    expect(reducedMotion()).toBe(true);
  });

  it('reduced-motion visitors never play the intro', () => {
    expect(shouldPlayIntro({ ...playing(), reducedMotion: true })).toBe(false);
  });
});

describe('R323 loaderOrchestrator — the route-transition side state', () => {
  it('opens indeterminate, takes determinate progress, closes idempotently', () => {
    markReady();
    splashExited(); // a quiet app: the strip must not be read as a layer
    const done = requestRouteTransition();
    expect(getSnapshot().routeTransition).toBe(true);
    expect(getSnapshot().routeProgress).toBeNull(); // indeterminate start
    expect(getSnapshot().fullscreen).toBeNull(); // a strip is NOT fullscreen

    reportRouteProgress(0.4);
    expect(getSnapshot().routeProgress).toBeCloseTo(0.4);
    reportRouteProgress(7); // clamped
    expect(getSnapshot().routeProgress).toBe(1);

    done();
    expect(getSnapshot().routeTransition).toBe(false);
    expect(getSnapshot().routeProgress).toBeNull();
    done(); // idempotent
    expect(getSnapshot().routeTransition).toBe(false);
  });

  it('ignores progress while no transition is open', () => {
    reportRouteProgress(0.9);
    expect(getSnapshot().routeTransition).toBe(false);
    expect(getSnapshot().routeProgress).toBeNull();
  });

  it('endRouteTransition() closes it without the done-callback', () => {
    requestRouteTransition();
    endRouteTransition();
    expect(getSnapshot().routeTransition).toBe(false);
  });
});

describe('R323 loaderOrchestrator — subscription + the React hook', () => {
  it('subscribe fires on change and unsubscribes cleanly', () => {
    const seen: LoaderSnapshot[] = [];
    const unsubscribe = subscribe((s) => seen.push(s));
    markHydrating();
    unsubscribe();
    markReady();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.phase).toBe('hydrating');
  });

  it('a throwing listener never breaks the machine or its peers', () => {
    const seen: LoaderSnapshot[] = [];
    subscribe(() => {
      throw new Error('boom');
    });
    const unsubscribe = subscribe((s) => seen.push(s));
    markHydrating();
    unsubscribe();
    expect(seen).toHaveLength(1);
    expect(getSnapshot().phase).toBe('hydrating');
  });

  it('useLoaderState() tracks the singleton', () => {
    const { result } = renderHook(() => useLoaderState());
    expect(result.current.phase).toBe('boot');
    expect(result.current.fullscreen).toBe('splash');
    act(() => {
      markHydrating();
      markReady();
    });
    expect(result.current.phase).toBe('ready');
    expect(result.current.reducedMotion).toBe(false);
  });

  it('the frozen facade mirrors the named exports', () => {
    expect(loaderOrchestrator.getSnapshot()).toBe(getSnapshot());
    expect(loaderOrchestrator.activeFullscreenCount()).toBe(activeFullscreenCount());
  });
});
