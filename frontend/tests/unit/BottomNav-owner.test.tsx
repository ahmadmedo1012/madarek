/**
 * T3-F2 — BottomNav OWNER-role branch unit tests.
 *
 * Previously the OWNER role fell through the role ternary to the STUDENT
 * item set (/student/dashboard, …) — all blocked by ProtectedRoute for
 * OWNER. The OWNER branch now renders real /owner/* routes.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../../src/components/layout/BottomNav';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

const ownerUser: AuthUser = {
  id: 'u-owner',
  email: 'owner@zu.edu.ly',
  firstName: 'مالك',
  lastName: 'المنصة',
  role: 'OWNER',
};

const studentUser: AuthUser = {
  id: 'u-student',
  email: 'student@zu.edu.ly',
  firstName: 'طالب',
  lastName: 'تجريبي',
  role: 'STUDENT',
};

function renderNav() {
  return render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav — OWNER branch', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: ownerUser, isHydrated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('renders exactly five /owner/* items for the OWNER role', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: 'التنقّل السريع' });
    expect(nav).toHaveAttribute('data-role', 'owner');
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(5);
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toEqual([
      '/owner/dashboard',
      '/owner/users',
      '/owner/realtime',
      '/owner/alerts',
      '/owner/governance',
    ]);
  });

  it('never links to student routes for the OWNER role', () => {
    renderNav();
    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(link.getAttribute('href')).not.toContain('/student/');
    }
  });

  it('still renders the STUDENT set for students (no regression)', () => {
    useAuthStore.setState({ user: studentUser });
    renderNav();
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/student/dashboard');
    expect(hrefs).not.toContain('/owner/dashboard');
  });
});
