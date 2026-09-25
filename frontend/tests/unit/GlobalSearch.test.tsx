/**
 * GlobalSearch data-flow + combobox-ARIA suite (wave 16-E3).
 *
 * Covers the three 16-E3 fixes on this file:
 *  1. 15-e P1-3 / 15-d P2-8 — the search lives on the query cache with
 *     an AbortController riding the raw GET; clearing the query
 *     mid-flight can no longer leave a permanent loading row (the old
 *     manual effect's `cancelled` flag suppressed its own finally, so
 *     nothing ever reset `loading`).
 *  2. 15-g P1-1 — combobox ARIA: role="combobox" + aria-expanded /
 *     aria-controls / aria-activedescendant wiring, listbox → group →
 *     option roles with stable ids, and the Arabic results-count live
 *     announcement.
 *  3. 15-d P2-8 — a failed fetch renders a retryable error row, never
 *     the "no results" empty state; identical re-searches are served
 *     from the cache without a second GET.
 *
 * lib/api is mocked (the module both `api.get` and `unwrap` come from);
 * timers stay real so the 300ms debounce fires inside waitFor's act
 * scope, exactly as in production.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getMock = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/api', () => ({
  api: { get: getMock },
  // Mirrors the real one-liner — unwraps the `{ data }` envelope.
  unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
    promise.then((r) => r.data.data),
}));

import { GlobalSearch } from '../../src/components/layout/GlobalSearch';

interface Hit {
  id: string;
  title: string;
  subtitle: string;
  iconEmoji: string | null;
  themeColor: string | null;
  href: string;
}

const hit = (id: string): Hit => ({
  id,
  title: `نتيجة ${id}`,
  subtitle: 'قسم الحاسوب',
  iconEmoji: null,
  themeColor: null,
  href: `/courses/${id}`,
});

const resultsWith = (courses: Hit[], lectures: Hit[] = []) => ({
  courses,
  lectures,
  papers: [],
  tracks: [],
});

function renderSearch() {
  const client = new QueryClient({
    defaultOptions: {
      // staleTime mirrors the shared client's 30s — it is what makes
      // identical re-searches cache-served, so the cache test pins the
      // app's real configuration. retry:false keeps failures single-
      // attempt and deterministic.
      queries: { retry: false, staleTime: 30_000 },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const searchInput = () => screen.getByRole('combobox');

/** Types a term, waits for the debounced dropdown to open, and —
 * unless settle:false — for the fetch to settle: the SR status region
 * only carries text once loading is over, whichever way it went
 * (results, empty, or error). */
async function type(term: string, opts?: { settle?: boolean }) {
  fireEvent.change(searchInput(), { target: { value: term } });
  await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument(), { timeout: 2000 });
  if (opts?.settle === false) return;
  await waitFor(() => {
    expect(screen.getByRole('status').textContent).not.toBe('');
  }, { timeout: 2000 });
}

/** Waits for the debounced dropdown to fully close again. */
async function waitForClosedDropdown() {
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument(), { timeout: 2000 });
}

beforeEach(() => {
  getMock.mockReset();
});

describe('GlobalSearch — combobox ARIA (15-g P1-1)', () => {
  it('exposes the input as a collapsed combobox before any term settles', () => {
    renderSearch();
    const input = searchInput();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-controls');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('wires aria-expanded/aria-controls/aria-activedescendant to the listbox and its options', async () => {
    renderSearch();
    getMock.mockResolvedValue({ data: { data: resultsWith([hit('a'), hit('b')]) } });
    await type('هندسة');

    const input = searchInput();
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(input).toHaveAttribute('aria-controls', listbox.id);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(listbox).toContainElement(options[0]!);
    // Active descendant follows the first row, then ArrowDown moves it.
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', options[1]!.id);
  });

  it('groups options under labelled section groups inside the listbox', async () => {
    renderSearch();
    getMock.mockResolvedValue({ data: { data: resultsWith([hit('a')], [hit('b')]) } });
    await type('هندسة');
    const listbox = screen.getByRole('listbox');
    const coursesGroup = screen.getByRole('group', { name: 'مقررات' });
    const lecturesGroup = screen.getByRole('group', { name: 'محاضرات' });
    expect(listbox).toContainElement(coursesGroup);
    expect(listbox).toContainElement(lecturesGroup);
  });

  it('announces the Arabic plural result count in the polite live region', async () => {
    renderSearch();
    getMock.mockResolvedValue({ data: { data: resultsWith([hit('a'), hit('b'), hit('c')]) } });
    await type('هندسة');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 نتائج'));
  });

  it('announces the singular count for one hit and the miss for zero hits', async () => {
    renderSearch();
    getMock.mockResolvedValueOnce({ data: { data: resultsWith([hit('a')]) } });
    await type('هندسة');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('نتيجة واحدة'));

    getMock.mockResolvedValueOnce({ data: { data: resultsWith([]) } });
    await type('برمجة');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('لم نعثر على نتائج'));
    // The visible empty state names the term; the live region stays generic.
    expect(screen.getByText('لم نعثر على نتائج لـ "برمجة"')).toBeInTheDocument();
  });
});

describe('GlobalSearch — stuck-loading fix + abort (15-e P1-3)', () => {
  it('closing the term mid-flight never leaves a stuck loading row', async () => {
    // A hung GET: the promise never settles, so only the query-layer
    // state machine (not the response) can end the loading row.
    renderSearch();
    getMock.mockImplementation(() => new Promise(() => {}));
    await type('هندسة', { settle: false });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.change(searchInput(), { target: { value: '' } });
    await waitForClosedDropdown();
    expect(searchInput()).toHaveAttribute('aria-expanded', 'false');
  });

  it('rides an AbortController signal on the raw GET', async () => {
    renderSearch();
    getMock.mockResolvedValue({ data: { data: resultsWith([hit('a')]) } });
    await type('هندسة');
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock.mock.calls[0]?.[0]).toBe(`/search/global?q=${encodeURIComponent('هندسة')}`);
    expect(getMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('GlobalSearch — query-cache migration (15-d P2-8)', () => {
  it('serves an identical re-search from the cache without a second GET', async () => {
    renderSearch();
    getMock.mockResolvedValue({ data: { data: resultsWith([hit('a')]) } });
    await type('هندسة');
    await waitFor(() => expect(screen.getByRole('option')).toBeInTheDocument());

    fireEvent.change(searchInput(), { target: { value: '' } });
    await waitForClosedDropdown();

    fireEvent.change(searchInput(), { target: { value: 'هندسة' } });
    await waitFor(() => expect(screen.getByRole('option')).toBeInTheDocument());
    expect(getMock).toHaveBeenCalledTimes(1); // fresh within staleTime → cached
  });

  it('renders a retryable error row on failure — never the no-results state', async () => {
    renderSearch();
    getMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ data: { data: resultsWith([hit('a'), hit('b')]) } });
    await type('برمجة');

    // Both the visible error row and the SR live region carry the verdict.
    await waitFor(() => expect(screen.getAllByText('تعذَّر إتمام البحث')).toHaveLength(2));
    expect(screen.queryByText(/لم نعثر على نتائج/)).not.toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('نتيجتان'));
  });
});
