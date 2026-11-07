/**
 * mk-ill piece: error-generic — «حدث خطأ»
 *
 * A request that broke mid-journey: two ports, a flow line snapped in
 * the middle, one signal sparkle at the break. No skull, no warning
 * triangle, no drama — the calm fact of a broken connection.
 *
 * Family: r313 two-tone — ink + signal (sparkle) on paper; no tint
 * needed. Square ports. No text. RTL: mirror-symmetric —
 * direction-neutral.
 */
import { ACCENT, dotted, ILL_PAPER, ILL_STROKE, IllSvg } from './shell';

export default function ErrorGeneric() {
  return (
    <IllSvg>
      {/* the two ports */}
      <rect
        x="36"
        y="88"
        width="28"
        height="24"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      <rect
        x="136"
        y="88"
        width="28"
        height="24"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* the flow line, snapped */}
      <line
        x1="68"
        y1="100"
        x2="86"
        y2="100"
        stroke={ILL_STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="114"
        y1="100"
        x2="132"
        y2="100"
        stroke={ILL_STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* quiet echoes of the flow */}
      <line
        x1="68"
        y1="112"
        x2="84"
        y2="112"
        {...dotted(ILL_STROKE, '0.35')}
      />
      <line
        x1="116"
        y1="112"
        x2="132"
        y2="112"
        {...dotted(ILL_STROKE, '0.35')}
      />
      {/* the break, lit */}
      <path
        d="M 100 89 Q 100 100 111 100 Q 100 100 100 111 Q 100 100 89 100 Q 100 100 100 89 Z"
        fill={ACCENT}
      />
    </IllSvg>
  );
}
