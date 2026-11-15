/**
 * GlobalSearch data-flow + combobox-ARIA suite (wave 16-E3, r353-F).
 *
 * Covers the fixes on this file:
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
 *  4. r353-F — the discovery engine wiring: GET /search/discover with
 *     the 15 typed categories, the role filter riding the backend
 *     `categories` param (a STUDENT never asks for people/ question
 *     rows), and the 1-line rows (title + one meta).
 *
 * lib/api is mocked (the module both `api.get` and `unwrap` come from);
 * timers stay real so the 300ms debounce fires inside waitFor's act
 * scope, exactly as in production.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

/* r353-F — the discovery wire: one item shape per /search/discover. */
interface DiscoverItem {
  id: string;
  kind: string;
  titleAr: string;
  subtitleAr: string | null;
  href: string | null;
}

const hit = (id: string): DiscoverItem => ({
  id,
  kind: 'course',
  titleAr: `نتيجة ${id}`,
  subtitleAr: 'قسم الحاسوب',
  href: `/courses/${id}`,
});

/** The records-only category set an unauthed/STUDENT caller asks for
 *  (people + the staff question bank are excluded — the backend scope
 *  nulls those rows for a student, so the pill never requests them). */
const STUDENT_CATEGORIES = [
  'institutions', 'faculties', 'departments', 'courses', 'lectures',
  'materials', 'papers', 'tracks', 'books', 'jobs', 'events', 'announcements',
];

const discoverUrl = (term: string, categories: string[] = STUDENT_CATEGORIES) =>
  `/search/discover?q=${encodeURIComponent(term)}` +
  `&categories=${encodeURIComponent(categories.join(','))}&pageSize=5`;

const resultsWith = (courses: DiscoverItem[], lectures: DiscoverItem[] = []) => ({
  query: 'هندسة',
  categories: {
    courses: { items: courses, total: courses.length },
    lectures: { items: lectures, total: lectures.length },
  },
  tookMs: 1,
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

  it('announces the Arabic plural option count in the polite live region', async () => {
    renderSearch();
    getMock.mockResolvedValue({ data: { data: resultsWith([hit('a'), hit('b'), hit('c')]) } });
    await type('هندسة');
    // 5-B5 (A4 P2-4): the pill's listbox now carries actions + results,
    // so it counts «خيارات» like the palette — was «3 نتائج».
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 خيارات'));
  });

  it('announces the singular count for one hit and the miss for zero hits', async () => {
    renderSearch();
    getMock.mockResolvedValueOnce({ data: { data: resultsWith([hit('a')]) } });
    await type('هندسة');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('خيار واحد'));

    getMock.mockResolvedValueOnce({ data: { data: resultsWith([]) } });
    await type('برمجة');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('لا توجد خيارات'));
    // The visible empty state names the term; the live region stays generic.
    // (15-j P2-1: Latin quotes → Arabic «» — pin updated with the copy change.)
    expect(screen.getByText('لم نعثر على نتائج لـ«برمجة»')).toBeInTheDocument();
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
    // r353-F: the discovery endpoint — the records-only categories for
    // the unauthed store, the term, and the 5-row autocomplete window.
    expect(getMock.mock.calls[0]?.[0]).toBe(discoverUrl('هندسة'));
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
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('خياران'));
  });
});

