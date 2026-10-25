import { Outlet, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
// R305-A4 Heron shell layer — the shell's own r305 treatment, scoped
// here and UNLAYERED by design so it is the cascade's last word after
// polish.css's overrides. Imported ONLY by the shell (the file itself
// is owned by the 2-d CSS agent; this line is the 2-e coordination
// point — main.tsx imports App after its CSS block, so this sheet
// lands after polish.css in the bundle).
import '../../styles/r305-shell.css';
// R319 (C2-G2 · §C3): the shared shell joins the sheet system — the
// 7px drafting frame + the measured paper-grain film + the title-bar
// mono registers + the last radius-0 chrome overrides. Same cascade
// contract as r305-shell.css (unlayered, shell-imported, last word).
import '../../styles/r319-shell.css';
import { SheetFrame, SheetGrain } from './SheetFrame';
import { SheetCodeContext, sheetCodeForRole } from '../../lib/sheet-code';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { ServerWakePill } from './ServerWakePill';
import { CommandPaletteBody } from './GlobalSearch';
import { CommandPalette } from '../overlays';
import { useThemeSync } from './ThemeToggle';
import { useScrollRestoration } from './useScrollRestoration';
import { PageTransition } from '../motion';
import { PageSkeleton } from '../primitives/States';
import { useAuthStore, type AppRole } from '../../stores/auth.store';
import { useRoleAccent } from '../../hooks/useRoleAccent';
import { useThemeProfileSync } from '../../hooks/useThemeProfileSync';
import { ScrollProgress } from './ScrollProgress';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { MilestoneScene } from '../onboarding/MilestoneScene';
import { HydrationSplash } from '../HydrationSplash';
import { overlayStack } from '../../lib/overlayStack';
import { toast } from '../../lib/toast';
import { NAV_BY_ROLE, ROLE_HOME } from '../../lib/nav';
// CONCRETE module import (r157 6A4-2/6A13-3): shell tests mock the
// motion BARREL with PageTransition only — importing useReducedMotion
// from '../motion' would resolve to the mock's undefined. The landing
// components already follow this concrete-module precedent.
import { useReducedMotion } from '../motion/useReducedMotion';

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
// r177 (Phase 1 brand neutrality): university co-branding dropped.
const DOC_TITLE_BASE = 'مدارك · منصّة التعليم الذكي';

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
  /* r181 (phase-8 owner setup): the institution's academic-setup
     context — the title names the SECTION, not the institution (the
     h1 on the page itself carries the institution's name). */
  [/^\/owner\/institutions\/[^/]+$/,         'إعداد مؤسسة'],
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
  // 4-A14 P2-1: the fallback used to name the demo university — the
  // university platform, not the product. The product is «مدارك».
  return 'مدارك';
}

/* ───────────────────────────────────────────────────────────
   ENTITY-NAME TITLES (r183-B6, A4 P3-4)
   ───────────────────────────────────────────────────────────
   The guests already get payload names in their tabs (useDocTitle in
   CollegePages / VisionPages / CompetitionsPages) while every AUTHED
   entity page resolved to its DYNAMIC_TITLES pattern — «تفاصيل
   المقرّر · مدارك» for BOTH «هندسة البرمجيات» and «قواعد البيانات».
   This hook is the authed half of that contract: the page hands its
   resolved entity name up and the tab (plus history entries / SR
   announcements, WCAG 2.4.2) names the thing, not the pattern.

   Same stomp-avoidance contract as the guest useDocTitle: the shell's
   pathname-title effect is the PARENT effect — it runs after the
   page's effect in the same commit, so a direct write would be
   stomped. The 0ms macrotask schedules after every effect in the
   commit and the entity title survives. A null/undefined name (query
   pending, unknown id) writes nothing — the shell's own resolution
   owns the tab then, exactly like the guest variant. */
