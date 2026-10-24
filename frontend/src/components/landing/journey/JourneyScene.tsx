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
 *         fading through the first band's opening (--jt-p 0→.13);
 *      2. the PLAN drawn directly on the paper — the window's white
 *         inset box + boxed caption are gone (landing.css);
 *      3. the INTRODUCTION card — the reference's corner card: a dark
 *         var(--text) title bar + four lines that scrub-reveal line
 *         by line (--jt-p .14→.50) + the [تابع التمرير] mono
 *         affordance; it hands off to the closing column at the last
 *         band (fades .84→.90, before the side opens at .93);
 *      4. the FINDINGS — the four stations with the progress hairline
 *         under the sheet (the --jt-r fill);
 *      5. the REVEAL — the solid red rooms (the zone wash, per stage);
 *      6. the CLOSING — the expanding capability column at pin end.
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
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';

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

/* Reading-environment probes. Guarded the same way useReducedMotion
 * guards (jsdom without matchMedia must fall through to the desktop
 * path — the r311 integration class mounts this scene for real). */
function viewportState(): { mobile: boolean; reduced: boolean } {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { mobile: false, reduced: false };
  }
  const mobile = window.matchMedia('(max-width: 991px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { mobile, reduced };
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
 * once — never a per-frame desktop query. */
function applyCam(track: HTMLElement, reading: number, reduced: boolean, dirty: { current: boolean }): void {
  const svg = track.querySelector<SVGSVGElement>('.jt-cam .bp-svg');
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
  svg.setAttribute('viewBox', `${r[0]} ${r[1]} ${r[2]} ${r[3]}`);
  if (svg.getAttribute('preserveAspectRatio') !== 'xMidYMid slice') {
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  }
  svg.dataset.cam = 'cropped';
  dirty.current = true;
}

/* restore the twin's sheet to the full plan (the ≥992px crossing);
 * called only when a previous mobile pass cropped it. */
function restoreCam(track: HTMLElement): void {
  const svg = track.querySelector<SVGSVGElement>('.jt-cam .bp-svg');
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
         frame). Falls back to the pin metric before the stack exists. */
      const stations =
        stationsRef.current ??
        (stationsRef.current = track.querySelector<HTMLElement>('.jt-stations'));
      const camEl =
        camElRef.current ?? (camElRef.current = track.querySelector<HTMLElement>('.jt-cam'));
      if (stations && camEl) {
        const sRect = stations.getBoundingClientRect();
        const cRect = camEl.getBoundingClientRect();
        if (sRect.height > 0) {
          const band = cRect.bottom + (vh - cRect.bottom) * 0.45;
          reading = (band - sRect.top) / sRect.height;
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
    /* R315 (K-D) — the statement + card visibility windows: the
     * statement owns the opening (through the first band's start at
     * .125), the card the mid-traversal (it hands off to the closing
     * column before the side opens at .93). Discrete idempotent
     * writes — the opacity itself scrubs from --jt-p in CSS. */
    const statement = statementRef.current;
    if (statement) {
      const on = pin <= 0.13 ? 'on' : 'off';
      if (statement.dataset.on !== on) statement.dataset.on = on;
    }
    const intro = introRef.current;
    if (intro) {
      const on = pin >= 0.09 && pin <= 0.9 ? 'on' : 'off';
      if (intro.dataset.on !== on) intro.dataset.on = on;
    }
    track.style.setProperty('--jt-p', pin.toFixed(4));
    /* the progress hairline's clock: the reading parameter at ≤991px
     * (the stations stack IS the timeline there), the pin ≥992px. */
    track.style.setProperty('--jt-r', (mobile ? reading : pin).toFixed(4));
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

        {/* the expanding capability column (pin end) */}
        <div className="jt-side" ref={sideRef} data-open="off">
          <span className="jt-side-label fo-mono" dir="ltr">[01–04] · LIVE</span>
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
