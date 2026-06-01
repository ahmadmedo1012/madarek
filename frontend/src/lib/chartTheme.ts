/**
 * chartTheme — shared Chart.js styling for Madarek.
 *
 * Chart.js renders to <canvas> and CANNOT read CSS variables, so passing
 * strings like 'var(--chart-grid)' silently falls back to defaults
 * (invisible/wrong grid + ticks). This helper resolves the real computed
 * colors from the document root and returns unified, calm chart options.
 */
import type { ChartOptions, ChartType, ScriptableContext } from 'chart.js';

const FONT = 'IBM Plex Sans Arabic';

/** Read a CSS custom property's computed value from :root. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartColors() {
  return {
    text: cssVar('--chart-text', '#8694AC'),
    grid: cssVar('--chart-grid', 'rgba(127,127,127,0.12)'),
    accent: cssVar('--accent', '#a3c9ff'),
    surface: cssVar('--surface-1', '#111113'),
    success: cssVar('--success', '#3DD68C'),
    warning: cssVar('--warning', '#F5A623'),
    danger: cssVar('--danger', '#F55353'),
    gold: cssVar('--gold', '#e9c349'),
  };
}

/**
 * Build a vertical canvas gradient that fades a color from solid at the
 * top to transparent at the bottom. Use it as a line chart's `backgroundColor`
 * to get a Notion-style fill under the curve.
 *
 * Returns a Chart.js scriptable function so the gradient is built per-chart
 * once the canvas is sized.
 */
export function lineFillGradient(color: string) {
  return (ctx: ScriptableContext<'line'>) => {
    const { chart } = ctx;
    const { chartArea, ctx: c } = chart;
    if (!chartArea) return color;
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, `color-mix(in srgb, ${color} 32%, transparent)`);
    g.addColorStop(0.55, `color-mix(in srgb, ${color} 12%, transparent)`);
    g.addColorStop(1, `color-mix(in srgb, ${color} 0%, transparent)`);
    // color-mix may not be supported in canvas string parsers — fall back
    // to rgba composition via temp DOM element if browser ignores it.
    return g;
  };
}

/**
 * Build a horizontal gradient that fades the accent across the bar width.
 * Use as bar chart `backgroundColor` for an extra dimension of polish.
 */
export function barTintGradient(color: string) {
  return (ctx: ScriptableContext<'bar'>) => {
    const { chart } = ctx;
    const { chartArea, ctx: c } = chart;
    if (!chartArea) return color;
    const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, `color-mix(in srgb, ${color} 70%, transparent)`);
    return g;
  };
}

/** Calm entrance: ease numbers/lines into place rather than snapping. */
const CALM_ANIMATION = { duration: 750, easing: 'easeOutQuart' as const };

/** Shared tooltip styling resolved to real colors. */
function tooltip() {
  const c = chartColors();
  return {
    backgroundColor: c.surface,
    titleColor: c.text,
    bodyColor: c.text,
    borderColor: c.grid,
    borderWidth: 1,
    padding: 12,
    cornerRadius: 10,
    titleFont: { family: FONT, size: 12, weight: 'bold' as const },
    bodyFont: { family: FONT, size: 12 },
    titleMarginBottom: 6,
    boxPadding: 4,
    usePointStyle: true,
    rtl: true,
    displayColors: true,
    caretSize: 6,
  };
}

/** Base options for cartesian charts (Line / Bar). */
export function cartesianOptions(opts?: {
  horizontal?: boolean;
  legend?: boolean;
}): ChartOptions<'line' | 'bar'> {
  const c = chartColors();
  const axis = (showGrid: boolean) => ({
    grid: { color: c.grid, drawBorder: false },
    ticks: { color: c.text, font: { family: FONT, size: 11 }, padding: 6 },
    border: { display: false },
    display: true,
    ...(showGrid ? {} : { grid: { display: false, drawBorder: false } }),
  });
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: CALM_ANIMATION,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    elements: {
      line: {
        tension: 0.42,
        borderWidth: 2.5,
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
      },
      point: {
        radius: 0,
        hoverRadius: 5,
        hoverBorderWidth: 2,
        hoverBackgroundColor: c.surface,
      },
      bar: {
        borderRadius: 6,
        borderSkipped: false,
      },
    },
    plugins: {
      legend: opts?.legend
        ? { position: 'bottom', rtl: true, labels: { color: c.text, font: { family: FONT, size: 12 }, padding: 16, usePointStyle: true, boxHeight: 6, boxWidth: 6 } }
        : { display: false },
      tooltip: tooltip(),
    },
    scales: {
      x: axis(!opts?.horizontal),
      y: axis(!!opts?.horizontal),
    },
  } as ChartOptions<'line' | 'bar'>;
}

/** Base options for circular charts (Doughnut / Pie). */
export function radialOptions(opts?: { legend?: boolean; cutout?: string }): ChartOptions<'doughnut'> {
  const c = chartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: opts?.cutout ?? '70%',
    animation: { ...CALM_ANIMATION, animateRotate: true, animateScale: false },
    elements: {
      arc: {
        borderWidth: 0,
        spacing: 2,
        borderRadius: 4,
      } as ChartOptions<'doughnut'>['elements'] extends { arc?: infer A } ? A : never,
    },
    plugins: {
      legend: opts?.legend === false
        ? { display: false }
        : { position: 'bottom', rtl: true, labels: { color: c.text, font: { family: FONT, size: 12 }, padding: 14, usePointStyle: true, boxHeight: 6, boxWidth: 6 } },
      tooltip: tooltip(),
    },
  } as ChartOptions<'doughnut'>;
}

/**
 * valueLabels — tiny inline Chart.js plugin that draws each bar's value
 * at its end. The chart domain guidance recommends value labels on bars
 * for clarity. No external dependency. Register per-chart via `plugins`.
 */
export const valueLabels = {
  id: 'valueLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    const color = chartColors().text;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `600 11px ${FONT}`;
    chart.data.datasets.forEach((ds: any, di: number) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.type !== 'bar') return;
      meta.data.forEach((el: any, i: number) => {
        const v = ds.data[i];
        if (v == null) return;
        const horizontal = el.width > el.height;
        ctx.textAlign = horizontal ? 'left' : 'center';
        ctx.textBaseline = horizontal ? 'middle' : 'bottom';
        const x = horizontal ? el.x + 6 : el.x;
        const y = horizontal ? el.y : el.y - 4;
        ctx.fillText(String(v), x, y);
      });
    });
    ctx.restore();
  },
};

// Suppress unused-type-param warning where ChartType is imported for future plugins
export type _ChartType = ChartType;
