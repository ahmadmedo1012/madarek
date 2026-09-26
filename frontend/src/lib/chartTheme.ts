/**
 * chartTheme — shared Chart.js styling, plugins and repaint plumbing
 * for Madarek.
 *
 * Chart.js renders to <canvas> and CANNOT read CSS variables, so passing
 * strings like 'var(--chart-grid)' silently falls back to defaults
 * (invisible/wrong grid + ticks). Every helper below resolves the real
 * computed colors / font stacks from the document root at CALL time, so
 * a remount picks up fresh theme values (see useChartThemeKey for the
 * remount key all 15 chart instances already use).
 *
 * Contract: specs/012-design-graphics-uplift/contracts/chart-treatment.md
 * ─────────────────────────────────────────────────────────────────────
 * The contract's plugin set ships from this file and is registered ONCE
 * at module init, so every chart — including the inline-option holdouts
 * (Skills radar, student dash doughnut) — reads as designed:
 *
 *   madarekTooltipPlugin      designed DOM tooltip (surface ground, 1px
 *                             border, --shadow-pop, --r-sm, --font-sans,
 *                             rtl) replacing the canvas default.
 *   madarekFadingAxisPlugin   gridlines fade to transparent at the chart
 *                             edges (8%; 2% under prefers-contrast: more).
 *   madarekGradientFillPlugin area fills under line datasets become
 *                             accent-fading gradients — opt-in per chart
 *                             via cartesianOptions({ gradientFill: true })
 *                             or options.plugins.madarekGradientFill.
 *   madarekCenterLabelPlugin  doughnut center text drawn with
 *                             --type-metric tokens — opt-in via
 *                             radialOptions({ centerLabel: {value,label} }).
 *
 * Deliberate deviations from the contract (all flagged in the audit):
 *   - Theme repaint keeps the remount-key pattern (useChartThemeKey).
 *     The contract's WeakSet + chart.update('none') observer is redundant
 *     with it — the audit verified the remount mechanism is complete on
 *     15/15 instances, so it is not duplicated here.
 *   - Tick labels keep full --chart-text alpha. The contract's "labels at
 *     ≤5% alpha at the edge" lands around 2.4:1 on cream and breaks the
 *     contrast floor (brief guardrail 3); only gridlines (decorative)
 *     fade.
 *   - Animation durations read the design scale (--t-slow / --t-slower,
 *     380/520) instead of the contract-era 750, and collapse to instant
 *     under prefers-reduced-motion (chartAnimation()).
 */
import { Chart } from 'chart.js';
import type {
  ChartDataset,
  ChartOptions,
  ChartType,
  Plugin,
  ScriptableContext,
  ScriptableScaleContext,
  TooltipModel,
} from 'chart.js';
import { useSyncExternalStore } from 'react';

/* ─── Opt-in plugin option types (augment Chart.js plugin options) ─── */

export type MadarekGradientFillOptions = {
  /** Fill line-dataset areas with accent-fading canvas gradients. */
  enabled: boolean;
};

export type MadarekCenterLabelOptions = {
  /** Big value rendered with --type-metric tokens. */
  value: string;
  /** Optional caption under the value (--type-label tokens). */
  label?: string;
};

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    /** Consumed by madarekGradientFillPlugin (globally registered). */
    madarekGradientFill?: Partial<MadarekGradientFillOptions>;
    /** Consumed by madarekCenterLabelPlugin (globally registered). */
    madarekCenterLabel?: Partial<MadarekCenterLabelOptions>;
  }
}

/* ─── Token + color utilities ─────────────────────────────────────── */

/** Read a CSS custom property's computed value from :root. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Read a numeric token (px / ms / weight) from :root. Chart.js option
 * values are plain numbers, so token values are parsed at build time —
 * this keeps durations on the design scale without hardcoding.
 */
