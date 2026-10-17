/**
 * r180-F1 — academic-structure write hooks (contract pins).
 *
 * The three mutations this round wired to the UI for the first time:
 * useCreateFaculty / useCreateDepartment (POST /admin/faculties +
 * /admin/departments, the r180-B endpoints) and useCreateOffering
 * (POST /offerings — the r168 endpoint that had ZERO frontend
 * consumers until now).
 *
 * Pinned here (the useResources-contracts pattern — lib/api mocked at
 * the module boundary, invalidateQueries spied through a closure):
 *   1. The WIRE: each mutation POSTs its endpoint with EXACTLY the
 *      zod .strict() body the backend accepts — an extra key is a 400,
 *      so a stray FE-only field is a contract regression this catches.
 *   2. The invalidation map: structure writes refresh BOTH faculty
 *      lists (the admin page + the public catalogue rows the course
 *      modal's department picker reads); an offering refreshes the
 *      admin courses table, the dashboard KPIs and the enrollment
 *      offering picker — never the faculty lists (a section changes
 *      no structure aggregate).
 *   3. useAdminTeachers: the offering modal's teacher picker — no idle
 *      fetch while disabled (the modal is closed), and one
 *      GET /admin/users?role=TEACHER window (page 1, limit 200 — the
 *      endpoint's hard cap) mapping rows to the {id, name, email} the
 *      <select> renders.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../src/lib/api', () => {
  // unwrap stays faithful to the real one (r.data.data) so the
  // mutations' mutationFn contract is exercised, not stubbed away.
  const get = vi.fn(async () => ({ data: { data: {} } }));
  const post = vi.fn(async () => ({ data: { data: { id: 'new-row' } } }));
  return {
    api: { get, post, patch: vi.fn(async () => ({ data: {} })), delete: vi.fn(async () => ({ data: {} })) },
    unwrap: <T,>(p: Promise<{ data: { data: T } }>): Promise<T> =>
      p.then((r) => r.data.data),
  };
});

import {
  useCreateFaculty,
  useCreateDepartment,
  useCreateOffering,
  useAdminTeachers,
} from '../../src/hooks/useResources';
import { api } from '../../src/lib/api';

const getMock = api.get as unknown as Mock;
const postMock = api.post as unknown as Mock;

function makeClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const invalidatedKeys = () =>
    invalidate.mock.calls.map((c) => (c[0] as { queryKey: readonly unknown[] }).queryKey);
  return { invalidatedKeys, wrapper };
}

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  postMock.mockResolvedValue({ data: { data: { id: 'new-row' } } });
});

/* ── 1. The structure writes ──────────────────────────────────── */

describe('useCreateFaculty — POST /admin/faculties (r180)', () => {
  it('sends the strict four-field body and refreshes BOTH faculty lists', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useCreateFaculty(), { wrapper });

    await act(async () => {
      result.current.mutate({ name: 'كلية العلوم', city: 'الزاوية' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The wire: endpoint + EXACTLY the zod .strict() fields.
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/admin/faculties', {
      name: 'كلية العلوم',
      city: 'الزاوية',
    });
    // The invalidation map: the admin page list + the public catalogue.
    expect(invalidatedKeys()).toContainEqual(['admin', 'faculties']);
    expect(invalidatedKeys()).toContainEqual(['faculties']);
  });

  it('passes the optional dressing (nameEn/iconEmoji) through untouched', async () => {
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useCreateFaculty(), { wrapper });

    await act(async () => {
      result.current.mutate({ name: 'Faculty of Science', nameEn: 'FoB', iconEmoji: '🧪', city: 'Tripoli' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postMock).toHaveBeenCalledWith('/admin/faculties', {
      name: 'Faculty of Science',
      nameEn: 'FoB',
      iconEmoji: '🧪',
      city: 'Tripoli',
    });
  });
});

describe('useCreateDepartment — POST /admin/departments (r180)', () => {
  it('sends the faculty-scoped body and refreshes BOTH faculty lists', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useCreateDepartment(), { wrapper });

    await act(async () => {
      result.current.mutate({ name: 'قسم الحاسوب', facultyId: 'clsfaculty1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/admin/departments', {
      name: 'قسم الحاسوب',
      facultyId: 'clsfaculty1',
    });
    expect(invalidatedKeys()).toContainEqual(['admin', 'faculties']);
    expect(invalidatedKeys()).toContainEqual(['faculties']);
  });
});

/* ── 2. The offering write ────────────────────────────────────── */

describe('useCreateOffering — POST /offerings (r180)', () => {
  it('sends the five-field body and refreshes the offering surfaces, never the structure', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useCreateOffering(), { wrapper });

    await act(async () => {
      result.current.mutate({
        courseId: 'clscourse1',
        teacherId: 'clsteacher1',
        term: '2024-FALL',
        room: 'قاعة A12',
        capacity: 40,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The wire: endpoint + EXACTLY the zod .strict() fields (the room
    // key rides only when the FE has one — AdminPages omits it when
    // the input is empty, which the page-level tests cover).
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/offerings', {
      courseId: 'clscourse1',
      teacherId: 'clsteacher1',
      term: '2024-FALL',
      room: 'قاعة A12',
      capacity: 40,
    });
    // The invalidation map: the admin courses table + KPIs + the
    // enrollment offering picker — the mission's exact set.
    expect(invalidatedKeys()).toContainEqual(['admin', 'courses']);
    expect(invalidatedKeys()).toContainEqual(['admin', 'stats']);
    expect(invalidatedKeys()).toContainEqual(['enrollments', 'offerings']);
    // A section changes no structure aggregate — the faculty lists
    // must NOT refetch (a structure write invalidates them; this one
    // does not).
    expect(invalidatedKeys()).not.toContainEqual(['admin', 'faculties']);
    expect(invalidatedKeys()).not.toContainEqual(['faculties']);
  });
});

/* ── 3. The teacher picker ────────────────────────────────────── */

describe('useAdminTeachers — the offering modal picker (r180)', () => {
  it('fetches NOTHING while disabled (the modal is closed)', async () => {
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useAdminTeachers(false), { wrapper });

    await act(async () => {});
    expect(getMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('reads one /admin/users?role=TEACHER window and maps rows to picker options', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: [
          { id: 't1', email: 'salim@zu.edu.ly', firstName: 'سالم', lastName: 'الطاهر' },
          { id: 't2', email: 'maryam@zu.edu.ly', firstName: 'مريم', lastName: 'الفيتوري' },
        ],
      },
    });
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useAdminTeachers(true), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith('/admin/users', {
      params: { page: 1, limit: 200, role: 'TEACHER' },
    });
    // The <select> consumes {id, name, email} — the name is the joined
    // display string, exactly the two rows on the wire.
    expect(result.current.data).toEqual([
      { id: 't1', name: 'سالم الطاهر', email: 'salim@zu.edu.ly' },
      { id: 't2', name: 'مريم الفيتوري', email: 'maryam@zu.edu.ly' },
    ]);
  });
});
