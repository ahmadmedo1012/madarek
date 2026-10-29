/**
 * JourneyScene — R308 «رحلة التعلّم» · R310–R319 the plan scene's own
 * history · **R322 (3-b) — THE MAP TRANSPLANT** (Heron `home-map`).
 *
 * The reference's narrative center of gravity is ONE sticky frame that
 * owns ~51% of the page: an architectural plan that draws itself in
 * as you scroll, while two statement plaques, a bottom-corner
 * INTRODUCTION card and a reserved closing column narrate it
 * (`docs/redesign/r322/heron/map.md` — every number below is measured
 * from that extraction, never re-invented here).
 *
 * THE STRUCTURE (Heron's, seat for seat):
 *
 * ```
 * .jt (the track: 649dvh @≥992 · the stacked column @≤991)
 * └─ .jt-pin (the FRAME — sticky top:0 ≈100vh, flex, ≥992 only)
 *     ├─ .jt-map-col (the PLAN COLUMN — flex:1 @≥992 · the scroll
 *     │   track @≤991)            [contain: layout paint]
 *     │   └─ .jt-map-in (the stack seat — the ENTRANCE drift seat
 *     │       @≥992 · the STICKY WINDOW @≤991)
 *     │       ├─ .jt-window (the plan box: svg + counter chips
 *     │       │   + the two statement plaques — all ride the drift)
 *     │       └─ .jt-intro (absolute bottom-inline-start — Heron's
 *     │           home-map-intro: paper card, 1px hairline, dark
 *     │           head chip, 5 findings ONE at a time, grows upward)
 *     └─ .jt-close (the CLOSING COLUMN — 464px @1440 RESERVED from
 *         stage 0; content opacity-revealed at scrub end @≥992 ·
 *         stacked full-width below the track @≤991)
 * ```
 *
 * THE SIX STATES (the semantic machine, `data-stage` on `.jt` —
 * scroll picks from `docs/redesign/r322/heron/map.md`'s state table):
 *
 *   0 statement — plaque 1 («الرحلة مرسومة على مسطح واحد») over the
 *     SETTLED paper; the plan's BASE layer (frame + envelope) is
 *     visible from frame one (the R322 V2 kill — never an empty grid);
 *   1 plan — plaque 1 out, plaque 2 in («لكل فصل غرفته وبابها» — a
 *     SECOND distinct ~20-char statement, derived from the journey's
 *     own copy, never a duplicate of plaque 1 nor of the band head);
 *   2 card — the INTRODUCTION card active + finding 1;
 *   3 findings — the drawing builds: layer 1 in with the first
 *     finding, then layers 2–6 one per 0.5s step while findings 2–5
 *     rotate one at a time (the plan's own 5 rooms/capabilities);
 *   4 room — all 6 layers ON = the finished plan; the orange is the
 *     bounded room wash only (a `pl-zone` fill, ≤0.5% of the frame);
 *   5 closing — the scrub ends, the closing column's content reveals
 *     (reserved geometry — NEVER an animated width; the pin-end CLS
 *     0.187 of the perf baseline dies by construction), then the
 *     frame rides up off the track's end — the 809px map-end dead
 *     band is dead: the closing state IS the end of the track.
 *
 * THE PERF ARCHITECTURE (perf-baseline.md §7, items 1–4 — mandated):
 *
 *  · NO custom property is written during scroll — the 756-element
 *    inherited `--jt-p` walk is dead. The six progressive layer
 *    groups (`.jt-plan [data-xl]`, ≤10 roots) take DIRECT
 *    `style.opacity` writes (opacity does not inherit — descendants
 *    never recalc); the plaques take opacity+transform writes; the
 *    findings/counters/wash are DISCRETE `data-*` flips (pure CSS,
 *    `t-fast` transitions ≤700ms — the allowed class of motion).
 *  · The layers are opacity-only: the R310 per-element
 *    stroke-dashoffset draw-in is retired (Paint/UpdateLayoutTree
 *    families `line.pl-hatch × 756 × 3` measured in §3 of the
 *    baseline); the build reads as Heron's crossfade stack.
 *  · `contain: layout paint` on `.jt-map-col` — the plan subtree's
 *    invalidations cannot walk out of the column, and the entrance
 *    descent is clipped to it (the stack never paints over the
 *    previous section — Heron's overpaint is not transplanted).
 *  · The closing column's final geometry is RESERVED from stage 0
 *    (the column sits at its measured 464px @1440 through the whole
 *    story) and reveals by opacity — zero layout animation, zero CLS.
 *
 * THE CLOCK (one driver, the shared sheetConductor frame — kept): the
 * map clock is the sticky-pin progress `pRaw` (pin units, derived per
 * frame from the track's cached document geometry — never a layout
 * read on steady ticks). Heron's measured trigger windows, in pin
 * units: the ENTRANCE scrub `p −0.19 → 0` (the whole stack descends
 * one viewport to its seat — desktop only; ≤991 the sticky window does
 * the work, the drift is empty like Heron @390), and the SEQUENCE
 * scrub `p −0.08 → 0.93` mapped onto Heron's 5.52s movie:
 *
 *   t 0.00–0.50  plaque 1 IN   (fade + 24px rise)
 *   t 1.00–1.50  plaque 1 OUT  (fade + −2.5px + 4% shrink)
 *   t 1.50–2.00  plaque 2 IN
 *   t 2.50–3.00  plaque 2 OUT + LAYER 1 (+ the room wash begins)
 *   t 3.02→5.52  layers 2–6, one per 0.5s (≈506px of scroll @1440)
 *   t ≥ 5.52     the closing flip (MONOTONIC — Heron's toggle is
 *                direction-sensitive; ours never un-flips on reverse,
 *                noted as the simplification)
 *
 * Every tween eases power2.out (`p2o`) — the reference's own curve.
 * @≤991 the clock is the PLAN COLUMN's sticky progress (the column is
 * the track — Heron's own mobile architecture) and the camera zooms
 * the sheet's viewBox between the narrated rooms (the R312 camera,
 * evolved onto the finding timeline: full overview → each room in
 * turn → the completed overview at the close).
 *
 * REDUCED MOTION: the complete static sheet — every state's end state
 * stands at once (all 6 layers ON, the findings all readable in the
 * open card, the closing column revealed, no drift, no camera) — the
 * driver writes it idempotently and the r306 RM belt holds.
 *
 * Content is the honest capability ledger — every finding is a real,
 * live capability (the r168b pins `شروحات مخصَّصة` + `خطط مراجعة حسب
 * أدائك الفعلي` ride finding 5 verbatim); no invented claims; the
 * funnel is untouched (the closing column is TEXT, never a CTA).
 */
