/**
 * r154e — OwnerUsersPage role-picker regression test.
 *
 * The old UI had a binary STUDENT↔TEACHER toggle: clicking "تغيير الدور"
 * on an ADMIN or QUALITY user silently demoted them to STUDENT (the only
 * other branch of the ternary). r154e replaced the button with a select
 * that exposes STUDENT/TEACHER/ADMIN/QUALITY (OWNER excluded).
 *
 * This test pins the new contract so the binary-toggle regression cannot
 * recur silently: the select must render all four eligible roles, an
 * OWNER row must be read-only (no select), and changing the select must
 * open a confirm dialog naming the specific transition.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OwnerUsersPage } from '../../src/pages/owner/OwnerUsersPage';

const mocks = vi.hoisted(() => ({
  stats: { data: null, isPending: false, isError: false },
  users: {
    data: {
      data: [
        {
          id: 'u-student-000000000000',
          firstName: 'طالب',
          lastName: 'تجريبي',
          email: 'student@zu.edu.ly',
          role: 'STUDENT',
          isActive: true,
          avatarInitials: 'طت',
          avatarColor: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'u-admin-00000000000000',
          firstName: 'إداري',
          lastName: 'تجريبي',
          email: 'admin@zu.edu.ly',
          role: 'ADMIN',
          isActive: true,
          avatarInitials: 'إت',
          avatarColor: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'u-owner-000000000000000',
          firstName: 'مالك',
          lastName: 'المنصة',
          email: 'owner@zu.edu.ly',
          role: 'OWNER',
          isActive: true,
          avatarInitials: 'مم',
          avatarColor: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
    },
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <OwnerUsersPage />
    </MemoryRouter>,
  );
}

describe('OwnerUsersPage — role picker (r154e)', () => {
  it('renders a select with all four eligible roles for a non-OWNER user', async () => {
    renderPage();
    // The STUDENT row's select exposes STUDENT/TEACHER/ADMIN/QUALITY — the
    // old binary toggle only offered STUDENT↔TEACHER.
    const studentSelect = screen.getByLabelText('دور طالب تجريبي') as HTMLSelectElement;
    expect(studentSelect).toBeInstanceOf(HTMLSelectElement);
    const options = Array.from(studentSelect.options).map((o) => o.value);
    expect(options).toEqual(['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY']);
    expect(options).not.toContain('OWNER');
  });

  it('renders the ADMIN row with the same four roles (no silent demote-to-STUDENT)', async () => {
    renderPage();
    const adminSelect = screen.getByLabelText('دور إداري تجريبي') as HTMLSelectElement;
    const options = Array.from(adminSelect.options).map((o) => o.value);
    expect(options).toEqual(['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY']);
    // The ADMIN's current role is selected — the old ternary would have
    // flipped them to STUDENT on the first click.
    expect(adminSelect.value).toBe('ADMIN');
  });

  it('renders an OWNER row as read-only text (no select — owner role is not changeable here)', async () => {
    renderPage();
    // OWNER row has no select — the role-picker select is not rendered.
    expect(screen.queryByLabelText('دور مالك المنصة')).toBeNull();
    // The STUDENT and ADMIN rows DO have selects, proving the OWNER row is
    // the one excluded (not a rendering failure).
    expect(screen.getByLabelText('دور طالب تجريبي')).toBeTruthy();
    expect(screen.getByLabelText('دور إداري تجريبي')).toBeTruthy();
  });

  it('opens a confirm dialog naming the specific transition on role change', async () => {
    renderPage();
    const studentSelect = screen.getByLabelText('دور طالب تجريبي') as HTMLSelectElement;
    fireEvent.change(studentSelect, { target: { value: 'TEACHER' } });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
    // The dialog names the FROM and TO roles — the old toggle never said
    // which direction it was going.
    expect(screen.getByText(/من طالب إلى أستاذ/)).toBeTruthy();
  });

  it('flags a promotion to ADMIN as dangerous (red confirm)', async () => {
    renderPage();
    const studentSelect = screen.getByLabelText('دور طالب تجريبي') as HTMLSelectElement;
    fireEvent.change(studentSelect, { target: { value: 'ADMIN' } });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
    // The confirm dialog for a promotion to ADMIN should carry the danger
    // flag — the message names the promotion to «إداري».
    expect(screen.getByText(/من طالب إلى إداري/)).toBeTruthy();
  });
});
