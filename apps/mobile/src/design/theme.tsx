import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { heron, statusTones, type HeronPalette, type StatusTone, type StatusToneName, type ThemeName } from "./tokens";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const useThemeStore = create(
  persist<ThemeState>(
    (set) => ({
      preference: "light",
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: "madarek-mobile-theme",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function useThemePreference(): ThemePreference {
  return useThemeStore((s) => s.preference);
}

export function setThemePreference(p: ThemePreference) {
  useThemeStore.getState().setPreference(p);
}

/** Effective theme for the current preference + device scheme. */
export function useTheme(): { name: ThemeName; palette: HeronPalette; tones: Record<StatusToneName, StatusTone> } {
  const preference = useThemePreference();
  const system = useColorScheme();
  const name: ThemeName = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  return useMemo(
    () => ({ name, palette: heron[name], tones: statusTones[name] }),
    [name],
  );
}

export function themeFor(name: ThemeName) {
  return { name, palette: heron[name], tones: statusTones[name] };
}

/** Palette as a StyleSheet-compatible flat object (for non-hook contexts). */
export function usePalette(): HeronPalette {
  return useTheme().palette;
}

export function useStatusTones(): Record<StatusToneName, StatusTone> {
  return useTheme().tones;
}

/** Server profile sync: reflects the preference stored on the user record. */
export function useSyncThemeProfile(profilePreference: "LIGHT" | "DARK" | "SYSTEM" | null | undefined, enabled: boolean) {
  const preference = useThemePreference();
  const [appliedServer, setAppliedServer] = useState(false);
  useEffect(() => {
    if (!enabled || appliedServer || !profilePreference) return;
    const mapped = profilePreference.toLowerCase() as ThemePreference;
    if (mapped === preference) {
      setAppliedServer(true);
      return;
    }
    setThemePreference(mapped);
    setAppliedServer(true);
  }, [profilePreference, enabled, appliedServer, preference]);
}

export interface ThemeContextValue {
  name: ThemeName;
}

export const ThemeContext = createContext<ThemeContextValue>({ name: "light" });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { name } = useTheme();
  const value = useMemo(() => ({ name }), [name]);
  useEffect(() => {
    const el = globalThis.document?.documentElement;
    if (el) {
      el.setAttribute("dir", "rtl");
      el.setAttribute("lang", "ar");
      el.setAttribute("data-theme", name);
    }
  }, [name]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