import { useRef } from 'react';
import { LearningPlanDrawing, PLAN_VB } from '../LearningPlanDrawing';
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';
import { setSheetVar, sheetRect } from '../../../lib/motion/sheetConductor';

/* ── The copy (our own words, honest, Arabic RTL) ────────────────────
 * Plaque 1 is the r315 statement (kept verbatim — it IS the map's own
 * thesis). Plaque 2 is a SECOND distinct ~20-char statement derived
 * from the journey's own copy («ولكل قاعة بابها», the station story):
 * the chapters' rooms and doors are literally on the drawing. The
 * findings are the four stations' own texts + the assistant note (the
 * r168b truthfulness pins ride the fifth verbatim). */
const STATEMENT_1_AR = 'الرحلة مرسومة على مسطح واحد';
const STATEMENT_2_AR = 'لكل فصل غرفته وبابها';

const INTRO_TITLE_AR = 'مقدمة';
const FINDINGS_AR = [
  {
    key: 'lecture',
    title: 'المحاضرة التفاعلية',
    text: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، وحضور يُحتسب تلقائيًا عند الإكمال.',
  },
  {
    key: 'checkpoint',
    title: 'نقاط الفحص',
    text: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.',
  },
  {
    key: 'exam',
    title: 'الاختبارات الإلكترونية',
    text: 'بنك أسئلة بأربعة أنواع وقوالب جاهزة، وتصحيح تلقائي للأسئلة الموضوعية.',
  },
  {
    key: 'mastery',
    title: 'مصفوفة الإتقان',
    text: 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب.',
  },
  {
    key: 'assistant',
    title: 'المساعد الأكاديمي',
    text: 'يعمل الآن داخل المنصّة، ويقترح شروحات مخصَّصة وخطط مراجعة حسب أدائك الفعلي.',
  },
] as const;

