/**
 * AppShell — onboarding auto-start gate (4-A13 P1-1) + ⌘K command
 * palette wiring (4-A2 P2-8 + P1-3, wave 21-a).
 *
 * Onboarding gate: the flow used to auto-start on EVERY authed route —
 * a deep-linked task (shared lecture URL) was greeted by a
 * focus-trapped modal + scroll lock. The gate now matches
 * location.pathname === ROLE_HOME[role]: not-home routes render
 * nothing (the sidebar «عرض الجولة» replay stays the invitation), and
 * arriving at the dashboard LATER in the same session still shows the
 * tour once (the once-guard only arms on the home route).
 *
 * ⌘K palette: AppShell owns the chord shell-wide. The palette must
 * open for any role, toggle closed on a second press, stay inert while
 * another overlay layer owns the screen (drawer/modal/dropdown), and
 * close on Escape.
 *
 * Heavy layout children are stubbed; useOnboardingState is REAL (the
 * assertions read the shared onboarding store — the same store the
 * real <OnboardingFlow /> renders from). The tests never call
 * skip/finish, so no POST /me/onboarding/complete ever fires.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
vi.mock('../../src/hooks/useThemeProfileSync', () => ({
  useThemeProfileSync: () => undefined,
}));
vi.mock('../../src/hooks/useRoleAccent', () => ({
  useRoleAccent: () => undefined,
}));
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => ({ data: { id: 'u1', onboardingCompletedAt: null } }),
  useLogout: () => ({ mutate: vi.fn() }),
}));

import { AppShell } from '../../src/components/layout/AppShell';
import { useAuthStore } from '../../src/stores/auth.store';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { useUiStore } from '../../src/stores/ui.store';
import { overlayStack } from '../../src/lib/overlayStack';

const STUDENT = {
  id: 'u1',
  email: 'student@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الزوي',
  role: 'STUDENT' as const,
};

function renderShell(initialEntry: string, children?: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppShell>{children ?? <div>محتوى</div>}</AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  act(() => {
    useAuthStore.setState({ user: STUDENT, isHydrated: true });
    useOnboardingStore.setState({ isOpen: false, currentFrame: 0, isReplay: false });
  });
});

afterEach(() => {
  act(() => {
    useAuthStore.setState({ user: null });
    useOnboardingStore.setState({ isOpen: false, currentFrame: 0, isReplay: false });
  });
});

describe('AppShell — onboarding auto-start gate (A13 P1-1)', () => {
  it('does NOT auto-start on a deep route even when the server never recorded completion', () => {
    renderShell('/student/library');
    expect(useOnboardingStore.getState().isOpen).toBe(false);
  });

  it('auto-starts on the role home route', () => {
    renderShell('/student/dashboard');
    expect(useOnboardingStore.getState().isOpen).toBe(true);
  });

  it('still auto-starts when the user ARRIVES at the home route later in the session', () => {
    // The once-guard may only arm on the home route — a deep-linked
    // first paint must not burn the once-per-session chance.
    renderShell(
      '/student/library',
      <Link to="/student/dashboard">إلى لوحة التحكم</Link>,
    );
    expect(useOnboardingStore.getState().isOpen).toBe(false);
    fireEvent.click(screen.getByRole('link', { name: 'إلى لوحة التحكم' }));
    expect(useOnboardingStore.getState().isOpen).toBe(true);
  });

  it('does not re-open after the flow closes (once-guard kept)', () => {
    renderShell('/student/dashboard');
    expect(useOnboardingStore.getState().isOpen).toBe(true);
    act(() => {
      useOnboardingStore.getState().dismiss();
    });
    expect(useOnboardingStore.getState().isOpen).toBe(false);
    // A location change within the same mounted shell must not re-arm.
    fireEvent.click(screen.getByTestId('topbar')); // no-op interaction
    expect(useOnboardingStore.getState().isOpen).toBe(false);
  });
});

describe('AppShell — ⌘K command palette (4-A2 P2-8 + P1-3)', () => {
  it('opens the palette on ⌘K and closes it on Escape', async () => {
    renderShell('/student/dashboard');
    expect(screen.queryByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeNull();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    const palette = screen.getByRole('dialog', { name: 'لوحة الأوامر والبحث' });
    expect(palette).toBeInTheDocument();

    // The combobox body is inside the trapped card.
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeNull(),
      { timeout: 2000 },
    );
  });

  it('works with Ctrl+K (non-Mac) and toggles closed on a second press', async () => {
    renderShell('/student/dashboard');
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeInTheDocument();
    // Second press toggles.
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeNull(),
      { timeout: 2000 },
    );
  });

  it('stays inert while another overlay layer owns the screen', () => {
    renderShell('/student/dashboard');
    overlayStack.register('gate-test-modal', 'modal');
    try {
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      expect(screen.queryByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeNull();
    } finally {
      overlayStack.unregister('gate-test-modal');
    }
    // The chord returns once the stack drains.
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeInTheDocument();
  });

  it('lists the role\'s nav destinations as quick actions (shared nav config)', async () => {
    renderShell('/student/dashboard');
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    const listbox = screen.getByRole('listbox', { name: 'الأوامر والنتائج' });
    // Empty query: the curated cap — the role's top nav destinations.
    expect(listbox.textContent).toContain('لوحة التحكم'); // /student/dashboard nav label
    expect(screen.getByRole('status').textContent).not.toBe('');

    // Typing filters the SAME nav config — the vision entry (4-A14
    // P1-1) surfaces without the 7-item cap in the way.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'الابتكارات' } });
    await waitFor(
      () =>
        expect(
          screen.getByRole('option', { name: /الابتكارات القادمة/ }),
        ).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it('reopens with a fresh input — no stale query inside the exit window (5-B5, A4 P2-3)', () => {
    renderShell('/student/dashboard');
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'هندسة' } });
    expect(screen.getByRole('combobox')).toHaveValue('هندسة');

    // Close and reopen on the same tick — inside the delayed-unmount
    // exit window the old body (and its query) used to survive, so a
    // quick Esc→⌘K resurrected the previous term (A4 measured
    // «zzzzqqد. أحمد»). The body is now keyed per open (AppShell
    // paletteSeq) and always mounts fresh.
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});

/* ── 5-D3 (A10 P3-5): palette recents ─────────────────────────────
   The last-run action ids persist in the ui store (localStorage via
   zustand persist), render as a «الأخيرة» section above the quick
   actions on the EMPTY query, ride the flat keyboard order first, and
   are excluded from the quick list so no row renders twice. */
