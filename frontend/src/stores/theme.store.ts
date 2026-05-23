import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

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

/** Resolve a `'system'` preference to either `'light'` or `'dark'` based on OS. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
  return mode;
}
