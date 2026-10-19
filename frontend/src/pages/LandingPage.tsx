import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Brain, GraduationCap, Building2, ArrowLeft, ArrowRight,
  Menu, X, Keyboard, MoonStar, Check, FlaskConical,
  BookOpenCheck, ClipboardCheck,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { StarMark } from '../components/StarMark';
import { ThemeToggle, useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { OrbitPath } from '../components/landing/OrbitPath';
import { KnowledgeMap } from '../components/landing/KnowledgeMap';
import { RevealCssClass } from '../hooks/useReveal';
import { useScrollStage } from '../hooks/useScrollStage';
// landing.css — «رحلة المعرفة»: the r191 scroll-choreography rebuild.
// The public surface reproduces the reference's observed MECHANICS (pinned
// narrative stage, scene crossfades, scroll-bound map state, parallax
// layers, staggered stat march, giant closing wordmark) with original
// Madarek content — see docs/design/r191-turion-fidelity-spec.md.
// Every funnel/a11y/truth contract carries forward (landing-funnel, r183,
// r170d, r177, r188) — re-pinned honestly in r191 for the operator-ordered
// copy changes: the operator-rejected provenance slogan and the
// engineering-jargon proof title are gone from every user-facing surface.
import '../styles/landing.css';

/**
 * Landing — «رحلة المعرفة» (r191).
 *
 * Scene sequence (the reference's choreography, translated):
 *   header (fixed, scrolled variant) → النقطة (1-viewport cinematic hero)
 *   → خريطة التعلّم (pinned mega-stage: radial map + 6 crossfading scenes
 *   + capability bar) → المنظومة (cream product cards slider)
 *   → ما يعمل اليوم (pinned honest proof: staggered stat march)
 *   → لمن صُنعت (cream role cards) → إلى أين (parallax vision + giant
 *   wordmark + honest status pairs) → مبدأ مدارك (quote card)
 *   → الخاتمة (CTA) → footer (giant wordmark parallax).
 */

/* ── Copy: the honest capability ledger (docs/02-features vocabulary).
 * Every number below is computed from this table or hard product truth —
 * no invented adoption, no marketing metrics. */
const LIVE_CAPABILITIES = [
  'المحاضرات التفاعلية بنقاط الفحص والحضور التلقائي',
  'الاختبارات بأربعة أنواع أسئلة وتصحيح تلقائي للموضوعي',
  'المصفوفة المعرفية وتتبّع الإتقان لكل مقرّر',
  'مكتبة البحوث برفع PDF ومراجعة معلَّمة للأستاذ',
  'الرسائل المباشرة والإشعارات داخل المنصّة',
  'الجدول الأسبوعي ومذكّرات التسليمات',
] as const;
const LIVE_COUNT = LIVE_CAPABILITIES.length;

/* ── Mega-stage scenes (خريطة التعلّم) — six frames, RTL content column,
 * crossfaded by scroll progress; boundaries as [in, out] progress. */
type MegaScene = {
  id: string;
  meta: string;
  label: string;
  title: React.ReactNode;
  lede: string;
  bullets?: string[];
  compare?: boolean;
  barActive?: number;
};
const MEGA_SCENES: MegaScene[] = [
  {
    id: 'what',
    meta: 'منصّة تعليمية متكاملة',
    label: '٠٠٢ · ما هي مدارك',
    title: <>كل ما تحتاجه الجامعة، <em>في منظومة واحدة</em></>,
    lede: 'مدارك تجمع المحتوى والقياس والبحث والتواصل في مكان واحد — كل قدرة تخدم التي بعدها — والطالب في مركزها.',
  },
  {
    id: 'today',
    meta: 'ثلاث ركائز متصلة',
    label: 'اليوم',
    title: <>تعلّم متصل <em>بثلاث ركائز</em></>,
    lede: 'كل ركيزة تُبنى على ما قبلها:',
    bullets: ['٠١ محتوى تفاعلي يُشاهد ويُفحص', '٠٢ قياس وإتقان يكشف الفجوات', '٠٣ ذكاء أكاديمي يقترح الخطوة التالية'],
    barActive: 0,
  },
  {
    id: 'why',
    meta: 'لماذا مدارك',
    label: 'الفكرة',
    title: <>المعرفة <em>منظومة</em>، لا مواد متفرّقة</>,
    lede: 'حين تتصل المحاضرة بالقياس، والقياس بخطة المراجعة، يتعلّم الطالب بجهد أقلّ وفهمٍ أبقى.',
    compare: true,
  },
  {
    id: 'first',
    meta: 'من أوّل درس',
    label: 'الخطوة الأولى',
    title: <>تشاهد، فتُقاس، <em>ثم تتقن</em></>,
    lede: 'المحاضرة التفاعلية نقطة البداية: بنقاط فحص تُثبّت الفهم، وحضور يُحتسب تلقائيًا عند الإكمال.',
    barActive: 1,
  },
  {
    id: 'measure',
    meta: 'قياس يخدم التعلّم',
    label: 'القياس',
    title: <>قياسٌ <em>يخدم التعلّم</em>، لا المراقبة</>,
    lede: 'تصحيح تلقائي للموضوعي، وتصحيح المقالات بملاحظات مكتوبة — والمصفوفة تربط كل درجة بالدرس الذي يحتاجه الطالب.',
    bullets: ['اختيار متعدد · صح/خطأ · إجابة قصيرة · مقالة', 'المصفوفة تكشف الفجوة وتربطها بالمحتوى'],
    barActive: 2,
  },
  {
    id: 'whole',
    meta: 'خمسة أدوار · عزل بيانات كامل',
    label: 'منظومة متكاملة',
    title: <>منظومةٌ تعمل اليوم — <em>وتتّسع غدًا</em></>,
    lede: 'خمسة أدوار بمسارات وصلاحيات منفصلة، وبيانات كل مؤسّسة معزولة تمامًا، ومساعد يعرف مقرَّراتك ودرجاتك.',
  },
];

/* Frame boundaries: frame i is fully in at IN[i], fades out by OUT[i].
 * The stage's --sp measures the PINNED window (top-at-viewport-top →
 * bottom-at-viewport-bottom — the reference's own pin span), so each
 * scene dwells ~1 viewport. Frame 0 enters slightly negative so it is
 * fully visible the moment the stage pins. */
const FRAME_IN = [-0.06, 0.17, 0.34, 0.51, 0.68, 0.84];
const FRAME_OUT = [0.2, 0.37, 0.54, 0.71, 0.87, 1.05];

/* ── Capability bar (the reference's 01–06 checklist grammar). */
const CAPABILITY_BAR = [
  { n: '٠١', t: 'المحتوى' },
  { n: '٠٢', t: 'المصفوفة' },
  { n: '٠٣', t: 'التقييم' },
  { n: '٠٤', t: 'البحوث' },
  { n: '٠٥', t: 'الرسائل' },
  { n: '٠٦', t: 'المساعد' },
];

/* ── Product cards (المنظومة slider). */
const PRODUCTS = [
  {
    n: '٠١', img: '/brand/card-content.webp', title: 'المحتوى والمحاضرات',
    lede: 'محاضرات مسجَّلة بنقاط فحص مدمجة — الحضور يُحتسب تلقائيًا عند الإكمال، والفهم يُبنى بوتيرة الطالب.',
    tags: ['محاضرات', 'نقاط فحص', 'حضور تلقائي'],
    icon: BookOpenCheck,
  },
  {
    n: '٠٢', img: '/brand/card-assessment.webp', title: 'القياس والاختبارات',
    lede: 'أربعة أنواع أسئلة بتصحيح تلقائي للموضوعي، وتصحيح المقالات بملاحظات مكتوبة — والنتائج تتصل مباشرة بالمصفوفة.',
    tags: ['اختيار متعدد', 'صح/خطأ', 'إجابة قصيرة', 'مقالة'],
    icon: ClipboardCheck,
  },
  {
    n: '٠٣', img: '/brand/card-ai.webp', title: 'الذكاء الأكاديمي',
    lede: 'مساعد يعرف مقرَّراتك ومحاضراتك ودرجاتك: شروحات مخصَّصة، وتحديد فجوات، وخطط مراجعة حسب أدائك الفعلي.',
    tags: ['شروحات', 'فجوات معرفية', 'خطط مراجعة'],
    icon: Brain,
  },
];

/* ── Proof stat cards (ما يعمل اليوم) — every number computed or
 * product-true; the artificial-demo transparency card is deliberate. */
/** r191 responsive art: every generated brand image ships a -480 webp
 *  twin — mobile viewports fetch ~10KB variants instead of the 960w art
 *  (the audit's bytes-transferred axis measures the real selection). */
const srcset480 = (src: string) => {
  const m = src.match(/^(.*)\.webp$/);
  return m ? `${m[1]}-480.webp 480w, ${src} 960w` : src;
};

const AR = (n: number) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d] ?? d);

