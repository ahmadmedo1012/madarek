import type { ReactNode } from 'react';
import { useState, useRef } from 'react';
import { Menu, Sparkles, LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { Dropdown, DropdownItem, DropdownSeparator } from '../overlays';
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
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);

  // Role-aware quick actions — OWNER previously fell through to the STUDENT
  // paths, which are blocked by ProtectedRoute for that role.
  const aiPath =
    role === 'TEACHER' ? '/teacher/ai' :
    role === 'OWNER'   ? '/owner/ai'   :
    '/student/ai';
  const alertsPath =
    role === 'TEACHER' ? '/teacher/alerts' :
    role === 'ADMIN'   ? '/admin/alerts'   :
    role === 'QUALITY' ? '/quality/alerts' :
    role === 'OWNER'   ? '/owner/alerts'   :
    '/student/alerts';
  const onAiPage = location.pathname.endsWith('/ai');
  const showAiButton = role !== 'ADMIN' && role !== 'QUALITY' && !onAiPage;

  // Close menu on outside click is handled by the Dropdown primitive
  // (click-outside + Esc + focus return + arrow-key navigation).

  const initials =
    user?.avatarInitials ?? `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;
  const profilePath =
    role === 'STUDENT' ? '/student/profile' :
    role === 'TEACHER' ? '/teacher/profile' :
    null;

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
          <div className="topbar-user">
            <button
              type="button"
              ref={userMenuTriggerRef}
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

            <Dropdown
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={userMenuTriggerRef}
              placement="end"
              ariaLabel="قائمة حساب المستخدم"
            >
              <div className="topbar-user-menu-header">
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xxs font-mono text-subtle" style={{ marginTop: 2 }}>
                  {user.email}
                </div>
              </div>
              {profilePath && (
                <DropdownItem onSelect={() => { setMenuOpen(false); navigate(profilePath); }}>
                  <Icon icon={UserIcon} size={14} />
                  ملفي الشخصي
                </DropdownItem>
              )}
              <DropdownItem onSelect={() => setThemeMode(resolved === 'dark' ? 'light' : 'dark')}>
                <Icon icon={resolved === 'dark' ? Sun : Moon} size={14} />
                {resolved === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onSelect={() => { setMenuOpen(false); logoutM.mutate(); navigate('/'); }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--c-rose-deep)' }}>
                  <Icon icon={LogOut} size={14} />
                  تسجيل الخروج
                </span>
              </DropdownItem>
            </Dropdown>
          </div>
        )}
      </div>
    </header>
  );
}

