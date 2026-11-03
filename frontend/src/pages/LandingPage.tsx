import { Link, Navigate } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check,
} from 'lucide-react';
import { Icon } from '../components/Icon';
// R323 (A3 · defect 1) — the ONE brand system: the retired StarMark/
// BrandMark drawings are replaced by the new <Logo> everywhere on the
// landing sheet (header mark, footer identity mark, the footer's giant
// wordmark, the loader's mark). The «مدارك» wordmark beside the header
// mark stays HTML text — the guest-landing contract renders it.
import { Logo } from '../brand';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { colleges } from '../data/colleges.config';
import { ROLE_SHOWCASES } from '../data/university-media';
import { LIVE_COUNT } from '../data/landing-ledger';
import { formatInt } from '../utils/numbers';
import { RevealCssClass } from '../hooks/useReveal';
/* R333 (P-C) — the ONE reveal recipe for the second half (SplitText
 * LINES-only display rise · batch item rise · imgCardReveal cards;
 * Arabic line-level only, RM bails, JS-off-safe arming). */
import { initReveals } from '../lib/reveals';
/* r325 Y2 — PlatformCanvas/PlatformPlanArt (the head-strip plan +
 * its over-art pin) retire with the Y2 rebuild: the plan's caption
 * lives under the ONE product frame now (see PlatformShowcase). */
/* R331 (A-Web-Hero) — the hero JSX block moved into its own folder
 * (components/landing/hero/Hero.tsx): the Heron-mechanics rebuild
 * (mask-line title reveal · wiping frame edges · staged ink-in ·
 * deco cards · work-card rise). HeroInkWindow/HeroInspect mount from
 * there; the r331/hero.css import rides the component. */
import { Hero } from '../components/landing/hero/Hero';
import { StatementArt } from '../components/landing/StatementArt';
import { WhyScene } from '../components/landing/WhyScene';
import { PainArt } from '../components/landing/PainArt';
/* R333 P-D — the entry sequence rebuild (heron-craft row 1): the
 * preloader is the paper overlay + stroke-draw + % counter with the
 * GSAP clip-path wipe exit; the R313 SheetLoader retires from the
 * mount (the file stays for rollback) — the introGate decision (once
 * per session, RM/save-data skip) is unchanged and Preloader stamps
 * the same session flag. */
import { Preloader } from '../components/landing/chrome/Preloader';
import { SheetCursor } from '../components/landing/cursor/SheetCursor';
import { JourneyScene } from '../components/landing/journey/JourneyScene';
import { ScrubReveal } from '../components/landing/journey/WordReveal';
/* P-A2 R333 (INV-08 · heron-craft row 13) — the platform band's
 * product-proof strip: three REAL captures of the running platform,
 * re-captured @2880×1740 (the heron platform frame's 1440×870 @1×)
 * from the seeded stack. Vite-asset imports — the import IS the
 * fingerprinted dist asset; lazy <img>s, Arabic alt, never eager. */
