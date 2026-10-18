import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Brain, GraduationCap, Building2, Compass, ShieldCheck, ArrowLeft,
  Menu, X, PlayCircle, Route as RouteIcon, ClipboardCheck, Medal,
  Keyboard, MoonStar, Check, Crown, Landmark, FlaskConical,
  Library, MessagesSquare, CalendarDays, BadgeCheck, Cog,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { ThemeToggle, useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { LibyaFlag } from '../components/LibyaFlag';
import { RevealCssClass } from '../hooks/useReveal';
// landing.css is this page's own sheet — «دفتر مدارك», the r188 editorial
// world: a two-theme paper/ink surface grounded on the canonical tokens
// (--bg/--text/--rule/--accent), hairline structure, folio numerals and
// manuscript figures. It replaces the r172a Orbit-Ink sheet wholesale;
// the retired Orbit-Ink scene tokens stay defined in tokens.css
// (parity pins) but this page no longer consumes them.
import '../styles/landing.css';

/**
 * Landing — «دفتر مدارك» (The Madarek Folio), r188.
 *
 * A complete editorial redesign of the public surface: the product
 * speaks as an independent Arabic-first platform in a paper-and-ink
 * ledger composition (masthead hero, folio-numbered chapters, hairline
 * rules, manuscript figures) — no canvas scene, no marquee, no campus
 * photography, no university identity story.
 *
 * Sections:
 *   الترويسة (masthead header) → النقطة (hero) → شريط القدرات
 *   → ٠١ كيف تعمل (five stations) → ٠٢ الأدوار الخمسة
 *   → ٠٣ ما يُشحن اليوم (honest feature ledger)
 *   → ٠٤ الاستقلالية (independence manifesto) → الخاتمة (CTA)
 *   → التذييل (colophon footer).
 *
 * Brand truth (r188): Madarek is an independent platform. The only
 * sample data story is the explicitly-synthetic demonstration
 * institution — «جامعة مدارك التجريبية» — referenced as data, never
 * as identity, and only inside the manifesto chapter with a link to
 * the demo academic structure.
 */

/** Journey stations — the «how learning works» chapter (r168b-vetted copy). */
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
    // r168b honesty — the local composer explains concepts, surfaces
    // mastery gaps and builds review plans; chapter summaries and quiz
    // generation arrive with a real provider (chip-gated in /ai). The
    // card claims only what ships today — status restated in §٠٣.
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
    desc: 'نقاط ومستويات وشارات تشجّع الالتزام، وشهادات إتمام تُضاف إلى ملفّك الأكاديمي تلقائيًا.',
    tag: 'إنجاز',
  },
];

/** The five roles — one index row each (r188: the OWNER row joins the
 *  public story; the platform explains itself completely). */
const ROLES: Array<{
  icon: typeof GraduationCap; tone: string; name: string; desc: string; caps: string;
}> = [
  {
    icon: GraduationCap, tone: 'gold', name: 'الطالب',
    desc: 'رحلة تعلُّم شخصية: مقرَّراتك، تقدُّمك، فجواتك، وإنجازاتك في مكان واحد.',
    caps: 'المصفوفة المعرفية · محاضرات ونقاط فحص · اختبارات ونتائج · مكتبة وبحوث · فرص عمل',
  },
  {
    icon: Brain, tone: 'azure', name: 'الأستاذ',
    desc: 'أدوات التدريس والقياس: بناء المحتوى، متابعة الطلاب، وتصحيح الأداء.',
    caps: 'إنشاء المحاضرات والاختبارات · درجات وحضور · مراجعة البحوث · ذكاء أكاديمي للتعثّر',
  },
  {
    icon: Building2, tone: 'mist', name: 'الإدارة',
    desc: 'الهيكل الأكاديمي والمستخدمون والتقارير على مستوى المؤسّسة.',
    caps: 'الكليات والأقسام والمقرَّرات · المستخدمون والصلاحيات · تقارير حيّة · مزامنة البيانات',
  },
  {
    icon: ShieldCheck, tone: 'gold', name: 'ضمان الجودة',
    desc: 'رؤية قياس فقط: مؤشّرات، مراجعات، وجودة قابلة للتتبّع.',
    caps: 'مؤشّرات المقرَّرات والأساتذة · مراجعة الاختبارات والمناهج · قراءة بلا تعديل',
  },
  {
    icon: Crown, tone: 'azure', name: 'مالك المنصّة',
    desc: 'مركز تحكّم شامل للمنصّة كلها — بلا عضوية مؤسسية.',
    caps: 'المؤسّسات والحاكمية · المستخدمون والأدوار · صحّة النظام وسجلّ التدقيق · تنبيهات تشغيلية',
  },
];

