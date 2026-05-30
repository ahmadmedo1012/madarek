import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
      cycle: () => {
        const order: ThemeMode[] = ['light', 'dark', 'system'];
        const idx = order.indexOf(get().mode);
        set({ mode: order[(idx + 1) % order.length] ?? 'system' });
      },
    }),
    { name: 'madarek-theme', storage: createJSONStorage(() => localStorage) },
  ),
);

/** Resolve a `'system'` preference to an explicit theme based on OS preference. */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
