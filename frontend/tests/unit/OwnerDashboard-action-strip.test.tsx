/**
 * 5-D3 (5-A9 follow-up) — the owner dashboard's «يحتاج انتباهك» action
 * strip, 5-B4's admin-strip pattern on OWNER-role data.
 *
 * Pinned here:
 *   1. Honest absence — zero open alerts + zero idle teachers renders
 *      NO strip (a healthy platform sees no wall of zeros).
 *   2. Open alerts render one row: counted nouns, the critical pair
 *      called out in the desc, tone amber when any critical severity
 *      is open, brand otherwise, and the row links to /owner/alerts.
 *   3. Idle teachers (the education payload's workloadBuckets.idle)
 *      render their own row linking to /owner/education — only when
 *      the education query actually answered (never a pending guess).
 *
 * Same lib/api mock + chart-stub pattern as OwnerCharts-memo.test.tsx
 * (jsdom has no canvas — react-chartjs-2 is stubbed out).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OwnerDashboardPage } from '../../src/pages/owner/OwnerDashboardPage';

const { FIXTURES, PAGINATED } = vi.hoisted(() => ({
  FIXTURES: {} as Record<string, unknown>,
  PAGINATED: new Set<string>(['/owner/activity']),
}));

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="chart-doughnut" />,
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      // /owner/activity is consumed via `res.data` (paginated shape);
      // the rest of the owner hooks unwrap `res.data.data`.
      return Promise.resolve(PAGINATED.has(url) ? { data } : { data: { data } });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

const STATS = {
  totalUsers: 5, students: 1, teachers: 1, admins: 1, quality: 1, owners: 1,
  totalCourses: 6, totalOfferings: 6, totalEnrollments: 6, recentAuditLogs: 21,
};

const REALTIME = { activeSessions: 3, aiRequestsPerMin: 0, liveBroadcasts: 0, activeExams: 0 };

const ACTIVITY = { data: [], meta: { page: 1, limit: 8, total: 0, totalPages: 1 } };

const NO_IDLE_EDUCATION = {
  totals: { totalCourses: 6, totalOfferings: 6, teachers: 1, avgEnrolment: 1 },
  byFaculty: [],
  topCourses: [],
  workloadBuckets: { idle: 0, one: 0, two: 0, three: 0, fourPlus: 1 },
  attendanceTrend: [],
};

function baseFixtures() {
  FIXTURES['/owner/stats'] = STATS;
  FIXTURES['/owner/realtime'] = REALTIME;
  FIXTURES['/owner/alerts'] = [];
  FIXTURES['/owner/activity'] = ACTIVITY;
  FIXTURES['/owner/education'] = NO_IDLE_EDUCATION;
}

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OwnerDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  baseFixtures();
});

describe('OwnerDashboardPage — action strip (5-D3)', () => {
  it('renders no strip when there is nothing to act on (honest absence)', async () => {
    renderDashboard();
    // The page settled (KPIs render)…
    expect(await screen.findByText('إجمالي المستخدمين')).toBeInTheDocument();
    // …and no strip card appeared.
    expect(screen.queryByText('يحتاج انتباهك')).toBeNull();
  });

  it('renders one amber alert row with the critical pair called out, linking to the alerts page', async () => {
    FIXTURES['/owner/alerts'] = [
      { id: 'a1', severity: 'critical', category: 'db', title: 'ارتفاع مهلات قاعدة البيانات', message: '…', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: '2026-09-26T08:00:00.000Z' },
      { id: 'a2', severity: 'warning', category: 'sync', title: 'تأخر مزامنة', message: '…', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: '2026-09-26T09:00:00.000Z' },
    ];
    renderDashboard();

    expect(await screen.findByText('يحتاج انتباهك')).toBeInTheDocument();
    // Amber tone (any critical severity open) + the counted critical pair.
    const row = screen.getByText('تنبيهات تشغيليّة مفتوحة').closest('a');
    expect(row).not.toBeNull();
    expect(row).toHaveClass('alert', 'amber');
    expect(row).toHaveAttribute('href', '/owner/alerts');
    expect(screen.getByText(/تنبيهان مفتوحان — منها تنبيه حرج واحد/)).toBeInTheDocument();
  });

  it('keeps the brand tone when every open alert is non-critical', async () => {
    FIXTURES['/owner/alerts'] = [
      { id: 'a2', severity: 'warning', category: 'sync', title: 'تأخر مزامنة', message: '…', metadata: null, resolvedAt: null, resolvedBy: null, createdAt: '2026-09-26T09:00:00.000Z' },
    ];
    renderDashboard();

    const row = (await screen.findByText('تنبيهات تشغيليّة مفتوحة')).closest('a');
    expect(row).toHaveClass('alert', 'brand');
    // No critical pair to call out — the desc is the plain counted noun
    // (the status band above carries the same count; scope to the row).
    expect(row!.querySelector('.alert-desc')).toHaveTextContent('تنبيه مفتوح واحد');
  });

  it('surfaces idle teachers from the education payload, linking to the education page', async () => {
    FIXTURES['/owner/education'] = {
      ...NO_IDLE_EDUCATION,
      workloadBuckets: { idle: 2, one: 0, two: 0, three: 0, fourPlus: 0 },
    };
    renderDashboard();

    const row = (await screen.findByText('أساتذة بلا حصص تدريس هذا الفصل')).closest('a');
    expect(row).not.toBeNull();
    expect(row).toHaveClass('alert', 'brand');
    expect(row).toHaveAttribute('href', '/owner/education');
    expect(screen.getByText(/أستاذان لم تُسند إليهم مقرّرات/)).toBeInTheDocument();
  });
});
