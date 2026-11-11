/**
 * r299 (workstream F — final visual pass, admin & owner) — regression
 * pins for the defects this round fixed. Every pin binds to a semantic
 * contract (role/name/ARIA/behavior), never to a styling accident.
 *
 *  1–3. (retired — the AdminSyncPage went with the /admin/sync
 *     backend, R349 U2)
 *  4. admin.css owns the .spin rule: the sync-in-flight motion had
 *     zero stylesheet rules anywhere, so «جارٍ المزامنة…» and RUNNING
 *     history rows lost their motion signal entirely.
 *  5. Admin modal close buttons ride the .icon-btn chip: the
 *     `modal-close` class had zero CSS rules (a naked X, no 44px
 *     floor, no hover) in every admin/owner modal born from that
 *     grammar.
 *  6. OwnerAlertsPage: an 'error'-severity card reads urgent (the
 *     .owner-alert-card.error rule existed for critical/warning/info
 *     but not for the pair's second member).
 *  7. OwnerUsersPage honesty: «الفئة الأكبر» only prints where it is
 *     TRUE (the old «أكبر شريحة» asserted students were the largest
 *     segment unconditionally).
 *  8. OwnerUsersPage suspended chip: a SUSPENDED institution chip
 *     reads red like every other suspended-institution surface.
 *  9. OwnerActivityPage: the audit log's footer rides the canonical
 *     windowed .table-pagination grammar (the prev/next-only footer
 *     forced linear clicking through 50-row pages).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { AdminCoursesPage } from '../../src/pages/admin/AdminPages';
import { OwnerAlertsPage } from '../../src/pages/owner/OwnerAlertsPage';
import { OwnerUsersPage } from '../../src/pages/owner/OwnerUsersPage';
import { OwnerActivityPage } from '../../src/pages/owner/OwnerActivityPage';
import { api } from '../../src/lib/api';

/* ── lib/api module mock (the AdminConsolePages boundary) ───────── */

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
  Bar: () => <div data-testid="chart-bar" />,
}));

vi.mock('../../src/lib/api', () => {
  const get = vi.fn(async () => ({ data: { data: {} } }));
  const post = vi.fn(async () => ({ data: { data: {} } }));
  return {
    api: { get, post, patch: vi.fn(), delete: vi.fn() },
    unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
      promise.then((r) => r.data.data),
  };
});

const getMock = api.get as unknown as Mock;

const courseRow = (id: string, code: string, name: string) => ({
  id, code, name, credits: 3, themeColor: null,
  faculty: 'كلية الهندسة', facultyEmoji: null,
  department: 'قسم الحاسوب', departmentId: 'd1',
  offeringCount: 1, conceptCount: 0, totalEnrollments: 3,
  totalLectures: 8, totalMaterials: 2, recentOfferings: [],
});

function installAdminApi(fixtures: Record<string, unknown>) {
  // The mock returns the axios-shaped response: `{ data: backendBody }`.
  // unwrap-based hooks read res.data.data; manual hooks (useAdminCourses)
  // read res.data.{data,meta} — one shape serves both.
  getMock.mockImplementation(async (url: string) => {
    if (url in fixtures) return { data: fixtures[url] };
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

/* ── the owner hooks boundary (one mock for the whole file) ──────── */

const usersMocks = vi.hoisted(() => ({
  stats: { data: null as Record<string, number> | null, isPending: false, isError: false },
  users: {
    data: null as {
      data: Array<Record<string, unknown>>;
      meta: { total: number; page: number; limit: number; totalPages: number };
    } | null,
    isPending: false, isError: false, error: null, refetch: () => undefined,
  },
  changeRole: { mutateAsync: vi.fn(), isPending: false, variables: undefined },
  toggleStatus: { mutateAsync: vi.fn(), isPending: false, variables: undefined },
  activity: {
    data: {
      data: [
        { id: 'ev-1', action: 'user.login', createdAt: '2026-10-01T10:00:00.000Z', user: { firstName: 'سالم', lastName: 'الفيتوري', email: 'salim@test.ly' }, resourceType: 'User', resourceId: 'u-1', metadata: null },
        { id: 'ev-2', action: 'institution.update', createdAt: '2026-10-01T11:00:00.000Z', user: null, resourceType: null, resourceId: null, metadata: null },
      ],
      meta: { total: 75, page: 1, limit: 50, totalPages: 2 },
    },
    isPending: false, isError: false, error: null, refetch: () => undefined,
  },
  resolveAlert: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isError: false, variables: undefined, error: null },
}));

vi.mock('../../src/hooks/useOwner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useOwner')>();
  return {
    ...actual,
    useResolveAlert: () => usersMocks.resolveAlert,
    useOwnerStats: () => usersMocks.stats,
    useOwnerUsers: () => usersMocks.users,
    useChangeUserRole: () => usersMocks.changeRole,
    useToggleUserStatus: () => usersMocks.toggleStatus,
    useOwnerActivity: () => usersMocks.activity,
  };
});

/* ═══ 1–3. AdminSyncPage — RETIRED with the /admin/sync backend (R349 U2) ═══ */

/* ═══ 4. admin.css owns the .spin motion rule ══════════════════════ */

describe('admin.css — the .spin rule exists (r299)', () => {
  it('binds the global motion-spin keyframes through motion tokens', () => {
    const sheet = readFileSync(
      resolvePath(__dirname, '../../src/styles/admin.css'),
      'utf8',
    );
    const match = sheet.match(/\.spin\s*\{[^}]*\}/);
    expect(match, 'admin.css must define .spin').toBeTruthy();
    expect(match![0]).toContain('motion-spin');
    expect(match![0]).toContain('var(--motion-duration-');
    expect(match![0]).toContain('var(--ease-linear)');
  });
});

