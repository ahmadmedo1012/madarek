/**
 * useThemeProfileSync tests (audit P1-3).
 *
 * The fingerprint guard must include the LOCAL theme state: after the
 * first sync, an in-session toggle has to reach `PUT /me/theme`
 * without waiting for the next sign-in — while a server echo of our
 * own push must NOT trigger a second put (no loop).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockMe = vi.fn();
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => mockMe(),
}));

vi.mock('../../src/lib/api', () => ({
  api: { put: vi.fn().mockResolvedValue({}), get: vi.fn(), post: vi.fn() },
  unwrap: vi.fn(),
}));

import { useThemeProfileSync } from '../../src/hooks/useThemeProfileSync';
import { useThemeStore } from '../../src/stores/theme.store';
import { api } from '../../src/lib/api';

const putMock = vi.mocked(api.put);

type ServerPreference = 'LIGHT' | 'DARK' | 'SYSTEM';

let me: { id: string; themePreference: ServerPreference; themePreferenceUpdatedAt: string };

function setProfile(pref: ServerPreference, at: string): void {
  me = { id: 'u1', themePreference: pref, themePreferenceUpdatedAt: at };
}

beforeEach(() => {
  vi.clearAllMocks();
  useThemeStore.setState({ mode: 'system', modeUpdatedAt: 0 });
  localStorage.removeItem('madarek-theme');
  setProfile('SYSTEM', '2024-01-01T00:00:00.000Z');
  mockMe.mockImplementation(() => ({ data: me }));
});

describe('useThemeProfileSync', () => {
  it('pushes an explicit local choice over a SYSTEM profile on first sync', () => {
    useThemeStore.setState({ mode: 'light', modeUpdatedAt: Date.now() });
    renderHook(() => useThemeProfileSync());

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith('/me/theme', { themePreference: 'LIGHT' });
  });

  it('P1-3: pushes again when the user toggles the theme later in the same session', () => {
    useThemeStore.setState({ mode: 'light', modeUpdatedAt: Date.now() - 5_000 });
    const { rerender } = renderHook(() => useThemeProfileSync());
    expect(putMock).toHaveBeenCalledTimes(1); // initial sync pushed LIGHT

    // In-session toggle — the old fingerprint ignored this and the
    // push never happened until the next sign-in.
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    rerender();

    expect(putMock).toHaveBeenCalledTimes(2);
    expect(putMock).toHaveBeenLastCalledWith('/me/theme', { themePreference: 'DARK' });
  });

  it('does not re-push when the server echoes our own value back (no put-loop)', () => {
    useThemeStore.setState({ mode: 'dark', modeUpdatedAt: Date.now() });
    const { rerender } = renderHook(() => useThemeProfileSync());
    expect(putMock).toHaveBeenCalledTimes(1); // pushed DARK over SYSTEM

    // useMe refetches: server adopted DARK with a fresh timestamp.
    setProfile('DARK', new Date().toISOString());
    act(() => {
      rerender();
    });

    expect(putMock).toHaveBeenCalledTimes(1); // values agree → no-op
  });

  it('pulls an explicit profile over a defaulting local (no put)', () => {
    setProfile('DARK', '2024-06-01T00:00:00.000Z');
    renderHook(() => useThemeProfileSync());

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().modeUpdatedAt).toBe(
      new Date('2024-06-01T00:00:00.000Z').getTime(),
    );
    expect(putMock).not.toHaveBeenCalled();
  });

  it('conflict: a newer local choice wins and is pushed', () => {
    useThemeStore.setState({ mode: 'light', modeUpdatedAt: Date.now() });
    setProfile('DARK', new Date(Date.now() - 60_000).toISOString());
    renderHook(() => useThemeProfileSync());

    expect(putMock).toHaveBeenCalledWith('/me/theme', { themePreference: 'LIGHT' });
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('does nothing while unauthenticated', () => {
    mockMe.mockImplementation(() => ({ data: undefined }));
    useThemeStore.setState({ mode: 'dark', modeUpdatedAt: Date.now() });
    renderHook(() => useThemeProfileSync());

    expect(putMock).not.toHaveBeenCalled();
  });
});
