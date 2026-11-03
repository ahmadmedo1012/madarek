/**
 * R334 2-f — AppStatusBar: per-screen status-bar style on expo-status-bar.
 *
 * WHY THIS EXISTS: the root layout mounts ONE `<StatusBar style="auto" />`
 * (app/_layout.tsx). `auto` follows the DEVICE scheme — but this app's theme
 * is a USER PREFERENCE (light/dark/system via /settings + zustand persist),
 * so a user who forces «فاتح» on a dark-mode phone gets light content
 * (dark icons) over a light paper bar from `auto`, then the wrong reading
 * once screens override. Per-screen AppStatusBar derives the style from the
 * EFFECTIVE app theme, not the device scheme.
 *
 * SDK 58 / Android edge-to-edge implications (verified from the installed
 * packages — see docs/mobile/foundations/theming.md for the full note):
 *   · Edge-to-edge is the enforced default on Android (API 35 target; the
 *     `react-native-is-edge-to-edge` shim ships in the dependency tree).
 *     System bars are TRANSPARENT and content draws behind them.
 *   · expo-status-bar@58 removed the `backgroundColor` prop entirely (its
 *     types expose only style/animated/hidden/hideTransitionAnimation/
 *     verticalBarBehaviorIOS) — bar GROUNDS are no longer paintable.
 *   · React Native 0.88's StatusBar likewise carries no setBackgroundColor.
 *   · Therefore the Android "navigation-bar color" is achieved the
 *     edge-to-edge way: the screen ground itself IS what shows through the
 *     transparent bars. This helper tints the ROOT VIEW to the theme's page
 *     ground (expo-system-ui setBackgroundColorAsync) so the overscroll /
 *     cold-boot gap behind the transparent bars never flashes white in dark
 *     mode. expo-navigation-bar (contrast enforcement for gesture-handle
 *     scrim) is NOT a dependency — flagged in the docs; adding it is a
 *     LEAD decision (new dep), not silent here.
 *   · Status-bar ICON/CLOCK appearance (`style`) still works cross-platform:
 *     expo-status-bar maps it onto the platform appearance APIs. The exact
 *     native path on Android edge-to-edge is UNVERIFIED on device from this
 *     sandbox (no emulator — KVM absent); types + module code verified only.
 */
import { useEffect } from "react";
import { Platform } from "react-native";
import { StatusBar, type StatusBarStyle } from "expo-status-bar";
import { heron, type ThemeName } from "./tokens";
import { useTheme } from "./theme";

/**
 * Status-bar content style for a theme: the icons/clock must contrast the
 * PAGE GROUND the transparent bar sits over.
 * Light paper → dark ink icons · dark charcoal → light icons.
 */
export function statusStyleFor(name: ThemeName): StatusBarStyle {
  return name === "dark" ? "light" : "dark";
}

/** expo-status-bar style accepted as a screen-level override. */
export type { StatusBarStyle };

export interface AppStatusBarProps {
  /**
   * Override the theme-derived style for screens whose top band is NOT the
   * page ground (e.g. a full-bleed accent/ink hero). Default: derive from
   * the effective theme.
   */
  style?: StatusBarStyle;
  /** Animate style transitions (default true; pass false for cold mounts). */
  animated?: boolean;
}

/**
 * Mount once per screen (expo-status-bar merges multiple mounted instances
 * in mount order — the most recent screen wins, which is exactly the
 * per-screen behavior we want under expo-router).
 */
export function AppStatusBar({ style, animated = true }: AppStatusBarProps) {
  const { name } = useTheme();

  // Android edge-to-edge: the transparent system bars reveal the root view
  // wherever no screen content has drawn yet. Keep it the theme's page
  // ground. Lazy dynamic import: no native module touched at import time
  // (jest / web export stay clean); a failure is non-fatal by design.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void (async () => {
      try {
        const { setBackgroundColorAsync } = await import("expo-system-ui");
        await setBackgroundColorAsync(heron[name].bg);
      } catch {
        // Root-view tint is cosmetic; never let it break a screen.
      }
    })();
  }, [name]);

  return <StatusBar style={style ?? statusStyleFor(name)} animated={animated} />;
}