import lectureShot from '../assets/product/lecture-checkpoint.webp';
import aiTutorShot from '../assets/product/ai-tutor.webp';
import examActiveShot from '../assets/product/exam-active.webp';
import { FooterLens } from '../components/landing/footer/FooterLens';
// R323 (A3 · defects 1+9): FooterArt (FooterMarkArt/WordmarkArt) is
// retired — the giant footer wordmark is <Logo variant="wordmark"> now
// and the circle-star mark cell is removed (ONE mark per view).
import { ConsentBanner } from '../components/landing/chrome/ConsentBanner';
import { EdgeTab } from '../components/landing/chrome/EdgeTab';
import { shouldPlayIntro, introEnvironment } from '../lib/motion/introGate';
import { useSheetScroll } from '../lib/motion/useSheetScroll';
import { clamp } from '../lib/motion/sheetConductor';
// r314-chrome.css — R314 B10 — the consent banner (V11) + the right-edge
// vertical tab (V12): the landing chrome pair, Heron geometry with
// Madarek's own honest content. R323 (A3 · defect 3): imported BEFORE
// landing.css so the sheet's R323 chrome block (the compact phone
// consent bar + the --z-consent/--z-loader tokens) is the cascade's
// last word over the chrome pair without specificity forks.
import '../styles/landing/consent-edge.css';
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
// landing/ — R332 (A-CSS-Exec): the 7,920-line landing.css monolith was
// split VERBATIM into the per-section sheets below. The import order IS
// the original rule order (the region map + the five proven-safe
// moves live in docs/redesign/r332/css-split-landing.md) — the family
// still loads AFTER r314-chrome.css and BEFORE r330-home.css exactly
// as the single landing.css import did, so every cascade contract
// (r323 chrome last-word, r330 override, r331 nav last-word) holds.
// The old landing.css path survives as an EMPTY stub (gates enumerate it).
import '../styles/landing/chrome.css';
import '../styles/landing/hero.css';
import '../styles/landing/statement.css';
import '../styles/landing/reveals.css';
import '../styles/landing/journey.css';
import '../styles/landing/pains.css';
import '../styles/landing/roles.css';
import '../styles/landing/colleges.css';
import '../styles/landing/cta.css';
import '../styles/landing/why.css';
import '../styles/landing/footer.css';
import '../styles/landing/shared.css';
import '../styles/landing/platform.css';
import '../styles/landing/strata.css';
// r330-home.css — R330 (A-Web-Home) — the homepage's Heron-composition
// pass (hero/statement/pains: dominant ink bands, decisive display
// scale, the ruled-table pains grid, deepened reveals). Loaded AFTER
// landing.css so its namespaced rules win by cascade order — the ONLY
// stylesheet this round may add (file-ownership contract).
import '../styles/landing/home.css';
/* R331 (A-Web-Nav) — the masthead owns its own file now: the header
 * state machine, the seat register, the menu choreography and
 * r331/nav.css all live in the chrome component
 * (components/landing/chrome/SheetNav.tsx — the file-ownership
 * contract: this page keeps the SHEET, not the bar). Imported AFTER
 * landing.css + r330-home.css so nav.css's header rules win by
 * cascade order over any same-specificity sheet rule. */
import { SheetNav } from '../components/landing/chrome/SheetNav';

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

/* ── r325 Y2 — the platform §05's ONE product frame, rebuilt on the
 * extracted grammar (docs/redesign/r324/heron/full-<bp>.json,
 * home-platform: content 361px | img-wrap 601px | content-right 464px
 * @1440 — the 3/5/4 twelve-col seat our ≥992 grid re-derives):
 *
 *   · ONE wide product frame — the drawn lecture-player (slide with a
 *     concept chain, the playhead track, the checkpoint card) on the
 *     sheet's hairline figure. The r323 frame-head chrome
 *     («[05] · MADAREK · UI GRAMMAR») carried no information — the
 *     filler label is retired with the bar.
 *   · the floor-plan tooltip («قاعة المحاضرة التفاعلية — نقطة فحص
 *     تُصحَّح فورًا») is re-seated as the frame's CAPTION BELOW the art
 *     (the reference's own caption grammar) — nothing floats over the
 *     drawing, and the plan miniature retires with its pin.
 *   · the hairline step list (the player's concept index) moves
 *     BESIDE the frame into the heading column (the extracted
 *     content cell's own step list), drawn as ruled rows.
 *   · the mastery matrix + the assistant cell ride the inline-end
 *     column (the extracted content-right seat).
 *
 * Honest by construction: every cell states the grammar of a REAL
 * surface (the player's checkpoint mechanism, the qualitative matrix,
 * the assistant's LIVE concept-explain scope — the r168b truthfulness
 * canon: no summarisation promise), and the section carries exactly
 * ONE demo-data disclosure. Pure drafting chrome: the drawing body is
 * aria-hidden; the reading lives in the caption, the lede and the
 * section's own copy. */
