/**
 * T057 — chartTheme observer unit tests.
 *
 * The hook `useChartThemeKey()` re-renders when `<html data-theme>`
 * mutates. Test surface:
 *   - returns the initial value of `[data-theme]`
 *   - emits new value when the attribute changes
 *   - tolerates absent attribute (defaults to 'light')
 *
 * Task 2-c additions (chart-treatment.md plugin set):
 *   - chartAnimation: design-scale durations + instant mode under
 *     prefers-reduced-motion
 *   - tooltip options route to the designed DOM tooltip (rtl, external)
 *   - external tooltip renders a token-styled surface with mono values
 *   - gradient stops are canvas-safe rgba (no color-mix for palette hex)
 *   - fading-axis grid gradient (+ prefers-contrast extent)
 *   - opt-in plugin flags (gradientFill / centerLabel)
 *   - center-label plugin draws with --type-metric tokens
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Chart, ChartOptions, ChartType, ScriptableContext, TooltipModel } from 'chart.js';
import {
  useChartThemeKey,
  chartColors,
  chartPalette,
  cartesianOptions,
  radialOptions,
  chartAnimation,
  lineFillGradient,
  madarekCenterLabelPlugin,
  __chartThemeTestUtils__,
} from '../../src/lib/chartTheme';

describe('useChartThemeKey', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    __chartThemeTestUtils__.reset();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('returns the initial data-theme value', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    __chartThemeTestUtils__.reset();
    const { result } = renderHook(() => useChartThemeKey());
    expect(result.current).toBe('dark');
  });

  it('flips when data-theme is mutated externally', async () => {
    const { result } = renderHook(() => useChartThemeKey());
    expect(result.current).toBe('light');

    act(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    await waitFor(() => expect(result.current).toBe('dark'));
  });

  it('flips back to light from dark', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    __chartThemeTestUtils__.reset();
    const { result } = renderHook(() => useChartThemeKey());
    expect(result.current).toBe('dark');

    act(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    await waitFor(() => expect(result.current).toBe('light'));
  });

  it('falls back to "light" when data-theme is absent', () => {
    document.documentElement.removeAttribute('data-theme');
    __chartThemeTestUtils__.reset();
    const { result } = renderHook(() => useChartThemeKey());
    expect(result.current).toBe('light');
  });

  it('does NOT re-render on unrelated attribute mutations', async () => {
    const { result, rerender: _rerender } = renderHook(() => useChartThemeKey());
    const initial = result.current;
    let renderCount = 0;
    renderHook(() => {
      renderCount++;
      return useChartThemeKey();
    });
    const baselineRenders = renderCount;

    act(() => {
      document.documentElement.setAttribute('lang', 'ar');
      document.documentElement.setAttribute('dir', 'rtl');
    });

    // Give MutationObserver a tick to confirm nothing fires.
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current).toBe(initial);
    expect(renderCount).toBe(baselineRenders);
  });
});

describe('chartColors / chartPalette', () => {
  const root = document.documentElement;

  afterEach(() => {
    // Inline custom properties are global on :root — clean them up so other
    // tests see the pristine fallbacks.
    root.style.removeProperty('--surface-3');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--chart-1');
  });

  it('resolves token values from :root at call time (no caching)', () => {
    root.style.setProperty('--surface-3', '#123456');
    root.style.setProperty('--accent', '#ABCDEF');
    expect(chartColors().surfaceMuted).toBe('#123456');
    expect(chartColors().accent).toBe('#ABCDEF');

    // Re-resolves on the next call — this is what lets a remounted chart
    // pick up new colours after a theme switch.
    root.style.setProperty('--accent', '#00FF00');
    expect(chartColors().accent).toBe('#00FF00');
  });

  it('falls back to documented defaults when the token is missing', () => {
    const c = chartColors();
    expect(c.surfaceMuted).toBe('#EDEDF0');
    expect(c.accent).toBe('#a3c9ff');
  });

  it('exposes an 8-color categorical palette driven by --chart-N tokens', () => {
    root.style.setProperty('--chart-1', '#0E5701');
    const palette = chartPalette();
    expect(palette).toHaveLength(8);
    expect(palette[0]).toBe('#0E5701');
  });
});

/* ═══ Task 2-c — motion profile ══════════════════════════════════════ */

