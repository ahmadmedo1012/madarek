import { Navigate } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
/* P2-0 (r335 split) — the nine section components live in
 * components/landing/sections/ (one file per band; Phase-2 wave agents
 * own one file each). The composer below keeps the sheet's hooks,
 * refs, effects and chrome; the sections are presentational and
 * receive their refs via props. The import POSITIONS are load-bearing:
 * Vite executes them in order, so each slot below matches the module
 * it replaced — Hero's slot still pulls hero-mechanics.css, the CSS
 * family below keeps its exact cascade order, and SheetNav still
 * loads AFTER landing.css + r330-home.css (nav.css last-word rule). */
import { Vision } from '../components/landing/sections/Vision';
import { Roles } from '../components/landing/sections/Roles';
import { initReveals } from '../lib/reveals';
/* R333 (P-C) — the ONE reveal recipe for the second half (SplitText
 * LINES-only display rise · batch item rise · imgCardReveal cards;
 * Arabic line-level only, RM bails, JS-off-safe arming). */
/* R331 (A-Web-Hero) — the hero JSX block lives in its own folder
 * (components/landing/hero/Hero.tsx): the Heron-mechanics rebuild
 * (mask-line title reveal · wiping frame edges · staged ink-in ·
 * deco cards · work-card rise). HeroInkWindow/HeroInspect mount from
 * there; the r331/hero.css import rides the component. The sections/
 * seat re-exports it (P2-0 split) so the composer mounts every band
 * from one directory. */
import { Hero } from '../components/landing/sections/Hero';
import { Statement } from '../components/landing/sections/Statement';
import { Why } from '../components/landing/sections/Why';
import { Live } from '../components/landing/sections/Live';
/* r325 Y2 — PlatformCanvas/PlatformPlanArt (the head-strip plan +
 * its over-art pin) retire with the Y2 rebuild: the plan's caption
 * lives under the ONE product frame now (see sections/Product.tsx). */
/* R333 P-D — the entry sequence rebuild (heron-craft row 1): the
 * preloader is the paper overlay + stroke-draw + % counter with the
 * GSAP clip-path wipe exit; the R313 SheetLoader retires from the
 * mount (the file stays for rollback) — the introGate decision (once
 * per session, RM/save-data skip) is unchanged and Preloader stamps
 * the same session flag. */
import { Preloader } from '../components/landing/chrome/Preloader';
import { SheetCursor } from '../components/landing/cursor/SheetCursor';
import { Chapters } from '../components/landing/sections/Chapters';
/* P-A2 R333 (INV-08 · heron-craft row 13) — the platform band's
 * product-proof strip (three REAL captures) lives inside
 * sections/Product.tsx — the Vite-asset imports ride the section. */
import { Product } from '../components/landing/sections/Product';
import { Footer } from '../components/landing/sections/Footer';
// R323 (A3 · defects 1+9): FooterArt (FooterMarkArt/WordmarkArt) is
// retired — the giant footer wordmark is <Logo variant="wordmark"> now
// and the circle-star mark cell is removed (ONE mark per view).
import { ConsentBanner } from '../components/landing/chrome/ConsentBanner';
import { EdgeTab } from '../components/landing/chrome/EdgeTab';
/* r339 T-18 (A6) — the scroll progress rule: the reference's measured
 * splitting 1px pair at 50vh + the mono % readout. Scroll-driven CSS
 * (zero JS ticks); reduced motion never mounts it. */
