/**
 * Scene: milestone-section — fired once when a user completes their
 * first major academic milestone (e.g. first assignment, first
 * course section).
 *
 * Family rules (contracts/illustration-system.md):
 *   - stroke 1.5 round caps + round joins
 *   - colours via --ill-* CSS variables only
 *   - front-facing perspective, warm + small celebratory cue
 *   - symmetric — no directional content
 *   - confetti-free per spec; uses small glints + leaf motifs only
 */
import type { ReactElement } from 'react';

export function SceneMilestoneSection(): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Halo backdrop */}
      <circle cx="100" cy="100" r="76" fill="var(--ill-paper)" />
      <circle
        cx="100"
        cy="100"
        r="76"
        fill="none"
        stroke="var(--ill-hue-2)"
        strokeWidth="1.5"
        strokeDasharray="2 6"
      />

      {/* Medal body */}
      <circle
        cx="100"
        cy="108"
        r="34"
        fill="var(--ill-hue-6)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* Medal inner ring */}
      <circle
        cx="100"
        cy="108"
        r="22"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />
      {/* Star inside medal */}
      <path
        d="M100 92
           L 104 104
           L 116 104
           L 106 112
           L 110 124
           L 100 116
           L 90 124
           L 94 112
           L 84 104
           L 96 104 Z"
        fill="var(--ill-hue-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Ribbon on the left */}
      <path
        d="M82 64
           L 90 94
           L 80 88
           L 76 100
           L 64 78 Z"
        fill="var(--ill-hue-4)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Ribbon on the right */}
      <path
        d="M118 64
           L 110 94
           L 120 88
           L 124 100
           L 136 78 Z"
        fill="var(--ill-hue-4)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Two small glints flanking the medal */}
      <path
        d="M52 102 L 56 102 M 54 100 L 54 104"
        stroke="var(--ill-hue-3)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M144 102 L 148 102 M 146 100 L 146 104"
        stroke="var(--ill-hue-3)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Soft shadow */}
      <ellipse
        cx="100"
        cy="160"
        rx="52"
        ry="4"
        fill="var(--ill-shadow)"
      />
    </svg>
  );
}
