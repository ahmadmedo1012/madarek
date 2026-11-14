import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HostingUsageCard } from '../../src/pages/admin/ops/HostingUsage';

/**
 * R351 X5 — the hosting/usage seat: the static /ops/vercel-usage.json
 * table, the 60% threshold badges (amber), the critical band (red at
 * 85%), the freshness pair, the plan caveat, and the honest
 * unavailable/error states. No token in the browser — the doc is the
 * weekly watch's derived output.
 */

const makeDoc = (over: Partial<{
  deployments7d: number;
  maxDay: { date: string; count: number; pctOfLimit: number };
  freshness: { liveBuildId: string; mainHead: string; current: boolean };
}> = {}) => ({
  generatedAt: '2026-11-14T13:40:00.000Z',
  deployments7d: 9,
  deploymentsPerDay: [{ date: '2026-11-14', count: 8 }],
  maxDay: { date: '2026-11-14', count: 8, pctOfLimit: 8, ...over.maxDay },
  freshness: { liveBuildId: '2d513a46d75d', mainHead: '2d513a46d75d', current: true, ...over.freshness },
  plan: { name: 'Hobby', nonCommercial: true },
  alerts: [],
  limitations: ['invocations/Active-CPU/النقل: لا تُكشف عبر الـ API بهذا الرمز+الخطة؛ يقرأ المالك لوحة Vercel أسبوعيًا.'],
  ...over,
});

const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HostingUsageCard />
    </QueryClientProvider>,
  );
};

describe('R351 X5 — HostingUsageCard (the admin settings seat)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the static doc from /ops/vercel-usage.json', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeDoc()), { status: 200 }),
    );
    mount();
    await waitFor(() => expect(screen.getByText(/9 نشرات/)).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith('/ops/vercel-usage.json');
  });

  it('renders the safe band (below 60%) with the green badge', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeDoc()), { status: 200 }),
    );
    mount();
    await waitFor(() => expect(screen.getByText('بأمان')).toBeTruthy());
    expect(screen.getByText(/8 من حدّ 100\/يوم/)).toBeTruthy();
    // the freshness pair: current → the green محدَث badge + the main match line
    expect(screen.getByText('محدَث')).toBeTruthy();
    expect(screen.getByText(/2d513a46d75d · يطابق main/)).toBeTruthy();
  });

  it('renders the 60% alert band with the amber badge', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeDoc({ maxDay: { date: '2026-11-13', count: 70, pctOfLimit: 70 } })), { status: 200 }),
    );
    mount();
    await waitFor(() => expect(screen.getByText('عتبة 60% — 70%')).toBeTruthy());
  });

  it('renders the critical band (≥85%) with the red badge', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeDoc({ maxDay: { date: '2026-11-13', count: 90, pctOfLimit: 90 } })), { status: 200 }),
    );
    mount();
    await waitFor(() => expect(screen.getByText('عتبة 60% — 90%')).toBeTruthy());
  });

  it('renders a stale production pair with the red badge and the main head', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify(makeDoc({ freshness: { liveBuildId: 'aa70de8bea93', mainHead: '2d513a46d75d', current: false } })),
        { status: 200 },
      ),
    );
    mount();
    await waitFor(() => expect(screen.getByText('متقادم')).toBeTruthy());
    expect(screen.getByText(/aa70de8bea93 · main 2d513a46d75d/)).toBeTruthy();
  });

  it('shows the plan caveat and the honest limitations line', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makeDoc()), { status: 200 }),
    );
    mount();
    await waitFor(() => expect(screen.getByText(/Hobby · للاستخدام غير التجاري/)).toBeTruthy());
    expect(screen.getByText(/لا تُكشف عبر الـ API/)).toBeTruthy();
  });

  it('shows the calm Arabic error state when the doc is unreachable', async () => {
    /* mockImplementation (not Once): the component retries once — every
       call must 404, and waitFor needs the backoff budget. */
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(new Response('not found', { status: 404 })));
    mount();
    await waitFor(
      () => expect(screen.getByText('بيانات الاستخدام غير متاحة الآن — راجع لوحة Vercel مباشرة.')).toBeTruthy(),
      { timeout: 4000 },
    );
  });
});
