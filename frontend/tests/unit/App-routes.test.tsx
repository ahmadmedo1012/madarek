/**
 * App route table — legacy /login alias (audit P1).
 *
 * /auth is the canonical login route; /login must redirect to it with
 * `replace` so old bookmarks and deep links keep working. This test renders
 * the real `AppRoutes` route table under a MemoryRouter so the actual route
 * definitions (not a copy) are what's under test.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../src/lib/queryClient';
import { AppRoutes } from '../../src/App';

// Stub the page behind the canonical route: this test is about the route
// table, not the auth page's internals.
vi.mock('../../src/pages/AuthPage', () => ({
  default: () => <div data-testid="auth-page" />,
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
