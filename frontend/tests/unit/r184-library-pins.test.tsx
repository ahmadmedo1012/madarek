/**
 * r184 — Library honest pagination pins.
 *
 * The books listing used to request `limit: 100` and consume ONLY the
 * data array — the server envelope's meta (total/totalPages) was
 * discarded, so a library with >100 books silently truncated at 100
 * (KPI read "100", no pager, no disclosure). These pins hold the
 * closed contract:
 *   1. useBooks is a PAGINATED envelope consumer — it passes
 *      page + a bounded page size (never a silent 100-row cap) and
 *      the KPI total comes from meta.total, not data.length.
 *   2. The pager (CatalogPage/MessagesInbox RTL convention) renders
 *      only when more than one page exists, and shows the honest
 *      server total with the counted Arabic plural.
 *   3. «السابق» is disabled on page 1; «التالي» advances the page
 *      pointer (the spy sees page 2).
 *   4. A changed search term restarts the browse from page 1.
 *   5. A shrunken tail (page pointer past the last real page) folds
 *      back instead of showing a misleading empty wall.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LibraryPage from '../../src/pages/student/LibraryPage';

/* Controllable envelope: the spy records every (q, category, page,
 * limit) the page requests; `envelope` is what the mock returns. */
const booksCalls = vi.hoisted(() => vi.fn());
const envelope = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  meta: { page: 1, limit: 24, total: 0, totalPages: 1 },
}));
vi.mock('../../src/hooks/useResources', () => ({
  useBooks: (opts: { category?: string; q?: string; page?: number; limit?: number }) => {
    booksCalls(opts);
    return { data: { data: envelope.rows, meta: envelope.meta }, isPending: false, isError: false, error: null, refetch: vi.fn() };
  },
  usePublishedResearch: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useResearchSearch: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useMyLoans: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useBorrowBook: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useReturnLoan: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
}));

const makeBook = (i: number) => ({
  id: `bk${i}`,
  title: `كتاب ${i}`,
  author: 'مؤلف',
  category: 'prog',
  totalCopies: 3,
  availableCopies: 2,
});

const renderLibrary = () =>
  render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );

describe('r184 — library envelope: bounded pages, never a silent 100 cap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    booksCalls.mockClear();
    envelope.rows = [];
    envelope.meta = { page: 1, limit: 24, total: 0, totalPages: 1 };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests a bounded page size with an explicit page pointer — never limit: 100', () => {
    renderLibrary();
    const last = booksCalls.mock.calls.at(-1)?.[0];
    expect(last.page).toBe(1);
    expect(last.limit).toBe(24);
    expect(last.limit).not.toBe(100);
  });

  it('the KPI total reads meta.total, not the page array length', () => {
    // 2 pages × 24 = 48 books total, but only THIS page's 24 rows ship.
    envelope.rows = Array.from({ length: 24 }, (_, i) => makeBook(i));
    envelope.meta = { page: 1, limit: 24, total: 48, totalPages: 2 };
    renderLibrary();
    // 48 formatted ar-LY — the digit system depends on the runtime's
    // ICU (Arabic-Indic ٤٨ or Latin 48), so match either form; the
    // truncated page array would claim 24.
    expect(document.body.textContent).toMatch(/48|٤٨/);
  });
});

describe('r184 — the honest pager (RTL convention)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    booksCalls.mockClear();
    envelope.rows = Array.from({ length: 24 }, (_, i) => makeBook(i));
    envelope.meta = { page: 1, limit: 24, total: 30, totalPages: 2 };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is hidden when a single page holds everything', () => {
    envelope.meta = { page: 1, limit: 24, total: 10, totalPages: 1 };
    renderLibrary();
    expect(screen.queryByRole('button', { name: 'الصفحة التالية' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'الصفحة السابقة' })).toBeNull();
  });

  it('renders with the server total (counted plural) and page of total', () => {
    renderLibrary();
    // The pager's status span, exactly: «الصفحة 1 من 2 · 30 كتاباً»
    // (countAr(30, ['كتاب واحد','كتابان','كتب','كتاباً']) → «30 كتاباً».
    // Function matcher: the span contains nested <bdi> children, so
    // match on the element's own textContent.
    const status = screen.getByText(
      (_, el) =>
        el?.textContent?.replace(/\s+/g, ' ').trim() ===
        'الصفحة 1 من 2 · 30 كتاباً',
    );
    expect(status).toBeInTheDocument();
  });

  it('«السابق» disabled on page 1; «التالي» advances the page pointer', () => {
    renderLibrary();
    const prev = screen.getByRole('button', { name: 'الصفحة السابقة' });
    const next = screen.getByRole('button', { name: 'الصفحة التالية' });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    // The re-render asked the hook for page 2 — the envelope echoes it.
    expect(booksCalls.mock.calls.at(-1)?.[0]?.page).toBe(2);
  });

  it('a changed search term restarts the browse from page 1', () => {
    renderLibrary();
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }));
    expect(booksCalls.mock.calls.at(-1)?.[0]?.page).toBe(2);

    const input = screen.getByPlaceholderText('ابحث عن كتاب أو مؤلف…');
    fireEvent.change(input, { target: { value: 'شبكات' } });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    const last = booksCalls.mock.calls.at(-1)?.[0];
    expect(last.q).toBe('شبكات');
    expect(last.page).toBe(1);
  });

  it('folds a shrunken-tail page pointer back to the last real page', () => {
    renderLibrary();
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }));
    expect(booksCalls.mock.calls.at(-1)?.[0]?.page).toBe(2);

    // The search now shrinks the result to a single page — the pointer
    // (2) is past the last real page (1).
    envelope.rows = Array.from({ length: 3 }, (_, i) => makeBook(i));
    envelope.meta = { page: 2, limit: 24, total: 3, totalPages: 1 };
    const input = screen.getByPlaceholderText('ابحث عن كتاب أو مؤلف…');
    fireEvent.change(input, { target: { value: 'قواعد' } });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    // Synchronous assertion (fake timers): the debounce effect fires
    // the page-1 reset AND the fold-back guard settles in the same
    // act flush — the last hook call must be page 1, not a stale 2.
    expect(booksCalls.mock.calls.at(-1)?.[0]?.page).toBe(1);
  });
});
