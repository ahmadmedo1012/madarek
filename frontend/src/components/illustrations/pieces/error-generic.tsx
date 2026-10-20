/**
 * mk-ill piece: error-generic — «حدث خطأ»
 *
 * A request that broke mid-journey: two ports, a flow line snapped in
 * the middle, one signal sparkle at the break. No skull, no warning
 * triangle, no drama — the calm fact of a broken connection.
 *
 * Family: ink + signal (sparkle) on --ill-paper; no tint needed.
 * No text. RTL: mirror-symmetric — direction-neutral.
 */
export default function ErrorGeneric() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the two ports */}
      <rect
        x="36"
        y="88"
        width="28"
        height="24"
        rx="8"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      <rect
        x="136"
        y="88"
        width="28"
        height="24"
        rx="8"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* the flow line, snapped */}
      <line
        x1="68"
        y1="100"
        x2="86"
        y2="100"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="114"
        y1="100"
        x2="132"
        y2="100"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* quiet echoes of the flow */}
      <line
        x1="68"
        y1="112"
        x2="84"
        y2="112"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.35"
      />
      <line
        x1="116"
        y1="112"
        x2="132"
        y2="112"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.35"
      />
      {/* the break, lit */}
      <path
        d="M 100 89 Q 100 100 111 100 Q 100 100 100 111 Q 100 100 89 100 Q 100 100 100 89 Z"
        fill="var(--accent)"
      />
    </svg>
  );
}
