/**
 * r155b — AlertsPage mark-read capabilities.
 * r157 (F8, 6A6) — AlertsPage honest pagination.
 *
 * The full notifications page rendered the unread count but gave the
 * user no way to act on it: rows were not visually distinguished and
 * nothing could be marked read. The Topbar's NotificationDropdown
 * already owned the capability (useMarkNotifRead /
 * useMarkAllNotifsRead + per-row «تعليم كمقروء» + bulk
 * «تعليم الكل كمقروء»); pins 1–4 hold the page now matching it.
 *
 * r157 pins 5–8 hold the pagination rework (useNotificationsFeed):
 *   5. every loaded page renders (the old slice(0,30) hid rows) and
 *      the badge reads the SERVER's meta.unread, not a client-side
 *      filter of the loaded slice;
 *   6. «عرض المزيد» appears only while there is a next page and fires
 *      fetchNextPage;
 *   7. the disclosure line «آخر N من M» says honestly how much is
 *      loaded of the total, and disappears with the button once all
 *      pages are loaded;
 *   8. per-row mark-read pending is variables-GATED — only the row
 *      whose id is in flight shows «جارٍ التعليم…»; the other rows'
 *      buttons stay enabled and unlabeled-pending.
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

type FeedRow = Record<string, unknown>;
type FeedPage = {
  data: FeedRow[];
  meta: { page: number; limit: number; total: number; totalPages: number; unread: number };
};

const mocks = vi.hoisted(() => ({
  feed: {
    data: undefined as { pages: FeedPage[] } | undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  },
  markRead: { mutate: vi.fn(), isPending: false, variables: undefined as string | undefined },
  markAllRead: { mutate: vi.fn(), isPending: false },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useNotificationsFeed: () => mocks.feed,
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

function feedPage(rows: FeedRow[], meta: Partial<FeedPage['meta']>): FeedPage {
  return {
    data: rows,
    meta: { page: 1, limit: 30, total: rows.length, totalPages: 1, unread: 0, ...meta },
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
    mocks.feed.data = {
      pages: [
        feedPage(
          [
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
          ],
          { unread: 2 },
        ),
      ],
    };
    mocks.feed.hasNextPage = false;
    mocks.feed.isFetchingNextPage = false;
    mocks.markRead.isPending = false;
    mocks.markRead.variables = undefined;
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

  /* r261 (4E redesign, Superlist direction): the row ITSELF must carry
   * the state — .np-row.unread (signal well + strong title, painted by
   * notifications.css §PAGE) — so read/unread stay distinguishable
   * WITHOUT the badge. Pins the modifier on exactly the unread rows
   * and its absence on the read row. The old .alert family stays for
   * dashboard boards; this page ships quiet management rows. */
  it('unread rows carry the .np-row.unread state class; the read row does not', () => {
    const { container } = renderPage();

    const unreadRows = container.querySelectorAll('.np-row.unread');
    expect(unreadRows).toHaveLength(2);
    expect(unreadRows[0]!.textContent).toContain('محاضرة غداً في القاعة B2');
    expect(unreadRows[1]!.textContent).toContain('اقترب موعد تسليم الواجب');
    // Every rendered row, minus the two unread ones, is a read
    // row without the modifier.
    expect(container.querySelectorAll('.np-row')).toHaveLength(3);
    const readRow = container.querySelectorAll('.np-row:not(.unread)');
    expect(readRow).toHaveLength(1);
    expect(readRow[0]!.textContent).toContain('تحديث نظام الصلاحيات');
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
    mocks.feed.data = {
      pages: [
        feedPage([notifFixture({ id: 'n1', readAt: new Date().toISOString() })], { unread: 0 }),
      ],
    };
    renderPage();

    expect(screen.getByText('الكلّ مقروء')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تعليم الكل كمقروء' })).toBeNull();
    expect(screen.queryByText('غير مقروء')).toBeNull();
    expect(screen.queryByRole('button', { name: /تعليم «/ })).toBeNull();
  });
});

