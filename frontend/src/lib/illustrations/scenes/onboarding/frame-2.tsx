/**
 * Scene: onboarding-frame-2 — "What you can do".
 *
 * Family rules — see contracts/illustration-system.md.
 *
 * Composition: a small workspace — desk lamp, open book, mug — set on
 * a paper card. Conveys "this is your space" without being too literal
 * about a specific role; works for student, faculty, admin alike.
 */
import type { ReactElement } from 'react';

export function SceneOnboardingFrame2(): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Desk surface */}
      <rect x="22" y="120" width="156" height="40" rx="6" ry="6" fill="var(--ill-paper)" stroke="var(--ill-stroke)" strokeWidth="1.5" />

      {/* Lamp arm */}
      <line x1="50" y1="58" x2="50" y2="120" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="58" x2="74" y2="48" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Lamp shade */}
      <path
        d="M70 50
           L 96 50
           L 90 70
           L 76 70 Z"
        fill="var(--ill-hue-6)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Lamp base */}
      <ellipse cx="50" cy="120" rx="10" ry="3" fill="var(--ill-hue-4)" stroke="var(--ill-stroke)" strokeWidth="1.5" />

      {/* Book — open, two pages */}
      <path
        d="M104 92
           L 132 90
           L 132 116
           L 104 118 Z"
        fill="var(--ill-hue-3)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M132 90
           L 160 92
           L 160 118
           L 132 116 Z"
        fill="var(--ill-hue-3)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Book lines */}
      <line x1="110" y1="100" x2="126" y2="99" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="110" y1="106" x2="124" y2="105" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="138" y1="100" x2="154" y2="101" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="138" y1="106" x2="152" y2="107" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Mug */}
      <rect x="74" y="100" width="20" height="22" rx="3" ry="3" fill="var(--ill-hue-1)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      <path d="M94 106 Q 102 106, 102 112 Q 102 118, 94 118" fill="none" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Steam */}
      <path d="M80 92 Q 82 88, 80 84" fill="none" stroke="var(--ill-hue-2)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M88 92 Q 90 88, 88 84" fill="none" stroke="var(--ill-hue-2)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
