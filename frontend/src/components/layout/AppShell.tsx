import { Outlet, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { CommandPaletteBody } from './GlobalSearch';
import { CommandPalette } from '../overlays';
import { useThemeSync } from './ThemeToggle';
import { useScrollRestoration } from './useScrollRestoration';
import { PageTransition } from '../motion';
import { PageSkeleton } from '../primitives/States';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useRoleAccent } from '../../hooks/useRoleAccent';
import { useThemeProfileSync } from '../../hooks/useThemeProfileSync';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { MilestoneScene } from '../onboarding/MilestoneScene';
import { HydrationSplash } from '../HydrationSplash';
import { overlayStack } from '../../lib/overlayStack';

/* ───────────────────────────────────────────────────────────
   ROLE HOME — the single map for guard redirects (ProtectedRoute)
   AND the onboarding auto-start gate (A13 P1-1). Keeping one map
   means the tour can never aim at a different route than the guard
   bounces users to.
   ─────────────────────────────────────────────────────────── */
const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN:   '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER:   '/owner/dashboard',
};

/* ───────────────────────────────────────────────────────────
   PAGE TITLES — single source of truth for topbar resolution
   ─────────────────────────────────────────────────────────── */
// The static <title> from index.html — restored whenever the shell
// unmounts (see the document.title effect in AppShell).
const DOC_TITLE_BASE = 'مدارك · منصة التعليم الذكي · جامعة الزاوية';

const PAGE_TITLES: Record<string, string> = {
  '/student/dashboard': 'لوحة التحكم',
  '/student/schedule': 'الجدول الدراسي',
  '/student/courses': 'مقرّراتي الدراسية',
  '/student/results': 'النتائج والتقييمات',
  '/student/ai': 'المساعد الذكي',
  '/student/library': 'المكتبة الإلكترونية',
  '/student/gamification': 'النقاط والمستويات',
  '/student/skills': 'مهاراتي',
  '/student/labs': 'المعامل الافتراضية',
  '/student/social': 'الشبكة الاجتماعية',
  '/student/mooc': 'دورات خارجية',
  '/student/jobs': 'فرص العمل',
  '/student/alerts': 'الإشعارات',
  '/student/downloads': 'مركز التحميلات',
  '/student/university': 'جامعة الزاوية',
  '/student/matrix': 'المصفوفة التعليمية',
  '/student/research': 'بحوثي العلمية',
  '/student/profile': 'ملفي الشخصي',
  '/student/webinars': 'الندوات وورش العمل',
  '/student/exams': 'تحليل الاختبارات',
  '/student/live': 'البث المباشر',
  '/student/payment': 'الشؤون المالية',
  '/student/map': 'خريطة الحرم الجامعي',
  '/student/ar': 'تجارب AR/VR',
  '/teacher/dashboard': 'لوحة الأستاذ',
  '/teacher/schedule': 'جدول المحاضرات',
  '/teacher/attendance': 'الحضور والغياب',
  '/teacher/grades': 'درجات الطلاب',
  '/teacher/materials': 'الملفات التعليمية',
  '/teacher/students': 'قائمة الطلاب',
  '/teacher/performance': 'الأداء والتحليل',
  '/teacher/assignments': 'الواجبات والاختبارات',
  '/teacher/exams': 'بنك الأسئلة والاختبارات',
  '/teacher/messages': 'الرسائل',
  '/teacher/research': 'البحث العلمي',
  '/admin/dashboard': 'لوحة الإدارة',
  '/admin/students': 'إدارة الطلاب',
  '/admin/teachers': 'إدارة الأساتذة',
  '/admin/faculties': 'الكلّيّات والأقسام',
  '/admin/courses': 'إدارة المقرّرات',
  '/admin/analysis': 'تحليل الأداء',
  '/admin/digital': 'التحول الرقمي',
  '/admin/reports': 'التقارير',
  '/admin/settings': 'الإعدادات',
  '/admin/sync': 'مزامنة الجامعة',
  '/quality/dashboard': 'لوحة الجودة',
  '/quality/courses': 'جودة المقرّرات',
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
  '/teacher/ai': 'المساعد الذكي',
  '/teacher/library': 'المكتبة',
  '/teacher/alerts': 'الإشعارات',
  '/admin/alerts': 'الإشعارات',
  '/student/online-exams': 'الاختبارات الإلكترونية',
};

const DYNAMIC_TITLES: Array<[RegExp, string]> = [
  [/^\/student\/courses\/[^/]+$/,            'تفاصيل المقرّر'],
  [/^\/student\/lectures\/[^/]+$/,           'مشغّل المحاضرة'],
  [/^\/vision\/[^/]+$/,                      'ابتكار قادم'],
  [/^\/document\/[^/]+$/,                    'عارض المستندات'],
  [/^\/training\/[^/]+\/lesson\/[^/]+$/,     'درس تدريبي'],
  [/^\/training\/[^/]+$/,                    'مسار تدريبي'],
  [/^\/teacher\/intelligence\/[^/]+$/,       'تفاصيل المقرّر'],
  [/^\/teacher\/exams\/[^/]+$/,             'بنك الأسئلة والاختبارات'],
  /* A4 P2-5: this one route hosts FOUR states — pre-start («هل أنت
     مستعد للبدء؟»), a live attempt, the result screen, and the
     already-completed screen. The shell resolves titles from the
     pathname alone, so it cannot know an exam is running — the old
     «اختبار جارٍ» asserted exactly that on the pre-start and result
     screens (anxiety-inducing copy the page contradicts). The neutral
     section title never lies in any state. */
  [/^\/student\/online-exams\/[^/]+$/,       'اختبار إلكتروني'],
  [/^\/admin\/permissions\/[^/]+$/,          'إدارة الصلاحيات'],
  [/^\/colleges\/[^/]+$/,                    'كلّيّة'],
  [/^\/competitions\/[^/]+$/,                'مسابقة'],
];

