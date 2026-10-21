/**
 * r305-A4 (task 2-e) — the shell's temporal + focus layer state pins.
 *
 * One grammar for the states AppShell itself owns (r305 Heron shell
 * round); the visual layer lives in r305-shell.css (2-d) — this file
 * pins the BEHAVIOR:
 *
 *  1. Focus rescue (5-B5, A4 §7): a SPA route change that orphans
 *     focus on document.body (or strands it on a detached node) moves
 *     it to the topbar page title; focus that SURVIVED the navigation
 *     — including focus living inside an OPEN OVERLAY (a portal node
 *     under document.body) — is never touched; the first mount is
 *     skipped so the skip link stays the first Tab stop on cold loads.
 *
 *  2. document.title resolution (5-B5 / 4-A14 / r183-B6): nav.ts is
 *     the single source for nav destinations; the manual map only
 *     carries non-nav surfaces; DYNAMIC_TITLES resolves parametric
 *     routes; the fallback is the product name («مدارك» → the full
 *     DOC_TITLE_BASE when mirrored into the tab).
 *
 *  3. ⌘K chord grammar (4-A2 P2-8, wave 21-a): the chord opens the
 *     palette shell-wide, toggles it closed, and stays inert while
 *     overlayStack is non-empty — returning the moment it drains.
 *
 *  4. Skip link target: #main is programmatic-focusable (tabindex=-1)
 *     so the native fragment navigation lands focus on the content
 *     landmark, and the scroll region (tabindex=0) stays keyboard
 *     reachable (r168a contract, behavior-level pin here).
 *
 * Heavy layout children are stubbed; the Topbar stub keeps the REAL
 * .topbar-title contract (tabindex=-1) that the rescue targets.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createPortal } from 'react-dom';

vi.mock('../../src/components/layout/Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar" />,
}));
vi.mock('../../src/components/layout/Topbar', () => ({
  // The real Topbar renders .topbar-title with tabIndex={-1} — the
  // focus-rescue target. The stub mirrors that contract.
  Topbar: ({ title }: { title?: string }) => (
    <header data-testid="topbar">
      <div className="topbar-title" tabIndex={-1}>{title}</div>
    </header>
  ),
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

import { AppShell, resolveTitle } from '../../src/components/layout/AppShell';
import { useAuthStore } from '../../src/stores/auth.store';
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
  });
});

afterEach(() => {
  /* Unmount BEFORE reading the invariant: vitest runs afterEach hooks
   * LIFO, so this file-level hook fires before tests/setup.ts's global
   * cleanup — reading the stack while a tree with an open palette is
   * still mounted would fail here, and a thrown hook skips the global
   * cleanup, cascading duplicate-tree failures into the next test
   * (measured: the chord-inert test poisoned the two skip-link tests
   * with a second <main>). cleanup() is idempotent — the global hook
   * that follows is a no-op. */
  cleanup();
  act(() => {
    useAuthStore.setState({ user: null });
  });
  expect(overlayStack.isEmpty()).toBe(true);
});

