/**
 * chartTheme — shared Chart.js styling for Madarek.
 *
 * Chart.js renders to <canvas> and CANNOT read CSS variables, so passing
 * strings like 'var(--chart-grid)' silently falls back to defaults
 * (invisible/wrong grid + ticks). This helper resolves the real computed
 * colors from the document root and returns unified, calm chart options.
 */
import type { ChartOptions } from 'chart.js';

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
    padding: 10,
    cornerRadius: 8,
    titleFont: { family: FONT, size: 12 },
    bodyFont: { family: FONT, size: 12 },
    rtl: true,
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
    ticks: { color: c.text, font: { family: FONT, size: 11 } },
    border: { display: false },
    display: true,
    ...(showGrid ? {} : { grid: { display: false, drawBorder: false } }),
  });
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: CALM_ANIMATION,
    plugins: {
      legend: opts?.legend
        ? { position: 'bottom', rtl: true, labels: { color: c.text, font: { family: FONT, size: 12 }, padding: 16, usePointStyle: true } }
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
    cutout: opts?.cutout ?? '68%',
    animation: { ...CALM_ANIMATION, animateRotate: true, animateScale: false },
    plugins: {
      legend: opts?.legend === false
        ? { display: false }
        : { position: 'bottom', rtl: true, labels: { color: c.text, font: { family: FONT, size: 12 }, padding: 14, usePointStyle: true } },
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