describe('GlobalSearch — quick-action fallback + Escape reset (5-B5, A4 P2-3/P2-4)', () => {
  it('answers index-missing queries with the role\'s nav actions — no dead end', async () => {
    // «اختبار» has zero rows in /search/discover (no exam rows in the
    // index) but names two student nav destinations. The desktop pill
    // used to show the bare empty state while ⌘K answered with actions.
    const { useAuthStore } = await import('../../src/stores/auth.store');
    useAuthStore.setState({
      user: {
        id: 'u1', email: 's@test.ly', firstName: 'سالم', lastName: 'الزوي',
        role: 'STUDENT' as const,
      },
    });
    try {
      renderSearch();
      getMock.mockResolvedValue({ data: { data: resultsWith([]) } });
      await type('اختبار');

      const actionsGroup = screen.getByRole('group', { name: 'إجراءات سريعة' });
      expect(actionsGroup).toBeInTheDocument();
      const options = within(actionsGroup).getAllByRole('option');
      // PP-X2 (audit P3-25): «تحليل الاختبارات» left the student nav —
      // the /student/exams hub is deleted and the route redirects to
      // /student/online-exams, so exactly ONE exams destination answers
      // the «اختبار» query now.
      expect(options.map((o) => o.textContent)).toEqual([
        'الاختبارات الإلكترونية',
      ]);
      // Not the empty state — the pill answered.
      expect(screen.queryByText(/لم نعثر على نتائج/)).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('خيار واحد'));
    } finally {
      useAuthStore.setState({ user: null });
    }
  });

  it('matches actions through the Arabic normalizer (hamza/ال tolerance)', async () => {
    const { useAuthStore } = await import('../../src/stores/auth.store');
    useAuthStore.setState({
      user: {
        id: 'u1', email: 's@test.ly', firstName: 'سالم', lastName: 'الزوي',
        role: 'STUDENT' as const,
      },
    });
    try {
      renderSearch();
      getMock.mockResolvedValue({ data: { data: resultsWith([]) } });
      // إ variant + definite article — raw includes() finds nothing.
      await type('إختبار');
      const actionsGroup = screen.getByRole('group', { name: 'إجراءات سريعة' });
      expect(within(actionsGroup).getAllByRole('option').length).toBeGreaterThan(0);
    } finally {
      useAuthStore.setState({ user: null });
    }
  });

  it('Escape clears the query — no stale term on the next focus (A4 P2-3)', async () => {
    renderSearch();
    getMock.mockResolvedValue({ data: { data: resultsWith([hit('a')]) } });
    await type('هندسة');
    const input = searchInput();
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitForClosedDropdown();
    // The measured bug: the term survived Escape, so the next "/"
    // refocus reopened the dropdown with old results and fresh typing
    // concatenated («هندسةاختبار»). The term must be gone.
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('GlobalSearch — the r353-F discovery wiring (/search/discover)', () => {
  it('a STUDENT asks for the records-only categories — people and the question bank never requested', async () => {
    const { useAuthStore } = await import('../../src/stores/auth.store');
    useAuthStore.setState({
      user: {
        id: 'u1', email: 's@test.ly', firstName: 'سالم', lastName: 'الزوي',
        role: 'STUDENT' as const,
      },
    });
    try {
      renderSearch();
      getMock.mockResolvedValue({ data: { data: resultsWith([]) } });
      await type('هندسة');
      expect(getMock).toHaveBeenCalledTimes(1);
      const url = getMock.mock.calls[0]?.[0] as string;
      expect(url.startsWith('/search/discover?')).toBe(true);
      // The people + staff-bank categories are NEVER requested for a
      // student (the backend scope would null them anyway — the param
      // keeps the request honest AND saves the scans).
      expect(url).not.toContain('students');
      expect(url).not.toContain('teachers');
      expect(url).not.toContain('questions');
      const categoriesParam = decodeURIComponent(url.split('categories=')[1]?.split('&')[0] ?? '');
      expect(categoriesParam.split(',')).toEqual(STUDENT_CATEGORIES);
    } finally {
      useAuthStore.setState({ user: null });
    }
  });

  it('an ADMIN asks for ALL fifteen categories (the registrar\'s people lookups)', async () => {
    const { useAuthStore } = await import('../../src/stores/auth.store');
    useAuthStore.setState({
      user: {
        id: 'u2', email: 'a@test.ly', firstName: 'إدارة', lastName: 'الكلية',
        role: 'ADMIN' as const,
      },
    });
    try {
      renderSearch();
      getMock.mockResolvedValue({
        data: {
          data: {
            query: 'محمد',
            categories: {
              students: {
                items: [{
                  id: 'stu_1',
                  kind: 'student',
                  titleAr: 'محمد المهدي',
                  subtitleAr: 'UZ-2024-00001 · كلية الهندسة',
                  href: '/admin/students',
                }],
                total: 1,
              },
            },
            tookMs: 2,
          },
        },
      });
      await type('محمد');
      expect(getMock).toHaveBeenCalledTimes(1);
      const url = getMock.mock.calls[0]?.[0] as string;
      const categoriesParam = decodeURIComponent(url.split('categories=')[1]?.split('&')[0] ?? '');
      expect(categoriesParam.split(',')).toHaveLength(15);
      expect(categoriesParam.split(',')).toEqual(expect.arrayContaining(['students', 'teachers', 'questions']));
      // The student row lands under its labelled group, one line:
      // title + one meta.
      const group = screen.getByRole('group', { name: 'الطلاب' });
      const option = within(group).getByRole('option');
      expect(option).toHaveTextContent('محمد المهدي');
      expect(option).toHaveTextContent('UZ-2024-00001 · كلية الهندسة');
    } finally {
      useAuthStore.setState({ user: null });
    }
  });

  it('a null-href row renders as a plain option — clicking it never navigates', async () => {
    renderSearch();
    getMock.mockResolvedValue({
      data: {
        data: {
          query: 'هندسة',
          categories: {
            departments: {
              items: [{
                id: 'dep_1',
                kind: 'department',
                titleAr: 'قسم الهندسة الكهربائية',
                subtitleAr: 'كلية الهندسة',
                href: null,
              }],
              total: 1,
            },
          },
          tookMs: 1,
        },
      },
    });
    await type('هندسة');
    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('قسم الهندسة الكهربائية');
    // The plain row stays in the listbox — a click is absorbed, never a
    // dead navigation (the file-less-paper law).
    fireEvent.click(option);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
