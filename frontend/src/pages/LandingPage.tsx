import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Brain, GraduationCap, Network, Building2, Compass,
  BarChart3, ShieldCheck, ArrowLeft, Menu, X, BookOpen, Sparkles,
  Microscope, FlaskConical, Calendar, ClipboardCheck,
  Trophy, Check, ChevronDown,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { CollegesPopover } from '../components/CollegesPopover';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { LibyaFlag } from '../components/LibyaFlag';
import { RevealCssClass } from '../hooks/useReveal';
import { CountUp } from '../components/CountUp';
import { colleges } from '../data/colleges.config';
import { Parallax } from '../components/motion/Parallax';
import { Illustration } from '../components/Illustration';
import { SectionAccent } from '../components/motion/SectionAccent';
// D14 CSS split (13-17): landing.css is this page's own sheet; colleges.css
// rides here for the .landing-colleges-trigger + .colleges-popover surfaces
// (CollegesPopover below) and lands in the chunk shared with its other lazy
// consumers (CollegePages, CompetitionsPages, AdminExtraPages, CommunityPages,
// AdminGovernancePages).
import '../styles/landing.css';
import '../styles/colleges.css';

/**
 * University truth: UoZ operates 25 colleges (backend seed faculty table;
 * the zu.edu.ly structured list agrees — its prose header's "26" and older
 * docs' "29" are both wrong). The registry in data/colleges.config.ts is
 * the canonical machine source (25 entries since wave 6-c); the fallback
 * constant only applies if it is ever emptied. Both display sites consume
 * this single constant — never a hardcoded digit (audit 0-b P1-10).
 */
const COLLEGES_COUNT = colleges.length > 0 ? colleges.length : 25;

