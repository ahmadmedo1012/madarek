/**
 * mk-ill piece: offline — «لا اتصال»
 *
 * The cloud is fine; the path beneath it is not — two dotted segments
 * end short of each other, and one small dot never made it across.
 * No slash, no crossed symbols — the interruption itself tells it.
 *
 * Family: r313 two-tone — ink + paper; the cloud's status orb reads
 * as quiet ink (the tinted orb retired with the soft-tint family).
 * No text. RTL: mirror-symmetric.
 */
export default function Offline() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the cloud — pill body + two crown bumps, one union outline */}
      <path
        d="M 68 116 A 12 12 0 0 1 68 92 L 73.5 92 A 16 16 0 0 1 95.9 69.4 A 20 20 0 1 1 128.3 92 L 132 92 A 12 12 0 0 1 132 116 Z"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* the resting status orb, in the cloud's body */}
      <circle cx="100" cy="104" r="7" fill="var(--ill-stroke)" fillOpacity="0.3" />
      {/* the interrupted path */}
      <line
        x1="70"
        y1="140"
        x2="92"
        y2="140"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.5"
      />
      <line
        x1="108"
        y1="140"
        x2="130"
        y2="140"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.5"
      />
      {/* the packet that didn't make it */}
      <circle cx="100" cy="148" r="2.5" fill="var(--ill-stroke)" fillOpacity="0.4" />
    </svg>
  );
}
