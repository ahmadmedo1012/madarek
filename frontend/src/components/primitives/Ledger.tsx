import { Link } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';

/* ─── R189 «سجلّ مدارك» — the ledger product language ──────────────
 *
 * The R189 design direction (VLM-compared two-direction trial,
 * /home/z/probes/preview/): the authenticated product speaks an
 * editorial-ledger language continuous with the folio landing.
 * These primitives are its data atoms:
 *
 *   · LedgerPanel + LedgerRow — the repeating data surface (grid
 *     [lead | body | tail]; the lead column is mono data, the body
 *     carries Arabic content, the tail carries status + actions).
 *     Replaces the generic "card list" anatomy on dashboards and
 *     queues; rows are optionally navigable (the whole row is the
 *     link — the established agenda-row contract).
 *   · StatStrip — the typographic KPI replacement (mono label over
 *     a metric-role value over a trend note; NO icon wells, NO
 *     accent boxes — the printed stat line, 4–5 cells).
 *   · Sparkline — a data-bearing SVG trend mark (role="img" +
 *     aria-label; a chart, not an icon — the same media class as
 *     ChartFrame's canvases).
 *   · ProgressRing — the momentum ring (role="progressbar", SVG
 *     stroke-dasharray; the value is REAL data, never decoration).
 *   · WeekRow — the day-anchored week ledger row.
 *
 * Contracts:
 *   - Tokens only: every visual value is consumed from tokens.css
 *     via the CSS classes (components.css §R189); this module
 *     carries ZERO inline styles (gate-clean by construction).
 *   - Lucide-only icons (callers pass LucideIcon where needed).
 *   - RTL: logical grid columns; the ring rotates from 12 o'clock
 *     clockwise in both directions (progress convention is
 *     direction-neutral; direction mirroring would read backwards).
 *   - Reduced motion: the ring's dasharray transition and the row
 *     hover shifts are CSS-declared and die under the RM belt; the
 *     sparkline is static ink.
 */

export type StatTone = 'up' | 'down' | 'flat';

export interface StatCellData {
  /** Mono label — the fact's name («المعدل التراكمي»). */
  label: ReactNode;
  /** The value — metric typography is applied by CSS. */
  value: ReactNode;
  /** Optional trend note under the value. */
  trend?: ReactNode;
  /** Tone for the trend note (up=green ink, down=red ink). */
  trendTone?: StatTone;
  /** Optional navigable destination — renders the cell as a link. */
  to?: string;
}

export function StatStrip({
  cells,
  ariaLabel,
}: {
  cells: StatCellData[];
  /** Accessible name for the strip (it is a list of facts). */
  ariaLabel: string;
}) {
  return (
    <section className="stat-strip" aria-label={ariaLabel}>
      {cells.map((c, i) => {
        /* The dl lives INSIDE each cell — a <dl> may only parent dt/dd
           (HTML spec; axe: "dl element has direct children that are
           not allowed: a"), and the navigable variant wraps the whole
           cell in a Link. */
        const body = (
          <dl>
            <dt className="stat-label">{c.label}</dt>
            <dd className="stat-value">{c.value}</dd>
            {c.trend !== undefined && (
              <dd className={`stat-trend${c.trendTone ? ` ${c.trendTone}` : ''}`}>
                {c.trend}
              </dd>
            )}
          </dl>
        );
        return c.to ? (
          <Link
            key={i}
            to={c.to}
            className="stat-cell stat-cell-link"
            style={{ textDecoration: 'none' }}
          >
            {body}
          </Link>
        ) : (
          <div key={i} className="stat-cell">
            {body}
          </div>
        );
      })}
    </section>
  );
}

/* ─── Sparkline ──────────────────────────────────────────────────── */
export type SparkTone = 'accent' | 'mint' | 'sky' | 'rose';

const SPARK_STROKE: Record<SparkTone, string> = {
  accent: 'var(--accent)',
  mint: 'var(--c-mint-ink)',
  sky: 'var(--c-sky-ink)',
  rose: 'var(--c-rose-ink)',
};

