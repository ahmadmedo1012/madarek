/**
 * NotificationDropdown — route-change dismissal (4-A14 P2-2).
 *
 * The panel survived browser-back: still open, bell
 * aria-expanded="true", hovering over the previous page. Sidebar
 * clicks closed it via outside-click, but history navigations never
 * pass through the document mousedown path — so the component now
 * resets its open state on every location change.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom';

vi.mock('../../src/hooks/useResources', () => ({
  useUnreadNotifications: () => ({ data: 2 }),
  useNotifications: () => ({ data: [], isPending: false }),
  useMarkNotifRead: () => ({ mutate: vi.fn() }),
  useMarkAllNotifsRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { NotificationDropdown } from '../../src/components/layout/NotificationDropdown';

function renderRoutes(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="/a"
          element={
            <div>
              <NotificationDropdown alertsPath="/student/alerts" />
              <Link to="/b">التالي</Link>
            </div>
          }
        />
        <Route path="/b" element={<NotificationDropdown alertsPath="/student/alerts" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const openPanel = () => {
  fireEvent.click(screen.getByRole('button', { name: /إشعار/ }));
  expect(screen.getByRole('dialog', { name: 'الإشعارات' })).toBeInTheDocument();
};

describe('NotificationDropdown — closes on route change (4-A14 P2-2)', () => {
  it('dismisses the panel when the location changes (link navigation)', () => {
    renderRoutes('/a');
    openPanel();
    fireEvent.click(screen.getByRole('link', { name: 'التالي' }));
    // Collapsed immediately — the bell stops announcing expansion…
    expect(screen.getByRole('button', { name: /إشعار/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // …and the portaled panel leaves the DOM after the exit window.
    return waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'الإشعارات' })).toBeNull(),
      { timeout: 2000 },
    );
  });

  it('stays open while the route does not change', () => {
    renderRoutes('/a');
    openPanel();
    // An in-page interaction must not dismiss it.
    fireEvent.click(screen.getByRole('dialog', { name: 'الإشعارات' }));
    expect(screen.getByRole('button', { name: /إشعار/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
