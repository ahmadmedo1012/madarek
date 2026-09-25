/**
 * useThemeProfileSync tests (audit P1-3 + wave 23-a / A5 P2-5).
 *
 * Two contracts live here:
 *
 *   P1-3 — the fingerprint guard must include the LOCAL theme state:
 *   after the first sync, an in-session toggle has to reach
 *   `PUT /me/theme` without waiting for the next sign-in, while a
 *   server echo of our own push must NOT trigger a second put.
 *
 *   A5 P2-5 (23-a) — the push path is restricted to EXPLICIT
 *   in-session user choices. A local value that arrived from storage
 *   (persist rehydration, a restored backup, clock skew, a probe
 *   script with a fresh modeUpdatedAt) must NEVER write through to
 *   the account preference; storage-sourced values sync downward
 *   only, and the observed profile is cached in localStorage for the
 *   index.html pre-paint bootstrap.
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

const PROFILE_CACHE = 'mdrk-theme-profile';

beforeEach(() => {
  vi.clearAllMocks();
  useThemeStore.setState({ mode: 'system', modeUpdatedAt: 0 });
  localStorage.removeItem('madarek-theme');
  localStorage.removeItem(PROFILE_CACHE);
  setProfile('SYSTEM', '2024-01-01T00:00:00.000Z');
  mockMe.mockImplementation(() => ({ data: me }));
});

describe('useThemeProfileSync — push contract (explicit user action only)', () => {
  it('P1-3: an in-session toggle reaches PUT /me/theme without a re-sign-in', () => {
    const { rerender } = renderHook(() => useThemeProfileSync());
    // Local is still the storage default — nothing to push yet.
    expect(putMock).not.toHaveBeenCalled();

    // In-session user toggle — the old fingerprint ignored this and
    // the push never happened until the next sign-in.
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    rerender();

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith('/me/theme', { themePreference: 'DARK' });
  });

  it('A5 P2-5: a storage-sourced explicit choice NEVER pushes (no write-through)', () => {
    // The exact audit incident: a probe/backup wrote a fresh explicit
    // mode + modeUpdatedAt into localStorage; the old code pushed it
    // over the account preference on the next `me` observation.
    useThemeStore.setState({ mode: 'light', modeUpdatedAt: Date.now() });
    renderHook(() => useThemeProfileSync());

    expect(putMock).not.toHaveBeenCalled();
    // The stored choice is kept locally (no pull over it either —
    // the profile default never erases a device's explicit choice).
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('A5 P2-5: a storage-sourced NEWER local choice does not push and is not pulled over', () => {
    const localTs = Date.now();
    useThemeStore.setState({ mode: 'light', modeUpdatedAt: localTs });
    setProfile('DARK', new Date(localTs - 60_000).toISOString()); // profile older
    renderHook(() => useThemeProfileSync());

    expect(putMock).not.toHaveBeenCalled();
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('a server echo of our own push does not re-put (no loop)', () => {
    const { rerender } = renderHook(() => useThemeProfileSync());
    act(() => {
      useThemeStore.getState().setMode('dark');
    });
    rerender();
    expect(putMock).toHaveBeenCalledTimes(1); // the toggle pushed DARK

    // useMe refetches: server adopted DARK with a fresh timestamp.
    setProfile('DARK', new Date().toISOString());
    act(() => {
      rerender();
    });

    expect(putMock).toHaveBeenCalledTimes(1); // values agree → no-op
  });

  it('an in-session toggle wins even when the profile timestamp is newer (the click is the latest signal)', () => {
    const { rerender } = renderHook(() => useThemeProfileSync());
    // Profile flips to a newer explicit value while the session runs.
    setProfile('DARK', new Date().toISOString());
    rerender();

    act(() => {
      useThemeStore.getState().setMode('light');
    });
    rerender();

    expect(putMock).toHaveBeenCalledWith('/me/theme', { themePreference: 'LIGHT' });
  });

  it('does nothing while unauthenticated', () => {
    mockMe.mockImplementation(() => ({ data: undefined }));
    useThemeStore.setState({ mode: 'dark', modeUpdatedAt: Date.now() });
    renderHook(() => useThemeProfileSync());

    expect(putMock).not.toHaveBeenCalled();
  });
});

describe('useThemeProfileSync — pull contract', () => {
  it('pulls an explicit profile over a defaulting local (no put)', () => {
    setProfile('DARK', '2024-06-01T00:00:00.000Z');
    renderHook(() => useThemeProfileSync());

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().modeUpdatedAt).toBe(
      new Date('2024-06-01T00:00:00.000Z').getTime(),
    );
    expect(putMock).not.toHaveBeenCalled();
  });

  it('pulls a strictly newer profile over a storage-sourced explicit local', () => {
    const localTs = Date.parse('2024-06-01T00:00:00.000Z');
    useThemeStore.setState({ mode: 'light', modeUpdatedAt: localTs });
    setProfile('DARK', '2024-06-02T00:00:00.000Z');
    renderHook(() => useThemeProfileSync());

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(putMock).not.toHaveBeenCalled();
  });

  it('a pull followed by an in-session toggle still pushes (pull is not mistaken for a user choice)', () => {
    setProfile('DARK', '2024-06-01T00:00:00.000Z');
    const { rerender } = renderHook(() => useThemeProfileSync());
    expect(useThemeStore.getState().mode).toBe('dark'); // pulled
    expect(putMock).not.toHaveBeenCalled();

    // The user now actively picks light — must push (not be
    // classified as "just another hydration value").
    act(() => {
      useThemeStore.getState().setMode('light');
    });
    rerender();

    expect(putMock).toHaveBeenCalledWith('/me/theme', { themePreference: 'LIGHT' });
  });

  it('keeps the storage default when the profile is SYSTEM (no pull to system, no push)', () => {
    useThemeStore.setState({ mode: 'light', modeUpdatedAt: Date.now() });
    renderHook(() => useThemeProfileSync());

    expect(useThemeStore.getState().mode).toBe('light');
    expect(putMock).not.toHaveBeenCalled();
  });
});

describe('useThemeProfileSync — pre-paint cache (index.html bootstrap source)', () => {
  it('caches the observed profile preference with its timestamp', () => {
    const at = '2024-06-01T00:00:00.000Z';
    setProfile('DARK', at);
    renderHook(() => useThemeProfileSync());

    expect(JSON.parse(localStorage.getItem(PROFILE_CACHE) ?? 'null')).toEqual({
      pref: 'DARK',
      ts: Date.parse(at),
    });
  });

  it('caches a SYSTEM profile too (bootstrap treats it as "no explicit choice")', () => {
    renderHook(() => useThemeProfileSync());

    expect(JSON.parse(localStorage.getItem(PROFILE_CACHE) ?? 'null')).toEqual({
      pref: 'SYSTEM',
      ts: Date.parse('2024-01-01T00:00:00.000Z'),
    });
  });

  it('does not write the cache while unauthenticated', () => {
    mockMe.mockImplementation(() => ({ data: undefined }));
    renderHook(() => useThemeProfileSync());

    expect(localStorage.getItem(PROFILE_CACHE)).toBeNull();
  });
});
