/**
 * mk-ill piece: empty-notifications — «لا إشعارات»
 *
 * A silent bell: no sound waves, just two muted dots and a signal
 * clapper resting below the lip. The silence is the message.
 *
 * Family: ink + signal (clapper) on --ill-paper; no tint needed.
 * No text. RTL: mirror-symmetric — direction-neutral by design.
 */
import { ACCENT, ILL_PAPER, ILL_STROKE, IllSvg } from './shell';

export default function EmptyNotifications() {
  return (
    <IllSvg>
      {/* two muted dots, symmetric — the sound that never came */}
      <circle cx="58" cy="72" r="2.5" fill={ILL_STROKE} fillOpacity="0.35" />
      <circle cx="142" cy="72" r="2.5" fill={ILL_STROKE} fillOpacity="0.35" />
      {/* the bell: dome, flare, lip — one closed outline */}
      <path
        d="M 76 114 a 24 24 0 0 1 48 0 l 6 12 a 4 4 0 0 1 -4 6 h -52 a 4 4 0 0 1 -4 -6 Z"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* the hanger loop */}
      <circle
        cx="100"
        cy="86"
        r="5"
        fill="none"
        stroke={ILL_STROKE}
        strokeWidth="1.5"
      />
      {/* the resting clapper — the one signal fill (square, r313) */}
      <rect x="94" y="138" width="12" height="8" fill={ACCENT} />
    </IllSvg>
  );
}