describe('chartAnimation — design-scale durations + reduced motion', () => {
  afterEach(() => {
    __chartThemeTestUtils__.forceReducedMotion(false);
    document.documentElement.style.removeProperty('--t-slow');
    __chartThemeTestUtils__.reset();
  });

  it('falls inside the 380–520 design-scale window by default', () => {
    const animation = chartAnimation();
    expect(animation).not.toBe(false);
    expect((animation as { duration: number }).duration).toBeGreaterThanOrEqual(380);
    expect((animation as { duration: number }).duration).toBeLessThanOrEqual(520);
    expect((animation as { easing: string }).easing).toBe('easeOutQuart');
  });

  it('reads the live --t-slow token value from :root', () => {
    document.documentElement.style.setProperty('--t-slow', '440ms');
    expect((chartAnimation() as { duration: number }).duration).toBe(440);
  });

  it('returns false (instant) under prefers-reduced-motion, for every factory', () => {
    __chartThemeTestUtils__.forceReducedMotion(true);
    expect(chartAnimation()).toBe(false);
    expect(cartesianOptions().animation).toBe(false);
    expect(radialOptions().animation).toBe(false);
  });
});

/* ═══ Task 2-c — designed DOM tooltip ════════════════════════════════ */

describe('tooltip options — DOM surface replaces the canvas default', () => {
  function tooltipOptions(factory: () => ChartOptions<'line' | 'bar'> | ChartOptions<'doughnut'>): Record<string, unknown> {
    const plugins = (factory().plugins ?? {}) as { tooltip?: Record<string, unknown> };
    return plugins.tooltip ?? {};
  }

  it('wires the external handler with rtl + textDirection on cartesian charts', () => {
    const tooltip = tooltipOptions(() => cartesianOptions());
    expect(tooltip.enabled).toBe(false);
    expect(tooltip.rtl).toBe(true);
    expect(tooltip.textDirection).toBe('rtl');
    expect(typeof tooltip.external).toBe('function');
  });

  it('wires the same handler on radial charts', () => {
    const tooltip = tooltipOptions(() => radialOptions());
    expect(tooltip.enabled).toBe(false);
    expect(typeof tooltip.external).toBe('function');
  });
});

/** Minimal fake chart standing in for a live Chart.js instance. */
function fakeChart(extra: Record<string, unknown> = {}): Chart {
  return {
    canvas: {
      getBoundingClientRect: () => ({ left: 40, top: 60, width: 300, height: 150 }),
    },
    width: 300,
    height: 150,
    ...extra,
  } as unknown as Chart;
}

describe('external tooltip rendering — token-styled DOM surface', () => {
  beforeEach(() => {
    __chartThemeTestUtils__.reset();
  });

  afterEach(() => {
    __chartThemeTestUtils__.reset();
  });

  function externalHandler(): (args: { chart: Chart; tooltip: TooltipModel<ChartType> }) => void {
    const tooltip = cartesianOptions().plugins!.tooltip as { external: unknown };
    return tooltip.external as (args: { chart: Chart; tooltip: TooltipModel<ChartType> }) => void;
  }

  it('renders title, swatch and mono value with token-driven styles', () => {
    externalHandler()({
      chart: fakeChart(),
      tooltip: {
        opacity: 1,
        caretX: 150,
        caretY: 40,
        title: ['الأحد'],
        body: [{ before: [], lines: ['مستخدم نشط: 42'], after: [] }],
        labelColors: [{ backgroundColor: '#B57438', borderColor: '#B57438' }],
      } as unknown as TooltipModel<ChartType>,
    });

    const el = document.querySelector<HTMLElement>('.madarek-chart-tooltip');
    expect(el).not.toBeNull();
    // Decorative mirror of data already exposed via ChartFrame — hidden from AT.
    expect(el?.getAttribute('aria-hidden')).toBe('true');
    // Brand surface: token ground, hairline border, pop shadow, small radius.
    expect(el?.style.background).toBe('var(--surface)');
    expect(el?.style.border).toBe('1px solid var(--surface-border)');
    expect(el?.style.boxShadow).toBe('var(--shadow-pop)');
    expect(el?.style.borderRadius).toBe('var(--r-sm)');
    expect(el?.style.fontFamily).toBe('var(--font-sans)');
    expect(el?.style.opacity).toBe('1');
    expect(el?.textContent).toContain('الأحد');
    expect(el?.textContent).toContain('مستخدم نشط');

    const value = el?.querySelector('bdi');
    expect(value?.textContent).toBe('42');
    expect((value as HTMLElement).style.fontFamily).toBe('var(--font-mono)');
    expect((value as HTMLElement).style.fontVariantNumeric).toBe('tabular-nums');
  });

  it('positions the surface above the caret in page coordinates', () => {
    externalHandler()({
      chart: fakeChart(),
      tooltip: {
        opacity: 1,
        caretX: 150,
        caretY: 40,
        title: [],
        body: [{ before: [], lines: ['حضور: 90'], after: [] }],
        labelColors: [],
      } as unknown as TooltipModel<ChartType>,
    });

    const el = document.querySelector<HTMLElement>('.madarek-chart-tooltip');
    // caret view coords: 40 + 150 = 190 (x), 60 + 40 = 100 (y) — element
    // is placed above the caret, clamped to the viewport, offset by scroll.
    expect(el?.style.transform).toContain('translate3d(');
  });

  it('fades out (opacity 0) when the model reports opacity 0', () => {
    const handler = externalHandler();
    handler({
      chart: fakeChart(),
      tooltip: {
        opacity: 1,
        caretX: 10,
        caretY: 10,
        title: ['x'],
        body: [],
        labelColors: [],
      } as unknown as TooltipModel<ChartType>,
    });
    handler({
      chart: fakeChart(),
      tooltip: { opacity: 0 } as unknown as TooltipModel<ChartType>,
    });

    const el = document.querySelector<HTMLElement>('.madarek-chart-tooltip');
    expect(el?.style.opacity).toBe('0');
  });
});

