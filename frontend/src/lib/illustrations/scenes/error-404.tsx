/**
 * Scene: error-404 — for the page-not-found surface.
 *
 * Family rules (contracts/illustration-system.md):
 *   - stroke 1.5 round caps + round joins
 *   - colours via --ill-* CSS variables only
 *   - front-facing perspective, calm composition
 *   - symmetric — no directional content, no RTL mirror needed
 *   - the "404" numerals read in either reading direction
 */
import type { ReactElement } from 'react';

export function SceneError404(): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Soft paper backdrop */}
      <rect
        x="22"
        y="46"
        width="156"
        height="104"
        rx="14"
        ry="14"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />

      {/* "404" — three glyphs spaced across the card */}
      {/* 4 (left) */}
      <path
        d="M52 72
           L 52 102
           L 78 102
           M 70 88
           L 70 112"
        fill="none"
        stroke="var(--ill-hue-4)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 0 (centre) */}
      <ellipse
        cx="100"
        cy="92"
        rx="14"
        ry="20"
        fill="none"
        stroke="var(--ill-hue-1)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* 4 (right) */}
      <path
        d="M124 72
           L 124 102
           L 150 102
           M 142 88
           L 142 112"
        fill="none"
        stroke="var(--ill-hue-4)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Telescope motif underneath — points to "look elsewhere" */}
      <g>
        <line
          x1="76"
          y1="138"
          x2="124"
          y2="138"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="100" cy="138" r="5" fill="var(--ill-hue-2)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      </g>

      {/* Soft shadow */}
      <ellipse
        cx="100"
        cy="172"
        rx="64"
        ry="4"
        fill="var(--ill-shadow)"
      />
    </svg>
  );
}
