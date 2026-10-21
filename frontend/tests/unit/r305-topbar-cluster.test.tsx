/**
 * r305-topbar-cluster — the Heron shell pass pins (Task 2-b).
 *
 * The R305-A4 grammar applied to the topbar cluster, pinned where the
 * owned suites above don't already hold the line:
 *
 *   1. InstitutionChip — single membership renders the PASSIVE
 *      `.topbar-scope` pill (no trigger), multi-membership renders the
 *      switcher menu whose current row is truthfully disabled; choosing
 *      another membership fires POST /auth/select-institution
 *      (useSelectInstitution) with the picked id and — through the
 *      mutation's own callbacks — success/error toasts with the r178
 *      Arabic copy. A context-less multi-membership session (the
 *      refresh re-resolution contract) surfaces `data-context-lost`
 *      on the trigger — the honest-state hook r305-shell.css styles.
 *   2. User menu — the theme item flips the theme store's mode AND
 *      closes the menu (4-A2 P2-10: aria-expanded must not stick).
 *   3. Bell — the badge is the real unread truth (S-1b): the count
 *      rides the badge node + the counted Arabic aria-label; zero
 *      unread renders no badge and names the bell «الإشعارات».
 *   4. Search chord — "/" focuses the pill on the desktop band, and
 *      stays INERT while any layer owns the overlay stack (the
 *      GlobalSearch-shortcut-guard contract, re-pinned at cluster
 *      level so a topbar-side regression can't slip between suites).
 *   5. Title block — the R305 group-context kicker renders the
 *      sidebar-section label ONLY when the pathname exactly matches
 *      one of the role's nav destinations (truthful by construction),
 *      and the scope chips (student faculty / admin-quality faculty)
 *      keep rendering inside `.topbar-title` beside the page title.
 *
 * Mock strategy mirrors the owned suites: hoisted mutable state,
 * partial useResources mock (importOriginal) so notifDeepLink /
 * apiErrorMessage stay the REAL production implementations, and a
 * QueryClientProvider wrapper so the real GlobalSearch mounts (its
 * query stays disabled under the 2-char gate — no network).
 */
