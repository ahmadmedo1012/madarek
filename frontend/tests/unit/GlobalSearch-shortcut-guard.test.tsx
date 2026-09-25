/**
 * GlobalSearch "/" shortcut + ⌘K delegation (audit 11-e P1-6, wave 21-a).
 *
 * The document-level shortcuts must stay inert while a focus-trapped
 * overlay is open — focusing the input behind a modal scrim breaks the
 * trap, which only guards Tab/Escape, not programmatic focus moves.
 * Covered both guard signals:
 *  1. the DOM fallback — any live [aria-modal="true"] dialog;
 *  2. the overlay-stack platform (lib/overlayStack, batch 12-14) —
 *     GlobalSearch resolves it through an eager import.meta.glob, so
 *     this test also proves the glob resolves to the same registry
 *     singleton a direct import sees.
 *
 * Wave 21-a (4-A2 P2-8/P1-3) reshaped the chord ownership:
 *  - "/" still focuses the pill — but ONLY on the desktop band; on the
 *    ≤920px band (matchMedia) the pill is display:none and the chord
 *    opens the command palette via the onOpenCommandPalette prop.
 *  - ⌘K/Ctrl+K no longer belongs to GlobalSearch at all — AppShell owns
 *    the chord and opens the command palette. The pill's standalone
 *    behavior is pinned here so the delegation boundary is explicit.
 *
 * Since wave 16-E3 the component lives on the query cache (15-d P2-8),
 * so the render carries a fresh QueryClient — the shortcut tests never
 * type, so no query ever fires (the debounced key stays under the
 * 2-char gate and disabled).
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch } from '../../src/components/layout/GlobalSearch';
import { overlayStack } from '../../src/lib/overlayStack';

function renderSearch(onOpenCommandPalette?: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GlobalSearch onOpenCommandPalette={onOpenCommandPalette} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const searchInput = () => screen.getByLabelText('بحث');
const pressSlash = () => fireEvent.keyDown(document, { key: '/' });
const pressCmdK = () => fireEvent.keyDown(document, { key: 'k', metaKey: true });

/** Replaces the matchMedia stub (tests/setup.ts) for one test. */
function setMobileBand(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: matches && query === '(max-width: 920px)',
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  overlayStack.unregister('guard-test-modal');
  cleanup();
});

describe('GlobalSearch — "/" shortcut (desktop band)', () => {
  it('focuses the search when no overlay is open (baseline kept)', () => {
    renderSearch();
    expect(searchInput()).not.toHaveFocus();
    pressSlash();
    expect(searchInput()).toHaveFocus();
  });

  it('stays inert while an [aria-modal="true"] dialog is live', () => {
    renderSearch();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    try {
      pressSlash();
      expect(searchInput()).not.toHaveFocus();
    } finally {
      dialog.remove();
    }
  });

  it('stays inert while a layer is registered on the overlay stack', () => {
    renderSearch();
    overlayStack.register('guard-test-modal', 'modal');
    try {
      pressSlash();
      expect(searchInput()).not.toHaveFocus();
    } finally {
      overlayStack.unregister('guard-test-modal');
    }
  });
});

describe('GlobalSearch — "/" on the ≤920px band opens the palette (4-A2 P1-3)', () => {
  beforeEach(() => setMobileBand(true));
  afterEach(() => setMobileBand(false));

  it('delegates to onOpenCommandPalette instead of focusing the hidden input', () => {
    const onOpenCommandPalette = vi.fn();
    renderSearch(onOpenCommandPalette);
    pressSlash();
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
    // The pill is display:none on this band — focusing it would be a
    // silent no-op; the chord must not even try.
    expect(searchInput()).not.toHaveFocus();
  });

  it('is a no-op without a palette owner (standalone mounts)', () => {
    renderSearch();
    pressSlash();
    expect(searchInput()).not.toHaveFocus();
  });
});

describe('GlobalSearch — ⌘K ownership moved to the shell (wave 21-a)', () => {
  it('⌘K no longer focuses the pill — AppShell owns the chord (palette)', () => {
    renderSearch();
    pressCmdK();
    expect(searchInput()).not.toHaveFocus();
  });

  it('⌘K does not call the palette delegation prop either (single owner)', () => {
    const onOpenCommandPalette = vi.fn();
    renderSearch(onOpenCommandPalette);
    pressCmdK();
    expect(onOpenCommandPalette).not.toHaveBeenCalled();
  });
});
