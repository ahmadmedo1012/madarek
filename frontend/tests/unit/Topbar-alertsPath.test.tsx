/**
 * r165d (D2) — Topbar alertsPath decision (the bell's destination).
 *
 * For QUALITY/OWNER the bell's row-click and «عرض جميع الإشعارات» used
 * to route at the OPERATIONAL boards (/quality/alerts · /owner/alerts)
 * — a DIFFERENT dataset than the personal Notification rows the bell
 * actually shows (GET /notifications); the clicked notification was
 * never on the page it landed on, and the 6-row dropdown was the only
 * full inbox those roles had. The map now points both roles at their
 * personal inboxes (/quality/notifications · /owner/notifications —
 * the shared AlertsPage mounted in App.tsx). The other three roles
 * keep their existing paths (regression side of the pin).
 *
 * The NotificationDropdown is stubbed as a path-capturing probe (the
 * Sidebar-Topbar suite's convention): Topbar OWNS the decision, the
 * dropdown OWNS the panel — the pin reads the handoff between them.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/components/layout/GlobalSearch', () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));

/* Path-capturing probe: Topbar hands the bell ONE string — the decision
 * under test. (The dropdown's own deep-link behavior is pinned by
 * NotificationDropdown-deeplink.test.tsx against the REAL component.) */
vi.mock('../../src/components/layout/NotificationDropdown', () => ({
  NotificationDropdown: ({ alertsPath }: { alertsPath: string }) => (
    <div data-testid="notif-dropdown" data-path={alertsPath} />
  ),
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => ({ data: undefined }),
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../src/hooks/useResources', () => ({
  useMyProfile: () => ({ data: undefined }),
}));

import { Topbar } from '../../src/components/layout/Topbar';
import { useAuthStore, type AuthUser, type AppRole } from '../../src/stores/auth.store';

const userWithRole = (role: AppRole): AuthUser => ({
  id: `topbar-pin-${role.toLowerCase()}`,
  email: 'topbar-pin@uoz.edu',
  firstName: 'جرس',
  lastName: 'الشريط',
  role,
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
});

describe('Topbar — alertsPath decision (r165d D2)', () => {
  it.each([
    ['STUDENT', '/student/alerts'],
    ['TEACHER', '/teacher/alerts'],
    ['ADMIN', '/admin/alerts'],
    // D2: the bell's personal inbox pages for the two supervisory roles.
    ['QUALITY', '/quality/notifications'],
    ['OWNER', '/owner/notifications'],
  ] as const)('%s hands the bell %s', (role, expected) => {
    useAuthStore.setState({ user: userWithRole(role) });
    render(
      <MemoryRouter>
        <Topbar title="أيّ صفحة" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('notif-dropdown')).toHaveAttribute('data-path', expected);
  });
});
