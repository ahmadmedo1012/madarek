/**
 * LearningPlanDrawing — R310 «مسطح التعلّم» — Artwork B · R314 §4.2 the
 * poché pass · R315 C4-A the map-journey re-composition.
 *
 * The journey scene's original architectural PLAN VIEW — an entirely
 * different drawing from the hero's elevation (spec §2.2): one
 * learning floor organized around a central corridor spine (RTL
 * reading), with six zones — the lecture hall (raked seating + stage,
 * reading start), the exam hall (desk grid), the mastery room
 * (stepped seminar), the checkpoint kiosk, the library wing
 * (shelves + reading table), and the entry reception.
 *
 * R314 §4.2 — the RENDERING WEIGHT is the reference's own: the plan
 * reads as a real poché drawing, not a hairline diagram. The walls
 * are SOLID CHARCOAL MASSES (#282828 — the exterior band 18 units
 * and the corridor bands 16 units = 14.1px / 12.6px at the plan's
 * measured 942px desktop render; the interior partitions 11 units
 * = 8.6px), the openings break the mass with thin door-swing arcs
 * (1.9 units = 1.5px rendered), the glazing breaks it with the
 * triple-line symbol, the service strip carries a 45° hatch (1px
 * ink at 55%, 8px rendered pitch ≈10.2 units), the furniture is
 * thin 1.6-unit guide-grey (#B3B3AF ≈1.25px rendered) outline work,
 * and the active stage's zone is the FINDING ROOM — a solid #FA3600
 * fill whose label, area and door marker flip to white. The plan is
 * a PAPER artifact in BOTH themes (the reference's plan stays
 * dark-ink-on-paper when the app goes dark), so the drawing's
 * pigment is pinned in the sheet-scoped style block below instead of
 * riding the theme tokens — allow-comment: the raw hexes ARE the
 * spec (ink #282828 · paper #F6F6EE · guide #B3B3AF · signal
 * #FA3600, all measured from the reference's plan).
 *
 * The scene's stage contract (CSS, driven by .jt[data-stage]):
 *  · stage 0 (شاهد) — the envelope + grid + corridor + LECTURE zone
 *  · stage 1 (تحقّق) — + the CHECKPOINT zone
 *  · stage 2 (اختبر) — + the EXAM hall + the LIBRARY wing
 *  · stage 3 (أتقن) — + the MASTERY room + every annotation — resolved
 * The build is monotonic within a stage and REVERSIBLE with scroll
 * (scrub semantics — the same contract as the overlay cross-fades).
 * The active stage's zone carries the solid finding-room fill; its
 * label warms to white on the red.
 *
 * C4-A (the cycle-4 map ticket): the plan's ink re-weights to the
 * reference's own drafting weights AT THE NEW FULL-STAGE RENDER
 * (the window now fills the pin ≈1320px wide @1440 — landing.css):
 * the exterior poché 18→9 units (≈10px), the corridor bands 16→10
 * (≈11px), the partitions 11→6 (≈6.6px), the furniture hairlines
 * 1.6→2.3 units (≈2.5px — confident strokes, the R310 hairline
 * diagram read too sparse against the reference), the service strip
 * gains a second cross-hatch family, the entry apron a stipple
 * ground, and the STATION markers grow VIOLATION-CALLOUT chips —
 * the reference's own overlay grammar (its s06 frames: solid
 * #FA3600 blocks with white mono text at the reviewed rooms):
 * the active stage's door marker flips to a solid accent chip with
 * a dashed accent leader, the quiet ones stay bare mono. The FRAME
 * (sheet + column grid + bubbles + the title block) splits into its
 * own `pl-l-frame` layer — the journey's opening state holds the
 * reference's EMPTY-WINDOW composition (statement over quiet paper;
 * the ink scrubs in from --jt-p .30 — landing.css), so the sheet's
 * own chrome must draw before the walls do.
 *
 * Engineering contracts:
 *  · Every drawn element carries `bp-drawable` — the R310 lesson:
 *    Chromium's style invalidation for class/attr changes does not
 *    reach SVG elements matched via [pathLength] attribute
 *    selectors; the class-based selectors are the reliable path.
 *  · The stage machine, the draw-in and the wash all stay in
 *    landing.css (the .jt .jt-plan scope) — the style block here
 *    rides AFTER it in the cascade and only re-pigments the plan;
 *    every class name landing.css matches is unchanged.
 *  · `role="img"` + a full Arabic description — the plan is
 *    informative without any pointer interaction.
 *  · PLAN_VB + the zone/station ids are the JourneyScene contract
 *    (the mobile camera crops anchor to this geometry) — untouchable.
 */

/* The plan's own frame — the single coordinate space for the journey
 * overlays (rings/callouts re-anchored here by JourneyScene). */
export const PLAN_VB = { w: 1200, h: 760 } as const;

