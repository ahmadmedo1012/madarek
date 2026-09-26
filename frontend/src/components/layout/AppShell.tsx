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
import { NAV_BY_ROLE } from '../../lib/nav';

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
   PAGE TITLES — single source: nav.ts (5-B5, A4 P3-1/P3-2)
   ───────────────────────────────────────────────────────────
   Every sidebar destination's topbar/tab title DERIVES from its nav
   label — nav.ts is the one place a route's name lives, so the
   sidebar, the palette quick-actions, the topbar title and
   document.title can no longer drift apart (A4 measured five
   label↔title pairs that had: «الجدول» vs «جدول المحاضرات»,
   «صفحات الكلّيّات» vs «كلّيّات الجامعة», «المسابقات» vs
   «المسابقات الأكاديميّة»…). The manual map below only covers
   routes that are NOT nav destinations; nav-coverage.test.ts pins
   the drift guard — a manual row that shadows a nav item fails the
   suite, and a route linked by two roles with two labels fails it
   too. */
const NAV_TITLES: Record<string, string> = {};
for (const groups of Object.values(NAV_BY_ROLE)) {
  for (const group of groups) {
    for (const item of group.items) NAV_TITLES[item.to] = item.label;
  }
}

// The static <title> from index.html — restored whenever the shell
// unmounts (see the document.title effect in AppShell).
const DOC_TITLE_BASE = 'مدارك · منصة التعليم الذكي · جامعة الزاوية';

const PAGE_TITLES: Record<string, string> = {
  // Folded out of the student sidebar (A4 P2-1) — still a real surface
  // one click from /colleges (the leaderboard CTA), so it keeps a title.
  '/colleges/leaderboard': 'منافسة الكلّيّات',
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
  // Nav destinations first — nav.ts is the single source (NAV_TITLES);
  // the manual map only carries non-nav surfaces.
  const exact = NAV_TITLES[pathname] ?? PAGE_TITLES[pathname];
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

  /* ── Focus rescue after navigation (5-B5, A4 §7) ──────────────────
     Clicking a desktop sidebar link keeps focus on the link, a drawer
     link returns it to the burger (the containment effect's
     restore-on-close), and a palette navigation returns it to the
     opener — all live-measured, none orphaned. The paths that DO drop
     focus on document.body are unmounting triggers and redirect
     routes (guard bounces, /admin/analysis → reports). A body-focused
     SPA route change is silent for keyboard + SR users — nothing
     announces the new page. When focus was orphaned, move it to the
     topbar page title (tabindex=-1, Topbar.tsx): programmatic focus on
     a -1 target shows no focus ring, and the focus itself + the
     document.title effect give SR users the page-change signal. The
     first mount is skipped (cold loads keep the natural focus order —
     the skip link stays the first Tab stop). */
  const prevPathname = useRef<string | null>(null);
  useEffect(() => {
    const isFirstRun = prevPathname.current === null;
    const changedRoute = prevPathname.current !== location.pathname;
    prevPathname.current = location.pathname;
    if (isFirstRun || !changedRoute) return;
    const active = document.activeElement;
    const focusOrphaned = active === document.body || (active !== null && !document.contains(active));
    if (!focusOrphaned) return;
    const titleEl = document.querySelector<HTMLElement>('.topbar-title');
    titleEl?.focus({ preventScroll: true });
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
  /* 5-B5 (A4 P2-3): every open remounts the body fresh — the palette's
     delayed unmount kept the previous instance (and its query) alive
     through the exit window, so reopening within it resurrected the
     stale term (measured «zzzzqqد. أحمد»). */
  const [paletteSeq, setPaletteSeq] = useState(0);
  const closePalette = () => setPaletteOpen(false);
  const openPalette = () => {
    setPaletteSeq((s) => s + 1);
    setPaletteOpen(true);
  };
  /* Ref mirror so the document-level chord can read the open state
     without re-registering (and without the functional-setState form,
     which cannot bump paletteSeq atomically with the open). */
  const paletteOpenRef = useRef(false);
  useEffect(() => {
    paletteOpenRef.current = paletteOpen;
  }, [paletteOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key !== 'k' && e.key !== 'K') return;
      e.preventDefault();
      if (paletteOpenRef.current) {
        setPaletteOpen(false); // toggle: the palette itself owns the open state
        return;
      }
      if (!overlayStack.isEmpty()) return; // another layer owns the screen
      setPaletteSeq((s) => s + 1); // fresh body per open (5-B5)
      setPaletteOpen(true);
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
        <CommandPaletteBody key={paletteSeq} onClose={closePalette} />
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
