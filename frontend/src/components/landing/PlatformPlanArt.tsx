/**
 * PlatformPlanArt — R315 cycle-4 (c4-B): the platform band's tool canvas.
 *
 * The reference's platform section (re-verdicted VLM evidence, the s04
 * frames) is a DRAWING-TOOL interface: a multi-panel CAD sheet whose
 * central canvas is an architectural PLAN VIEW — thick ink walls,
 * hatched poché, door swings, ONE large solid var(--accent) highlighted
 * room, furniture as thin guide-line work, dimension chains with mono
 * numerals along the top + side, all under viewport chrome. Madarek's
 * translation keeps the honest product story (the two real-UI captures
 * stay the band's subjects) and seats the reference's drafting
 * language on the sheet paper around them: this drawing is the canvas
 * panel those viewports ride on.
 *
 * The plan is an education floor — the interactive lecture hall (the
 * highlighted room: the real lecture-player checkpoint feature), the
 * library wing, the computer lab, the reception — drawn in the
 * established bp-* drafting system (the hero elevation's own classes:
 * bp-ink/-2, bp-micro) so it follows both themes and every gate.
 * Decorative by contract: the whole canvas layer is aria-hidden +
 * pointer-transparent (the honest surfaces stay the ProductFrames,
 * their captions and the section copy).
 *
 * R318 §A5 (c3-plat): the drawing seats ON PAPER — the reference's
 * own grammar (heron-platform.json: "drawings sit ON paper … ink
 * strokes + ONE solid accent room, hairline cells"). The R315 code
 * drew the exterior-wall band rect with the bare .bp-ink-2 class —
 * a stroke-weight-only class with no fill, so the 596×464 rect fell
 * to the SVG DEFAULT FILL and the whole plan read as a SOLID-BLACK
 * slab (~31% of the sheet's pixels at 1440). The rect now carries
 * .bp-ink (fill: none) — paper shows through the wall band and only
 * the true ink masses render: the hatched poché, the solid corridor
 * bands, the furniture guide work, the dimension chains, and the ONE
 * solid var(--accent) room.
 *
 * Geometry: viewBox 640×520 ≈ the drawing cell's own aspect. The
 * walls are SOLID INK MASSES + 45° hatched poché (the map band's
 * measured rendering-weight grammar — r314 §4.2), the partitions
 * 8 units, the furniture 1.5-unit guide work. Room codes ride the
 * mono micro voice (Latin, LTR — the drafting convention); the ONE
 * Arabic annotation (the accent room's honest feature note) is HTML
 * in the drawing cell (PlatformCanvas), where the 13px Arabic floor
 * binds.
 */

/* The window symbol — the wall poché opens for glazing and the
 * triple-line drafting symbol redraws frame + centered pane. */
function Glazing({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect className="prc-paper-gap" x={x} y={y} width={w} height={12} />
      <line className="bp-ink" x1={x} y1={y + 1.5} x2={x + w} y2={y + 1.5} />
      <line className="bp-ink" x1={x} y1={y + 6} x2={x + w} y2={y + 6} />
      <line className="bp-ink" x1={x} y1={y + 10.5} x2={x + w} y2={y + 10.5} />
    </g>
  );
}

/* A 45° dimension tick — the architectural chain mark. */
function DimTick({ x, y }: { x: number; y: number }) {
  return <line className="prc-dim" x1={x - 3.5} y1={y + 3.5} x2={x + 3.5} y2={y - 3.5} />;
}

/* A door swing: the leaf + the quarter arc (hinge corner, opening
 * width w; dir selects the sweep side, up for the upper rooms). */
function Door({
  hx,
  y,
  w,
  up,
}: {
  hx: number;
  y: number;
  w: number;
  up?: boolean;
}) {
  const r = Math.abs(w);
  const sy = up ? -1 : 1;
  const d = up
    ? `M ${hx} ${y} A ${r} ${r} 0 0 0 ${hx + w} ${y}`
    : `M ${hx} ${y} A ${r} ${r} 0 0 1 ${hx + w} ${y}`;
  return (
    <g>
      <line className="bp-ink prc-door" x1={hx} y1={y} x2={hx} y2={y + sy * r} />
      <path className="bp-ink prc-door" d={d} />
    </g>
  );
}

