import { Outlet, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useThemeSync } from './ThemeToggle';
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
  '/student/gamification': 'الإنجازات والنقاط',
  '/student/skills': 'المهارات والشهادات',
  '/student/labs': 'المعامل الافتراضية',
  '/student/social': 'الشبكة الاجتماعية',
  '/student/mooc': 'كورسات خارجية',
  '/student/jobs': 'فرص العمل',
  '/student/alerts': 'الإشعارات',
  '/student/downloads': 'مركز التحميلات',
  '/student/university': 'جامعة الزاوية',
  '/teacher/dashboard': 'لوحة الأستاذ',
  '/teacher/schedule': 'جدول المحاضرات',
  '/teacher/attendance': 'الحضور والغياب',
  '/teacher/grades': 'درجات الطلاب',
  '/teacher/materials': 'المواد الدراسية',
  '/teacher/students': 'قائمة الطلاب',
  '/teacher/performance': 'الأداء والتحليل',
  '/teacher/assignments': 'الواجبات والاختبارات',
  '/teacher/messages': 'الرسائل',
  '/teacher/research': 'البحث العلمي',
  '/admin/dashboard': 'لوحة الإدارة',
  '/admin/students': 'إدارة الطلاب',
  '/admin/teachers': 'إدارة الأساتذة',
  '/admin/faculties': 'الكليات والأقسام',
  '/admin/courses': 'إدارة المقررات',
  '/admin/analysis': 'تحليل الأداء',
  '/admin/digital': 'التحول الرقمي',
  '/admin/reports': 'التقارير',
  '/admin/settings': 'الإعدادات',
  '/quality/dashboard': 'لوحة الجودة',
  '/quality/courses': 'جودة المقررات',
  '/quality/professors': 'تقييم الأساتذة',
  '/quality/engagement': 'الانخراط والحضور',
  '/quality/reports': 'تقارير الجودة',
  '/quality/curriculum': 'مراجعة المناهج',
  '/quality/alerts': 'تنبيهات الجودة',
};

export function AppShell({ children }: { children?: ReactNode }) {
  useThemeSync();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'مدارك AI';
  return (
    <>
      <Sidebar />
      <main className="main">
        <Topbar title={title} />
        <div className="content">
          <div className="content-inner">{children ?? <Outlet />}</div>
        </div>
      </main>
    </>
  );
}

export function ProtectedRoute({ allow }: { allow?: AppRole[] }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isHydrated) return <LoadingState />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role)) {
    const home: Record<AppRole, string> = {
      STUDENT: '/student/dashboard',
      TEACHER: '/teacher/dashboard',
      ADMIN: '/admin/dashboard',
      QUALITY: '/quality/dashboard',
    };
    return <Navigate to={home[user.role]} replace />;
  }
  return <Outlet />;
}

export function HydrateMe() {
  useMe();
  return null;
}
