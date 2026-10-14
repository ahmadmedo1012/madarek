/**
 * r165d (D1 + D3) — NotificationDropdown deep-link routing + mark-all
 * error honesty.
 *
 * D1: the backend's Notification.link (schema.prisma; me.routes.ts writes
 * '/teacher/messages' for teacher DM recipients) had NO frontend
 * consumer — the row click ALWAYS navigated to the alertsPath prop, so
 * a DM notification could never reach the inbox. The row now routes
 * through notifDeepLink(): the link wins when it is a validated in-app
 * path (starts with '/', not '//'), else the role's alerts page. Pins:
 *   1. a valid link wins over alertsPath (and the unread row still
 *      fires its mark-read mutation on the way)
 *   2. a row without a link falls back to alertsPath
 *   3. external / protocol-relative / script URLs are IGNORED — the
 *      CSP posture keeps anchor targets in-app (fallback applies)
 *   4. the footer «عرض جميع الإشعارات» still carries the alertsPath
 *      (for QUALITY/OWNER that is the new personal page — D2)
 *
 * D3: mark-all failures used to be silent (the hook only invalidated on
 * SUCCESS; the button just re-enabled). The footer now mirrors the
 * teacher-messages idiom (form-feedback fail + «إعادة المحاولة»): pins
 *   5. isError renders the role=alert banner with the retry affordance
 *   6. the retry re-fires the SAME bulk mutation
 *   7. no error → no banner
 *
 * Mocks at the useResources boundary (NotificationDropdown-tone-a11y
 * pattern: hoisted mutable state so tests can flip list/error shapes).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

type Row = {
  id: string;
  type: 'URGENT' | 'ACADEMIC' | 'SYSTEM' | 'SOCIAL';
  title: string;
  body: string | null;
  link?: string | null;
  readAt: string | null;
  createdAt: string;
};

const state = vi.hoisted(() => ({
  unread: 2,
  list: [] as Row[],
  markRead: { mutate: vi.fn() },
  markAll: { mutate: vi.fn(), isPending: false, isError: false },
}));

/* Partial mock (...actual spread — the AlertsPage-mark-read pattern):
 * notifDeepLink stays the REAL implementation so the routing pins run
 * against the production validator, not a test-twin of it. */
vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useUnreadNotifications: () => ({ data: state.unread }),
    useNotifications: () => ({ data: state.list, isPending: false, isError: false }),
    useMarkNotifRead: () => state.markRead,
    useMarkAllNotifsRead: () => state.markAll,
  };
});

import { NotificationDropdown } from '../../src/components/layout/NotificationDropdown';

/** Mirrors the App-routes convention: the probe lives inside the Router
 *  but outside Routes, so it keeps rendering after every navigation. */
function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="location" data-path={pathname} />;
}

function renderBell(alertsPath: string) {
  return render(
    <MemoryRouter initialEntries={['/somewhere']}>
      <Routes>
        <Route path="*" element={<NotificationDropdown alertsPath={alertsPath} />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

const openPanel = () => {
  fireEvent.click(screen.getByRole('button', { name: /إشعار/ }));
  expect(screen.getByRole('dialog', { name: 'الإشعارات' })).toBeInTheDocument();
};

const row = (over: Partial<Row> = {}): Row => ({
  id: 'n1',
  type: 'SOCIAL',
  title: 'رسالة جديدة من أحمد',
  body: 'مرحبًا، هل راجعت التسليم؟',
  link: null,
  readAt: null,
  createdAt: new Date().toISOString(),
  ...over,
});

beforeEach(() => {
  state.unread = 2;
  state.list = [];
  state.markRead = { mutate: vi.fn() };
  state.markAll = { mutate: vi.fn(), isPending: false, isError: false };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NotificationDropdown — deep-link routing (r165d D1)', () => {
  it('a valid in-app link WINS over alertsPath, and the unread row still marks read', () => {
    state.list = [
      row({ id: 'dm1', link: '/teacher/messages' }),
      row({ id: 'n2', title: 'تم نشر درجة الواجب', type: 'ACADEMIC', readAt: new Date().toISOString() }),
    ];
    renderBell('/student/alerts');
    openPanel();

    const dmRow = screen.getByRole('button', { name: /رسالة جديدة من أحمد/ });
    // The row is a <button> with onClick navigation — keyboard-native
    // (Enter/Space activate buttons natively; no role/semantics change).
    fireEvent.click(dmRow);

    // Deep link wins: the DM lands in the inbox, not the alerts list.
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/teacher/messages');
    // The unread row STILL marks itself read on the way out (r155b
    // behavior preserved — navigation never ate the mutation).
    expect(state.markRead.mutate).toHaveBeenCalledTimes(1);
    expect(state.markRead.mutate).toHaveBeenCalledWith('dm1');
  });

  it('a row WITHOUT a link falls back to the alertsPath', () => {
    state.list = [row({ id: 'plain1', link: null })];
    renderBell('/quality/notifications');
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: /رسالة جديدة من أحمد/ }));
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/quality/notifications');
  });

  it.each([
    ['an absolute https URL', 'https://evil.example.com/inbox'],
    ['a protocol-relative URL', '//evil.example.com/inbox'],
    ['a script pseudo-URL', 'javascript:alert(1)'],
    ['an empty string', ''],
  ])('ignores %s and falls back to alertsPath (CSP posture)', (_label, link) => {
    state.list = [row({ id: 'odd1', link: link as string })];
    renderBell('/owner/notifications');
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: /رسالة جديدة من أحمد/ }));
    expect(screen.getByTestId('location')).toHaveAttribute('data-path', '/owner/notifications');
  });

  it('the footer «عرض جميع الإشعارات» still points at alertsPath (D2: the personal page for QUALITY/OWNER)', () => {
    state.list = [row()];
    renderBell('/quality/notifications');
    openPanel();

    const viewAll = screen.getByRole('link', { name: /عرض جميع الإشعارات/ });
    expect(viewAll).toHaveAttribute('href', '/quality/notifications');
  });
});

describe('NotificationDropdown — mark-all error honesty (r165d D3)', () => {
  it('isError renders the role=alert banner with the retry affordance', () => {
    state.markAll.isError = true;
    state.list = [row()];
    renderBell('/student/alerts');
    openPanel();

    const banner = screen.getByRole('alert');
    expect(banner).toHaveClass('form-feedback');
    expect(banner).toHaveClass('fail');
    expect(banner.textContent).toContain('تعذَّر تعليم الإشعارات كمقروءة');
  });

  it('«إعادة المحاولة» re-fires the SAME bulk mutation', () => {
    state.markAll.isError = true;
    state.list = [row()];
    renderBell('/student/alerts');
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));
    expect(state.markAll.mutate).toHaveBeenCalledTimes(1);
  });

  it('no error → no banner (the quiet path stays quiet)', () => {
    state.list = [row()];
    renderBell('/student/alerts');
    openPanel();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/تعذَّر تعليم الإشعارات/)).toBeNull();
  });
});
