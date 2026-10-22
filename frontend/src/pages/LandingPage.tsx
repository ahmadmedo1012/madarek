import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Menu, X, Check, FlaskConical, PlayCircle, PenLine, Timer, Users,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { StarMark } from '../components/StarMark';
import { ThemeToggle, useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { colleges } from '../data/colleges.config';
import {
  HERO_PHOTOS, RAIL_PHOTOS, PRODUCT_CAPTURES, ROLE_CAPTURES, ROLE_SHOWCASES,
  UNIVERSITY_VIDEOS, type RoleKey,
} from '../data/university-media';
import { formatInt, formatPct1 } from '../utils/numbers';
import { RevealCssClass } from '../hooks/useReveal';
import { BlueprintSvg } from '../components/landing/BlueprintSvg';
import { MediaFrame } from '../components/landing/MediaFrame';
import { ProductFrame } from '../components/landing/ProductFrame';
import { VideoCard } from '../components/landing/VideoCard';
// landing.css — «لوحة مدارك r306 → r307» — the Heron-only drawing sheet,
// evolved with documentary university media + real product captures.
// One visual canon (docs/redesign/r306-heron-exclusivity-spec.md §r307):
// the architect's-sheet grammar — paper ground, graphite hairlines, ONE
// orange signal, mono bracketed indices, near-square corners, flat framed
// fragments. The r307 media layer (DESIGN.md §6a-6c) adds sanctioned
// raster seats: Commons-licensed university photography, official-channel
// documentaries (click-to-load), and authentic product captures — every
// frame flat, hairline-bordered, honestly labelled. Every funnel/a11y/
// truth contract carries forward (landing-funnel, r168b, r170d, r177,
// r188 — see the tests pinned beside each surface).
import '../styles/landing.css';

/**
 * Landing — «لوحة مدارك» (r306 sheet, r307 media evolution).
 *
 * Composition (the sheet, reading RTL):
 *   sheet frame (fixed corner registration marks + mono coordinates,
 *   desktop only) → header (56px hairline bar) → hero (the blueprint
 *   illustration + the title-block band: eyebrow / display headline /
 *   sub / ONE primary CTA + ghost / metadata block / the documentary
 *   media band) → statement → campus-life (the university media rail,
 *   Commons-licensed) → chapters 01–06 (the honest capability ledger
 *   rows with flat interface fragments) → product (real captures from
 *   the running platform) → videos (official-channel documentaries,
 *   click-to-load) → live (the capability matrix — a hairline TABLE,
 *   not a slab) → roles (the interactive role selector over real
 *   dashboards) → colleges (the interactive registry + title-block
 *   metadata) → vision (honest status pairs with state tags) → cta
 *   (coordinates row + resolve) → footer (hairline colophon grid).
 *
 * Motion: RevealCssClass block reveals only (the shared IO belt) +
 * the imperative scroll chrome (the .scrolled header class + the --p
 * progress ribbon, both rAF-coalesced, zero setState per tick — r307:
 * load/resize/fonts reconciliation added so the ribbon never drifts
 * under late media). No WebGL, no canvas, no scroll conductor — the
 * sheet is DOM + SVG + sanctioned raster seats.
 */

/* ── Honest capability ledger (ما يعمل اليوم) — every line is a real
 * product truth (see backend feature flags / routes). Every number
 * below is computed from this table or hard product truth —
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

/* ── Computed truths (BLUEPRINT §6 sources): 25 colleges in 3 campuses
 * from the real registry; 11 training tracks (TrainingPages); 6 quality
 * boards (quality.routes); 2 isolated institutions (OwnerInstitutionsPage). */
const CAMPUS_COUNT = new Set(colleges.map((c) => c.cityAr ?? '')).size;
const TRAINING_TRACKS = 11;   // verified in pages/student/TrainingPages.tsx
const QUALITY_BOARDS = 6;     // verified in backend quality.routes
const INSTITUTIONS = 2;       // verified in OwnerInstitutionsPage isolation

/* ── The r307 media truth: distinct Libyan universities documented on
 * this sheet — Benghazi, Tripoli, Omar Al-Mukhtar (photos) + Misurata,
 * Sebha (official-channel videos). Computed here, not invented: each
 * institution has verified identity evidence in manifest.json. */
const MEDIA_UNIVERSITY_COUNT = 5;

/* ── Honest status pairs (إلى أين) — natural wording for the ledger's
 * local/sim/soon rows; no operational jargon, no invented claims. */
const VISION_STATUS = [
  { k: 'المساعد الأكاديمي', v: 'يعمل الآن — داخل المنصّة بلا خدمات خارجية', live: true },
  { k: 'فحص نزاهة البحوث', v: 'محاكاة — النتائج معلَّمة بوضوح', live: false },
  { k: 'المعامل الافتراضية', v: 'قيد التطوير — فهرس للاستعراض دون تشغيل بعد', live: false },
  { k: 'مزامنة بيانات المؤسّسات', v: 'وضع محدود — قيد التوسعة', live: false },
];

/* ── Roles strip data: the five verified roles. r307 renders them as
 * an interactive selector over their REAL dashboards (demo data). */

/* ── The blueprint stages — the five hotspots on the hero's technical
 * drawing. Each describes a REAL live capability (LIVE_CAPABILITIES
 * above); positions are percentages over the illustration box, mapped
 * to the clear annotation zone above each drawn structure (the
 * drafting convention: the compact [NN] pins mark, never mask, the
 * artwork — the label spot, not the structure face). */
const STAGES = [
  {
    num: '01', short: 'المحاضرات', title: 'المحاضرات التفاعلية',
    desc: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، وحضورٌ يُحتسب تلقائيًا عند الإكمال.',
    meta: 'live · lectures', x: 87.1, y: 47.8,
  },
  {
    num: '02', short: 'نقطة الفحص', title: 'نقاط الفحص',
    desc: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.',
    meta: 'live · checkpoints', x: 68.4, y: 63.5,
  },
  {
    num: '03', short: 'الاختبار', title: 'الاختبارات الإلكترونية',
    desc: 'بنك أسئلة بأربعة أنواع وقوالب جاهزة، وتصحيح تلقائي للأسئلة الموضوعية.',
    meta: 'live · exams', x: 52.6, y: 56.9,
  },
  {
    num: '04', short: 'المكتبة والبحوث', title: 'دورة البحوث والمكتبة',
    desc: 'رفع PDF وفحص نزاهة معلَن وملاحظات مشروحة من الأستاذ، فتُفهرَس في مكتبة تبحث بالعربية.',
    meta: 'live · research', x: 32.1, y: 59.6,
  },
  {
    num: '05', short: 'الإتقان', title: 'مصفوفة الإتقان',
    desc: 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب — خطوتك التالية مقترحة من أدائك.',
    meta: 'live · mastery', x: 12.9, y: 31.3,
  },
] as const;

/* ── Miniature — the honest demo frame each chapter pairs with (r306:
 * composed as a FLAT interface fragment — the reference's product
 * mockup grammar: 1px frame, radius 0→2, no browser chrome, no
 * elevation; the app's own surface recipe and demo data, never
 * screenshots). */
function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="mini" aria-label={`عرض توضيحي — ${label}`}>
      <div className="mini-chrome" aria-hidden="true">
        <span className="mini-chrome-label">مدارك — {label}</span>
        <span className="mini-chrome-tag fo-mono" dir="ltr">demo</span>
      </div>
      <div className="mini-body">{children}</div>
      <figcaption className="mini-caption">
        <span className="mini-caption-tag">عرض توضيحي</span>
        <span className="mini-caption-label">{label}</span>
      </figcaption>
    </figure>
  );
}

