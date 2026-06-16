/**
 * Scene: onboarding-frame-3 — "Get started".
 *
 * Family rules — see contracts/illustration-system.md.
 *
 * Composition: a sprouting plant in a pot, with a sun glyph above —
 * a soft "ready to grow" metaphor. Symmetric.
 */
import type { ReactElement } from 'react';

export function SceneOnboardingFrame3(): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Sun + rays */}
      <circle cx="100" cy="44" r="10" fill="var(--ill-hue-6)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      <line x1="100" y1="22" x2="100" y2="28" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="80" y1="44" x2="86" y2="44" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="44" x2="114" y2="44" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="86" y1="30" x2="90" y2="34" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="114" y1="30" x2="110" y2="34" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Plant stem */}
      <path
        d="M100 144 C 100 120, 100 100, 100 80"
        fill="none"
        stroke="var(--ill-hue-2)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Two leaves */}
      <path
        d="M100 110
           Q 80 100, 76 88
           Q 86 88, 100 100 Z"
        fill="var(--ill-hue-2)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M100 96
           Q 120 90, 124 78
           Q 116 78, 100 88 Z"
        fill="var(--ill-hue-2)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Pot */}
      <path
        d="M76 144
           L 124 144
           L 118 172
           L 82 172 Z"
        fill="var(--ill-hue-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="74" y1="144" x2="126" y2="144" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Soft shadow */}
      <ellipse cx="100" cy="180" rx="38" ry="3" fill="var(--ill-shadow)" />
    </svg>
  );
}
