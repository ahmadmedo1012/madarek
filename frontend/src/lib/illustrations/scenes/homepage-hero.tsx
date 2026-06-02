/**
 * Scene: homepage-hero — the eager-loaded hero illustration for the
 * landing page.
 *
 * Family rules (contracts/illustration-system.md):
 *   - stroke 1.5 round caps + round joins
 *   - colours via --ill-* CSS variables only
 *   - 30° isometric perspective on the desk, front-facing on the
 *     graduation motif
 *   - composition reads in either reading direction (the laptop
 *     screen contains symbolic glyphs only, not directional text)
 *
 * The composition: a graduation cap floating above an open laptop on
 * a small academic desk, flanked by a stack of books and a leaf
 * motif from the family library. The cap conveys "academic arrival",
 * the laptop conveys "platform", the books ground the scene in the
 * university tradition. Calm and aspirational.
 *
 * V1 budget: ≤ 8 KB gzipped per scene. This scene is hand-tuned to
 * roughly 5–6 KB.
 */
import type { ReactElement } from 'react';

export function SceneHomepageHero(): ReactElement {
  return (
    <svg
      viewBox="0 0 320 240"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Backdrop halo — large, soft, behind everything */}
      <ellipse
        cx="160"
        cy="120"
        rx="148"
        ry="100"
        fill="var(--ill-paper)"
      />

      {/* Distant decoration — a faint dashed arc above the cap */}
      <path
        d="M 64 56 Q 160 12, 256 56"
        fill="none"
        stroke="var(--ill-hue-3)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 6"
      />

      {/* Books stack (left of laptop) */}
      <g>
        <rect x="44" y="156" width="44" height="14" rx="2" ry="2"
          fill="var(--ill-hue-4)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
        <rect x="48" y="142" width="40" height="14" rx="2" ry="2"
          fill="var(--ill-hue-3)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
        <rect x="52" y="128" width="36" height="14" rx="2" ry="2"
          fill="var(--ill-hue-1)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
        {/* Spine bands */}
        <line x1="58" y1="135" x2="82" y2="135"
          stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="54" y1="149" x2="84" y2="149"
          stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="50" y1="163" x2="84" y2="163"
          stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Desk surface — long pill */}
      <rect
        x="36"
        y="170"
        width="248"
        height="6"
        rx="3"
        ry="3"
        fill="var(--ill-hue-4)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />

      {/* Laptop body — isometric-ish */}
      <g>
        {/* Base */}
        <path
          d="M 116 170
             L 222 170
             L 232 180
             L 106 180 Z"
          fill="var(--ill-hue-1)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Screen back panel */}
        <rect
          x="124"
          y="92"
          width="92"
          height="78"
          rx="4"
          ry="4"
          fill="var(--ill-paper)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
        />
        {/* Screen content — three glyphs the user can read in either
            direction (no Latin/Arabic text) */}
        {/* A bar-chart trio (no axis labels) */}
        <rect x="136" y="138" width="8" height="20"
          fill="var(--ill-hue-2)" stroke="var(--ill-stroke)" strokeWidth="1.5" rx="1.5" />
        <rect x="148" y="128" width="8" height="30"
          fill="var(--ill-hue-3)" stroke="var(--ill-stroke)" strokeWidth="1.5" rx="1.5" />
        <rect x="160" y="120" width="8" height="38"
          fill="var(--ill-hue-1)" stroke="var(--ill-stroke)" strokeWidth="1.5" rx="1.5" />
        {/* A small star to the right of the bars */}
        <path
          d="M 192 122
             L 196 132
             L 207 132
             L 198 138
             L 201 148
             L 192 142
             L 183 148
             L 186 138
             L 177 132
             L 188 132 Z"
          fill="var(--ill-hue-6)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Top dot (camera stand-in) */}
        <circle cx="170" cy="100" r="1.5" fill="var(--ill-stroke)" />
      </g>

      {/* Graduation cap — floating above the laptop */}
      <g>
        {/* Cap base (mortarboard) — a flattened diamond */}
        <path
          d="M 170 56
             L 218 70
             L 170 84
             L 122 70 Z"
          fill="var(--ill-stroke)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Crown — a small dome under the cap */}
        <path
          d="M 144 76
             Q 170 96, 196 76
             L 196 84
             Q 170 100, 144 84 Z"
          fill="var(--ill-hue-1)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Tassel string + tassel */}
        <path
          d="M 218 70
             L 226 78
             L 226 92"
          fill="none"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="226" cy="96" r="3.5" fill="var(--ill-hue-6)"
          stroke="var(--ill-stroke)" strokeWidth="1.5" />
        {/* Top button on the cap */}
        <circle cx="170" cy="70" r="2" fill="var(--ill-hue-6)" />
      </g>

      {/* Right side — a single tall plant in a pot */}
      <g>
        {/* Pot */}
        <path
          d="M 244 156
             L 282 156
             L 277 174
             L 249 174 Z"
          fill="var(--ill-hue-4)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="242" y1="156" x2="284" y2="156"
          stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Stem */}
        <path
          d="M 263 156 C 263 132, 263 108, 263 90"
          fill="none"
          stroke="var(--ill-hue-2)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Leaves */}
        <path
          d="M 263 130
             Q 244 124, 240 110
             Q 254 110, 263 122 Z"
          fill="var(--ill-hue-2)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 263 110
             Q 282 102, 286 88
             Q 274 88, 263 100 Z"
          fill="var(--ill-hue-2)"
          stroke="var(--ill-stroke)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Three glints around the cap — small, calm */}
      <path d="M 100 80 L 104 80 M 102 78 L 102 82"
        stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 240 50 L 244 50 M 242 48 L 242 52"
        stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 284 124 L 288 124 M 286 122 L 286 126"
        stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Soft shadow under the desk */}
      <ellipse
        cx="160"
        cy="200"
        rx="124"
        ry="6"
        fill="var(--ill-shadow)"
      />
    </svg>
  );
}
