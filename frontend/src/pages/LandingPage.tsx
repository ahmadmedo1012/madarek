import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Brain, GraduationCap, Network, Building2, Compass,
  ShieldCheck, ArrowLeft, Menu, X, BookOpen,
  Microscope, FlaskConical, Calendar, ClipboardCheck,
  Check, ChevronDown, PlayCircle, Route as RouteIcon,
  Medal, Keyboard, Sparkles, MoonStar,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { CollegesPopover } from '../components/CollegesPopover';
import { ThemeToggle, useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { LibyaFlag } from '../components/LibyaFlag';
import { RevealCssClass } from '../hooks/useReveal';
import { useSectionProgress } from '../hooks/useSectionProgress';
import { useMagnetic } from '../hooks/useMagnetic';
import { CountUp } from '../components/CountUp';
import { colleges } from '../data/colleges.config';
import { UNIVERSITY_FACTS, CAMPUS_CITIES } from '../data/university.facts';
import { TestimonialSection } from '../components/landing/TestimonialSection';
import { OrbitScene } from '../components/landing/OrbitScene';
import { CollegeConstellation } from '../components/landing/CollegeConstellation';
import { JourneyLightPath } from '../components/landing/JourneyLightPath';
import { HeroDepthLayer } from '../components/landing/HeroDepthLayer';
import { Parallax } from '../components/motion/Parallax';
// landing.css is this page's own sheet (the Orbit Ink world, scoped to
// .landing — a first-class TWO-THEME surface since r172a: it grounds
// itself on the canonical var(--bg) and follows the shared theme
// store); since r151h the colleges popover surfaces ride their own
// dedicated sheet (colleges-popover.css, imported by <CollegesPopover />)
// so this chunk no longer carries the college-gallery CSS.
import '../styles/landing.css';

/**
 * Landing — «سماء مدارك» immersive v2 (docs/immersive-redesign-plan.md).
 *
 * The page is a journey, not a stack of sections:
 *   المدار (hero sky) → شريط الكلّيّات (marquee) → الثقة
 *   → مدارات الكلّيّات → كيف تتعلّم → قصّة التقدّم
 *   → الأرض (الحرم) → الأدوار → نقطة البداية.
 *
 * University truth: UoZ operates 25 colleges (backend seed faculty table;
 * registry in data/colleges.config.ts is the canonical machine source).
 */
const COLLEGES_COUNT = colleges.length > 0 ? colleges.length : 25;

/** Marquee strip — the real 25 college names, duplicated ×2 for a seamless CSS loop. */
const MARQUEE_ITEMS = colleges.map((c) => c.nameAr);

/** Journey stations — the «how learning works» chapter. */
const JOURNEY: Array<{
  n: string; icon: typeof PlayCircle; title: string; desc: string; tag: string;
}> = [
  {
    n: '01', icon: PlayCircle, title: 'محاضرة تفاعلية',
    desc: 'محاضرات مسجَّلة بنقاط فحص مدمجة — الحضور يُحتسب تلقائياً عند الإكمال، والفهم يُبنى بإيقاعك أنت.',
    tag: 'الفصل المعكوس',
  },
  {
    n: '02', icon: RouteIcon, title: 'مصفوفة معرفية',
    desc: 'مسارات تعلُّم تتكيَّف مع مستوى تقدُّمك ونقاط قوَّتك، تكشف الفجوات وتربطها مباشرة بالدقائق التي تشرحها.',
    tag: 'مسار متكيِّف',
  },
  {
    n: '03', icon: Brain, title: 'مساعد أكاديمي',
    // r168b: honesty — the local composer explains concepts, surfaces
    // mastery gaps and builds review plans; chapter summaries and quiz
    // generation arrive with a real provider (chip-gated in /ai). The
    // landing card claims only what ships today.
    desc: '«Oasis» يعرف مقرَّراتك ومحاضراتك ودرجاتك — شروحات مخصَّصة، تحديدٌ لفجواتك المعرفيّة، وخطط مراجعة حسب أدائك الفعلي.',
    tag: 'Oasis',
  },
  {
    n: '04', icon: ClipboardCheck, title: 'اختبارات ذكية',
    desc: 'أسئلة اختيار متعدد وصح/خطأ وإجابة قصيرة ومقالة — تصحيح تلقائي للموضوعي ومراجعة معلَّمة للمقالات.',
    tag: 'تقييم فوري',
  },
  {
    n: '05', icon: Medal, title: 'إتقان موثَّق',
    desc: 'نقاط ومستويات وشارات تشجّع الالتزام، وشهادات إتمام تُضاف إلى ملفّك الأكاديمي تلقائياً.',
    tag: 'إنجاز',
  },
];

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

  const [collegesOpen, setCollegesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megamenuOpen, setMegamenuOpen] = useState(false);
  const megamenuTriggerRef = useRef<HTMLButtonElement>(null);
  // F2-5 (r157): mobile-menu contract mirrors the megamenu — Escape
  // closes + refocuses the burger (its aria-label flips with the state).
  const burgerRef = useRef<HTMLButtonElement>(null);
  // Scroll chrome lives on refs and is written imperatively below — a React
  // re-render per scroll event was the round-3 performance regression.
  const headerRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Returning-visitor calm: first session visit plays the full intro; later
  // visits this session skip straight to the calm state.
  const [introSeen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem('madarek.intro.seen') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (redirectHome || introSeen) return;
    try {
      window.sessionStorage.setItem('madarek.intro.seen', '1');
    } catch {
      // sessionStorage may be blocked in private mode — that's fine.
    }
  }, [redirectHome, introSeen]);

  /* r162 (R2) → r164b: warm the AUTH BOUNDARIES while the visitor reads
   * the hero.
   *
   * The funnel's surfaces split in r164b: the primary CTAs
   * («ابدأ الآن» / «ابدأ رحلتك» / «أنشئ حسابك الجامعي») now route to
   * `/auth/register`, while «تسجيل الدخول» keeps `/auth` — both are
   * lazy boundaries. On a production cold cache the first click suspends
   * the ROOT boundary and swaps the whole ink world for the
   * product-ground HydrationSplash while the chunk fetches: a full-screen
   * world-crossing blank-out on the primary public funnel. Idle-prefetching
   * the exact same dynamic imports the route boundaries resolve (module
   * init runs once; the later lazy() mounts reuse the warm modules) means
   * the click navigates with the chunk already in cache — no splash
   * window at all. Same pattern as the shell's chartTheme warm-up
   * (AppShell r152j/A7): production only — dev has no chunk splitting to
   * warm. */
  useEffect(() => {
    if (redirectHome) return;
    if (!import.meta.env.PROD) return;
    const ric =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : undefined;
    const warm = () => {
      void import('./AuthPage').catch(() => undefined);
      void import('./RegisterPage').catch(() => undefined);
    };
    const idleId = ric ? ric(warm, { timeout: 4000 }) : window.setTimeout(warm, 2500);
    return () => {
      if (ric) window.cancelIdleCallback(idleId as number);
      else window.clearTimeout(idleId as number);
    };
  }, [redirectHome]);

  // Scroll-driven chrome with ZERO setState: coalesced to one rAF per frame
  // (pending-flag pattern, mirrors useSectionProgress) and written straight
  // to the DOM — the .scrolled class on the header and the --p var on the
  // top ribbon. React never re-renders for scrolling anymore.
  useEffect(() => {
    const header = headerRef.current;
    const bar = progressBarRef.current;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY;
      if (header) header.classList.toggle('scrolled', y > 6);
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, y / max) : 0;
        bar.style.setProperty('--p', p.toFixed(4));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Scroll-spy — active section highlight in the nav. Zero setState: written
  // to a data attribute on the header via imperative DOM. Observer-only
  // since r157 (F2-8): the old scroll/resize rAF pair scheduled frames that
  // did nothing — the IntersectionObserver already re-fires on its own.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>(
      '#trust, #colleges, #journey, #progress, #campus, #roles'
    ));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        // Collect all entries first, then pick the one with most overlap.
        // Flush reads all rects BEFORE writing — one layout pass per frame.
        const visible: Array<{ id: string; ratio: number }> = [];
        for (const entry of entries) {
          if (entry.intersectionRatio > 0.35) {
            visible.push({ id: entry.target.id, ratio: entry.intersectionRatio });
          }
        }
        // Pick the section with the most viewport coverage; tie-break by order.
        visible.sort((a, b) => b.ratio - a.ratio);
        if (visible.length > 0) {
          header.dataset.activeSection = visible[0]!.id;
        } else {
          delete header.dataset.activeSection;
        }
      },
      { threshold: [0, 0.35, 0.5, 0.65, 1], rootMargin: '-20% 0px -40% 0px' },
    );

    for (const s of sections) observer.observe(s);

    return () => observer.disconnect();
  }, []);

  // Scroll-scrubbed chapters (native scrolling — no hijacking).
  const journeyRef = useSectionProgress<HTMLElement>();
  const progressRef = useSectionProgress<HTMLElement>();
  const magneticCta = useMagnetic<HTMLAnchorElement>(7);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  return (
    <div className="landing" data-intro-seen={introSeen ? 'true' : undefined}>

      {/* P3-24: skip-to-content — first Tab stop, hidden until focused
          (same contract as the product's polish.css skip-link, re-skinned
          to the landing pill language). The landing was the only page
          without one. */}
      <a href="#main" className="ln-skip-link">تخطَّ إلى المحتوى</a>

      {/* Top scroll-progress bar — driven imperatively via --p (see effect) */}
      <div className="landing-progress" aria-hidden>
        <div className="landing-progress-bar" ref={progressBarRef} style={{ ['--p' as string]: 0 }} />
      </div>

      {/* Ministry strip */}
      <div className="ministry-strip" role="region" aria-label="الجهة المشرفة">
        <div className="ministry-strip-inner">
          <span className="ministry-strip-emblem"><LibyaFlag size={14} /></span>
          <span>دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية</span>
        </div>
      </div>

      {/* Header — the .scrolled state class is toggled imperatively */}
      <header className="landing-header" ref={headerRef}>
        <div className="landing-nav">
          <Link to="/" className="landing-brand" aria-label="مدارك">
            <span className="landing-brand-mark">م</span>
            <span className="landing-brand-text">
              <span className="landing-brand-name">مدارك</span>
              <span className="landing-brand-sub">جامعة الزاوية</span>
            </span>
          </Link>

          <nav className="landing-nav-links" aria-label="التنقل الرئيسي">
            <div
              className={`landing-nav-group${megamenuOpen ? ' open' : ''}`}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setMegamenuOpen(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && megamenuOpen) {
                  setMegamenuOpen(false);
                  megamenuTriggerRef.current?.focus();
                }
              }}
            >
              <button
                type="button"
                className="landing-nav-link"
                aria-haspopup="true"
                aria-expanded={megamenuOpen}
                ref={megamenuTriggerRef}
                onClick={() => setMegamenuOpen((v) => !v)}
              >
                المنصة
                <Icon icon={ChevronDown} size={14} />
              </button>
              <div className="landing-megamenu" onClick={() => setMegamenuOpen(false)}>
                <a href="#journey" className="landing-megamenu-item">
                  <span className="ln-menu-ico gold"><Icon icon={PlayCircle} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">رحلة التعلّم</span>
                    <span className="landing-megamenu-item-desc">من المحاضرة إلى الإتقان</span>
                  </span>
                </a>
                <a href="#colleges" className="landing-megamenu-item">
                  <span className="ln-menu-ico azure"><Icon icon={Compass} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">مدارات الكلّيّات</span>
                    <span className="landing-megamenu-item-desc">{COLLEGES_COUNT} كلية في سماء واحدة</span>
                  </span>
                </a>
                <a href="#journey" className="landing-megamenu-item">
                  <span className="ln-menu-ico gold"><Icon icon={Brain} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">المساعد الأكاديمي</span>
                    <span className="landing-megamenu-item-desc"><bdi>«Oasis»</bdi> — رفيق دراسي ذكي</span>
                  </span>
                </a>
                <a href="#progress" className="landing-megamenu-item">
                  <span className="ln-menu-ico mist"><Icon icon={Microscope} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">قصة التقدّم</span>
                    {/* r168b: the section's own figures are labeled
                        illustrative in-page (#progress note) — the menu
                        must not call them measured experiment results. */}
                    <span className="landing-megamenu-item-desc">أرقام توضيحيّة لرحلة التقدّم</span>
                  </span>
                </a>
              </div>
            </div>
            <a href="#colleges" className="landing-nav-link">الكلّيّات</a>
            <a href="#roles" className="landing-nav-link">الأدوار</a>
            <a href="#progress" className="landing-nav-link">النتائج</a>
          </nav>

          <div className="landing-header-cta">
            {/* r172a: the REAL theme control — the same shared
                ThemeToggle/theme.store the product shell mounts
                (فاتح · داكن · تلقائي). No second theme state anywhere:
                the toggle writes madarek-theme, useThemeSync applies
                data-theme, and every --ln-* token follows. ≤640px the
                pill yields to the labeled mobile-menu row below. */}
            <ThemeToggle />
            {/* r164b: the funnel splits — login keeps /auth, the primary
                START verb carries the visitor to /auth/register (the
                register form is the destination the label promises). */}
            <Link to="/auth" className="btn ghost sm">تسجيل الدخول</Link>
            <Link to="/auth/register" className="btn primary sm">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </div>

          <button
            type="button"
            className="landing-burger"
            ref={burgerRef}
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon icon={menuOpen ? X : Menu} size={20} />
          </button>
        </div>

        {menuOpen && (
          <nav
            className="landing-mobile-menu"
            aria-label="قائمة الجوال"
            onClick={() => setMenuOpen(false)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setMenuOpen(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setMenuOpen(false);
                burgerRef.current?.focus();
              }
            }}
          >
            <a href="#colleges" className="btn ghost">الكلّيّات</a>
            <a href="#journey" className="btn ghost">رحلة التعلّم</a>
            <a href="#roles" className="btn ghost">الأدوار</a>
            <a href="#progress" className="btn ghost">النتائج</a>
            {/* r164b: returning visitors had NO login affordance on mobile —
                ≤1080px hides the header ghost pair, so the menu was
                register-only. The ghost rows above explore; the one below
                completes the both-way funnel (تسجيل الدخول = /auth). */}
            {/* r172a: labeled theme row — the ≤640px home of the theme
                control (the header pill yields there; landing.css §3b).
                stopPropagation: flipping the theme must not close the
                menu — the visitor may want to try both looks. */}
            <div
              className="landing-mobile-theme"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="landing-mobile-theme-label">المظهر</span>
              <ThemeToggle />
            </div>
            <Link to="/auth" className="btn ghost">تسجيل الدخول</Link>
            <Link to="/auth/register" className="btn primary full">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </nav>
        )}
      </header>

      <main id="main" tabIndex={-1}>
      {/* ═══ الفصل ٠ — المدار: the hero sky ═══ */}
      <section className="ln-hero" aria-label="مدارك — منصة التعليم الذكي">
        {/* living scene (fails safe to the CSS sky below) */}
        <div className="ln-hero-sky" aria-hidden>
          <HeroDepthLayer />
          <OrbitScene className="ln-hero-canvas" biasX={-0.35} />
        </div>

        <div className="ln-hero-content">
          <RevealCssClass as="p" className="ln-hero-eyebrow">
            <span className="ln-mono">جامعة الزاوية · {String(COLLEGES_COUNT).padStart(2, '0')} كلية · منذ 1988</span>
          </RevealCssClass>

          <h1 className="ln-hero-title">
            <RevealCssClass as="span" className="ln-hero-line">
              <span className="ln-w">كلُّ</span>{' '}
              <span className="ln-w">معرفةٍ</span>{' '}
              <span className="ln-w">تبدأ</span>{' '}
              <span className="ln-w"><em>نقطة</em></span>
            </RevealCssClass>
            <RevealCssClass as="span" className="ln-hero-line" delay={1}>
              <span className="ln-w">وتصبح</span>{' '}
              <span className="ln-w"><em className="ln-hero-gold">مدارًا</em></span>
            </RevealCssClass>
          </h1>

          <RevealCssClass as="p" className="ln-hero-sub" delay={2}>
            مدارك — منصّة التعليم الذكي لجامعة الزاوية. محاضرات تفاعلية،
            مصفوفة معرفية تتكيّف مع تقدّمك، ومساعد أكاديمي يرافقك
            من أوّل درس حتى الإتقان.
          </RevealCssClass>

          <RevealCssClass as="div" className="ln-hero-actions" delay={3}>
            {/* r164b: the ONE lime primary of this viewport — and it carries
                the funnel's promise literally: starting the journey = the
                register form, not the login form. */}
            <Link to="/auth/register" className="ln-btn-gold" ref={magneticCta}>
              ابدأ رحلتك
              <Icon icon={ArrowLeft} size={16} />
            </Link>
            <a href="#journey" className="ln-btn-ghost">كيف تتّسع المدارك؟</a>
            <button
              type="button"
              className="ln-btn-text landing-colleges-trigger"
              onClick={() => setCollegesOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={collegesOpen}
            >
              <Icon icon={GraduationCap} size={16} />
              <span>الكلّيّات</span>
              <span className="ln-btn-text-badge">{COLLEGES_COUNT}</span>
            </button>
          </RevealCssClass>

          <RevealCssClass as="ul" className="ln-hero-meta" delay={4}>
            <li><Icon icon={Check} size={13} /> بريدك الجامعي أو رقم قيدك</li>
            <li aria-hidden className="ln-hero-meta-dot" />
            <li><Icon icon={Keyboard} size={13} /> يعمل بلوحة المفاتيح</li>
            <li aria-hidden className="ln-hero-meta-dot" />
            <li><Icon icon={MoonStar} size={13} /> وضع تقليل الحركة محترم</li>
          </RevealCssClass>
        </div>

        {/* scroll invitation */}
        <a href="#trust" className="ln-hero-scroll" aria-label="تابع الرحلة">
          <span className="ln-mono">تابع الرحلة</span>
          <span className="ln-hero-scroll-line" aria-hidden />
        </a>
      </section>

      {/* ═══ شريط الكلّيّات — مدار واحد تنتظم فيه الأسماء (marquee) ═══ */}
      <section className="ln-marquee" aria-hidden="true">
        <div className="ln-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((it, i) => (
            <span className="ln-marquee-item" key={i}>
              {it}
              <span className="ln-marquee-sep">·</span>
            </span>
          ))}
        </div>
      </section>

      {/* ═══ الفصل ١ — الثقة (P3-22: a quiet mono DATA band — the ministry
          accreditation lives in the top strip + footer only; it used to
          repeat ×5 across the page) ═══ */}
      <section id="trust" className="ln-trust" aria-label="أرقام الجامعة">
        <div className="ln-trust-inner">
          <span className="ln-mono">تأسست 1988</span>
          <span className="ln-trust-sep" aria-hidden />
          <span className="ln-mono">{`${String(COLLEGES_COUNT).padStart(2, '0')} كلية`}</span>
          <span className="ln-trust-sep" aria-hidden />
          {/* r153k: derived from the registry (5 named cities) — the old
              hardcoded «4» contradicted both the registry and the
              colleges popover's campus count. */}
          <span className="ln-mono">{`${CAMPUS_CITIES.length} مدن وفروع`}</span>
        </div>
      </section>

      {/* ═══ الفصل ٢ — مدارات الكلّيّات ═══ */}
      <section id="colleges" className="ln-chapter ln-colleges">
        <div className="ln-chapter-head">
          <span className="ln-label">{`01 — الاكتشاف`}</span>
          <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
            {String(COLLEGES_COUNT).padStart(2, '0')} كليةً في <em>سماءٍ واحدة</em>
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
            ستة مدارات معرفية تنتظم فيها كليّات الجامعة — مرِّر فوق العقد
            لاستكشافها، أو افتح السجلّ الكامل لاختيار مسارك.
          </RevealCssClass>
        </div>
        <RevealCssClass as="div" delay={2}>
          <CollegeConstellation onBrowse={() => setCollegesOpen(true)} />
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-colleges-note" delay={3}>
          <Icon icon={Network} size={14} />
          منظومة موحَّدة: المحاضرات والحضور والدرجات والاختبارات والبحوث — تجربة واحدة آمنة لكل كلية.
        </RevealCssClass>
      </section>

      {/* ═══ الفصل ٣ — كيف تتعلّم مدارك ═══ */}
      <section id="journey" ref={journeyRef} className="ln-chapter ln-journey">
        <div className="ln-chapter-head">
          <span className="ln-label">{`02 — الطريق`}</span>
          <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
            من أوّل درس إلى <em>الإتقان</em> — خمس محطات
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
            خطّ ضوءٍ واحد يربط محطات رحلتك؛ كل محطة تبني على ما قبلها.
          </RevealCssClass>
        </div>

        <div className="ln-journey-stage">
          {/* the light path — computed from the real station-node layout */}
          <JourneyLightPath />

          <ol className="ln-journey-stations">
            {JOURNEY.map((s, i) => (
              <RevealCssClass
                as="li"
                key={s.n}
                className={`ln-station${i % 2 === 0 ? ' from-start' : ' from-end'}`}
                delay={(i + 1) as 1 | 2 | 3 | 4 | 5}
              >
                <article className="ln-station-card">
                  <span className="ln-station-node" aria-hidden>
                    <span className="ln-station-node-core" />
                  </span>
                  <header className="ln-station-head">
                    <span className="ln-mono ln-station-n">{s.n}</span>
                    <span className="ln-station-ico"><Icon icon={s.icon} size={20} /></span>
                    <span className="ln-station-tag">{s.tag}</span>
                  </header>
                  <h3 className="ln-station-title">{s.title}</h3>
                  <p className="ln-station-desc">{s.desc}</p>
                </article>
              </RevealCssClass>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══ جسر التحويل — r149 (R3-A6 #2) ═══ */}
      {/* 65% من تمرير الجوال كان بلا أي فعل /auth بين الـhero والخاتمة
          (ي≈600 → ي≈7,572 على 390px) — كل صفحة مرجعية تعيد العرض بعد
          كل كتلة إثبات. شريط نحيف على أرض ink-2، لا يزاحم الفصول. */}
      <section className="ln-chapter ln-cta-bridge" aria-label="ابدأ رحلتك — جاهز للبدء">
        <div className="ln-cta-bridge-inner">
          <span className="ln-label">المدار مفتوح</span>
          <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
            جاهز لبدء <em>مدارك</em>؟
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
            إنشاء الحساب الجامعي يستغرق دقائق — ثم المحاضرات والاختبارات
            والمكتبة والمعامل بين يديك.
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-cta-bridge-actions" delay={3}>
            {/* r164b: mid-journey primary → register (same funnel verb as
                the hero; «ابدأ» is a start-account promise, not a login). */}
            <Link to="/auth/register" className="ln-btn-gold">ابدأ رحلتك</Link>
            <a href="#progress" className="ln-btn-ghost">شاهد كيف تتّسع المدارك</a>
          </RevealCssClass>
        </div>
      </section>

      {/* ═══ الفصل ٤ — قصّة التقدّم ═══ */}
      <section id="progress" ref={progressRef} className="ln-chapter ln-progress">
        <div className="ln-progress-grid">
          <div className="ln-progress-visual" aria-hidden>
            <div className="ln-progress-orbits">
              {/* expanding orbit system — P2-18: scale / ring opacity /
                  core growth / milestone ignition are all scrubbed by the
                  section's --sp (written by useSectionProgress, consumed
                  pure-CSS in landing.css §10) — the «EXPAND» promise is
                  real now */}
              <span className="ln-progress-ring r0" />
              <span className="ln-progress-ring r1" />
              <span className="ln-progress-ring r2" />
              <span className="ln-progress-ring r3" />
              <span className="ln-progress-core" />
              <span className="ln-progress-milestone m0" />
              <span className="ln-progress-milestone m1" />
              <span className="ln-progress-milestone m2" />
              <span className="ln-progress-milestone m3" />
              <span className="ln-progress-label"><span className="ln-mono">EXPAND · مدارك تتّسع</span></span>
            </div>
          </div>

          <div className="ln-progress-copy">
            <span className="ln-label">{`03 — التقدّم`}</span>
            <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
              مدارُك يتّسع مع <em>كلّ خطوة</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
              من أوّل درس تشاهده، إلى أوّل اختبار تجتازه، إلى مسار تُكمله —
              لوحة دقيقة ترسم تقدّمك لحظة بلحظة: الدرجات والحضور والمهام
              والمؤشرات المؤسسية، بصياغة تخدم القرار.
            </RevealCssClass>

            <div className="ln-progress-stats">
              <RevealCssClass as="div" className="ln-stat">
                <div className="ln-stat-value"><CountUp value="40" /><span className="ln-stat-unit">%</span></div>
                <div className="ln-stat-label">تحسُّن الاستيعاب</div>
                <div className="ln-stat-note">مقارنة بالأسلوب التقليدي</div>
              </RevealCssClass>
              <RevealCssClass as="div" className="ln-stat" delay={1}>
                <div className="ln-stat-value"><CountUp value="70" /><span className="ln-stat-unit">%</span></div>
                <div className="ln-stat-label">زيادة في المشاركة</div>
                <div className="ln-stat-note">داخل الحلقات النقاشية</div>
              </RevealCssClass>
              <RevealCssClass as="div" className="ln-stat" delay={2}>
                <div className="ln-stat-value"><CountUp value="90" /><span className="ln-stat-unit">%</span></div>
                <div className="ln-stat-label">تحقيق أهداف التعلّم</div>
                <div className="ln-stat-note">ضمن الإطار الزمني</div>
              </RevealCssClass>
              {/* r153k: the fourth card («30% تحسّن الالتزام») is DELETED —
                  it traced to no source anywhere in the repo (not even the
                  seeded lesson the other three numbers come from). The
                  invented-stat class is exactly what the vision-page audit
                  (A8 P1-1) purged. */}
            </div>

            <RevealCssClass as="p" className="ln-progress-source" delay={3}>
              {/* r153k: honest framing (docs/16 ب — declared, never
                  presented as real): these are the flipped-classroom
                  module's own illustrative numbers from the self-development
                  track inside the platform — NOT a field study the
                  platform conducted. */}
              أرقام توضيحية من وحدة استراتيجية الصفّ المعكوس في مسار التطوير
              الذاتي داخل المنصة — لأغراض العرض، لا نتائج قياس مؤسسي.
            </RevealCssClass>
          </div>
        </div>
      </section>

      {/* r153k: slot 5-A1 act-6 «evidence with a face» — renders NOTHING
          while the testimonials registry is empty (docs/16 هـ: externally
          blocked on real people + documented consent; fabrication
          forbidden). The trust architecture above carries only verified
          institutional facts. */}
      <TestimonialSection />

      {/* ═══ الفصل ٤ — الأرض: الحرم الحقيقي ═══ */}
      <section id="campus" className="ln-chapter ln-campus" aria-label="جامعة الزاوية">
        {/* r149 (R3-A6 #8): الفصل الرابع كان الوحيد بلا سطر افتتاحي —
            يقرأ كفاصل يتيم بين فصلين على الأرض نفسها. معالجة ضمنية
            (تسمية فقط) كي لا تنافس الصورة الفوتوغرافية عنوانًا. */}
        <div className="ln-chapter-head">
          <span className="ln-label">{`04 — الأرض · CAMPUS`}</span>
        </div>
        <RevealCssClass as="figure" className="ln-campus-frame">
          <Parallax amount={8} direction="up">
            <picture>
              <source
                type="image/webp"
                srcSet="/main_photo-750.webp 750w, /main_photo.webp 1377w"
              />
              <img
                src="/main_photo.jpg"
                alt="جامعة الزاوية — المدخل الرئيسي"
                className="ln-campus-photo"
                width={1377}
                height={768}
                sizes="(max-width: 920px) calc(100vw - 40px), (max-width: 1296px) calc(100vw - 96px), 1104px"
                loading="lazy"
                decoding="async"
              />
            </picture>
          </Parallax>
          <span className="ln-campus-vignette" aria-hidden />
          <figcaption className="ln-campus-caption">
            <span className="ln-mono">ZAWIYA · 1988</span>
            <span className="ln-campus-line">
              <em>منذ 1988</em> — مساحة أكاديميّة تنبض بالحياة، أصبحت رقميّة بالكامل.
            </span>
          </figcaption>
        </RevealCssClass>
        <div className="ln-campus-facts">
          <RevealCssClass as="div" className="ln-fact">
            <div className="ln-fact-value"><CountUp value={String(COLLEGES_COUNT)} /></div>
            <div className="ln-fact-label">كلية أكاديمية</div>
            {/* r153k: the registry is the platform's canonical count
                (validated by npm run validate:colleges) — the official
                site's own prose header disagrees with itself (26 vs 25). */}
            <div className="ln-fact-note">حسب سجلّ الكليات المعتمد في المنصة</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-fact" delay={1}>
            <div className="ln-fact-value"><CountUp value={String(CAMPUS_CITIES.length)} /></div>
            <div className="ln-fact-label">مدن وفروع</div>
            <div className="ln-fact-note">{CAMPUS_CITIES.join('، ')}</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-fact" delay={2}>
            <div className="ln-fact-value">1988</div>
            <div className="ln-fact-label">عام التأسيس</div>
            <div className="ln-fact-note">بقرار رقم {UNIVERSITY_FACTS.decreeNumber}</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-fact" delay={3}>
            <div className="ln-fact-value"><CountUp value={String(UNIVERSITY_FACTS.memberships.length)} /></div>
            <div className="ln-fact-label">عضويّات دوليّة</div>
            {/* r153k: factual fix — the curated source (static-source.ts
                `memberships`) says the MEDITERRANEAN union, not the
                Islamic one. Retyping the fact is what broke it. */}
            <div className="ln-fact-note">{UNIVERSITY_FACTS.memberships.map((m) => m.label).join('، ')}</div>
          </RevealCssClass>
        </div>
      </section>

      {/* ═══ الفصل ٦ — الأدوار ═══ */}
      <section id="roles" className="ln-chapter ln-roles">
        <div className="ln-chapter-head">
          <span className="ln-label">{`05 — المجتمع`}</span>
          <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
            أربعة <em>أدوار</em>، تجربة موحَّدة
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
            كل دور أكاديمي يرى ما يخصّه فقط — صلاحيات مدروسة وفصل واضح بين الواجبات.
          </RevealCssClass>
        </div>

        <ul className="ln-roles-list">
          {[
            {
              icon: GraduationCap, tone: 'gold', name: 'الطالب',
              desc: 'مقرَّرات، مصفوفة معرفية، مساعد ذكي، إنجازات وشهادات، فرص عمل، ومكتبة بحوث.',
              quote: 'محاضرات منظَّمة، حضور وغياب آليّ، تحليل لفجواتك المعرفيّة، ومسارات تعلّم تتكيّف مع مستواك.',
            },
            {
              icon: Brain, tone: 'azure', name: 'الأستاذ',
              desc: 'ذكاء أكاديميّ يكشف الطلّاب المعرَّضين للتعثّر، إدارة المحاضرات والدرجات، ومعامل افتراضية بصلاحيات تحكُّم.',
              quote: 'تسجيل الحضور بنقرات، تتبّع الدرجات لكلّ مقرّر، ذكاء أكاديميّ يكشف الطلّاب الذين يحتاجون متابعة.',
            },
            {
              icon: Building2, tone: 'mist', name: 'الإدارة',
              desc: 'إدارة الكليّات والأساتذة والمقرَّرات، تقارير، ومزامنة يومية مع البيانات الرسمية لجامعة الزاوية.',
              quote: 'لوحات حيّة على مستوى الجامعة، إدارة الصلاحيات والأدوار، مزامنة بيانات الكليّات في مكان واحد.',
            },
            {
              icon: ShieldCheck, tone: 'gold', name: 'ضمان الجودة',
              desc: 'رؤية للمؤشرات المؤسسية: جودة المقرَّرات، تقييم الأساتذة، مراجعة الاختبارات والمناهج.',
              // P3-20: equal mass for the fourth row — it collapsed to
              // 102px next to its 203px siblings without a remit quote.
              quote: 'مؤشّرات جودة قابلة للقياس لكل مقرّر وكل أستاذ، ومراجعة دورية للاختبارات والمناهج قبل اعتمادها.',
            },
          ].map((r, i) => (
            <RevealCssClass as="li" key={r.name} className="ln-role-row" delay={(i + 1) as 1 | 2 | 3 | 4}>
              <span className="ln-role-key">
                <span className={`ln-role-ico ${r.tone}`}><Icon icon={r.icon} size={26} strokeWidth={1.7} /></span>
                <span className="ln-role-name">{r.name}</span>
                <span className="ln-role-index ln-mono">{String(i + 1).padStart(2, '0')}</span>
              </span>
              <p className="ln-role-desc">{r.desc}</p>
              {r.quote && (
                <blockquote className="ln-role-quote">
                  {/* r149 (R3-A4 #6): علامة اقتباس عربية بدل اللاتينية ” */}
                  <span className="ln-role-quote-mark" aria-hidden>«</span>
                  {r.quote}
                </blockquote>
              )}
            </RevealCssClass>
          ))}
        </ul>

        {/* the wider system — compact trio (content preserved from the old bento).
            P3-20: its own ln-label mini-head so it closes the chapter as a
            sub-section instead of reading as an appendix. */}
        <h3 className="ln-system-head">
          <span className="ln-label">المنظومة الأوسع</span>
        </h3>
        <div className="ln-system-trio">
          {[
            {
              icon: BookOpen, tone: 'gold', title: 'مكتبة وبحوث',
              desc: 'فهرس بحثيّ بفحص نزاهة تجريبي (انتحال + AI — محاكاة حتى تفعيل كشف حقيقي) ومراجعة معلَّمة على الـPDF.',
            },
            {
              icon: Calendar, tone: 'azure', title: 'جدول ذكي',
              desc: 'جدول أسبوعيّ يجمع المحاضرات والتسليمات والاختبارات، بمذكّرات تلقائية وروابط مباشرة.',
            },
            {
              icon: FlaskConical, tone: 'mist', title: 'معامل افتراضية',
              // r168b: honesty — labs are a coming-soon surface and AR/VR
              // is a catalog (launch unavailable); the card no longer
              // promises running AR/VR experiments.
              desc: 'محاكاة شبكات وإلكترونيات للتطبيق العملي الآمن، مع فهرس لتجارب AR/VR.',
            },
          ].map((c, i) => (
            <RevealCssClass as="article" key={c.title} className="ln-system-card" delay={(i + 1) as 1 | 2 | 3}>
              <span className={`ln-system-ico ${c.tone}`}><Icon icon={c.icon} size={22} /></span>
              <h3 className="ln-system-title">{c.title}</h3>
              <p className="ln-system-desc">{c.desc}</p>
            </RevealCssClass>
          ))}
        </div>
      </section>

      {/* ═══ الفصل ٧ — نقطة البداية ═══ */}
      <section className="ln-cta" aria-label="ابدأ رحلتك — أنشئ حسابك">
        {/* converging orbits */}
        <div className="ln-cta-orbits" aria-hidden>
          <span className="ln-cta-orbit o0" />
          <span className="ln-cta-orbit o1" />
          <span className="ln-cta-orbit o2" />
        </div>
        <div className="ln-cta-inner">
          <span className="ln-label">{`06 — الوصول · ACCESS`}</span>
          <RevealCssClass as="h2" className="ln-cta-title" delay={1}>
            نقطتك من الضوء <em>تبدأ من هنا</em>
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-cta-lede" delay={2}>
            {/* r164b: the lede used to speak LOGIN copy («سجِّل دخولك…»)
                under a create-account button — label, copy and
                destination now tell ONE story: create the account. */}
            أنشئ حسابك الجامعي في دقائق — بالبريد الجامعي أو رقم قيدك —
            لتصل إلى مقرَّراتك ومتابعة تقدّمك الأكاديمي. الرحلة تبدأ بنقطة.
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-cta-actions" delay={3}>
            <Link to="/auth/register" className="ln-btn-gold xl">
              أنشئ حسابك الجامعي
              <Icon icon={ArrowLeft} size={16} />
            </Link>
            <a href="#colleges" className="ln-btn-ghost xl">استكشف الكلّيّات</a>
          </RevealCssClass>
          {/* r164b: the returning-visitor mirror of AuthPage's register
              prompt («ليس لديك حساب؟ أنشئ حسابك الآن») — the finale was
              register-only, so a student who already has an account had
              to hunt for the login through the header. */}
          <RevealCssClass as="p" className="ln-cta-login" delay={4}>
            لديك حساب بالفعل؟ <Link to="/auth">سجِّل دخولك</Link>
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-cta-meta" delay={4}>
            <Icon icon={Sparkles} size={13} />
            {/* P3-22: the ministry line repeated ×5 — it stays in the top
                strip + footer; the finale signs with the university */}
            جامعة الزاوية · {year}
          </RevealCssClass>
        </div>
      </section>
      </main>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="marketing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-col">
              <Link to="/" className="landing-brand" aria-label="مدارك">
                <span className="landing-brand-mark">م</span>
                <span className="landing-brand-text">
                  <span className="landing-brand-name">مدارك</span>
                  <span className="landing-brand-sub">جامعة الزاوية</span>
                </span>
              </Link>
              <p className="landing-footer-about">
                المنصّة الرسمية لجامعة الزاوية تحت إشراف وزارة التعليم العالي والبحث العلمي.
              </p>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">الرحلة</div>
              <a href="#journey" className="landing-footer-link">محطات التعلّم</a>
              <a href="#colleges" className="landing-footer-link">مدارات الكلّيّات</a>
              <a href="#progress" className="landing-footer-link">قصة التقدّم</a>
              <a href="#campus" className="landing-footer-link">الجامعة</a>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">المنظومة</div>
              <a href="#journey" className="landing-footer-link">الفصل المعكوس</a>
              <a href="#journey" className="landing-footer-link">المساعد الذكي</a>
              <a href="#roles" className="landing-footer-link">المكتبة والمعامل</a>
              <a href="#roles" className="landing-footer-link">الإنجازات</a>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">المؤسسة</div>
              <a href="#campus" className="landing-footer-link">جامعة الزاوية</a>
              {/* r149 (R3-A6 #6): كان الرابط يقفز بضيف إلى /auth — نفس
                  بيانات الكليات متاحة مجهولة الهوية عبر النافذة المنبثقة. */}
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => setCollegesOpen(true)}
              >
                الكليّات
              </button>
              <a href="#roles" className="landing-footer-link">عن المنصّة</a>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© {year} مدارك · جامعة الزاوية</span>
            <span className="ln-footer-cluster">
              <LibyaFlag size={14} /> صُنع في ليبيا
            </span>
          </div>
        </div>
      </footer>
      <CollegesPopover open={collegesOpen} onClose={() => setCollegesOpen(false)} />
      {/* film-grain texture layer — last child, painted over the whole world */}
      <div className="ln-grain" aria-hidden="true" />
    </div>
  );
}
