import { Link, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Menu, X,
} from 'lucide-react';
import { Icon } from '../components/Icon';
// R323 (A3 · defect 1) — the ONE brand system: the retired StarMark/
// BrandMark drawings are replaced by the new <Logo> everywhere on the
// landing sheet (header mark, footer identity mark, the footer's giant
// wordmark, the loader's mark). The «مدارك» wordmark beside the header
// mark stays HTML text — the guest-landing contract renders it.
import { Logo } from '../brand';
import { ThemeToggle, useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { colleges } from '../data/colleges.config';
import { ROLE_SHOWCASES } from '../data/university-media';
import { HERO_WORK_ITEMS, LIVE_COUNT } from '../data/landing-ledger';
import { formatInt } from '../utils/numbers';
import { RevealCssClass } from '../hooks/useReveal';
import { PlatformCanvas } from '../components/landing/PlatformCanvas';
import { HeroInkWindow } from '../components/landing/HeroInkWindow';
import { StatementArt } from '../components/landing/StatementArt';
import { WhyScene } from '../components/landing/WhyScene';
import { PainArt } from '../components/landing/PainArt';
import { SheetLoader } from '../components/landing/SheetLoader';
import { SheetCursor } from '../components/landing/cursor/SheetCursor';
import { HeroInspect } from '../components/landing/cursor/HeroInspect';
import { JourneyScene } from '../components/landing/journey/JourneyScene';
import { ScrubReveal } from '../components/landing/journey/WordReveal';
import { FooterLens } from '../components/landing/footer/FooterLens';
// R323 (A3 · defects 1+9): FooterArt (FooterMarkArt/WordmarkArt) is
// retired — the giant footer wordmark is <Logo variant="wordmark"> now
// and the circle-star mark cell is removed (ONE mark per view).
import { ConsentBanner } from '../components/landing/chrome/ConsentBanner';
import { EdgeTab } from '../components/landing/chrome/EdgeTab';
import { shouldPlayIntro, introEnvironment } from '../lib/motion/introGate';
import { useSheetScroll } from '../lib/motion/useSheetScroll';
import { clamp } from '../lib/motion/sheetConductor';
import { acquireScrollLock, releaseScrollLock } from '../lib/scrollLock';
// r314-chrome.css — R314 B10 — the consent banner (V11) + the right-edge
// vertical tab (V12): the landing chrome pair, Heron geometry with
// Madarek's own honest content. R323 (A3 · defect 3): imported BEFORE
// landing.css so the sheet's R323 chrome block (the compact phone
// consent bar + the --z-consent/--z-loader tokens) is the cascade's
// last word over the chrome pair without specificity forks.
import '../styles/r314-chrome.css';
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
 *       walkthrough — the learning-floor plan, the opening statement,
 *       the INTRODUCTION card, the four findings stations and the
 *       closing column; the map is HALF the page, the reference's
 *       proportion (R315 K-E: the chapters 05–06 demo rows are gone —
 *       their honest content lives on /capabilities);
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
 * from the real registry. R315 (K-E): the training-track, quality-board
 * and institution-isolation counts moved to /capabilities with their
 * ledger rows — the landing keeps painting only the campus count. */
const CAMPUS_COUNT = new Set(colleges.map((c) => c.cityAr ?? '')).size;

/* ── The r307 media truth: distinct Libyan universities documented —
 * Benghazi, Tripoli, Omar Al-Mukhtar (photos) + Misurata, Sebha
 * (official-channel videos). Computed here, not invented: each
 * institution has verified identity evidence in manifest.json. The
 * documentary media itself lives on /campus (R313); the list feeds the
 * universities ticker below. R323 (A3 · defect 8): the numeric count
 * that rode the removed CTA metadata ledger retires with it — the
 * named crawl carries the truth without a bare stat. */
const DOCUMENTED_UNIVERSITIES = [
  'جامعة بنغازي',
  'جامعة طرابلس',
  'جامعة عمر المختار',
  'جامعة مصراتة',
  'جامعة سبها',
] as const;

/* ── The statement (R322 · 2-c — the Heron home-intro transplant): the
 * manifesto the scrub-title carries. Same role/length class as the
 * reference's 127-char intro statement (≈6 scrub lines @1440), honest —
 * the four clauses name the four live capabilities (lecture · grading ·
 * mastery · research), the closing pair the honest registry claim. */
const STATEMENT_TEXT =
  'منصّة واحدة تدير الرحلة كلها: المحاضرة تُبنى وتُقاس، والواجب يُصحّح ويُعاد، ' +
  'والإتقان يُرسَم مفهومًا مفهومًا، والبحث يُفهرَس ويبقى. سجلّ واحد للقسم والكلية — يعمل اليوم، ويكبر مع كل فصل.';

/* ── The four pains (R313 · D7 §3 → R322 · 2-d on Heron's open
 * columns) — the honest inverse of the live ledger: each pain names a
 * real gap in Libyan higher-ed today and is answered by a capability
 * that WORKS in the system (the full matrix lives on /capabilities).
 * No invented statistics — only the pains the product itself was built
 * to solve, framed from the ledger's truth. The `keyword` is the
 * reference's own meta-row seat (mono Latin, ~6–8ch); `num` is the
 * ghost 2-digit index riding the row's far edge. */
const PAINS = [
  {
    num: '01',
    keyword: 'LECTURE',
    title: 'محاضرة بلا أثر مقيس',
    text: 'تُلقى المحاضرة ثم ينتهي أثرها: لا نقطة فحص تُثبِّت الفهم، ولا حضور يُحتسب تلقائيًا.',
    answer: 'الجواب: المحاضرات التفاعلية بنقاط الفحص',
  },
  {
    num: '02',
    keyword: 'GRADING',
    title: 'تصحيح يأتي متأخرًا',
    text: 'تمرّ أسابيع قبل أن يعرف الطالب خطأه — وفرصة المراجعة تكون قد فاتت.',
    answer: 'الجواب: التصحيح التلقائي للموضوعي',
  },
  {
    num: '03',
    keyword: 'MASTERY',
    title: 'غياب خريطة الإتقان',
    text: 'الطالب يعرف درجته النهائية، لا مفاهيمه الناقصة ولا خطوته التالية.',
    answer: 'الجواب: مصفوفة الإتقان لكل مفهوم',
  },
  {
    num: '04',
    keyword: 'ARCHIVE',
    title: 'بحوث تُسلَّم وتُنسى',
    text: 'البحث يُقدَّم ورقيًا ثم يختفي: لا فهرسة ولا بحث عربي ولا مراجعة معلَّمة تبقى.',
    answer: 'الجواب: مكتبة البحوث بالفهرسة العربية',
  },
] as const;

/* ── R323 (A3 · defect 7) — the roles LEDGER: the card grid becomes a
 * hairline ledger of the platform's eight rows — the five verified
 * roles + the three honest personas — one row each: mono index, the
 * clean role name (IBM Plex 600), a one-line honest descriptor, and a
 * status tag in the chip grammar. The descriptors are the SAME honest
 * lines the cards carried (ROLE_SHOWCASES.lineAr / the persona lines —
 * the r168b pins ride them verbatim); the names unwrap the old leading
 * «لل» prefix properly (للطالب → طالب — the old single-lam strip left
 * «لطالب» behind). Status tags name the ACTUAL state: متاح (live),
 * قريبًا (in development), غير متاح (honest absence). */
const LEDGER_ROWS = [
  ...ROLE_SHOWCASES.map((r) => ({
    name: r.roleAr.replace(/^لل/, ''),
    line: r.lineAr,
    state: 'متاح' as const,
    live: true,
  })),
  {
    name: 'الباحث',
    line: 'طالب أو أستاذ يكتب بحثه: رفع PDF، وفحص نزاهة معلَن، وملاحظات معلَّمة من الأستاذ.',
    state: 'متاح' as const,
    live: true,
  },
  {
    name: 'مشرف المعمل',
    line: 'المعامل الافتراضية قيد التطوير — فهرس للاستعراض دون تشغيل بعد.',
    state: 'قريبًا' as const,
    live: false,
  },
  {
    name: 'وليّ الأمر',
    line: 'لا حساب منفصل لوليّ الأمر اليوم — المتابعة تمرّ عبر تقرير الطالب نفسه.',
    state: 'غير متاح' as const,
    live: false,
  },
] as const;

/* ── R323 (A3 · defect 6) — the platform §05's ONE designed product
 * frame: an original vector drawing built from the real components'
 * grammar (the mini lecture-player with its chapter list + checkpoint
 * card, the mastery matrix, one assistant bubble), replacing the raster
 * captures + the «real-ui» chip + the pasted tooltip. Honest by
 * construction: every cell states the grammar of a REAL surface (the
 * player's checkpoint mechanism, the qualitative matrix, the
 * assistant's LIVE concept-explain scope — the r168b truthfulness
 * canon: no summarisation promise), and the section carries exactly
 * ONE demo-data disclosure. Pure drafting chrome: the drawing body is
 * aria-hidden; the reading lives in the section's own copy. */
function PlatformShowcase({ ctaTo }: { ctaTo: string }) {
  return (
    <figure className="pr-frame">
      <div className="pr-frame-head" aria-hidden="true">
        <span className="fo-mono" dir="ltr">[05] · MADAREK · UI GRAMMAR</span>
        <span className="pr-frame-sq" />
      </div>

      <div className="pr-frame-body" aria-hidden="true">
        {/* the mini lecture-player: hairline cell, chapter list, the
            checkpoint card */}
        <div className="pr-cell pr-cell-player">
          <div className="pr-cell-bar">
            <span className="pr-cell-idx fo-mono" dir="ltr">[01]</span>
            <span className="pr-cell-title">المحاضرة التفاعلية</span>
            <span className="pr-cell-note fo-mono" dir="ltr">24:36</span>
          </div>
          <ul className="pr-chapters">
            <li className="pr-ch is-done">
              <span className="fo-mono" dir="ltr">[01]</span>
              مفهوم: بناء المحاضرة
            </li>
            <li className="pr-ch is-now">
              <span className="fo-mono" dir="ltr">[02]</span>
              مفهوم: نقطة الفحص
              <span className="pr-ch-play" />
            </li>
            <li className="pr-ch">
              <span className="fo-mono" dir="ltr">[03]</span>
              مفهوم: التصحيح التلقائي
            </li>
            <li className="pr-ch">
              <span className="fo-mono" dir="ltr">[04]</span>
              مفهوم: خطط المراجعة
            </li>
          </ul>
          <div className="pr-check">
            <span className="pr-check-k fo-mono" dir="ltr">[02] · نقطة فحص</span>
            <p className="pr-check-q">سؤال قصير يُصحَّح فورًا داخل المحاضرة</p>
            <span className="pr-check-btn">تحقّق</span>
          </div>
        </div>

        {/* the mastery matrix: a small grid of cells with the orange
            fills as the single accent */}
        <div className="pr-cell pr-cell-matrix">
          <div className="pr-cell-bar">
            <span className="pr-cell-idx fo-mono" dir="ltr">[02]</span>
            <span className="pr-cell-title">مصفوفة الإتقان</span>
          </div>
          <div className="pr-matrix">
            <span className="pr-mc is-hot" />
            <span className="pr-mc is-hot" />
            <span className="pr-mc" />
            <span className="pr-mc is-warm" />
            <span className="pr-mc" />
            <span className="pr-mc is-hot" />
            <span className="pr-mc is-warm" />
            <span className="pr-mc" />
          </div>
          <div className="pr-mrows">
            <span className="pr-mrow"><span className="pr-mfill" style={{ inlineSize: '78%' }} /></span>
            <span className="pr-mrow"><span className="pr-mfill" style={{ inlineSize: '52%' }} /></span>
            <span className="pr-mrow"><span className="pr-mfill" style={{ inlineSize: '31%' }} /></span>
          </div>
        </div>

        {/* one assistant bubble — the LIVE concept-explain scope */}
        <div className="pr-cell pr-cell-ai">
          <div className="pr-cell-bar">
            <span className="pr-cell-idx fo-mono" dir="ltr">[03]</span>
            <span className="pr-cell-title">المساعد الأكاديمي</span>
          </div>
          <p className="pr-ai-q">اشرح لي مفهوم «نقطة الفحص»</p>
          <p className="pr-ai-a">سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.</p>
        </div>
      </div>

      <figcaption className="pr-frame-foot">
        {/* the ONE demo-data disclosure of the section */}
        <span className="pr-frame-demo fo-mono">بيانات تجريبية</span>
        <a href={ctaTo} className="fo-text-link pr-frame-cta">
          أنشئ حسابك لتجربتها حيّة
          <Icon icon={ArrowLeft} size={13} />
        </a>
      </figcaption>
    </figure>
  );
}

/* ── R313 (D8 · the header nav) — the reference's four-seat register:
 * two plain links + two dropdown parents (Heron: PRODUCT ▾ / PRICING /
 * RESOURCES ▾ / ABOUT), mapped onto the sheet's own sections. The
 * children mirror the desktop dropdowns and flatten into the mobile
 * menu's sub-index — every pinned anchor (#statement #chapters #live
 * #roles #colleges #vision) stays reachable from the bar. */
type NavSeat = { label: string; href: string; children?: readonly { label: string; href: string }[] };

const NAV_SEATS: readonly NavSeat[] = [
  {
    label: 'الرحلة', href: '#chapters',
    children: [
      { label: 'البيان', href: '#statement' },
      { label: 'المبدأ والرؤية', href: '#vision' },
    ],
  },
  { label: 'المنصّة', href: '#product' },
  {
    label: 'المجتمع', href: '#roles',
    children: [
      { label: 'التحديات', href: '#live' },
      { label: 'الأدوار والشرائح', href: '#roles' },
      { label: 'الكليات التجريبية', href: '#colleges' },
    ],
  },
  { label: 'الجامعات', href: '/campus' },
] as const;

/* R313-int (5-int · failure 7): «الفصول» dropped — it duplicated its
 * own seat's #chapters target (two menu links to one anchor → the
 * strict-mode pin in r309 'navigates-and-closes-the-menu'). «ما يعمل
 * اليوم» moved out of the DROPDOWN (its always-rendered hidden text
 * was the first DOM-order match for the honesty-ledger locator, so
 * the visible-at-top contract in guest-landing could never resolve);
 * the ledger link now lives in the hero value row (the disclosure
 * chip), in the footer, in the #live foot — and in the MOBILE menu's
 * sub-index below (r170d pins it there). */
const MOBILE_LEDGER_ROW = { label: 'ما يعمل اليوم', href: '/capabilities' } as const;

/* The dual-label roll (the reference's .btn-fill-label label-top/bot
 * pair — WP-D's .btn-motion-label grammar, retold for nav cells): the
 * live row in flow + an aria-hidden duplicate parked one row below;
 * the track's -100% slide travels exactly one row. The dup is out of
 * flow, so wrapping (≤420px) never desynchronises the two rows. */
function RollLabel({ text }: { text: string }) {
  return (
    <span className="fo-roll">
      <span className="fo-roll-track">
        <span className="fo-roll-txt">{text}</span>
        <span className="fo-roll-txt fo-roll-dup" aria-hidden="true">{text}</span>
      </span>
    </span>
  );
}

/* The 5×5 mark pair on dropdown parents (the reference's
 * .header-menu-item-ic top/bot): a hairline chevron at rest, rolling
 * to the solid signal square on hover — transform-only, on the
 * reference's own register (0.5s · cb(.23,1,.32,1)). CSS-drawn (the
 * reference uses divs too) — no icon-gate surface. In RTL the chevron
 * points inline-forward (left), mirroring Heron's `>`. */
function NavMark() {
  return (
    <span className="fo-nav-ic" aria-hidden="true">
      <span className="fo-nav-ic-layer"><span className="fo-nav-ic-chev" /></span>
      <span className="fo-nav-ic-layer fo-nav-ic-b"><span className="fo-nav-ic-sq" /></span>
    </span>
  );
}

/* One dropdown parent: a real button (aria-expanded) whose panel is
 * the reference's grid-rows + opacity fold (transition "opacity .4s,
 * grid-template-rows .4s" — measured). One state drives hover, focus
 * and click: pointerenter opens only for real mice (touch taps go to
 * the click toggle), focus walking into the cell opens the panel, and
 * Escape closes + refocuses the trigger. */
function HeaderNavDropdown({ seat }: { seat: (typeof NAV_SEATS)[number] }) {
  const [open, setOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="fo-nav-item"
      ref={cellRef}
      data-open={open ? 'true' : undefined}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          cellRef.current?.querySelector('button')?.focus();
        }
      }}
    >
      <button
        type="button"
        className="fo-nav-link"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <RollLabel text={seat.label} />
        <NavMark />
      </button>
      <div className="fo-drop">
        <div className="fo-drop-inner">
          {(seat.children ?? []).map((c) => (
            <a key={c.href} href={c.href} className="fo-drop-link" onClick={() => setOpen(false)}>
              <RollLabel text={c.label} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/* The desktop nav — four seats over the bar's full height. Plain
 * seats are plain links (router-internal for routes, anchors for the
 * sheet's sections). */
function HeaderNav() {
  return (
    <nav className="fo-nav" aria-label="التنقل الرئيسي">
      {NAV_SEATS.map((seat) => {
        if (seat.children) return <HeaderNavDropdown key={seat.label} seat={seat} />;
        return seat.href.startsWith('#') ? (
          <a key={seat.href} href={seat.href} className="fo-nav-link">
            <RollLabel text={seat.label} />
          </a>
        ) : (
          <Link key={seat.href} to={seat.href} className="fo-nav-link">
            <RollLabel text={seat.label} />
          </Link>
        );
      })}
    </nav>
  );
}

/* ── R314 (V1/V2): the STAGES hotspot row + details panel retired with
 * the thin-line elevation — the reference hero carries the ink rendering
 * + the inspection instrument's own markers, no stage panel. The stage
 * COPY lives on in HeroInspect's honest station annotations. */

/* ── R315 (K-E): the Mini demo frames + the chapters 05–06 ledger rows
 * are RETIRED. They were R310-era leftovers (demo-tagged fragments
 * with big orange numerals) that do not exist in the reference's
 * grammar — the reference's map band is the pinned walkthrough alone.
 * The honest content (community/training, quality/governance) lives on
 * /capabilities; the ledger link stays in the mobile menu, the footer
 * and the #live section foot. */

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
        introEnvironment(), /* R318 §C: saveData/≤2g/≤2-core visitors skip */
      );
    } catch {
      return false;
    }
  });
  const [introDone, setIntroDone] = useState(!introPlaying);

  const [menuOpen, setMenuOpen] = useState(false);

  /* R318 (C2) — the grain's body seat: mounted class in, unmounted out
   * (the pseudo-element film is landing-only, exactly like the old
   * .fo-grain div; idempotent both ways). */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.add('mdrk-grain');
    return () => document.body.classList.remove('mdrk-grain');
  }, []);

  /* R308 → R322 (2-c) — the statement title's scrub driver, re-pinned
   * to the reference's own anchors (scroll-spec.md): the trigger is
   * the TITLE (not the section), center-based — start «center
   * bottom+=10%» (title center at 0.9vh), end «center top+=40%»
   * (center at 0.4vh). --wr-p (0..1) rides that traversal; the word
   * colors resolve + reverse with it (imperative, zero renders — the
   * useSheetScroll contract; R318 C2's idempotent write kept). */
  const statementRef = useRef<HTMLElement>(null);
  const statementTitleRef = useRef<HTMLHeadingElement>(null);
  let lastWrP = '';
  useSheetScroll(statementTitleRef, ({ rect, vh }) => {
    const el = statementRef.current;
    if (!el) return;
    const center = rect.top + rect.height / 2;
    const p = clamp((vh * 0.9 - center) / (vh * 0.5), 0, 1).toFixed(4);
    if (p !== lastWrP) {
      el.style.setProperty('--wr-p', p);
      lastWrP = p;
    }
  });

  /* R322 (2-d) — the pains' ≤767 snap carousel + the reference's dot
   * rail. Pure CSS scroll-snap owns the swipe (no swiper dep); this
   * belt only (a) makes the scroll region keyboard-focusable inside
   * the tier, (b) mirrors the snap position onto the dots (the
   * closest-to-center column wins — direction-agnostic, safe in RTL),
   * and (c) lets a dot tap center its column. ≥768 the carousel is a
   * plain grid: the listener detaches, the dots hide, tabIndex
   * releases. Reduced motion: the tap jumps without smoothing (the
   * page's RM canon). */
  const pmColsRef = useRef<HTMLOListElement>(null);
  const pmDotsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cols = pmColsRef.current;
    const dots = pmDotsRef.current;
    if (!cols || !dots || typeof window.matchMedia !== 'function') return undefined;
    const mm = window.matchMedia('(max-width: 767px)');
    const btns = Array.from(dots.querySelectorAll<HTMLButtonElement>('.pm-dot-btn'));
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setActive = (i: number) => {
      btns.forEach((b, j) => {
        b.classList.toggle('is-active', j === i);
        b.setAttribute('aria-current', j === i ? 'true' : 'false');
      });
    };
    const nearest = () => {
      const c = cols.getBoundingClientRect();
      const mid = (c.left + c.right) / 2;
      let best = 0;
      let bd = Infinity;
      Array.from(cols.children).forEach((child, j) => {
        const r = child.getBoundingClientRect();
        const d = Math.abs((r.left + r.right) / 2 - mid);
        if (d < bd) {
          bd = d;
          best = j;
        }
      });
      return best;
    };
    const onScroll = () => setActive(nearest());
    const onTap = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.('.pm-dot-btn') as HTMLButtonElement | null;
      if (!btn) return;
      const i = btns.indexOf(btn);
      const child = cols.children[i];
      if (child) {
        child.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    };
    const apply = (on: boolean) => {
      cols.tabIndex = on ? 0 : -1;
      btns.forEach((b) => {
        b.tabIndex = on ? 0 : -1;
      });
      dots.toggleAttribute('data-on', on);
      if (on) {
        cols.addEventListener('scroll', onScroll, { passive: true });
        dots.addEventListener('click', onTap);
        onScroll();
      } else {
        cols.removeEventListener('scroll', onScroll);
        dots.removeEventListener('click', onTap);
      }
    };
    const onMm = (e: MediaQueryList | MediaQueryListEvent) => apply(e.matches);
    onMm(mm);
    const listener = (e: MediaQueryListEvent) => onMm(e);
    mm.addEventListener('change', listener);
    return () => {
      mm.removeEventListener('change', listener);
      cols.removeEventListener('scroll', onScroll);
      dots.removeEventListener('click', onTap);
    };
  }, []);

  /* R313 (D11): the exit sweep is installed at the GUEST boundary
   * (GuestReveal — every public-page navigation), no longer scoped to
   * the landing root. */
  /* R308's corner-coordinate writer (the [0,…] [0,0] debug readout) is
   * retired with the R322 V1 kill — revision tags and coordinates are
   * not content; no element reads this section's geometry anymore. */
  // F2-5 (r157): mobile-menu contract — Escape closes + refocuses the
  // burger (its aria-label flips with the state). r307: an open menu
  // also closes on an outside tap (touch users get no blur event from
  // a tap on the page behind the card).
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  // Scroll chrome on refs, written imperatively — no React re-render
  // per scroll event (the r172 pattern, kept).
  const headerRef = useRef<HTMLElement>(null);
  // R318 (C2) — the auth-warm intent listener's anchor (the root).
  const rootRef = useRef<HTMLDivElement>(null);

  /* r162 (R2) → r164b: warm the AUTH BOUNDARIES while the visitor reads
   * the hero (prod only — dev has no chunk splitting to warm).
   * R318 (C2): the old requestIdleCallback(timeout 4000) fired the
   * two-chunk import MID-SCROLL (react MessagePort 306–756ms LoAF in
   * the CDP profile — the #2 remaining @1440 jank). The warm now rides
   * INTENT (pointerdown/focusin on an auth-boundary link) + a late
   * idle fallback (15s — keyboard/scan readers still get the warm,
   * but never inside the first scroll sweeps). */
  useEffect(() => {
    if (redirectHome) return;
    if (!import.meta.env.PROD) return;
    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      void import('./AuthPage').catch(() => undefined);
      void import('./RegisterPage').catch(() => undefined);
    };
    const onIntent = (e: Event) => {
      const t = e.target as Element | null;
      if (t?.closest?.('a[href*="/auth"]')) {
        warm();
        rootRef.current?.removeEventListener('pointerdown', onIntent);
        rootRef.current?.removeEventListener('focusin', onIntent);
      }
    };
    const root = rootRef.current;
    root?.addEventListener('pointerdown', onIntent, { passive: true });
    root?.addEventListener('focusin', onIntent, { passive: true });
    const ric =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : undefined;
    const idleId = ric ? ric(warm, { timeout: 15000 }) : window.setTimeout(warm, 15000);
    return () => {
      root?.removeEventListener('pointerdown', onIntent);
      root?.removeEventListener('focusin', onIntent);
      if (ric) window.cancelIdleCallback(idleId as number);
      else window.clearTimeout(idleId as number);
    };
  }, [redirectHome]);

  // Scroll-driven chrome with ZERO setState: coalesced to one rAF per
  // frame, written straight to the DOM. r307 (1-C H-2): the apply()
  // is ALSO reconciled on load / resize / fonts-ready — late media
  // (photos) reflows document height and the ribbon must not drift
  // while the visitor sits still.
  //
  // R313 (D8) — the header rides the REFERENCE's class vocabulary
  // (telemetry/header-states.json, direct scrollTop sets):
  //   top           → `header`            (clean)
  //   scrolled      → `header on-scroll on-hide`
  //   back to top   → `header on-hide`    (on-scroll drops, on-hide
  //                                       LATCHES — never removed)
  // `on-scroll` (the old `.scrolled`) flips at y>6 and also takes the
  // solid-paper background. `on-hide` latches on the first
  // scroll-down past the floor. The VISUAL hide/show itself is an
  // imperative transform written from this same rAF (the reference
  // drives its bar from GSAP; a style write is our equivalent — the
  // class list stays exactly the measured vocabulary): down past the
  // floor lifts the bar clear of the frame, up — or near the top —
  // seats it back. An open dropdown holds the bar; reduced motion
  // keeps it pinned (the classes still flip — state, not motion).
  useEffect(() => {
    const header = headerRef.current;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* R318 (C2) — the scroll read rides the EVENT, not the frame: a
     * scrollY read inside rAF lands AFTER the sheet driver's style
     * writes and forces a synchronous full-document layout every
     * frame (639ms self @1440 in the CDP profile). The handler
     * (passive, fires before rAF callbacks) snapshots the seat once
     * per event; apply() only WRITES — and the transform write is
     * idempotent (same-string assignments still invalidate style). */
    let pendingY = window.scrollY;
    let lastY = pendingY;
    let lastTf: string | null = null;
    let lifted = false;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = pendingY;
      if (header) {
        header.classList.toggle('on-scroll', y > 6);
        const delta = y - lastY;
        lastY = y;
        const holds = header.querySelector('[aria-expanded="true"]') !== null;
        if (!holds) {
          if (y < 40) lifted = false;
          else if (delta > 8) {
            lifted = true;
            header.classList.add('on-hide');
          } else if (delta < -8) {
            lifted = false;
          }
        }
        const tf = lifted && !reduced
          ? 'translateY(calc(-100% - 8px))'
          : '';
        if (tf !== lastTf) {
          header.style.transform = tf;
          lastTf = tf;
        }
      }
    };
    const onScroll = () => {
      pendingY = window.scrollY;
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
      const t = e.target as Node | null;
      if (!t) return;
      /* inside the panel — the panel owns the tap (link rows close on
       * their own click; the theme row stops propagation). */
      if (menu?.contains(t)) return;
      /* R313-int (5-int · failure 4 — REAL BUG): an outside tap on the
       * BURGER itself must be left to the burger's own toggle. The old
       * guard closed the menu on pointerdown, then the burger's click
       * toggled false→true and the menu re-mounted within the same
       * interaction — the overlay could never be closed by its own
       * trigger (the r309 'closing-restores-the-position' pin). */
      if (burgerRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const year = new Date().getFullYear();

  /* the platform's two product blocks: the student surface + the
   * teacher cockpit (the honest pair a visitor must see first).
   * R323 (A3 · defect 6): the raster captures retired — the section
   * draws ONE designed product frame (PlatformShowcase); the honest
   * disclosure is the frame's own «بيانات تجريبية» line. */

  return (
    <div
      ref={rootRef}
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

      {/* ═══ THE SHEET FRAME (R313 · D9 → R315 K-A4) — the reference's
          page frame is EXACTLY four 1px hairlines at the 7px inset
          (E-crawl ground truth: .main-deco = 4 lines, NO plus marks, NO
          mono coordinates at the frame edges — nothing that can ever
          collide with the masthead at any width). The drafting ± marks
          live on the hero window's own corners (.bp-plus/.bp-dmark),
          where the reference carries them. ═══ */}
      <div className="sheet-frame" aria-hidden="true" />

      {/* R314 (V3) → R318 (C2): the measured paper grain + dotted
          micro-grid film (scripts/r314/grain-measure.json) now seats on
          body::before while the landing is mounted (the effect below
          toggles the body class) — pseudo-elements are not LCP
          candidates, so the decorative film can never be the page's
          LCP again. Visual coverage identical: fixed, full-viewport,
          under content, pointer-transparent. */}

      {/* R315 (K-A5): the top orange scroll-progress bar is RETIRED —
          the reference has nothing at the frame's top edge (E-crawl
          ground truth: no element above the header band, no progress
          ribbon). Progress stays legible through the sheet's own
          landmarks; the imperative scroll rAF keeps only the header
          hide/show latch. */}

      {/* ── Masthead (R313 · D8) — the reference's fixed 56px bar at
          the 7px frame inset: transparent at rest (the frame's top
          rule shows through), solid paper when scrolled (.on-scroll),
          lifting away on scroll-down via the imperative transform
          (the .on-hide class latches — the measured vocabulary).
          RTL-mirrored seating: brand inline-start (right), the
          four-seat nav, the actions at the far end behind a vertical
          hairline (the reference's line before its CTA). ── */}
      <header className="fo-header" ref={headerRef}>
        {/* R315 (K-B) — the reference's measured cell grammar (E-crawl
            heron-dom @1440×900): one 56.3px row of CELLS separated by
            1px #B3B3AF rules — [logo cell 705 | nav cells 4×136.67 |
            actions cells | CTA cell 166.66] with a bottom hairline,
            nothing else. RTL-mirrored: the logo cell seats inline-start
            (right), the CTA cell ends the row (left). The tagline stack
            is retired (the reference's logo cell = mark + wordmark);
            «تسجيل الدخول» + the theme seats ride as their own cells —
            honest function the reference doesn't need, in the same
            cell language. */}
        <div className="fo-header-inner">
          {/* R323 (A3 · defect 1): the brand cell draws the NEW <Logo>
              mark (the 32-grid khatam) — the retired StarMark is gone.
              «مدارك» stays HTML text (the display-voice wordmark the
              guest-landing e2e reads). */}
          <Link to="/" className="fo-brand" aria-label="مدارك — منصّة التعليم الذكي">
            <Logo variant="mark" size={26} className="fo-brand-mark" />
            <span className="fo-brand-name">مدارك</span>
          </Link>

          <HeaderNav />

          <div className="fo-header-actions">
            <ThemeToggle />
            <Link to="/auth" className="fo-actions-login">تسجيل الدخول</Link>
            <Link to="/auth/register" className="fo-actions-cta">
              <RollLabel text="ابدأ الآن" />
              <Icon icon={ArrowLeft} size={14} className="fo-actions-cta-arrow" aria-hidden />
            </Link>
          </div>

          {/* <992px — R323 (A3 · defect 2): the phone row collapses to
              [Logo lockup | menu button]: ONE real 44×44 menu button —
              a Lucide glyph + the visually-hidden «القائمة» label (the
              old 187×50 wide seat with its clipped label and stray
              1-px rule is retired; the aria-label flip and the
              Escape/focus/scroll-lock contracts are untouched). */}
          <button
            type="button"
            className="fo-burger"
            ref={burgerRef}
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="fo-burger-label">القائمة</span>
            <Icon icon={menuOpen ? X : Menu} size={20} className="fo-burger-ic" />
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
                return;
              }
              /* the open overlay is a focus trap: Tab cycles inside it
                 (the burger re-takes focus itself on close). */
              if (e.key === 'Tab') {
                const items = menuRef.current?.querySelectorAll<HTMLElement>(
                  'a[href], button:not([disabled])',
                );
                if (!items || items.length === 0) return;
                const first: HTMLElement | undefined = items[0];
                const last: HTMLElement | undefined = items[items.length - 1];
                if (!first || !last) return;
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            {/* the four seats as flat 40px rows (the reference's own
                mobile register), then the dropdown children as the
                mono sub-index — every section reachable without an
                expand/collapse dance, every row a real link. */}
            {NAV_SEATS.map((seat) => (
              seat.href.startsWith('#') ? (
                <a key={seat.href} href={seat.href} className="fo-mb-row">{seat.label}</a>
              ) : (
                <Link key={seat.href} to={seat.href} className="fo-mb-row">{seat.label}</Link>
              )
            ))}
            <div className="fo-mb-sub" aria-label="أقسام الصفحة">
              {NAV_SEATS.flatMap((seat) => seat.children ?? []).map((c) => (
                <a key={c.href} href={c.href} className="fo-mb-row fo-mb-sub-row">{c.label}</a>
              ))}
              {/* R313-int (5-int · failure 1): the honest-ledger row keeps
                  «ما يعمل اليوم» reachable from the mobile bar (the r170d
                  pin) after it left the desktop dropdown. */}
              <Link to={MOBILE_LEDGER_ROW.href} className="fo-mb-row fo-mb-sub-row">
                {MOBILE_LEDGER_ROW.label}
              </Link>
            </div>
            <div
              className="fo-mobile-theme"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="fo-mobile-theme-label">المظهر</span>
              <ThemeToggle />
            </div>
            <Link to="/auth" className="btn ghost">تسجيل الدخول</Link>
            {/* the reference's .header-cta.only-mb — the 51px register
                seat INSIDE the overlay (the desktop CTA is hidden). */}
            <Link to="/auth/register" className="btn primary fo-mb-cta">
              ابدأ الآن
              <Icon icon={ArrowLeft} size={14} />
            </Link>
          </nav>
        )}
      </header>

      <main id="main" tabIndex={-1}>

        {/* ═══ [1] HERO — R322 (2-b): the measured Heron transplant.
            ONE art band (the whole elevation, ink filling the band
            width on transparent paper inside the drafting frame —
            the measured img-inner grammar) over ONE content band
            (H1 cols 1–7 ‖ 1px divider ‖ sub + register CTA + the
            work marquee cols 8–12 — the measured 16.01rem band, so
            the CTA sits BESIDE the headline's optical center, no
            leap across whitespace). The [LIVE] disclosure chip and
            the discover link cell retire with the transplant (the
            honest demo-data disclosure lives in the platform frames;
            Heron's content band carries neither). Our own artwork,
            our own copy — never Heron's. ═══ */}
        <section className="fo-hero" aria-label="مدارك — منصّة التعليم الذكي">
          {/* ── the art band — the elevation on transparent paper ── */}
          <div className="fo-hero-art">
            <RevealCssClass as="div" className="fo-hero-art-frame" delay={2}>
              <div className="bp-stage" data-cursor="none">
                {/* The ink rides the TIGHT viewBox frame (.bp-svg —
                    HeroInkWindow) so the drawing owns the full band
                    width; the HeroInspect instrument, its guides and
                    its honest station markers keep ONE coordinate
                    system through the same frame. */}
                <HeroInkWindow />
                <HeroInspect />
                <div className="bp-rulers" aria-hidden="true">
                  <span className="bp-ruler bp-ruler-t" />
                  <span className="bp-ruler bp-ruler-b" />
                  <span className="bp-ruler bp-ruler-s" />
                  <span className="bp-ruler bp-ruler-e" />
                  <span className="bp-plus bp-plus-tl" />
                  <span className="bp-plus bp-plus-tr" />
                  <span className="bp-plus bp-plus-bl" />
                  <span className="bp-plus bp-plus-br" />
                  {/* the dashed measure lines across the paper — the
                      reference's own ruler overlay grammar (measured
                      dashed grid + brand-red marker lines spanning
                      the art box, op .64). */}
                  <span className="bp-measure bp-measure-h bp-measure-h1" />
                  <span className="bp-measure bp-measure-h bp-measure-h2" />
                  <span className="bp-measure bp-measure-v bp-measure-v1" />
                  <span className="bp-measure bp-measure-v bp-measure-v2" />
                  <span className="bp-measure bp-measure-marker bp-measure-m1" />
                  <span className="bp-measure bp-measure-marker bp-measure-m2" />
                  {/* R315 (B1 · A.3): the small ± registration marks at
                      the dashed inner frame's corners (the reference's
                      inner drafting chrome). */}
                  <span className="bp-dmark bp-dmark-tl" />
                  <span className="bp-dmark bp-dmark-tr" />
                  <span className="bp-dmark bp-dmark-bl" />
                  <span className="bp-dmark bp-dmark-br" />
                </div>
              </div>
            </RevealCssClass>
          </div>

          {/* ── the content band — the measured 16.01rem strip:
              H1 cell (cols 1–7) ‖ 1px divider ‖ sub cell (cols 8–12:
              lead + the register CTA, then the work marquee). ── */}
          <div className="fo-hero-content">
            <div className="fo-hero-title-cell">
              <RevealCssClass as="h1" className="fo-hero-title" delay={1}>
                {/* the display canon holds (R315 B1 · A.2 / R322 1-d):
                  UNVOCALISED Arabic (zero tashkeel), 2 lines, the D1
                  rung (--fs-d1 — the Heron-measured h1 ladder), w600,
                  lh 1.05, text-wrap balance. */}
                رحلة تعلم واحدة
                <br />
                من المحاضرة إلى الإتقان
              </RevealCssClass>
            </div>

            <div className="fo-hero-sub-cell">
              <div className="fo-hero-sub-row">
                <RevealCssClass as="p" className="fo-hero-lead" delay={3}>
                  محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل —
                  تجربة عربية واحدة لخمسة أدوار وثلاث شرائح.
                </RevealCssClass>
                {/* the funnel contract (r164b → r188, kept): the hero's
                    register CTA — flush inline-end of the sub cell,
                    beside the lead, in the headline's own band. */}
                <RevealCssClass as="div" className="fo-hero-actions" delay={4}>
                  <Link to="/auth/register" className="btn accent lg fo-hero-cta">
                    أنشئ حسابك الجامعي
                    <Icon icon={ArrowLeft} size={16} />
                  </Link>
                </RevealCssClass>
              </div>

              {/* the work marquee — the reference's home-hero-work strip
                  (72.2×4.36rem): the honest live-capability subjects
                  crawl below the sub row. Duplicated aria-hidden track
                  carries the seamless loop; reduced motion folds to the
                  static row. */}
              <div className="fo-hero-work" aria-label="قدرات مدارك العاملة اليوم">
                <div className="fo-hero-work-track">
                  {HERO_WORK_ITEMS.map((cap, i) => (
                    <span key={cap} className="fo-hero-work-item">
                      <span className="fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="fo-hero-work-track" aria-hidden="true">
                  {HERO_WORK_ITEMS.map((cap, i) => (
                    <span key={cap} className="fo-hero-work-item">
                      <span className="fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ [2] البيان — the statement (the reference's home-intro):
            R322 (2-c) — the measured 6+6 split transplant. The square
            ink art cell rides inline-start (right in RTL — the reading
            start, exactly the reference's LEFT cell mirrored); the
            body column rides inline-end behind a 1px hairline on its
            inline-start edge, holding ONLY the scrub-revealed manifesto
            + one CTA (content pad 6.4/15/3.2/15rem — the 15rem side
            gutter is the band's whole personality), closed by the
            partner strip (the documented-universities crawl in the
            reference's label-row + logo-track + desc anatomy). The
            capabilities crawl and the three persona rows RETIRE from
            the band (§6: ONE statement, no orphan text — the honest
            disclosure lives in the pains answers + /capabilities, the
            personas are the roles band's own). ═══ */}
        <section id="statement" className="st-section" ref={statementRef} aria-labelledby="statement-title">
          <div className="st-grid">
            {/* the art cell — the square massing study fills the 6-col
                cell edge to edge (the reference's 1766×1766 contain
                equivalent) at EVERY breakpoint (its aspect drives the
                tablet/phone band exactly like Heron's own img). */}
            <div className="st-art-cell">
              <StatementArt />
            </div>

            {/* the body column — the manifesto cell over the partner
                strip (the reference's own two-row stack, pinned to the
                column's bottom edge). */}
            <div className="st-body-col">
              <RevealCssClass as="div" className="st-body" delay={2}>
                <span className="fo-label"><span className="fo-mono" dir="ltr">[02]</span> البيان</span>
                <h2 id="statement-title" className="st-title" ref={statementTitleRef}>
                  <ScrubReveal text={STATEMENT_TEXT} className="st-scrub" />
                </h2>
                <a href="#live" className="btn ghost st-cta">
                  شاهد التحديات
                  <Icon icon={ArrowLeft} size={14} aria-hidden="true" />
                </a>
              </RevealCssClass>

              {/* the partner strip — the reference's label row + logo
                  track + desc. OUR figures are the documented
                  universities (the same honest crawl grammar, now with
                  the dashed separators between the cells); the desc
                  carries the media-disclosure line. */}
              <RevealCssClass as="div" className="st-partner" delay={3}>
                <div className="st-partner-row">
                  <span className="st-partner-label fo-mono" dir="ltr">UNIVERSITIES</span>
                </div>
                <div className="fo-ticker st-partner-track" aria-label="جامعات ليبية موثّقة في الوسائط">
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
                <p className="st-partner-desc">
                  توثيق وسائط لا شراكة — الصور والقنوات الرسمية لهذه الجامعات في
                  <Link to="/campus" className="fo-text-link">صفحة الحرم الجامعي</Link>.
                </p>
              </RevealCssClass>
            </div>
          </div>
        </section>

        {/* ═══ [3] التحديات — the four pains (the reference's
            home-problem): R322 (2-d) — the OPEN COLUMN transplant on
            the section's shared grid (V8 closed). A head row (kicker +
            H2 at the reading-start content line, sub note at the far
            column's edge, bottoms aligned like the reference) over
            four unboxed columns — mono keyword + ghost 2-digit index
            meta row, dashed rule, the 20×20rem drawing in its 36rem
            zone, title + body + the live-capability answer. Every edge
            rides the same 4-up hairline grammar the head aligns to;
            @768 it wraps 2×2, @390 it becomes the snap carousel with
            the reference's dot rail. Each pain keeps its honest
            answered-by-a-live-capability line (non-negotiable). ═══ */}
        <section id="live" className="pm-section" aria-labelledby="pm-title">
          <div className="pm-frame">
            <header className="pm-head">
              <div className="pm-title-wrap">
                <span className="fo-label"><span className="fo-mono" dir="ltr">[03]</span> التحديات</span>
                <RevealCssClass as="h2" className="pm-title" delay={1} id="pm-title">
                  أربعة أوجاع من <em>التعليم العالي الليبي</em>
                </RevealCssClass>
              </div>
              <RevealCssClass as="p" className="pm-sub" delay={2}>
                ليست أحكامًا على أحد — بل هي المشكلات التي بُنيت مدارك لحلّها؛
                تحت كل وجع بند يعمل اليوم، والسجل الكامل في
                <Link to="/capabilities" className="fo-text-link">صفحة القدرات</Link>.
              </RevealCssClass>
            </header>

            <ol className="pm-cols" ref={pmColsRef} aria-label="الأوجاع الأربعة">
              {PAINS.map((p, i) => (
                <RevealCssClass
                  as="li"
                  key={p.num}
                  className="pm-col"
                  delay={((i % 3) + 1) as 1 | 2 | 3}
                >
                  <div className="pm-meta">
                    <span className="pm-keyword fo-mono" dir="ltr">{p.keyword}</span>
                    <span className="pm-index fo-mono" dir="ltr">{p.num}</span>
                    <span className="pm-dot" aria-hidden="true" />
                  </div>
                  <div className="pm-artzone">
                    <PainArt kind={p.num} />
                  </div>
                  <div className="pm-content">
                    <h3 className="pm-item-title">{p.title}</h3>
                    <p className="pm-item-sub">{p.text}</p>
                    <p className="pm-item-answer">{p.answer}</p>
                  </div>
                </RevealCssClass>
              ))}
            </ol>

            {/* ≤767 only — the reference's swiper dot rail (2.02×0.2rem
                dots, 1st active): one button per column, the active dot
                follows the snap position, a tap centers its column. */}
            <div className="pm-dots" ref={pmDotsRef} aria-hidden="true">
              {PAINS.map((p) => (
                <button key={p.num} type="button" className="pm-dot-btn" data-pm-num={p.num} tabIndex={-1}>
                  <span className="pm-dot-bar" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ [4] الفصول — the pinned map (the reference's 51%
            walkthrough). r308: chapters 01–04 live in the pinned
            «رحلة التعلّم» walkthrough. R315 (K-E): the 05–06 demo
            rows are retired — the reference's map band is the
            walkthrough alone; the honest ledger lives on
                       /capabilities ═══ */}
        <section id="chapters" className="chapters" aria-labelledby="chapters-title">
          <header className="chapters-head">
            <div className="chapters-head-copy">
              <span className="fo-label"><span className="fo-mono" dir="ltr">[04]</span> الفصول</span>
              <RevealCssClass as="h2" className="chapters-title" delay={1} id="chapters-title">
                الرحلة — <em>أربعة فصول تتحرك أمامك</em>
              </RevealCssClass>
            </div>
            <RevealCssClass as="p" className="chapters-lede" delay={2}>
              مرّر لترى الرحلة تُبنى: أربعة فصول تتحرك في مشهد واحد. لا لقطات مُجمّلة ولا وعود.
            </RevealCssClass>
          </header>

          {/* r308 — «رحلة التعلّم»: the pinned walkthrough. Chapters
              01–04 play out across one persistent drawing while the
              scroll is the timeline (CSS sticky pin; stacked readable
              sequence ≤991px). R313 (D7): the map owns ≈51% of the
              page — the reference's proportion. R315 (K-D): the
              walkthrough reproduces the reference's map states —
              statement → plan on the paper → INTRODUCTION card →
              findings stations with the progress hairline → the red
              room reveal → the closing column. */}
          <JourneyScene />
        </section>

        {/* ═══ [5] المنصّة فعليًا — R323 (A3 · defect 6): ONE crisp
            designed product frame. The blurry dashboard screenshots +
            the pasted tooltip + the «real-ui» chips are retired; the
            frame is an ORIGINAL vector drawing built from the real
            components' grammar (mini lecture-player · mastery matrix ·
            one assistant bubble) — hairline cells, mono index bars,
            orange as the single accent, radius 0. Exactly ONE
            disclosure line «بيانات تجريبية» (the second «اللقطات من
            بيئة العرض…» line is gone with the captures). The CTA still
            scrolls to the conversion row (the funnel counts stay exact
            — no extra auth links on the sheet).
            R318 §A5 (c3-plat): the band keeps the reference's measured
            12-col hairline grammar — the SHEET (.pr-head — [05] mono
            label + the D2 title + the muted sub, the PlatformCanvas
            drawing ON the same paper inside the sheet's hairline frame)
            at the reading-start edge; the frame ≈ the 601 tool canvas.
            No h1-class text runs under any frame — the title seats
            INSIDE the sheet's frame. The flow keeps the tier floors. ═══ */}
        <section id="product" className="pr-section" aria-labelledby="pr-title">
          <div className="pr-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[05]</span> المنصّة فعليًا</span>
            <RevealCssClass as="h2" className="pr-title" delay={1} id="pr-title">
              لا وعود — هذه <em>الواجهة نفسها</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="pr-lede" delay={2}>
              بنية الواجهات نفسها برسم داخلي: مشغّل المحاضرة بنقاط الفحص،
              ومصفوفة الإتقان، والمساعد الأكاديمي — كما تعمل اليوم داخل المنصّة.
            </RevealCssClass>
            {/* the sheet's drawing cell — the plan ON the sheet's paper
                (aria-hidden decorative; hidden with the head at ≤991/992–1024,
                the measured band floors are flow-identical at every tier) */}
            <PlatformCanvas />
          </div>

          <RevealCssClass as="div" className="pr-stage" delay={2}>
            {/* r307 contract kept: the section's CTA scrolls to the
                conversion row (#cta) — never an auth link. */}
            <PlatformShowcase ctaTo="#cta" />
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
              ولكل منها سطح حقيقي داخل المنصّة.
            </RevealCssClass>
          </div>

          <WhyScene />

          <RevealCssClass as="p" className="wy-note" delay={3}>
            اللقطات من بيئة العرض — بيانات تجريبية اصطناعية بالكامل، وموثَّقة على كل إطار.
          </RevealCssClass>
        </section>

        {/* ═══ [7] الأدوار — R323 (A3 · defect 7): the card grid became a
            hairline LEDGER — eight rows (the five verified platform
            roles + the three honest personas), each: mono index, the
            clean role name (IBM Plex 600), a one-line honest
            descriptor, and a status tag in the chip grammar. Hairline
            row rules, no cards; every line still says the truth. ═══ */}
        <section id="roles" className="rl-section" aria-labelledby="rl-title">
          <div className="rl-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[07]</span> الأدوار</span>
            <RevealCssClass as="h2" className="rl-title" delay={1} id="rl-title">
              منصّة واحدة، <em>خمسة أدوار وثلاث شرائح</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="rl-lede" delay={2}>
              خمسة أدوار مثبَّتة داخل المنصّة، وثلاث شرائح يخدمها المنتج اليوم أو يبني لها —
              كل صف يقول الحقيقة كما هي.
            </RevealCssClass>
          </div>

          <ul className="rl-ledger">
            {LEDGER_ROWS.map((r, i) => (
              <RevealCssClass as="li" key={r.name} className="rl-row" delay={((i % 3) + 1) as 1 | 2 | 3}>
                <span className="rl-row-num fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
                <h3 className="rl-row-name">{r.name}</h3>
                <p className="rl-row-line">{r.line}</p>
                <span className={`rl-row-tag${r.live ? ' is-live' : ''}`}>{r.state}</span>
              </RevealCssClass>
            ))}
          </ul>

          <RevealCssClass as="p" className="rl-more" delay={3}>
            بيانات كل مؤسّسة معزولة تمامًا — والصلاحيات منفصلة دورًا بدور.
          </RevealCssClass>
        </section>

        {/* ═══ [8] الخاتمة (the reference's cta) — the resolve. R323
            (A3 · defect 8): the empty plus-marked sketch placeholder box
            and the «المشروع / اللغة / القدرات» metadata ledger (with its
            Latin «RTL» cell) are REMOVED — one statement + two real
            buttons close the sheet; the true numbers (colleges,
            campuses, live capabilities) ride the registry strip below,
            computed from the real config. R322 V1: the [R313] revision
            row + the r308 corner-coordinate readout stay deleted —
            debug text is not content. ═══ */}
        <section className="fo-cta" id="vision" aria-label="ابدأ رحلتك — أنشئ حسابك">
          <div className="fo-cta-inner">
            <RevealCssClass as="h2" className="fo-cta-title" delay={1}>
              جاهز لبدء <em>رحلتك</em>؟
            </RevealCssClass>
            <RevealCssClass as="p" className="fo-cta-lede" delay={2}>
              أنشئ حسابك الجامعي في دقائق — ببريدك الإلكتروني ورقم قيدك،
              وتابع تقدّمك من أول محاضرة.
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

          {/* [9] the colleges registry strip — the ruled hairline row
              linking the public registry (the funnel's 5th login
              affordance lives here; the demo-data disclosure rides the
              row, never a tooltip). R323 (A3 · defect 8): the TRUE
              numbers the old metadata ledger carried (colleges,
              campuses, the live-capability count) ride HERE, computed
              from the real config/data — never invented. */}
          <div className="cg-strip" id="colleges">
            <span className="cg-strip-label fo-mono" dir="ltr">[09] · REGISTRY</span>
            <p className="cg-strip-text">
              <strong><span className="fo-mono" dir="ltr">{formatInt(colleges.length)}</span> كلية</strong> في{' '}
              <span className="fo-mono" dir="ltr">{formatInt(CAMPUS_COUNT)}</span> أحرام —{' '}
              <span className="fo-mono" dir="ltr">[{String(LIVE_COUNT).padStart(2, '0')}]</span> قدرات تعمل اليوم.
              بيانات «جامعة مدارك التجريبية»: اصطناعية بالكامل لأغراض العرض.
            </p>
            <div className="cg-strip-links">
              <Link to="/colleges" className="btn ghost sm">تصفح الكليات التجريبية</Link>
              <Link to="/auth" className="fo-text-link">سجل الدخول لاستعراض كليتك داخل المنصّة</Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── COLOPHON FOOTER (R313 · D14) — the reference's own
          composition: the inspection strip (the pointer lens
          resolving the journey drawing) over a THREE-column grid —
          (1) the identity + the subscribe seat, (2) the wide index +
          the honest address, (3) the giant line-art mark fading in
          with the scroll — closed by the legal row. ── */}
      {/* ═══ [9] FOOTER — R314 V9: the reference's cell grid (pair-100):
          strip-image cell · tagline cell · link columns · subscribe cell ·
          address/contact cells · drawn-mark cell — every cell hairline-
          ruled — closed by the GIANT outlined construction-line wordmark
          (Madarek's own: مدارك + MADAREK) and the legal row. Honest copy
          throughout (demo-data disclosure, no fake subscribe, no
          invented contacts). ═══ */}
      <footer className="fo-footer">
        {/* R314 (cycle-2 §7 heights): the colophon re-orders to the
            measured reference composition (711px = cell grid 355 +
            image strip 314 + legal row 42) — the grid FIRST, then the
            strip band (the inspection lens + the closing wordmark
            riding the same full-bleed band — the reference's own
            graphic|text strip split), then the legal row. */}
        <div className="fo-footer-inner">
          <div className="fo-fgrid">

            {/* [01] the strip-image cell — the ink-rendered architecture
                (own subject/licence; the reference's rendered stairs seat) */}
            <div className="fo-fcell fo-fcell-strip">
              <img
                className="fo-fstrip-img"
                src="/media/renders/crop-garyounis-classic-960.webp"
                alt="رسم حبري لعمارة حرم جامعي ليبي — مشتق من صورة مرخّصة"
                loading="lazy"
                width={960}
                height={960}
              />
              <span className="fo-fcell-tag fo-mono" dir="ltr">[01] CAMPUS · INK RENDER</span>
            </div>

            {/* [02] the tagline cell — the honest identity paragraph.
                R323 (A3 · defects 1+9): the identity mark draws the NEW
                <Logo> (the retired StarMark is gone) and the filler
                newsletter block («قريبًا — لا توجد قائمة بريدية») is
                removed entirely — the honest-copy rule: dropping the
                seat is the approved option, no fake opt-in remains. */}
            <div className="fo-fcell fo-fcell-tagline">
              <Link to="/" className="fo-brand" aria-label="مدارك — منصّة التعليم الذكي">
                <Logo variant="mark" size={26} className="fo-brand-mark" />
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

            {/* [03–05] the three link columns (the reference's
                COMPANY/PRODUCT/RESOURCES seats, Madarek's own index) */}
            <nav className="fo-fcell fo-fcell-links" aria-label="فهرس المنصّة">
              <div className="fo-footer-heading">المنصّة</div>
              <Link to="/capabilities" className="fo-footer-link">ما يعمل اليوم</Link>
              <a href="#product" className="fo-footer-link">المنصّة فعليًا</a>
              <a href="#chapters" className="fo-footer-link">الفصول</a>
              <a href="#roles" className="fo-footer-link">الأدوار والشرائح</a>
              <Link to="/colleges" className="fo-footer-link">الكليات التجريبية</Link>
            </nav>
            <nav className="fo-fcell fo-fcell-links" aria-label="المحتوى والرحلة">
              <div className="fo-footer-heading">الرحلة</div>
              <a href="#statement" className="fo-footer-link">البيان</a>
              <a href="#live" className="fo-footer-link">التحديات</a>
              <Link to="/campus" className="fo-footer-link">الحياة الجامعية</Link>
              <a href="#vision" className="fo-footer-link">المبدأ والرؤية</a>
              <a href="#main" className="fo-footer-link">أعلى الصفحة</a>
            </nav>
            <nav className="fo-fcell fo-fcell-links" aria-label="الحساب">
              <div className="fo-footer-heading">الحساب</div>
              <Link to="/auth/register" className="fo-footer-link">إنشاء حساب جامعي</Link>
              <Link to="/auth" className="fo-footer-link">تسجيل الدخول</Link>
            </nav>

            {/* [06] the address cell — the reference's Sydney seat becomes
                the demo institution's own identity: an explicitly fictional
                place and the platform's real country (honest-copy rule:
                nothing invented, no real-institution affiliation). */}
            <div className="fo-fcell fo-fcell-addr">
              <div className="fo-footer-heading">العنوان</div>
              <p className="fo-footer-addr-line">جامعة مدارك التجريبية — مؤسسة عرض اصطناعية</p>
              <p className="fo-footer-addr-line">طرابلس، ليبيا</p>
            </div>

            {/* [07] the contact cell — honest and personal-data-free (owner
                order R315: the repo link and every owner-identity trace are
                retired from all surfaces). The page's own early-access
                form is the one real channel today — R320 §D promotes the
                prose to a link: the honest-channel copy moved onto
                /contact, the footer carries the door. */}
            <div className="fo-fcell fo-fcell-addr">
              <div className="fo-footer-heading">التواصل</div>
              <Link to="/contact" className="fo-footer-link">التواصل والتسجيل المبكر</Link>
              <p className="fo-footer-addr-line">لا بريد عام في مرحلة الإطلاق التجريبي.</p>
            </div>

            {/* R323 (A3 · defect 1): the [08] drawn-mark cell (the big
                circle-star construction drawing) is REMOVED — one mark
                per view; the sheet's mark lives in the header, the
                identity cell above and the wordmark below. */}
          </div>

          {/* the image-strip band (the reference's footer-img-wrap): the
              five-column inspection strip (FooterLens — R319 §D2) rides
              BELOW the grid, above the legal row (the measured order),
              and the GIANT wordmark — Madarek's own «مدارك», REAL
              letterforms shaped from the site's Alexandria 700 display
              font (R318 §A6 → R319 §D1: scripts/r318/wordmark-build.mjs
              → the committed wordmark-art.generated.ts) — spans the
              footer's FULL inner measure at EVERY viewport
              (width:100% + viewBox scaling): CONNECTED shaping (no
              construction track — the owner read the tracked word as
              letter-spaced disconnected letters), STROKE-ONLY ink
              (fill:none; stroke:currentColor; ~1.7px non-scaling),
              the svg's own aria-label + <title> carrying the reading.
              The strip hides ≤767px (the reference hides its strip
              there too); the wordmark flows as its own band on mobile
              in the SAME full-width cut. */}
          <div className="fo-fstrip">
            <FooterLens />
            <div className="fo-wordmark">
              <span className="fo-wordmark-reg fo-wordmark-reg-tl" aria-hidden="true" />
              <span className="fo-wordmark-reg fo-wordmark-reg-tr" aria-hidden="true" />
              <span className="fo-wordmark-reg fo-wordmark-reg-bl" aria-hidden="true" />
              <span className="fo-wordmark-reg fo-wordmark-reg-br" aria-hidden="true" />

              {/* ── R323 (A3 · defect 1): the ONE full-cell-width cut is
                  the NEW brand system's outlined wordmark — <Logo
                  variant="wordmark"> (the generated Plex 600 letterforms
                  of «مدارك», stroke-only currentColor, the orange point
                  rides the mark seats only). The full-cell-width
                  behaviour is kept: the sheet spans the cell at every
                  viewport (landing.css .fo-wordmark .mdrk-logo). The
                  reading rides the svg's role="img" + aria-label +
                  <title> «مدارك». */}
              <Logo variant="wordmark" size={100} className="fo-wordmark-logo" />

              <span className="fo-wordmark-en fo-mono" dir="ltr" aria-hidden="true">MADAREK — ARABIC-FIRST LEARNING SHEET</span>
            </div>
          </div>

          {/* R320 §D (c2-LEGAL · §A5) → R321 §A2: the nine public sheets'
              legal links ride the © bar's own row now (ONE ruled line
              instead of two — the footer grew +267px over the reference
              across R320's wordmark/strip/legal additions; the §A2
              ratchet brings docH back inside ±1.5% of Heron at every
              measured viewport). Every policy/public page stays
              reachable from the footer; the nav keeps its own label. */}
          <div className="fo-footer-bottom">
            <span className="fo-mono">© {year} مدارك</span>
            <nav className="fo-legal-row" aria-label="سياسات المنصّة وصفحاتها العامة">
              <Link to="/legal/privacy" className="fo-legal-link">سياسة الخصوصية</Link>
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              <Link to="/legal/terms" className="fo-legal-link">شروط الاستخدام</Link>
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              <Link to="/legal/cookies" className="fo-legal-link">التخزين المحلي</Link>
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              <Link to="/legal/accessibility" className="fo-legal-link">إمكانية الوصول</Link>
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              <Link to="/legal/security" className="fo-legal-link">الأمن</Link>
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              <Link to="/legal/data" className="fo-legal-link">البيانات</Link>
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              <Link to="/about" className="fo-legal-link">عن مدارك</Link>
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              <Link to="/help" className="fo-legal-link">المساعدة</Link>
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              <Link to="/contact" className="fo-legal-link">التواصل</Link>
            </nav>
            <span className="fo-footer-cluster">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل</span>
          </div>
        </div>
      </footer>

      {/* R314 B10 — the landing chrome pair: the local-storage consent
          gate (V11) + the right-edge vertical tab (V12). Public surface
          only — these never mount on auth pages. */}
      <ConsentBanner />
      <EdgeTab />
    </div>
  );
}