function readTokenNumber(name: string, fallback: number): number {
  const parsed = Number.parseFloat(cssVar(name, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const FONT_SANS_FALLBACK = "'IBM Plex Sans Arabic', 'Tajawal', system-ui, sans-serif";
const FONT_MONO_FALLBACK = "'IBM Plex Mono', ui-monospace, monospace";

/** Live font stacks — re-resolved per call so remounts pick up the
 *  current computed token values (Arabic + Latin glyphs share the stack). */
function fontSans(): string {
  return cssVar('--font-sans', FONT_SANS_FALLBACK);
}
function fontMono(): string {
  return cssVar('--font-mono', FONT_MONO_FALLBACK);
}

type RgbaColor = { r: number; g: number; b: number; a: number };

const RGBA_RE =
  /^rgba?\(\s*([\d.]+)(%?)\s*[,/\s]\s*([\d.]+)(%?)\s*[,/\s]\s*([\d.]+)(%?)\s*(?:[,/]\s*([\d.]+)(%?)\s*)?\)$/i;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Parse hex (#rgb/#rgba/#rrggbb/#rrggbbaa) and rgb()/rgba() colors to
 * channels. Needed because canvas gradients must receive concrete color
 * strings — see withAlpha.
 */
function parseColor(color: string): RgbaColor | null {
  const s = color.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    const channel = (v: string) => parseInt(v.length === 1 ? v + v : v, 16);
    let r: number, g: number, b: number, a = 1;
    if (hex.length === 3 || hex.length === 4) {
      r = channel(hex.slice(0, 1));
      g = channel(hex.slice(1, 2));
      b = channel(hex.slice(2, 3));
      if (hex.length === 4) a = channel(hex.slice(3, 4)) / 255;
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      if (hex.length === 8) a = parseInt(hex.slice(6, 8), 16) / 255;
    } else {
      return null;
    }
    if (![r, g, b, a].every(Number.isFinite)) return null;
    return { r, g, b, a };
  }
  const m = RGBA_RE.exec(s);
  if (m) {
    const chan = (value: string | undefined, unit: string | undefined) => {
      const n = Number.parseFloat(value ?? '');
      if (!Number.isFinite(n)) return Number.NaN;
      return unit === '%' ? (n / 100) * 255 : n;
    };
    const r = chan(m[1], m[2]);
    const g = chan(m[3], m[4]);
    const b = chan(m[5], m[6]);
    const aRaw = m[7] === undefined ? 1 : Number.parseFloat(m[7]) / (m[8] === '%' ? 100 : 1);
    if (![r, g, b, aRaw].every(Number.isFinite)) return null;
    return { r, g, b, a: clamp01(aRaw) };
  }
  return null;
}

function toRgba(c: RgbaColor, alpha: number): string {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${clamp01(c.a * alpha)})`;
}

/**
 * A color at a given alpha, as a concrete string canvas can parse.
 * Hex/rgb inputs (every palette token) resolve to rgba() directly — no
 * color-mix() in addColorStop, which older canvas parsers reject with a
 * SyntaxError (audit 0-f P3-24). Unparseable colors fall back to
 * color-mix and safeLinearGradient catches the throw.
 */
function withAlpha(color: string, alpha: number): string {
  const parsed = parseColor(color);
  if (parsed) return toRgba(parsed, alpha);
  return `color-mix(in srgb, ${color} ${Math.round(clamp01(alpha) * 100)}%, transparent)`;
}

/**
 * Create a linear gradient; if the browser rejects a stop string (the
 * color-mix fallback path), degrade to the flat fallback color instead
 * of crashing the chart render (audit 0-f P3-24).
 */
function safeLinearGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: readonly (readonly [number, string])[],
  fallback: string,
): CanvasGradient | string {
  try {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [offset, color] of stops) g.addColorStop(offset, color);
    return g;
  } catch {
    return fallback;
  }
}

/* ─── Media-preference trackers ─────────────────────────────────────
   Module state + one listener per query, installed once at import.
   Options factories consult the state at call time, so a mid-session OS
   toggle is reflected on the next consumer re-render (or theme-key
   remount). Chart.js animation config is data, not CSS, so the global
   reduced-motion belt in base.css cannot reach it — this tracker does. */

function readMedia(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

let reducedMotionActive = readMedia('(prefers-reduced-motion: reduce)');
let moreContrastActive = readMedia('(prefers-contrast: more)');

function trackMedia(query: string, onChange: (matches: boolean) => void): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  const mq = window.matchMedia(query);
  const handler = (event: MediaQueryListEvent) => onChange(event.matches);
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler);
  } else if (typeof mq.addListener === 'function') {
    // Legacy Safari — addListener was the pre-14 API.
    mq.addListener(handler);
  }
}

trackMedia('(prefers-reduced-motion: reduce)', (m) => {
  reducedMotionActive = m;
});
trackMedia('(prefers-contrast: more)', (m) => {
  moreContrastActive = m;
});

/* ─── Palette resolvers (unchanged public surface) ─────────────────── */

export function chartColors() {
  return {
    text: cssVar('--chart-text', '#8694AC'),
    grid: cssVar('--chart-grid', 'rgba(127,127,127,0.12)'),
    accent: cssVar('--accent', '#a3c9ff'),
    surface: cssVar('--surface-1', '#111113'),
    /** Slightly raised surface — used for "remaining/inactive" chart segments. */
    surfaceMuted: cssVar('--surface-3', '#EDEDF0'),
    success: cssVar('--success', '#3DD68C'),
    /* 5-D1 (A11 P2-4): gold/warning series resolve the chart-series
     * amber (--chart-6) instead of the base --gold/--warning fills —
     * #D6A330 measured 2.30:1 on the white plot cards (WCAG 1.4.11
     * non-text needs 3:1); --chart-6 is #A67A22 light (3.87:1 on
     * --surface) / #F2C766 dark (11.01:1), documented in tokens.css.
     * Consumers: admin analysis line, quality + governance donuts,
     * student grades threshold, owner workload meters. (Light already
     * rendered gold ≡ warning — both were --c-yellow-ink — so the two
     * keys stay equally distinguishable as before.) */
    warning: cssVar('--chart-6', '#F5A623'),
    danger: cssVar('--danger', '#F55353'),
    gold: cssVar('--chart-6', '#e9c349'),
  };
}

/** Eight-color categorical palette for pie/doughnut/bar series.
 *
 *  Resolves --chart-1..--chart-8 from tokens so light and dark themes both
 *  look cohesive without component-level overrides. Cycle rule: series
 *  index `i` (0-based) → `palette[i % 8]`. Documented in
 *  `specs/002-visual-uplift/contracts/chart-theme.md`. */
export function chartPalette(): string[] {
  return [
    cssVar('--chart-1', '#B57438'),
    cssVar('--chart-2', '#4FA66D'),
    cssVar('--chart-3', '#5C8FCE'),
    cssVar('--chart-4', '#DD6E78'),
    cssVar('--chart-5', '#8A6FE0'),
    cssVar('--chart-6', '#E8B547'),
    cssVar('--chart-7', '#3F8B8B'),
    cssVar('--chart-8', '#A65D8A'),
  ];
}

/* ─── Gradient fill helpers ────────────────────────────────────────── */

/** Contract §madarekGradientFillPlugin — accent at 35% alpha at the top
 *  fading to fully transparent at the baseline. */
function areaGradientStops(color: string): readonly (readonly [number, string])[] {
  return [
    [0, withAlpha(color, 0.35)],
    [0.55, withAlpha(color, 0.12)],
    [1, withAlpha(color, 0)],
  ];
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
  return (ctx: ScriptableContext<'line'>): string | CanvasGradient => {
    const { chart } = ctx;
    const { chartArea, ctx: c } = chart;
    if (!chartArea) return color;
    return safeLinearGradient(
      c,
      0,
      chartArea.top,
      0,
      chartArea.bottom,
      areaGradientStops(color),
      withAlpha(color, 0.12),
    );
  };
}

/* ─── Motion profile ───────────────────────────────────────────────── */

export type ChartAnimationProfile = { duration: number; easing: 'easeOutQuart' };

/**
 * Shared animation profile for every chart.
 *
 * - Durations read the design scale: --t-slow (380) for cartesian
 *   entrances, --t-slower (520) for radial rotates (chart-treatment.md
 *   durations reconciled to the token scale instead of raw 750/800).
 * - `false` (Chart.js "no animation at all") under
 *   prefers-reduced-motion — instant updates per contract §Reduced-motion.
 *
 * Inline-option charts (the two page holdouts) can adopt it directly:
 * `animation: chartAnimation()`.
 */
export function chartAnimation(): false | ChartAnimationProfile {
  if (reducedMotionActive) return false;
  return { duration: readTokenNumber('--t-slow', 380), easing: 'easeOutQuart' };
}

/* ─── Fading-axis treatment (contract §madarekFadingAxisPlugin) ────── */

/** Edge fade extent as a fraction of the axis span. */
const GRID_FADE_EXTENT = 0.08;
/** Contract §theme-change: edges remain readable under prefers-contrast. */
const GRID_FADE_EXTENT_MORE_CONTRAST = 0.02;

type FadingGridColor = (ctx: ScriptableScaleContext) => string | CanvasGradient;

/**
 * Scriptable grid color: gridlines fade to transparent at both ends of
 * the axis (grid config lives on a scale — y-scale lines run horizontally
 * so they fade along X, x-scale lines run vertically so they fade along Y).
 * The gradient is rebuilt at draw time, so it tracks chartArea resizes and
 * theme remounts for free. Tick labels intentionally keep full alpha —
 * see the deviations note in the file docblock.
 */
export function fadingGridColor(scaleId: 'x' | 'y', base: string): FadingGridColor {
  const fade: FadingGridColor = (ctx) => {
    const area = ctx.chart.chartArea;
    const parsed = parseColor(base);
    if (!area || !parsed) return base;
    const span = scaleId === 'y' ? area.right - area.left : area.bottom - area.top;
    if (span <= 0) return base;
    const extent = Math.min(
      moreContrastActive ? GRID_FADE_EXTENT_MORE_CONTRAST : GRID_FADE_EXTENT,
      0.45,
    );
    const edge = toRgba(parsed, 0);
    const stops: readonly (readonly [number, string])[] = [
      [0, edge],
      [extent, base],
      [1 - extent, base],
      [1, edge],
    ];
    return scaleId === 'y'
      ? safeLinearGradient(ctx.chart.ctx, area.left, 0, area.right, 0, stops, base)
      : safeLinearGradient(ctx.chart.ctx, 0, area.top, 0, area.bottom, stops, base);
  };
  return fade;
}

/* ─── Designed DOM tooltip (contract §madarekTooltipPlugin) ────────── */

const TOOLTIP_CLASS = 'madarek-chart-tooltip';

let tooltipEl: HTMLDivElement | null = null;
let tooltipOwner: Chart | null = null;
let tooltipSignature = '';

function ensureTooltipEl(): HTMLDivElement | null {
  if (typeof document === 'undefined' || typeof document.body === 'undefined') return null;
  if (tooltipEl && tooltipEl.isConnected) return tooltipEl;
  const el = document.createElement('div');
  el.className = TOOLTIP_CLASS;
  // Mirrors chart data that is already announced through ChartFrame's
  // sr-only table / aria-label — keep it out of the accessibility tree.
  el.setAttribute('aria-hidden', 'true');
  el.style.position = 'absolute';
  // Physical top/left + translate3d: the box is placed in page
  // (screen) coordinates, which are direction-agnostic. Logical
  // insets would flip under [dir=rtl] and break the math.
  el.style.top = '0';
  el.style.left = '0';
  el.style.zIndex = 'var(--z-tooltip, 250)';
  el.style.pointerEvents = 'none';
  el.style.background = 'var(--surface)';
  el.style.color = 'var(--text)';
  el.style.border = '1px solid var(--surface-border)';
  el.style.borderRadius = 'var(--r-sm)';
  el.style.boxShadow = 'var(--shadow-pop)';
  // chart-treatment.md §madarekTooltipPlugin pins 12px 14px padding.
  el.style.padding = '12px 14px';
  el.style.fontFamily = 'var(--font-sans)';
  el.style.fontSize = 'var(--fs-xs, 12px)';
  el.style.lineHeight = '1.5';
  el.style.direction = 'rtl';
  el.style.textAlign = 'start';
  el.style.willChange = 'transform, opacity';
  el.style.opacity = '0';
  // Fade on enter/leave; transform tracking smooths pointer-following.
  // The global reduced-motion belt (base.css) zeroes both transitions
  // under prefers-reduced-motion, satisfying contract §Reduced-motion.
  el.style.transition =
    'opacity var(--motion-duration-short) var(--motion-ease-standard), transform var(--t-micro) var(--ease-out)';
  document.body.append(el);
  tooltipEl = el;
  return el;
}

/** Split a Chart.js body line ("مستخدم نشط: 42") into label + value. */
function splitTooltipLine(line: string): [string, string | null] {
  const m = /^(.+?):\s+(.+)$/.exec(line);
  if (m && m[1] !== undefined && m[2] !== undefined) return [m[1], m[2]];
  return [line, null];
}

function buildTooltipContent(el: HTMLDivElement, tooltip: TooltipModel<ChartType>): void {
  el.replaceChildren();
  const title = (tooltip.title ?? []).join(' ');
  if (title) {
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.fontWeight = 'var(--fw-semibold)';
    titleEl.style.marginBlockEnd = 'var(--sp-1)';
    el.append(titleEl);
  }
  const rows = document.createElement('div');
  rows.style.display = 'flex';
  rows.style.flexDirection = 'column';
  rows.style.gap = 'var(--sp-1)';
  const body = tooltip.body ?? [];
  body.forEach((bodyItem, i) => {
    const line = bodyItem.lines.join(' ');
    if (!line) return;
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = 'var(--sp-2)';
    const swatch = tooltip.labelColors?.[i];
    if (swatch && typeof swatch.backgroundColor === 'string') {
      const dot = document.createElement('span');
      dot.style.inlineSize = '8px';
      dot.style.blockSize = '8px';
      dot.style.flexShrink = '0';
      dot.style.borderRadius = 'var(--r-full)';
      dot.style.background = swatch.backgroundColor;
      row.append(dot);
    }
    const [labelPart, valuePart] = splitTooltipLine(line);
    const label = document.createElement('span');
    label.textContent = labelPart;
    row.append(label);
    if (valuePart !== null) {
      // Contract: values render in --font-mono with tabular numerals.
      const value = document.createElement('bdi');
      value.textContent = valuePart;
      value.style.fontFamily = 'var(--font-mono)';
      value.style.fontVariantNumeric = 'tabular-nums';
      row.append(value);
    }
    rows.append(row);
  });
  el.append(rows);
}

/**
 * External tooltip handler — replaces Chart.js's canvas tooltip with the
 * designed DOM surface. Installed by the tooltip() options factory (so
 * every cartesianOptions/radialOptions chart gets it for free) and by
 * madarekTooltipPlugin for inline-option charts.
 *
 * Chart.js calls this on every active-element/position change (i.e. every
 * mousemove — pointer-following with ≤16 ms response); the CSS transform
 * transition smooths the tracking and the opacity transition provides the
 * enter/leave fade (the model itself jumps 0↔1 because `enabled: false`
 * disables its internal animation).
 */
function drawMadarekTooltip(args: { chart: Chart; tooltip: TooltipModel<ChartType> }): void {
  const { chart, tooltip } = args;
  const el = ensureTooltipEl();
  if (!el || !chart.canvas) return;
  tooltipOwner = chart;

  if (tooltip.opacity <= 0) {
    el.style.opacity = '0';
    return;
  }

  const signature = JSON.stringify([tooltip.title, tooltip.body, tooltip.labelColors]);
  if (signature !== tooltipSignature) {
    buildTooltipContent(el, tooltip);
    tooltipSignature = signature;
  }

  const rect = chart.canvas.getBoundingClientRect();
  const scaleX = rect.width > 0 && chart.width > 0 ? rect.width / chart.width : 1;
  const scaleY = rect.height > 0 && chart.height > 0 ? rect.height / chart.height : 1;
  const caretX = rect.left + tooltip.caretX * scaleX;
  const caretY = rect.top + tooltip.caretY * scaleY;

  const gap = readTokenNumber('--sp-2', 8);
  const width = el.offsetWidth;
  const height = el.offsetHeight;

  // Centre above the caret; flip below near the top edge; clamp inside the viewport.
  let x = caretX - width / 2;
  let y = caretY - height - gap;
  x = Math.min(Math.max(x, gap), Math.max(gap, window.innerWidth - width - gap));
  if (y < gap) {
    y = Math.min(caretY + gap, Math.max(gap, window.innerHeight - height - gap));
  }

  el.style.transform = `translate3d(${x + window.scrollX}px, ${y + window.scrollY}px, 0)`;
  el.style.opacity = '1';
}

/** Shared tooltip styling resolved to real colors (canvas fallback
 *  surface — the DOM tooltip above takes precedence). */
function tooltip() {
  const c = chartColors();
  return {
    backgroundColor: c.surface,
    titleColor: c.text,
    bodyColor: c.text,
    borderColor: c.grid,
    borderWidth: 1,
    padding: 12,
    cornerRadius: readTokenNumber('--r-sm', 8),
    titleFont: { family: fontSans(), size: 12, weight: '600' },
    bodyFont: { family: fontSans(), size: 12 },
    titleMarginBottom: 6,
    boxPadding: 4,
    usePointStyle: true,
    rtl: true,
    textDirection: 'rtl',
    displayColors: true,
    caretSize: 6,
    // The designed DOM surface replaces the canvas tooltip. `external`
    // still receives the full model (title/body/caret), while
    // `enabled: false` keeps the canvas default from double-rendering.
    enabled: false,
    external: drawMadarekTooltip,
  };
}

/* ─── Option factories (public surface — additive optional keys) ───── */

/** Base options for cartesian charts (Line / Bar). */
export function cartesianOptions(opts?: {
  horizontal?: boolean;
  legend?: boolean;
  /** Opt-in: fill line-dataset areas with accent-fading gradients
   *  (madarekGradientFillPlugin — registered globally, disabled by default). */
  gradientFill?: boolean;
}): ChartOptions<'line' | 'bar'> {
  const c = chartColors();
  const axis = (showGrid: boolean, numeric: boolean, scaleId: 'x' | 'y') => ({
    grid: showGrid
      ? {
          // Fading-axis treatment — scriptable so the gradient tracks the
          // chartArea at draw time (resizes + theme remounts included).
          color: fadingGridColor(scaleId, c.grid),
          drawBorder: false,
        }
      : { display: false, drawBorder: false },
    ticks: {
      color: c.text,
      // Numeric axes use the mono stack — tabular numerals keep tick
      // columns optically aligned; category axes keep the Arabic sans
      // stack (day names, course names).
      font: { family: numeric ? fontMono() : fontSans(), size: 11 },
      padding: 6,
    },
    border: { display: false },
    display: true,
  });
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: chartAnimation(),
    interaction: {
      mode: 'index',
      intersect: false,
    },
    elements: {
      line: {
        // Contract §dataset-defaults: gentle smoothing, hairline stroke.
        tension: 0.32,
        borderWidth: 2,
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
      },
      point: {
        radius: 0,
        hoverRadius: 4,
        hoverBorderWidth: 2,
        hoverBackgroundColor: c.surface,
      },
      bar: {
        borderRadius: 4,
        borderSkipped: false,
      },
    },
    plugins: {
      legend: opts?.legend
        ? {
            position: 'bottom',
            rtl: true,
            textDirection: 'rtl',
            labels: {
              color: c.text,
              font: { family: fontSans(), size: 12 },
              padding: 16,
              usePointStyle: true,
              boxHeight: 6,
              boxWidth: 6,
            },
          }
        : { display: false },
      tooltip: tooltip(),
      ...(opts?.gradientFill ? { madarekGradientFill: { enabled: true } } : {}),
    },
    scales: {
      // Vertical charts: categories on x, numbers on y — horizontal swaps.
      x: axis(!opts?.horizontal, !!opts?.horizontal, 'x'),
      y: axis(!!opts?.horizontal, !opts?.horizontal, 'y'),
    },
  } as ChartOptions<'line' | 'bar'>;
}

/** Base options for circular charts (Doughnut / Pie). */
export function radialOptions(opts?: {
  legend?: boolean;
  cutout?: string;
  /** Opt-in: doughnut center text drawn with --type-metric tokens
   *  (madarekCenterLabelPlugin — registered globally). */
  centerLabel?: { value: string; label?: string };
}): ChartOptions<'doughnut'> {
  const c = chartColors();
  const animation:
    | false
    | { duration: number; easing: 'easeOutQuart'; animateRotate: boolean; animateScale: boolean } =
    reducedMotionActive
      ? false
      : {
          // The slower register of the design scale for the rotate entrance.
          duration: readTokenNumber('--t-slower', 520),
          easing: 'easeOutQuart',
          animateRotate: true,
          animateScale: false,
        };
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: opts?.cutout ?? '70%',
    animation,
    elements: {
      arc: {
        borderWidth: 0,
        spacing: 2,
        borderRadius: 4,
      } as ChartOptions<'doughnut'>['elements'] extends { arc?: infer A } ? A : never,
    },
    plugins: {
      legend:
        opts?.legend === false
          ? { display: false }
          : {
              position: 'bottom',
              rtl: true,
              textDirection: 'rtl',
              labels: {
                color: c.text,
                font: { family: fontSans(), size: 12 },
                padding: 14,
                usePointStyle: true,
                boxHeight: 6,
                boxWidth: 6,
              },
            },
      tooltip: tooltip(),
      ...(opts?.centerLabel ? { madarekCenterLabel: opts.centerLabel } : {}),
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
  afterDatasetsDraw(chart: Chart) {
    const { ctx } = chart;
    const color = chartColors().text;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `600 11px ${fontSans()}`;
    chart.data.datasets.forEach((ds: ChartDataset, di: number) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.type !== 'bar') return;
      meta.data.forEach((el, i) => {
        // Chart.js bar elements expose { x, y, width, height } at runtime.
        // The library type is generic; narrow to the shape we use.
        const barEl = el as unknown as { x: number; y: number; width: number; height: number };
        const v = (ds.data as (number | null)[])[i];
        if (v == null) return;
        const horizontal = barEl.width > barEl.height;
        ctx.textAlign = horizontal ? 'left' : 'center';
        ctx.textBaseline = horizontal ? 'middle' : 'bottom';
        const x = horizontal ? barEl.x + 6 : barEl.x;
        const y = horizontal ? barEl.y : barEl.y - 4;
        ctx.fillText(String(v), x, y);
      });
    });
    ctx.restore();
  },
};

/* ─── Chart.js plugins (contract plugin set) ───────────────────────── */

/**
 * madarekTooltip — installs the designed DOM tooltip on charts whose
 * options don't already carry it (the inline-option holdouts). Charts
 * built through cartesianOptions()/radialOptions() already embed the
 * external handler in their tooltip options, so this hook skips them;
 * a consumer that sets `tooltip: { enabled: false }` (dash progress
 * doughnut) keeps tooltips fully disabled. Also owns the hide-on-destroy
 * cleanup for the shared tooltip element.
 */
export const madarekTooltipPlugin: Plugin = {
  id: 'madarekTooltip',
  beforeInit(chart) {
    const options = chart.config.options;
    if (!options) return;
    options.plugins ??= {};
    const tooltipOpts = options.plugins.tooltip ??= {};
    if (typeof tooltipOpts.external === 'function') return;
    if (tooltipOpts.enabled === false) return;
    tooltipOpts.enabled = false;
    tooltipOpts.external = drawMadarekTooltip;
  },
  afterDestroy(chart) {
    if (tooltipOwner === chart && tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipOwner = null;
    }
  },
};

/**
 * madarekFadingAxis — decorates a chart's raw x/y scale config with the
 * fading grid color. Charts built through cartesianOptions() already
 * carry it (marker-guarded, idempotent); this hook covers charts with
 * hand-written scales that did NOT set an explicit grid.color — an
 * explicit custom color is respected and left untouched (use the
 * exported fadingGridColor() helper to fade a custom base color).
 */
export const madarekFadingAxisPlugin: Plugin = {
  id: 'madarekFadingAxis',
  beforeInit(chart) {
    const options = chart.config.options;
    const scales = options?.scales;
    if (!scales) return;
    const base = chartColors().grid;
    for (const scaleId of ['x', 'y'] as const) {
      const scale = scales[scaleId] as { grid?: { color?: unknown } } | undefined;
      if (!scale) continue;
      scale.grid ??= {};
      if (scale.grid.color !== undefined) continue;
      scale.grid.color = fadingGridColor(scaleId, base);
    }
  },
};

/**
 * madarekGradientFill — converts filled line-dataset areas into vertical
 * accent-fading gradients (the previously zero-consumer lineFillGradient,
 * now automatic). Opt in per chart:
 *
 *   options={cartesianOptions({ gradientFill: true })}
 *   // or: options={{ ..., plugins: { madarekGradientFill: { enabled: true } } }}
 *
 * Runs in beforeDatasetsDraw — before the Filler plugin paints areas —
 * and rebuilds the gradient every draw, so resizes and theme remounts
 * re-resolve the accent automatically.
 */
export const madarekGradientFillPlugin: Plugin = {
  id: 'madarekGradientFill',
  defaults: { enabled: false },
  beforeDatasetsDraw(chart: Chart, _args: unknown, options: Partial<MadarekGradientFillOptions>) {
    if (!options.enabled) return;
    const area = chart.chartArea;
    if (!area) return;
    chart.data.datasets.forEach((_ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.type !== 'line') return;
      const filler = (meta as { $filler?: { fill: string | false | undefined } }).$filler;
      if (!filler || filler.fill === false) return;
      const line = meta.dataset as
        | { options?: { borderColor?: unknown; backgroundColor?: unknown } }
        | undefined;
      if (!line?.options) return;
      const stroke =
        typeof line.options.borderColor === 'string'
          ? line.options.borderColor
          : chartColors().accent;
      line.options.backgroundColor = safeLinearGradient(
        chart.ctx,
        0,
        area.top,
        0,
        area.bottom,
        areaGradientStops(stroke),
        withAlpha(stroke, 0.12),
      );
    });
  },
};

/**
 * madarekCenterLabel — draws a value (+ optional caption) in the center
 * of a doughnut/pie using --type-metric / --type-label tokens. Opt in:
 *
 *   options={radialOptions({ cutout: '78%', centerLabel: { value: '85%', label: 'التقدّم' } })}
 *
 * Pair it with a cutout ≥ 60% so the text clears the arcs.
 */
export const madarekCenterLabelPlugin: Plugin = {
  id: 'madarekCenterLabel',
  defaults: {},
  afterDraw(chart: Chart, _args: unknown, options: Partial<MadarekCenterLabelOptions>) {
    const value = options.value;
    if (!value) return;
    const area = chart.chartArea;
    if (!area) return;
    const ctx = chart.ctx;
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const hasLabel = Boolean(options.label);
    const valueSize = readTokenNumber('--type-metric-size', 22);
    const valueWeight = readTokenNumber('--type-metric-weight', 700);
    const labelSize = readTokenNumber('--type-label-size-sm', 12);
    const labelWeight = readTokenNumber('--type-label-weight', 500);
    const gap = readTokenNumber('--sp-1', 4);
    ctx.save();
    ctx.textAlign = 'center';
    if ('direction' in ctx) {
      // Arabic shaping works regardless; direction keeps mixed runs RTL-ordered.
      ctx.direction = 'rtl';
    }
    ctx.textBaseline = hasLabel ? 'bottom' : 'middle';
    ctx.fillStyle = cssVar('--text', '#191918');
    ctx.font = `${valueWeight} ${valueSize}px ${fontSans()}`;
    ctx.fillText(value, cx, cy);
    if (hasLabel) {
      ctx.textBaseline = 'top';
      ctx.fillStyle = chartColors().text;
      ctx.font = `${labelWeight} ${labelSize}px ${fontSans()}`;
      ctx.fillText(options.label ?? '', cx, cy + gap);
    }
    ctx.restore();
  },
};

/* Registered once at module init so every chart — including the
   inline-option holdouts — runs the Madarek treatment. The gradient-fill
   and center-label plugins stay inert until a chart opts in via their
   options flags (defaults keep them disabled). */
Chart.register(
  madarekTooltipPlugin,
  madarekFadingAxisPlugin,
  madarekGradientFillPlugin,
  madarekCenterLabelPlugin,
);

/* ─── 012-design-graphics-uplift — theme-change observer ──────────────
   A tiny singleton that watches `<html data-theme>` for mutations and
   notifies subscribers. `useChartThemeKey()` consumes it via
   useSyncExternalStore so React stays in charge of re-rendering.

   Listeners receive the resolved theme string ('light' | 'dark'). The
   value is read directly from the attribute, so it always reflects the
   exact applied theme — independent of the zustand store's `mode`
   (which can be 'system' before resolving). */

let chartThemeKey = (() => {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme || 'light';
})();
const chartThemeListeners = new Set<() => void>();
let chartThemeObserverInstalled = false;

function ensureChartThemeObserver() {
  if (chartThemeObserverInstalled || typeof document === 'undefined') return;
  chartThemeObserverInstalled = true;
  const html = document.documentElement;
  const obs = new MutationObserver(() => {
    const next = html.dataset.theme || 'light';
    if (next !== chartThemeKey) {
      chartThemeKey = next;
      chartThemeListeners.forEach((cb) => cb());
    }
  });
  obs.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
}

function subscribeChartTheme(cb: () => void): () => void {
  ensureChartThemeObserver();
  chartThemeListeners.add(cb);
  return () => {
    chartThemeListeners.delete(cb);
  };
}

function getChartThemeKey() {
  return chartThemeKey;
}

/**
 * Returns the current applied theme string ('light' | 'dark') and
 * re-renders the calling component when `<html data-theme>` flips.
 * Pass the returned value as a React `key` on a Chart.js component to
 * force a remount on theme switch (and pick up fresh canvas colours).
 */
export function useChartThemeKey(): string {
  return useSyncExternalStore(
    subscribeChartTheme,
    getChartThemeKey,
    () => 'light',
  );
}

/** Test-only — reset the singletons. NOT exported via the public surface. */
export const __chartThemeTestUtils__ = {
  reset() {
    chartThemeListeners.clear();
    chartThemeObserverInstalled = false;
    chartThemeKey =
      typeof document === 'undefined'
        ? 'light'
        : document.documentElement.dataset.theme || 'light';
    reducedMotionActive = readMedia('(prefers-reduced-motion: reduce)');
    moreContrastActive = readMedia('(prefers-contrast: more)');
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
    tooltipOwner = null;
    tooltipSignature = '';
  },
  forceKey(next: string) {
    chartThemeKey = next;
    chartThemeListeners.forEach((cb) => cb());
  },
  /** Test-only — force the cached prefers-reduced-motion state. */
  forceReducedMotion(next: boolean) {
    reducedMotionActive = next;
  },
  /** Test-only — force the cached prefers-contrast state. */
  forceMoreContrast(next: boolean) {
    moreContrastActive = next;
  },
};
