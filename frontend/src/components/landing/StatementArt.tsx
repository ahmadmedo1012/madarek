/**
 * StatementArt — R315 cycle-4 (c4-C) → R322 (2-c · the Heron intro
 * transplant): the statement band's SQUARE drafted architectural
 * illustration.
 *
 * The measured reference seat (docs/redesign/r322/heron/statement.md):
 * a square ink cell — the 1766×1766 contain-fitted illustration filling
 * the 6-column art cell edge to edge (85.64×86.73rem @1440, a perfect
 * square at 768/390). The old 1386×132 panorama strip could never fill
 * that seat (10.5:1 in a 1:1 box); this re-composition plants the SAME
 * original ink vocabulary — the tall tower mass with vertical-fin
 * hatching and the solid poché shadow, the stepped podium blocks, the
 * ONE orange sun rising behind the tower's shoulder, the row-band of
 * small drafted blocks and figures, the dashed journey path, the ground
 * datum with its hatched strip — as a TALL-FORMAT massing study (never
 * Heron's artwork; the grammar is ours, drawn in the site's own
 * bp-ink/bp-hair/st-* token classes).
 *
 * Ink language: the same token ladder as the hero elevation
 * (ElevationDrawing) — bp-ink structure lines, bp-hair detail work
 * (re-keyed ink-tone by the .st-art-svg scope in landing.css), the
 * cross-hatch / dense-shade / vertical-fins / light-stipple pattern
 * family (own `-st` defs ids — the two artworks never share a defs
 * cell), ONE solid poché mass (var(--text)) and ONE orange sun
 * (var(--accent)). RTL reading: the composition starts at the top of
 * the tower (upper right) and resolves DOWN the skyline toward the
 * figures' rows at the ground — the tall-format equivalent of the
 * hero elevation's own mirrored reading.
 */
export const STATEMENT_ART_VB = { w: 1000, h: 1000 } as const;

/* A drafted row-band cell — the foreground "pixel row" mark.
 * `fill` seats the dense shade value (the dark cells among the
 * outlined ones — the pixel-contrast the rows carry). */
function RowCell({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill?: boolean }) {
  return (
    <rect
      className={fill ? 'bp-drawable st-shade-fill' : 'bp-drawable bp-hair'}
      x={x}
      y={y}
      width={w}
      height={h}
    />
  );
}

/* A drafted figure — a thin vertical stroke + a solid head dot, the
 * shorthand the row bands read as (small drafted figures). */
function Figure({ x, ground }: { x: number; ground: number }) {
  return (
    <g className="bp-hair" aria-hidden="true">
      <line className="bp-drawable" x1={x} y1={ground} x2={x} y2={ground - 44} />
      <circle className="st-poché" cx={x} cy={ground - 52} r={5} />
    </g>
  );
}

