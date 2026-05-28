import { Outlet, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { OasisWidget } from '../OasisWidget';
import { useThemeSync } from './ThemeToggle';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useI18nStore } from '../../stores/i18n.store';
import { useMe } from '../../hooks/useAuth';
import { LoadingState } from '../primitives/States';

/** Map from path to i18n key for the topbar title. */
const PAGE_TITLE_KEYS: Record<string, string> = {
  '/student/dashboard': 'nav.dashboard',
  '/student/schedule': 'nav.schedule',
  '/student/courses': 'nav.courses',
  '/student/results': 'nav.results',
  '/student/ai': 'nav.ai',
  '/student/library': 'nav.library',
  '/student/gamification': 'nav.gamification',
  '/student/skills': 'nav.skills',
  '/student/labs': 'nav.labs',
  '/student/social': 'nav.social',
  '/student/mooc': 'nav.mooc',
  '/student/jobs': 'nav.jobs',
  '/student/alerts': 'nav.alerts',
  '/student/downloads': 'nav.downloads',
  '/student/university': 'nav.university',
  '/student/matrix': 'nav.matrix',
  '/student/research': 'nav.research',
  '/student/profile': 'nav.profile',
  '/student/webinars': 'nav.webinars',
  '/student/exams': 'nav.exams',
  '/student/live': 'nav.live',
  '/student/payment': 'nav.payment',
  '/student/map': 'nav.map',
  '/teacher/dashboard': 'nav.teacher.dashboard',
  '/teacher/schedule': 'nav.teacher.schedule',
  '/teacher/attendance': 'nav.teacher.attendance',
  '/teacher/grades': 'nav.teacher.grades',
  '/teacher/materials': 'nav.teacher.materials',
  '/teacher/students': 'nav.teacher.students',
  '/teacher/performance': 'nav.teacher.performance',
  '/teacher/assignments': 'nav.teacher.assignments',
  '/teacher/messages': 'nav.teacher.messages',
  '/teacher/research': 'nav.teacher.research',
  '/admin/dashboard': 'nav.admin.dashboard',
  '/admin/students': 'nav.admin.students',
  '/admin/teachers': 'nav.admin.teachers',
  '/admin/faculties': 'nav.admin.faculties',
  '/admin/courses': 'nav.admin.courses',
  '/admin/analysis': 'nav.admin.analysis',
  '/admin/digital': 'nav.admin.digital',
  '/admin/reports': 'nav.admin.reports',
  '/admin/settings': 'nav.admin.settings',
  '/quality/dashboard': 'nav.quality.dashboard',
  '/quality/courses': 'nav.quality.courses',
  '/quality/professors': 'nav.quality.professors',
  '/quality/engagement': 'nav.quality.engagement',
  '/quality/reports': 'nav.quality.reports',
  '/quality/curriculum': 'nav.quality.curriculum',
  '/quality/alerts': 'nav.quality.alerts',
  '/vision': 'nav.vision',
  '/training': 'nav.training',
  '/achievements': 'nav.achievements',
  '/community': 'nav.community',
  '/teacher/community': 'nav.community',
  '/admin/community': 'nav.community',
  '/admin/sync': 'nav.admin.sync',
  '/quality/community': 'nav.community',
  '/teacher/intelligence': 'nav.teacher.intelligence',
  '/teacher/profile': 'nav.teacher.profile',
  '/teacher/live': 'nav.teacher.live',
  '/teacher/labs': 'nav.labs',
  '/student/online-exams': 'nav.online_exams',
  '/quality/exam-moderation': 'nav.quality.exam_moderation',
  '/owner/dashboard': 'nav.owner.dashboard',
  '/owner/users': 'nav.owner.users',
  '/owner/activity': 'nav.owner.activity',
  '/owner/content': 'nav.owner.content',
  '/owner/system': 'nav.owner.system',
  '/owner/education': 'nav.owner.education',
  '/owner/realtime': 'nav.owner.realtime',
  '/owner/ai': 'nav.owner.ai',
  '/owner/alerts': 'nav.owner.alerts',
  '/owner/governance': 'nav.owner.governance',
};

/** Resolve a topbar title for any path, including dynamic routes, using i18n. */
function resolveTitle(pathname: string, t: (key: string) => string): string {
  const key = PAGE_TITLE_KEYS[pathname];
  if (key) return t(key);
  if (/^\/student\/courses\/[^/]+$/.test(pathname)) return t('page.course_details');
  if (/^\/student\/lectures\/[^/]+$/.test(pathname)) return t('page.lecture_player');
  if (/^\/vision\/[^/]+$/.test(pathname)) return t('page.vision_detail');
  if (/^\/document\/[^/]+$/.test(pathname)) return t('page.document_viewer');
  if (/^\/training\/[^/]+\/lesson\/[^/]+$/.test(pathname)) return t('page.training_lesson');
  if (/^\/training\/[^/]+$/.test(pathname)) return t('page.training_track');
  if (/^\/teacher\/intelligence\/[^/]+$/.test(pathname)) return t('page.course_details');
  if (/^\/student\/online-exams\/[^/]+$/.test(pathname)) return t('page.exam_in_progress');
  if (/^\/admin\/permissions\/[^/]+$/.test(pathname)) return t('page.admin_permissions');
  return t('page.madarek');
}

export function AppShell({ children }: { children?: ReactNode }) {
  useThemeSync();
  const location = useLocation();
  const locale = useI18nStore((s) => s.locale);
  const dir = useI18nStore((s) => s.dir);
  const t = useI18nStore((s) => s.t);
  const title = resolveTitle(location.pathname, t);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);
  const [scrolled, setScrolled] = useState(false);
  const [bottomNavHidden, setBottomNavHidden] = useState(false);

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
        const currentTop = el.scrollTop;
        const lastTop = lastScrollTopRef.current;
        if (currentTop > lastTop + 10 && currentTop > 60) {
          setBottomNavHidden(true);
        } else if (currentTop < lastTop - 10) {
          setBottomNavHidden(false);
        }
        lastScrollTopRef.current = currentTop;
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
    setBottomNavHidden(false);
    lastScrollTopRef.current = 0;
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
      <BottomNav hidden={bottomNavHidden} />
      <OasisWidget />
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
