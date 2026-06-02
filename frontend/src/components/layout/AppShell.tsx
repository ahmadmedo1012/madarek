import { Outlet, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { useThemeSync } from './ThemeToggle';
import { useScrollRestoration } from './useScrollRestoration';
import { PageTransition } from '../motion';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useMe } from '../../hooks/useAuth';
import { useRoleAccent } from '../../hooks/useRoleAccent';
import { useThemeProfileSync } from '../../hooks/useThemeProfileSync';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { HydrationSplash } from '../HydrationSplash';

/* ───────────────────────────────────────────────────────────
   PAGE TITLES — single source of truth for topbar resolution
   ─────────────────────────────────────────────────────────── */
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
  '/admin/sync': 'مزامنة الجامعة',
  '/quality/dashboard': 'لوحة الجودة',
  '/quality/courses': 'جودة المقررات',
  '/quality/professors': 'تقييم الأساتذة',
  '/quality/engagement': 'الانخراط والحضور',
  '/quality/reports': 'تقارير الجودة',
  '/quality/curriculum': 'مراجعة المناهج',
  '/quality/alerts': 'تنبيهات الجودة',
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
  '/vision': 'الابتكارات القادمة',
  '/training': 'التطوير الذاتي',
  '/achievements': 'الإنجازات والشهادات',
  '/community': 'المجتمع الجامعي',
  '/colleges': 'كلّيّات الجامعة',
  '/colleges/leaderboard': 'منافسة الكلّيّات',
  '/competitions': 'المسابقات الأكاديميّة',
  '/teacher/community': 'المجتمع الجامعي',
  '/admin/community': 'المجتمع الجامعي',
  '/quality/community': 'المجتمع الجامعي',
  '/teacher/intelligence': 'الذكاء الأكاديمي',
  '/teacher/profile': 'الملف الأكاديمي',
  '/teacher/live': 'إدارة البث المباشر',
  '/teacher/labs': 'المعامل الافتراضية',
  '/student/online-exams': 'الاختبارات الإلكترونية',
};

const DYNAMIC_TITLES: Array<[RegExp, string]> = [
  [/^\/student\/courses\/[^/]+$/,            'تفاصيل المقرر'],
  [/^\/student\/lectures\/[^/]+$/,           'مشغّل المحاضرة'],
  [/^\/vision\/[^/]+$/,                      'ابتكار قادم'],
  [/^\/document\/[^/]+$/,                    'عارض المستندات'],
  [/^\/training\/[^/]+\/lesson\/[^/]+$/,     'درس تدريبي'],
  [/^\/training\/[^/]+$/,                    'مسار تدريبي'],
  [/^\/teacher\/intelligence\/[^/]+$/,       'تفاصيل المقرر'],
  [/^\/student\/online-exams\/[^/]+$/,       'اختبار جارٍ'],
  [/^\/admin\/permissions\/[^/]+$/,          'إدارة الصلاحيات'],
  [/^\/colleges\/[^/]+$/,                    'كلّيّة'],
  [/^\/competitions\/[^/]+$/,                'مسابقة'],
];

function resolveTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname];
  if (exact) return exact;
  for (const [pattern, title] of DYNAMIC_TITLES) {
    if (pattern.test(pathname)) return title;
  }
  return 'منصة الزاوية';
}

/* ───────────────────────────────────────────────────────────
   LAYOUT METRICS LOCK — pin sidebar/topbar dimensions to CSS
   custom properties on <html> so layout-dependent code reads
   canonical values without forcing a layout calculation.
   ─────────────────────────────────────────────────────────── */
