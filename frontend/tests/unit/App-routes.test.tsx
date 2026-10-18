/**
 * App route table — legacy /login alias (audit P1).
 *
 * /auth is the canonical login route; /login must redirect to it with
 * `replace` so old bookmarks and deep links keep working. This test renders
 * the real `AppRoutes` route table under a MemoryRouter so the actual route
 * definitions (not a copy) are what's under test.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../src/lib/queryClient';
import { AppRoutes } from '../../src/App';
import { useAuthStore, type AuthUser, type AppRole } from '../../src/stores/auth.store';
import { useToastStore } from '../../src/lib/toast';

// Stub the page behind the canonical route: this test is about the route
// table, not the auth page's internals.
vi.mock('../../src/pages/AuthPage', () => ({
  default: () => <div data-testid="auth-page" />,
}));

// Stub the colleges pages so the route-table test never needs the API.
vi.mock('../../src/pages/colleges/CollegePages', () => ({
  CollegesIndexPage: () => <div data-testid="colleges-page" />,
  CollegeDetailPage: () => <div data-testid="college-detail" />,
  CollegesLeaderboardPage: () => <div data-testid="colleges-leaderboard" />,
}));

// Stub the labs explorer: the r155c pin below cares that the route
// table lets the role THROUGH, not the explorer's internals (same
// convention as the AuthPage stub above).
vi.mock('../../src/pages/student/LabsPage', () => ({
  default: () => <div data-testid="labs-page" />,
}));

// The full AppShell (sidebar / topbar / notifications / network) is
// orthogonal to a route-table guard test. Keep the REAL exports —
// ProtectedRoute above all, it is the code under test — and replace
// only the layout with a pass-through Outlet.
vi.mock('../../src/components/layout/AppShell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/components/layout/AppShell')>();
  return { ...actual, AppShell: () => <Outlet /> };
});

// Guard bounces land on role dashboards — stub them so the pin never
// mounts the heavy real pages (charts, live queries) in a unit test.
// r157 (6A4-11): the student dashboard joined the stub set (the
// GuestRoute pin bounces a STUDENT there), and the teacher mock
// gained the NAMED export App.tsx's lazy wrapper reads
// (m.TeacherDashboardPage) — a default-only mock made the lazy
// component resolve to undefined the moment a test actually landed
// on /teacher/dashboard.
vi.mock('../../src/pages/student/DashboardPage', () => ({
  default: () => <div data-testid="student-dashboard" />,
}));
vi.mock('../../src/pages/teacher/TeacherDashboardPage', () => ({
  default: () => <div data-testid="teacher-dashboard" />,
  TeacherDashboardPage: () => <div data-testid="teacher-dashboard" />,
}));
vi.mock('../../src/pages/admin/AdminPages', () => ({
  AdminDashboardPage: () => <div data-testid="admin-dashboard" />,
  AdminFacultiesPage: () => <div data-testid="admin-faculties" />,
  AdminReportsPage: () => <div data-testid="admin-reports" />,
  AdminCoursesPage: () => <div data-testid="admin-courses" />,
}));

// Quality pages stub — the r157 (6A9 #1) guard pin below cares that the
// route table lets a QUALITY user THROUGH to /quality/dashboard, not the
// dashboard's internals (same convention as the AuthPage stub above).
// The named export matches App.tsx's lazy wrapper (m.QualityDashboardPage).
// r165d: QualityAlertsPage joined the stub set — the operational-board
// pin below renders /quality/alerts and must NOT receive the shared
// personal AlertsPage (that is the whole point of D2's split).
vi.mock('../../src/pages/quality/QualityPages', () => ({
  QualityDashboardPage: () => <div data-testid="quality-dashboard" />,
  QualityAlertsPage: () => <div data-testid="quality-alerts" />,
}));

// Owner pages stub — r165d (D2): the untouched-operational-board pin
// renders /owner/alerts for an OWNER user.
vi.mock('../../src/pages/owner/OwnerPages', () => ({
  OwnerAlertsPage: () => <div data-testid="owner-alerts" />,
}));

// r165d (D2): the shared personal notifications page stub — the mount
// pins care that the route table serves the AlertsPage component to
// QUALITY/OWNER inside their role shells (mirroring /student/alerts ·
// /teacher/alerts · /admin/alerts), not the page's internals. The
// lazy wrappers for the OTHER MorePages exports never resolve in this
// suite — the mock only needs what these tests actually mount.
vi.mock('../../src/pages/student/MorePages', () => ({
  AlertsPage: () => <div data-testid="alerts-page" />,
}));

function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="location" data-path={pathname} />;
}

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    // /auth now lives behind GuestRoute (r157, 6A4-11) — it reads
    // isHydrated like every guard; claim it so the guest view renders
    // instead of a HydrationSplash.
    useAuthStore.setState({ user: null, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('redirects the legacy /login alias to the canonical /auth route', async () => {
    renderAt('/login');
    await screen.findByTestId('auth-page');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/auth');
  });

  it('renders AuthPage directly at the canonical /auth route', async () => {
    renderAt('/auth');
    await screen.findByTestId('auth-page');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/auth');
  });
});

describe('AppRoutes — public colleges (r154a, audit 4-A14 P1-2)', () => {
  // 761eaf4 silently deleted CollegesLayout and pushed /colleges* under a
  // bare <ProtectedRoute/>, bouncing every guest to /auth and killing the
  // public funnel the backend still serves. r154a restored CollegesLayout.
  // These tests pin the guest path so the regression cannot recur silently.
  beforeEach(() => {
    useAuthStore.setState({ user: null, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('lets a guest reach /colleges instead of bouncing to /auth', async () => {
    renderAt('/colleges');
    await screen.findByTestId('colleges-page');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/colleges');
    expect(screen.queryByTestId('auth-page')).toBeNull();
  });

  it('lets a guest reach /colleges/leaderboard', async () => {
    renderAt('/colleges/leaderboard');
    await screen.findByTestId('colleges-leaderboard');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/colleges/leaderboard');
    expect(screen.queryByTestId('auth-page')).toBeNull();
  });

  it('renders the guest back-to-home link on the chrome-less colleges shell', async () => {
    renderAt('/colleges');
    await screen.findByTestId('colleges-page');
    expect(screen.getByText('العودة إلى الصفحة الرئيسية')).toBeTruthy();
  });
});

/* r157 (6A4-11) REGRESSION PIN — GuestRoute on the guest surfaces.
 *
 * /auth and /auth/register used to render the login/registration form
 * for ALREADY-AUTHED users (stale bookmark, browser back after
 * login) — and submitting the form re-logged them in. GuestRoute
 * follows the ProtectedRoute discipline: HydrationSplash first, then
 * a `replace` bounce to ROLE_HOME[role]. These pins hold the bounce
 * for both guest routes; a silent guard deletion would drop users
 * back onto the login form while signed in.
 */
