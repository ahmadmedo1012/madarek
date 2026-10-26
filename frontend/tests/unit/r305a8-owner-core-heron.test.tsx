/**
 * R305-A8 (task 2-c) — the owner console CORE's Heron scoping pins.
 *
 * The Task 1 stylesheet contract (r305-admin-owner.css) styles EVERY
 * rule under the `.r305ao` page-root marker, so a page that forgets
 * the marker renders unstyled — and a page that carries it on only
 * SOME of its return branches flashes an unstyled state on every
 * load/error. These pins hold the three core pages to the contract:
 *
 *   1. MARKER PRESENCE — Dashboard (loading mirror / resolved page /
 *      error state), Institutions (resolved / pending / error), and
 *      InstitutionDetail (pending / error / not-found / resolved) all
 *      mount exactly ONE `.r305ao` root, whatever branch renders.
 *   2. DANGER HIERARCHY — the destructive verbs of the institutions
 *      console (suspend institution, revoke a live admin's membership)
 *      ride `.r305ao-btn-danger` while routine verbs (open, provision
 *      admin) and restoring verbs (reactivate, restore membership)
 *      stay quiet ghost actions. NOTE: OwnerInstitutionDetailPage
 *      hosts NO destructive operations — its every write is a
 *      constructive create (faculty/department/course/offering) — so
 *      `.r305ao-danger-zone` legitimately does not exist there; the
 *      tripwire below FAILS if one ever appears so the zone/vocabulary
 *      gets adopted consciously (the destructive verbs live on the
 *      roster page above, guarded by their ConfirmDialogs).
 *   3. IMPORT WIRING — the barrel loads r305-admin-owner.css directly
 *      after owner.css, and the two direct-importing modules load it
 *      directly after admin.css (source order inside @layer pages is
 *      what lets the Heron sheet win the equal-specificity ties).
 *
 * Harness: the same mock boundaries the neighboring owner tests
 * established — lib/api fixtures + a react-chartjs-2 stub for the
 * Dashboard (jsdom has no canvas), the useInstitutions + useResources
 * hook mocks for the two institution pages.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { OwnerDashboardPage } from '../../src/pages/owner/OwnerDashboardPage';
import { OwnerInstitutionsPage } from '../../src/pages/owner/OwnerInstitutionsPage';
import { OwnerInstitutionDetailPage } from '../../src/pages/owner/OwnerInstitutionDetailPage';

/* ── Dashboard boundary: lib/api fixtures (action-strip precedent) ── */

const { FIXTURES, FAILING, PAGINATED } = vi.hoisted(() => ({
  FIXTURES: {} as Record<string, unknown>,
  FAILING: new Set<string>(),
  // /owner/activity is consumed via `res.data` (paginated shape);
  // the rest of the owner hooks unwrap `res.data.data`.
  PAGINATED: new Set<string>(['/owner/activity']),
}));

