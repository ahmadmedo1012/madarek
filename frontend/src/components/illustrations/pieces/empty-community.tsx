/**
 * mk-ill piece: empty-community — «لا مشاركات بعد»
 *
 * Two present members (paper and signal) and one dotted ghost standing
 * between and slightly behind them — the conversation that is waiting
 * for its third voice. Faceless geometric figures.
 *
 * Family: ink + signal (one figure) on --ill-paper; the ghost needs
 * no tint. No text. RTL: mirror-symmetric — direction-neutral.
 */
export default function EmptyCommunity() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the ghost member, behind */}
      <circle
        cx="100"
        cy="64"
        r="10"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.5"
      />
      <path
        d="M 82 112 v -2 a 18 18 0 0 1 36 0 v 2 a 4 4 0 0 1 -4 4 h -28 a 4 4 0 0 1 -4 -4 Z"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.5"
      />
      {/* member 1 — paper */}
      <circle
        cx="76"
        cy="86"
        r="12"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      <path
        d="M 56 134 v -6 a 20 20 0 0 1 40 0 v 6 a 5 5 0 0 1 -5 5 h -30 a 5 5 0 0 1 -5 -5 Z"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* member 2 — signal */}
      <circle
        cx="124"
        cy="86"
        r="12"
        fill="var(--accent)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      <path
        d="M 104 134 v -6 a 20 20 0 0 1 40 0 v 6 a 5 5 0 0 1 -5 5 h -30 a 5 5 0 0 1 -5 -5 Z"
        fill="var(--accent)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
