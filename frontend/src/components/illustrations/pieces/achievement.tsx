/**
 * mk-ill piece: achievement — «وسام»
 *
 * THE ONLY gold piece in the kit (r197 gold discipline: achievements
 * and nothing else). A rosette medal: gold disc with a dotted
 * embossed ring and a four-point star, two symmetric ribbon tails
 * peeking from behind at five and seven o'clock, over one soft gold
 * halo.
 *
 * Family: gold only — --gold fill, --gold-ink strokes, --gold-soft
 * halo; NO signal, NO ink strokes. No text. RTL: mirror-symmetric.
 */
export default function Achievement() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the soft gold halo */}
      <circle cx="100" cy="100" r="44" fill="var(--gold-soft)" />
      {/* the ribbon tails, five and seven o'clock, behind the disc */}
      <rect
        x="69"
        y="112"
        width="14"
        height="30"
        rx="7"
        fill="var(--gold-soft)"
        stroke="var(--gold-ink)"
        strokeWidth="1.5"
        transform="rotate(35 76 112)"
      />
      <rect
        x="117"
        y="112"
        width="14"
        height="30"
        rx="7"
        fill="var(--gold-soft)"
        stroke="var(--gold-ink)"
        strokeWidth="1.5"
        transform="rotate(-35 124 112)"
      />
      {/* the medal */}
      <circle
        cx="100"
        cy="100"
        r="28"
        fill="var(--gold)"
        stroke="var(--gold-ink)"
        strokeWidth="2"
      />
      {/* the embossed inner ring */}
      <circle
        cx="100"
        cy="100"
        r="20"
        fill="none"
        stroke="var(--gold-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.6"
      />
      {/* the star */}
      <path
        d="M 100 90 Q 100 100 110 100 Q 100 100 100 110 Q 100 100 90 100 Q 100 100 100 90 Z"
        fill="var(--gold-ink)"
      />
    </svg>
  );
}