import { ScrollRule } from '../components/landing/chrome/ScrollRule';
import { BootLog } from '../components/landing/chrome/BootLog';
import { shouldPlayIntro, introEnvironment } from '../lib/motion/introGate';
import { useSheetScroll } from '../lib/motion/useSheetScroll';
import { clamp } from '../lib/motion/sheetConductor';
// r314-chrome.css — R314 B10 — the consent banner (V11) + the right-edge
// vertical tab (V12): the landing chrome pair, Heron geometry with
// Madarek's own honest content. R323 (A3 · defect 3): imported BEFORE
// landing.css so the sheet's R323 chrome block (the compact phone
// consent bar + the --z-consent/--z-loader tokens) is the cascade's
// last word over the chrome pair without specificity forks.
import '../styles/landing/consent-edge.css';
// landing.css — «لوحة مدارك r306 → r313» — the Heron-parity drawing
// sheet, re-composed to the reference's 9-section structure (D7):
// hero → statement → live (the pains) → chapters (the pinned map) →
// product → why → roles → vision/cta → footer, inside the full-page
// drafting frame (D9). The documentary media rail + video facades moved
// to /campus; the capability matrix + status pairs moved to
// /capabilities — every licence/attribution and honesty caption moved
// WITH its content. Every funnel/a11y/truth contract carries forward
// (landing-funnel 5+5, r168b, r170d, r177, r188, r306 — see the tests
// pinned beside each surface).
// landing/ — R332 (A-CSS-Exec): the 7,920-line landing.css monolith was
// split VERBATIM into the per-section sheets below. The import order IS
// the original rule order (the region map + the five proven-safe
// moves live in docs/redesign/r332/css-split-landing.md) — the family
// still loads AFTER r314-chrome.css and BEFORE r330-home.css exactly
// as the single landing.css import did, so every cascade contract
// (r323 chrome last-word, r330 override, r331 nav last-word) holds.
// The old landing.css path survives as an EMPTY stub (gates enumerate it).
import '../styles/landing/chrome.css';
// T-14 (r339) — the pattern library: the 7 canonical patterns' base
// grammar. Loads after chrome, BEFORE every section sheet, so the
// spec-locked section overrides always out-specify the lp-* bases.
import '../styles/landing/patterns.css';
import '../styles/landing/hero.css';
import '../styles/landing/statement.css';
import '../styles/landing/reveals.css';
import '../styles/landing/journey.css';
import '../styles/landing/pains.css';
import '../styles/landing/roles.css';
import '../styles/landing/colleges.css';
import '../styles/landing/cta.css';
import '../styles/landing/why.css';
import '../styles/landing/footer.css';
import '../styles/landing/statement-ai1.css';
import '../styles/landing/shared.css';
import '../styles/landing/platform.css';
import '../styles/landing/strata.css';
// r330-home.css — R330 (A-Web-Home) — the homepage's Heron-composition
// pass (hero/statement/pains: dominant ink bands, decisive display
// scale, the ruled-table pains grid, deepened reveals). Loaded AFTER
// landing.css so its namespaced rules win by cascade order — the ONLY
// stylesheet this round may add (file-ownership contract).
import '../styles/landing/home.css';
/* R331 (A-Web-Nav) — the masthead owns its own file now: the header
 * state machine, the seat register, the menu choreography and
 * r331/nav.css all live in the chrome component
 * (components/landing/chrome/SheetNav.tsx — the file-ownership
 * contract: this page keeps the SHEET, not the bar). Imported AFTER
 * landing.css + r330-home.css so nav.css's header rules win by
 * cascade order over any same-specificity sheet rule. */
import { SheetNav } from '../components/landing/chrome/SheetNav';

/**
 * Landing — «لوحة مدارك» (r306 sheet → R313 Heron structure).
 *
 * P2-0 (r335 split): this file is the COMPOSER — hooks + refs +
 * effects + the nine section components in the original DOM order.
 * The per-band JSX moved verbatim into components/landing/sections/
 * (Hero · Statement · Live · Chapters · Product · Why · Roles ·
 * Vision · Footer); every effect/observer/pin-driver stays HERE so
 * the sections stay presentational. ZERO DOM drift — the rendered
 * sheet is byte-identical.
 *
 * Composition (the 9 sections, reading RTL — Heron measured @1440×900,
 * total 12355px):
 *   [1] hero (~887px · 7.2%): the copy band + the drafted elevation
 *       with its inspection instruments + the capabilities ticker —
 *       tightened to ~100vh-frame (was 1807px);
 *   [2] statement (~723px · 5.9%): the scrub-revealed declaration +
 *       the documented-universities ticker;
 *   [3] live (~743px · 6.0%): the four pains of Libyan higher-ed as
 *       numbered cards with draw-in line art (each answered by a live
 *       capability — the full matrix lives on /capabilities);
 *   [4] chapters (~6300px · 51.0%): the pinned «رحلة التعلّم»
 *       walkthrough — the learning-floor plan, the opening statement,
 *       the INTRODUCTION card, the four findings stations and the
 *       closing column; the map is HALF the page, the reference's
 *       proportion (R315 K-E: the chapters 05–06 demo rows are gone —
 *       their honest content lives on /capabilities);
 *   [5] product (~710px · 5.7%): two real-capture blocks;
 *   [6] why (~698px · 5.6%): the شاهد/تحقّق/اختبر/أتقن stage strip
 *       with the four student-surface captures cross-fading;
 *   [7] roles (~887px · 7.2%): the ruled hairline grid — the five
 *       platform roles + three honest personas;
 *   [8] vision/cta (~698px · 5.6%): corner coordinates + the title
 *       block + the resolve + the colleges registry strip;
 *   [9] footer: the inspection strip (FooterLens) + the colophon.
 *
 * Motion: RevealCssClass block reveals + the imperative scroll chrome
 * (the .scrolled header + the --p progress ribbon) + the scroll-scrubbed
 * instruments (statement words, journey plan, why cross-fade) — all on
 * the shared sheet clock, all collapsed under reduced motion.
 */

