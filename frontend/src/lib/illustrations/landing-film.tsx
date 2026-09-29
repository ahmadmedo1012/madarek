/**
 * Landing film decorative SVG scenes (v3 «منظومة المعرفة الحيّة»).
 *
 * Bespoke scene SVGs for the landing's pinned stages — lives under
 * lib/illustrations per the icon-policy allowlist (raw <svg> markup is
 * this directory's job; pages/components consume these components).
 *
 *  · JourneyThreadArt  — the golden learning thread that draws itself
 *    with scroll (SceneJourney drives stroke-dashoffset via a ref).
 *  · SystemLinksArt    — the hairline spokes linking the hub to the
 *    nine function nodes (SceneSystem toggles .is-lit per active node).
 *  · OasisPalmMark     — the assistant's palm sigil (avatar tile).
 */

export function JourneyThreadArt({ pathRef }: { pathRef?: React.Ref<SVGPathElement> }) {
  return (
    <svg className="sc-journey-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path ref={pathRef} className="sc-journey-draw" d="M4,8 L30,22 L10,38 L34,52 L12,68 L38,80 L16,94 L46,96" />
    </svg>
  );
}

export function SystemLinksArt({ links, hub = { x: 50, y: 47 }, activeId }: {
  links: { id: string; x: number; y: number }[];
  hub?: { x: number; y: number };
  activeId?: string | null;
}) {
  return (
    <svg className="sc-system-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {links.map((n) => (
        <line key={n.id} className={`sc-system-link ${activeId === n.id ? 'is-lit' : ''}`}
          x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} />
      ))}
    </svg>
  );
}

export function OasisPalmMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 11C12 8 9.5 6 6.5 6c0 3 2.5 5 5.5 5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 11c0-3 2.5-5 5.5-5 0 3-2.5 5-5.5 5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 11c-2.2-1.4-5-1-6.5 1 1.8 1.9 4.8 1.6 6.5-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 11c2.2-1.4 5-1 6.5 1-1.8 1.9-4.8 1.6-6.5-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
