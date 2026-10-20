/**
 * r157 wave-2 (F11 rebuild, audit 6A10) — the owner console's honesty
 * pins. Two groups:
 *
 * 1. The five SPEC'd 6A10 pins:
 *    - AI KPI rounding (6A10-3): 97.4→97 / 812.6→813 — the tiles carry
 *      whole numbers, never tenth-precision aggregates.
 *    - Dashboard dot gates, both directions (6A10-4): «جلسات نشطة الآن»
 *      and «سجلّات آخر 7 أيام» paint green ONLY above zero — zero is
 *      quiet/unknown, not "healthy".
 *    - Governance growth window (6A10-8): «آخر N أسابيع» computed from
 *      weeklyGrowth.length on BOTH the card title and the chart's
 *      aria-label; a single week claims no window anywhere.
 *
 * 2. Consolidated pins from the crashed r157 session's LOST dedicated
 *    test files (OwnerSystemPage-error-not-empty / OwnerAlertsPage-
 *    critical-kpi / OwnerRealtimePage-refresh-failure — none of them
 *    exist in this rebuilt tree and none are in this agent's declared
 *    file ownership, so their coverage is re-landed HERE, inside the
 *    owned file, rather than recreating unowned files):
 *    - 6A10-1: a failing flags/settings query renders the honest
 *      error state (with retry) BEFORE the empty state.
 *    - 6A10-2: an 'error'-severity alert counts as critical — red KPI
 *      on the alerts page + amber action-strip row + «خطأ» vocabulary.
 *    - 6A10-5: every live-region tick node carries its own sr-only
 *      label, so the polite announcement reads «التسمية: القيمة».
 *    - 6A10-9: a failed 15s refresh degrades the band but KEEPS the
 *      last reading; only an initial-load failure full-clears the page.
 *
 * Harness: same lib/api mock + chart-stub pattern as
 * OwnerDashboard-action-strip.test.tsx (jsdom has no canvas —
 * react-chartjs-2 is stubbed out). The REAL useOwner hooks + a real
 * QueryClient drive the pages, so the 6A10-9 pins exercise the actual
 * 15s refetchInterval polling path (vi.useFakeTimers).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { OwnerAiPage } from '../../src/pages/owner/OwnerAiPage';
import { OwnerDashboardPage } from '../../src/pages/owner/OwnerDashboardPage';
import { OwnerGovernancePage } from '../../src/pages/owner/OwnerGovernancePage';
import { OwnerAlertsPage } from '../../src/pages/owner/OwnerAlertsPage';
import { OwnerSystemPage } from '../../src/pages/owner/OwnerSystemPage';
import { OwnerRealtimePage } from '../../src/pages/owner/OwnerRealtimePage';
import { isCriticalAlert } from '../../src/lib/ownerLabels';
import { formatInt } from '../../src/utils/numbers';

const { FIXTURES, FAILING, PAGINATED, REALTIME_SEQ } = vi.hoisted(() => ({
  FIXTURES: {} as Record<string, unknown>,
  FAILING: new Set<string>(),
  // /owner/activity is consumed via `res.data` (paginated shape); the
  // rest of the owner hooks unwrap `res.data.data`.
  PAGINATED: new Set<string>(['/owner/activity']),
  REALTIME_SEQ: { calls: 0, failFrom: null as number | null },
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Line: () => <div data-testid="chart-line" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      // /owner/realtime is driven by a call counter so the 6A10-9 pins
      // can fail ONLY the interval poll (call ≥ 2) or the initial load
      // (call ≥ 1) — the actual polling path, not a state injection.
      if (url === '/owner/realtime') {
        REALTIME_SEQ.calls += 1;
        if (REALTIME_SEQ.failFrom !== null && REALTIME_SEQ.calls >= REALTIME_SEQ.failFrom) {
          return Promise.reject(new Error('realtime endpoint down'));
        }
      }
      if (FAILING.has(url)) return Promise.reject(new Error(`forced failure for ${url}`));
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      return Promise.resolve(PAGINATED.has(url) ? { data } : { data: { data } });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

/* ── Shared fixtures ─────────────────────────────────────────── */

const STATS_BASE = {
  totalUsers: 5, students: 1, teachers: 1, admins: 1, quality: 1, owners: 1,
  totalCourses: 6, totalOfferings: 6, totalEnrollments: 6, recentAuditLogs: 21,
};

const REALTIME_LIVE = { activeSessions: 3, aiRequestsPerMin: 0, liveBroadcasts: 0, activeExams: 0 };

const REALTIME_RICH = { activeSessions: 1240, aiRequestsPerMin: 18, liveBroadcasts: 3, activeExams: 42 };

