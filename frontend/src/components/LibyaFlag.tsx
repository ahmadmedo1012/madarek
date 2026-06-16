/**
 * LibyaFlag — clean inline SVG of the Libyan national flag (red‑black‑green
 * with white star & crescent). Replaces the 🇱🇾 emoji which renders
 * inconsistently/ugly across OSes. Decorative by default (aria-hidden).
 */
export function LibyaFlag({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round((size * 2) / 3)}
      viewBox="0 0 30 20"
      role="img"
      aria-label="علم ليبيا"
      style={{ borderRadius: 2, display: 'inline-block', verticalAlign: '-2px', flexShrink: 0 }}
    >
      <rect width="30" height="20" fill="#239e46" />
      <rect width="30" height="13.333" fill="#000" />
      <rect width="30" height="6.667" fill="#e70013" />
      <g fill="#fff" transform="translate(15 10)">
        <circle r="3.1" />
        <circle r="2.5" cx="0.9" fill="#000" />
        <path d="M2.2 -1.9 L2.75 -0.55 L4.2 -0.55 L3 0.3 L3.5 1.7 L2.2 0.85 L0.9 1.7 L1.4 0.3 L0.2 -0.55 L1.65 -0.55 Z" />
      </g>
    </svg>
  );
}
