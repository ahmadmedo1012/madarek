import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useLogout } from '../../hooks/useAuth';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  badge?: { text: string; tone?: 'green' | 'red' };
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const STUDENT_NAV: NavGroup[] = [
  {
    label: 'الرئيسية',
    items: [
      { to: '/student/dashboard', icon: '⊞', label: 'لوحة التحكم' },
      { to: '/student/schedule', icon: '📅', label: 'جدولي الدراسي' },
      { to: '/student/courses', icon: '📚', label: 'مواد مسجلة' },
      { to: '/student/results', icon: '📊', label: 'نتائجي وتقييماتي' },
      { to: '/student/downloads', icon: '⬇️', label: 'تحميل المواد', badge: { text: 'جديد', tone: 'green' } },
    ],
  },
  {
    label: 'التعلم الذكي',
    items: [
      { to: '/student/ai', icon: '🤖', label: 'مساعد AI', badge: { text: 'AI', tone: 'green' } },
      { to: '/student/library', icon: '🏛️', label: 'المكتبة الإلكترونية' },
      { to: '/student/gamification', icon: '🏆', label: 'نقاطي ومكافآتي' },
      { to: '/student/skills', icon: '🎯', label: 'مهاراتي وشهاداتي' },
      { to: '/student/labs', icon: '🔬', label: 'المعامل الافتراضية' },
    ],
  },
  {
    label: 'المجتمع والتطوير',
    items: [
      { to: '/student/social', icon: '🌐', label: 'الشبكة الاجتماعية', badge: { text: 'جديد', tone: 'green' } },
      { to: '/student/mooc', icon: '🎓', label: 'كورسات خارجية' },
      { to: '/student/jobs', icon: '💼', label: 'فرص عمل' },
      { to: '/student/alerts', icon: '🔔', label: 'إشعاراتي' },
      { to: '/student/university', icon: '🏛️', label: 'جامعة الزاوية' },
    ],
  },
];

const TEACHER_NAV: NavGroup[] = [
  {
    label: 'لوحة التدريس',
    items: [
      { to: '/teacher/dashboard', icon: '⊞', label: 'لوحة الأستاذ' },
      { to: '/teacher/schedule', icon: '📅', label: 'جدول محاضراتي' },
      { to: '/teacher/attendance', icon: '✅', label: 'الحضور والغياب' },
      { to: '/teacher/grades', icon: '📝', label: 'درجات الطلاب' },
      { to: '/teacher/materials', icon: '📤', label: 'رفع المواد' },
    ],
  },
  {
    label: 'متابعة الطلاب',
    items: [
      { to: '/teacher/students', icon: '👨‍🎓', label: 'قائمة طلابي' },
      { to: '/teacher/performance', icon: '📈', label: 'أداء وتحليل' },
      { to: '/teacher/assignments', icon: '📋', label: 'واجبات واختبارات' },
      { to: '/teacher/messages', icon: '💬', label: 'رسائل الطلاب' },
    ],
  },
  {
    label: 'الأكاديمي',
    items: [
      { to: '/teacher/research', icon: '🔭', label: 'أبحاثي وترقيتي' },
      { to: '/teacher/ai', icon: '🤖', label: 'مساعد AI' },
      { to: '/teacher/library', icon: '🏛️', label: 'المكتبة' },
      { to: '/teacher/alerts', icon: '🔔', label: 'الإشعارات' },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: 'الإدارة العامة',
    items: [
      { to: '/admin/dashboard', icon: '⊞', label: 'لوحة الإدارة' },
      { to: '/admin/students', icon: '👨‍🎓', label: 'إدارة الطلاب' },
      { to: '/admin/teachers', icon: '👨‍🏫', label: 'إدارة الأساتذة' },
      { to: '/admin/faculties', icon: '🏛️', label: 'الكليات والأقسام' },
      { to: '/admin/courses', icon: '📚', label: 'إدارة المقررات' },
    ],
  },
  {
    label: 'التقارير والإحصاء',
    items: [
      { to: '/admin/analysis', icon: '📊', label: 'تحليل الأداء العام' },
      { to: '/admin/digital', icon: '💻', label: 'التحول الرقمي' },
      { to: '/admin/reports', icon: '📋', label: 'التقارير الرسمية' },
    ],
  },
  {
    label: 'النظام',
    items: [
      { to: '/admin/settings', icon: '⚙️', label: 'إعدادات المنصة' },
      { to: '/admin/alerts', icon: '🔔', label: 'الإشعارات' },
    ],
  },
];

const NAV_BY_ROLE: Record<AppRole, NavGroup[]> = {
  STUDENT: STUDENT_NAV,
  TEACHER: TEACHER_NAV,
  ADMIN: ADMIN_NAV,
};

const ROLE_LABELS: Record<AppRole, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'إداري',
};

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();

  if (!user) return null;

  const groups = NAV_BY_ROLE[user.role];
  const initials = user.avatarInitials ?? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">
          مدارك <span style={{ fontSize: 14, color: 'var(--purple)' }}>AI</span>
        </div>
        <div className="logo-sub">جامعة الزاوية · منصة التعليم الذكي</div>
      </div>

      <div className="role-tabs" aria-label="الدور النشط">
        {(['STUDENT', 'TEACHER', 'ADMIN'] as AppRole[]).map((r) => (
          <button
            key={r}
            type="button"
            className={`role-tab ${r === user.role ? 'on' : ''}`}
            disabled
            aria-pressed={r === user.role}
            title="يمكن تغيير الدور من قِبَل الإدارة فقط"
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <div className="nav-group" key={g.label}>
          <div className="nav-section-label">{g.label}</div>
          {g.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className={`nav-badge ${item.badge.tone === 'green' ? 'green' : ''}`}>
                  {item.badge.text}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-user">
        <div
          className="user-avatar"
          style={user.avatarColor ? { background: user.avatarColor } : undefined}
          aria-label="حساب المستخدم"
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name" title={`${user.firstName} ${user.lastName}`}>
            {user.firstName} {user.lastName}
          </div>
          <div className="user-role">{ROLE_LABELS[user.role]}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            logout.mutate();
            navigate('/auth', { replace: true });
          }}
          title="تسجيل الخروج"
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text3)',
            borderRadius: 6,
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        >
          خروج
        </button>
      </div>
    </aside>
  );
}

interface TopbarProps { title: ReactNode; rightSlot?: ReactNode }

export function Topbar({ title, rightSlot }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <input className="topbar-search" placeholder="بحث في المنصة..." type="text" aria-label="بحث" />
      {rightSlot ?? (
        <>
          <button type="button" className="topbar-btn">📤 رفع ملف</button>
          <NavLink to="/student/ai" className="topbar-btn primary">✨ اسأل الذكاء الاصطناعي</NavLink>
        </>
      )}
      <div className="notif-ring" aria-hidden />
    </header>
  );
}
