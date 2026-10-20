/**
 * r183-B5 — OwnerUsersPage institution column (A9 wave-A P2).
 *
 * The directory exposed no institutional affiliation while the platform
 * runs multiple institutions — an owner performing the console's most
 * powerful mutations (role change, disable) could not see WHICH
 * institution a user belongs to. The /owner/users route now ships the
 * ACTIVE memberships (owner.routes.ts select — pinned by the backend's
 * owner-console-scope test), and this file pins the page contract:
 *  · a «المؤسسات» column renders one chip per active membership
 *    (suspended institutions annotated, never silently dropped);
 *  · a membership-less row renders the honest «بلا مؤسسة» — never a
 *    fabricated affiliation;
 *  · the role-change confirm NAMES the institutions (the finding's
 *    acceptance: scope named at the decision point).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OwnerUsersPage } from '../../src/pages/owner/OwnerUsersPage';

const ZAWIA = { id: 'inst-zawia', name: 'جامعة الزاوية', slug: 'zawia-showcase', status: 'ACTIVE' };
const ALANDALUS = { id: 'inst-alandalus', name: 'مؤسسة الأندلس التعليمية', slug: 'alandalus-demo', status: 'SUSPENDED' };

const mocks = vi.hoisted(() => ({
  stats: { data: null, isPending: false, isError: false },
  users: {
    data: null as {
      data: Array<Record<string, unknown>>;
      meta: { total: number; page: number; limit: number; totalPages: number };
    } | null,
    isPending: false,
    isError: false,
    error: null,
    refetch: () => undefined,
  },
  changeRole: { mutateAsync: vi.fn(), isPending: false, variables: undefined },
  toggleStatus: { mutateAsync: vi.fn(), isPending: false, variables: undefined },
}));

vi.mock('../../src/hooks/useOwner', () => ({
  useOwnerStats: () => mocks.stats,
  useOwnerUsers: () => mocks.users,
  useChangeUserRole: () => mocks.changeRole,
  useToggleUserStatus: () => mocks.toggleStatus,
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    apiErrorMessage: () => 'حاول مرة أخرى بعد لحظات.',
  };
});

const baseRow = (over: Record<string, unknown>) => ({
  id: 'u-teacher-00000000001',
  firstName: 'سالم',
  lastName: 'الفيتوري',
  email: 'teacher2@demo.madarek.ly',
  role: 'TEACHER',
  isActive: true,
  avatarInitials: 'سف',
  avatarColor: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  memberships: [],
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.users.data = null;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <OwnerUsersPage />
    </MemoryRouter>,
  );
}

describe('OwnerUsersPage — the المؤسسات scope (r183-B5, A9 P2 · r252 re-pin)', () => {
  it('renders one chip per ACTIVE membership and annotates suspended institutions', () => {
    mocks.users.data = {
      data: [
        baseRow({
          id: 'u-teacher-00000000001',
          memberships: [{ institution: ZAWIA }, { institution: ALANDALUS }],
        }),
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    renderPage();

    // r252: the memberships ride the row's meta line (the column died
    // with the table) — same chips, same suspended annotation.
    expect(screen.getByText('جامعة الزاوية')).toBeInTheDocument();
    // The suspended institution stays visible — annotated, never dropped.
    expect(screen.getByText(/مؤسسة الأندلس التعليمية · معلّقة/)).toBeInTheDocument();
  });

  it('a membership-less row renders the honest «بلا مؤسسة» — never a fabricated chip', () => {
    mocks.users.data = {
      data: [baseRow({ id: 'u-teacher-00000000002' })],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    renderPage();

    expect(screen.getByText('بلا مؤسسة')).toBeInTheDocument();
    expect(screen.queryByText('جامعة الزاوية')).toBeNull();
  });

  it('the role-change confirm names the active institutions (scope at the decision point)', async () => {
    mocks.users.data = {
      data: [
        baseRow({
          id: 'u-teacher-00000000003',
          memberships: [{ institution: ZAWIA }],
        }),
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    renderPage();

    // r252: expand the row first — the role picker lives in the body.
    fireEvent.click(screen.getByRole('button', { name: 'إجراءات سالم الفيتوري' }));
    const select = screen.getByLabelText('دور سالم الفيتوري') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'ADMIN' } });

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByText(/عضويته النشطة: جامعة الزاوية\./)).toBeInTheDocument();
  });

  it('the confirm says the honest no-membership line for a membership-less user', async () => {
    mocks.users.data = {
      data: [baseRow({ id: 'u-teacher-00000000004' })],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'إجراءات سالم الفيتوري' }));
    const select = screen.getByLabelText('دور سالم الفيتوري') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'ADMIN' } });

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByText(/لا عضوية مؤسسة نشطة لهذا الحساب\./)).toBeInTheDocument();
  });
});
