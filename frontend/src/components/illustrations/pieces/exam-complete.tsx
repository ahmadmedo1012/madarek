/**
 * mk-ill piece: exam-complete — «انتهى الاختبار»
 *
 * The answer sheet with its centred ghost rows and a signal badge
 * resting on its top edge; three short signal strokes rise above it
 * — quiet radiance, symmetric, no confetti.
 *
 * Family: ink + signal (badge, rows, rays) + one tint (--accent-soft
 * rows) on --ill-paper. No text. RTL: mirror-symmetric rays and
 * centred rows — direction-neutral.
 */
export default function ExamComplete() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the quiet radiance (drawn first, behind the badge) */}
      <line x1="100" y1="29" x2="100" y2="21" stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round" />
      <line x1="83.6" y1="38.5" x2="76.6" y2="34.5" stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round" />
      <line x1="116.4" y1="38.5" x2="123.4" y2="34.5" stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round" />
      {/* the answer sheet */}
      <rect
        x="64"
        y="48"
        width="72"
        height="96"
        rx="10"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      {/* the answered rows, centred */}
      <rect x="80" y="72" width="40" height="7" rx="3.5" fill="var(--accent-soft)" />
      <rect x="80" y="88" width="40" height="7" rx="3.5" fill="var(--accent-soft)" />
      <rect x="80" y="104" width="40" height="7" rx="3.5" fill="var(--accent-soft)" />
      <rect x="88" y="120" width="24" height="7" rx="3.5" fill="var(--accent-soft)" />
      {/* the badge on the top edge */}
      <circle
        cx="100"
        cy="48"
        r="13"
        fill="var(--accent)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      <path
        d="M 94.5 48 L 98 51.5 L 105.5 44.5"
        fill="none"
        stroke="var(--text-on-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
