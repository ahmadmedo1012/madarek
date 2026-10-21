/**
 * Constellation — the homepage poster mark (r198, stage 2).
 *
 * ONE original graphic object for the OPTIKKA-direction homepage: a flat
 * two-tone orbit/constellation generated from the REAL 25-college registry
 * (frontend/src/data/colleges.config.ts). Each campus is a ring; each
 * college is a node placed deterministically (even angular steps per ring
 * + a fixed, seedless radius rhythm — no Math.random, SSR-stable).
 *
 * Two-tone discipline: ink nodes on paper, with the platform signal
 * (ultramarine) reserved for the center «نقطة» and one node per ring.
 * No text inside the graphic (the r188 no-text-in-imagery rule); labels
 * live in the HTML around it.
 *
 * Variants:
 *  - hero (default): aria-hidden decorative poster art; drifts with the
 *    section's --sp var written by useScrollStage (CSS consumes it — the
 *    component itself never listens to scroll).
 *  - interactive: same geometry, but each node carries data-college-slug
 *    and lights up (`.is-active`) when the matching chip in the HTML
 *    control row is selected. The SVG stays aria-hidden — interaction is
 *    owned by the accessible chip row in LandingPage.
 *
 * The r188-retired scene-component names (OrbitScene, HeroDepthLayer,
 * CollegeConstellation, JourneyLightPath) stay retired — this is a new,
 * dependency-free SVG primitive (r162 pin preserved).
 */
import { colleges } from '../../data/colleges.config';
import type { CollegeIdentityProfile } from '../../data/colleges.config';

/** Deterministic golden-spread angles per ring — even steps, no randomness. */
const RING_RADII = [300, 210, 118];
const RING_JITTER = [0, 12, -12, 6, -6];

type PlacedNode = {
  college: CollegeIdentityProfile;
  ring: number;
  x: number;
  y: number;
  /** The first node of each ring carries the signal tone. */
  isSignal: boolean;
};

function placeNodes(list: readonly CollegeIdentityProfile[]): PlacedNode[] {
  // Campus rings in order of first appearance in the registry.
  const campusOrder: string[] = [];
  for (const c of list) {
    const campus = c.cityAr ?? '';
    if (!campusOrder.includes(campus)) campusOrder.push(campus);
  }
  const perCampus = campusOrder.map((campus) => list.filter((c) => (c.cityAr ?? '') === campus).length);
  const counters = campusOrder.map(() => 0);

  return list.map((college) => {
    const ring = campusOrder.indexOf(college.cityAr ?? '');
    const i = counters[ring]!;
    counters[ring]! += 1;
    const total = perCampus[ring]!;
    const angleDeg = -90 + ring * 14 + (360 / total) * i;
    const angle = (angleDeg * Math.PI) / 180;
    const r = RING_RADII[ring]! + RING_JITTER[i % RING_JITTER.length]!;
    return {
      college,
      ring,
      x: 380 + r * Math.cos(angle),
      y: 380 + r * Math.sin(angle),
      isSignal: i === 0,
    };
  });
}

export function Constellation({
  interactive = false,
  selectedSlug,
  className,
}: {
  /** Interactive mode adds per-node slugs + active state (a11y stays in HTML). */
  interactive?: boolean;
  selectedSlug?: string | null;
  className?: string;
}) {
  const nodes = placeNodes(colleges);
  const rings = [...new Set(nodes.map((n) => n.ring))];

  return (
    <svg
      className={className}
      viewBox="0 0 760 760"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* campus rings — hairline orbits */}
      {rings.map((ring) => (
        <circle
          key={ring}
          cx="380"
          cy="380"
          r={RING_RADII[ring]}
          className="const-ring"
          strokeDasharray={ring % 2 === 0 ? '2 10' : '1 7'}
        />
      ))}

      {/* constellation chords — consecutive nodes per ring */}
      {rings.map((ring) => {
        const ringNodes = nodes.filter((n) => n.ring === ring);
        return ringNodes.map((n, i) => {
          const next = ringNodes[(i + 1) % ringNodes.length]!;
          return (
            <line
              key={`${ring}-chord-${i}`}
              x1={n.x}
              y1={n.y}
              x2={next.x}
              y2={next.y}
              className="const-chord"
            />
          );
        });
      })}

      {/* the center «نقطة» — every knowledge journey starts here */}
      <circle cx="380" cy="380" r="9" className="const-center" />

      {/* the 25 college nodes — final-homepage: the r198 radii (4.5/6)
       * rendered ≈3px dots at hero scale; the poster's focal object
       * needs nodes that carry ink. 5.5/7 + a 9px center point. */}
      {nodes.map(({ college, x, y, isSignal }) => {
        const active = interactive && selectedSlug === college.slug;
        return (
          <g
            key={college.slug}
            className={
              'const-node' +
              (isSignal ? ' is-signal' : '') +
              (active ? ' is-active' : '')
            }
            data-college-slug={interactive ? college.slug : undefined}
          >
            {active && <circle cx={x} cy={y} r="18" className="const-node-halo" />}
            <circle cx={x} cy={y} r={active || isSignal ? 7 : 5.5} className="const-node-dot" />
          </g>
        );
      })}
    </svg>
  );
}
