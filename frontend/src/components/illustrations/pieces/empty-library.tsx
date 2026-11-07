/**
 * mk-ill piece: empty-library — «المكتبة فارغة»
 *
 * Three spines on a shelf with one dotted slot between them — the
 * book that hasn't arrived. Varied heights give the shelf a quiet
 * rhythm; the empty slot is the subject.
 *
 * r313 two-tone: ink (--ill-stroke) + paper + signal (--accent, one
 * spine + the binding dot) — square spines, the Heron drafting
 * grammar. No text. RTL: the row reads as a shelf in either
 * direction — no mirroring needed.
 */
import {
  ACCENT,
  dotted,
  ILL_PAPER,
  ILL_STROKE,
  IllSvg,
  NEUTRAL_100,
} from './shell';

export default function EmptyLibrary() {
  return (
    <IllSvg>
      {/* spine 1 — paper step */}
      <rect
        x="50"
        y="76"
        width="22"
        height="64"
        fill={NEUTRAL_100}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* spine 2 — paper, with a signal binding dot */}
      <rect
        x="76"
        y="66"
        width="22"
        height="74"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      <circle cx="87" cy="80" r="2.5" fill={ACCENT} />
      {/* the empty slot — dotted outline */}
      <rect
        x="102"
        y="72"
        width="22"
        height="68"
        fill="none"
        {...dotted(ILL_STROKE, '0.5')}
      />
      {/* spine 3 — signal */}
      <rect
        x="128"
        y="80"
        width="22"
        height="60"
        fill={ACCENT}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* the shelf */}
      <line
        x1="44"
        y1="144"
        x2="156"
        y2="144"
        stroke={ILL_STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IllSvg>
  );
}
