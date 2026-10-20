/**
 * mk-ill piece: empty-notifications — «لا إشعارات»
 *
 * A silent bell: no sound waves, just two muted dots and a signal
 * clapper resting below the lip. The silence is the message.
 *
 * Family: ink + signal (clapper) on --ill-paper; no tint needed.
 * No text. RTL: mirror-symmetric — direction-neutral by design.
 */
export default function EmptyNotifications() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* two muted dots, symmetric — the sound that never came */}
      <circle cx="58" cy="72" r="2.5" fill="var(--ill-stroke)" fillOpacity="0.35" />
      <circle cx="142" cy="72" r="2.5" fill="var(--ill-stroke)" fillOpacity="0.35" />
      {/* the bell: dome, flare, lip — one closed outline */}
      <path
        d="M 76 114 a 24 24 0 0 1 48 0 l 6 12 a 4 4 0 0 1 -4 6 h -52 a 4 4 0 0 1 -4 -6 Z"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* the hanger loop */}
      <circle
        cx="100"
        cy="86"
        r="5"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* the resting clapper — the one signal fill */}
      <rect x="94" y="138" width="12" height="8" rx="4" fill="var(--accent)" />
    </svg>
  );
}
