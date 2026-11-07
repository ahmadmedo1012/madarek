/**
 * mk-ill piece: empty-search — «لا نتائج»
 *
 * A magnifier over a quiet dotted field; the lens holds a single dash
 — nothing found. The handle drops straight down and every mark is
 centred, so the piece reads identically in RTL and LTR.
 *
 * Family: r313 two-tone — ink + paper + signal (--accent is unused
 * here; the halo rides the paper step --neutral-100). No text.
 * RTL: direction-neutral by design (no mirroring).
 */
import { dotted, ILL_PAPER, ILL_STROKE, IllSvg, NEUTRAL_100 } from './shell';

export default function EmptySearch() {
  return (
    <IllSvg>
      {/* the halo — the paper step, one rung off the ground */}
      <circle cx="100" cy="100" r="64" fill={NEUTRAL_100} />
      {/* the lens */}
      <circle
        cx="100"
        cy="92"
        r="30"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="2"
      />
      {/* the empty answer: one quiet dash */}
      <line
        x1="90"
        y1="92"
        x2="110"
        y2="92"
        stroke={ILL_STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      {/* the handle, straight down — direction-neutral */}
      <line
        x1="100"
        y1="126"
        x2="100"
        y2="144"
        stroke={ILL_STROKE}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* the quiet field below */}
      <line
        x1="64"
        y1="160"
        x2="136"
        y2="160"
        {...dotted(ILL_STROKE, '0.35')}
      />
    </IllSvg>
  );
}
