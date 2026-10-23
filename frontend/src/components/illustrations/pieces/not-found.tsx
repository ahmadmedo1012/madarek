/**
 * mk-ill piece: not-found — «غير موجود»
 *
 * An open box looking up at the dotted ghost of the thing that isn't
 * in it, with a dotted trail falling in and one signal sparkle where
 * the thing slipped away.
 *
 * r313 two-tone: ink + paper + signal (the sparkle); the flat drafting
 * rim replaces the tinted ellipse, corners square. No text.
 * RTL: centred composition — direction-neutral.
 */
export default function NotFound() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the ghost of the missing thing */}
      <rect
        x="86"
        y="44"
        width="28"
        height="28"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.5"
        transform="rotate(12 100 58)"
      />
      {/* where it slipped away */}
      <path
        d="M 118 39 Q 118 46 125 46 Q 118 46 118 53 Q 118 46 111 46 Q 118 46 118 39 Z"
        fill="var(--accent)"
      />
      {/* the dotted trail into the box */}
      <circle cx="100" cy="82" r="2" fill="var(--ill-stroke)" fillOpacity="0.4" />
      <circle cx="100" cy="90" r="1.6" fill="var(--ill-stroke)" fillOpacity="0.3" />
      {/* the open box — flat drafting volume, square corners */}
      <rect
        x="56"
        y="104"
        width="88"
        height="48"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      {/* the rim / opening — the lifted lid, a flat line wider than the
          box (the r313 drafting rim; the tinted ellipse is retired) */}
      <line
        x1="48"
        y1="94"
        x2="152"
        y2="94"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
    </svg>
  );
}