/* the closing column — Heron's label chip + 3-line h2 + body. Our h2
 * is the CTA-adjacent statement (the funnel itself stays frozen: no
 * link is added — the register row further down the sheet owns the
 * conversion); the copy is the honest ledger summary. ~60 chars —
 * Heron's own 3-line measure at the D2 rung in the 464px column. */
const CLOSE_CHIP_AR = 'الخلاصة';
const CLOSE_TITLE_AR =
  'المسطح اكتمل — والخطوة التالية لك: أنشئ حسابك وابدأ من أول محاضرة.';
const CLOSE_COPY_AR =
  'كل غرفة في هذا المسطح ميزة تعمل اليوم داخل المنصّة، لا وعدًا قادمًا. أكمل التمرير لتصل إلى إنشاء الحساب في نهاية الصفحة.';
/* R322 3-b-fix2 (review-c3 R1#7): the column's FOOT row — Heron's
 * closing column composes to its foot (its cms block); ours ended at
 * y583/900 leaving a quiet bottom third. The mono terminus + the
 * honest artwork-scope note anchor the column's end. */
const CLOSE_FOOT_NOTE_AR =
  'المسطح رسم أصلي لمدارك؛ الغرف تتّسع مع كل فصل جديد.';

/* the [nn/05] counter rows — static text, opacity-only progression
 * (they never change copy during the story; the flip is CSS). */
const COUNTERS = ['[01/05]', '[02/05]', '[03/05]', '[04/05]', '[05/05]'] as const;

/* ── The clock constants (pin units; Heron's measured windows) ───────
 * All three derive from the extraction's own trigger table @1440
 * (section 2352–8652 · vh 900 ⇒ pin span 5400):
 *   · entrance 1465→2352 ⇒ p −0.164→0 (the stack's one-viewport
 *     descent — the natural lock start is −vh/span = −0.167; the
 *     measured −0.164 sits 14px inside it);
 *   · sequence 1908→7495 ⇒ p −0.082→0.952 (the 5.52s movie);
 *   · the closing flip lands AT the scrub end (7495); the sticky
 *     releases at p = 1 (8752) and rides up through the tail — the
 *     closing state IS the end of the track (the 809px map-end dead
 *     band dies by construction: the revealed column rides the
 *     release). */
const ENTRANCE_START_PIN = -0.167; /* the stack's descent begins ~1 viewport before the pin */
const SEQ_START_PIN = -0.082; /* the 5.52s movie begins just before the pin engages */
const SEQ_END_PIN = 0.952; /* …and ends at the measured scrub end — the closing owns the tail */
const SEQ_SPAN_PIN = SEQ_END_PIN - SEQ_START_PIN;
const SEQ_DUR_S = 5.52;

/* the six progressive layer windows (seconds in the movie) — layer 1
 * with the first finding at t 2.5, then one per 0.5s step (Heron's
 * 3.02/3.52/4.02/4.52/5.02 table). The BASE (frame + envelope) is
 * never in this table: it is visible from frame one (the V2 kill). */
const LAYER_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [2.5, 3.0],
  [3.02, 3.52],
  [3.52, 4.02],
  [4.02, 4.52],
  [4.52, 5.02],
  [5.02, 5.52],
];

/* the finding rotation: 5 equal 0.6s windows over t 2.5→5.5, one step
 * behind the layer builds (finding i narrates rooms i..i+1 — the
 * fifth, the assistant, rides the annot layer + the collapse). */
const FINDING_SPAN_S = 0.6;
const FINDING_START_S = 2.5;
const FINDING_END_S = 5.5;

