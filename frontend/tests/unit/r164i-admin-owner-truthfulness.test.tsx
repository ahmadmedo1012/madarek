/**
 * r164-i (admin/quality/owner coherence) — truthfulness pins for the
 * admin + owner consoles:
 *
 * 1. OwnerSystemPage storage display (BOTH payload shapes): the
 *    backend's GET /owner/system payload gains an additive
 *    `storage: { driver, persistent }` block in r164-l — payloads from
 *    before that change carry no such block. The page must render
 *    «غير متوفر» for the old shape (never crash, never guess green),
 *    name the driver honestly, and raise the documented warning
 *    («الرفعات لا تنجو من إعادة النشر») ONLY when persistent=false.
 * 2. OwnerAiPage provider badge: the r160 honest-surface badge
 *    (GET /ai/config) names the REAL model when one answers and says
 *    «محليّ» when the local composer does; a failed config probe
 *    renders NO badge (fail-soft — the metrics still render).
 * 3. AdminSyncPage freshness: each synced fact carries its own
 *    «آخر تحديث» from the payload's syncedAt (a real field
 *    sync.routes.ts ships), and the facts card is labelled as what it
 *    is — a fixed zu-sync snapshot («مصدر: المزامنة»).
 * 4. OwnerUsersPage table coherence: the pagination footer renders
 *    whenever rows exist (single page included — the roster's total
 *    stays visible, matching the AdminStudentsPage family footer), and
 *    a failing query surfaces the honest error state, never the empty
 *    state.
 * 5. AdminPermissionsPage self-edit guard: opening YOUR OWN permission
 *    profile explains the block up front (the backend answers every
 *    self-edit with 403) and disables the row actions; another user's
 *    profile keeps them enabled.
 *
 * Harness: the OwnerPages-6A10-pins pattern — lib/api mocked at the
 * module boundary with per-URL fixtures (+ a FAILING set), a real
 * QueryClient, and react-chartjs-2 stubbed (jsdom has no canvas).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { OwnerSystemPage } from '../../src/pages/owner/OwnerSystemPage';
import { OwnerAiPage } from '../../src/pages/owner/OwnerAiPage';
import { OwnerUsersPage } from '../../src/pages/owner/OwnerUsersPage';
import { AdminSyncPage } from '../../src/pages/admin/AdminSyncPage';
import { AdminPermissionsPage } from '../../src/pages/admin/AdminGovernancePages';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

const { FIXTURES, FAILING, PAGINATED } = vi.hoisted(() => ({
  FIXTURES: {} as Record<string, unknown>,
  FAILING: new Set<string>(),
  // Consumers that read `res.data` directly (paginated { data, meta }
  // bodies) rather than unwrapping the `{ data: { data } }` envelope.
  PAGINATED: new Set<string>(['/owner/users']),
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="chart-bar" />,
  Line: () => <div data-testid="chart-line" />,
  Doughnut: () => <div data-testid="chart-doughnut" />,
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      if (FAILING.has(url)) return Promise.reject(new Error(`forced failure for ${url}`));
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      return Promise.resolve(PAGINATED.has(url) ? { data } : { data: { data } });
    },
    post: (url: string) => {
      if (FAILING.has(url)) return Promise.reject(new Error(`forced failure for ${url}`));
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected POST ${url}`));
      return Promise.resolve(PAGINATED.has(url) ? { data } : { data: { data } });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

/* ── Shared fixtures ─────────────────────────────────────────── */

const SYSTEM_BASE = {
  sync: { lastRunAt: null, recent: [] },
  alerts: { open: [], openCount: 0, criticalCount: 0 },
  activity: { recentEventsLast7Days: 0 },
};

const AI_METRICS_EMPTY = {
  totalRequests: 0, totalTokens: 0, successRate: 0, avgLatencyMs: 0,
  byFeature: [], trend: [],
};

const OWNER_USER_ROW = {
  id: 'u1', email: 'amina@zu.edu.ly', firstName: 'أمينة', lastName: 'المشرفة',
  role: 'ADMIN', avatarColor: null, avatarInitials: null,
  isActive: true, createdAt: '2026-01-05T00:00:00.000Z',
};

