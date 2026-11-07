/**
 * mk-ill piece: empty-courses — «لا مقررات»
 *
 * A 2×2 module grid with three real tiles and one dotted ghost tile —
 * the course that hasn't been added — marked by a signal sparkle.
 *
 * Family: r313 two-tone — ink (--ill-stroke) + paper + signal
 * (--accent, one tile + sparkle); the third tile rides the paper step
 * (--neutral-100). Square corners throughout. No text. RTL: a grid
 * has no reading order here — direction-neutral by design.
 */
import {
  ACCENT,
  dotted,
  ILL_PAPER,
  ILL_STROKE,
  IllSvg,
  NEUTRAL_100,
} from './shell';

export default function EmptyCourses() {
  return (
    <IllSvg>
      {/* tile 1 — paper step */}
      <rect
        x="58"
        y="58"
        width="40"
        height="40"
        fill={NEUTRAL_100}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* tile 2 — paper */}
      <rect
        x="102"
        y="58"
        width="40"
        height="40"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* tile 3 — signal */}
      <rect
        x="58"
        y="102"
        width="40"
        height="40"
        fill={ACCENT}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* tile 4 — the dotted ghost */}
      <rect
        x="102"
        y="102"
        width="40"
        height="40"
        fill="none"
        {...dotted(ILL_STROKE, '0.5')}
      />
      {/* the course-to-be */}
      <path
        d="M 122 114 Q 122 122 130 122 Q 122 122 122 130 Q 122 122 114 122 Q 122 122 122 114 Z"
        fill={ACCENT}
      />
    </IllSvg>
  );
}
