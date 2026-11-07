/**
 * R340 T-M5 (LR-001) — AppNavigationBar contract.
 *
 * Pins: the theme→style derivation (paper gets a light bar / dark handle,
 * charcoal a dark bar / light handle — note the naming is the BAR, not the
 * content, the inverse of status-bar `style`), totality (never `auto` — the
 * app theme is a user preference, not the device scheme; same bug class
 * AppStatusBar fixed), and that mounting never throws under jest (jest
 * resolves the package's non-Android build, which renders null; the native
 * path is device-side UNVERIFIED from this sandbox — see the module doc).
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { AppNavigationBar, navigationBarStyleFor } from "./navbar";
import { setThemePreference } from "./theme";

describe("navigationBarStyleFor — the bar contrasts via OS content, never auto", () => {
  it("light paper → a light bar (dark gesture handle)", () => {
    expect(navigationBarStyleFor("light")).toBe("light");
  });

  it("dark charcoal → a dark bar (light gesture handle)", () => {
    expect(navigationBarStyleFor("dark")).toBe("dark");
  });

  it("is total and never follows the device scheme", () => {
    // `auto` would resolve off Appearance.getColorScheme() — wrong the
    // moment the user preference diverges from the device (the R334 2-f bug).
    expect(navigationBarStyleFor("light")).not.toBe("auto");
    expect(navigationBarStyleFor("dark")).not.toBe("auto");
    expect(navigationBarStyleFor("dark")).not.toBe("inverted");
  });
});

describe("AppNavigationBar — mount behavior (RNTL v14: render is async)", () => {
  it("renders without throwing for both effective themes", async () => {
    setThemePreference("dark");
    const tree1 = await render(<AppNavigationBar />);
    await tree1.unmount();

    setThemePreference("light");
    const tree2 = await render(<AppNavigationBar />);
    await tree2.unmount();
    // No throw = pass; the styled output is a native-side element whose
    // props we intentionally do not pin (expo-navigation-bar merges
    // instances in mount order, like expo-status-bar).
  });
});

// Restore the persisted default so later suites in this file tree are
// deterministic (the theme store is module-global, like the app's).
afterAll(() => {
  setThemePreference("light");
});
