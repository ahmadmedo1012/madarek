/**
 * mk-ill piece: empty-library — «المكتبة فارغة»
 *
 * Three spines on a shelf with one dotted slot between them — the
 * book that hasn't arrived. Varied heights give the shelf a quiet
 * rhythm; the empty slot is the subject.
 *
 * Family: ink + signal (one filled spine, one binding dot) + one tint
 * (--accent-soft spine) on --ill-paper. No text. RTL: the row reads
 * as a shelf in either direction — no mirroring needed.
 */
export default function EmptyLibrary() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* spine 1 — tint */}
      <rect
        x="50"
        y="76"
        width="22"
        height="64"
        rx="6"
        fill="var(--accent-soft)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* spine 2 — paper, with a signal binding dot */}
      <rect
        x="76"
        y="66"
        width="22"
        height="74"
        rx="6"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      <circle cx="87" cy="80" r="2.5" fill="var(--accent)" />
      {/* the empty slot — dotted outline */}
      <rect
        x="102"
        y="72"
        width="22"
        height="68"
        rx="6"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.5"
      />
      {/* spine 3 — signal */}
      <rect
        x="128"
        y="80"
        width="22"
        height="60"
        rx="6"
        fill="var(--accent)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* the shelf */}
      <line
        x1="44"
        y1="144"
        x2="156"
        y2="144"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
