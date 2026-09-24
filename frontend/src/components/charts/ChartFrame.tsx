import type { CSSProperties, ReactNode } from 'react';

/** Column headers + data rows for the screen-reader fallback table. */
export type ChartTable = {
  /** Screen readers announce the caption before the data. */
  caption: string;
  /** Column headers in reading order. */
  columns: readonly string[];
  /** One entry per data row; cells in the same order as `columns`. */
  rows: readonly (readonly (string | number)[])[];
};

export type ChartFrameProps = {
  /**
   * Accessible name for the chart (WCAG 1.1.1 — a canvas is opaque to
   * assistive tech without it). Required; summarise the series, e.g.
   * "النشاط الأسبوعي على المنصة — جلسات نشطة يومياً".
   */
  ariaLabel: string;
  /** The chart element — any react-chartjs-2 component. */
  children: ReactNode;
  /**
   * Short prose summary of the trend, announced right after the image
   * role (visually hidden). E.g. "ذروة النشاط منتصف الأسبوع".
   */
  summary?: string;
  /**
   * The chart's underlying data points as a visually-hidden table, so
   * screen readers get real data instead of a name-only image.
   */
  table?: ChartTable;
  /**
   * Height for the chart box. Chart.js with `maintainAspectRatio: false`
   * fills its nearest positioned parent, so the box must be sized —
   * either via this prop or via CSS on the root (className).
   */
  height?: number | string;
  /** Extra class on the root wrapper (e.g. a page-level chart container). */
  className?: string;
};

/**
 * ChartFrame — accessibility wrapper for canvas charts.
 *
 * A bare <canvas> is invisible to screen readers; this frame gives every
 * chart a `role="img"` + Arabic aria-label, and an adjacent visually
 * hidden table carrying the real data points (WCAG 1.1.1, audit 0-f P1-3).
 * The table is a SIBLING of the image role (not nested inside it) so it
 * stays in the accessibility tree.
 *
 * Drop-in for the existing page pattern — the chart element keeps its own
 * `key={themeKey}` remount and options:
 *
 *   const themeKey = useChartThemeKey()
 *   <ChartFrame
 *     ariaLabel="النشاط الأسبوعي — جلسات نشطة يومياً"
 *     height={220}
 *     table={{ caption: 'النشاط الأسبوعي', columns: ['اليوم', 'جلسات'],
 *              rows: days.map((d, i) => [d, weekly[i]]) }}
 *   >
 *     <Line key={themeKey} data={data} options={cartesianOptions()} />
 *   </ChartFrame>
 *
 * Styling hooks: [data-chart-frame] (root), [data-chart-table],
 * [data-chart-summary]; the fallback block reuses the global
 * `.visually-hidden` utility from base.css.
 *
 * See specs/012-design-graphics-uplift/contracts/chart-treatment.md.
 */
export function ChartFrame({
  ariaLabel,
  children,
  summary,
  table,
  height,
  className,
}: ChartFrameProps): JSX.Element {
  const chartBoxStyle: CSSProperties = {
    // Chart.js sizes the canvas to this box; `position: relative` is
    // required by its responsive resizer.
    position: 'relative',
    // No height prop → inherit the root's CSS height (className path).
    height: height !== undefined ? height : '100%',
  };

  return (
    <div className={className} data-chart-frame="">
      <div role="img" aria-label={ariaLabel} style={chartBoxStyle}>
        {children}
      </div>
      {(summary !== undefined || table !== undefined) && (
        <div className="visually-hidden">
          {summary !== undefined && <p data-chart-summary="">{summary}</p>}
          {table !== undefined && (
            <table data-chart-table="">
              <caption>{table.caption}</caption>
              <thead>
                <tr>
                  {table.columns.map((column, i) => (
                    <th key={`${column}-${i}`} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