function PlatformShowcase() {
  return (
    <figure className="pr-frame">
      <div className="pr-frame-art" aria-hidden="true">
        <div className="pr-cell-bar">
          <span className="pr-cell-idx fo-mono" dir="ltr">[01]</span>
          <span className="pr-cell-title">المحاضرة التفاعلية</span>
          <span className="pr-cell-note fo-mono" dir="ltr">24:36</span>
        </div>

        {/* the player screen — the slide's drafted plate: the position
            counter, the heading mass, the concept chain with the ONE
            accent checkpoint node, over the playhead track */}
        <div className="pr-screen">
          <span className="pr-slide-kicker fo-mono" dir="ltr">02 / 04</span>
          <div className="pr-slide">
            <span className="pr-slide-rule" />
            <span className="pr-slide-rule is-sub" />
            <div className="pr-chain">
              <span className="pr-node">
                <i className="pr-node-line" />
                <i className="pr-node-line is-short" />
              </span>
              <span className="pr-chain-link" />
              <span className="pr-node is-acc">
                <i className="pr-node-dot" />
                <i className="pr-node-line is-short" />
              </span>
              <span className="pr-chain-link" />
              <span className="pr-node">
                <i className="pr-node-line" />
                <i className="pr-node-line is-short" />
              </span>
            </div>
            <span className="pr-slide-line" />
            <span className="pr-slide-line is-short" />
          </div>
          <div className="pr-track">
            <span className="pr-track-fill" />
            <i className="pr-tick" />
            <i className="pr-tick" />
            <i className="pr-tick" />
            <span className="pr-track-head" />
          </div>
        </div>

        {/* the checkpoint card — the one honest checkpoint surface */}
        <div className="pr-check">
          <span className="pr-check-k">نقطة فحص</span>
          <p className="pr-check-q">سؤال قصير يُصحَّح فورًا داخل المحاضرة</p>
          <span className="pr-check-btn">تحقّق</span>
        </div>
      </div>

      {/* the caption BELOW the frame — the former plan pin, re-seated */}
      <figcaption className="pr-frame-cap">
        <span className="pr-cap-title">قاعة المحاضرة التفاعلية</span>
        <span className="pr-cap-line">نقطة فحص تُصحَّح فورًا داخل القاعة</span>
      </figcaption>
    </figure>
  );
}

/* ── P-A2 R333 (INV-08 · heron-craft row 13) — THE PRODUCT-PROOF
 * STRIP. Heron's platform band proves the drawing became a working
 * tool with its real app windows; the r325 Y2 rebuild kept the drawn
 * frame alone (the supervisor defect: the sheet's only real captures
 * lived in the why strip). The proof strip seats the 2× captures as
 * three prf-card-grammar panels — hairline frame, radius 0, the
 * paper chip (mono index + Arabic label — the caption IS content) —
 * under the band's grid (row 3, inside the row-1 stretch's slack:
 * height-neutral by construction, the twin floor stays exact).
 *
 * The entrance is row 13's own imgCardReveal (scale 0.8→1 + fade):
 * the panels ride reveals.ts CARD_SEL → .reveal-card, the house
 * IO-driven rung — reduced motion bails before arming and the strip
 * ships visible; JS-off the same (the module owns ALL hiding).
 * Honest by construction: the alts describe the REAL seeded UI; the
 * chips name the surface; zero links (the funnel counts stay 5+5). */
const PLATFORM_SHOTS = [
  {
    src: lectureShot,
    chip: '[01]',
    labelAr: 'محاضرة تفاعلية',
    altAr: 'مشغّل محاضرة مدارك أثناء محاضرة «هندسة البرمجيات» مع بطاقة نقطة فحص مدمجة في الفيديو — بيانات العرض التجريبية',
  },
  {
    src: aiTutorShot,
    chip: '[02]',
    labelAr: 'معلّم ذكي',
    altAr: 'المساعد الأكاديمي في مدارك يجيب عن سؤال الطالب داخل الواجهة — بيانات العرض التجريبية',
  },
  {
    src: examActiveShot,
    chip: '[03]',
    labelAr: 'اختبار',
    altAr: 'اختبار إلكتروني في مدارك أثناء عمله بمؤقّت حيّ مع عدّاد الأسئلة — بيانات العرض التجريبية',
  },
] as const;

