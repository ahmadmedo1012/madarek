/**
 * r305-A8 — owner operations pages ride the «Heron» scoped sheet
 * (frontend/src/styles/r305-admin-owner.css).
 *
 * The sheet's SCOPING CONTRACT: every rule lives under the `.r305ao`
 * page-root marker (portals under `body:has(.r305ao)`), so a page the
 * marker never reaches renders with NO Heron grammar at all. These
 * pins guard the wiring for the owner-ops family (agent 2-d's nine
 * pages — this file covers the five the mission names + the free
 * Content surface):
 *
 *   1. MARKER: the page ROOT carries `r305ao` in every state the
 *      harness can realistically render — pending (held payload),
 *      error (failing endpoint), and settled. The sheet's restyled
 *      families (stat strips, tables, alert cards, live band, error
 *      entries, timeline skeletons) only apply under the marker, so a
 *      lost marker = a lost grammar, silently.
 *   2. DANGER HIERARCHY (the user/role/permission mandate): the
 *      directory's status verb renders `.r305ao-btn-danger` in the
 *      DESTRUCTIVE direction only — suspending an active account is
 *      the high-impact flow; reactivating a suspended one stays a
 *      quiet outline verb. The ConfirmDialog verb logic is NOT
 *      re-pinned here (OwnerUsersPage-confirm-verbs owns it byte for
 *      byte); this file only pins the visual separation.
 *   3. TRUTHFULNESS survives the reskin: the AI provider badge still
 *      names the REAL model when one answers, says «محليّ» when the
 *      local composer does, and renders NO badge on a failed probe
 *      (the r164-i honest-surface contract, re-asserted on top of the
 *      new marker — reusing r164-i's fixture shapes).
 *
 * Harness: the r164-i / r165g pattern — lib/api mocked at the module
 * boundary (BODIES = full axios bodies; unwrap'd hooks read
 * res.data.data, the alerts feed reads res.data), FAILING set for
 * forced failures, a real QueryClient (retry: false), MemoryRouter,
 * react-chartjs-2 stubbed (jsdom has no canvas).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { OwnerUsersPage } from '../../src/pages/owner/OwnerUsersPage';
import { OwnerSystemPage } from '../../src/pages/owner/OwnerSystemPage';
import { OwnerAiPage } from '../../src/pages/owner/OwnerAiPage';
import { OwnerAlertsPage } from '../../src/pages/owner/OwnerAlertsPage';
import { OwnerRealtimePage } from '../../src/pages/owner/OwnerRealtimePage';
import { OwnerContentPage } from '../../src/pages/owner/OwnerContentPage';

const { BODIES, FAILING } = vi.hoisted(() => ({
  // url → the RESPONSE BODY (what axios puts in res.data).
  BODIES: {} as Record<string, unknown>,
  FAILING: new Set<string>(),
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
      const body = BODIES[url];
      if (body === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      // A PROMISE body stays pending (the held-payload branch): flatten
      // through .then so the query neither resolves nor rejects until
      // the payload does — wrapping it in Promise.resolve would read
      // `.data` off the thenable and hand the query `undefined`.
      return Promise.resolve().then(() => body).then((b) => ({ data: b }));
    },
    post: (url: string) => {
      if (FAILING.has(url)) return Promise.reject(new Error(`forced failure for ${url}`));
      const body = BODIES[url];
      if (body === undefined) return Promise.reject(new Error(`unexpected POST ${url}`));
      return Promise.resolve().then(() => body).then((b) => ({ data: b }));
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

/* ── Shared fixtures (r164-i / r165g shapes) ─────────────────── */

const SYSTEM_BASE = {
  sync: { lastRunAt: null, recent: [] },
  alerts: { open: [], openCount: 0, criticalCount: 0 },
  activity: { recentEventsLast7Days: 0 },
  storage: { driver: 's3', persistent: true, reachable: true, checkedAt: '2026-01-01T00:00:00.000Z' },
};

