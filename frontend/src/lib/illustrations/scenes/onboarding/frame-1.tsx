/**
 * Scene: onboarding-frame-1 — "Welcome".
 *
 * Family rules (contracts/illustration-system.md):
 *   - stroke 1.5 round caps + round joins
 *   - colours via --ill-* CSS variables only
 *   - front-facing; symmetric (no RTL mirror)
 *
 * Composition: a paper plane gliding above a soft horizon — a calm,
 * universal "starting your journey" cue without sentimentality.
 */
import type { ReactElement } from 'react';

export function SceneOnboardingFrame1(): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Sky paper backdrop */}
      <rect x="20" y="40" width="160" height="120" rx="14" ry="14" fill="var(--ill-paper)" stroke="var(--ill-stroke)" strokeWidth="1.5" />

      {/* Horizon */}
      <line x1="32" y1="124" x2="168" y2="124" stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Distant hill */}
      <path d="M40 124 Q 70 104, 100 124 Q 130 144, 168 124" fill="none" stroke="var(--ill-hue-2)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Paper plane (centred) */}
      <path
        d="M76 86
           L 138 60
           L 116 100
           L 92 92
           Z"
        fill="var(--ill-hue-1)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="116" y1="100" x2="98" y2="116" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="92" y1="92" x2="116" y2="100" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Trail */}
      <path
        d="M58 100 Q 70 96, 80 90"
        fill="none"
        stroke="var(--ill-hue-3)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />

      {/* Soft shadow */}
      <ellipse cx="100" cy="166" rx="56" ry="3" fill="var(--ill-shadow)" />
    </svg>
  );
}
