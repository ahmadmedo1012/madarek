/**
 * mk-ill piece: empty-research — «لا بحوث بعد»
 *
 * A manuscript sheet with a curled corner and centred ghost lines,
 * waiting; a small signal sparkle marks the place insight will take.
 *
 * r313 two-tone: ink + paper + signal (--accent, the sparkle only);
 * ghost lines sit on the paper step (--neutral-100), corners square.
 * No text. RTL: centred composition — direction-neutral by design.
 */
export default function EmptyResearch() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the manuscript */}
      <rect
        x="60"
        y="64"
        width="80"
        height="96"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      {/* the curled corner */}
      <circle
        cx="136"
        cy="68"
        r="9"
        fill="var(--neutral-100)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* ghost lines, centred */}
      <rect x="76" y="88" width="48" height="8" fill="var(--neutral-100)" />
      <rect x="76" y="104" width="48" height="8" fill="var(--neutral-100)" />
      <rect x="84" y="120" width="32" height="8" fill="var(--neutral-100)" />
      {/* the insight-to-be: a small signal sparkle at the corner */}
      <path
        d="M 56 44 Q 56 52 64 52 Q 56 52 56 60 Q 56 52 48 52 Q 56 52 56 44 Z"
        fill="var(--accent)"
      />
    </svg>
  );
}
