/**
 * T057 — chartTheme observer unit tests.
 *
 * The hook `useChartThemeKey()` re-renders when `<html data-theme>`
 * mutates. Test surface:
 *   - returns the initial value of `[data-theme]`
 *   - emits new value when the attribute changes
 *   - tolerates absent attribute (defaults to 'light')
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useChartThemeKey, chartColors, chartPalette, __chartThemeTestUtils__ } from '../../src/lib/chartTheme';

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