function resetFixtures() {
  for (const k of Object.keys(FIXTURES)) delete FIXTURES[k];
  FAILING.clear();
  FIXTURES['/owner/system'] = { ...SYSTEM_BASE };
  FIXTURES['/owner/feature-flags'] = [];
  FIXTURES['/owner/settings'] = [];
  FIXTURES['/owner/ai-metrics'] = { ...AI_METRICS_EMPTY };
  FIXTURES['/owner/stats'] = {
    totalUsers: 1, students: 0, teachers: 0, admins: 1, quality: 0, owners: 0,
    totalCourses: 0, totalOfferings: 0, totalEnrollments: 0, recentAuditLogs: 0,
  };
  FIXTURES['/owner/users'] = {
    data: [OWNER_USER_ROW],
    meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
  };
  useAuthStore.setState({ user: null });
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

afterEach(() => {
  useAuthStore.setState({ user: null });
});

/* ════════════════════════════════════════════════════════════════
   1. OwnerSystemPage — storage truthfulness (both payload shapes)
   ════════════════════════════════════════════════════════════════ */

describe('OwnerSystemPage — storage block (r164-l additive field, defensive read)', () => {
  it('renders «غير متوفر» for the OLD payload shape (no storage block) — no guess, no warning', async () => {
    renderPage(<OwnerSystemPage />);
    // findByText WAITS for the query to resolve (the card renders its
    // pending «…» row first — the KPI strip's own convention).
    expect(await screen.findByText('غير متوفر')).toBeInTheDocument();
    expect(screen.getByText('تخزين الرفعات (PDF)')).toBeInTheDocument();
    // The honest unknown note, not the production warning.
    expect(screen.getByText(/لا تُصرّح عن حالة تخزين/)).toBeInTheDocument();
    expect(screen.queryByText(/يتطلب إعداد تخزين دائم/)).toBeNull();
  });

  it('local driver + persistent=false → names the driver, paints «لا تنجو من إعادة النشر», raises the documented warning', async () => {
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: { driver: 'local', persistent: false },
    };
    renderPage(<OwnerSystemPage />);
    expect(await screen.findByText('محليّ — قرص الخادم')).toBeInTheDocument();
    expect(screen.getByText('لا تنجو من إعادة النشر')).toBeInTheDocument();
    expect(
      screen.getByText('الرفعات لا تنجو من إعادة النشر — يتطلب إعداد تخزين دائم (S3)'),
    ).toBeInTheDocument();
    // The fix is named: the env var + the documented owner step.
    expect(screen.getByText(/STORAGE_DRIVER=s3/)).toBeInTheDocument();
    expect(screen.getByText(/docs\/12-deployment\.md/)).toBeInTheDocument();
  });

  it('s3 driver + verified reachable (r167 fields) → «دائمة», NO warning', async () => {
    // r167: the backend folds the memoized probe answer in — the
    // verified-reachable case is what «دائمة» now requires (the
    // unverified/outage s3 shapes are pinned in
    // r167-owner-storage-reachability.test.tsx).
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: {
        driver: 's3',
        persistent: true,
        reachable: true,
        checkedAt: new Date(Date.now() - 60_000).toISOString(),
      },
    };
    renderPage(<OwnerSystemPage />);
    expect(await screen.findByText('تخزين كائنات (S3-متوافق)')).toBeInTheDocument();
    expect(screen.getByText('دائمة')).toBeInTheDocument();
    expect(screen.queryByText(/يتطلب إعداد تخزين دائم/)).toBeNull();
    expect(screen.queryByText('لا تنجو من إعادة النشر')).toBeNull();
  });

  it('an unknown future driver renders bidi-isolated, never a wrong label', async () => {
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: { driver: 'azure-blob', persistent: true },
    };
    renderPage(<OwnerSystemPage />);
    expect(await screen.findByText('azure-blob')).toBeInTheDocument();
    expect(screen.queryByText('محليّ — قرص الخادم')).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════
   2. OwnerAiPage — the r160 provider badge on the monitoring side
   ════════════════════════════════════════════════════════════════ */

describe('OwnerAiPage — AI provider state (local vs real model)', () => {
  it('local provider → the badge says «محليّ», never an LLM name', async () => {
    FIXTURES['/ai/config'] = { provider: 'local', model: null };
    renderPage(<OwnerAiPage />);
    expect(await screen.findByText('محليّ')).toBeInTheDocument();
    expect(screen.queryByText('AI')).toBeNull();
  });

  it('openai provider → the badge names the REAL model string', async () => {
    FIXTURES['/ai/config'] = { provider: 'openai', model: 'llama-3.1-8b-instruct' };
    renderPage(<OwnerAiPage />);
    expect(await screen.findByText('llama-3.1-8b-instruct')).toBeInTheDocument();
    expect(screen.queryByText('محليّ')).toBeNull();
  });

  it('a failed config probe renders NO badge (fail-soft) while the metrics still load', async () => {
    FAILING.add('/ai/config');
    renderPage(<OwnerAiPage />);
    // The page's own KPIs arrive — the monitoring surface works.
    expect(await screen.findByText('إجمالي الطلبات')).toBeInTheDocument();
    expect(screen.queryByText('محليّ')).toBeNull();
    expect(screen.queryByText(/llama/i)).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════
   3. AdminSyncPage — zu-sync snapshot freshness labels
   ════════════════════════════════════════════════════════════════ */

describe('AdminSyncPage — freshness semantics', () => {
  const SYNCED_AT = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

  const syncPayload = () => ({
    latestRun: {
      id: 'run1', startedAt: SYNCED_AT, completedAt: SYNCED_AT, status: 'SUCCESS',
      source: 'static-markdown', factsAdded: 2, factsUpdated: 1, durationMs: 400,
      errorMsg: null, notes: null,
    },
    runHistory: [],
    factCount: 1,
    staleCount: 0,
    categories: [
      {
        category: 'identity',
        count: 1,
        items: [
          { key: 'name.ar', value: 'جامعة الزاوية', source: 'zu.edu.ly:about', isStale: false, syncedAt: SYNCED_AT },
        ],
      },
    ],
  });

  it('labels the facts card as a zu-sync snapshot («مصدر: المزامنة»)', async () => {
    FIXTURES['/admin/sync'] = syncPayload();
    renderPage(<AdminSyncPage />);
    expect(await screen.findByText(/مصدر: المزامنة \(zu-sync\)/)).toBeInTheDocument();
  });

  it('shows each fact its own «آخر تحديث» from the payload\'s syncedAt', async () => {
    FIXTURES['/admin/sync'] = syncPayload();
    renderPage(<AdminSyncPage />);
    // Open the only category — facts render on disclosure.
    fireEvent.click(await screen.findByRole('button', { name: /هوية الجامعة/ }));
    const value = await screen.findByText('جامعة الزاوية');
    const row = value.closest('.fact-row') as HTMLElement;
    expect(within(row).getByText(/آخر تحديث/)).toBeInTheDocument();
    // 5h ago → the counted-plural hour form (ساعات), not a fabricated instant.
    expect(within(row).getByText(/منذ \d+ ساع/)).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   4. OwnerUsersPage — table coherence (count + honest error state)
   ════════════════════════════════════════════════════════════════ */

describe('OwnerUsersPage — footer count + error state', () => {
  it('shows the roster total on a SINGLE page too (family footer contract)', async () => {
    renderPage(<OwnerUsersPage />);
    expect(await screen.findByText('أمينة المشرفة')).toBeInTheDocument();
    // total: 1 → «الصفحة 1 من 1 · مستخدم واحد» — visible without a second page.
    expect(screen.getByText(/الصفحة 1 من 1 · مستخدم واحد/)).toBeInTheDocument();
  });

  it('a failing users query surfaces the error state with retry — never the empty state', async () => {
    FAILING.add('/owner/users');
    renderPage(<OwnerUsersPage />);
    expect(await screen.findByText('تعذَّر تحميل هذا القسم')).toBeInTheDocument();
    expect(screen.queryByText('لا يوجد مستخدمون بعد')).toBeNull();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   5. AdminPermissionsPage — self-edit guard explanation
   ════════════════════════════════════════════════════════════════ */

const ME: AuthUser = {
  id: 'me1',
  email: 'admin@zu.edu.ly',
  firstName: 'المشرف',
  lastName: 'العام',
  role: 'ADMIN',
};

const permissionsPayload = (userId: string) => ({
  user: {
    id: userId,
    email: `${userId}@zu.edu.ly`,
    role: 'ADMIN',
    firstName: 'أمينة',
    lastName: 'المشرفة',
    scopeFacultyId: null,
    scopeFaculty: null,
  },
  roleDefaults: ['USERS_MANAGE'],
  effective: ['USERS_MANAGE'],
  overrides: [],
});

function renderPermissionsPage(userId: string) {
  FIXTURES[`/admin/users/${userId}/permissions`] = permissionsPayload(userId);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/admin/permissions/${userId}`]}>
        <Routes>
          <Route path="/admin/permissions/:id" element={<AdminPermissionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminPermissionsPage — self-edit guard (blocked-action explanation)', () => {
  it('opening MY OWN profile explains the 403 up front and disables the row actions', async () => {
    useAuthStore.setState({ user: ME });
    renderPermissionsPage('me1');
    expect(
      await screen.findByText('هذه صلاحياتك أنت — لا يمكن تعديلها من هنا'),
    ).toBeInTheDocument();
    expect(screen.getByText(/حرس الحاكمية يمنع تعديل صلاحياتك بنفسك/)).toBeInTheDocument();
    // Every grant/revoke affordance is disabled — no dead clicks
    // bouncing off the backend guard.
    const grantButtons = screen.getAllByRole('button', { name: 'منح' });
    expect(grantButtons.length).toBeGreaterThan(0);
    for (const b of grantButtons) expect(b).toBeDisabled();
    const revoke = screen.getByRole('button', { name: 'سحب' });
    expect(revoke).toBeDisabled();
  });

  it('another user\'s profile keeps the actions enabled (guard is surface-only honesty)', async () => {
    useAuthStore.setState({ user: ME });
    renderPermissionsPage('other1');
    expect(await screen.findByText('صلاحيات فعلية')).toBeInTheDocument();
    expect(screen.queryByText('هذه صلاحياتك أنت — لا يمكن تعديلها من هنا')).toBeNull();
    const grantButtons = screen.getAllByRole('button', { name: 'منح' });
    expect(grantButtons.length).toBeGreaterThan(0);
    for (const b of grantButtons) expect(b).toBeEnabled();
    expect(screen.getByRole('button', { name: 'سحب' })).toBeEnabled();
  });

  it('no session user → the guard stays silent (no false positive)', async () => {
    renderPermissionsPage('other1');
    expect(await screen.findByText('صلاحيات فعلية')).toBeInTheDocument();
    expect(screen.queryByText('هذه صلاحياتك أنت — لا يمكن تعديلها من هنا')).toBeNull();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'منح' })[0]).toBeEnabled();
    });
  });
});
