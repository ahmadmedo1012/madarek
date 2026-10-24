/**
 * HeroInkWindow — R315 (B1 · owner §0-A.1): the hero window shows the
 * WHOLE frontal elevation of Madarek's own ink building, centred on
 * TRANSPARENT paper — no crop, no white box.
 *
 * R314 rode a raster fragment (object-fit-cover crop of a photo
 * derivative on a white rectangle) — the owner's §0-A.1 verdict kills
 * that seat. The window returns to the drafted ElevationDrawing
 * (own subject, own licence — never Heron's artwork), seated so the
 * full facade + both trees + the ground line + the two orange pin
 * squares fit with generous empty paper around them, exactly like the
 * measured reference composition (elevation ≈958×402 centred in the
 * 1407×680 window @1440 — r313 digest/telemetry, 67% of the width).
 *
 * ONE coordinate frame is kept (the R314 contract): the window is the
 * shared 1440×720 .bp-svg frame; the HeroInspect instrument (guides,
 * 8×8 plus, readout, drag box, stations) remaps its authored
 * elevation-space anchors through HERO_SEAT below.
 */
import { ElevationArt } from './ElevationDrawing';

/* The hero window's viewBox — the SINGLE shared frame: pins, stations,
 * guides and drag math all remap through THIS frame (R314 → R315). */
export const HERO_FRAME = { w: 1440, h: 720 } as const;

/* The elevation's seat inside the frame. The hero-variant artwork
 * spans x 112…1390 / y 64…516 in its own 1440×640 sheet space; at
 * scale 0.882 it renders ≈1127×399 frame units ≈ 958×339px @1440×900 —
 * 67% of the window width, centred (157 frame units of paper each
 * side), riding low-centred like the reference's measured band
 * (art top ≈144px / ground ≈472px of the 612px frame @900). */
export const HERO_SEAT = { x: 58, y: 114, s: 0.882 } as const;

export function HeroInkWindow() {
  return (
    <svg
      className="bp-svg"
      viewBox="0 0 1440 720"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="الواجهة الأمامية الكاملة لمبنى التعلّم في مدارك: قاعة المحاضرات، جسر نقطة الفحص، جناح الاختبار، جناح المكتبة، وبرج الإتقان — على خط أرض واحد، بشجرتين على الجانبين ومربعين برتقاليين"
    >
      {/* transparent paper — no background fill anywhere: the page's
          paper shows through the whole window (owner §0-A.1). */}
      <g transform={`translate(${HERO_SEAT.x} ${HERO_SEAT.y}) scale(${HERO_SEAT.s})`}>
        <ElevationArt variant="hero" active={-1} />
      </g>
    </svg>
  );
}
