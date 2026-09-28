import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Brain, GraduationCap, Building2, Compass,
  ShieldCheck, ArrowLeft, Menu, X, BookOpen,
  Microscope, FlaskConical, Calendar, ClipboardCheck,
  Check, ChevronDown, PlayCircle, Route as RouteIcon,
  Medal, Keyboard, Sparkles, MoonStar,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { CollegesPopover } from '../components/CollegesPopover';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../stores/auth.store';
import { LibyaFlag } from '../components/LibyaFlag';
import { RevealCssClass } from '../hooks/useReveal';
import { useSectionProgress } from '../hooks/useSectionProgress';
import { useActProgress } from '../hooks/useActProgress';
import { useSmoothScroll } from '../hooks/useSmoothScroll';
import { useMagnetic } from '../hooks/useMagnetic';
import { CountUp } from '../components/CountUp';
import { colleges } from '../data/colleges.config';
import { SkyAtlas } from '../components/landing/SkyAtlas';
import { PreloaderRitual } from '../components/landing/PreloaderRitual';
import { GoldenThread } from '../components/landing/GoldenThread';
import { HorizonRail } from '../components/landing/HorizonRail';
import { CursorCompanion } from '../components/landing/CursorCompanion';
import { KineticWords } from '../components/landing/KineticWords';
import { Parallax } from '../components/motion/Parallax';
// landing.css is this page's own sheet (the «أطلس المعرفة» world, scoped
// to .landing); colleges.css rides here for the popover surfaces.
import '../styles/landing.css';
import '../styles/colleges.css';

/**
 * Landing — «أطلس المعرفة» the leaders-round rebuild.
 *
 * The page is a scroll film in five movements, each with its own device
 * (never the same family twice in a row):
 *
 *   ٠  الانفتاح   hero — pinned 260vh; the astrolabe sky breathes under
 *                 the visitor's hand; sculptural Kufi crosses states.
 *   ١  الاكتشاف   colleges — a horizontal sky-meridian (pan, 320vh);
 *                 six real domains as orbital stations.
 *   ٢  الطريق     journey — THE PEAK (pinned 500vh): five stations cross
 *                 over while each constellation draws itself.
 *   ٣  الإتساع    progress — flow; real experiment numbers, orbit bloom.
 *   ٤  الأرض      campus + roles — flow; the ground rises to meet you.
 *   ٥  العودة     finale — «ابدأ»; the golden thread closes its circle.
 *
 * One golden thread («خيط الرحلة») runs the whole page — drawn by the
 * visitor's scrolling, its head a traveller light, closing into a ring
 * around the final CTA. Truth rules hold: every number real, every
 * motion purposeful, reduced-motion shows the composed still world.
 */
const COLLEGES_COUNT = colleges.length > 0 ? colleges.length : 25;

/** Journey stations — the «how learning works» peak chapter. */
const JOURNEY: Array<{
  n: string; icon: typeof PlayCircle; title: string; desc: string; tag: string;
  /** constellation points (viewBox 0 0 220 130) — deterministic, drawn on scroll */
  sky: Array<[number, number]>;
}> = [
  {
    n: '01', icon: PlayCircle, title: 'محاضرة تفاعلية',
    desc: 'محاضرات مسجَّلة بنقاط فحص مدمجة — الحضور يُحتسب تلقائيًا عند الإكمال، والفهم يُبنى بإيقاعك أنت.',
    tag: 'الفصل المعكوس',
    sky: [[186, 22], [150, 44], [122, 30], [96, 58], [64, 44], [36, 70]],
  },
  {
    n: '02', icon: RouteIcon, title: 'مصفوفة معرفية',
    desc: 'مسارات تعلُّم تتكيَّف مع مستوى تقدُّمك ونقاط قوَّتك، تكشف الفجوات وتربطها مباشرة بالدقائق التي تشرحها.',
    tag: 'مسار متكيِّف',
    sky: [[190, 62], [158, 40], [126, 66], [98, 42], [70, 68], [40, 46], [18, 74]],
  },
  {
    n: '03', icon: Brain, title: 'مساعد أكاديمي',
    desc: '«Oasis» يعرف مقرَّراتك ومحاضراتك ودرجاتك — شروحات مخصَّصة، تلخيصات للفصول الطويلة، واختبارات مراجعة حسب أدائك الفعلي.',
    tag: 'Oasis',
    sky: [[178, 34], [146, 58], [114, 36], [88, 62], [58, 40], [30, 66]],
  },
  {
    n: '04', icon: ClipboardCheck, title: 'اختبارات ذكية',
    desc: 'أسئلة اختيار متعدد وصح/خطأ وإجابة قصيرة ومقالة — تصحيح تلقائي للموضوعي ومراجعة معلَّمة للمقالات.',
    tag: 'تقييم فوري',
    sky: [[196, 48], [166, 26], [140, 54], [104, 32], [74, 60], [44, 38], [16, 62]],
  },
  {
    n: '05', icon: Medal, title: 'إتقان موثَّق',
    desc: 'نقاط ومستويات وشارات تشجّع الالتزام، وشهادات إتمام تُضاف إلى ملفّك الأكاديمي تلقائيًا.',
    tag: 'إنجاز',
    sky: [[182, 26], [152, 52], [120, 34], [92, 64], [60, 44], [34, 72]],
  },
];

