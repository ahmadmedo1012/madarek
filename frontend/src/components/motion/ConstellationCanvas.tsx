import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { useScrollProgress } from './useScrollProgress';

/**
 * ConstellationCanvas — the landing hero's "alive" moment
 * (immersive-redesign wave 1).
 *
 * Original scene: «مدارك تتوسّع» — knowledge nodes riding three slow
 * orbital rings around an off-center core (asymmetric composition),
 * threaded by faint copper constellation lines. The pointer is a soft
 * gravity lens (nearby nodes ease aside, majors glow), scroll progress
 * gently expands the system — horizons widening as the journey starts.
 *
 * Budget & safety engineering (docs/immersive-redesign-plan.md §10):
 *   · Zero dependencies. Canvas 2D only — no WebGL requirement, so the
 *     fallback story is trivial (static frame / CSS gradient behind).
 *   · rAF loop gated by IntersectionObserver (off-screen ⇒ zero main
 *     thread work) and tab visibility.
 *   · DPR capped at 2; node count scales with area and drops on weak
 *     hardware (navigator.hardwareConcurrency heuristic).
 *   · prefers-reduced-motion ⇒ ONE static frame, no loop, no pointer
 *     listener. The scene is a still — beautiful, honest, calm.
 *   · Full teardown on unmount: frames, listeners, observers.
 *   · Theme-aware: colors are read from CSS custom properties and
 *     re-read when <html data-theme> flips (MutationObserver) — the
 *     canvas never hardcodes palette values.
 *   · aria-hidden: decorative. The hero's meaning lives in real text.
 *
 * Pointer tracking listens on the PARENT hero element (passed via
 * `hostRef`) — not window — so the scene only reacts while the cursor
 * is actually inside the hero. The canvas itself keeps
 * pointer-events: none so it never steals focus/clicks from CTAs.
 */
export type ConstellationCanvasProps = {
  /** Hero section element — pointer + scroll geometry host. */
  hostRef: React.RefObject<HTMLElement | null>;
  className?: string;
  /**
   * Density multiplier (0.5 = sparse, e.g. phones). Defaults to an
   * area + hardware heuristic.
   */
  density?: number;
};

type Node = {
  ring: number;
  /** Base angle on the ring (radians, layout-time). */
  angle: number;
  /** Angular velocity (rad/s) — ring-wise, alternating direction. */
  omega: number;
  /** Ring radius fraction jitter (0.9–1.1). */
  rJitter: number;
  size: number;
  major: boolean;
  /** Eased pointer-lens offset (px), updated per frame. */
  ox: number;
  oy: number;
  /** Slow twinkle phase (radians). */
  twinkle: number;
};

type Palette = { node: string; major: string; line: string; core: string };

const TAU = Math.PI * 2;

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string): string => {
    const v = style.getPropertyValue(name).trim();
    return v.length > 0 ? v : fallback;
  };
  return {
    node: pick('--journey-node', '#B57438'),
    major: pick('--journey-node-major', '#8F5A2B'),
    line: pick('--journey-line', 'rgba(181, 116, 56, 0.28)'),
    core: pick('--journey-core', '#191918'),
  };
}

