import { Outlet, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { useThemeSync } from './ThemeToggle';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useI18nStore } from '../../stores/i18n.store';
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
  '/student/matrix': 'المصفوفة التعليمية',
  '/student/research': 'بحوثي العلمية',
  '/student/profile': 'ملفي الشخصي',
  '/student/webinars': 'الندوات وورش العمل',
  '/student/exams': 'تحليل الامتحانات',
  '/student/live': 'البث المباشر',
  '/student/payment': 'الشؤون المالية',
  '/student/map': 'خريطة الحرم الجامعي',
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
  '/vision': 'الابتكارات القادمة',
  '/training': 'التطوير الذاتي',
  '/achievements': 'الإنجازات والشهادات',
  '/community': 'المجتمع الجامعي',
  '/teacher/community': 'المجتمع الجامعي',
  '/admin/community': 'المجتمع الجامعي',
  '/admin/sync': 'مزامنة الجامعة',
  '/quality/community': 'المجتمع الجامعي',
  '/teacher/intelligence': 'الذكاء الأكاديمي',
  '/teacher/profile': 'الملف الأكاديمي',
  '/teacher/live': 'إدارة البث المباشر',
  '/teacher/labs': 'المعامل الافتراضية',
  '/student/online-exams': 'الاختبارات الإلكترونية',
  '/quality/exam-moderation': 'مراجعة الاختبارات',
  '/owner/dashboard': 'لوحة التحكم الرئيسية',
  '/owner/users': 'إدارة المستخدمين',
  '/owner/activity': 'سجل النشاط',
  '/owner/content': 'المحتوى والعلامة التجارية',
  '/owner/system': 'النظام والتشغيل',
  '/owner/education': 'النظرة التعليمية',
  '/owner/realtime': 'المراقبة الحية',
  '/owner/ai': 'مركز الذكاء الاصطناعي',
  '/owner/alerts': 'التنبيهات التشغيلية',
  '/owner/governance': 'الحوكمة المتقدمة',
};

/** Resolve a topbar title for any path, including dynamic routes. */
function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]!;
  if (/^\/student\/courses\/[^/]+$/.test(pathname)) return 'تفاصيل المقرر';
  if (/^\/student\/lectures\/[^/]+$/.test(pathname)) return 'مشغّل المحاضرة';
  if (/^\/vision\/[^/]+$/.test(pathname)) return 'ابتكار قادم';
  if (/^\/document\/[^/]+$/.test(pathname)) return 'عارض المستندات';
  if (/^\/training\/[^/]+\/lesson\/[^/]+$/.test(pathname)) return 'درس تدريبي';
  if (/^\/training\/[^/]+$/.test(pathname)) return 'مسار تدريبي';
  if (/^\/teacher\/intelligence\/[^/]+$/.test(pathname)) return 'تفاصيل المقرر';
  if (/^\/student\/online-exams\/[^/]+$/.test(pathname)) return 'اختبار جارٍ';
  if (/^\/admin\/permissions\/[^/]+$/.test(pathname)) return 'إدارة الصلاحيات';
  return 'مدارك';
}

export function AppShell({ children }: { children?: ReactNode }) {
  useThemeSync();
  const location = useLocation();
  const title = resolveTitle(location.pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const locale = useI18nStore((s) => s.locale);
  const dir = useI18nStore((s) => s.dir);

  // Sync document dir and lang with i18n locale
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale, dir]);

  // Toggle topbar scrolled state when content scrolls past 4px
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(el.scrollTop > 4);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Reset scroll position on route change so each page starts at top
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setScrolled(false);
  }, [location.pathname]);

  return (
    <>
      <Sidebar />
      <main className="main">
        <Topbar title={title} scrolled={scrolled} />
        <div className="content" ref={contentRef}>
          <div className="content-inner">{children ?? <Outlet />}</div>
        </div>
      </main>
      <BottomNav />
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
      OWNER: '/owner/dashboard',
    };
    return <Navigate to={home[user.role]} replace />;
  }
  return <Outlet />;
}

export function HydrateMe() {
  useMe();
  return null;
}
