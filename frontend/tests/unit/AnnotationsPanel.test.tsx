/**
 * 12-12 — AnnotationsPanel tests (audit 11-f batch B / P1-1 + P2-14).
 *
 * The panel previously never rendered create/delete mutation failures —
 * a failed save left the composer open with zero feedback and a failed
 * delete silently left the annotation in place. These tests pin the
 * surfacing contract:
 *   1. a failed create shows an inline alert inside the composer with
 *      the API's own message, the draft stays editable and the retry
 *      (حفظ) still fires the mutation,
 *   2. a failed create without an API message falls back to the
 *      panel's Arabic default,
 *   3. a failed delete shows an inline alert above the list while the
 *      annotation honestly stays in it, and the delete is retryable,
 *   4. the composer stays teacher/admin-gated (role regression guard).
 *
 * The data hooks are mocked at the useResources boundary; the auth
 * store is the real zustand store driven with setState (the pattern
 * from CurriculumAuthoringPanel.test.tsx) — wrapped in act() because
 * the store write notifies the still-mounted panel outside React's
 * act scope otherwise.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AnnotationsPanel from '../../src/components/pdf/AnnotationsPanel';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

const mocks = vi.hoisted(() => ({
  annotations: {
    data: [] as unknown[],
    isPending: false,
    isError: false,
    error: null,
    refetch: () => undefined,
  },
  create: {
    isPending: false,
    isError: false,
    error: null as unknown,
    mutate: (_input: unknown) => undefined,
  },
  delete: {
    isPending: false,
    isError: false,
    error: null as unknown,
    mutate: (_id: unknown) => undefined,
  },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useAnnotations: () => mocks.annotations,
  useCreateAnnotation: () => mocks.create,
  useDeleteAnnotation: () => mocks.delete,
}));

const TEACHER: AuthUser = {
  id: 't1',
  email: 'salim@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الطاهر',
  role: 'TEACHER',
};

const ANNOTATION = {
  id: 'an1',
  paperId: 'paper1',
  page: 3,
  comment: 'راجع الفقرة الأخيرة',
  color: '#B57438',
  createdAt: '2026-01-01T00:00:00.000Z',
  author: {
    id: 't1',
    firstName: 'سالم',
    lastName: 'الطاهر',
    role: 'TEACHER' as const,
    avatarColor: null,
    avatarInitials: null,
  },
};

function renderPanel() {
  return render(
    <AnnotationsPanel paperId="paper1" currentPage={1} numPages={10} onJumpToPage={vi.fn()} />,
  );
}

afterEach(() => {
  // The panel from the finished test is still mounted here (setup.ts
  // cleanup runs after file-level hooks) — wrap the store write in act
  // so the subscription notification never lands outside act scope.
  act(() => { useAuthStore.setState({ user: null }); });
  mocks.annotations = {
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: () => undefined,
  };
  mocks.create = { isPending: false, isError: false, error: null, mutate: () => undefined };
  mocks.delete = { isPending: false, isError: false, error: null, mutate: () => undefined };
});

describe('AnnotationsPanel — mutation failure surfacing (audit 11-f P1-1)', () => {
  it('shows the API message inside the composer on a failed create, keeps the draft retryable', () => {
    const mutate = vi.fn();
    mocks.annotations.data = [ANNOTATION];
    mocks.create = {
      isPending: false,
      isError: true,
      error: { response: { data: { error: { message: 'الصفحة خارج نطاق المستند' } } } },
      mutate,
    };
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'إضافة ملاحظة' }));
    fireEvent.change(screen.getByLabelText('نص الملاحظة'), { target: { value: 'ملاحظة جديدة' } });

    // The API's own message surfaces in an alert region.
    expect(screen.getByRole('alert')).toHaveTextContent('الصفحة خارج نطاق المستند');

    // The composer stayed open with the draft intact, and pressing حفظ
    // again retries the mutation.
    expect(screen.getByLabelText('نص الملاحظة')).toHaveValue('ملاحظة جديدة');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(
      { page: 1, comment: 'ملاحظة جديدة', color: '#B57438' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('falls back to the panel default when the create error carries no API message', () => {
    mocks.create = {
      isPending: false,
      isError: true,
      error: new Error('Network Error'),
      mutate: () => undefined,
    };
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'إضافة ملاحظة' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'تعذّر حفظ الملاحظة — تحقّق من اتصالك ثم أعد المحاولة.',
    );
  });

  it('shows an inline alert above the list on a failed delete and keeps the annotation visible', () => {
    const mutate = vi.fn();
    mocks.annotations.data = [ANNOTATION];
    mocks.delete = {
      isPending: false,
      isError: true,
      error: new Error('Network Error'),
      mutate,
    };
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    renderPanel();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'تعذّر حذف الملاحظة — تحقّق من اتصالك ثم أعد المحاولة.',
    );
    // Honest state: the server still has the annotation — it stays in
    // the list and the delete remains retryable.
    expect(screen.getByText('راجع الفقرة الأخيرة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حذف الملاحظة' }));
    expect(mutate).toHaveBeenCalledWith('an1');
  });

  it('keeps the composer and delete controls gated to teachers/admins', () => {
    mocks.annotations.data = [ANNOTATION];
    act(() => { useAuthStore.setState({ user: { ...TEACHER, id: 's1', role: 'STUDENT' } }); });

    renderPanel();

    expect(screen.queryByRole('button', { name: 'إضافة ملاحظة' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'حذف الملاحظة' })).toBeNull();
    // Students see the reviewer-oriented empty/list copy instead.
    expect(screen.getByText('راجع الفقرة الأخيرة')).toBeInTheDocument();
  });
});