import type { ReactElement } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const state = vi.hoisted(() => ({
  unread: 0,
  profile: undefined as { student?: { faculty?: { name: string | null } } } | undefined,
  me: undefined as { scopeFaculty?: { name: string | null } } | undefined,
  selectMutate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../../src/lib/toast', () => ({
  /* Delegate through `state` so beforeEach's fresh vi.fn()s are the
   * ones the assertions read (a factory-time reference would pin the
   * FIRST mock instance for the whole file). */
  toast: {
    success: (...args: unknown[]) => state.toastSuccess(...args),
    error: (...args: unknown[]) => state.toastError(...args),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => ({ data: state.me }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  // r178: the InstitutionChip's selection mutation — the hoisted spy
  // lets the pins fire the mutation's own onSuccess/onError callbacks.
  useSelectInstitution: () => ({
    mutate: state.selectMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

/* Partial mock — apiErrorMessage + notifDeepLink + the notification
 * list hooks stay the real implementations (the deeplink/tone suites'
 * convention); only the two topbar-cluster data sources are stubbed. */
vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useMyProfile: () => ({ data: state.profile }),
    useUnreadNotifications: () => ({ data: state.unread }),
  };
});

import { Topbar } from '../../src/components/layout/Topbar';
import { GlobalSearch } from '../../src/components/layout/GlobalSearch';
import { NotificationDropdown } from '../../src/components/layout/NotificationDropdown';
import { useAuthStore, type AuthUser, type AppRole, type MembershipInfo } from '../../src/stores/auth.store';
import { useThemeStore } from '../../src/stores/theme.store';
import { overlayStack } from '../../src/lib/overlayStack';

const userWithRole = (role: AppRole): AuthUser => ({
  id: `r305-cluster-${role.toLowerCase()}`,
  email: 'cluster@uoz.edu.ly',
  firstName: 'جرس',
  lastName: 'الشريط',
  role,
});

const membership = (over: Partial<MembershipInfo>): MembershipInfo => ({
  institutionId: 'inst-x',
  name: 'مؤسسة',
  nameEn: 'Institution',
  slug: 'inst-x',
  role: 'STUDENT',
  isActive: true,
  ...over,
});

const INST_A = membership({ institutionId: 'inst-a', name: 'جامعة الزاوية', nameEn: 'University of Zawia', slug: 'zawia' });
const INST_B = membership({ institutionId: 'inst-b', name: 'مؤسسة الأندلس التعليمية', nameEn: 'Al-Andalus Education Institute', slug: 'andalus', role: 'ADMIN' });

const contextFor = (inst: MembershipInfo) => ({
  id: inst.institutionId,
  name: inst.name,
  nameEn: inst.nameEn,
  slug: inst.slug,
});

/** Every render carries a fresh QueryClient — the real GlobalSearch
 *  mounts inside Topbar and its (disabled) search query needs one. */
function renderShell(ui: ReactElement, { path = '/somewhere' }: { path?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  state.unread = 0;
  state.profile = undefined;
  state.me = undefined;
  state.selectMutate = vi.fn();
  state.toastSuccess = vi.fn();
  state.toastError = vi.fn();
  useAuthStore.setState({
    user: null,
    memberships: [],
    currentInstitution: null,
    membershipRole: null,
  });
  useThemeStore.setState({ mode: 'light', modeUpdatedAt: 0 });
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
});

/* ── 1. InstitutionChip (r178 + r305) ────────────────────────────── */
describe('InstitutionChip — passive pill vs switcher', () => {
  it('single membership + context renders the passive pill, no trigger', () => {
    useAuthStore.setState({
      user: userWithRole('STUDENT'),
      memberships: [INST_A],
      currentInstitution: contextFor(INST_A),
      membershipRole: 'STUDENT',
    });
    renderShell(<Topbar title="لوحة التحكم" />);

    const pill = screen.getByText('جامعة الزاوية');
    expect(pill).toHaveClass('topbar-scope');
    expect(screen.queryByRole('button', { name: 'المؤسسة الحالية' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'اختيار المؤسسة' })).toBeNull();
  });

  it('multi-membership renders the switcher; the current row is truthfully disabled', () => {
    useAuthStore.setState({
      user: userWithRole('STUDENT'),
      memberships: [INST_A, INST_B],
      currentInstitution: contextFor(INST_A),
      membershipRole: 'STUDENT',
    });
    renderShell(<Topbar title="لوحة التحكم" />);

    const trigger = screen.getByRole('button', { name: 'المؤسسة الحالية' });
    // The settled session is not context-lost — no urgency hook.
    expect(trigger).not.toHaveAttribute('data-context-lost');
    fireEvent.click(trigger);

    expect(screen.getByRole('menu', { name: 'تبديل المؤسسة' })).toBeInTheDocument();
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(2);
    // The current institution's row is disabled — honest selected state.
    expect(items[0]).toHaveAttribute('aria-disabled', 'true');
    expect(items[0]!.textContent).toContain('جامعة الزاوية');
    // The role label rides the trailing edge (topbar-inst-role).
    expect(items[1]!.textContent).toContain('إداري');
  });

  it('choosing another membership fires the mutation and the success toast', () => {
    useAuthStore.setState({
      user: userWithRole('STUDENT'),
      memberships: [INST_A, INST_B],
      currentInstitution: contextFor(INST_A),
      membershipRole: 'STUDENT',
    });
    renderShell(<Topbar title="لوحة التحكم" />);

    fireEvent.click(screen.getByRole('button', { name: 'المؤسسة الحالية' }));
    fireEvent.click(screen.getAllByRole('menuitem')[1]!);

    expect(state.selectMutate).toHaveBeenCalledTimes(1);
    expect(state.selectMutate).toHaveBeenCalledWith(
      { institutionId: 'inst-b' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );

    const { onSuccess } = state.selectMutate.mock.calls[0]![1] as { onSuccess: () => void };
    act(() => onSuccess());
    expect(state.toastSuccess).toHaveBeenCalledWith(
      'أنت الآن ضمن «مؤسسة الأندلس التعليمية».',
      { title: 'تمّ تبديل المؤسسة' },
    );
  });

  it('a failed switch falls back to the Arabic error toast (apiErrorMessage owns the message)', () => {
    useAuthStore.setState({
      user: userWithRole('STUDENT'),
      memberships: [INST_A, INST_B],
      currentInstitution: contextFor(INST_A),
      membershipRole: 'STUDENT',
    });
    renderShell(<Topbar title="لوحة التحكم" />);

    fireEvent.click(screen.getByRole('button', { name: 'المؤسسة الحالية' }));
    fireEvent.click(screen.getAllByRole('menuitem')[1]!);

    const { onError } = state.selectMutate.mock.calls[0]![1] as { onError: (e: unknown) => void };
    // A plain Error carries no Arabic API detail — the caller's
    // fallback copy must win (15-j P0-1).
    act(() => onError(new Error('NETWORK_DOWN')));
    expect(state.toastError).toHaveBeenCalledWith(
      'تعذّر تبديل المؤسسة — حاول مجدداً.',
      { title: 'تعذّر التبديل' },
    );
  });

  it('a context-less multi-membership session marks the trigger data-context-lost', () => {
    useAuthStore.setState({
      user: userWithRole('STUDENT'),
      memberships: [INST_A, INST_B],
      currentInstitution: null,
      membershipRole: null,
    });
    renderShell(<Topbar title="لوحة التحكم" />);

    const trigger = screen.getByRole('button', { name: 'اختيار المؤسسة' });
    expect(trigger).toHaveAttribute('data-context-lost', 'true');
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'اختيار المؤسسة' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });
});

/* ── 2. User menu — the theme item (4-A2 P2-10, r305) ────────────── */
describe('User menu — theme item flips the mode and closes the menu', () => {
  it('light session: «الوضع الداكن» sets mode=dark and aria-expanded returns to false', () => {
    useAuthStore.setState({ user: userWithRole('STUDENT') });
    renderShell(<Topbar title="لوحة التحكم" />);

    const trigger = screen.getByRole('button', { name: 'ملف المستخدم' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('menuitem', { name: 'الوضع الداكن' }));

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('dark session: «الوضع الفاتح» sets mode=light (the label names the TARGET)', () => {
    useAuthStore.setState({ user: userWithRole('STUDENT') });
    useThemeStore.setState({ mode: 'dark' });
    renderShell(<Topbar title="لوحة التحكم" />);

    fireEvent.click(screen.getByRole('button', { name: 'ملف المستخدم' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'الوضع الفاتح' }));

    expect(useThemeStore.getState().mode).toBe('light');
  });
});

/* ── 3. Bell — the unread badge (S-1b, r305) ─────────────────────── */
describe('NotificationDropdown — bell badge reflects the server unread truth', () => {
  it('unread 3 renders the badge digits and the counted Arabic name', () => {
    state.unread = 3;
    renderShell(<NotificationDropdown alertsPath="/student/alerts" />);

    const bell = screen.getByRole('button', { name: '3 إشعارات غير مقروءة' });
    const badge = bell.querySelector('.topbar-notif-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe('3');
  });

  it('zero unread renders no badge and names the bell «الإشعارات»', () => {
    state.unread = 0;
    renderShell(<NotificationDropdown alertsPath="/student/alerts" />);

    const bell = screen.getByRole('button', { name: 'الإشعارات' });
    expect(bell.querySelector('.topbar-notif-badge')).toBeNull();
  });
});

/* ── 4. Search chord — inert while the overlay stack owns the screen ── */
describe('GlobalSearch — "/" chord guard (cluster-level re-pin)', () => {
  it('focuses the pill when the stack is empty; stays inert while a layer is open', () => {
    renderShell(<GlobalSearch />);
    const input = screen.getByLabelText('بحث');

    expect(input).not.toHaveFocus();
    fireEvent.keyDown(document, { key: '/' });
    expect(input).toHaveFocus();

    overlayStack.register('r305-cluster-guard', 'modal');
    try {
      input.blur(); // the focused input is a text field — pin the VETO, not the field guard
      fireEvent.keyDown(document, { key: '/' });
      expect(input).not.toHaveFocus();
    } finally {
      overlayStack.unregister('r305-cluster-guard');
    }
  });
});

/* ── 5. Title block — kicker truthfulness + scope chips ──────────── */
describe('Topbar title block — group-context kicker + scope chips (r305)', () => {
  it('a nav-exact path renders the sidebar-section kicker beside the title', () => {
    useAuthStore.setState({ user: userWithRole('STUDENT') });
    renderShell(<Topbar title="لوحة التحكم" />, { path: '/student/dashboard' });

    const kicker = document.querySelector('.topbar-kicker');
    expect(kicker).not.toBeNull();
    expect(kicker!.textContent).toBe('الرئيسية');
    // The focus-rescue target survives (AppShell queries it by class).
    expect(document.querySelector('.topbar-title')).not.toBeNull();
  });

  it('a detail/unknown path renders NO kicker — no fabricated context', () => {
    useAuthStore.setState({ user: userWithRole('STUDENT') });
    renderShell(<Topbar title="استعارة كتاب" />, { path: '/student/library/borrow/42' });

    expect(document.querySelector('.topbar-kicker')).toBeNull();
  });

  it('the student faculty scope chip rides the same title block (PRD scope indicator)', () => {
    state.profile = { student: { faculty: { name: 'كلية الهندسة' } } };
    useAuthStore.setState({ user: userWithRole('STUDENT') });
    renderShell(<Topbar title="لوحة التحكم" />, { path: '/student/dashboard' });

    const chip = screen.getByText('كلية الهندسة');
    expect(chip).toHaveClass('topbar-scope');
    expect(document.querySelector('.topbar-title')).toContainElement(chip);
  });

  it.each([
    ['ADMIN', 'إداري كلّيّة', '/admin/dashboard', 'الإدارة'],
    ['QUALITY', 'أخصائي جودة كلّيّة', '/quality/dashboard', 'مركز ضمان الجودة'],
  ] as const)('%s scoped to a faculty renders the governance scope chip + its kicker', (role, chipPrefix, path, kickerLabel) => {
    state.me = { scopeFaculty: { name: 'كلية الهندسة' } };
    useAuthStore.setState({ user: userWithRole(role) });
    renderShell(<Topbar title="لوحة التحكم" />, { path });

    const chip = document.querySelector('.topbar-scope');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain(chipPrefix);
    expect(chip!.textContent).toContain('كلية الهندسة');
    expect(chip).toHaveAttribute('title', 'نطاق الإدارة: كلية الهندسة');
    expect(document.querySelector('.topbar-kicker')!.textContent).toBe(kickerLabel);
  });
});
