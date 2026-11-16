/**
 * TechnicalSheet — the app-side drafting plate (r359 · Heron language).
 *
 * The landing owns the large measured drawings (JourneyScene, WhyScene,
 * ElevationDrawing). The authenticated + guest surfaces had no equivalent:
 * a drawing that is *structure*, not decoration — a plan cut open by
 * construction lines, dimension chains, coordinate annotations and one
 * signal marker.
 *
 * Contract:
 *  · Pure SVG, layered in draw order (grid → construction → envelope →
 *    partitions → fixtures → dimensions → annotations → markers → title
 *    block). Every layer is a named group so a surface can restyle or
 *    hide it without touching the geometry.
 *  · Token-only ink: currentColor (the plate's quiet ink), --grid-line
 *    for construction, --app-signal for the ONE orange marker. No raw
 *    colors, no shadows, no gradients, radius 0 — the sheet grammar.
 *  · Deterministic geometry: the same viewBox on every mount, so
 *    screenshots and conformance captures stay stable.
 *  · Motion is a single stroke-draw (one pass, ease-out) gated by
 *    prefers-reduced-motion; the static frame is the finished drawing.
 *  · Decorative by default (aria-hidden, focusable=false). Pass `label`
 *    to promote it to a described role="img" illustration.
 */
import { useId } from 'react';
import '../../../styles/technical-sheet.css';

export type TechnicalSheetVariant = 'plan' | 'elevation';

export interface TechnicalSheetProps {
  /** `plan` = the learning floor's top view; `elevation` = the section. */
  variant?: TechnicalSheetVariant;
  /** Arabic description — omit for decorative chrome (aria-hidden). */
  label?: string;
  className?: string;
}

const GRID_X = Array.from({ length: 9 }, (_, i) => 40 + i * 40);
const GRID_Y = Array.from({ length: 13 }, (_, i) => 40 + i * 40);

/** A dimension chain: extension ticks + one mono numeral. */
function DimChain({
  x1,
  y1,
  x2,
  y2,
  value,
  vertical = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  value: string;
  vertical?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g className="tp-dim tp-line">
      <line x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} />
      <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} pathLength={1} />
      <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} pathLength={1} />
      <text
        className="tp-text tp-text--dim"
        x={vertical ? x1 - 6 : mx}
        y={vertical ? my : y1 - 6}
        textAnchor={vertical ? 'end' : 'middle'}
       
      >
        {value}
      </text>
    </g>
  );
}

