/**
 * RouteSurvey — r362 (Agent 3) · the gated learning route.
 *
 * The second instrument of the concepts band: the route a student
 * actually surveys — a bench mark at the start, four GATES (قراءة
 * موجّهة · نقطة فحص · تمرين مقيس · مشروع تطبيقي — the training
 * track's own honest stages), gradient ticks on every climb, a level
 * ladder at the field's edge, and the terminus mast the route ends
 * at (الإتقان). Distinct geometry from the r360 pathway plate (gates +
 * ladder + slope hatching, not a point route): same grammar, another
 * drawing — the family's law.
 *
 * Scroll construction (--cr-p, written by the section's driver): the
 * route draws SEGMENT BY SEGMENT as the band traverses, each gate
 * pops as the line passes it, the ticks and chains measure the
 * climb, the terminus + its ONE signal close the survey. Reduced
 * motion: the belt completes the sheet; gates stay live.
 *
 * Interaction — CONTROLLED two-channel (the r331 HeroInspect
 * model): the section owns {hover, tap} for the route (the stage
 * ledger rows drive the same channels — row hover lights the gate,
 * row tap pins it; the drawing's stations report through the same
 * callbacks). aria-pressed rides ONLY the tap channel; the effective
 * highlight is tap ?? hover. The 44px DOM rows are the honest primary
 * control on touch (the SVG station bodies are small); the drawing
 * answers the list, the list answers the drawing.
 */
import { DimChain } from '../technical/TechnicalSheet';
import { TiNode, win } from './drawKit';
import '../../../styles/technical-sheet.css';
import '../../../styles/technical-interactive.css';

export type RouteWayId = 'BM' | 'G1' | 'G2' | 'G3' | 'G4' | 'T';

/* ── the route: bench mark → four gates → the terminus mast. The y
 * climb is the measured rise the ladder and chains report. */
const WAY: Array<{ id: RouteWayId; x: number; y: number; ar: string }> = [
  { id: 'BM', x: 72, y: 252, ar: 'نقطة البداية' },
  { id: 'G1', x: 200, y: 208, ar: 'قراءة موجّهة' },
  { id: 'G2', x: 330, y: 180, ar: 'نقطة فحص' },
  { id: 'G3', x: 460, y: 152, ar: 'تمرين مقيس' },
  { id: 'G4', x: 590, y: 124, ar: 'مشروع تطبيقي' },
  { id: 'T', x: 708, y: 64, ar: 'الإتقان — محطة النهاية' },
];

/* the route segments, each tagged with its two way ids (the CSS
 * activation match reads the word list). Each segment DRAWS as the
 * scroll passes it — the path announces itself stage by stage, the
 * narrative a single polyline could not carry. */
const SEGMENTS = WAY.slice(0, -1).map((w, i) => {
  const q = WAY[i + 1] ?? w; /* slice pairs every w with its successor; the ?? only satisfies the index guard */
  return {
    from: w.id,
    to: q.id,
    a: w.x,
    b: w.y,
    c: q.x,
    d: q.y,
  };
});

/* gradient ticks: three per segment, perpendicular to the climb —
 * the surveyor's slope hatching, computed from the same geometry. */
const TICKS = SEGMENTS.flatMap((s) => {
  const dx = s.c - s.a;
  const dy = s.d - s.b;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 8;
  const ny = (dx / len) * 8;
  return [0.3, 0.55, 0.8].map((t) => {
    const x = s.a + dx * t;
    const y = s.b + dy * t;
    return [x - nx, y - ny, x + nx, y + ny];
  });
});

const LADDER_Y = [252, 205, 158, 111, 64];
const GRID_X = [136, 272, 408, 544, 680];
const GRID_Y = [96, 168];