describe('AlertsPage — honest pagination (r157, F8)', () => {
  beforeEach(() => {
    // Two loaded pages: 3 rows then 2 rows. The LAST page's meta is the
    // server truth: unread=1 — deliberately different from the 3 unread
    // rows living across the loaded pages (pin 5 locks the source).
    mocks.feed.data = {
      pages: [
        feedPage(
          [
            notifFixture({ id: 'n1' }),
            notifFixture({ id: 'n2', title: 'تحديث نظام الصلاحيات', readAt: new Date().toISOString() }),
            notifFixture({ id: 'n3', title: 'اقترب موعد تسليم الواجب' }),
          ],
          { page: 1, total: 35, totalPages: 2, unread: 3 },
        ),
        feedPage(
          [
            notifFixture({ id: 'n4', title: 'نتيجة فحص الانتحال جاهزة' }),
            notifFixture({ id: 'n5', title: 'تمّ تقييم بحثك', readAt: new Date().toISOString() }),
          ],
          { page: 2, total: 35, totalPages: 2, unread: 1 },
        ),
      ],
    };
    mocks.feed.hasNextPage = true;
    mocks.feed.isFetchingNextPage = false;
    mocks.markRead.isPending = false;
    mocks.markRead.variables = undefined;
  });

  it('renders EVERY loaded page (no slice(0,30)) and reads the badge from the last page meta.unread', () => {
    renderPage();

    // All five rows across both pages render — the old page fetched
    // limit=50 then truncated the render at 30.
    for (const title of [
      'محاضرة غداً في القاعة B2',
      'تحديث نظام الصلاحيات',
      'اقترب موعد تسليم الواجب',
      'نتيجة فحص الانتحال جاهزة',
      'تمّ تقييم بحثك',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }

    // The badge reads the SERVER's meta.unread (last page: 1 → the
    // singular arUnit form), NOT the loaded rows' client filter (which
    // would count 3 unread and pluralize).
    expect(screen.getByText('إشعار غير مقروء')).toBeInTheDocument();
    expect(screen.queryByText('3 إشعارات غير مقروءة')).toBeNull();
  });

  it('«عرض المزيد» fires fetchNextPage while a next page exists, and disappears when none does', () => {
    const { unmount } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'عرض المزيد' }));
    expect(mocks.feed.fetchNextPage).toHaveBeenCalledTimes(1);
    unmount();

    // All pages loaded → the button (and the disclosure line below)
    // honestly disappear: no dead load-more, no stale «آخر N من M».
    mocks.feed.hasNextPage = false;
    renderPage();
    expect(screen.queryByRole('button', { name: 'عرض المزيد' })).toBeNull();
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('the disclosure line says honestly how much is loaded: «آخر 5 من 35»', () => {
    renderPage();

    const note = screen.getByRole('note');
    // formatNum renders ar-LY (Western) digits — «آخر 5 من 35».
    expect(note.textContent).toBe('آخر 5 من 35');
    // Exactly one disclosure note — one honest line, not one per row.
    expect(screen.getAllByRole('note')).toHaveLength(1);
  });

  it('per-row mark-read pending is variables-gated: only the in-flight row shows «جارٍ التعليم…»', () => {
    // n3's mark-read is in flight (variables-gating idiom, the
    // likeInFlight pattern) — n1's button must NOT inherit the state.
    mocks.markRead.isPending = true;
    mocks.markRead.variables = 'n3';
    renderPage();

    const n3Row = screen.getByRole('button', { name: 'تعليم «اقترب موعد تسليم الواجب» كمقروء' });
    expect(n3Row).toBeDisabled();
    // The same row's visible button label flips to the pending copy…
    // (the aria-label keeps naming the action for assistive tech).
    expect(n3Row.textContent).toContain('جارٍ التعليم…');

    const n1Row = screen.getByRole('button', { name: 'تعليم «محاضرة غداً في القاعة B2» كمقروء' });
    expect(n1Row).toBeEnabled();
    expect(n1Row.textContent).not.toContain('جارٍ');
  });
});
