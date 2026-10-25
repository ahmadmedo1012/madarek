/**
 * JourneyScene — R308 «رحلة التعلّم» · R310 the plan scene · R312 the
 * mobile camera · R315 the reference's map states.
 *
 * The reference's narrative center of gravity is a pinned scene that
 * owns ~51% of the page. The R310 translation (spec §2.2/§4.3): the
 * walkthrough draws an original detailed FLOOR PLAN — «مسطح التعلّم»
 * (LearningPlanDrawing) — and the plan's geometry GENUINELY BUILDS as
 * the scroll advances:
 *
 *  · stage 0 (شاهد) — the envelope, column grid and the lecture hall
 *    (raked seating + stage) draw in;
 *  · stage 1 (تحقّق) — the checkpoint kiosk joins;
 *  · stage 2 (اختبر) — the exam hall + the library wing join;
 *  · stage 3 (أتقن) — the mastery room, the entry and every
 *    annotation resolve — the completed plan.
 * The active stage's zone carries the signal WASH on the plan itself
 * (the architectural highlight — no floating rings over the busy
 * geometry; the station markers at the zone DOORS warm with the
 * stage: [01] lecture · [02] checkpoint · [03] exam · [05] mastery —
 * the R312 off-by-one fix; [04] the library door stays quiet: the
 * wing builds at stage 2 but owns no stage in the story).
 *
 *  · R315 (K-D — owner §4.4): the walkthrough reproduces the
 *    reference's map-band states (landing-chrome.md §7 + the live
 *    walk: statement → plan → INTRODUCTION card → findings → reveal
 *    → closing) on top of the unchanged R310 station machine:
 *      1. the opening STATEMENT — one line centered over the paper,
 *         holding the reference's own long opening dwell (the live
 *         walk's statement still stands at 25% of the band; the ink
 *         below resolves from --jt-p .30);
 *      2. the PLAN drawn directly on the paper — the window's white
 *         inset box + boxed caption are gone (landing.css); C4-A:
 *         the window FILLS the stage and the ink scrubs in across
 *         the reference's own kk cross-fade window (f ≈.39–.52);
 *      3. the INTRODUCTION card — the reference's corner card: a dark
 *         var(--text) title bar + four lines that scrub-reveal line
 *         by line (C4-A dwell .28→.68, the reference's measured
 *         card window: in at f .32–.52, gone before the 75% frame)
 *         + the [تابع التمرير] mono affordance;
 *      4. the FINDINGS — the four stations with the progress hairline
 *         under the sheet (the --jt-r fill) + the plan's own
 *         violation-callout chips at the doors (C4-A);
 *      5. the REVEAL — the solid red rooms (the zone wash, per stage);
 *      6. the CLOSING — the expanding capability column at pin end,
 *         now the sheet's SECOND VIEW (the section A-A panel beside
 *         the plan — the reference's multi-view technical sheet).
 *    Six states, the reference's dwell shape (statement front-loaded,
 *    card across the middle, closing at the release), and the pin
 *    start/end stay PROPORTIONAL (the R314 ruling): the station bands
 *    + the stage flip formula are untouched — the new states ride the
 *    SAME --jt-p clock inside those bands.
 *
 *  · The pin is CSS `position: sticky` (the reference's own choice —
 *    GSAP never pins), measured per viewport height; it dies ≤991px
 *    into a stacked readable sequence (no pin on touch/narrow).
 *  · R312 (§R R1 — the art-direction pass): at ≤991px the window is
 *    re-mounted as the `.jt-cam` twin directly on the track — a
 *    STICKY CAMERA that spans the whole stacked flow while the
 *    station cards scroll beneath it, and the viewBox CROPS to the
 *    active stage's zone instead of squeezing the whole 1200×760
 *    sheet into the column. The camera follows the READING parameter
 *    (where the stations stack sits against the viewport's centre
 *    band — the same «station nearest the centre band» contract as
 *    the desktop pin bands) continuously between the stage band
 *    centres; reduced motion holds the discrete crop (no mid-scroll
 *    drift). ≥992px the twin is display:none and the pin's own
 *    window shows the full sheet — the driver restores it on the
 *    crossing. R315: the statement + card ride the flow as readable
 *    twins BEFORE the camera (the ≤991px ladder keeps its stacked
 *    readable contract — the card's lines stand complete, static).
 *  · Scroll IS the timeline: --jt-p drives everything from ONE frame
 *    on the shared clock (no React renders per scroll; the driver
 *    sleeps shortly after scrolling stops — useSheetScroll).
 *  · The stage texts use the Arabic-safe WordReveal; the capability
 *    checklist column expands at pin end (the width transition, once).
 *  · Content is the honest capability ledger — every line a real,
 *    live capability (LIVE_CAPABILITIES lineage); no invented claims.
 */
