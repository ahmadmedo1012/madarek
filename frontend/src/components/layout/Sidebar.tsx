import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Icon } from '../Icon';
import { BrandMark } from '../BrandMark';
import { UserAvatar } from '../primitives';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../../stores/auth.store';
import { useLogout, useMe } from '../../hooks/useAuth';
import { useUiStore } from '../../stores/ui.store';
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

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Reflect collapse state on the shell so the grid track resizes.
  // We toggle on documentElement so any descendent (topbar, etc.) can read it.
  useEffect(() => {
    const root = document.documentElement;
    if (sidebarCollapsed) root.setAttribute('data-sidebar-collapsed', '');
    else root.removeAttribute('data-sidebar-collapsed');
  }, [sidebarCollapsed]);

  // Keyboard shortcut — Cmd/Ctrl+B toggles the sidebar (Notion-style).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        // Don't capture inside text inputs / contenteditable.
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
          <button
            type="button"
            className="sidebar-collapse-btn hide-on-mobile"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'توسعة القائمة' : 'طيّ القائمة'}
            title={sidebarCollapsed ? 'توسعة القائمة (Ctrl+B)' : 'طيّ القائمة (Ctrl+B)'}
          >
            <Icon icon={sidebarCollapsed ? ChevronsLeft : ChevronsRight} size={14} />
          </button>
        </div>

        {groups.map((g) => (
          <div className="nav-group" key={g.label}>
            <div className="nav-section-label">{g.label}</div>
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}
                onClick={closeSidebar}
                title={sidebarCollapsed ? item.label : undefined}
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
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <ThemeToggle />
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
