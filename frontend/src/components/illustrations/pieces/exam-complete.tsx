/**
 * mk-ill piece: exam-complete — «انتهى الاختبار»
 *
 * The answer sheet with its centred ghost rows and a signal badge
 * resting on its top edge; three short signal strokes rise above it
 * — quiet radiance, symmetric, no confetti.
 *
 * Family: r313 two-tone — ink + paper + signal (badge, rays); the
 * answered rows ride the paper step (--neutral-100), corners square.
 * No text. RTL: mirror-symmetric rays and centred rows —
 * direction-neutral.
 */
import {
  ACCENT,
  ILL_PAPER,
  ILL_STROKE,
  IllSvg,
  NEUTRAL_100,
  TEXT_ON_ACCENT,
} from './shell';

export default function ExamComplete() {
  return (
    <IllSvg>
      {/* the quiet radiance (drawn first, behind the badge) */}
      <line x1="100" y1="29" x2="100" y2="21" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="83.6" y1="38.5" x2="76.6" y2="34.5" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="116.4" y1="38.5" x2="123.4" y2="34.5" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      {/* the answer sheet */}
      <rect
        x="64"
        y="48"
        width="72"
        height="96"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="2"
      />
      {/* the answered rows, centred (paper step) */}
      <rect x="80" y="72" width="40" height="7" fill={NEUTRAL_100} />
      <rect x="80" y="88" width="40" height="7" fill={NEUTRAL_100} />
      <rect x="80" y="104" width="40" height="7" fill={NEUTRAL_100} />
      <rect x="88" y="120" width="24" height="7" fill={NEUTRAL_100} />
      {/* the badge on the top edge */}
      <circle
        cx="100"
        cy="48"
        r="13"
        fill={ACCENT}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      <path
        d="M 94.5 48 L 98 51.5 L 105.5 44.5"
        fill="none"
        stroke={TEXT_ON_ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IllSvg>
  );
}
