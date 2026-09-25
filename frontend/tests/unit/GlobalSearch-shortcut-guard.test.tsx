/**
 * GlobalSearch ⌘K / "/" shortcut guard (audit 11-e P1-6, wave 12-15).
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
 * Since wave 16-E3 the component lives on the query cache (15-d P2-8),
 * so the render carries a fresh QueryClient — the shortcut tests never
 * type, so no query ever fires (the debounced key stays under the
 * 2-char gate and disabled).
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch } from '../../src/components/layout/GlobalSearch';
import { overlayStack } from '../../src/lib/overlayStack';

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const searchInput = () => screen.getByLabelText('بحث');
const pressSlash = () => fireEvent.keyDown(document, { key: '/' });
const pressCmdK = () => fireEvent.keyDown(document, { key: 'k', metaKey: true });

describe('GlobalSearch — shortcut guard (11-e P1-6)', () => {
  afterEach(() => {
    overlayStack.unregister('guard-test-modal');
    cleanup();
  });

  it('"/" and ⌘K focus the search when no overlay is open (baseline kept)', () => {
    renderSearch();
    expect(searchInput()).not.toHaveFocus();
    pressSlash();
    expect(searchInput()).toHaveFocus();

    searchInput().blur();
    pressCmdK();
    expect(searchInput()).toHaveFocus();
  });

  it('shortcuts stay inert while an [aria-modal="true"] dialog is live', () => {
    renderSearch();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(dialog);
    try {
      pressSlash();
      expect(searchInput()).not.toHaveFocus();
      pressCmdK();
      expect(searchInput()).not.toHaveFocus();
    } finally {
      dialog.remove();
    }
  });

  it('shortcuts stay inert while a layer is registered on the overlay stack', () => {
    renderSearch();
    overlayStack.register('guard-test-modal', 'modal');
    try {
      pressCmdK();
      expect(searchInput()).not.toHaveFocus();
      pressSlash();
      expect(searchInput()).not.toHaveFocus();
    } finally {
      overlayStack.unregister('guard-test-modal');
    }
  });
});