export function ConstellationCanvas({
  hostRef,
  className,
  density,
}: ConstellationCanvasProps): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  // Own scroll progress for the expansion choreography — reads the
  // smooth ref inside the loop, never re-renders for it.
  const [wrapRef, , progressRef] = useScrollProgress<HTMLDivElement>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // No 2D context — CSS fallback shows through.

    let palette = readPalette();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes: Node[] = [];
    let rafId = 0;
    let running = false;
    let near = true;
    let visible = !document.hidden;
    let lastT = 0;

    // Pointer lens state — RAW client coords stored on the event (zero
    // geometry reads there); converted to canvas-local ONCE per frame.
    let pcx = -9999;
    let pcy = -9999;
    // Eased, canvas-local pointer position used by parallax + lens.
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;

    const cores =
      typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
        ? navigator.hardwareConcurrency
        : 4;
    const weak = cores > 0 && cores <= 4;

    const RING_R: ReadonlyArray<number> = [0.3, 0.47, 0.66];
    const OMEGAS: ReadonlyArray<number> = [0.045, -0.032, 0.022]; // rad/s — slow, alternating

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density: area heuristic, hardware-discounted, caller-tunable.
      const areaScale = Math.min(Math.max((width * height) / 420_000, 0.45), 1.25);
      const d = (density ?? 1) * areaScale * (weak ? 0.7 : 1);

      nodes = [];
      const ringCounts = [Math.round(7 * d), Math.round(11 * d), Math.round(14 * d)];
      for (let ring = 0; ring < 3; ring += 1) {
        const count = Math.max(4, ringCounts[ring] ?? 6);
        const omega = OMEGAS[ring] ?? 0.03;
        for (let i = 0; i < count; i += 1) {
          const major = (i * 3 + ring) % 7 === 0;
          nodes.push({
            ring,
            angle: (i / count) * TAU + (Math.random() - 0.5) * 0.35,
            omega: omega * (0.85 + Math.random() * 0.3),
            rJitter: 0.9 + Math.random() * 0.2,
            size: major ? 3.2 + Math.random() * 1.4 : 1.1 + Math.random() * 1.5,
            major,
            ox: 0,
            oy: 0,
            twinkle: Math.random() * TAU,
          });
        }
      }
    };

    const nodeRadius = (node: Node, minDim: number): number => {
      const base = (RING_R[node.ring] ?? 0.47) * (minDim / 2) * node.rJitter;
      // Journey expansion: the system breathes outward with scroll.
      return base * (1 + (1 - progressRef.current) * 0.02 + progressRef.current * 0.1);
    };

    const nodePos = (node: Node, minDim: number): [number, number, number, number] => {
      // Off-center core (asymmetric composition, RTL-balanced by
      // placing the system toward the inline-end third of the hero).
      const rtl = document.documentElement.dir === 'rtl';
      const cx = width * (rtl ? 0.34 : 0.66);
      const cy = height * 0.46;
      const r = nodeRadius(node, minDim);
      const a = node.angle;
      // Global pointer parallax — depth by ring (outer drifts more).
      const depth = (node.ring + 1) / 3;
      const gx = px * 10 * depth;
      const gy = py * 8 * depth;
      return [cx + Math.cos(a) * r + node.ox + gx, cy + Math.sin(a) * r * 0.86 + node.oy + gy, r, depth];
    };

    const draw = (t: number) => {
      const dt = lastT > 0 ? Math.min((t - lastT) / 1000, 0.05) : 0.016;
      lastT = t;

      // ONE geometry read per frame: convert the raw pointer coords to
      // canvas-local space (the lens + parallax share it).
      const canvasRect = canvas.getBoundingClientRect();
      if (pcx > -9000) {
        tx = ((pcx - canvasRect.left) / canvasRect.width) * 2 - 1;
        ty = ((pcy - canvasRect.top) / canvasRect.height) * 2 - 1;
      }
      // Ease pointer + lens offsets.
      px += (tx - px) * 0.06;
      py += (ty - py) * 0.06;

      const minDim = Math.min(width, height);
      ctx.clearRect(0, 0, width, height);

      const positions: Array<[number, number, number, number] | undefined> = new Array(nodes.length);

      // Update + draw nodes.
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (!node) continue;
        node.angle += node.omega * dt;
        node.twinkle += dt * 1.4;
        const [x, y, , depth] = nodePos(node, minDim);
        positions[i] = [x, y, node.size, depth];

        // Pointer lens: ease nodes away from the cursor (canvas-local
        // coords — no per-node geometry reads).
        if (!reduced) {
          const mx = ((px + 1) / 2) * width;
          const my = ((py + 1) / 2) * height;
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.hypot(dx, dy);
          const R = minDim * 0.22;
          if (dist < R && dist > 0.001) {
            const push = (1 - dist / R) * 16 * depth;
            node.ox += (-(dx / dist) * push - node.ox) * 0.12;
            node.oy += (-(dy / dist) * push - node.oy) * 0.12;
          } else {
            node.ox += -node.ox * 0.1;
            node.oy += -node.oy * 0.1;
          }
        }

        const tw = 0.55 + 0.45 * Math.sin(node.twinkle);
        ctx.beginPath();
        ctx.arc(x, y, node.size, 0, TAU);
        ctx.globalAlpha = node.major ? 0.85 : 0.4 + tw * 0.35;
        ctx.fillStyle = node.major ? palette.major : palette.node;
        ctx.fill();

        if (node.major) {
          // Soft halo via concentric alpha — cheaper than shadowBlur.
          ctx.globalAlpha = 0.12 + tw * 0.1;
          ctx.beginPath();
          ctx.arc(x, y, node.size * 2.6, 0, TAU);
          ctx.fillStyle = palette.node;
          ctx.fill();
        }
      }

      // Constellation threads: intra-ring neighbors + cross-ring
      // proximity links (O(n²) at ≤ ~70 nodes — trivial per frame).
      const linkDist = minDim * 0.14;
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = positions[i];
        const aNext = positions[(i + 1) % nodes.length];
        const nodeA = nodes[i];
        const nodeNext = nodes[(i + 1) % nodes.length];
        if (!a || !aNext || !nodeA || !nodeNext) continue;
        // Ring neighbor line (only same-ring).
        if (nodeA.ring === nodeNext.ring) {
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = palette.line;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(aNext[0], aNext[1]);
          ctx.stroke();
        }
        for (let j = i + 2; j < nodes.length; j += 1) {
          const nodeB = nodes[j];
          const b = positions[j];
          if (!nodeB || !b || nodeA.ring === nodeB.ring) continue;
          const dx = a[0] - b[0];
          const dy = a[1] - b[1];
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * linkDist) {
            const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.22;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = palette.line;
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.stroke();
          }
        }
      }

      // Core: a small ink point with a breathing halo — the "self"
      // around which horizons expand.
      const rtl = document.documentElement.dir === 'rtl';
      const cx = width * (rtl ? 0.34 : 0.66);
      const cy = height * 0.46;
      const breath = 0.5 + 0.5 * Math.sin(t / 1400);
      ctx.globalAlpha = 0.1 + breath * 0.08;
      ctx.beginPath();
      ctx.arc(cx, cy, 10 + breath * 6, 0, TAU);
      ctx.fillStyle = palette.node;
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.4, 0, TAU);
      ctx.fillStyle = palette.core;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const frame = (t: number) => {
      if (!running) return;
      draw(t);
      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduced) return;
      if (!near || !visible) return;
      running = true;
      lastT = 0;
      rafId = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const renderStatic = () => {
      // Reduced-motion: one calm frame at rest (no pointer, no drift).
      draw(1200);
    };

    const onPointerMove = (e: PointerEvent) => {
      // Store raw client coords — geometry happens once per frame in
      // draw(), never in the event handler (passive, zero reads).
      pcx = e.clientX;
      pcy = e.clientY;
    };

    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) start();
      else stop();
    };

    // ── Observers & listeners ─────────────────────────────────────
    const ro = new ResizeObserver(() => {
      layout();
      if (reduced) renderStatic();
    });
    ro.observe(canvas);

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            near = entry.isIntersecting;
            if (near) start();
            else stop();
          }
        },
        { rootMargin: '10% 0px' },
      );
      io.observe(canvas);
    }

    let themeObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(() => {
        palette = readPalette();
        if (reduced) renderStatic();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'dir'],
      });
    }

    if (!reduced) {
      host.addEventListener('pointermove', onPointerMove, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);

    layout();
    if (reduced) {
      renderStatic();
    } else {
      start();
    }

    return () => {
      stop();
      ro.disconnect();
      io?.disconnect();
      themeObserver?.disconnect();
      if (!reduced) {
        host.removeEventListener('pointermove', onPointerMove);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hostRef, reduced, density, progressRef]);

  // The reduced-motion static frame still needs a draw on theme flips —
  // handled inside the effect. Render: one wrapper (scroll progress
  // host) + the canvas. Decorative: hidden from AT entirely.
  return (
    <div ref={wrapRef} className={className} aria-hidden="true" data-constellation="true">
      <canvas ref={canvasRef} className="constellation-canvas" />
    </div>
  );
}