const ACTIVITY_EMPTY = { data: [], meta: { page: 1, limit: 8, total: 0, totalPages: 1 } };

const NO_IDLE_EDUCATION = {
  totals: { totalCourses: 6, totalOfferings: 6, teachers: 1, avgEnrolment: 1 },
  byFaculty: [],
  topCourses: [],
  workloadBuckets: { idle: 0, one: 0, two: 0, three: 0, fourPlus: 1 },
  attendanceTrend: [],
};

/** 8 weeks of signups — the multi-week growth window fixture. */
const GROWTH_8W = Array.from({ length: 8 }, (_, i) => ({ week: `2026-W${i + 1}`, count: i + 1 }));

const LOGIN_ANALYTICS_EMPTY = {
  total: 0, successCount: 0, failureCount: 0, daily: [], topReasons: [],
};

function resetFixtures() {
  for (const k of Object.keys(FIXTURES)) delete FIXTURES[k];
  FAILING.clear();
  REALTIME_SEQ.calls = 0;
  REALTIME_SEQ.failFrom = null;
  FIXTURES['/owner/stats'] = { ...STATS_BASE };
  FIXTURES['/owner/realtime'] = { ...REALTIME_LIVE };
  FIXTURES['/owner/alerts'] = [];
  FIXTURES['/owner/activity'] = ACTIVITY_EMPTY;
  FIXTURES['/owner/education'] = NO_IDLE_EDUCATION;
  FIXTURES['/owner/ai-metrics'] = {
    totalRequests: 1234, totalTokens: 999, successRate: 97.4, avgLatencyMs: 812.6,
    byFeature: [], trend: [],
  };
  FIXTURES['/owner/governance'] = {
    permissionChanges: 2, roleChanges: 1, newUsersThisMonth: 3,
    weeklyGrowth: GROWTH_8W,
  };
  FIXTURES['/owner/login-analytics'] = { ...LOGIN_ANALYTICS_EMPTY };
  FIXTURES['/owner/system'] = {
    sync: { lastRunAt: null, recent: [] },
    alerts: { open: [], openCount: 0, criticalCount: 0 },
    activity: { recentEventsLast7Days: 0 },
  };
  FIXTURES['/owner/feature-flags'] = [];
  FIXTURES['/owner/settings'] = [];
}

function renderPage(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetFixtures();
});

/* ════════════════════════════════════════════════════════════════
   The five spec'd 6A10 pins
   ════════════════════════════════════════════════════════════════ */

describe('OwnerAiPage — KPI rounding (6A10-3)', () => {
  it('rounds successRate and avgLatencyMs to whole numbers (97.4→97, 812.6→813)', async () => {
    renderPage(<OwnerAiPage />);
    expect(await screen.findByText('97%')).toBeInTheDocument();
    expect(screen.getByText('813ms')).toBeInTheDocument();
    // The tenth-precision raw values never render.
    expect(screen.queryByText('97.4%')).toBeNull();
    expect(screen.queryByText('812.6ms')).toBeNull();
  });
});

describe('OwnerDashboardPage — health dot gates (6A10-4)', () => {
  /** The dot rendered beside a health-list row, found by its label. */
  const dotBeside = (label: string) =>
    screen.getByText(label).closest('.owner-health-row')!.querySelector('.owner-health-dot')!;

  it('renders «جلسات نشطة الآن» and «سجلّات آخر 7 أيام» neutral at zero (quiet, not healthy)', async () => {
    FIXTURES['/owner/realtime'] = { ...REALTIME_LIVE, activeSessions: 0 };
    FIXTURES['/owner/stats'] = { ...STATS_BASE, recentAuditLogs: 0 };
    renderPage(<OwnerDashboardPage />);
    await screen.findByText('سجلّات آخر 7 أيام');

    const sessionsDot = dotBeside('جلسات نشطة الآن');
    expect(sessionsDot).toHaveClass('neutral');
    expect(sessionsDot).not.toHaveClass('green');
    const logsDot = dotBeside('سجلّات آخر 7 أيام');
    expect(logsDot).toHaveClass('neutral');
    expect(logsDot).not.toHaveClass('green');
  });

  it('paints both dots green only when the counts are actually above zero', async () => {
    // BASE fixtures already carry activeSessions: 3 / recentAuditLogs: 21.
    renderPage(<OwnerDashboardPage />);
    await screen.findByText('سجلّات آخر 7 أيام');

    expect(dotBeside('جلسات نشطة الآن')).toHaveClass('green');
    expect(dotBeside('سجلّات آخر 7 أيام')).toHaveClass('green');
  });
});

