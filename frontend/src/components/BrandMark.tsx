/**
 * The Madarek platform crest.
 * Imported as a static asset URL so the SVG can be cached separately
 * and the JS bundle stays small.
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
