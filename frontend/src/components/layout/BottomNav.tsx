/**
 * BottomNav — mobile-only quick-access bar.
 * r211 (Superlist re-skin): FOUR prioritized destinations + a «المزيد»
 * trigger that opens the full sidebar drawer (the designed sheet with
 * the role's grouped nav — not a second, competing sheet UI). Every
 * curated destination stays reachable; the drawer's accordion groups
 * and 44px rows ARE the more-sheet contract.
 * Hidden on tablet+desktop, and while the drawer itself is open.
 *
 * Routes verified against App.tsx so every link points to a real page.
 */
import { NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Bell,
  Bot,
  UserCircle,
  School,
  ListChecks,
  Radio,
  Users,
  Calendar,
  GraduationCap,
  ShieldCheck,
  Network,
  FileText,
  Activity,
  Brain,
  MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';

type BottomItem = { to: string; label: string; icon: LucideIcon };

/* STUDENT — 5 most-used:
   Home, Courses, AI, Alerts, Profile
   r299 (final-shell): destination icons mirror nav.ts — the single
   source the sidebar/drawer renders — so the same route never shows
   two glyphs on one screen (drawer + bottom-nav coexist ≤920px).
   Semantics fixed: Activity belonged to «سجل النشاط», Radio to the
   live monitor; School/FileText/ListChecks/UserCircle/Bot are the
   nav.ts glyphs for those routes. The HOME slot deliberately keeps
   the universal house + «الرئيسية» convention, uniform across all
   five roles (a bottom-bar convention, not a sidebar label copy). */
const STUDENT: BottomItem[] = [
  { to: '/student/dashboard', label: 'الرئيسية',  icon: Home       },
  { to: '/student/courses',   label: 'مقرراتي',   icon: BookOpen   },
  { to: '/student/ai',        label: 'المساعد',   icon: Bot        },
  { to: '/student/alerts',    label: 'الإشعارات', icon: Bell       },
  { to: '/student/profile',   label: 'حسابي',     icon: UserCircle },
];

/* TEACHER — 5 most-used: Home, Schedule, Students, Intelligence, Profile.
   Verified routes: /teacher/dashboard, /teacher/schedule, /teacher/students,
   /teacher/intelligence, /teacher/profile — no /teacher/courses route exists.
   5-B5 (A4 P3-3): labels use the sidebar label's head noun — «تحليلات»
   renamed the الذكاء الأكاديمي destination and «طلابي» renamed قائمة
   الطلاب; shortening is fine, renaming is not. */
const TEACHER: BottomItem[] = [
  { to: '/teacher/dashboard',    label: 'الرئيسية',   icon: Home       },
  { to: '/teacher/schedule',     label: 'الجدول',     icon: Calendar   },
  { to: '/teacher/students',     label: 'الطلاب',     icon: Users      },
  { to: '/teacher/intelligence', label: 'الذكاء',     icon: Brain      },
  { to: '/teacher/profile',      label: 'حسابي',      icon: UserCircle },
];

/* ADMIN — 5 most-used: Home, Faculties, Students, Teachers, Reports.
   Verified routes: /admin/dashboard, /admin/faculties, /admin/students,
   /admin/teachers, /admin/reports — no /admin/users or /admin/courses-only route.
   r305 (nav audit): the faculties slot mirrors nav.ts's Building2 ×2
   dedupe — the /admin/faculties console takes Network there, so the
   mirrored slot takes Network here (same route, one glyph per screen). */
const ADMIN: BottomItem[] = [
  { to: '/admin/dashboard',  label: 'الرئيسية',     icon: Home          },
  { to: '/admin/faculties',  label: 'الكلّيّات',      icon: Network       },
  { to: '/admin/students',   label: 'الطلاب',       icon: GraduationCap },
  { to: '/admin/teachers',   label: 'الأساتذة',     icon: School        },
  { to: '/admin/reports',    label: 'التقارير',     icon: FileText      },
];

/* QUALITY — 5 most-used: Home, Courses, Curriculum, Engagement, Reports.
   Verified routes: /quality/dashboard, /quality/courses, /quality/curriculum,
   /quality/engagement, /quality/reports. */
const QUALITY: BottomItem[] = [
  { to: '/quality/dashboard',  label: 'الرئيسية', icon: Home          },
  { to: '/quality/courses',    label: 'المقررات', icon: BookOpen      },
  { to: '/quality/curriculum', label: 'المناهج',  icon: ListChecks    },
  { to: '/quality/engagement', label: 'الانخراط', icon: Activity      },
  { to: '/quality/reports',    label: 'التقارير', icon: FileText      },
];

/* OWNER — 5 most-used: Dashboard, Users, Realtime, Notifications, Governance.
   Verified routes: /owner/dashboard, /owner/users, /owner/realtime,
   /owner/notifications, /owner/governance. NOTE: no /owner/profile route exists
   (unlike the other roles), so the 5th slot is the live monitor.
   r183-B6 (A4 P3-9): the alerts slot pointed at /owner/alerts (the
   OPERATIONAL board) while the topbar bell opens /owner/notifications
   (the personal inbox) — same intent, two destinations. The bottom-nav
   item now follows the bell (and every other role's «الإشعارات»
   grammar — student label included); the operational board keeps its
   sidebar home under «التنبيهات التشغيلية». */
const OWNER: BottomItem[] = [
  { to: '/owner/dashboard',     label: 'الرئيسية',  icon: Home        },
  { to: '/owner/users',         label: 'المستخدمون', icon: Users      },
  { to: '/owner/realtime',      label: 'المراقبة',  icon: Radio       },
  { to: '/owner/notifications', label: 'الإشعارات', icon: Bell        },
  { to: '/owner/governance',    label: 'الحوكمة',   icon: ShieldCheck },
];

/* r305 (nav audit, task 2-a): the per-role sets as ONE map — and the
   render path reads it directly (`BOTTOM_NAV_BY_ROLE[role] ?? STUDENT`),
   so the map the r305-nav-maps.test.tsx pins (5 destinations per role,
   every route real in App.tsx, icons mirroring nav.ts per the r299
   rule) IS the rendered source, not a mirror that can drift from a
   parallel ternary. `?? STUDENT` keeps the historical fallthrough for
   any non-union role value (stale persisted session) — the behavior
   the owner suite has always exercised. */
export const BOTTOM_NAV_BY_ROLE: Record<AppRole, BottomItem[]> = {
  STUDENT,
  TEACHER,
  ADMIN,
  QUALITY,
  OWNER,
};

export function BottomNav() {
  const role = useAuthStore((s) => s.user?.role);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const openSidebar = useUiStore((s) => s.openSidebar);
  const hidden = useHideOnScroll();

  if (!role) return null;
  // Hide while the sidebar drawer is open on phone — they would otherwise stack.
  if (sidebarOpen) return null;

  const items = BOTTOM_NAV_BY_ROLE[role] ?? STUDENT;

  return (
    <nav className={`bottom-nav${hidden ? ' is-hidden' : ''}`} aria-label="التنقّل السريع" data-role={role.toLowerCase()}>
      {/* r211: the first FOUR slots are the prioritized destinations;
          the fifth slot is always «المزيد» → the sidebar drawer, where
          every curated route keeps its grouped home. */}
      {items.slice(0, 4).map((item) => (
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
      <button
        type="button"
        className="bottom-nav-item"
        onClick={openSidebar}
        aria-label="المزيد — فتح القائمة الكاملة"
        aria-haspopup="true"
      >
        <span className="bottom-nav-icon">
          <Icon icon={MoreHorizontal} size={20} />
        </span>
        <span className="bottom-nav-label">المزيد</span>
      </button>
    </nav>
  );
}