import { useRef } from 'react';
import { Check } from 'lucide-react';
import { Icon } from '../../Icon';
import { LearningPlanDrawing, PLAN_VB } from '../LearningPlanDrawing';
import { ScrubReveal, WordReveal } from './WordReveal';
import { SectionDrawing } from './SectionDrawing';
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';
import { setSheetVar, sheetRect } from '../../../lib/motion/sheetConductor';

/* ── The four walkthrough stages — reading order (RTL) through the
 * PLAN. The zone + station references mirror LearningPlanDrawing's
 * own layer names (the wash + marker wiring lives in landing.css). */
interface JourneyStage {
  num: string;
  verbAr: string;
  titleAr: string;
  textAr: string;
  meta: string;
}

const STAGES_J: JourneyStage[] = [
  {
    num: '01',
    verbAr: 'شاهد',
    titleAr: 'المحاضرة التفاعلية',
    textAr: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، وحضور يُحتسب تلقائيًا عند الإكمال.',
    meta: 'live · lectures',
  },
  {
    num: '02',
    verbAr: 'تحقّق',
    titleAr: 'نقاط الفحص',
    textAr: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.',
    meta: 'live · checkpoints',
  },
  {
    num: '03',
    verbAr: 'اختبر',
    titleAr: 'الاختبارات الإلكترونية',
    textAr: 'بنك أسئلة بأربعة أنواع وقوالب جاهزة، وتصحيح تلقائي للأسئلة الموضوعية.',
    meta: 'live · exams',
  },
  {
    num: '04',
    verbAr: 'أتقن',
    titleAr: 'مصفوفة الإتقان',
    textAr: 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب.',
    meta: 'live · mastery',
  },
];

/* The capability checklist — the expanding column at pin end. Every
 * line is a live capability (the honest ledger); the closing note
 * carries the r191 AI-assistant scope contract verbatim (claims only
 * the local engine — no external services). */
const CHECKLIST = [
  'محاضرات تفاعلية بنقاط فحص وحضور تلقائي',
  'تصحيح فوري يُثبِّت الفهم لحظة بلحظة',
  'اختبارات بأربعة أنواع وتصحيح تلقائي للموضوعي',
  'مصفوفة إتقان تقترح خطوتك التالية',
];

const ASSISTANT_NOTE =
  'والمساعد الأكاديمي — يعمل الآن داخل المنصّة — يقترح شروحات مخصَّصة وخطط مراجعة حسب أدائك الفعلي.';

/* ── R315 (K-D) — the reference's map states, translated ────────────
 * The statement + the INTRODUCTION card's copy. Honest, no invented
 * claims: the card says exactly what the scene does (a real plan of
 * one learning floor; the red wash marks the active room; every room
 * is a live capability — the same ledger the stations carry). */
const STATEMENT_AR = 'الرحلة مرسومة على مسطح واحد';
const INTRO_TITLE_AR = 'مقدمة';
const INTRO_LINES_AR = [
  'هذا مسطح لطابق تعلم واحد في مدارك.',
  'أربع قاعات حول ممر واحد، ولكل قاعة بابها.',
  'القاعة النشطة تضيء بالبرتقالي مع تقدّم التمرير.',
  'وكل قاعة ميزة تعمل اليوم — لا وعدًا قادمًا.',
] as const;
const INTRO_MORE_AR = '[تابع التمرير]';

/* the opening statement — the pin instance fades through the first
 * band's opening (the driver flips visibility; landing.css scrubs the
 * opacity from --jt-p); the flow instance is the ≤991px readable
 * twin (static — the same display:none discipline as the PlanWindow
 * twin: never both in the a11y tree at once). */
