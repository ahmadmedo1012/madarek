/**
 * mk-ill piece: forbidden — «لا تملك صلاحية»
 *
 * A rounded octagon with a signal bar — the oldest "stop" geometry,
 * redrawn soft. A quiet dotted echo ring keeps it from feeling harsh.
 *
 * r313 two-tone: ink + paper + signal (the bar); the octagon fill
 * rides the paper step (--neutral-100). Square corners. No text.
 * RTL: mirror-symmetric — direction-neutral.
 */
import { ACCENT, dotted, ILL_STROKE, IllSvg, NEUTRAL_100 } from './shell';

export default function Forbidden() {
  return (
    <IllSvg>
      {/* the quiet echo ring */}
      <circle
        cx="100"
        cy="100"
        r="64"
        fill="none"
        {...dotted(ILL_STROKE, '0.35')}
      />
      {/* the octagon — paper step */}
      <path
        d="M 148 119.9 L 119.9 148 L 80.1 148 L 52 119.9 L 52 80.1 L 80.1 52 L 119.9 52 L 148 80.1 Z"
        fill={NEUTRAL_100}
        stroke={ILL_STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* the bar */}
      <rect x="76" y="92" width="48" height="16" fill={ACCENT} />
    </IllSvg>
  );
}
