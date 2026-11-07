/**
 * R340 T-M5 (LR-001) — AppNavigationBar: theme-derived Android navigation
 * bar (expo-navigation-bar), the bottom-side sibling of AppStatusBar.
 *
 * WHY THIS EXISTS: SDK 58 enforces Android edge-to-edge — system bars are
 * transparent and content draws behind them. The top side is owned by
 * `AppStatusBar` (expo-status-bar + the root-view tint via expo-system-ui).
 * The bottom side — the gesture handle / 3-button bar — is OS-managed, and
 * under edge-to-edge its contrast is NOT free: on the dark charcoal theme
 * the gesture handle can sit on low-contrast content. LR-001 (docs/mobile/
 * LEAD-REQUESTS.md) made the dependency a lead decision; r340/T-M5 resolves
 * it by adding `expo-navigation-bar@~58.0.4` + the plugin config
 * (`enforceContrast: true` — the translucent scrim behind the handle) and
 * this runtime wiring.
 *
 * SDK 58 API reality (verified from the installed package): the legacy
 * imperative surface (`setPositionAsync` / `setBackgroundColorAsync` /
 * `setButtonStyleAsync`) is GONE — under enforced edge-to-edge there is no
 * bar color to paint; the screen ground IS what shows through. What remains
 * is the declarative `<NavigationBar style>` component:
 *   · "light" — a light bar with DARK content (dark handle) → our light
 *     paper theme (#F6F6EE) wants this.
 *   · "dark"  — a dark bar with LIGHT content (light handle) → our dark
 *     charcoal theme (#282828) wants this.
 * Note the INVERTED naming vs status-bar `style` (there "light" = light
 * CONTENT): navigation-bar style describes the BAR, status-bar style the
 * CONTENT.
 *
 * The style is derived from the EFFECTIVE app theme (a user preference),
 * never the device scheme — same contract as `statusStyleFor`. The plugin's
 * static config only covers the pre-JS cold-boot moment; this component
 * corrects it as soon as the theme store hydrates.
 *
 * Verification labels (this sandbox has NO emulator — KVM absent):
 * `tsc`-verified · `jest`-verified · **device-UNVERIFIED** (the owner's
 * local/EAS preview build is the confirmation channel — see
 * docs/mobile/ANDROID-LOCAL.md).
 */
import { Platform } from "react-native";
import { NavigationBar, type NavigationBarStyle } from "expo-navigation-bar";
import type { ThemeName } from "./tokens";
import { useTheme } from "./theme";

/** The concrete styles this app ever sets (never `auto`/`inverted`). */
export type AppNavigationBarStyle = Extract<NavigationBarStyle, "light" | "dark">;

/**
 * Navigation-bar style for a theme: the bar describes itself, the OS picks
 * contrasting content (handle/buttons). Light paper → a light bar (dark
 * handle) · dark charcoal → a dark bar (light handle).
 */
export function navigationBarStyleFor(name: ThemeName): AppNavigationBarStyle {
  return name === "dark" ? "dark" : "light";
}

/**
 * Mount once at the root (app/_layout.tsx, beside AppStatusBar). Android
 * only — on iOS/web the package renders null anyway, but gating keeps the
 * contract explicit and jest deterministic. expo-navigation-bar merges
 * mounted instances in mount order (same semantics as expo-status-bar), so
 * a screen with a non-ground bottom band can mount its own
 * `<NavigationBar style>` later and win.
 */
export function AppNavigationBar() {
  const { name } = useTheme();
  if (Platform.OS !== "android") return null;
  return <NavigationBar style={navigationBarStyleFor(name)} />;
}
