/**
 * r157 wave-2 (F11 rebuild, audit 6A10-6) — OwnerUsersPage confirm
 * verbs.
 *
 * ConfirmDialog's confirmLabel keeps its «تأكيد» default for its 16
 * other consumers (Wave-1 owns that contract), but the three USER
 * actions on this page pass their own verb so the destructive button
 * names WHAT it does instead of a generic "yes":
 *
 *   role change   → «تغيير الدور»
 *   deactivation  → «تعطيل الحساب»
 *   reactivation  → «تفعيل الحساب»
 *
 * Pinned here (2 pins):
 *   1. opening the role-change and the disable dialogs shows each
 *      action's own verb on the confirm button — never the default
 *      «تأكيد».
 *   2. cancelling closes the dialog WITHOUT any mutation: no
 *      changeRole/toggleStatus call ever fires and the row's select
 *      reverts to the user's real role.
 *
 * Same vi.hoisted useOwner mock harness as
 * OwnerUsersPage-role-picker.test.tsx (the real ConfirmDialog/Modal
 * render — the verb lives on the actual button in the DOM).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
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
      ],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
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

/** The STUDENT row (both pins act on the same user) — r252 re-pin:
 *  the row is a .pf-row and its actions live behind the inline
 *  expansion, so the helper expands before returning. */
async function studentRow() {
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'إجراءات طالب تجريبي' }));
  const row = (await screen.findByText('طالب تجريبي')).closest('.pf-row')!;
  expect(row).not.toBeNull();
  return row;
}

describe('OwnerUsersPage — confirm dialog verbs (6A10-6)', () => {
  it('the role-change and disable dialogs each show their own verb — never the default «تأكيد»', async () => {
    const row = await studentRow();

    // ── Role change: select a different role for the student.
    const select = within(row).getByLabelText('دور طالب تجريبي') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'TEACHER' } });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    // The confirm button carries the action's verb…
    expect(screen.getByRole('button', { name: 'تغيير الدور' })).toBeInTheDocument();
    // …not the generic default.
    expect(screen.queryByRole('button', { name: 'تأكيد' })).toBeNull();

    // Close it, then open the disable dialog for the same row.
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(within(row).getByRole('button', { name: 'تعطيل' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    // The active user's status action is DEACTIVATION — its verb.
    expect(screen.getByRole('button', { name: 'تعطيل الحساب' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تأكيد' })).toBeNull();
  });

  it('cancel closes the dialog with no mutation fired and the row unchanged', async () => {
    const row = await studentRow();

    const select = within(row).getByLabelText('دور طالب تجريبي') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'TEACHER' } });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    // While the modal is open the select previews the PENDING role.
    expect(select.value).toBe('TEACHER');

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    // The dialog goes away (Modal's delayed-unmount safety net fires
    // within waitFor's window)…
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // …the select reverted to the user's real role…
    expect(select.value).toBe('STUDENT');
    // …and NO mutation ever fired — cancel is not a soft confirm.
    expect(mocks.changeRole.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.toggleStatus.mutateAsync).not.toHaveBeenCalled();
    // The row still shows its live state.
    expect(within(row).getByText('نشط')).toBeInTheDocument();
  });
});
