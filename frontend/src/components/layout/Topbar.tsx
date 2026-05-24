import type { ReactNode } from 'react';
import { Search, Bell, Menu, Sparkles } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { useUiStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';

interface TopbarProps {
  title: ReactNode;
  rightSlot?: ReactNode;
}

export function Topbar({ title, rightSlot }: TopbarProps) {
  const toggle = useUiStore((s) => s.toggleSidebar);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();
  const navigate = useNavigate();

  const aiPath = role === 'TEACHER' ? '/teacher/ai' : '/student/ai';
  const alertsPath =
    role === 'TEACHER' ? '/teacher/alerts' :
    role === 'ADMIN' ? '/admin/alerts' :
    role === 'QUALITY' ? '/quality/alerts' :
    '/student/alerts';
  const onAiPage = location.pathname.endsWith('/ai');
  const showAiButton = role !== 'ADMIN' && role !== 'QUALITY' && !onAiPage;

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
      </div>
    </header>
  );
}
