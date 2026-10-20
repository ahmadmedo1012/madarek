/**
 * mk-ill piece: forbidden — «لا تملك صلاحية»
 *
 * A rounded octagon with a signal bar — the oldest "stop" geometry,
 * redrawn soft. A quiet dotted echo ring keeps it from feeling harsh.
 *
 * Family: ink + signal (the bar) + one tint (--accent-soft octagon
 * fill). No text. RTL: mirror-symmetric — direction-neutral.
 */
export default function Forbidden() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the quiet echo ring */}
      <circle
        cx="100"
        cy="100"
        r="64"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.35"
      />
      {/* the soft octagon */}
      <path
        d="M 148 119.9 L 119.9 148 L 80.1 148 L 52 119.9 L 52 80.1 L 80.1 52 L 119.9 52 L 148 80.1 Z"
        fill="var(--accent-soft)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* the bar */}
      <rect x="76" y="92" width="48" height="16" rx="8" fill="var(--accent)" />
    </svg>
  );
}