function JtStatement({ flow = false }: { flow?: boolean }) {
  return (
    <p className={flow ? 'jt-statement-m' : 'jt-statement'}>
      {STATEMENT_AR}
    </p>
  );
}

/* the INTRODUCTION card — the reference's corner card: the dark
 * var(--text) title bar, the four lines (each scrub-reveals inside
 * its own --jt-p window — landing.css), and the mono continue
 * affordance at the foot. The flow twin is the ≤991px static read; the
 * pin instance carries the driver's visibility-ref. */
function JtIntro({
  flow = false,
  innerRef,
}: {
  flow?: boolean;
  innerRef?: React.Ref<HTMLElement>;
}) {
  return (
    <aside ref={innerRef} className={flow ? 'jt-intro-m' : 'jt-intro'} data-on="off">
      <p className="jt-intro-title">{INTRO_TITLE_AR}</p>
      <div className="jt-intro-lines">
        {INTRO_LINES_AR.map((line) => (
          <ScrubReveal key={line} className="jt-intro-line" text={line} />
        ))}
      </div>
      <p className="jt-intro-more">{INTRO_MORE_AR}</p>
    </aside>
  );
}

/* ── R312 — the mobile camera crop table (§R R1) ────────────────────
 * Crop windows over the sheet, each centred on its stage's WASHED
 * zone (the zone rect + its door station from LearningPlanDrawing's
 * geometry), clamped to the sheet. R314 cycle 2 (§7 map share): the
 * windows were re-proportioned 560×420 → 480×500 so each stage shows
 * its zone + the corridor + a preview slice of the NEXT zone in the
 * reading order — more plan visible per stage (≈17% more sheet area
 * per view), a slower, more meaningful scrub (the frame grew with
 * them: 48svh — see the .jt-cam rule in landing.css). At 390×844 the
 * frame's inner box is ≈316×379 (page gutter + frame chrome), so the
 * slice renders at scale ≈0.758 and shows ≈417×500 of each window —
 * every washed zone + its door verified inside that visible band
 * (lecture 764–1122 · checkpoint 764–1122 · exam 424–753 · mastery
 * 78–413, doors [01]–[05]) — keeping the corridor poché ≈12.1px ≥
 * the 12px floor. The stage machine itself is untouched.
 *  · 0 — the lecture hall  (zone 764,78 + door [01] at 850,384) +
 *    the sheet title block + a checkpoint preview at the bottom
 *  · 1 — the checkpoint kiosk (zone 764,475 + door [02] at 850,492)
 *    + the full service strip to the sheet edge
 *  · 2 — the exam hall     (zone 424,79  + doors [03]/[04]) + a
 *    library preview
 *  · 3 — the mastery room  (zone 79,79   + door [05] at 270,384) +
 *    the reception preview + the west wall
 */
type CamRect = readonly [number, number, number, number];
const MOBILE_CROPS: readonly CamRect[] = [
  [680, 30, 480, 500],
  [680, 260, 480, 500],
  [348, 60, 480, 500],
  [12, 60, 480, 500],
];

/* the stage band centres — where the discrete stage flips; the camera
 * interpolates between the crop rects across these (scrub semantics,
 * reversible with scroll). */
const CAM_BANDS = [0.125, 0.375, 0.625, 0.875];

/* ── R318 C2-S1 — the PIN-ROOT publish (the measured seat) ─────────────
 * `landing.css` reads `--jt-p` ONLY inside `.jt-pin` — the plan's 8 scrub
 * LAYER GROUPS (`.jt-pin .jt-plan .pl-l-*`), the pin statement
 * (`.jt-statement` — the flow twin is a different class, static) and the
 * pin INTRODUCTION card + its `--wr-p` line mapping (`.jt-intro*`); no
 * consumer exists outside `.jt-pin` (audited: landing.css is the only
 * stylesheet that mentions the var). Publishing the clock THERE means
 * the recalc walk per frame covers the pin sheet alone — measured at
 * 4×CPU (one write + one forced flush per cycle, 12 cycles):
 *   · track root `.jt` (the old seat)      ~39.7ms @1440 / 32.2ms @390
 *   · 10-seat fan-out (layers+card+stmt)   ~25.8ms @1440 /  0.1ms @390
 *   · PIN ROOT `.jt-pin` (this)             ~8.8ms @1440 /  0.6ms @390
 * A custom-property write on an ancestor invalidates the whole
 * descendant walk, so ONE seat beats re-dirtying ten separate roots
 * (per-root walk overhead) and beats the track root (which also
 * invalidates the visible stations/flow the var never touches).
 * `--jt-r` stays on the two `.jt-progress` hairline seats — the cam
 * window's copy lives OUTSIDE `.jt-pin`, and the fill's `inline-size`
 * recalc is per-seat-cheap (~0.4ms @1440, ~3ms @390 per cycle).
 * WIDTH-INDEPENDENT: the pin sheet is `display:none` at ≤991px and
 * Blink SKIPS recalc of display:none subtrees — the mobile scrub rides
 * the viewBox + `data-stage`, so the publish costs ~nothing on phones.
 * Seats resolve once per layout epoch (mount + `onRefresh`) and fall
 * back to the track root if `.jt-pin` is ever missing (slower, never
 * wrong). */
