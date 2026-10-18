/**
 * r186 — typographic book jackets (library covers).
 *
 * The books grid used to render every book as the same generic icon
 * tile (category icon on a tint wash). The jacket is a deterministic
 * cover composed from the book's own data — title, author, category
 * tint — with no upload path and no binary storage. These pins hold
 * the closed contract:
 *   1. The jacket shows the book's title and author visually (the
 *      duplication with the card body is the book-grid convention —
 *      the cover is the visual identity, the body is the data).
 *   2. The whole jacket is aria-hidden — a screen reader never meets
 *      the title twice; the accessible name stays in the body.
 *   3. The jacket rides the book's own themeColor (inline tint + the
 *      --book-tint custom property the spine/band/ink recipes read);
 *      a book without themeColor falls back to the shared
 *      DEFAULT_COURSE_TINT.
 *   4. The publisher strip names the category beside its icon.
 *   5. The loading skeleton matches the jacket's settled height
 *      (140px) — shape-matched loading, never a shape jump.
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

const cardOf = (title: string) =>
  Array.from(document.querySelectorAll('.thumb-card')).find((c) =>
    (c.querySelector('.thumb-card-title')?.textContent ?? '').includes(title));

describe('r186 — typographic book jackets', () => {
  beforeEach(() => {
    state.pending = false;
    state.envelope.rows = [makeBook()];
    state.envelope.meta = { page: 1, limit: 24, total: 1, totalPages: 1 };
  });

  it('shows the title and author on the jacket (visual duplication by design)', () => {
    renderLibrary();
    const cover = cardOf('شبكات الحاسوب')?.querySelector<HTMLElement>('.lib-book-cover');
    expect(cover).not.toBeNull();
    expect(cover?.querySelector('.lib-cover-title')?.textContent)
      .toBe('شبكات الحاسوب: النظرية والتطبيق');
    expect(cover?.querySelector('.lib-cover-author')?.textContent)
      .toBe('د. هدى بن عامر');
  });

  it('the jacket is aria-hidden — the accessible title/author stay in the card body', () => {
    renderLibrary();
    const cover = cardOf('شبكات الحاسوب')?.querySelector<HTMLElement>('.lib-book-cover');
    expect(cover?.getAttribute('aria-hidden')).toBe('true');
    // The body's title carries the hover/tooltip contract, not the cover.
    const card = cover?.closest('.thumb-card');
    expect(card?.querySelector('.thumb-card-title')?.getAttribute('title'))
      .toBe('شبكات الحاسوب: النظرية والتطبيق');
  });

  it('rides the book themeColor (field + --book-tint); DEFAULT_COURSE_TINT when absent', () => {
    const first = renderLibrary();
    const style = cardOf('شبكات الحاسوب')?.querySelector<HTMLElement>('.lib-book-cover')?.getAttribute('style') ?? '';
    expect(style).toContain('#0ea5e9');
    expect(style).toContain('--book-tint');
    expect(style).toContain('color-mix(in srgb, #0ea5e9 12%, var(--surface))');

    // A book with no themeColor falls back to the shared default tint.
    state.envelope.rows = [makeBook({ themeColor: null })];
    first.unmount();
    renderLibrary();
    const fallback = cardOf('شبكات الحاسوب')?.querySelector<HTMLElement>('.lib-book-cover');
    expect(fallback?.getAttribute('style')).toContain('#3D6BD6');
  });

  it('the publisher strip names the category beside its icon', () => {
    renderLibrary();
    const band = cardOf('شبكات الحاسوب')?.querySelector('.lib-cover-band');
    expect(band?.textContent).toContain('شبكات');
    // The band carries a lucide icon (svg), never an emoji.
    expect(band?.querySelector('svg')).not.toBeNull();
  });

  it('the skeleton matches the jacket height (140px — shape-matched loading)', () => {
    state.pending = true;
    state.envelope.rows = [];
    state.envelope.meta = { page: 1, limit: 24, total: 0, totalPages: 1 };
    renderLibrary();
    const tile = document.querySelector('.lib-skel-tile');
    expect(tile).not.toBeNull();
    const coverSkeleton = tile?.firstElementChild as HTMLElement | null;
    // The Skeleton component writes its height inline — same settled
    // height as the jacket, so loading never shifts the grid.
    expect(coverSkeleton?.getAttribute('style')).toContain('height: 140px');
  });
});