export function useEntityPageTitle(entityName?: string | null): void {
  useEffect(() => {
    if (!entityName) return;
    const set = window.setTimeout(() => {
      document.title = `${entityName} · مدارك`;
    }, 0);
    return () => window.clearTimeout(set);
  }, [entityName]);
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
  // r157 (6A13-3): reactive reduced-motion — the old one-shot
  // matchMedia read froze the decision at mount, so toggling the OS
  // setting mid-session left the glow armed (or disarmed) forever.
  // [reducedMotion] in the deps re-arms the listener on every flip.
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (reducedMotion || isTouch) return;

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
  }, [reducedMotion]);
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
  /* R319 (C2-G2): the authed sheet's mono identity — every PageHeader
     (both families) consumes this through SheetCodeContext when its
     own sheetCode prop is absent, so the code lands on every page
     without a single page file changing. Guest/no-role sessions
     provide undefined (headers render no line). */
  const sheetCode = role != null ? sheetCodeForRole(role) : undefined;
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

  /* r152j (A7 #1): every role's dashboard pulls charts + chartTheme
     (~75-95KB gz) AFTER the post-login navigation — the fetch lands on
     the critical path of the most common navigation in the app (slow
     Libyan mobile networks doubly so). Warm it during shell idle: the
     dynamic import fetches the chunk and runs its module init once
     (Chart.register is idempotent and the theme observer is a
     singleton by design); the later dashboard mount reuses the warm
     module. Production only — dev has no chunk splitting to warm. */
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    // Feature-detect without optional chaining: the DOM lib types
    // requestIdleCallback as always-defined, so `?.bind()` + a truthy
    // check trip TS2774. A typeof guard narrows honestly.
    const ric =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : undefined;
    const warm = () => { void import('../../lib/chartTheme').catch(() => undefined); };
    const idleId = ric ? ric(warm, { timeout: 4000 }) : window.setTimeout(warm, 2500);
    return () => {
      if (ric) window.cancelIdleCallback(idleId as number);
      else window.clearTimeout(idleId as number);
    };
  }, []);

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
    <SheetCodeContext.Provider value={sheetCode}>
      <div className="has-shell">
        {/* Skip-to-content link — WCAG 2.4.1. Visually hidden until focused
            (styles in base.css + polish.css, class-based). tabIndex on the
            target lets programmatic focus land after the skip. */}
        <a href="#main" className="skip-link">
          تخطَّ إلى المحتوى الرئيسي
        </a>
        {/* R319 (C2-G2 · §C3): the sheet chrome — the 7px drafting frame
            (with its corner registration marks) and the paper-grain film.
            Decorative only (aria-hidden + pointer-transparent, static
            texture); mounted as DIRECT .has-shell children so no page
            transition transform can ever trap the fixed layers. */}
        <SheetFrame />
        <SheetGrain />
        <Sidebar />
        <main className="main" id="main" tabIndex={-1}>
          <ScrollProgress />
          <Topbar title={title} scrolled={scrolled} onOpenCommandPalette={openPalette} />
          {/* WCAG 2.1.1 / axe scrollable-region-focusable: `.content` is
              the app's ONLY scroll container (body never scrolls — see
              layout.css's note on the .content listeners), so keyboard
              users had no way to arrow-scroll it. tabindex=0 puts the
              region in the natural tab order (after the topbar, before
              the page's own controls); the universal :focus-visible ring
              in motion.css covers [tabindex]:not([tabindex="-1"]) — no
              bespoke focus CSS needed. Mouse clicks focus the region
              without a ring (:focus:not(:focus-visible) rule, base.css). */}
          <div
            className="content"
            ref={contentRef}
            tabIndex={0}
            role="region"
            aria-label="المحتوى الرئيسي"
          >
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
        <ServerWakePill />
        <OnboardingFlow />
        <MilestoneScene />
        <CommandPalette open={paletteOpen} onClose={closePalette} ariaLabel="لوحة الأوامر والبحث">
          <CommandPaletteBody key={paletteSeq} onClose={closePalette} />
        </CommandPalette>
      </div>
    </SheetCodeContext.Provider>
  );
}

/* r183-B6 (A4 P2-1): the cross-role deny used to swap the page under
   the user with ZERO feedback — a student deep-linking /admin/dashboard
   landed on their own dashboard with no explanation of what just
   happened. One info toast at deny time names the cause and the
   destination («أُعيدك إلى لوحتك»). The ref guard keeps it exactly
   ONE toast per visit: React StrictMode double-invokes mount effects
   in dev, and the ref survives that simulated cycle, so the second
   invocation is a no-op. The <Navigate state> carries deniedFrom for
   any landing surface that later wants the breadcrumb; the redirect
   itself stays `replace` — browser back returns to the page BEFORE
   the denied one (recorded in App-routes.test.tsx). */
const DENIED_ROLE_MESSAGE = 'هذه الصفحة غير متاحة لدور حسابك — أُعيدك إلى لوحتك';

function DeniedRoleNotice() {
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    toast.info(DENIED_ROLE_MESSAGE);
  }, []);
  return null;
}

export function ProtectedRoute({ allow }: { allow?: AppRole[] }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isHydrated) return <HydrationSplash />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role)) {
    return (
      <>
        <DeniedRoleNotice />
        <Navigate to={ROLE_HOME[user.role]} replace state={{ deniedFrom: location.pathname }} />
      </>
    );
  }
  return <Outlet />;
}

/* (HydrateMe deleted in wave 16-E3 — 15-f FE-3 / 15-d P1-4: it was
   never rendered anywhere; every consumer calls useMe() directly.) */