const FLAGS_TWO = [
  {
    id: 'f1', slug: 'live-broadcast', name: 'البثّ المباشر',
    description: 'تمكين البثّ المباشر للمحاضرات', enabled: true,
    category: 'features', updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: null,
  },
  {
    id: 'f2', slug: 'practice-labs', name: 'المعامل الافتراضيّة',
    description: null, enabled: false,
    category: 'features', updatedAt: '2026-01-02T00:00:00.000Z', updatedBy: null,
  },
];

const SETTINGS_ONE = [
  {
    id: 's1', key: 'semester.label', value: 'الفصل الخريفيّ 2026',
    category: 'general', updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: null,
  },
];

const AI_METRICS_EMPTY = {
  totalRequests: 0, totalTokens: 0, successRate: 0, avgLatencyMs: 0,
  byFeature: [], trend: [],
};

const ALERTS_TWO_ROWS = [
  {
    id: 'a1', severity: 'critical', category: 'db',
    title: 'فشل الاتصال بقاعدة البيانات', message: 'connection timeout',
    metadata: null, resolvedAt: null, resolvedBy: null,
    createdAt: '2026-09-26T08:00:00.000Z',
  },
  {
    id: 'a2', severity: 'warning', category: 'http',
    title: 'بطء في الاستجابة', message: 'p95 above threshold',
    metadata: null, resolvedAt: null, resolvedBy: null,
    createdAt: '2026-09-26T09:00:00.000Z',
  },
];

const REALTIME = {
  activeSessions: 1240,
  aiRequestsPerMin: 18,
  liveBroadcasts: 3,
  activeExams: 42,
};

/** The directory roster: one ACTIVE row (the destructive direction)
 *  and one SUSPENDED row (the restorative direction). */
const USERS_ROWS = [
  {
    id: 'u1', email: 'amina@zu.edu.ly', firstName: 'أمينة', lastName: 'المشرفة',
    role: 'ADMIN', avatarColor: null, avatarInitials: null,
    isActive: true, createdAt: '2026-01-05T00:00:00.000Z', memberships: [],
  },
  {
    id: 'u2', email: 'salem@zu.edu.ly', firstName: 'سالم', lastName: 'الفيتوري',
    role: 'TEACHER', avatarColor: null, avatarInitials: null,
    isActive: false, createdAt: '2026-01-06T00:00:00.000Z', memberships: [],
  },
];

function resetFixtures() {
  for (const k of Object.keys(BODIES)) delete BODIES[k];
  FAILING.clear();
  BODIES['/owner/system'] = { data: { ...SYSTEM_BASE } };
  BODIES['/owner/feature-flags'] = { data: FLAGS_TWO.map((f) => ({ ...f })) };
  BODIES['/owner/settings'] = { data: SETTINGS_ONE.map((s) => ({ ...s })) };
  BODIES['/owner/ai-metrics'] = { data: { ...AI_METRICS_EMPTY } };
  BODIES['/ai/config'] = { data: { provider: 'local', model: null } };
  // The alerts PAGE reads res.data (the whole feed body incl. meta).
  BODIES['/owner/alerts'] = { data: ALERTS_TWO_ROWS.map((a) => ({ ...a })), meta: { total: 2, critical: 1, warning: 1 } };
  BODIES['/owner/realtime'] = { data: { ...REALTIME } };
  BODIES['/owner/stats'] = {
    data: {
      totalUsers: 2, students: 0, teachers: 1, admins: 1, quality: 0, owners: 0,
      totalCourses: 0, totalOfferings: 0, totalEnrollments: 0, recentAuditLogs: 0,
    },
  };
  // The users directory reads res.data directly (paginated envelope).
  BODIES['/owner/users'] = {
    data: USERS_ROWS.map((u) => ({ ...u })),
    meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
  };
}

