/**
 * r165d (D1 + D3) — AlertsPage deep-link rows + mark-all error banner.
 *
 * D1: the full notifications page's rows were NON-NAVIGATING — the
 * backend's Notification.link ('/teacher/messages' for teacher DM
 * recipients) had no consumer here either. The row's TITLE is now the
 * row's door (r164-h StudentsList idiom — «الاسم هو باب الصفّ»): a
 * React Router Link riding the shared notifDeepLink() decision. The
 * whole row can't be the anchor: unread rows carry the «تعليم كمقروء»
 * button inside the actions slot, and nested interactive content
 * inside an anchor is the exact antipattern CoursesPage removed
 * (A12 P1-3). Pins:
 *   1. a valid link renders the title as a link to it + clicking it
 *      navigates (MemoryRouter probe)
 *   2. unread rows with a link keep the «غير مقروء» badge AND the
 *      mark-read action (row semantics intact)
 *   3. rows without a link keep a plain title (no fake links)
 *   4. external / protocol-relative / script URLs are ignored
 *
 * D3: the mark-all button only disabled while pending — a failure
 * re-enabled it silently (the hook invalidates only on SUCCESS). The
 * page now mirrors the teacher-messages banner (form-feedback fail +
 * «إعادة المحاولة» re-firing the SAME mutation). Pins:
 *   5. isError renders the role=alert banner + retry affordance
 *   6. the retry re-fires the bulk mutation
 *   7. no error → no banner
 *
 * Mocks at the useResources boundary (AlertsPage-mark-read pattern:
 * hoisted mutable feed + mutation shapes).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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
  markAllRead: { mutate: vi.fn(), isPending: false, isError: false },
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
    type: 'SOCIAL',
    title: 'رسالة جديدة من أحمد',
    body: 'مرحبًا، هل راجعت التسليم؟',
    link: null,
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

/** Location probe (App-routes convention) — proves the title link
 *  actually navigates through the router. */
function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="location" data-path={pathname} />;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/student/alerts']}>
        <Routes>
          <Route path="*" element={<AlertsPage />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.feed.data = {
    pages: [
      feedPage(
        [
          notifFixture({ id: 'dm1', link: '/teacher/messages' }),
          notifFixture({ id: 'n2', title: 'تم نشر درجة الواجب', type: 'ACADEMIC', link: null }),
          notifFixture({ id: 'n3', title: 'تحديث نظام الصلاحيات', type: 'SYSTEM', readAt: new Date().toISOString(), link: '/teacher/exams' }),
        ],
        { unread: 2 },
      ),
    ],
  };
  mocks.feed.hasNextPage = false;
  mocks.feed.isFetchingNextPage = false;
  mocks.markRead.isPending = false;
  mocks.markRead.variables = undefined;
  mocks.markAllRead.isPending = false;
  mocks.markAllRead.isError = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AlertsPage — deep-link rows (r165d D1)', () => {
  it('a valid link renders the title as a link to it, and clicking it navigates', () => {
    renderPage();

    const dmTitle = screen.getByRole('link', { name: 'رسالة جديدة من أحمد' });
    expect(dmTitle).toHaveAttribute('href', '/teacher/messages');

    fireEvent.click(dmTitle);
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/teacher/messages');
  });

  it('an unread row with a link keeps the badge AND the mark-read action (semantics intact)', () => {
    renderPage();

    // The DM row is unread: badge + action + the link coexist.
    expect(screen.getAllByText('غير مقروء')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'تعليم «رسالة جديدة من أحمد» كمقروء' }),
    ).toBeInTheDocument();
    // The row's own action still fires its mutation — not a navigation.
    fireEvent.click(screen.getByRole('button', { name: 'تعليم «رسالة جديدة من أحمد» كمقروء' }));
    expect(mocks.markRead.mutate).toHaveBeenCalledWith('dm1');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/student/alerts');
  });

  it('a row WITHOUT a link keeps a plain title — no fake links', () => {
    renderPage();

    expect(screen.queryByRole('link', { name: 'تم نشر درجة الواجب' })).toBeNull();
    expect(screen.getByText('تم نشر درجة الواجب')).toBeInTheDocument();
  });

  it.each([
    ['an absolute https URL', 'https://evil.example.com/inbox'],
    ['a protocol-relative URL', '//evil.example.com/inbox'],
    ['a script pseudo-URL', 'javascript:alert(1)'],
  ])('ignores %s — the title stays plain text (CSP posture)', (_label, link) => {
    mocks.feed.data = {
      pages: [feedPage([notifFixture({ id: 'odd1', link })], { unread: 1 })],
    };
    renderPage();

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('رسالة جديدة من أحمد')).toBeInTheDocument();
  });
});

describe('AlertsPage — mark-all error banner (r165d D3)', () => {
  it('isError renders the role=alert banner with the retry affordance', () => {
    mocks.markAllRead.isError = true;
    renderPage();

    const banner = screen.getByRole('alert');
    expect(banner).toHaveClass('form-feedback');
    expect(banner).toHaveClass('fail');
    expect(banner.textContent).toContain('تعذَّر تعليم الإشعارات كمقروءة');
    expect(banner.textContent).toContain('تحقّق من اتصالك ثم أعد المحاولة');
  });

  it('«إعادة المحاولة» re-fires the SAME bulk mutation', () => {
    mocks.markAllRead.isError = true;
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));
    expect(mocks.markAllRead.mutate).toHaveBeenCalledTimes(1);
  });

  it('no error → no banner (the quiet path stays quiet)', () => {
    renderPage();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/تعذَّر تعليم الإشعارات/)).toBeNull();
  });
});
