/**
 * mk-ill piece: empty-research — «لا بحوث بعد»
 *
 * A manuscript sheet with a curled corner and centred ghost lines,
 * waiting; a small signal sparkle marks the place insight will take.
 *
 * r313 two-tone: ink + paper + signal (--accent, the sparkle only);
 * ghost lines sit on the paper step (--neutral-100), corners square.
 * No text. RTL: centred composition — direction-neutral by design.
 */
import { ACCENT, ILL_PAPER, ILL_STROKE, IllSvg, NEUTRAL_100 } from './shell';

export default function EmptyResearch() {
  return (
    <IllSvg>
      {/* the manuscript */}
      <rect
        x="60"
        y="64"
        width="80"
        height="96"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="2"
      />
      {/* the curled corner */}
      <circle
        cx="136"
        cy="68"
        r="9"
        fill={NEUTRAL_100}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* ghost lines, centred */}
      <rect x="76" y="88" width="48" height="8" fill={NEUTRAL_100} />
      <rect x="76" y="104" width="48" height="8" fill={NEUTRAL_100} />
      <rect x="84" y="120" width="32" height="8" fill={NEUTRAL_100} />
      {/* the insight-to-be: a small signal sparkle at the corner */}
      <path
        d="M 56 44 Q 56 52 64 52 Q 56 52 56 60 Q 56 52 48 52 Q 56 52 56 44 Z"
        fill={ACCENT}
      />
    </IllSvg>
  );
}