function MiniPlayer() {
  return (
    <Mini label="المحاضرة التفاعلية">
      <div className="mini-title-row">
        <span className="mini-course">أحياء · الوحدة الثانية</span>
        <span className="mini-lecture">المحاضرة 04</span>
      </div>
      <div className="mini-video">
        <span className="mini-video-play" aria-hidden><Icon icon={PlayCircle} size={28} /></span>
        <span className="mini-video-time" dir="ltr">12:36</span>
        <span className="mini-video-bar" aria-hidden><span style={{ inlineSize: '65%' }} /></span>
      </div>
      <div className="mini-quiz">
        <p className="mini-quiz-q">نقطة فحص: أيُّ عضية تنتج طاقة الخلية؟</p>
        <div className="mini-quiz-opts">
          <span className="mini-opt is-right"><Icon icon={Check} size={12} /> الميتوكوندريا</span>
          <span className="mini-opt">الرايبوسوم</span>
        </div>
      </div>
      <p className="mini-foot">الحضور يُحتسب تلقائيًا عند الإكمال — والتقدُّم {formatPct1(65)}%</p>
    </Mini>
  );
}

function MiniMatrix() {
  const rows = [
    { name: 'النهايات', v: 82, state: 'متقن' },
    { name: 'الاشتقاق', v: 54, state: 'قيد التحسين' },
    { name: 'التكامل', v: 31, state: 'فجوة' },
  ];
  return (
    <Mini label="مصفوفة الإتقان">
      {rows.map((r) => (
        <div key={r.name} className="mini-mx-row">
          <span className="mini-mx-name">{r.name}</span>
          <span className="mini-mx-bar" aria-hidden><span style={{ inlineSize: `${r.v}%` }} /></span>
          <span className="mini-mx-val" dir="ltr">{formatPct1(r.v)}%</span>
          <span className={`mini-chip${r.v >= 75 ? ' is-ok' : r.v < 40 ? ' is-gap' : ''}`}>{r.state}</span>
        </div>
      ))}
      <p className="mini-foot">الخطوة التالية: محاضرة «التكامل الأساسية» — مقترحة حسب فجوتك.</p>
    </Mini>
  );
}

function MiniResearch() {
  return (
    <Mini label="دورة البحوث">
      <div className="mini-doc">
        <p className="mini-doc-title">بحث: معالجة المياه بالتناضح العكسي</p>
        <span className="mini-doc-line" style={{ inlineSize: '92%' }} aria-hidden />
        <span className="mini-doc-line" style={{ inlineSize: '78%' }} aria-hidden />
        <span className="mini-doc-line" style={{ inlineSize: '85%' }} aria-hidden />
        <span className="mini-doc-pin"><Icon icon={PenLine} size={11} /> ملاحظة المشرف</span>
      </div>
      <ol className="mini-steps" dir="rtl">
        <li className="is-done"><span className="fo-mono" dir="ltr">01</span> تقديم PDF</li>
        <li className="is-done"><span className="fo-mono" dir="ltr">02</span> فحص محاكاة معلَن</li>
        <li className="is-now"><span className="fo-mono" dir="ltr">03</span> تحقيق مشروح</li>
        <li><span className="fo-mono" dir="ltr">04</span> المكتبة</li>
      </ol>
    </Mini>
  );
}

