/**
 * r155b — AlertsPage mark-read capabilities.
 *
 * The full notifications page rendered the unread count but gave the
 * user no way to act on it: rows were not visually distinguished and
 * nothing could be marked read. The Topbar's NotificationDropdown
 * already owned the capability (useMarkNotifRead /
 * useMarkAllNotifsRead + per-row «تعليم كمقروء» + bulk
 * «تعليم الكل كمقروء»); these pins hold the page now matching it:
 *   1. unread rows carry the «غير مقروء» badge + a per-row mark-read
 *      action; read rows carry neither;
 *   2. clicking the row action fires useMarkNotifRead with the row id;
 *   3. the bulk action appears only while unreadCount > 0 and fires
 *      useMarkAllNotifsRead (one POST /notifications/read-all);
 *   4. all-read renders the quiet «الكلّ مقروء» state instead.
 *
 * Hooks mocked at the useResources boundary (...actual spread — the
 * ResearchUploadForm pattern), QueryClient wrapper per the
 * ExamModerationPage tests.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertsPage } from '../../src/pages/student/MorePages';

const mocks = vi.hoisted(() => ({
  notifications: {
    data: [] as Array<Record<string, unknown>>,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  markRead: { mutate: vi.fn(), isPending: false },
  markAllRead: { mutate: vi.fn(), isPending: false },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useNotifications: () => mocks.notifications,
    useMarkNotifRead: () => mocks.markRead,
    useMarkAllNotifsRead: () => mocks.markAllRead,
  };
});

function notifFixture(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'n1',
    type: 'ACADEMIC',
    title: 'محاضرة غداً في القاعة B2',
    body: 'تذكير بمحاضرة الشبكات.',
    readAt: null,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    ...over,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AlertsPage — mark-read capabilities (r155b)', () => {
  beforeEach(() => {
    mocks.notifications.data = [
      notifFixture(),
      notifFixture({
        id: 'n2',
        type: 'SYSTEM',
        title: 'تحديث نظام الصلاحيات',
        body: null,
        readAt: new Date(Date.now() - 60_000).toISOString(),
      }),
      notifFixture({
        id: 'n3',
        type: 'URGENT',
        title: 'اقترب موعد تسليم الواجب',
        body: 'بقي يومان على الموعد النهائي.',
        readAt: null,
      }),
    ];
  });

  it('unread rows show the «غير مقروء» badge + a mark-read action; read rows show neither', () => {
    renderPage();

    // Two unread rows → two badges, two per-row actions.
    expect(screen.getAllByText('غير مقروء')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'تعليم «محاضرة غداً في القاعة B2» كمقروء' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'تعليم «اقترب موعد تسليم الواجب» كمقروء' }),
    ).toBeInTheDocument();
    // The READ row carries no action and no badge.
    expect(
      screen.queryByRole('button', { name: 'تعليم «تحديث نظام الصلاحيات» كمقروء' }),
    ).toBeNull();
  });

  it('clicking a row action marks exactly that notification read', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: 'تعليم «اقترب موعد تسليم الواجب» كمقروء' }),
    );

    expect(mocks.markRead.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.markRead.mutate).toHaveBeenCalledWith('n3');
  });

  it('the bulk action appears while unread > 0 and fires the bulk mutation', () => {
    renderPage();

    const markAll = screen.getByRole('button', { name: 'تعليم الكل كمقروء' });
    fireEvent.click(markAll);

    // One bulk POST covers every unread row — the per-item hook stays idle.
    expect(mocks.markAllRead.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.markRead.mutate).not.toHaveBeenCalled();
  });

  it('all-read renders the quiet state — no bulk action, no row actions', () => {
    mocks.notifications.data = [
      notifFixture({ id: 'n1', readAt: new Date().toISOString() }),
    ];
    renderPage();

    expect(screen.getByText('الكلّ مقروء')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تعليم الكل كمقروء' })).toBeNull();
    expect(screen.queryByText('غير مقروء')).toBeNull();
    expect(screen.queryByRole('button', { name: /تعليم «/ })).toBeNull();
  });
});
