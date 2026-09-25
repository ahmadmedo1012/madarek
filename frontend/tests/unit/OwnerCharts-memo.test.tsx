/**
 * Task 13-14 — Owner chart pages prop-identity stability (audit 11-f P2-2).
 *
 * react-chartjs-2 re-applies options/datasets whenever the `data` /
 * `options` prop identities change, triggering chart.update() — an
 * animated relayout. The owner dashboard re-renders every 15 s
 * (useOwnerRealtime poll) and every page re-renders when a sibling query
 * settles, so unmemoized chart props churned the canvases constantly.
 *
 * These tests pin the memoization:
 *   1. An unrelated re-render (same query data) passes the SAME
 *      data/options object references to Bar/Line/Doughnut.
 *   2. The memos stay live: when the underlying query data identity
 *      changes, the chart data prop is rebuilt (and only the affected
 *      chart's — the governance page's two queries are independent).
 *   3. Options rebuild only when the chart theme key flips (the palette
 *      resolves CSS custom properties at call time; the canvas remounts
 *      with key={themeKey} and must re-resolve them).
 *
 * jsdom has no canvas — react-chartjs-2 is stubbed with prop-capturing
 * stand-ins; the real query hooks run against a mocked lib/api so the
 * memo dependencies (query cache data identities) behave exactly like
 * production.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OwnerDashboardPage } from '../../src/pages/owner/OwnerDashboardPage';
import { OwnerEducationPage } from '../../src/pages/owner/OwnerEducationPage';
import { OwnerGovernancePage } from '../../src/pages/owner/OwnerGovernancePage';
import { OwnerAiPage } from '../../src/pages/owner/OwnerAiPage';
import { __chartThemeTestUtils__ } from '../../src/lib/chartTheme';

interface CapturedProps {
  data: unknown;
  options: unknown;
}

const { chartProps, FIXTURES, PAGINATED } = vi.hoisted(() => ({
  chartProps: {
    bar: [] as Array<{ data: unknown; options: unknown }>,
    line: [] as Array<{ data: unknown; options: unknown }>,
    doughnut: [] as Array<{ data: unknown; options: unknown }>,
  },
  FIXTURES: {} as Record<string, unknown>,
  PAGINATED: new Set<string>(['/owner/activity']),
}));

vi.mock('react-chartjs-2', () => ({
  Bar: (props: CapturedProps) => {
    chartProps.bar.push(props);
    return <div data-testid="chart-bar" />;
  },
  Line: (props: CapturedProps) => {
    chartProps.line.push(props);
    return <div data-testid="chart-line" />;
  },
  Doughnut: (props: CapturedProps) => {
    chartProps.doughnut.push(props);
    return <div data-testid="chart-doughnut" />;
  },
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
  totalUsers: 460,
  students: 400,
  teachers: 40,
  admins: 15,
  quality: 4,
  owners: 1,
  totalCourses: 55,
  totalOfferings: 80,
  totalEnrollments: 350,
  recentAuditLogs: 42,
};

const REALTIME = {
  activeSessions: 12,
  aiRequestsPerMin: 3,
  liveBroadcasts: 1,
  activeExams: 2,
};

const ACTIVITY = {
  data: [],
  meta: { page: 1, limit: 8, total: 0, totalPages: 1 },
};

const EDUCATION = {
  totals: { totalCourses: 55, totalOfferings: 80, teachers: 40, avgEnrolment: 12 },
  byFaculty: [
    { name: 'كلية الهندسة', courseCount: 20 },
    { name: 'كلية الطب', courseCount: 12 },
  ],
  topCourses: [
    { code: 'CS101', name: 'مقدمة في الحاسوب', facultyName: 'كلية الهندسة', enrolled: 64 },
  ],
  workloadBuckets: { idle: 4, one: 10, two: 14, three: 8, fourPlus: 4 },
  attendanceTrend: [
    { month: '2025-01', attendancePct: 88, samples: 30 },
    { month: '2025-02', attendancePct: null, samples: 0 },
    { month: '2025-03', attendancePct: 91, samples: 22 },
  ],
};

const GOVERNANCE = {
  permissionChanges: 6,
  roleChanges: 2,
  newUsersThisMonth: 9,
  weeklyGrowth: [
    { week: '2025-W1', count: 3 },
    { week: '2025-W2', count: 5 },
    { week: '2025-W3', count: 2 },
  ],
};

const LOGIN_ANALYTICS = {
  total: 40,
  successCount: 30,
  failureCount: 10,
  daily: [{ date: '2025-01-01', success: 5, failure: 1 }],
  topReasons: [{ reason: 'INVALID_CREDENTIALS', count: 8 }],
};

const AI_METRICS = {
  totalRequests: 120,
  totalTokens: 900000,
  successRate: 97,
  avgLatencyMs: 800,
  byFeature: [
    { feature: 'chat', count: 60, tokens: 500000 },
    { feature: 'translation', count: 60, tokens: 400000 },
  ],
  trend: [
    { date: '2025-01-01', count: 20 },
    { date: '2025-01-02', count: 30 },
  ],
};

function last<T>(arr: T[]): T {
  return arr[arr.length - 1]!;
}

function renderPage(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const providers = (element: React.ReactElement) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(providers(ui));
  return {
    client,
    rerender: (el: React.ReactElement) => view.rerender(providers(el)),
  };
}

beforeEach(() => {
  chartProps.bar.length = 0;
  chartProps.line.length = 0;
  chartProps.doughnut.length = 0;
  FIXTURES['/owner/stats'] = STATS;
  FIXTURES['/owner/realtime'] = REALTIME;
  FIXTURES['/owner/alerts'] = [];
  FIXTURES['/owner/activity'] = ACTIVITY;
  FIXTURES['/owner/education'] = EDUCATION;
  FIXTURES['/owner/governance'] = GOVERNANCE;
  FIXTURES['/owner/login-analytics'] = LOGIN_ANALYTICS;
  FIXTURES['/owner/ai-metrics'] = AI_METRICS;
  __chartThemeTestUtils__.reset();
});

afterEach(() => {
  __chartThemeTestUtils__.reset();
});

describe('OwnerDashboardPage — the polling page (15 s realtime refetch)', () => {
  it('passes the same Doughnut data/options objects to every unrelated re-render', async () => {
    const { rerender } = renderPage(<OwnerDashboardPage />);
    // Wait for every query to settle so the captured baseline is the
    // steady state (healthy band + empty activity feed both require
    // their queries to have answered).
    await screen.findByText('النظام يعمل بشكل طبيعي');
    await screen.findByText('لا توجد أحداث بعد');
    expect(screen.getByTestId('chart-doughnut')).toBeInTheDocument();

    const beforeCount = chartProps.doughnut.length;
    const before = last(chartProps.doughnut);

    // Unrelated re-render (a parent re-render / route state change —
    // same class as the 15 s poll tick landing on the realtime query).
    rerender(<OwnerDashboardPage />);
    await waitFor(() => expect(chartProps.doughnut.length).toBeGreaterThan(beforeCount));

    const after = last(chartProps.doughnut);
    expect(after.data).toBe(before.data);
    expect(after.options).toBe(before.options);
  });

  it('rebuilds the data prop when the stats payload actually changes (memo deps stay live)', async () => {
    const { client } = renderPage(<OwnerDashboardPage />);
    await screen.findByTestId('chart-doughnut');
    const before = last(chartProps.doughnut);

    await act(async () => {
      client.setQueryData(['owner', 'stats'], { ...STATS, students: STATS.students + 5 });
    });

    await waitFor(() => expect(last(chartProps.doughnut).data).not.toBe(before.data));
    // No theme/motion change → the options object is NOT rebuilt.
    expect(last(chartProps.doughnut).options).toBe(before.options);
  });

  it('re-resolves data and options when the chart theme flips (key={themeKey} remount)', async () => {
    renderPage(<OwnerDashboardPage />);
    await screen.findByTestId('chart-doughnut');
    const before = last(chartProps.doughnut);

    // forceKey synchronously notifies the useSyncExternalStore listeners
    // (React state update) — wrap in act so the flip is fully applied.
    await act(async () => {
      __chartThemeTestUtils__.forceKey('dark');
    });

    await waitFor(() => {
      expect(last(chartProps.doughnut).data).not.toBe(before.data);
      expect(last(chartProps.doughnut).options).not.toBe(before.options);
    });
  });
});

describe('OwnerEducationPage — memoized Bar + Line props', () => {
  it('passes the same data/options objects across unrelated re-renders', async () => {
    const { rerender } = renderPage(<OwnerEducationPage />);
    await screen.findByTestId('chart-bar');
    await screen.findByTestId('chart-line');

    const barCount = chartProps.bar.length;
    const lineCount = chartProps.line.length;
    const barBefore = last(chartProps.bar);
    const lineBefore = last(chartProps.line);

    rerender(<OwnerEducationPage />);
    await waitFor(() => expect(chartProps.bar.length).toBeGreaterThan(barCount));
    await waitFor(() => expect(chartProps.line.length).toBeGreaterThan(lineCount));

    expect(last(chartProps.bar).data).toBe(barBefore.data);
    expect(last(chartProps.bar).options).toBe(barBefore.options);
    expect(last(chartProps.line).data).toBe(lineBefore.data);
    expect(last(chartProps.line).options).toBe(lineBefore.options);
  });

  it('rebuilds the chart data when the education payload changes', async () => {
    const { client } = renderPage(<OwnerEducationPage />);
    await screen.findByTestId('chart-bar');
    const before = last(chartProps.bar);

    await act(async () => {
      client.setQueryData(['owner', 'education'], {
        ...EDUCATION,
        byFaculty: [...EDUCATION.byFaculty, { name: 'كلية العلوم', courseCount: 7 }],
      });
    });

    await waitFor(() => expect(last(chartProps.bar).data).not.toBe(before.data));
    expect(last(chartProps.bar).options).toBe(before.options);
  });
});

describe('OwnerGovernancePage — two independent queries, two charts', () => {
  it('passes the same data/options objects across unrelated re-renders', async () => {
    const { rerender } = renderPage(<OwnerGovernancePage />);
    await screen.findByTestId('chart-line');
    await screen.findByTestId('chart-doughnut');

    const lineCount = chartProps.line.length;
    const doughnutCount = chartProps.doughnut.length;
    const lineBefore = last(chartProps.line);
    const doughnutBefore = last(chartProps.doughnut);

    rerender(<OwnerGovernancePage />);
    await waitFor(() => expect(chartProps.line.length).toBeGreaterThan(lineCount));
    await waitFor(() => expect(chartProps.doughnut.length).toBeGreaterThan(doughnutCount));

    expect(last(chartProps.line).data).toBe(lineBefore.data);
    expect(last(chartProps.line).options).toBe(lineBefore.options);
    expect(last(chartProps.doughnut).data).toBe(doughnutBefore.data);
    expect(last(chartProps.doughnut).options).toBe(doughnutBefore.options);
  });

  it('rebuilds only the growth chart when governance data changes (login chart untouched)', async () => {
    const { client } = renderPage(<OwnerGovernancePage />);
    await screen.findByTestId('chart-line');
    await screen.findByTestId('chart-doughnut');
    const growthBefore = last(chartProps.line);
    const doughnutBefore = last(chartProps.doughnut);

    await act(async () => {
      client.setQueryData(['owner', 'governance'], { ...GOVERNANCE, roleChanges: GOVERNANCE.roleChanges + 1 });
    });

    await waitFor(() => expect(last(chartProps.line).data).not.toBe(growthBefore.data));
    // The login-analytics query never changed — its chart keeps the
    // exact same data AND options objects (no cross-chart churn).
    expect(last(chartProps.doughnut).data).toBe(doughnutBefore.data);
    expect(last(chartProps.doughnut).options).toBe(doughnutBefore.options);
    expect(last(chartProps.line).options).toBe(growthBefore.options);
  });
});

describe('OwnerAiPage — memoized Bar + Line props', () => {
  it('passes the same data/options objects across unrelated re-renders', async () => {
    const { rerender } = renderPage(<OwnerAiPage />);
    await screen.findByTestId('chart-bar');
    await screen.findByTestId('chart-line');

    const barCount = chartProps.bar.length;
    const lineCount = chartProps.line.length;
    const barBefore = last(chartProps.bar);
    const lineBefore = last(chartProps.line);

    rerender(<OwnerAiPage />);
    await waitFor(() => expect(chartProps.bar.length).toBeGreaterThan(barCount));
    await waitFor(() => expect(chartProps.line.length).toBeGreaterThan(lineCount));

    expect(last(chartProps.bar).data).toBe(barBefore.data);
    expect(last(chartProps.bar).options).toBe(barBefore.options);
    expect(last(chartProps.line).data).toBe(lineBefore.data);
    expect(last(chartProps.line).options).toBe(lineBefore.options);
  });

  it('rebuilds the chart data when the AI metrics payload changes', async () => {
    const { client } = renderPage(<OwnerAiPage />);
    await screen.findByTestId('chart-bar');
    const before = last(chartProps.bar);

    await act(async () => {
      client.setQueryData(['owner', 'ai-metrics'], { ...AI_METRICS, totalRequests: AI_METRICS.totalRequests + 1 });
    });

    await waitFor(() => expect(last(chartProps.bar).data).not.toBe(before.data));
    expect(last(chartProps.bar).options).toBe(before.options);
  });
});
