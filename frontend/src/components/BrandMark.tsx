/**
 * The Madarek platform mark (r188: the khatam-star — an eight-pointed
 * geometric star with a gold point of light; see
 * public/brand/madarek-mark.svg). Imported as a static asset URL so
 * the SVG can be cached separately and the JS bundle stays small. The
 * retired ZU crest and brain/AI shield are gone — the product chrome
 * (Sidebar + HydrationSplash) renders the star mark.
 */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/madarek-mark.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={className}
      style={{ display: 'block' }}
    />
  );
}