/* ── The poché pigment sheet ──────────────────────────────────────────
 * Scoped to `.jt .jt-plan` (this drawing only — the hero elevation's
 * own bp-* classes are untouched) and loaded after landing.css, so
 * the plan's palette is pinned to the measured drafting primaries in
 * BOTH themes while the stage machine / draw-in / wash opacity in
 * landing.css keep driving every element. The finding-room rules
 * mirror the landing.css wash selectors (+.jt-plan specificity) so
 * the ACTIVE zone's label, area and door marker read white on the
 * solid #FA3600 fill.
 *
 * R322 (3-b) — the map transplant: the plan's build is now the SIX
 * PROGRESSIVE OPACITY LAYERS (the `data-xl` group tags below — the
 * R310 stage-keyed dash draw-in is retired; landing.css + the driver
 * crossfade the groups wholesale). The wash seat re-keys from
 * `.jt[data-stage]` to `.jt[data-wash]` (JourneyScene's bounded room
 * highlight, keyed to the layer builds) — and the LIBRARY finally
 * owns a beat: `[04]` warms while its wing builds (the R310
 * "the library door stays quiet" story closes with the transplant). */
const PLAN_INK_CSS = `
  .jt .jt-plan .pl-sheet  { fill: #F6F6EE; }
  .jt .jt-plan .pl-wall   { fill: #282828; }
  .jt .jt-plan .pl-paper  { fill: #F6F6EE; }
  .jt .jt-plan .pl-strip  { stroke: #282828; stroke-width: 1.8; }
  .jt .jt-plan .pl-hatch  { stroke: #282828; stroke-width: 1.6; stroke-opacity: 0.55; }
  .jt .jt-plan .pl-door-g path { stroke: #282828; stroke-width: 1.9; fill: none; }
  .jt .jt-plan .pl-win-g line  { stroke: #282828; stroke-width: 1.27; }
  .jt .jt-plan .bp-ink    { stroke: #282828; stroke-width: 2.2; fill: none; }
  .jt .jt-plan .bp-ink-2  { stroke-width: 3.4; }
  .jt .jt-plan .bp-hair   { stroke: #B3B3AF; stroke-width: 2.3; fill: none; }
  .jt .jt-plan .bp-fill   { fill: none; stroke: #B3B3AF; stroke-width: 2.3; }
  .jt .jt-plan .bp-gridline { stroke: #B3B3AF; stroke-width: 1; opacity: 0.5; }
  .jt .jt-plan .bp-dash   { stroke: #282828; stroke-width: 2.6; fill: none; }
  /* C4-A — the violation-callout system: the active door station's
     chip = the reference's solid-block-with-white-mono grammar; the
     dashed leader warms with it. Quiet by default (landing.css owns
     the stage flips; the pigment stays pinned here). */
  .jt .jt-plan .pl-chip   { fill: #FA3600; stroke: #FFFFFF; stroke-width: 1; }
  .jt .jt-plan .pl-leader { stroke: #B3B3AF; stroke-width: 2.3; fill: none; }
  .jt[data-wash='lecture'] .jt-plan .pl-leader[data-station='0'],
  .jt[data-wash='checkpoint'] .jt-plan .pl-leader[data-station='1'],
  .jt[data-wash='exam'] .jt-plan .pl-leader[data-station='2'],
  .jt[data-wash='library'] .jt-plan .pl-leader[data-station='3'],
  .jt[data-wash='mastery'] .jt-plan .pl-leader[data-station='4'] {
    stroke: #FA3600; stroke-dasharray: 4 3;
  }
  .jt .jt-plan .bp-micro  { fill: #62625F; }
  .jt .jt-plan .pl-name   { fill: #414140; }
  .jt .jt-plan .pl-station { fill: #C72E00; }
  .jt .jt-plan .pl-zone   { fill: #FA3600; }
  .jt .jt-plan .pl-dot    { fill: #282828; }
  .jt .jt-plan .bp-signal-fill { fill: #FA3600; stroke: #FFFFFF; stroke-width: 1; }
  /* R319 §D4 — the ACTIVE zone's label + area are STATE-SAFE INK
     (#282828), not white: the zone wash crossfades over t-fast, so a
     white label rode the salmon mid-state (#FA3600 at ~50% over the
     #F6F6EE sheet ≈ #F89677) at ~2.2:1 — unreadable mid-flip. Ink is
     legible at EVERY instant of the transition: 13.4:1 on the paper
     sheet, ≈6.6:1 on the salmon mid-wash, 3.85:1 on the settled
     #FA3600 (≥3:1, the register's own bar for the decorative plan).
     Heron's register has no scrub-lit rooms at all — the wash itself
     is the active signal; the label stays the quiet ink annotation. */
  .jt[data-wash='lecture'] .jt-plan .pl-l-lecture .pl-name,
  .jt[data-wash='checkpoint'] .jt-plan .pl-l-checkpoint .pl-name,
  .jt[data-wash='exam'] .jt-plan .pl-l-exam .pl-name,
  .jt[data-wash='library'] .jt-plan .pl-l-library .pl-name,
  .jt[data-wash='mastery'] .jt-plan .pl-l-mastery .pl-name { fill: #282828; }
  .jt[data-wash='lecture'] .jt-plan .pl-l-lecture .bp-micro,
  .jt[data-wash='checkpoint'] .jt-plan .pl-l-checkpoint .bp-micro,
  .jt[data-wash='exam'] .jt-plan .pl-l-exam .bp-micro,
  .jt[data-wash='library'] .jt-plan .pl-l-library .bp-micro,
  .jt[data-wash='mastery'] .jt-plan .pl-l-mastery .bp-micro { fill: #282828; }
  .jt[data-wash='lecture'] .jt-plan .pl-station[data-station='0'],
  .jt[data-wash='checkpoint'] .jt-plan .pl-station[data-station='1'],
  .jt[data-wash='exam'] .jt-plan .pl-station[data-station='2'],
  .jt[data-wash='library'] .jt-plan .pl-station[data-station='3'],
  .jt[data-wash='mastery'] .jt-plan .pl-station[data-station='4'] { fill: #FFFFFF; font-weight: 700; }
`;

