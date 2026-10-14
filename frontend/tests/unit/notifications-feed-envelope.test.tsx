/**
 * r161 (C1) — notifications feed ENVELOPE contract, pinned at the
 * transport level.
 *
 * The r157 AlertsPage tests mock useNotificationsFeed at the hook
 * boundary with the intended `{ pages: [{ data, meta }] }` shape, so
 * they could not see that the real queryFn piped the backend response
 * through unwrap() — which returns res.data.data (the bare rows array)
 * and DROPS the sibling-level `meta`. The hook contract says each page
 * IS the envelope (`NotificationsFeedPage`), so every resolved page
 * had `lastPage.meta === undefined` and getNextPageParam's destructure
 * threw at render time: AlertsPage — all three roles' /alerts routes —
 * crashed the whole app to the RouteErrorBoundary the moment
 * notifications arrived, usually preceded by a stuck skeleton phase.
 * (Reproduced live: bottom-nav «الإشعارات» → app-wide error page.)
 *
 * This suite renders the REAL hook against a mocked axios transport
 * that answers with the backend's actual wire shape —
 * `{ data: Notification[], meta: buildMeta(...) }` — and pins:
 *   1. rows render (the render does not throw — the old code fails
 *      here, which is the exact production crash);
 *   2. the badge reads the server meta.unread;
 *   3. the first request asks page=1 & limit=NOTIFICATIONS_FEED_LIMIT;
 *   4. «عرض المزيد» follows totalPages and fetches page=2, whose rows
 *      append to the list.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertsPage } from '../../src/pages/student/MorePages';
import { NOTIFICATIONS_FEED_LIMIT } from '../../src/hooks/resources/notifications';
import type { AxiosResponse } from 'axios';

/** The backend's wire shape for GET /notifications (me.routes.ts +
 *  lib/pagination.buildMeta): `meta` is a SIBLING of `data`. */
function envelopePage(rows: Array<Record<string, unknown>>, meta: Record<string, number>) {
  return { data: { data: rows, meta } } as AxiosResponse;
}

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

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  api: { get: mocks.get, patch: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  apiBaseURL: '/api/v1',
  unwrap: async (promise: Promise<AxiosResponse<{ data: unknown }>>) =>
    (await promise).data.data,
}));

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

describe('useNotificationsFeed — envelope shape (r161 C1)', () => {
  beforeEach(() => {
    mocks.get.mockImplementation((url: string) => {
      if (String(url).includes('page=2')) {
        return Promise.resolve(
          envelopePage(
            [notifFixture({ id: 'n4', title: 'نتيجة فحص الانتحال جاهزة' })],
            { page: 2, limit: NOTIFICATIONS_FEED_LIMIT, total: 35, totalPages: 2, unread: 1 },
          ),
        );
      }
      return Promise.resolve(
        envelopePage(
          [
            notifFixture(),
            notifFixture({
              id: 'n2',
              type: 'SYSTEM',
              title: 'تحديث نظام الصلاحيات',
              readAt: new Date().toISOString(),
            }),
          ],
          { page: 1, limit: NOTIFICATIONS_FEED_LIMIT, total: 35, totalPages: 2, unread: 1 },
        ),
      );
    });
  });

  it('renders the rows without crashing (unwrap must not strip meta — the production crash)', async () => {
    renderPage();

    // The old queryFn resolved pages as the bare rows array; the render
    // then threw `Cannot destructure property 'page' of 'lastPage.meta'`
    // — this waitFor is the exact production crash pin.
    expect(await screen.findByText('محاضرة غداً في القاعة B2')).toBeInTheDocument();
    expect(screen.getByText('تحديث نظام الصلاحيات')).toBeInTheDocument();

    // The wire request honors the feed pagination contract.
    expect(mocks.get).toHaveBeenCalledWith(
      `/notifications?page=1&limit=${NOTIFICATIONS_FEED_LIMIT}`,
    );
  });

  it('the unread badge reads the server meta.unread (sibling-level meta)', async () => {
    renderPage();

    // meta.unread = 1 → the singular arUnit form.
    expect(await screen.findByText('إشعار غير مقروء')).toBeInTheDocument();
  });

  it('«عرض المزيد» follows totalPages and appends page 2 rows', async () => {
    renderPage();

    expect(await screen.findByText('محاضرة غداً في القاعة B2')).toBeInTheDocument();

    const more = screen.getByRole('button', { name: 'عرض المزيد' });
    fireEvent.click(more);

    await waitFor(() => {
      expect(mocks.get).toHaveBeenCalledWith(
        `/notifications?page=2&limit=${NOTIFICATIONS_FEED_LIMIT}`,
      );
    });
    expect(await screen.findByText('نتيجة فحص الانتحال جاهزة')).toBeInTheDocument();

    // Page 2 was the last (totalPages=2) → both the load-more affordance
    // AND the disclosure line honestly disappear (the r157 contract:
    // no dead button, no stale «آخر N من M» once everything is loaded).
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'عرض المزيد' })).toBeNull();
    });
    expect(screen.queryByRole('note')).toBeNull();
  });
});
