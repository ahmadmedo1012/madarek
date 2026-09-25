/**
 * 16-E5 — AdminGovernancePages contract pins (audits 15-d P1-1 + 15-e P1-5).
 *
 * 1. pageList — the bounded pagination window. It is a deliberate local
 *    twin of OwnerUsersPage's wave-6-b helper (pages must not import each
 *    other's lazy chunks), so besides the OwnerUsersPage-pagination
 *    behavioural pins it is swept against the original — the two cannot
 *    drift before a shared-lib extraction.
 * 2. AdminTeachersPage server contract (15-d P1-1): the roster query
 *    sends page/limit/role/q to GET /admin/users — role 'TEACHER'
 *    server-side, search debounced 300ms, pagination meta-driven — and
 *    the «عدد الأساتذة» KPI reads the dedicated server count (87), never
 *    the fetched slice (2 rows). The old no-params call silently capped
 *    at 200 users and filtered teachers client-side.
 * 3. Position/scope editor draft persistence (15-e P1-5): an invalidation
 *    refetch delivering a fresh server object must not clobber selects
 *    the admin already changed toward the next save — while switching
 *    teachers/users must still reset them (identity key).
 *
 * lib/api is mocked at the module boundary (api.get + api.post + unwrap);
 * timers stay real so the 300ms debounce fires inside waitFor's act
 * scope, exactly as in production.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/lib/api', () => {
  const get = vi.fn(async () => ({ data: {} }));
  const post = vi.fn(async () => ({ data: {} }));
  return {
    api: { get, post },
    // Mirrors the real one-liner — unwraps the `{ data }` envelope.
    unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
      promise.then((r) => r.data.data),
  };
});

import {
  AdminTeachersPage,
  AdminPermissionsPage,
  pageList,
} from '../../src/pages/admin/AdminGovernancePages';
import { pageList as ownerPageList } from '../../src/pages/owner/OwnerUsersPage';
import { api } from '../../src/lib/api';
import type { AdminUserRow } from '../../src/pages/admin/AdminGovernancePages';

const getMock = api.get as unknown as Mock;
const postMock = api.post as unknown as Mock;

/* ── Factories ─────────────────────────────────────────────────── */

const teacherRow = (id: string, firstName: string): AdminUserRow => ({
  id,
  email: `${id}@zu.edu.ly`,
  firstName,
  lastName: 'الفيتوري',
  role: 'TEACHER',
  avatarColor: null,
  avatarInitials: null,
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
});

interface UsersMeta { page: number; limit: number; total: number; totalPages: number }

const usersBody = (rows: AdminUserRow[], meta: UsersMeta) => ({ data: rows, meta });

const faculties = [
  { id: 'f1', name: 'كلية الهندسة', iconEmoji: null, city: 'الزاوية', departments: [{ id: 'd1', name: 'الحاسوب' }] },
  { id: 'f2', name: 'كلية الطب', iconEmoji: null, city: 'الزاوية', departments: [{ id: 'd2', name: 'الجراحة' }] },
  { id: 'f3', name: 'كلية القانون', iconEmoji: null, city: 'الزاوية', departments: [{ id: 'd3', name: 'القانون العام' }] },
];

const suggestion = (over: {
  position?: 'DEAN' | 'ASSOCIATE_DEAN' | 'DEPARTMENT_HEAD' | null;
  positionFacultyId?: string | null;
  appointedAt?: string | null;
} = {}) => ({
  teacher: {
    id: 't1',
    name: 'سالم الفيتوري',
    email: 't1@zu.edu.ly',
    specialty: 'شبكات',
    rank: 'PROFESSOR',
    degreeLevel: 'PHD' as const,
    yearsExperience: 12,
    certifications: [],
    subjectKeywords: [],
    department: 'الحاسوب',
    departmentId: 'd1',
    faculty: 'كلية الهندسة',
    facultyId: 'f1',
    verified: false,
    position: null,
    positionFacultyId: null,
    positionDepartmentId: null,
    appointedAt: null,
    ...over,
  },
  eligibilityNote: 'مؤهَّل للتدريس',
  suggestedCourses: [],
});

function renderTeachersPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminTeachersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { client };
}

interface UsersCallConfig { params?: Record<string, unknown> }

/** GET /admin/users request params (the axios config of each call), in order. */
const usersCalls = (): Array<Record<string, unknown>> =>
  getMock.mock.calls
    .filter((call) => call[0] === '/admin/users')
    .map((call) => (call[1] as UsersCallConfig | undefined)?.params ?? {});

const rosterCalls = () => usersCalls().filter((p) => p.limit === 20);

