/**
 * r157 (W2-F10 / 6A9 #4 + #7) — admin students enrollment pins.
 *
 * #4 — the drop gate: cancelling a student's enrollment deletes the
 * row AND the student's progress in the course — an irreversible
 * destructive action. It used to fire on a single click of the row's
 * «إلغاء التسجيل» button. It is now behind the accessible
 * ConfirmDialog (focus trap + Escape + aria) with the danger tone,
 * the course named in the message, a destructive confirm label
 * («إلغاء نهائي») and a per-row in-flight label («جارٍ الإلغاء…»)
 * keyed by drop.variables. The modal title is an <h3> — parity with
 * the AdminPages course modal.
 *
 * #7 — the shared footer: the roster consumes TablePaginationFooter
 * (exported from AdminPages this round) — bounded pageList with
 * aria-current=page on the CURRENT page only, the countAr «طالب»
 * counted noun, and server-side ?page=2 requests when paging. The
 * old local .admin-pagination footer (prev/next chevrons only, no
 * page list) is deleted with its dead CSS.
 *
 * lib/api is mocked at the module boundary (the 16-E5 pattern);
 * timers stay real so the 300ms debounce fires inside waitFor's act
 * scope, exactly as in production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/lib/api', () => {
  const get = vi.fn(async () => ({ data: {} }));
  const post = vi.fn(async () => ({ data: {} }));
  const del = vi.fn(async () => ({ data: {} }));
  return {
    api: { get, post, delete: del },
    unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
      promise.then((r) => r.data.data),
  };
});

import { AdminStudentsPage } from '../../src/pages/admin/AdminExtraPages';
import { api } from '../../src/lib/api';

const getMock = api.get as unknown as Mock;
const deleteMock = api.delete as unknown as Mock;

/* ── Fixtures ──────────────────────────────────────────────────── */

const STUDENT = {
  id: 'student_1',
  email: 'ahmed@zu.edu.ly',
  firstName: 'أحمد',
  lastName: 'الزروق',
  isActive: true,
  avatarColor: null,
  avatarInitials: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  studentProfile: {
    universityId: 'U-2025-001',
    year: 2,
    gpa: '3.4',
    totalXp: 120,
    level: 4,
    faculty: { id: 'f1', name: 'كلية الهندسة' },
    department: { id: 'd1', name: 'قسم الحاسوب' },
  },
};

const ENROLLMENTS = [
  {
    id: 'enr-1',
    progressPct: 45,
    status: 'active',
    enrolledAt: '2025-02-01T00:00:00.000Z',
    offering: {
      id: 'off-1',
      term: '2024-2025/1',
      room: null,
      capacity: 40,
      course: { id: 'c1', name: 'هندسة البرمجيات', code: 'CS201', iconEmoji: null },
      teacher: { id: 't1', firstName: 'سالم', lastName: 'الطاهر' },
    },
  },
  {
    id: 'enr-2',
    progressPct: 10,
    status: 'active',
    enrolledAt: '2025-02-05T00:00:00.000Z',
    offering: {
      id: 'off-2',
      term: '2024-2025/1',
      room: null,
      capacity: 30,
      course: { id: 'c2', name: 'قواعد البيانات', code: 'CS301', iconEmoji: null },
      teacher: { id: 't2', firstName: 'خالد', lastName: 'العمروني' },
    },
  },
];

const OFFERINGS = [
  {
    id: 'off-3',
    term: '2024-2025/2',
    room: null,
    capacity: 25,
    course: { id: 'c3', name: 'الذكاء الاصطناعي', code: 'CS401', iconEmoji: null },
    teacher: { id: 't3', firstName: 'مريم', lastName: 'الفيتوري' },
    _count: { enrollments: 5 },
  },
];

const FACULTIES = [
  { id: 'f1', name: 'كلية الهندسة', iconEmoji: null, city: 'الزاوية', departments: [] },
];

/** GET /admin/students request params, in order. */
const studentsCalls = (): Array<Record<string, unknown>> =>
  getMock.mock.calls
    .filter((c) => c[0] === '/admin/students')
    .map((c) => (c[1] as { params?: Record<string, unknown> } | undefined)?.params ?? {});

/**
 * Installs the roster + modal fixtures. `studentsMeta` controls the
 * pagination contract under test (the footer pin drives 2 pages).
 */
function installApi(studentsMeta = { page: 1, limit: 20, total: 22, totalPages: 2 }) {
  getMock.mockImplementation(async (url: string, cfg?: { params?: Record<string, unknown> }) => {
    const params = cfg?.params ?? {};
    switch (url) {
      case '/admin/students': {
        // Server-side pagination: page 2 serves the same row (the roster
        // contract — the request is the pin, not the rows).
        const page = (params.page as number) ?? 1;
        return { data: { data: [STUDENT], meta: { ...studentsMeta, page } } };
      }
      case '/faculties':
        return { data: { data: FACULTIES } };
      case '/enrollments':
        return { data: { data: ENROLLMENTS } };
      case '/enrollments/offerings':
        return { data: { data: OFFERINGS } };
      default:
        throw new Error(`unexpected GET ${url}`);
    }
  });
}

function renderStudentsPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminStudentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { client };
}

