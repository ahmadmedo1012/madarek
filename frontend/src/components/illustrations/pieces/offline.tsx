/**
 * mk-ill piece: offline — «لا اتصال»
 *
 * The cloud is fine; the path beneath it is not — two dotted segments
 * end short of each other, and one small dot never made it across.
 * No slash, no crossed symbols — the interruption itself tells it.
 *
 * Family: r313 two-tone — ink + paper; the cloud's status orb reads
 * as quiet ink (the tinted orb retired with the soft-tint family).
 * No text. RTL: mirror-symmetric.
 */
import { dotted, ILL_PAPER, ILL_STROKE, IllSvg } from './shell';

export default function Offline() {
  return (
    <IllSvg>
      {/* the cloud — pill body + two crown bumps, one union outline */}
      <path
        d="M 68 116 A 12 12 0 0 1 68 92 L 73.5 92 A 16 16 0 0 1 95.9 69.4 A 20 20 0 1 1 128.3 92 L 132 92 A 12 12 0 0 1 132 116 Z"
        fill={ILL_PAPER}
        stroke={ILL_STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* the resting status orb, in the cloud's body */}
      <circle cx="100" cy="104" r="7" fill={ILL_STROKE} fillOpacity="0.3" />
      {/* the interrupted path */}
      <line
        x1="70"
        y1="140"
        x2="92"
        y2="140"
        {...dotted(ILL_STROKE, '0.5')}
      />
      <line
        x1="108"
        y1="140"
        x2="130"
        y2="140"
        {...dotted(ILL_STROKE, '0.5')}
      />
      {/* the packet that didn't make it */}
      <circle cx="100" cy="148" r="2.5" fill={ILL_STROKE} fillOpacity="0.4" />
    </IllSvg>
  );
}