vi.mock('react-chartjs-2', () => ({
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

/* ── Institutions boundary: the hook mocks (r178/r181 precedent) ──── */

const ZAWIA = {
  id: 'inst-zawia-showcase',
  name: 'جامعة الزاوية',
  nameEn: 'University of Zawia',
  slug: 'zawia-showcase',
  status: 'ACTIVE',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  activeMembershipCount: 4,
  facultyCount: 25,
  admins: [
    {
      userId: 'u-admin-000000000000',
      email: 'admin@zu.edu.ly',
      firstName: 'إداري',
      lastName: 'تجريبي',
      membershipId: 'mem-admin-zawia',
      isActive: true,
    },
  ],
};

const ALANDALUS = {
  id: 'inst-alandalus-demo',
  name: 'مؤسسة الأندلس التعليمية',
  nameEn: 'Al-Andalus Education Institute',
  slug: 'alandalus-demo',
  status: 'SUSPENDED',
  createdAt: '2026-10-02T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  activeMembershipCount: 2,
  facultyCount: 1,
  admins: [
    {
      userId: 'u-admin2-0000000000',
      email: 'admin2@demo.madarek.ly',
      firstName: 'مسجل',
      lastName: 'عام',
      membershipId: 'mem-admin-alandalus',
      isActive: false,
    },
  ],
};

const instMocks = vi.hoisted(() => ({
  listing: {
    data: null as Array<unknown> | null,
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  create: { mutateAsync: vi.fn(), isPending: false, isError: false, error: null, reset: vi.fn() },
  update: { mutate: vi.fn(), isPending: false },
  provision: { mutateAsync: vi.fn(), isPending: false, isError: false, error: null, reset: vi.fn() },
  revoke: { mutate: vi.fn(), isPending: false },
  restore: { mutate: vi.fn(), isPending: false },
}));

vi.mock('../../src/hooks/useInstitutions', () => ({
  useOwnerInstitutions: () => instMocks.listing,
  useCreateInstitution: () => instMocks.create,
  useUpdateInstitution: () => instMocks.update,
  useProvisionInstitutionAdmin: () => instMocks.provision,
  useRevokeInstitutionMembership: () => instMocks.revoke,
  useRestoreInstitutionMembership: () => instMocks.restore,
}));

/* ── Detail boundary: the useResources hook mocks ─────────────────── */

const detailMocks = vi.hoisted(() => ({
  faculties: { data: null as Array<unknown> | null, isPending: false, isError: false, error: null, refetch: vi.fn() },
  courses: {
    data: null as { data: Array<unknown>; meta: { page: number; limit: number; total: number; totalPages: number } } | null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  teachers: { data: null as Array<unknown> | null, isPending: false, isError: false, error: null, refetch: vi.fn() },
  createFaculty: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  createDepartment: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  createCourse: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  createOffering: { mutate: vi.fn(), isPending: false, isError: false, error: null },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useAdminFaculties: () => detailMocks.faculties,
  useAdminCourses: () => detailMocks.courses,
  useCreateFaculty: () => detailMocks.createFaculty,
  useCreateDepartment: () => detailMocks.createDepartment,
  useCreateCourse: () => detailMocks.createCourse,
  useCreateOffering: () => detailMocks.createOffering,
  useOwnerInstitutionTeachers: () => detailMocks.teachers,
  apiErrorMessage: () => 'حاول مرة أخرى بعد لحظات.',
}));

/* ── Harness ──────────────────────────────────────────────────────── */

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

function renderInstitutions() {
  return render(
    <MemoryRouter>
      <OwnerInstitutionsPage />
    </MemoryRouter>,
  );
}

function renderDetailAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/owner/institutions/${slug}`]}>
      <Routes>
        <Route path="/owner/institutions/:slug" element={<OwnerInstitutionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The scoping pin: exactly ONE marker root, whatever branch rendered. */
function expectOneMarkerRoot() {
  const roots = document.querySelectorAll('.r305ao');
  expect(roots.length).toBe(1);
  return roots[0]!;
}

function resetMocks() {
  FIXTURES['/owner/stats'] = { ...STATS };
  FIXTURES['/owner/realtime'] = { ...REALTIME };
  FIXTURES['/owner/alerts'] = [];
  FIXTURES['/owner/activity'] = ACTIVITY;
  FIXTURES['/owner/education'] = NO_IDLE_EDUCATION;
  FAILING.clear();
  instMocks.listing.data = null;
  instMocks.listing.isPending = false;
  instMocks.listing.isError = false;
  instMocks.listing.error = null;
  detailMocks.faculties.data = null;
  detailMocks.faculties.isPending = false;
  detailMocks.faculties.isError = false;
  detailMocks.courses.data = null;
  detailMocks.courses.isPending = false;
  detailMocks.courses.isError = false;
  detailMocks.teachers.data = null;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetMocks();
});

/* ══════════════════════════════════════════════════════════════════
   1. Marker presence — every branch, every core page
   ══════════════════════════════════════════════════════════════════ */

describe('OwnerDashboardPage — the .r305ao marker (R305-A8)', () => {
  it('the loading mirror carries the marker (the first render IS pending)', () => {
    renderDashboard();
    // Synchronous first render: every useOwner query is still pending —
    // the shape-matched loading mirror branch, marker and all.
    const root = expectOneMarkerRoot();
    expect(root.querySelector('.owner-live-status.is-pending')).not.toBeNull();
  });

  it('the resolved page mounts ONE marker root around the patterns frame + h1', async () => {
    renderDashboard();
    expect(await screen.findByText('إجمالي المستخدمين')).toBeInTheDocument();

    const root = expectOneMarkerRoot();
    // The canonical patterns PageFrame rides INSIDE the marker (the
    // read-only primitive renders no className of its own).
    expect(root.querySelector('.pf-page')).not.toBeNull();
    // One semantic h1 per route, inside the scoped surface.
    expect(
      within(root as HTMLElement).getByRole('heading', { level: 1, name: 'لوحة التحكم الرئيسية' }),
    ).toBeInTheDocument();
    expect(root.querySelector('.owner-live-status')).not.toBeNull();
  });

  it('the error branch carries the marker too (a failed query never unstyles the page)', async () => {
    FAILING.add('/owner/stats');
    renderDashboard();
    expect(await screen.findByText('تعذَّر تحميل هذا القسم')).toBeInTheDocument();
    const root = expectOneMarkerRoot();
    expect(root.querySelector('.state-error')).not.toBeNull();
  });
});

describe('OwnerInstitutionsPage — the .r305ao marker (R305-A8)', () => {
  it('the resolved roster carries the marker on its .page root', () => {
    instMocks.listing.data = [ZAWIA, ALANDALUS];
    renderInstitutions();

    const root = expectOneMarkerRoot();
    expect(root.className).toBe('page r305ao');
    expect(
      within(root as HTMLElement).getByRole('heading', { level: 1, name: 'المؤسسات' }),
    ).toBeInTheDocument();
  });

  it('the pending skeleton branch carries the marker', () => {
    instMocks.listing.isPending = true;
    renderInstitutions();

    const root = expectOneMarkerRoot();
    expect(root.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('row')).toBeNull();
  });

  it('the listing error branch carries the marker with its retry affordance', () => {
    instMocks.listing.isError = true;
    instMocks.listing.error = new Error('forced failure');
    renderInstitutions();

    const root = expectOneMarkerRoot();
    expect(root.querySelector('.state-error')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });
});

describe('OwnerInstitutionDetailPage — the .r305ao marker (R305-A8)', () => {
  const EMPTY_COURSES = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };

  it('the pending branch carries the marker', () => {
    instMocks.listing.isPending = true;
    renderDetailAt('zawia-showcase');

    const root = expectOneMarkerRoot();
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(
      within(root as HTMLElement).getByRole('heading', { level: 1, name: /جارٍ تحميل المؤسسة/ }),
    ).toBeInTheDocument();
  });

  it('the listing error branch carries the marker', () => {
    instMocks.listing.isError = true;
    instMocks.listing.error = new Error('forced failure');
    renderDetailAt('zawia-showcase');

    const root = expectOneMarkerRoot();
    expect(
      within(root as HTMLElement).getByRole('heading', { level: 1, name: 'المؤسسة' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });

  it('the honest not-found branch carries the marker', () => {
    instMocks.listing.data = [ZAWIA];
    renderDetailAt('no-such-institution');

    const root = expectOneMarkerRoot();
    expect(
      within(root as HTMLElement).getByRole('heading', { level: 1, name: 'المؤسسة غير موجودة' }),
    ).toBeInTheDocument();
  });

  it('the resolved setup page carries the marker and mounts NO destructive group (none exists)', () => {
    instMocks.listing.data = [ZAWIA];
    detailMocks.faculties.data = [];
    detailMocks.courses.data = EMPTY_COURSES;
    renderDetailAt('zawia-showcase');

    const root = expectOneMarkerRoot();
    expect(root.className).toBe('page r305ao');
    expect(
      within(root as HTMLElement).getByRole('heading', { level: 1, name: 'جامعة الزاوية' }),
    ).toBeInTheDocument();

    /* R305-A8 deviation tripwire — this page's writes are ALL
     * constructive creates (faculty/department/course/offering); the
     * destructive verbs of the institutions console (suspend, revoke
     * membership) live on the roster page and are pinned above. If a
     * destructive group ever lands HERE, it MUST adopt the Task 1
     * danger vocabulary (.r305ao-danger-zone + .r305ao-btn-danger) —
     * this pin fails until it does. */
    expect(document.querySelector('.r305ao-danger-zone')).toBeNull();
    expect(document.querySelector('.r305ao-btn-danger')).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   2. Danger hierarchy — destructive verbs stand apart (roster)
   ══════════════════════════════════════════════════════════════════ */

describe('OwnerInstitutionsPage — the destructive verbs ride .r305ao-btn-danger (R305-A8)', () => {
  it('suspend + live-membership revoke get the danger fill; routine and restoring verbs stay ghost', () => {
    instMocks.listing.data = [ZAWIA, ALANDALUS];
    renderInstitutions();

    // Destructive: suspending an ACTIVE institution…
    expect(screen.getByRole('button', { name: 'تعليق' })).toHaveClass('r305ao-btn-danger');
    // …and revoking a LIVE admin's membership.
    expect(screen.getByRole('button', { name: 'إلغاء العضوية' })).toHaveClass('r305ao-btn-danger');

    // Restoring verbs stay quiet (the danger tone claims irreversible
    // impact, not every state change).
    expect(screen.getByRole('button', { name: 'تنشيط' })).not.toHaveClass('r305ao-btn-danger');
    expect(screen.getByRole('button', { name: 'استعادة' })).not.toHaveClass('r305ao-btn-danger');

    // Routine verbs stay quiet.
    for (const provision of screen.getAllByRole('button', { name: 'تعيين مسجل عام' })) { // R320 override: «تعيين مدير» → «تعيين مسجل عام» (§B rename)
      expect(provision).not.toHaveClass('r305ao-btn-danger');
    }
    for (const open of screen.getAllByRole('link', { name: /فتح المؤسسة/ })) {
      expect(open).not.toHaveClass('r305ao-btn-danger');
    }
  });

  it('the danger classes never change the guarded flow (the confirm dialog still names the institution)', () => {
    instMocks.listing.data = [ZAWIA];
    renderInstitutions();

    fireEvent.click(screen.getByRole('button', { name: 'تعليق' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/هل تريد تعليق «جامعة الزاوية»/)).toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════════════
   3. Import wiring — the scoped sheet loads AFTER its family sheet
   ══════════════════════════════════════════════════════════════════ */

describe('R305-A8 — r305-admin-owner.css import wiring (source order = cascade order)', () => {
  const read = (name: string) =>
    readFileSync(resolvePath(__dirname, '../../src/pages/owner', name), 'utf8');

  it('the owner barrel loads it directly after owner.css (the whole /owner lazy chunk)', () => {
    expect(read('OwnerPages.tsx')).toMatch(
      /import '\.\.\/\.\.\/styles\/owner\.css';\nimport '\.\.\/\.\.\/styles\/r305-admin-owner\.css';/,
    );
  });

  it('OwnerInstitutionsPage loads it directly after admin.css', () => {
    expect(read('OwnerInstitutionsPage.tsx')).toMatch(
      /import '\.\.\/\.\.\/styles\/admin\.css';[^\n]*\nimport '\.\.\/\.\.\/styles\/r305-admin-owner\.css';/,
    );
  });

  it('OwnerInstitutionDetailPage loads it directly after admin.css', () => {
    expect(read('OwnerInstitutionDetailPage.tsx')).toMatch(
      /import '\.\.\/\.\.\/styles\/admin\.css';\nimport '\.\.\/\.\.\/styles\/r305-admin-owner\.css';/,
    );
  });
});