/** Scoped metric-value query — the KPI card carrying `label`. */
const kpiValue = (label: string) => {
  const card = screen.getByText(label).closest('div.metric');
  expect(card).not.toBeNull();
  return within(card as HTMLElement).getByText;
};

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
});

/* ── 1. pageList — bounded pagination window ───────────────────── */

describe('pageList — bounded pagination window', () => {
  it('renders a single page with no gaps', () => {
    expect(pageList(1, 1)).toEqual([1]);
  });

  it('always keeps the first and last page reachable (start of list)', () => {
    expect(pageList(1, 5)).toEqual([1, 2, 3, 'gap', 5]);
  });

  it('shows every page when the window covers the whole range', () => {
    expect(pageList(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('windows around the current page in the middle of a long list', () => {
    expect(pageList(10, 30)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 30]);
  });

  it('elides only the far end near the start of the list', () => {
    expect(pageList(2, 30)).toEqual([1, 2, 3, 4, 'gap', 30]);
  });

  it('elides only the near end near the end of the list', () => {
    expect(pageList(29, 30)).toEqual([1, 'gap', 27, 28, 29, 30]);
  });

  it('bounds a 200-page result to ≤ 2·PAGE_NEIGHBORS + 4 number buttons', () => {
    const out = pageList(100, 200);
    expect(out).toEqual([1, 'gap', 98, 99, 100, 101, 102, 'gap', 200]);
    const buttons = out.filter((item): item is number => typeof item === 'number');
    expect(buttons.length).toBeLessThanOrEqual(2 * 2 + 4);
    expect(out[0]).toBe(1);
    expect(out[out.length - 1]).toBe(200);
  });

  it('stays identical to the OwnerUsersPage original across a swept grid (twin guard)', () => {
    for (let totalPages = 1; totalPages <= 30; totalPages++) {
      for (let page = 1; page <= totalPages; page++) {
        expect(pageList(page, totalPages)).toEqual(ownerPageList(page, totalPages));
      }
    }
  });
});

/* ── 2. AdminTeachersPage — server-side roster contract ────────── */

describe('AdminTeachersPage — server-side roster (15-d P1-1)', () => {
  it('sends the TEACHER role filter server-side and drives the KPI from the server count', async () => {
    getMock.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      expect(url).toBe('/admin/users');
      const { limit } = config!.params as { limit: number };
      // limit 1 = the dedicated KPI count query; 20 = the roster page.
      return limit === 1
        ? { data: usersBody([], { page: 1, limit: 1, total: 87, totalPages: 87 }) }
        : { data: usersBody([teacherRow('t1', 'سالم'), teacherRow('t2', 'مريم')], { page: 1, limit: 20, total: 87, totalPages: 5 }) };
    });

    renderTeachersPage();

    // Roster rows land from the server page…
    expect(await screen.findByText('سالم الفيتوري')).toBeInTheDocument();
    expect(screen.getByText('مريم الفيتوري')).toBeInTheDocument();
    // …while the KPI shows the SERVER count (87), not the 2 fetched rows.
    expect(kpiValue('عدد الأساتذة')('87')).toBeInTheDocument();
    // Footer meta: page 1 of 5 · 87 counted-noun total.
    expect(screen.getByText(/الصفحة 1 من 5/)).toBeInTheDocument();
    expect(screen.getByText(/87 أستاذاً/)).toBeInTheDocument();

    // Every /admin/users request carries the server-side role filter.
    const calls = usersCalls();
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const params of calls) {
      expect(params).toMatchObject({ role: 'TEACHER' });
    }
    expect(calls.some((p) => p.limit === 1 && p.page === 1)).toBe(true);
    expect(rosterCalls()[0]).toMatchObject({ page: 1, limit: 20 });
  });

  it('sends the debounced search term server-side, resets to page 1, and offers a clear path', async () => {
    getMock.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      if (url !== '/admin/users') throw new Error(`unexpected GET ${url}`);
      const params = config!.params as { page: number; limit: number; q?: string };
      if (params.limit === 1) {
        return { data: usersBody([], { page: 1, limit: 1, total: 87, totalPages: 87 }) };
      }
      if (params.q === 'سالم') {
        return { data: usersBody([], { page: params.page, limit: 20, total: 0, totalPages: 1 }) };
      }
      return { data: usersBody([teacherRow('t1', 'سالم'), teacherRow('t2', 'مريم')], { page: params.page, limit: 20, total: 87, totalPages: 5 }) };
    });

    renderTeachersPage();
    expect(await screen.findByText('سالم الفيتوري')).toBeInTheDocument();

    // Move to page 2 first — the search must snap back to page 1.
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }));
    await waitFor(() => expect(rosterCalls().some((p) => p.page === 2)).toBe(true));

    // Type → 300ms debounce → ONE server call carrying q + page 1.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'سالم' } });
    await waitFor(
      () => expect(rosterCalls().some((p) => p.q === 'سالم' && p.page === 1)).toBe(true),
      { timeout: 2000 },
    );

    // Zero matches → the honest empty state + clear affordance.
    expect(await screen.findByText('لا نتائج مطابقة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'مسح البحث' }));
    await waitFor(
      () => expect(rosterCalls().some((p) => p.q === undefined)).toBe(true),
      { timeout: 2000 },
    );
    expect(await screen.findByText('سالم الفيتوري')).toBeInTheDocument();
  });

  it('paginates server-side: التالي requests page 2 and the window follows', async () => {
    getMock.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      if (url !== '/admin/users') throw new Error(`unexpected GET ${url}`);
      const params = config!.params as { page: number; limit: number };
      if (params.limit === 1) {
        return { data: usersBody([], { page: 1, limit: 1, total: 87, totalPages: 87 }) };
      }
      return { data: usersBody([teacherRow('t1', 'سالم'), teacherRow('t2', 'مريم')], { page: params.page, limit: 20, total: 87, totalPages: 5 }) };
    });

    renderTeachersPage();
    expect(await screen.findByText('سالم الفيتوري')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الصفحة 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'الصفحة السابقة' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }));
    await waitFor(() => expect(rosterCalls().some((p) => p.page === 2)).toBe(true));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'الصفحة 2' })).toHaveAttribute('aria-current', 'page');
    });
    expect(screen.getByText(/الصفحة 2 من 5/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الصفحة السابقة' })).toBeEnabled();
  });

  it('degrades honestly when the API is down (retryable error, KPI — never a fake zero)', async () => {
    getMock.mockRejectedValue(new Error('network down'));

    renderTeachersPage();

    expect(await screen.findByText('تعذّر تحميل قائمة الأساتذة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
    expect(kpiValue('عدد الأساتذة')('—')).toBeInTheDocument();
  });
});