export function resolveTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname];
  if (exact) return exact;
  for (const [pattern, title] of DYNAMIC_TITLES) {
    if (pattern.test(pathname)) return title;
  }
  // 4-A14 P2-1: the fallback used to name «منصة الزاوية» — the
  // university platform, not the product. The product is «مدارك».
  return 'مدارك';
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
  useThemeTransitionGuard();
  useCardPointerGlow();
  // (useLayoutMetrics deleted in wave 7-b — audit 0-c P2-6: it wrote
  // --measured-sidebar-w/--measured-topbar-h on <html> that zero CSS/TSX
  // consumers ever read; dead code under the no-dead-code floor.)

  const {
    shouldAutoStart: onboardingShouldAutoStart,
    isOpen: onboardingOpen,
    open: openOnboarding,
  } = useOnboardingState();
  const location = useLocation();
  const role = useAuthStore((s) => s.user?.role);
  // A13 P1-1: auto-start ONLY on the role's home route. The old effect
  // ran on every shell mount, so a deep-linked task (shared lecture
  // URL, emailed exam link) was greeted by a focus-trapped modal +
  // scroll lock before the user could do the one thing they came for.
  // The tour's copy is dashboard-centric ("لوحة يومك") and the
  // sidebar replay («عرض الجولة») stays the durable invitation
  // elsewhere. The once-guard matters now that the wiring actually
  // works: without it, skipping the tour would re-open it during the
  // window before the me-refetch lands — and it must only arm on the
  // home route, so arriving at the dashboard LATER in the same
  // session still shows the tour once.
  const isRoleHome = role != null && location.pathname === ROLE_HOME[role];
  const onboardingAutoStarted = useRef(false);
  useEffect(() => {
    if (onboardingAutoStarted.current) return;
    if (!isRoleHome) return;
    if (!onboardingShouldAutoStart || onboardingOpen) return;
    onboardingAutoStarted.current = true;
    openOnboarding();
  }, [isRoleHome, onboardingShouldAutoStart, onboardingOpen, openOnboarding]);

  const title = resolveTitle(location.pathname);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  /* 15-g P2-3: SPA navigations never touched document.title — the
     static <title> from index.html lived forever, so screen-reader
     users (and browser tabs / history entries) got no page-change
     signal on client-side routes. Mirror the topbar's resolved
     per-route title into the tab, restoring the static platform
     title when the shell unmounts (the logout redirect lands on
     /auth, which owns no title logic of its own). The fallback title
     resolves to the full platform title (4-A14 P2-1) — appending the
     suffix would read «مدارك · مدارك». */
  useEffect(() => {
    document.title = title === 'مدارك' ? DOC_TITLE_BASE : `${title} · مدارك`;
    return () => {
      document.title = DOC_TITLE_BASE;
    };
  }, [title]);

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

  /* ── Command palette (4-A2 P2-8 + P1-3, wave 21-a) ──────────────
     ⌘K / Ctrl+K opens the palette shell-wide — every role, every
     viewport (on ≤920px it is THE search surface: the pill is
     display:none and the topbar search button routes here). The chord
     toggles: pressing it while the palette is open closes it. While
     any OTHER overlay layer owns the screen (drawer, modal, dropdown,
     notif panel) the chord is inert — the same contract GlobalSearch's
     old ⌘K binding honored (11-e P1-6), now owned in exactly one
     place so the two listeners can never fight over a press. */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const closePalette = () => setPaletteOpen(false);
  const openPalette = () => setPaletteOpen(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key !== 'k' && e.key !== 'K') return;
      e.preventDefault();
      setPaletteOpen((v) => {
        if (v) return false; // toggle: the palette itself owns the open state
        if (!overlayStack.isEmpty()) return false; // another layer owns the screen
        return true;
      });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="has-shell">
      {/* Skip-to-content link — WCAG 2.4.1. Visually hidden until focused
          (styles in base.css + polish.css, class-based). tabIndex on the
          target lets programmatic focus land after the skip. */}
      <a href="#main" className="skip-link">
        تخطَّ إلى المحتوى الرئيسي
      </a>
      <Sidebar />
      <main className="main" id="main" tabIndex={-1}>
        <Topbar title={title} scrolled={scrolled} onOpenCommandPalette={openPalette} />
        <div className="content" ref={contentRef}>
          <PageTransition>
            <div className="content-inner">
              {/* Inner Suspense boundary (11-e P1-1): the only boundary
                  used to sit above <Routes>, so the first navigation to
                  each lazy chunk unmounted the whole shell — sidebar,
                  topbar, bottom-nav state died with it. A boundary here
                  swaps a page-shaped skeleton into the content track
                  while the chrome (and its scroll/dropdown state)
                  persists. The root boundary in App.tsx still covers
                  the shell chunk itself. */}
              <Suspense fallback={<PageSkeleton />}>
                {children ?? <Outlet />}
              </Suspense>
            </div>
          </PageTransition>
        </div>
      </main>
      <BottomNav />
      <OnboardingFlow />
      <MilestoneScene />
      <CommandPalette open={paletteOpen} onClose={closePalette} ariaLabel="لوحة الأوامر والبحث">
        <CommandPaletteBody onClose={closePalette} />
      </CommandPalette>
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
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return <Outlet />;
}

/* (HydrateMe deleted in wave 16-E3 — 15-f FE-3 / 15-d P1-4: it was
   never rendered anywhere; every consumer calls useMe() directly.) */
