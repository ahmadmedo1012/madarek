import { useEffect, useRef, useState } from 'react';

/**
 * SkyAtlas — «أطلس المعرفة» multi-plane canvas engine (leaders round).
 *
 * The living sky of the madarek landing, built as five independent planes
 * that move at different rates so the frame reads as a place, not a
 * backdrop:
 *
 *   A  nebula      pre-rendered volumetric fog (3 drifting light clouds)
 *   B  far stars   small, slow parallax, twinkle
 *   C  mid stars   brighter, a few cross-glints — the “named stars”
 *   D  astrolabe   the brass instrument — 4 rings, degree ticks with
 *                  Arabic-Indic numerals, rotating rete + alidade.
 *                  Giant, cropped off the left edge (RTL counterweight).
 *   E  dust        near-plane motes, soft, fastest parallax
 *   F  pointers    ambient knowledge nodes that connect to the cursor
 *                  (the traveller's constellation) — hover-tier only.
 *   +  meteors     a streak every 7–15s, full tier only.
 *
 * The camera: scroll through the sticky hero rotates the astrolabe and
 * breathes a slow zoom; the pointer leans every plane by a different
 * amount (the world answers, the copy does not move).
 *
 * ── Craft contract (same as v2, held to a higher bar) ────────────────
 * · Zero dependencies — Canvas 2D + exactly one rAF loop.
 * · DPR capped at 2; density tiers full/low (saveData, ≤2GB memory).
 * · Paused offscreen (IntersectionObserver) and on hidden tabs.
 * · prefers-reduced-motion → one composed static frame (no loop), which
 *   still contains every plane — depth without motion.
 * · Any canvas failure → render nothing; the CSS sky behind carries.
 * · Every listener/observer/rAF cleaned up on unmount.
 */

type Density = 'full' | 'low';

export type SkyAtlasProps = {
  className?: string;
  /** Force a density tier (tests / embeds). Default: auto. */
  density?: Density;
  /** Horizontal placement of the astrolabe mass, −1 (left) … 1 (right). */
  biasX?: number;
};

type Star = {
  x: number; y: number; // 0…1 relative
  r: number;
  base: number; // base alpha
  amp: number; // twinkle amplitude
  phase: number;
  speed: number;
  tint: 0 | 1 | 2; // white / warm / azure
  glint: boolean;
};

type Mote = { x: number; y: number; r: number; a: number; phase: number; dx: number; dy: number };

type PointerNode = { x: number; y: number; r: number; hue: 'gold' | 'azure' | 'mist'; phase: number };

const RGB = {
  gold: [236, 190, 105],
  azure: [122, 172, 255],
  mist: [178, 188, 220],
  ink: [243, 240, 231],
} as const;

