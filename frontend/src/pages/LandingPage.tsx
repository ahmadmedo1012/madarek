import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Brain, GraduationCap, Building2, Compass, ShieldCheck, ArrowLeft,
  Menu, X, PlayCircle, Route as RouteIcon, ClipboardCheck, Medal,
  Keyboard, MoonStar, Check, Crown, Landmark, FlaskConical,
  Cog, Telescope,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { StarMark } from '../components/StarMark';
import { ThemeToggle, useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { LibyaFlag } from '../components/LibyaFlag';
import { OrbitPath } from '../components/landing/OrbitPath';
import { RevealCssClass } from '../hooks/useReveal';
// landing.css is this page's own sheet — «مدار المعرفة», the r190
// direction: the public surface speaks the Turion-derived orbit
// grammar (void media stage, atmospheric violet illumination,
// Alexandria display, telemetry micro-labels with square markers,
// near-square geometry) while every funnel/a11y/truth contract of
// the r188 folio landing carries forward unchanged (landing-funnel,
// r170d, r177, r188, r168b pins — see docs/design/r190-reference-matrix.md).
import '../styles/landing.css';

/**
 * Landing — «مدار المعرفة» (The Orbit of Knowledge), r190.
 *
 * A complete re-composition of the public surface in the reference
 * grammar: a cinematic void hero stage (original art, orbital line,
 * telemetry strip), cream/void alternating body sections, the honest
 * truth-ledger as the PROOF moment, and an atmospheric media stage —
 * one identity across both themes (the stage family is theme-fixed,
 * the body follows the canonical two-theme system).
 *
 * Sections:
 *   الترويسة (header) → النقطة (void hero stage) → شريط القياس
 *   → ٠١ كيف تعمل (five stations) → ٠٢ الأدوار الخمسة
 *   → ٠٣ ما يُشحن اليوم (honest feature ledger — the proof)
 *   → ٠٤ الاستقلالية (manifesto) → مدار الرؤية (media stage)
 *   → الخاتمة (CTA) → COLOPHON footer.
 */

type RevealDelay = 1 | 2 | 3 | 4 | 5;
const d3 = (i: number): RevealDelay => ((i % 3) + 1) as RevealDelay;
const d4 = (i: number): RevealDelay => ((i % 4) + 1) as RevealDelay;

/** The five stations — the journey from first lesson to mastery,
 *  told as orbital stations (the reference's mission-areas grammar). */
const STATIONS: Array<{
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

/** The telemetry strip's honest live count — computed, never typed. */
const LIVE_COUNT = LEDGER.filter((r) => r.status === 'live').length;

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
            <StarMark size={34} className="fo-brand-mark" />
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

        {/* ═══ النقطة — the void hero stage ═══
            A cinematic media stage: the original «مدار المعرفة» art
            (orbiting nodes of knowledge over the void), an orbital
            light-path, Alexandria display, and the telemetry strip.
            Theme-fixed stage family (tokens.css --stage-*) — a media
            surface, not a theme rebellion; the body below follows the
            canonical two-theme system. */}
        <section className="fo-hero" aria-label="مدارك — منصّة التعليم الذكي">
          <div className="fo-hero-stage" aria-hidden>
            <img
              className="fo-hero-art"
              src="/brand/hero-scene.webp"
              alt=""
              decoding="async"
            />
            {/* the orbital light-path — one thin line, one glowing node
                (the reference's trajectory grammar, RTL rising) */}
            <OrbitPath className="fo-orbit-path" />
          </div>

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
        </div>

          {/* the telemetry strip — the reference's bottom HUD bar:
              square markers, mono micro-labels, honest counts. */}
          <RevealCssClass as="ul" className="fo-telemetry" delay={5} aria-label="قياس المنصّة">
            <li className="fo-telemetry-item">
              <span className="fo-telemetry-mark" aria-hidden />
              <span className="fo-mono">٠١</span> منصّة عربية أولًا
            </li>
            <li className="fo-telemetry-item">
              <span className="fo-telemetry-mark" aria-hidden />
              <span className="fo-mono">٠٢</span> خمسة أدوار أكاديمية
            </li>
            <li className="fo-telemetry-item">
              <span className="fo-telemetry-mark" aria-hidden />
              <span className="fo-mono">٠٣</span> {LIVE_COUNT} قدرات تعمل اليوم
            </li>
            <li className="fo-telemetry-item fo-telemetry-end">
              <span className="fo-telemetry-mark" aria-hidden />
              <span className="fo-mono">LI</span> صُنعت في ليبيا
            </li>
          </RevealCssClass>
        </section>

        {/* ═══ شريط القدرات — the quiet ruled band (static, a11y-safe) ═══ */}
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
                <span className="fo-capabilities-sep" aria-hidden />
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
              كل محطة تُبنى على ما قبلها: تشاهد، تُقاس، تُوجَّه، ثم تُتقن —
              والمنصّة تسجّل كل خطوة في مدارك الخاص.
            </RevealCssClass>
          </header>

          <ol className="fo-stations">
            {STATIONS.map((st, i) => (
              <RevealCssClass as="li" key={st.n} className="fo-station" delay={d3(i)}>
                <span className="fo-station-lead" aria-hidden>
                  <span className="fo-mono">{st.n}</span>
                </span>
                <span className="fo-station-icon"><Icon icon={st.icon} size={22} /></span>
                <div className="fo-station-body">
                  <h3 className="fo-station-title">{st.title}</h3>
                  <p className="fo-station-desc">{st.desc}</p>
                </div>
                <span className="fo-station-tag">{st.tag}</span>
              </RevealCssClass>
            ))}
          </ol>
        </section>

        {/* ═══ ٠٢ — الأدوار الخمسة ═══ */}
        <section id="roles" className="fo-chapter" aria-labelledby="roles-title">
          <header className="fo-chapter-head">
            <span className="fo-label"><span className="fo-mono">٠٢</span> — الأدوار</span>
            <RevealCssClass as="h2" className="fo-chapter-title" delay={1} id="roles-title">
              منصّة واحدة، <em>خمس مسؤوليات</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-chapter-lede" delay={2}>
              كل دور يجد أدواته ومقاييسه — بنفس الهوية، وبعزل صلاحيات كامل.
            </RevealCssClass>
          </header>

          <ul className="fo-roles">
            {ROLES.map((role, i) => (
              <RevealCssClass as="li" key={role.name} className={`fo-role tone-${role.tone}`} delay={d3(i)}>
                <span className="fo-role-icon"><Icon icon={role.icon} size={24} /></span>
                <div className="fo-role-body">
                  <h3 className="fo-role-name">{role.name}</h3>
                  <p className="fo-role-desc">{role.desc}</p>
                  <p className="fo-role-caps"><span className="fo-mono">↔</span> {role.caps}</p>
                </div>
              </RevealCssClass>
            ))}
          </ul>
        </section>

        {/* ═══ ٠٣ — ما يُشحن اليوم (the proof ledger) ═══
            The reference's «Operating on orbit today» moment, told
            honestly: every capability ships with its REAL status —
            يعمل / محلي / محاكاة / قادم — on an atmospheric band. */}
        <section id="ledger" className="fo-proof" aria-labelledby="ledger-title">
          <div className="fo-proof-inner">
            <header className="fo-chapter-head">
              <span className="fo-label"><span className="fo-mono">٠٣</span> — الدليل</span>
              <RevealCssClass as="h2" className="fo-chapter-title" delay={1} id="ledger-title">
                ما يُشحن <em>اليوم</em>
              </RevealCssClass>
              <RevealCssClass as="p" className="fo-chapter-lede" delay={2}>
                لا أرقام تسويقية ولا شراكات مُختلقة — كل قدرة تُعلن
                {"حالتها التشغيلية الحقيقية"} كما هي في الكود.
              </RevealCssClass>
            </header>

            <ul className="fo-proof-ledger">
              {LEDGER.map((row, i) => (
                <RevealCssClass as="li" key={row.item} className="fo-proof-row" delay={d4(i)}>
                  <span className={`fo-proof-status ${LEDGER_STATUS[row.status].cls}`}>
                    <span className="fo-proof-status-mark" aria-hidden />
                    {LEDGER_STATUS[row.status].label}
                  </span>
                  <span className="fo-proof-item">{row.item}</span>
                </RevealCssClass>
              ))}
            </ul>

            <RevealCssClass as="p" className="fo-proof-note" delay={3}>
              <span className="fo-mono">※</span> الحالات مصدرها وثائق الميزات
              نفسها (docs/02-features) — تتغيّر مع كل إصدار، لا مع كل حملة.
            </RevealCssClass>
          </div>
        </section>

        {/* ═══ ٠٤ — الاستقلالية ═══ */}
        <section id="independence" className="fo-chapter" aria-labelledby="independence-title">
          <header className="fo-chapter-head">
            <span className="fo-label"><span className="fo-mono">٠٤</span> — الاستقلالية</span>
            <RevealCssClass as="h2" className="fo-chapter-title" delay={1} id="independence-title">
              مستقلّة بالتصميم، <em>شديدة الوضوح</em> بالبيانات
            </RevealCssClass>
          </header>
          <div className="fo-manifesto">
            <RevealCssClass as="div" className="fo-manifesto-block" delay={1}>
              <span className="fo-manifesto-mark"><Icon icon={Landmark} size={20} /></span>
              <p>
                مدارك منصّة تقنية مستقلّة لا تتبع وزارة ولا جامعة ولا جهة
                منح — الاشتراك يُدار من إدارة مؤسستك مباشرة، والمنصّة
                تبقى حيادية أمام الجميع.
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

        {/* ═══ مدار الرؤية — the atmospheric media stage ═══
            The orbit-ring art: knowledge as a system in motion. */}
        <section className="fo-media" aria-labelledby="media-title">
          <figure className="fo-media-figure">
            <img
              className="fo-media-art"
              src="/brand/orbit-ring.webp"
              alt="حلقة مدارية من نقاط الضوء — تمثيل مجرّد لمنظومة المعرفة المتصلة"
              loading="lazy"
              decoding="async"
            />
            <figcaption className="fo-mono">الشكل ٠٢ — منظومة المعرفة</figcaption>
          </figure>
          <div className="fo-media-copy">
            <span className="fo-label"><span className="fo-mono">٠٥</span> — الرؤية</span>
            <RevealCssClass as="h2" className="fo-media-title" delay={1} id="media-title">
              المعرفة <em>منظومة</em>، لا مواد متفرّقة
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-media-lede" delay={2}>
              نبني مدارك لتبقى كل نقطة معرفة متصلة بمدارها: المحاضرة تخدم
              المصفوفة، والمصفوفة تخدم الاختبار، والاختبار يخدم خطتك —
              والذكاء المحلي يجمعها كلها حول الطالب.
            </RevealCssClass>
            <RevealCssClass as="ul" className="fo-media-points" delay={3}>
              <li><Icon icon={Telescope} size={16} /> قياس يتّصل بالتعليم لا بالمراقبة</li>
              <li><Icon icon={Compass} size={16} /> مسارات تتكيّف مع كل طالب</li>
              <li><Icon icon={Cog} size={16} /> تشغيل مؤسسي معزول وموثَّق</li>
            </RevealCssClass>
          </div>
        </section>

        {/* ═══ الخاتمة — نقطة البداية ═══ */}
        <section className="fo-cta" aria-label="ابدأ رحلتك — أنشئ حسابك">
          <span className="fo-cta-star" aria-hidden>
            <StarMark size={48} withHalo />
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
                <StarMark size={34} className="fo-brand-mark" />
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
