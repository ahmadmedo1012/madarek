/**
 * Scene: empty-search — for the "no search results" empty state.
 *
 * Family rules (contracts/illustration-system.md):
 *   - stroke 1.5 round caps + round joins
 *   - colours via --ill-* CSS variables only
 *   - front-facing perspective with a directional pointer (the search arm)
 *   - RTL-aware: the search arm flips when document.dir === 'rtl' so it
 *     reads as "search forward" in either locale
 */
import type { ReactElement } from 'react';

export interface SceneEmptySearchProps {
  /** Layout direction; defaults to ltr. The magnifier arm rotates 90° in RTL. */
  dir?: 'ltr' | 'rtl';
}

export function SceneEmptySearch({ dir = 'ltr' }: SceneEmptySearchProps): ReactElement {
  const isRtl = dir === 'rtl';
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Paper backdrop */}
      <rect
        x="20"
        y="40"
        width="120"
        height="120"
        rx="12"
        ry="12"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />

      {/* Three placeholder rule lines on the page */}
      <line x1="36" y1="64" x2="116" y2="64" stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="78" x2="100" y2="78" stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="92" x2="108" y2="92" stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Magnifier — group rotates so the handle points "forward" in RTL */}
      <g transform={isRtl ? 'translate(200, 0) scale(-1, 1)' : undefined}>
        <circle
          cx="146"
          cy="118"
          r="22"
          fill="var(--ill-hue-1)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
        />
        <circle
          cx="146"
          cy="118"
          r="14"
          fill="var(--ill-paper)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
        />
        {/* Handle */}
        <line
          x1="162"
          y1="134"
          x2="178"
          y2="150"
          stroke="var(--ill-stroke)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Soft shadow under the page */}
      <ellipse
        cx="80"
        cy="172"
        rx="48"
        ry="4"
        fill="var(--ill-shadow)"
      />
    </svg>
  );
}