export function StatementArt() {
  return (
    <svg
      className="st-art-svg"
      viewBox="0 0 1000 1000"
      role="img"
      aria-label="دراسة كتل حبرية لحرم جامعي: برج تعليمي بارز تطلّ عليه شمس برتقالية، وكتل متدرّجة تنزل نحو صفوف صغيرة من الكتل والمقاعد على خط الأرض، ومسار متقطّع يربط البرج بالصفوف"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* the cross-hatch lattice — roof/shadow planes (both diagonal
            families in one tile, exactly the hero's bp-xhatch grammar) */}
        <pattern id="st-xhatch-st" width="9" height="9" patternUnits="userSpaceOnUse">
          <path className="st-xhatch-line" d="M0,0 L9,9" />
          <path className="st-xhatch-line" d="M9,0 L0,9" />
        </pattern>
        {/* the dense shade stipple — cast shadows + the filled row cells */}
        <pattern id="st-shade-st" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle className="st-shade-dot" cx="1" cy="1" r="1" />
          <circle className="st-shade-dot" cx="4.5" cy="2.5" r="1" />
          <circle className="st-shade-dot" cx="2.5" cy="5.5" r="1" />
          <circle className="st-shade-dot" cx="6" cy="6" r="1" />
        </pattern>
        {/* the vertical fins — the modernist shadow-return value */}
        <pattern id="st-fins-st" width="6" height="6" patternUnits="userSpaceOnUse">
          <line className="st-fins-line" x1="0" y1="0" x2="0" y2="6" />
        </pattern>
        {/* the light wall stipple — the mid-tone concrete value */}
        <pattern id="st-stipple-st" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle className="st-shade-dot" cx="1.5" cy="1.5" r="0.85" />
          <circle className="st-shade-dot" cx="6" cy="3" r="0.85" />
          <circle className="st-shade-dot" cx="2.5" cy="6" r="0.85" />
          <circle className="st-shade-dot" cx="7" cy="7.5" r="0.85" />
        </pattern>
      </defs>

      {/* ═══ the sun — ONE solid orange circle, drawn first so the
          tower's wireframe lines + fins pass over it (the reference's
          own z-order: the sun sits BEHIND the drawing). RTL-mirrored
          seat: the reference's upper-right sun reads upper-RIGHT here
          too (the reading start in RTL), rising behind the tower's
          shoulder. ═══ */}
      <circle className="st-sun" cx="700" cy="215" r="120" aria-hidden="true" />

      {/* ═══ the tower — the composition's reading start (upper right):
          a tall mass with a setback cap + the signal square echo, a
          window ladder on its light face, the fin-hatched shadow
          return over the sun's edge, and the solid poché mass stepping
          down its far edge (the "large solid black polygonal block"). ═══ */}
      <g aria-hidden="true">
        {/* the setback cap + the mastery pin echo (the hero's signal
            square grammar, one small accent on the skyline) */}
        <rect className="bp-drawable bp-ink" x="752" y="70" width="168" height="26" />
        <rect className="bp-signal-fill" x="820" y="52" width="16" height="16" />
        {/* the body — from the cap down to the ground */}
        <rect className="bp-drawable bp-ink" x="736" y="96" width="200" height="804" />
        {/* the window ladder — the light face's grid (the reading-start
            face, lit; the ladder reads as floors) */}
        {[168, 240, 312, 384, 456, 528, 600, 672, 744, 816].map((y) => (
          <line key={y} className="bp-drawable bp-hair" x1="746" y1={y} x2="790" y2={y} />
        ))}
        <line className="bp-drawable bp-hair" x1="768" y1="100" x2="768" y2="898" />
        {/* the fin-hatched shadow face (over the sun's edge — wireframe
            ink in front of the orange, the reference's z-order) */}
        <rect className="st-fins-fill" x="794" y="102" width="88" height="800" aria-hidden="true" />
        {/* the fin band's bounding hairlines (read the texture as a
            drafted bay, not a smudge) */}
        <line className="bp-drawable bp-hair" x1="794" y1="102" x2="794" y2="898" />
        <line className="bp-drawable bp-hair" x1="882" y1="102" x2="882" y2="898" />
        {/* the solid poché mass — the deep shadow polygon on the far
            edge, stepping down the tower's shoulder like the
            reference's black map block */}
        <polygon
          className="st-poché"
          points="936,96 936,900 884,900 884,470 902,96"
          aria-hidden="true"
        />
        {/* the entrance — door ticks at the ground line */}
        <line className="bp-drawable bp-hair" x1="762" y1="900" x2="762" y2="830" />
        <line className="bp-drawable bp-hair" x1="786" y1="900" x2="786" y2="830" />
      </g>

      {/* ═══ the podium — the tower's base block: hatched roof band,
          cast-shadow strip, door ticks at the ground line. ═══ */}
      <g aria-hidden="true">
        <rect className="bp-drawable bp-ink" x="560" y="560" width="176" height="340" />
        <rect className="st-xhatch-fill" x="563" y="563" width="170" height="26" aria-hidden="true" />
        <rect className="st-shade-fill" x="563" y="595" width="170" height="24" aria-hidden="true" />
        <line className="bp-drawable bp-hair" x1="600" y1="900" x2="600" y2="808" />
        <line className="bp-drawable bp-hair" x1="640" y1="900" x2="640" y2="808" />
        <line className="bp-drawable bp-hair" x1="680" y1="900" x2="680" y2="808" />
      </g>

      {/* ═══ the mid masses — the stepped campus blocks descending the
          skyline toward the reading end: A (hatched roof + window
          ticks), B (fin-hatched shadow return), C (clean + doors). ═══ */}
      <g aria-hidden="true">
        {/* block A */}
        <rect className="bp-drawable bp-ink" x="392" y="470" width="152" height="430" />
        <rect className="st-xhatch-fill" x="395" y="473" width="146" height="22" aria-hidden="true" />
        {[540, 600, 660, 720, 780].map((y) => (
          <line key={y} className="bp-drawable bp-hair" x1="410" y1={y} x2="528" y2={y} />
        ))}
        {/* block B */}
        <rect className="bp-drawable bp-ink" x="252" y="620" width="130" height="280" />
        <rect className="st-fins-fill" x="255" y="623" width="26" height="274" aria-hidden="true" />
        <line className="bp-drawable bp-hair" x1="284" y1="620" x2="284" y2="900" />
        {/* block C */}
        <rect className="bp-drawable bp-ink" x="120" y="726" width="124" height="174" />
        <line className="bp-drawable bp-hair" x1="152" y1="900" x2="152" y2="800" />
        <line className="bp-drawable bp-hair" x1="184" y1="900" x2="184" y2="800" />
        <line className="bp-drawable bp-hair" x1="216" y1="900" x2="216" y2="800" />
      </g>

      {/* ═══ the journey — the dashed path from the tower's podium down
          the stepped skyline to the row band (the hero's own journey
          grammar, arrow at the reading-forward end + station ticks). ═══ */}
      <g className="bp-l-journey" aria-hidden="true">
        <line className="bp-dash" x1="648" y1="432" x2="648" y2="528" />
        <line className="bp-dash" x1="648" y1="528" x2="468" y2="528" />
        <line className="bp-dash" x1="468" y1="528" x2="468" y2="616" />
        <line className="bp-dash" x1="468" y1="616" x2="308" y2="616" />
        <line className="bp-dash" x1="308" y1="616" x2="308" y2="676" />
        <polyline className="bp-drawable bp-ink" points="300,668 308,684 316,668" />
        {/* the station ticks tying the path to the masses it serves */}
        <line className="bp-drawable bp-hair" x1="648" y1="528" x2="648" y2="552" />
        <line className="bp-drawable bp-hair" x1="468" y1="616" x2="468" y2="640" />
      </g>

      {/* ═══ the row band — the "pixel-art rows": two offset rows of
          small drafted cells along the ground line at the composition's
          open corner (the campus's people — the reading destination),
          plus the drafted figures standing among them. ═══ */}
      <g aria-hidden="true">
        {/* the back row — taller cells */}
        {Array.from({ length: 10 }, (_, i) => 60 + i * 36).map((x, i) => (
          <RowCell key={x} x={x} y={838} w={24} h={62} fill={i === 2 || i === 7} />
        ))}
        {/* the front row — offset half a pitch, shallower cells */}
        {Array.from({ length: 9 }, (_, i) => 78 + i * 36).map((x, i) => (
          <RowCell key={x} x={x} y={862} w={24} h={38} fill={i === 5} />
        ))}
        {/* the figures — four drafted people among the rows */}
        {[130, 202, 274, 346].map((x) => (
          <Figure key={x} x={x} ground={836} />
        ))}
      </g>

      {/* ═══ the left end — the site tree (the hero elevation's own
          bookend) + the low entrance mass at the composition's close. ═══ */}
      <g aria-hidden="true">
        <g className="bp-hair">
          <path className="bp-drawable" d="M52,900 v-96" />
          <path className="bp-drawable" d="M52,816 c-20,-26 -38,-38 -60,-45" />
          <path className="bp-drawable" d="M52,810 c20,-29 38,-42 58,-54" />
          <circle className="st-stipple-outline" cx="52" cy="762" r="52" />
          <circle className="st-stipple-outline" cx="16" cy="794" r="36" />
          <circle className="st-stipple-outline" cx="90" cy="786" r="38" />
        </g>
      </g>

      {/* ═══ the ground — the datum line, the cast-shadow band under
          the whole skyline, the hatched ground strip, and the drafting
          ticks at both ends. ═══ */}
      <g className="bp-l-ground" aria-hidden="true">
        <line className="bp-drawable bp-ink bp-ink-2" x1="16" y1="900" x2="984" y2="900" />
        <rect className="st-shade-fill" x="60" y="903" width="820" height="26" aria-hidden="true" />
        <rect className="st-xhatch-fill" x="16" y="903" width="970" height="36" aria-hidden="true" />
        <line className="bp-drawable bp-hair" x1="120" y1="914" x2="152" y2="882" />
        <line className="bp-drawable bp-hair" x1="848" y1="914" x2="880" y2="882" />
      </g>
    </svg>
  );
}
