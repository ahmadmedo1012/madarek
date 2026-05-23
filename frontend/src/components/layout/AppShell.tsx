import { Outlet, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Sidebar, Topbar } from './Shell';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useMe } from '../../hooks/useAuth';
import { LoadingState } from '../primitives/States';

const PAGE_TITLES: Record<string, string> = {
  '/student/dashboard': 'لوحة التحكم',
  '/student/schedule': 'الجدول الدراسي',
  '/student/courses': 'المواد الدراسية',
  '/student/results': 'النتائج والتقييمات',
  '/student/ai': 'المساعد الذكي',
  '/student/library': 'المكتبة الإلكترونية',
  '/student/gamification': 'نقاط ومكافآت',
  '/student/skills': 'تطوير المهارات',
  '/student/labs': 'المعامل الافتراضية',
  '/student/social': 'الشبكة الاجتماعية',
  '/student/mooc': 'كورسات خارجية',
  '/student/jobs': 'فرص عمل',
  '/student/alerts': 'الإشعارات',
  '/student/downloads': 'تحميل المواد',
  '/student/university': 'جامعة الزاوية',
  '/teacher/dashboard': 'لوحة الأستاذ',
  '/teacher/schedule': 'جدول محاضراتي',
  '/teacher/attendance': 'الحضور والغياب',
  '/teacher/grades': 'درجات الطلاب',
  '/teacher/materials': 'رفع المواد',
  '/teacher/students': 'قائمة طلابي',
  '/teacher/performance': 'أداء وتحليل',
  '/teacher/assignments': 'واجبات واختبارات',
  '/teacher/messages': 'رسائل الطلاب',
  '/teacher/research': 'أبحاثي وترقيتي',
  '/admin/dashboard': 'لوحة الإدارة',
  '/admin/students': 'إدارة الطلاب',
  '/admin/teachers': 'إدارة الأساتذة',
  '/admin/faculties': 'الكليات والأقسام',
  '/admin/courses': 'إدارة المقررات',
  '/admin/analysis': 'تحليل الأداء العام',
  '/admin/digital': 'التحول الرقمي',
  '/admin/reports': 'التقارير الرسمية',
  '/admin/settings': 'إعدادات المنصة',
};

export function AppShell({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'مدارك AI';
  return (
    <>
      <Sidebar />
      <main className="main">
        <Topbar title={title} />
        <div className="content">{children ?? <Outlet />}</div>
      </main>
    </>
  );
}

export function ProtectedRoute({ allow }: { allow?: AppRole[] }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Wait for persist hydration so we don't briefly redirect to /auth on refresh.
  if (!isHydrated) return <LoadingState />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role)) {
    const home: Record<AppRole, string> = {
      STUDENT: '/student/dashboard',
      TEACHER: '/teacher/dashboard',
      ADMIN: '/admin/dashboard',
    };
    return <Navigate to={home[user.role]} replace />;
  }

  return <Outlet />;
}

/** Wrapper that re-fetches the current user once on mount; useful as a soft sanity check. */
export function HydrateMe() {
  useMe();
  return null;
}
