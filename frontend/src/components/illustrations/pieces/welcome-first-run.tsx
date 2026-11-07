/**
 * mk-ill piece: welcome-first-run — «أهلًا بك»
 *
 * A signal sun rising behind the paper horizon, wrapped in one soft
 * halo, with three symmetric rays. A first morning, not a fireworks
 * show.
 *
 * Family: r313 two-tone — ink + paper + signal (sun, rays); the halo
 * rides the paper step (--neutral-100), corners square. No text.
 * RTL: mirror-symmetric — direction-neutral.
 */
import { ACCENT, ILL_PAPER, ILL_STROKE, IllSvg, NEUTRAL_100 } from './shell';

export default function WelcomeFirstRun() {
  return (
    <IllSvg>
      {/* the halo, rising with the sun (half-disc, paper step) */}
      <path d="M 56 118 A 44 44 0 0 1 144 118 Z" fill={NEUTRAL_100} />
      {/* the rays */}
      <line x1="100" y1="86" x2="100" y2="78" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="77.4" y1="95.4" x2="71.7" y2="89.7" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <line x1="122.6" y1="95.4" x2="128.3" y2="89.7" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      {/* the sun (half-disc; its base sits on the horizon line) */}
      <path
        d="M 74 118 A 26 26 0 0 1 126 118 Z"
        fill={ACCENT}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* the horizon */}
      <rect
        x="44"
        y="118"
        width="112"
        height="14"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
    </IllSvg>
  );
}
