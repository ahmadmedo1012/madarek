import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  BarChart3,
  Download,
  Bot,
  Library,
  Trophy,
  Target,
  FlaskConical,
  Globe,
  GraduationCap,
  Briefcase,
  Bell,
  Building2,
  Users,
  ClipboardCheck,
  ListChecks,
  Upload,
  TrendingUp,
  ClipboardList,
  MessageSquare,
  Microscope,
  School,
  CalendarDays,
  Wallet,
  FileText,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { Icon } from '../Icon';
import { UserAvatar } from '../primitives';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useLogout } from '../../hooks/useAuth';
import { useUiStore } from '../../stores/ui.store';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: { text: string; tone?: 'green' | 'red' };
}
interface NavGroup { label: string; items: NavItem[]; }

const STUDENT_NAV: NavGroup[] = [
  {
    label: 'الرئيسية',
    items: [
      { to: '/student/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
      { to: '/student/schedule', icon: Calendar, label: 'جدولي الدراسي' },
      { to: '/student/courses', icon: BookOpen, label: 'مواد مسجلة' },
      { to: '/student/results', icon: BarChart3, label: 'نتائجي وتقييماتي' },
      { to: '/student/downloads', icon: Download, label: 'تحميل المواد', badge: { text: 'جديد', tone: 'green' } },
    ],
  },
  {
    label: 'التعلم الذكي',
    items: [
      { to: '/student/ai', icon: Bot, label: 'مساعد AI', badge: { text: 'AI', tone: 'green' } },
      { to: '/student/library', icon: Library, label: 'المكتبة الإلكترونية' },
      { to: '/student/gamification', icon: Trophy, label: 'نقاطي ومكافآتي' },
      { to: '/student/skills', icon: Target, label: 'مهاراتي وشهاداتي' },
      { to: '/student/labs', icon: FlaskConical, label: 'المعامل الافتراضية' },
    ],
  },
  {
    label: 'المجتمع والتطوير',
    items: [
      { to: '/student/social', icon: Globe, label: 'الشبكة الاجتماعية', badge: { text: 'جديد', tone: 'green' } },
      { to: '/student/mooc', icon: GraduationCap, label: 'كورسات خارجية' },
      { to: '/student/jobs', icon: Briefcase, label: 'فرص عمل' },
      { to: '/student/alerts', icon: Bell, label: 'إشعاراتي' },
      { to: '/student/university', icon: Building2, label: 'جامعة الزاوية' },
    ],
  },
];

const TEACHER_NAV: NavGroup[] = [
  {
    label: 'لوحة التدريس',
    items: [
      { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'لوحة الأستاذ' },
      { to: '/teacher/schedule', icon: Calendar, label: 'جدول محاضراتي' },
      { to: '/teacher/attendance', icon: ClipboardCheck, label: 'الحضور والغياب' },
      { to: '/teacher/grades', icon: ListChecks, label: 'درجات الطلاب' },
      { to: '/teacher/materials', icon: Upload, label: 'رفع المواد' },
    ],
  },
  {
    label: 'متابعة الطلاب',
    items: [
      { to: '/teacher/students', icon: Users, label: 'قائمة طلابي' },
      { to: '/teacher/performance', icon: TrendingUp, label: 'أداء وتحليل' },
      { to: '/teacher/assignments', icon: ClipboardList, label: 'واجبات واختبارات' },
      { to: '/teacher/messages', icon: MessageSquare, label: 'رسائل الطلاب' },
    ],
  },
  {
    label: 'الأكاديمي',
    items: [
      { to: '/teacher/research', icon: Microscope, label: 'أبحاثي وترقيتي' },
      { to: '/teacher/ai', icon: Bot, label: 'مساعد AI' },
      { to: '/teacher/library', icon: Library, label: 'المكتبة' },
      { to: '/teacher/alerts', icon: Bell, label: 'الإشعارات' },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: 'الإدارة العامة',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة الإدارة' },
      { to: '/admin/students', icon: GraduationCap, label: 'إدارة الطلاب' },
      { to: '/admin/teachers', icon: School, label: 'إدارة الأساتذة' },
      { to: '/admin/faculties', icon: Building2, label: 'الكليات والأقسام' },
      { to: '/admin/courses', icon: BookOpen, label: 'إدارة المقررات' },
    ],
  },
  {
    label: 'التقارير والإحصاء',
    items: [
      { to: '/admin/analysis', icon: BarChart3, label: 'تحليل الأداء العام' },
      { to: '/admin/digital', icon: TrendingUp, label: 'التحول الرقمي' },
      { to: '/admin/reports', icon: FileText, label: 'التقارير الرسمية' },
    ],
  },
  {
    label: 'النظام',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'إعدادات المنصة' },
      { to: '/admin/alerts', icon: Bell, label: 'الإشعارات' },
    ],
  },
];

const NAV_BY_ROLE: Record<AppRole, NavGroup[]> = {
  STUDENT: STUDENT_NAV,
  TEACHER: TEACHER_NAV,
  ADMIN: ADMIN_NAV,
};
const ROLE_LABELS: Record<AppRole, string> = { STUDENT: 'طالب', TEACHER: 'أستاذ', ADMIN: 'إداري' };

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const logout = useLogout();
  const navigate = useNavigate();

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (!user) return null;
  const groups = NAV_BY_ROLE[user.role];
  const initials = user.avatarInitials ?? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  return (
    <>
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="القائمة الرئيسية">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">M</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">مدارك AI</div>
            <div className="sidebar-brand-sub">جامعة الزاوية</div>
          </div>
        </div>

        <div className="role-tabs" role="tablist" aria-label="الدور">
          {(['STUDENT', 'TEACHER', 'ADMIN'] as AppRole[]).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              className={`role-tab${r === user.role ? ' on' : ''}`}
              disabled
              aria-selected={r === user.role}
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
                className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}
                onClick={closeSidebar}
              >
                <span className="nav-icon">
                  <Icon icon={item.icon} size={17} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.badge && (
                  <span className={`nav-badge${item.badge.tone === 'green' ? ' green' : ''}`}>
                    {item.badge.text}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-user">
          <UserAvatar
            initials={initials}
            color={user.avatarColor ?? undefined}
            size={36}
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
      </aside>

      <div
        className={`sidebar-backdrop${sidebarOpen ? ' show' : ''}`}
        onClick={closeSidebar}
        aria-hidden
      />
    </>
  );
}
