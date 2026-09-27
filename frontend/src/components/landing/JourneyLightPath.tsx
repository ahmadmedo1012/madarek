import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * JourneyLightPath — the golden thread of the journey chapter.
 *
 * The serpentine light path is COMPUTED, not hand-drawn: after layout we
 * measure every `.ln-station-node` (layout position via offset chain —
 * immune to the reveal-up transform) and generate a smooth cubic path
 * guaranteed to pass through each node, so the thread visibly ties the
 * stations together at every breakpoint.
 *
 * · Scroll-scrub: the lit path uses pathLength=1 + stroke-dashoffset
 *   driven by the section's --sp var (pure CSS, written by
 *   useSectionProgress) — no per-frame JS.
 * · Recomputed on stage resize (ResizeObserver) + after webfonts load
 *   (heights shift) + on orientation change.
 * · Reduced motion: --sp snaps to 1 upstream, so the full thread shows.
 */

type Pt = { x: number; y: number };

/** Layout-box position of `el` relative to `ancestor` (transform-immune). */
function layoutPos(el: HTMLElement, ancestor: HTMLElement): Pt | null {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== ancestor) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return cur === ancestor ? { x, y } : null;
}

/** Smooth vertical-tangent cubic through every point (serpentine feel). */
function buildD(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1]!;
    const p1 = pts[i]!;
    const dy = (p1.y - p0.y) * 0.5;
    d += ` C ${p0.x.toFixed(1)} ${(p0.y + dy).toFixed(1)}, ${p1.x.toFixed(1)} ${(p1.y - dy).toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

export function JourneyLightPath() {
  const stageRef = useRef<SVGSVGElement | null>(null);
  const [geo, setGeo] = useState<{ d: string; w: number; h: number } | null>(null);

  const measure = useCallback(() => {
    const svg = stageRef.current;
    if (!svg) return;
    const stage = svg.closest('.ln-journey-stage') as HTMLElement | null;
    if (!stage) return;

    const w = stage.offsetWidth;
    const h = stage.offsetHeight;
    const nodes = Array.from(stage.querySelectorAll<HTMLElement>('.ln-station-node'));
    const pts: Pt[] = [];
    for (const n of nodes) {
      const p = layoutPos(n, stage);
      if (!p) continue;
      pts.push({ x: p.x + n.offsetWidth / 2, y: p.y + n.offsetHeight / 2 });
    }
    if (pts.length >= 2) {
      setGeo({ d: buildD(pts), w, h });
    }
  }, []);

  useEffect(() => {
    const svg = stageRef.current;
    if (!svg) return;
    const stage = svg.closest('.ln-journey-stage') as HTMLElement | null;
    if (!stage) return;

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    // card heights shift when webfonts swap + when reveals settle
    let t1 = 0;
    let t2 = 0;
    const settle = () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      t1 = window.setTimeout(measure, 650);
      t2 = window.setTimeout(measure, 2200);
    };
    document.fonts?.ready.then(settle).catch(() => undefined);
    window.addEventListener('load', settle);

    return () => {
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('load', settle);
    };
  }, [measure]);

  return (
    <svg
      ref={stageRef}
      className="ln-journey-path"
      viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined}
      preserveAspectRatio="none"
      aria-hidden
    >
      {geo && (
        <>
          <path className="ln-journey-path-base" d={geo.d} pathLength={1} />
          <path className="ln-journey-path-light" d={geo.d} pathLength={1} />
        </>
      )}
    </svg>
  );
}