/* ── 3. Position editor — 15-e P1-5 draft persistence ──────────── */

describe('PositionAssignmentCard — invalidation refetch must not clobber drafts (15-e P1-5)', () => {
  it('keeps in-progress edits when the assign refetch lands mid-flight', async () => {
    let suggestionsServed = 0;
    let deliverRefetch: (() => void) | null = null;
    getMock.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      if (url === '/admin/users') {
        const params = config!.params as { limit: number };
        return params.limit === 1
          ? { data: usersBody([], { page: 1, limit: 1, total: 1, totalPages: 1 }) }
          : { data: usersBody([teacherRow('t1', 'سالم')], { page: 1, limit: 20, total: 1, totalPages: 1 }) };
      }
      if (url === '/faculties') return { data: { data: faculties } };
      if (url === '/admin/teachers/t1/suggestions') {
        suggestionsServed += 1;
        if (suggestionsServed === 1) return { data: { data: suggestion() } };
        // The post-save refetch — held until the admin's next edit below.
        return new Promise((resolve) => {
          deliverRefetch = () =>
            resolve({
              data: {
                data: suggestion({
                  position: 'DEAN',
                  positionFacultyId: 'f2',
                  appointedAt: '2026-01-01T00:00:00.000Z',
                }),
              },
            });
        });
      }
      throw new Error(`unexpected GET ${url}`);
    });
    postMock.mockImplementation(async () => ({ data: {} }));

    renderTeachersPage();
    fireEvent.click(await screen.findByRole('button', { name: /سالم/ }));

    const positionSelect = await screen.findByLabelText('المنصب');
    expect(positionSelect).toHaveValue('NONE');

    // Draft the appointment: DEAN of كلية الطب, then save it.
    fireEvent.change(positionSelect, { target: { value: 'DEAN' } });
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'f2' } });
    fireEvent.click(screen.getByRole('button', { name: /تعيين عميد/ }));
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));

    // The save's invalidation refetch is now in flight — the admin
    // starts the NEXT edit (كلية القانون) before it lands.
    await waitFor(() => expect(suggestionsServed).toBe(2));
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'f3' } });

    // Refetch lands with the just-saved truth (DEAN · كلية الطب)…
    expect(deliverRefetch).not.toBeNull();
    await act(async () => {
      deliverRefetch!();
    });
    // …server-derived chrome updates (the appointment line appears)…
    await waitFor(() => expect(screen.getByText(/تمّ التعيين في/)).toBeInTheDocument());
    // …but the admin's newer draft choice survives — the old prop-sync
    // effect snapped the select back to the saved f2.
    expect(screen.getByLabelText('الكلّيّة')).toHaveValue('f3');
    expect(screen.getByLabelText('المنصب')).toHaveValue('DEAN');
  });

  it('still resets the draft when switching to another teacher (identity key)', async () => {
    getMock.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      if (url === '/admin/users') {
        const params = config!.params as { limit: number };
        return params.limit === 1
          ? { data: usersBody([], { page: 1, limit: 1, total: 2, totalPages: 2 }) }
          : { data: usersBody([teacherRow('t1', 'سالم'), teacherRow('t2', 'مريم')], { page: 1, limit: 20, total: 2, totalPages: 1 }) };
      }
      if (url === '/faculties') return { data: { data: faculties } };
      if (url === '/admin/teachers/t1/suggestions') {
        return { data: { data: suggestion({ position: 'DEAN', positionFacultyId: 'f2', appointedAt: '2026-01-01T00:00:00.000Z' }) } };
      }
      if (url === '/admin/teachers/t2/suggestions') {
        return { data: { data: suggestion() } };
      }
      throw new Error(`unexpected GET ${url}`);
    });

    renderTeachersPage();

    // Teacher 1 arrives with a standing DEAN appointment…
    fireEvent.click(await screen.findByRole('button', { name: /سالم/ }));
    expect(await screen.findByLabelText('المنصب')).toHaveValue('DEAN');
    // …the admin starts editing it (dirty draft)…
    fireEvent.change(screen.getByLabelText('المنصب'), { target: { value: 'ASSOCIATE_DEAN' } });

    // …then picks the other teacher — a fresh mount must initialize
    // from HER server state, not carry the previous draft.
    fireEvent.click(screen.getByRole('button', { name: /مريم/ }));
    await waitFor(() => expect(screen.getByLabelText('المنصب')).toHaveValue('NONE'));
  });
});

