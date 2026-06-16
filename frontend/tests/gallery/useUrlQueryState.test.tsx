import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUrlQueryState } from '../../src/hooks/useUrlQueryState';

function makeWrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe('useUrlQueryState', () => {
  it('reads initial state from the URL', () => {
    const { result } = renderHook(() => useUrlQueryState(), {
      wrapper: makeWrapper(['/colleges?q=هندس&campus=الزاوية']),
    });
    expect(result.current.state.query).toBe('هندس');
    expect(result.current.state.campus).toBe('الزاوية');
  });

  it('falls back to default state on a clean URL', () => {
    const { result } = renderHook(() => useUrlQueryState(), {
      wrapper: makeWrapper(['/colleges']),
    });
    expect(result.current.state.query).toBe('');
    expect(result.current.state.campus).toBeNull();
  });

  it('normalizes unknown campus values to null', () => {
    const { result } = renderHook(() => useUrlQueryState(), {
      wrapper: makeWrapper(['/colleges?campus=NotARealCity']),
    });
    expect(result.current.state.campus).toBeNull();
  });

  it('setCampus updates the URL immediately', async () => {
    type Hooks = {
      hook: ReturnType<typeof useUrlQueryState>;
      params: ReturnType<typeof useSearchParams>[0];
    };
    const { result } = renderHook<Hooks, void>(() => ({
      hook: useUrlQueryState(),
      params: useSearchParams()[0],
    }), {
      wrapper: makeWrapper(['/colleges']),
    });

    act(() => result.current.hook.setCampus('العجيلات'));
    expect(result.current.params.get('campus')).toBe('العجيلات');

    act(() => result.current.hook.setCampus(null));
    expect(result.current.params.get('campus')).toBeNull();
  });

  it('setQuery debounces the URL write', async () => {
    type Hooks = {
      hook: ReturnType<typeof useUrlQueryState>;
      params: ReturnType<typeof useSearchParams>[0];
    };
    const { result } = renderHook<Hooks, void>(() => ({
      hook: useUrlQueryState(),
      params: useSearchParams()[0],
    }), {
      wrapper: makeWrapper(['/colleges']),
    });

    act(() => result.current.hook.setQuery('هندس'));
    // Local state updates instantly:
    expect(result.current.hook.state.query).toBe('هندس');

    // Wait for the 100ms debounce.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    expect(result.current.params.get('q')).toBe('هندس');
  });

  it('clear strips both params', async () => {
    type Hooks = {
      hook: ReturnType<typeof useUrlQueryState>;
      params: ReturnType<typeof useSearchParams>[0];
    };
    const { result } = renderHook<Hooks, void>(() => ({
      hook: useUrlQueryState(),
      params: useSearchParams()[0],
    }), {
      wrapper: makeWrapper(['/colleges?q=هندس&campus=الزاوية']),
    });

    act(() => result.current.hook.clear());
    expect(result.current.params.get('q')).toBeNull();
    expect(result.current.params.get('campus')).toBeNull();
    expect(result.current.hook.state.query).toBe('');
    expect(result.current.hook.state.campus).toBeNull();
  });

  it('empty / whitespace query strips q from URL', async () => {
    type Hooks = {
      hook: ReturnType<typeof useUrlQueryState>;
      params: ReturnType<typeof useSearchParams>[0];
    };
    const { result } = renderHook<Hooks, void>(() => ({
      hook: useUrlQueryState(),
      params: useSearchParams()[0],
    }), {
      wrapper: makeWrapper(['/colleges?q=هندس']),
    });

    act(() => result.current.hook.setQuery('   '));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    expect(result.current.params.get('q')).toBeNull();
  });
});
