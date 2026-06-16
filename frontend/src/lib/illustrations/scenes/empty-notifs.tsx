/**
 * Scene: empty-notifs — for the "no notifications yet" empty state.
 *
 * Family rules (contracts/illustration-system.md):
 *   - stroke 1.5 round caps + round joins
 *   - colours via --ill-* CSS variables only — no raw hex
 *   - front-facing perspective
 *   - symmetric composition (no RTL mirroring needed)
 *   - target weight ≤ 8 KB gz
 */
import type { ReactElement } from 'react';

export function SceneEmptyNotifs(): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Soft circular paper backdrop */}
      <circle
        cx="100"
        cy="100"
        r="78"
        fill="var(--ill-paper)"
      />

      {/* Calm sky band behind the bell */}
      <ellipse
        cx="100"
        cy="148"
        rx="56"
        ry="6"
        fill="var(--ill-shadow)"
      />

      {/* Bell body */}
      <path
        d="M70 130
           C 70 100, 76 78, 100 78
           C 124 78, 130 100, 130 130
           Z"
        fill="var(--ill-hue-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bell crown */}
      <path
        d="M94 70
           C 94 64, 106 64, 106 70"
        fill="none"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bell base */}
      <line
        x1="62"
        y1="130"
        x2="138"
        y2="130"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Bell clapper — calm, centred */}
      <circle
        cx="100"
        cy="124"
        r="4"
        fill="var(--ill-stroke)"
      />

      {/* "Quiet" mark — three small dots floating above */}
      <circle cx="78" cy="56" r="2.5" fill="var(--ill-hue-3)" />
      <circle cx="100" cy="48" r="2.5" fill="var(--ill-hue-3)" />
      <circle cx="122" cy="56" r="2.5" fill="var(--ill-hue-3)" />

      {/* Tiny leaf for warmth (family motif) */}
      <path
        d="M150 158
           Q 158 152, 162 156
           Q 162 160, 156 164
           Q 152 166, 150 158 Z"
        fill="var(--ill-hue-2)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