/* ── 4. Scope editor — the second 15-e P1-5 site ───────────────── */

describe('ScopeAssignmentCard — invalidation refetch must not clobber drafts (15-e P1-5)', () => {
  it('keeps an in-progress scope change when the permissions refetch lands mid-flight', async () => {
    let permissionsServed = 0;
    let deliverRefetch: (() => void) | null = null;
    const permissions = (scopeFacultyId: string | null, scopeFacultyName: string | null) => ({
      user: {
        id: 'u1',
        email: 'amina@zu.edu.ly',
        role: 'ADMIN',
        firstName: 'أمينة',
        lastName: 'المشرفة',
        scopeFacultyId,
        scopeFaculty: scopeFacultyId ? { id: scopeFacultyId, name: scopeFacultyName! } : null,
      },
      roleDefaults: ['USERS_MANAGE' as const],
      effective: ['USERS_MANAGE' as const],
      overrides: [],
    });

    getMock.mockImplementation(async (url: string) => {
      if (url === '/admin/users/u1/permissions') {
        permissionsServed += 1;
        if (permissionsServed === 1) return { data: { data: permissions(null, null) } };
        return new Promise((resolve) => {
          deliverRefetch = () => resolve({ data: { data: permissions('f2', 'كلية الطب') } });
        });
      }
      if (url === '/faculties') return { data: { data: faculties } };
      throw new Error(`unexpected GET ${url}`);
    });
    postMock.mockImplementation(async () => ({ data: {} }));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/admin/permissions/u1']}>
          <Routes>
            <Route path="/admin/permissions/:id" element={<AdminPermissionsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Scope starts university-wide; draft a faculty scope and save it.
    expect(await screen.findByLabelText('النطاق')).toHaveValue('UNIVERSITY');
    fireEvent.change(screen.getByLabelText('النطاق'), { target: { value: 'FACULTY' } });
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'f2' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ النطاق' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));

    // The save's ['admin','users'] invalidation refetches this page's
    // permissions query — held in flight while the admin picks a
    // different faculty for the next edit.
    await waitFor(() => expect(permissionsServed).toBe(2));
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'f3' } });

    expect(deliverRefetch).not.toBeNull();
    await act(async () => {
      deliverRefetch!();
    });
    // Server-derived chrome reflects the saved scope (كلية الطب)…
    await waitFor(() => expect(screen.getByText('كلية الطب')).toBeInTheDocument());
    // …while the in-progress draft (كلية القانون) survives the refetch.
    expect(screen.getByLabelText('الكلّيّة')).toHaveValue('f3');
  });
});
