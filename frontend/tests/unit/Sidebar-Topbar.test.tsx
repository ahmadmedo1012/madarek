/**
 * Sidebar + Topbar shell-chrome contracts (wave 16-E4).
 *
 * Sidebar (15-g P2-7, 15-e P1-4):
 *   - the mobile drawer registers in the overlay stack while open
 *     (kind 'sidebar-drawer') and leaves it on close
 *   - Escape closes the drawer ONLY when it is the topmost layer —
 *     a layer opened above the drawer owns the press instead
 *   - Ctrl/Ctrl+B is inert while any overlay layer is open (same
 *     guard ⌘K uses), and still toggles the desktop collapse when
 *     the stack is empty
 *
 * Topbar (15-g P2-7 / P2-9):
 *   - the burger reflects the drawer state: aria-expanded + a label
 *     that follows open/closed («فتح القائمة» / «إغلاق القائمة»)
 *   - the user-menu account header renders inside the dropdown panel
 *     but OUTSIDE the role=menu element
 *
 * Heavy children (GlobalSearch, NotificationDropdown) and the auth
 * data hooks are stubbed so these tests isolate the shell chrome.
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/components/layout/GlobalSearch', () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));
vi.mock('../../src/components/layout/NotificationDropdown', () => ({
  NotificationDropdown: () => <div data-testid="notif-dropdown" />,
}));
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => ({ data: undefined }),
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../src/hooks/useResources', () => ({
  useMyProfile: () => ({ data: undefined }),
}));

import { Sidebar } from '../../src/components/layout/Sidebar';
import { Topbar } from '../../src/components/layout/Topbar';
import { useUiStore } from '../../src/stores/ui.store';
import { useAuthStore } from '../../src/stores/auth.store';
import { overlayStack } from '../../src/lib/overlayStack';

const STUDENT = {
  id: 'u1',
  email: 'student@uoz.edu.ly',
  firstName: 'سالم',
  lastName: 'الزوي',
  role: 'STUDENT' as const,
};

function renderSidebar() {
  // The real shell only mounts Sidebar for a signed-in user — mirror
  // that so the assertions run against the fully rendered nav.
  act(() => {
    useAuthStore.setState({ user: STUDENT });
  });
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

function renderTopbar() {
  return render(
    <MemoryRouter>
      <Topbar title="لوحة التحكم" />
    </MemoryRouter>,
  );
}

const pressChord = () =>
  fireEvent.keyDown(window, { key: 'b', ctrlKey: true });

afterEach(() => {
  // Reset shell state and drain any layer a failing test leaked.
  act(() => {
    useUiStore.setState({ sidebarOpen: false, sidebarCollapsed: true });
    useAuthStore.setState({ user: null });
  });
});

describe('Sidebar — drawer overlay-stack membership (15-g P2-7)', () => {
  it('registers the drawer while open and unregisters on close', () => {
    renderSidebar();
    expect(overlayStack.isEmpty()).toBe(true);
    act(() => {
      useUiStore.getState().openSidebar();
    });
    expect(overlayStack.count()).toBe(1);
    expect(overlayStack.top()?.kind).toBe('sidebar-drawer');
    act(() => {
      useUiStore.getState().closeSidebar();
    });
    expect(overlayStack.isEmpty()).toBe(true);
  });

  it('unregisters on unmount while still open (no leaked layer)', () => {
    const { unmount } = renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    expect(overlayStack.count()).toBe(1);
    unmount();
    expect(overlayStack.isEmpty()).toBe(true);
  });

  it('Escape closes the drawer when it is the topmost layer', () => {
    renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    expect(overlayStack.isEmpty()).toBe(true);
  });

  it('Escape is owned by a layer opened ABOVE the drawer, not the drawer', () => {
    renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    // An anchored layer (dropdown/notification panel) registers above.
    overlayStack.register('test-layer-above', 'dropdown');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useUiStore.getState().sidebarOpen).toBe(true);
    overlayStack.unregister('test-layer-above');
  });
});

describe('Sidebar — Ctrl+B chord guard (15-e P1-4)', () => {
  it('toggles the desktop collapse when no overlay is open', () => {
    renderSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    pressChord();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    pressChord();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('is inert while any overlay layer is open (no toggle behind the scrim)', () => {
    renderSidebar();
    overlayStack.register('test-modal-layer', 'modal');
    pressChord();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    overlayStack.unregister('test-modal-layer');
    // The chord returns once the stack drains.
    pressChord();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('is inert while the mobile drawer itself is open', () => {
    renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    pressChord();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('still ignores the chord inside text fields', () => {
    renderSidebar();
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'b', ctrlKey: true });
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    input.remove();
  });
});

describe('Sidebar — drawer focus containment (5-B5, A4 P2-5)', () => {
  beforeEach(() => {
    // The drawer only exists on the ≤920px band; jsdom's default
    // matchMedia stub answers desktop. Claim the mobile band (same
    // override shape as the global installDefaults).
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('920'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    // Expanded rail: the collapse button is the FIRST focusable and
    // its label («طيّ القائمة») is distinct from the close button.
    useUiStore.setState({ sidebarOpen: false, sidebarCollapsed: false });
  });

  it('focus lands on the close button on open and returns to the opener on close', async () => {
    // A real opener element (the burger lives in Topbar, not rendered
    // in this suite — and jsdom cannot refocus <body> directly, which
    // is a jsdom quirk, not the contract: the restore must land focus
    // back on whatever opened the drawer).
    const opener = document.createElement('button');
    opener.textContent = 'الفتّاحة';
    document.body.appendChild(opener);
    opener.focus();
    renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    // Initial focus moved INTO the drawer (the Sheet contract) — A4
    // measured activeElement stuck on the burger before.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'إغلاق القائمة' })).toHaveFocus(),
    );
    act(() => {
      useUiStore.getState().closeSidebar();
    });
    // Restore-on-close: focus returns to the opener.
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('Tab from the last focusable wraps to the first — focus never escapes the scrim', async () => {
    renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'إغلاق القائمة' })).toHaveFocus(),
    );
    const logout = screen.getByRole('button', { name: 'تسجيل الخروج' });
    logout.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    // Wrapped to the first focusable inside the aside.
    expect(screen.getByRole('button', { name: 'طيّ القائمة' })).toHaveFocus();
  });

  it('Shift+Tab from the first focusable wraps to the last', async () => {
    renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    const collapse = screen.getByRole('button', { name: 'طيّ القائمة' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'إغلاق القائمة' })).toHaveFocus(),
    );
    collapse.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'تسجيل الخروج' })).toHaveFocus();
  });

  it('reclaims focus when a click parks it on <body> behind the scrim', async () => {
    renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'إغلاق القائمة' })).toHaveFocus(),
    );
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'طيّ القائمة' })).toHaveFocus();
  });

  it('a layer opened above the drawer owns Tab (topmost-only rule)', async () => {
    renderSidebar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'إغلاق القائمة' })).toHaveFocus(),
    );
    overlayStack.register('test-layer-above-drawer', 'dropdown');
    const logout = screen.getByRole('button', { name: 'تسجيل الخروج' });
    logout.focus();
    // The anchored layer above owns Tab: the drawer's cycle stays
    // silent and focus is not yanked (jsdom applies no native move).
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(logout).toHaveFocus();
    overlayStack.unregister('test-layer-above-drawer');
  });
});

describe('Topbar — burger reflects the drawer state (15-g P2-7)', () => {
  it('announces a closed drawer (aria-expanded=false, «فتح القائمة»)', () => {
    renderTopbar();
    const burger = screen.getByRole('button', { name: 'فتح القائمة' });
    expect(burger).toHaveAttribute('aria-expanded', 'false');
  });

  it('announces an open drawer (aria-expanded=true, «إغلاق القائمة»)', () => {
    renderTopbar();
    act(() => {
      useUiStore.getState().openSidebar();
    });
    const burger = screen.getByRole('button', { name: 'إغلاق القائمة' });
    expect(burger).toHaveAttribute('aria-expanded', 'true');
    act(() => {
      useUiStore.getState().closeSidebar();
    });
    expect(screen.getByRole('button', { name: 'فتح القائمة' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

describe('Topbar — user menu (15-g P2-9 header placement)', () => {
  it('renders the account header inside the panel but outside role=menu', async () => {
    act(() => {
      useAuthStore.setState({ user: STUDENT });
    });
    renderTopbar();
    const trigger = screen.getByRole('button', { name: 'ملف المستخدم' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu', { name: 'قائمة حساب المستخدم' });
    // The header (name + email card) is inside the positioned panel…
    const panel = menu.parentElement!;
    expect(panel).toHaveClass('dropdown');
    expect(panel.querySelector('.topbar-user-menu-header')?.textContent).toContain(
      'student@uoz.edu.ly',
    );
    // …but not owned by the menu element.
    expect(menu.querySelector('.topbar-user-menu-header')).toBeNull();
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThanOrEqual(2);
  });
});
