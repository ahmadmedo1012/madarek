/**
 * Scene: empty-constellation — the مدارك empty state.
 *
 * "Your sky is clear tonight; stars arrive as your work does." A
 * constellation of six stars stitched by a hairline thread, one GOLD
 * major node (the next star waiting to be lit), and the orbit arc the
 * family shares with the landing's سماء مدارك world.
 *
 * Family rules (contracts/illustration-system.md):
 *   - stroke 1.5 round caps + round joins
 *   - colours via --ill-* CSS variables only — no raw hex
 *   - front-facing perspective
 *   - symmetric composition (no RTL mirroring needed — a sky has no
 *     reading order)
 *   - target weight ≤ 8 KB gz
 */
import type { ReactElement } from 'react';

export function SceneEmptyConstellation(): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Soft circular paper backdrop — the night disc */}
      <circle cx="100" cy="100" r="78" fill="var(--ill-paper)" />

      {/* Orbit arc — a calm ellipse crossing the disc (the مدار motif) */}
      <path
        d="M 40 122 A 64 26 -14 0 1 160 100"
        fill="none"
        stroke="var(--ill-hue-3)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="1 7"
        opacity="0.85"
      />

      {/* The constellation thread — hairline stitching five calm stars */}
      <polyline
        points="64,128 84,104 108,116 128,84 150,96"
        fill="none"
        stroke="var(--ill-hue-3)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />

      {/* Calm stars (small, hue-3) */}
      <circle cx="64" cy="128" r="3.5" fill="var(--ill-hue-3)" />
      <circle cx="84" cy="104" r="3" fill="var(--ill-hue-3)" />
      <circle cx="108" cy="116" r="3" fill="var(--ill-hue-3)" />
      <circle cx="150" cy="96" r="3.5" fill="var(--ill-hue-3)" />

      {/* The fourth star is LIT — gold, with a four-point sparkle
          (the family's emphasis node; --ill-hue-6 is the gold accent
          in dark and a deep gold in light) */}
      <circle cx="128" cy="84" r="5.5" fill="var(--ill-hue-6)" />
      <path
        d="M128 68 L128 74 M128 94 L128 100 M112 84 L118 84 M138 84 L144 84"
        stroke="var(--ill-hue-6)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Distant dust — two faint pinpoints for depth */}
      <circle cx="56" cy="72" r="1.8" fill="var(--ill-hue-5)" opacity="0.7" />
      <circle cx="146" cy="132" r="1.8" fill="var(--ill-hue-5)" opacity="0.7" />

      {/* Ground shadow — keeps the disc seated (family motif) */}
      <ellipse cx="100" cy="158" rx="52" ry="5" fill="var(--ill-shadow)" />

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
