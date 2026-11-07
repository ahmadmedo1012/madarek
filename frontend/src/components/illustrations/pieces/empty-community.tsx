/**
 * mk-ill piece: empty-community — «لا مشاركات بعد»
 *
 * Two present members (paper and signal) and one dotted ghost standing
 * between and slightly behind them — the conversation that is waiting
 * for its third voice. Faceless geometric figures.
 *
 * Family: r313 two-tone — ink + paper + signal (one figure) on paper;
 * the ghost needs no tint. No text. RTL: mirror-symmetric —
 * direction-neutral.
 */
import { ACCENT, dotted, ILL_PAPER, ILL_STROKE, IllSvg } from './shell';

export default function EmptyCommunity() {
  return (
    <IllSvg>
      {/* the ghost member, behind */}
      <circle
        cx="100"
        cy="64"
        r="10"
        fill="none"
        {...dotted(ILL_STROKE, '0.5')}
      />
      <path
        d="M 82 112 v -2 a 18 18 0 0 1 36 0 v 2 a 4 4 0 0 1 -4 4 h -28 a 4 4 0 0 1 -4 -4 Z"
        fill="none"
        {...dotted(ILL_STROKE, '0.5')}
      />
      {/* member 1 — paper */}
      <circle
        cx="76"
        cy="86"
        r="12"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      <path
        d="M 56 134 v -6 a 20 20 0 0 1 40 0 v 6 a 5 5 0 0 1 -5 5 h -30 a 5 5 0 0 1 -5 -5 Z"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* member 2 — signal */}
      <circle
        cx="124"
        cy="86"
        r="12"
        fill={ACCENT}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      <path
        d="M 104 134 v -6 a 20 20 0 0 1 40 0 v 6 a 5 5 0 0 1 -5 5 h -30 a 5 5 0 0 1 -5 -5 Z"
        fill={ACCENT}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
    </IllSvg>
  );
}