const PIN_SEAT_SEL = '.jt-pin';
const R_SEAT_SEL = '.jt-progress';

/* Reading-environment probes. Guarded the same way useReducedMotion
 * guards (jsdom without matchMedia must fall through to the desktop
 * path — the r311 integration class mounts this scene for real).
 *
 * R318 C2-S1 — the two lists are constructed ONCE and reused, not
 * re-parsed per scroll tick (a fresh `matchMedia(...)` pair per frame
 * measured 4.6–5.0ms per scroll run at 4×CPU). The lists are LIVE:
 * `.matches` is re-read on every call, so the viewport crossing and a
 * mid-session reduced-motion flip still land in the same frame — the
 * r312 camera contract and the r311 RM contract are unchanged. */
let mobileQuery: MediaQueryList | null = null;
let reducedQuery: MediaQueryList | null = null;
function viewportState(): { mobile: boolean; reduced: boolean } {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { mobile: false, reduced: false };
  }
  mobileQuery ??= window.matchMedia('(max-width: 991px)');
  reducedQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return { mobile: mobileQuery.matches, reduced: reducedQuery.matches };
}

/* the crop rect at a continuous reading position — piecewise-linear
 * between the band centres, held at both ends. */
function camRectAt(reading: number): CamRect {
  if (reading <= CAM_BANDS[0]!) return MOBILE_CROPS[0]!;
  if (reading >= CAM_BANDS[3]!) return MOBILE_CROPS[3]!;
  let i = 0;
  while (i < CAM_BANDS.length - 2 && reading > CAM_BANDS[i + 1]!) i += 1;
  const t = (reading - CAM_BANDS[i]!) / (CAM_BANDS[i + 1]! - CAM_BANDS[i]!);
  const a = MOBILE_CROPS[i]!;
  const b = MOBILE_CROPS[i + 1]!;
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
    a[3] + (b[3] - a[3]) * t,
  ];
}

/* apply the camera to the `.jt-cam` twin's sheet: slice cover keeps
 * the crop edge-to-edge in the frame. Flags the sheet (dataset + the
 * caller's dirty ref) so the ≥992px crossing can restore it exactly
 * once — never a per-frame desktop query.
 *
 * R318 C2-S1 — the per-frame rewrite is GONE: the interpolated rect is
 * quantized to whole viewBox units (1px on a 480-wide window —
 * invisible) and the write is skipped unless the composed string
 * CHANGES (the guarded `preserveAspectRatio` sibling's discipline).
 * The interpolated values used to re-set the attribute EVERY tick —
 * re-invalidating the full 1200×760 plan raster inside `.jt-cam` each
 * frame on phones (the 390 cell's worst paint cost). Clamped dwells at
 * the CAM_BANDS ends and sub-unit steps now write nothing. */
const camSvgByTrack = new WeakMap<HTMLElement, SVGSVGElement>();

function camSvgFor(track: HTMLElement): SVGSVGElement | null {
  const hit = camSvgByTrack.get(track);
  if (hit) return hit;
  const svg = track.querySelector<SVGSVGElement>('.jt-cam .bp-svg');
  if (svg) camSvgByTrack.set(track, svg);
  return svg;
}

