import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { Icon } from '../Icon';
import { BrandMark } from '../BrandMark';
import { UserAvatar } from '../primitives';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../../stores/auth.store';
import { useLogout } from '../../hooks/useAuth';
import { useUiStore } from '../../stores/ui.store';
import { NAV_BY_ROLE, ROLE_LABELS } from '../../lib/nav';

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const logout = useLogout();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (!user) return null;
  const groups = NAV_BY_ROLE[user.role];
  const initials = user.avatarInitials ?? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  return (
    <>
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="القائمة الرئيسية">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <BrandMark size={32} />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">
              مدارك
            </div>
            <div className="sidebar-brand-sub">التعليم الذكي</div>
          </div>
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
          <div className="sidebar-user">
            <UserAvatar
              initials={initials}
              color={user.avatarColor ?? undefined}
              size={32}
            />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={`${user.firstName} ${user.lastName}`}>
                {user.firstName} {user.lastName}
              </div>
              <div className="sidebar-user-role">{ROLE_LABELS[user.role]}</div>
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
