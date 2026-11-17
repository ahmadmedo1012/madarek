/**
 * ConceptField — r362 (Agent 3) · the interactive triangulation net.
 *
 * The r360 plates drew the concept net as static decorative chrome.
 * The r362 brief asks the drawing to become the INTERFACE: a line
 * communicates a connection, a coordinate communicates position, an
 * accent marker communicates a meaningful gap. This is the LANDING
 * seat of that language — a survey net that CONSTRUCTS under scroll
 * and then answers the pointer:
 *
 *  · Scroll construction (the section driver writes --cf-p): grid →
 *    envelope → datum baseline → stations → triangulation legs →
 *    dimensions → the ONE signal (the unlinked concept) → annotation
 *    ink. Solid strokes draw through dashoffset (windowed by win()),
 *    dashed guides fade (their own dasharray forbids the draw
 *    technique). Every window is data — the stagger IS the narrative.
 *  · Pointer instrument (fine pointers): crosshair guides + a live
 *    mono coordinate readout in the drawing's own top margin — the
 *    drawing reports where you are inside it, imperatively, zero
 *    React renders per move.
 *  · Station activation (hover / focus / tap — the shared TiNode
 *    seat): the station's legs re-ink, a measurement chain draws from
 *    the datum bench mark to the station (the drawing's OWN geometry
 *    — honest distance in sheet units, never fabricated academic
 *    numbers), and the station's ring lifts. Stations are real
 *    buttons with Arabic names.
 *
 * Contract (the family law, inherited from r359/r360):
 *  · Layered SVG in draw order, every layer a named group (grid →
 *    construct → envelope → partition → fixture → dim → note → mark
 *    → instrument) so a surface can restyle or hide it.
 *  · Token-only ink: the tp-* grammar rides technical-sheet.css
 *    (imported read-only — this component adds ZERO ink of its own;
 *    technical-interactive.css owns only the interactive states).
 *  · pathLength={1} on every drawn stroke + class-driven states (the
 *    Chromium invalidation lesson, r310).
 *  · Deterministic geometry: the same viewBox on every mount.
 *  · Reduced motion: the driver never writes --cf-p and the belt in
 *    technical-interactive.css completes every layer — the drawing
 *    is fully readable with animations disabled, interactions live.
 */
import { useEffect, useRef, useState } from 'react';
import { DimChain } from '../technical/TechnicalSheet';
import { TiNode, win } from './drawKit';
import '../../../styles/technical-sheet.css';
import '../../../styles/technical-interactive.css';

const VB = { w: 800, h: 560 } as const;
const DATUM = { x: 160, y: 480 } as const;

type StationId = 'A' | 'B' | 'C1' | 'C2' | 'C3' | 'C4';

/* ── the stations: A/B are the survey's bench marks (static chrome),
 * C1–C4 the concepts the net triangulates (interactive seats). */
const STATIONS: Array<{
  id: StationId;
  x: number;
  y: number;
  ar: string;
  kind: 'mark' | 'hub' | 'node' | 'iso';
}> = [
  { id: 'A', x: 160, y: 480, ar: 'نقطة الأُسّ المرجعية', kind: 'mark' },
  { id: 'B', x: 640, y: 480, ar: 'نقطة الضبط الثانية', kind: 'mark' },
  { id: 'C1', x: 240, y: 300, ar: 'المفاهيم الأساسية', kind: 'hub' },
  { id: 'C2', x: 480, y: 340, ar: 'التطبيقات العملية', kind: 'hub' },
  { id: 'C3', x: 360, y: 180, ar: 'التحليل والقياس', kind: 'node' },
  { id: 'C4', x: 600, y: 220, ar: 'مفهوم معزول — فجوة الربط', kind: 'iso' },
];

const at = (id: StationId) => {
  const s = STATIONS.find((st) => st.id === id);
  return s ?? { id, x: 0, y: 0, ar: '', kind: 'node' as const };
};

/* ── the triangulation legs: the strong net closes A→C1→C3→C2→B with
 * the two braces; the weak dashed leg to C4 is the net's one open
 * traverse — the story the section's copy tells. */
const LEGS: Array<{ from: StationId; to: StationId; weak?: boolean }> = [
  { from: 'A', to: 'C1' },
  { from: 'C1', to: 'C3' },
  { from: 'C3', to: 'C2' },
  { from: 'C2', to: 'B' },
  { from: 'C1', to: 'C2' },
  { from: 'A', to: 'C2' },
  { from: 'C2', to: 'C4', weak: true },
];

const GRID_X = [120, 200, 280, 360, 440, 520, 600, 680];
const GRID_Y = [160, 240, 320, 400];

const clampNum = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

