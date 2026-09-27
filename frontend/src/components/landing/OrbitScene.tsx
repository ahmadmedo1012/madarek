import { useEffect, useRef, useState } from 'react';

/**
 * OrbitScene — «مدارات المعرفة» canvas engine.
 *
 * The living centerpiece of the immersive landing: a deep-night sky where
 * knowledge nodes travel along elliptical orbits, connect into
 * constellations, and a bright "traveller" (the learner) journeys between
 * orbits leaving a fading golden trail.
 *
 * ── Craft contract (docs/immersive-redesign-plan.md §5) ──────────────
 * · Zero dependencies — Canvas 2D + one rAF loop.
 * · DPR capped at 2; density scales with viewport area.
 * · Fully paused when offscreen (IntersectionObserver) or tab hidden.
 * · prefers-reduced-motion → one high-quality static frame, no loop.
 * · navigator.saveData / low deviceMemory → reduced density.
 * · Any canvas failure → component unmounts itself; the hero's CSS
 *   gradient + SVG star fallback carries the scene (page stays complete).
 * · Every listener + rAF + observer is cleaned up on unmount.
 */

type Density = 'full' | 'low';

export type OrbitSceneProps = {
  className?: string;
  /** Force a density tier (used by tests / embeds). Default: auto. */
  density?: Density;
  /**
   * Horizontal bias of the orbital system, −1 … 1 (0 = centered).
   * The hero passes a negative value so the visual mass sits opposite
   * the RTL text column, keeping the composition asymmetric.
   */
  biasX?: number;
  /** Ambient rotation speed multiplier. 1 = default. */
  speed?: number;
};

type Star = { x: number; y: number; r: number; base: number; phase: number; tint: number };
type Node = {
  orbit: number;
  angle: number;
  omega: number;
  r: number;
  color: 'gold' | 'azure' | 'mist';
};
type TrailPoint = { x: number; y: number };

const NODE_COLORS = {
  gold: [233, 180, 76],
  azure: [111, 168, 255],
  mist: [168, 178, 210],
} as const;

const GOLD = NODE_COLORS.gold;
const INK_RGB = [242, 239, 230] as const; // warm white — matches --ln-ink