/* power2.out — the reference's scrub ease, sampled in the extraction. */
function p2o(x: number): number {
  const u = x < 0 ? 0 : x > 1 ? 1 : x;
  return 1 - (1 - u) * (1 - u);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/* ── The ≤991 camera (the R312 camera, evolved onto the 6-state clock)
 * The sheet's viewBox pans between the narrated rooms while the sticky
 * window holds: the full overview through the statement era → each
 * room in turn → the completed overview at the close. TWO crop
 * families (R322 3-b-fix, review-c3 R1#5/R2#4: the mobile dead band
 * + the 26%-area plan):
 *  · TABLET 768–991 — the SHEET-aspect landscape family (the R319 crop
 *    nodes at 1.5789): the tablet window is 753px wide, the landscape
 *    plan fills it honestly.
 *  · PHONE ≤767 — the PORTRAIT family (460×600, aspect 0.767): the
 *    sticky window is FULL VIEWPORT HEIGHT (the 40–50% mid-map dead
 *    band dies by construction), so the plan element must be TALL to
 *    fill it — portrait crops zoom each room to a readable scale and
 *    the element's CSS aspect-ratio matches the crop exactly (no
 *    letterbox, and a viewBox pan can never resize the element — zero
 *    layout work per crop frame). The overview beats keep CAM_FULL
 *    (meet: the complete plan, centered, paper bands on paper).
 * Quantized whole viewBox units + change-gated writes (the R318 C2-S1
 * discipline — an interpolated rect never re-invalidates the plan
 * raster twice for the same value). */
type CamRect = readonly [number, number, number, number];
const CAM_FULL: CamRect = [0, 0, PLAN_VB.w, PLAN_VB.h];
/* the tablet family — the sheet's own landscape aspect (1.5789) */
const CAM_KEYS_SHEET: ReadonlyArray<readonly [number, CamRect]> = [
  [2.2, CAM_FULL],
  [2.8, [640, 54, 560, 355]], // the lecture hall (the stage + raked seating)
  [3.4, [640, 390, 560, 355]], // the checkpoint kiosk (the counter + queue)
  [4.0, [308, 54, 560, 355]], // the exam hall (the desk grid)
  [4.6, [85, 342, 660, 418]], // the library + reception band
  [5.0, [0, 54, 560, 355]], // the mastery room (the stepped seminar)
  [5.52, CAM_FULL], // the completed overview at the close
];
/* the phone family — portrait 460×600 crops centred on the same rooms
 * (clamped to the sheet): the visible artwork area @390 grows from
 * 26% of Heron's stack to ~82%, and the tall element + the full-height
 * sticky window retire the mid-map dead band entirely. */
const CAM_KEYS_PHONE: ReadonlyArray<readonly [number, CamRect]> = [
  [2.2, CAM_FULL],
  [2.8, [713, 0, 460, 600]], // the lecture hall + its corridor reach
  [3.4, [713, 160, 460, 600]], // the checkpoint kiosk band
  [4.0, [358, 0, 460, 600]], // the exam hall + the reading rooms
  [4.6, [298, 160, 460, 600]], // the library + reception band
  [5.0, [15, 0, 460, 600]], // the mastery room + the entry court
  // R322 3-b-fix3 (review-c3 R1-D2): the phone's TERMINAL key HOLDS the
  // mastery crop — CAM_FULL letterboxed a 206px overview inside the
  // 787px full-height window at the close (a sparse release beat); the
  // held terminus room (tinted, zoomed) reads as the story's end while
  // the stacked closing column scrolls in below.
  [5.52, [15, 0, 460, 600]],
];

function camRectAt(t: number, phone: boolean): CamRect {
  const keys = phone ? CAM_KEYS_PHONE : CAM_KEYS_SHEET;
  if (t <= keys[0]![0]) return keys[0]![1];
  const last = keys[keys.length - 1]!;
  if (t >= last[0]) return last[1];
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1]![0]) i += 1;
  const [t0, a] = keys[i]!;
  const [t1, b] = keys[i + 1]!;
  const u = clamp01((t - t0) / (t1 - t0));
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
    a[3] + (b[3] - a[3]) * u,
  ];
}

const camSvgByTrack = new WeakMap<HTMLElement, SVGSVGElement>();

function camSvgFor(track: HTMLElement): SVGSVGElement | null {
  const hit = camSvgByTrack.get(track);
  if (hit) return hit;
  const svg = track.querySelector<SVGSVGElement>('.jt-window .bp-svg');
  if (svg) camSvgByTrack.set(track, svg);
  return svg;
}