export default function LandingPage() {
  useThemeSync();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Authenticated visitors never see the landing page — redirect via the
  // declarative <Navigate> (navigate() during render is a React
  // anti-pattern: it fires side effects mid-render and warns in
  // StrictMode). The target is only COMPUTED here; the <Navigate> itself
  // is rendered after every hook below has run. Returning before the
  // hooks violated the rules of hooks (audit 11-f P1-4): it held only
  // while zustand rehydrated synchronously, and would crash the route
  // the moment the auth state flipped while mounted. App.tsx's
  // HomeRedirect already gates `/` for signed-in users, so this branch
  // is defense-in-depth (direct mounts, in-session login flips).
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

  // Returning-visitor calm (FR-029, SC-010). The first homepage visit
  // of a session MARKS the sessionStorage flag but keeps playing the
  // full intro — the calm (data-intro-seen="true" on the landing root)
  // applies from the NEXT in-session visit onward, exactly as the CSS
  // contract describes. (8-a: the old effect also flipped the state
  // immediately, which calmed the very first visit too — every visit
  // got the short fade and the theatrical first-visit reveal never ran.)
  const [introSeen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem('madarek.intro.seen') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // redirectHome: don't burn the one "first visit" marker on a render
    // that immediately redirects an already-authenticated visitor.
    if (redirectHome || introSeen) return; // already marked by an earlier visit this session
    try {
      window.sessionStorage.setItem('madarek.intro.seen', '1');
    } catch {
      // sessionStorage may be blocked in private mode — that's fine.
    }
  }, [redirectHome, introSeen]);

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

  // Magnetic glow follow on feature cards
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('.landing-feature-card, .landing-bento-card');
    const onMove = (e: MouseEvent) => {
      const t = e.currentTarget as HTMLElement;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`);
      t.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    cards.forEach((c) => c.addEventListener('mousemove', onMove));
    return () => cards.forEach((c) => c.removeEventListener('mousemove', onMove));
  }, []);

  // Hero spotlight — radial glow follows the cursor across the entire hero
  // section. Notion-style ambient depth: clean, not flashy. Disabled on
  // touch devices and for reduced-motion users.
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (reduced || isTouch) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty('--hero-mx', `${x}%`);
        el.style.setProperty('--hero-my', `${y}%`);
      });
    };
    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Hero ambient motion pause — once the hero scrolls fully out of view we
  // tag it with .is-past so the CSS track can pause its ambient animations
  // (spotlight drift, float loops). Small IntersectionObserver, zero cost
  // while the hero is on screen.
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        el.classList.toggle('is-past', !entry.isIntersecting);
      }
    }, { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mockup parallax — exposes a scroll progress var on the mockup itself,
  // ranging roughly -1 (mockup well below viewport) … +1 (above). CSS
  // multiplies it for a gentle rise + scale-out as the user scrolls.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const mockup = document.querySelector<HTMLElement>('.landing-mockup');
    if (!mockup) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = mockup.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when the mockup top sits at viewport top; goes negative as it scrolls up.
        const offset = Math.max(-1, Math.min(1, (r.top - vh / 2) / vh));
        mockup.style.setProperty('--parallax', String(offset));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Rules-of-hooks-safe redirect (see redirectHome above): every hook has
  // already run unconditionally, so the auth state flipping while mounted
  // no longer changes the hook count — it just swaps the landing tree for
  // <Navigate>.
  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  return (
    <div className="landing" data-intro-seen={introSeen ? 'true' : undefined}>

      {/* Top scroll-progress bar */}
      <div className="landing-progress" aria-hidden>
        <div className="landing-progress-bar" style={{ ['--p' as string]: scrollPct }} />
      </div>

      {/* Ministry strip */}
      <div className="ministry-strip">
        <div className="ministry-strip-inner">
          <span className="ministry-strip-emblem"><LibyaFlag size={14} /></span>
          <span>دولة ليبيا · <strong>وزارة التعليم العالي والبحث العلمي</strong> · جامعة الزاوية</span>
        </div>
      </div>

      {/* Header — Notion-style sticky glass */}
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
                // close when focus leaves the trigger + panel as a whole
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
                <a href="#flipped" className="landing-megamenu-item">
                  <span className="sticker sm peach"><Icon icon={GraduationCap} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">الفصل المعكوس</span>
                    <span className="landing-megamenu-item-desc">محاضرات مسجَّلة بنقاط فحص ذكية</span>
                  </span>
                </a>
                <a href="#matrix" className="landing-megamenu-item">
                  <span className="sticker sm lavender"><Icon icon={Compass} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">المصفوفة التعليمية</span>
                    <span className="landing-megamenu-item-desc">مسارات تتكيَّف مع تقدُّمك</span>
                  </span>
                </a>
                <a href="#research" className="landing-megamenu-item">
                  <span className="sticker sm mint"><Icon icon={Microscope} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">البحوث والمكتبة</span>
                    <span className="landing-megamenu-item-desc">فحص نزاهة + مراجعة معلَّمة</span>
                  </span>
                </a>
                <a href="#ai" className="landing-megamenu-item">
                  <span className="sticker sm sky"><Icon icon={Brain} size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">المساعد الأكاديمي</span>
                    <span className="landing-megamenu-item-desc"><bdi>«Oasis»</bdi> — رفيق دراسي ذكي</span>
                  </span>
                </a>
              </div>
            </div>
            <a href="#roles" className="landing-nav-link">الأدوار</a>
            <a href="#proof" className="landing-nav-link">النتائج</a>
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
            <a href="#features" className="btn ghost">المميزات</a>
            <a href="#roles" className="btn ghost">الأدوار</a>
            <a href="#proof" className="btn ghost">النتائج</a>
            <Link to="/auth" className="btn primary full">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </nav>
        )}
      </header>

      <main>
      {/* HERO — huge centered title + mockup */}
      <section ref={heroRef} className="marketing-container landing-hero">
        <RevealCssClass as="div" className="landing-hero-scene">
          <Illustration name="homepage-hero" decorative />
        </RevealCssClass>
        <RevealCssClass as="span" className="landing-hero-eyebrow">
          <strong>جديد</strong>
          المساعد الأكاديمي «Oasis» متاح الآن
          <Icon icon={ArrowLeft} size={12} />
        </RevealCssClass>
        <RevealCssClass as="h1" className="landing-title" delay={1}>
          <span className="word">منصّة</span>{' '}
          <span className="word"><em>التعليم</em></span>{' '}
          <span className="word">الذكيّ</span>
          <br />
          <span className="word">لجامعة</span>{' '}
          <span className="word landing-title-highlight">الزّاوية</span>
        </RevealCssClass>
        <RevealCssClass as="p" className="landing-subtitle" delay={2}>
          مساحة عمل أكاديمية واحدة تُمكّن الطالب والأستاذ والإدارة وضمان الجودة
          من إدارة المحاضرات، البحوث، الامتحانات والتقييم — بهدوء وسهولة.
        </RevealCssClass>
        <RevealCssClass as="div" className="landing-cta-row" delay={3}>
          <Link to="/auth" className="btn primary xl">
            ابدأ مجاناً الآن
            <Icon icon={ArrowLeft} size={16} />
          </Link>
          <a href="#features" className="btn outline xl">شاهد كيف تعمل</a>
          <button
            type="button"
            className="btn ghost xl landing-colleges-trigger"
            onClick={() => setCollegesOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={collegesOpen}
          >
            <Icon icon={GraduationCap} size={16} />
            <span>تصفّح الكلّيّات</span>
            <span className="landing-colleges-trigger-badge">{COLLEGES_COUNT}</span>
          </button>
        </RevealCssClass>
        <RevealCssClass as="div" className="landing-cta-meta" delay={4}>
          <span className="landing-inline-cluster">
            <Icon icon={Check} size={14} /> بدون بطاقة ائتمان
          </span>
          <span className="landing-cta-meta-dot" />
          <span className="landing-inline-cluster">
            <Icon icon={Check} size={14} /> دعم RTL كامل
          </span>
          <span className="landing-cta-meta-dot" />
          <span className="landing-inline-cluster">
            <Icon icon={Check} size={14} /> اعتماد رسميّ
          </span>
        </RevealCssClass>

        {/* mockup */}
        <RevealCssClass as="div" className="landing-mockup" delay={5}>
          <div className="landing-mockup-frame">
            <div className="landing-mockup-chrome">
              <span className="landing-mockup-dot" />
              <span className="landing-mockup-dot" />
              <span className="landing-mockup-dot" />
            </div>
            <div className="landing-mockup-body">
              <aside className="landing-mockup-side">
                <div className="landing-mockup-side-row on" />
                <div className="landing-mockup-side-row" />
                <div className="landing-mockup-side-row" />
                <div className="landing-mockup-side-row" />
                <div className="landing-mockup-side-row" style={{ width: '70%' }} />
                <div className="landing-mockup-side-row" />
              </aside>
              <div className="landing-mockup-main">
                <div className="landing-mockup-title">مساء النور، أحمد</div>
                <div className="landing-mockup-kpis">
                  <div className="landing-mockup-kpi">
                    <div className="landing-mockup-kpi-label">معدّلك</div>
                    <div className="landing-mockup-kpi-value">3.74</div>
                  </div>
                  <div className="landing-mockup-kpi">
                    <div className="landing-mockup-kpi-label">حضور</div>
                    <div className="landing-mockup-kpi-value">92%</div>
                  </div>
                  <div className="landing-mockup-kpi">
                    <div className="landing-mockup-kpi-label">مهام</div>
                    <div className="landing-mockup-kpi-value">3</div>
                  </div>
                </div>
                <div className="landing-mockup-chart" aria-hidden>
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                  <span className="landing-mockup-bar" />
                </div>
              </div>
            </div>
          </div>

          <div className="landing-mockup-badge landing-mockup-badge-1">
            <span className="sticker sm mint"><Icon icon={ClipboardCheck} size={18} /></span>
            <span className="landing-mockup-badge-text">
              <span className="landing-mockup-badge-title">+12 طالباً</span>
              <span className="landing-mockup-badge-sub">سلَّم الواجب اليوم</span>
            </span>
          </div>
          <div className="landing-mockup-badge landing-mockup-badge-2">
            <span className="sticker sm lavender"><Icon icon={Brain} size={18} /></span>
            <span className="landing-mockup-badge-text">
              <span className="landing-mockup-badge-title">Oasis</span>
              <span className="landing-mockup-badge-sub">يحضِّر ملخَّص الفصل…</span>
            </span>
          </div>
        </RevealCssClass>
      </section>

      {/* Logo strip */}
      <section className="marketing-container landing-logos" aria-label="الشركاء الأكاديميون">
        <div className="landing-logos-eyebrow">معتمدة من</div>
        <div className="landing-logos-grid">
          <div className="landing-logo">جامعة الزاوية</div>
          <div className="landing-logo">وزارة التعليم العالي</div>
          <div className="landing-logo">قطاع ضمان الجودة</div>
          <div className="landing-logo">مكتب البحوث</div>
          <div className="landing-logo">مركز التعليم الذكي</div>
          <div className="landing-logo">عمادة الطلاب</div>
        </div>
      </section>

      {/* University facts — straight from zu.edu.ly */}
      <section className="marketing-container">
        <div className="landing-pilot-grid">
          <RevealCssClass as="div" className="landing-pilot-stat">
            <div className="landing-pilot-value"><CountUp value={String(COLLEGES_COUNT)} /></div>
            <div className="landing-pilot-label">كلّيّة أكاديميّة</div>
            <div className="landing-pilot-note">حسب الموقع الرسميّ للجامعة</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="landing-pilot-stat" delay={1}>
            <div className="landing-pilot-value"><CountUp value="4" /></div>
            <div className="landing-pilot-label">مدن وفروع</div>
            <div className="landing-pilot-note">الزاوية، العجيلات، زوارة وأخرى</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="landing-pilot-stat" delay={2}>
            <div className="landing-pilot-value">1988</div>
            <div className="landing-pilot-label">عام التأسيس</div>
            <div className="landing-pilot-note">بقرار رقم 135</div>
          </RevealCssClass>
          <RevealCssClass as="div" className="landing-pilot-stat" delay={3}>
            <div className="landing-pilot-value"><CountUp value="3" /></div>
            <div className="landing-pilot-label">عضويّات دوليّة</div>
            <div className="landing-pilot-note">عربيّة، أفريقيّة، إسلاميّة</div>
          </RevealCssClass>
        </div>
      </section>

      {/* Campus showcase — optimized hero (WebP/JPEG) with parallax + interactive overlay */}
      <section id="campus" className="marketing-container landing-campus" aria-label="جامعة الزاوية">
        <RevealCssClass as="figure" className="landing-campus-frame">
          <Parallax amount={6} direction="up">
            {/* Optimized hero art: WebP first (99KB vs 2MB PNG), JPEG fallback
                for ancient browsers. width/height pin the 1377×768 aspect
                ratio so the browser reserves layout space (no CLS). The
                responsive srcSet serves a 750w WebP (~43KB) to phones via
                `sizes` — the frame spans the marketing container minus its
                gutters (20px mobile / 48px desktop, 1200px container cap). */}
            <picture>
              <source
                type="image/webp"
                srcSet="/main_photo-750.webp 750w, /main_photo.webp 1377w"
              />
              <img
                src="/main_photo.jpg"
                alt="جامعة الزاوية — المدخل الرئيسي"
                className="landing-campus-photo"
                width={1377}
                height={768}
                sizes="(max-width: 920px) calc(100vw - 40px), (max-width: 1296px) calc(100vw - 96px), 1104px"
                loading="lazy"
                decoding="async"
              />
            </picture>
          </Parallax>
          <span className="landing-campus-vignette" aria-hidden />
          <span className="landing-campus-grain" aria-hidden />
          <figcaption className="landing-campus-caption">
            <span className="landing-campus-eyebrow">جامعة الزاوية</span>
            <span className="landing-campus-line">
              <em>منذ 1988</em> — مساحة أكاديميّة تنبض بالحياة، أصبحت رقميّة بالكامل
            </span>
          </figcaption>
        </RevealCssClass>
      </section>

      {/* FEATURES — sticker grid */}
      <section id="features" className="marketing-container landing-features">
        <SectionAccent kind="scene-paint" as="div" className="landing-section-head">
          <span className="landing-section-eyebrow">المنظومة</span>
          <h2 className="landing-section-title">
            كل ما يحتاجه <em>الجامعيّ</em> في مكان واحد
          </h2>
          <p className="landing-section-lede">
            أدوات أكاديمية متكاملة تربط الفصل الدراسي بالمحتوى الرقمي والتحليلات
            الذكية — بدون تشتيت ودون تعقيد.
          </p>
        </SectionAccent>

        <div className="landing-features-grid">
          <RevealCssClass as="article" id="matrix" className="landing-feature-card sticker-wiggle">
            <span className="sticker lg peach"><Icon icon={Compass} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">المصفوفة التعليمية</h3>
            <p className="landing-feature-desc">
              مسارات تعلُّم تتكيَّف مع مستوى تقدُّمك ونقاط قوَّتك، تكشف الفجوات وتربطها
              تلقائياً بالدقائق التي تشرحها.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={1}>
            <span className="sticker lg lavender"><Icon icon={Brain} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">المساعد الأكاديمي</h3>
            <p className="landing-feature-desc">
              «Oasis» — رفيق دراسي يفهم سياق دراستك. شروحات مخصَّصة، تلخيصات،
              واختبارات تفاعلية حسب أدائك الفعلي.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={2}>
            <span className="sticker lg sky"><Icon icon={BarChart3} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">تحليلات أكاديمية</h3>
            <p className="landing-feature-desc">
              لوحة دقيقة لتقدُّمك لحظة بلحظة — الدرجات، الحضور، المهام، والمؤشرات
              المؤسسية، بصياغة تخدم القرار.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={3}>
            <span className="sticker lg mint"><Icon icon={BookOpen} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">مكتبة وبحوث</h3>
            <p className="landing-feature-desc">
              فهرس بحثيّ وفحص للنزاهة العلمية (الانتحال + المحتوى المُولَّد آلياً)
              مع مراجعة معلَّمة من الأستاذ.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={4}>
            <span className="sticker lg yellow"><Icon icon={Network} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">منظومة موحَّدة</h3>
            <p className="landing-feature-desc">
              المحاضرات، الحضور، الدرجات، الامتحانات، البحوث، والمعامل الافتراضية —
              كلها في تجربة واحدة آمنة ومتجاوبة.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={5}>
            <span className="sticker lg rose"><Icon icon={ShieldCheck} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">جودة مؤسسية</h3>
            <p className="landing-feature-desc">
              مؤشرات لقطاع الجودة: تقييم الأساتذة، مراجعة الاختبارات، أداء المقررات،
              وتقارير شاملة بصياغة رسمية.
            </p>
          </RevealCssClass>
        </div>
      </section>

      {/* COLORED BAND 1 — peach: Flipped classroom */}
      <section id="flipped" className="band band-peach">
        <div className="marketing-container band-split">
          <RevealCssClass as="div">
            <span className="sticker xl peach"><Icon icon={GraduationCap} size={48} strokeWidth={1.6} /></span>
            <span className="band-eyebrow">الفصل المعكوس</span>
            <h2 className="band-title">
              محاضرات مسجَّلة <em>تتفاعل</em> مع الطالب
            </h2>
            <p className="band-lede">
              نقاط فحص مدمجة في كل محاضرة، حضور تلقائي عند الإكمال، وروابط مباشرة
              إلى المفاهيم في المصفوفة المعرفية. الطالب يبني فهمه بإيقاعه.
            </p>
            <div style={{ marginBlockStart: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/auth" className="btn primary lg">جرّب المحاضرة <Icon icon={ArrowLeft} size={14} /></Link>
            </div>
          </RevealCssClass>
          <RevealCssClass as="div" className="band-visual" delay={2}>
            <div className="band-visual-row">
              <span className="band-visual-checkbox on"><Icon icon={Check} size={12} strokeWidth={3} /></span>
              <span className="band-visual-text done">مقدمة في خوارزميات الفرز</span>
              <span className="band-visual-tag mint">مكتمل</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox on"><Icon icon={Check} size={12} strokeWidth={3} /></span>
              <span className="band-visual-text done">تعقيد الزمن و<bdi>O</bdi> الكبيرة</span>
              <span className="band-visual-tag mint">مكتمل</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text"><bdi>Quick Sort</bdi> — التقسيم الديناميكي</span>
              <span className="band-visual-tag peach">قيد المتابعة</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text"><bdi>Merge Sort</bdi> والتفكير العودي</span>
              <span className="band-visual-tag">قادم</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text">امتحان قصير — أسبوع 4</span>
              <span className="band-visual-tag sky">امتحان</span>
            </div>
          </RevealCssClass>
        </div>
      </section>

      {/* COLORED BAND 2 — lavender: AI assistant */}
      <section id="ai" className="band band-lavender">
        <div className="marketing-container band-split">
          <RevealCssClass as="div" className="band-visual">
            {/* Chat mockup — de-inlined to .landing-ai-* classes in
                landing.css (wave 9-a, 8-a follow-up); same visual result. */}
            <div className="landing-ai-head">
              <span className="sticker sm lavender"><Icon icon={Brain} size={20} /></span>
              <div className="landing-ai-head-body">
                <div className="landing-ai-name">Oasis</div>
                <div className="landing-ai-status">
                  <span className="landing-hero-eyebrow-dot" />
                  متَّصل الآن
                </div>
              </div>
            </div>
            <div className="landing-ai-bubble-user">
              ساعدني في فهم خوارزميات <bdi>«Quick Sort»</bdi> — لم أستوعبها في المحاضرة.
            </div>
            <div className="landing-ai-bubble-ai">
              فكرة <bdi>Quick Sort</bdi> بسيطة: نختار عنصراً <bdi>«pivot»</bdi>، ونفصل العناصر الأصغر
              إلى يمينه والأكبر إلى يساره، ثم نكرّر العملية على كل جانب. هل تريد
              مثالاً بصرياً؟
            </div>
            <div className="landing-ai-typing">
              <span className="typing-dots"><span /><span /><span /></span>
              <span className="landing-ai-typing-label"><bdi>Oasis</bdi> يكتب…</span>
            </div>
          </RevealCssClass>
          <RevealCssClass as="div" delay={2}>
            <span className="sticker xl lavender"><Icon icon={Sparkles} size={48} strokeWidth={1.6} /></span>
            <span className="band-eyebrow">المساعد الأكاديمي</span>
            <h2 className="band-title">
              <em><bdi>«Oasis»</bdi></em> — يفهم سياق دراستك
            </h2>
            <p className="band-lede">
              مساعد أكاديمي يعرف مقرَّراتك ومحاضراتك ودرجاتك. يقدِّم شروحات مخصَّصة،
              يلخِّص الفصول الطويلة، ويختبر معلوماتك بطرق تفاعلية.
            </p>
            <ul className="landing-ai-points">
              {[
                'شرح المفاهيم المعقدة بطرق مبسَّطة',
                'إنشاء اختبارات قصيرة لمراجعة المعلومات',
                'توجيه أكاديميّ يعتمد على أدائك الفعلي',
              ].map((b) => (
                <li key={b} className="landing-ai-point">
                  <span className="landing-ai-point-dot"><Icon icon={Check} size={12} strokeWidth={3} /></span>
                  {b}
                </li>
              ))}
            </ul>
          </RevealCssClass>
        </div>
      </section>

      {/* BENTO mosaic */}
      <section className="marketing-container landing-bento">
        <SectionAccent kind="scene-paint" as="div" className="landing-section-head">
          <span className="landing-section-eyebrow">منظومة كاملة</span>
          <h2 className="landing-section-title">
            من <em>المحاضرة</em> إلى <em>الشهادة</em>
          </h2>
        </SectionAccent>

        <div className="landing-bento-grid">
          <RevealCssClass as="div" id="research" className="landing-bento-card span-3 band-mint">
            <span className="sticker mint"><Icon icon={Microscope} size={28} /></span>
            <h3 className="landing-bento-title">البحوث والمكتبة</h3>
            <p className="landing-bento-desc">
              فهرس بحثيّ بفحص نزاهة علمية تلقائي (انتحال + AI) ومراجعة معلَّمة على
              الـPDF. آلاف الكتب الأكاديمية للاستعارة الفورية.
            </p>
          </RevealCssClass>
          <RevealCssClass as="div" className="landing-bento-card span-3 band-yellow" delay={1}>
            <span className="sticker yellow"><Icon icon={Calendar} size={28} /></span>
            <h3 className="landing-bento-title">الجدول الدراسي</h3>
            <p className="landing-bento-desc">
              جدول أسبوعيّ ذكيّ يجمع المحاضرات، التسليمات، الامتحانات، والاجتماعات —
              بمُذكِّرات تلقائية وروابط مباشرة لكل بند.
            </p>
          </RevealCssClass>
          <RevealCssClass as="div" className="landing-bento-card span-2 band-sky" delay={2}>
            <span className="sticker sky"><Icon icon={ClipboardCheck} size={28} /></span>
            <h3 className="landing-bento-title">الامتحانات الإلكترونية</h3>
            <p className="landing-bento-desc">
              MCQ · صح/خطأ · إجابة قصيرة · مقالة. تصحيح تلقائي للموضوعي.
            </p>
          </RevealCssClass>
          <RevealCssClass as="div" id="labs" className="landing-bento-card span-2 band-rose" delay={3}>
            <span className="sticker rose"><Icon icon={FlaskConical} size={28} /></span>
            <h3 className="landing-bento-title">المعامل الافتراضية</h3>
            <p className="landing-bento-desc">
              <bdi>Cisco Packet Tracer</bdi>، <bdi>Arduino Sim</bdi>، وتجارب <bdi>AR/VR</bdi> للتطبيق العملي.
            </p>
          </RevealCssClass>
          <RevealCssClass as="div" id="achievements" className="landing-bento-card span-2 band-copper" delay={4}>
            <span className="sticker copper"><Icon icon={Trophy} size={28} /></span>
            <h3 className="landing-bento-title">الإنجازات والشارات</h3>
            <p className="landing-bento-desc">
              نقاط، مستويات، شارات — لتشجيع الالتزام دون فرضه.
            </p>
          </RevealCssClass>
        </div>
      </section>

      {/* ROLE PILLARS */}
      <section id="roles" className="marketing-container landing-features">
        <SectionAccent kind="scene-paint" as="div" className="landing-section-head">
          <span className="landing-section-eyebrow">الأدوار</span>
          <h2 className="landing-section-title">
            أربعة <em>أدوار</em>، تجربة موحَّدة
          </h2>
          <p className="landing-section-lede">
            كلّ دور أكاديميّ يرى ما يخصّه فقط — صلاحيّات مدروسة وفصلٌ واضح بين الواجبات.
          </p>
        </SectionAccent>
        <div className="landing-features-grid">
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle">
            <span className="sticker lg copper"><Icon icon={GraduationCap} size={32} /></span>
            <h3 className="landing-feature-title">الطالب</h3>
            <p className="landing-feature-desc">
              مقرَّرات، مصفوفة معرفية، مساعد ذكي، إنجازات وشهادات،
              فرص عمل، ومكتبة بحوث.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={1}>
            <span className="sticker lg lavender"><Icon icon={Brain} size={32} /></span>
            <h3 className="landing-feature-title">الأستاذ</h3>
            <p className="landing-feature-desc">
              ذكاء أكاديميّ يكشف الطلَّاب المعرَّضين، إدارة المحاضرات والدرجات،
              ومعامل افتراضية بصلاحيات تحكُّم.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={2}>
            <span className="sticker lg sky"><Icon icon={Building2} size={32} /></span>
            <h3 className="landing-feature-title">الإدارة</h3>
            <p className="landing-feature-desc">
              إدارة الكليَّات والأساتذة والمقرَّرات، تقارير، ومزامنة يومية مع
              البيانات الرسمية لجامعة الزاوية.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={3}>
            <span className="sticker lg mint"><Icon icon={ShieldCheck} size={32} /></span>
            <h3 className="landing-feature-title">ضمان الجودة</h3>
            <p className="landing-feature-desc">
              رؤية للمؤشرات المؤسسية: جودة المقرَّرات، تقييم الأساتذة،
              مراجعة الاختبارات والمناهج.
            </p>
          </RevealCssClass>
        </div>
      </section>

      {/* PROOF — pilot results in colored band */}
      <section id="proof" className="band band-sand">
        <div className="marketing-container">
          <SectionAccent kind="scene-paint" as="div" className="landing-section-head">
            <span className="landing-section-eyebrow">دراسة ميدانية</span>
            <RevealCssClass as="div" className="landing-section-anchor" delay={1}>
              <Illustration name="milestone-section" decorative />
            </RevealCssClass>
            <h2 className="band-title">نتائج <em>تجربة فعلية</em></h2>
            <p className="band-lede">
              اعتمدنا استراتيجية الصفّ المعكوس على مادة اللغة الإنجليزية مع طلَّاب
              من جنوب ليبيا — هذه أرقام التجربة.
            </p>
          </SectionAccent>
          <div className="landing-pilot-grid">
            <RevealCssClass as="div" className="landing-pilot-stat">
              <div className="landing-pilot-value"><CountUp value="40" />%</div>
              <div className="landing-pilot-label">تحسُّن الاستيعاب</div>
              <div className="landing-pilot-note">مقارنة بالأسلوب التقليدي</div>
            </RevealCssClass>
            <RevealCssClass as="div" className="landing-pilot-stat" delay={1}>
              <div className="landing-pilot-value"><CountUp value="70" />%</div>
              <div className="landing-pilot-label">زيادة في المشاركة</div>
              <div className="landing-pilot-note">داخل الحلقات النقاشية</div>
            </RevealCssClass>
            <RevealCssClass as="div" className="landing-pilot-stat" delay={2}>
              <div className="landing-pilot-value"><CountUp value="30" />%</div>
              <div className="landing-pilot-label">تحسُّن في الالتزام</div>
              <div className="landing-pilot-note">بمتابعة الجلسات</div>
            </RevealCssClass>
            <RevealCssClass as="div" className="landing-pilot-stat" delay={3}>
              <div className="landing-pilot-value"><CountUp value="90" />%</div>
              <div className="landing-pilot-label">تحقيق أهداف التعلُّم</div>
              <div className="landing-pilot-note">ضمن الإطار الزمني</div>
            </RevealCssClass>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR — role-based, not fabricated quotes */}
      <section className="marketing-container landing-features">
        <SectionAccent kind="scene-paint" as="div" className="landing-section-head">
          <span className="landing-section-eyebrow">لمن صُمِّمت</span>
          <h2 className="landing-section-title">
            أداة كلّ <em>دور</em> أكاديميّ في الجامعة
          </h2>
        </SectionAccent>
        <div className="landing-testimonials">
          {[
            {
              q: 'محاضرات منظَّمة، حضور وغياب آليّ، تحليل لفجواتك المعرفيّة، ومسارات تعلّم تتكيّف مع مستواك.',
              role: 'الطالب', sub: 'مساحة دراسة شخصيّة موحَّدة',
            },
            {
              q: 'تسجيل الحضور بنقرات، تتبّع الدرجات لكلّ مقرّر، ذكاء أكاديميّ يكشف الطلّاب الذين يحتاجون متابعة.',
              role: 'عضو هيئة التدريس', sub: 'لوحة تدريس مدمجة',
            },
            {
              q: 'لوحات حيّة على مستوى الجامعة، إدارة الصلاحيّات والأدوار، مزامنة بيانات الكلّيّات في مكان واحد.',
              role: 'الإدارة وضمان الجودة', sub: 'حوكمة وإشراف دقيق',
            },
          ].map((t, i) => (
            <RevealCssClass as="figure" className="testimonial-card" key={t.role} delay={(i + 1) as 1 | 2 | 3}>
              <blockquote className="testimonial-quote">{t.q}</blockquote>
              <figcaption className="testimonial-author">
                <span className="testimonial-author-meta">
                  <span className="testimonial-name">{t.role}</span>
                  <span className="testimonial-role">{t.sub}</span>
                </span>
              </figcaption>
            </RevealCssClass>
          ))}
        </div>
      </section>

      {/* FINAL CTA — dark band */}
      <section className="band band-dark">
        <div className="marketing-container landing-final-cta">
          <div className="landing-final-cta-eyebrow">
            <span className="landing-final-cta-dot" />
            ابدأ الآن
          </div>
          <h2 className="landing-final-cta-title">
            منصّتك الأكاديميّة <em>بانتظارك</em>
          </h2>
          <p className="landing-final-cta-lede">
            سجِّل دخولك ببريدك الجامعيّ أو رقم قيدك للوصول إلى مقرَّراتك ومتابعة تقدُّمك الأكاديمي.
          </p>
          <div className="landing-final-cta-actions">
            <Link to="/auth" className="landing-final-cta-btn">
              تسجيل الدخول
              <Icon icon={ArrowLeft} size={16} />
            </Link>
            <a href="#features" className="landing-final-cta-btn ghost">اكتشف المنصة</a>
          </div>
          <div className="landing-final-cta-meta">
            وزارة التعليم العالي والبحث العلمي · جامعة الزاوية · {year}
          </div>
        </div>
      </section>

      </main>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="marketing-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-col">
              <Link to="/" className="landing-brand">
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
              <div className="landing-footer-heading">المنصّة</div>
              <a href="#features" className="landing-footer-link">المميزات</a>
              <a href="#roles" className="landing-footer-link">الأدوار</a>
              <a href="#proof" className="landing-footer-link">النتائج</a>
              <a href="#flipped" className="landing-footer-link">الفصل المعكوس</a>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">الموارد</div>
              <a href="#ai" className="landing-footer-link">المساعد الذكي</a>
              <a href="#research" className="landing-footer-link">المكتبة</a>
              <a href="#labs" className="landing-footer-link">المعامل</a>
              <a href="#achievements" className="landing-footer-link">الإنجازات</a>
            </div>
            <div className="landing-footer-col">
              <div className="landing-footer-heading">المؤسسة</div>
              <a href="#campus" className="landing-footer-link">جامعة الزاوية</a>
              <Link to="/colleges" className="landing-footer-link">الكليّات</Link>
              <a href="#features" className="landing-footer-link">عن المنصّة</a>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© {year} مدارك · جامعة الزاوية</span>
            <span className="landing-inline-cluster">
              <LibyaFlag size={14} /> صُنع في ليبيا
            </span>
          </div>
        </div>
      </footer>
      <CollegesPopover open={collegesOpen} onClose={() => setCollegesOpen(false)} />
    </div>
  );
}