export function PlatformPlanArt() {
  const labDesks = [300, 356, 412].flatMap((y) =>
    [64, 128, 192, 256].map((x) => ({ x, y, key: `${x}-${y}` })),
  );
  return (
    <svg
      className="prc-svg"
      viewBox="0 0 640 520"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <defs>
        {/* the exterior wall's 45° poché — ink hatch on paper (the
            map band's measured grammar: thin ink at 55%) */}
        <pattern
          id="prc-poch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line className="prc-poch-line" x1="0" y1="0" x2="0" y2="7" />
        </pattern>
      </defs>

      {/* ── the dimension chains (top + side, the CAD frame) ─────────── */}
      <line className="prc-dim" x1="44" y1="8" x2="604" y2="8" />
      <line className="prc-dim" x1="44" y1="24" x2="604" y2="24" />
      <DimTick x={44} y={24} />
      <DimTick x={336} y={24} />
      <DimTick x={604} y={24} />
      <line className="prc-dim" x1="44" y1="4" x2="44" y2="28" />
      <line className="prc-dim" x1="336" y1="18" x2="336" y2="44" />
      <line className="prc-dim" x1="604" y1="4" x2="604" y2="28" />
      {/* R320 §A4: «7200» re-centred on ITS segment (44..336 → x=190;
          it sat at x=322 directly under «14900» at x=324 — the two
          boxes overlapped 17.6px², the gate's one text×text defect
          outside the plan) */}
      <text className="bp-micro" x="190" y="19" textAnchor="middle">7200</text>
      <text className="bp-micro" x="472" y="19" textAnchor="middle">7700</text>
      <text className="bp-micro" x="324" y="5" textAnchor="middle">14900</text>

      {/* the side chain — numbers rotated into the drafting voice */}
      <line className="prc-dim" x1="8" y1="44" x2="8" y2="484" />
      <line className="prc-dim" x1="24" y1="44" x2="24" y2="484" />
      <DimTick x={24} y={44} />
      <DimTick x={24} y={254} />
      <DimTick x={24} y={484} />
      <line className="prc-dim" x1="4" y1="44" x2="28" y2="44" />
      <line className="prc-dim" x1="4" y1="484" x2="28" y2="484" />
      <text
        className="bp-micro"
        x="13"
        y="150"
        textAnchor="middle"
        transform="rotate(-90 13 150)"
      >
        6600
      </text>
      <text
        className="bp-micro"
        x="13"
        y="370"
        textAnchor="middle"
        transform="rotate(-90 13 370)"
      >
        5700
      </text>

      {/* ── the exterior wall band (hatched poché) + the inner face ─── */}
      <rect className="prc-poch" x="32" y="32" width="584" height="12" />
      <rect className="prc-poch" x="32" y="484" width="498" height="12" />
      <rect className="prc-poch" x="562" y="484" width="54" height="12" />
      <rect className="prc-poch" x="32" y="44" width="12" height="440" />
      <rect className="prc-poch" x="604" y="44" width="12" height="440" />
      {/* the exterior wall band's outer face — R318 §A5: .bp-ink-2 is a
          stroke-weight-only class; without .bp-ink the 596×464 rect
          fell to the SVG default fill and rendered the whole plan as
          one solid-black slab. fill:none + the 2px primary stroke. */}
      <rect className="bp-ink bp-ink-2" x="32" y="32" width="596" height="464" />
      <rect className="bp-ink" x="44" y="44" width="572" height="440" />

      {/* the glazing runs open the poché on the north wall */}
      <Glazing x={96} y={32} w={84} />
      <Glazing x={252} y={32} w={84} />
      <Glazing x={468} y={32} w={84} />

      {/* ── the corridor spine (solid bands, openings at the doors) ── */}
      {/* top band: openings at the library [204,236] + lecture [454,488] */}
      <rect className="prc-wall" x="44" y="202" width="160" height="8" />
      <rect className="prc-wall" x="236" y="202" width="218" height="8" />
      <rect className="prc-wall" x="488" y="202" width="128" height="8" />
      {/* bottom band: openings at the lab [212,244] + reception [500,534] */}
      <rect className="prc-wall" x="44" y="254" width="168" height="8" />
      <rect className="prc-wall" x="244" y="254" width="256" height="8" />
      <rect className="prc-wall" x="534" y="254" width="82" height="8" />
      {/* the vertical partitions between the wings' rooms */}
      <rect className="prc-wall" x="332" y="44" width="8" height="158" />
      <rect className="prc-wall" x="332" y="262" width="8" height="222" />

      {/* ── the rooms ────────────────────────────────────────────────── */}
      {/* the highlighted lecture hall — the ONE solid accent room
          (the reference's red meeting room, mirrored RTL: the
          inline-start upper hall). Furniture redraws in paper ink. */}
      <rect className="prc-room-acc" x="340" y="44" width="264" height="158" />
      {/* the stage */}
      <rect className="prc-furn-acc" x="492" y="58" width="84" height="18" />
      {/* the raked seating rows */}
      <line className="prc-furn-acc" x1="360" y1="118" x2="472" y2="118" />
      <line className="prc-furn-acc" x1="360" y1="140" x2="472" y2="140" />
      <line className="prc-furn-acc" x1="360" y1="162" x2="472" y2="162" />
      <line className="prc-furn-acc" x1="360" y1="184" x2="472" y2="184" />
      <text className="bp-micro prc-code-acc" x="592" y="56" textAnchor="end">
        A-101
      </text>

      {/* the library wing — shelf runs + reading tables */}
      <line className="prc-furn" x1="60" y1="72" x2="316" y2="72" />
      <line className="prc-furn" x1="60" y1="96" x2="316" y2="96" />
      <line className="prc-furn" x1="60" y1="120" x2="316" y2="120" />
      <rect className="prc-furn" x="84" y="150" width="52" height="26" />
      <rect className="prc-furn" x="212" y="150" width="52" height="26" />
      <text className="bp-micro" x="316" y="62" textAnchor="end">LIB</text>

      {/* the computer lab — the desk grid */}
      {labDesks.map((d) => (
        <rect className="prc-furn" key={d.key} x={d.x} y={d.y} width="18" height="11" />
      ))}
      <text className="bp-micro" x="316" y="282" textAnchor="end">A-102</text>

      {/* the reception — the desk arc + waiting benches + entry door */}
      <path className="prc-furn" d="M 420 322 A 74 74 0 0 1 568 322" />
      <rect className="prc-furn" x="380" y="430" width="84" height="12" />
      <rect className="prc-furn" x="500" y="430" width="84" height="12" />
      <text className="bp-micro" x="584" y="282" textAnchor="end">A-100</text>

      {/* ── the door swings (openings + quarter arcs) ────────────────── */}
      {/* the lecture hall opens onto the corridor */}
      <Door hx={488} y={202} w={-34} up />
      {/* the library wing */}
      <Door hx={204} y={202} w={32} up />
      {/* the lab */}
      <Door hx={212} y={262} w={32} />
      {/* the reception */}
      <Door hx={500} y={262} w={34} />
      {/* the entry vestibule (south wall opening [530,562]) */}
      <Door hx={562} y={484} w={-32} up />
    </svg>
  );
}
