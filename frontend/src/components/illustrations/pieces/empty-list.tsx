/**
 * mk-ill piece: empty-list — «القائمة فارغة»
 *
 * A soft sheet with a signal tab and centred ghost rows, plus a dotted
 * slot where the first entry will land. Reads as "nothing here yet —
 * the structure is ready".
 *
 * r313 two-tone: ink (--ill-stroke) + paper + signal (--accent, the
 * tab only) — ghost rows sit on the paper STEP (--neutral-100), and
 * every corner is square (the Heron drafting grammar). No text.
 * RTL: centred composition — direction-neutral by design.
 */
import {
  ACCENT,
  dotted,
  ILL_PAPER,
  ILL_STROKE,
  IllSvg,
  NEUTRAL_100,
} from './shell';

export default function EmptyList() {
  return (
    <IllSvg>
      {/* the tab (drawn first so the sheet edge overlaps its base) */}
      <rect x="90" y="26" width="20" height="16" fill={ACCENT} />
      {/* the sheet */}
      <rect
        x="52"
        y="38"
        width="96"
        height="124"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="2"
      />
      {/* ghost rows (tint pills, all centred) */}
      <rect x="76" y="58" width="48" height="10" fill={NEUTRAL_100} />
      <rect x="64" y="80" width="72" height="10" fill={NEUTRAL_100} />
      <rect x="76" y="102" width="48" height="10" fill={NEUTRAL_100} />
      {/* the dotted slot where the first entry lands */}
      <rect
        x="60"
        y="128"
        width="80"
        height="18"
        fill="none"
        {...dotted(ILL_STROKE, '0.55')}
      />
    </IllSvg>
  );
}
