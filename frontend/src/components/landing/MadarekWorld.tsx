import { useEffect, useRef } from 'react';
import type * as THREE_NS from 'three';
import { createScrollConductor, type ConductorState } from '../../lib/scroll-conductor';

/**
 * MadarekWorld — the persistent Three.js scroll world (r303, built on the
 * build-threejs-scroll-worlds skill).
 *
 * WORLD BIBLE (condensed — see the skill's references/world-bible.md):
 *
 * World sentence — «Travel around and into Madarek's knowledge knot: a
 * torus-knot of stacked learning fins on warm paper, whose camera orbits,
 * closes on the copper signal, pulls back over the five roles, and passes
 * through the knot at the vision chapter.»
 *
 * Topology — LAYERED REVEAL: one object, whose camera, spread, lighting
 * and atmosphere evolve across the page's own semantic sections. The DOM
 * sections (statement → chapters → live → roles → colleges → vision →
 * cta → footer) ARE the scene ledger; each carries data-cam.
 *
 * Chapter ledger (camera endpoints + world channels):
 *   hero      front, knot clears the header band; the word rides its
 *             lower quarter (the poster move)
 *   statement camera slides the knot to the reading-END third — the
 *             display copy owns the reading start
 *   chapters  pull back + dim: a quiet specimen in the upper inline-end
 *             gutter; the white minis own the stage
 *   live      close on the copper signal fins, pushed into the reading-
 *             end half, veiled so the ledger rows stay AA-clean
 *   roles     wide pullback — the five-role panorama, knot on the horizon
 *   colleges  orbit back, knot behind the panel column
 *   vision    THE PASSAGE — camera enters the knot; fins spread open;
 *             the immersion moment (OPTIKKA's tunnel), calmed by the
 *             veil so the status pairs stay readable
 *   cta       resolve — knot sinks to the reading-end edge, copper
 *             emissive peaks; the centered CTA stays clear
 *   footer    settle — tiny on the horizon, colophon
 *
 * r304 — «العالم يخدم الملصق» (the world serves the poster):
 * Every chapter now authors its own VEIL (canvas opacity) and SCALE on
 * top of camera framing, plus a dedicated MOBILE camera entry (mp/mt/
 * mfov/mveil/mscale) — portrait keeps the knot in the top band or the
 * reading-end gutter, heavily dimmed behind text chapters, so the
 * sculpture never occupies the same zone as essential Arabic copy.
 * The old generic mobile hack (uniform 1.18 pull-back + fov+8) is
 * retired: mobile is a composed experience, not a scaled desktop scene.
 *
 * Engineering contract (skill §realtime-architecture):
 *  · ONE renderer, ONE scene, fixed full-viewport canvas (alpha — the CSS
 *    paper ground shows through; fog tints toward the paper color).
 *  · Fins are TWO InstancedMeshes (paper + copper) — 2 draw calls for the
 *    whole knot instead of 200 (skill: instancing for repeated props).
 *  · CatmullRom position + target curves through chapter endpoints,
 *    parameterized by the conductor's fractional chapter progress (not
 *    raw arc length — story pacing stays authored).
 *  · The conductor (skill's scroll-conductor port) owns exact/smooth
 *    progress; camera + world channels interpolate from adjacent
 *    chapters with the damped local progress. Pointer parallax is a
 *    clamped inputRig layered on the path rig — never baked into
 *    waypoints.
 *  · Reduced motion → smooth ≡ exact (the conductor snaps); idle spin
 *    stops; ambient dust stills.
 *  · Pause on document.hidden; WebGL context loss → static poster (the
 *    DOM story stays complete — it never depended on the canvas).
 *  · DPR capped 1.5 desktop / 1.25 mobile (skill budget table).
 *  · Zero React re-renders per frame — the loop reads/writes Three
 *    objects directly.
 *  · Theme-reactive: paper/copper/fog re-read from the CSS custom
 *    properties when data-theme changes.
 */
