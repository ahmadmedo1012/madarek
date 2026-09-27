import { Link, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain, GraduationCap, Network, Compass,
  ArrowLeft, Menu, X,
  Microscope, ClipboardCheck,
  Check, ChevronDown, PlayCircle, Route as RouteIcon,
  Medal, Keyboard, MoonStar,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../components/Icon';
import { CollegesPopover } from '../components/CollegesPopover';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../stores/auth.store';
import { LibyaFlag } from '../components/LibyaFlag';
import { RevealCssClass } from '../hooks/useReveal';
import { useSectionProgress } from '../hooks/useSectionProgress';
import { useMagnetic } from '../hooks/useMagnetic';
import { CountUp } from '../components/CountUp';
import { colleges } from '../data/colleges.config';
import { CollegeConstellation } from '../components/landing/CollegeConstellation';
import { JourneyLightPath } from '../components/landing/JourneyLightPath';
import IntroSequence from '../components/landing/IntroSequence';
import TrustMarquee from '../components/landing/TrustMarquee';
import RolesChapter from '../components/landing/RolesChapter';
import CampusChapter from '../components/landing/CampusChapter';
import FinalCtaChapter from '../components/landing/FinalCtaChapter';
import { useLandingMotion } from '../hooks/useLandingMotion';
// landing.css is this page's own sheet (dark immersive world, scoped to
// .landing); landing-chapters.css rides AFTER it (v4 chapters override);
// colleges.css for the popover surfaces.
import '../styles/landing.css';
import '../styles/landing-chapters.css';
import '../styles/colleges.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* three + R3F live in their own async chunk — the hero paints pure
   HTML/CSS first and the WebGL world swaps in when ready. */
const HeroScene = lazy(() => import('../components/landing/HeroScene'));

/**
 * Landing — «عالم مدارك» radical redesign v4 (docs/radical-redesign-gap-analysis.md).
 *
 * The page is a cinematic journey through one original world:
 *   المدار (WebGL knowledge world) → الثقة (marquee) → مدارات الكلّيّات
 *   → رحلة التعلّم (light path + station activation) → قصّة التقدّم
 *   (pinned orbit-progress system) → الأرض → الأدوار → نقطة البداية.
 *
 * University truth: UoZ operates 25 colleges (backend seed faculty table;
 * registry in data/colleges.config.ts is the canonical machine source).
 */
const COLLEGES_COUNT = colleges.length > 0 ? colleges.length : 25;

/** Journey stations — the «how learning works» chapter. */
const JOURNEY: Array<{
  n: string; icon: typeof PlayCircle; title: string; desc: string; tag: string;
}> = [
  {
    n: '01', icon: PlayCircle, title: 'محاضرة تفاعلية',
    desc: 'محاضرات مسجَّلة بنقاط فحص مدمجة — الحضور يُحتسب تلقائيًا عند الإكمال، والفهم يُبنى بإيقاعك أنت.',
    tag: 'الفصل المعكوس',
  },
  {
    n: '02', icon: RouteIcon, title: 'مصفوفة معرفية',
    desc: 'مسارات تعلُّم تتكيَّف مع مستوى تقدُّمك ونقاط قوَّتك، تكشف الفجوات وتربطها مباشرة بالدقائق التي تشرحها.',
    tag: 'مسار متكيِّف',
  },
  {
    n: '03', icon: Brain, title: 'مساعد أكاديمي',
    desc: '«Oasis» يعرف مقرَّراتك ومحاضراتك ودرجاتك — شروحات مخصَّصة، تلخيصات للفصول الطويلة، واختبارات مراجعة حسب أدائك الفعلي.',
    tag: 'Oasis',
  },
  {
    n: '04', icon: ClipboardCheck, title: 'اختبارات ذكية',
    desc: 'أسئلة اختيار متعدد وصح/خطأ وإجابة قصيرة ومقالة — تصحيح تلقائي للموضوعي ومراجعة معلَّمة للمقالات.',
    tag: 'تقييم فوري',
  },
  {
    n: '05', icon: Medal, title: 'إتقان موثَّق',
    desc: 'نقاط ومستويات وشارات تشجّع الالتزام، وشهادات إتمام تُضاف إلى ملفّك الأكاديمي تلقائيًا.',
    tag: 'إنجاز',
  },
];

/** Progress chapter data — real numbers from the flipped-classroom field
 *  study (English course, southern Libya) — never invented. */
const PROGRESS_STATS = [
  { value: '40', label: 'تحسُّن الاستيعاب', note: 'مقارنة بالأسلوب التقليدي', frac: 0.4 },
  { value: '70', label: 'زيادة في المشاركة', note: 'داخل الحلقات النقاشية', frac: 0.7 },
  { value: '30', label: 'تحسُّن الالتزام', note: 'بمتابعة الجلسات', frac: 0.3 },
  { value: '90', label: 'تحقيق أهداف التعلّم', note: 'ضمن الإطار الزمني', frac: 0.9 },
] as const;

export default function LandingPage() {
  useThemeSync();
  usePageTitle('منصة التعليم الذكي · جامعة الزاوية');
  useLandingMotion();
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
  const [scrolled, setScrolled] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const megamenuTriggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLElement>(null);

  /** Live hero scroll progress → HeroScene camera (ref, no re-renders). */
  const heroProgress = useRef(0);

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  /** Weak-device / save-data gate — the CSS sky alone carries the hero. */
  const sceneAllowed = useMemo(() => {
    try {
      if ('connection' in navigator) {
        const conn = navigator.connection as { saveData?: boolean };
        if (conn.saveData) return false;
      }
      if ((navigator.hardwareConcurrency ?? 4) < 2) return false;
      const probe = document.createElement('canvas');
      return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
    } catch {
      return false;
    }
  }, []);

  // Returning-visitor calm: first session visit plays the full intro; later
  // visits this session skip straight to the settled hero.
  const [introSeen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem('madarek.intro.seen') === '1';
    } catch {
      return false;
    }
  });

  const [showIntro, setShowIntro] = useState(!introSeen && !prefersReduced);
  const [heroReady, setHeroReady] = useState(introSeen || prefersReduced);

  useEffect(() => {
    if (redirectHome || introSeen) return;
    try {
      window.sessionStorage.setItem('madarek.intro.seen', '1');
    } catch {
      // sessionStorage may be blocked in private mode — that's fine.
    }
  }, [redirectHome, introSeen]);

  /* ── scroll state: ribbon + hero progress ref ─────────────────────── */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 6);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? Math.min(1, y / max) : 0);
      const hero = heroRef.current;
      if (hero) {
        const h = hero.offsetHeight;
        heroProgress.current = Math.min(1, Math.max(0, y / Math.max(1, h * 0.9)));
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── HERO entrance choreography (plays when the intro wipes open) ──── */
  useGSAP(
    () => {
      if (!heroReady || prefersReduced) return;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo('.lnh-eyebrow', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0)
        .fromTo(
          '.lnh-line-inner',
          { yPercent: 118 },
          { yPercent: 0, duration: 1.1, stagger: 0.13 },
          0.05,
        )
        .fromTo('.lnh-gold', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.75)
        .fromTo('.lnh-sub', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85 }, 0.45)
        .fromTo('.lnh-actions', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85 }, 0.58)
        .fromTo('.lnh-meta', { opacity: 0 }, { opacity: 1, duration: 0.7 }, 0.74)
        .fromTo('.lnh-scroll', { opacity: 0 }, { opacity: 0.9, duration: 0.8 }, 0.95);
      return () => {
        tl.kill();
      };
    },
    { scope: rootRef, dependencies: [heroReady, prefersReduced] },
  );

  /* ── JOURNEY: stations light up as the light path reaches them ─────── */
  useGSAP(
    () => {
      if (prefersReduced) return;
      gsap.utils.toArray<HTMLElement>('.ln-station').forEach((st) => {
        ScrollTrigger.create({
          trigger: st,
          start: 'top 64%',
          end: 'bottom 30%',
          toggleClass: { targets: st, className: 'on' },
        });
      });
    },
    { scope: rootRef, dependencies: [prefersReduced] },
  );

  /* ── PROGRESS: pinned orbit-system chapter (desktop) / enter-fill ──── */
  useGSAP(
    () => {
      const arcs = gsap.utils.toArray<SVGPathElement>('.lnp-arc-fill');
      const rows = gsap.utils.toArray<HTMLElement>('.lnp-row');
      const core = rootRef.current?.querySelector('.lnp-core');
      if (prefersReduced) return;

      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: progressRef.current,
            start: 'top top',
            end: '+=170%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
          },
        });
        tl.fromTo('.lnp-head', { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0)
          .fromTo('.lnp-lede', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.1);
        arcs.forEach((arc, i) => {
          tl.to(
            arc,
            { strokeDashoffset: 100 * (1 - PROGRESS_STATS[i]!.frac), duration: 0.7 },
            0.18 + i * 0.16,
          ).to(rows[i] ?? {}, { opacity: 1, x: 0, duration: 0.25 }, 0.3 + i * 0.16);
        });
        if (core) {
          tl.fromTo(core, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6 }, 0.2)
            .to(core, { scale: 1.06, duration: 0.2 }, 0.85)
            .to(core, { scale: 1, duration: 0.2 }, 1.0);
        }
        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      mm.add('(max-width: 1023px)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: progressRef.current,
            start: 'top 72%',
            once: true,
          },
        });
        arcs.forEach((arc, i) => {
          tl.to(
            arc,
            { strokeDashoffset: 100 * (1 - PROGRESS_STATS[i]!.frac), duration: 0.9, ease: 'expo.out' },
            i * 0.12,
          );
        });
        tl.to(rows, { opacity: 1, x: 0, duration: 0.6, stagger: 0.1 }, 0.2);
        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [prefersReduced] },
  );

  // Scroll-scrubbed journey light path (native CSS var, no hijack).
  const journeyRef = useSectionProgress<HTMLElement>();
  const magneticCta = useMagnetic<HTMLAnchorElement>(7);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  /* Progress arcs — one 240° track per domain, radius stepped. */
  const ARC_R = [176, 150, 124, 98];
  const arcPath = (r: number, frac: number): string => {
    // 240° sweep starting at -210° (top-left of the orbit system)
    const start = (-210 * Math.PI) / 180;
    const sweep = (240 * frac * Math.PI) / 180;
    const cx = 210;
    const cy = 210;
    const x0 = cx + r * Math.cos(start);
    const y0 = cy + r * Math.sin(start);
    const x1 = cx + r * Math.cos(start + sweep);
    const y1 = cy + r * Math.sin(start + sweep);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  return (
    <div className="landing" ref={rootRef} data-hero-wait={!heroReady ? 'true' : undefined}>

      {/* Cinematic boot — first visit of the session only */}
      {showIntro && (
        <IntroSequence
          onComplete={() => {
            setShowIntro(false);
            setHeroReady(true);
          }}
        />
      )}

      {/* Top scroll-progress bar */}
      <div className="landing-progress" aria-hidden>
        <div className="landing-progress-bar" style={{ ['--p' as string]: scrollPct }} />
      </div>

      {/* Ministry strip */}
      <div className="ministry-strip" role="region" aria-label="الجهة المشرفة">
        <div className="ministry-strip-inner">
          <span className="ministry-strip-emblem"><LibyaFlag size={14} /></span>
          <span>دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية</span>
        </div>
      </div>

      {/* Header — dark glass over the world */}
      <header className={`landing-header${scrolled ? ' scrolled' : ''}`}>
        <div className="landing-nav">
          <Link to="/" className="landing-brand" aria-label="مدارك">
            <span className="landing-brand-mark">م</span>
            <span className="landing-brand-text">
              <span className="landing-brand-name">مدارك</span>
              <span className="landing-brand-sub">جامعة الزاوية</span>
            </span>
          </Link>

          <nav className="landing-nav-links">
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
                    <span className="landing-megamenu-item-desc">نتائج تجربة فعلية</span>
                  </span>
                </a>
              </div>
            </div>
            <a href="#colleges" className="landing-nav-link">الكلّيّات</a>
            <a href="#roles" className="landing-nav-link">الأدوار</a>
            <a href="#progress" className="landing-nav-link">النتائج</a>
          </nav>

          <div className="landing-header-cta">
            <Link to="/auth" className="btn ghost sm">تسجيل الدخول</Link>
            <Link to="/auth" className="btn primary sm">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </div>

          <button
            type="button"
            className="landing-burger"
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon icon={menuOpen ? X : Menu} size={20} />
          </button>
        </div>

        {menuOpen && (
          <nav className="landing-mobile-menu" onClick={() => setMenuOpen(false)}>
            <a href="#colleges" className="btn ghost">الكلّيّات</a>
            <a href="#journey" className="btn ghost">رحلة التعلّم</a>
            <a href="#progress" className="btn ghost">قصة التقدّم</a>
            <a href="#campus" className="btn ghost">الجامعة</a>
            <a href="#roles" className="btn ghost">الأدوار</a>
            <Link to="/auth" className="btn primary">ابدأ الآن</Link>
          </nav>
        )}
      </header>

      <main>
      {/* ═══ الفصل ٠ — المدار: the knowledge world ═══ */}
      <section className="ln-hero" ref={heroRef} aria-label="مدارك — منصة التعليم الذكي">
        {/* living scene (fails safe to the CSS sky below) */}
        <div className="ln-hero-sky" aria-hidden>
          {sceneAllowed && (
            <Suspense fallback={null}>
              <HeroScene
                className="ln-hero-canvas"
                progressRef={heroProgress}
                staticFrame={prefersReduced}
              />
            </Suspense>
          )}
          <span className="ln-hero-stars" />
          <span className="ln-hero-horizon" />
        </div>

        <div className="ln-hero-inner">
          <div className="ln-hero-content">
            <p className="lnh-eyebrow ln-mono lnh-a">
              // جامعة الزاوية · {String(COLLEGES_COUNT).padStart(2, '0')} كلية · منذ 1988
            </p>

            <h1 className="ln-hero-title">
              <span className="lnh-line"><span className="lnh-line-inner lnh-a">كل معرفة تبدأ <em>نقطة</em></span></span>
              <span className="lnh-line"><span className="lnh-line-inner lnh-a">وتصبح <em className="lnh-gold">مدارًا</em></span></span>
            </h1>

            <p className="lnh-sub lnh-a">
              مدارك — منصّة التعليم الذكي لجامعة الزاوية. محاضرات تفاعلية،
              مصفوفة معرفية تتكيّف مع تقدّمك، ومساعد أكاديمي يرافقك
              من أوّل درس حتى الإتقان.
            </p>

            <div className="lnh-actions lnh-a ln-hero-actions">
              <Link to="/auth" className="ln-btn-gold" ref={magneticCta}>
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
            </div>

            <ul className="lnh-meta lnh-a ln-hero-meta">
              <li><Icon icon={Check} size={13} /> بإيميلك الجامعي</li>
              <li aria-hidden className="ln-hero-meta-dot" />
              <li><Icon icon={Keyboard} size={13} /> يعمل بلوحة المفاتيح</li>
              <li aria-hidden className="ln-hero-meta-dot" />
              <li><Icon icon={MoonStar} size={13} /> وضع تقليل الحركة محترم</li>
            </ul>
          </div>
        </div>

        {/* scroll invitation */}
        <a href="#trust" className="lnh-scroll ln-hero-scroll" aria-label="تابع الرحلة">
          <span className="ln-mono">تابع الرحلة</span>
          <span className="ln-hero-scroll-line" aria-hidden />
        </a>
      </section>

      {/* ═══ الفصل ١ — الثقة (marquee) ═══ */}
      <TrustMarquee />

      {/* ═══ الفصل ٢ — مدارات الكلّيّات ═══ */}
      <section id="colleges" className="ln-chapter ln-colleges">
        <div className="ln-chapter-head">
          <RevealCssClass as="p" className="ln-mono ln-mono-eyebrow">// الفصل الأول — الاكتشاف</RevealCssClass>
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
          <RevealCssClass as="p" className="ln-mono ln-mono-eyebrow">// الفصل الثاني — الطريق</RevealCssClass>
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

      {/* ═══ الفصل ٤ — قصّة التقدّم (pinned orbit system) ═══ */}
      <section id="progress" ref={progressRef} className="ln-chapter ln-progress">
        <div className="ln-progress-grid">
          <div className="ln-progress-visual" aria-hidden>
            <svg viewBox="0 0 420 420" className="ln-progress-system" role="presentation">
              {ARC_R.map((r, i) => (
                <g key={r}>
                  <path
                    className="lnp-arc-track"
                    d={arcPath(r, 1)}
                    fill="none"
                    strokeWidth={i === 0 ? 2.5 : 1.5}
                  />
                  <path
                    className="lnp-arc-fill"
                    d={arcPath(r, 1)}
                    fill="none"
                    strokeWidth={i === 0 ? 4 : 3}
                    pathLength={100}
                    style={{ ['--lnp-fill' as string]: String(100 * (1 - (PROGRESS_STATS[i]?.frac ?? 0.4))) }}
                  />
                </g>
              ))}
              <g className="lnp-core">
                <circle cx="210" cy="210" r="34" className="lnp-core-body" />
                <circle cx="210" cy="210" r="52" className="lnp-core-halo" />
              </g>
            </svg>
            <span className="lnp-caption ln-mono">EXPAND · مدارك تتّسع</span>
          </div>

          <div className="ln-progress-copy">
            <p className="ln-mono ln-mono-eyebrow lnp-head">// الفصل الثالث — التقدّم</p>
            <h2 className="ln-chapter-title lnp-head">
              مدارُك يتّسع مع <em>كلّ خطوة</em>
            </h2>
            <p className="ln-chapter-lede lnp-lede">
              من أوّل درس تشاهده، إلى أوّل اختبار تجتازه، إلى مسار تُكمله —
              لوحة دقيقة ترسم تقدّمك لحظة بلحظة: الدرجات والحضور والمهام
              والمؤشرات المؤسسية، بصياغة تخدم القرار.
            </p>

            <div className="lnp-rows">
              {PROGRESS_STATS.map((s) => (
                <div className="lnp-row" key={s.label}>
                  <span className="lnp-row-value">
                    <CountUp value={s.value} /><span className="lnp-row-unit">%</span>
                  </span>
                  <span className="lnp-row-body">
                    <span className="lnp-row-label">{s.label}</span>
                    <span className="lnp-row-note">{s.note}</span>
                  </span>
                </div>
              ))}
            </div>

            <p className="ln-progress-source">
              دراسة ميدانية: استراتيجية الصفّ المعكوس على مقرّر اللغة الإنجليزية
              مع طلّاب من جنوب ليبيا — هذه أرقام التجربة الفعلية.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ الفصل ٥ — الأرض: الحرم الحقيقي ═══ */}
      <CampusChapter />

      {/* ═══ الفصل ٦ — الأدوار ═══ */}
      <RolesChapter />

      {/* ═══ الفصل ٧ — نقطة البداية ═══ */}
      <FinalCtaChapter />
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
              <Link to="/colleges" className="landing-footer-link">الكليّات</Link>
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
    </div>
  );
}
