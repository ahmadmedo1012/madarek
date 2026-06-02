import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

const installDefaults = () => {
  // Always reinstall a working matchMedia default. Tests that need a
  // different return value override this in beforeEach; we re-install
  // here so a previous test's vi.restoreAllMocks() doesn't leave us
  // with a function that returns undefined.
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  // IntersectionObserver default — silent no-op observer.
  if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
    class MockIntersectionObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
      root = null;
      rootMargin = '';
      thresholds: ReadonlyArray<number> = [];
    }
    (window as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver =
      MockIntersectionObserver;
  }
};

beforeEach(() => {
  installDefaults();
});

// Run once at module import too, so the very first render before any
// beforeEach hook still has the default in place.
installDefaults();
