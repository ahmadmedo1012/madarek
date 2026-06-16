import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  /**
   * Unix-ms timestamp of the last user-driven `setMode` call. Used by
   * `useThemeProfileSync` (012-design-graphics-uplift R-002) as the
   * tiebreak when the local choice and the authenticated profile's
   * `themePreference` disagree.
   *
   * Stays at 0 for the lifetime of a session that never explicitly
   * chose a theme (i.e. the user is on the default `'system'`); 0
   * always loses the tiebreak vs any non-zero server timestamp.
   */
  modeUpdatedAt: number;
  setMode: (mode: ThemeMode) => void;
  /**
   * Internal setter used by the profile-sync hook to apply a value
   * received from the server WITHOUT bumping the local timestamp.
   * Updating the timestamp here would corrupt the next sync window.
   */
  _hydrateFromProfile: (mode: ThemeMode, serverTs: number) => void;
  cycle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      modeUpdatedAt: 0,
      setMode: (mode) => set({ mode, modeUpdatedAt: Date.now() }),
      _hydrateFromProfile: (mode, serverTs) => set({ mode, modeUpdatedAt: serverTs }),
      cycle: () => {
        const order: ThemeMode[] = ['light', 'dark', 'system'];
        const idx = order.indexOf(get().mode);
        set({
          mode: order[(idx + 1) % order.length] ?? 'system',
          modeUpdatedAt: Date.now(),
        });
      },
    }),
    {
      name: 'madarek-theme',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted: unknown, version) => {
        // v1 → v2: add modeUpdatedAt = 0 so any saved server-side
        // theme wins on first sign-in after the upgrade.
        if (version < 2 && persisted && typeof persisted === 'object') {
          return { ...(persisted as Record<string, unknown>), modeUpdatedAt: 0 };
        }
        return persisted;
      },
    },
  ),
);

/** Resolve a `'system'` preference to an explicit theme based on OS preference. */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