describe('OwnerGovernancePage — growth window from weeklyGrowth.length (6A10-8)', () => {
  it('computes «آخر 8 أسابيع» on BOTH the card title and the chart aria-label', async () => {
    renderPage(<OwnerGovernancePage />);
    // The visible title carries the length-derived window…
    expect(await screen.findByText('نموّ المستخدمين (آخر 8 أسابيع)')).toBeInTheDocument();
    // …and so does the chart's accessible name.
    expect(
      screen.getByRole('img', { name: 'مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً على مدى آخر 8 أسابيع' }),
    ).toBeInTheDocument();
  });

  it('claims no window at all with a single week of data (title AND aria-label)', async () => {
    FIXTURES['/owner/governance'] = {
      permissionChanges: 2, roleChanges: 1, newUsersThisMonth: 3,
      weeklyGrowth: [{ week: '2026-W40', count: 3 }],
    };
    renderPage(<OwnerGovernancePage />);
    // Wait for a settled surface (the KPI strip) — the card title
    // renders while pending, with the no-window spelling.
    await screen.findByText('تغييرات الصلاحيات');
    // The title is the bare subject — no «(آخر …)» claim.
    expect(screen.getByText('نموّ المستخدمين', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/نموّ المستخدمين \(/)).toBeNull();
    // The accessible name stays windowless too.
    const chart = screen.getByRole('img', { name: 'مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً' });
    expect(chart.getAttribute('aria-label')).not.toMatch(/آخر|أسابيع/);
  });
});

/* ════════════════════════════════════════════════════════════════
   Consolidated coverage re-landed from the crashed session's lost
   dedicated pin files (see the file header)
   ════════════════════════════════════════════════════════════════ */

describe('OwnerSystemPage — error before empty (6A10-1)', () => {
  it('flags/settings failures render the honest error state with retry — never the empty states', async () => {
    FAILING.add('/owner/feature-flags');
    FAILING.add('/owner/settings');
    renderPage(<OwnerSystemPage />);

    expect(await screen.findByText('تعذّر جلب أعلام الميزات')).toBeInTheDocument();
    expect(await screen.findByText('تعذّر جلب إعدادات المنصّة')).toBeInTheDocument();
    // The empty states must NOT mask the failure (ruling #14).
    expect(screen.queryByText('لا توجد أعلام مُعرَّفة')).toBeNull();
    expect(screen.queryByText('لا توجد إعدادات مُعرَّفة')).toBeNull();
    // Each failed card carries its own retry affordance.
    expect(screen.getAllByRole('button', { name: 'إعادة المحاولة' })).toHaveLength(2);
  });
});

describe('isCriticalAlert — the critical pair (6A10-2)', () => {
  it('counts critical OR error exactly like the backend pair rule', () => {
    expect(isCriticalAlert({ severity: 'critical' })).toBe(true);
    expect(isCriticalAlert({ severity: 'error' })).toBe(true);
    expect(isCriticalAlert({ severity: 'warning' })).toBe(false);
    expect(isCriticalAlert({ severity: 'info' })).toBe(false);
  });
});

describe('OwnerAlertsPage — error-as-critical (6A10-2)', () => {
  it('an error-severity alert turns the critical KPI red, counts it, and keeps the «خطأ» vocabulary', async () => {
    FIXTURES['/owner/alerts'] = [
      {
        id: 'a-err', severity: 'error', category: 'app',
        title: 'خطأ داخلي في الخادم', message: 'HTTP 500 on /api/v1/…',
        metadata: null, resolvedAt: null, resolvedBy: null,
        createdAt: '2026-09-26T08:00:00.000Z',
      },
    ];
    renderPage(<OwnerAlertsPage />);
    // Wait for the settled feed (the card's severity badge) — the KPI
    // tiles render while pending with the neutral brand tone.
    await screen.findByText('خطأ');

    // The critical KPI counts the error-severity alert (pair, not
    // strict equality) and paints red because it is above zero.
    /* R190 D4 re-pin: the icon tile's `red` class became the stat
     * cell's trend note in the down (red-ink) tone — the same
     * "critical paints red" contract in the strip's anatomy. */
    const criticalCell = screen.getByText('تنبيهات حرجة').closest('.stat-cell')!;
    const criticalTrend = criticalCell.querySelector('.stat-trend')!;
    expect(criticalTrend).toHaveClass('down');
    expect(criticalTrend.textContent).toBe('تستوجب قرارًا الآن');
    expect(criticalCell.querySelector('.stat-value')!.textContent).toBe('1');
    // The card itself renders the pair's Arabic vocabulary — «خطأ»,
    // never the raw Latin enum.
    expect(screen.queryByText('error')).toBeNull();
  });
});

describe('OwnerDashboardPage — error-as-critical strip (6A10-2)', () => {
  it('an error-severity open alert makes the action-strip row amber with the critical pair called out', async () => {
    FIXTURES['/owner/alerts'] = [
      {
        id: 'a-err', severity: 'error', category: 'http',
        title: 'تعذّر إتمام طلب', message: '…',
        metadata: null, resolvedAt: null, resolvedBy: null,
        createdAt: '2026-09-26T09:00:00.000Z',
      },
    ];
    renderPage(<OwnerDashboardPage />);

    /* R189 re-pin: the amber tone rides the ledger panel's zone-rose. */
    const row = (await screen.findByText('تنبيهات تشغيليّة مفتوحة')).closest('a');
    expect(row).not.toBeNull();
    expect(row).toHaveClass('ledger-row-link');
    expect(row!.closest('.ledger')).toHaveClass('zone-rose');
    expect(screen.getByText(/تنبيه مفتوح واحد — منها تنبيه حرج واحد/)).toBeInTheDocument();
  });
});

describe('OwnerRealtimePage — live region label:value (6A10-5)', () => {
  it('every tick node carries its sr-only label inside the re-anchored bdi — «التسمية: القيمة»', async () => {
    FIXTURES['/owner/realtime'] = { ...REALTIME_RICH };
    renderPage(<OwnerRealtimePage />);
    await screen.findByText('الجلسات المتّصلة');

    const ticks = Array.from(document.querySelectorAll('bdi.owner-value-tick'));
    expect(ticks).toHaveLength(4);
    const fmt = (n: number) => formatInt(n); // r197: the one formatter path (Western separators)
    for (const [label, value] of [
      ['الجلسات النشطة', 1240],
      ['طلبات AI / دقيقة', 18],
      ['بثّ مباشر', 3],
      ['اختبارات جارية', 42],
    ] as Array<[string, number]>) {
      const node = ticks.find((t) => t.querySelector('.sr-only')?.textContent === `${label}: `);
      expect(node, `no tick node carries the sr-only label «${label}: `).toBeDefined();
      // The announcement content is label + value in ONE node.
      expect(node!.textContent).toContain(`${label}: ${fmt(value)}`);
    }
  });
});

describe('OwnerRealtimePage — refresh failure degradation (6A10-9)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FIXTURES['/owner/realtime'] = { ...REALTIME_RICH };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('the 15s poll actually refreshes the readings (the real polling path)', async () => {
    renderPage(<OwnerRealtimePage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(REALTIME_SEQ.calls).toBe(1);
    expect(document.querySelector('section[aria-live="polite"]')).not.toBeNull();
    const band = document.querySelector('.owner-live-status')!;
    expect(band.className).not.toContain('is-degraded');

    // Fresh data lands on the next poll — the tick values re-render.
    FIXTURES['/owner/realtime'] = { ...REALTIME_RICH, activeSessions: 1241 };
    await act(async () => { await vi.advanceTimersByTimeAsync(16_000); });
    expect(REALTIME_SEQ.calls).toBe(2);
    expect(document.querySelector('section[aria-live="polite"]')!.textContent)
      .toContain('1,241'); // r197 convention
  });

  it('degrades the band on a failed 15s refresh but KEEPS the last reading (no full clear)', async () => {
    // Call 1 (initial load) succeeds; call 2 — the first interval poll —
    // rejects. TanStack keeps the last successful data through the
    // refetch error, which is exactly the state the page must honor.
    REALTIME_SEQ.failFrom = 2;
    renderPage(<OwnerRealtimePage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(REALTIME_SEQ.calls).toBe(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(16_000); });
    expect(REALTIME_SEQ.calls).toBe(2);

    const band = document.querySelector('.owner-live-status')!;
    expect(band.className).toContain('is-degraded');
    expect(band.querySelector('.status-text')!.textContent).toContain('تعذّر تحديث القراءات');
    // The last reading is KEPT: the live region (and its labelled ticks)
    // still renders the pre-failure values — no full-page clear.
    const region = document.querySelector('section[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region!.textContent).toContain('1,240'); // r197 convention
    expect(document.querySelector('.state-error')).toBeNull();
  });

  it('full-clears ONLY when the initial load itself fails (nothing honest to keep)', async () => {
    REALTIME_SEQ.failFrom = 1;
    renderPage(<OwnerRealtimePage />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(document.querySelector('section[aria-live="polite"]')).toBeNull();
    expect(document.querySelector('.state-error')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });
});