/** r188 truth ledger — every row states its REAL operational status
 *  (docs/02-features + docs/16 vocabulary: يعمل / محلي / محاكاة / قادم).
 *  This is the landing's credibility core: no invented numbers, no
 *  fabricated adoption — what ships, ships labeled. */
const LEDGER: Array<{ status: LedgerStatus; item: string }> = [
  { status: 'live', item: 'المحاضرات التفاعلية بنقاط الفحص والحضور الآلي' },
  { status: 'live', item: 'الاختبارات (اختيار متعدد · صح/خطأ · إجابة قصيرة · مقالة) بتصحيح تلقائي للموضوعي' },
  { status: 'live', item: 'المصفوفة المعرفية وتتبّع الإتقان لكل مقرّر' },
  { status: 'live', item: 'مكتبة البحوث: رفع PDF ببوابات ملكية ومراجعة معلَّمة للأستاذ' },
  { status: 'live', item: 'الرسائل المباشرة والإشعارات داخل المنصّة' },
  { status: 'live', item: 'الجدول الأسبوعي ومذكّرات التسليمات والاختبارات' },
  { status: 'local', item: 'المساعد الأكاديمي «Oasis» — تركيب محلي للمعرفة (بلا نموذج لغوي خارجي بعد)' },
  { status: 'sim', item: 'فحص نزاهة البحوث (انتحال/ذكاء توليدي) — نتائج تجريبية معلَنة حتى تفعيل كشف حقيقي' },
  { status: 'sim', item: 'مزامنة بيانات المؤسّسة من مصادر عامة — وضع عرض محدود' },
  { status: 'soon', item: 'المعامل الافتراضية وتجارب AR/VR — فهرس بلا تشغيل بعد' },
];

type LedgerStatus = 'live' | 'local' | 'sim' | 'soon';
const LEDGER_STATUS: Record<LedgerStatus, { label: string; cls: string }> = {
  live: { label: 'يعمل', cls: 'is-live' },
  local: { label: 'محلي', cls: 'is-local' },
  sim: { label: 'محاكاة', cls: 'is-sim' },
  soon: { label: 'قادم', cls: 'is-soon' },
};

/** The hero figure's module index — the platform's own table of
 *  contents (real modules, folio-numbered). */
