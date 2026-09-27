import { useEffect, useRef, useState } from 'react';

/**
 * GoldenThread — «خيط الرحلة» the signature move.
 *
 * One golden line, drawn by the visitor's own scrolling, from the first
 * hero node to the final CTA — passing through every chapter's node,
 * weaving right-to-left the way the page reads. Its head is the
 * traveller: a small light riding the drawn tip. At the end of the page
 * the thread sweeps a full circle around the closing CTA and closes.
 *
 * How it stays honest:
 * · Nodes are REAL elements the page marks with [data-thread-node] —
 *   the thread is computed from the actual layout, never from imagined
 *   coordinates, so it survives every breakpoint and font reflow
 *   (re-measured on resize + body ResizeObserver).
 * · Segment i completes exactly when node i+1 reaches mid-viewport —
 *   the drawing hand is the scroll position, not a timer.
 * · The drawn length is lerped toward its target in one rAF loop —
 *   the thread has momentum without the scroll being touched.
 * · prefers-reduced-motion → the whole thread is drawn, statically:
 *   the complete journey is visible without a single animation.
 * · Pointer-events: none — decoration that can never block a click.
 */
export function GoldenThread() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const ghost = svg.querySelector<SVGPathElement>('.gt-ghost');
    const trail = svg.querySelector<SVGPathElement>('.gt-trail');
    const path = svg.querySelector<SVGPathElement>('.gt-path');
    const traveller = svg.querySelector<SVGGElement>('.gt-traveller');
    const nodesGroup = svg.querySelector<SVGGElement>('.gt-nodes');
    if (!ghost || !trail || !path || !traveller || !nodesGroup) return;

    type Seg = { len: number; startScroll: number; endScroll: number };
    type Pt = { x: number; y: number };
    let segs: Seg[] = [];
    let nodeLens: number[] = [];
    let nodeDots: SVGGElement[] = [];
    let total = 1;
    let w = 0;
    let h = 0;

    let drawn = 0;
    let drawnTarget = 0;
    let raf = 0;

    /** One segment's path between two points — identical to the run in build(). */
    const segPath = (a: Pt, b: Pt, i: number) => {
      const side = i % 2 === 0 ? 1 : -1;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const cdx = Math.abs(dx) * 0.45 + Math.min(180, dist * 0.22);
      const cdy = Math.min(140, Math.max(40, dy * 0.18)) * side;
      const c1x = a.x - Math.sign(dx || -1) * cdx * 0.4;
      const c2x = b.x + Math.sign(dx || -1) * cdx * 0.4;
      return `M ${a.x} ${a.y} C ${c1x} ${a.y + cdy}, ${c2x} ${b.y - cdy}, ${b.x} ${b.y}`;
    };

    /** Measure nodes → build the flowing path through them. Returns false when
     *  fewer than two visible anchors exist (thread disables itself). */
    const build = (): boolean => {
      const docH = Math.max(1, document.documentElement.scrollHeight);
      const base = wrap.parentElement?.getBoundingClientRect();
      if (!base) return false;
      const originX = base.left + window.scrollX;
      const originY = base.top + window.scrollY;
      w = base.width;
      h = docH;

      const nodeEls = Array.from(
        document.querySelectorAll<HTMLElement>('[data-thread-node]')
      ).filter((el) => el.offsetParent !== null); // skip hidden (mobile art direction)
      if (nodeEls.length < 2) {
        setFailed(true);
        return false;
      }

      const pts: Array<Pt & { el: HTMLElement }> = nodeEls.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left + window.scrollX - originX + r.width / 2,
          y: r.top + window.scrollY - originY + r.height / 2,
          el,
        };
      });
      const first = pts[0];
      if (!first) {
        setFailed(true);
        return false;
      }

      // flowing bezier through the nodes — alternate the weave like Arabic calligraphy
      let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (!a || !b) continue;
        const side = i % 2 === 0 ? 1 : -1;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const cdx = Math.abs(dx) * 0.45 + Math.min(180, dist * 0.22);
        const cdy = Math.min(140, Math.max(40, dy * 0.18)) * side;
        const c1x = a.x - Math.sign(dx || -1) * cdx * 0.4;
        const c2x = b.x + Math.sign(dx || -1) * cdx * 0.4;
        d += ` C ${c1x.toFixed(1)} ${(a.y + cdy).toFixed(1)}, ${c2x.toFixed(1)} ${(b.y - cdy).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }

      // the closing flourish: a full circle around the final node (the CTA)
      const fin = pts[pts.length - 1];
      if (!fin) {
        setFailed(true);
        return false;
      }
      const R = Math.max(120, Math.min(210, w * 0.13));
      const k = R * 0.5523;
      const cx = fin.x;
      const cy = fin.y;
      d += ` C ${fin.x - R * 0.4} ${fin.y + k}, ${cx - R} ${cy - k}, ${cx - R} ${cy}`;
      d += ` C ${cx - R} ${cy + k}, ${cx - k} ${cy + R}, ${cx} ${cy + R}`;
      d += ` C ${cx + k} ${cy + R}, ${cx + R} ${cy + k}, ${cx + R} ${cy}`;
      d += ` C ${cx + R} ${cy - k}, ${cx + k} ${cy - R}, ${cx} ${cy - R}`;
      d += ` C ${cx - k} ${cy - R}, ${cx - R} ${cy - k}, ${cx - R} ${cy}`;

      path.setAttribute('d', d);
      trail.setAttribute('d', d);
      ghost.setAttribute('d', d);

      wrap.style.width = `${w}px`;
      wrap.style.height = `${h}px`;
      for (const p of [path, trail, ghost]) {
        p.setAttribute('width', String(w));
        p.setAttribute('height', String(h));
        p.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }

      total = path.getTotalLength() || 1;
      path.style.strokeDasharray = `${total}`;
      trail.style.strokeDasharray = `${total}`;

      // node anchor dots — one per real node, revealed as the thread arrives
      nodesGroup.textContent = '';
      nodeDots = pts.map((p) => {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'gt-node');
        g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        g.style.opacity = '0';
        const ring = document.createElementNS(SVG_NS, 'circle');
        ring.setAttribute('r', '10');
        ring.setAttribute('class', 'gt-node-ring');
        const core = document.createElementNS(SVG_NS, 'circle');
        core.setAttribute('r', '3');
        core.setAttribute('class', 'gt-node-core');
        g.appendChild(ring);
        g.appendChild(core);
        nodesGroup.appendChild(g);
        return g;
      });

      // per-segment scroll ranges + true lengths (probe each segment alone —
      // measuring a bare path requires it to live in the DOM)
      segs = [];
      nodeLens = [0];
      let cursor = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (!a || !b) continue;
        const probe = document.createElementNS(SVG_NS, 'path');
        probe.setAttribute('d', segPath(a, b, i));
        probe.style.visibility = 'hidden';
        svg.appendChild(probe);
        const len = probe.getTotalLength() || 1;
        svg.removeChild(probe);
        const endY = b.el.getBoundingClientRect().top + window.scrollY;
        const prev = segs[segs.length - 1];
        segs.push({
          len,
          startScroll: prev ? prev.endScroll : 0,
          endScroll: Math.max(1, endY - window.innerHeight * 0.55),
        });
        cursor += len;
        nodeLens.push(cursor);
      }
      // final circle flourish
      const circleLen = 2 * Math.PI * R;
      const prevSeg = segs[segs.length - 1];
      segs.push({
        len: circleLen,
        startScroll: prevSeg ? prevSeg.endScroll : 0,
        endScroll: Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
      });
      nodeLens.push(cursor + circleLen * 0.25);
      return true;
    };

    const computeTarget = (): number => {
      const y = window.scrollY;
      if (segs.length === 0) return 0;
      let acc = 0;
      for (const s of segs) {
        const local = Math.max(0, Math.min(1, (y - s.startScroll) / Math.max(1, s.endScroll - s.startScroll)));
        // smoothstep — the thread accelerates and settles within a segment
        const eased = local * local * (3 - 2 * local);
        acc += s.len * eased;
        if (local < 1) break;
      }
      return Math.min(total, acc);
    };

    const paint = () => {
      path.style.strokeDashoffset = `${Math.max(0, total - drawn)}`;
      trail.style.strokeDashoffset = `${Math.max(0, total - drawn * 0.965)}`;
      if (drawn > 2) {
        const pt = path.getPointAtLength(drawn);
        traveller.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
        traveller.style.opacity = '1';
      } else {
        traveller.style.opacity = '0';
      }
      nodeDots.forEach((g, i) => {
        const at = nodeLens[i];
        if (at === undefined) return;
        g.style.opacity = drawn >= at - 1 ? '1' : '0';
      });
    };

    const loop = () => {
      drawn += (drawnTarget - drawn) * 0.09;
      if (Math.abs(drawnTarget - drawn) < 0.5) drawn = drawnTarget;
      paint();
      if (Math.abs(drawnTarget - drawn) >= 0.5) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };

    const ensure = () => {
      drawnTarget = computeTarget();
      if (!raf) raf = requestAnimationFrame(loop);
    };

    if (!build()) return;

    if (reduced) {
      drawn = total;
      drawnTarget = total;
      paint();
      return;
    }

    ensure();
    window.addEventListener('scroll', ensure, { passive: true });

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!build()) return;
        ensure();
      }, 200);
    };
    window.addEventListener('resize', onResize, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);

    return () => {
      window.removeEventListener('scroll', ensure);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      window.clearTimeout(resizeTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (failed) return null;

  return (
    <div ref={wrapRef} className="golden-thread" aria-hidden="true">
      <svg ref={svgRef}>
        {/* faint full route (the untraced path ahead) */}
        <path className="gt-ghost" d="" />
        <path className="gt-trail" d="" />
        <path className="gt-path" d="" />
        {/* the traveller */}
        <g className="gt-traveller">
          <circle className="gt-traveller-halo" r="26" />
          <circle className="gt-traveller-core" r="4" />
        </g>
        {/* node anchors — drawn at build time from the real layout */}
        <g className="gt-nodes" />
      </svg>
    </div>
  );
}