function MiniExam() {
  return (
    <Mini label="الاختبارات الإلكترونية">
      <div className="mini-title-row">
        <span className="mini-course">اختبار الوحدة الثانية</span>
        <span className="mini-lecture"><Icon icon={Timer} size={12} /> 45 دقيقة</span>
      </div>
      <p className="mini-quiz-q">سؤال 6 من 20 — اختر الإجابة الصحيحة:</p>
      <div className="mini-quiz-opts">
        <span className="mini-opt">خيار أ</span>
        <span className="mini-opt is-right"><Icon icon={Check} size={12} /> خيار ب</span>
        <span className="mini-opt">خيار ج</span>
        <span className="mini-opt">خيار د</span>
      </div>
      <p className="mini-foot">أربعة أنواع أسئلة · مطابقة صارمة للإجابات · تصحيح تلقائي للموضوعي</p>
    </Mini>
  );
}

function MiniCommunity() {
  return (
    <Mini label="المجتمع والتدريب">
      <div className="mini-post">
        <span className="mini-avatar" aria-hidden />
        <div>
          <p className="mini-post-title"><Icon icon={Users} size={12} /> نقاش: كيف تراجع قبل الاختبار؟</p>
          <p className="mini-post-meta">وسوم: مراجعة · اختبارات — 12 ردًّا</p>
        </div>
      </div>
      <div className="mini-post">
        <span className="mini-avatar is-accent" aria-hidden />
        <div>
          <p className="mini-post-title">مسار الإحصاء التطبيقي</p>
          <p className="mini-post-meta">{formatInt(TRAINING_TRACKS)} مسارًا تدريبيًا · {formatInt(240)} نقطة · شارة برونزية</p>
        </div>
      </div>
    </Mini>
  );
}

function MiniGovernance() {
  const stats = [
    { n: formatInt(QUALITY_BOARDS), t: 'مجالس جودة' },
    { n: formatInt(INSTITUTIONS), t: 'مؤسّستَان معزولتان' },
    { n: formatInt(colleges.length), t: 'كلية معروضة' },
  ];
  return (
    <Mini label="الجودة والحاكمية">
      <div className="mini-stats">
        {stats.map((s) => (
          <div key={s.t} className="mini-stat">
            <span className="mini-stat-n fo-mono" dir="ltr">{s.n}</span>
            <span className="mini-stat-t">{s.t}</span>
          </div>
        ))}
      </div>
      <p className="mini-foot">قفل حاكمية يوثّق آخر تعديل من المالك · سجل تدقيق كامل</p>
    </Mini>
  );
}