describe('AppRoutes — GuestRoute bounces authed users off guest surfaces (r157, 6A4-11)', () => {
  const userWithRole = (role: AppRole): AuthUser => ({
    id: `guest-pin-${role.toLowerCase()}`,
    email: 'guest-pin@uoz.edu',
    firstName: 'زائر',
    lastName: 'الجولة',
    role,
  });

  beforeEach(() => {
    useAuthStore.setState({ user: null, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('bounces an authed STUDENT at /auth to /student/dashboard — no login form while signed in', async () => {
    useAuthStore.setState({ user: userWithRole('STUDENT') });
    renderAt('/auth');
    await screen.findByTestId('student-dashboard');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/student/dashboard');
    expect(screen.queryByTestId('auth-page')).toBeNull();
  });

  it('bounces an authed TEACHER at /auth/register to /teacher/dashboard', async () => {
    useAuthStore.setState({ user: userWithRole('TEACHER') });
    renderAt('/auth/register');
    await screen.findByTestId('teacher-dashboard');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/teacher/dashboard');
  });
});

/* r155c REGRESSION PIN — teacher labs preview access (‎/student/labs).
 *
 * TeacherLabsPage.tsx:215 «معاينة كطالب» links to /student/labs, and the
 * page's own doc comment (lines 12-15) documents a role-permissive
 * STUDENT+TEACHER mount. c085da7 introduced that widened guard; 761eaf4
 * (an unrelated aria-invalid/landing polish commit) deleted it, so the
 * CTA silently bounced every teacher to /teacher/dashboard while the
 * docs still claimed it worked. r155c restored the permissive mount —
 * these tests pin all three sides of the guard so the deletion cannot
 * recur silently: TEACHER lands, STUDENT keeps landing, and every
 * OTHER role still bounces to its own home (the widening is exactly
 * STUDENT+TEACHER, never a bare <ProtectedRoute/>).
 */
describe('AppRoutes — teacher labs preview access (/student/labs, r155c)', () => {
  const userWithRole = (role: AppRole): AuthUser => ({
    id: `labs-pin-${role.toLowerCase()}`,
    email: 'labs-pin@uoz.edu',
    firstName: 'تجربة',
    lastName: 'المسار',
    role,
  });

  beforeEach(() => {
    useAuthStore.setState({ user: null, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('lands a TEACHER on /student/labs — «معاينة كطالب» must not bounce to /teacher/dashboard', async () => {
    useAuthStore.setState({ user: userWithRole('TEACHER') });
    renderAt('/student/labs');
    await screen.findByTestId('labs-page');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/student/labs');
  });

  it('still lands a STUDENT on /student/labs (the route\'s native audience is unchanged)', async () => {
    useAuthStore.setState({ user: userWithRole('STUDENT') });
    renderAt('/student/labs');
    await screen.findByTestId('labs-page');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/student/labs');
  });

  it('still bounces other roles to their home (ADMIN → /admin/dashboard) — the widening is exactly STUDENT+TEACHER', async () => {
    useAuthStore.setState({ user: userWithRole('ADMIN') });
    renderAt('/student/labs');
    await screen.findByTestId('admin-dashboard');
    expect(screen.queryByTestId('labs-page')).toBeNull();
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/admin/dashboard');
  });
});

/* r157 (6A9 #1) REGRESSION PIN — /quality is QUALITY-only.
 *
 * The guard used to read allow={['QUALITY', 'ADMIN']}, but the backend
 * truth is stricter: all six /quality/* data routes require the
 * QUALITY_VIEW capability, ADMIN's default capability set does NOT
 * include it (lib/permissions.ts — «No QUALITY_VIEW — separate
 * role»), and ADMIN_NAV carries zero /quality links. The dual allow
 * shipped pages whose every query 403'd on arrival. Documented
 * exception: an ADMIN granted QUALITY_VIEW by the OWNER does get data
 * from the backend, but the FE guard represents the default-role
 * truth — the bounce. These pins hold both sides of that contract.
 */
describe('AppRoutes — /quality guard is QUALITY-only (r157, 6A9 #1)', () => {
  const userWithRole = (role: AppRole): AuthUser => ({
    id: `quality-pin-${role.toLowerCase()}`,
    email: 'quality-pin@uoz.edu',
    firstName: 'ضمان',
    lastName: 'الجودة',
    role,
  });

  beforeEach(() => {
    useAuthStore.setState({ user: null, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('bounces an ADMIN visiting /quality/dashboard to /admin/dashboard — no 403-wall pages', async () => {
    useAuthStore.setState({ user: userWithRole('ADMIN') });
    renderAt('/quality/dashboard');
    await screen.findByTestId('admin-dashboard');
    expect(screen.queryByTestId('quality-dashboard')).toBeNull();
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/admin/dashboard');
  });

  it('lands a QUALITY user on /quality/dashboard (the sector\'s native audience)', async () => {
    useAuthStore.setState({ user: userWithRole('QUALITY') });
    renderAt('/quality/dashboard');
    await screen.findByTestId('quality-dashboard');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/quality/dashboard');
  });
});

/* r165d (D2) REGRESSION PIN — personal notifications mounts for
 * QUALITY/OWNER.
 *
 * The bell renders the user's OWN Notification rows (GET
 * /notifications), but QUALITY/OWNER had no personal-notifications
 * page at all: the bell's row-click and «عرض جميع الإشعارات» routed
 * to /quality/alerts / /owner/alerts — the OPERATIONAL boards, a
 * different dataset where the clicked notification never appears.
 * These pins hold both sides of the contract: the new
 * /quality/notifications · /owner/notifications rows mount the SHARED
 * AlertsPage inside each role's shell (guard allow-list exact), and
 * the operational boards keep their own routes untouched. */
describe('AppRoutes — personal notifications mounts (r165d, D2)', () => {
  const userWithRole = (role: AppRole): AuthUser => ({
    id: `notif-pin-${role.toLowerCase()}`,
    email: 'notif-pin@uoz.edu',
    firstName: 'جرس',
    lastName: 'الإشعارات',
    role,
  });

  beforeEach(() => {
    useAuthStore.setState({ user: null, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('lands a QUALITY user on /quality/notifications — the shared personal AlertsPage', async () => {
    useAuthStore.setState({ user: userWithRole('QUALITY') });
    renderAt('/quality/notifications');
    await screen.findByTestId('alerts-page');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/quality/notifications');
  });

  it('lands an OWNER user on /owner/notifications — the shared personal AlertsPage', async () => {
    useAuthStore.setState({ user: userWithRole('OWNER') });
    renderAt('/owner/notifications');
    await screen.findByTestId('alerts-page');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/owner/notifications');
  });

  it('still bounces a STUDENT off /owner/notifications to /student/dashboard — the mount is OWNER-only', async () => {
    useAuthStore.setState({ user: userWithRole('STUDENT') });
    renderAt('/owner/notifications');
    await screen.findByTestId('student-dashboard');
    expect(screen.queryByTestId('alerts-page')).toBeNull();
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/student/dashboard');
  });

  it('still bounces a TEACHER off /quality/notifications to /teacher/dashboard — the mount is QUALITY-only', async () => {
    useAuthStore.setState({ user: userWithRole('TEACHER') });
    renderAt('/quality/notifications');
    await screen.findByTestId('teacher-dashboard');
    expect(screen.queryByTestId('alerts-page')).toBeNull();
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/teacher/dashboard');
  });

  it('the operational /quality/alerts board keeps its OWN route (untouched by D2)', async () => {
    useAuthStore.setState({ user: userWithRole('QUALITY') });
    renderAt('/quality/alerts');
    await screen.findByTestId('quality-alerts');
    expect(screen.queryByTestId('alerts-page')).toBeNull();
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/quality/alerts');
  });

  it('the operational /owner/alerts board keeps its OWN route (untouched by D2)', async () => {
    useAuthStore.setState({ user: userWithRole('OWNER') });
    renderAt('/owner/alerts');
    await screen.findByTestId('owner-alerts');
    expect(screen.queryByTestId('alerts-page')).toBeNull();
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/owner/alerts');
  });
});

/* ── r183-B6 (A4 P2-1): the cross-role deny explains itself ──────────
 *
 * The deny path of ProtectedRoute used to be a bare <Navigate replace>
 * — a student deep-linking /admin/dashboard was silently swapped onto
 * their own dashboard with zero feedback. The pin: the bounce STILL
 * lands on the role home with `replace` (back returns to the page
 * BEFORE the denied one), and exactly ONE info toast names the cause.
 * The toast store is asserted directly (the ToastStack lives at the
 * App root, above this suite's cut). */
describe('AppRoutes — cross-role deny fires one explanatory toast (r183-B6, A4 P2-1)', () => {
  const student: AuthUser = {
    id: 'deny-pin-student',
    email: 'deny-student@uoz.edu',
    firstName: 'طالب',
    lastName: 'الحراسة',
    role: 'STUDENT',
  };

  beforeEach(() => {
    useToastStore.setState({ items: [] });
    useAuthStore.setState({ user: student, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
    useToastStore.setState({ items: [] });
  });

  it('a STUDENT hitting /admin/dashboard lands on their home with ONE toast — not a silent swap', async () => {
    renderAt('/admin/dashboard');
    // The role-home landing (the pre-existing `replace` contract).
    await screen.findByTestId('student-dashboard');
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/student/dashboard');
    // Exactly one toast, naming the cause and the destination.
    const items = useToastStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.message).toBe('هذه الصفحة غير متاحة لدور حسابك — أُعيدك إلى لوحتك');
    expect(items[0]?.variant).toBe('info');
  });

  it('a second, DIFFERENT deny later in the session still explains itself', async () => {
    const { unmount } = renderAt('/admin/dashboard');
    await screen.findByTestId('student-dashboard');
    unmount();
    useToastStore.setState({ items: [] });
    renderAt('/owner/dashboard');
    await screen.findByTestId('student-dashboard');
    expect(useToastStore.getState().items).toHaveLength(1);
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/student/dashboard');
  });
});
