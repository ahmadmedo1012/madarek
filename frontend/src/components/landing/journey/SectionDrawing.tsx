/**
 * SectionDrawing — R315 C4-A — the closing state's second view.
 *
 * The reference's late-map frames read as a MULTI-VIEW TECHNICAL SHEET
 * (its s07 frames: the plan beside stacked detail views, title blocks,
 * node markers). This is the Madarek translation for the journey's
 * CLOSING state: when the capability column opens at pin end, it
 * carries the learning floor's SECTION A-A — the same cut the plan's
 * corridor path flags — so the release state reads as one drawing
 * sheet: the plan (the stage's main view) + the section (the detail
 * panel) + the checklist ledger.
 *
 *  · The cut looks NORTH through the corridor: the three north rooms
 *    profile left→right (RTL reading) — غرفة الإتقان (the stepped
 *    seminar), قاعة الاختبار (the flat hall), قاعة المحاضرات (the
 *    raked seating + stage). The active stage's room carries the
 *    SAME solid accent wash as the plan's zone (the .jt[data-stage]
 *    flips — landing.css; the checkpoint sits south of the cut and
 *    owns no section profile — the drawing stays honest).
 *  · The ink rides the plan's own drafting family (bp-ink / bp-hair /
 *    bp-micro), pinned to the measured drafting primaries by the
 *    paper-artifact ruling (SECTION_INK_CSS — both themes).
 *  · The earth below the floor line carries the stipple ground; the
 *    cut members read as solid masses — the section conventions the
 *    plan already speaks.
 *  · Paper artifact in BOTH themes; role="img" with a full Arabic
 *    description; zero tashkeel; every label honest.
 */
import { SECTION_INK_CSS } from '../LearningPlanDrawing';

export const SECTION_VB = { w: 320, h: 150 } as const;

/* the earth stipple + the section's own hatch helpers stay local —
 * geometry-faithful to the plan's own texture primitives. */
function sectionStipple(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  gap = 8,
): Array<[number, number]> {
  const dots: Array<[number, number]> = [];
  let row = 0;
  for (let y = y0; y <= y1; y += gap * 0.9, row += 1) {
    const off = row % 2 === 0 ? 0 : gap / 2;
    for (let x = x0 + off; x <= x1; x += gap) {
      dots.push([x, y]);
    }
  }
  return dots;
}

export function SectionDrawing() {
  return (
    <svg
      className="bp-svg jt-section"
      viewBox={`0 0 ${SECTION_VB.w} ${SECTION_VB.h}`}
      role="img"
      aria-label="قطاع أفقي للمسطح عند الممر: غرفة إتقان بمدرجات، وقاعة اختبار مستوية، وقاعة محاضرات بصفوف مدرّجة ومنصة — مع الأرض المتراصة أسفل خط الأرضية وسلسلة أبعاد بارتفاع القاعات"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* the section's pigment sheet — scoped .jt .jt-section, after landing.css */}
      <style dangerouslySetInnerHTML={{ __html: SECTION_INK_CSS }} />

      {/* the rooms' washes — the active stage's room mirrors the plan's
          zone fill (landing.css owns the flips; quiet by default) */}
      <rect className="sc-zone" data-room="mastery" x="10" y="58" width="94" height="54" />
      <rect className="sc-zone" data-room="exam" x="109" y="58" width="94" height="54" />
      <rect className="sc-zone" data-room="lecture" x="208" y="58" width="102" height="54" />

      {/* the structure — the floor line, the roof, the cut members */}
      <g className="sc-l-frame" aria-hidden="true">
        {/* the floor line — the heaviest stroke on the sheet */}
        <line className="bp-ink bp-ink-2 bp-drawable" x1="4" y1="112" x2="316" y2="112" pathLength={1} />
        {/* the roof plane */}
        <line className="bp-ink bp-drawable" x1="4" y1="52" x2="316" y2="52" pathLength={1} />
        {/* the cut end walls — solid masses */}
        <rect className="pl-wall bp-drawable" x="4" y="52" width="6" height="60" pathLength={1} />
        <rect className="pl-wall bp-drawable" x="310" y="52" width="6" height="60" pathLength={1} />
        {/* the cut partitions between the rooms */}
        <rect className="pl-wall bp-drawable" x="104" y="52" width="5" height="60" pathLength={1} />
        <rect className="pl-wall bp-drawable" x="203" y="52" width="5" height="60" pathLength={1} />
        {/* the window openings in the back wall — the elevation glazing */}
        {[24, 124, 226].map((x) => (
          <rect key={`w${x}`} className="bp-hair bp-drawable" x={x} y="72" width="58" height="26" pathLength={1} />
        ))}
      </g>

      {/* the rooms' profiles — honest echoes of the plan's own geometry */}
      <g className="sc-l-rooms" aria-hidden="true">
        {/* غرفة الإتقان — the stepped seminar rising toward the west focus wall */}
        {[0, 1, 2].map((i) => (
          <rect
            key={`m${i}`}
            className="bp-hair bp-drawable"
            x={16 + i * 28}
            y={104 - i * 9}
            width={24}
            height={8 + i * 9}
            pathLength={1}
          />
        ))}
        {/* قاعة الاختبار — the flat hall: two desk profiles + the wall clock */}
        <rect className="bp-hair bp-drawable" x="128" y="100" width="20" height="12" pathLength={1} />
        <rect className="bp-hair bp-drawable" x="160" y="100" width="20" height="12" pathLength={1} />
        <circle className="bp-fill bp-drawable" cx="152" cy="64" r="6" pathLength={1} />
        {/* قاعة المحاضرات — the raked seating treads + the stage platform */}
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={`l${i}`}
            className="bp-hair bp-drawable"
            x={222 + i * 18}
            y={104 - i * 8}
            width={15}
            height={8 + i * 8}
            pathLength={1}
          />
        ))}
        <rect className="pl-wall bp-drawable" x="296" y="72" width="13" height="40" pathLength={1} />
        <line className="bp-ink bp-ink-2 bp-drawable" x1="307" y1="72" x2="307" y2="112" pathLength={1} />
      </g>

      {/* the grounds — the earth stipple under the floor line */}
      <g className="sc-l-earth" aria-hidden="true">
        {sectionStipple(8, 312, 116, 132).map(([x, y], i) => (
          <circle key={`e${i}`} className="pl-dot" cx={x} cy={y} r={0.8} />
        ))}
        {/* the footing line under the stipple */}
        <line className="bp-hair bp-drawable" x1="4" y1="134" x2="316" y2="134" pathLength={1} />
      </g>

      {/* the annotation — dims + the cut flags */}
      <g className="sc-l-annot" aria-hidden="true">
        {/* the height dim chain at the foot */}
        <line className="bp-hair bp-drawable" x1="4" y1="141" x2="316" y2="141" pathLength={1} />
        {[4, 109, 208, 316].map((x) => (
          <g key={`d${x}`}>
            <line className="bp-drawable bp-hair" x1={x} y1="137" x2={x} y2="145" pathLength={1} />
          </g>
        ))}
        <text className="bp-micro" x="56" y="136" textAnchor="middle">4.6M</text>
        <text className="bp-micro" x="156" y="136" textAnchor="middle">4.7M</text>
        <text className="bp-micro" x="262" y="136" textAnchor="middle">4.2M</text>
        {/* the section flags — the cut's own identity, A at both ends */}
        {[10, 310].map((x) => (
          <g key={`a${x}`}>
            <line className="bp-hair bp-drawable" x1={x} y1="44" x2={x} y2="60" pathLength={1} />
            <text className="bp-micro" x={x} y="40" textAnchor="middle">A</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
