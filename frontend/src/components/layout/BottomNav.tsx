/**
 * BottomNav — mobile-only quick-access bar.
 * Renders 5 most-used routes per role at the bottom of the viewport
 * with safe-area padding. Hidden on tablet+desktop via CSS.
 */
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Bell, User, Sparkles, ClipboardList, BarChart3, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';

type BottomItem = { to: string; label: string; icon: LucideIcon };

const STUDENT: BottomItem[] = [
  { to: '/student/dashboard', label: 'الرئيسية',  icon: Home       },
  { to: '/student/courses',   label: 'مقرراتي',   icon: BookOpen   },
  { to: '/student/ai',        label: 'المساعد',   icon: Sparkles   },
  { to: '/student/alerts',    label: 'الإشعارات', icon: Bell       },
  { to: '/student/profile',   label: 'حسابي',     icon: User       },
];

const TEACHER: BottomItem[] = [
  { to: '/teacher/dashboard',     label: 'الرئيسية',  icon: Home       },
  { to: '/teacher/courses',       label: 'مقرراتي',   icon: BookOpen   },
  { to: '/teacher/intelligence',  label: 'تحليلات',   icon: BarChart3  },
  { to: '/teacher/alerts',        label: 'الإشعارات', icon: Bell       },
  { to: '/teacher/profile',       label: 'حسابي',     icon: User       },
];

const ADMIN: BottomItem[] = [
  { to: '/admin/dashboard',  label: 'الرئيسية',  icon: Home          },
  { to: '/admin/users',      label: 'المستخدمون', icon: Users         },
  { to: '/admin/courses',    label: 'المقررات',  icon: BookOpen      },
  { to: '/admin/alerts',     label: 'الإشعارات', icon: Bell          },
  { to: '/admin/reports',    label: 'التقارير',  icon: ClipboardList },
];

const QUALITY: BottomItem[] = [
  { to: '/quality/dashboard',  label: 'الرئيسية',  icon: Home          },
  { to: '/quality/courses',    label: 'المقررات',  icon: BookOpen      },
  { to: '/quality/curriculum', label: 'المناهج',   icon: ClipboardList },
  { to: '/quality/alerts',     label: 'الإشعارات', icon: Bell          },
  { to: '/quality/reports',    label: 'التقارير',  icon: BarChart3     },
];

export function BottomNav() {
  const role = useAuthStore((s) => s.user?.role);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  if (!role) return null;
  // Hide while the sidebar drawer is open on phone — they would otherwise stack
  // on top of each other and feel cluttered.
  if (sidebarOpen) return null;

  const items =
    role === 'TEACHER' ? TEACHER :
    role === 'ADMIN'   ? ADMIN   :
    role === 'QUALITY' ? QUALITY :
    STUDENT;

  return (
    <nav className="bottom-nav" aria-label="التنقّل السريع">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav-item${isActive ? ' active' : ''}`
          }
        >
          <Icon icon={item.icon} size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
