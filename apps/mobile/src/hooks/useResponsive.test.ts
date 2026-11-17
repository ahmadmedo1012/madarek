import { widthClassFor, CONTENT_MAX_WIDTH, WIDTH_MEDIUM, WIDTH_EXPANDED } from "./useResponsive";

/**
 * R366 A5 — the window classifier contract. Every threshold boundary is
 * pinned so a tablet/foldable/landscape flip cannot silently drift:
 *   360×640/412×915 portrait phones  → compact (bottom bar, phone column)
 *   600dp foldable-open, 890×411 landscape phone → medium (rail, column cap)
 *   840dp+ tablets → expanded
 */
describe("widthClassFor", () => {
  it("classifies portrait phones as compact", () => {
    expect(widthClassFor(320)).toBe("compact");
    expect(widthClassFor(360)).toBe("compact");
    expect(widthClassFor(390)).toBe("compact");
    expect(widthClassFor(412)).toBe("compact");
  });

  it("classifies the small-phone ceiling just under medium as compact", () => {
    expect(widthClassFor(WIDTH_MEDIUM - 1)).toBe("compact");
  });

  it("classifies foldables-open and landscape phones as medium", () => {
    expect(widthClassFor(WIDTH_MEDIUM)).toBe("medium");
    expect(widthClassFor(717)).toBe("medium"); // foldable open ≈ 717dp
    expect(widthClassFor(820)).toBe("medium");
  });

  it("classifies tablets landscape and above as expanded", () => {
    expect(widthClassFor(WIDTH_EXPANDED)).toBe("expanded");
    expect(widthClassFor(800)).toBe("medium"); // 800dp tablet portrait is still medium
    expect(widthClassFor(960)).toBe("expanded");
    expect(widthClassFor(1280)).toBe("expanded");
  });

  it("keeps the content column under the medium tier (the cap only bites ≥600dp)", () => {
    // The column must be wide enough for two-pane comfort but narrower than
    // the medium threshold so a medium window shows paper margins, not a
    // stretched column.
    expect(CONTENT_MAX_WIDTH).toBeGreaterThanOrEqual(560);
    expect(CONTENT_MAX_WIDTH).toBeLessThan(WIDTH_MEDIUM + 120);
  });
});
