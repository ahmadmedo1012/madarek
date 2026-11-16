/**
 * TechnicalPlate — the working drawings (r360 · Heron language).
 *
 * The r359 TechnicalSheet drew the LEARNING FLOOR (a plan + a section —
 * the platform as a building). The authenticated surfaces kept asking
 * the family for drawings that are *instruments*: a concept network the
 * assistant reads, a mastery ladder the semester climbs, a route the
 * training track surveys, a sheet the document viewer measures. Four
 * plates, one grammar — each draws the WORK its page performs, never a
 * building pasted onto an education screen.
 *
 * Contract (inherited verbatim from the r359 sheet — the family law):
 *  · Pure SVG, layered in draw order (frame → grid → construction →
 *    envelope → partitions → fixtures → dimensions → annotations →
 *    markers → title block). Every layer is a named tp-* group so a
 *    surface can restyle or hide it without touching the geometry.
 *  · Token-only ink: currentColor, --grid-line, --app-signal. No raw
 *    colors, no shadows, no gradients, radius 0.
 *  · The root carries BOTH `technical-sheet` (the r359 grammar: ink
 *    ladder + stroke-draw cascade + reduced-motion frame) and
 *    `technical-plate` (this family's marker) — the plates add ZERO
 *    ink CSS of their own; styles/technical-plates.css owns only the
 *    SEATS (where a plate may stand on a surface).
 *  · Deterministic geometry: the same viewBox on every mount.
 *  · Decorative by default (aria-hidden, focusable=false); pass
 *    `label` to promote the plate to a described role="img".
 */
import { useId } from 'react';
import { DimChain } from './TechnicalSheet';
import '../../../styles/technical-sheet.css';
import '../../../styles/technical-plates.css';

export type TechnicalPlateVariant = 'knowledge' | 'progress' | 'pathway' | 'document';

export interface TechnicalPlateProps {
  /** `knowledge` = the concept net · `progress` = the mastery levels ·
   *  `pathway` = the learning route · `document` = the analysed sheet. */
  variant?: TechnicalPlateVariant;
  /** Arabic description — omit for decorative chrome (aria-hidden). */
  label?: string;
  className?: string;
}

const GRID_X = Array.from({ length: 9 }, (_, i) => 40 + i * 40);
const GRID_Y = Array.from({ length: 13 }, (_, i) => 40 + i * 40);

/* The per-variant title block + header note (drawing-internal text is
 * Latin mono — the technical register; the plate never carries Arabic
 * content, it is chrome). */
const PLATE_META: Record<
  TechnicalPlateVariant,
  { header: string; sub: string; code: string; name: string; scale: string }
> = {
  knowledge: {
    header: 'MADAREK · CONCEPT FIELD',
    sub: 'KNOWLEDGE MAP · NET 01',
    code: 'K-102',
    name: 'CONCEPT NET',
    scale: '1 : 200',
  },
  progress: {
    header: 'MADAREK · SEMESTER',
    sub: 'MASTERY SECTION · LEVELS',
    code: 'P-103',
    name: 'LEVELS L1–L5',
    scale: '1 : 50',
  },
  pathway: {
    header: 'MADAREK · TRACK',
    sub: 'ROUTE SURVEY · W1–W5',
    code: 'R-104',
    name: 'ROUTE',
    scale: '1 : 5000',
  },
  document: {
    header: 'MADAREK · READER',
    sub: 'DOC ANALYSIS · SHEET A4',
    code: 'D-105',
    name: 'DOC SHEET',
    scale: '1 : 1',
  },
};

