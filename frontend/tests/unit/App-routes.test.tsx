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
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../src/lib/queryClient';
import { AppRoutes } from '../../src/App';
import { useAuthStore } from '../../src/stores/auth.store';

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
