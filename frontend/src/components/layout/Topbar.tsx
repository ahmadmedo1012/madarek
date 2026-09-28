import type { ReactNode } from 'react';
import { useState, useRef } from 'react';
import { Menu, Sparkles, LogOut, User as UserIcon, Sun, Moon, Search } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { UserAvatar } from '../primitives';
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
  /** Opens the ⌘K command palette — the mobile-band search surface
   *  (4-A2 P1-3): the search pill is display:none ≤920px, so the
   *  topbar's search icon button and the "/" chord both route here. */
  onOpenCommandPalette?: () => void;
}

/** Student scope chip — the college name next to the page title.
 *
 * Lives in its own component so `useMyProfile` (GET /me/profile)
 * only fires for the one role that renders the chip (11-e P1-4):
 * the query used to run for every role even though TEACHER/ADMIN/
 * QUALITY/OWNER never read it — four roles paying a likely-403
 * request per shell mount. The hook itself is ungated
 * (hooks/useResources.ts is 12-9's), so the gate is structural. */
function StudentScopeChip() {
  const profileQ = useMyProfile();
  const name = profileQ.data?.student?.faculty?.name ?? null;
  if (!name) return null;
  return (
    <span className="topbar-scope" title={`الكلّيّة: ${name}`}>
      {name}
    </span>
  );
}

export function Topbar({ title, rightSlot, scrolled = false, onOpenCommandPalette }: TopbarProps) {
  const toggle = useUiStore((s) => s.toggleSidebar);
  // 15-g P2-7: the burger must REFLECT the drawer state — an
  // always-«فتح» label hid the open/closed state from screen readers.
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const resolved = resolveTheme(themeMode);
  const location = useLocation();
  const navigate = useNavigate();
  const logoutM = useLogout();
  // PRD: students see their college as a quick scope indicator.
  // `/me/profile` is student-only — see StudentScopeChip above for why
  // the request must not fire for the other four roles.
  const meQ = useMe();
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
        aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={sidebarOpen}
      >
        <Icon icon={Menu} size={18} />
      </button>

      {/* 5-B5: tabIndex=-1 makes this the focus-rescue target after
          route changes that orphan focus (AppShell effect) — programmatic
          focus only, never a Tab stop. The title attribute carries the
          full name when the mobile band clamps it to two lines (A4 P3-8:
          no truncation without a tooltip). */}
      <div
        className="topbar-title"
        tabIndex={-1}
        title={typeof title === 'string' ? title : undefined}
      >
        {title}
        {role === 'STUDENT' && <StudentScopeChip />}
        {scopeFacultyName && (
          <span className="topbar-scope" title={`نطاق الإدارة: ${scopeFacultyName}`}>
            {role === 'QUALITY' ? 'أخصائي جودة كلّيّة' : 'إداري كلّيّة'} · {scopeFacultyName}
          </span>
        )}
      </div>

      <GlobalSearch onOpenCommandPalette={onOpenCommandPalette} />

      <div className="topbar-actions">
        {/* Mobile-band search entry point (4-A2 P1-3): the pill is
            display:none ≤920px, so phones had ZERO search access. The
            button opens the command palette — the same surface ⌘K
            opens — which carries the full combobox search + quick
            nav actions. Hidden ≥921px where the pill lives. */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="topbar-search-toggle"
            onClick={onOpenCommandPalette}
            aria-label="البحث والأوامر"
            title="البحث والأوامر (Ctrl+K)"
          >
            <Icon icon={Search} size={18} />
          </button>
        )}
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
              {/* 21-c (A12 P1-2, spillover): was a hand-rolled .avatar
                  span — white initials on the un-gated DB avatarColor
                  (3.21:1 on #4F8EF7, the audit's measured topbar pair).
                  The UserAvatar primitive luminance-gates the ink; the
                  no-color fallback keeps the accent + --accent-fg pair. */}
              <UserAvatar initials={initials} size={30} color={user.avatarColor ?? undefined} />
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
              header={
                <div className="topbar-user-menu-header">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xxs font-mono text-subtle" style={{ marginTop: 2 }}>
                    {user.email}
                  </div>
                </div>
              }
            >
              {profilePath && (
                <DropdownItem onSelect={() => { setMenuOpen(false); navigate(profilePath); }}>
                  <Icon icon={UserIcon} size={14} />
                  ملفي الشخصي
                </DropdownItem>
              )}
              {/* 4-A2 P2-10: the theme item used to leave the menu
                  open (aria-expanded stuck true) while the sibling
                  items closed — match their behavior. */}
              <DropdownItem onSelect={() => { setMenuOpen(false); setThemeMode(resolved === 'dark' ? 'light' : 'dark'); }}>
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