/* ── 1. Focus rescue (5-B5, A4 §7) ──────────────────────────────── */
describe('r305 shell — focus rescue grammar (5-B5, A4 §7)', () => {
  function Probe({ unmountLink }: { unmountLink: boolean }) {
    const loc = useLocation();
    return (
      <>
        {unmountLink
          ? (loc.pathname === '/a' ? <Link to="/b">إلى ب</Link> : <span>وصلنا</span>)
          : <Link to="/b">إلى ب</Link>}
        <div>محتوى {loc.pathname}</div>
      </>
    );
  }

  function renderProbe(unmountLink: boolean, initialEntry = '/a') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppShell>
          <Probe unmountLink={unmountLink} />
        </AppShell>
      </MemoryRouter>,
    );
  }

  it('moves focus orphaned on document.body to the topbar title', () => {
    renderProbe(true);
    const link = screen.getByRole('link', { name: 'إلى ب' });
    link.focus();
    fireEvent.click(link);
    // The focused link unmounted with the drawer-style navigation —
    // focus fell to <body>, and the shell rescued it onto the title.
    expect(document.activeElement).toHaveClass('topbar-title');
  });

  it('leaves focus that survived the navigation exactly where it is', () => {
    renderProbe(false);
    const link = screen.getByRole('link', { name: 'إلى ب' });
    link.focus();
    fireEvent.click(link);
    expect(document.activeElement).toBe(link);
  });

  it('skips the first mount — no focus steal on cold loads', () => {
    renderProbe(true);
    expect(document.activeElement).toBe(document.body);
  });

  it('rescues focus stranded on a DETACHED node (dead element)', () => {
    renderProbe(true);
    /* jsdom follows Chromium and resets activeElement to <body> when
     * the focused node is removed; the Safari family strands it on the
     * detached node instead — the second orphan shape the rescue
     * condition owns (`active !== null && !document.contains(active)`).
     * Reproduce the strand with an honest activeElement stub. */
    const detached = document.createElement('button');
    const active = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'activeElement',
    );
    expect(active?.get).toBeDefined();
    /* The strand model: wherever the REAL focus would be <body> (the
     * orphan shape), reads report the detached node instead — exactly
     * the Safari divergence. Any real focus move (the shell's rescue
     * onto the title) reads through honestly. */
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get() {
        const real = active!.get!.call(document);
        return real === document.body ? detached : real;
      },
    });
    try {
      fireEvent.click(screen.getByRole('link', { name: 'إلى ب' }));
      expect(document.activeElement).toHaveClass('topbar-title');
      expect(document.contains(detached)).toBe(false); // the strand held
    } finally {
      delete (document as unknown as { activeElement?: unknown }).activeElement;
      if (active) Object.defineProperty(Document.prototype, 'activeElement', active);
    }
  });

  it('does not rescue focus living inside an open overlay (portal node)', () => {
    // A faithful stand-in for a Modal/Sheet layer: a focusable control
    // PORTALED to document.body (outside .has-shell), with its layer
    // registered in overlayStack — the exact state a real overlay owns.
    function OverlayProbe() {
      const loc = useLocation();
      return (
        <>
          <Link to="/b">إلى ب</Link>
          {createPortal(
            <input aria-label="حقل الطبقة العلوية" data-testid="overlay-field" />,
            document.body,
          )}
          <div>محتوى {loc.pathname}</div>
        </>
      );
    }
    render(
      <MemoryRouter initialEntries={['/a']}>
        <AppShell>
          <OverlayProbe />
        </AppShell>
      </MemoryRouter>,
    );
    overlayStack.register('r305-states-overlay', 'modal');
    try {
      const field = document.querySelector<HTMLInputElement>('[data-testid="overlay-field"]')!;
      field.focus();
      expect(document.activeElement).toBe(field);
      fireEvent.click(screen.getByRole('link', { name: 'إلى ب' }));
      // The route changed UNDER the open layer — the focus inside it
      // is contained and alive: the shell must not yank it to the title.
      expect(document.activeElement).toBe(field);
      expect(document.activeElement).not.toHaveClass('topbar-title');
    } finally {
      overlayStack.unregister('r305-states-overlay');
    }
  });
});

/* ── 2. document.title resolution table ─────────────────────────── */
describe('r305 shell — document.title resolution table (single source: nav.ts)', () => {
  it.each([
    ['nav destination', '/student/dashboard', 'لوحة التحكم'],
    ['nav destination (teacher library)', '/teacher/library', 'المكتبة الإلكترونية'],
    ['manual non-nav surface', '/colleges/leaderboard', 'منافسة الكلّيّات'],
    ['dynamic pattern (course detail)', '/student/courses/crs_123', 'تفاصيل المقرّر'],
    ['dynamic pattern (exam, neutral title)', '/student/online-exams/ex_9', 'اختبار إلكتروني'],
    ['dynamic pattern (owner setup)', '/owner/institutions/inst_1', 'إعداد مؤسسة'],
    ['dynamic pattern (training track)', '/training/tr_1', 'مسار تدريبي'],
    ['fallback (unlisted route)', '/no/such/route', 'مدارك'],
  ])('%s resolves %s → %s', (_kind, pathname, expected) => {
    expect(resolveTitle(pathname)).toBe(expected);
  });

  it('mirrors the resolved title into the tab with the product suffix', () => {
    renderShell('/student/courses/crs_123');
    expect(document.title).toBe('تفاصيل المقرّر · مدارك');
  });

  it('resolves the bare product fallback to the full platform title', () => {
    renderShell('/no/such/route');
    expect(document.title).toBe('مدارك · منصّة التعليم الذكي');
  });
});

/* ── 3. ⌘K chord grammar ────────────────────────────────────────── */
describe('r305 shell — ⌘K chord grammar (4-A2 P2-8, wave 21-a)', () => {
  it('opens on the chord and toggles closed on a second press', async () => {
    renderShell('/student/dashboard');
    expect(screen.queryByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeNull();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeNull(),
      { timeout: 2000 },
    );
  });

  it('stays inert while overlayStack is non-empty and returns once it drains', () => {
    renderShell('/student/dashboard');
    overlayStack.register('r305-states-chord-guard', 'drawer');
    try {
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      expect(screen.queryByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeNull();
    } finally {
      overlayStack.unregister('r305-states-chord-guard');
    }
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog', { name: 'لوحة الأوامر والبحث' })).toBeInTheDocument();
  });
});

/* ── 4. Skip link + content region focus contract ───────────────── */
describe('r305 shell — skip link target and scroll-region focus', () => {
  it('#main accepts programmatic focus (tabindex=-1, native fragment landing)', () => {
    renderShell('/');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(main).toHaveAttribute('tabindex', '-1');
    main.focus();
    expect(document.activeElement).toBe(main);
  });

  it('the content scroll region stays keyboard-focusable (r168a, behavior pin)', () => {
    renderShell('/');
    const region = screen.getByRole('region', { name: 'المحتوى الرئيسي' });
    expect(region).toHaveAttribute('tabindex', '0');
    region.focus();
    expect(document.activeElement).toBe(region);
  });
});