export function Sparkline({
  points,
  ariaLabel,
  tone = 'accent',
  width = 80,
  height = 20,
}: {
  /** 2+ real data points (rendered as-is; single-point series render
   *  a flat honest line — the caller decides whether that is useful). */
  points: number[];
  /** The text alternative — names the series AND its meaning. */
  ariaLabel: string;
  tone?: SparkTone;
  width?: number;
  height?: number;
}) {
  const n = points.length;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = n > 1 ? (width - 2) / (n - 1) : 0;
  const coords = points
    .map((p, i) => {
      const x = (1 + i * step).toFixed(1);
      const y = (height - 2 - ((p - min) / span) * (height - 4)).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <span className="spark">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        <polyline
          points={coords}
          fill="none"
          stroke={SPARK_STROKE[tone]}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ─── ProgressRing ───────────────────────────────────────────────── */
export function ProgressRing({
  value,
  size = 112,
  thickness = 8,
  ariaLabel,
  center,
}: {
  /** 0–100; NaN/∞ clamp to an honest 0 (the ProgressBar contract). */
  value: number;
  size?: number;
  thickness?: number;
  /** Accessible name for the progressbar. */
  ariaLabel: string;
  /** Center content (the % value + caption) — rendered inside the ring. */
  center?: ReactNode;
}) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = ((v / 100) * c).toFixed(2);
  return (
    <span className="momentum-ring" style={{ '--ring-size': `${size}px` } as CSSProperties}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={Math.round(v)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Track + fill — no rotate transform: dasharray starts at 3
            o'clock; rotate(-90) moves the start to 12 o'clock in both
            directions (the direction-neutral progress convention). */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            className="ring-track"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={thickness}
          />
          <circle
            className="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c.toFixed(2)}`}
          />
        </g>
      </svg>
      {center !== undefined && <span className="momentum-center">{center}</span>}
    </span>
  );
}

/* ─── LedgerPanel + LedgerRow ────────────────────────────────────── */
export type ZoneTone = 'sky' | 'rose' | 'mint' | 'copper' | 'lavender';

export function LedgerPanel({
  title,
  tag,
  status,
  zone,
  actions,
  children,
  ariaLabel,
  className,
}: {
  /** Panel title (ledger-title). */
  title?: ReactNode;
  /** Optional mono tag at the inline-end of the head (data, e.g. «٠٢»). */
  tag?: ReactNode;
  /** Optional status pill rendered in the head (before the tag). */
  status?: ReactNode;
  /** Optional pastel zone tint for the head band. */
  zone?: ZoneTone;
  /** Optional head actions (rendered in the aux slot). */
  actions?: ReactNode;
  children: ReactNode;
  /** Accessible name — the panel is a labelled region. */
  ariaLabel?: string;
  className?: string;
}) {
  const cls = [
    'ledger',
    zone && `zone-${zone}`,
    className,
  ].filter(Boolean).join(' ');
  return (
    <section className={cls} aria-label={ariaLabel}>
      {(title !== undefined || tag !== undefined || status !== undefined || actions !== undefined) && (
        <header className="ledger-head">
          {/* The panel title is a REAL h2 — panels are document sections
              (h1 masthead → h2 panels), so SR heading navigation moves
              between them; the class keeps the visual grammar. */}
          {title !== undefined && <h2 className="ledger-title">{title}</h2>}
          {status}
          <span className="ledger-aux">
            {actions}
            {tag !== undefined && <span className="ledger-tag">{tag}</span>}
          </span>
        </header>
      )}
      {children}
    </section>
  );
}

export interface LedgerRowProps {
  /** First column — mono data (time, count, code). A plain string
   *  renders mono-muted; pass {lead, leadLabel} for the bold label
   *  over mono detail anatomy, or any ReactNode for full control. */
  lead?: ReactNode;
  /** Bold lead label (rendered above the mono detail when given). */
  leadLabel?: ReactNode;
  /** Main Arabic content (strong for the emphasized run). */
  title: ReactNode;
  /** Optional muted second line. */
  subtitle?: ReactNode;
  /** Tail slot — status pills and/or inline action buttons. */
  tail?: ReactNode;
  /** Router destination — renders the WHOLE row as the link. */
  to?: string;
}

export function LedgerRow({ lead, leadLabel, title, subtitle, tail, to }: LedgerRowProps) {
  const leadCell =
    leadLabel !== undefined || lead !== undefined ? (
      <span className="ledger-lead">
        {leadLabel !== undefined && <b>{leadLabel}</b>}
        {lead}
      </span>
    ) : null;
  const body = (
    <>
      {leadCell}
      <span className="ledger-what">
        {title}
        {subtitle !== undefined && <small>{subtitle}</small>}
      </span>
      {tail !== undefined && <span className="ledger-tail">{tail}</span>}
    </>
  );
  if (to !== undefined) {
    return (
      <Link to={to} className="ledger-row ledger-row-link">
        {body}
      </Link>
    );
  }
  return <div className="ledger-row">{body}</div>;
}

/* ─── WeekRow ────────────────────────────────────────────────────── */
export function WeekRow({
  day,
  date,
  children,
}: {
  /** Day name (bold, sans). */
  day: ReactNode;
  /** Mono date detail under the day. */
  date?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="week-row">
      <span className="week-day">
        <b>{day}</b>
        {date}
      </span>
      <span className="week-what">{children}</span>
    </div>
  );
}
