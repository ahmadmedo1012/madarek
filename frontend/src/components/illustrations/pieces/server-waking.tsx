/**
 * mk-ill piece: server-waking — «الخادم يستيقظ»
 *
 * Render's free instances cold-start; this is the calm machine
 * stirring: a two-tier server stack, one signal LED already lit while
 * its sibling sleeps as a dotted ring, and a dotted wave rising from
 * the stack with a signal ping at its crest.
 *
 * Family: r313 two-tone — ink + paper + signal (the LED + ping); the
 * sleeping slots ride the paper step (--neutral-100), corners square.
 * No text. RTL: mirror-symmetric — direction-neutral.
 */
import {
  ACCENT,
  dotted,
  ILL_PAPER,
  ILL_STROKE,
  IllSvg,
  NEUTRAL_100,
} from './shell';

export default function ServerWaking() {
  return (
    <IllSvg>
      {/* the waking wave */}
      <path
        d="M 76 76 Q 100 56 124 76"
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
      />
      {/* the ping at the crest */}
      <circle cx="100" cy="66" r="3" fill={ACCENT} />
      {/* the server stack */}
      <rect
        x="60"
        y="92"
        width="80"
        height="26"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      <rect
        x="60"
        y="124"
        width="80"
        height="26"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* tier 1: the LED that is on */}
      <circle cx="74" cy="105" r="4" fill={ACCENT} />
      <rect x="88" y="101" width="24" height="8" fill={NEUTRAL_100} />
      {/* tier 2: still asleep */}
      <circle
        cx="74"
        cy="137"
        r="4"
        fill="none"
        {...dotted(ILL_STROKE, '0.5', '0.1 5')}
      />
      <rect x="88" y="133" width="24" height="8" fill={NEUTRAL_100} />
      {/* the ground */}
      <line
        x1="52"
        y1="158"
        x2="148"
        y2="158"
        stroke={ILL_STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IllSvg>
  );
}
