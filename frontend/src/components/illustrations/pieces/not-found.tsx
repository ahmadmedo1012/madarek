/**
 * mk-ill piece: not-found — «غير موجود»
 *
 * An open box looking up at the dotted ghost of the thing that isn't
 * in it, with a dotted trail falling in and one signal sparkle where
 * the thing slipped away.
 *
 * r313 two-tone: ink + paper + signal (the sparkle); the flat drafting
 * rim replaces the tinted ellipse, corners square. No text.
 * RTL: centred composition — direction-neutral.
 */
import { ACCENT, dotted, ILL_PAPER, ILL_STROKE, IllSvg } from './shell';

export default function NotFound() {
  return (
    <IllSvg>
      {/* the ghost of the missing thing */}
      <rect
        x="86"
        y="44"
        width="28"
        height="28"
        fill="none"
        {...dotted(ILL_STROKE, '0.5')}
        transform="rotate(12 100 58)"
      />
      {/* where it slipped away */}
      <path
        d="M 118 39 Q 118 46 125 46 Q 118 46 118 53 Q 118 46 111 46 Q 118 46 118 39 Z"
        fill={ACCENT}
      />
      {/* the dotted trail into the box */}
      <circle cx="100" cy="82" r="2" fill={ILL_STROKE} fillOpacity="0.4" />
      <circle cx="100" cy="90" r="1.6" fill={ILL_STROKE} fillOpacity="0.3" />
      {/* the open box — flat drafting volume, square corners */}
      <rect
        x="56"
        y="104"
        width="88"
        height="48"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="2"
      />
      {/* the rim / opening — the lifted lid, a flat line wider than the
          box (the r313 drafting rim; the tinted ellipse is retired) */}
      <line
        x1="48"
        y1="94"
        x2="152"
        y2="94"
        stroke={ILL_STROKE}
        strokeWidth="2"
      />
    </IllSvg>
  );
}
