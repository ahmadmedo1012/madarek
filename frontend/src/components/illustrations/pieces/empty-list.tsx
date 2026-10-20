/**
 * mk-ill piece: empty-list — «القائمة فارغة»
 *
 * A soft sheet with a signal tab and centred ghost rows, plus a dotted
 * slot where the first entry will land. Reads as "nothing here yet —
 * the structure is ready".
 *
 * Family: ink (--ill-stroke) + signal (--accent) + one tint
 * (--accent-soft) on --ill-paper, transparent elsewhere. No text.
 * RTL: centred composition — direction-neutral by design.
 */
export default function EmptyList() {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* the tab (drawn first so the sheet edge overlaps its base) */}
      <rect x="90" y="26" width="20" height="16" rx="8" fill="var(--accent)" />
      {/* the sheet */}
      <rect
        x="52"
        y="38"
        width="96"
        height="124"
        rx="14"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      {/* ghost rows (tint pills, all centred) */}
      <rect x="76" y="58" width="48" height="10" rx="5" fill="var(--accent-soft)" />
      <rect x="64" y="80" width="72" height="10" rx="5" fill="var(--accent-soft)" />
      <rect x="76" y="102" width="48" height="10" rx="5" fill="var(--accent-soft)" />
      {/* the dotted slot where the first entry lands */}
      <rect
        x="60"
        y="128"
        width="80"
        height="18"
        rx="9"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.1 7"
        strokeOpacity="0.55"
      />
    </svg>
  );
}
