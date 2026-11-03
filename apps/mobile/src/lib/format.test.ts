/**
 * R334 2-f — the numerals policy contract.
 *
 * Pins: formatNumber's two digit scripts, the LATIN DEFAULT (the app-wide
 * convention today — latn()/num() force Western digits; web parity is
 * ar-LY-u-nu-latn), the "—" fallbacks, and the persisted preference +
 * bound-formatter hook (zustand + AsyncStorage, the theme-store pattern).
 */
import { renderHook, act } from "@testing-library/react-native";
import {
  arabicIndic,
  formatNumber,
  NUMERALS_OPTIONS,
  setNumeralsPreference,
  useNumerals,
} from "./format";

describe("arabicIndic / latn — the pure digit-script transforms", () => {
  it("maps every Western digit to its Arabic-Indic glyph", () => {
    expect(arabicIndic(0)).toBe("٠");
    expect(arabicIndic(1234)).toBe("١٢٣٤");
    expect(arabicIndic(90)).toBe("٩٠");
  });

  it("leaves non-digit characters alone (signs, decimals, Arabic text)", () => {
    expect(arabicIndic(-12.5)).toBe("-١٢.٥");
    expect(arabicIndic("42%")).toBe("٤٢%");
    expect(arabicIndic("الفصل 3")).toBe("الفصل ٣");
  });

  it("latn is the exact inverse (round-trip via formatNumber, both ways)", () => {
    const n = 2026;
    const indic = arabicIndic(n); // "٢٠٢٦"
    // Number("٢٠٢٦") is NaN in JS — so the round-trip rides formatNumber's
    // string mode (the documented symmetric path):
    expect(formatNumber(indic, { numerals: "latin" })).toBe(String(n));
    expect(formatNumber(String(n), { numerals: "arabic-indic" })).toBe(indic);
  });
});

describe("formatNumber — the canonical formatter", () => {
  it("defaults to LATIN digits (today's app behavior, unchanged)", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(1234)).toBe("1234");
    expect(formatNumber(42, { numerals: "latin" })).toBe("42");
  });

  it("renders Arabic-Indic digits on request", () => {
    expect(formatNumber(42, { numerals: "arabic-indic" })).toBe("٤٢");
    expect(formatNumber(1234, { numerals: "arabic-indic" })).toBe("١٢٣٤");
    expect(formatNumber(-7.25, { numerals: "arabic-indic" })).toBe("-٧.٢٥");
  });

  it("accepts string fragments and converts their digits", () => {
    expect(formatNumber("42%", { numerals: "arabic-indic" })).toBe("٤٢%");
  });

  it("latin mode normalizes stray Arabic-Indic digits back (symmetric)", () => {
    expect(formatNumber("٤٢", { numerals: "latin" })).toBe("42");
  });

  it("never throws: null/undefined/NaN render the «—» fallback", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(formatNumber(Number.NaN, { numerals: "arabic-indic" })).toBe("—");
  });

  it("does not round or group — the value passes through as given", () => {
    expect(formatNumber(12.345)).toBe("12.345");
    expect(formatNumber(1234567)).toBe("1234567");
  });
});

describe("the persisted preference + hook", () => {
  it("defaults to latin (no behavior change until the user opts in)", async () => {
    const { result } = await renderHook(() => useNumerals());
    expect(result.current.numerals).toBe("latin");
    expect(result.current.formatNumber(15)).toBe("15");
  });

  it("setNumerals switches the bound formatter to Arabic-Indic", async () => {
    const { result } = await renderHook(() => useNumerals());
    await act(async () => {
      result.current.setNumerals("arabic-indic");
    });
    // The store re-rendered the hook (result.current is post-act state):
    expect(result.current.numerals).toBe("arabic-indic");
    expect(result.current.formatNumber(15)).toBe("١٥");
  });

  it("exposes both options with Arabic labels (settings UI ready)", () => {
    expect(NUMERALS_OPTIONS).toHaveLength(2);
    for (const o of NUMERALS_OPTIONS) {
      expect(["latin", "arabic-indic"]).toContain(o.id);
      expect(o.label.length).toBeGreaterThan(0);
    }
  });

  afterAll(() => {
    // Module-global store: restore the default for other suites.
    setNumeralsPreference("latin");
  });
});
