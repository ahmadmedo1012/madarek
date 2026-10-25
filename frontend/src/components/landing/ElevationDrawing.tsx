/**
 * ElevationDrawing — R310 «واجهة التعلّم» — Artwork A.
 *
 * R315 (B1 · A.1): the hero window re-seats this, Madarek's own ink
 * elevation, as the hero art — the WHOLE frontal building on
 * transparent paper (the R314 raster fragment retires from the seat).
 * Variants:
 *   · 'sheet'     — the complete drawing sheet (frame, grid, ground,
 *     masses, dims, journey, labels) — the standalone full drawing.
 *   · 'entrance'  — the loader's staged construction (no texture fills,
 *     no micro metadata) — UNCHANGED behaviour.
 *   · 'hero'      — the hero seat: the elevation itself (structural
 *     grid, ground line + hatch, the five volumes, trees, stipple)
 *     WITHOUT the sheet furniture (own frame/ruler, dimension chain,
 *     journey path, name labels) — the hero window carries its own
 *     drafting chrome (ticks, dashed inner frame, ± marks) and the
 *     Arabic name labels would fall under the 13px script floor at
 *     the 0.88 seat scale. The narrative lives in the copy + the
 *     inspection stations.
 *
 * The hero's original architectural ELEVATION: one composed university
 * learning building, drafted as a real drawing sheet — five connected
 * volumes that carry the learning journey (RTL reading): the lecture
 * auditorium (start), the checkpoint link, the exam pavilion, the
 * library wing, and the mastery tower (end). This replaces the R306
 * five-pictogram «مخطط مدارك»: the same narrative, promoted from icon
 * row to a drafted elevation with a structural grid, a dimension
 * chain, registration marks, an edge ruler, stippled wall texture,
 * trees, and sparse ORANGE signals that mean something (the checkpoint
 * pennant, the mastery pinnacle).
 *
 * R315 cycle-4 (c4-C — the s00 tonal-density verdict): the reference's
 *   elevation reads as a DENSE high-contrast stippled/hatched modernist
 *   ink; ours read as sparse thin line-art. The hero variant now carries
 *   the full drafted-ink VALUE RANGE (all gated `!entrance`, so the
 *   loader's staged construction stays untouched): systematic cross-hatch
 *   bands on the roof/shadow planes (the rake, the architrave, the
 *   parapet), vertical-fin hatching on the shadow returns (the tower
 *   tiers, the checkpoint glass), dense stipple shadow masses (under the
 *   rake, the canopy, the colonnade's recessed wall), cast-shadow grounds
 *   under every footprint, and stippled tree canopies. The stroke-weight
 *   ladder itself is seated in landing.css scoped to .fo-hero-window
 *   (bp-ink 2.75 / bp-ink-2 4 / bp-hair → ink-tone 1.3): the hero window
 *   reads as a confident ink drawing from 1.5m, the sheet's own thin-line
 *   grammar rides everywhere else.
 *
 * Construction contracts:
 *
 *  · EVERY drawable carries the pathLength normalization AND the
 *    bp-drawable class — the entrance ink-in
 *    (`.landing.intro-draw` → `.intro-done` in landing.css) strokes
 *    each layer in drafting order via the `data-ink` index: frame →
 *    grid → ground → primary masses → secondary structure → openings
 *    → detail (trees/clock/stipple) → dimensions → journey → labels.
 *  · Layer groups are named by PURPOSE (spec §2.5), not by stage —
 *    the five stage volumes live INSIDE the drawing layers, each as
 *    `g.bp-vol.bp-vol-N` (+ `bp-on` when active), so the active-stage
 *    highlight can warm the volume's outline (the drafting-canon
 *    red-pencil revision).
 *  · Zero raw colors: every stroke/fill rides the bp-* token classes
 *    from landing.css; the two texture patterns (stipple + ground
 *    hatch) draw with class-based fills so both themes stay correct.
 *  · `role="img"` + a full Arabic description — the drawing is
 *    informative without any pointer interaction (the hotspots and
 *    inspection stations live OUTSIDE the artwork).
 *  · One coordinate frame: the artwork's own 1440×640 space is the
 *    frame the hotspot pins and the inspection stations are authored
 *    in (LandingPage STAGES / HeroInspect MARKERS) — the hero remaps
 *    it through the HERO_SEAT transform in HeroInkWindow.
 */