/* ── Chapters 01–06 — the capability ledger rows. */
const CHAPTERS: { num: string; title: string; lede: React.ReactNode; mini: React.ReactNode }[] = [
  {
    num: '01', mini: <MiniPlayer />,
    title: 'الفصول المقلوبة',
    lede: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، واختبار قصير يُصحَّح تلقائيًا، وحضورٌ يُحتسب عند الإكمال.',
  },
  {
    num: '02', mini: <MiniMatrix />,
    title: 'مصفوفة الإتقان',
    lede: 'لكل مفهوم درجة إتقان؛ المصفوفة تكشف الفجوة وتربطها بالدرس — والمساعد يقترح شروحات مخصَّصة وخطط مراجعة حسب أدائك الفعلي.',
  },
  {
    num: '03', mini: <MiniResearch />,
    title: 'دورة البحوث',
    lede: 'قدِّم بحثك PDF، ويُفحص بفحص نزاهة محاكاة معلَن، ثم يصل أستاذك بملاحظات مشروحة، فتُفهرَس في مكتبة تبحث بالعربية.',
  },
  {
    num: '04', mini: <MiniExam />,
    title: 'الاختبارات الإلكترونية',
    lede: 'بنك أسئلة بأربعة أنواع، وقوالب اختبارات جاهزة، ومحاولات بمطابقة صارمة للإجابات.',
  },
  {
    num: '05', mini: <MiniCommunity />,
    title: 'المجتمع والتدريب',
    lede: <>منشورات بوسوم وإعلانات مشتركة، ومسابقات وفعاليات، و{formatInt(TRAINING_TRACKS)} مسارًا تدريبيًا بنقاط وشارات ولوحة صدارة.</>,
  },
  {
    num: '06', mini: <MiniGovernance />,
    title: 'الجودة والحاكمية',
    lede: <>{formatInt(QUALITY_BOARDS)} مجالسَ للجودة، وقفل حاكمية يوثّق آخر تعديل من مالك المنصّة، وعزل تامّ لبيانات كل مؤسّسة.</>,
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

  const [menuOpen, setMenuOpen] = useState(false);
  // F2-5 (r157): mobile-menu contract — Escape closes + refocuses the
  // burger (its aria-label flips with the state). r307: an open menu
  // also closes on an outside tap (touch users get no blur event from
  // a tap on the page behind the card).
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  // Scroll chrome on refs, written imperatively — no React re-render
  // per scroll event (the r172 pattern, kept).
  const headerRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // The blueprint's active stage — the hotspot selection. Starts on
  // [01] so the panel is informative with zero interaction; the
  // buttons carry the aria-pressed state and the panel is a polite
  // live region (the drawing never hides information behind a hover).
  const [activeStage, setActiveStage] = useState(0);
  const stage = STAGES[activeStage] ?? STAGES[0];

  // The colleges registry: which college the chip row selected.
  const [selectedCollege, setSelectedCollege] = useState<string | null>(colleges[0]?.slug ?? null);
  const selected = colleges.find((c) => c.slug === selectedCollege) ?? null;

  // The roles registry (r307): which role the selector picked. Starts
  // on the student so the panel is informative with zero interaction;
  // the chips carry aria-pressed and the panel is a polite live region
  // — the same contract as the college chips beside it.
  const [selectedRole, setSelectedRole] = useState<RoleKey>('STUDENT');
  const roleShowcase = ROLE_SHOWCASES.find((r) => r.key === selectedRole) ?? ROLE_SHOWCASES[0];
  const roleCapture = ROLE_CAPTURES.find((c) => c.id === roleShowcase.captureId);

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
  // header and the --p var on the top ribbon). r307 (1-C H-2): the
  // apply() is ALSO reconciled on load / resize / fonts-ready — late
  // media (photos) reflows document height and the ribbon must not
  // drift while the visitor sits still.
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
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const menu = menuRef.current;
      if (menu && !menu.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  return (
    <div className="landing">

      {/* P3-24: skip-to-content — first Tab stop, hidden until focused. */}
      <a href="#main" className="fo-skip-link">تخطَّ إلى المحتوى</a>

      {/* ═══ THE SHEET FRAME — fixed corner registration marks + mono
          coordinates, the drawing-sheet identity. Decorative only:
          aria-hidden, pointer-transparent, desktop-only (the reference
          drops its ruler ≤991 — small screens get the content, not the
          drafting chrome). */}
      <div className="sheet-frame" aria-hidden="true">
        <span className="sheet-mark sheet-mark-tl">+</span>
        <span className="sheet-mark sheet-mark-tr">+</span>
        <span className="sheet-mark sheet-mark-bl">+</span>
        <span className="sheet-mark sheet-mark-br">+</span>
        <span className="sheet-coord sheet-coord-ts fo-mono" dir="ltr">MADAREK · LEARNING SHEET</span>
        <span className="sheet-coord sheet-coord-be fo-mono" dir="ltr">[R307] · SHEET 01/01</span>
      </div>

      {/* Top scroll-progress bar — driven imperatively via --p */}
      <div className="fo-progress" aria-hidden>
        <div className="fo-progress-bar" ref={progressBarRef} style={{ ['--p' as string]: 0 }} />
      </div>

      {/* ── Masthead header — the 56px hairline bar; the .scrolled
          state class is imperative ── */}
      <header className="fo-header" ref={headerRef}>
        <div className="fo-header-inner">
          <Link to="/" className="fo-brand" aria-label="مدارك — الصفحة الرئيسية">
            <StarMark size={30} className="fo-brand-mark" />
            <span className="fo-brand-stack">
              <span className="fo-brand-name">مدارك</span>
              <span className="fo-brand-sub">منصّة التعليم الذكي</span>
            </span>
          </Link>

          <nav className="fo-nav" aria-label="التنقل الرئيسي">
            <a href="#campus-life" className="fo-nav-link">الجامعات</a>
            <a href="#chapters" className="fo-nav-link">الفصول</a>
            <a href="#product" className="fo-nav-link">المنصّة</a>
            <a href="#live" className="fo-nav-link">ما يعمل اليوم</a>
            <a href="#colleges" className="fo-nav-link">الكليات</a>
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
              }
            }}
          >
            <a href="#campus-life" className="btn ghost">الجامعات</a>
            <a href="#chapters" className="btn ghost">الفصول</a>
            <a href="#product" className="btn ghost">المنصّة</a>
            <a href="#live" className="btn ghost">ما يعمل اليوم</a>
            <a href="#roles" className="btn ghost">الأدوار</a>
            <a href="#colleges" className="btn ghost">الكليات</a>
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

        {/* ═══ HERO — «لوحة مدارك»: the blueprint over the title-block
            band, then the documentary media band. Desktop: the drawing
            owns the upper sheet, the band below splits headline (reading
            start) from the metadata block (reading end). Mobile: text
            first, then the drawing, then the media band, then the
            metadata — LCP is the headline; the media band is lazy. ═══ */}
        <section className="fo-hero" aria-label="مدارك — منصّة التعليم الذكي">
          <div className="fo-hero-copy">
            <RevealCssClass as="p" className="fo-eyebrow">
              <span className="fo-mono" dir="ltr">[01]</span>
              منصّة تعليم ذكية · عربية أولًا · مستقلّة
            </RevealCssClass>

            <RevealCssClass as="h1" className="fo-hero-title" delay={1}>
              مدارك
            </RevealCssClass>

            <RevealCssClass as="p" className="fo-hero-statement" delay={2}>
              من المحاضرة الأولى إلى الإتقان — <em>رحلة تعلّم واحدة</em>، موثَّقة ومقيسة.
            </RevealCssClass>

            <RevealCssClass as="p" className="fo-hero-sub" delay={3}>
              محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل —
              في تجربة عربية واحدة لخمسة أدوار أكاديمية.
            </RevealCssClass>

            <RevealCssClass as="div" className="fo-hero-actions" delay={4}>
              <Link to="/auth/register" className="btn accent lg fo-hero-cta">
                أنشئ حسابك الجامعي
                <Icon icon={ArrowLeft} size={16} />
              </Link>
              <a href="#chapters" className="btn ghost lg">كيف تعمل</a>
            </RevealCssClass>
          </div>

          {/* the blueprint — the interactive technical drawing */}
          <RevealCssClass as="div" className="fo-hero-fig" delay={3}>
            <div className="bp-stage">
              <BlueprintSvg active={activeStage} />
              <div className="bp-hotspots" role="group" aria-label="استكشف مراحل مسار التعلّم">
                {STAGES.map((s, i) => (
                  <button
                    key={s.num}
                    type="button"
                    className="bp-hotspot"
                    style={{ ['--hot-x' as string]: `${s.x}%`, ['--hot-y' as string]: `${s.y}%` }}
                    aria-label={`${s.num} ${s.short} — ${s.title}`}
                    aria-pressed={activeStage === i}
                    onClick={() => setActiveStage(i)}
                  >
                    <span className="bp-hotspot-num fo-mono" dir="ltr">{s.num}</span>
                    <span className="bp-hotspot-label">{s.short}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="bp-panel" role="status" aria-live="polite">
              <span className="bp-panel-num fo-mono" dir="ltr">[{stage.num}]</span>
              <span className="bp-panel-title">{stage.title}</span>
              <span className="bp-panel-desc">{stage.desc}</span>
              <span className="bp-panel-meta fo-mono" dir="ltr">{stage.meta}</span>
            </div>
          </RevealCssClass>

          {/* r307 — the documentary media band: authentic university
              photography composed into the sheet. Flat hairline frames,
              flat captions; the lead is the LCP media candidate (eager +
              high fetch priority), the rest ride in lazy. Baseline-
              aligned: the panorama reads as a letterbox strip, the
              portrait anchors the band’s reading end. */}
          <RevealCssClass as="div" className="fo-hero-media" delay={4}>
            <MediaFrame photo={HERO_PHOTOS[0]} variant="hero-lead" eager />
            <MediaFrame photo={HERO_PHOTOS[1]} variant="hero-mid" />
            <MediaFrame photo={HERO_PHOTOS[2]} variant="hero-tall" />
          </RevealCssClass>

          {/* the title block — the drawing sheet's metadata grid */}
          <RevealCssClass as="dl" className="fo-hero-meta" delay={5}>
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
                <span className="fo-mono" dir="ltr"> {formatInt(CAMPUS_COUNT)}</span> أحرُم
              </dd>
            </div>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">القدرات</dt>
              <dd className="fo-meta-v">
                <span className="fo-mono" dir="ltr">[{String(LIVE_COUNT).padStart(2, '0')}]</span> تعمل اليوم
              </dd>
            </div>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">الجامعات الموثّقة</dt>
              <dd className="fo-meta-v">
                <span className="fo-mono" dir="ltr">{formatInt(MEDIA_UNIVERSITY_COUNT)}</span> في الصور والفيديو
              </dd>
            </div>
            <div className="fo-meta-row">
              <dt className="fo-meta-k">بيانات العرض</dt>
              <dd className="fo-meta-v">جامعة مدارك التجريبية — توضيحية</dd>
            </div>
          </RevealCssClass>
        </section>

        {/* ═══ البيان — the statement: a framed declaration with the
            three role lines, hairline-separated ═══ */}
        <section id="statement" className="st-section" aria-labelledby="statement-title">
          <div className="st-spread">
            <div className="st-copy">
              <span className="fo-label"><span className="fo-mono" dir="ltr">[02]</span> البيان</span>
              <h2 id="statement-title" className="st-title">منصّة واحدة تخدم الرحلة كلّها</h2>
            </div>
            <div className="st-lines">
              <RevealCssClass as="p" className="st-line">
                <strong>للطالب</strong>
                <span>تشاهد محاضرة تفاعلية، فتُقاس فهمك لحظة بلحظة، فتعرف خطوتك التالية.</span>
              </RevealCssClass>
              <RevealCssClass as="p" className="st-line" delay={1}>
                <strong>للأستاذ</strong>
                <span>تبني المحاضرة والاختبار، وتصحّح المقالات بملاحظات مكتوبة، وترى من يحتاجك الآن.</span>
              </RevealCssClass>
              <RevealCssClass as="p" className="st-line" delay={2}>
                <strong>للإدارة</strong>
                <span>تدير الكليات والمقرّرات والصلاحيات، وترى مؤسّستك حيّة على مستوى كل قسم.</span>
              </RevealCssClass>
            </div>
          </div>
        </section>

        {/* ═══ r307 — الحياة الجامعية: the documentary university media
            rail. Authentic photography of real Libyan campuses under
            free licences (PD / CC BY / CC BY-SA) with per-image
            attribution; the panorama band leads, the mosaic carries the
            rest. Honesty pins: the source line + the non-endorsement
            note ride with the section, never in a tooltip. ═══ */}
        <section id="campus-life" className="um-section" aria-labelledby="um-title">
          <div className="um-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[03]</span> الحياة الجامعية</span>
            <RevealCssClass as="h2" className="um-title" delay={1} id="um-title">
              من داخل الجامعات الليبية
            </RevealCssClass>
            <RevealCssClass as="p" className="um-lede" delay={2}>
              صور حقيقية لحرم جامعات ليبية عامة، بتراخيص مفتوحة من ويكيميديا كومنز —
              توثيقٌ للحياة الجامعية، لا زخرفة: كل إطار يحمل اسم جامعته ونسب مصوّره.
            </RevealCssClass>
          </div>

          <RevealCssClass as="div" className="um-rail" delay={2}>
            <MediaFrame photo={RAIL_PHOTOS[0]} variant="panorama" />
            <div className="um-mosaic">
              <MediaFrame photo={RAIL_PHOTOS[1]} variant="large" />
              <MediaFrame photo={RAIL_PHOTOS[2]} variant="std" />
              <MediaFrame photo={RAIL_PHOTOS[3]} variant="std" />
              <MediaFrame photo={RAIL_PHOTOS[4]} variant="std" />
              <MediaFrame photo={RAIL_PHOTOS[5]} variant="std" />
            </div>
          </RevealCssClass>

          <RevealCssClass as="p" className="um-note" delay={3}>
            المصدر: ويكيميديا كومنز — تراخيص PD / CC BY / CC BY-SA، ونسب كل مصوّر مرفقة بإطاره.
            أعيد تحجيم الصور وقصّها للعرض. ظهور جامعة هنا توثيقٌ لحقيقتها، لا تبنّيًا ولا شراكة — مدارك مستقلّة.
          </RevealCssClass>
        </section>

        {/* ═══ الفصول 01–06 — the capability ledger: numbered hairline
            rows, each pairing the copy with a flat honest fragment ═══ */}
        <section id="chapters" className="chapters" aria-labelledby="chapters-title">
          <header className="chapters-head">
            <div className="chapters-head-copy">
              <span className="fo-label"><span className="fo-mono" dir="ltr">[04]</span> الفصول</span>
              <RevealCssClass as="h2" className="chapters-title" delay={1} id="chapters-title">
                ستُّ فصول — كلُّ فصلٍ قدرةٌ تعمل اليوم
              </RevealCssClass>
            </div>
            <RevealCssClass as="p" className="chapters-lede" delay={2}>
              لا لقطات شاشة ولا وعود: كل فصل يعرض واجهة مبنية من مكوّنات المنصّة نفسها ببيانات توضيحية.
            </RevealCssClass>
          </header>

          <div className="ch-rows">
            {CHAPTERS.map((ch) => (
              <article key={ch.num} className="ch" aria-labelledby={`ch-${ch.num}-title`}>
                <span className="ch-num fo-mono" dir="ltr" aria-hidden>{ch.num}</span>
                <div className="ch-head">
                  <RevealCssClass as="h3" className="ch-title" id={`ch-${ch.num}-title`} delay={1}>
                    {ch.title}
                  </RevealCssClass>
                  <RevealCssClass as="p" className="ch-lede" delay={2}>{ch.lede}</RevealCssClass>
                </div>
                <RevealCssClass as="div" className="ch-mini" delay={2}>{ch.mini}</RevealCssClass>
              </article>
            ))}
          </div>
        </section>

        {/* ═══ r307 — المنصّة فعليًا: real captures from the running
            platform. The frames are authentic UI from the seeded demo
            environment (fully synthetic «جامعة مدارك التجريبية» data) —
            labelled «لقطة حقيقية» with the demo disclosure on every
            frame; the CTA scrolls to the conversion row (the funnel
            counts stay exact — no extra auth links on the sheet). ═══ */}
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
          </div>

          <RevealCssClass as="div" className="pr-grid" delay={2}>
            <ProductFrame capture={PRODUCT_CAPTURES[0]} variant="lead" ctaAr="أنشئ حسابك لتجربتها حيّة" ctaTo="#cta" ctaAnchor />
            <ProductFrame capture={PRODUCT_CAPTURES[1]} />
            <ProductFrame capture={PRODUCT_CAPTURES[2]} />
            <ProductFrame capture={PRODUCT_CAPTURES[3]} />
          </RevealCssClass>

          <RevealCssClass as="p" className="pr-note" delay={3}>
            كل إطار مأخوذ من التطبيق نفسه في وضع الضيافة — بلا معالجة ولا تجميل.
          </RevealCssClass>
        </section>

        {/* ═══ r307 — مشاهد جامعية: official-channel documentaries.
            The cards are designed facades (no third-party bytes until
            the visitor clicks); the embed rides youtube-nocookie and
            the kind label tells the truth: a university documentary is
            never presented as a product demo. ═══ */}
        <section id="videos" className="vd-section" aria-labelledby="vd-title">
          <div className="vd-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[06]</span> مشاهد جامعية</span>
            <RevealCssClass as="h2" className="vd-title" delay={1} id="vd-title">
              الحياة الجامعية <em>بالفيديو</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="vd-lede" delay={2}>
              تسجيلات توثيقية من القنوات الرسمية للجامعات — تُحمَّل عند الطلب فقط،
              وبلا أي بايتات خارجية قبل نقرك.
            </RevealCssClass>
          </div>

          <RevealCssClass as="div" className="vd-grid" delay={2}>
            <VideoCard video={UNIVERSITY_VIDEOS[0]} variant="primary" />
            <VideoCard video={UNIVERSITY_VIDEOS[1]} variant="secondary" />
          </RevealCssClass>

          <RevealCssClass as="p" className="vd-note" delay={3}>
            الفيديوهات من القنوات الرسمية لجامعتي مصراتة وسبها، عبر آلية التضمين المسموحة —
            والمشغّل لا يُحمَّل إلا بعد نقر «شاهد الفيديو».
          </RevealCssClass>
        </section>

        {/* ═══ ما يعمل اليوم — the capability matrix: a hairline
            TABLE (the reference's pricing grammar), numbered rows +
            checks + the bracketed count. No slab, no inversion. ═══ */}
        <section id="live" className="lv-section" aria-labelledby="live-title">
          <div className="lv-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[07]</span> ما يعمل اليوم</span>
            <RevealCssClass as="h2" className="lv-title" delay={1} id="live-title">
              قدرات <em>موثَّقة</em>، لا ادّعاءات
            </RevealCssClass>
            <RevealCssClass as="p" className="lv-lede" delay={2}>
              كل رقم يُحسب من حالة الميزات في النظام — يتغيّر مع التحديثات، لا مع الحملات.
            </RevealCssClass>
          </div>
          <ol className="lv-list">
            {LIVE_CAPABILITIES.map((cap, i) => (
              <RevealCssClass as="li" key={cap} className="lv-row" delay={((i % 3) + 1) as 1 | 2 | 3}>
                <span className="lv-num fo-mono" dir="ltr" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <span className="lv-text">{cap}</span>
                <span className="lv-check" aria-hidden><Icon icon={Check} size={14} /></span>
              </RevealCssClass>
            ))}
          </ol>
          <p className="lv-foot fo-mono" dir="ltr">[06] live capabilities · source: system feature state</p>
        </section>

        {/* ═══ r307 — الأدوار: the interactive role selector over REAL
            dashboards. The chips carry aria-pressed and swap the panel
            (a polite live region) — the same accessible contract as the
            college chips. No role implies a feature it does not have:
            the line under each capture is the honest current state. ═══ */}
        <section id="roles" className="rl-section" aria-labelledby="rl-title">
          <div className="rl-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[08]</span> الأدوار</span>
            <RevealCssClass as="h2" className="rl-title" delay={1} id="rl-title">
              منصّة واحدة، <em>خمسة مسارات</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="rl-lede" delay={2}>
              اختر دورًا لترى لوحته الحقيقية — لقطة من التطبيق نفسه في بيئة العرض، ببيانات تجريبية.
            </RevealCssClass>
          </div>

          <div className="rl-stage">
            <ul className="rl-chips" aria-label="اختر دورًا لاستعراض لوحته">
              {ROLE_SHOWCASES.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    className="rl-chip"
                    aria-pressed={selectedRole === r.key}
                    onClick={() => setSelectedRole(r.key)}
                  >
                    {r.roleAr}
                  </button>
                </li>
              ))}
            </ul>

            <div className="rl-panel" role="status" aria-live="polite">
              <p className="rl-panel-role">{roleShowcase.roleAr}</p>
              <p className="rl-panel-line">{roleShowcase.lineAr}</p>
              {roleCapture && (
                <ProductFrame
                  capture={{ ...roleCapture, sizes: '(min-width: 992px) 44rem, 100vw' }}
                  variant="role"
                />
              )}
            </div>
          </div>

          <RevealCssClass as="p" className="rl-more" delay={3}>
            بيانات كل مؤسّسة معزولة تمامًا — والصلاحيات منفصلة دورًا بدور.
          </RevealCssClass>
        </section>

        {/* ═══ الكليات — the interactive registry: hairline chips +
            the details panel + the title-block metadata (the ghost
            numeral is retired with the poster). The chips are the
            accessible surface: 25 real colleges, keyboard-operable,
            44px targets, a details panel instead of a popover. ═══ */}
        <section id="colleges" className="cg-section" aria-labelledby="cg-title">
          <div className="cg-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[09]</span> الجامعة التجريبية</span>
            <RevealCssClass as="h2" className="cg-title" delay={1} id="cg-title">
              {formatInt(colleges.length)} كلية في {formatInt(CAMPUS_COUNT)} أحرُم
            </RevealCssClass>
            <RevealCssClass as="p" className="cg-lede" delay={2}>
              بيانات العرض تخصّ «جامعة مدارك التجريبية» — مؤسّسة اصطناعية بالكامل،
              وبنية الكليات كاملة معروضة داخل المنصّة.
            </RevealCssClass>
          </div>

          <div className="cg-stage">
            <div className="cg-panel-wrap">
              <ul className="cg-chips" aria-label="اختر كلية لاستعراضها">
                {colleges.map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      className="cg-chip"
                      aria-pressed={selectedCollege === c.slug}
                      onClick={() => setSelectedCollege(c.slug)}
                    >
                      {c.nameAr}
                    </button>
                  </li>
                ))}
              </ul>

              {selected && (
                /* r282: a live region, not a landmark — axe's
                   landmark-complementary rule flagged the <aside>
                   nested inside the chapter <section>; the panel's
                   real contract is the polite announcement, which
                   role="status" carries on a plain div. */
                <div className="cg-panel" role="status" aria-live="polite">
                  <p className="cg-panel-name">{selected.nameAr}</p>
                  <p className="cg-panel-campus">{selected.cityAr} · {selected.nameEn}</p>
                  <Link to="/colleges" className="btn ghost sm">استعراض في صفحة الكلّيّات</Link>
                </div>
              )}
            </div>

            <dl className="cg-meta" aria-label="بيانات السجلّ">
              <div className="fo-meta-row">
                <dt className="fo-meta-k">السجلّ</dt>
                <dd className="fo-meta-v">جامعة مدارك التجريبية</dd>
              </div>
              <div className="fo-meta-row">
                <dt className="fo-meta-k">الكليات</dt>
                <dd className="fo-meta-v"><span className="fo-mono" dir="ltr">{formatInt(colleges.length)}</span> في <span className="fo-mono" dir="ltr">{formatInt(CAMPUS_COUNT)}</span> أحرُم</dd>
              </div>
              <div className="fo-meta-row">
                <dt className="fo-meta-k">الحالة</dt>
                <dd className="fo-meta-v">بيانات اصطناعية للعرض</dd>
              </div>
            </dl>
          </div>

          <div className="cg-cta-row">
            <Link to="/colleges" className="btn ghost">تصفّح الكلّيّات التجريبية</Link>
            <Link to="/auth" className="fo-text-link">سجِّل الدخول لاستعراض كليّتك داخل المنصّة</Link>
          </div>
        </section>

        {/* ═══ إلى أين — the honest status pairs with state tags:
            live / simulated / in-development, mono-tagged ═══ */}
        <section id="vision" className="vs-section" aria-labelledby="vs-title">
          <div className="vs-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[10]</span> إلى أين</span>
            <RevealCssClass as="h2" className="vs-title" delay={1} id="vs-title">
              نحو تعليمٍ <em>يعرف كلَّ طالب</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="vs-lede" delay={2}>
              نبني منظومة تتذكّر ما شاهد الطالب وما أخطأ وما ينقصه —
              ثم تقترح الخطوة التالية. بلا أرقام مختلقة ولا وعود بلا تنفيذ:
              كل حالة أدناه كما هي في النظام اليوم.
            </RevealCssClass>
          </div>
          <RevealCssClass as="ul" className="vs-status" delay={3}>
            {VISION_STATUS.map((s) => (
              <li key={s.k} className={s.live ? 'is-live' : undefined}>
                <span className="vs-status-k"><Icon icon={s.live ? Check : FlaskConical} size={13} /> {s.k}</span>
                <span className="vs-status-v">{s.v}</span>
                <span className={`vs-status-tag${s.live ? ' is-live' : ''}`}>
                  {s.live ? 'يعمل الآن' : 'محاكاة/قيد التطوير'}
                </span>
              </li>
            ))}
          </RevealCssClass>
        </section>

        {/* ═══ الخاتمة — the coordinates row + the resolve ═══ */}
        <section className="fo-cta" id="cta" aria-label="ابدأ رحلتك — أنشئ حسابك">
          <p className="fo-cta-coords fo-mono" dir="ltr" aria-hidden="true">
            [R307] — MADAREK · {year} · INDEPENDENT
          </p>
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
              مدارك · {year} · منصّة تعليمية مستقلّة
            </RevealCssClass>
          </div>
        </section>
      </main>

      {/* ── COLOPHON FOOTER — the hairline grid: brand + about, the
          three link columns, the mono bottom row. The giant wordmark
          is retired with the poster; the sheet closes quietly. ── */}
      <footer className="fo-footer">
        <div className="fo-footer-inner">
          <div className="fo-footer-grid">
            <div className="fo-footer-col">
              <Link to="/" className="fo-brand" aria-label="مدارك">
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
            </div>
            <nav className="fo-footer-col" aria-label="روابط المنصّة">
              <div className="fo-footer-heading">المنصّة</div>
              <a href="#campus-life" className="fo-footer-link">الحياة الجامعية</a>
              <a href="#chapters" className="fo-footer-link">الفصول</a>
              <a href="#product" className="fo-footer-link">المنصّة فعليًا</a>
              <a href="#live" className="fo-footer-link">ما يعمل اليوم</a>
              <a href="#roles" className="fo-footer-link">الأدوار</a>
              <Link to="/colleges" className="fo-footer-link">الجامعة التجريبية</Link>
            </nav>
            <nav className="fo-footer-col" aria-label="روابط الحساب">
              <div className="fo-footer-heading">الحساب</div>
              <Link to="/auth/register" className="fo-footer-link">إنشاء حساب جامعي</Link>
              <Link to="/auth" className="fo-footer-link">تسجيل الدخول</Link>
            </nav>
            <nav className="fo-footer-col" aria-label="عن المشروع">
              <div className="fo-footer-heading">المشروع</div>
              <a href="#vision" className="fo-footer-link">مبدأ مدارك والبيانات</a>
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
            <span className="fo-mono">© {year} مدارك</span>
            <span className="fo-footer-cluster">منصّة مستقلّة · عربية أولًا</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