const FIGURE_TOC: Array<{ icon: typeof PlayCircle; label: string }> = [
  { icon: PlayCircle, label: 'المحاضرات التفاعلية' },
  { icon: RouteIcon, label: 'المصفوفة المعرفية' },
  { icon: ClipboardCheck, label: 'الاختبارات والدرجات' },
  { icon: Library, label: 'المكتبة والبحوث' },
  { icon: MessagesSquare, label: 'الرسائل والإشعارات' },
  { icon: CalendarDays, label: 'الجدول الأسبوعي' },
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

  const [menuOpen, setMenuOpen] = useState(false);
  // F2-5 (r157): mobile-menu contract — Escape closes + refocuses the
  // burger (its aria-label flips with the state).
  const burgerRef = useRef<HTMLButtonElement>(null);
  // Scroll chrome on refs, written imperatively — no React re-render
  // per scroll event (the r172 pattern, kept).
  const headerRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Returning-visitor calm: first session visit plays the full intro;
  // later visits this session skip straight to the calm state.
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
   * the hero (prod only — dev has no chunk splitting to warm). */
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

  // Scroll-driven chrome with ZERO setState: coalesced to one rAF per
  // frame, written straight to the DOM (the .scrolled class on the
  // header and the --p var on the top ribbon).
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

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  return (
    <div className="landing" data-intro-seen={introSeen ? 'true' : undefined}>

      {/* P3-24: skip-to-content — first Tab stop, hidden until focused. */}
      <a href="#main" className="fo-skip-link">تخطَّ إلى المحتوى</a>

      {/* Top scroll-progress bar — driven imperatively via --p */}
      <div className="fo-progress" aria-hidden>
        <div className="fo-progress-bar" ref={progressBarRef} style={{ ['--p' as string]: 0 }} />
      </div>

      {/* r177 identity strip: the platform's own provenance —
          independent, made in Libya. No ministry, no university. */}
      <div className="fo-identity-strip" role="region" aria-label="هويّة المنصّة">
        <div className="fo-identity-strip-inner">
          <span className="fo-identity-strip-flag"><LibyaFlag size={14} /></span>
          <span>صُنعت في ليبيا · <strong>منصّة تعليم ذكي مستقلّة</strong></span>
        </div>
      </div>

      {/* ── Masthead header — the .scrolled state class is imperative ── */}
      <header className="fo-header" ref={headerRef}>
        <div className="fo-header-inner">
          <Link to="/" className="fo-brand" aria-label="مدارك — الصفحة الرئيسية">
            {/* the khatam-star mark — same geometry as the favicon,
                ink-stroked so it themes with the page */}
            <svg className="fo-brand-mark" viewBox="0 0 64 64" aria-hidden focusable="false">
              <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" />
              <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" transform="rotate(45 32 32)" />
              <rect x="27" y="27" width="10" height="10" fill="var(--accent)" transform="rotate(45 32 32)" />
              <circle cx="47" cy="17" r="5" fill="var(--gold)" />
            </svg>
            <span className="fo-brand-text">
              <span className="fo-brand-name">مدارك</span>
              <span className="fo-brand-sub">منصّة التعليم الذكي</span>
            </span>
          </Link>

          <nav className="fo-nav" aria-label="التنقل الرئيسي">
            <a href="#journey" className="fo-nav-link">كيف تعمل</a>
            <a href="#roles" className="fo-nav-link">الأدوار</a>
            <a href="#ledger" className="fo-nav-link">ما يُشحن اليوم</a>
            <a href="#independence" className="fo-nav-link">الاستقلالية</a>
          </nav>

          <div className="fo-header-actions">
            {/* r172a: the REAL theme control — the shared ThemeToggle the
                product shell mounts (فاتح · داكن · تلقائي). ≤640px the pill
                yields to the labeled mobile-menu row below. */}
            <ThemeToggle />
            {/* r164b funnel split: login keeps /auth, the primary START
                verb carries the visitor to /auth/register. */}
            <Link to="/auth" className="btn ghost sm">تسجيل الدخول</Link>
            <Link to="/auth/register" className="btn primary sm">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </div>

          <button
            type="button"
            className="fo-burger"
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
            className="fo-mobile-menu"
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
            <a href="#journey" className="btn ghost">كيف تعمل</a>
            <a href="#roles" className="btn ghost">الأدوار</a>
            <a href="#ledger" className="btn ghost">ما يُشحن اليوم</a>
            <a href="#independence" className="btn ghost">الاستقلالية</a>
            {/* r172a: labeled theme row — the ≤640px home of the theme
                control. stopPropagation: flipping the theme must not
                close the menu. */}
            <div
              className="fo-mobile-theme"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="fo-mobile-theme-label">المظهر</span>
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

        {/* ═══ النقطة — the masthead hero ═══ */}
        <section className="fo-hero" aria-label="مدارك — منصّة التعليم الذكي">
          <div className="fo-hero-grid">
            <div className="fo-hero-copy">
              <RevealCssClass as="p" className="fo-eyebrow">
                منصّة تعليم ذكي · عربية أولًا · صُنعت في ليبيا
              </RevealCssClass>

              <h1 className="fo-hero-title">
                <RevealCssClass as="span" className="fo-hero-line">
                  كلُّ معرفةٍ تبدأ <em className="fo-dot">نقطة</em>،
                </RevealCssClass>
                <RevealCssClass as="span" className="fo-hero-line" delay={1}>
                  وتنمو في <em className="fo-orbit">مدارك</em>.
                </RevealCssClass>
              </h1>

              <RevealCssClass as="p" className="fo-hero-sub" delay={2}>
                مدارك منصّة تعليم مستقلّة تجمع المحاضرات التفاعلية والمصفوفة
                المعرفية والاختبارات والبحوث والرسائل في تجربة عربية واحدة —
                لخمسة أدوار أكاديمية، من الطالب إلى مالك المنصّة.
              </RevealCssClass>

              <RevealCssClass as="div" className="fo-hero-actions" delay={3}>
                {/* r164b: the ONE primary of this viewport carries the
                    funnel's promise literally — starting the journey =
                    the register form. */}
                <Link to="/auth/register" className="btn accent lg fo-hero-cta">
                  أنشئ حسابك الجامعي
                  <Icon icon={ArrowLeft} size={16} />
                </Link>
                <Link to="/auth" className="btn ghost lg">تسجيل الدخول</Link>
              </RevealCssClass>

              <RevealCssClass as="ul" className="fo-hero-meta" delay={4}>
                <li><Icon icon={Check} size={13} /> بريدك الجامعي أو رقم قيدك</li>
                <li aria-hidden className="fo-hero-meta-dot" />
                <li><Icon icon={Keyboard} size={13} /> يعمل بلوحة المفاتيح</li>
                <li aria-hidden className="fo-hero-meta-dot" />
                <li><Icon icon={MoonStar} size={13} /> وضع فاتح وداكن</li>
              </RevealCssClass>
            </div>

            {/* the manuscript figure — «الشكل ٠١» plate with the platform
                TOC. A static, print-inspired composition: hairline frame,
                the khatam star, ruled contents. */}
            <RevealCssClass as="figure" className="fo-hero-figure" delay={2} aria-hidden>
              <div className="fo-figure-plate">
                <svg className="fo-figure-star" viewBox="0 0 200 200" focusable="false">
                  {/* hairline orbit circles */}
                  <circle cx="100" cy="100" r="92" fill="none" stroke="var(--rule)" strokeWidth="1" />
                  <circle cx="100" cy="100" r="70" fill="none" stroke="var(--border-faint)" strokeWidth="1" />
                  {/* crosshair rules */}
                  <line x1="100" y1="0" x2="100" y2="14" stroke="var(--rule)" strokeWidth="1" />
                  <line x1="100" y1="186" x2="100" y2="200" stroke="var(--rule)" strokeWidth="1" />
                  <line x1="0" y1="100" x2="14" y2="100" stroke="var(--rule)" strokeWidth="1" />
                  <line x1="186" y1="100" x2="200" y2="100" stroke="var(--rule)" strokeWidth="1" />
                  {/* the khatam star — two rotated squares */}
                  <rect x="45" y="45" width="110" height="110" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="round" />
                  <rect x="45" y="45" width="110" height="110" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="round" transform="rotate(45 100 100)" />
                  {/* solid core diamond */}
                  <rect x="80" y="80" width="40" height="40" fill="var(--accent)" transform="rotate(45 100 100)" />
                  {/* نقطة — the point of light at the NE tip */}
                  <circle cx="141" cy="59" r="9" fill="var(--gold)" />
                  <circle cx="141" cy="59" r="16" fill="var(--gold)" opacity="0.18" />
                </svg>
                <figcaption className="fo-figure-caption">
                  <span className="fo-mono">الشكل ٠١</span>
                  <span>نجمة مدارك — ثمانية رؤوس لأمدار المعرفة</span>
                </figcaption>
              </div>
              <ul className="fo-figure-toc">
                {FIGURE_TOC.map((entry, i) => (
                  <li key={entry.label}>
                    <span className="fo-mono">{String(i + 1).padStart(2, '0')}</span>
                    <Icon icon={entry.icon} size={14} />
                    <span>{entry.label}</span>
                  </li>
                ))}
              </ul>
            </RevealCssClass>
          </div>
        </section>

        {/* ═══ شريط القدرات — a quiet ruled band (static, a11y-safe —
            the animated marquee retired with r188) ═══ */}
        <section className="fo-capabilities" aria-label="قدرات المنصّة">
          <ul className="fo-capabilities-list">
            {[
              'محاضرات بنقاط فحص',
              'مصفوفة إتقان متكيّفة',
              'تصحيح تلقائي للموضوعي',
              'مراجعة بحوث معلَّمة',
              'رسائل مباشرة',
              'جدول ومذكّرات',
              'لوحات لخمسة أدوار',
            ].map((cap) => (
              <li key={cap}>
                <span className="fo-capabilities-sep" aria-hidden>✳</span>
                {cap}
              </li>
            ))}
          </ul>
        </section>

        {/* ═══ ٠١ — كيف تعمل المنصّة ═══ */}
        <section id="journey" className="fo-chapter" aria-labelledby="journey-title">
          <header className="fo-chapter-head">
            <span className="fo-label"><span className="fo-mono">٠١</span> — كيف تعمل</span>
            <RevealCssClass as="h2" className="fo-chapter-title" delay={1} id="journey-title">
              من أوّل درس إلى <em>الإتقان</em> — خمس محطات
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-chapter-lede" delay={2}>
              كل محطة تبني على ما قبلها — خطٌّ واحد يربط رحلة التعلّم
              داخل المنصّة من أوّل محاضرة حتى شهادة الإتمام.
            </RevealCssClass>
          </header>

          <ol className="fo-stations">
            {JOURNEY.map((s, i) => (
              <RevealCssClass
                as="li"
                key={s.n}
                className="fo-station"
                delay={((i % 3) + 1) as 1 | 2 | 3}
              >
                <span className="fo-station-rail" aria-hidden>
                  <span className="fo-mono fo-station-n">{s.n}</span>
                </span>
                <article className="fo-station-body">
                  <header className="fo-station-head">
                    <span className={`fo-station-ico tone-${i % 3 === 0 ? 'gold' : i % 3 === 1 ? 'azure' : 'mist'}`}>
                      <Icon icon={s.icon} size={20} />
                    </span>
                    <h3 className="fo-station-title">{s.title}</h3>
                    <span className="fo-station-tag">{s.tag}</span>
                  </header>
                  <p className="fo-station-desc">{s.desc}</p>
                </article>
              </RevealCssClass>
            ))}
          </ol>
        </section>

        {/* ═══ ٠٢ — الأدوار الخمسة ═══ */}
        <section id="roles" className="fo-chapter" aria-labelledby="roles-title">
          <header className="fo-chapter-head">
            <span className="fo-label"><span className="fo-mono">٠٢</span> — المجتمع</span>
            <RevealCssClass as="h2" className="fo-chapter-title" delay={1} id="roles-title">
              خمسة <em>أدوار</em>، دفترٌ واحد
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-chapter-lede" delay={2}>
              كل دور أكاديمي يرى ما يخصّه فقط — صلاحيات مدروسة وفصلٌ واضح
              بين الواجبات، من قاعة الدراسة إلى مركز تحكّم المنصّة.
            </RevealCssClass>
          </header>

          <ul className="fo-roles">
            {ROLES.map((r, i) => (
              <RevealCssClass as="li" key={r.name} className="fo-role-row" delay={((i % 3) + 1) as 1 | 2 | 3}>
                <span className="fo-role-index fo-mono" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <span className={`fo-role-ico ${r.tone}`}><Icon icon={r.icon} size={24} strokeWidth={1.7} /></span>
                <div className="fo-role-body">
                  <h3 className="fo-role-name">{r.name}</h3>
                  <p className="fo-role-desc">{r.desc}</p>
                  <p className="fo-role-caps">{r.caps}</p>
                </div>
              </RevealCssClass>
            ))}
          </ul>
        </section>

        {/* ═══ ٠٣ — ما يُشحن اليوم (truth ledger) ═══ */}
        <section id="ledger" className="fo-chapter fo-ledger" aria-labelledby="ledger-title">
          <header className="fo-chapter-head">
            <span className="fo-label"><span className="fo-mono">٠٣</span> — الصدق</span>
            <RevealCssClass as="h2" className="fo-chapter-title" delay={1} id="ledger-title">
              ما يُشحن <em>اليوم</em> — بحالته الفعلية
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-chapter-lede" delay={2}>
              دفتر صادق: كل قدرة تُذكر بحالتها الحقيقية — ما يعمل يعمل،
              وما يُحاكى يُعلَن، وما لم يصل بعد يُقال بوضوح.
            </RevealCssClass>
          </header>

          <ul className="fo-ledger-list">
            {LEDGER.map((row, i) => (
              <RevealCssClass as="li" key={row.item} className="fo-ledger-row" delay={((i % 3) + 1) as 1 | 2 | 3}>
                <span className={`fo-ledger-status ${LEDGER_STATUS[row.status].cls}`}>
                  {LEDGER_STATUS[row.status].label}
                </span>
                <span className="fo-ledger-item">{row.item}</span>
                <span className="fo-ledger-rule" aria-hidden />
              </RevealCssClass>
            ))}
          </ul>

          <RevealCssClass as="div" className="fo-ledger-legend" delay={3}>
            <span><Icon icon={BadgeCheck} size={13} /> يعمل: ميزة مكتملة قابلة للاستخدام الآن</span>
            <span><Icon icon={Cog} size={13} /> محلي: تعمل داخل الخادم بلا مزوّد خارجي</span>
            <span><Icon icon={FlaskConical} size={13} /> محاكاة: نتائج تجريبية معلَنة بلا كشف حقيقي</span>
            <span><Icon icon={Compass} size={13} /> قادم: مصمَّمة وغير مُفعَّلة بعد</span>
          </RevealCssClass>
        </section>

        {/* ═══ ٠٤ — الاستقلالية (manifesto) ═══ */}
        <section id="independence" className="fo-chapter fo-independence" aria-labelledby="independence-title">
          <header className="fo-chapter-head">
            <span className="fo-label"><span className="fo-mono">٠٤</span> — الاستقلالية</span>
            <RevealCssClass as="h2" className="fo-chapter-title" delay={1} id="independence-title">
              منصّة مستقلّة، <em>بيانات واضحة</em>
            </RevealCssClass>
          </header>

          <div className="fo-manifesto">
            <RevealCssClass as="div" className="fo-manifesto-block" delay={1}>
              <span className="fo-manifesto-mark"><Icon icon={Landmark} size={20} /></span>
              <p>
                مدارك منتج برمجي مستقلّ صُنع في ليبيا. لا تتبع المنصّة أيّ
                جامعة أو وزارة أو جهة رسمية، ولا تتبنّاها — استقلاليتها
                جزء من عقدها مع مستخدميها.
              </p>
            </RevealCssClass>
            <RevealCssClass as="div" className="fo-manifesto-block" delay={2}>
              <span className="fo-manifesto-mark"><Icon icon={FlaskConical} size={20} /></span>
              <p>
                بيانات العرض داخل المنصّة تخصّ <strong>«جامعة مدارك التجريبية»</strong> —
                مؤسّسة اصطناعية بالكامل وُجدت لإظهار سير العمل الأكاديمي؛
                كلياتها وأقسامها وسجلّاتها بيانات تجريبية لا تمثّل أيّ مؤسّسة حقيقية.
              </p>
              <Link to="/colleges" className="fo-manifesto-link">
                استعرض البنية الأكاديمية التجريبية
                <Icon icon={ArrowLeft} size={14} />
              </Link>
            </RevealCssClass>
            <RevealCssClass as="div" className="fo-manifesto-block" delay={3}>
              <span className="fo-manifesto-mark"><Icon icon={Building2} size={20} /></span>
              <p>
                المؤسّسات التعليمية الحقيقية تنضم إلى مدارك عبر إعداد مؤسسي
                موثّق وممارَس من إدارتها — بحساباتها وهيكلها الأكاديمي
                الخاص، ومعزولة بياناتها عن غيرها بالكامل.
              </p>
            </RevealCssClass>
          </div>
        </section>

        {/* ═══ الخاتمة — نقطة البداية ═══ */}
        <section className="fo-cta" aria-label="ابدأ رحلتك — أنشئ حسابك">
          <span className="fo-cta-star" aria-hidden>
            <svg viewBox="0 0 64 64" focusable="false">
              <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" />
              <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" transform="rotate(45 32 32)" />
              <rect x="27" y="27" width="10" height="10" fill="var(--accent)" transform="rotate(45 32 32)" />
              <circle cx="47" cy="17" r="5" fill="var(--gold)" />
            </svg>
          </span>
          <div className="fo-cta-inner">
            <RevealCssClass as="h2" className="fo-cta-title" delay={1}>
              ابدأ من <em>نقطتك</em>.
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-cta-lede" delay={2}>
              {/* r164b: label, copy and destination tell ONE story —
                  create the account. */}
              أنشئ حسابك الجامعي في دقائق — بالبريد الجامعي أو رقم قيدك —
              لتصل إلى مقرَّراتك ومتابعة تقدّمك الأكاديمي.
            </RevealCssClass>
            <RevealCssClass as="div" className="fo-cta-actions" delay={3}>
              <Link to="/auth/register" className="btn accent lg">
                أنشئ حسابك الجامعي
                <Icon icon={ArrowLeft} size={16} />
              </Link>
              <Link to="/auth" className="btn ghost lg">تسجيل الدخول</Link>
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-cta-meta" delay={4}>
              <Icon icon={Check} size={13} />
              مدارك · {year} · صُنعت في ليبيا
            </RevealCssClass>
          </div>
        </section>
      </main>

      {/* ── COLOPHON FOOTER ── */}
      <footer className="fo-footer">
        <div className="fo-footer-inner">
          <div className="fo-footer-grid">
            <div className="fo-footer-col">
              <Link to="/" className="fo-brand" aria-label="مدارك">
                <svg className="fo-brand-mark" viewBox="0 0 64 64" aria-hidden focusable="false">
                  <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" />
                  <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" transform="rotate(45 32 32)" />
                  <rect x="27" y="27" width="10" height="10" fill="var(--accent)" transform="rotate(45 32 32)" />
                  <circle cx="47" cy="17" r="5" fill="var(--gold)" />
                </svg>
                <span className="fo-brand-text">
                  <span className="fo-brand-name">مدارك</span>
                  <span className="fo-brand-sub">منصّة التعليم الذكي</span>
                </span>
              </Link>
              <p className="fo-footer-about">
                {/* r177 + r188: independent platform; the demonstration
                    institution is explicitly synthetic data, never an
                    affiliation claim. */}
                منصّة تعليمية تقنية مستقلّة، عربية أولًا، صُنعت في ليبيا.
                لا تتبنّى المنصّة أيّ مؤسّسة تعليمية؛ بيانات العرض داخلها
                اصطناعية تجريبية.
              </p>
            </div>
            <nav className="fo-footer-col" aria-label="روابط المنصّة">
              <div className="fo-footer-heading">المنصّة</div>
              <a href="#journey" className="fo-footer-link">كيف تعمل</a>
              <a href="#roles" className="fo-footer-link">الأدوار الخمسة</a>
              <a href="#ledger" className="fo-footer-link">ما يُشحن اليوم</a>
              <Link to="/colleges" className="fo-footer-link">البنية التجريبية</Link>
            </nav>
            <nav className="fo-footer-col" aria-label="روابط الحساب">
              <div className="fo-footer-heading">الحساب</div>
              <Link to="/auth/register" className="fo-footer-link">إنشاء حساب جامعي</Link>
              <Link to="/auth" className="fo-footer-link">تسجيل الدخول</Link>
            </nav>
            <nav className="fo-footer-col" aria-label="روابط المشروع">
              <div className="fo-footer-heading">المشروع</div>
              <a href="#independence" className="fo-footer-link">الاستقلالية والبيانات</a>
              <a href="#main" className="fo-footer-link">أعلى الصفحة</a>
            </nav>
          </div>
          <div className="fo-footer-bottom">
            <span className="fo-mono">© {year} مدارك</span>
            <span className="fo-footer-cluster">
              <LibyaFlag size={14} /> صُنع في ليبيا
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