function applyCam(track: HTMLElement, reading: number, reduced: boolean, dirty: { current: boolean }): void {
  const svg = camSvgFor(track);
  if (!svg) return;
  let r: CamRect;
  if (reduced) {
    /* the SAME flip as the driver's stage formula — the discrete node
     * for the stage the reading band is in (floor, never +0.5: the RM
     * crop and the wash must name the same zone). */
    const idx = Math.max(0, Math.min(MOBILE_CROPS.length - 1, Math.floor(reading * MOBILE_CROPS.length)));
    r = MOBILE_CROPS[idx] ?? MOBILE_CROPS[MOBILE_CROPS.length - 1]!;
  } else {
    r = camRectAt(reading);
  }
  const vb = `${Math.round(r[0])} ${Math.round(r[1])} ${Math.round(r[2])} ${Math.round(r[3])}`;
  if (svg.getAttribute('viewBox') !== vb) {
    svg.setAttribute('viewBox', vb);
  }
  if (svg.getAttribute('preserveAspectRatio') !== 'xMidYMid slice') {
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  }
  if (svg.dataset.cam !== 'cropped') {
    svg.dataset.cam = 'cropped';
  }
  dirty.current = true;
}

/* restore the twin's sheet to the full plan (the ≥992px crossing);
 * called only when a previous mobile pass cropped it. */