export function TechnicalSheet({
  variant = 'plan',
  label,
  className,
}: TechnicalSheetProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `tp-title-${uid}`;
  const descId = `tp-desc-${uid}`;
  const classes = ['technical-sheet', `technical-sheet--${variant}`];
  if (className) classes.push(className);

  const a11y = label
    ? { role: 'img' as const, 'aria-labelledby': `${titleId} ${descId}` }
    : { 'aria-hidden': true as const, focusable: 'false' as const };

  return (
    <div className={classes.join(' ')} {...a11y}>
      <svg viewBox="0 0 400 560" preserveAspectRatio="xMidYMid meet" focusable="false">
        {label && (
          <>
            <title id={titleId}>لوحة رسم هندسية</title>
            <desc id={descId}>{label}</desc>
          </>
        )}

        {/* ── 00 · sheet frame + registration crosses ─────────────── */}
        <g className="tp-frame" aria-hidden>
          <rect x="8" y="8" width="384" height="544" />
          <path d="M8 20v-12h12M392 20v-12h-12M8 540v12h12M392 540v12h-12" />
        </g>

        {/* ── 01 · background grid ────────────────────────────────── */}
        <g className="tp-grid" aria-hidden>
          {GRID_X.map((x) => (
            <line key={`gx-${x}`} x1={x} y1="24" x2={x} y2="472" pathLength={1} />
          ))}
          {GRID_Y.map((y) => (
            <line key={`gy-${y}`} x1="24" y1={y} x2="376" y2={y} pathLength={1} />
          ))}
        </g>

        {/* ── 02 · construction guides ─────────────────────────────── */}
        <g className="tp-construct" aria-hidden>
          <line x1="24" y1="24" x2="376" y2="472" strokeDasharray="3 5" pathLength={1} />
          <line x1="376" y1="24" x2="24" y2="472" strokeDasharray="3 5" pathLength={1} />
          <circle cx="200" cy="248" r="132" strokeDasharray="2 6" pathLength={1} />
          <circle cx="200" cy="248" r="72" strokeDasharray="2 6" pathLength={1} />
          <path d="M200 24v448" strokeDasharray="8 6" pathLength={1} />
          <path d="M24 248h352" strokeDasharray="8 6" pathLength={1} />
        </g>

        {variant === 'plan' ? <PlanGeometry /> : <ElevationGeometry />}

        {/* ── 07 · annotations + coordinates ──────────────────────── */}
        <g className="tp-note" aria-hidden>
          <text className="tp-text tp-text--strong" x="32" y="52">
            MADAREK · LEARNING FLOOR
          </text>
          <text className="tp-text" x="32" y="66">
            {variant === 'plan' ? 'PLAN 01 · 1:100' : 'SECTION A–A · 1:100'}
          </text>
          <line x1="32" y1="74" x2="368" y2="74" pathLength={1} />
          {/* north marker */}
          <g className="tp-north">
            <circle cx="344" cy="46" r="11" />
            <path d="M344 38v16M338 46h12" />
            <path d="M344 38l-4 7h8z" />
          </g>
          <text className="tp-text" x="344" y="72" textAnchor="middle">
            N
          </text>
        </g>

        {/* ── 08 · title block ────────────────────────────────────── */}
        <g className="tp-title" aria-hidden>
          <line x1="24" y1="488" x2="376" y2="488" pathLength={1} />
          <line x1="196" y1="488" x2="196" y2="536" pathLength={1} />
          <line x1="300" y1="488" x2="300" y2="536" pathLength={1} />
          <text className="tp-text tp-text--strong" x="32" y="508">
            MADAREK
          </text>
          <text className="tp-text" x="32" y="524">
            SMART LEARNING
          </text>
          <text className="tp-text" x="204" y="508">
            A-101
          </text>
          <text className="tp-text" x="204" y="524">
            01 / 04
          </text>
          <text className="tp-text" x="308" y="508">
            {variant === 'plan' ? 'PLAN' : 'CUT A–A'}
          </text>
          <text className="tp-text" x="308" y="524">
            1 : 100
          </text>
        </g>
      </svg>
    </div>
  );
}

/** The top view: envelope, partitions, corridor, stairs, doors, markers. */
function PlanGeometry() {
  return (
    <>
      {/* 03 · envelope */}
      <g className="tp-line tp-envelope">
        <rect x="84" y="116" width="232" height="268" pathLength={1} />
        <rect x="96" y="128" width="208" height="244" pathLength={1} />
      </g>

      {/* 04 · partitions */}
      <g className="tp-line tp-partition">
        <line x1="96" y1="240" x2="304" y2="240" pathLength={1} />
        <line x1="96" y1="276" x2="304" y2="276" pathLength={1} />
        <line x1="196" y1="128" x2="196" y2="240" pathLength={1} />
        <line x1="176" y1="276" x2="176" y2="372" pathLength={1} />
        <line x1="244" y1="276" x2="244" y2="372" pathLength={1} />
        {/* door openings: the wall line breaks, the leaf + swing arc draw */}
        <path d="M196 196a20 20 0 0 1 20 20" pathLength={1} />
        <line x1="196" y1="216" x2="196" y2="196" pathLength={1} />
        <path d="M176 332a22 22 0 0 0-22 22" pathLength={1} />
        <line x1="176" y1="332" x2="154" y2="332" pathLength={1} />
      </g>

      {/* 05 · fixtures — the rake, the seminar rows, the reader desks */}
      <g className="tp-fixture" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <line
            key={`stair-${i}`}
            x1="104"
            y1={292 + i * 12}
            x2="168"
            y2={292 + i * 12}
            pathLength={1}
          />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <rect
            key={`desk-${i}`}
            x={208 + (i % 2) * 44}
            y={292 + Math.floor(i / 2) * 38}
            width="34"
            height="14"
            pathLength={1}
          />
        ))}
        <rect x="104" y="144" width="76" height="30" pathLength={1} />
        <rect x="104" y="184" width="76" height="30" pathLength={1} />
        <rect x="208" y="144" width="80" height="30" pathLength={1} />
        <rect x="208" y="184" width="80" height="30" pathLength={1} />
      </g>

      {/* 06 · dimension chains */}
      <DimChain x1={84} y1={96} x2={316} y2={96} value="240" />
      <DimChain x1={64} y1={116} x2={64} y2={384} value="260" vertical />
      <DimChain x1={320} y1={276} x2={320} y2={240} value="40" vertical />

      {/* 09 · markers — the ONE signal */}
      <g className="tp-mark" aria-hidden>
        <circle cx="196" cy="240" r="3.5" />
        <circle cx="196" cy="276" r="3.5" />
        <path d="M312 360h16M320 352v16" />
      </g>

      {/* section cut A–A */}
      <g className="tp-cut" aria-hidden>
        <line x1="84" y1="258" x2="316" y2="258" strokeDasharray="14 4 2 4" pathLength={1} />
        <path d="M84 252v12M316 252v12" pathLength={1} />
        <text className="tp-text" x="80" y="246" textAnchor="end">
          A
        </text>
        <text className="tp-text" x="320" y="246">
          A
        </text>
      </g>
    </>
  );
}