export function MadarekWorld({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      let THREE: typeof import('three');
      try {
        THREE = await import('three');
      } catch {
        return; // no WebGL/three — the semantic DOM story stands alone
      }
      if (disposed) return;

      const sections = document.querySelectorAll<HTMLElement>('.landing [data-cam]');
      if (!sections.length) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const isMobile = coarse || window.innerWidth < 768;

      /* ── Renderer ─────────────────────────────────────────────────── */
      const renderer = new THREE.WebGLRenderer({
        antialias: !isMobile,
        alpha: true,
        powerPreference: 'high-performance',
      });

      /* Quality governor: software rasterizers (SwiftShader/llvmpipe —
       * headless CI, VMs, blocked GPU drivers) render physical-material
       * shaders at ~400ms/frame. Detect them BEFORE building materials
       * and drop to the standard tier + DPR 1 so the journey stays
       * fluid there; real GPUs keep the full ceramic stack. */
      const glCtx = renderer.getContext();
      const dbgInfo = glCtx.getExtension('WEBGL_debug_renderer_info');
      const glRenderer = dbgInfo
        ? String(glCtx.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL))
        : '';
      const softwareGL = /swiftshader|llvmpipe|software|basic render/i.test(glRenderer);

      renderer.setPixelRatio(
        softwareGL ? 0.7 : Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5),
      );
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();

      /* ── The knowledge knot — instanced fin stack ──────────────────
       * TorusGeometry fins placed along a (2,3) torus-knot spine; two
       * InstancedMeshes (paper body + copper signal). ~2 draw calls. */
      const FINS = 220;
      const R = 1.55;
      const DEPTH = 1.9;

      const finGeo = new THREE.TorusGeometry(1, 0.42, 2, 48, Math.PI * 2);
      /* The two material tiers of the quality governor. Desktop GPU:
       * MeshPhysicalMaterial (clearcoat ceramic + copper emissive).
       * Software GL: the standard PBR tier — visually adjacent at these
       * forms, ~3× cheaper to rasterize. Same tokens, same emissive. */
      const paperMat = softwareGL
        ? new THREE.MeshStandardMaterial({ color: 0xefeadf, roughness: 0.46, metalness: 0.02 })
        : new THREE.MeshPhysicalMaterial({
            color: 0xefeadf,
            roughness: 0.42,
            metalness: 0.03,
            clearcoat: 0.55,
            clearcoatRoughness: 0.5,
          });
      const copperMat = softwareGL
        ? new THREE.MeshStandardMaterial({
            color: 0xb57438,
            roughness: 0.34,
            metalness: 0.2,
            emissive: new THREE.Color(0xb57438),
            emissiveIntensity: 0.35,
          })
        : new THREE.MeshPhysicalMaterial({
            color: 0xb57438,
            roughness: 0.32,
            metalness: 0.22,
            clearcoat: 0.7,
            clearcoatRoughness: 0.35,
            emissive: new THREE.Color(0xb57438),
            emissiveIntensity: 0.35,
          });

      const knot = new THREE.Group();
      knot.name = 'knowledge-knot';
      scene.add(knot);

      /* Per-fin static transforms are baked into instance matrices once;
       * `spread` animates by scaling the whole knot group along z + a
       * gentle radial breathe via group scale — cheap and reversible. */
      const dummy = new THREE.Object3D();
      const paperIdx: number[] = [];
      const copperIdx: number[] = [];
      const finTransforms: Array<{ pos: import('three').Vector3; rotZ: number; scale: number }> = [];

      for (let i = 0; i < FINS; i++) {
        const t = i / (FINS - 1);
        const p = 2, q = 3;
        const phi = t * Math.PI * 2 * q;
        const theta = t * Math.PI * 2 * p;
        const x = R * Math.cos(phi) * (1 + 0.32 * Math.cos(theta));
        const y = R * Math.sin(phi) * (1 + 0.32 * Math.cos(theta));

        const s = 0.28 + 0.34 * Math.sin(t * Math.PI);
        finTransforms.push({
          pos: new THREE.Vector3(x * 0.62, y * 0.62, (t - 0.5) * DEPTH),
          rotZ: (t * Math.PI * 4) % (Math.PI * 2),
          scale: s,
        });
        (i % 26 === 0 ? copperIdx : paperIdx).push(i);
      }

      const paperMesh = new THREE.InstancedMesh(finGeo, paperMat, paperIdx.length);
      const copperMesh = new THREE.InstancedMesh(finGeo, copperMat, copperIdx.length);
      paperMesh.name = 'fins-paper';
      copperMesh.name = 'fins-copper';

      const writeInstances = (spread: number) => {
        const place = (mesh: import('three').InstancedMesh, indices: number[]) => {
          indices.forEach((i, k) => {
            const tr = finTransforms[i]!;
            dummy.position.set(tr.pos.x, tr.pos.y, tr.pos.z * spread);
            dummy.rotation.set(Math.PI / 2, 0, tr.rotZ);
            dummy.scale.setScalar(tr.scale);
            dummy.updateMatrix();
            mesh.setMatrixAt(k, dummy.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
        };
        place(paperMesh, paperIdx);
        place(copperMesh, copperIdx);
      };
      writeInstances(1);
      knot.add(paperMesh, copperMesh);

      /* ── Contact shadow — a canvas radial blob grounds the knot ──── */
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = shadowCanvas.height = 256;
      const sctx = shadowCanvas.getContext('2d');
      if (sctx) {
        const grad = sctx.createRadialGradient(128, 128, 8, 128, 128, 126);
        grad.addColorStop(0, 'rgba(25,25,24,0.30)');
        grad.addColorStop(0.55, 'rgba(25,25,24,0.12)');
        grad.addColorStop(1, 'rgba(25,25,24,0)');
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, 256, 256);
      }
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(4.6, 4.6),
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.9,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.85;
      scene.add(shadow);

      /* ── Dust motes — the OPTIKKA particle field, in paper ink ───── */
      const DUST = isMobile ? 90 : 160;
      const dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(DUST * 3);
      const dustSeed = new Float32Array(DUST);
      for (let i = 0; i < DUST; i++) {
        dustPos[i * 3] = (Math.sin(i * 127.1) * 0.5 + 0.5 - 0.5) * 11;
        dustPos[i * 3 + 1] = (Math.sin(i * 311.7) * 0.5 + 0.5 - 0.5) * 6.5;
        dustPos[i * 3 + 2] = (Math.sin(i * 74.7) * 0.5 + 0.5 - 0.5) * 8;
        dustSeed[i] = Math.sin(i * 12.9898) * 43758.5453;
        dustSeed[i] = dustSeed[i]! - Math.floor(dustSeed[i]!); // seeded 0..1
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      const dotCanvas = document.createElement('canvas');
      dotCanvas.width = dotCanvas.height = 32;
      const dctx = dotCanvas.getContext('2d');
      if (dctx) {
        const g = dctx.createRadialGradient(16, 16, 1, 16, 16, 15);
        g.addColorStop(0, 'rgba(120,110,95,0.85)');
        g.addColorStop(1, 'rgba(120,110,95,0)');
        dctx.fillStyle = g;
        dctx.fillRect(0, 0, 32, 32);
      }
      const dustMat = new THREE.PointsMaterial({
        size: isMobile ? 0.05 : 0.035,
        map: new THREE.CanvasTexture(dotCanvas),
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const dust = new THREE.Points(dustGeo, dustMat);
      scene.add(dust);

      /* ── Lighting — warm studio key + fill + rim + hemisphere ────── */
      const key = new THREE.DirectionalLight(0xffffff, 1.5);
      key.position.set(-4, 5, 6);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xfff3e6, 0.65);
      fill.position.set(5, -2, 3);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffffff, 0.85);
      rim.position.set(0, 3, -6);
      scene.add(rim);
      scene.add(new THREE.AmbientLight(0xffffff, softwareGL ? 1.0 : 0.8));
      if (!softwareGL) {
        scene.add(new THREE.HemisphereLight(0xfff8ef, 0xe8dfd0, 0.5));
      }

      /* ── Theme reactivity: paper/copper/fog follow the CSS tokens ── */
      const applyThemeColors = () => {
        const css = getComputedStyle(document.documentElement);
        const paper = css.getPropertyValue('--poster-paper').trim() || '#FBFAF9';
        const copper = css.getPropertyValue('--poster-signal').trim() || '#B57438';
        paperMat.color.set(paper);
        copperMat.color.set(copper);
        copperMat.emissive.set(copper);
        if (scene.fog) (scene.fog as THREE_NS.FogExp2).color.set(paper);
      };
      const themeObserver = new MutationObserver(applyThemeColors);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      applyThemeColors();
      const fog = new THREE.FogExp2(0xefeadf, 0.028);
      scene.fog = fog;
      applyThemeColors();

      /* ── Chapter ledger — camera + world channels per anchor ───────
       * r304: each chapter authors the FULL frame:
       *   p/t/fov  desktop camera endpoint (the conductor's waypoint)
       *   veil     canvas opacity — the at-source reading guard: text
       *            chapters run 0.26–0.5, poster beats 0.8–0.95
       *   scale    knot scale multiplier (over the 1.14 base)
       *   mp/mt/mfov/mveil/mscale — the MOBILE override: portrait
       *            keeps the knot high (target BELOW the knot ⇒ it
       *            rises), small, and dimmed behind copy
       * world: spread (fin depth), spin (idle rotation), emissive
       * (copper intensity), dust, fogD, key (key light).
       * RTL map: text starts at the reading START (the right edge);
       * aiming the camera at +x slides the knot toward the reading-END
       * (left) gutter — the free column on this page. */
      type V3 = readonly [number, number, number];
      interface ChapterAnchor {
        id: string;
        p: V3;
        t: V3;
        fov: number;
        veil: number;
        scale: number;
        mp?: V3;
        mt?: V3;
        mfov?: number;
        mveil?: number;
        mscale?: number;
        world: { spread: number; spin: number; emissive: number; dust: number; fogD: number; key: number };
      }
      const CHAPTERS: ChapterAnchor[] = [
        { id: 'hero',
          p: [0.25, 0.5, 7.4],  t: [0.4, 0.15, 0],   fov: 35,
          veil: 0.95, scale: 1.0,
          mp: [0.55, 0.9, 9.6], mt: [1.05, -1.7, 0],  mfov: 46, mveil: 0.58, mscale: 0.66,
          world: { spread: 1,    spin: 0.22, emissive: 0.35, dust: 0.5,  fogD: 0.028, key: 1.5 } },
        { id: 'statement',
          p: [0.9, 0.9, 6.6],   t: [1.9, 0.1, 0],    fov: 38,
          veil: 0.48, scale: 0.95,
          mp: [0.6, 1.1, 10.0], mt: [1.1, -1.5, 0],  mfov: 44, mveil: 0.26, mscale: 0.7,
          world: { spread: 1.04, spin: 0.3,  emissive: 0.4,  dust: 0.55, fogD: 0.026, key: 1.5 } },
        { id: 'chapters',
          p: [0.2, 1.5, 8.6],   t: [1.15, 0.6, 0],   fov: 33,
          veil: 0.4,  scale: 0.82,
          mp: [0.2, 1.5, 10.5], mt: [1.0, -1.55, 0], mfov: 42, mveil: 0.24, mscale: 0.66,
          world: { spread: 1.1,  spin: 0.34, emissive: 0.5,  dust: 0.5,  fogD: 0.026, key: 1.5 } },
        { id: 'live',
          p: [-1.3, 0.5, 4.6],  t: [0.9, 0.3, 0],    fov: 38,
          veil: 0.42, scale: 1.0,
          mp: [-0.8, 0.8, 6.2], mt: [0.7, -1.3, 0],  mfov: 44, mveil: 0.26, mscale: 0.75,
          world: { spread: 1.16, spin: 0.42, emissive: 0.95, dust: 0.42, fogD: 0.024, key: 1.7 } },
        { id: 'roles',
          p: [0.5, 2.4, 11.0],  t: [1.35, 0.55, 0],  fov: 33,
          veil: 0.5,  scale: 0.9,
          mp: [0.4, 2.4, 13.0], mt: [1.2, -1.2, 0],  mfov: 40, mveil: 0.26, mscale: 0.68,
          world: { spread: 1.1,  spin: 0.26, emissive: 0.45, dust: 0.6,  fogD: 0.03,  key: 1.35 } },
        { id: 'colleges',
          p: [-0.5, 0.9, 7.6],  t: [1.75, 0.15, 0],  fov: 36,
          veil: 0.45, scale: 0.85,
          mp: [-0.4, 1.2, 10.5], mt: [1.2, -1.45, 0], mfov: 43, mveil: 0.24, mscale: 0.68,
          world: { spread: 1.06, spin: 0.3,  emissive: 0.5,  dust: 0.5,  fogD: 0.026, key: 1.5 } },
        { id: 'vision',
          p: [0, 0.1, 2.35],    t: [0, 0, -2.3],     fov: 52,
          veil: 0.55, scale: 1.05,
          /* mobile keeps the camera OUTSIDE the tunnel mouth: the
           * passage reads as a glowing threshold, never as near fins
           * banding behind the status pairs */
          mp: [0, 0.15, 4.8],   mt: [0, -0.1, -2.3], mfov: 50, mveil: 0.34, mscale: 0.95,
          world: { spread: 1.45, spin: 0.5,  emissive: 0.8,  dust: 0.3,  fogD: 0.02,  key: 1.2 } },
        { id: 'cta',
          p: [1.3, 0.4, 6.4],   t: [2.3, 0.55, 0],   fov: 38,
          veil: 0.72, scale: 1.0,
          mp: [1.0, 0.6, 8.4],  mt: [1.6, -0.9, 0],  mfov: 45, mveil: 0.45, mscale: 0.72,
          world: { spread: 1.12, spin: 0.24, emissive: 1.5,  dust: 0.55, fogD: 0.026, key: 1.6 } },
        { id: 'footer',
          p: [0, 2.6, 12.0],    t: [2.2, 0.9, 0],    fov: 33,
          veil: 0.38, scale: 0.85,
          mp: [0, 2.4, 13.5],   mt: [1.3, -1.0, 0],  mfov: 40, mveil: 0.26, mscale: 0.68,
          world: { spread: 1,    spin: 0.18, emissive: 0.55, dust: 0.65, fogD: 0.034, key: 1.3 } },
      ];

      /* The effective ledger: on a coarse/small viewport the mobile
       * override replaces the desktop endpoint when authored. Built
       * once — the conductor's curves and channel interpolation read
       * ONLY this resolved form. */
      const pick = <T,>(desktop: T, mobile: T | undefined): T =>
        isMobile && mobile !== undefined ? mobile : desktop;
      const LEDGER = CHAPTERS.map((c) => ({
        id: c.id,
        p: pick(c.p, c.mp),
        t: pick(c.t, c.mt),
        fov: pick(c.fov, c.mfov),
        veil: pick(c.veil, c.mveil),
        scale: pick(c.scale, c.mscale),
        world: c.world,
      }));

      const vec = (v: readonly number[]) => new THREE.Vector3(v[0], v[1], v[2]);
      const positionCurve = new THREE.CatmullRomCurve3(
        LEDGER.map((c) => vec(c.p)), false, 'centripetal', 0.5,
      );
      const targetCurve = new THREE.CatmullRomCurve3(
        LEDGER.map((c) => vec(c.t)), false, 'centripetal', 0.5,
      );

      const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.3, 60);

      /* ── The conductor — native scroll → fractional chapter state ── */
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const smoothstep = (t: number) => t * t * (3 - 2 * t);

      let pointerX = 0, pointerY = 0;     // pointer target
      let parallaxX = 0, parallaxY = 0;   // damped input rig
      let spin = 0;                       // idle rotation accumulator
      let lastSpread = 1;

      let lastState: ConductorState | null = null;

      /* Rolling render-time monitor: on sustained misses (>45ms avg
       * over 10 renders) snap the conductor once (sticky). The exact
       * chapter states remain fully readable — the cinematic damp
       * chase is what multiplies the cost on slow rasterizers. */
      const renderCosts: number[] = [];
      let snappedToSlowTier = false;
      const noteRenderCost = (ms: number) => {
        renderCosts.push(ms);
        if (renderCosts.length > 10) renderCosts.shift();
        if (!snappedToSlowTier && renderCosts.length === 10) {
          const avg = renderCosts.reduce((a, b) => a + b, 0) / 10;
          if (avg > 45) {
            snappedToSlowTier = true;
            conductor.setReducedMotion(true);
          }
        }
      };

      const renderFrame = () => {
        const state = lastState;
        if (!state) return;
        // Camera from the damped fractional progress across the whole journey
        const prog = THREE.MathUtils.clamp(state.smooth, 0, LEDGER.length - 1);
        const camPos = positionCurve.getPoint(prog / (LEDGER.length - 1));
        const camTarget = targetCurve.getPoint(prog / (LEDGER.length - 1));

        // FOV + world channels interpolate between adjacent chapters
        const idx = Math.min(Math.floor(prog), LEDGER.length - 2);
        const local = smoothstep(THREE.MathUtils.clamp(prog - idx, 0, 1));
        const a = LEDGER[idx]!;
        const b = LEDGER[idx + 1]!;
        const fov = lerp(a.fov, b.fov, local);
        const veil = lerp(a.veil, b.veil, local);
        const w = {
          scale: lerp(a.scale, b.scale, local),
          spread: lerp(a.world.spread, b.world.spread, local),
          spin: lerp(a.world.spin, b.world.spin, local),
          emissive: lerp(a.world.emissive, b.world.emissive, local),
          dust: lerp(a.world.dust, b.world.dust, local),
          fogD: lerp(a.world.fogD, b.world.fogD, local),
          key: lerp(a.world.key, b.world.key, local),
        };

        // r304: the veil — the at-source reading guard. The canvas fades
        // itself per chapter (no DOM overlay): text chapters run dim, the
        // poster beats (hero/vision/cta) keep full presence.
        renderer.domElement.style.opacity = veil.toFixed(3);
        camera.fov = fov;

        // Input rig: clamped pointer parallax over the path rig
        camera.position.set(
          camPos.x + parallaxX,
          camPos.y + parallaxY,
          camPos.z,
        );
        camera.lookAt(camTarget.x, camTarget.y, camTarget.z);
        camera.updateProjectionMatrix();

        // World channels
        knot.scale.setScalar(1.14 * w.scale);
        copperMat.emissiveIntensity = w.emissive;
        dustMat.opacity = w.dust;
        fog.density = w.fogD;
        key.intensity = w.key;

        if (Math.abs(w.spread - lastSpread) > 0.004) {
          writeInstances(w.spread);
          lastSpread = w.spread;
        }

        // Idle spin — suspended under reduced motion
        if (!reduceMotion) spin += w.spin * 0.016;
        knot.rotation.y = spin;
        knot.rotation.x = 0.34 + Math.sin(spin * 0.4) * 0.03;

        // Shadow follows the knot's breathe
        const breathe = 1 + (w.spread - 1) * 0.5;
        shadow.scale.setScalar(breathe);

        // Dust drift — seeded, non-synchronized per skill motion grammar
        if (!reduceMotion) {
          const arr = dustGeo.getAttribute('position') as THREE_NS.BufferAttribute;
          for (let i = 0; i < DUST; i++) {
            const seed = dustSeed[i] ?? 0.5;
            arr.setY(i, arr.getY(i) + (0.002 + seed * 0.002));
            if (arr.getY(i) > 3.3) arr.setY(i, -3.3);
          }
          arr.needsUpdate = true;
        }
        dust.rotation.y = spin * 0.12;

        const t0 = performance.now();
        renderer.render(scene, camera);
        noteRenderCost(performance.now() - t0);
      };

      const onUpdate = (state: ConductorState) => {
        lastState = state;
        renderFrame();
      };

      const conductor = createScrollConductor({
        sections,
        damping: 5.2,
        reducedMotion: reduceMotion,
        onUpdate,
      });

      // Pointer parallax — desktop only, clamped (skill: after composition)
      const onPointer = (e: PointerEvent) => {
        pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
        pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      if (!coarse && !reduceMotion) {
        window.addEventListener('pointermove', onPointer, { passive: true });
      }

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      };
      window.addEventListener('resize', onResize, { passive: true });

      // Context loss → freeze the world; the DOM story stands alone
      const onContextLost = (event: Event) => {
        event.preventDefault();
        conductor.stop();
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);

      // Measure after fonts settle (skill §5), then run
      try {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      } catch {
        /* fonts API unavailable — measure anyway */
      }
      if (disposed) return;
      conductor.start();
      // The WebGL world is live — retire the static poster twin so the
      // page carries ONE sculpture, not two (CSS: [data-world="live"]).
      host.dataset.world = 'live';

      // Damp the pointer rig; render ONLY when the rig actually moved
      // (on-demand rendering — the skill's budget discipline: no idle
      // GPU burn when neither scroll nor pointer state changes).
      const inputLoop = () => {
        if (disposed) return;
        const dx = pointerX * 0.32 - parallaxX;
        const dy = -pointerY * 0.22 - parallaxY;
        if (Math.abs(dx) > 0.0015 || Math.abs(dy) > 0.0015) {
          parallaxX += dx * 0.045;
          parallaxY += dy * 0.045;
          renderFrame();
        }
        inputRaf = requestAnimationFrame(inputLoop);
      };
      let inputRaf = requestAnimationFrame(inputLoop);

      cleanup = () => {
        disposed = true;
        cancelAnimationFrame(inputRaf);
        conductor.stop();
        window.removeEventListener('pointermove', onPointer);
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        themeObserver.disconnect();
        finGeo.dispose();
        paperMat.dispose();
        copperMat.dispose();
        dustGeo.dispose();
        dustMat.dispose();
        shadowTex.dispose();
        shadow.geometry.dispose();
        (shadow.material as THREE_NS.Material).dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className={className} ref={hostRef} aria-hidden="true">
      {/* The static poster: the no-WebGL ground. The DOM story above
       * stays complete without the canvas — this is only ambience. */}
      <svg className="world-poster" viewBox="0 0 400 400" aria-hidden="true">
        <g fill="none" stroke="var(--poster-ink)" strokeOpacity="0.14" strokeWidth="1.1">
          <ellipse cx="200" cy="200" rx="150" ry="58" />
          <ellipse cx="200" cy="200" rx="128" ry="46" transform="rotate(18 200 200)" />
          <ellipse cx="200" cy="200" rx="104" ry="34" transform="rotate(-14 200 200)" />
          <ellipse cx="200" cy="200" rx="82" ry="24" transform="rotate(30 200 200)" />
          <ellipse cx="200" cy="200" rx="60" ry="15" transform="rotate(-6 200 200)" />
          <ellipse cx="200" cy="200" rx="38" ry="8" transform="rotate(24 200 200)" />
        </g>
        <circle cx="200" cy="200" r="7" fill="var(--poster-signal)" fillOpacity="0.75" />
      </svg>
    </div>
  );
}
