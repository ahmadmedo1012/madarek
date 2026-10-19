import { useId } from 'react';

/**
 * KnowledgeMap — the pinned stage's radial system, Madarek's equivalent of
 * the reference's orbital map (r191 spec §2.2): concentric learning rings
 * around the institution, Arabic node labels, connection paths that light
 * up scene-by-scene, and a slow scroll-bound rotation.
 *
 * Everything derives from the stage's `--sp` (0→1, written by
 * useScrollStage) and per-scene boundaries passed as CSS vars on the
 * parent (`.mg-frame[data-in]` sets --f0…). Node activation uses the
 * SAME clamp-interpolation grammar the frames use, so JS only ships
 * geometry once — all motion is CSS calc off --sp.
 *
 * Pure SVG + aria-hidden: it is a decorative diagram; the narrative
 * frames carry the actual content for screen readers.
 */
export function KnowledgeMap({ className }: { className?: string }) {
  const clipId = useId();

  // Ring radii — the map sits anchored to the section's bottom-left corner
  // (RTL mirror of Turion's bottom-left anchor), so radii extend off-canvas
  // like the reference's 6,700px circles. We compose in a 900×900 viewBox
  // and let CSS crop it.
  const cx = 450;
  const cy = 450;

  // Nodes: label + ring radius + angle (deg) — placed once, lit per scene.
  const NODES: Array<{
    id: string; label: string; r: number; a: number; inAt: number;
  }> = [
    { id: 'lecture', label: 'المحاضرة', r: 150, a: 205, inAt: 0.18 },
    { id: 'matrix', label: 'المصفوفة', r: 240, a: 250, inAt: 0.30 },
    { id: 'exam', label: 'الاختبار', r: 150, a: 130, inAt: 0.55 },
    { id: 'research', label: 'البحث', r: 288, a: 132, inAt: 0.42 },
    { id: 'assistant', label: 'المساعد', r: 240, a: 95, inAt: 0.66 },
    { id: 'certificate', label: 'الشهادة', r: 320, a: 45, inAt: 0.78 },
    { id: 'messages', label: 'الرسائل', r: 240, a: 330, inAt: 0.50 },
    { id: 'schedule', label: 'الجدول', r: 150, a: 300, inAt: 0.36 },
  ];

  const pt = (r: number, a: number) => {
    const rad = (a * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };

  return (
    <svg
      className={className ?? 'mg-map'}
      viewBox="0 0 900 900"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${clipId}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--stage-accent)" stopOpacity="0.55" />
          <stop offset="70%" stopColor="var(--stage-accent)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--stage-accent)" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${clipId}-clip`}>
          <rect x="0" y="0" width="900" height="900" rx="0" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId}-clip)`}>
        {/* scroll-bound slow rotation — the reference's measured orbit
            rotation, scaled to taste (~10° across the stage) */}
        <g className="mg-map-rotor">
          {/* core atmosphere — the institution */}
          <circle cx={cx} cy={cy} r="120" fill={`url(#${clipId}-core)`} />
          <circle cx={cx} cy={cy} r="58" className="mg-core-ring" />
          <circle cx={cx} cy={cy} r="6" className="mg-core-dot" />

          {/* learning rings */}
          {[150, 240, 320, 410].map((r) => (
            <circle
              key={r}
              cx={cx}
              cy={cy}
              r={r}
              className="mg-ring"
              style={{ ['--ring' as string]: r }}
            />
          ))}

          {/* connection paths center→ring4 (drawn like trajectories) */}
          {NODES.filter((n) => ['research', 'certificate'].includes(n.id)).map((n) => {
            const [x, y] = pt(n.r, n.a);
            return (
              <line
                key={n.id + '-path'}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                className="mg-path"
                style={{ ['--p-in' as string]: n.inAt }}
              />
            );
          })}

          {/* nodes + labels */}
          {NODES.map((n) => {
            const [x, y] = pt(n.r, n.a);
            return (
              <g
                key={n.id}
                className="mg-node"
                style={{ ['--n-in' as string]: n.inAt }}
                transform={`translate(${x} ${y})`}
              >
                <rect x="-5" y="-5" width="10" height="10" className="mg-node-mark" />
                {/* r193: text-anchor="end" — with direction=rtl the label's
                    inline-end (its LEFT edge) anchors at x=14, so the text
                    extends RIGHTWARD away from the 10×10 node mark. The
                    previous anchor="start" ran the word LEFTWARD across the
                    mark, and its light-gray ink crossing the cream square
                    made every label read as clipped mid-glyph. The CSS halo
                    (paint-order: stroke) keeps the text readable over the
                    rings and glow it crosses on the left-side nodes. */}
                <text x="14" y="4" className="mg-node-label" direction="rtl" textAnchor="end">
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
