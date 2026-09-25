import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LogOut, ChevronsLeft, ChevronsRight, X, Compass } from 'lucide-react';
import { Icon } from '../Icon';
import { BrandMark } from '../BrandMark';
import { UserAvatar } from '../primitives';
import { Tooltip } from '../overlays';
import { useOverlayRegistration } from '../overlays/useOverlayRegistration';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../../stores/auth.store';
import { useLogout, useMe } from '../../hooks/useAuth';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { useUiStore } from '../../stores/ui.store';
import { acquireScrollLock, releaseScrollLock } from '../../lib/scrollLock';
import { overlayStack } from '../../lib/overlayStack';
import { NAV_BY_ROLE, displayRoleLabel } from '../../lib/nav';

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const me = useMe();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
  const logout = useLogout();
  const navigate = useNavigate();
  // Replay trigger writes the shared onboarding store directly — the
  // same store <OnboardingFlow /> renders from (audit 0-f P0-2 fix).
  const startOnboarding = useOnboardingStore((s) => s.start);

  // Register the mobile drawer as an overlay layer while open
  // (15-g P2-7 — the 'sidebar-drawer' kind was reserved in
  // lib/overlayStack.ts). Membership makes the drawer participate in
  // the platform's Escape choreography (see the Esc effect below) and
  // automatically inerts every document-level chord (⌘K, "/", Ctrl+B)
  // while the drawer owns the screen — the same contract as a modal.
  const drawerId = useOverlayRegistration(sidebarOpen, 'sidebar-drawer');

  // Lock body scroll only while the mobile drawer is open. Goes through
  // the shared ref-counted lock (lib/scrollLock, 11-e P2-12) so a drawer
  // cycle can no longer silently drop a modal's lock: the old inline
  // `body.style.overflow` write clobbered whatever useFocusTrap had saved.
  useEffect(() => {
    if (!sidebarOpen) return;
    acquireScrollLock('sidebar-drawer');
    return () => releaseScrollLock('sidebar-drawer');
  }, [sidebarOpen]);

  // Close mobile drawer on Escape so users always have an easy out.
  // 15-g P2-7: the drawer answers Escape ONLY as the topmost stack
  // layer and consumes the key (capture phase + stopImmediatePropagation
  // — the same mechanics useFocusTrap/Dropdown use), so an overlay
  // opened above the drawer owns the press and the drawer no longer
  // closes out from under a layer the user is interacting with.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!overlayStack.isTop(drawerId)) return;
      e.stopImmediatePropagation();
      closeSidebar();
    };
    document.addEventListener('keydown', onEsc, true);
    return () => document.removeEventListener('keydown', onEsc, true);
  }, [sidebarOpen, closeSidebar, drawerId]);

  // Reflect collapse state on the shell so the grid track resizes.
  // Toggled on documentElement so any descendent (topbar, etc.) can read it.
  useEffect(() => {
    const root = document.documentElement;
    if (sidebarCollapsed) root.setAttribute('data-sidebar-collapsed', '');
    else root.removeAttribute('data-sidebar-collapsed');
  }, [sidebarCollapsed]);

  // Cmd/Ctrl+B toggles the desktop collapse (Notion-style).
  // 15-e P1-4: inert while ANY overlay layer is open — the same guard
  // ⌘K uses (GlobalSearch) — so a keyboard user focused on a dialog
  // never toggles shell state behind the scrim. This now also covers
  // the mobile drawer itself (registered above): while the drawer is
  // open, the chord belongs to the overlay layer, not the shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        if (!overlayStack.isEmpty()) return;
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebarCollapsed]);

  if (!user) return null;
  const groups = NAV_BY_ROLE[user.role];
  const initials = user.avatarInitials ?? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  // Composite role label that surfaces leadership appointments inline.
  const position = me.data?.teacherProfile?.position ?? null;
  const positionFacultyName = me.data?.teacherProfile?.positionFaculty?.name ?? null;
  const roleLabel = displayRoleLabel(user.role, position, positionFacultyName);

  const cls = [
    'sidebar',
    sidebarOpen ? 'open' : '',
    sidebarCollapsed ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <aside className={cls} aria-label="القائمة الرئيسية" data-collapsed={sidebarCollapsed ? 'true' : 'false'}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <BrandMark size={24} />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">مدارك</div>
            <div className="sidebar-brand-sub">جامعة الزاوية</div>
          </div>
          {/* Desktop: collapse / expand */}
          <button
            type="button"
            className="sidebar-collapse-btn hide-on-mobile"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'توسعة القائمة' : 'طيّ القائمة'}
            title={sidebarCollapsed ? 'توسعة القائمة (Ctrl+B)' : 'طيّ القائمة (Ctrl+B)'}
          >
            <Icon icon={sidebarCollapsed ? ChevronsLeft : ChevronsRight} size={14} />
          </button>
          {/* Mobile: explicit close button (always visible inside drawer) */}
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={closeSidebar}
            aria-label="إغلاق القائمة"
            title="إغلاق"
          >
            <Icon icon={X} size={18} />
          </button>
        </div>

        {groups.map((g) => (
          <div className="nav-group" key={g.label}>
            <div className="nav-section-label">{g.label}</div>
            {g.items.map((item) => {
              const link = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}
                  onClick={closeSidebar}
                >
                  <span className="nav-icon">
                    <Icon icon={item.icon} size={17} />
                  </span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && (
                    <span className={`nav-badge${item.badge.tone ? ' ' + item.badge.tone : ''}`}>
                      {item.badge.text}
                    </span>
                  )}
                </NavLink>
              );
              /* Collapsed icon rail: label via the portaled Tooltip
                 primitive — hover-intent + instant on keyboard focus +
                 aria-describedby. Replaces the old title-attribute ::after
                 tooltip, which was clipped by the sidebar's
                 overflow-x:hidden and hover-only (audit 0-c P2-4). Tooltip
                 renders a fragment (no wrapper DOM), so the NavLink stays
                 a direct .nav-group child and the v16 drawer :nth-child
                 stagger keeps matching. */
              return sidebarCollapsed ? (
                <Tooltip key={`tip-${item.to}`} content={item.label}>
                  {link}
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        ))}

        <div className="sidebar-footer">
          <ThemeToggle />
          <button
            type="button"
            className="sidebar-tour-trigger"
            onClick={() => startOnboarding({ replay: true })}
            title="إعادة عرض الجولة"
            aria-label="إعادة عرض الجولة"
          >
            <Icon icon={Compass} size={14} />
            {!sidebarCollapsed && <span>عرض الجولة</span>}
          </button>
          <div className="sidebar-user" title={sidebarCollapsed ? `${user.firstName} ${user.lastName}` : undefined}>
            <UserAvatar
              initials={initials}
              color={user.avatarColor ?? undefined}
              size={32}
            />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={`${user.firstName} ${user.lastName}`}>
                {user.firstName} {user.lastName}
              </div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
            <button
              type="button"
              className="sidebar-logout"
              onClick={() => {
                logout.mutate();
                navigate('/auth', { replace: true });
              }}
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
            >
              <Icon icon={LogOut} size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div
        className={`sidebar-backdrop${sidebarOpen ? ' show' : ''}`}
        onClick={closeSidebar}
        aria-hidden
      />
    </>
  );
}
