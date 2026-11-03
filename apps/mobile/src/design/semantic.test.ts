/**
 * R334 2-f — the semantic color layer contract.
 *
 * Pins: light/dark resolution of every seat, the shared-JSON mapping for the
 * status triples, the no-shadows elevation contract, and the ADDITIVE
 * theme.tsx extension (existing consumers keep their exact shape).
 */
import { semanticColorsFor, semanticThemeFor, hairlinesFor, SHADOW_KEYS, type SemanticColors } from "./semantic";
import { heron, statusTones } from "./tokens";
import { themeFor } from "./theme";

const SEMANTIC_KEYS: (keyof SemanticColors)[] = [
  "surface",
  "surfaceElevated",
  "sunken",
  "textPrimary",
  "textSecondary",
  "textTertiary",
  "accent",
  "accentInk",
  "accentSoft",
  "accentFg",
  "success",
  "warning",
  "danger",
];

describe("semanticColorsFor — light/dark resolution", () => {
  it("resolves every seat in both themes (no undefined leaks to styles)", () => {
    for (const name of ["light", "dark"] as const) {
      const c = semanticColorsFor(name);
      for (const key of SEMANTIC_KEYS) {
        expect(c[key]).toBeTruthy();
      }
    }
  });

  it("surfaces follow the Heron two-surface rule (ground / card / sunken)", () => {
    const light = semanticColorsFor("light");
    expect(light.surface).toBe("#F6F6EE"); // paper ground
    expect(light.surfaceElevated).toBe("#FFFFFF"); // card ground
    expect(light.sunken).toBe("#F0F0E6"); // shared surface2/bkSoft

    const dark = semanticColorsFor("dark");
    expect(dark.surface).toBe("#282828");
    expect(dark.surfaceElevated).toBe("#2E2E2E"); // the Card component's dark ground
    expect(dark.sunken).toBe("#353535"); // shared surface2 (dark)
  });

  it("sunken is one step BELOW card-on-ground in both themes (never equal to the ground)", () => {
    for (const name of ["light", "dark"] as const) {
      const c = semanticColorsFor(name);
      expect(c.sunken).not.toBe(c.surface);
      expect(c.sunken).not.toBe(c.surfaceElevated);
    }
  });

  it("text tiers are distinct inks (primary → secondary → tertiary)", () => {
    const light = semanticColorsFor("light");
    expect(light.textPrimary).toBe("#282828");
    expect(light.textSecondary).toBe("#414140");
    expect(light.textTertiary).toBe("#62625F");
    const dark = semanticColorsFor("dark");
    expect(dark.textPrimary).toBe("#F6F6EE");
    expect(dark.textSecondary).toBe("#C9C9C5");
    expect(dark.textTertiary).toBe("#B4B4B0");
  });
});

describe("the ONE accent", () => {
  it("is the brand orange in light and the luminous ember in dark", () => {
    expect(semanticColorsFor("light").accent).toBe("#FA3600");
    expect(semanticColorsFor("dark").accent).toBe("#FF5A1F");
  });

  it("body-size accent text has its own AA-safe ink (not the raw fill)", () => {
    const light = semanticColorsFor("light");
    expect(light.accentInk).not.toBe(light.accent);
    expect(light.accentInk).toBe("#C72E00");
    const dark = semanticColorsFor("dark");
    expect(dark.accentInk).not.toBe(dark.accent);
    expect(dark.accentInk).toBe("#FF6B33");
  });
});

describe("status triples — shared-JSON mapping (successInk = deep@light / ink@dark)", () => {
  it("success/warning/danger resolve fill/soft/ink from the tone families", () => {
    const light = semanticColorsFor("light");
    expect(light.success).toEqual({ fill: "#3F8F5C", soft: "#E3EBE1", ink: "#1B5430" });
    expect(light.warning).toEqual({ fill: "#A8750F", soft: "#F5EBD6", ink: "#5E420C" });
    expect(light.danger).toEqual({ fill: "#F15534", soft: "#F9E3DC", ink: "#8C230A" });

    const dark = semanticColorsFor("dark");
    expect(dark.success).toEqual({ fill: "#84D0A0", soft: "#24372B", ink: "#84D0A0" });
    expect(dark.warning).toEqual({ fill: "#EFC87B", soft: "#3B331F", ink: "#EFC87B" });
    expect(dark.danger).toEqual({ fill: "#FF8E68", soft: "#43241C", ink: "#FF8E68" });
  });

  it("stays in sync with the tone families it resolves from", () => {
    for (const name of ["light", "dark"] as const) {
      const c = semanticColorsFor(name);
      expect(c.success.soft).toBe(statusTones[name].mint.bg);
      expect(c.warning.fill).toBe(statusTones[name].yellow.ink);
      expect(c.danger.ink).toBe(name === "light" ? statusTones[name].rose.deep : statusTones[name].rose.ink);
    }
  });
});

describe("hairlines — elevation WITHOUT shadows", () => {
  it("border presets are the thinnest physical line and the 1px rule", () => {
    for (const name of ["light", "dark"] as const) {
      const h = hairlinesFor(name);
      expect(h.border.borderWidth).toBeGreaterThan(0);
      expect(h.border.borderWidth).toBeLessThanOrEqual(1);
      expect(h.border.borderColor).toBe(heron[name].border);
      expect(h.borderStrong.borderWidth).toBe(1);
      expect(h.borderStrong.borderColor).toBe(heron[name].rule);
      expect(h.separator.height).toBe(h.border.borderWidth);
      expect(h.separator.backgroundColor).toBe(heron[name].border);
    }
  });

  it("NO preset ever emits a shadow/elevation key (the Heron contract)", () => {
    for (const name of ["light", "dark"] as const) {
      const h = hairlinesFor(name);
      const allStyles = [h.border, h.borderStrong, h.separator] as Record<string, unknown>[];
      for (const style of allStyles) {
        for (const key of SHADOW_KEYS) {
          expect(style).not.toHaveProperty(key);
        }
      }
    }
  });
});

describe("semanticThemeFor — the bundle + the additive theme.tsx extension", () => {
  it("bundles name + colors + hairlines for the requested theme", () => {
    const t = semanticThemeFor("dark");
    expect(t.name).toBe("dark");
    expect(t.colors).toEqual(semanticColorsFor("dark"));
    expect(t.hairlines).toEqual(hairlinesFor("dark"));
  });

  it("themeFor keeps its existing shape and ADDS `semantic` (no break)", () => {
    for (const name of ["light", "dark"] as const) {
      const t = themeFor(name);
      // the pre-R334 contract, byte-for-byte:
      expect(t.name).toBe(name);
      expect(t.palette).toBe(heron[name]);
      expect(t.tones).toBe(statusTones[name]);
      // the additive seat:
      expect(t.semantic).toEqual(semanticThemeFor(name));
    }
  });
});