const ROLES = [
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
    quote: null,
  },
];

const SYSTEM_TRIO = [
  {
    icon: BookOpen, tone: 'gold', title: 'مكتبة وبحوث',
    desc: 'فهرس بحثيّ بفحص نزاهة علمية تلقائي (انتحال + AI) ومراجعة معلَّمة على الـPDF.',
  },
  {
    icon: Calendar, tone: 'azure', title: 'جدول ذكي',
    desc: 'جدول أسبوعيّ يجمع المحاضرات والتسليمات والاختبارات، بمذكّرات تلقائية وروابط مباشرة.',
  },
  {
    icon: FlaskConical, tone: 'mist', title: 'معامل افتراضية',
    desc: 'محاكاة شبكات وإلكترونيات وتجارب AR/VR للتطبيق العملي الآمن.',
  },
];

export default function LandingPage() {
  useThemeSync();
  usePageTitle('منصة التعليم الذكي · جامعة الزاوية');
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

  // The entry ritual — once per session; repeat visits land revealed.
  const [ritualSeen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem('madarek.ritual.seen') === '1';
    } catch {
      return false;
    }
  });
  const [revealed, setRevealed] = useState(ritualSeen);

  useEffect(() => {
    if (redirectHome || ritualSeen) return;
    try {
      window.sessionStorage.setItem('madarek.ritual.seen', '1');
    } catch {
      // sessionStorage may be blocked in private mode — that's fine.
    }
  }, [redirectHome, ritualSeen]);

  // Buttery wheel on desktop pointers (self-gating: touch/reduced stay native).
  useSmoothScroll(true);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 6);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? Math.min(1, y / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Pinned acts publish their scrub progress as --p; the peak journey act
  // uses the same contract. Progress chapter keeps its --sp flow scrub.
  const heroRef = useActProgress<HTMLElement>();
  const collegesRef = useActProgress<HTMLElement>();
  const journeyRef = useActProgress<HTMLElement>();
  const progressRef = useSectionProgress<HTMLElement>();
  const magneticCta = useMagnetic<HTMLAnchorElement>(7);

  // Hero phase — the crossover between state A (opening) and state B
  // (the promise). React state only flips on threshold crossings, so the
  // pinned hero re-renders at most twice per transit; CSS handles the
  // crossfade itself from the act's --p. visibility toggling here keeps
  // invisible CTAs unfocusable (no ghost focus targets).
  const [heroPhase, setHeroPhase] = useState<'a' | 'b'>('a');
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const travel = Math.max(1, rect.height - vh);
      const p = Math.min(1, Math.max(0, -rect.top / travel));
      setHeroPhase((prev) => {
        const next = p > 0.52 ? 'b' : 'a';
        return prev === next ? prev : next;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  return (
    <div className={`landing${revealed ? ' revealed' : ''}`}>

      {!ritualSeen && <PreloaderRitual onDone={() => setRevealed(true)} />}
      <CursorCompanion />

      {/* the room: fixed atmosphere layers over everything */}
      <div className="landing-stars" aria-hidden="true" />
      <div className="landing-grain" aria-hidden="true" />
      <div className="landing-vignette" aria-hidden="true" />

      {/* Top scroll-progress thread (the nav's golden line) */}
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

      {/* Header — dark glass over the sky */}
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
            <a href="#roles" className="btn ghost">الأدوار</a>
            <a href="#progress" className="btn ghost">النتائج</a>
            <Link to="/auth" className="btn primary full">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </nav>
        )}
      </header>

      {/* the signature: one golden thread, drawn by the visitor's scroll */}
      <GoldenThread />

      <main>
      {/* ═══ الحركة ٠ — الانفتاح: the hero act (pinned 260vh) ═══ */}
      <section className="ln-hero" data-hero-holder ref={heroRef} aria-label="مدارك — منصة التعليم الذكي">
        <div className="ln-hero-stage" data-phase={heroPhase}>
          {/* the living sky — five planes, self-measured scrub */}
          <SkyAtlas className="ln-hero-canvas" biasX={-0.5} />
          <span className="ln-hero-horizon" aria-hidden />

          <div className="ln-hero-content">
            {/* state A — the opening (greets; holds while p < 0.45) */}
            <div className="ln-hero-state a">
              <p className="ln-hero-eyebrow">
                <span className="ln-mono">جامعة الزاوية · {String(COLLEGES_COUNT).padStart(2, '0')} كلية · منذ 1988</span>
              </p>
              <h1 className="ln-hero-title">
                <KineticWords text="كلُّ معرفةٍ تبدأ نقطة" className="ln-hero-line" accent={[2]} trigger="mount" />
                <KineticWords text="وتصبح مدارًا" className="ln-hero-line" accent={[0]} delay={520} trigger="mount" />
              </h1>
              <p className="ln-hero-sub">
                مدارك — منصّة التعليم الذكي لجامعة الزاوية. محاضرات تفاعلية،
                مصفوفة معرفية تتكيّف مع تقدّمك، ومساعد أكاديمي يرافقك
                من أوّل درس حتى الإتقان.
              </p>
              <div className="ln-hero-actions">
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
              <ul className="ln-hero-meta">
                <li><Icon icon={Check} size={13} /> بإيميلك الجامعي</li>
                <li aria-hidden className="ln-hero-meta-dot" />
                <li><Icon icon={Keyboard} size={13} /> يعمل بلوحة المفاتيح</li>
                <li aria-hidden className="ln-hero-meta-dot" />
                <li><Icon icon={MoonStar} size={13} /> وضع تقليل الحركة محترم</li>
              </ul>
            </div>

            {/* state B — the promise (arrives as the sky deepens) */}
            <div className="ln-hero-state b" aria-hidden="false">
              <p className="ln-mono ln-hero-b-eyebrow">المنظومة</p>
              <p className="ln-hero-b-line">
                الجامعةُ كلُّها… <em>مدارٌ واحد يدور حولك</em>
              </p>
              <p className="ln-hero-b-sub">
                محاضرات وحضور ودرجات واختبارات وشهادات — منظومة موحَّدة
                لكل كلّيّة، تُعرَف من أوّل نقطة دخول.
              </p>
            </div>
          </div>

          {/* thread anchor: the journey's first node */}
          <i className="thread-node" data-thread-node style={{ top: '34%', right: '12%' }} aria-hidden />
        </div>
      </section>

      {/* ═══ أنفاس — الثقة (a short breath, flow) ═══ */}
      <section id="trust" className="ln-trust" aria-label="الاعتماد الرسمي">
        <div className="ln-trust-inner">
          <span className="ln-mono">معتمدة رسميًا</span>
          <span className="ln-trust-sep" aria-hidden />
          <span>وزارة التعليم العالي والبحث العلمي</span>
          <span className="ln-trust-sep" aria-hidden />
          <span>جامعة الزاوية</span>
          <span className="ln-trust-sep" aria-hidden />
          <span>قطاع ضمان الجودة</span>
        </div>
      </section>

      {/* ═══ الحركة ١ — الاكتشاف: colleges pan (pinned 320vh) ═══ */}
      <section id="colleges" className="ln-act ln-colleges" ref={collegesRef} aria-label="مدارات الكليات">
        <div className="act-stage">
          <HorizonRail onBrowse={() => setCollegesOpen(true)} />
        </div>
        <i className="thread-node" data-thread-node style={{ top: '42%', left: '14%' }} aria-hidden />
      </section>

      {/* ═══ الحركة ٢ — الطريق: THE PEAK (pinned 500vh, five stations) ═══ */}
      <section id="journey" className="ln-act ln-journey" ref={journeyRef} aria-label="رحلة التعلم">
        <div className="act-stage">
          {/* chapter head — greets at p≈0 then hands over to the stations */}
          <header className="j-head">
            <p className="ln-mono j-eyebrow">الفصل الثاني · الطريق</p>
            <h2 className="j-title">من أوّل درس إلى <em>الإتقان</em></h2>
            <p className="j-lede">خمس محطات — كلٌّ منها تُبنى على ما قبلها، وخطُّ ضوءٍ واحد يربطها.</p>
          </header>

          {/* the stations — cross over inside the held frame */}
          <ol className="j-stations">
            {JOURNEY.map((s, i) => (
              <li
                key={s.n}
                className={`j-station${i === JOURNEY.length - 1 ? ' last' : ''}${i % 2 === 1 ? ' flip' : ''}`}
                style={{ ['--a' as string]: i / JOURNEY.length, ['--b' as string]: (i + 1) / JOURNEY.length }}
              >
                <div className="j-station-copy">
                  <span className="j-station-index ln-mono">{s.n}</span>
                  <span className="j-station-ico"><Icon icon={s.icon} size={22} strokeWidth={1.7} /></span>
                  <span className="j-station-tag">{s.tag}</span>
                  <h3 className="j-station-title">{s.title}</h3>
                  <p className="j-station-desc">{s.desc}</p>
                </div>
                {/* the station's constellation — draws itself as it arrives */}
                <svg
                  className="j-station-sky"
                  viewBox="0 0 220 130"
                  aria-hidden
                >
                  <polyline
                    className="j-sky-line"
                    points={s.sky.map((p) => p.join(',')).join(' ')}
                    pathLength={100}
                  />
                  {s.sky.map((p, k) => (
                    <circle key={k} className="j-sky-star" cx={p[0]} cy={p[1]} r={k === 0 ? 3 : 2} style={{ ['--k' as string]: k }} />
                  ))}
                </svg>
              </li>
            ))}
          </ol>

          {/* the station rail — where you are on the road */}
          <div className="j-rail" aria-hidden>
            {JOURNEY.map((s, i) => (
              <span
                key={s.n}
                className="j-rail-dot"
                style={{ ['--a' as string]: i / JOURNEY.length, ['--b' as string]: (i + 1) / JOURNEY.length }}
              />
            ))}
            <span className="j-rail-line" />
          </div>
        </div>
        {/* stable in-flow anchors for the golden thread (one per station) */}
        {JOURNEY.map((s, i) => (
          <i
            key={s.n}
            className="thread-node"
            data-thread-node
            style={{ top: `${12 + i * 19}%`, [i % 2 === 0 ? 'right' : 'left']: '18%' }}
            aria-hidden
          />
        ))}
      </section>

      {/* ═══ الحركة ٣ — الإتساع: progress story (flow) ═══ */}
      <section id="progress" className="ln-chapter ln-progress" ref={progressRef}>
        <div className="ln-progress-grid">
          <div className="ln-progress-visual" aria-hidden>
            <div className="ln-progress-orbits">
              {/* expanding orbit system — scale driven by --sp */}
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
            <RevealCssClass as="p" className="ln-mono ln-mono-eyebrow">الفصل الثالث · التقدّم</RevealCssClass>
            <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
              مدارُك يتّسع مع <em>كلّ خطوة</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
              من أوّل درس تشاهده، إلى أوّل اختبار تجتازه، إلى مسار تُكمله —
              لوحة دقيقة ترسم تقدّمك لحظة بلحظة: الدرجات والحضور والمهام
              والمؤشرات المؤسسية، بصياغة تخدم القرار.
            </RevealCssClass>

            <div className="ln-progress-stats" data-thread-node>
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
                <div className="ln-stat-value"><CountUp value="30" /><span className="ln-stat-unit">%</span></div>
                <div className="ln-stat-label">تحسُّن الالتزام</div>
                <div className="ln-stat-note">بمتابعة الجلسات</div>
              </RevealCssClass>
              <RevealCssClass as="div" className="ln-stat" delay={3}>
                <div className="ln-stat-value"><CountUp value="90" /><span className="ln-stat-unit">%</span></div>
                <div className="ln-stat-label">تحقيق أهداف التعلّم</div>
                <div className="ln-stat-note">ضمن الإطار الزمني</div>
              </RevealCssClass>
            </div>

            <RevealCssClass as="p" className="ln-progress-source" delay={3}>
              دراسة ميدانية: استراتيجية الصفّ المعكوس على مقرّر اللغة الإنجليزية
              مع طلّاب من جنوب ليبيا — هذه أرقام التجربة الفعلية.
            </RevealCssClass>
          </div>
        </div>
      </section>

      {/* ═══ الحركة ٤ — الأرض: الحرم الحقيقي (flow, reveal + parallax) ═══ */}
      <section id="campus" className="ln-chapter ln-campus" aria-label="جامعة الزاوية">
        <RevealCssClass as="figure" className="ln-campus-frame">
          <Parallax amount={9} direction="up">
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
            <div className="ln-fact-note">حسب الموقع الرسمي للجامعة</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-fact" delay={1}>
            <div className="ln-fact-value"><CountUp value="4" /></div>
            <div className="ln-fact-label">مدن وفروع</div>
            <div className="ln-fact-note">الزاوية، العجيلات، زوارة وأخرى</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-fact" delay={2}>
            <div className="ln-fact-value">1988</div>
            <div className="ln-fact-label">عام التأسيس</div>
            <div className="ln-fact-note">بقرار رقم 135</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="ln-fact" delay={3}>
            <div className="ln-fact-value"><CountUp value="3" /></div>
            <div className="ln-fact-label">عضويّات دوليّة</div>
            <div className="ln-fact-note">عربيّة، أفريقيّة، إسلاميّة</div>
          </RevealCssClass>
        </div>
      </section>

      {/* ═══ المجتمع — الأدوار (flow, asymmetric ledger) ═══ */}
      <section id="roles" className="ln-chapter ln-roles">
        <div className="ln-chapter-head">
          <RevealCssClass as="p" className="ln-mono ln-mono-eyebrow">الفصل الرابع · المجتمع</RevealCssClass>
          <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
            أربعة <em>أدوار</em>، تجربة موحَّدة
          </RevealCssClass>
          <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
            كل دور أكاديمي يرى ما يخصّه فقط — صلاحيات مدروسة وفصل واضح بين الواجبات.
          </RevealCssClass>
        </div>

        <ul className="ln-roles-list" data-thread-node>
          {ROLES.map((r, i) => (
            <RevealCssClass as="li" key={r.name} className="ln-role-row" delay={(i + 1) as 1 | 2 | 3 | 4}>
              <span className="ln-role-key">
                <span className={`ln-role-ico ${r.tone}`}><Icon icon={r.icon} size={26} strokeWidth={1.7} /></span>
                <span className="ln-role-name">{r.name}</span>
                <span className="ln-role-index ln-mono">{String(i + 1).padStart(2, '0')}</span>
              </span>
              <p className="ln-role-desc">{r.desc}</p>
              {r.quote && (
                <blockquote className="ln-role-quote">
                  <span className="ln-role-quote-mark" aria-hidden>”</span>
                  {r.quote}
                </blockquote>
              )}
            </RevealCssClass>
          ))}
        </ul>

        {/* the wider system — compact trio (content preserved from the old bento) */}
        <div className="ln-system-trio">
          {SYSTEM_TRIO.map((c, i) => (
            <RevealCssClass as="article" key={c.title} className="ln-system-card" delay={(i + 1) as 1 | 2 | 3}>
              <span className={`ln-system-ico ${c.tone}`}><Icon icon={c.icon} size={22} /></span>
              <h3 className="ln-system-title">{c.title}</h3>
              <p className="ln-system-desc">{c.desc}</p>
            </RevealCssClass>
          ))}
        </div>
      </section>

      {/* ═══ الحركة ٥ — العودة: the finale (resolve, holds) ═══ */}
      <section className="ln-finale" aria-label="ابدأ رحلتك">
        <div className="ln-finale-stage">
          <div className="ln-finale-ring" aria-hidden>
            <span className="ln-finale-ring-a" />
            <span className="ln-finale-ring-b" />
          </div>
          <p className="ln-mono ln-finale-eyebrow">الوصول</p>
          <h2 className="ln-finale-word">
            <KineticWords text="ابدأ" accent={[0]} trigger="view" />
          </h2>
          <p className="ln-finale-line">
            رحلتُك تبدأ بنقطة — واليوم، مدارٌ كاملٌ ينتظرك.
          </p>
          <div className="ln-finale-actions" data-thread-node>
            <Link to="/auth" className="ln-btn-gold xl">
              أنشئ حسابك الجامعي
              <Icon icon={ArrowLeft} size={16} />
            </Link>
            <a href="#colleges" className="ln-btn-ghost xl">استكشف الكلّيّات</a>
          </div>
          <p className="ln-finale-meta">
            <Icon icon={Sparkles} size={13} />
            وزارة التعليم العالي والبحث العلمي · جامعة الزاوية · {year}
          </p>
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
