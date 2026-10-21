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
import { formatInt, formatPct1 } from '../utils/numbers';
import { RevealCssClass } from '../hooks/useReveal';
import { useScrollStage } from '../hooks/useScrollStage';
import { MadarekWorld } from '../components/landing/MadarekWorld';
// landing.css — «ملصق مدارك r304» — the OPTIKKA editorial reconstruction.
// The poster logic on the --poster-* namespace: paper/ink with ONE copper
// signal, oversized Arabic display type, the dotted drafting grid, and
// the 3D knowledge sculpt (three.js progressive enhancement over a
// static SVG twin). r304 rebuilds the DOM composition the way the world
// is staged: every act reserves its intentional empty-space zone —
// the knot takes the reading-end third (statement), the opposite column
// (chapters), the copper close-up window (live), the horizon (roles),
// the panel column (colleges), the passage (vision), the resolve (cta).
// Every funnel/a11y/truth contract carries forward (landing-funnel,
// r168b, r170d, r177, r188) — see the tests pinned beside each surface.
import '../styles/landing.css';

/**
 * Landing — «ملصق مدارك» (r304, the editorial reconstruction).
 *
 * Scroll choreography (the world conductor owns the camera; this sheet
 * owns the composition that gives each chapter its stage):
 *   header (sticky, thin-rule) → hero (brand word + eyebrow + the 3D
 *   knowledge sculpt on the dotted editorial grid + SCROLL cue) →
 *   statement (editorial spread — knot owns the reading-end third) →
 *   chapters 01–06 (numbered spreads, alternating split/bleed/offset,
 *   honest interface fragments) → live (THE COPPER CLIMAX — the
 *   inverted ledger slab beside the knot close-up) → roles (the wide
 *   panorama index) → colleges (the interactive registry, knot behind
 *   the panel column) → vision (the passage — sparse centered) →
 *   closing CTA → colophon footer with the giant wordmark.
 *
 * Semantic hooks (the r304 animation contract, beside the world's
 * data-cam anchors — no second scroll listener, no second framework):
 *   data-story-chapter — mirrors data-cam on every act
 *   data-story-reveal  — every RevealCssClass beat
 *   data-story-media   — the interface fragments + the registry stage
 *   data-story-focus   — the hero word, the copper slab, the passage
 *                        title, the closing resolve
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

/* ── Honest status pairs (إلى أين) — natural wording for the ledger's
 * local/sim/soon rows; no operational jargon, no invented claims. */
const VISION_STATUS = [
  { k: 'المساعد الأكاديمي', v: 'يعمل الآن — داخل المنصّة بلا خدمات خارجية', live: true },
  { k: 'فحص نزاهة البحوث', v: 'محاكاة — النتائج معلَّمة بوضوح', live: false },
  { k: 'المعامل الافتراضية', v: 'قيد التطوير — فهرس للاستعراض دون تشغيل بعد', live: false },
  { k: 'مزامنة بيانات المؤسّسات', v: 'وضع محدود — قيد التوسعة', live: false },
];

/* ── Roles strip: the five verified roles, one line each. */
const ROLES = [
  { role: 'للطالب', line: 'رحلة تعلّم شخصية — من المحاضرة الأولى إلى الإتقان' },
  { role: 'للأستاذ', line: 'بناء المحاضرات والاختبارات، وتصحيح بملاحظات، ومتابعة الطلاب' },
  { role: 'للإدارة', line: 'الكليات والأقسام والمقرَّرات والصلاحيات، وتقارير حيّة' },
  { role: 'لضمان الجودة', line: 'مجالس الجودة والمعايرة وتقارير الالتزام' },
  { role: 'لمالك المنصّة', line: 'الحاكمية والمؤسّسات وسجلّ التدقيق' },
];

/* ── Miniature — the honest demo frame each chapter pairs with (r304:
 * composed as an interface FRAGMENT — the app's own window chrome,
 * surface recipe and demo data; never screenshots). */
function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="mini" aria-label={`عرض توضيحي — ${label}`} data-story-media>
      <div className="mini-chrome" aria-hidden="true">
        <span className="mini-dots"><i /><i /><i /></span>
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