/* ═══ 5. Admin modal close buttons ride the .icon-btn chip ═════════ */

describe('AdminCoursesPage — modal close contract (r299)', () => {
  beforeEach(() => {
    getMock.mockReset();
    installAdminApi({
      '/admin/courses': { data: [courseRow('c1', 'CS101', 'مقدمة في الحاسوب')], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      '/faculties': { data: [] },
    });
  });

  it('the course modal\'s close affordance is the styled icon-btn chip, not the dead modal-close class', async () => {
    renderWithProviders(<AdminCoursesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة مقرّر جديد' }));

    const close = screen.getByRole('button', { name: 'إغلاق' });
    expect(close).toBeInTheDocument();
    // The 44px-floor icon chip — modal-close had zero CSS rules.
    expect(close).toHaveClass('icon-btn');
    expect(close).not.toHaveClass('modal-close');
  });
});

/* ═══ 6. OwnerAlertsPage — error severity reads urgent ═════════════ */

const ALERT_ERROR = {
  id: 'alert-err-1',
  title: 'تعذّر الوصول إلى مخزن الملفات',
  message: 'آخر فحص لم يتلقَّ ردًّا من المخزن.',
  severity: 'error',
  category: 'system',
  createdAt: '2026-10-01T10:00:00.000Z',
  resolvedAt: null,
  resolvedBy: null,
  metadata: null,
};

describe('OwnerAlertsPage — error-severity cards read urgent (r299)', () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockImplementation(async (url: string) => {
      if (url === '/owner/alerts') {
        // The feed query reads res.data directly — the backend body IS
        // the feed (data + meta).
        return { data: { data: [ALERT_ERROR], meta: { total: 1, critical: 1, warning: 0 } } };
      }
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });
  });

  it('the card carries the error class and owner.css gives it the danger edge', async () => {
    renderWithProviders(<OwnerAlertsPage />);
    await screen.findByText('تعذّر الوصول إلى مخزن الملفات');

    const card = document.querySelector('.owner-alert-card.error');
    expect(card).not.toBeNull();

    // The stylesheet rule that paints it — same treatment as critical.
    const sheet = readFileSync(
      resolvePath(__dirname, '../../src/styles/owner.css'),
      'utf8',
    );
    expect(sheet).toMatch(/\.owner-alert-card\.error\s*\{[^}]*var\(--danger\)/);
  });
});

/* ═══ 7–8. OwnerUsersPage — honest «الفئة الأكبر» + red suspended chip */

const USER_ROW = {
  id: 'u-1', firstName: 'سالم', lastName: 'الفيتوري', email: 'salim@test.ly',
  role: 'TEACHER', isActive: true, avatarInitials: 'سف', avatarColor: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  memberships: [{ institution: { id: 'inst-1', name: 'مؤسسة الأندلس التعليمية', slug: 'alandalus-demo', status: 'SUSPENDED' } }],
};

describe('OwnerUsersPage — «الفئة الأكبر» honesty + suspended chip tone (r299)', () => {
  beforeEach(() => {
    usersMocks.users.data = {
      data: [USER_ROW],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
  });

  it('claims «الفئة الأكبر» only for the segment that IS the largest (teachers-heavy)', () => {
    usersMocks.stats.data = { totalUsers: 10, students: 2, teachers: 6, admins: 1, quality: 1 };
    renderWithProviders(<OwnerUsersPage />);

    // The claim rides the teachers fact exactly once…
    expect(screen.getAllByText('الفئة الأكبر')).toHaveLength(1);
    expect(screen.getByText('الأساتذة')).toBeInTheDocument();
    // …the students fact stays a neutral noun…
    expect(screen.getByText('حسابات الطلاب')).toBeInTheDocument();
    // …and the old unconditional «أكبر شريحة» never prints.
    expect(screen.queryByText('أكبر شريحة')).toBeNull();
  });

  it('moves with the data — students-heavy claims it for الطلاب instead', () => {
    usersMocks.stats.data = { totalUsers: 10, students: 7, teachers: 2, admins: 1, quality: 0 };
    renderWithProviders(<OwnerUsersPage />);

    expect(screen.getAllByText('الفئة الأكبر')).toHaveLength(1);
    // The teachers fact fell back to its neutral noun.
    expect(screen.getByText('هيئة التدريس')).toBeInTheDocument();
  });

  it('a SUSPENDED institution chip reads red — like every other suspended-institution surface', () => {
    usersMocks.stats.data = { totalUsers: 1, students: 0, teachers: 1, admins: 0, quality: 0 };
    renderWithProviders(<OwnerUsersPage />);

    const chip = screen.getByText(/مؤسسة الأندلس التعليمية · معلّقة/);
    expect(chip.className).toContain('red');
  });
});

/* ═══ 9. OwnerActivityPage — windowed canonical pagination ══════════ */

describe('OwnerActivityPage — the canonical windowed pagination (r299)', () => {
  it('renders page numbers + aria-current — the audit log is navigable beyond linear prev/next', async () => {
    renderWithProviders(<OwnerActivityPage />);
    await screen.findByText('سجلّ الأحداث');

    expect(screen.getByText(/الصفحة 1 من 2/)).toBeInTheDocument();
    // The windowed numbers land as real buttons with aria-current.
    const page1 = screen.getByRole('button', { name: 'الصفحة 1' });
    expect(page1.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'الصفحة 2' })).toBeInTheDocument();
    // The dead hand-rolled footer class never renders.
    expect(document.querySelector('.owner-activity-footer')).toBeNull();
  });
});
