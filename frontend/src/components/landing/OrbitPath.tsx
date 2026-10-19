/**
 * OrbitPath — the landing hero's orbital light-path (r190 «مدار المعرفة»).
 *
 * One thin trajectory line + one glowing node, drawn once on load
 * (CSS keyframes in landing.css drive the draw + ignite; the svg
 * carries only geometry). Decorative: aria-hidden by the consumer,
 * pointer-events none, reduced-motion turns the draw into a static
 * path. Lives in components/landing/ — the icon-gate's documented
 * landing-scene zone (same governance as the retired OrbitScene).
 */
export function OrbitPath({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="fo-orbit-path-line"
        d="M 1310 780 C 1050 700, 760 560, 520 420 S 160 160, -40 90"
        pathLength={1}
      />
      <circle className="fo-orbit-node" cx="1310" cy="780" r="5" />
    </svg>
  );
}