/** The section: three floors, columns, the raked hall, earth hatching. */
function ElevationGeometry() {
  return (
    <>
      {/* the ground line + three slabs */}
      <g className="tp-line tp-envelope">
        <line x1="64" y1="392" x2="336" y2="392" pathLength={1} />
        <line x1="64" y1="304" x2="336" y2="304" pathLength={1} />
        <line x1="64" y1="216" x2="336" y2="216" pathLength={1} />
        <line x1="64" y1="128" x2="336" y2="128" pathLength={1} />
        <line x1="64" y1="128" x2="64" y2="392" pathLength={1} />
        <line x1="336" y1="128" x2="336" y2="392" pathLength={1} />
      </g>

      {/* columns */}
      <g className="tp-line tp-partition">
        {[104, 160, 216, 272, 320].map((x) => (
          <line key={`col-${x}`} x1={x} y1="128" x2={x} y2="392" pathLength={1} />
        ))}
        {[128, 216, 304].map((y) => (
          <line key={`cap-${y}`} x1="56" y1={y} x2="82" y2={y} pathLength={1} />
        ))}
      </g>

      {/* the raked hall + the seminar rows */}
      <g className="tp-fixture" aria-hidden>
        <path d="M120 216l64-64h44l-64 64z" pathLength={1} />
        {[0, 1, 2, 3].map((i) => (
          <line
            key={`row-${i}`}
            x1={128 + i * 10}
            y1={212 - i * 10}
            x2={184 + i * 10}
            y2={212 - i * 10}
            pathLength={1}
          />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={`desk-e-${i}`}
            x={212 + i * 24}
            y={326 - (i % 2) * 6}
            width="18"
            height="8"
            pathLength={1}
          />
        ))}
      </g>

      {/* earth stipple under the ground line */}
      <g className="tp-stipple" aria-hidden>
        {Array.from({ length: 60 }, (_, i) => (
          <circle
            key={`dot-${i}`}
            cx={68 + (i % 20) * 14}
            cy={404 + Math.floor(i / 20) * 10}
            r="0.9"
          />
        ))}
      </g>

      <DimChain x1={44} y1={128} x2={44} y2={392} value="+12.00" vertical />
      <DimChain x1={64} y1={108} x2={336} y2={108} value="272" />
      <DimChain x1={336} y1={216} x2={336} y2={304} value="3.60" vertical />

      <g className="tp-mark" aria-hidden>
        <circle cx="120" cy="216" r="3.5" />
        <circle cx="272" cy="304" r="3.5" />
      </g>

      <g className="tp-cut" aria-hidden>
        <line x1="40" y1="392" x2="360" y2="392" strokeDasharray="14 4 2 4" pathLength={1} />
        <text className="tp-text" x="36" y="420">
          ±0.00
        </text>
      </g>
    </>
  );
}
