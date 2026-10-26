/**
 * r305 (task 2-a) — the five role-nav maps + the two nav surfaces contract.
 *
 * The continuation-run audit suite. Where the older owned suites each pin
 * ONE axis (nav-coverage: orphans + student icon uniqueness + the 9-item
 * ceiling; nav-routes-consistency: nav.ts ↔ App.tsx; BottomNav-owner: the
 * OWNER branch; Sidebar-Topbar: drawer/chord chrome), this file pins the
 * r305 audit as a whole, over ALL five roles:
 *
 *   1. every destination in NAV_BY_ROLE *and* BOTTOM_NAV_BY_ROLE resolves
 *      to a real <Route> row in App.tsx (the static-source convention of
 *      nav-routes-consistency.test.tsx — same regexes, wider net: the
 *      bottom-nav destinations were never covered there);
 *   2. unique icons per role for ALL five maps (A4 P3-4) — the
 *      Building2 ×2 admin drift this round fixed is exactly the shape
 *      this catches (nav-coverage pinned the student map only);
 *   3. the r299 mirror contract: bottom-nav glyphs/destinations mirror
 *      the same role's sidebar map (Home + «الرئيسية» is the documented
 *      bottom-bar convention, exempt);
 *   4. every role map RENDERS: NAV_BY_ROLE[role] ↔ the Sidebar DOM
 *      (group labels, link census, ROLE_LABELS account chip);
 *   5. the single active marker: the sidebar writes exactly one
 *      `.nav-item.on` and never the `active` twin (A4 «كل مسار له علامة
 *      جانبية واحدة» — the vocabulary gate nav-active-vocabulary pins
 *      repo-wide, asserted here from the producer side);
 *   6. the r305 markup-pass state hooks on `.nav-group` (data-nav-group /
 *      data-collapsible / data-group-open) mirror the accordion truth —
 *      the selectors 2-d's r305-shell.css styles;
 *   7. BottomNav: data-role attr, first-four destinations + «المزيد»
 *      opens the sidebar drawer, hide-while-drawer-open, the
 *      `bottom-nav-item active` live family.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => ({ data: undefined }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { NAV_BY_ROLE, ROLE_HOME, ROLE_LABELS, type NavGroup } from '../../src/lib/nav';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { BottomNav, BOTTOM_NAV_BY_ROLE } from '../../src/components/layout/BottomNav';
import { useAuthStore, type AppRole, type AuthUser } from '../../src/stores/auth.store';
import { useUiStore } from '../../src/stores/ui.store';

/* ── static App.tsx route table (nav-routes-consistency convention) ── */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APP_SOURCE = readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
const ROUTE_PATHS = new Set(
  [...APP_SOURCE.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]!),
);

const ROLES = Object.keys(NAV_BY_ROLE) as AppRole[];
const itemsOf = (nav: NavGroup[]) => nav.flatMap((g) => g.items);

const users = Object.fromEntries(
  ROLES.map((role, i) => [
    role,
    {
      id: `u-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@zu.edu.ly`,
      firstName: 'مستخدم',
      lastName: `تجريبي ${i + 1}`,
      role,
    },
  ]),
) as Record<AppRole, AuthUser>;

function renderSidebarAt(pathname: string, role: AppRole) {
  act(() => {
    useAuthStore.setState({ user: users[role], isHydrated: true });
    useUiStore.setState({ sidebarOpen: false, sidebarCollapsed: true });
  });
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

function renderBottomNavAt(pathname: string, role: AppRole) {
  act(() => {
    useAuthStore.setState({ user: users[role], isHydrated: true });
    useUiStore.setState({ sidebarOpen: false, sidebarCollapsed: true });
  });
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  act(() => {
    useUiStore.setState({ sidebarOpen: false, sidebarCollapsed: true });
    useAuthStore.setState({
      user: null,
      memberships: [],
      currentInstitution: null,
      membershipRole: null,
    });
  });
});

afterEach(() => {
  act(() => {
    useUiStore.setState({ sidebarOpen: false, sidebarCollapsed: true });
    useAuthStore.setState({
      user: null,
      memberships: [],
      currentInstitution: null,
      membershipRole: null,
    });
  });
});