export function ConceptField({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const readoutRef = useRef<SVGTextElement>(null);
  /* the two activation channels (the r331 HeroInspect model): hover is
 * transient, tap persists — the effective highlight is tap ?? hover. */
  const [hover, setHover] = useState<StationId | null>(null);
  const [tap, setTap] = useState<StationId | null>(null);
  const active = tap ?? hover;
  const toggle = (id: StationId) => setTap((cur) => (cur === id ? null : id));

  /* ── the pointer instrument — fine pointers only, rAF-throttled,
   * imperative writes (the useSheetScroll contract at pointer scale).
   * The drawing is letterbox-free (block-size derives from the viewBox
   * ratio), so the unit map is a plain scale. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof window.matchMedia !== 'function') return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return undefined;
    }
    let raf = 0;
    const apply = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = svg.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const x = clampNum(((e.clientX - r.left) / r.width) * VB.w, 64, 736);
        const y = clampNum(((e.clientY - r.top) / r.height) * VB.h, 64, 536);
        svg.dataset.point = 'on';
        svg.style.setProperty('--ti-x', x.toFixed(1));
        svg.style.setProperty('--ti-y', y.toFixed(1));
        const ro = readoutRef.current;
        if (ro) {
          ro.textContent = `X ${String(Math.round(x)).padStart(3, '0')} · Y ${String(Math.round(y)).padStart(3, '0')}`;
        }
      });
    };
    const off = () => {
      svg.dataset.point = 'off';
      const ro = readoutRef.current;
      if (ro) ro.textContent = 'X 000 · Y 000';
    };
    svg.addEventListener('pointermove', apply, { passive: true });
    svg.addEventListener('pointerleave', off);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      svg.removeEventListener('pointermove', apply);
      svg.removeEventListener('pointerleave', off);
    };
  }, []);

  return (
    <div
      className={['cf-sheet cf-field', className].filter(Boolean).join(' ')}
      data-active={active ?? undefined}
    >
      <svg
        ref={svgRef}
        className="cf-svg"
        viewBox="0 0 800 560"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        role="group"
        aria-label="خريطة مفاهيم تفاعلية — شبكة قياس مثلثية"
      >
        {/* ── 01 · the measurement grid ─────────────────────────── */}
        <g className="tp-grid ti-fade" aria-hidden="true" style={win(0, 0.05)}>
          {GRID_X.map((x) => (
            <line key={`gx-${x}`} x1={x} y1={120} x2={x} y2={528} pathLength={1} />
          ))}
          {GRID_Y.map((y) => (
            <line key={`gy-${y}`} x1={104} y1={y} x2={736} y2={y} pathLength={1} />
          ))}
        </g>

        {/* ── 02 · construction guides (dashed → fade, never draw) ── */}
        <g className="tp-construct ti-fade" aria-hidden="true" style={win(0.06, 0.08)}>
          <circle cx="240" cy="300" r="64" strokeDasharray="2 6" pathLength={1} />
          <circle cx="480" cy="340" r="64" strokeDasharray="2 6" pathLength={1} />
          <line x1="360" y1="120" x2="360" y2="528" strokeDasharray="8 6" pathLength={1} />
          <line x1="104" y1="300" x2="736" y2="300" strokeDasharray="8 6" pathLength={1} />
        </g>

        {/* ── 03 · the envelope: the surveyed field boundary ──────── */}
        <g className="tp-line tp-envelope ti-draw" aria-hidden="true" style={win(0.02, 0.06)}>
          <path d="M120 148L460 104L692 168L744 324L628 512L188 520Z" pathLength={1} />
        </g>

        {/* ── 04 · the datum baseline (the net's measured control) ── */}
        <g className="tp-line tp-envelope ti-draw" aria-hidden="true" style={win(0.05, 0.05)}>
          <line x1={DATUM.x} y1={DATUM.y} x2="640" y2={DATUM.y} pathLength={1} />
        </g>

        {/* ── 05 · the triangulation legs ────────────────────────── */}
        <g className="tp-line tp-partition" aria-hidden="true">
          {LEGS.map((l, i) => {
            const p = at(l.from);
            const q = at(l.to);
            return l.weak ? (
              <g
                key={`leg-${l.from}${l.to}`}
                className="ti-fade"
                style={win(0.8, 0.06)}
              >
                <line
                  className="ti-leg"
                  data-nodes={`${l.from} ${l.to}`}
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  strokeDasharray="3 5"
                  pathLength={1}
                />
              </g>
            ) : (
              <g key={`leg-${l.from}${l.to}`} className="ti-draw" style={win(0.44 + i * 0.05, 0.05)}>
                <line
                  className="ti-leg"
                  data-nodes={`${l.from} ${l.to}`}
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  pathLength={1}
                />
              </g>
            );
          })}
        </g>

        {/* ── 06 · the bench-mark fixtures (A/B — static chrome) ─── */}
        <g className="tp-fixture ti-fade" aria-hidden="true" style={win(0.1, 0.06)}>
          {STATIONS.filter((s) => s.kind === 'mark').map((s) => (
            <g key={s.id}>
              <rect x={s.x - 6} y={s.y - 6} width="12" height="12" pathLength={1} />
              <line x1={s.x - 6} y1={s.y + 6} x2={s.x + 6} y2={s.y - 6} pathLength={1} />
            </g>
          ))}
        </g>

        {/* ── 07 · the interactive stations (the concept seats) ──── */}
        <g aria-hidden="false">
          {STATIONS.filter((s) => s.kind !== 'mark').map((s, i) => (
            <TiNode
              key={s.id}
              id={s.id}
              ar={s.ar}
              hovered={hover === s.id}
              pressed={tap === s.id}
              onHover={(id) => setHover(id as StationId | null)}
              onToggle={(id) => toggle(id as StationId)}
              onDismiss={() => setTap(null)}
            >
              <g className="tp-fixture ti-fade" style={win(0.16 + i * 0.05, 0.04)} aria-hidden="true">
                <circle className="ti-hit" cx={s.x} cy={s.y} r="28" />
                {s.kind === 'hub' ? (
                  <rect className="ti-station" x={s.x - 7} y={s.y - 7} width="14" height="14" pathLength={1} />
                ) : (
                  <circle className="ti-station" cx={s.x} cy={s.y} r={s.kind === 'iso' ? 6 : 5} pathLength={1} />
                )}
                <circle className="ti-ring" cx={s.x} cy={s.y} r="20" strokeDasharray="3 4" pathLength={1} />
              </g>
            </TiNode>
          ))}
        </g>

        {/* ── 08 · dimension chains (the shared DimChain primitive) ── */}
        <g className="ti-draw" aria-hidden="true" style={win(0.74, 0.08)}>
          <DimChain x1={160} y1={522} x2={640} y2={522} value="560" />
          <DimChain x1={88} y1={180} x2={88} y2={480} value="300" vertical />
        </g>

        {/* ── 09 · annotation ink ─────────────────────────────────── */}
        <g className="tp-note ti-fade" aria-hidden="true" style={win(0.02, 0.05)}>
          <text className="tp-text tp-text--strong" x="48" y="76">
            MADAREK · CONCEPT FIELD
          </text>
          <text className="tp-text" x="48" y="90">
            TRIANGULATION NET · 1 : 200
          </text>
        </g>
        <g className="tp-note ti-fade" aria-hidden="true" style={win(0.86, 0.12)}>
          <line x1="48" y1="98" x2="336" y2="98" pathLength={1} />
          <text className="tp-text" x="148" y="502" textAnchor="middle">A</text>
          <text className="tp-text" x="652" y="502" textAnchor="middle">B</text>
          <text className="tp-text" x="228" y="286" textAnchor="end">C1</text>
          <text className="tp-text" x="468" y="326" textAnchor="end">C2</text>
          <text className="tp-text" x="348" y="164" textAnchor="end">C3</text>
          <text className="tp-text" x="576" y="204" textAnchor="end">C4</text>
          <line x1="612" y1="208" x2="668" y2="164" pathLength={1} />
          <text className="tp-text" x="672" y="158" textAnchor="end">GAP-02</text>
        </g>

        {/* ── 10 · the ONE signal: the unlinked concept ──────────── */}
        <g className="tp-mark ti-fade" aria-hidden="true" style={win(0.86, 0.08)}>
          <circle cx="600" cy="220" r="3.5" />
          <path d="M588 220h24M600 208v24" />
          <circle cx="600" cy="220" r="16" strokeDasharray="3 4" pathLength={1} />
        </g>

        {/* ── 11 · the pointer instrument ────────────────────────── */}
        <g className="ti-guides" aria-hidden="true" pointer-events="none">
          <line className="ti-guide ti-guide--v" x1="0" y1="112" x2="0" y2="536" pathLength={1} />
          <line className="ti-guide ti-guide--h" x1="72" y1="0" x2="728" y2="0" pathLength={1} />
          <path className="ti-plus" d="M-5 0h10M0 -5v10" pathLength={1} />
        </g>
        <text
          ref={readoutRef}
          className="ti-readout tp-text"
          x="48"
          y="44"
          textAnchor="start"
          aria-hidden="true"
        >
          X 000 · Y 000
        </text>

        {/* ── 12 · the measurement chains (the activation's answer) ── */}
        {STATIONS.filter((s) => s.kind !== 'mark').map((s) => {
          const d = Math.round(Math.hypot(s.x - DATUM.x, s.y - DATUM.y));
          return (
            <g key={`m-${s.id}`} className="ti-meas" data-node={s.id} aria-hidden="true">
              <line
                x1={DATUM.x}
                y1={DATUM.y}
                x2={s.x}
                y2={s.y}
                strokeDasharray="4 4"
                pathLength={1}
              />
              <line x1={s.x} y1={s.y - 4} x2={s.x} y2={s.y + 4} pathLength={1} />
              <text
                className="tp-text"
                x={(DATUM.x + s.x) / 2}
                y={(DATUM.y + s.y) / 2 - 6}
                textAnchor="middle"
              >
                {`d ${d} u`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
