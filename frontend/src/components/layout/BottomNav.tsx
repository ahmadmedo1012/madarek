/**
 * BottomNav — mobile-only quick-access bar.
 * Renders 5 most-used real routes per role, hidden on tablet+desktop.
 * Hidden when sidebar drawer is open so they don't stack visually.
 *
 * Routes verified against App.tsx so every link points to a real page.
 */
import { NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Bell,
  User,
  Sparkles,
  ClipboardList,
  Users,
  Calendar,
  GraduationCap,
  ShieldCheck,
  Building2,
  FileText,
  Activity,
  Brain,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';

type BottomItem = { to: string; label: string; icon: LucideIcon };

/* STUDENT — 5 most-used:
   Home, Courses, AI, Alerts, Profile */
const STUDENT: BottomItem[] = [
  { to: '/student/dashboard', label: 'الرئيسية',  icon: Home       },
  { to: '/student/courses',   label: 'مقرراتي',   icon: BookOpen   },
  { to: '/student/ai',        label: 'المساعد',   icon: Sparkles   },
  { to: '/student/alerts',    label: 'الإشعارات', icon: Bell       },
  { to: '/student/profile',   label: 'حسابي',     icon: User       },
];

/* TEACHER — 5 most-used: Home, Schedule, Students, Intelligence, Profile.
   Verified routes: /teacher/dashboard, /teacher/schedule, /teacher/students,
   /teacher/intelligence, /teacher/profile — no /teacher/courses route exists. */
const TEACHER: BottomItem[] = [
  { to: '/teacher/dashboard',    label: 'الرئيسية',  icon: Home       },
  { to: '/teacher/schedule',     label: 'الجدول',    icon: Calendar   },
  { to: '/teacher/students',     label: 'طلابي',     icon: Users      },
  { to: '/teacher/intelligence', label: 'تحليلات',   icon: Brain      },
  { to: '/teacher/profile',      label: 'حسابي',     icon: User       },
];

/* ADMIN — 5 most-used: Home, Faculties, Students, Teachers, Reports.
   Verified routes: /admin/dashboard, /admin/faculties, /admin/students,
   /admin/teachers, /admin/reports — no /admin/users or /admin/courses-only route. */
const ADMIN: BottomItem[] = [
  { to: '/admin/dashboard',  label: 'الرئيسية',     icon: Home          },
  { to: '/admin/faculties',  label: 'الكليات',      icon: Building2     },
  { to: '/admin/students',   label: 'الطلاب',       icon: GraduationCap },
  { to: '/admin/teachers',   label: 'الأساتذة',     icon: Users         },
  { to: '/admin/reports',    label: 'التقارير',     icon: ClipboardList },
];

/* QUALITY — 5 most-used: Home, Courses, Curriculum, Engagement, Reports.
   Verified routes: /quality/dashboard, /quality/courses, /quality/curriculum,
   /quality/engagement, /quality/reports. */
const QUALITY: BottomItem[] = [
  { to: '/quality/dashboard',  label: 'الرئيسية', icon: Home          },
  { to: '/quality/courses',    label: 'المقررات', icon: BookOpen      },
  { to: '/quality/curriculum', label: 'المناهج',  icon: ShieldCheck   },
  { to: '/quality/engagement', label: 'الانخراط', icon: Activity      },
  { to: '/quality/reports',    label: 'التقارير', icon: FileText      },
];

export function BottomNav({ hidden }: { hidden?: boolean }) {
  const role = useAuthStore((s) => s.user?.role);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  if (!role) return null;
  // Hide while the sidebar drawer is open on phone — they would otherwise stack.
  if (sidebarOpen) return null;

  const items =
    role === 'TEACHER' ? TEACHER :
    role === 'ADMIN'   ? ADMIN   :
    role === 'QUALITY' ? QUALITY :
    STUDENT;

  return (
    <nav className="bottom-nav" aria-label="التنقّل السريع" data-role={role.toLowerCase()} data-hidden={hidden ? 'true' : undefined}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav-item${isActive ? ' active' : ''}`
          }
        >
          <span className="bottom-nav-icon">
            <Icon icon={item.icon} size={20} />
          </span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