function writeCamBox(track: HTMLElement, r: CamRect): void {
  const svg = camSvgFor(track);
  if (!svg) return;
  const vb = `${Math.round(r[0])} ${Math.round(r[1])} ${Math.round(r[2])} ${Math.round(r[3])}`;
  if (svg.getAttribute('viewBox') !== vb) {
    svg.setAttribute('viewBox', vb);
  }
}

function restoreCam(track: HTMLElement): void {
  writeCamBox(track, CAM_FULL);
}

/* ── Reading-environment probes (kept from the R312/R318 machinery:
 * the two lists are constructed once and LIVE — a mid-session flip
 * lands in the same frame; jsdom without matchMedia falls through to
 * the desktop path, which keeps the unit belts deterministic). */
let mobileQuery: MediaQueryList | null = null;
let phoneQuery: MediaQueryList | null = null;
let reducedQuery: MediaQueryList | null = null;
let mmSource: typeof window.matchMedia | null = null;

function viewportState(): { mobile: boolean; phone: boolean; reduced: boolean } {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { mobile: false, phone: false, reduced: false };
  }
  if (mmSource !== window.matchMedia) {
    mmSource = window.matchMedia;
    mobileQuery = window.matchMedia('(max-width: 991px)');
    phoneQuery = window.matchMedia('(max-width: 767px)');
    reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  return {
    mobile: !!mobileQuery?.matches,
    phone: !!phoneQuery?.matches,
    reduced: !!reducedQuery?.matches,
  };
}

/* the statement plaques' in/out recipe — Heron's own: fade + 24px rise
 * in; fade + −2.5px rise + 4% shrink out. Direct writes, cached by the
 * conductor's last-value map (idle frames write nothing). */
function writeCard(
  el: HTMLElement | null,
  t: number,
  tIn0: number,
  tIn1: number,
  tOut0: number,
  tOut1: number,
): void {
  if (!el) return;
  let o: number;
  let ty: number;
  let sc = 1;
  if (t <= tIn0) {
    o = 0;
    ty = 24;
  } else if (t < tIn1) {
    const u = p2o((t - tIn0) / (tIn1 - tIn0));
    o = u;
    ty = 24 * (1 - u);
  } else if (t < tOut0) {
    o = 1;
    ty = 0;
  } else if (t < tOut1) {
    const u = p2o((t - tOut0) / (tOut1 - tOut0));
    o = 1 - u;
    ty = -2.5 * u;
    sc = 1 - 0.04 * u;
  } else {
    o = 0;
    ty = -2.5;
    sc = 0.96;
  }
  setSheetVar(el.style, 'opacity', o.toFixed(3));
  setSheetVar(el.style, 'transform', `translateY(${ty.toFixed(1)}px) scale(${sc.toFixed(3)})`);
  /* the a11y half of autoAlpha: a fully-faded plaque leaves the
   * tree (the old design's data-on visibility flips, kept — ONE
   * statement readable at a time, never a hidden third voice). */
  setSheetVar(el.style, 'visibility', o <= 0 ? 'hidden' : 'visible');
}

