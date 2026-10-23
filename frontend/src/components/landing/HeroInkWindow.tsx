/**
 * HeroInkWindow — R314 (V2): the hero's ink-rendered architecture riding
 * the shared 1440×720 .bp-svg frame, so the HeroInspect instrument
 * (guides, readout, drag-to-inspect, station markers) keeps ONE
 * coordinate system over the raster artwork.
 *
 * The render is a derivative of Madarek's own Commons-licensed campus
 * photo (frontend/public/media/manifest.json → renders[]; adapted,
 * ShareAlike kept) produced by scripts/r314/ink-render.mjs. It is NOT
 * Heron's artwork — own subject, own licence, own pipeline.
 */
export function HeroInkWindow() {
  return (
    <svg
      className="bp-svg"
      viewBox="0 0 1440 720"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="رسم حبري معماري لمقر إدارة جامعة بنغازي — مشتق من صورة مرخّصة"
    >
      {/* SVG <image> has no srcSet — the 2200px render serves the
          ≈1400px window at 1x and stays sharp at 2x DPR. */}
      <image
        href="/media/renders/hero-ink-2200.webp"
        x="0"
        y="0"
        width="1440"
        height="720"
        preserveAspectRatio="xMidYMid slice"
      />
    </svg>
  );
}