function restoreCam(track: HTMLElement): void {
  const svg = camSvgFor(track);
  if (!svg) return;
  if (svg.dataset.cam !== 'cropped') return;
  svg.setAttribute('viewBox', `0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  delete svg.dataset.cam;
}

/* The window chassis shared by both layouts: the drawing + the mono
 * status strip. The pin's instance is the desktop window; the `cam`
 * twin is the ≤991px sticky camera (never displayed at once — the
 * hidden instance is display:none, out of the a11y tree). Both share
 * the same .jt[data-stage] build/wash contract, so the twin is always
 * in sync with the pin's instance. */
function PlanWindow({ cam = false }: { cam?: boolean }) {
  return (
    <div className={cam ? 'jt-window jt-cam' : 'jt-window'}>
      <LearningPlanDrawing />
      {/* the findings' progress hairline — the plan-width rule under
          the sheet (R315 K-D); the fill scrubs with the walkthrough's
          reading progress (--jt-r — landing.css) */}
      <div className="jt-progress" aria-hidden="true">
        <span />
      </div>
      {/* the status strip — the current station, stacked + faded */}
      <div className="jt-status" aria-hidden="true">
        {STAGES_J.map((s) => (
          <span key={s.num} className="jt-status-line">
            <span className="fo-mono" dir="ltr">{s.num} · {s.meta}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function JourneyScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  /* R315 (K-D) — the pin's statement + card seats (the visibility
   * flips are the same discrete idempotent writes as the side column's
   * open; the opacity itself scrubs from --jt-p in CSS). */
  const statementRef = useRef<HTMLParagraphElement | null>(null);
  const introRef = useRef<HTMLElement>(null);
  /* the mobile reading geometry cache — resolved once per mount:
   * the stations stack (the parameter's source) and the camera frame
   * (the reading band sits BELOW its live bottom edge, so the card at
   * the band is always in the open region, never behind the frame). */
  const stationsRef = useRef<HTMLElement | null>(null);
  const camElRef = useRef<HTMLElement | null>(null);
  /* R318 C2-S1 — the stations stack's DOCUMENT geometry (doc-space
   * top + height), measured once per layout epoch instead of every
   * frame: the stack is plain in-flow content, so its viewport top
   * derives exactly from `window.scrollY` per frame (free — no layout
   * read), and the cache only needs a re-measure when the layout
   * itself changes (useSheetScroll calls `onRefresh` on resize and on
   * scroll-settle, then the frame re-measures lazily). The camera
   * frame stays a live batched read — it is `position: sticky`, whose
   * NATURAL flow position is unmeasurable while stuck, so deriving
   * its viewport rect from cached doc offsets would drift; one read
   * per tick through the shared sheetRect batch is the honest cost. */
  const stationsDocRef = useRef<{ top: number; height: number } | null>(null);
  /* R318 C2-S1 — the var publish seats (see the PIN-ROOT block);
   * resolved lazily, dropped by `onRefresh` so a layout epoch
   * re-resolves them once. */
  const pinSeatRef = useRef<HTMLElement | null>(null);
  const rSeatsRef = useRef<HTMLElement[]>([]);
  /* the cam-cropped flag — set by applyCam, consumed by the ≥992px
   * crossing so restoreCam never runs per frame on desktop. */
  const camDirtyRef = useRef(false);

  /* ── The ONE scroll driver: --jt-p, data-stage (the plan's staged
   *     build + the zone wash + the station warming all read it from
   *     CSS — imperative, zero React renders per scroll tick). ──── */
  useSheetScroll(trackRef, ({ vh, pin }) => {
    const track = trackRef.current;
    if (!track) return;

    /* the stage derivation splits by layout:
     *  · ≥992px — the pin-band formula (the R310 contract, unchanged);
     *  · ≤991px — the READING parameter: where the stations stack sits
     *    against the reading band (below the camera frame's live
     *    bottom). The card being read is the zone on the sheet, and
     *    the camera crops to it (R312). */
    const { mobile, reduced } = viewportState();
    let reading = pin;
    let stage: number;
    if (mobile) {
      /* the reading parameter: where the stations stack sits against
       * the READING BAND — the open region below the camera frame's
         live bottom edge (the card at the band is never behind the
         frame). Falls back to the pin metric before the stack exists.
       *
       * R318 C2-S1 — the two per-frame stations/cam gBCR reads are
       * gone: the stack's position derives from its cached DOCUMENT
       * geometry + `window.scrollY` (it is in-flow, never sticky),
       * and the sticky cam rect rides the shared once-per-tick batch. */
      const stations =
        stationsRef.current ??
        (stationsRef.current = track.querySelector<HTMLElement>('.jt-stations'));
      const camEl =
        camElRef.current ?? (camElRef.current = track.querySelector<HTMLElement>('.jt-cam'));
      if (stations && camEl) {
        let doc = stationsDocRef.current;
        if (!doc) {
          const sRect = sheetRect(stations).rect;
          if (sRect.height > 0) {
            doc = { top: sRect.top + window.scrollY, height: sRect.height };
            stationsDocRef.current = doc;
          }
        }
        if (doc && doc.height > 0) {
          const cRect = sheetRect(camEl).rect;
          const sTop = doc.top - window.scrollY;
          const band = cRect.bottom + (vh - cRect.bottom) * 0.45;
          reading = (band - sTop) / doc.height;
        }
      }
      const r = Math.max(0, Math.min(1, reading));
      /* the mobile flip formula: stage i spans reading [i/4, (i+1)/4) —
       * the flip lands midway between the card-centre moments, so the
       * card AT the band always matches the zone on the sheet (the
       * desktop keeps the R310 pin-band contract — a different,
       * production-verified geometry). */
      stage = Math.max(0, Math.min(STAGES_J.length - 1, Math.floor(r * STAGES_J.length)));
      applyCam(track, r, reduced, camDirtyRef);
    } else {
      stage = Math.max(0, Math.min(STAGES_J.length - 1, Math.floor(pin * STAGES_J.length + 0.5)));
      if (camDirtyRef.current) {
        restoreCam(track);
        camDirtyRef.current = false;
      }
    }

    /* the active stage = the station nearest the reading band */
    if (track.dataset.stage !== String(stage)) {
      track.dataset.stage = String(stage);
    }
    /* the expanding column at the pin's end */
    const side = sideRef.current;
    if (side) {
      const open = pin >= 0.93 ? 'on' : 'off';
      if (side.dataset.open !== open) side.dataset.open = open;
    }
    /* R315 (K-D · C4-A dwell) — the statement + card visibility
     * windows, re-seated to the reference's measured state machine:
     * the statement owns the opening THROUGH the first station band
     * (the live walk's statement still stands at 25% of the band —
     * the ink resolves from .30), and the card holds the MID-
     * traversal only (the reference's own card: in at f .32–.52,
     * gone before the 75% frame). Discrete idempotent writes — the
     * opacity itself scrubs from --jt-p in CSS. */
    const statement = statementRef.current;
    if (statement) {
      const on = pin <= 0.36 ? 'on' : 'off';
      if (statement.dataset.on !== on) statement.dataset.on = on;
    }
    const intro = introRef.current;
    if (intro) {
      const on = pin >= 0.27 && pin <= 0.68 ? 'on' : 'off';
      if (intro.dataset.on !== on) intro.dataset.on = on;
    }
    /* R318 C2-S1 — idempotent clock writes through the conductor's
     * last-value cache, published on the PIN-ROOT seat (the measured
     * cheapest publish — see the PIN-ROOT block above); the track root
     * is the fallback when `.jt-pin` is missing. */
    if (!pinSeatRef.current) {
      pinSeatRef.current = track.querySelector<HTMLElement>(PIN_SEAT_SEL);
    }
    if (rSeatsRef.current.length === 0) {
      rSeatsRef.current = Array.from(track.querySelectorAll<HTMLElement>(R_SEAT_SEL));
    }
    const pStr = pin.toFixed(4);
    const rStr = (mobile ? reading : pin).toFixed(4);
    setSheetVar((pinSeatRef.current ?? track).style, '--jt-p', pStr);
    /* the progress hairline's clock: the reading parameter at ≤991px
     * (the stations stack IS the timeline there), the pin ≥992px —
     * written on each window's own `.jt-progress` fill seat. */
    for (const el of rSeatsRef.current) setSheetVar(el.style, '--jt-r', rStr);
  }, {
    /* drop the stations doc-geometry cache when the layout may have
     * changed (resize + scroll settle) — the next frame re-measures it
     * once; pure scroll keeps the cache hot (no layout read at all).
     * The var publish seats re-resolve on the same epoch (sheet edits
     * get picked up honestly instead of pinning a stale seat). */
    onRefresh: () => {
      stationsDocRef.current = null;
      pinSeatRef.current = null;
      rSeatsRef.current = [];
    },
  });

  return (
    <div className="jt" ref={trackRef} data-stage="0">
      <div className="jt-pin">
        <PlanWindow />

        {/* R315 (K-D) — the opening statement over the paper */}
        <p className="jt-statement" ref={statementRef} data-on="on">
          {STATEMENT_AR}
        </p>

        {/* the reference's INTRODUCTION card — the bottom corner */}
        <JtIntro innerRef={introRef} />

        {/* the expanding capability column (pin end) — C4-A: the
            sheet's SECOND VIEW: the section A-A panel rides above the
            honest checklist, so the release reads as one multi-view
            drawing sheet (the reference's s07 grammar). Desktop-only
            chrome (landing.css hides the panel ≤991px — the stacked
            readable ladder keeps its measured band heights). */}
        <div className="jt-side" ref={sideRef} data-open="off">
          <span className="jt-side-label fo-mono" dir="ltr">[01–04] · LIVE</span>
          <figure className="jt-side-section">
            <SectionDrawing />
            <figcaption>
              قطاع A-A · مسطح التعلّم
              <span className="fo-mono" dir="ltr">[SECTION A-A · 1:200]</span>
            </figcaption>
          </figure>
          <ul className="jt-checklist">
            {CHECKLIST.map((c) => (
              <li key={c}>
                <Icon icon={Check} size={13} />
                {c}
              </li>
            ))}
          </ul>
          <p className="jt-side-note">{ASSISTANT_NOTE}</p>
        </div>
      </div>

      {/* R312 (§R R1) — the mobile camera: at ≤991px `.jt-flow` is a
          real block (the camera's sticky container) holding the frame
          + the station cards — so the cam releases exactly when the
          stations end and the side column (outside the flow) is never
          covered. R315 (K-D): the statement + card ride the flow as
          readable twins BEFORE the camera. ≥992px `.jt-flow` is
          display:contents — the cam + the twins are display:none and
          the stations absolute against the track, exactly the R310
          desktop contract. */}
      <div className="jt-flow">
        <JtStatement flow />
        <JtIntro flow />
        <PlanWindow cam />

        {/* the number stations — riding the track past the fixed drawing */}
        <div className="jt-stations">
          {STAGES_J.map((s) => (
            <article key={s.num} className="jt-station">
              <span className="jt-station-num fo-mono" dir="ltr">{s.num}</span>
              <h3 className="jt-station-verb">{s.verbAr}</h3>
              <p className="jt-station-title">{s.titleAr}</p>
              <WordReveal className="jt-station-text" text={s.textAr} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