/* ── Chapters 01–06 — alternating poster layouts. */
const CHAPTERS: { num: string; title: string; lede: React.ReactNode; layout: 'split' | 'bleed' | 'offset'; mini: React.ReactNode }[] = [
  {
    num: '01', layout: 'split', mini: <MiniPlayer />,
    title: 'الفصول المقلوبة',
    lede: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، واختبار قصير يُصحَّح تلقائيًا، وحضورٌ يُحتسب عند الإكمال.',
  },
  {
    num: '02', layout: 'bleed', mini: <MiniMatrix />,
    title: 'مصفوفة الإتقان',
    lede: 'لكل مفهوم درجة إتقان؛ المصفوفة تكشف الفجوة وتربطها بالدرس — والمساعد يقترح شروحات مخصَّصة وخطط مراجعة حسب أدائك الفعلي.',
  },
  {
    num: '03', layout: 'split', mini: <MiniResearch />,
    title: 'دورة البحوث',
    lede: 'قدِّم بحثك PDF، ويُفحص بفحص نزاهة محاكاة معلَن، ثم يصل أستاذك بملاحظات مشروحة، فتُفهرَس في مكتبة تبحث بالعربية.',
  },
  {
    num: '04', layout: 'offset', mini: <MiniExam />,
    title: 'الاختبارات الإلكترونية',
    lede: 'بنك أسئلة بأربعة أنواع، وقوالب اختبارات جاهزة، ومحاولات بمطابقة صارمة للإجابات.',
  },
  {
    num: '05', layout: 'split', mini: <MiniCommunity />,
    title: 'المجتمع والتدريب',
    lede: <>منشورات بوسوم وإعلانات مشتركة، ومسابقات وفعاليات، و{formatInt(TRAINING_TRACKS)} مسارًا تدريبيًا بنقاط وشارات ولوحة صدارة.</>,
  },
  {
    num: '06', layout: 'bleed', mini: <MiniGovernance />,
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
  // burger (its aria-label flips with the state).
  const burgerRef = useRef<HTMLButtonElement>(null);
  // Scroll chrome on refs, written imperatively — no React re-render
  // per scroll event (the r172 pattern, kept).
  const headerRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  /* ── Scroll wiring: the footer wordmark rush (--sp on the footer).
   * The hero is now owned by the persistent world's conductor — no
   * section-level --sp needed there anymore. */
  const footerRef = useScrollStage<HTMLElement>({ startOffset: 1, endOffset: 1 });

  // The colleges constellation: which college the chip row selected.
  const [selectedCollege, setSelectedCollege] = useState<string | null>(colleges[0]?.slug ?? null);
  const selected = colleges.find((c) => c.slug === selectedCollege) ?? null;

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
      if (raf) cancelAnimationFrame(apply as unknown as number);
    };
  }, []);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  return (
    <div className="landing">

      {/* ═══ THE PERSISTENT 3D WORLD ═══
          One fixed canvas behind the whole page; the native scroll
          conductor drives its camera through the data-cam chapters.
          Built on the build-threejs-scroll-worlds skill. */}
      <MadarekWorld className="world-layer" />

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
            <StarMark size={30} className="fo-brand-mark" />
            <span className="fo-brand-stack">
              <span className="fo-brand-name">مدارك</span>
              <span className="fo-brand-sub">منصّة التعليم الذكي</span>
            </span>
          </Link>

          <nav className="fo-nav" aria-label="التنقل الرئيسي">
            <a href="#chapters" className="fo-nav-link">الفصول</a>
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
            <a href="#chapters" className="btn ghost">الفصول</a>
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

        {/* ═══ HERO — the poster's first viewport (the sparse open) ═══ */}
        <section className="fo-hero" data-cam="hero" data-story-chapter="hero" aria-label="مدارك — منصّة التعليم الذكي">
          <div className="fo-hero-gridlines" aria-hidden />

          <div className="fo-hero-layer">
            <div className="fo-hero-copy">
              <RevealCssClass as="p" className="fo-eyebrow" data-story-reveal>
                منصّة تعليم ذكية · عربية أولًا · مستقلّة
              </RevealCssClass>
            </div>

            <div className="fo-hero-word" data-story-focus>
              <RevealCssClass as="h1" className="fo-hero-title" delay={1} data-story-reveal>
                مدارك
              </RevealCssClass>

              <RevealCssClass as="p" className="fo-hero-triad" delay={2} data-story-reveal>
                تعلّم · <em>أتقن</em> · ابحث
              </RevealCssClass>
            </div>

            <div className="fo-hero-aside">
              <RevealCssClass as="p" className="fo-hero-sub" delay={3} data-story-reveal>
                محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل —
                في تجربة عربية واحدة لخمسة أدوار أكاديمية.
              </RevealCssClass>

              <RevealCssClass as="div" className="fo-hero-actions" delay={4} data-story-reveal>
                <Link to="/auth/register" className="btn accent lg fo-hero-cta">
                  أنشئ حسابك الجامعي
                  <Icon icon={ArrowLeft} size={16} />
                </Link>
                <a href="#chapters" className="btn ghost lg">كيف تعمل</a>
              </RevealCssClass>

              <RevealCssClass as="ul" className="fo-hero-meta" delay={5} data-story-reveal>
                <li>{formatInt(colleges.length)} كلية</li>
                <li>{formatInt(CAMPUS_COUNT)} أحرُم أكاديمية</li>
                <li>{formatInt(LIVE_COUNT)} قدرات تعمل اليوم</li>
                <li className="fo-hero-meta-note">بيانات العرض توضيحية</li>
              </RevealCssClass>
            </div>
          </div>

          {/* scroll cue — the quiet "keep going" affordance at the edge */}
          <div className="fo-scroll-cue" aria-hidden>
            <span className="fo-scroll-cue-text">تابع التمرير</span>
            <span className="fo-scroll-cue-dot" />
          </div>
        </section>

        {/* ═══ البيان — the editorial spread; the knot owns the
            reading-end third, the copy holds the reading start ═══ */}
        <section id="statement" data-cam="statement" data-story-chapter="statement" className="st-section" aria-labelledby="statement-title">
          <div className="st-spread">
            <div className="st-copy">
              <span className="fo-label">البيان</span>
              <h2 id="statement-title" className="st-title">منصّة واحدة تخدم الرحلة كلّها</h2>
            </div>
            <div className="st-lines">
              <RevealCssClass as="p" className="st-line" data-story-reveal>
                <strong>للطالب</strong>
                <span>تشاهد محاضرة تفاعلية، فتُقاس فهمك لحظة بلحظة، فتعرف خطوتك التالية.</span>
              </RevealCssClass>
              <RevealCssClass as="p" className="st-line" delay={1} data-story-reveal>
                <strong>للأستاذ</strong>
                <span>تبني المحاضرة والاختبار، وتصحّح المقالات بملاحظات مكتوبة، وترى من يحتاجك الآن.</span>
              </RevealCssClass>
              <RevealCssClass as="p" className="st-line" delay={2} data-story-reveal>
                <strong>للإدارة</strong>
                <span>تدير الكليات والمقرَّرات والصلاحيات، وترى مؤسّستك حيّة على مستوى كل قسم.</span>
              </RevealCssClass>
            </div>
          </div>
        </section>

        {/* ═══ الفصول 01–06 — one capability per chapter ═══ */}
        <section id="chapters" data-cam="chapters" data-story-chapter="chapters" className="chapters" aria-labelledby="chapters-title">
          <header className="chapters-head">
            <div className="chapters-head-copy">
              <span className="fo-label">الفصول</span>
              <RevealCssClass as="h2" className="chapters-title" delay={1} id="chapters-title" data-story-reveal>
                ستُّ فصول — كلُّ فصلٍ قدرةٌ تعمل اليوم
              </RevealCssClass>
            </div>
            <RevealCssClass as="p" className="chapters-lede" delay={2} data-story-reveal>
              لا لقطات شاشة ولا وعود: كل فصل يعرض واجهة مبنية من مكوّنات المنصّة نفسها ببيانات توضيحية.
            </RevealCssClass>
          </header>

          {CHAPTERS.map((ch) => (
            <article key={ch.num} className={`ch ch--${ch.layout}`} aria-labelledby={`ch-${ch.num}-title`}>
              <header className="ch-head">
                <span className="ch-num fo-mono" dir="ltr" aria-hidden>{ch.num}</span>
                <RevealCssClass as="h3" className="ch-title" id={`ch-${ch.num}-title`} delay={1} data-story-reveal>
                  {ch.title}
                </RevealCssClass>
                <RevealCssClass as="p" className="ch-lede" delay={2} data-story-reveal>{ch.lede}</RevealCssClass>
              </header>
              <RevealCssClass as="div" className="ch-mini" delay={2} data-story-reveal>{ch.mini}</RevealCssClass>
            </article>
          ))}
        </section>

        {/* ═══ ما يعمل اليوم — THE COPPER CLIMAX ═══
            The inverted ledger slab holds the reading-start column;
            the reading-end third stays an intentional empty window —
            the world's camera closes on the copper fins right there,
            and the slab makes the emissive peak read as the section's
            own signal. */}
        <section id="live" data-cam="live" data-story-chapter="live" className="lv-section" aria-labelledby="live-title">
          <div className="lv-grid">
            <div className="lv-slab" data-story-focus>
              <span className="fo-label">ما يعمل اليوم</span>
              <RevealCssClass as="h2" className="lv-title" delay={1} id="live-title" data-story-reveal>
                قدرات <em>موثَّقة</em>، لا ادّعاءات
              </RevealCssClass>
              <RevealCssClass as="p" className="lv-lede" delay={2} data-story-reveal>
                كل رقم يُحسب من حالة الميزات في النظام — يتغيّر مع التحديثات، لا مع الحملات.
              </RevealCssClass>
              <ol className="lv-list">
                {LIVE_CAPABILITIES.map((cap, i) => (
                  <RevealCssClass as="li" key={cap} className="lv-row" delay={((i % 3) + 1) as 1 | 2 | 3} data-story-reveal>
                    <span className="lv-num fo-mono" dir="ltr" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                    <span className="lv-text">{cap}</span>
                    <span className="lv-check" aria-hidden><Icon icon={Check} size={14} /></span>
                  </RevealCssClass>
                ))}
              </ol>
            </div>
            <div className="lv-window">
              <p className="lv-window-caption">المجسّم يُعرض حيًّا — طبقة رسم خلف الصفحة تتحرّك مع التمرير</p>
            </div>
          </div>
        </section>

        {/* ═══ الأدوار — the wide-panorama index ═══
            The conductor pulls the camera wide here — the knot settles
            on the horizon, so the cast list runs as full airy rows. */}
        <section id="roles" data-cam="roles" data-story-chapter="roles" className="rl-section" aria-labelledby="roles-title">
          <div className="rl-head">
            <span className="fo-label">الأدوار</span>
            <RevealCssClass as="h2" className="rl-title" delay={1} id="roles-title" data-story-reveal>
              منصّة واحدة، <em>خمسة مسارات</em>
            </RevealCssClass>
          </div>
          <ul className="rl-strip">
            {ROLES.map((r, i) => (
              <RevealCssClass as="li" key={r.role} className="rl-item" delay={((i % 3) + 1) as 1 | 2 | 3} data-story-reveal>
                <span className="rl-item-role">{r.role}</span>
                <span className="rl-item-line">{r.line}</span>
              </RevealCssClass>
            ))}
          </ul>
          <RevealCssClass as="p" className="rl-more" delay={3} data-story-reveal>
            بيانات كل مؤسّسة معزولة تمامًا — والصلاحيات منفصلة دورًا بدور.
          </RevealCssClass>
        </section>

        {/* ═══ الكليات — the interactive registry ═══
            The knot sits behind the panel column here (the conductor's
            orbit lands it there), so the elevated panel + chip row own
            the reading-start column and the count numeral floats in
            the open reading-end third. The chips are the accessible
            surface: 25 real colleges, keyboard-operable, 44px targets,
            with a details panel instead of a floating popover. */}
        <section id="colleges" data-cam="colleges" data-story-chapter="colleges" className="cg-section" aria-labelledby="cg-title">
          <div className="cg-head">
            <span className="fo-label">الجامعة التجريبية</span>
            <RevealCssClass as="h2" className="cg-title" delay={1} id="cg-title" data-story-reveal>
              {formatInt(colleges.length)} كلية في {formatInt(CAMPUS_COUNT)} أحرُم
            </RevealCssClass>
            <RevealCssClass as="p" className="cg-lede" delay={2} data-story-reveal>
              بيانات العرض تخصّ «جامعة مدارك التجريبية» — مؤسّسة اصطناعية بالكامل،
              وبنية الكليات كاملة معروضة داخل المنصّة.
            </RevealCssClass>
          </div>

          <div className="cg-stage" data-story-media>
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

            <div className="cg-open" aria-hidden="true">
              <span className="cg-count fo-mono" dir="ltr">{formatInt(colleges.length)}</span>
            </div>
          </div>

          <div className="cg-cta-row">
            <Link to="/colleges" className="btn ghost">تصفّح الكلّيّات التجريبية</Link>
            <Link to="/auth" className="fo-text-link">سجِّل الدخول لاستعراض كليّتك داخل المنصّة</Link>
          </div>
        </section>

        {/* ═══ إلى أين — THE PASSAGE ═══
            The conductor drives the camera through the knot here; the
            composition steps back and lets the immersion carry the
            chapter — one centered statement, then the honest pairs. */}
        <section id="vision" data-cam="vision" data-story-chapter="vision" className="vs-section" aria-labelledby="vs-title">
          <div className="vs-head">
            <span className="fo-label">إلى أين</span>
            <RevealCssClass as="h2" className="vs-title" delay={1} id="vs-title" data-story-focus data-story-reveal>
              نحو تعليمٍ <em>يعرف كلَّ طالب</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="vs-lede" delay={2} data-story-reveal>
              نبني منظومة تتذكّر ما شاهد الطالب وما أخطأ وما ينقصه —
              ثم تقترح الخطوة التالية. بلا أرقام مختلقة ولا وعود بلا تنفيذ:
              كل حالة أدناه كما هي في النظام اليوم.
            </RevealCssClass>
          </div>
          <RevealCssClass as="ul" className="vs-status" delay={3} data-story-reveal>
            {VISION_STATUS.map((s) => (
              <li key={s.k} className={s.live ? 'is-live' : undefined}>
                <span className="vs-status-k"><Icon icon={s.live ? Check : FlaskConical} size={13} /> {s.k}</span>
                <span className="vs-status-v">{s.v}</span>
              </li>
            ))}
          </RevealCssClass>
        </section>

        {/* ═══ الخاتمة — the resolve (copper emissive peaks behind) ═══ */}
        <section data-cam="cta" data-story-chapter="cta" className="fo-cta" aria-label="ابدأ رحلتك — أنشئ حسابك">
          <span className="fo-cta-star" aria-hidden>
            <StarMark size={48} withHalo />
          </span>
          <div className="fo-cta-inner" data-story-focus>
            <RevealCssClass as="h2" className="fo-cta-title" delay={1} data-story-reveal>
              جاهزٌ لبدء <em>رحلتك</em>؟
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-cta-lede" delay={2} data-story-reveal>
              أنشئ حسابك الجامعي في دقائق — بالبريد الجامعي أو رقم قيدك —
              وتابع تقدّمك من أوّل محاضرة.
            </RevealCssClass>
            <RevealCssClass as="div" className="fo-cta-actions" delay={3} data-story-reveal>
              <Link to="/auth/register" className="btn accent lg">
                أنشئ حسابك الجامعي
                <Icon icon={ArrowLeft} size={16} />
              </Link>
              <Link to="/auth" className="btn ghost lg">تسجيل الدخول</Link>
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-cta-meta" delay={4} data-story-reveal>
              <Icon icon={Check} size={13} />
              مدارك · {year} · منصّة تعليمية مستقلّة
            </RevealCssClass>
          </div>
        </section>
      </main>

      {/* ── COLOPHON FOOTER — slide-up with the giant wordmark rush ── */}
      <footer data-cam="footer" data-story-chapter="footer" className="fo-footer" ref={footerRef}>
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
                منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «جامعة مدارك التجريبية» — مؤسّسة اصطناعية بالكامل لأغراض العرض.
              </p>
            </div>
            <nav className="fo-footer-col" aria-label="روابط المنصّة">
              <div className="fo-footer-heading">المنصّة</div>
              <a href="#chapters" className="fo-footer-link">الفصول</a>
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
          {/* the giant closing wordmark — slide-up rush driven by --sp */}
          <div className="fo-footer-mark" aria-hidden="true">مدارك</div>
        </div>
      </footer>
    </div>
  );
}
