/**
 * r186 → r199 → r232 — the book jacket, renegotiated for the row library.
 *
 * The r186 grid shipped every book as a thumb card with a full
 * typographic jacket (title + author painted on the cover). The r199
 * Superlist re-compose replaced the uniform card grid with full-width
 * ROWS; r232 moves those rows onto the shared RowList/RowItem patterns
 * (Agent S's contract). The jacket becomes an IDENTITY CHIP in the
 * row's leading slot: the book's tinted field, its category mark, and
 * the category band. Painting the title on a chip was unreadable and
 * duplicated the row body — the accessible name now lives ONLY in the
 * row body (single read).
 *
 * Renegotiated pins (deliberate visual change, 4B family):
 *   1. The jacket is a row-scale identity chip (tinted field + category
 *      mark + band) — it no longer paints the title/author; the ROW
 *      body carries title, author and category (single accessible read).
 *   2. The whole jacket stays aria-hidden.
 *   3. The jacket still rides the book's own themeColor (inline tint +
 *      the --book-tint custom property); a book without themeColor
 *      falls back to the shared DEFAULT_COURSE_TINT.
 *   4. The band names the category beside its Lucide icon (never emoji).
 *   5. Loading rides the shared RowList skeleton (aria-busy) — shape-
 *      matched by the pattern, never a bare spinner.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LibraryPage from '../../src/pages/student/LibraryPage';

const state = vi.hoisted(() => ({
  pending: false,
  envelope: {
    rows: [] as Array<Record<string, unknown>>,
    meta: { page: 1, limit: 24, total: 0, totalPages: 1 },
  },
}));
vi.mock('../../src/hooks/useResources', () => ({
  useBooks: () => ({
    data: { data: state.envelope.rows, meta: state.envelope.meta },
    isPending: state.pending,
    isError: false, error: null, refetch: vi.fn(),
  }),
  usePublishedResearch: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useResearchSearch: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useMyLoans: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useBorrowBook: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useReturnLoan: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
}));

const makeBook = (over: Record<string, unknown> = {}) => ({
  id: 'bk-cover',
  title: 'شبكات الحاسوب: النظرية والتطبيق',
  author: 'د. هدى بن عامر',
  category: 'net',
  totalCopies: 3,
  availableCopies: 3,
  themeColor: '#0ea5e9',
  ...over,
});

const renderLibrary = () =>
  render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );

const rowOf = (title: string) =>
  Array.from(document.querySelectorAll('.pf-row')).find((c) =>
    (c.querySelector('.pf-row-title')?.textContent ?? '').includes(title));

describe('r232 — the book row identity chip (renegotiated r186 jacket on the shared rows)', () => {
  beforeEach(() => {
    state.pending = false;
    state.envelope.rows = [makeBook()];
    state.envelope.meta = { page: 1, limit: 24, total: 1, totalPages: 1 };
  });

  it('the ROW body carries the title, author and category (single accessible read)', () => {
    renderLibrary();
    const row = rowOf('شبكات الحاسوب');
    expect(row).not.toBeNull();
    expect(row?.querySelector('.pf-row-title')?.textContent)
      .toBe('شبكات الحاسوب: النظرية والتطبيق');
    expect(row?.querySelector('.pf-row-meta')?.textContent)
      .toContain('د. هدى بن عامر');
    // The category reads in the row meta (and on the chip's band).
    expect(row?.textContent).toContain('شبكات');
    // The chip no longer paints the title — no duplicate read anywhere.
    expect(row?.querySelector('.lib-cover-title')).toBeNull();
  });

  it('the jacket chip is aria-hidden — the accessible title/author stay in the row body', () => {
    renderLibrary();
    const cover = rowOf('شبكات الحاسوب')?.querySelector<HTMLElement>('.lib-book-cover');
    expect(cover?.getAttribute('aria-hidden')).toBe('true');
    // The row title is the accessible name; the chip carries no text twin.
    const row = cover?.closest('.pf-row');
    expect(row?.querySelector('.pf-row-title')?.textContent)
      .toBe('شبكات الحاسوب: النظرية والتطبيق');
  });

  it('rides the book themeColor (field + --book-tint); DEFAULT_COURSE_TINT when absent', () => {
    const first = renderLibrary();
    const style = rowOf('شبكات الحاسوب')?.querySelector<HTMLElement>('.lib-book-cover')?.getAttribute('style') ?? '';
    expect(style).toContain('#0ea5e9');
    expect(style).toContain('--book-tint');
    expect(style).toContain('color-mix(in srgb, #0ea5e9 12%, var(--surface))');

    // A book with no themeColor falls back to the shared default tint.
    state.envelope.rows = [makeBook({ themeColor: null })];
    first.unmount();
    renderLibrary();
    const fallback = rowOf('شبكات الحاسوب')?.querySelector<HTMLElement>('.lib-book-cover');
    expect(fallback?.getAttribute('style')).toContain('#3D6BD6');
  });

  it('the band names the category beside its Lucide icon (never an emoji)', () => {
    renderLibrary();
    const band = rowOf('شبكات الحاسوب')?.querySelector('.lib-cover-band');
    expect(band?.textContent).toContain('شبكات');
    expect(band?.querySelector('svg')).not.toBeNull();
  });

  it('loading rides the shared RowList skeleton (aria-busy, never a bare spinner)', () => {
    state.pending = true;
    state.envelope.rows = [];
    state.envelope.meta = { page: 1, limit: 24, total: 0, totalPages: 1 };
    renderLibrary();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(document.querySelector('.pf-row')).toBeNull();
  });
});