/* the section drawing's own pigment sheet — the SAME paper-artifact
 * ruling as the plan (pinned drafting primaries in both themes);
 * scoped to the side column's `.jt-section` twin (SectionDrawing.tsx). */
export const SECTION_INK_CSS = `
  .jt .jt-section .bp-ink   { stroke: #282828; stroke-width: 2.4; fill: none; }
  .jt .jt-section .bp-ink-2 { stroke-width: 3.8; }
  .jt .jt-section .bp-hair  { stroke: #B3B3AF; stroke-width: 2; fill: none; }
  .jt .jt-section .bp-fill  { fill: none; stroke: #B3B3AF; stroke-width: 2; }
  .jt .jt-section .bp-dash  { stroke: #282828; stroke-width: 2; fill: none; }
  .jt .jt-section .bp-micro { fill: #62625F; }
  .jt .jt-section .pl-name   { fill: #414140; }
  .jt .jt-section .pl-dot    { fill: #282828; }
  .jt .jt-section .pl-wall   { fill: #282828; }
  .jt .jt-section .sc-zone   { fill: #FA3600; fill-opacity: 0; }
  .jt[data-stage='0'] .jt-section .sc-zone[data-room='lecture'],
  .jt[data-stage='2'] .jt-section .sc-zone[data-room='exam'],
  .jt[data-stage='3'] .jt-section .sc-zone[data-room='mastery'] { fill-opacity: 1; }
`;

/* A door opening + its quarter-circle swing arc (the plan grammar):
 * a thin 1.5px-rendered ink leaf + arc, radius = the door width. */
function Door({
  x,
  y,
  w,
  h,
  hinge,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  /** which corner the hinge sits on: 'tl' | 'tr' | 'bl' | 'br' */
  hinge: 'tl' | 'tr' | 'bl' | 'br';
}) {
  const r = Math.min(w, h);
  let arc: string;
  let leaf: string;
  if (hinge === 'tl') {
    leaf = `M ${x} ${y} L ${x} ${y + h}`;
    arc = `M ${x} ${y + h} A ${r} ${r} 0 0 1 ${x + w} ${y}`;
  } else if (hinge === 'tr') {
    leaf = `M ${x + w} ${y} L ${x + w} ${y + h}`;
    arc = `M ${x} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + h}`;
  } else if (hinge === 'bl') {
    leaf = `M ${x} ${y + h} L ${x} ${y}`;
    arc = `M ${x} ${y} A ${r} ${r} 0 0 0 ${x + w} ${y + h}`;
  } else {
    leaf = `M ${x + w} ${y + h} L ${x + w} ${y}`;
    arc = `M ${x + w} ${y} A ${r} ${r} 0 0 0 ${x} ${y + h}`;
  }
  return (
    <g className="pl-door-g" aria-hidden="true">
      <path className="bp-drawable" d={leaf} pathLength={1} />
      <path className="bp-drawable" d={arc} pathLength={1} />
    </g>
  );
}

/* A window run — the poché opens for the glazing (a paper break
 * through the wall mass) and the triple-line drafting symbol redraws
 * the frame + the centred glazing line. */
