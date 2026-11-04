/**
 * R334 2-f — AppStatusBar contract.
 *
 * Pins: the theme→style derivation (paper gets dark ink icons, charcoal gets
 * light), the screen-level override, and that mounting never throws under
 * jest (the native Android path — root-view tint — is platform-gated and
 * device-side UNVERIFIED from this sandbox; see the module doc).
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { AppStatusBar, statusStyleFor } from "./statusbar";
import { setThemePreference } from "./theme";

describe("statusStyleFor — content must contrast the page ground", () => {
  it("light paper → dark content", () => {
    expect(statusStyleFor("light")).toBe("dark");
  });

  it("dark charcoal → light content", () => {
    expect(statusStyleFor("dark")).toBe("light");
  });

  it("is total: every theme name maps to a concrete style (never auto)", () => {
    expect(statusStyleFor("light")).not.toBe("auto");
    expect(statusStyleFor("dark")).not.toBe("auto");
  });
});

describe("AppStatusBar — mount behavior (RNTL v14: render is async)", () => {
  it("renders without throwing for both effective themes", async () => {
    setThemePreference("dark");
    const tree1 = await render(<AppStatusBar />);
    await tree1.unmount();

    setThemePreference("light");
    const tree2 = await render(<AppStatusBar />);
    await tree2.unmount();
    // No throw = pass; the styled output is a native element whose props we
    // intentionally do not pin here (expo-status-bar merges instances).
  });

  it("accepts a screen-level style override for non-ground top bands", async () => {
    setThemePreference("light");
    // An ink hero on the light theme needs light content:
    const tree = await render(<AppStatusBar style="light" />);
    await tree.unmount();
  });
});

// Restore the persisted default so later suites in this file tree are
// deterministic (the theme store is module-global, like the app's).
afterAll(() => {
  setThemePreference("light");
});
