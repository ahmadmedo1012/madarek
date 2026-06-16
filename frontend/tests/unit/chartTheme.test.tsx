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
import { useChartThemeKey, __chartThemeTestUtils__ } from '../../src/lib/chartTheme';

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