/* ═══ Task 2-c — gradient fills (canvas-safe stops) ═════════════════ */

describe('gradient fills — rgba stops straight from palette hex', () => {
  it('builds rgba stops without color-mix for hex colors (audit 0-f P3-24)', () => {
    const stops: [number, string][] = [];
    const gradient = { addColorStop: (offset: number, color: string) => stops.push([offset, color]) };
    const chart = fakeChart({
      chartArea: { top: 0, bottom: 100, left: 0, right: 200 },
      ctx: { createLinearGradient: () => gradient },
    });

    const scriptable = lineFillGradient('#B57438');
    scriptable({ chart } as unknown as ScriptableContext<'line'>);

    // Contract §madarekGradientFillPlugin: 35% alpha at the curve → 0 at baseline.
    expect(stops[0]).toEqual([0, 'rgba(181, 116, 56, 0.35)']);
    expect(stops[2]).toEqual([1, 'rgba(181, 116, 56, 0)']);
    expect(stops.every(([, color]) => !color.includes('color-mix'))).toBe(true);
  });

  it('returns the flat color before the chart area is laid out', () => {
    const chart = fakeChart({ chartArea: undefined });
    const scriptable = lineFillGradient('#B57438');
    expect(scriptable({ chart } as unknown as ScriptableContext<'line'>)).toBe('#B57438');
  });
});

/* ═══ Task 2-c — fading-axis grid treatment ══════════════════════════ */

describe('fading-axis grid — scriptable edge-fade gradient', () => {
  const root = document.documentElement;

  afterEach(() => {
    root.style.removeProperty('--chart-grid');
    __chartThemeTestUtils__.forceMoreContrast(false);
    __chartThemeTestUtils__.reset();
  });

  function gradientStopsFor(scaleId: 'x' | 'y'): [number, string][] {
    root.style.setProperty('--chart-grid', 'rgba(25,25,24,0.08)');
    const options = cartesianOptions();
    const scales = options.scales as Record<string, { grid: { color: unknown } }>;
    const color = scales[scaleId]!.grid.color;
    expect(typeof color).toBe('function');
    const stops: [number, string][] = [];
    const chart = fakeChart({
      chartArea: { top: 0, bottom: 100, left: 0, right: 200 },
      ctx: { createLinearGradient: () => ({ addColorStop: (o: number, c: string) => stops.push([o, c]) }) },
    });
    const result = (color as (ctx: { chart: Chart }) => unknown)({ chart });
    expect(typeof result).toBe('object'); // the gradient itself
    return stops;
  }

  it('fades the visible grid (vertical lines on a vertical chart) with an 8% edge extent', () => {
    // Vertical chart: the x-scale grid (vertical lines) shows and fades
    // along the y axis; the y-scale grid is hidden by design.
    const stops = gradientStopsFor('x');
    expect(stops.map(([offset]) => offset)).toEqual([0, 0.08, 0.92, 1]);
    expect(stops[0]![1]).toBe('rgba(25, 25, 24, 0)');
    expect(stops[1]![1]).toBe('rgba(25,25,24,0.08)');
  });

  it('fades the horizontal gridlines of horizontal bar charts along x', () => {
    root.style.setProperty('--chart-grid', 'rgba(25,25,24,0.08)');
    const scales = cartesianOptions({ horizontal: true }).scales as Record<
      string,
      { grid: { color: unknown } }
    >;
    const stops: [number, string][] = [];
    const chart = fakeChart({
      chartArea: { top: 0, bottom: 100, left: 0, right: 200 },
      ctx: { createLinearGradient: () => ({ addColorStop: (o: number, c: string) => stops.push([o, c]) }) },
    });
    (scales.y!.grid.color as (ctx: { chart: Chart }) => unknown)({ chart });
    expect(stops.map(([offset]) => offset)).toEqual([0, 0.08, 0.92, 1]);
  });

  it('reduces the fade extent to 2% under prefers-contrast: more', () => {
    __chartThemeTestUtils__.forceMoreContrast(true);
    const stops = gradientStopsFor('x');
    expect(stops.map(([offset]) => offset)).toEqual([0, 0.02, 0.98, 1]);
  });
});