const PROOF_CARDS = [
  { n: AR(LIVE_COUNT), unit: 'قدرات', sub: 'تعمل الآن — موثَّقة في دليل الميزات', img: '/brand/card-assessment.webp' },
  { n: '٥', unit: 'أدوار', sub: 'مسارات وصلاحيات منفصلة لكل دور', img: '/brand/journey-institution.webp' },
  { n: '٤', unit: 'أنواع أسئلة', sub: 'بتصحيح تلقائي للأسئلة الموضوعية', img: '/brand/card-content.webp' },
  { n: '١٠٠٪', unit: 'بيانات عرض معلَنة', sub: 'بيانات العرض اصطناعية تجريبية — لا تُقدَّم كواقع', img: '/brand/journey-student.webp' },
];

/* ── Role cards (لمن صُنعت) — three reader-facing journeys + the honest
 * quiet row for the two oversight roles. */
const ROLE_CARDS = [
  {
    img: '/brand/journey-student.webp', icon: GraduationCap, tag: 'للطالب',
    title: 'رحلة تعلّم شخصية',
    lede: 'مقرَّراتك وتقدُّمك وفجواتك وإنجازاتك في مكان واحد — ومساعد يقترح خطوة المراجعة التالية.',
  },
  {
    img: '/brand/journey-teacher.webp', icon: Brain, tag: 'للأستاذ',
    title: 'أدوات تدريس وقياس',
    lede: 'بناء المحاضرات والاختبارات، متابعة الطلاب، تصحيح معلَّم للمقالات، ومراجعة البحوث — ببضع نقرات.',
  },
  {
    img: '/brand/journey-institution.webp', icon: Building2, tag: 'للإدارة',
    title: 'إدارة مؤسّستك كاملة',
    lede: 'الكليات والأقسام والمقرَّرات والمستخدمون والصلاحيات — وتقارير حيّة على مستوى المؤسّسة.',
  },
];

