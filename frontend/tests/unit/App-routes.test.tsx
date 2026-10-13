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
vi.mock('../../src/pages/teacher/TeacherDashboardPage', () => ({
  default: () => <div data-testid="teacher-dashboard" />,
}));
vi.mock('../../src/pages/admin/AdminPages', () => ({
  AdminDashboardPage: () => <div data-testid="admin-dashboard" />,
  AdminFacultiesPage: () => <div data-testid="admin-faculties" />,
  AdminReportsPage: () => <div data-testid="admin-reports" />,
  AdminCoursesPage: () => <div data-testid="admin-courses" />,
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