interface RouteSurveyProps {
  className?: string;
  /** the effective highlight (tap ?? hover) — the section computes it. */
  active?: RouteWayId | null;
  /** whether the TAP channel currently holds each way (aria-pressed). */
  pressed?: RouteWayId | null;
  /** the hover channel report: an id enters, null leaves. */
  onHover?: (id: RouteWayId | null) => void;
  /** the tap channel toggle — click / Enter / Space. */
  onToggle?: (id: RouteWayId) => void;
  /** the tap channel dismissal — Escape. */
  onDismiss?: () => void;
}

export function RouteSurvey({
  className,
  active = null,
  pressed = null,
  onHover,
  onToggle,
  onDismiss,
}: RouteSurveyProps) {

  return (
    <div
      className={['cr-sheet cr-route', className].filter(Boolean).join(' ')}
      data-active={active ?? undefined}
    >
      <svg
        className="cf-svg"
        viewBox="0 0 800 300"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        role="group"
        aria-label="مسار التعلّم المبوّب — رسم تفاعلي"
      >
        {/* ── 01 · the route grid ────────────────────────────────── */}
        <g className="tp-grid ti-fade" aria-hidden="true" style={win(0, 0.05)}>
          {GRID_X.map((x) => (
            <line key={`gx-${x}`} x1={x} y1="56" x2={x} y2="252" pathLength={1} />
          ))}
          {GRID_Y.map((y) => (
            <line key={`gy-${y}`} x1="88" y1={y} x2="712" y2={y} pathLength={1} />
          ))}
        </g>

        {/* ── 02 · construction: the datum + the gate sight lines ── */}
        <g className="tp-construct ti-fade" aria-hidden="true" style={win(0.04, 0.07)}>
          <line x1="64" y1="252" x2="736" y2="252" strokeDasharray="8 6" pathLength={1} />
          {WAY.slice(1).map((w) => (
            <line
              key={`sight-${w.id}`}
              x1={w.x}
              y1={w.y + 6}
              x2={w.x}
              y2="252"
              strokeDasharray="3 5"
              pathLength={1}
            />
          ))}
        </g>

        {/* ── 03 · the level ladder (the climb's measured rungs) ─── */}
        <g className="tp-fixture ti-draw" aria-hidden="true" style={win(0.02, 0.08)}>
          <line x1="48" y1="252" x2="48" y2="64" pathLength={1} />
          {LADDER_Y.map((y) => (
            <line key={`rung-${y}`} x1="42" y1={y} x2="54" y2={y} pathLength={1} />
          ))}
        </g>

        {/* ── 04 · the datum baseline (solid, the survey's control) ── */}
        <g className="tp-line tp-envelope ti-draw" aria-hidden="true" style={win(0.02, 0.06)}>
          <line x1="72" y1="252" x2="736" y2="252" pathLength={1} />
        </g>

        {/* ── 05 · the route itself — segment by segment ─────────── */}
        <g className="tp-line tp-envelope" aria-hidden="true">
          {SEGMENTS.map((s, i) => (
            <g key={`seg-${s.from}${s.to}`} className="ti-draw" style={win(0.04 + i * 0.09, 0.09)}>
              <line
                className="ti-leg"
                data-nodes={`${s.from} ${s.to}`}
                x1={s.a}
                y1={s.b}
                x2={s.c}
                y2={s.d}
                pathLength={1}
              />
            </g>
          ))}
        </g>

        {/* ── 06 · the gradient ticks on every climb ───────────────── */}
        <g className="tp-line tp-partition ti-draw" aria-hidden="true" style={win(0.1, 0.42)}>
          {TICKS.map(([x1, y1, x2, y2], i) => (
            <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} />
          ))}
        </g>

        {/* ── 07 · the bench mark (static chrome) ─────────────────── */}
        <g className="tp-fixture ti-fade" aria-hidden="true" style={win(0.06, 0.05)}>
          <rect x="66" y="246" width="12" height="12" pathLength={1} />
          <line x1="66" y1="258" x2="78" y2="246" pathLength={1} />
        </g>

        {/* ── 08 · the gates + the terminus (interactive seats) ──── */}
        {WAY.slice(1).map((w, i) => (
          <TiNode
            key={w.id}
            id={w.id}
            ar={w.ar}
            hovered={active === w.id}
            pressed={pressed === w.id}
            onHover={(id) => onHover?.(id as RouteWayId | null)}
            onToggle={(id) => onToggle?.(id as RouteWayId)}
            onDismiss={() => onDismiss?.()}
          >
            <g
              className="tp-fixture ti-fade"
              style={win(w.id === 'T' ? 0.58 : 0.12 + i * 0.11, 0.07)}
              aria-hidden="true"
            >
              <circle className="ti-hit" cx={w.x} cy={w.y} r={w.id === 'T' ? 26 : 22} />
              {w.id === 'T' ? (
                <>
                  <line className="ti-station" x1={w.x} y1={w.y} x2={w.x} y2={w.y - 38} pathLength={1} />
                  <path className="ti-station" d={`M${w.x} ${w.y - 38}L${w.x + 22} ${w.y - 31}L${w.x} ${w.y - 24}`} pathLength={1} />
                  <circle className="ti-station" cx={w.x} cy={w.y} r="5" pathLength={1} />
                </>
              ) : (
                <g className="ti-gate">
                  <line x1={w.x - 10} y1={w.y - 9} x2={w.x - 10} y2={w.y + 9} pathLength={1} />
                  <line x1={w.x + 10} y1={w.y - 9} x2={w.x + 10} y2={w.y + 9} pathLength={1} />
                  <line x1={w.x - 10} y1={w.y - 9} x2={w.x + 10} y2={w.y - 9} pathLength={1} />
                </g>
              )}
              <circle className="ti-ring" cx={w.x} cy={w.y} r="18" strokeDasharray="3 4" pathLength={1} />
            </g>
          </TiNode>
        ))}

        {/* ── 09 · dimension chains: the chord + the rise ─────────── */}
        <g className="ti-draw" aria-hidden="true" style={win(0.58, 0.1)}>
          <DimChain x1={72} y1={282} x2={708} y2={282} value="636" />
          <DimChain x1={760} y1={64} x2={760} y2={252} value="188" vertical />
        </g>

        {/* ── 10 · annotation ink ──────────────────────────────────── */}
        <g className="tp-note ti-fade" aria-hidden="true" style={win(0.02, 0.05)}>
          <text className="tp-text tp-text--strong" x="48" y="28">
            MADAREK · ROUTE SURVEY
          </text>
          <text className="tp-text" x="48" y="42">
            GATED ROUTE · RISE 188 U
          </text>
          <line x1="48" y1="50" x2="288" y2="50" pathLength={1} />
        </g>
        <g className="tp-note ti-fade" aria-hidden="true" style={win(0.76, 0.16)}>
          <text className="tp-text" x="66" y="242" textAnchor="end">BM</text>
          <text className="tp-text" x="200" y="190" textAnchor="middle">G1</text>
          <text className="tp-text" x="330" y="162" textAnchor="middle">G2</text>
          <text className="tp-text" x="460" y="134" textAnchor="middle">G3</text>
          <text className="tp-text" x="590" y="106" textAnchor="middle">G4</text>
          <text className="tp-text" x="696" y="58" textAnchor="end">T</text>
          <text className="tp-text" x="42" y="60" textAnchor="end">L4</text>
          <text className="tp-text" x="42" y="248" textAnchor="end">L0</text>
        </g>

        {/* ── 11 · the ONE signal: the terminus the route ends at ──── */}
        <g className="tp-mark ti-fade" aria-hidden="true" style={win(0.7, 0.1)}>
          <circle cx="708" cy="64" r="3.5" />
          <circle cx="708" cy="64" r="14" strokeDasharray="3 4" pathLength={1} />
          <line x1="708" y1="46" x2="708" y2="22" pathLength={1} />
        </g>
      </svg>
    </div>
  );
}