function useLayoutMetrics() {
  useLayoutEffect(() => {
    const el = document.documentElement;
    const apply = () => {
      const sidebar = document.querySelector<HTMLElement>('.sidebar');
      const topbar = document.querySelector<HTMLElement>('.topbar');
      const w = sidebar?.offsetWidth ?? 264;
      const h = topbar?.offsetHeight ?? 64;
      el.style.setProperty('--measured-sidebar-w', `${w}px`);
      el.style.setProperty('--measured-topbar-h', `${h}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    const sb = document.querySelector('.sidebar');
    const tb = document.querySelector('.topbar');
    if (sb) ro.observe(sb);
    if (tb) ro.observe(tb);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);
}

/* ───────────────────────────────────────────────────────────
   THEME TRANSITION GUARD — opt into View Transitions API for
   buttery cross-fades when the theme attribute changes.
   ─────────────────────────────────────────────────────────── */
function useThemeTransitionGuard() {
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== 'attributes' || m.attributeName !== 'data-theme') continue;
        const doc = document as unknown as { startViewTransition?: (cb: () => void) => { finished?: Promise<void> } };
        if (typeof doc.startViewTransition !== 'function') return;
        html.setAttribute('data-theme-swapping', '');
        const vt = doc.startViewTransition(() => { /* DOM already reflects swap */ });
        vt?.finished?.finally?.(() => {
          html.removeAttribute('data-theme-swapping');
        });
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
}

/* ───────────────────────────────────────────────────────────
   CARD POINTER GLOW — single delegated pointermove listener
   that updates CSS vars (--cx / --cy) on the .card the cursor
   is over. The polish-v8 ::before highlight reads those vars
   to centre its radial there. One listener, no per-card React
   handlers, no work when the cursor isn't on a card.
   ─────────────────────────────────────────────────────────── */
function useCardPointerGlow() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (reduced || isTouch) return;

    let raf = 0;
    let lastCard: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const card = target.closest<HTMLElement>('.card:not(.flush)');
      if (!card) {
        if (lastCard) {
          lastCard.style.removeProperty('--cx');
          lastCard.style.removeProperty('--cy');
          lastCard = null;
        }
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty('--cx', `${x}%`);
        card.style.setProperty('--cy', `${y}%`);
        lastCard = card;
      });
    };
    document.addEventListener('pointermove', onMove);
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
}

export function AppShell({ children }: { children?: ReactNode }) {
  useThemeSync();
  useThemeProfileSync();
  useRoleAccent();
  useLayoutMetrics();
  useThemeTransitionGuard();
  useCardPointerGlow();

  const onboarding = useOnboardingState();
  // Auto-mount the onboarding flow on first authenticated render
  // where the server has never recorded completion. The hook itself
  // is the source of truth; AppShell only triggers `open()`.
  useEffect(() => {
    if (onboarding.shouldAutoStart && !onboarding.isOpen) {
      onboarding.open();
    }
  }, [onboarding.shouldAutoStart, onboarding.isOpen, onboarding]);

  const location = useLocation();
  const title = resolveTitle(location.pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

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

  // Reset the topbar's scrolled-shadow state on route change. Scroll
  // position itself is handled by useScrollRestoration below — back/
  // forward navigation restores the previous position; PUSH/REPLACE
  // scrolls to top.
  useEffect(() => {
    setScrolled(false);
  }, [location.pathname]);

  useScrollRestoration(contentRef);

  return (
    <div className="has-shell">
      <Sidebar />
      <main className="main">
        <Topbar title={title} scrolled={scrolled} />
        <div className="content" ref={contentRef}>
          <PageTransition>
            <div className="content-inner" key={location.pathname}>
              {children ?? <Outlet />}
            </div>
          </PageTransition>
        </div>
      </main>
      <BottomNav />
      <OnboardingFlow />
    </div>
  );
}

export function ProtectedRoute({ allow }: { allow?: AppRole[] }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isHydrated) return <HydrationSplash />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role)) {
    const home: Record<AppRole, string> = {
      STUDENT: '/student/dashboard',
      TEACHER: '/teacher/dashboard',
      ADMIN:   '/admin/dashboard',
      QUALITY: '/quality/dashboard',
      OWNER:   '/owner/dashboard',
    };
    return <Navigate to={home[user.role]} replace />;
  }
  return <Outlet />;
}

export function HydrateMe() {
  useMe();
  return null;
}