/* The drawing's own frame — shared with HeroInspect + LandingPage. */
export const ELEVATION_VB = { w: 1440, h: 640 } as const;

export type ElevationVariant = 'sheet' | 'entrance' | 'hero';

/* Repeated-window helper — a library/auditorium window with its
 * center mullion (the drafting shorthand for glazing). */
function Window({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <g className="bp-hair" aria-hidden="true">
      <rect className="bp-drawable" x={x} y={y} width={w} height={h} pathLength={1} />
      <line className="bp-drawable" x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} pathLength={1} />
    </g>
  );
}

/* A drafting tick — the 45° slash used on dimension chains. */
function DimTick({ x, y }: { x: number; y: number }) {
  return <line className="bp-hair bp-drawable" x1={x - 4} y1={y + 4} x2={x + 4} y2={y - 4} pathLength={1} />;
}

/*
 * ElevationArt — the drawing's layers (defs + groups), no <svg>
 * wrapper: the hero seats this fragment inside its own 1440×720 frame
 * through the HERO_SEAT transform (one artwork, two frames, one
 * coordinate story).
 */
export function ElevationArt({
  active,
  variant = 'sheet',
}: {
  active: number;
  variant?: ElevationVariant;
}) {
  const on = (i: number) => (active === i ? ' bp-on' : '');
  const entrance = variant === 'entrance';
  /* the sheet furniture rides the sheet + entrance variants only —
   * the hero window owns its chrome (R315 A.1/A.3). */
  const furniture = variant !== 'hero';
  const uid = entrance ? 'elv-in' : 'elv';
  const stippleId = `bp-stipple-${uid}`;
  const hatchId = `bp-hatch-${uid}`;
  /* c4-C: the three added value-range textures — cross-hatch (roof/shadow
   * planes), dense shade stipple (cast shadows), vertical fins (the
   * modernist shadow returns). */
  const xhatchId = `bp-xhatch-${uid}`;
  const shadeId = `bp-shade-${uid}`;
  const finsId = `bp-fins-${uid}`;

  return (
    <>
      <defs>
        {/* the value-range textures — the reference's stipple/hatch/fins
            language as line work, token-colored. (The entrance variant
            skips every texture fill — the loader's construction stays
            thin-line, unchanged.) */}
        {!entrance && (
          <>
            {/* the wall stipple — c4-C: four offset dot rows per cell (the
                mid-tone concrete value; was two — the tonal-density fix). */}
            <pattern id={stippleId} width="8" height="8" patternUnits="userSpaceOnUse">
              <circle className="bp-stipple-dot" cx="1.5" cy="1.5" r="0.75" />
              <circle className="bp-stipple-dot" cx="5.5" cy="3" r="0.75" />
              <circle className="bp-stipple-dot" cx="2.5" cy="5.5" r="0.75" />
              <circle className="bp-stipple-dot" cx="6.5" cy="6.5" r="0.75" />
            </pattern>
            {/* the ground hatch — 45° hairlines under the ground datum. */}
            <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line className="bp-drawable bp-hatch-line" x1="0" y1="0" x2="0" y2="7" pathLength={1} />
            </pattern>
            {/* c4-C — the cross-hatch lattice (both diagonal families in
                one tile): the roof/shadow-plane value. */}
            <pattern id={xhatchId} width="8" height="8" patternUnits="userSpaceOnUse">
              <path className="bp-xhatch-line" d="M0,0 L8,8" />
              <path className="bp-xhatch-line" d="M8,0 L0,8" />
            </pattern>
            {/* c4-C — the dense shade stipple: the cast-shadow value
                (under overhangs, the colonnade's recessed wall, the
                setback ledges, the building footprints on the ground). */}
            <pattern id={shadeId} width="6" height="6" patternUnits="userSpaceOnUse">
              <circle className="bp-shade-dot" cx="1" cy="1" r="0.85" />
              <circle className="bp-shade-dot" cx="4" cy="2.5" r="0.85" />
              <circle className="bp-shade-dot" cx="2" cy="5" r="0.85" />
              <circle className="bp-shade-dot" cx="5.5" cy="5.5" r="0.85" />
            </pattern>
            {/* c4-C — the vertical fins: the modernist shadow-return
                value (the tower tiers' shaded edges, the glass curtains). */}
            <pattern id={finsId} width="5" height="5" patternUnits="userSpaceOnUse">
              <line className="bp-fins-line" x1="0" y1="0" x2="0" y2="5" />
            </pattern>
          </>
        )}
      </defs>

      {/* ═══ 01 · the sheet frame — registration corners + edge ruler ═══ */}
      {furniture && (
      <g className="bp-l-frame" data-ink="1" aria-hidden="true">
        <g className="bp-hair">
          <path d="M36 50 h16 M44 42 v16" className="bp-drawable" pathLength={1} />
          <path d="M1388 50 h16 M1396 42 v16" className="bp-drawable" pathLength={1} />
          <path d="M36 614 h16 M44 606 v16" className="bp-drawable" pathLength={1} />
          <path d="M1388 614 h16 M1396 606 v16" className="bp-drawable" pathLength={1} />
        </g>
        {/* the top ruler — the drafting strip with alternating ticks */}
        <line className="bp-drawable bp-hair" x1="36" y1="64" x2="1404" y2="64" pathLength={1} />
        {Array.from({ length: 39 }, (_, i) => 36 + i * 36).map((x) => (
          <line
            key={x}
            className="bp-drawable bp-hair"
            x1={x}
            y1="64"
            x2={x}
            y2={x % 72 === 0 ? 54 : 59}
            pathLength={1}
          />
        ))}
        {!entrance && (
          <>
            <text className="bp-micro" x="1404" y="46" textAnchor="end">MDRK · CAMPUS · ELEV A-A</text>
            <text className="bp-micro" x="36" y="46">SCALE 1:200 · UNITS M</text>
          </>
        )}
      </g>
      )}

      {/* ═══ 02 · the structural grid — column axes A…G ═══════════════ */}
      <g className="bp-l-grid" data-ink="2" aria-hidden="true">
        {[
          ['A', 280],
          ['B', 430],
          ['C', 585],
          ['D', 740],
          ['E', 930],
          ['F', 1010],
          ['G', 1280],
        ].map(([letter, x]) => (
          <g key={letter as string}>
            <line className="bp-drawable bp-gridline" x1={x as number} y1="108" x2={x as number} y2="500" pathLength={1} />
            <circle className="bp-drawable bp-hair" cx={x as number} cy="99" r="9" pathLength={1} />
            <text className="bp-micro" x={x as number} y="102.5" textAnchor="middle">
              {letter as string}
            </text>
          </g>
        ))}
      </g>

      {/* ═══ 03 · the ground — datum line + hatch + paving joints ═════ */}
      <g className="bp-l-ground" data-ink="3" aria-hidden="true">
        <line className="bp-drawable bp-ink bp-ink-2" x1="36" y1="500" x2="1404" y2="500" pathLength={1} />
        {!entrance && (
          <>
            <rect className="bp-drawable bp-hatch-fill" x="36" y="501" width="1368" height="16" pathLength={1} />
            {/* c4-C — the cast-shadow ground band under the whole
                composition: the dense stipple anchors every volume to
                the datum (the reference's deep ground shadows). */}
            <rect className="bp-drawable bp-shade-fill" x="280" y="500" width="1006" height="12" pathLength={1} />
          </>
        )}
        {/* paving joints above the datum (sheet variant only) */}
        {!entrance &&
          Array.from({ length: 29 }, (_, i) => 60 + i * 48).map((x) => (
            <line key={x} className="bp-drawable bp-hair" x1={x} y1="500" x2={x} y2="495" pathLength={1} />
          ))}
        {/* the level datum triangles at both ends */}
        <polygon className="bp-drawable bp-fill" points="52,500 60,488 68,500" pathLength={1} />
        <polygon className="bp-drawable bp-fill" points="1372,500 1380,488 1388,500" pathLength={1} />
      </g>

      {/* ═══ 04 · the primary masses — the five volumes ════════════════ */}

      {/* — 01 · قاعة المحاضرات — the auditorium (reading start) — */}
      <g className={`bp-vol bp-vol-0${on(0)}`} aria-hidden="true">
        <rect className="bp-drawable bp-l-primary bp-fill" data-ink="4" x="1010" y="230" width="270" height="270" pathLength={1} />
        {/* the raked clerestory roof — rising toward the rear (RTL) */}
        <polyline className="bp-drawable bp-l-primary bp-ink bp-ink-2" data-ink="4" points="1010,230 1145,196 1280,230" pathLength={1} />
        <g className="bp-l-secondary" data-ink="5">
          {/* c4-C — the raked roof plane: the cross-hatch band under the
              clerestory rake (the reference's hatched roof masses). */}
          {!entrance && (
            <polygon className="bp-drawable bp-xhatch-fill" points="1010,230 1145,196 1280,230" pathLength={1} />
          )}
          <line className="bp-drawable bp-hair" x1="1016" y1="242" x2="1274" y2="242" pathLength={1} />
          {/* the clerestory band — 11 mullions under the rake */}
          <rect className="bp-drawable bp-hair" x="1030" y="252" width="220" height="32" pathLength={1} />
          {Array.from({ length: 10 }, (_, i) => 1052 + i * 20).map((x) => (
            <line key={x} className="bp-drawable bp-hair" x1={x} y1="252" x2={x} y2="284" pathLength={1} />
          ))}
          {/* the spandrel texture + the floor band */}
          {!entrance && (
            <>
              <rect className="bp-drawable bp-stipple-fill" x="1012" y="288" width="266" height="104" pathLength={1} />
              {/* c4-C — the rake's cast shadow: the dense stipple band
                  at the top of the spandrel (the reference's deep
                  under-overhang shadows). */}
              <rect className="bp-drawable bp-shade-fill" x="1012" y="288" width="266" height="22" pathLength={1} />
            </>
          )}
          <line className="bp-drawable bp-hair" x1="1010" y1="392" x2="1280" y2="392" pathLength={1} />
          {/* the level marker — L1 at the floor band */}
          <line className="bp-drawable bp-hair" x1="1280" y1="392" x2="1292" y2="392" pathLength={1} />
          {!entrance && <text className="bp-micro" x="1296" y="395">L1</text>}
        </g>
        <g className="bp-l-openings" data-ink="6">
          {/* c4-C — the entrance's shadow planes: the canopy's cast
              shadow on the wall + the transom's reveal shadow + the base
              strips below the slit windows. */}
          {!entrance && (
            <>
              <rect className="bp-drawable bp-shade-fill" x="1080" y="402" width="120" height="18" pathLength={1} />
              <rect className="bp-drawable bp-shade-fill" x="1092" y="412" width="96" height="16" pathLength={1} />
              <rect className="bp-drawable bp-stipple-fill" x="1012" y="484" width="70" height="10" pathLength={1} />
              <rect className="bp-drawable bp-stipple-fill" x="1198" y="484" width="78" height="10" pathLength={1} />
            </>
          )}
          {/* the entrance portal — double doors + transom + canopy */}
          <rect className="bp-drawable bp-fill" x="1090" y="410" width="100" height="90" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="1140" y1="410" x2="1140" y2="500" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="1090" y1="430" x2="1190" y2="430" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="1115" y1="430" x2="1115" y2="500" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="1165" y1="430" x2="1165" y2="500" pathLength={1} />
          {/* the canopy + its rods */}
          <line className="bp-drawable bp-ink" x1="1078" y1="400" x2="1202" y2="400" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="1090" y1="400" x2="1090" y2="410" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="1190" y1="400" x2="1190" y2="410" pathLength={1} />
          {/* the entrance steps */}
          <rect className="bp-drawable bp-hair" x="1082" y="492" width="116" height="8" pathLength={1} />
          <rect className="bp-drawable bp-hair" x="1074" y="500" width="132" height="8" pathLength={1} />
          {/* two flanking slit windows */}
          <Window x={1030} y={420} w={22} h={64} />
          <Window x={1232} y={420} w={22} h={64} />
        </g>
      </g>

      {/* — 02 · جسر نقطة الفحص — the checkpoint link + signal mast — */}
      <g className={`bp-vol bp-vol-1${on(1)}`} aria-hidden="true">
        <rect className="bp-drawable bp-l-primary bp-fill" data-ink="4" x="930" y="356" width="80" height="144" pathLength={1} />
        {/* c4-C — the link's shaded head band above the glass. */}
        {!entrance && (
          <rect className="bp-drawable bp-stipple-fill" x="932" y="358" width="76" height="14" pathLength={1} />
        )}
        <g className="bp-l-openings" data-ink="6">
          {/* the glass curtain — 4×3 grid */}
          {/* c4-C — the vertical-fins texture behind the mullions (the
              reference's densely hatched glass bays). */}
          {!entrance && (
            <rect className="bp-drawable bp-fins-fill" x="938" y="376" width="64" height="96" pathLength={1} />
          )}
          <rect className="bp-drawable bp-hair" x="938" y="376" width="64" height="96" pathLength={1} />
          {[954, 970, 986].map((x) => (
            <line key={x} className="bp-drawable bp-hair" x1={x} y1="376" x2={x} y2="472" pathLength={1} />
          ))}
          {[408, 440].map((y) => (
            <line key={y} className="bp-drawable bp-hair" x1="938" y1={y} x2="1002" y2={y} pathLength={1} />
          ))}
        </g>
        <g className="bp-l-detail" data-ink="7">
          {/* the signal mast + THE checkpoint square (orange marker #1 —
              R315 A.1: the pin-square grammar, 18×18 → ≈16px on the
              hero seat; the reference parity marker shape) */}
          <line className="bp-drawable bp-ink" x1="970" y1="356" x2="970" y2="300" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="962" y1="312" x2="978" y2="312" pathLength={1} />
          <rect className="bp-drawable bp-signal-fill" x="972" y="300" width="18" height="18" pathLength={1} />
          {/* the pulse square on the glass — the live checkpoint */}
          <rect className="bp-drawable bp-signal-fill" x="966" y="452" width="8" height="8" pathLength={1} />
        </g>
      </g>

      {/* — 03 · جناح الاختبار — the exam pavilion: colonnade + clock — */}
      <g className={`bp-vol bp-vol-2${on(2)}`} aria-hidden="true">
        <g className="bp-l-primary" data-ink="4">
          <rect className="bp-drawable bp-fill" x="740" y="320" width="190" height="180" pathLength={1} />
          <rect className="bp-drawable bp-fill" x="748" y="292" width="174" height="28" pathLength={1} />
          {/* c4-C — the architrave's cross-hatch band (the shadow plane
              under the pediment). */}
          {!entrance && (
            <rect className="bp-drawable bp-xhatch-fill" x="750" y="294" width="170" height="24" pathLength={1} />
          )}
          {/* the pediment */}
          <polygon className="bp-drawable bp-ink bp-ink-2" points="740,292 835,250 930,292" pathLength={1} />
        </g>
        <g className="bp-l-openings" data-ink="6">
          {/* c4-C — the recessed wall behind the colonnade: mid-tone
              stipple + the entablature's deep shadow band at the top
              (the colonnade reads as clean paper columns in front of a
              shadowed wall — the reference's depth contrast). */}
          {!entrance && (
            <>
              <rect className="bp-drawable bp-stipple-fill" x="744" y="344" width="182" height="148" pathLength={1} />
              <rect className="bp-drawable bp-shade-fill" x="744" y="344" width="182" height="18" pathLength={1} />
            </>
          )}
          {/* the colonnade — four columns with capitals + bases */}
          {[766, 812, 858, 904].map((x) => (
            <g key={x}>
              <rect className="bp-drawable bp-fill" x={x} y="340" width="13" height="152" pathLength={1} />
              <rect className="bp-drawable bp-hair" x={x - 3} y="332" width="19" height="8" pathLength={1} />
              <rect className="bp-drawable bp-hair" x={x - 3} y="492" width="19" height="8" pathLength={1} />
            </g>
          ))}
          {/* the recessed door wall between the middle columns */}
          <rect className="bp-drawable bp-hair" x="800" y="416" width="78" height="84" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="839" y1="416" x2="839" y2="500" pathLength={1} />
          {/* the pavilion steps */}
          <rect className="bp-drawable bp-hair" x="748" y="500" width="174" height="8" pathLength={1} />
          <rect className="bp-drawable bp-hair" x="740" y="508" width="190" height="8" pathLength={1} />
        </g>
        <g className="bp-l-detail" data-ink="7">
          {/* the clock in the pediment */}
          <circle className="bp-drawable bp-fill" cx="835" cy="281" r="13" pathLength={1} />
          <line className="bp-drawable bp-ink" x1="835" y1="281" x2="835" y2="271" pathLength={1} />
          <line className="bp-drawable bp-ink" x1="835" y1="281" x2="842" y2="285" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="835" y1="270" x2="835" y2="273" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="835" y1="289" x2="835" y2="292" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="824" y1="281" x2="827" y2="281" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="843" y1="281" x2="846" y2="281" pathLength={1} />
        </g>
      </g>

      {/* — 04 · جناح المكتبة — the library: the tall-window wing — */}
      <g className={`bp-vol bp-vol-3${on(3)}`} aria-hidden="true">
        <rect className="bp-drawable bp-l-primary bp-fill" data-ink="4" x="430" y="300" width="310" height="200" pathLength={1} />
        <g className="bp-l-secondary" data-ink="5">
          {/* the parapet + its coping ticks */}
          <line className="bp-drawable bp-ink" x1="426" y1="292" x2="744" y2="292" pathLength={1} />
          {/* c4-C — the parapet's cross-hatch band + its cast-shadow
              strip on the wall below (the hatched roof planes). */}
          {!entrance && (
            <>
              <rect className="bp-drawable bp-xhatch-fill" x="432" y="293" width="306" height="7" pathLength={1} />
              <rect className="bp-drawable bp-shade-fill" x="432" y="302" width="306" height="14" pathLength={1} />
            </>
          )}
          {Array.from({ length: 10 }, (_, i) => 438 + i * 32).map((x) => (
            <line key={x} className="bp-drawable bp-hair" x1={x} y1="292" x2={x} y2="286" pathLength={1} />
          ))}
          {/* the reading-room spandrel + the floor band */}
          {!entrance && (
            <rect className="bp-drawable bp-stipple-fill" x="432" y="374" width="306" height="34" pathLength={1} />
          )}
          <line className="bp-drawable bp-hair" x1="430" y1="408" x2="740" y2="408" pathLength={1} />
        </g>
        <g className="bp-l-openings" data-ink="6">
          {/* the tall-window grid — 7 bays × 2 rows */}
          {Array.from({ length: 7 }, (_, i) => 448 + i * 40).map((x) => (
            <g key={x}>
              <Window x={x} y={318} w={26} h={48} />
              <Window x={x} y={424} w={26} h={62} />
            </g>
          ))}
          {/* the wing entrance (reading end) */}
          <rect className="bp-drawable bp-hair" x="700" y="424" width="32" height="76" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="716" y1="424" x2="716" y2="500" pathLength={1} />
          {/* c4-C — the plinth strip below the tall windows (the base
              shadow value on the reading wing's wall). */}
          {!entrance && (
            <rect className="bp-drawable bp-stipple-fill" x="432" y="488" width="306" height="10" pathLength={1} />
          )}
        </g>
      </g>

      {/* — 05 · برج الإتقان — the mastery tower: setbacks + pinnacle — */}
      <g className={`bp-vol bp-vol-4${on(4)}`} aria-hidden="true">
        <g className="bp-l-primary" data-ink="4">
          <rect className="bp-drawable bp-fill" x="280" y="240" width="150" height="260" pathLength={1} />
          <rect className="bp-drawable bp-fill" x="295" y="170" width="120" height="70" pathLength={1} />
          <rect className="bp-drawable bp-fill" x="310" y="100" width="90" height="70" pathLength={1} />
        </g>
        <g className="bp-l-openings" data-ink="6">
          {/* c4-C — the tower's shadow returns: vertical-fin hatching on
              each tier's shaded (western) edge + the setback ledges'
              dense shadow strips — the reference's near-solid shadowed
              tower mass, in our own setback geometry. */}
          {!entrance && (
            <>
              <rect className="bp-drawable bp-fins-fill" x="282" y="244" width="16" height="252" pathLength={1} />
              <rect className="bp-drawable bp-fins-fill" x="297" y="174" width="15" height="62" pathLength={1} />
              <rect className="bp-drawable bp-fins-fill" x="312" y="104" width="14" height="62" pathLength={1} />
              <rect className="bp-drawable bp-shade-fill" x="281" y="240" width="15" height="6" pathLength={1} />
              <rect className="bp-drawable bp-shade-fill" x="415" y="240" width="15" height="6" pathLength={1} />
              <rect className="bp-drawable bp-shade-fill" x="296" y="170" width="15" height="6" pathLength={1} />
              <rect className="bp-drawable bp-shade-fill" x="400" y="170" width="15" height="6" pathLength={1} />
            </>
          )}
          {/* tier 1 — two window rows */}
          {[300, 356, 412].map((x) => (
            <g key={x}>
              <Window x={x} y={280} w={22} h={40} />
              <Window x={x} y={396} w={22} h={56} />
            </g>
          ))}
          {/* tier 2 */}
          {[318, 356, 394].map((x) => (
            <Window key={x} x={x} y={186} w={20} h={34} />
          ))}
          {/* tier 3 */}
          {[332, 368].map((x) => (
            <Window key={x} x={x} y={118} w={20} h={30} />
          ))}
        </g>
        <g className="bp-l-detail" data-ink="7">
          {/* the rising line — the mastery progression through the tiers */}
          <polyline
            className="bp-drawable bp-ink bp-ink-2"
            points="292,486 322,428 318,364 352,304 348,240 380,182 376,122"
            pathLength={1}
          />
          {/* the pinnacle mast + THE mastery square (orange marker #2 —
              R315 A.1: the pin-square grammar, matching marker #1) */}
          <line className="bp-drawable bp-ink" x1="355" y1="100" x2="355" y2="64" pathLength={1} />
          <rect className="bp-drawable bp-signal-fill" x="357" y="64" width="18" height="18" pathLength={1} />
          {/* the tower's vertical dimension */}
          <line className="bp-drawable bp-hair" x1="262" y1="100" x2="262" y2="500" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="256" y1="100" x2="268" y2="100" pathLength={1} />
          <line className="bp-drawable bp-hair" x1="256" y1="500" x2="268" y2="500" pathLength={1} />
          {!entrance && <text className="bp-micro" x="254" y="304" textAnchor="end">44M</text>}
        </g>
      </g>

      {/* ═══ 07 · the detail layer — the two site trees ═══════════════ */}
      <g className="bp-l-detail" data-ink="7" aria-hidden="true">
        {/* the right tree — beside the auditorium (reading start).
            c4-C: the canopies carry the stipple texture (the granular
            ink mass the reference's trees read as). */}
        <g className="bp-hair">
          <path d="M1342,500 v-64" className="bp-drawable" pathLength={1} />
          <path d="M1342,446 c-10,-14 -22,-20 -34,-24" className="bp-drawable" pathLength={1} />
          <path d="M1342,440 c10,-16 22,-24 32,-30" className="bp-drawable" pathLength={1} />
          {!entrance && (
            <>
              <circle cx="1342" cy="394" r="30" className="bp-drawable bp-stipple-outline" pathLength={1} />
              <circle cx="1318" cy="412" r="22" className="bp-drawable bp-stipple-outline" pathLength={1} />
              <circle cx="1366" cy="410" r="24" className="bp-drawable bp-stipple-outline" pathLength={1} />
            </>
          )}
          <path d="M1330,380 l-8,-10 M1352,384 l10,-8 M1322,404 l-10,-6 M1360,400 l10,-8" className="bp-drawable" pathLength={1} />
        </g>
        {/* the left tree — beside the tower (reading end) */}
        <g className="bp-hair">
          <path d="M158,500 v-64" className="bp-drawable" pathLength={1} />
          <path d="M158,446 c-10,-14 -22,-20 -34,-24" className="bp-drawable" pathLength={1} />
          <path d="M158,440 c10,-16 22,-24 32,-30" className="bp-drawable" pathLength={1} />
          {!entrance && (
            <>
              <circle cx="158" cy="394" r="30" className="bp-drawable bp-stipple-outline" pathLength={1} />
              <circle cx="134" cy="412" r="22" className="bp-drawable bp-stipple-outline" pathLength={1} />
              <circle cx="182" cy="410" r="24" className="bp-drawable bp-stipple-outline" pathLength={1} />
            </>
          )}
          <path d="M146,380 l-8,-10 M168,384 l10,-8 M138,404 l-10,-6 M176,400 l10,-8" className="bp-drawable" pathLength={1} />
        </g>
      </g>

      {/* ═══ 08 · the dimension chain — the sheet's measure line ══════ */}
      {furniture && (
      <g className="bp-l-dims" data-ink="8" aria-hidden="true">
        <line className="bp-drawable bp-hair" x1="36" y1="568" x2="1404" y2="568" pathLength={1} />
        <line className="bp-drawable bp-hair" x1="36" y1="568" x2="46" y2="568" pathLength={1} />
        <line className="bp-drawable bp-hair" x1="1394" y1="568" x2="1404" y2="568" pathLength={1} />
        {/* extension lines + ticks at every grid column */}
        {[280, 430, 585, 740, 930, 1010, 1280].map((x) => (
          <g key={x}>
            <line className="bp-drawable bp-hair" x1={x} y1="516" x2={x} y2="574" pathLength={1} />
            <DimTick x={x} y={568} />
          </g>
        ))}
        {/* the segment measures (mono, LTR — sheet variant only) */}
        {!entrance && (
          <>
            <text className="bp-micro" x="158" y="560" textAnchor="middle">SITE</text>
            <text className="bp-micro" x="355" y="560" textAnchor="middle">15M</text>
            <text className="bp-micro" x="507" y="560" textAnchor="middle">31M</text>
            <text className="bp-micro" x="662" y="560" textAnchor="middle">19M</text>
            <text className="bp-micro" x="835" y="560" textAnchor="middle">8M</text>
            <text className="bp-micro" x="970" y="560" textAnchor="middle">27M</text>
            <text className="bp-micro" x="1145" y="560" textAnchor="middle">SITE</text>
          </>
        )}
      </g>
      )}

      {/* ═══ 09 · the journey — the dashed path, RTL ══════════════════ */}
      {furniture && (
      <g className="bp-l-journey" data-ink="9" aria-hidden="true">
        <line className="bp-drawable bp-dash bp-dash-2" x1="1240" y1="532" x2="306" y2="532" pathLength={1} />
        <polyline className="bp-drawable bp-ink" points="316,526 304,532 316,538" pathLength={1} />
        {/* station ticks from each volume's center down to the path */}
        {[1145, 970, 835, 585, 355].map((x) => (
          <line key={x} className="bp-drawable bp-hair" x1={x} y1="516" x2={x} y2="532" pathLength={1} />
        ))}
        <text className="bp-tag" x="773" y="524" textAnchor="middle">مسار التعلّم — من المحاضرة إلى الإتقان</text>
      </g>
      )}

      {/* ═══ 10 · the labels — each volume, named + indexed ═══════════ */}
      {furniture && (
      <g className="bp-l-labels" data-ink="10" aria-hidden="true">
        <text className="bp-name" x="1145" y="602" textAnchor="middle">المحاضرات</text>
        <text className="bp-micro" x="1204" y="601" textAnchor="middle">[01]</text>
        <text className="bp-name" x="970" y="602" textAnchor="middle">نقطة الفحص</text>
        <text className="bp-micro" x="1021" y="601" textAnchor="middle">[02]</text>
        <text className="bp-name" x="835" y="602" textAnchor="middle">الاختبار</text>
        <text className="bp-micro" x="880" y="601" textAnchor="middle">[03]</text>
        <text className="bp-name" x="585" y="602" textAnchor="middle">المكتبة والبحوث</text>
        <text className="bp-micro" x="652" y="601" textAnchor="middle">[04]</text>
        <text className="bp-name" x="355" y="602" textAnchor="middle">الإتقان</text>
        <text className="bp-micro" x="396" y="601" textAnchor="middle">[05]</text>
      </g>
      )}
    </>
  );
}

/*
 * ElevationDrawing — the standalone sheet: the artwork wrapped in its
 * own 1440×640 bp-svg frame (the SheetLoader seat; the full drawing
 * as a self-contained image).
 */
export function ElevationDrawing({
  active,
  variant = 'sheet',
}: {
  active: number;
  variant?: ElevationVariant;
}) {
  return (
    <svg
      className="bp-svg"
      viewBox={`0 0 ${ELEVATION_VB.w} ${ELEVATION_VB.h}`}
      role="img"
      aria-label="واجهة معمارية لمبنى التعلّم في مدارك: قاعة المحاضرات بمدخلها ودرجها، جسر نقطة الفحص بصاريته، جناح الاختبار بأعمدته وساعته، جناح المكتبة بنوافذه العالية، وبرج الإتقان المتدرّج — على خط أرض واحد مع شبكة إنشائية وسلسلة أبعاد ومسار تعلّم متقطّع يُقرأ من اليمين إلى اليسار"
      preserveAspectRatio="xMidYMid meet"
    >
      <ElevationArt active={active} variant={variant} />
    </svg>
  );
}