export function JourneyScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const mapInRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const card1Ref = useRef<HTMLParagraphElement | null>(null);
  const card2Ref = useRef<HTMLParagraphElement | null>(null);
  const closeRef = useRef<HTMLDivElement | null>(null);
  /* the ≤991 plan-column geometry (the sticky track): resolved once
   * per layout epoch — the column is in-flow inside the static frame,
   * so its document box is stable while the inner window sticks. */
  const colGeoRef = useRef<{
    top: number;
    height: number;
    winH: number;
    stickyTop: number;
  } | null>(null);
  const colElRef = useRef<HTMLElement | null>(null);
  /* the six progressive layer groups (queried once per epoch; the
   * seats live inside the ONE plan svg — no twin, no second instance
   * in the a11y tree). */
  const layerElsRef = useRef<SVGGElement[][]>([]);
  /* the cam-cropped flag — set by the mobile camera pass, consumed by
   * the ≥992px crossing so restoreCam never runs per desktop frame. */
  const camDirtyRef = useRef(false);

  /* ── The ONE scroll driver (the shared conductor clock; zero React
   *     renders per tick; every write is idempotent + cached). ───── */
  useSheetScroll(
    trackRef,
    ({ vh, rect, traversal, pin }) => {
      const track = trackRef.current;
      if (!track) return;
      const { mobile, phone, reduced } = viewportState();

      /* the map clock — sticky-pin progress in pin units (negative
       * before the pin engages, >1 after release). Desktop: the track
       * (.jt) itself. ≤991: the PLAN COLUMN is the track — its sticky
       * window's progress, derived per frame from the cached document
       * geometry + scrollY (no layout read on steady ticks). The
       * no-geometry fallback (jsdom/SSR rects are empty) is the
       * clamped pin metric — deterministic for the unit belts. */
      let pRaw: number;
      if (mobile) {
        let geo = colGeoRef.current;
        if (!geo) {
          const col =
            colElRef.current ??
            (colElRef.current = track.querySelector<HTMLElement>('.jt-map-col'));
          const mapIn = mapInRef.current ?? track.querySelector<HTMLElement>('.jt-map-in');
          if (col && mapIn) {
            const cRect = sheetRect(col).rect;
            if (cRect.height > 1) {
              geo = {
                top: cRect.top + window.scrollY,
                height: cRect.height,
                winH: mapIn.getBoundingClientRect().height,
                stickyTop: parseFloat(getComputedStyle(mapIn).top) || 0,
              };
              colGeoRef.current = geo;
            }
          }
        }
        pRaw =
          geo && geo.height > geo.winH + 1
            ? (window.scrollY - geo.top + geo.stickyTop) / (geo.height - geo.winH)
            : pin;
      } else {
        pRaw = rect.height > vh + 1 ? -rect.top / (rect.height - vh) : pin;
      }

      /* the static end-state under reduced motion: every state's end
       * state stands at once — the finished plan, the open card with
       * ALL findings readable, the revealed closing, no drift, no
       * camera zoom. Idempotent writes; the page never animates. */
      if (reduced) {
        for (const group of resolveLayers(track)) {
          for (const el of group) setSheetVar(el.style, 'opacity', '1');
        }
        if (card1Ref.current) {
          setSheetVar(card1Ref.current.style, 'opacity', '0');
        }
        if (card2Ref.current) {
          setSheetVar(card2Ref.current.style, 'opacity', '0');
        }
        if (windowRef.current) {
          setSheetVar(windowRef.current.style, 'transform', 'translateY(0.0px)');
        }
        if (mobile) {
          writeCamBox(track, CAM_FULL);
        }
        writeAttrs(track, '4', 'all', 'mastery', 'on', 'on');
        return;
      }

      /* 1 · the entrance descent (≥992 only — the whole plan stack
       * rides one viewport down into its seat; ≤991 the sticky window
       * does the work, the drift is empty exactly like Heron @390). */
      const winEl = windowRef.current;
      if (!mobile) {
        const u = (pRaw - ENTRANCE_START_PIN) / -ENTRANCE_START_PIN;
        const y = -vh * (1 - p2o(u));
        if (winEl) setSheetVar(winEl.style, 'transform', `translateY(${y.toFixed(1)}px)`);
      } else if (winEl) {
        setSheetVar(winEl.style, 'transform', 'none');
      }

      /* 2 · the sequence clock — Heron's 5.52s movie in seconds. */
      const t = SEQ_DUR_S * clamp01((pRaw - SEQ_START_PIN) / SEQ_SPAN_PIN);

      /* 3 · the six progressive layers — DIRECT opacity writes on the
       * ≤10 consuming group roots (the inherited-var walk is dead).
       * R323 (A3 · defect 5): the STRUCTURE never renders mid-ink —
       * the envelope (the walls' poché, .pl-l-envelope) writes
       * DISCRETELY (0|1). A wall at partial opacity reads pale grey
       * and then jumps to black when the layer settles — the owner's
       * tone-jump defect; grey belongs to the ghost hairlines
       * (.bp-hair #B3B3AF), never to the structure. The room layers
       * keep their crossfade (they are washes, not structure). */
      const groups = resolveLayers(track);
      for (let i = 0; i < LAYER_WINDOWS.length; i += 1) {
        const [a, b] = LAYER_WINDOWS[i]!;
        const o = p2o((t - a) / (b - a));
        for (const el of groups[i] ?? []) {
          const oo = el.classList.contains('pl-l-envelope') ? (t >= a ? 1 : 0) : o;
          setSheetVar(el.style, 'opacity', oo.toFixed(3));
        }
      }

      /* 4 · the statement plaques (fade + rise + the 4% shrink out). */
      writeCard(card1Ref.current, t, 0, 0.5, 1, 1.5);
      writeCard(card2Ref.current, t, 1.5, 2, 2.5, 3);

      /* 5 · the discrete machine — data-stage (the 6 semantic states),
       * data-finding (the rotation + the counter chips), data-wash (the
       * bounded room highlight + the door-chip warming, keyed to the
       * layer builds), data-open (the closing column's reveal). All
       * pure-CSS consumers with t-fast flips — never per-frame writes.
       * R322 3-b-fix3 (review-c3 R1-D3): the CARD era opens at t 2.5
       * (Heron's state-03: the intro card + item1 active at scrub 46%)
       * and hands to the findings era at t 3.0 — where layer 1, the
       * wash and the rotation all land on the same beat. */
      const stage =
        pRaw >= SEQ_END_PIN
          ? 5
          : t < 1.5
            ? 0
            : t < 2.5
              ? 1
              : t < 3.0
                ? 2
                : t < 5
                  ? 3
                  : 4;
      const finding =
        t >= FINDING_END_S
          ? 'done'
          : String(
              Math.min(
                FINDINGS_AR.length,
                Math.max(1, Math.floor((t - FINDING_START_S) / FINDING_SPAN_S) + 1),
              ),
            );
      /* R322 3-b-fix2 (review-c3 R1#10/R3-#3): the wash rides ONE
       * finding step LATER — the layer-1 build lands at t≈3.0, so the
       * room highlight starts when the drawing actually begins, never
       * under the INTRODUCTION card's own beat (the card era's focal
       * is the card, the paper stays quiet around it). */
      const wash =
        t < 3.0
          ? 'none'
          : t < 3.52
            ? 'lecture'
            : t < 4.02
              ? 'checkpoint'
              : t < 4.52
                ? 'exam'
                : t < 5.02
                  ? 'library'
                  : 'mastery';
      writeAttrs(track, String(stage), finding, wash, 'off', stage === 5 ? 'on' : 'off');

      /* 6 · the ≤991 camera — the room crops ride the finding timeline;
       * the ≥992px crossing restores the full sheet exactly once. */
      if (mobile) {
        writeCamBox(track, camRectAt(t, phone));
        camDirtyRef.current = true;
      } else if (camDirtyRef.current) {
        restoreCam(track);
        camDirtyRef.current = false;
      }

      /* traversal is deliberately unused beyond the pin derivation —
       * kept in scope for the epoch math above (rect-driven). */
      void traversal;
    },
    {
      /* drop the epoch caches when the layout may have changed (resize
       * + scroll settle) — the next frame re-resolves them once. */
      onRefresh: () => {
        colGeoRef.current = null;
        layerElsRef.current = [];
      },
    },
  );

  /* resolve the six layer groups once per epoch: `.jt-plan [data-xl]`
   * — the svg's own groups re-tagged by LearningPlanDrawing (the
   * artwork itself is untouched; only the layer ROOTS are tagged). */
  function resolveLayers(track: HTMLElement): SVGGElement[][] {
    if (layerElsRef.current.length === 0) {
      layerElsRef.current = [1, 2, 3, 4, 5, 6].map((n) =>
        Array.from(track.querySelectorAll<SVGGElement>(`.jt-plan [data-xl='${n}']`)),
      );
    }
    return layerElsRef.current;
  }

  return (
    <div
      className="jt"
      ref={trackRef}
      data-stage="0"
      data-finding="1"
      data-wash="none"
      data-rm="off"
    >
      <div className="jt-pin">
        {/* the PLAN COLUMN — flex:1 of the frame @≥992; the scroll
            track (the sticky's containing block) @≤991 */}
        <div className="jt-map-col">
          {/* the stack seat: the entrance drift's anchor @≥992 (the
              .jt-window inside carries the transform); the STICKY
              WINDOW @≤991 */}
          <div className="jt-map-in" ref={mapInRef}>
            <div className="jt-window" ref={windowRef}>
              <LearningPlanDrawing />

              {/* the [nn/05] counter rows — static text, the
                  progression is the data-finding opacity flip */}
              <div className="jt-idx" aria-hidden="true">
                {COUNTERS.map((c) => (
                  <span key={c} className="fo-mono" dir="ltr">
                    {c}
                  </span>
                ))}
              </div>

              {/* the two statement plaques — Heron's intel cards as
                  content-sized title blocks ON the paper (the base
                  layer stays visible around them — the V2 kill).
                  R323 (A3 · defect 5): the headline rides a PAPER
                  PLATE — a pinned-light chip with a ≥24px clear zone
                  — so the words never sit on a wall line (the old
                  strike-through effect). The plate is part of the
                  pinned light drawing world (literal paper + ink
                  alpha hairline, both themes — matching the card's
                  own pinned #282828 ink). */}
              <p className="jt-card jt-card1" ref={card1Ref}>
                <span className="jt-card-plate">{STATEMENT_1_AR}</span>
              </p>
              <p className="jt-card jt-card2" ref={card2Ref}>
                <span className="jt-card-plate">{STATEMENT_2_AR}</span>
              </p>
            </div>

            {/* the INTRODUCTION card — Heron's home-map-intro: paper
                ground, 1px hairline, dark head chip, 5 findings ONE at
                a time (bottom-anchored, grows upward, collapses to the
                head at the end). Anchored to the stack seat so it rides
                the sticky window @≤991 and the frame @≥992 — it never
                rides the entrance drift (Heron's card is frame-seated). */}
            <aside className="jt-intro" aria-label={INTRO_TITLE_AR}>
              <p className="jt-intro-head">{INTRO_TITLE_AR}</p>
              <div className="jt-intro-body">
                {FINDINGS_AR.map((f) => (
                  <p key={f.key} className="jt-intro-finding">
                    <strong>{f.title}</strong> — {f.text}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        </div>

        {/* the CLOSING COLUMN — Heron's content-wrap at its measured
            464px @1440, RESERVED from stage 0 (the geometry never
            animates; the content reveals by opacity at scrub end).
            @≤991 it stacks below the track, full width, always open. */}
        <div className="jt-close" ref={closeRef} data-open="off">
          <div className="jt-close-inner">
            <p className="jt-close-chip">{CLOSE_CHIP_AR}</p>
            {/* the closing h2 — Heron's display-2 seat (3 lines @4.8rem
                w600; the box is fully class-pinned in landing.css, so
                the heading tag carries ZERO layout of its own). It is
                the journey's ONE closing headline inside #chapters. */}
            <h2 className="jt-close-title">{CLOSE_TITLE_AR}</h2>
            <p className="jt-close-copy">{CLOSE_COPY_AR}</p>
            {/* the FOOT row — the mono terminus + the scope note,
                anchored to the column's foot (margin-block-start: auto
                in landing.css; reveals with the column's own flip).
                The [05/05] terminus is the counter family's own last
                row (deliberate label furniture, complete, Latin-only);
                NO title-block labels — the V1 kill stays dead. */}
            <div className="jt-close-foot" aria-hidden="true">
              <div className="jt-close-foot-row">
                <span className="jt-close-foot-mono" dir="ltr">[05/05]</span>
              </div>
              <p className="jt-close-foot-note">{CLOSE_FOOT_NOTE_AR}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* the discrete machine writes — one place, idempotent (the browser
 * only touches the DOM when a value actually changed). */
function writeAttrs(
  track: HTMLElement,
  stage: string,
  finding: string,
  wash: string,
  rm: string,
  open: string,
): void {
  if (track.dataset.stage !== stage) track.dataset.stage = stage;
  if (track.dataset.finding !== finding) track.dataset.finding = finding;
  if (track.dataset.wash !== wash) track.dataset.wash = wash;
  if (track.dataset.rm !== rm) track.dataset.rm = rm;
  const close = track.querySelector<HTMLElement>('.jt-close');
  if (close && close.dataset.open !== open) close.dataset.open = open;
}
