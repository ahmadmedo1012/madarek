/**
 * T3-F2 — AppShell skip-link unit tests.
 *
 * AppShell must render the skip link ("تخطَّ إلى المحتوى الرئيسي") as the
 * first focusable element, pointing at #main, and the <main> element must
 * carry id="main".
 *
 * Heavy layout children (Sidebar / Topbar / BottomNav / onboarding) are
 * stubbed so the test isolates AppShell's own markup.
 *
 * 16-E3 adds the per-route document.title suite (15-g P2-3).
 */
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// (A ResizeObserver stub used to live here for useLayoutMetrics, which
// wave 7-b deleted — audit 11-e P2-17 flagged both the stub and this
// comment as stale. Nothing in AppShell observes layout anymore.)
// (The hooks/useAuth mock also died in 16-E3: HydrateMe was this file's
// only useMe consumer and it was deleted — 15-f FE-3.)

vi.mock('../../src/components/layout/Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar" />,
}));
vi.mock('../../src/components/layout/Topbar', () => ({
  Topbar: () => <header data-testid="topbar" />,
}));
vi.mock('../../src/components/layout/BottomNav', () => ({
  BottomNav: () => <nav data-testid="bottomnav" />,
}));
vi.mock('../../src/components/layout/ThemeToggle', () => ({
  useThemeSync: () => undefined,
}));
vi.mock('../../src/components/layout/useScrollRestoration', () => ({
  useScrollRestoration: () => undefined,
}));
vi.mock('../../src/components/onboarding/OnboardingFlow', () => ({
  OnboardingFlow: () => <div data-testid="onboarding" />,
}));
vi.mock('../../src/components/onboarding/MilestoneScene', () => ({
  MilestoneScene: () => null,
}));
vi.mock('../../src/components/motion', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../src/hooks/useOnboardingState', () => ({
  useOnboardingState: () => ({
    shouldAutoStart: false,
    isOpen: false,
    isReplay: false,
    currentFrame: 0,
    open: () => undefined,
    skip: () => undefined,
    next: () => undefined,
    prev: () => undefined,
    finish: () => undefined,
  }),
}));
vi.mock('../../src/hooks/useThemeProfileSync', () => ({
  useThemeProfileSync: () => undefined,
}));
vi.mock('../../src/hooks/useRoleAccent', () => ({
  useRoleAccent: () => undefined,
}));

import { AppShell } from '../../src/components/layout/AppShell';

function renderShell(content = 'محتوى الصفحة', initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppShell>
        <div>{content}</div>
      </AppShell>
    </MemoryRouter>,
  );
}

describe('AppShell — skip link', () => {
  it('renders a skip link pointing at #main with the Arabic label', () => {
    renderShell();
    const skip = screen.getByRole('link', { name: 'تخطَّ إلى المحتوى الرئيسي' });
    expect(skip).toBeInTheDocument();
    expect(skip).toHaveAttribute('href', '#main');
    expect(skip).toHaveClass('skip-link');
  });

  it('marks the main element with id="main"', () => {
    renderShell();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
  });

  it('renders the skip link as the first element inside the shell (before sidebar/main)', () => {
    const { container } = renderShell();
    const shell = container.querySelector('.has-shell')!;
    expect(shell).not.toBeNull();
    const first = shell.firstElementChild!;
    expect(first.tagName).toBe('A');
    expect(first).toHaveClass('skip-link');
    // And the main landmark comes after it.
    const order = Array.from(shell.children).map((el) => el.tagName);
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('MAIN'));
  });

  it('keeps the onboarding flow mounted inside the shell', () => {
    renderShell();
    expect(screen.getByTestId('onboarding')).toBeInTheDocument();
  });
});

describe('AppShell — document.title per route (15-g P2-3)', () => {
  it('mirrors the resolved route title into document.title', () => {
    renderShell('محتوى', '/student/dashboard');
    expect(document.title).toBe('لوحة التحكم · مدارك');
  });

  it('falls back to the platform title for unlisted routes', () => {
    renderShell(); // MemoryRouter default entry '/' — no PAGE_TITLES match
    expect(document.title).toBe('منصة الزاوية · مدارك');
  });

  it('restores the static index.html title when the shell unmounts (logout path)', () => {
    const { unmount } = renderShell('محتوى', '/student/dashboard');
    expect(document.title).toBe('لوحة التحكم · مدارك');
    unmount();
    expect(document.title).toBe('مدارك · منصة التعليم الذكي · جامعة الزاوية');
  });
});