function PlatformShots() {
  return (
    <div className="pr-shots" role="group" aria-label="واجهات المنصّة الحقيقية">
      {PLATFORM_SHOTS.map((s) => (
        <figure key={s.chip} className="pr-shot">
          <div className="pr-shot-media">
            <img
              src={s.src}
              alt={s.altAr}
              loading="lazy"
              decoding="async"
              width={1440}
              height={870}
            />
            {/* the drafting frame layer — four 1px corner ticks inside
                the hairline box (vector-effect keeps them 1px at every
                scale); pure chrome, aria-hidden */}
            <svg
              className="pr-shot-frame"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M0 7 L0 0 L7 0" vectorEffect="non-scaling-stroke" />
              <path d="M93 0 L100 0 L100 7" vectorEffect="non-scaling-stroke" />
              <path d="M100 93 L100 100 L93 100" vectorEffect="non-scaling-stroke" />
              <path d="M7 100 L0 100 L0 93" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <figcaption className="prf-idxchip pr-shot-chip">
            <span className="fo-mono" dir="ltr">{s.chip}</span>
            <span className="pr-shot-label">{s.labelAr}</span>
          </figcaption>
        </figure>
      ))}
    </div>
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

  /* R318 (C2) — the grain's body seat: mounted class in, unmounted out
   * (the pseudo-element film is landing-only, exactly like the old
   * .fo-grain div; idempotent both ways). */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.add('mdrk-grain');
    return () => document.body.classList.remove('mdrk-grain');
  }, []);

  /* R333 (P-C) — the second-half reveal grammar (layout effect: the
   * gsap.set hidden state lands PRE-PAINT, so the armed frame never
   * flashes un-hidden content). initReveals is idempotent
   * (window.__mdrkReveals) and its destroy() kills every trigger and
   * reverts every split — remount-safe (React 18 double-effect
   * included). RM: the module bails and the copy ships visible. */
  useLayoutEffect(() => {
    const reveals = initReveals();
    return () => reveals.destroy();
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
  // R318 (C2) — the auth-warm intent listener's anchor (the root).
  // (The header's own refs + the scroll state machine moved to
  // SheetNav with R331 — the page keeps the SHEET, not the bar.)
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

      {/* R333 P-D — the entrance sequence (once per session via the
          introGate session flag; RM/save-data visitors skip entirely).
          onExitStart flips the sheet to intro-done the moment the
          wipe opens — the hero's ink-in draws WHILE the preloader
          reveals it, and the consent banner mounts beneath the
          reveal (never overlapping the overlay). */}
      {introPlaying && (
        <Preloader
          onExitStart={() => setIntroDone(true)}
          onDone={() => {
            setIntroDone(true);
            setIntroPlaying(false);
          }}
        />
      )}

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

      {/* ── The masthead — R331 (A-Web-Nav): the Heron-measured bar
          (transparent paper in every state, the on-scroll/on-hide
          state machine, the clip-path menu) lives in its own chrome
          component with its own stylesheet — see
          components/landing/chrome/SheetNav.tsx + styles/r331/nav.css
          and docs/redesign/r331/web-nav.md. ── */}
      <SheetNav />

      <main id="main" tabIndex={-1}>

        {/* ═══ [1] HERO — R331 (A-Web-Hero): the Heron-mechanics
            rebuild. ONE art band (the drafting stage: ink + wiping
            frame + ruler chrome + deco cards + the inspection
            instrument) over ONE content band (masked-line H1 ‖ 1px
            divider ‖ sub + the register CTA + the login secondary)
            closed by the work strip — the reveal grammar, motion
            values and layer stack of docs/redesign/r331/heron-program.md
            §4, on Madarek's own artwork and copy. The component owns
            the whole block (and imports styles/r331/hero.css). ═══ */}
        <Hero />


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
              {PAINS.map((p) => (
                <li
                  key={p.num}
                  className="pm-col"
                  data-mdrk-reveal="item"
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
                </li>
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

        {/* ═══ [5] المنصّة فعليًا — r325 Y2: the band rebuilt on the
            extracted grammar (full-<bp>.json, home-platform 361/601/464
            @1440): the heading + hairline STEP LIST at the reading-start
            column, ONE wide product frame (the drawn lecture-player) in
            the centre, the matrix + assistant cells at the inline end,
            and the former plan tooltip re-seated as the frame's CAPTION
            BELOW the art — nothing floats over the drawing. The r323
            frame-head chrome («[05] · MADAREK · UI GRAMMAR») and the
            plan miniature retire (filler / overlaid art). Hairline
            cells, mono indexes ≥11px, orange as the single accent,
            radius 0. Exactly ONE disclosure line «بيانات تجريبية». The
            CTA still scrolls to the conversion row (the funnel counts
            stay exact — no extra auth links on the sheet). ═══ */}
        <section id="product" className="pr-section" aria-labelledby="pr-title">
          {/* the heading column — the extracted content cell: label,
              title, lede, then the player's concept steps as the
              hairline index BESIDE the frame (the extracted cell's own
              step list; aria-hidden drafting chrome — the honest read
              lives in the title/lede/caption/note). */}
          <div className="pr-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[05]</span> المنصّة فعليًا</span>
            <RevealCssClass as="h2" className="pr-title" delay={1} id="pr-title">
              لا وعود — هذه <em>الواجهة نفسها</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="pr-lede" delay={2}>
              بنية الواجهات نفسها برسم داخلي: مشغّل المحاضرة بنقاط الفحص،
              ومصفوفة الإتقان، والمساعد الأكاديمي — كما تعمل اليوم داخل المنصّة.
            </RevealCssClass>
            <ol className="pr-chapters" aria-hidden="true">
              <li className="pr-ch">
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
            </ol>
          </div>

          <RevealCssClass as="div" className="pr-stage" delay={2}>
            <PlatformShowcase />
          </RevealCssClass>

          {/* the inline-end column — the two drawn surfaces (the
              extracted content-right seat; aria-hidden drafting
              chrome; folds at ≤1024 with the strips-only bands) */}
          <RevealCssClass as="div" className="pr-side" delay={3} aria-hidden="true">
            <div className="pr-cell pr-cell-matrix">
              <div className="pr-cell-bar">
                <span className="pr-cell-idx fo-mono" dir="ltr">[02]</span>
                <span className="pr-cell-title">مصفوفة الإتقان</span>
              </div>
              <div className="pr-matrix">
                {/* ONE solid accent cell — the reference's drawings
                    carry one orange signal per frame; the two warm
                    cells keep the outline. */}
                <span className="pr-mc is-hot" />
                <span className="pr-mc" />
                <span className="pr-mc is-warm" />
                <span className="pr-mc" />
                <span className="pr-mc" />
                <span className="pr-mc is-warm" />
                <span className="pr-mc" />
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
          </RevealCssClass>

          {/* the row-2 note — a DIRECT child of the section grid (the
              ≥992 seat is cols 9–12 / row 2, the reference's own
              inspector-note position; under the frame at ≤767; hidden
              with the head at the strips-only 768–1024 bands). The
              r307 contract kept: the CTA scrolls to the conversion
              row (#cta) — never an auth link. */}
          <RevealCssClass as="div" className="pr-note" delay={3}>
            <span className="pr-frame-demo fo-mono">بيانات تجريبية</span>
            <a href="#cta" className="fo-text-link pr-frame-cta">
              أنشئ حسابك لتجربتها حيّة
              <Icon icon={ArrowLeft} size={13} />
            </a>
          </RevealCssClass>

          {/* P-A2 (INV-08 · heron row 13) — the product-proof strip:
              the band's real 2× captures, seated in row 3 (the ≥992
              grid's stretch slack — height-neutral). ≤991 the band's
              capture-free fold stands (the twin lock): the strip
              renders ≥992 only. */}
          <PlatformShots />
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

          {/* R325 Y3 — the strip's ONE disclosure line: the per-frame
              caption demos retired with the overlay chrome (both rode
              the art or duplicated this note); this note carries the
              demo-data confession once, below the whole strip. */}
          <RevealCssClass as="p" className="wy-note" delay={3}>
            اللقطات من بيئة العرض — بيانات «جامعة مدارك التجريبية» اصطناعية بالكامل.
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
              <li key={r.name} className="rl-row" data-mdrk-reveal="item">
                <span className="rl-row-num fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
                <h3 className="rl-row-name">{r.name}</h3>
                <p className="rl-row-line">{r.line}</p>
                <span className={`rl-row-tag${r.live ? ' is-live' : ''}`}>{r.state}</span>
              </li>
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
            <h2 className="fo-cta-title" data-mdrk-reveal="lines">
              جاهز لبدء <em>رحلتك</em>؟
            </h2>
            <p className="fo-cta-lede" data-mdrk-reveal="item">
              أنشئ حسابك الجامعي في دقائق — ببريدك الإلكتروني ورقم قيدك،
              وتابع تقدّمك من أول محاضرة.
            </p>
            <div className="fo-cta-actions" data-mdrk-reveal="item" id="cta">
              <Link to="/auth/register" className="btn accent lg">
                أنشئ حسابك الجامعي
                <Icon icon={ArrowLeft} size={16} />
              </Link>
              <Link to="/auth" className="btn ghost lg">تسجيل الدخول</Link>
            </div>
            <p className="fo-cta-meta" data-mdrk-reveal="item">
              <Icon icon={Check} size={13} />
              مدارك · {year} · منصّة تعليمية مستقلّة
            </p>
          </div>

          {/* [9] the colleges registry strip — the ruled hairline row
              linking the public registry (the funnel's 5th login
              affordance lives here; the demo-data disclosure rides the
              row, never a tooltip). R323 (A3 · defect 8): the TRUE
              numbers the old metadata ledger carried (colleges,
              campuses, the live-capability count) ride HERE, computed
              from the real config/data — never invented. */}
          <div className="cg-strip" id="colleges">
            {/* R328 (H5): the index renumbers [09]→[08] — the footer's
                old [08] drawn-mark cell retired in R323, so the sheet's
                own ladder ran hero[01]…roles[07] then skipped to [09];
                the registry strip IS the eighth band. */}
            <span className="cg-strip-label fo-mono" dir="ltr">[08] · REGISTRY</span>
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

              <span className="fo-wordmark-en fo-mono" dir="ltr" aria-hidden="true">MADAREK — ARABIC-FIRST LEARNING PLATFORM</span>
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
              <span className="fo-legal-sep" aria-hidden="true">·</span>
              {/* R327 D1 — the distribution sheet beside the legal row */}
              <Link to="/app" className="fo-legal-link">تطبيق الجوال</Link>
            </nav>
            <span className="fo-footer-cluster">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل</span>
          </div>
        </div>
      </footer>

      {/* R314 B10 — the landing chrome pair: the local-storage consent
          gate (V11) + the right-edge vertical tab (V12). Public surface
          only — these never mount on auth pages.
          R333 P-D — the consent banner waits for the preloader's exit
          (introDone flips at wipe-start / the `mdrk:entry-done` event;
          no overlay overlap), while the tab is not an overlay and
          mounts as before. */}
      {introDone && <ConsentBanner />}
      <EdgeTab />

      {/* R308 → R333 P-D — the custom pointer instrument, mounted LAST
          (fine pointers only; reduced motion and touch keep the native
          cursor). Its dedicated sheet is styles/landing/cursor.css. */}
      <SheetCursor />
    </div>
  );
}
