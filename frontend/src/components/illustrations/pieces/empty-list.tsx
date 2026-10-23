/**
 * mk-ill piece: empty-list — «القائمة فارغة»
 *
 * A soft sheet with a signal tab and centred ghost rows, plus a dotted
 * slot where the first entry will land. Reads as "nothing here yet —
 * the structure is ready".
 *
 * r313 two-tone: ink (--ill-stroke) + paper + signal (--accent, the
 * tab only) — ghost rows sit on the paper STEP (--neutral-100), and
 * every corner is square (the Heron drafting grammar). No text.
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
      <rect x="90" y="26" width="20" height="16" fill="var(--accent)" />
      {/* the sheet */}
      <rect
        x="52"
        y="38"
        width="96"
        height="124"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="2"
      />
      {/* ghost rows (tint pills, all centred) */}
      <rect x="76" y="58" width="48" height="10" fill="var(--neutral-100)" />
      <rect x="64" y="80" width="72" height="10" fill="var(--neutral-100)" />
      <rect x="76" y="102" width="48" height="10" fill="var(--neutral-100)" />
      {/* the dotted slot where the first entry lands */}
      <rect
        x="60"
        y="128"
        width="80"
        height="18"
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
