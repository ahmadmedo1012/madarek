import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Menu, Sparkles, LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { useUiStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore, resolveTheme } from '../../stores/theme.store';
import { useLogout, useMe } from '../../hooks/useAuth';
import { useMyProfile } from '../../hooks/useResources';

interface TopbarProps {
  title: ReactNode;
  rightSlot?: ReactNode;
  scrolled?: boolean;
}

export function Topbar({ title, rightSlot, scrolled = false }: TopbarProps) {
  const toggle = useUiStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const resolved = resolveTheme(themeMode);
  const location = useLocation();
  const navigate = useNavigate();
  const logoutM = useLogout();
  // PRD: student should see their college as a quick scope indicator.
  // Only fetched for students — useMyProfile is no-op for other roles.
  const profileQ = useMyProfile();
  const meQ = useMe();
  const studentFacultyName = role === 'STUDENT' ? profileQ.data?.student?.faculty?.name ?? null : null;
  // Governance scope chip — ADMIN/QUALITY users may be university-wide (NULL)
  // or scoped to a single faculty (set). Surfacing this prevents
  // "which college am I admin of?" ambiguity at a glance.
  const scopeFacultyName = (role === 'ADMIN' || role === 'QUALITY')
    ? meQ.data?.scopeFaculty?.name ?? null
    : null;
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
    <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
      <button
        type="button"
        className="topbar-mobile-toggle"
        onClick={toggle}
        aria-label="فتح القائمة"
      >
        <Icon icon={Menu} size={18} />
      </button>

      <div className="topbar-title">
        {title}
        {studentFacultyName && (
          <span className="topbar-scope" title={`الكلية: ${studentFacultyName}`}>
            {studentFacultyName}
          </span>
        )}
        {scopeFacultyName && (
          <span className="topbar-scope" title={`نطاق الإدارة: ${scopeFacultyName}`}>
            {role === 'QUALITY' ? 'جودة كلية' : 'إداري كلية'} · {scopeFacultyName}
          </span>
        )}
      </div>

      <GlobalSearch />

      <div className="topbar-actions">
        {rightSlot ?? (showAiButton && (
          <NavLink to={aiPath} className="btn primary sm" title="اسأل الذكاء الاصطناعي">
            <Icon icon={Sparkles} size={13} />
            <span className="hide-on-mobile">اسأل AI</span>
          </NavLink>
        ))}
        <NotificationDropdown alertsPath={alertsPath} />

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

