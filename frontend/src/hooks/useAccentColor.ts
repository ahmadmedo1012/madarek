import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';

export type AccentColorKey = 'blue' | 'teal' | 'purple' | 'rose' | 'amber' | 'emerald';

interface AccentColorValues {
  accent: string;
  hover: string;
  soft: string;
  border: string;
  fg: string;
}

const ACCENT_PRESETS: Record<AccentColorKey, AccentColorValues> = {
  blue: { accent: '#a3c9ff', hover: '#d3e4ff', soft: 'rgba(163,201,255,0.16)', border: 'rgba(163,201,255,0.45)', fg: '#001c38' },
  teal: { accent: '#2ddbde', hover: '#5af8fb', soft: 'rgba(45,219,222,0.16)', border: 'rgba(45,219,222,0.45)', fg: '#002020' },
  purple: { accent: '#c4b5fd', hover: '#ddd6fe', soft: 'rgba(196,181,253,0.16)', border: 'rgba(196,181,253,0.45)', fg: '#1e1b4b' },
  rose: { accent: '#fda4af', hover: '#fecdd3', soft: 'rgba(253,164,175,0.16)', border: 'rgba(253,164,175,0.45)', fg: '#4c0519' },
  amber: { accent: '#fbbf24', hover: '#fcd34d', soft: 'rgba(251,191,36,0.16)', border: 'rgba(251,191,36,0.45)', fg: '#451a03' },
  emerald: { accent: '#34d399', hover: '#6ee7b7', soft: 'rgba(52,211,153,0.16)', border: 'rgba(52,211,153,0.45)', fg: '#022c22' },
};

export const ACCENT_COLOR_KEYS: AccentColorKey[] = ['blue', 'teal', 'purple', 'rose', 'amber', 'emerald'];

interface AccentColorState {
  activeColor: AccentColorKey;
  setAccentColor: (color: AccentColorKey) => void;
}

/**
 * Applies accent color CSS custom properties to the document root.
 * These intentionally override the design-token --accent value so the
 * entire UI adapts to the user's color preference (particles, shadows, gradients, etc.).
 */
function applyAccentColors(color: AccentColorKey): void {
  if (typeof document === 'undefined') return;
  const values = ACCENT_PRESETS[color];
  const root = document.documentElement.style;
  root.setProperty('--accent', values.accent);
  root.setProperty('--accent-hover', values.hover);
  root.setProperty('--accent-soft', values.soft);
  root.setProperty('--accent-border', values.border);
  root.setProperty('--accent-fg', values.fg);
}

export const useAccentColorStore = create<AccentColorState>()(
  persist(
    (set) => ({
      activeColor: 'blue',
      setAccentColor: (color: AccentColorKey) => {
        applyAccentColors(color);
        set({ activeColor: color });
      },
    }),
    {
      name: 'madarek-accent-color',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyAccentColors(state.activeColor);
        }
      },
    },
  ),
);

/** Hook to sync accent color CSS vars on mount */
export function useAccentColor(): AccentColorState {
  const store = useAccentColorStore();

  useEffect(() => {
    applyAccentColors(store.activeColor);
  }, [store.activeColor]);

  return store;
}

export function getAccentPreset(key: AccentColorKey): AccentColorValues {
  return ACCENT_PRESETS[key];
}