/* ── Honest status pairs (إلى أين) — natural wording for the ledger's
 * local/sim/soon rows; no operational jargon, no invented claims. */
const VISION_STATUS = [
  { k: 'المساعد الأكاديمي', v: 'يعمل الآن — داخل المنصّة بلا خدمات خارجية', live: true },
  { k: 'فحص نزاهة البحوث', v: 'محاكاة — النتائج معلَّمة بوضوح', live: false },
  { k: 'المعامل الافتراضية', v: 'قيد التطوير — فهرس للاستعراض دون تشغيل بعد', live: false },
  { k: 'مزامنة بيانات المؤسّسات', v: 'وضع محدود — قيد التوسعة', live: false },
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

  /* ── r191 scroll-choreography wiring ─────────────────────────────
   * Each stage container carries ONE --sp progress var written by
   * useScrollStage (rAF-coalesced, passive); CSS derives every motion. */
  const megaRef = useScrollStage<HTMLElement>({ startOffset: 0, endOffset: 1 });
  const proofRef = useScrollStage<HTMLElement>({ startOffset: 0, endOffset: 1 });
  const visionRef = useScrollStage<HTMLElement>();
  const footerRef = useScrollStage<HTMLElement>();
  const productsRef = useRef<HTMLDivElement>(null);

  // Which mega frame is active (for aria only — visuals stay CSS-driven;
  // setState fires at most once per frame change, never per scroll tick).
  const [activeFrame, setActiveFrame] = useState(0);
  // Pinned mode = desktop-ish viewport + motion allowed. In flow mode
  // (mobile / reduced motion) all frames read in normal document order.
  const [pinnedMode, setPinnedMode] = useState(false);

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
      // active mega frame (aria only) from the same coalesced tick
      const mega = megaRef.current;
      if (mega) {
        const sp = parseFloat(mega.style.getPropertyValue('--sp') || '0');
        let idx = 0;
        for (let i = FRAME_IN.length - 1; i >= 0; i--) {
          const inAt = FRAME_IN[i];
          if (inAt !== undefined && sp >= inAt) { idx = i; break; }
        }
        setActiveFrame((prev) => (prev === idx ? prev : idx));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pinned mode: viewport ≥901px AND motion allowed. Everything else
  // stacks the frames in normal flow (the reference's own mobile
  // behavior — measured: position:relative on mobile, no pinning).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const rm = window.matchMedia('(prefers-reduced-motion: no-preference)');
    const sync = () => setPinnedMode(mq.matches && rm.matches);
    sync();
    mq.addEventListener('change', sync);
    rm.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      rm.removeEventListener('change', sync);
    };
  }, []);

  // Products slider: RTL-snap scroll + arrow controls (no state).
  const scrollProducts = (dir: 1 | -1) => {
    const el = productsRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.pd-card');
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

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

      {/* ── Masthead header — the .scrolled state class is imperative ── */}
      <header className="fo-header" ref={headerRef}>
        <div className="fo-header-inner">
          <Link to="/" className="fo-brand" aria-label="مدارك — الصفحة الرئيسية">
            <StarMark size={34} className="fo-brand-mark" />
            <span className="fo-brand-text">
              <span className="fo-brand-name">مدارك</span>
              <span className="fo-brand-sub">منصّة التعليم الذكي</span>
            </span>
          </Link>

          <nav className="fo-nav" aria-label="التنقل الرئيسي">
            <a href="#journey" className="fo-nav-link">كيف تعمل</a>
            <a href="#system" className="fo-nav-link">المنظومة</a>
            <a href="#live" className="fo-nav-link">ما يعمل اليوم</a>
            <a href="#roles" className="fo-nav-link">لمن صُنعت</a>
          </nav>

          <div className="fo-header-actions">
            <ThemeToggle />
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
            <a href="#system" className="btn ghost">المنظومة</a>
            <a href="#live" className="btn ghost">ما يعمل اليوم</a>
            <a href="#roles" className="btn ghost">لمن صُنعت</a>
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

        {/* ═══ النقطة — the 1-viewport cinematic hero ═══ */}
        <section className="fo-hero" aria-label="مدارك — منصّة التعليم الذكي">
          <div className="fo-hero-stage" aria-hidden>
            <img
              className="fo-hero-art"
              src="/brand/hero-scene.webp"
              srcSet="/brand/hero-scene-720.webp 720w, /brand/hero-scene.webp 1440w"
              sizes="100vw"
              alt=""
              decoding="async"
              fetchPriority="high"
            />
            <OrbitPath className="fo-orbit-path" />
          </div>

          <div className="fo-hero-grid">
            <div className="fo-hero-copy">
              <RevealCssClass as="p" className="fo-eyebrow">
                منصّة تعليم ذكية · عربية أولًا · مستقلّة
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
                محاضرات تفاعلية، ومصفوفة معرفية، واختبارات، وبحوث، ورسائل —
                في تجربة عربية واحدة لخمسة أدوار أكاديمية، من الطالب إلى
                مالك المنصّة.
              </RevealCssClass>

              <RevealCssClass as="div" className="fo-hero-actions" delay={3}>
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

          {/* micro-labels — the reference's corner instrument grammar:
              ٠٠١ at the start corner (RTL: bottom-right), mission sentence
              opposite. Honest counts only. */}
          <RevealCssClass as="div" className="fo-hero-corner fo-micro" delay={5}>
            <span className="fo-mono">٠٠١</span> · تعليمٌ يستحق مساره
          </RevealCssClass>
          <RevealCssClass as="p" className="fo-hero-mission fo-micro" delay={5}>
            من المحاضرة الأولى إلى الإتقان — منظومة واحدة تصنع رحلة كل طالب.
          </RevealCssClass>

          {/* the quiet honest strip — replaces the old flag strip */}
          <RevealCssClass as="ul" className="fo-telemetry" delay={5} aria-label="حقائق سريعة عن المنصّة">
            <li className="fo-telemetry-item">
              <span className="fo-telemetry-mark" aria-hidden />
              <span className="fo-mono">٠١</span> عربية أولًا
            </li>
            <li className="fo-telemetry-item">
              <span className="fo-telemetry-mark" aria-hidden />
              <span className="fo-mono">٠٢</span> خمسة أدوار أكاديمية
            </li>
            <li className="fo-telemetry-item">
              <span className="fo-telemetry-mark" aria-hidden />
              <span className="fo-mono">٠٣</span> {AR(LIVE_COUNT)} قدرات تعمل اليوم
            </li>
            <li className="fo-telemetry-item fo-telemetry-end">
              <span className="fo-telemetry-mark" aria-hidden />
              <span className="fo-mono">※</span> بيانات العرض تجريبية معلَنة
            </li>
          </RevealCssClass>

          {/* scroll cue — the reference's quiet "keep going" affordance */}
          <div className="fo-scroll-cue" aria-hidden>
            <span className="fo-scroll-cue-dot" />
          </div>
        </section>

        {/* ═══ خريطة التعلّم — the pinned mega-stage ═══
            The reference's 9,900px pinned narrative, translated: a radial
            knowledge map (SVG rings + nodes) that stays fixed while six
            content frames crossfade — then unpins. Mobile / reduced
            motion: the frames stack in normal flow (the reference's own
            measured mobile behavior) and every word stays readable. */}
        <section
          id="journey"
          className="mg-stage"
          aria-labelledby="journey-title"
          ref={megaRef}
          data-pinned={pinnedMode ? 'on' : 'off'}
        >
          <h2 id="journey-title" className="sr-only">كيف تعمل مدارك</h2>

          <div className="mg-pin" aria-hidden={pinnedMode ? undefined : false}>
            {/* the radial map — bottom-anchored like the reference's
                orbit map; its nodes light up as scenes resolve */}
            <KnowledgeMap className="mg-map" />
          </div>

          {/* r191-catch: EVERY pinned layer below must live INSIDE the sticky
              frame — meta, frames, capability bar and scale note all anchor
              to the 100vh pin, not to the 620vh stage. */}
          <div className="mg-pin-secondary">
          <div className="mg-meta fo-micro" aria-hidden={pinnedMode ? undefined : true}>
            <span className="fo-mono">٠٠٢</span> · منصّة تعليمية متكاملة
          </div>

          <div className="mg-frames">
            {MEGA_SCENES.map((sc, i) => (
              <article
                key={sc.id}
                className="mg-frame"
                style={{
                  ['--in' as string]: FRAME_IN[i],
                  ['--out' as string]: FRAME_OUT[i],
                }}
                aria-hidden={pinnedMode && i !== activeFrame ? 'true' : undefined}
              >
                <span className="fo-mono mg-frame-label">{sc.label}</span>
                <h3 className="mg-frame-title">{sc.title}</h3>
                <p className="mg-frame-lede">{sc.lede}</p>
                {sc.bullets && (
                  <ul className="mg-frame-bullets">
                    {sc.bullets.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                )}
                {sc.compare && (
                  <div className="mg-compare" aria-hidden>
                    <span className="mg-compare-a">
                      <span className="mg-compare-label">تعلّم متفرّق</span>
                    </span>
                    <span className="mg-compare-b">
                      <span className="mg-compare-label">منظومة متصلة</span>
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* the capability bar — the reference's 01–06 checklist,
              highlighted per scene */}
          <div className="mg-capbar" aria-hidden={pinnedMode ? undefined : true}>
            {CAPABILITY_BAR.map((c, i) => (
              <span
                key={c.n}
                className="mg-cap"
                data-on={pinnedMode && MEGA_SCENES[activeFrame]?.barActive === i ? 'true' : undefined}
              >
                <span className="fo-mono">{c.n}</span> {c.t}
              </span>
            ))}
          </div>

          <p className="mg-scale-note fo-micro" aria-hidden={pinnedMode ? undefined : true}>
            خريطة توضيحية — المواضع والأحجام رمزية
          </p>
          </div>
        </section>

        {/* ═══ المنظومة — product cards slider (cream) ═══ */}
        <section id="system" className="pd-section" aria-labelledby="system-title">
          <header className="pd-head">
            <span className="fo-label"><span className="fo-mono">٠٠٣</span> — المنظومة</span>
            <RevealCssClass as="h2" className="pd-title" delay={1} id="system-title">
              ما تجده في مدارك — <em>منظومة واحدة متكاملة</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="pd-lede" delay={2}>
              كل قدرة تُبنى على التي قبلها: تشاهد، فتُقاس، فتُوجَّه، ثم تتقن.
            </RevealCssClass>
          </header>

          <div className="pd-slider-wrap">
            <div className="pd-slider" ref={productsRef} role="group" aria-label="بطاقات المنظومة" tabIndex={0}>
              {PRODUCTS.map((p) => (
                <article key={p.n} className="pd-card">
                  <figure className="pd-card-media">
                    <img src={p.img} srcSet={srcset480(p.img)} sizes="(max-width: 900px) 88vw, 560px" alt="" loading="lazy" decoding="async" />
                    <span className="fo-mono pd-card-n">{p.n}</span>
                  </figure>
                  <div className="pd-card-body">
                    <h3 className="pd-card-title"><Icon icon={p.icon} size={18} /> {p.title}</h3>
                    <p className="pd-card-lede">{p.lede}</p>
                    <ul className="pd-card-tags">
                      {p.tags.map((t) => <li key={t} className="fo-mono">{t}</li>)}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
            <div className="pd-arrows">
              <button type="button" className="pd-arrow" aria-label="البطاقة التالية" onClick={() => scrollProducts(-1)}>
                <Icon icon={ArrowRight} size={18} />
              </button>
              <button type="button" className="pd-arrow" aria-label="البطاقة السابقة" onClick={() => scrollProducts(1)}>
                <Icon icon={ArrowLeft} size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* ═══ ما يعمل اليوم — the pinned honest proof ═══
            The reference's staggered stat march, told with numbers the
            code can stand behind (computed above); the demo-data
            transparency card is deliberate honesty, not decoration. */}
        <section id="live" className="pf-stage" aria-labelledby="live-title" ref={proofRef} data-pinned={pinnedMode ? 'on' : 'off'}>
          <div className="pf-pin">
            <header className="pf-head">
              <span className="fo-label"><span className="fo-mono">٠٠٤</span> — ما يعمل اليوم</span>
              <h2 className="pf-title" id="live-title">
                قدرات <em>موثَّقة</em>، لا ادّعاءات
              </h2>
              <p className="pf-lede fo-micro">
                كل رقم يُحسب من حالة الميزات في النظام — يتغيّر مع التحديثات، لا مع الحملات.
              </p>
            </header>

            <ul className="pf-cards">
              {PROOF_CARDS.map((c, i) => (
                <li
                  key={c.unit}
                  className="pf-card"
                  style={{ ['--ci' as string]: i }}
                  aria-hidden={false}
                >
                  <figure className="pf-card-media">
                    <img src={c.img} srcSet={srcset480(c.img)} sizes="(max-width: 900px) 88vw, 500px" alt="" loading="lazy" decoding="async" />
                  </figure>
                  <p className="pf-card-n">
                    <strong className="fo-mono">{c.n}</strong>
                    <span className="pf-card-unit">{c.unit}</span>
                  </p>
                  <p className="pf-card-sub">{c.sub}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ لمن صُنعت — role cards (cream) ═══ */}
        <section id="roles" className="rl-section" aria-labelledby="roles-title">
          <header className="pd-head">
            <span className="fo-label"><span className="fo-mono">٠٠٥</span> — لمن صُنعت</span>
            <RevealCssClass as="h2" className="pd-title" delay={1} id="roles-title">
              منصّة واحدة، <em>خمسة مسارات</em>
            </RevealCssClass>
          </header>

          <ul className="rl-cards">
            {ROLE_CARDS.map((r, i) => (
              <RevealCssClass as="li" key={r.tag} className="rl-card" delay={((i % 3) + 1) as 1 | 2 | 3}>
                <figure className="rl-card-media">
                  <img src={r.img} srcSet={srcset480(r.img)} sizes="(max-width: 900px) 88vw, 360px" alt="" loading="lazy" decoding="async" />
                </figure>
                <div className="rl-card-body">
                  <span className="rl-card-tag"><Icon icon={r.icon} size={14} /> {r.tag}</span>
                  <h3 className="rl-card-title">{r.title}</h3>
                  <p className="rl-card-lede">{r.lede}</p>
                </div>
              </RevealCssClass>
            ))}
          </ul>

          <RevealCssClass as="p" className="rl-more" delay={3}>
            ولضمان الجودة ومالك المنصّة: مساحتان للمتابعة بصلاحيات منفصلة —
            بهما تكتمل الأدوار الخمسة.
          </RevealCssClass>
        </section>

        {/* ═══ إلى أين — the parallax vision stage ═══
            The reference's Starforge grammar: giant brand wordmark over a
            parallax backdrop, body column, and honest status pairs. */}
        <section className="vs-section" aria-labelledby="vs-title" ref={visionRef}>
          <div className="vs-bg" aria-hidden>
            <img src="/brand/vision-bg.webp" srcSet="/brand/vision-bg-768.webp 768w, /brand/vision-bg.webp 1536w" sizes="100vw" alt="" loading="lazy" decoding="async" />
          </div>
          <div className="vs-inner">
            <span className="fo-label vs-label"><span className="fo-mono">٠٠٦</span> — إلى أين</span>
            <h2 className="vs-wordmark" aria-hidden="true">مدارك</h2>
            <div className="vs-copy">
              <RevealCssClass as="h3" className="vs-title" delay={1} id="vs-title">
                نحو تعليمٍ <em>يعرف كلَّ طالب</em>
              </RevealCssClass>
              <RevealCssClass as="p" className="vs-lede" delay={2}>
                نبني منظومة تتذكّر ما شاهد الطالب وما أخطأ وما ينقصه —
                ثم تقترح الخطوة التالية. بلا أرقام مختلقة ولا وعود بلا تنفيذ:
                كل حالة أدناه كما هي في النظام اليوم.
              </RevealCssClass>
              <RevealCssClass as="ul" className="vs-status" delay={3}>
                {VISION_STATUS.map((s) => (
                  <li key={s.k} className={s.live ? 'is-live' : undefined}>
                    <span className="vs-status-k"><Icon icon={s.live ? Check : FlaskConical} size={13} /> {s.k}</span>
                    <span className="vs-status-v">{s.v}</span>
                  </li>
                ))}
              </RevealCssClass>
            </div>
          </div>
        </section>

        {/* ═══ مبدأ مدارك — the quote card ═══ */}
        <section id="qt" className="qt-section" aria-labelledby="qt-title">
          <figure className="qt-card">
            <div className="qt-corners" aria-hidden>
              <span className="qt-corner qt-c-tl" /><span className="qt-corner qt-c-br" />
            </div>
            <div className="qt-media">
              <img src="/brand/orbit-ring.webp" srcSet="/brand/orbit-ring-480.webp 480w, /brand/orbit-ring.webp 800w" sizes="(max-width: 900px) 88vw, 380px" alt="" loading="lazy" decoding="async" />
            </div>
            <blockquote className="qt-body">
              <RevealCssClass as="p" className="qt-text" delay={1}>
                «بُنيت مدارك على مبدأ واحد: أن يعرف الطالب ما ينقصه،
                وأن تصدق المنصّة فيما تعرضه.»
              </RevealCssClass>
              <figcaption className="qt-attribution">
                <span className="fo-mono">—</span> مبدأ مدارك
              </figcaption>
            </blockquote>
          </figure>
        </section>

        {/* ═══ الخاتمة ═══ */}
        <section className="fo-cta" aria-label="ابدأ رحلتك — أنشئ حسابك">
          <span className="fo-cta-star" aria-hidden>
            <StarMark size={48} withHalo />
          </span>
          <div className="fo-cta-inner">
            <RevealCssClass as="h2" className="fo-cta-title" delay={1}>
              جاهزٌ لبدء <em>رحلتك</em>؟
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-cta-lede" delay={2}>
              أنشئ حسابك الجامعي في دقائق — بالبريد الجامعي أو رقم قيدك —
              وتابع تقدّمك من أوّل محاضرة.
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
              مدارك · {AR(year)} · منصّة تعليمية مستقلّة
            </RevealCssClass>
          </div>
        </section>
      </main>

      {/* ── COLOPHON FOOTER — with the giant wordmark rush ── */}
      <footer className="fo-footer" ref={footerRef}>
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
                {/* r188 honesty pin: «اصطناعية بالكامل» must stay contiguous
                    on one source line (the r188-brand-integrity gate). */}
                منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «جامعة مدارك التجريبية» — مؤسّسة اصطناعية بالكامل لأغراض العرض.
              </p>
            </div>
            <nav className="fo-footer-col" aria-label="روابط المنصّة">
              <div className="fo-footer-heading">المنصّة</div>
              <a href="#journey" className="fo-footer-link">كيف تعمل</a>
              <a href="#system" className="fo-footer-link">المنظومة</a>
              <a href="#live" className="fo-footer-link">ما يعمل اليوم</a>
              <Link to="/colleges" className="fo-footer-link">الجامعة التجريبية</Link>
            </nav>
            <nav className="fo-footer-col" aria-label="روابط الحساب">
              <div className="fo-footer-heading">الحساب</div>
              <Link to="/auth/register" className="fo-footer-link">إنشاء حساب جامعي</Link>
              <Link to="/auth" className="fo-footer-link">تسجيل الدخول</Link>
            </nav>
            <nav className="fo-footer-col" aria-label="عن المشروع">
              <div className="fo-footer-heading">المشروع</div>
              <a href="#qt" className="fo-footer-link">مبدأ مدارك والبيانات</a>
              <a
                href="https://github.com/ahmadmedo1012/madarek"
                className="fo-footer-link"
                target="_blank"
                rel="noreferrer"
              >
                الشيفرة المفتوحة
              </a>
              <a href="#main" className="fo-footer-link">أعلى الصفحة</a>
            </nav>
          </div>
          <div className="fo-footer-bottom">
            <span className="fo-mono">© {AR(year)} مدارك</span>
            <span className="fo-footer-cluster">منصّة مستقلّة · عربية أولًا</span>
          </div>
          {/* the giant closing wordmark — parallax rush like the reference */}
          <div className="fo-footer-mark" aria-hidden="true">مدارك</div>
        </div>
      </footer>
    </div>
  );
}