/** Pre-rendered radial sprite (glows, dust) — shadowBlur per-frame is too slow. */
function sprite(size: number, rgb: readonly number[], a0: number, stops?: number[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const half = size / 2;
  const grad = g.createRadialGradient(half, half, 0, half, half, half);
  const s = stops ?? [0, 0.25, 0.6, 1];
  grad.addColorStop(s[0] ?? 0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a0})`);
  grad.addColorStop(s[1] ?? 0.25, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a0 * 0.55})`);
  grad.addColorStop(s[2] ?? 0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a0 * 0.14})`);
  grad.addColorStop(s[3] ?? 1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Arabic-Indic digits — the astrolabe's graduated limb speaks its mother tongue. */
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const arNum = (n: number): string => String(n).split('').map((d) => AR_DIGITS[Number(d)] ?? d).join('');
export function SkyAtlas({ className, density, biasX = -0.5 }: SkyAtlasProps) {
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
    const canvas: HTMLCanvasElement = canvasNode;
    const ctx: CanvasRenderingContext2D = context;

    // ── environment tiers ─────────────────────────────────────────────
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
    const saveData = Boolean(conn?.saveData);
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    const lowMemory = typeof mem === 'number' && mem <= 2;
    const tier: Density = density ?? (saveData || lowMemory ? 'low' : 'full');
    const mobile = window.matchMedia('(max-width: 768px)').matches;

    // ── sizing state ──────────────────────────────────────────────────
    let w = 0;
    let h = 0;
    let dpr = 1;
    let starsFar: Star[] = [];
    let starsMid: Star[] = [];
    let motes: Mote[] = [];
    let pointerNodes: PointerNode[] = [];
    let nebulaCanvas: HTMLCanvasElement | null = null;
    let glowGold: HTMLCanvasElement;
    let hazeSprite: HTMLCanvasElement;
    let dustSprite: HTMLCanvasElement;
    let meteor: { x: number; y: number; vx: number; vy: number; life: number; max: number } | null = null;
    let nextMeteorAt = 0;

    // pointer (lerped — direct tracking carries no momentum)
    let px = 0.5;
    let py = 0.5;
    let pxTarget = 0.5;
    let pyTarget = 0.5;
    let pointerSeen = false;

    // hero scroll progress (self-measured; canvas lives in the sticky hero)
    let heroProgress = 0;
    let heroSpan = 1;

    let running = false;
    let raf = 0;
    const t0 = performance.now();

    // ── scene construction ────────────────────────────────────────────
    function buildNebula() {
      const c = document.createElement('canvas');
      c.width = Math.max(2, Math.ceil(w / 2));
      c.height = Math.max(2, Math.ceil(h / 2));
      const g = c.getContext('2d');
      if (!g) return;
      // deep indigo ground — never pure black
      const base = g.createLinearGradient(0, 0, 0, c.height);
      base.addColorStop(0, '#070A16');
      base.addColorStop(0.55, '#0A1024');
      base.addColorStop(1, '#0C1430');
      g.fillStyle = base;
      g.fillRect(0, 0, c.width, c.height);

      const cloud = (cx: number, cy: number, r: number, rgb: readonly number[], a: number) => {
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
        grad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.38})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, c.width, c.height);
      };
      // dawn amber low on the horizon (the world is lit from below-left)
      cloud(c.width * 0.3, c.height * 1.02, c.height * 0.85, RGB.gold, 0.1);
      // cold azure breath behind the astrolabe side
      cloud(c.width * 0.16, c.height * 0.3, c.height * 0.7, RGB.azure, 0.09);
      // faint violet-mist zenith
      cloud(c.width * 0.85, c.height * 0.05, c.height * 0.6, RGB.mist, 0.05);
      nebulaCanvas = c;
    }

    function makeStars(count: number, glintChance: number): Star[] {
      const arr: Star[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          x: Math.random(),
          y: Math.random(),
          r: 0.4 + Math.random() * 1.2,
          base: 0.25 + Math.random() * 0.55,
          amp: 0.1 + Math.random() * 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.2,
          tint: (Math.random() < 0.72 ? 0 : Math.random() < 0.6 ? 1 : 2) as 0 | 1 | 2,
          glint: Math.random() < glintChance,
        });
      }
      return arr;
    }

    function build() {
      const isLow = tier === 'low';
      starsFar = makeStars(isLow || mobile ? 110 : 240, 0);
      starsMid = makeStars(isLow || mobile ? 55 : 110, isLow ? 0.04 : 0.1);
      motes = [];
      const moteCount = isLow ? 14 : mobile ? 22 : 36;
      for (let i = 0; i < moteCount; i++) {
        motes.push({
          x: Math.random(),
          y: Math.random(),
          r: 1.2 + Math.random() * 2.4,
          a: 0.05 + Math.random() * 0.1,
          phase: Math.random() * Math.PI * 2,
          dx: (Math.random() - 0.5) * 0.012,
          dy: (Math.random() - 0.5) * 0.008,
        });
      }
      // ambient knowledge nodes — the traveller's constellation (hover tier)
      pointerNodes = [];
      const nodeCount = 7;
      for (let i = 0; i < nodeCount; i++) {
        const a = (i / nodeCount) * Math.PI * 2 + 0.4;
        pointerNodes.push({
          x: 0.62 + Math.cos(a) * (0.1 + (i % 3) * 0.045),
          y: 0.5 + Math.sin(a) * (0.12 + (i % 2) * 0.07),
          r: 1.6 + Math.random() * 1.4,
          hue: (i % 3 === 0 ? 'gold' : i % 3 === 1 ? 'azure' : 'mist') as 'gold' | 'azure' | 'mist',
          phase: Math.random() * Math.PI * 2,
        });
      }
      glowGold = sprite(96, RGB.gold, 0.9);
      hazeSprite = sprite(160, [24, 38, 88], 0.55);
      dustSprite = sprite(48, RGB.ink, 0.5);
      nextMeteorAt = performance.now() + 4000 + Math.random() * 6000;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNebula();
      build();
      if (reducedMotion) paintStatic();
    }

    // ── the astrolabe ─────────────────────────────────────────────────
    function drawAstrolabe(t: number, scrollRot: number, lean: number, zoom: number) {
      const cx = w * (0.5 + biasX * 0.42);
      const cy = h * 0.46;
      const R = Math.min(w, h) * (mobile ? 0.78 : 0.62);
      const brass = (a: number) => `rgba(228, 186, 112, ${a})`;
      const brassDim = (a: number) => `rgba(196, 158, 96, ${a})`;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(lean * 0.02);
      ctx.scale(zoom, zoom);

      // halo behind the instrument (light, not glow-porn: one soft field)
      ctx.globalAlpha = 0.12;
      ctx.drawImage(glowGold, -R * 1.15, -R * 1.15, R * 2.3, R * 2.3);
      ctx.globalAlpha = 1;
      // atmospheric haze — sells the instrument's scale against the stars
      ctx.globalAlpha = 0.34;
      ctx.drawImage(hazeSprite, -R * 1.55, -R * 1.55, R * 3.1, R * 3.1);
      ctx.globalAlpha = 1;

      // ── limb: the outer graduated ring ──
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = brass(0.4);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.stroke();
      // ticks — every 5°, longer every 15°
      ctx.strokeStyle = brassDim(0.34);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let d = 0; d < 360; d += 5) {
        const a = (d * Math.PI) / 180;
        const long = d % 15 === 0;
        const r0 = R - (long ? 14 : 7);
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2));
      }
      ctx.stroke();
      // Arabic-Indic numerals every 30° — the limb speaks its mother tongue
      ctx.fillStyle = brass(0.4);
      ctx.font = `500 ${Math.max(9, R * 0.052)}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let d = 0; d < 360; d += 30) {
        const a = (d * Math.PI) / 180;
        const rr = R - 27;
        ctx.save();
        ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
        ctx.fillText(arNum(d), 0, 0);
        ctx.restore();
      }

      // ── plate: inner concentric rings ──
      const rings = [0.82, 0.66, 0.5];
      rings.forEach((f, i) => {
        ctx.strokeStyle = brass(0.3 - i * 0.05);
        ctx.lineWidth = i === 0 ? 1.1 : 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, R * f, 0, Math.PI * 2);
        ctx.stroke();
        // travelling dash light on the middle ring (CSS-free, cheap)
        if (i === 1) {
          ctx.setLineDash([2, R * 0.24]);
          ctx.lineDashOffset = -t * 0.012;
          ctx.strokeStyle = brass(0.5);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, R * f, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // ── rete: the spider — rotates with time + scroll ──
      const reteRot = t * 0.00006 + scrollRot;
      ctx.save();
      ctx.rotate(reteRot);
      ctx.strokeStyle = brass(0.5);
      ctx.lineWidth = 1.3;
      // main cross arms
      for (let i = 0; i < 2; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1);
        ctx.lineTo(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.82);
        ctx.stroke();
      }
      // curved pointer (the yeret) — an eccentric arc piercing the limb
      ctx.strokeStyle = brass(0.62);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(R * 0.1, 0);
      ctx.quadraticCurveTo(R * 0.5, -R * 0.34, R * 0.92, -R * 0.18);
      ctx.stroke();
      // node beads on the rete
      for (const f of [0.3, 0.52, 0.74]) {
        ctx.fillStyle = brass(0.85);
        ctx.beginPath();
        ctx.arc(R * f, 0, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ── alidade: the rule, counter-rotating ──
      ctx.save();
      ctx.rotate(-reteRot * 0.6 + 0.7);
      ctx.strokeStyle = 'rgba(140, 168, 224, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-R * 0.48, 0);
      ctx.lineTo(R * 0.48, 0);
      ctx.stroke();
      ctx.restore();

      // ── the heart: a living core — breathing glow + organic wobble ring ──
      const breath = 1 + Math.sin(t * 0.0016) * 0.16 + Math.sin(t * 0.0007) * 0.06;
      ctx.globalAlpha = 0.75;
      ctx.drawImage(glowGold, -R * 0.13 * breath, -R * 0.13 * breath, R * 0.26 * breath, R * 0.26 * breath);
      ctx.globalAlpha = 1;
      // organic displacement — the core is alive, not a circle
      ctx.strokeStyle = 'rgba(246, 222, 170, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      const wob = R * 0.075;
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.12) {
        const n =
          Math.sin(a * 3 + t * 0.0011) * 0.34 +
          Math.sin(a * 5 - t * 0.0007) * 0.22 +
          Math.sin(a * 2 + t * 0.0004) * 0.18;
        const rr = wob * (1 + n * 0.34) * breath;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(246, 222, 170, 0.95)';
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ── frame ─────────────────────────────────────────────────────────
    function paintFrame(now: number) {
      const t = now - t0;
      const rect = canvas.getBoundingClientRect();
      heroProgress = Math.min(1, Math.max(0, -rect.top / Math.max(1, heroSpan)));

      // pointer lean — every plane a different amount
      px += (pxTarget - px) * 0.06;
      py += (pyTarget - py) * 0.06;
      const leanX = (px - 0.5) * 2; // −1…1
      const leanY = (py - 0.5) * 2;

      // camera: slow breath through the hero
      const zoom = 1 + heroProgress * 0.05;
      const scrollRot = heroProgress * 0.42; // radians across the whole hero

      ctx.clearRect(0, 0, w, h);

      // A — nebula (drifts ±14px over a minute; scrolled by hero progress)
      if (nebulaCanvas) {
        const dx = Math.sin(t * 0.00004) * 14 - leanX * 6;
        const dy = Math.cos(t * 0.00005) * 10 + heroProgress * 26 - leanY * 5;
        ctx.globalAlpha = 1;
        ctx.drawImage(nebulaCanvas, -w * 0.04 + dx, -h * 0.04 + dy, w * 1.08, h * 1.08);
      }

      // B — far stars (parallax 0.12 + pointer ±8)
      const drawStars = (list: Star[], par: number, pAmt: number) => {
        for (const s of list) {
          const tw = s.base + Math.sin(t * 0.001 * s.speed + s.phase) * s.amp;
          if (tw <= 0.03) continue;
          const x = s.x * w + leanX * pAmt - heroProgress * par * 30;
          const y = s.y * h + leanY * pAmt * 0.6;
          const c = s.tint === 0 ? RGB.ink : s.tint === 1 ? RGB.gold : RGB.azure;
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, tw)})`;
          ctx.beginPath();
          ctx.arc(x, y, s.r, 0, Math.PI * 2);
          ctx.fill();
          if (s.glint && tw > 0.5) {
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(tw - 0.5) * 0.8})`;
            ctx.lineWidth = 0.7;
            const g = s.r * 3.2;
            ctx.beginPath();
            ctx.moveTo(x - g, y);
            ctx.lineTo(x + g, y);
            ctx.moveTo(x, y - g);
            ctx.lineTo(x, y + g);
            ctx.stroke();
          }
        }
      };
      drawStars(starsFar, 0.12, 8);

      // D — the astrolabe (giant, far — moves least, rotates with scroll)
      drawAstrolabe(t, scrollRot, leanX, zoom);

      // C — mid stars (parallax 0.3, pointer ±16)
      drawStars(starsMid, 0.3, 16);

      // F — the traveller's constellation (hover tier; the world answers)
      if (canHover && pointerSeen && !reducedMotion) {
        const mx = px * w;
        const my = py * h;
        for (const n of pointerNodes) {
          const nx = n.x * w + leanX * 20;
          const ny = n.y * h + leanY * 14 + Math.sin(t * 0.0011 + n.phase) * 5;
          const d = Math.hypot(mx - nx, my - ny);
          const near = Math.max(0, 1 - d / 220);
          const c = RGB[n.hue];
          if (near > 0.02) {
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${near * 0.35})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(nx, ny);
            ctx.stroke();
          }
          const a = 0.35 + near * 0.5 + Math.sin(t * 0.002 + n.phase) * 0.12;
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
          ctx.beginPath();
          ctx.arc(nx, ny, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // E — near dust (fastest parallax; reads as the air you move through)
      for (const m of motes) {
        const x = ((m.x + t * 0.0000045 * m.dx * 60) % 1 + 1) % 1 * w + leanX * 30 - heroProgress * 44;
        const y = ((m.y + t * 0.000003 * m.dy * 60) % 1 + 1) % 1 * h + leanY * 22;
        ctx.globalAlpha = m.a * (0.7 + 0.3 * Math.sin(t * 0.001 + m.phase));
        ctx.drawImage(dustSprite, x - m.r * 3, y - m.r * 3, m.r * 6, m.r * 6);
      }
      ctx.globalAlpha = 1;

      // + — a meteor, rarely (full tier, no reduced motion)
      if (tier === 'full' && !reducedMotion) {
        if (!meteor && now >= nextMeteorAt) {
          const fromRight = Math.random() > 0.5;
          meteor = {
            x: fromRight ? w * (0.7 + Math.random() * 0.3) : w * Math.random() * 0.3,
            y: -h * 0.05,
            vx: (fromRight ? -1 : 1) * (0.22 + Math.random() * 0.1),
            vy: 0.1 + Math.random() * 0.05,
            life: 0,
            max: 60 + Math.random() * 20,
          };
        }
        if (meteor) {
          meteor.life++;
          meteor.x += meteor.vx * w * 0.006;
          meteor.y += meteor.vy * h * 0.01;
          const fade = Math.sin((meteor.life / meteor.max) * Math.PI);
          const tx = meteor.x - meteor.vx * 90;
          const ty = meteor.y - meteor.vy * 90;
          const grad = ctx.createLinearGradient(meteor.x, meteor.y, tx, ty);
          grad.addColorStop(0, `rgba(246, 230, 190, ${0.75 * fade})`);
          grad.addColorStop(1, 'rgba(246, 230, 190, 0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(meteor.x, meteor.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          if (meteor.life >= meteor.max) {
            meteor = null;
            nextMeteorAt = now + 7000 + Math.random() * 8000;
          }
        }
      }
    }

    function paintStatic() {
      // reduced-motion: the whole world, composed, still
      heroProgress = 0;
      ctx.clearRect(0, 0, w, h);
      if (nebulaCanvas) ctx.drawImage(nebulaCanvas, -w * 0.04, -h * 0.04, w * 1.08, h * 1.08);
      const draw = (list: Star[]) => {
        for (const s of list) {
          const c = s.tint === 0 ? RGB.ink : s.tint === 1 ? RGB.gold : RGB.azure;
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${s.base})`;
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      draw(starsFar);
      drawAstrolabe(t0, 0.18, 0, 1);
      draw(starsMid);
      for (const m of motes) {
        ctx.globalAlpha = m.a;
        ctx.drawImage(dustSprite, m.x * w - m.r * 3, m.y * h - m.r * 3, m.r * 6, m.r * 6);
      }
      ctx.globalAlpha = 1;
    }

    function loop(now: number) {
      if (!running) return;
      paintFrame(now);
      raf = requestAnimationFrame(loop);
    }

    // ── lifecycle ─────────────────────────────────────────────────────
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointerSeen = true;
      const rect = canvas.getBoundingClientRect();
      pxTarget = Math.min(1.4, Math.max(-0.4, (e.clientX - rect.left) / rect.width));
      pyTarget = Math.min(1.4, Math.max(-0.4, (e.clientY - rect.top) / rect.height));
    };

    let io: IntersectionObserver | null = null;
    let onVisibility = () => {};

    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // measure the hero (canvas sits inside a sticky hero whose parent is tall)
    const measureHero = () => {
      const holder = canvas.closest('[data-hero-holder]') ?? canvas.parentElement?.parentElement;
      if (holder) {
        const hr = holder.getBoundingClientRect();
        heroSpan = Math.max(1, hr.height - window.innerHeight);
      } else {
        heroSpan = Math.max(1, window.innerHeight);
      }
    };

    resize();
    measureHero();

    if (!reducedMotion) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) start();
          else stop();
        },
        { threshold: 0.01 }
      );
      io.observe(canvas);
      onVisibility = () => {
        if (document.hidden) stop();
        else if (!io || canvas.getBoundingClientRect().bottom > 0) start();
      };
      document.addEventListener('visibilitychange', onVisibility);
      if (canHover) window.addEventListener('pointermove', onPointer, { passive: true });
    }

    const ro = new ResizeObserver(() => {
      resize();
      measureHero();
    });
    ro.observe(canvas);

    return () => {
      stop();
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [density, biasX]);

  if (failed) return null;
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