describe('AppShell — palette recents (5-D3 / A10 P3-5)', () => {
  beforeEach(() => {
    act(() => {
      useUiStore.setState({ recentPaletteIds: [] });
    });
    localStorage.removeItem('mdrk-ui');
  });

  afterEach(() => {
    act(() => {
      useUiStore.setState({ recentPaletteIds: [] });
    });
    localStorage.removeItem('mdrk-ui');
  });

  it('records a run and surfaces it as the first row of «الأخيرة» on reopen', async () => {
    renderShell('/student/dashboard');
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    // Run a quick action (the student's online-exams destination —
    // within the 7-item cap). Regex name-match: the row's trailing
    // arrow icon is part of its accessible name, exact never matches.
    fireEvent.click(screen.getByRole('option', { name: /الاختبارات الإلكترونية/ }));
    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeNull(),
      { timeout: 2000 },
    );
    expect(useUiStore.getState().recentPaletteIds).toEqual(['nav:/student/online-exams']);

    // Reopen — the recents section renders above the quick actions.
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    const recents = screen.getByRole('group', { name: 'الأخيرة' });
    const rows = recents.querySelectorAll('[role="option"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.textContent).toContain('الاختبارات الإلكترونية');
    // The quick list no longer repeats it.
    const quick = screen.getByRole('group', { name: 'إجراءات سريعة' });
    expect(quick.textContent).not.toContain('الاختبارات الإلكترونية');
    // The recents are keyboard-first: aria-activedescendant points at
    // the first option = the recent row's id.
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      rows[0]!.id,
    );
  });

  it('runs the focused recent with Enter and moves it to the front', async () => {
    act(() => {
      useUiStore.setState({ recentPaletteIds: ['nav:/student/library', 'action:theme'] });
    });
    renderShell('/student/dashboard');
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    const recents = screen.getByRole('group', { name: 'الأخيرة' });
    expect(recents.querySelectorAll('[role="option"]')).toHaveLength(2);

    // Enter on the focused first recent (المكتبة الإلكترونية) — the
    // run navigates and the id stays at the front of the store.
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(useUiStore.getState().recentPaletteIds).toEqual([
      'nav:/student/library',
      'action:theme',
    ]);
  });

  it('renders no recents section for a stale id from another role (honest absence)', () => {
    act(() => {
      useUiStore.setState({ recentPaletteIds: ['nav:/owner/system'] });
    });
    renderShell('/student/dashboard');
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.queryByRole('group', { name: 'الأخيرة' })).toBeNull();
    // The quick actions are untouched by the unresolvable id.
    expect(screen.getByRole('group', { name: 'إجراءات سريعة' }).textContent).toContain('لوحة التحكم');
  });

  it('keeps recents out of the typed query — the filter answers alone', async () => {
    act(() => {
      useUiStore.setState({ recentPaletteIds: ['nav:/student/library'] });
    });
    renderShell('/student/dashboard');
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'الاختبارات' } });
    await waitFor(() => {
      expect(screen.queryByRole('group', { name: 'الأخيرة' })).toBeNull();
      expect(screen.getByRole('group', { name: 'إجراءات سريعة' }).textContent).not.toContain(
        'المكتبة الإلكترونية',
      );
    });
  });
});
