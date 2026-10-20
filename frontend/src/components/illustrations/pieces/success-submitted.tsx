/**
 * mk-ill piece: success-submitted — «تم الإرسال»
 *
 * A sheet sliding into its tray, a signal check lit on the sheet.
 * The tilt of the floating sheet is decorative, not directional.
 *
 * Family: ink + signal (check badge) + one tint (--accent-soft sheet)
 * on --ill-paper. No text. RTL: centred composition — the check glyph
 * is the universal mark, not a direction.
 */
export default function SuccessSubmitted() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the tray */}
      <rect
        x="56"
        y="118"
        width="88"
        height="20"
        rx="10"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      {/* the sheet, settling in */}
      <g transform="rotate(-6 100 88)">
        <rect
          x="78"
          y="60"
          width="44"
          height="56"
          rx="8"
          fill="var(--accent-soft)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
        />
        {/* ghost lines on the sheet */}
        <rect x="88" y="86" width="24" height="5" rx="2.5" fill="var(--ill-paper)" />
        <rect x="92" y="96" width="16" height="5" rx="2.5" fill="var(--ill-paper)" />
        {/* the lit check */}
        <circle cx="100" cy="72" r="9" fill="var(--accent)" />
        <path
          d="M 96 72 L 99 75 L 104.5 69"
          fill="none"
          stroke="var(--text-on-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
