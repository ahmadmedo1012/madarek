/**
 * The neutral Madarek platform mark (independent smart-learning
 * identity — the brain/AI shield). Imported as a static asset URL so
 * the SVG can be cached separately and the JS bundle stays small.
 * The retired ZU crest stays on disk at /brand/zu-mark.svg as showcase
 * data provenance, but the product chrome (Sidebar + HydrationSplash)
 * renders the platform's own mark (r183-B2).
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