/* ═══ Task 2-c — opt-in plugin flags + tick fonts ════════════════════ */

describe('opt-in plugin flags + numeric tick typography', () => {
  it('raises the gradient-fill flag only when requested', () => {
    const withFlag = cartesianOptions({ gradientFill: true }).plugins as Record<string, unknown>;
    expect(withFlag.madarekGradientFill).toEqual({ enabled: true });
    const without = cartesianOptions().plugins as Record<string, unknown>;
    expect(without.madarekGradientFill).toBeUndefined();
  });

  it('wires the doughnut center-label options only when requested', () => {
    const withLabel = radialOptions({ centerLabel: { value: '85%', label: 'التقدّم' } })
      .plugins as Record<string, unknown>;
    expect(withLabel.madarekCenterLabel).toEqual({ value: '85%', label: 'التقدّم' });
    const without = radialOptions().plugins as Record<string, unknown>;
    expect(without.madarekCenterLabel).toBeUndefined();
  });

  it('gives numeric axes the mono stack and category axes the Arabic sans stack', () => {
    const scales = cartesianOptions().scales as {
      x: { ticks: { font: { family: string } } };
      y: { ticks: { font: { family: string } } };
    };
    // Vertical chart: y carries the numbers, x carries the day names.
    expect(scales.y.ticks.font.family).toContain('IBM Plex Mono');
    expect(scales.x.ticks.font.family).toContain('IBM Plex Sans Arabic');
    // Horizontal bar chart swaps the roles.
    const horizontal = cartesianOptions({ horizontal: true }).scales as {
      x: { ticks: { font: { family: string } } };
      y: { ticks: { font: { family: string } } };
    };
    expect(horizontal.x.ticks.font.family).toContain('IBM Plex Mono');
    expect(horizontal.y.ticks.font.family).toContain('IBM Plex Sans Arabic');
  });

  it('keeps legend rtl with explicit textDirection', () => {
    const legend = (cartesianOptions({ legend: true }).plugins as { legend: Record<string, unknown> }).legend;
    expect(legend.rtl).toBe(true);
    expect(legend.textDirection).toBe('rtl');
  });
});

/* ═══ Task 2-c — doughnut center label plugin ═══════════════════════ */

describe('madarekCenterLabelPlugin — afterDraw center text', () => {
  it('draws the value with --type-metric tokens and the label under it', () => {
    const calls: string[] = [];
    const ctx = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      textAlign: '',
      textBaseline: '',
      direction: 'ltr',
      fillStyle: '',
      font: '',
      fillText: (text: string, x: number, y: number) =>
        calls.push(`fillText:${text}@${Math.round(x)},${Math.round(y)}`),
    } as unknown as CanvasRenderingContext2D;
    const chart = fakeChart({
      chartArea: { top: 0, bottom: 200, left: 0, right: 200 },
      ctx,
    });

    madarekCenterLabelPlugin.afterDraw?.(
      chart,
      {},
      { value: '85%', label: 'التقدّم' },
    );

    const trace = calls.join('\n');
    // Center of the 200×200 area, value baseline at the middle, label below.
    expect(trace).toContain('fillText:85%@100,100');
    expect(trace).toContain('fillText:التقدّم@100,104');
    expect(ctx.font).toContain('500 12px'); // label resets the font last
    expect(calls[0]).toBe('save');
    expect(calls[calls.length - 1]).toBe('restore');
  });

  it('stays inert without a value', () => {
    const chart = fakeChart({
      chartArea: { top: 0, bottom: 200, left: 0, right: 200 },
      ctx: { save: () => {}, restore: () => {}, fillText: () => {} } as unknown as CanvasRenderingContext2D,
    });
    expect(() => madarekCenterLabelPlugin.afterDraw?.(chart, {}, {})).not.toThrow();
  });
});