/** Pre-rendered radial-glow sprites — shadowBlur is too slow per-frame. */
function makeGlowSprite(size: number, rgb: readonly number[], coreAlpha: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const half = size / 2;
  const grad = g.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coreAlpha})`);
  grad.addColorStop(0.25, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coreAlpha * 0.55})`);
  grad.addColorStop(0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coreAlpha * 0.14})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function OrbitScene({ className, density, biasX = 0, speed = 1 }: OrbitSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) return;
    const context = canvasNode.getContext('2d', { alpha: true });
    if (!context) {
      setFailed(true);
      return;
    }
    // Non-nullable aliases — narrowing doesn't survive into the hoisted
    // engine functions below, so hand them values that are never null.
    const canvas: HTMLCanvasElement = canvasNode;
    const ctx: CanvasRenderingContext2D = context;

    // ── environment tiers ─────────────────────────────────────────────
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
    const saveData = Boolean(conn?.saveData);
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    const lowMemory = typeof mem === 'number' && mem <= 2;

    const tier: Density = density ?? (saveData || lowMemory ? 'low' : 'full');

    // ── sizing ────────────────────────────────────────────────────────
    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let nodes: Node[] = [];
    let nebula: HTMLCanvasElement | null = null;
    let glowGold: HTMLCanvasElement;
    let glowAzure: HTMLCanvasElement;
    let glowInk: HTMLCanvasElement;

    // ── scene model ───────────────────────────────────────────────────
    const ORBITS = [
      { rx: 0.3, ry: 0.115, rot: -0.38, omega: 0.00016, mist: 0.16 },
      { rx: 0.44, ry: 0.185, rot: -0.32, omega: 0.00011, mist: 0.12 },
      { rx: 0.58, ry: 0.26, rot: -0.27, omega: 0.00008, mist: 0.09 },
      { rx: 0.72, ry: 0.335, rot: -0.22, omega: 0.00006, mist: 0.07 },
    ];

    const mouse = { x: 0.5, y: 0.5, active: false, sx: 0.5, sy: 0.5 };
    let scrollP = 0; // 0 … 1 as the hero scrolls away
    let introT = 0; // 0 … 1 scene bloom on mount

    function buildScene() {
      const area = w * h;
      const starCount = tier === 'low'
        ? Math.max(40, Math.round(area / 24000))
        : Math.max(110, Math.round(area / 8200));
      stars = Array.from({ length: Math.min(starCount, 260) }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.3,
        base: 0.12 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        tint: Math.random(),
      }));

      const nodeCount = tier === 'low' ? 10 : 16;
      const palette: Array<'gold' | 'azure' | 'mist'> = ['gold', 'gold', 'azure', 'mist', 'gold', 'azure'];
      nodes = Array.from({ length: nodeCount }, (_, i) => {
        const orbit = i % ORBITS.length;
        return {
          orbit,
          angle: Math.random() * Math.PI * 2,
          omega: ORBITS[orbit]!.omega * (0.75 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1),
          r: 1.8 + Math.random() * 2.2,
          color: palette[i % palette.length]!,
        };
      });

      // Nebula — painted once per resize into an offscreen canvas.
      nebula = document.createElement('canvas');
      nebula.width = Math.max(1, w);
      nebula.height = Math.max(1, h);
      const ng = nebula.getContext('2d');
      if (ng) {
        const cx = w * (0.5 + biasX * 0.5);
        const paint = (x: number, y: number, rr: number, rgb: readonly number[], a: number) => {
          const grad = ng.createRadialGradient(x, y, 0, x, y, rr);
          grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ng.fillStyle = grad;
          ng.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        };
        paint(cx, h * 0.42, Math.max(w, h) * 0.52, [26, 34, 74], 0.55); // deep indigo bloom
        paint(cx, h * 0.46, Math.max(w, h) * 0.2, [58, 44, 22], 0.34); // focal glow at the orbital heart
        paint(cx + w * 0.18, h * 0.3, Math.max(w, h) * 0.3, [46, 38, 20], 0.5); // faint warm dust
        paint(w * 0.12, h * 0.75, Math.max(w, h) * 0.24, [18, 26, 58], 0.4);
        paint(w * 0.9, h * 0.18, Math.max(w, h) * 0.2, [30, 24, 60], 0.35);
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildScene();
    }

    // ── helpers ───────────────────────────────────────────────────────
    function orbitPoint(orbit: number, angle: number, scale: number) {
      const o = ORBITS[orbit]!;
      const cx = w * (0.5 + biasX * 0.42);
      const cy = h * 0.46;
      const rx = w * o.rx * scale;
      const ry = h * o.ry * scale;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = cos * rx;
      const y = sin * ry;
      const rxr = Math.cos(o.rot);
      const ryr = Math.sin(o.rot);
      return {
        x: cx + x * rxr - y * ryr,
        y: cy + x * ryr + y * rxr,
      };
    }

    const traveller = {
      orbit: 1,
      angle: -Math.PI / 3,
      jumpFrom: null as null | { orbit: number; angle: number; t: number; dur: number; toOrbit: number; toAngle: number },
      trail: [] as TrailPoint[],
    };

    function systemScale() {
      // orbits bloom in on mount, then expand slightly as the hero scrolls away
      const bloom = 0.94 + 0.06 * introT;
      return bloom * (1 + scrollP * 0.14);
    }

    function pushTrail(pt: TrailPoint) {
      traveller.trail.push(pt);
      if (traveller.trail.length > 34) traveller.trail.shift();
    }

    function updateTraveller(dt: number) {
      if (traveller.jumpFrom) {
        const j = traveller.jumpFrom;
        j.t += dt;
        const p = Math.min(1, j.t / j.dur);
        const ease = p * p * (3 - 2 * p); // smoothstep
        const a = orbitPoint(j.orbit, j.angle, systemScale());
        const b = orbitPoint(j.toOrbit, j.toAngle, systemScale());
        const lift = Math.sin(p * Math.PI) * 26;
        pushTrail({ x: a.x + (b.x - a.x) * ease, y: a.y + (b.y - a.y) * ease - lift });
        if (p >= 1) {
          traveller.orbit = j.toOrbit;
          traveller.angle = j.toAngle;
          traveller.jumpFrom = null;
          scheduleJump();
        }
        return;
      }
      traveller.angle += ORBITS[traveller.orbit]!.omega * 1.9 * speed * dt;
      pushTrail(orbitPoint(traveller.orbit, traveller.angle, systemScale()));
    }

    let jumpTimer = 0;
    function scheduleJump() {
      // after a random dwell, leap to a neighbouring orbit
      jumpTimer = window.setTimeout(() => {
        const dir = traveller.orbit === 0 ? 1 : traveller.orbit === ORBITS.length - 1 ? -1 : Math.random() < 0.5 ? 1 : -1;
        traveller.jumpFrom = {
          orbit: traveller.orbit,
          angle: traveller.angle,
          toOrbit: traveller.orbit + dir,
          toAngle: traveller.angle + (Math.random() - 0.5) * 2.2,
          t: 0,
          dur: 1500,
        };
      }, 2600 + Math.random() * 4200);
    }

    // ── draw ──────────────────────────────────────────────────────────
    function draw(now: number, dt: number) {
      ctx.clearRect(0, 0, w, h);

      const fade = 1 - scrollP * 0.55;
      ctx.globalAlpha = fade;

      if (nebula) ctx.drawImage(nebula, 0, 0, w, h);

      // stars — parallax layer (deep)
      const starParX = (mouse.sx - 0.5) * 10;
      const starParY = (mouse.sy - 0.5) * 8;
      for (const s of stars) {
        const tw = reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(now * 0.0012 + s.phase);
        const alpha = s.base * tw;
        ctx.fillStyle =
          s.tint < 0.78
            ? `rgba(${INK_RGB[0]},${INK_RGB[1]},${INK_RGB[2]},${alpha})`
            : s.tint < 0.92
              ? `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${alpha})`
              : `rgba(${NODE_COLORS.azure[0]},${NODE_COLORS.azure[1]},${NODE_COLORS.azure[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x * w + starParX, s.y * h + starParY, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // orbit rings — parallax layer (mid)
      const orbitParX = (mouse.sx - 0.5) * 22;
      const orbitParY = (mouse.sy - 0.5) * 16;
      const scale = systemScale();
      ctx.lineWidth = 1;
      for (const o of ORBITS) {
        ctx.strokeStyle = `rgba(142, 151, 184, ${o.mist * fade})`;
        ctx.beginPath();
        ctx.ellipse(
          w * (0.5 + biasX * 0.42) + orbitParX,
          h * 0.46 + orbitParY,
          w * o.rx * scale,
          h * o.ry * scale,
          o.rot,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }

      // nodes
      const pts: Array<{ x: number; y: number; r: number; color: 'gold' | 'azure' | 'mist' }> = [];
      for (const n of nodes) {
        n.angle += n.omega * speed * (reducedMotion ? 0 : 1) * dt;
        const p = orbitPoint(n.orbit, n.angle, scale);
        let px = p.x;
        let py = p.y;
        if (canHover && mouse.active) {
          const mx = mouse.sx * w;
          const my = mouse.sy * h;
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 170 && dist > 0.001) {
            const pull = (1 - dist / 170) * 14;
            px += (dx / dist) * pull;
            py += (dy / dist) * pull;
          }
        }
        pts.push({ x: px, y: py, r: n.r, color: n.color });
      }

      // constellation links between near nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let k = i + 1; k < pts.length; k++) {
          const a = pts[i]!;
          const b = pts[k]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 175) {
            const alpha = (1 - d / 175) * 0.3 * fade;
            ctx.strokeStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // node glows + cores
      for (const p of pts) {
        const sprite = p.color === 'gold' ? glowGold : p.color === 'azure' ? glowAzure : glowInk;
        const gs = p.r * 11;
        ctx.drawImage(sprite, p.x - gs / 2, p.y - gs / 2, gs, gs);
        const rgb = NODE_COLORS[p.color];
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // traveller + trail — parallax layer (front)
      if (!reducedMotion) updateTraveller(dt);
      const tr = traveller.trail;
      for (let i = 1; i < tr.length; i++) {
        const p0 = tr[i - 1]!;
        const p1 = tr[i]!;
        const t = i / tr.length;
        ctx.strokeStyle = `rgba(${GOLD[0]},${GOLD[1]},${GOLD[2]},${t * 0.55 * fade})`;
        ctx.lineWidth = 1 + t * 2.2;
        ctx.beginPath();
        ctx.moveTo(p0.x + orbitParX, p0.y + orbitParY);
        ctx.lineTo(p1.x + orbitParX, p1.y + orbitParY);
        ctx.stroke();
      }
      if (tr.length > 0) {
        const head = tr[tr.length - 1]!;
        const hx = head.x + orbitParX;
        const hy = head.y + orbitParY;
        ctx.drawImage(glowGold, hx - 33, hy - 33, 66, 66);
        ctx.fillStyle = 'rgba(255, 236, 190, 0.98)';
        ctx.beginPath();
        ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    // ── static frame (reduced-motion path) ────────────────────────────
    function drawStatic() {
      introT = 1;
      // seed a trail along the current orbit for a composed still
      traveller.trail = [];
      for (let i = 0; i < 34; i++) {
        traveller.angle -= ORBITS[traveller.orbit]!.omega * 26;
        traveller.trail.unshift(orbitPoint(traveller.orbit, traveller.angle, systemScale()));
      }
      draw(0, 0);
    }

    // ── loop control ──────────────────────────────────────────────────
    let raf = 0;
    let last = 0;
    let dtGlobal = 16;
    let running = false;
    let inView = true;
    let visible = !document.hidden;

    function frame(now: number) {
      raf = 0;
      if (!running) return;
      dtGlobal = Math.min(48, now - last || 16);
      last = now;
      if (introT < 1) introT = Math.min(1, introT + dtGlobal / 1400);
      draw(now, dtGlobal);
      if (running) raf = requestAnimationFrame(frame);
    }

    function setRunning(next: boolean) {
      if (reducedMotion) return; // static path never loops
      const target = next && inView && visible;
      if (target === running) return;
      running = target;
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    // ── listeners ─────────────────────────────────────────────────────
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          inView = e.isIntersecting;
          setRunning(inView);
        }
      },
      { rootMargin: '80px 0px' },
    );
    io.observe(canvas);

    const onVisibility = () => {
      visible = !document.hidden;
      setRunning(visible);
    };
    document.addEventListener('visibilitychange', onVisibility);

    const ro = new ResizeObserver(() => {
      resize();
      if (reducedMotion) drawStatic();
    });
    ro.observe(canvas);

    const onScroll = () => {
      const rect = canvas.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      scrollP = Math.max(0, Math.min(1, -rect.top / (vh * 0.9)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    let mouseRaf = 0;
    const onMouse = (e: MouseEvent) => {
      if (mouseRaf) return;
      mouseRaf = requestAnimationFrame(() => {
        mouseRaf = 0;
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) / Math.max(1, rect.width);
        mouse.y = (e.clientY - rect.top) / Math.max(1, rect.height);
        mouse.active = mouse.x >= 0 && mouse.x <= 1 && mouse.y >= 0 && mouse.y <= 1;
        mouse.sx += (mouse.x - mouse.sx) * 0.12;
        mouse.sy += (mouse.y - mouse.sy) * 0.12;
      });
    };
    if (canHover) window.addEventListener('mousemove', onMouse, { passive: true });

    // ── boot / teardown ───────────────────────────────────────────────
    const teardown = () => {
      running = false;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
      if (raf) cancelAnimationFrame(raf);
      if (mouseRaf) cancelAnimationFrame(mouseRaf);
      window.clearTimeout(jumpTimer);
    };

    try {
      glowGold = makeGlowSprite(96, GOLD, 0.9);
      glowAzure = makeGlowSprite(96, NODE_COLORS.azure, 0.85);
      glowInk = makeGlowSprite(96, NODE_COLORS.mist, 0.8);
      resize();
      if (reducedMotion) {
        drawStatic();
      } else {
        scheduleJump();
        setRunning(true);
      }
    } catch {
      setFailed(true);
      teardown();
      return;
    }

    return teardown;
  }, [density, biasX, speed]);

  if (failed) return null;
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