function Win({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const vertical = h > w;
  const mid = vertical ? x + w / 2 : y + h / 2;
  return (
    <g className="pl-win-g" aria-hidden="true">
      <rect className="pl-paper bp-drawable" x={x} y={y} width={w} height={h} pathLength={1} />
      {vertical ? (
        <>
          <line className="bp-drawable" x1={x} y1={y} x2={x} y2={y + h} pathLength={1} />
          <line className="bp-drawable" x1={mid} y1={y} x2={mid} y2={y + h} pathLength={1} />
          <line className="bp-drawable" x1={x + w} y1={y} x2={x + w} y2={y + h} pathLength={1} />
        </>
      ) : (
        <>
          <line className="bp-drawable" x1={x} y1={y} x2={x + w} y2={y} pathLength={1} />
          <line className="bp-drawable" x1={x} y1={mid} x2={x + w} y2={mid} pathLength={1} />
          <line className="bp-drawable" x1={x} y1={y + h} x2={x + w} y2={y + h} pathLength={1} />
        </>
      )}
    </g>
  );
}

/* A lecture/exam seat row tick or desk — the repeated plan marks. */
function Seat({ x, y, w = 22, h = 10 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect className="bp-hair bp-drawable" x={x} y={y} width={w} height={h} pathLength={1} />;
}

/* 45° hatch strokes inside a band — the shaft/void texture (R314
 * §4.2, re-keyed by C4-A to the full-stage render: 1.6-unit ink at
 * 55% opacity, 8.5-unit pitch). Returns line segments of the
 * (x − y = c) family clipped to the band. `cross` adds the second
 * (x + y = c) family — the reference's dense cross-hatch poché. */
function hatchRun(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  gap = 8.5,
  cross = false,
): Array<[number, number, number, number]> {
  const segs: Array<[number, number, number, number]> = [];
  if (!cross) {
    for (let c = x0 - y1; c <= x1 - y0; c += gap) {
      const xa = Math.max(x0, c + y0);
      const xb = Math.min(x1, c + y1);
      if (xb - xa > 0.5) segs.push([xa, xa - c, xb, xb - c]);
    }
  } else {
    for (let c = x0 + y0; c <= x1 + y1; c += gap) {
      const xa = Math.max(x0, c - y1);
      const xb = Math.min(x1, c - y0);
      if (xb - xa > 0.5) segs.push([xa, c - xa, xb, c - xb]);
    }
  }
  return segs;
}

/* a stipple field — the C4-A grounds texture: ink dots on a loose
 * diagonal grid, clipped to the band (the section's earth cut + the
 * plan's entry apron). */
function stippleRun(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  gap = 9,
): Array<[number, number]> {
  const dots: Array<[number, number]> = []
  let row = 0;
  for (let y = y0; y <= y1; y += gap * 0.87, row += 1) {
    const off = row % 2 === 0 ? 0 : gap / 2;
    for (let x = x0 + off; x <= x1; x += gap) {
      dots.push([x, y]);
    }
  }
  return dots;
}

/* the corridor wall runs — [from, to] x-extents of the solid bands
 * (the door openings are the breaks between the runs). */
const NORTH_WALL: Array<[number, number]> = [
  [78, 250],
  [290, 500],
  [540, 640],
  [680, 830],
  [870, 960],
  [1000, 1122],
];
const SOUTH_WALL: Array<[number, number]> = [
  [78, 150],
  [190, 500],
  [540, 830],
  [870, 1122],
];
/* the service strip's hatch segments — between the partitions. */
const STRIP_SEGS: Array<[number, number]> = [
  [78, 293],
  [304, 753],
  [764, 1122],
];

export function LearningPlanDrawing() {
  /* the raked seating — four arcs concentric on the stage platform.
   * R320 §A4: the sweep tightened (dy 135→90 — arcs y≈160..340): the
   * zone-label pair (name+area on separate baselines, y=97/120) now
   * owns the arc-free top band of the hall; before, the fan climbed
   * to y=115 and ate every label seat (the svg-collisions gate's
   * «قاعة المحاضرات»×seating 1210px² defect). */
  const stageCx = 1082;
  const stageCy = 250;
  const SEAT_SWEEP_DY = 90;
  const seatRows = [290, 240, 190, 140].map((r) => {
    const a = Math.min((55 * Math.PI) / 180, Math.asin(SEAT_SWEEP_DY / r));
    const xe = stageCx - r * Math.cos(a);
    const dy = r * Math.sin(a);
    return { r, d: `M ${xe.toFixed(1)} ${(stageCy - dy).toFixed(1)} A ${r} ${r} 0 0 0 ${xe.toFixed(1)} ${(stageCy + dy).toFixed(1)}` };
  });

  return (
    <svg
      className="bp-svg jt-plan"
      viewBox={`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`}
      role="img"
      aria-label="مسطح معماري لطابق التعلّم في مدارك: قاعة محاضرات بصفوف مدرّجة ومنصة، قاعة اختبارات بمصافّ منظمة، غرفة إتقان مدرّجة، كشك نقطة فحص، مكتبة بأرفف وطاولة قراءة، واستقبال — حول ممر مركزي يمتد من المدخل يمينًا إلى غرفة الإتقان يسارًا، مع شبكة أعمدة وسلاسل أبعاد ومسار متقطّع بأسهم عند كل باب"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* the poché pigment sheet — scoped .jt .jt-plan, after landing.css */}
      <style dangerouslySetInnerHTML={{ __html: PLAN_INK_CSS }} />

      {/* ═══ the frame — the sheet's own quiet chrome: paper, the column
          grid, the bubbles, the title block. C4-A: split from the
          envelope so the journey's OPENING state holds the reference's
          empty-window composition (the frame draws at stage 0 and
          stays; the walls scrub in later — landing.css). ═══ */}
      <g className="pl-l-frame" aria-hidden="true">
        {/* the sheet — the plan is a paper artifact in both themes */}
        <rect className="pl-sheet bp-drawable" x="0" y="0" width="1200" height="760" pathLength={1} />
        {/* the column grid — the faint dashed layer beneath the walls */}
        {[180, 300, 420, 540, 660, 780, 900, 1020].map((x) => (
          <line key={`gx${x}`} className="bp-gridline bp-drawable" x1={x} y1="78" x2={x} y2="682" pathLength={1} />
        ))}
        {[180, 300, 540, 660].map((y) => (
          <line key={`gy${y}`} className="bp-gridline bp-drawable" x1="78" y1={y} x2="1122" y2={y} pathLength={1} />
        ))}
        {/* the column grid bubbles — lettered (top) + numbered (left) */}
        {[180, 300, 420, 540, 660, 780, 900, 1020].map((x, i) => (
          <g key={`bx${x}`} className="bp-hair">
            <circle className="bp-drawable" cx={x} cy="48" r="9" pathLength={1} />
            <text className="bp-micro" x={x} y="51.5" textAnchor="middle">
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        ))}
        {[180, 300, 540, 660].map((y, i) => (
          <g key={`by${y}`} className="bp-hair">
            <circle className="bp-drawable" cx="50" cy={y} r="9" pathLength={1} />
            <text className="bp-micro" x="50" y={y + 3.5} textAnchor="middle">
              {i + 1}
            </text>
          </g>
        ))}
        {/* R322 V1 kill: the sheet's title-block mono labels
            (MDRK · LEARNING FLOOR · PLAN / SCALE 1:150 · UNITS M) are
            deleted — the long label also clipped mid-word at real
            sizes (the owner's «MDRK · LI»); scale notes are debug
            text, not content. */}
      </g>

      {/* ═══ the envelope — poché wall masses + the corridor spine ═══
          R322 3-b-fix (review-c3 R1#3): the envelope JOINS layer 1 —
          Heron's statement era is QUIET paper (0.00% ink measured);
          the walls draw in with the first findings-era layer, never
          under the statement plaques. */}
      <g className="pl-l-envelope" data-xl="1" aria-hidden="true">
        {/* the exterior poché — a solid charcoal mass, then the interior
            paper ground it encloses. C4-A re-weight: the band 18→9
            units (≈10px at the full-stage render) — the reference's
            own exterior weight, not a 20px slab. */}
        <rect className="pl-wall bp-drawable" x="69" y="69" width="1062" height="622" pathLength={1} />
        <rect className="pl-paper bp-drawable" x="78" y="78" width="1044" height="604" pathLength={1} />
        {/* window runs — the poché opens for the glazing (top + sides + bottom):
            the runs ride the slimmed 9-unit exterior band (69→78) */}
        <Win x={200} y={69} w={90} h={9} />
        <Win x={440} y={69} w={90} h={9} />
        <Win x={680} y={69} w={90} h={9} />
        <Win x={920} y={69} w={90} h={9} />
        <Win x={69} y={200} w={9} h={80} />
        <Win x={69} y={480} w={9} h={80} />
        <Win x={200} y={691} w={90} h={9} />
        <Win x={440} y={691} w={90} h={9} />
        <Win x={680} y={691} w={90} h={9} />
        <Win x={1122} y={200} w={9} h={80} />
        {/* the corridor walls — solid structural bands (C4-A: 16→10
            units ≈11px, hugging the corridor faces at 394/460 so the
            journey path stays centred) with the door openings left
            as true breaks in the mass */}
        {NORTH_WALL.map(([x1, x2]) => (
          <rect key={`nc${x1}`} className="pl-wall bp-drawable" x={x1} y="384" width={x2 - x1} height="10" pathLength={1} />
        ))}
        {SOUTH_WALL.map(([x1, x2]) => (
          <rect key={`sc${x1}`} className="pl-wall bp-drawable" x={x1} y="460" width={x2 - x1} height="10" pathLength={1} />
        ))}
        {/* zone partition walls — the interior partitions (C4-A:
            11→6 units ≈6.6px, hugging the zone edges) */}
        <rect className="pl-wall bp-drawable" x="418" y="78" width="6" height="307" pathLength={1} />
        <rect className="pl-wall bp-drawable" x="758" y="78" width="6" height="307" pathLength={1} />
        <rect className="pl-wall bp-drawable" x="298" y="475" width="6" height="185" pathLength={1} />
        <rect className="pl-wall bp-drawable" x="758" y="475" width="6" height="185" pathLength={1} />
        {/* the service strip along the south wall — the shaft/void band:
            a thin boundary + the DENSE CROSS-HATCH texture (C4-A: both
            45° families at 8.5-unit pitch — the reference's poché
            texture, reading as inked void rather than a grey wash) */}
        <line className="pl-strip bp-drawable" x1="78" y1="660" x2="1122" y2="660" pathLength={1} />
        {STRIP_SEGS.flatMap(([x1, x2]) =>
          hatchRun(x1, x2, 661, 681).map(([xa, ya, xb, yb], i) => (
            <line key={`h${x1}-${i}`} className="pl-hatch bp-drawable" x1={xa} y1={ya} x2={xb} y2={yb} pathLength={1} />
          )),
        )}
        {STRIP_SEGS.flatMap(([x1, x2]) =>
          hatchRun(x1, x2, 661, 681, 8.5, true).map(([xa, ya, xb, yb], i) => (
            <line key={`hx${x1}-${i}`} className="pl-hatch bp-drawable" x1={xa} y1={ya} x2={xb} y2={yb} pathLength={1} />
          )),
        )}
        {/* the main entry — an opening in the right wall + door */}
        <rect className="pl-paper bp-drawable" x="1122" y="404" width="9" height="52" pathLength={1} />
        <Door x={1074} y={404} w={48} h={52} hinge="br" />
        {/* the entry apron — a stipple ground outside the door (C4-A:
            the grounds texture — the paved approach on the sheet) */}
        {stippleRun(1135, 1188, 396, 464, 9).map(([x, y], i) => (
          <circle key={`st${i}`} className="pl-dot bp-drawable" cx={x} cy={y} r={0.9} pathLength={1} />
        ))}
      </g>

      {/* ═══ zone: قاعة المحاضرات — raked seating + stage (layer 1) ═══ */}
      <g className="pl-l-lecture" data-xl="1" aria-hidden="true">
        <rect className="pl-zone" data-zone="lecture" x="764" y="78" width="358" height="307" />
        {/* the stage platform + screen wall (reading start, RTL) */}
        <rect className="bp-fill bp-drawable" x="1058" y="180" width="48" height="140" pathLength={1} />
        <line className="bp-ink bp-ink-2 bp-drawable" x1="1110" y1="180" x2="1110" y2="320" pathLength={1} />
        <line className="bp-hair bp-drawable" x1="1064" y1="250" x2="1100" y2="250" pathLength={1} />
        {/* raked seating — four concentric arcs wrapping the stage */}
        {seatRows.map((row) => (
          <path key={row.r} className="bp-hair bp-drawable" d={row.d} pathLength={1} />
        ))}
        {/* seat ticks on the front row */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const a = -0.45 + i * 0.15;
          const cx = stageCx - 140 * Math.cos(a);
          const cy = stageCy + 140 * Math.sin(a);
          return <Seat key={i} x={cx - 11} y={cy - 5} />;
        })}
        {/* zone doors from the corridor */}
        <Door x={830} y={394} w={40} h={48} hinge="tl" />
        <Door x={960} y={394} w={40} h={48} hinge="tr" />
        {/* the AV niche + the attendance sensor mark */}
        <rect className="bp-hair bp-drawable" x="790" y="100" width="26" height="16" pathLength={1} />
        <rect className="bp-signal-fill bp-drawable" x={824} y={104} width="8" height="8" pathLength={1} />
        {/* zone label + area — R320 §A4: separate baselines (97/120 —
            the name and area boxes clear each other with the baseline
            gap ≥14px rendered at every gate viewport) seated in the
            arc-free top band, clear of the seating fan (y≥160) and
            the AV niche (x≤832) */}
        <text className="pl-name" x="930" y="97" textAnchor="middle">قاعة المحاضرات</text>
        <text className="bp-micro" x="930" y="120" textAnchor="middle">240 M2</text>
      </g>

      {/* ═══ zone: كشك نقطة الفحص — counter + queue (layer 2) ═══ */}
      <g className="pl-l-checkpoint" data-xl="2" aria-hidden="true">
        <rect className="pl-zone" data-zone="checkpoint" x="764" y="475" width="358" height="185" />
        {/* the counter */}
        <rect className="bp-fill bp-drawable" x="880" y="530" width="170" height="16" pathLength={1} />
        {/* queue dots */}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} className="bp-hair bp-drawable" cx={905 + i * 26} cy={590} r="4" pathLength={1} />
        ))}
        {/* the display panel + the device symbol */}
        <rect className="bp-hair bp-drawable" x="1040" y="490" width="40" height="24" pathLength={1} />
        <line className="bp-hair bp-drawable" x1="1040" y1="514" x2="1080" y2="490" pathLength={1} />
        {/* the checkpoint signal — the ONE orange mark in this zone */}
        <rect className="bp-signal-fill bp-drawable" x="918" y="534" width="8" height="8" pathLength={1} />
        <Door x={830} y={410} w={40} h={50} hinge="bl" />
        {/* R320 §A4: re-spaced 622/645 — the name and area boxes clear
            each other (the 16u gap overlapped the em-boxes); the seat
            was already clear of the queue dots and the counter */}
        <text className="pl-name" x="930" y="622" textAnchor="middle">نقطة الفحص</text>
        <text className="bp-micro" x="930" y="645" textAnchor="middle">36 M2</text>
      </g>

      {/* ═══ zone: قاعة الاختبار — the desk grid (layer 3) ═══ */}
      <g className="pl-l-exam" data-xl="3" aria-hidden="true">
        <rect className="pl-zone" data-zone="exam" x="424" y="78" width="329" height="307" />
        {/* the desk grid — 5 columns × 4 rows (R320 §A4: dropped 10u
            down, 140→150 — the re-spaced label pair above it keeps its
            boxes clear of the first desk row) */}
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <Seat key={`${row}-${col}`} x={456 + col * 58} y={150 + row * 56} w={26} h={16} />
          )),
        )}
        {/* the invigilator desk */}
        <rect className="bp-fill bp-drawable" x="666" y="240" width="16" height="80" pathLength={1} />
        {/* the wall clock symbol */}
        <circle className="bp-fill bp-drawable" cx="446" cy="98" r="10" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="446" y1="98" x2="446" y2="91" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="446" y1="98" x2="451" y2="101" pathLength={1} />
        <Door x={500} y={394} w={40} h={48} hinge="tl" />
        <Door x={640} y={394} w={40} h={48} hinge="tr" />
        {/* zone label + area — R320 §A4: separate baselines (118/141)
            seated ABOVE the desk grid (now y≥150) — was 126/142 with
            the area box eating the first desk row (216px²) */}
        <text className="pl-name" x="590" y="118" textAnchor="middle">قاعة الاختبار</text>
        <text className="bp-micro" x="590" y="141" textAnchor="middle">150 M2</text>
      </g>

      {/* ═══ zone: المكتبة — shelves + reading table (layer 4, with
          the entry reception below — the south band builds together) ═══ */}
      <g className="pl-l-library" data-xl="4" aria-hidden="true">
        <rect className="pl-zone" data-zone="library" x="304" y="475" width="449" height="185" />
        {/* shelf runs with book ticks */}
        <rect className="bp-fill bp-drawable" x="360" y="506" width="330" height="12" pathLength={1} />
        <rect className="bp-fill bp-drawable" x="360" y="542" width="330" height="12" pathLength={1} />
        <rect className="bp-fill bp-drawable" x="360" y="578" width="330" height="12" pathLength={1} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`a${i}`} className="bp-hair bp-drawable" x1={376 + i * 40} y1="506" x2={376 + i * 40} y2="518" pathLength={1} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`b${i}`} className="bp-hair bp-drawable" x1={376 + i * 40} y1="542" x2={376 + i * 40} y2="554" pathLength={1} />
        ))}
        {/* the reading table + chairs */}
        <circle className="bp-hair bp-drawable" cx="380" cy="622" r="18" pathLength={1} />
        {[0, 90, 180, 270].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <rect
              key={deg}
              className="bp-hair bp-drawable"
              x={380 + 26 * Math.cos(a) - 5}
              y={622 + 26 * Math.sin(a) - 5}
              width="10"
              height="10"
              pathLength={1}
            />
          );
        })}
        {/* the service counter */}
        <rect className="bp-fill bp-drawable" x="700" y="500" width="14" height="70" pathLength={1} />
        <Door x={500} y={410} w={40} h={50} hinge="tl" />
        {/* zone label + area — R320 §A4: re-seated from (530, 648/654 —
            the 6u baseline gap was the gate's worst text×text defect,
            548.7px²: the two labels printed on top of each other) to
            the calm band below the shelves (y 622/645), clear of the
            reading table (x≤411), the counter (x≥700) and the zone's
            south wall */}
        <text className="pl-name" x="530" y="622" textAnchor="middle">المكتبة والبحوث</text>
        <text className="bp-micro" x="530" y="645" textAnchor="middle">96 M2</text>
      </g>

      {/* ═══ zone: غرفة الإتقان — the stepped seminar (layer 5) ═══ */}
      <g className="pl-l-mastery" data-xl="5" aria-hidden="true">
        <rect className="pl-zone" data-zone="mastery" x="78" y="78" width="335" height="307" />
        {/* the stepped rows facing the west focus wall */}
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            className="bp-hair bp-drawable"
            x={150 + i * 62}
            y={130 + i * 26}
            width={200 - i * 62}
            height={190 - i * 52}
            pathLength={1}
          />
        ))}
        {/* the focus screen + the mentor mark */}
        <line className="bp-ink bp-ink-2 bp-drawable" x1="90" y1="170" x2="90" y2="330" pathLength={1} />
        <circle className="bp-hair bp-drawable" cx="120" cy="250" r="12" pathLength={1} />
        {/* the mastery ladder — five ascending steps along the north wall */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} className="bp-hair bp-drawable" x={110 + i * 34} y={100 + (4 - i) * 7} width="30" height={8 + (4 - i) * 7} pathLength={1} />
        ))}
        <Door x={250} y={394} w={40} h={48} hinge="tl" />
        {/* zone label + area — R320 §A4: re-seated from (248, 126/142 —
            printed ON the mastery ladder and the stepped seminar,
            507.9+317.2px²) to the zone's calm bottom-right (340, 350/
            373): clear of the stepped rows (y≤320), the focus screen
            (x=90), the [05] station chip (x≤293) and the zone door */}
        <text className="pl-name" x="340" y="350" textAnchor="middle">غرفة الإتقان</text>
        <text className="bp-micro" x="340" y="373" textAnchor="middle">84 M2</text>
      </g>

      {/* ═══ zone: الاستقبال — reception + bench (layer 4, with the
          library — the south band builds together) ═══ */}
      <g className="pl-l-entry" data-xl="4" aria-hidden="true">
        {/* the L reception counter */}
        <rect className="bp-fill bp-drawable" x="100" y="560" width="120" height="14" pathLength={1} />
        <rect className="bp-fill bp-drawable" x="206" y="560" width="14" height="60" pathLength={1} />
        {/* the waiting bench */}
        <rect className="bp-hair bp-drawable" x="110" y="620" width="70" height="12" pathLength={1} />
        {/* planters */}
        <circle className="bp-hair bp-drawable" cx="260" cy="620" r="12" pathLength={1} />
        <circle className="bp-hair bp-drawable" cx="260" cy="650" r="9" pathLength={1} />
        <Door x={150} y={410} w={40} h={50} hinge="tl" />
        <text className="pl-name" x="196" y="516" textAnchor="middle">الاستقبال</text>
      </g>

      {/* ═══ the annotations — journey path + stations + dims (layer 6 —
          the completed drawing) ═══ */}
      <g className="pl-l-annot" data-xl="6" aria-hidden="true">
        {/* the journey path — the corridor spine, RTL: the section cut
            line A-A rides its ends (the flags tie the sheet to the
            closing column's section view — the C4-A multi-view sheet) */}
        <line className="bp-dash bp-dash-2 bp-drawable" x1="1118" y1="430" x2="120" y2="430" pathLength={1} />
        <polyline className="bp-ink bp-drawable" points="130,424 118,430 130,436" pathLength={1} />
        {[1118, 120].map((x) => (
          <g key={`cut${x}`} className="bp-hair">
            <line className="bp-drawable" x1={x} y1="422" x2={x} y2="438" pathLength={1} />
            <text className="bp-micro" x={x} y="416" textAnchor="middle">A</text>
          </g>
        ))}
        {/* branch leaders at each zone door — the violation-overlay
            callout system (C4-A): the ACTIVE stage's leader flips to a
            dashed accent run (PLAN_INK_CSS); the quiet doors keep the
            guide-grey hair. Order = stations [01]..[05]. */}
        {[
          [850, 394, 850, 409, 0],
          [850, 460, 850, 449, 1],
          [520, 394, 520, 409, 2],
          [520, 460, 520, 449, 3],
          [270, 394, 270, 409, 4],
        ].map(([x1, y1, x2, y2, st]) => (
          <line
            key={`ld${x1}-${y1}`}
            className="bp-hair pl-leader bp-drawable"
            data-station={st}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            pathLength={1}
          />
        ))}
        {/* station markers at the doors — [NN] in mono, each riding
            its VIOLATION CHIP: quiet by default; the active stage's
            chip lights as the solid-block callout (landing.css owns
            the flip, PLAN_INK_CSS the pigment) */}
        <g className="pl-chips">
          <rect className="pl-chip" data-station="0" x="827" y="370" width="46" height="19" rx="0" />
          <rect className="pl-chip" data-station="1" x="827" y="478" width="46" height="19" rx="0" />
          <rect className="pl-chip" data-station="2" x="497" y="370" width="46" height="19" rx="0" />
          <rect className="pl-chip" data-station="3" x="497" y="478" width="46" height="19" rx="0" />
          <rect className="pl-chip" data-station="4" x="247" y="370" width="46" height="19" rx="0" />
        </g>
        <text className="bp-micro pl-station" data-station="0" x="850" y="384" textAnchor="middle">[01]</text>
        <text className="bp-micro pl-station" data-station="1" x="850" y="492" textAnchor="middle">[02]</text>
        <text className="bp-micro pl-station" data-station="2" x="520" y="384" textAnchor="middle">[03]</text>
        <text className="bp-micro pl-station" data-station="3" x="520" y="492" textAnchor="middle">[04]</text>
        <text className="bp-micro pl-station" data-station="4" x="270" y="384" textAnchor="middle">[05]</text>
        {/* the dimension chains — overall width + height */}
        <g className="bp-hair">
          <line className="bp-drawable" x1="64" y1="712" x2="1136" y2="712" pathLength={1} />
          {[64, 420, 760, 1136].map((x) => (
            <line key={`dt${x}`} className="bp-drawable" x1={x - 4} y1="716" x2={x + 4} y2="708" pathLength={1} />
          ))}
          {[64, 420, 760, 1136].map((x) => (
            <line key={`de${x}`} className="bp-drawable" x1={x} y1="700" x2={x} y2="716" pathLength={1} />
          ))}
        </g>
        <text className="bp-micro" x="242" y="730" textAnchor="middle">11.6M</text>
        <text className="bp-micro" x="590" y="730" textAnchor="middle">11.3M</text>
        <text className="bp-micro" x="948" y="730" textAnchor="middle">12.3M</text>
        {/* the vertical overall dim — the label rides the line, rotated */}
        <g className="bp-hair">
          <line className="bp-drawable" x1="36" y1="60" x2="36" y2="700" pathLength={1} />
          <line className="bp-drawable" x1="32" y1="60" x2="40" y2="60" pathLength={1} />
          <line className="bp-drawable" x1="32" y1="700" x2="40" y2="700" pathLength={1} />
        </g>
        <text className="bp-micro" x="30" y="380" textAnchor="middle" transform="rotate(-90 30 380)">20.6M</text>
        {/* the plan's north arrow */}
        <g className="bp-hair">
          <circle className="bp-drawable" cx="1108" cy="730" r="12" pathLength={1} />
          <polyline className="bp-drawable" points="1108,738 1103,726 1108,729 1113,726" pathLength={1} />
        </g>
      </g>
    </svg>
  );
}
