import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, Sparkles, LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { useUiStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore, resolveTheme } from '../../stores/theme.store';
import { useLogout } from '../../hooks/useAuth';

interface TopbarProps {
  title: ReactNode;
  rightSlot?: ReactNode;
}

export function Topbar({ title, rightSlot }: TopbarProps) {
  const toggle = useUiStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const resolved = resolveTheme(themeMode);
  const location = useLocation();
  const navigate = useNavigate();
  const logoutM = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const aiPath = role === 'TEACHER' ? '/teacher/ai' : '/student/ai';
  const alertsPath =
    role === 'TEACHER' ? '/teacher/alerts' :
    role === 'ADMIN' ? '/admin/alerts' :
    role === 'QUALITY' ? '/quality/alerts' :
    '/student/alerts';
  const onAiPage = location.pathname.endsWith('/ai');
  const showAiButton = role !== 'ADMIN' && role !== 'QUALITY' && !onAiPage;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const initials =
    user?.avatarInitials ?? `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  const profilePath = role === 'STUDENT' ? '/student/profile' : null;

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-mobile-toggle"
        onClick={toggle}
        aria-label="فتح القائمة"
      >
        <Icon icon={Menu} size={18} />
      </button>

      <div className="topbar-title">{title}</div>

      <label className="topbar-search">
        <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
        <input type="text" placeholder="بحث في المنصة…" aria-label="بحث" />
        <span className="topbar-search-shortcut">/</span>
      </label>

      <div className="topbar-actions">
        {rightSlot ?? (showAiButton && (
          <NavLink to={aiPath} className="btn primary sm" title="اسأل الذكاء الاصطناعي">
            <Icon icon={Sparkles} size={13} />
            <span className="hide-on-mobile">اسأل AI</span>
          </NavLink>
        ))}
        <button
          type="button"
          className="topbar-notif"
          aria-label="الإشعارات"
          onClick={() => navigate(alertsPath)}
        >
          <Icon icon={Bell} size={16} />
          <span className="topbar-notif-badge" aria-hidden>4</span>
        </button>

        {user && (
          <div className="topbar-user" ref={menuRef}>
            <button
              type="button"
              className="topbar-user-trigger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="ملف المستخدم"
            >
              <span
                className="avatar"
                style={{
                  width: 30, height: 30, fontSize: 12,
                  ...(user.avatarColor ? { background: user.avatarColor } : {}),
                }}
              >
                {initials}
              </span>
              <span className="topbar-user-name hide-on-mobile">
                {user.firstName}
              </span>
            </button>

            {menuOpen && (
              <div className="topbar-user-menu" role="menu">
                <div className="topbar-user-menu-header">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xxs font-mono text-subtle" style={{ marginTop: 2 }}>
                    {user.email}
                  </div>
                </div>
                {profilePath && (
                  <button
                    type="button"
                    className="topbar-user-menu-item"
                    onClick={() => { setMenuOpen(false); navigate(profilePath); }}
                  >
                    <Icon icon={UserIcon} size={14} />
                    ملفي الشخصي
                  </button>
                )}
                <button
                  type="button"
                  className="topbar-user-menu-item"
                  onClick={() => setThemeMode(resolved === 'dark' ? 'light' : 'dark')}
                >
                  <Icon icon={resolved === 'dark' ? Sun : Moon} size={14} />
                  {resolved === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
                </button>
                <div className="topbar-user-menu-divider" />
                <button
                  type="button"
                  className="topbar-user-menu-item danger"
                  onClick={() => { setMenuOpen(false); logoutM.mutate(); navigate('/'); }}
                >
                  <Icon icon={LogOut} size={14} />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

