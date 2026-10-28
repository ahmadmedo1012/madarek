/**
 * HeroInkWindow — R315 (B1 · owner §0-A.1) → R322 (2-b · the measured
 * transplant): the hero art band shows the WHOLE frontal elevation of
 * Madarek's own ink building on TRANSPARENT paper — no crop, no white
 * box — and the ink owns the FULL band width.
 *
 * R314 rode a raster fragment (object-fit-cover crop of a photo
 * derivative on a white rectangle) — the owner's §0-A.1 verdict killed
 * that seat. R315 re-seated the drafted ElevationDrawing (own subject,
 * own licence — never Heron's artwork) at ~67% of the window width
 * with empty paper around it. The R322 Heron extraction measures the
 * reference's hero illustration at 164.81×77.6rem `contain` inside a
 * 164.87×77.63rem img-inner box — the ink FILLS the box (96%+ of the
 * band width) and the paper mat + drafting chrome live OUTSIDE the
 * image element. This frame now mirrors that grammar: the viewBox is
 * the TIGHT box around the elevation's own ink, so at
 * `inline-size: 100%` the drawing fills the band edge to edge at
 * every breakpoint (the V10 phone fix — the art element itself owns
 * the full viewport width), and the stage's mat + hairline frame +
 * ruler chrome carry the transparent paper around it.
 *
 * ONE coordinate frame is kept (the R314 contract): the inspection
 * stations (HeroInspect) remap their authored sheet-space anchors
 * through HERO_SEAT into this frame — HERO_FRAME exports the viewBox
 * window so the instrument's letterbox math shares the same numbers.
 */
import { ElevationArt } from './ElevationDrawing';

/* The hero window's viewBox — the TIGHT window around the whole
 * elevation's ink: the hero-variant artwork spans x 112…1390 ·
 * y 64…516 in the sheet's own 1440×640 space; through HERO_SEAT that
 * is the frame box (157,170)–(1284,569), opened by ~6 frame units of
 * stroke breathing room all round. Aspect 1139:411 ≈ 2.77:1 — the
 * elevation's own proportion (the reference's img-inner box is
 * 2.12:1 because THEIR illustration is; the box always takes the
 * artwork's aspect, never the reverse). */
export const HERO_FRAME = { x: 151, y: 164, w: 1139, h: 411 } as const;

/* The elevation's seat inside the sheet's own 1440×640 space — the
 * inspection stations' authored anchors remap through THIS transform
 * (the math is unchanged from R315; only the viewBox window moved). */
export const HERO_SEAT = { x: 58, y: 114, s: 0.882 } as const;

export function HeroInkWindow() {
  return (
    <svg
      className="bp-svg"
      viewBox={`${HERO_FRAME.x} ${HERO_FRAME.y} ${HERO_FRAME.w} ${HERO_FRAME.h}`}
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