export function TechnicalPlate({
  variant = 'knowledge',
  label,
  className,
}: TechnicalPlateProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `tp-title-${uid}`;
  const descId = `tp-desc-${uid}`;
  const meta = PLATE_META[variant];

  const classes = [
    'technical-sheet',
    'technical-plate',
    `technical-plate--${variant}`,
  ];
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

        {variant === 'knowledge' && <KnowledgeGeometry />}
        {variant === 'progress' && <ProgressGeometry />}
        {variant === 'pathway' && <PathwayGeometry />}
        {variant === 'document' && <DocumentGeometry />}

        {/* ── 07 · annotations + coordinates ──────────────────────── */}
        <g className="tp-note" aria-hidden>
          <text className="tp-text tp-text--strong" x="32" y="52">
            {meta.header}
          </text>
          <text className="tp-text" x="32" y="66">
            {meta.sub}
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
            {meta.code}
          </text>
          <text className="tp-text" x="204" y="524">
            01 / 04
          </text>
          <text className="tp-text" x="308" y="508">
            {meta.name}
          </text>
          <text className="tp-text" x="308" y="524">
            {meta.scale}
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   KNOWLEDGE — the concept net the assistant reads.
   Three measured clusters, linked nodes, one isolate in signal ink:
   the unlinked concept IS the gap the surface talks about.
   ═══════════════════════════════════════════════════════════════════ */
function KnowledgeGeometry() {
  /* nodes: squares open the two hub concepts, circles the members */
  const edges: Array<[number, number, number, number]> = [
    [128, 196, 166, 182],
    [128, 196, 140, 232],
    [166, 182, 176, 224],
    [140, 232, 176, 224],
    [176, 224, 252, 282],
    [252, 282, 284, 296],
    [252, 282, 262, 322],
    [284, 296, 262, 322],
    [262, 322, 148, 380],
    [148, 380, 178, 398],
    [176, 224, 148, 380],
    [178, 398, 252, 282],
  ];
  return (
    <>
      {/* 02 · construction: the three cluster circles + centre axes */}
      <g className="tp-construct" aria-hidden>
        <circle cx="152" cy="212" r="76" strokeDasharray="2 6" pathLength={1} />
        <circle cx="266" cy="306" r="60" strokeDasharray="2 6" pathLength={1} />
        <circle cx="162" cy="394" r="52" strokeDasharray="2 6" pathLength={1} />
        <path d="M152 212L266 306L162 394Z" strokeDasharray="3 5" pathLength={1} />
        <path d="M24 300h352" strokeDasharray="8 6" pathLength={1} />
        <path d="M209 88v384" strokeDasharray="8 6" pathLength={1} />
      </g>

      {/* 03 · envelope: the surveyed hull of the field */}
      <g className="tp-line tp-envelope">
        <path
          d="M96 180L216 148L330 264L318 352L226 444L106 400Z"
          pathLength={1}
        />
      </g>

      {/* 04 · partitions: the network edges */}
      <g className="tp-line tp-partition">
        {edges.map(([x1, y1, x2, y2], i) => (
          <line key={`edge-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} />
        ))}
        {/* the weak link to the isolate — dashed, the net does not hold it */}
        <line x1="284" y1="296" x2="312" y2="176" strokeDasharray="3 5" pathLength={1} />
      </g>

      {/* 05 · fixtures: the nodes */}
      <g className="tp-fixture" aria-hidden>
        <rect x="122" y="190" width="12" height="12" pathLength={1} />
        <rect x="278" y="290" width="12" height="12" pathLength={1} />
        {[
          [166, 182],
          [140, 232],
          [176, 224],
          [252, 282],
          [262, 322],
          [148, 380],
          [178, 398],
        ].map(([cx, cy], i) => (
          <circle key={`node-${i}`} cx={cx} cy={cy} r="5" pathLength={1} />
        ))}
        {/* the isolate node */}
        <circle cx="312" cy="176" r="6" pathLength={1} />
      </g>

      {/* 06 · dimension chains */}
      <DimChain x1={96} y1={120} x2={330} y2={120} value="234" />
      <DimChain x1={80} y1={180} x2={80} y2={400} value="220" vertical />

      {/* 09 · markers — the ONE signal: the unlinked concept */}
      <g className="tp-mark" aria-hidden>
        <circle cx="312" cy="176" r="3.5" />
        <path d="M300 176h24M312 164v24" />
        <circle cx="312" cy="176" r="16" strokeDasharray="3 4" pathLength={1} />
      </g>
      <g className="tp-note" aria-hidden>
        <line x1="306" y1="164" x2="286" y2="136" pathLength={1} />
        <text className="tp-text" x="282" y="132" textAnchor="end">
          GAP-01
        </text>
      </g>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROGRESS — the mastery ladder the semester climbs.
   Five measured steps off one baseline; the signal stands on the
   current level; the dashed diagonal is the ideal line to test against.
   ═══════════════════════════════════════════════════════════════════ */
function ProgressGeometry() {
  const steps = [
    { x: 72, y: 392, h: 48 },
    { x: 124, y: 356, h: 84 },
    { x: 176, y: 320, h: 120 },
    { x: 228, y: 284, h: 156 },
    { x: 280, y: 248, h: 192 },
  ];
  return (
    <>
      {/* 02 · construction: the ideal diagonal + the L3 guide */}
      <g className="tp-construct" aria-hidden>
        <path d="M72 440L328 248" strokeDasharray="3 5" pathLength={1} />
        <path d="M72 320h304" strokeDasharray="8 6" pathLength={1} />
        <path d="M200 88v384" strokeDasharray="8 6" pathLength={1} />
      </g>

      {/* 03 · envelope: the baseline + the five steps */}
      <g className="tp-line tp-envelope">
        <line x1="64" y1="440" x2="336" y2="440" pathLength={1} />
        {steps.map((s, i) => (
          <rect key={`step-${i}`} x={s.x} y={s.y} width="48" height={s.h} pathLength={1} />
        ))}
      </g>

      {/* 04 · partitions: the risers between steps */}
      <g className="tp-line tp-partition">
        {steps.slice(1).map((s, i) => (
          <line key={`riser-${i}`} x1={s.x} y1={s.y} x2={s.x} y2="440" pathLength={1} />
        ))}
      </g>

      {/* 05 · fixtures: the material hatch in each step */}
      <g className="tp-fixture" aria-hidden>
        {steps.map((s, si) =>
          [0, 1, 2].map((t) => (
            <line
              key={`hatch-${si}-${t}`}
              x1={s.x + 8}
              y1={s.y + 14 + t * 14}
              x2={s.x + 40}
              y2={s.y + 14 + t * 14}
              pathLength={1}
            />
          )),
        )}
      </g>

      {/* 06 · dimension chains: the rise, the step, the span */}
      <DimChain x1={344} y1={248} x2={344} y2={440} value="+9.6" vertical />
      <DimChain x1={280} y1={228} x2={328} y2={228} value="48" />
      <DimChain x1={72} y1={464} x2={328} y2={464} value="256" />

      {/* 09 · markers — the ONE signal: the current level */}
      <g className="tp-mark" aria-hidden>
        <circle cx="200" cy="320" r="3.5" />
        <path d="M188 320h24M200 308v24" />
        <line x1="200" y1="308" x2="200" y2="292" pathLength={1} />
      </g>
      <g className="tp-note" aria-hidden>
        <text className="tp-text" x="200" y="286" textAnchor="middle">
          LEVEL 3
        </text>
      </g>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PATHWAY — the learning route the track surveys.
   Five waypoints, station dots between them, sight lines to the
   baseline; the signal is the far waypoint — the goal the track ends at.
   ═══════════════════════════════════════════════════════════════════ */
function PathwayGeometry() {
  const waypoints: Array<[number, number]> = [
    [72, 428],
    [138, 356],
    [206, 388],
    [262, 300],
    [330, 250],
  ];
  const stations: Array<[number, number]> = [
    [105, 392],
    [172, 372],
    [234, 344],
    [296, 275],
  ];
  return (
    <>
      {/* 02 · construction: the baseline + the sight lines */}
      <g className="tp-construct" aria-hidden>
        <path d="M64 428h288" strokeDasharray="8 6" pathLength={1} />
        {waypoints.slice(1).map(([x, y], i) => (
          <line key={`sight-${i}`} x1={x} y1={y} x2={x} y2="428" strokeDasharray="3 5" pathLength={1} />
        ))}
        <path d="M72 428Q210 470 330 250" strokeDasharray="2 6" pathLength={1} />
      </g>

      {/* 03 · envelope: the route itself */}
      <g className="tp-line tp-envelope">
        <path d="M72 428L138 356L206 388L262 300L330 250" pathLength={1} />
      </g>

      {/* 04 · partitions: the station dots on the travelled line */}
      <g className="tp-line tp-partition">
        {stations.map(([cx, cy], i) => (
          <g key={`station-${i}`}>
            <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} pathLength={1} />
            <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} pathLength={1} />
          </g>
        ))}
      </g>

      {/* 05 · fixtures: the waypoints (the start is a bench mark square) */}
      <g className="tp-fixture" aria-hidden>
        <rect x="68" y="424" width="9" height="9" pathLength={1} />
        {waypoints.slice(1, 4).map(([cx, cy], i) => (
          <circle key={`wp-${i}`} cx={cx} cy={cy} r="4.5" pathLength={1} />
        ))}
      </g>

      {/* waypoint labels ride the note layer — annotation text takes the
       * reading-ink fill (tp-fixture text carries none in the grammar) */}
      <g className="tp-note" aria-hidden>
        {waypoints.map(([x], i) => (
          <text key={`wlbl-${i}`} className="tp-text" x={x - 8} y={448} textAnchor="end">
            {`W${i + 1}`}
          </text>
        ))}
      </g>

      {/* 06 · dimension chains: the chord + the rise */}
      <DimChain x1={72} y1={464} x2={330} y2={464} value="258" />
      <DimChain x1={352} y1={250} x2={352} y2={428} value="178" vertical />

      {/* 09 · markers — the ONE signal: the goal waypoint */}
      <g className="tp-mark" aria-hidden>
        <circle cx="330" cy="250" r="3.5" />
        <circle cx="330" cy="250" r="14" strokeDasharray="3 4" pathLength={1} />
        <line x1="330" y1="236" x2="330" y2="214" pathLength={1} />
        <path d="M330 214h18l-5 5 5 5h-18z" />
      </g>
      <g className="tp-note" aria-hidden>
        <text className="tp-text" x="330" y="206" textAnchor="middle">
          GOAL
        </text>
      </g>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DOCUMENT — the sheet the reader measures.
   One A4 page (210 × 297 — the chain says so), margins in construction
   ink, a figure, a table, a baseline grid; the signal pin is the line
   the annotation refers to.
   ═══════════════════════════════════════════════════════════════════ */
function DocumentGeometry() {
  /* the text-block baselines: full-width and indented runs alternate
   * (the paragraph's ragged edge), skipping the table's zone. */
  const baselines: Array<{ y: number; x2: number }> = [];
  for (let y = 192; y <= 306; y += 9) {
    if (y >= 230 && y <= 296) continue; /* the table owns this band */
    baselines.push({ y, x2: (y / 9) % 2 === 0 ? 264 : 236 });
  }
  return (
    <>
      {/* 02 · construction: the text block + the fold */}
      <g className="tp-construct" aria-hidden>
        <rect x="136" y="112" width="128" height="194" strokeDasharray="2 6" pathLength={1} />
        <path d="M200 88v330" strokeDasharray="8 6" pathLength={1} />
        <path d="M120 96L280 322M280 96L120 322" strokeDasharray="3 5" pathLength={1} />
      </g>

      {/* 03 · envelope: the page itself */}
      <g className="tp-line tp-envelope">
        <rect x="120" y="96" width="160" height="226" pathLength={1} />
      </g>

      {/* 04 · partitions: the table grid */}
      <g className="tp-line tp-partition">
        <rect x="148" y="236" width="108" height="56" pathLength={1} />
        {[250, 264, 278].map((y) => (
          <line key={`trow-${y}`} x1="148" y1={y} x2="256" y2={y} pathLength={1} />
        ))}
        {[184, 220].map((x) => (
          <line key={`tcol-${x}`} x1={x} y1="236" x2={x} y2="292" pathLength={1} />
        ))}
      </g>

      {/* 05 · fixtures: the heading, the figure, the baselines */}
      <g className="tp-fixture" aria-hidden>
        <line x1="136" y1="122" x2="232" y2="122" pathLength={1} />
        <line x1="136" y1="128" x2="208" y2="128" pathLength={1} />
        <rect x="148" y="142" width="64" height="40" pathLength={1} />
        <line x1="148" y1="142" x2="212" y2="182" pathLength={1} />
        {baselines.map((b, i) => (
          <line key={`base-${i}`} x1="136" y1={b.y} x2={b.x2} y2={b.y} pathLength={1} />
        ))}
      </g>

      {/* 06 · dimension chains: the A4 sheet, by its measures */}
      <DimChain x1={120} y1={80} x2={280} y2={80} value="210" />
      <DimChain x1={104} y1={96} x2={104} y2={322} value="297" vertical />

      {/* 09 · markers — the ONE signal: the annotated line */}
      <g className="tp-mark" aria-hidden>
        <rect x="136" y="205" width="90" height="11" strokeDasharray="3 4" pathLength={1} />
        <circle cx="232" cy="210" r="3.5" />
      </g>
      <g className="tp-note" aria-hidden>
        <line x1="236" y1="206" x2="296" y2="170" pathLength={1} />
        <text className="tp-text" x="300" y="166">
          REF 04
        </text>
      </g>
    </>
  );
}
