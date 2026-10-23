import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Menu, X, Check, Users,
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
import { ElevationDrawing } from '../components/landing/ElevationDrawing';
import { ProductFrame } from '../components/landing/ProductFrame';
import { WhyScene } from '../components/landing/WhyScene';
import { SheetLoader } from '../components/landing/SheetLoader';
import { SheetCursor } from '../components/landing/cursor/SheetCursor';
import { HeroInspect } from '../components/landing/cursor/HeroInspect';
import { JourneyScene } from '../components/landing/journey/JourneyScene';
import { ScrubReveal } from '../components/landing/journey/WordReveal';
import { FooterLens } from '../components/landing/footer/FooterLens';
import { shouldPlayIntro } from '../lib/motion/introGate';
import { useSheetScroll } from '../lib/motion/useSheetScroll';
import { installSheetExit } from '../lib/motion/sheetExit';
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
 *       walkthrough (the learning-floor plan + its inspection
 *       stations) + the chapters 05–06 ledger rows — the map is HALF
 *       the page, the reference's proportion;
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
 * from the real registry; 11 training tracks (TrainingPages); 6 quality
 * boards (quality.routes); 2 isolated institutions (OwnerInstitutionsPage). */
const CAMPUS_COUNT = new Set(colleges.map((c) => c.cityAr ?? '')).size;
const TRAINING_TRACKS = 11;   // verified in pages/student/TrainingPages.tsx
const QUALITY_BOARDS = 6;     // verified in backend quality.routes
const INSTITUTIONS = 2;       // verified in OwnerInstitutionsPage isolation

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
    answer: 'تُجيبها: المحاضرات التفاعلية بنقاط الفحص',
  },
  {
    num: '02',
    title: 'تصحيح يأتي متأخرًا',
    text: 'الاختبار الورقي يمرّ أسابيع قبل أن يعرف الطالب خطأه — وفرصة المراجعة تكون قد فاتت.',
    answer: 'تُجيبها: التصحيح التلقائي للموضوعي',
  },
  {
    num: '03',
    title: 'غياب خريطة الإتقان',
    text: 'الطالب يعرف درجته النهائية، لا مفاهيمه الناقصة ولا خطوته التالية.',
    answer: 'تُجيبها: مصفوفة الإتقان لكل مفهوم',
  },
  {
    num: '04',
    title: 'بحوث تُسلَّم وتُنسى',
    text: 'البحث يُقدَّم ورقيًا ثم يختفي: لا فهرسة ولا بحث عربي ولا مراجعة معلَّمة تبقى.',
    answer: 'تُجيبها: مكتبة البحوث بالفهرسة العربية',
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

/* ── The elevation stages — the five hotspots on the hero's drafted
 * elevation (R310). Each describes a REAL live capability
 * (LIVE_CAPABILITIES lineage); vx/vy are the drawing's OWN viewBox
 * coordinates (1440×640) at each volume's annotation spot — the
 * drafting convention: the compact [NN] pins mark, never mask, the
 * artwork. The runtime mapping (HeroInspect) remaps them through the
 * real letterbox transform, so the pins stay glued to the volumes at
 * every size (ONE geometric frame for pins, stations, and guides). */
const STAGES = [
  {
    num: '01', short: 'المحاضرات', title: 'المحاضرات التفاعلية',
    desc: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، وحضورٌ يُحتسب تلقائيًا عند الإكمال.',
    meta: 'live · lectures', vx: 1145, vy: 196,
  },
  {
    num: '02', short: 'نقطة الفحص', title: 'نقاط الفحص',
    desc: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.',
    meta: 'live · checkpoints', vx: 970, vy: 300,
  },
  {
    num: '03', short: 'الاختبار', title: 'الاختبارات الإلكترونية',
    desc: 'بنك أسئلة بأربعة أنواع وقوالب جاهزة، وتصحيح تلقائي للأسئلة الموضوعية.',
    meta: 'live · exams', vx: 835, vy: 250,
  },
  {
    num: '04', short: 'المكتبة والبحوث', title: 'دورة البحوث والمكتبة',
    desc: 'رفع PDF وفحص نزاهة معلَن وملاحظات مشروحة من الأستاذ، فتُفهرَس في مكتبة تبحث بالعربية.',
    meta: 'live · research', vx: 585, vy: 292,
  },
  {
    num: '05', short: 'الإتقان', title: 'مصفوفة الإتقان',
    desc: 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب — خطوتك التالية مقترحة من أدائك.',
    meta: 'live · mastery', vx: 355, vy: 64,
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

/* ── Chapters 05–06 — the capability ledger rows. r308: chapters
 * 01–04 moved into the pinned «رحلة التعلّم» walkthrough above
 * (JourneyScene) — the scroll is their timeline now; these two
 * complete the honest capability ledger as flat rows. */
const CHAPTERS: { num: string; title: string; lede: React.ReactNode; mini: React.ReactNode }[] = [
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

/* ── The pains' draw-in line art (R313 · D7 §3) — four original
 * pictograms in the sheet's own ink classes (bp-ink / bp-hair /
 * bp-dash / bp-signal), pathLength-normalized so the draw-in resolves
 * from the reveal belt (.pm-card.in-view → stroke-dashoffset 0; RM
 * collapses to the complete drawing). Decorative: the card's text
 * carries the meaning (aria-hidden). */
function PainArt({ kind }: { kind: '01' | '02' | '03' | '04' }) {
  return (
    <svg
      className="pm-art"
      viewBox="0 0 140 100"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {kind === '01' && (
        <>
          {/* the lecture: a lectern, a speaker, a trail that fades */}
          <rect className="bp-hair pm-draw" pathLength={1} x="14" y="46" width="34" height="30" />
          <line className="bp-hair pm-draw" pathLength={1} x1="31" y1="46" x2="31" y2="34" />
          <circle className="bp-ink pm-draw" pathLength={1} cx="31" cy="28" r="5" />
          <line className="bp-ink pm-draw" pathLength={1} x1="31" y1="33" x2="31" y2="42" />
          <line className="bp-dash pm-draw" pathLength={1} x1="56" y1="60" x2="76" y2="60" />
          <line className="bp-dash pm-draw" pathLength={1} x1="86" y1="60" x2="98" y2="60" />
          <circle className="bp-signal pm-draw" pathLength={1} cx="112" cy="60" r="8" />
          <line className="bp-hair pm-draw" pathLength={1} x1="108" y1="60" x2="116" y2="60" />
          <line className="bp-hair pm-draw" pathLength={1} x1="112" y1="56" x2="112" y2="64" />
        </>
      )}
      {kind === '02' && (
        <>
          {/* late grading: a stack of papers + a clock */}
          <rect className="bp-ink pm-draw" pathLength={1} x="16" y="26" width="42" height="54" />
          <rect className="bp-hair pm-draw" pathLength={1} x="24" y="34" width="42" height="54" />
          <line className="bp-hair pm-draw" pathLength={1} x1="32" y1="46" x2="58" y2="46" />
          <line className="bp-hair pm-draw" pathLength={1} x1="32" y1="56" x2="58" y2="56" />
          <line className="bp-hair pm-draw" pathLength={1} x1="32" y1="66" x2="50" y2="66" />
          <circle className="bp-ink pm-draw" pathLength={1} cx="100" cy="58" r="20" />
          <line className="bp-signal pm-draw" pathLength={1} x1="100" y1="58" x2="100" y2="46" />
          <line className="bp-ink pm-draw" pathLength={1} x1="100" y1="58" x2="110" y2="62" />
        </>
      )}
      {kind === '03' && (
        <>
          {/* the missing mastery map: a concept grid with a gap */}
          {[
            [16, 20], [40, 20], [64, 20],
            [16, 44], [64, 44],
            [16, 68], [40, 68], [64, 68],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} className="bp-hair pm-draw" pathLength={1} x={x} y={y} width="18" height="18" />
          ))}
          {/* the gap cell — dashed, unfilled */}
          <rect className="bp-dash pm-draw" pathLength={1} x="40" y="44" width="18" height="18" />
          {/* the journey path bending around the gap */}
          <path className="bp-signal pm-draw" pathLength={1} d="M 16 29 H 34 Q 40 29 40 38 V 68 H 88" />
          <circle className="bp-signal-fill" cx="92" cy="68" r="3" />
          <circle className="bp-signal-fill" cx="16" cy="29" r="3" />
        </>
      )}
      {kind === '04' && (
        <>
          {/* lost research: the archive drawer + a fading trail */}
          <rect className="bp-ink pm-draw" pathLength={1} x="70" y="30" width="50" height="44" />
          <line className="bp-hair pm-draw" pathLength={1} x1="88" y1="52" x2="102" y2="52" />
          <rect className="bp-hair pm-draw" pathLength={1} x="20" y="22" width="26" height="18" />
          <line className="bp-hair pm-draw" pathLength={1} x1="24" y1="28" x2="42" y2="28" />
          <line className="bp-hair pm-draw" pathLength={1} x1="24" y1="33" x2="42" y2="33" />
          <line className="bp-dash pm-draw" pathLength={1} x1="46" y1="31" x2="60" y2="31" />
          <line className="bp-dash pm-draw" pathLength={1} x1="66" y1="31" x2="72" y2="31" />
          <line className="bp-hair pm-draw" pathLength={1} x1="20" y1="58" x2="46" y2="58" />
          <line className="bp-hair pm-draw" pathLength={1} x1="52" y1="58" x2="58" y2="58" />
          <line className="bp-hair pm-draw" pathLength={1} x1="64" y1="58" x2="66" y2="58" />
        </>
      )}
    </svg>
  );
}

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
      );
    } catch {
      return false;
    }
  });
  const [introDone, setIntroDone] = useState(!introPlaying);

  const [menuOpen, setMenuOpen] = useState(false);

  /* R308 — the statement title's scrub driver: --wr-p (0..1) rides
   * the section's traversal; the word masks resolve + reverse with
   * it (imperative, zero renders — the useSheetScroll contract). */
  const statementRef = useRef<HTMLElement>(null);
  useSheetScroll(statementRef, ({ rect, vh }) => {
    const el = statementRef.current;
    if (!el) return;
    const p = clamp((vh * 0.9 - rect.top) / (vh * 0.8), 0, 1);
    el.style.setProperty('--wr-p', p.toFixed(4));
  });

  /* R308 — the landing-exit sweep: internal link clicks play the
   * geometric transition while React Router navigates underneath
   * (navigation itself is never delayed — funnel safety). */
  const landingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = landingRef.current;
    if (!root) return undefined;
    return installSheetExit(root);
  }, []);

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
  const progressBarRef = useRef<HTMLDivElement>(null);

  // The blueprint's active stage — the hotspot selection. Starts on
  // [01] so the panel is informative with zero interaction; the
  // buttons carry the aria-pressed state and the panel is a polite
  // live region (the drawing never hides information behind a hover).
  const [activeStage, setActiveStage] = useState(0);
  const stage = STAGES[activeStage] ?? STAGES[0];

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
      if (menu && !menu.contains(e.target as Node)) {
        setMenuOpen(false);
      }
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
      ref={landingRef}
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

      {/* ═══ THE SHEET FRAME (R313 · D9) — the full-page drafting frame:
          a 1px hairline at the 7px inset (the reference's .main-deco),
          10×10 corner plus marks centered on the frame corners + the
          mono coordinates. Decorative only: aria-hidden,
          pointer-transparent — and visible at EVERY breakpoint the
          reference shows it (the reference keeps its frame at 390 —
          small screens get the drafting chrome too). */}
      <div className="sheet-frame" aria-hidden="true">
        <span className="sheet-mark sheet-mark-tl">+</span>
        <span className="sheet-mark sheet-mark-tr">+</span>
        <span className="sheet-mark sheet-mark-bl">+</span>
        <span className="sheet-mark sheet-mark-br">+</span>
        <span className="sheet-coord sheet-coord-ts fo-mono" dir="ltr">MADAREK · LEARNING SHEET</span>
        <span className="sheet-coord sheet-coord-be fo-mono" dir="ltr">[MDRK-01] · SHEET 01/01</span>
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
            <a href="#chapters" className="fo-nav-link">الرحلة</a>
            <a href="#live" className="fo-nav-link">التحديات</a>
            <a href="#roles" className="fo-nav-link">الأدوار</a>
            <a href="#colleges" className="fo-nav-link">الكليات</a>
            <Link to="/campus" className="fo-nav-link">الجامعات</Link>
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
              }
            }}
          >
            <a href="#chapters" className="btn ghost">الرحلة</a>
            <a href="#live" className="btn ghost">التحديات</a>
            <a href="#roles" className="btn ghost">الأدوار</a>
            <a href="#colleges" className="btn ghost">الكليات</a>
            <Link to="/campus" className="btn ghost">الحياة الجامعية</Link>
            <Link to="/capabilities" className="btn ghost">ما يعمل اليوم</Link>
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

        {/* ═══ [1] HERO — «لوحة مدارك» (R310 → R313 D7): the copy band
            (display + statement side by side, then the value row), the
            drafted elevation with its inspection instruments + ruler
            ticks (D9), the details panel, and the capabilities ticker —
            the whole band ≈100vh-frame (the reference's 887px hero).
            The documentary media band moved to /campus; the title block
            moved to the closing section. ═══ */}
        <section className="fo-hero" aria-label="مدارك — منصّة التعليم الذكي">
          <div className="fo-hero-copy">
            <RevealCssClass as="p" className="fo-eyebrow">
              <span className="fo-mono" dir="ltr">[01]</span>
              منصّة تعليم ذكية · عربية أولًا · مستقلّة
            </RevealCssClass>

            <div className="fo-hero-heading">
              <RevealCssClass as="h1" className="fo-hero-title" delay={1}>
                مدارك
              </RevealCssClass>

              <div className="fo-hero-lead">
                <RevealCssClass as="p" className="fo-hero-statement" delay={2}>
                  من المحاضرة الأولى إلى الإتقان — <em>رحلة تعلّم واحدة</em>، موثَّقة ومقيسة.
                </RevealCssClass>

                <RevealCssClass as="p" className="fo-hero-sub" delay={3}>
                  محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل —
                  في تجربة عربية واحدة لخمسة أدوار أكاديمية.
                </RevealCssClass>
              </div>
            </div>

            <RevealCssClass as="div" className="fo-hero-actions" delay={4}>
              <Link to="/auth/register" className="btn accent lg fo-hero-cta">
                أنشئ حسابك الجامعي
                <Icon icon={ArrowLeft} size={16} />
              </Link>
              <a href="#chapters" className="btn ghost lg">كيف تعمل</a>
            </RevealCssClass>
          </div>

          {/* the elevation — R310: the hero's DOMINANT composition. The
              drafted learning building is an inspection surface — the
              local pointer instrument (guides + coordinates +
              drag-to-inspect) owns this zone (data-cursor="none" — the
              R311 §1.5 unified suppression vocabulary).
              The [NN] pins and the stations share ONE coordinate frame
              (viewBox 1440×640) remapped by HeroInspect at runtime.
              R313 (D9): the ruler tick strips ride all four edges of
              the drawing window (the reference's proximity rulers). */}
          <RevealCssClass as="div" className="fo-hero-fig" delay={3}>
            <div className="bp-stage" data-cursor="none">
              <ElevationDrawing active={activeStage} />
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
              </div>
              <div className="bp-hotspots" role="group" aria-label="استكشف مراحل مسار التعلّم">
                {STAGES.map((s, i) => (
                  <button
                    key={s.num}
                    type="button"
                    className="bp-hotspot"
                    data-vx={s.vx}
                    data-vy={s.vy}
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

          {/* R308 — the capabilities ticker: the sheet's continuous
              instrument (the reference's hero marquee grammar). The
              items are the honest live-capability ledger (the full
              matrix lives on /capabilities); the loop is a hand-tuned
              crawl in the authored-choreography file, duplicated track
              aria-hidden, collapsed under reduced motion to a static
              row. */}
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
        </section>

        {/* ═══ [2] البيان — the statement (the reference's intro): the
            scrub-revealed declaration + the documented-universities
            ticker. r308: the title unmasks word-by-word, scrub-linked +
            reversible to the scroll. ═══ */}
        <section id="statement" className="st-section" ref={statementRef} aria-labelledby="statement-title">
          <div className="st-spread">
            <div className="st-copy">
              <span className="fo-label"><span className="fo-mono" dir="ltr">[02]</span> البيان</span>
              <h2 id="statement-title" className="st-title">
                <ScrubReveal text="منصّة واحدة تخدم الرحلة كلّها" />
              </h2>
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
              ليست أحكامًا على أحد — بل المشكلات التي بُنيت مدارك لحلّها.
              تحت كل وجعٍ بندٌ يعمل اليوم داخل المنصّة، والسجلّ الكامل في صفحة القدرات.
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
            <Link to="/capabilities" className="fo-text-link">السجلّ الكامل — ما يعمل اليوم وإلى أين</Link>
          </RevealCssClass>
        </section>

        {/* ═══ [4] الفصول — the pinned map (the reference's 51%
            walkthrough). r308: chapters 01–04 live in the pinned
            «رحلة التعلّم» walkthrough; 05–06 stay as numbered hairline
            ledger rows with flat fragments ═══ */}
        <section id="chapters" className="chapters" aria-labelledby="chapters-title">
          <header className="chapters-head">
            <div className="chapters-head-copy">
              <span className="fo-label"><span className="fo-mono" dir="ltr">[04]</span> الفصول</span>
              <RevealCssClass as="h2" className="chapters-title" delay={1} id="chapters-title">
                الرحلة — <em>أربعة فصول تتحرّك أمامك</em>
              </RevealCssClass>
            </div>
            <RevealCssClass as="p" className="chapters-lede" delay={2}>
              مرّر لترى الرحلة تُبنى: أربعة فصول تتحرّك في مشهدٍ واحد — ثم فصلان يعرضان واجهةً حقيقيّة. لا لقطات مُجمّلة ولا وعود.
            </RevealCssClass>
          </header>

          {/* r308 — «رحلة التعلّم»: the pinned walkthrough. Chapters
              01–04 play out across one persistent drawing while the
              scroll is the timeline (CSS sticky pin; stacked readable
              sequence ≤991px). The ledger rows below complete it.
              R313 (D7): the map owns ≈51% of the page — the
              reference's proportion. */}
          <JourneyScene />

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

        {/* ═══ [5] المنصّة فعليًا — two product blocks (the reference's
            platform section): the student surface + the teacher
            cockpit. The frames are authentic UI from the seeded demo
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
            {teacherCapture && <ProductFrame capture={teacherCapture} />}
          </RevealCssClass>

          <RevealCssClass as="p" className="pr-note" delay={3}>
            كل إطار مأخوذ من التطبيق نفسه في وضع الضيافة — بلا معالجة ولا تجميل.
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
              ولكلٍّ منها سطحٌ حقيقي داخل المنصّة.
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
                جاهزٌ لبدء <em>رحلتك</em>؟
              </RevealCssClass>
              <RevealCssClass as="p" className="fo-cta-lede" delay={2}>
                أنشئ حسابك الجامعي في دقائق — بالبريد الجامعي أو رقم قيدك —
                وتابع تقدّمك من أوّل محاضرة.
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

          {/* [9] the colleges registry strip — the ruled hairline row
              linking the public registry (the funnel's 5th login
              affordance lives here; the demo-data disclosure rides the
              row, never a tooltip). */}
          <div className="cg-strip" id="colleges">
            <span className="cg-strip-label fo-mono" dir="ltr">[09] · REGISTRY</span>
            <p className="cg-strip-text">
              <strong><span className="fo-mono" dir="ltr">{formatInt(colleges.length)}</span> كلية</strong> في{' '}
              <span className="fo-mono" dir="ltr">{formatInt(CAMPUS_COUNT)}</span> أحرُم —
              بيانات «جامعة مدارك التجريبية»: اصطناعية بالكامل لأغراض العرض.
            </p>
            <div className="cg-strip-links">
              <Link to="/colleges" className="btn ghost sm">تصفّح الكلّيّات التجريبية</Link>
              <Link to="/auth" className="fo-text-link">سجِّل الدخول لاستعراض كليّتك داخل المنصّة</Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── COLOPHON FOOTER — the hairline grid: the inspection strip
          (r308 — the pointer lens resolving the journey drawing), the
          brand + about columns, the link columns, the mono bottom row. ── */}
      <footer className="fo-footer">
        <FooterLens />
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
              <Link to="/campus" className="fo-footer-link">الحياة الجامعية</Link>
              <a href="#chapters" className="fo-footer-link">الفصول</a>
              <a href="#product" className="fo-footer-link">المنصّة فعليًا</a>
              <Link to="/capabilities" className="fo-footer-link">ما يعمل اليوم</Link>
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
