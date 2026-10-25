import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { StarMark } from '../components/StarMark';
import { ThemeToggle, useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { colleges } from '../data/colleges.config';
import {
  PRODUCT_CAPTURES, ROLE_CAPTURES, ROLE_SHOWCASES,
} from '../data/university-media';
import { LIVE_CAPABILITIES, LIVE_COUNT } from '../data/landing-ledger';
import { formatInt } from '../utils/numbers';
import { RevealCssClass } from '../hooks/useReveal';
import { ProductFrame } from '../components/landing/ProductFrame';
import { PlatformCanvas } from '../components/landing/PlatformCanvas';
import { HeroInkWindow } from '../components/landing/HeroInkWindow';
import { StatementArt } from '../components/landing/StatementArt';
import { WhyScene } from '../components/landing/WhyScene';
import { PainArt } from '../components/landing/PainArt';
import { SheetLoader } from '../components/landing/SheetLoader';
import { SheetCursor } from '../components/landing/cursor/SheetCursor';
import { HeroInspect } from '../components/landing/cursor/HeroInspect';
import { JourneyScene } from '../components/landing/journey/JourneyScene';
import { ScrubReveal } from '../components/landing/journey/WordReveal';
import { FooterLens } from '../components/landing/footer/FooterLens';
import { FooterMarkArt, WordmarkArt } from '../components/landing/FooterArt';
import { ConsentBanner } from '../components/landing/chrome/ConsentBanner';
import { EdgeTab } from '../components/landing/chrome/EdgeTab';
import { shouldPlayIntro, introEnvironment } from '../lib/motion/introGate';
import { useSheetScroll } from '../lib/motion/useSheetScroll';
import { clamp } from '../lib/motion/sheetConductor';
import { acquireScrollLock, releaseScrollLock } from '../lib/scrollLock';
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
import '../styles/landing.css';
// r314-chrome.css — R314 B10 — the consent banner (V11) + the right-edge
// vertical tab (V12): the landing chrome pair, Heron geometry with
// Madarek's own honest content.
import '../styles/r314-chrome.css';

/**
 * Landing — «لوحة مدارك» (r306 sheet → R313 Heron structure).
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

/* ── r309 (§3): the mobile menu's scroll-lock holder key — the open menu
 * owns the viewport via the ref-counted body lock (lib/scrollLock). */
const MENU_SCROLL_LOCK_KEY = 'landing-mobile-menu';

/* ── Computed truths (BLUEPRINT §6 sources): 25 colleges in 3 campuses
 * from the real registry. R315 (K-E): the training-track, quality-board
 * and institution-isolation counts moved to /capabilities with their
 * ledger rows — the landing keeps painting only the campus count. */
const CAMPUS_COUNT = new Set(colleges.map((c) => c.cityAr ?? '')).size;

/* ── The r307 media truth: distinct Libyan universities documented —
 * Benghazi, Tripoli, Omar Al-Mukhtar (photos) + Misurata, Sebha
 * (official-channel videos). Computed here, not invented: each
 * institution has verified identity evidence in manifest.json. The
 * documentary media itself lives on /campus (R313); this count feeds
 * the title block + the universities ticker below. */
const MEDIA_UNIVERSITY_COUNT = 5;
const DOCUMENTED_UNIVERSITIES = [
  'جامعة بنغازي',
  'جامعة طرابلس',
  'جامعة عمر المختار',
  'جامعة مصراتة',
  'جامعة سبها',
] as const;

/* ── The four pains (R313 · D7 §3) — the honest inverse of the live
 * ledger: each pain names a real gap in Libyan higher-ed today and is
 * answered by a capability that WORKS in the system (the full matrix
 * lives on /capabilities). No invented statistics — only the pains the
 * product itself was built to solve, framed from the ledger's truth. */
const PAINS = [
  {
    num: '01',
    title: 'محاضرة بلا أثر مقيس',
    text: 'تُلقى المحاضرة ثم ينتهي أثرها: لا نقطة فحص تُثبِّت الفهم، ولا حضور يُحتسب تلقائيًا.',
    answer: 'الجواب: المحاضرات التفاعلية بنقاط الفحص',
  },
  {
    num: '02',
    title: 'تصحيح يأتي متأخرًا',
    text: 'تمرّ أسابيع قبل أن يعرف الطالب خطأه — وفرصة المراجعة تكون قد فاتت.',
    answer: 'الجواب: التصحيح التلقائي للموضوعي',
  },
  {
    num: '03',
    title: 'غياب خريطة الإتقان',
    text: 'الطالب يعرف درجته النهائية، لا مفاهيمه الناقصة ولا خطوته التالية.',
    answer: 'الجواب: مصفوفة الإتقان لكل مفهوم',
  },
  {
    num: '04',
    title: 'بحوث تُسلَّم وتُنسى',
    text: 'البحث يُقدَّم ورقيًا ثم يختفي: لا فهرسة ولا بحث عربي ولا مراجعة معلَّمة تبقى.',
    answer: 'الجواب: مكتبة البحوث بالفهرسة العربية',
  },
] as const;

/* ── The three personas (R313 · D7 §7) — honest segments the platform
 * serves or is building for. No invented features: the researcher rides
 * the LIVE research library; the lab supervisor states the ACTUAL
 * in-development status; the guardian states the ACTUAL absence of a
 * separate account today. */
const PERSONAS = [
  {
    num: '06',
    title: 'الباحث',
    line: 'طالب أو أستاذ يكتب بحثه: رفع PDF، وفحص نزاهة معلَن، وملاحظات معلَّمة من الأستاذ.',
    state: 'تعمل اليوم' as const,
    live: true,
  },
  {
    num: '07',
    title: 'مشرف المعمل',
    line: 'المعامل الافتراضية قيد التطوير — فهرس للاستعراض دون تشغيل بعد.',
    state: 'قيد التطوير' as const,
    live: false,
  },
  {
    num: '08',
    title: 'وليّ الأمر',
    line: 'لا حساب منفصل لوليّ الأمر اليوم — المتابعة تمرّ عبر تقرير الطالب نفسه.',
    state: 'غير متاح بعد' as const,
    live: false,
  },
] as const;

/* ── R313 (D8 · the header nav) — the reference's four-seat register:
 * two plain links + two dropdown parents (Heron: PRODUCT ▾ / PRICING /
 * RESOURCES ▾ / ABOUT), mapped onto the sheet's own sections. The
 * children mirror the desktop dropdowns and flatten into the mobile
 * menu's sub-index — every pinned anchor (#statement #chapters #live
 * #roles #colleges #vision) stays reachable from the bar. */
type NavSeat = { label: string; href: string; children?: readonly { label: string; href: string }[] };

const NAV_SEATS: readonly NavSeat[] = [
  {
    label: 'الرحلة', href: '#chapters',
    children: [
      { label: 'البيان', href: '#statement' },
      { label: 'المبدأ والرؤية', href: '#vision' },
    ],
  },
  { label: 'المنصّة', href: '#product' },
  {
    label: 'المجتمع', href: '#roles',
    children: [
      { label: 'التحديات', href: '#live' },
      { label: 'الأدوار والشرائح', href: '#roles' },
      { label: 'الكليات التجريبية', href: '#colleges' },
    ],
  },
  { label: 'الجامعات', href: '/campus' },
] as const;

/* R313-int (5-int · failure 7): «الفصول» dropped — it duplicated its
 * own seat's #chapters target (two menu links to one anchor → the
 * strict-mode pin in r309 'navigates-and-closes-the-menu'). «ما يعمل
 * اليوم» moved out of the DROPDOWN (its always-rendered hidden text
 * was the first DOM-order match for the honesty-ledger locator, so
 * the visible-at-top contract in guest-landing could never resolve);
 * the ledger link now lives in the hero value row (the disclosure
 * chip), in the footer, in the #live foot — and in the MOBILE menu's
 * sub-index below (r170d pins it there). */
const MOBILE_LEDGER_ROW = { label: 'ما يعمل اليوم', href: '/capabilities' } as const;

/* The dual-label roll (the reference's .btn-fill-label label-top/bot
 * pair — WP-D's .btn-motion-label grammar, retold for nav cells): the
 * live row in flow + an aria-hidden duplicate parked one row below;
 * the track's -100% slide travels exactly one row. The dup is out of
 * flow, so wrapping (≤420px) never desynchronises the two rows. */
function RollLabel({ text }: { text: string }) {
  return (
    <span className="fo-roll">
      <span className="fo-roll-track">
        <span className="fo-roll-txt">{text}</span>
        <span className="fo-roll-txt fo-roll-dup" aria-hidden="true">{text}</span>
      </span>
    </span>
  );
}

/* The 5×5 mark pair on dropdown parents (the reference's
 * .header-menu-item-ic top/bot): a hairline chevron at rest, rolling
 * to the solid signal square on hover — transform-only, on the
 * reference's own register (0.5s · cb(.23,1,.32,1)). CSS-drawn (the
 * reference uses divs too) — no icon-gate surface. In RTL the chevron
 * points inline-forward (left), mirroring Heron's `>`. */
function NavMark() {
  return (
    <span className="fo-nav-ic" aria-hidden="true">
      <span className="fo-nav-ic-layer"><span className="fo-nav-ic-chev" /></span>
      <span className="fo-nav-ic-layer fo-nav-ic-b"><span className="fo-nav-ic-sq" /></span>
    </span>
  );
}

/* One dropdown parent: a real button (aria-expanded) whose panel is
 * the reference's grid-rows + opacity fold (transition "opacity .4s,
 * grid-template-rows .4s" — measured). One state drives hover, focus
 * and click: pointerenter opens only for real mice (touch taps go to
 * the click toggle), focus walking into the cell opens the panel, and
 * Escape closes + refocuses the trigger. */
function HeaderNavDropdown({ seat }: { seat: (typeof NAV_SEATS)[number] }) {
  const [open, setOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="fo-nav-item"
      ref={cellRef}
      data-open={open ? 'true' : undefined}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          cellRef.current?.querySelector('button')?.focus();
        }
      }}
    >
      <button
        type="button"
        className="fo-nav-link"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <RollLabel text={seat.label} />
        <NavMark />
      </button>
      <div className="fo-drop">
        <div className="fo-drop-inner">
          {(seat.children ?? []).map((c) => (
            <a key={c.href} href={c.href} className="fo-drop-link" onClick={() => setOpen(false)}>
              <RollLabel text={c.label} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* The desktop nav — four seats over the bar's full height. Plain
 * seats are plain links (router-internal for routes, anchors for the
 * sheet's sections). */
function HeaderNav() {
  return (
    <nav className="fo-nav" aria-label="التنقل الرئيسي">
      {NAV_SEATS.map((seat) => {
        if (seat.children) return <HeaderNavDropdown key={seat.label} seat={seat} />;
        return seat.href.startsWith('#') ? (
          <a key={seat.href} href={seat.href} className="fo-nav-link">
            <RollLabel text={seat.label} />
          </a>
        ) : (
          <Link key={seat.href} to={seat.href} className="fo-nav-link">
            <RollLabel text={seat.label} />
          </Link>
        );
      })}
    </nav>
  );
}

/* ── R314 (V1/V2): the STAGES hotspot row + details panel retired with
 * the thin-line elevation — the reference hero carries the ink rendering
 * + the inspection instrument's own markers, no stage panel. The stage
 * COPY lives on in HeroInspect's honest station annotations. */

/* ── R315 (K-E): the Mini demo frames + the chapters 05–06 ledger rows
 * are RETIRED. They were R310-era leftovers (demo-tagged fragments
 * with big orange numerals) that do not exist in the reference's
 * grammar — the reference's map band is the pinned walkthrough alone.
 * The honest content (community/training, quality/governance) lives on
 * /capabilities; the ledger link stays in the mobile menu, the footer
 * and the #live section foot. */

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

  const [menuOpen, setMenuOpen] = useState(false);

  /* R318 (C2) — the grain's body seat: mounted class in, unmounted out
   * (the pseudo-element film is landing-only, exactly like the old
   * .fo-grain div; idempotent both ways). */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.add('mdrk-grain');
    return () => document.body.classList.remove('mdrk-grain');
  }, []);

  /* R308 — the statement title's scrub driver: --wr-p (0..1) rides
   * the section's traversal; the word masks resolve + reverse with
   * it (imperative, zero renders — the useSheetScroll contract).
   * R318 (C2): idempotent write (same-string setProperty still
   * invalidates style every frame). */
  const statementRef = useRef<HTMLElement>(null);
  let lastWrP = '';
  useSheetScroll(statementRef, ({ rect, vh }) => {
    const el = statementRef.current;
    if (!el) return;
    const p = clamp((vh * 0.9 - rect.top) / (vh * 0.8), 0, 1).toFixed(4);
    if (p !== lastWrP) {
      el.style.setProperty('--wr-p', p);
      lastWrP = p;
    }
  });

  /* R313 (D11): the exit sweep is installed at the GUEST boundary
   * (GuestReveal — every public-page navigation), no longer scoped to
   * the landing root. */
  /* R308 — the CTA's corner coordinates: real document-space values
   * of the section's corners, written once the layout settles. */
  const ctaRef = useRef<HTMLElement>(null);
  const ctaCoordsRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const write = () => {
      const cta = ctaRef.current;
      const out = ctaCoordsRef.current;
      if (!cta || !out) return;
      const r = cta.getBoundingClientRect();
      const top = Math.round(window.scrollY + r.top);
      const left = Math.round(window.scrollX + r.left);
      out.textContent = `[0,${top}] [${left},0] [${Math.round(left + r.width)},0] [0,${Math.round(top + r.height)}]`;
    };
    write();
    const t = window.setTimeout(write, 600);
    window.addEventListener('resize', write, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', write);
    };
  }, []);
  // F2-5 (r157): mobile-menu contract — Escape closes + refocuses the
  // burger (its aria-label flips with the state). r307: an open menu
  // also closes on an outside tap (touch users get no blur event from
  // a tap on the page behind the card).
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  // Scroll chrome on refs, written imperatively — no React re-render
  // per scroll event (the r172 pattern, kept).
  const headerRef = useRef<HTMLElement>(null);
  // R318 (C2) — the auth-warm intent listener's anchor (the root).
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

  // Scroll-driven chrome with ZERO setState: coalesced to one rAF per
  // frame, written straight to the DOM. r307 (1-C H-2): the apply()
  // is ALSO reconciled on load / resize / fonts-ready — late media
  // (photos) reflows document height and the ribbon must not drift
  // while the visitor sits still.
  //
  // R313 (D8) — the header rides the REFERENCE's class vocabulary
  // (telemetry/header-states.json, direct scrollTop sets):
  //   top           → `header`            (clean)
  //   scrolled      → `header on-scroll on-hide`
  //   back to top   → `header on-hide`    (on-scroll drops, on-hide
  //                                       LATCHES — never removed)
  // `on-scroll` (the old `.scrolled`) flips at y>6 and also takes the
  // solid-paper background. `on-hide` latches on the first
  // scroll-down past the floor. The VISUAL hide/show itself is an
  // imperative transform written from this same rAF (the reference
  // drives its bar from GSAP; a style write is our equivalent — the
  // class list stays exactly the measured vocabulary): down past the
  // floor lifts the bar clear of the frame, up — or near the top —
  // seats it back. An open dropdown holds the bar; reduced motion
  // keeps it pinned (the classes still flip — state, not motion).
  useEffect(() => {
    const header = headerRef.current;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* R318 (C2) — the scroll read rides the EVENT, not the frame: a
     * scrollY read inside rAF lands AFTER the sheet driver's style
     * writes and forces a synchronous full-document layout every
     * frame (639ms self @1440 in the CDP profile). The handler
     * (passive, fires before rAF callbacks) snapshots the seat once
     * per event; apply() only WRITES — and the transform write is
     * idempotent (same-string assignments still invalidate style). */
    let pendingY = window.scrollY;
    let lastY = pendingY;
    let lastTf: string | null = null;
    let lifted = false;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = pendingY;
      if (header) {
        header.classList.toggle('on-scroll', y > 6);
        const delta = y - lastY;
        lastY = y;
        const holds = header.querySelector('[aria-expanded="true"]') !== null;
        if (!holds) {
          if (y < 40) lifted = false;
          else if (delta > 8) {
            lifted = true;
            header.classList.add('on-hide');
          } else if (delta < -8) {
            lifted = false;
          }
        }
        const tf = lifted && !reduced
          ? 'translateY(calc(-100% - 8px))'
          : '';
        if (tf !== lastTf) {
          header.style.transform = tf;
          lastTf = tf;
        }
      }
    };
    const onScroll = () => {
      pendingY = window.scrollY;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', onScroll);
    document.fonts?.ready?.then?.(onScroll).catch(() => undefined);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('load', onScroll);
      // r307 (1-C M-1): cancel the pending frame by its id — the old
      // form passed the handler (coerced to NaN) and one stray frame
      // fired after unmount.
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // r307 (1-C M-5): the mobile menu closes on an outside tap — touch
  // taps on the page behind the card never blur the menu, so an
  // explicit pointerdown guard fences the open state.
  //
  // r309 (§3): the open menu OWNS the viewport — the ref-counted body
  // scroll lock (lib/scrollLock, the app's own overlay contract) stops
  // the background document from scrolling behind the fixed panel
  // (the production audit measured scrollY 0→500 through an open
  // menu). Idempotent per holder: repeated open/close cycles and
  // StrictMode's mount→cleanup→mount cycle net out cleanly, and the
  // class-based lock never touches anyone's inline overflow style.
  useEffect(() => {
    if (!menuOpen) return undefined;
    acquireScrollLock(MENU_SCROLL_LOCK_KEY);
    return () => releaseScrollLock(MENU_SCROLL_LOCK_KEY);
  }, [menuOpen]);
  // r309 (§3.3): Escape closes the open menu FROM ANYWHERE — the old
  // handler sat on the nav's own onKeyDown and only fired while focus
  // was inside the menu; with focus still on the trigger (the common
  // open-by-tap state) Escape did nothing. The document-level guard
  // is installed only while the menu is open and refocuses the
  // trigger on close (the F2-5 contract).
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      burgerRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const menu = menuRef.current;
      const t = e.target as Node | null;
      if (!t) return;
      /* inside the panel — the panel owns the tap (link rows close on
       * their own click; the theme row stops propagation). */
      if (menu?.contains(t)) return;
      /* R313-int (5-int · failure 4 — REAL BUG): an outside tap on the
       * BURGER itself must be left to the burger's own toggle. The old
       * guard closed the menu on pointerdown, then the burger's click
       * toggled false→true and the menu re-mounted within the same
       * interaction — the overlay could never be closed by its own
       * trigger (the r309 'closing-restores-the-position' pin). */
      if (burgerRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  /* the platform's two product blocks: the student surface + the
   * teacher cockpit (the honest pair a visitor must see first). */
  const teacherCapture = ROLE_CAPTURES.find((c) => c.id === 'teacher-dashboard');

  return (
    <div
      ref={rootRef}
      className={[
        'landing',
        introDone ? 'intro-done' : 'intro-draw',
      ].join(' ')}
    >

      {/* R308 — the entrance sequence (once per session; the loader
          gates itself again on the pure decision and calls onDone).
          R310: onExitStart flips the sheet to intro-done the moment
          the exit slit opens — the hero's ink-in draws WHILE the
          loader reveals it (a seamless entrance→page transition, per
          the R310 spec §3.1). */}
      {introPlaying && (
        <SheetLoader
          onExitStart={() => setIntroDone(true)}
          onDone={() => {
            setIntroDone(true);
            setIntroPlaying(false);
          }}
        />
      )}

      {/* R308 — the custom pointer instrument (fine pointers only;
          reduced motion and touch keep the native cursor). */}
      <SheetCursor />

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

      {/* ── Masthead (R313 · D8) — the reference's fixed 56px bar at
          the 7px frame inset: transparent at rest (the frame's top
          rule shows through), solid paper when scrolled (.on-scroll),
          lifting away on scroll-down via the imperative transform
          (the .on-hide class latches — the measured vocabulary).
          RTL-mirrored seating: brand inline-start (right), the
          four-seat nav, the actions at the far end behind a vertical
          hairline (the reference's line before its CTA). ── */}
      <header className="fo-header" ref={headerRef}>
        {/* R315 (K-B) — the reference's measured cell grammar (E-crawl
            heron-dom @1440×900): one 56.3px row of CELLS separated by
            1px #B3B3AF rules — [logo cell 705 | nav cells 4×136.67 |
            actions cells | CTA cell 166.66] with a bottom hairline,
            nothing else. RTL-mirrored: the logo cell seats inline-start
            (right), the CTA cell ends the row (left). The tagline stack
            is retired (the reference's logo cell = mark + wordmark);
            «تسجيل الدخول» + the theme seats ride as their own cells —
            honest function the reference doesn't need, in the same
            cell language. */}
        <div className="fo-header-inner">
          <Link to="/" className="fo-brand" aria-label="مدارك — منصّة التعليم الذكي">
            <StarMark size={30} className="fo-brand-mark" />
            <span className="fo-brand-name">مدارك</span>
          </Link>

          <HeaderNav />

          <div className="fo-header-actions">
            <ThemeToggle />
            <Link to="/auth" className="fo-actions-login">تسجيل الدخول</Link>
            <Link to="/auth/register" className="fo-actions-cta">
              <RollLabel text="ابدأ الآن" />
              <Icon icon={ArrowLeft} size={14} className="fo-actions-cta-arrow" aria-hidden />
            </Link>
          </div>

          {/* <992px (the reference's own breakpoint): the bar collapses
              to the wide MENU button — 187×50 @390 — label + a 2-line
              mark that folds to one line while the overlay is open. */}
          <button
            type="button"
            className="fo-burger"
            ref={burgerRef}
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="fo-burger-label">القائمة</span>
            <span className="fo-burger-ic" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        {menuOpen && (
          <nav
            className="fo-mobile-menu"
            /* R313 (4-b · D6): while the Lenis engine is live on '/', a
               wheel/touch inside this panel must scroll the PANEL (its
               own overflow-y), never the page behind it — the engine's
               own vocabulary for exactly this (checked in composedPath
               before any preventDefault). */
            data-lenis-prevent=""
            ref={menuRef}
            aria-label="قائمة الجوال"
            onClick={(e) => {
              // Link taps close the menu; taps on non-link chrome must
              // not (the theme row stops propagation for its toggle).
              if ((e.target as HTMLElement).closest('a')) setMenuOpen(false);
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setMenuOpen(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setMenuOpen(false);
                burgerRef.current?.focus();
                return;
              }
              /* the open overlay is a focus trap: Tab cycles inside it
                 (the burger re-takes focus itself on close). */
              if (e.key === 'Tab') {
                const items = menuRef.current?.querySelectorAll<HTMLElement>(
                  'a[href], button:not([disabled])',
                );
                if (!items || items.length === 0) return;
                const first: HTMLElement | undefined = items[0];
                const last: HTMLElement | undefined = items[items.length - 1];
                if (!first || !last) return;
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            {/* the four seats as flat 40px rows (the reference's own
                mobile register), then the dropdown children as the
                mono sub-index — every section reachable without an
                expand/collapse dance, every row a real link. */}
            {NAV_SEATS.map((seat) => (
              seat.href.startsWith('#') ? (
                <a key={seat.href} href={seat.href} className="fo-mb-row">{seat.label}</a>
              ) : (
                <Link key={seat.href} to={seat.href} className="fo-mb-row">{seat.label}</Link>
              )
            ))}
            <div className="fo-mb-sub" aria-label="أقسام الصفحة">
              {NAV_SEATS.flatMap((seat) => seat.children ?? []).map((c) => (
                <a key={c.href} href={c.href} className="fo-mb-row fo-mb-sub-row">{c.label}</a>
              ))}
              {/* R313-int (5-int · failure 1): the honest-ledger row keeps
                  «ما يعمل اليوم» reachable from the mobile bar (the r170d
                  pin) after it left the desktop dropdown. */}
              <Link to={MOBILE_LEDGER_ROW.href} className="fo-mb-row fo-mb-sub-row">
                {MOBILE_LEDGER_ROW.label}
              </Link>
            </div>
            <div
              className="fo-mobile-theme"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="fo-mobile-theme-label">المظهر</span>
              <ThemeToggle />
            </div>
            <Link to="/auth" className="btn ghost">تسجيل الدخول</Link>
            {/* the reference's .header-cta.only-mb — the 51px register
                seat INSIDE the overlay (the desktop CTA is hidden). */}
            <Link to="/auth/register" className="btn primary fo-mb-cta">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </nav>
        )}
      </header>

      <main id="main" tabIndex={-1}>

        {/* ═══ [1] HERO — R314 «الحقيقة البصرية» (V1/V2/V10): the
            reference's exact composition — ONE framed ink window (the
            building ≈65% of the viewport height, centred, own subject +
            own licence — never Heron's artwork) with the corner +
            marks, ruler ticks and the local inspection instrument; then
            a 133px bottom strip of cells: the GIANT tight H1 at the
            inline-start edge (3 lines, 46.67px/1.0 measured), the intro
            paragraph + honest [LIVE] disclosure, and the DISCOVER MORE
            link with the orange arrow. The thin-line elevation, the
            stage panel and the in-hero ticker retire (the ticker rides
            the intro band per the reference's 9-section structure). ═══ */}
        <section className="fo-hero" aria-label="مدارك — منصّة التعليم الذكي">
          <RevealCssClass as="div" className="fo-hero-window" delay={2}>
            <div className="bp-stage" data-cursor="none">
              {/* The ink rendering rides the SAME 1440×640 viewBox frame
                  (.bp-svg) so the HeroInspect instrument, its guides and
                  its honest station markers keep ONE coordinate system. */}
              <HeroInkWindow />
              <HeroInspect />
              <div className="bp-rulers" aria-hidden="true">
                <span className="bp-ruler bp-ruler-t" />
                <span className="bp-ruler bp-ruler-b" />
                <span className="bp-ruler bp-ruler-s" />
                <span className="bp-ruler bp-ruler-e" />
                <span className="bp-plus bp-plus-tl">+</span>
                <span className="bp-plus bp-plus-tr">+</span>
                <span className="bp-plus bp-plus-bl">+</span>
                <span className="bp-plus bp-plus-br">+</span>
                {/* R315 (B1 · A.3): the small ± registration marks at the
                    dashed inner frame's corners (the reference's inner
                    drafting chrome, 15–20px inside the window edge). */}
                <span className="bp-dmark bp-dmark-tl">+</span>
                <span className="bp-dmark bp-dmark-tr">+</span>
                <span className="bp-dmark bp-dmark-bl">+</span>
                <span className="bp-dmark bp-dmark-br">+</span>
              </div>
            </div>
          </RevealCssClass>

          {/* the bottom strip — 133px of cells (the measured reference
              band): H1 cell ≈47% at the inline-start edge · paragraph cell
              (lead + honest [LIVE] disclosure + the register CTA) · the
              DISCOVER MORE link cell at the far end (R315 A.2: 3 cells,
              RTL-mirrored). */}
          <div className="fo-hero-strip">
            <RevealCssClass as="h1" className="fo-hero-title" delay={1}>
              {/* R315 (B1 · A.2): the display canon — UNVOCALISED Arabic
                (zero tashkeel: the reference's display type is clean;
                diacritics collided with the line above), 2 lines max,
                lh 1.0, w700 on the --fs-h1 ladder rung (46.67px @1440).
                The 2-line split «رحلة تعلم واحدة / من المحاضرة إلى
                الإتقان» is the largest ladder size that holds exactly 2
                lines at 1440 AND 390 (measured in _local/b1-preview);
                the tablet band re-clamps for the narrower measure. */}
              رحلة تعلم واحدة
              <br />
              من المحاضرة إلى الإتقان
            </RevealCssClass>

            <div className="fo-hero-side">
              <RevealCssClass as="p" className="fo-hero-lead" delay={3}>
                محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل —
                تجربة عربية واحدة لخمسة أدوار وثلاث شرائح.
              </RevealCssClass>
              <RevealCssClass as="div" className="fo-hero-side-foot fo-hero-actions" delay={4}>
                {/* the honesty-ledger disclosure — the reference's own
                    mono micro-label grammar (r191 contract kept). */}
                <Link to="/capabilities" className="fo-hero-disclosure">
                  <span className="fo-mono" dir="ltr">[LIVE]</span>
                  <span>ما يعمل اليوم</span>
                </Link>
                {/* the funnel contract (r164b → r188, kept by the R314
                    owner order): the hero carries the register + login
                    pair — compact canonical seats beside the discover
                    link, never a second primary per viewport. */}
                <Link to="/auth/register" className="btn accent lg fo-hero-cta">
                  أنشئ حسابك الجامعي
                  <Icon icon={ArrowLeft} size={16} />
                </Link>
              </RevealCssClass>
            </div>

            {/* the third cell — the reference's far-end discover link
                (143×97 seat): «اكتشف المزيد» + the orange arrow, its own
                strip cell (R315 A.2 — it was buried inside the actions
                row; the 3-cell band is the measured composition). */}
            <RevealCssClass as="div" className="fo-hero-link-cell" delay={4}>
              <a href="#statement" className="fo-hero-discover">
                <span className="fo-hero-discover-label">اكتشف المزيد</span>
                <Icon icon={ArrowLeft} size={14} className="fo-hero-discover-arrow" aria-hidden />
              </a>
            </RevealCssClass>
          </div>
        </section>

        {/* ═══ [2] البيان — the statement (the reference's intro): the
            scrub-revealed declaration + the documented-universities
            ticker. r308: the title unmasks word-by-word, scrub-linked +
            reversible to the scroll. ═══ */}
        <section id="statement" className="st-section" ref={statementRef} aria-labelledby="statement-title">
          {/* R314: the capabilities ticker rides the intro band's top
              hairline cell (the reference's intro-cell marquee — moved out
              of the hero). The loop grammar (authored choreography,
              duplicated aria-hidden track, reduced-motion static row) is
              unchanged. */}
          <div className="fo-ticker" aria-label="قدرات تعمل اليوم">
            <div className="fo-ticker-track" aria-hidden="false">
              {LIVE_CAPABILITIES.map((cap, i) => (
                <span key={cap} className="fo-ticker-item">
                  <span className="fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
                  {cap}
                </span>
              ))}
            </div>
            <div className="fo-ticker-track" aria-hidden="true">
              {LIVE_CAPABILITIES.map((cap, i) => (
                <span key={cap} className="fo-ticker-item">
                  <span className="fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
                  {cap}
                </span>
              ))}
            </div>
          </div>
          <div className="st-spread">
            <div className="st-copy">
              <span className="fo-label"><span className="fo-mono" dir="ltr">[02]</span> البيان</span>
              <h2 id="statement-title" className="st-title">
                <ScrubReveal text="منصّة واحدة تخدم الرحلة كلها" />
              </h2>
            </div>
            <div className="st-lines">
              <RevealCssClass as="p" className="st-line">
                <strong>للطالب</strong>
                <span>تشاهد محاضرة تفاعلية، فتُقاس فهمك لحظة بلحظة، فتعرف خطوتك التالية.</span>
              </RevealCssClass>
              <RevealCssClass as="p" className="st-line" delay={1}>
                <strong>للأستاذ</strong>
                <span>تبني المحاضرة والاختبار، وتصحّح الواجبات بملاحظات مكتوبة، وترى من يحتاجك الآن.</span>
              </RevealCssClass>
              <RevealCssClass as="p" className="st-line" delay={2}>
                <strong>للإدارة</strong>
                <span>تدير الكليات والمقرّرات والصلاحيات، وترى مؤسّستك حيّة على مستوى كل قسم.</span>
              </RevealCssClass>
            </div>
          </div>

          {/* the universities ticker — the documented institutions
              (photos + official-channel videos live on /campus). The
              same crawl grammar as the hero band, honest content. */}
          <div className="fo-ticker fo-ticker--universities" aria-label="جامعات ليبية موثّقة في الوسائط">
            <div className="fo-ticker-track" aria-hidden="false">
              {DOCUMENTED_UNIVERSITIES.map((u, i) => (
                <span key={u} className="fo-ticker-item">
                  <span className="fo-mono" dir="ltr">[U{String(i + 1).padStart(2, '0')}]</span>
                  {u}
                </span>
              ))}
            </div>
            <div className="fo-ticker-track" aria-hidden="true">
              {DOCUMENTED_UNIVERSITIES.map((u, i) => (
                <span key={u} className="fo-ticker-item">
                  <span className="fo-mono" dir="ltr">[U{String(i + 1).padStart(2, '0')}]</span>
                  {u}
                </span>
              ))}
            </div>
          </div>

          {/* R315 cycle-4 (c4-C · the s01 verdict): the band's LARGE
              drafted architectural illustration — an original campus
              massing study (the tower's solid poché mass, the orange
              sun, the row-band of small drafted blocks + figures) in
              the reference's family. Seated in the band's OWN measured
              air under the 86.7rem desktop floor (.st-art — hidden
              below 992 where every statement band is content-bound,
              zero drift by construction); the honest statement copy
              above is untouched. */}
          <div className="st-art">
            <StatementArt />
          </div>
        </section>

        {/* ═══ [3] التحديات — the four pains (the reference's problem
            section): numbered cards with draw-in line art, each pain
            answered by a live capability. The full capability matrix
            lives on /capabilities (linked from the section foot). ═══ */}
        <section id="live" className="pm-section" aria-labelledby="pm-title">
          <div className="pm-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[03]</span> التحديات</span>
            <RevealCssClass as="h2" className="pm-title" delay={1} id="pm-title">
              أربعة أوجاع من <em>التعليم العالي الليبي</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="pm-lede" delay={2}>
              ليست أحكامًا على أحد — بل هي المشكلات التي بُنيت مدارك لحلّها.
              تحت كل وجع بند يعمل اليوم داخل المنصّة، والسجل الكامل في صفحة القدرات.
            </RevealCssClass>
          </div>

          <ol className="pm-cards">
            {PAINS.map((p, i) => (
              <RevealCssClass
                as="li"
                key={p.num}
                className="pm-card"
                delay={((i % 3) + 1) as 1 | 2 | 3}
              >
                <span className="pm-card-num fo-mono" dir="ltr">[{p.num}]</span>
                <PainArt kind={p.num} />
                <h3 className="pm-card-title">{p.title}</h3>
                <p className="pm-card-text">{p.text}</p>
                <p className="pm-card-answer"><Icon icon={Check} size={13} /> {p.answer}</p>
              </RevealCssClass>
            ))}
          </ol>

          <RevealCssClass as="p" className="pm-foot" delay={3}>
            <Link to="/capabilities" className="fo-text-link">السجل الكامل — ما يعمل اليوم وإلى أين</Link>
          </RevealCssClass>
        </section>

        {/* ═══ [4] الفصول — the pinned map (the reference's 51%
            walkthrough). r308: chapters 01–04 live in the pinned
            «رحلة التعلّم» walkthrough. R315 (K-E): the 05–06 demo
            rows are retired — the reference's map band is the
            walkthrough alone; the honest ledger lives on
                       /capabilities ═══ */}
        <section id="chapters" className="chapters" aria-labelledby="chapters-title">
          <header className="chapters-head">
            <div className="chapters-head-copy">
              <span className="fo-label"><span className="fo-mono" dir="ltr">[04]</span> الفصول</span>
              <RevealCssClass as="h2" className="chapters-title" delay={1} id="chapters-title">
                الرحلة — <em>أربعة فصول تتحرك أمامك</em>
              </RevealCssClass>
            </div>
            <RevealCssClass as="p" className="chapters-lede" delay={2}>
              مرّر لترى الرحلة تُبنى: أربعة فصول تتحرك في مشهد واحد. لا لقطات مُجمّلة ولا وعود.
            </RevealCssClass>
          </header>

          {/* r308 — «رحلة التعلّم»: the pinned walkthrough. Chapters
              01–04 play out across one persistent drawing while the
              scroll is the timeline (CSS sticky pin; stacked readable
              sequence ≤991px). R313 (D7): the map owns ≈51% of the
              page — the reference's proportion. R315 (K-D): the
              walkthrough reproduces the reference's map states —
              statement → plan on the paper → INTRODUCTION card →
              findings stations with the progress hairline → the red
              room reveal → the closing column. */}
          <JourneyScene />
        </section>

        {/* ═══ [5] المنصّة فعليًا — two product blocks (the reference's
            platform section): the student surface + the teacher
            cockpit. The frames are authentic UI from the seeded demo
            environment (fully synthetic «جامعة مدارك التجريبية» data) —
            labelled with the mono «real-ui» tag + the demo-data
            disclosure on every frame; the CTA scrolls to the conversion
            row (the funnel counts stay exact — no extra auth links
            on the sheet).
            R318 §A5 (c3-plat): the band re-composed onto the reference's
            measured 12-col hairline grammar (361/601/464, RTL-mirrored
            flow): the SHEET (.pr-head — [05] mono label + h4-scale
            sheet-title + the muted sub, the drawing ON the same paper
            inside the sheet's hairline frame) at the reading-start
            edge; the lead frame ≈ the 601 tool canvas; the std frame ≈
            the 464 inspector column with the note under it; the
            full-height hairline rides the canvas|inspector boundary
            (the reference's x=968, mirrored). No h1-class text runs
            under any frame — the title seats INSIDE the sheet's frame.
            The flow (head · frames · note) keeps the tier floors: the
            ≥992 min-block-size rungs are untouched. ═══ */}
        <section id="product" className="pr-section" aria-labelledby="pr-title">
          <div className="pr-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[05]</span> المنصّة فعليًا</span>
            <RevealCssClass as="h2" className="pr-title" delay={1} id="pr-title">
              لا وعود — هذه <em>الواجهة نفسها</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="pr-lede" delay={2}>
              لقطات حقيقية من بيئة العرض: بيانات تجريبية اصطناعية بالكامل داخل «جامعة مدارك التجريبية» —
              ما تراه هنا هو ما يعمل اليوم داخل المنصّة.
            </RevealCssClass>
            {/* the sheet's drawing cell — the plan ON the sheet's paper
                (aria-hidden decorative; hidden with the head at ≤991/992–1024,
                the measured band floors are flow-identical at every tier) */}
            <PlatformCanvas />
          </div>

          <RevealCssClass as="div" className="pr-grid" delay={2}>
            <ProductFrame
              capture={PRODUCT_CAPTURES[0]}
              variant="lead"
              ctaAr="أنشئ حسابك لتجربتها حيّة"
              ctaTo="#cta"
              ctaAnchor
              viewTag="VIEW-A · 1280×800"
            />
            {teacherCapture && (
              <ProductFrame capture={teacherCapture} viewTag="VIEW-B · 1280×800" />
            )}
          </RevealCssClass>

          <RevealCssClass as="p" className="pr-note" delay={3}>
            كل إطار مأخوذ من التطبيق نفسه داخل بيئة العرض — بلا معالجة ولا تجميل.
            المزيد من الأسطح الحقيقية في <Link to="/capabilities" className="fo-text-link">صفحة القدرات</Link>.
          </RevealCssClass>
        </section>

        {/* ═══ [6] لماذا مدارك — the Watch/Check/Test/Master stage
            strip (the reference's why): the four journey verbs beside
            the four real student-surface captures, cross-fading on the
            scroll (the 74%-hold plateau grammar); static + fully
            readable under reduced motion and ≤991px. ═══ */}
        <section className="wy-section" aria-labelledby="wy-title">
          <div className="wy-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[06]</span> لماذا مدارك</span>
            <RevealCssClass as="h2" className="wy-title" delay={1} id="wy-title">
              الرحلة في <em>أربع مراحل</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="wy-lede" delay={2}>
              شاهد، تحقّق، اختبر، أتقن — المراحل الأربع التي تعبرها في كل مقرّر،
              ولكل منها سطح حقيقي داخل المنصّة.
            </RevealCssClass>
          </div>

          <WhyScene />

          <RevealCssClass as="p" className="wy-note" delay={3}>
            اللقطات من بيئة العرض — بيانات تجريبية اصطناعية بالكامل، وموثَّقة على كل إطار.
          </RevealCssClass>
        </section>

        {/* ═══ [7] الأدوار — the ruled hairline grid (the reference's
            usecase): the five verified platform roles + three honest
            personas. No role implies a feature it does not have — the
            line under each card is the honest current state. ═══ */}
        <section id="roles" className="rl-section" aria-labelledby="rl-title">
          <div className="rl-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[07]</span> الأدوار</span>
            <RevealCssClass as="h2" className="rl-title" delay={1} id="rl-title">
              منصّة واحدة، <em>خمسة أدوار وثلاث شرائح</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="rl-lede" delay={2}>
              خمسة أدوار مثبَّتة داخل المنصّة، وثلاث شرائح يخدمها المنتج اليوم أو يبني لها —
              كل بطاقة تقول الحقيقة كما هي.
            </RevealCssClass>
          </div>

          <ul className="rl-cards">
            {ROLE_SHOWCASES.map((r, i) => (
              <RevealCssClass as="li" key={r.key} className="rl-card" delay={((i % 3) + 1) as 1 | 2 | 3}>
                <span className="rl-card-num fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
                <h3 className="rl-card-title">{r.roleAr.replace(/^ل/, '')}</h3>
                <p className="rl-card-line">{r.lineAr}</p>
                <span className="rl-card-tag">دور منصّة</span>
              </RevealCssClass>
            ))}
            {PERSONAS.map((p, i) => (
              <RevealCssClass as="li" key={p.title} className="rl-card" delay={((i % 3) + 1) as 1 | 2 | 3}>
                <span className="rl-card-num fo-mono" dir="ltr">[{p.num}]</span>
                <h3 className="rl-card-title">{p.title}</h3>
                <p className="rl-card-line">{p.line}</p>
                <span className={`rl-card-tag${p.live ? ' is-live' : ''}`}>{p.state}</span>
              </RevealCssClass>
            ))}
          </ul>

          <RevealCssClass as="p" className="rl-more" delay={3}>
            بيانات كل مؤسّسة معزولة تمامًا — والصلاحيات منفصلة دورًا بدور.
          </RevealCssClass>
        </section>

        {/* ═══ [8] الخاتمة (the reference's cta) — the coordinates row,
            the title block (the sheet's metadata grid, moved from the
            hero), the sketch panel, and the resolve. The colleges
            registry strip carries the #colleges anchor. ═══ */}
        <section className="fo-cta" id="vision" ref={ctaRef} aria-label="ابدأ رحلتك — أنشئ حسابك">
          <p className="fo-cta-coords fo-mono" dir="ltr" aria-hidden="true">
            [R313] — MADAREK · {year} · INDEPENDENT
          </p>
          {/* r308 — the corner coordinate labels: real document-space
              values of this section's corners (the reference's CTA
              corner grammar), written once the layout settles. */}
          <p className="fo-cta-corners fo-mono" ref={ctaCoordsRef} dir="ltr" aria-hidden="true">
            [0,0] [0,0] [0,0] [0,0]
          </p>
          <div className="fo-cta-grid">
            <div className="fo-cta-inner">
              <RevealCssClass as="h2" className="fo-cta-title" delay={1}>
                جاهز لبدء <em>رحلتك</em>؟
              </RevealCssClass>
              <RevealCssClass as="p" className="fo-cta-lede" delay={2}>
                أنشئ حسابك الجامعي في دقائق — ببريدك الإلكتروني ورقم قيدك،
                وتابع تقدّمك من أول محاضرة.
              </RevealCssClass>
              <RevealCssClass as="div" className="fo-cta-actions" delay={3} id="cta">
                <Link to="/auth/register" className="btn accent lg">
                  أنشئ حسابك الجامعي
                  <Icon icon={ArrowLeft} size={16} />
                </Link>
                <Link to="/auth" className="btn ghost lg">تسجيل الدخول</Link>
              </RevealCssClass>
              <RevealCssClass as="p" className="fo-cta-meta" delay={4}>
                <Icon icon={Check} size={13} />
                مدارك · {year} · منصّة تعليمية مستقلّة
              </RevealCssClass>
            </div>

            {/* the sketch panel — the drafting-sheet sketch (the
                reference's cta sketch image): the grid + registration
                marks + coordinates, pure line work, decorative. */}
            <div className="fo-cta-sketch" aria-hidden="true">
              <span className="fo-cta-sketch-grid" />
              <span className="fo-cta-sketch-mark fo-cta-sketch-tl">+</span>
              <span className="fo-cta-sketch-mark fo-cta-sketch-tr">+</span>
              <span className="fo-cta-sketch-mark fo-cta-sketch-bl">+</span>
              <span className="fo-cta-sketch-mark fo-cta-sketch-br">+</span>
              <span className="fo-cta-sketch-coord fo-mono" dir="ltr">[CTA · RESOLVE]</span>
            </div>
          </div>

          {/* the title block — the sheet's metadata grid (moved from
              the hero in R313; the drawing-sheet identity closes the
              page the way it opened it). */}
          <RevealCssClass as="dl" className="fo-hero-meta" delay={2}>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">المشروع</dt>
              <dd className="fo-meta-v">منصّة تعليمية تقنية مستقلّة</dd>
            </div>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">اللغة</dt>
              <dd className="fo-meta-v">عربية أولًا · RTL</dd>
            </div>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">البنية</dt>
              <dd className="fo-meta-v">
                <span className="fo-mono" dir="ltr">{formatInt(colleges.length)}</span> كلية ·
                <span className="fo-mono" dir="ltr"> {formatInt(CAMPUS_COUNT)}</span> أحرام
              </dd>
            </div>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">القدرات</dt>
              <dd className="fo-meta-v">
                <span className="fo-mono" dir="ltr">[{String(LIVE_COUNT).padStart(2, '0')}]</span> تعمل اليوم
              </dd>
            </div>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">الجامعات الموثقة</dt>
              <dd className="fo-meta-v">
                <span className="fo-mono" dir="ltr">{formatInt(MEDIA_UNIVERSITY_COUNT)}</span> في الصور والفيديو
              </dd>
            </div>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">بيانات العرض</dt>
              <dd className="fo-meta-v">جامعة مدارك التجريبية — توضيحية</dd>
            </div>
          </RevealCssClass>

          {/* [9] the colleges registry strip — the ruled hairline row
              linking the public registry (the funnel's 5th login
              affordance lives here; the demo-data disclosure rides the
              row, never a tooltip). */}
          <div className="cg-strip" id="colleges">
            <span className="cg-strip-label fo-mono" dir="ltr">[09] · REGISTRY</span>
            <p className="cg-strip-text">
              <strong><span className="fo-mono" dir="ltr">{formatInt(colleges.length)}</span> كلية</strong> في{' '}
              <span className="fo-mono" dir="ltr">{formatInt(CAMPUS_COUNT)}</span> أحرام —
              بيانات «جامعة مدارك التجريبية»: اصطناعية بالكامل لأغراض العرض.
            </p>
            <div className="cg-strip-links">
              <Link to="/colleges" className="btn ghost sm">تصفح الكليات التجريبية</Link>
              <Link to="/auth" className="fo-text-link">سجل الدخول لاستعراض كليتك داخل المنصّة</Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── COLOPHON FOOTER (R313 · D14) — the reference's own
          composition: the inspection strip (the pointer lens
          resolving the journey drawing) over a THREE-column grid —
          (1) the identity + the subscribe seat, (2) the wide index +
          the honest address, (3) the giant line-art mark fading in
          with the scroll — closed by the legal row. ── */}
      {/* ═══ [9] FOOTER — R314 V9: the reference's cell grid (pair-100):
          strip-image cell · tagline cell · link columns · subscribe cell ·
          address/contact cells · drawn-mark cell — every cell hairline-
          ruled — closed by the GIANT outlined construction-line wordmark
          (Madarek's own: مدارك + MADAREK) and the legal row. Honest copy
          throughout (demo-data disclosure, no fake subscribe, no
          invented contacts). ═══ */}
      <footer className="fo-footer">
        {/* R314 (cycle-2 §7 heights): the colophon re-orders to the
            measured reference composition (711px = cell grid 355 +
            image strip 314 + legal row 42) — the grid FIRST, then the
            strip band (the inspection lens + the closing wordmark
            riding the same full-bleed band — the reference's own
            graphic|text strip split), then the legal row. */}
        <div className="fo-footer-inner">
          <div className="fo-fgrid">

            {/* [01] the strip-image cell — the ink-rendered architecture
                (own subject/licence; the reference's rendered stairs seat) */}
            <div className="fo-fcell fo-fcell-strip">
              <img
                className="fo-fstrip-img"
                src="/media/renders/crop-garyounis-classic-960.webp"
                alt="رسم حبري لعمارة حرم جامعي ليبي — مشتق من صورة مرخّصة"
                loading="lazy"
                width={960}
                height={960}
              />
              <span className="fo-fcell-tag fo-mono" dir="ltr">[01] CAMPUS · INK RENDER</span>
            </div>

            {/* [02] the tagline cell — the honest identity paragraph +
                the subscribe seat (R314 cycle-2: moved from the account
                column — the reference's footer-head = title-wrap +
                form-wrap in ONE column) */}
            <div className="fo-fcell fo-fcell-tagline">
              <Link to="/" className="fo-brand" aria-label="مدارك — منصّة التعليم الذكي">
                <StarMark size={30} className="fo-brand-mark" />
                <span className="fo-brand-stack">
                  <span className="fo-brand-name">مدارك</span>
                  <span className="fo-brand-sub">منصّة التعليم الذكي</span>
                </span>
              </Link>
              <p className="fo-footer-about">
                {/* r188 honesty pin: «اصطناعية بالكامل» must stay contiguous
                    on one source line (the r188-brand-integrity gate). */}
                منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «جامعة مدارك التجريبية» — مؤسسة اصطناعية بالكامل لأغراض العرض.
              </p>
              {/* the honest subscribe seat — HONEST disabled state: no
                  subscribe endpoint exists anywhere in the backend
                  (verified — modules: auth/institution/milestones/
                  onboarding/search/theme only), so there is no
                  submission to make and no success to theatrically
                  announce. The seat ships in the reference's own
                  geometry (hairline input + 40×40 arrow) with a plain
                  «قريبًا» explanation. No fake opt-ins. */}
              <div className="fo-subscribe">
                <label className="fo-footer-heading" htmlFor="fo-subscribe-email">النشرة البريدية</label>
                <div className="fo-subscribe-row">
                  <input
                    id="fo-subscribe-email"
                    type="email"
                    className="fo-subscribe-input"
                    placeholder="بريدك الإلكتروني"
                    autoComplete="email"
                    disabled
                    aria-describedby="fo-subscribe-note"
                  />
                  <button
                    type="button"
                    className="fo-subscribe-btn"
                    disabled
                    aria-label="الاشتراك في النشرة — غير متاح بعد"
                  >
                    <Icon icon={ArrowLeft} size={15} />
                  </button>
                </div>
                <p className="fo-subscribe-note" id="fo-subscribe-note">
                  قريبًا — لا توجد قائمة بريدية فعلية بعد؛ لا يُجمَع أيّ بريد ولا يُرسَل شيء.
                </p>
              </div>
            </div>

            {/* [03–05] the three link columns (the reference's
                COMPANY/PRODUCT/RESOURCES seats, Madarek's own index) */}
            <nav className="fo-fcell fo-fcell-links" aria-label="فهرس المنصّة">
              <div className="fo-footer-heading">المنصّة</div>
              <Link to="/capabilities" className="fo-footer-link">ما يعمل اليوم</Link>
              <a href="#product" className="fo-footer-link">المنصّة فعليًا</a>
              <a href="#chapters" className="fo-footer-link">الفصول</a>
              <a href="#roles" className="fo-footer-link">الأدوار والشرائح</a>
              <Link to="/colleges" className="fo-footer-link">الكليات التجريبية</Link>
            </nav>
            <nav className="fo-fcell fo-fcell-links" aria-label="المحتوى والرحلة">
              <div className="fo-footer-heading">الرحلة</div>
              <a href="#statement" className="fo-footer-link">البيان</a>
              <a href="#live" className="fo-footer-link">التحديات</a>
              <Link to="/campus" className="fo-footer-link">الحياة الجامعية</Link>
              <a href="#vision" className="fo-footer-link">المبدأ والرؤية</a>
              <a href="#main" className="fo-footer-link">أعلى الصفحة</a>
            </nav>
            <nav className="fo-fcell fo-fcell-links" aria-label="الحساب">
              <div className="fo-footer-heading">الحساب</div>
              <Link to="/auth/register" className="fo-footer-link">إنشاء حساب جامعي</Link>
              <Link to="/auth" className="fo-footer-link">تسجيل الدخول</Link>
            </nav>

            {/* [06] the address cell — the reference's Sydney seat becomes
                the demo institution's own identity: an explicitly fictional
                place and the platform's real country (honest-copy rule:
                nothing invented, no real-institution affiliation). */}
            <div className="fo-fcell fo-fcell-addr">
              <div className="fo-footer-heading">العنوان</div>
              <p className="fo-footer-addr-line">جامعة مدارك التجريبية — مؤسسة عرض اصطناعية</p>
              <p className="fo-footer-addr-line">طرابلس، ليبيا</p>
            </div>

            {/* [07] the contact cell — honest and personal-data-free (owner
                order R315: the repo link and every owner-identity trace are
                retired from all surfaces). The page's own early-access
                form is the one real channel today — stated plainly. */}
            <div className="fo-fcell fo-fcell-addr">
              <div className="fo-footer-heading">التواصل</div>
              <p className="fo-footer-addr-line">التسجيل المبكر من هذه الصفحة هو قناة التواصل المتاحة حاليًا.</p>
              <p className="fo-footer-addr-line">لا بريد عام في مرحلة الإطلاق التجريبي.</p>
            </div>

            {/* [08] the drawn-mark cell — the reference's line-logo seat:
                Madarek's own khatam star drafted as a construction
                drawing (R315 K-F: the floating filled diamond is
                retired) — hairline construction circles + crosshairs
                behind (1px screen hairlines, var(--rule)), the two
                rotated squares stroked in INK var(--text), one small
                accent square seated on the outer construction circle
                (the registration beacon, the نقطة seat). Ink-on-paper,
                token-driven for both themes. */}
            <div className="fo-fcell fo-fcell-mark">
              <RevealCssClass as="div" className="fo-footer-mark" delay={1} aria-hidden="true">
                <FooterMarkArt />
              </RevealCssClass>
            </div>
          </div>

          {/* the image-strip band (the reference's footer-img-wrap): the
              five-column inspection strip (FooterLens — R319 §D2) rides
              BELOW the grid, above the legal row (the measured order),
              and the GIANT wordmark — Madarek's own «مدارك», REAL
              letterforms shaped from the site's Alexandria 700 display
              font (R318 §A6 → R319 §D1: scripts/r318/wordmark-build.mjs
              → the committed wordmark-art.generated.ts) — spans the
              footer's FULL inner measure at EVERY viewport
              (width:100% + viewBox scaling): CONNECTED shaping (no
              construction track — the owner read the tracked word as
              letter-spaced disconnected letters), STROKE-ONLY ink
              (fill:none; stroke:currentColor; ~1.7px non-scaling),
              the svg's own aria-label + <title> carrying the reading.
              The strip hides ≤767px (the reference hides its strip
              there too); the wordmark flows as its own band on mobile
              in the SAME full-width cut. */}
          <div className="fo-fstrip">
            <FooterLens />
            <div className="fo-wordmark">
              <span className="fo-wordmark-reg fo-wordmark-reg-tl" aria-hidden="true">+</span>
              <span className="fo-wordmark-reg fo-wordmark-reg-tr" aria-hidden="true">+</span>
              <span className="fo-wordmark-reg fo-wordmark-reg-bl" aria-hidden="true">+</span>
              <span className="fo-wordmark-reg fo-wordmark-reg-br" aria-hidden="true">+</span>

              {/* ── the ONE full-cell-width cut — REAL Alexandria 700
                  letterforms of «مدارك» shaped by harfbuzz (م initial
                  CONNECTED into د final; ا/ر/ك isolated) and composed by
                  scripts/r318/wordmark-build.mjs into ONE path — the
                  committed wordmark-art.generated.ts. The sheet hugs
                  the ink + construction margins (viewBox 3108×1189 →
                  svg 1398×535 @1440 · 982×376 @1024 · 726×278 @768 ·
                  348×133 @390 · 318×122 @360 — ink 94.2% of the cell,
                  the reference's own ink spans 86% of its strip); the
                  drawn word is STROKE-ONLY currentColor (the reference's
                  drafting verdict) and the reading rides the svg's
                  role="img" + aria-label + <title> «مدارك». */}
              <WordmarkArt />

              <span className="fo-wordmark-en fo-mono" dir="ltr" aria-hidden="true">MADAREK — ARABIC-FIRST LEARNING SHEET</span>
            </div>
          </div>

          <div className="fo-footer-bottom">
            <span className="fo-mono">© {year} مدارك</span>
            <span className="fo-footer-cluster">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل</span>
          </div>
        </div>
      </footer>

      {/* R314 B10 — the landing chrome pair: the local-storage consent
          gate (V11) + the right-edge vertical tab (V12). Public surface
          only — these never mount on auth pages. */}
      <ConsentBanner />
      <EdgeTab />
    </div>
  );
}