beforeEach(() => {
  getMock.mockReset();
  deleteMock.mockReset();
  deleteMock.mockResolvedValue({ data: { data: { ok: true } } });
});

/* ── 6A9 #4 — the drop gate ────────────────────────────────────── */

describe('EnrollmentModal — the drop gate (r157 / 6A9 #4)', () => {
  it('titles the modal with an <h3> (AdminPages parity), not a styled div', async () => {
    installApi();
    renderStudentsPage();

    fireEvent.click(await screen.findByRole('button', { name: 'بيانات وتسجيلات أحمد الزروق' }));
    // r253 re-pin: the action lives behind the row's inline expansion.
    fireEvent.click(await screen.findByRole('button', { name: 'تسجيلات' }));
    const title = await screen.findByRole('heading', { level: 3, name: 'تسجيلات أحمد الزروق' });
    expect(title.tagName).toBe('H3');
  });

  it('asks before deleting: danger dialog names the course and confirms with «إلغاء نهائي»', async () => {
    installApi();
    renderStudentsPage();

    fireEvent.click(await screen.findByRole('button', { name: 'بيانات وتسجيلات أحمد الزروق' }));
    // r253 re-pin: the action lives behind the row's inline expansion.
    fireEvent.click(await screen.findByRole('button', { name: 'تسجيلات' }));
    // Two enrollments → two row buttons; gate the first (هندسة البرمجيات).
    const dropButtons = await screen.findAllByRole('button', { name: 'إلغاء التسجيل' });
    fireEvent.click(dropButtons[0]!);

    // The message names the course and the progress it destroys.
    expect(
      await screen.findByText(/سيُحذف تسجيل الطالب في «هندسة البرمجيات» وتقدُّمه نهائيًا/),
    ).toBeInTheDocument();
    // The confirm is the destructive label, not a generic «تأكيد».
    expect(screen.getByRole('button', { name: 'إلغاء نهائي' })).toBeInTheDocument();

    // Cancel closes the dialog ONLY — no DELETE ever fires.
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'إلغاء نهائي' })).toBeNull();
    });
    expect(deleteMock).not.toHaveBeenCalled();
    // The modal itself stays open (the roster of enrollments is still there).
    expect(screen.getByRole('heading', { level: 3, name: 'تسجيلات أحمد الزروق' })).toBeInTheDocument();
  });

  it('confirm fires ONE delete for the confirmed row and the per-row pending label rides drop.variables', async () => {
    installApi();
    // DELETE never settles → drop.isPending stays true → the per-row
    // in-flight label is observable (the key the pin is about).
    deleteMock.mockImplementation(() => new Promise(() => {}));
    renderStudentsPage();

    fireEvent.click(await screen.findByRole('button', { name: 'بيانات وتسجيلات أحمد الزروق' }));
    // r253 re-pin: the action lives behind the row's inline expansion.
    fireEvent.click(await screen.findByRole('button', { name: 'تسجيلات' }));
    const dropButtons = await screen.findAllByRole('button', { name: 'إلغاء التسجيل' });
    expect(dropButtons).toHaveLength(2);

    // Gate the FIRST enrollment (هندسة البرمجيات) through the dialog.
    fireEvent.click(dropButtons[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'إلغاء نهائي' }));

    // The dialog closed immediately (AdminPages course-delete parity) —
    // the in-flight signal is the ROW label, keyed by drop.variables.
    const pending = await screen.findByRole('button', { name: 'جارٍ الإلغاء…' });
    expect(pending).toBeDisabled();
    // Only the in-flight row changed; the sibling keeps its idle label.
    expect(screen.getByRole('button', { name: 'إلغاء التسجيل' })).toBeInTheDocument();
    // Exactly one DELETE, for the confirmed enrollment.
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith('/enrollments/enr-1');
  });
});

/* ── 6A9 #7 — the shared roster footer ─────────────────────────── */

describe('AdminStudentsPage — shared TablePaginationFooter (r157 / 6A9 #7)', () => {
  it('pageList with aria-current=page on the CURRENT page only + the countAr «طالب» unit + server ?page=2', async () => {
    installApi();
    renderStudentsPage();

    // The shared footer renders inside .table-wrap with the counted
    // noun of THIS roster — «22 طالباً» (countAr many-form), never the
    // papers noun the pre-unit-prop footer hardcoded.
    const footer = await waitFor(() => {
      const el = document.querySelector('.table-pagination span');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(footer.textContent).toContain('الصفحة 1 من 2');
    expect(footer.textContent).toContain('22 طالباً');
    expect(footer.textContent).not.toContain('ورقة');

    // The bounded page list: page 1 is the CURRENT page (aria-current),
    // page 2 is a plain navigation button.
    const page1 = screen.getByRole('button', { name: 'الصفحة 1' });
    const page2 = screen.getByRole('button', { name: 'الصفحة 2' });
    expect(page1).toHaveAttribute('aria-current', 'page');
    expect(page2).not.toHaveAttribute('aria-current');

    // Paging is a server round-trip (?page=2), not a client slice.
    fireEvent.click(page2);
    await waitFor(() => {
      expect(studentsCalls().some((p) => p.page === 2)).toBe(true);
    });
    // And the current page moved with the data.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'الصفحة 2' })).toHaveAttribute('aria-current', 'page');
    });
  });
});
