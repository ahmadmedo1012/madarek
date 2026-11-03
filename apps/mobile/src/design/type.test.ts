/**
 * R334 2-f — Arabic typography helpers contract.
 *
 * Pins: the four roles sit on the LOADED IBM Plex Sans Arabic weights,
 * sizes come from the shared px ladder, the body leading survives the
 * 200% font-scale policy, direction helpers are explicit, and the scaled
 * touch floor never drops below 44.
 */
import { fontMap, fonts } from "./fonts";
import { type as ladder, touchFloor } from "./tokens";
import { FONT_SCALE_RANGE, ltrText, rtlText, scaledTouchFloor, typeStyles } from "./type";

// The registered FAMILY NAMES are the fontMap KEYS ("Body-Bold"…) — the
// map's VALUES are asset ids (mocked to 1 under jest), so pin on keys.
const PLEX_FAMILIES = (Object.keys(fontMap) as (keyof typeof fontMap)[]).filter((k) =>
  k.startsWith("Body-"),
);

describe("typeStyles — the four composing roles", () => {
  it("exists for display/title/body/numeric", () => {
    expect(Object.keys(typeStyles).sort()).toEqual(["body", "display", "numeric", "title"]);
  });

  it("uses ONLY the loaded IBM Plex Sans Arabic weights (never Alexandria/mono)", () => {
    for (const role of Object.values(typeStyles)) {
      expect(PLEX_FAMILIES).toContain(role.fontFamily);
      expect(role.fontFamily).not.toBe(fonts.display);
      expect(role.fontFamily).not.toBe(fonts.mono);
    }
  });

  it("sits on the shared px ladder rungs", () => {
    expect(typeStyles.display.fontSize).toBe(ladder.display); // 36
    expect(typeStyles.title.fontSize).toBe(ladder.sectionTitle); // 20
    expect(typeStyles.body.fontSize).toBe(ladder.body); // 13 — the Arabic floor
    expect(typeStyles.numeric.fontSize).toBe(ladder.statNumber); // 44
  });

  it("body matches <T variant=\"body\"> byte-for-byte (13/20 Regular)", () => {
    expect(typeStyles.body).toEqual({ fontFamily: fonts.body, fontSize: 13, lineHeight: 20 });
  });

  it("weight rungs are the hierarchy: bold display > semibold title/numeric > regular body", () => {
    expect(typeStyles.display.fontFamily).toBe(fonts.bodyBold);
    expect(typeStyles.title.fontFamily).toBe(fonts.bodySemiBold);
    expect(typeStyles.numeric.fontFamily).toBe(fonts.bodySemiBold);
    expect(typeStyles.body.fontFamily).toBe(fonts.body);
  });
});

describe("font-scale tolerance (the 100–200% policy)", () => {
  it("body leading is ≥1.5× — fixed iOS lineHeights don't clip at 200%", () => {
    const ratio = (typeStyles.body.lineHeight ?? 0) / (typeStyles.body.fontSize ?? 1);
    expect(ratio).toBeGreaterThanOrEqual(1.5);
  });

  it("every role keeps sane leading (≥1.15×) — heroes may run tighter", () => {
    for (const role of Object.values(typeStyles)) {
      const ratio = (role.lineHeight ?? 0) / (role.fontSize ?? 1);
      expect(ratio).toBeGreaterThan(1.15);
    }
  });

  it("the policy range is exactly 1–2 (documented, testable)", () => {
    expect(FONT_SCALE_RANGE.min).toBe(1);
    expect(FONT_SCALE_RANGE.max).toBe(2);
  });

  it("scaledTouchFloor never drops below the raw 44 floor", () => {
    expect(scaledTouchFloor()).toBeGreaterThanOrEqual(touchFloor);
    expect(scaledTouchFloor()).toBeGreaterThanOrEqual(44);
  });
});

describe("mixed-direction helpers", () => {
  it("rtlText pins the iOS paragraph direction to rtl", () => {
    expect(rtlText).toEqual({ writingDirection: "rtl" });
  });

  it("ltrText isolates LTR islands (direction + left alignment)", () => {
    expect(ltrText).toEqual({ writingDirection: "ltr", textAlign: "left" });
  });
});