function renderPage(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The page ROOT is the harness container's first element — the marker
 *  must sit ON it (the sheet keys every rule off it). */
function rootHasMarker(container: HTMLElement): boolean {
  const root = container.firstElementChild;
  return root != null && root.classList.contains('r305ao');
}

beforeEach(() => {
  resetFixtures();
});

afterEach(() => {
  cleanup();
});

/* ════════════════════════════════════════════════════════════════
   1. Marker on the page root — every realistically renderable state
   ════════════════════════════════════════════════════════════════ */

describe('r305-A8 — the .r305ao marker rides the owner-ops page roots', () => {
  it('OwnerUsersPage: settled, pending and error states all keep the root marker', async () => {
    const { container } = renderPage(<OwnerUsersPage />);
    await screen.findByText('أمينة المشرفة'); // settled
    expect(rootHasMarker(container)).toBe(true);

    cleanup();
    // Pending: the directory query never settles → the skeleton branch.
    BODIES['/owner/users'] = new Promise(() => {});
    const pending = renderPage(<OwnerUsersPage />);
    await screen.findByText('إدارة المستخدمين'); // the h1 (PageFrame header) is up
    expect(rootHasMarker(pending.container)).toBe(true);

    cleanup();
    // Error: the honest ErrorState branch — never a fake empty state.
    FAILING.add('/owner/users');
    const failed = renderPage(<OwnerUsersPage />);
    await screen.findByText('تعذَّر تحميل هذا القسم');
    expect(rootHasMarker(failed.container)).toBe(true);
  });

  it('OwnerSystemPage: settled, pending and error states all keep the root marker', async () => {
    const { container } = renderPage(<OwnerSystemPage />);
    await screen.findByText('البثّ المباشر'); // settled flags
    expect(rootHasMarker(container)).toBe(true);

    cleanup();
    BODIES['/owner/system'] = new Promise(() => {});
    const pending = renderPage(<OwnerSystemPage />);
    await screen.findByText('النظام والتشغيل');
    expect(rootHasMarker(pending.container)).toBe(true);

    cleanup();
    FAILING.add('/owner/system');
    const failed = renderPage(<OwnerSystemPage />);
    await screen.findByText('البثّ المباشر'); // flags card still resolves
    // The failing /owner/system feed degrades INSIDE its cards — the
    // root marker covers the honest error entries.
    expect(rootHasMarker(failed.container)).toBe(true);
    expect(screen.getAllByText(/تعذّر/).length).toBeGreaterThan(0);
  });

  it('OwnerAiPage: settled and error states keep the root marker', async () => {
    const { container } = renderPage(<OwnerAiPage />);
    await screen.findByRole('heading', { level: 1, name: 'مركز الذكاء الاصطناعيّ' });
    expect(rootHasMarker(container)).toBe(true);

    cleanup();
    FAILING.add('/owner/ai-metrics');
    const failed = renderPage(<OwnerAiPage />);
    await screen.findByText('تعذَّر تحميل هذا القسم');
    expect(rootHasMarker(failed.container)).toBe(true);
  });

  it('OwnerAlertsPage: settled and error states keep the root marker', async () => {
    const { container } = renderPage(<OwnerAlertsPage />);
    await screen.findByText('فشل الاتصال بقاعدة البيانات'); // severity card settled
    expect(rootHasMarker(container)).toBe(true);

    cleanup();
    FAILING.add('/owner/alerts');
    const failed = renderPage(<OwnerAlertsPage />);
    await screen.findByText('تعذَّر تحميل هذا القسم');
    expect(rootHasMarker(failed.container)).toBe(true);
  });

  it('OwnerRealtimePage: settled, pending and initial-load-error states keep the root marker', async () => {
    const { container } = renderPage(<OwnerRealtimePage />);
    await screen.findByRole('heading', { level: 1, name: 'المراقبة الحيّة' }); // live band root up
    expect(rootHasMarker(container)).toBe(true);
    await screen.findByText('الجلسات النشطة'); // live band settled

    cleanup();
    // Pending: the strip-skeleton branch (the shape-matched mirror).
    BODIES['/owner/realtime'] = new Promise(() => {});
    const pending = renderPage(<OwnerRealtimePage />);
    await screen.findByRole('heading', { level: 1, name: 'المراقبة الحيّة' });
    expect(rootHasMarker(pending.container)).toBe(true);
    expect(document.querySelector('.stat-strip[aria-busy="true"]')).not.toBeNull();

    cleanup();
    // Initial-load failure (no data ever landed): the full-clear branch.
    FAILING.add('/owner/realtime');
    const failed = renderPage(<OwnerRealtimePage />);
    await screen.findByText('تعذَّر تحميل هذا القسم');
    expect(rootHasMarker(failed.container)).toBe(true);
  });

  it('OwnerContentPage: the static surface keeps the root marker', () => {
    const { container } = renderPage(<OwnerContentPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'المحتوى والعلامة التجاريّة' })).toBeInTheDocument();
    expect(rootHasMarker(container)).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════════
   2. Danger hierarchy on the users directory (the audit mandate)
   ════════════════════════════════════════════════════════════════ */

describe('r305-A8 — the users directory separates high-impact verbs (visual only)', () => {
  /** r252: the row's actions live behind the inline expansion. */
  async function expandRow(name: string) {
    fireEvent.click(await screen.findByRole('button', { name: `إجراءات ${name}` }));
  }

  it('the SUSPENSION verb (active account → disable) renders .r305ao-btn-danger', async () => {
    const { container } = renderPage(<OwnerUsersPage />);
    await screen.findByText('أمينة المشرفة');
    expect(rootHasMarker(container)).toBe(true);
    await expandRow('أمينة المشرفة');
    const disable = screen.getByRole('button', { name: 'تعطيل' });
    expect(disable).toBeInTheDocument();
    expect(disable.className).toContain('r305ao-btn-danger');
  });

  it('the REACTIVATION verb (suspended account → enable) stays a quiet outline verb', async () => {
    renderPage(<OwnerUsersPage />);
    await screen.findByText('سالم الفيتوري');
    await expandRow('سالم الفيتوري');
    const enable = screen.getByRole('button', { name: 'تفعيل' });
    expect(enable).toBeInTheDocument();
    // Direction matters: restoring access is NOT the destructive flow —
    // no danger fill, no drama.
    expect(enable.className).not.toContain('r305ao-btn-danger');
  });
});

/* ════════════════════════════════════════════════════════════════
   3. Truthfulness survives the reskin — AI provider state (r164-i)
   ════════════════════════════════════════════════════════════════ */

describe('r305-A8 — OwnerAiPage still renders the REAL provider state', () => {
  it('a real external LLM names its model string — never a generic label', async () => {
    BODIES['/ai/config'] = { data: { provider: 'openai', model: 'llama-3.1-8b-instruct' } };
    renderPage(<OwnerAiPage />);
    expect(await screen.findByText('llama-3.1-8b-instruct')).toBeInTheDocument();
    expect(screen.queryByText('محليّ')).toBeNull();
  });

  it('the local composer says «محليّ» — never an LLM name', async () => {
    renderPage(<OwnerAiPage />); // default fixture: provider 'local', model null
    expect(await screen.findByText('محليّ')).toBeInTheDocument();
    expect(screen.queryByText(/llama/i)).toBeNull();
  });

  it('a failed config probe renders NO badge (fail-soft) while the metrics still render', async () => {
    FAILING.add('/ai/config');
    renderPage(<OwnerAiPage />);
    expect(await screen.findByText('إجمالي الطلبات')).toBeInTheDocument();
    expect(screen.queryByText('محليّ')).toBeNull();
    expect(screen.queryByText(/llama/i)).toBeNull();
  });
});