describe('r305 nav maps — the route tables are real (App.tsx resolvability)', () => {
  it('the extractions and map keys are non-vacuous (tripwires)', () => {
    expect(ROUTE_PATHS.size).toBeGreaterThanOrEqual(100);
    expect(ROLES).toEqual(['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER']);
    expect(Object.keys(ROLE_HOME)).toEqual(ROLES);
    expect(Object.keys(ROLE_LABELS)).toEqual(ROLES);
    expect(Object.keys(BOTTOM_NAV_BY_ROLE)).toEqual(ROLES);
  });

  it('every sidebar destination in every role map has a matching <Route> row', () => {
    for (const role of ROLES) {
      for (const item of itemsOf(NAV_BY_ROLE[role])) {
        expect(ROUTE_PATHS.has(item.to), `${role}: ${item.to}`).toBe(true);
      }
    }
  });

  it('every bottom-nav destination has a matching <Route> row', () => {
    for (const role of ROLES) {
      for (const item of BOTTOM_NAV_BY_ROLE[role]) {
        expect(ROUTE_PATHS.has(item.to), `${role}: ${item.to}`).toBe(true);
      }
    }
  });

  it('ROLE_HOME is each role\'s own sidebar destination (guard redirects land in-nav)', () => {
    for (const role of ROLES) {
      const dests = itemsOf(NAV_BY_ROLE[role]).map((i) => i.to);
      expect(dests, role).toContain(ROLE_HOME[role]);
      expect(ROUTE_PATHS.has(ROLE_HOME[role]), role).toBe(true);
    }
  });
});

describe('r305 nav maps — unique icons per role (A4 P3-4, all five roles)', () => {
  it('no role map repeats an icon (the admin Building2 ×2 drift is the regression shape)', () => {
    for (const role of ROLES) {
      const icons = itemsOf(NAV_BY_ROLE[role]).map((i) => i.icon);
      expect(new Set(icons).size, role).toBe(icons.length);
    }
  });

  it('no bottom-nav set repeats an icon', () => {
    for (const role of ROLES) {
      const icons = BOTTOM_NAV_BY_ROLE[role].map((i) => i.icon);
      expect(new Set(icons).size, role).toBe(icons.length);
    }
  });

  it('bottom-nav destinations are a subset of the same role\'s sidebar map (one nav grammar)', () => {
    for (const role of ROLES) {
      const dests = new Set(itemsOf(NAV_BY_ROLE[role]).map((i) => i.to));
      for (const item of BOTTOM_NAV_BY_ROLE[role]) {
        expect(dests.has(item.to), `${role}: ${item.to}`).toBe(true);
      }
    }
  });

  it('bottom-nav glyphs mirror nav.ts per the r299 rule — Home convention excepted', () => {
    for (const role of ROLES) {
      const sidebarByTo = new Map(itemsOf(NAV_BY_ROLE[role]).map((i) => [i.to, i]));
      for (const item of BOTTOM_NAV_BY_ROLE[role]) {
        if (item.label === 'الرئيسية') continue; // the uniform bottom-bar house convention
        const side = sidebarByTo.get(item.to);
        expect(side, `${role}: ${item.to} mirrored in the sidebar`).toBeDefined();
        expect(item.icon === side?.icon, `${role}: ${item.to} glyph`).toBe(true);
      }
    }
  });
});

describe('r305 nav maps — every role map renders (NAV_BY_ROLE ↔ Sidebar DOM)', () => {
  for (const role of ROLES) {
    it(`the ${role} map renders all groups, all items and the role label`, () => {
      const nav = NAV_BY_ROLE[role];
      const { container } = renderSidebarAt('/', role);

      // R320 override (§B rename, c1-RENAME): the ADMIN group label is
      // «المسجل العام» — the SAME string as the role's account-chip
      // label (one name for the role everywhere), so getByText would
      // see two elements. The group labels are asserted as an exact
      // ordered census on their own section-label class instead.
      const sectionLabels = [...container.querySelectorAll('.nav-section-label')].map(
        (el) => el.textContent,
      );
      expect(sectionLabels, `${role}: group label census`).toEqual(nav.map((g) => g.label));
      // Icon rail state (sidebarCollapsed default true) → the accordion is
      // off and every item renders as a link. The brand mark is an <img>,
      // the footer rows are buttons — the links ARE the nav census.
      expect(screen.getAllByRole('link')).toHaveLength(itemsOf(nav).length);
      // The account chip speaks the ROLE_LABELS contract.
      // R320 override (§B rename, c1-RENAME): the ADMIN role label is
      // «المسجل العام» — the SAME string as the ADMIN nav group label
      // (one name for the role everywhere), so getByText sees two
      // elements. The chip is asserted on its own class instead; the
      // group-label census above already pins every g.label.
      const chips = container.querySelectorAll('.sidebar-user-role');
      expect(chips, `${role}: one account chip`).toHaveLength(1);
      expect(chips[0], `${role}: chip speaks ROLE_LABELS`).toHaveTextContent(ROLE_LABELS[role]);
      // The r305 markup pass marks every group for the shell CSS.
      expect(container.querySelectorAll('[data-nav-group]')).toHaveLength(nav.length);
    });
  }
});

