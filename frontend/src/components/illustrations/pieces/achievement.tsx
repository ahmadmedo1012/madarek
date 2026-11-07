/**
 * mk-ill piece: achievement — «وسام»
 *
 * THE ONLY gold piece in the kit (r197 gold discipline: achievements
 * and nothing else). A rosette medal: gold disc with a dotted
 * embossed ring and a four-point star, two symmetric ribbon tails
 * peeking from behind at five and seven o'clock, over one soft gold
 * halo. r313: the ribbon tails square their corners (drafting
 * grammar); the gold family stays — the canon's one sanctioned
 * multi-tone piece.
 *
 * Family: gold only — --gold fill, --gold-ink strokes, --gold-soft
 * halo; NO signal, NO ink strokes. No text. RTL: mirror-symmetric.
 */
import { dotted, GOLD, GOLD_INK, GOLD_SOFT, IllSvg } from './shell';

export default function Achievement() {
  return (
    <IllSvg>
      {/* the soft gold halo */}
      <circle cx="100" cy="100" r="44" fill={GOLD_SOFT} />
      {/* the ribbon tails, five and seven o'clock, behind the disc */}
      <rect
        x="69"
        y="112"
        width="14"
        height="30"
        fill={GOLD_SOFT}
        stroke={GOLD_INK}
        strokeWidth="1.5"
        transform="rotate(35 76 112)"
      />
      <rect
        x="117"
        y="112"
        width="14"
        height="30"
        fill={GOLD_SOFT}
        stroke={GOLD_INK}
        strokeWidth="1.5"
        transform="rotate(-35 124 112)"
      />
      {/* the medal */}
      <circle
        cx="100"
        cy="100"
        r="28"
        fill={GOLD}
        stroke={GOLD_INK}
        strokeWidth="2"
      />
      {/* the embossed inner ring */}
      <circle
        cx="100"
        cy="100"
        r="20"
        fill="none"
        {...dotted(GOLD_INK, '0.6')}
      />
      {/* the star */}
      <path
        d="M 100 90 Q 100 100 110 100 Q 100 100 100 110 Q 100 100 90 100 Q 100 100 100 90 Z"
        fill={GOLD_INK}
      />
    </IllSvg>
  );
}
