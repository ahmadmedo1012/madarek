/**
 * mk-ill piece: empty-courses — «لا مقررات»
 *
 * A 2×2 module grid with three real tiles and one dotted ghost tile —
 * the course that hasn't been added — marked by a signal sparkle.
 *
 * Family: r313 two-tone — ink (--ill-stroke) + paper + signal
 * (--accent, one tile + sparkle); the third tile rides the paper step
 * (--neutral-100). Square corners throughout. No text. RTL: a grid
 * has no reading order here — direction-neutral by design.
 */
export default function EmptyCourses() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* tile 1 — paper step */}
      <rect
        x="58"
        y="58"
        width="40"
        height="40"
        fill="var(--neutral-100)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* tile 2 — paper */}
      <rect
        x="102"
        y="58"
        width="40"
        height="40"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* tile 3 — signal */}
      <rect
        x="58"
        y="102"
        width="40"
        height="40"
        fill="var(--accent)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* tile 4 — the dotted ghost */}
      <rect
        x="102"
        y="102"
        width="40"
        height="40"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.5"
      />
      {/* the course-to-be */}
      <path
        d="M 122 114 Q 122 122 130 122 Q 122 122 122 130 Q 122 122 114 122 Q 122 122 122 114 Z"
        fill="var(--accent)"
      />
    </svg>
  );
}
