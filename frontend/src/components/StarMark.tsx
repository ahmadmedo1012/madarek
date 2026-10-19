/**
 * StarMark — the Madarek khatam-star brand symbol (r188).
 *
 * The platform's own mark: an eight-pointed geometric star (two rotated
 * squares — a deep Arabic khatam motif for knowledge and assembly)
 * stroked in the canonical accent ramp, with one solid gold point of
 * light at the north-east tip — the «نقطة» the brand copy begins from.
 *
 * Same category as LibyaFlag: a bespoke brand/national symbol primitive
 * (raw SVG by design — the icon-policy allowlist covers it); UI icons
 * everywhere else still go through Lucide via <Icon icon={…} />.
 * The static asset twin lives at public/brand/madarek-mark.svg
 * (favicon + og sheet derive from the same geometry).
 */
export function StarMark({
  size = 28,
  className,
  withHalo = false,
}: {
  /** Rendered width/height in px (the viewBox is 64×64). */
  size?: number;
  className?: string;
  /** Add the soft gold halo around the point of light (hero/plate use). */
  withHalo?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
      style={{ display: 'block' }}
    >
      {/* the khatam star: axis square + the same square rotated 45° */}
      <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" />
      <rect x="17" y="17" width="30" height="30" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinejoin="round" transform="rotate(45 32 32)" />
      {/* solid core diamond */}
      <rect x="27" y="27" width="10" height="10" fill="var(--accent)" transform="rotate(45 32 32)" />
      {/* نقطة — the point of light at the north-east tip */}
      {withHalo && <circle cx="47" cy="17" r="7.5" fill="var(--gold)" fillOpacity="0.18" />}
      <circle cx="47" cy="17" r="4.5" fill="var(--gold)" />
    </svg>
  );
}

/**
 * StarFigure — the manuscript-plate rendering of the star (r188 folio
 * hero): the mark at plate scale inside hairline orbit circles and
 * crosshair rules — «الشكل ٠١» of the landing. Same primitive family
 * (bespoke brand symbolography), same allowlist category.
 */
export function StarFigure({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      focusable="false"
      style={{ display: 'block' }}
    >
      {/* hairline orbit circles */}
      <circle cx="100" cy="100" r="92" fill="none" stroke="var(--rule)" strokeWidth="1" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="var(--border-faint)" strokeWidth="1" />
      {/* crosshair rules */}
      <line x1="100" y1="0" x2="100" y2="14" stroke="var(--rule)" strokeWidth="1" />
      <line x1="100" y1="186" x2="100" y2="200" stroke="var(--rule)" strokeWidth="1" />
      <line x1="0" y1="100" x2="14" y2="100" stroke="var(--rule)" strokeWidth="1" />
      <line x1="186" y1="100" x2="200" y2="100" stroke="var(--rule)" strokeWidth="1" />
      {/* the khatam star at plate scale — two rotated squares */}
      <rect x="45" y="45" width="110" height="110" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="round" />
      <rect x="45" y="45" width="110" height="110" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="round" transform="rotate(45 100 100)" />
      {/* solid core diamond */}
      <rect x="80" y="80" width="40" height="40" fill="var(--accent)" transform="rotate(45 100 100)" />
      {/* نقطة — the point of light at the north-east tip */}
      <circle cx="141" cy="59" r="16" fill="var(--gold)" opacity="0.18" />
      <circle cx="141" cy="59" r="9" fill="var(--gold)" />
    </svg>
  );
}