/* R338 (T-07 · scroll.mjs scrub-curve conformance) — the measured
 * reference word-ink curve: cumulative ink coverage of the statement
 * title at 11 evenly spaced seats across the scrub trigger, frozen in
 * heron-spec/scroll-curves.<bp>.json (live-extracted @ all 5 bps; the
 * five runs agree within ±0.01 — this is their consensus). A gentle
 * late-accelerating ease; inkEase() is its piecewise-linear
 * reproduction (scroll progress → --wr-p), so our linear per-word
 * thresholds land on the reference's measured SHAPE. */
const INK_EASE = [0, 0.073, 0.185, 0.297, 0.41, 0.522, 0.634, 0.746, 0.859, 0.97, 1] as const;
function inkEase(t: number): number {
  const x = clamp(t, 0, 1) * (INK_EASE.length - 1);
  const i = Math.min(INK_EASE.length - 2, Math.floor(x));
  const a = INK_EASE[i] ?? 0;
  const b = INK_EASE[i + 1] ?? 1;
  return a + (b - a) * (x - i);
}

export default function LandingPage() {
  useThemeSync();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Authenticated visitors never see the landing page (defense-in-depth;
  // App.tsx's HomeRedirect already gates `/` for signed-in users).
  const redirectHome =
    isHydrated && user
      ? user.role === 'TEACHER' ? '/teacher/dashboard'
      : user.role === 'ADMIN' ? '/admin/dashboard'
          : user.role === 'QUALITY' ? '/quality/dashboard'
            : user.role === 'OWNER' ? '/owner/dashboard'
              : '/student/dashboard'
      : null;

  /* R308 — the entrance gate: the loader plays ONCE per session, only
   * when motion is allowed (the same pure decision the loader holds;
   * the class pair drives the hero's staged ink-in after the exit). */
  const [introPlaying, setIntroPlaying] = useState(() => {
    try {
      const reduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return shouldPlayIntro(
        typeof sessionStorage !== 'undefined' ? sessionStorage : null,
        reduced,
        introEnvironment(), /* R318 §C: saveData/≤2g/≤2-core visitors skip */
      );
    } catch {
      return false;
    }
  });
  const [introDone, setIntroDone] = useState(!introPlaying);

  /* R318 (C2) — the grain's body seat: mounted class in, unmounted out
   * (the pseudo-element film is landing-only, exactly like the old
   * .fo-grain div; idempotent both ways). */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.add('mdrk-grain');
    return () => document.body.classList.remove('mdrk-grain');
  }, []);

  /* R333 (P-C) — the second-half reveal grammar (layout effect: the
   * gsap.set hidden state lands PRE-PAINT, so the armed frame never
   * flashes un-hidden content). initReveals is idempotent
   * (window.__mdrkReveals) and its destroy() kills every trigger and
   * reverts every split — remount-safe (React 18 double-effect
   * included). RM: the module bails and the copy ships visible. */
  useLayoutEffect(() => {
    const reveals = initReveals();
    return () => reveals.destroy();
  }, []);

  /* R308 → R322 (2-c) — the statement title's scrub driver, re-pinned
   * to the reference's own anchors (scroll-spec.md): the trigger is
   * the TITLE (not the section), center-based — start «center
   * bottom+=10%» (title center at 0.9vh), end «center top+=40%»
   * (center at 0.4vh). --wr-p (0..1) rides that traversal; the word
   * colors resolve + reverse with it (imperative, zero renders — the
   * useSheetScroll contract; R318 C2's idempotent write kept).
   *
   * R338 (T-07 · scroll.mjs scrub-curve conformance): the reference's
   * word-ink ramp is NOT linear in scroll progress. Measured on the
   * live reference at 11 seats across the trigger (frozen in
   * heron-spec/scroll-curves.<bp>.json — all 5 bps agree within ±0.01):
   * the cumulative ink coverage runs [0, .073, .185, .297, .41, .522,
   * .634, .746, .859, .97, 1] — a gentle late-accelerating ease. Our
   * words ink linearly in --wr-p, so the driver maps scroll progress
   * through that measured curve (piecewise-linear over the 11 knots)
   * before writing --wr-p: the SHAPE is the reproduced measurement,
   * not the source. */
  const statementRef = useRef<HTMLElement>(null);
  const statementTitleRef = useRef<HTMLHeadingElement>(null);
  let lastWrP = '';
  useSheetScroll(statementTitleRef, ({ rect, vh }) => {
    const el = statementRef.current;
    if (!el) return;
    const center = rect.top + rect.height / 2;
    const t = clamp((vh * 0.9 - center) / (vh * 0.5), 0, 1);
    const p = inkEase(t).toFixed(4);
    if (p !== lastWrP) {
      el.style.setProperty('--wr-p', p);
      lastWrP = p;
    }
  });

  /* R322 (2-d) — the pains' ≤767 snap carousel + the reference's dot
   * rail. Pure CSS scroll-snap owns the swipe (no swiper dep); this
   * belt only (a) makes the scroll region keyboard-focusable inside
   * the tier, (b) mirrors the snap position onto the dots (the
   * closest-to-center column wins — direction-agnostic, safe in RTL),
   * and (c) lets a dot tap center its column. ≥768 the carousel is a
   * plain grid: the listener detaches, the dots hide, tabIndex
   * releases. Reduced motion: the tap jumps without smoothing (the
   * page's RM canon). */
  const pmColsRef = useRef<HTMLOListElement>(null);
  const pmDotsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cols = pmColsRef.current;
    const dots = pmDotsRef.current;
    if (!cols || !dots || typeof window.matchMedia !== 'function') return undefined;
    const mm = window.matchMedia('(max-width: 767px)');
    const btns = Array.from(dots.querySelectorAll<HTMLButtonElement>('.pm-dot-btn'));
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setActive = (i: number) => {
      btns.forEach((b, j) => {
        b.classList.toggle('is-active', j === i);
        b.setAttribute('aria-current', j === i ? 'true' : 'false');
      });
    };
    const nearest = () => {
      const c = cols.getBoundingClientRect();
      const mid = (c.left + c.right) / 2;
      let best = 0;
      let bd = Infinity;
      Array.from(cols.children).forEach((child, j) => {
        const r = child.getBoundingClientRect();
        const d = Math.abs((r.left + r.right) / 2 - mid);
        if (d < bd) {
          bd = d;
          best = j;
        }
      });
      return best;
    };
    const onScroll = () => setActive(nearest());
    const onTap = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.('.pm-dot-btn') as HTMLButtonElement | null;
      if (!btn) return;
      const i = btns.indexOf(btn);
      const child = cols.children[i];
      if (child) {
        child.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    };
    const apply = (on: boolean) => {
      cols.tabIndex = on ? 0 : -1;
      btns.forEach((b) => {
        b.tabIndex = on ? 0 : -1;
      });
      dots.toggleAttribute('data-on', on);
      if (on) {
        cols.addEventListener('scroll', onScroll, { passive: true });
        dots.addEventListener('click', onTap);
        onScroll();
      } else {
        cols.removeEventListener('scroll', onScroll);
        dots.removeEventListener('click', onTap);
      }
    };
    const onMm = (e: MediaQueryList | MediaQueryListEvent) => apply(e.matches);
    onMm(mm);
    const listener = (e: MediaQueryListEvent) => onMm(e);
    mm.addEventListener('change', listener);
    return () => {
      mm.removeEventListener('change', listener);
      cols.removeEventListener('scroll', onScroll);
      dots.removeEventListener('click', onTap);
    };
  }, []);

  /* R313 (D11): the exit sweep is installed at the GUEST boundary
   * (GuestReveal — every public-page navigation), no longer scoped to
   * the landing root. */
  /* R308's corner-coordinate writer (the [0,…] [0,0] debug readout) is
   * retired with the R322 V1 kill — revision tags and coordinates are
   * not content; no element reads this section's geometry anymore. */
  // R318 (C2) — the auth-warm intent listener's anchor (the root).
  // (The header's own refs + the scroll state machine moved to
  // SheetNav with R331 — the page keeps the SHEET, not the bar.)
  const rootRef = useRef<HTMLDivElement>(null);

  /* r162 (R2) → r164b: warm the AUTH BOUNDARIES while the visitor reads
   * the hero (prod only — dev has no chunk splitting to warm).
   * R318 (C2): the old requestIdleCallback(timeout 4000) fired the
   * two-chunk import MID-SCROLL (react MessagePort 306–756ms LoAF in
   * the CDP profile — the #2 remaining @1440 jank). The warm now rides
   * INTENT (pointerdown/focusin on an auth-boundary link) + a late
   * idle fallback (15s — keyboard/scan readers still get the warm,
   * but never inside the first scroll sweeps). */
  useEffect(() => {
    if (redirectHome) return;
    if (!import.meta.env.PROD) return;
    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      void import('./AuthPage').catch(() => undefined);
      void import('./RegisterPage').catch(() => undefined);
    };
    const onIntent = (e: Event) => {
      const t = e.target as Element | null;
      if (t?.closest?.('a[href*="/auth"]')) {
        warm();
        rootRef.current?.removeEventListener('pointerdown', onIntent);
        rootRef.current?.removeEventListener('focusin', onIntent);
      }
    };
    const root = rootRef.current;
    root?.addEventListener('pointerdown', onIntent, { passive: true });
    root?.addEventListener('focusin', onIntent, { passive: true });
    const ric =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : undefined;
    const idleId = ric ? ric(warm, { timeout: 15000 }) : window.setTimeout(warm, 15000);
    return () => {
      root?.removeEventListener('pointerdown', onIntent);
      root?.removeEventListener('focusin', onIntent);
      if (ric) window.cancelIdleCallback(idleId as number);
      else window.clearTimeout(idleId as number);
    };
  }, [redirectHome]);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  /* the platform's two product blocks: the student surface + the
   * teacher cockpit (the honest pair a visitor must see first).
   * R323 (A3 · defect 6): the raster captures retired — the section
   * draws ONE designed product frame (sections/Product.tsx); the
   * honest disclosure is the frame's own «بيانات تجريبية» line. */

  /* One render clock for the whole sheet — the vision strip's meta
   * row and the footer's © row read the same value. */
  const year = new Date().getFullYear();

  return (
    <div
      ref={rootRef}
      className={[
        'landing',
        introDone ? 'intro-done' : 'intro-draw',
      ].join(' ')}
    >

      {/* R333 P-D — the entrance sequence (once per session via the
          introGate session flag; RM/save-data visitors skip entirely).
          onExitStart flips the sheet to intro-done the moment the
          wipe opens — the hero's ink-in draws WHILE the preloader
          reveals it, and the consent banner mounts beneath the
          reveal (never overlapping the overlay). */}
      {introPlaying && (
        <Preloader
          onExitStart={() => setIntroDone(true)}
          onDone={() => {
            setIntroDone(true);
            setIntroPlaying(false);
          }}
        />
      )}

      {/* P3-24: skip-to-content — first Tab stop, hidden until focused. */}
      <a href="#main" className="fo-skip-link">تخطَّ إلى المحتوى</a>

      {/* ═══ THE SHEET FRAME (R313 · D9 → R315 K-A4) — the reference's
          page frame is EXACTLY four 1px hairlines at the 7px inset
          (E-crawl ground truth: .main-deco = 4 lines, NO plus marks, NO
          mono coordinates at the frame edges — nothing that can ever
          collide with the masthead at any width). The drafting ± marks
          live on the hero window's own corners (.bp-plus/.bp-dmark),
          where the reference carries them. ═══ */}
      <div className="sheet-frame" aria-hidden="true" />

      {/* R314 (V3) → R318 (C2): the measured paper grain + dotted
          micro-grid film (scripts/r314/grain-measure.json) now seats on
          body::before while the landing is mounted (the effect below
          toggles the body class) — pseudo-elements are not LCP
          candidates, so the decorative film can never be the page's
          LCP again. Visual coverage identical: fixed, full-viewport,
          under content, pointer-transparent. */}

      {/* R315 (K-A5): the top orange scroll-progress bar is RETIRED —
          the reference has nothing at the frame's top edge (E-crawl
          ground truth: no element above the header band, no progress
          ribbon). Progress stays legible through the sheet's own
          landmarks; the imperative scroll rAF keeps only the header
          hide/show latch. */}

      {/* ── The masthead — R331 (A-Web-Nav): the Heron-measured bar
          (transparent paper in every state, the on-scroll/on-hide
          state machine, the clip-path menu) lives in its own chrome
          component with its own stylesheet — see
          components/landing/chrome/SheetNav.tsx + styles/r331/nav.css
          and docs/redesign/r331/web-nav.md. ── */}
      <SheetNav />

      <main id="main" tabIndex={-1}>

        {/* ═══ [1] HERO — R331 (A-Web-Hero): the Heron-mechanics
            rebuild. ONE art band (the drafting stage: ink + wiping
            frame + ruler chrome + deco cards + the inspection
            instrument) over ONE content band (masked-line H1 ‖ 1px
            divider ‖ sub + the register CTA + the login secondary)
            closed by the work strip — the reveal grammar, motion
            values and layer stack of docs/redesign/r331/heron-program.md
            §4, on Madarek's own artwork and copy. The component owns
            the whole block (and imports styles/r331/hero.css). ═══ */}
        <Hero />

        {/* ═══ [2] statement — the scrub-revealed declaration + the
            documented-universities partner strip. The scrub driver
            above (--wr-p) measures the refs this component receives. */}
        <Statement sectionRef={statementRef} titleRef={statementTitleRef} />

        {/* ═══ [3] live — the four pains. The ≤767 snap-carousel belt
            above drives the two refs this component receives. */}
        <Live colsRef={pmColsRef} dotsRef={pmDotsRef} />

        {/* ═══ [4] chapters — the pinned map (the reference's 51%
            walkthrough): the walkthrough's own pin driver lives in
            JourneyScene. */}
        <Chapters />

        {/* ═══ [5] product — the ONE drawn product frame + the real
            capture proof strip (self-contained in the section). */}
        <Product />

        {/* ═══ [6] why — the Watch/Check/Test/Master stage strip (the
            cross-fade scrub lives inside WhyScene). */}
        <Why />

        {/* ═══ [7] roles — the hairline ledger of the five roles +
            three honest personas (self-contained). */}
        <Roles />

        {/* ═══ [8] vision/cta — the resolve + the colleges registry
            strip (the same render year the footer's © row reads). */}
        <Vision year={year} />
      </main>

      {/* ═══ [9] FOOTER — the inspection strip (FooterLens) + the
          cell grid + the giant wordmark + the legal row. ═══ */}
      <Footer year={year} />

      {/* R314 B10 — the landing chrome pair: the local-storage consent
          gate (V11) + the right-edge vertical tab (V12). Public surface
          only — these never mount on auth pages.
          R333 P-D — the consent banner waits for the preloader's exit
          (introDone flips at wipe-start / the `mdrk:entry-done` event;
          no overlay overlap), while the tab is not an overlay and
          mounts as before. */}
      {introDone && <ConsentBanner />}
      <EdgeTab />

      {/* r339 T-18 (A6) — the scroll progress rule (the splitting 1px
          pair at 50vh + the mono % readout). Decorative chrome under
          the nav (z45); reduced motion never mounts it (the component's
          own matchMedia guard + the scroll-rule.css belt). */}
      <ScrollRule />

      {/* R340 T-P1x — the boot-log strip (the fill rail + the mono
          counter + the stage word) at the frame's inline-end edge: the
          scroll-tied status twin of the rule's % readout. Same laws:
          decorative chrome (z45), reduced motion never mounts it. */}
      <BootLog />

      {/* R308 → R333 P-D — the custom pointer instrument, mounted LAST
          (fine pointers only; reduced motion and touch keep the native
          cursor). Its dedicated sheet is styles/landing/cursor.css. */}
      <SheetCursor />
    </div>
  );
}
