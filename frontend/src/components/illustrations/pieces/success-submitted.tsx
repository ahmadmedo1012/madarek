/**
 * mk-ill piece: success-submitted — «تم الإرسال»
 *
 * A sheet sliding into its tray, a signal check lit on the sheet.
 * The tilt of the floating sheet is decorative, not directional.
 *
 * Family: r313 two-tone — ink + paper + signal (the check badge); the
 * settling sheet rides the paper step (--neutral-100), corners
 * square. No text. RTL: centred composition — the check glyph is the
 * universal mark, not a direction.
 */
import {
  ACCENT,
  ILL_PAPER,
  ILL_STROKE,
  IllSvg,
  NEUTRAL_100,
  TEXT_ON_ACCENT,
} from './shell';

export default function SuccessSubmitted() {
  return (
    <IllSvg>
      {/* the tray */}
      <rect
        x="56"
        y="118"
        width="88"
        height="20"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="2"
      />
      {/* the sheet, settling in */}
      <g transform="rotate(-6 100 88)">
        <rect
          x="78"
          y="60"
          width="44"
          height="56"
          fill={NEUTRAL_100}
          stroke={ILL_STROKE}
          strokeWidth="1.5"
        />
        {/* ghost lines on the sheet */}
        <rect x="88" y="86" width="24" height="5" fill={ILL_PAPER} />
        <rect x="92" y="96" width="16" height="5" fill={ILL_PAPER} />
        {/* the lit check */}
        <circle cx="100" cy="72" r="9" fill={ACCENT} />
        <path
          d="M 96 72 L 99 75 L 104.5 69"
          fill="none"
          stroke={TEXT_ON_ACCENT}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </IllSvg>
  );
}