describe('r305 nav maps — the single active marker (A4: كل مسار له علامة جانبية واحدة)', () => {
  it('an exact route lights exactly one `.nav-item.on` — and never the `active` twin', () => {
    const { container } = renderSidebarAt('/student/library', 'STUDENT');
    const on = container.querySelectorAll('.nav-item.on');
    expect(on).toHaveLength(1);
    expect(on[0]!).toHaveAttribute('href', '/student/library');
    // The sidebar's active vocabulary is `on` only (nav-active-vocabulary's
    // producer rule, asserted here from the rendered DOM).
    expect(container.querySelectorAll('.nav-item.active')).toHaveLength(0);
  });

  it('a nested detail path keeps exactly one marker (the section row)', () => {
    // /colleges/leaderboard has no nav row — the /colleges section row is
    // its one sidebar marker (the NavLink prefix rule).
    const { container } = renderSidebarAt('/colleges/leaderboard', 'STUDENT');
    const on = container.querySelectorAll('.nav-item.on');
    expect(on).toHaveLength(1);
    expect(on[0]!).toHaveAttribute('href', '/colleges');
  });
});

describe('r305 nav maps — accordion state hooks (the 2-d styling surface)', () => {
  // Desktop expanded sidebar (sidebarCollapsed=false, drawer band off):
  // the accordion applies to `collapsed: true` groups. The DOM exposes the
  // derived state twice — aria-expanded on the toggle (the a11y truth) and
  // data-collapsible/data-group-open on .nav-group (r305 selector hooks).
  function renderExpandedAt(pathname: string) {
    act(() => {
      useAuthStore.setState({ user: users.STUDENT, isHydrated: true });
      useUiStore.setState({ sidebarOpen: false, sidebarCollapsed: false });
    });
    return render(
      <MemoryRouter initialEntries={[pathname]}>
        <Sidebar />
      </MemoryRouter>,
    );
  }

  it('collapsed groups render disclosure toggles with truthful aria-expanded + the data hooks', () => {
    renderExpandedAt('/');
    const toggle = screen.getByRole('button', { name: 'التطوير والتقدّم' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const group = toggle.closest('.nav-group')!;
    expect(group).toHaveAttribute('data-collapsible', 'true');
    expect(group).toHaveAttribute('data-group-open', 'false');
    // The derived default for an inactive collapsed group is closed.
    expect(screen.queryByRole('link', { name: 'التطوير الذاتي' })).toBeNull();
  });

  it('a collapsed group auto-expands while its route is the active page', () => {
    renderExpandedAt('/student/labs');
    const toggle = screen.getByRole('button', { name: 'المعامل والتقنيات' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.closest('.nav-group')!).toHaveAttribute('data-group-open', 'true');
    // The active marker must never hide behind a collapsed header.
    expect(screen.getByRole('link', { name: 'المعامل الافتراضية' })).toHaveClass('on');
    // Sibling collapsed groups stay closed.
    expect(screen.queryByRole('link', { name: 'التطوير الذاتي' })).toBeNull();
  });

  it('a user toggle is sticky — it beats the derived default (and updates the hooks)', () => {
    renderExpandedAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'التطوير والتقدّم' }));
    const toggle = screen.getByRole('button', { name: 'التطوير والتقدّم' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.closest('.nav-group')!).toHaveAttribute('data-group-open', 'true');
    expect(screen.getByRole('link', { name: 'التطوير الذاتي' })).toBeInTheDocument();
  });
});

describe('r305 nav maps — BottomNav (destinations, «المزيد», drawer, active family)', () => {
  it('renders data-role + the first four map destinations + the drawer trigger, all five roles', () => {
    for (const role of ROLES) {
      const { unmount } = renderBottomNavAt('/', role);
      const nav = screen.getByRole('navigation', { name: 'التنقّل السريع' });
      expect(nav).toHaveAttribute('data-role', role.toLowerCase());
      const hrefs = within(nav)
        .getAllByRole('link')
        .map((l) => l.getAttribute('href'));
      expect(hrefs, role).toEqual(BOTTOM_NAV_BY_ROLE[role].slice(0, 4).map((i) => i.to));
      expect(within(nav).getByRole('button', { name: 'المزيد — فتح القائمة الكاملة' })).toHaveAttribute(
        'aria-haspopup',
        'true',
      );
      unmount();
    }
  });

  it('«المزيد» opens the sidebar drawer (the fifth curated slot keeps its drawer home)', () => {
    renderBottomNavAt('/', 'STUDENT');
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'المزيد — فتح القائمة الكاملة' }));
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  it('the bar hides while the drawer is open (no stacking)', () => {
    act(() => {
      useAuthStore.setState({ user: users.STUDENT, isHydrated: true });
      useUiStore.setState({ sidebarOpen: true, sidebarCollapsed: true });
    });
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('navigation', { name: 'التنقّل السريع' })).toBeNull();
  });

  it('the active destination uses the `bottom-nav-item active` live family — one marker', () => {
    const { container } = renderBottomNavAt('/student/ai', 'STUDENT');
    const active = container.querySelectorAll('.bottom-nav-item.active');
    expect(active).toHaveLength(1);
    expect(active[0]!).toHaveAttribute('href', '/student/ai');
    // The sidebar twin stays out of the bar's vocabulary.
    expect(container.querySelectorAll('.bottom-nav-item.on')).toHaveLength(0);
  });
});
