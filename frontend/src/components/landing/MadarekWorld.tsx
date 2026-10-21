import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { createScrollConductor } from '../../lib/scroll-conductor';
import { createStoryDom } from '../../lib/landing-story/story-dom';
import { createChoreography } from '../../lib/landing-story/choreography';
import { loadKnowledgeRibbon } from '../../lib/landing-story/ribbon-bridge';
import type {
  StoryFrame,
  WorldChannels,
  WorldSubject,
} from '../../lib/landing-story/types';

/**
 * MadarekWorld — the persistent Three.js scroll world (R304).
 *
 * WORLD SENTENCE — «Travel around and into Madarek's knowledge knot: a
 * torus-knot of stacked learning fins on warm paper, whose camera orbits,
 * closes on the copper signal, pulls back over the five roles, and passes
 * through the knot at the vision chapter.»
 *
 * R304 architecture (gsap + ScrollTrigger, single source of scroll truth):
 *
 *  · `scroll-conductor.ts` — one master ScrollTrigger reads native scroll;
 *    `gsap.ticker` is the ONE heartbeat (damping + DOM bus + rendering).
 *    No Lenis, no custom loop, no second smoothing system.
 *  · `landing-story/choreography.ts` — the authored camera timeline
 *    (labels hero→footer, per-segment eases) scrubbed by the conductor's
 *    damped progress. The timeline owns the poses; this component owns
 *    only the camera object.
 *  · `landing-story/story-dom.ts` — `--story-progress`,
 *    `--chapter-progress`, `data-story-chapter`, `data-story-active`,
 *    `data-story-visible`, and the typed `madarek:story-progress` event.
 *    The DOM story never depends on WebGL.
 *  · The subject behind the camera IS the R304 procedural ribbon
 *    («MERIDIAN»), instantiated through the typed contract in
 *    `ribbon-bridge.ts` (explicit import, real options, real per-frame
 *    state, theme reactivity, full disposal). The retired r303 220-ring
 *    knot has NO fallback path: if the artwork fails to load the world
 *    reports `unavailable` and the DOM story stands alone.
 *
 * Resilience ledger (skill §respect-motion-access-failure):
 *  · reduced motion → smooth ≡ exact; idle spin, dust drift and parallax
 *    stop; the DOM story is complete and static;
 *  · WebGL unavailable / context lost → the canvas steps aside
 *    (`data-world-state` on the host); the conductor and DOM bus keep
 *    publishing — base r303 stopped the whole story on context loss, R304
 *    only stops the pixels;
 *  · render-cost governor: sustained slow frames on software rasterizers
 *    snap the conductor once (sticky) so the journey stays fluid;
 *  · DPR capped 1.5 desktop / 1.25 mobile; zero React re-renders per
 *    frame; full disposal on unmount.
 */
export function MadarekWorld({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const cleanups: Array<() => void> = [];
    const onCleanup = (fn: () => void) => cleanups.push(fn);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const isMobile = () => coarse || window.innerWidth < 768;

    /* ── 1 · The story — alive with or without WebGL ─────────────────── */
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('.landing [data-cam]'),
    );
    if (!sections.length) return;

    const conductor = createScrollConductor({
      sections,
      damping: 5.2,
      reducedMotion: reduceMotion,
    });
    onCleanup(() => conductor.destroy());

    const storyDom = createStoryDom(conductor);
    onCleanup(() => storyDom.destroy());

    const choreography = createChoreography();
    onCleanup(() => choreography.destroy());

    /* ── 2 · The world — progressive enhancement ─────────────────────── */
    interface RenderState {
      renderer: import('three').WebGLRenderer;
      camera: import('three').PerspectiveCamera;
      scene: import('three').Scene;
      fog: import('three').FogExp2;
      key: import('three').DirectionalLight;
      dustMat: import('three').PointsMaterial;
      dustGeo: import('three').BufferGeometry;
      dustSeeds: Float32Array;
      dustCount: number;
      shadow: import('three').Mesh;
      subject: WorldSubject;
    }

    let renderState: RenderState | null = null;
    let lastFrame: StoryFrame | null = null;
    let contextLost = false;

    /* Pointer parallax — a clamped input rig over the path rig, never
     * baked into waypoints (skill §author-the-camera). */
    let pointerX = 0, pointerY = 0;
    let parallaxX = 0, parallaxY = 0;
    const onPointer = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!coarse && !reduceMotion) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      onCleanup(() => window.removeEventListener('pointermove', onPointer));
    }

    /* Render-cost governor (r303, tightened): sustained slow frames on
     * software rasterizers snap the conductor once — the damped chase is
     * what multiplies cost there, not the compositions. 8 renders @ 40ms
     * avg reacts within ~a second even at low fps. */
    const renderCosts: number[] = [];
    let snappedToSlowTier = false;
    const noteRenderCost = (ms: number) => {
      if (snappedToSlowTier) return;
      renderCosts.push(ms);
      if (renderCosts.length > 8) renderCosts.shift();
      if (renderCosts.length === 8) {
        const avg = renderCosts.reduce((a, b) => a + b, 0) / 8;
        if (avg > 40) {
          snappedToSlowTier = true;
          conductor.setReducedMotion(true);
        }
      }
    };

    const renderFrame = (frame: StoryFrame) => {
      const state = renderState;
      if (!state || contextLost) return;


      /* Camera — the choreography timeline is the pose authority. */
      const snap = choreography.sample(frame, isMobile());
      const camera = state.camera;
      camera.position.set(
        snap.position.x + parallaxX,
        snap.position.y + parallaxY,
        snap.position.z,
      );
      if (camera.fov !== snap.fov) {
        camera.fov = snap.fov;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(snap.target.x, snap.target.y, snap.target.z);
      if (snap.roll) camera.rotateZ(snap.roll);

      /* World channels — continuous physical change. */
      const c = snap.channels;
      state.key.position.set(Math.sin(c.keyAz) * 7.2, c.keyEl, Math.cos(c.keyAz) * 7.2);
      state.key.intensity = c.key;
      state.fog.density = c.fogD;
      state.dustMat.opacity = c.dust;

      /* The ribbon owns its pose/response through the bridge's mapped
       * update state; the channels still drive the stage (lights/fog). */
      state.subject.update?.(frame, c);

      /* Ambience — contact shadow breathes with the spread; dust drifts
       * (seeded, non-synchronized; stilled under reduced motion). */
      state.shadow.scale.setScalar(1 + (c.spread - 1) * 0.5);
      if (!frame.reducedMotion) {
        const arr = state.dustGeo.getAttribute('position') as import('three').BufferAttribute;
        for (let i = 0; i < state.dustCount; i++) {
          const seed = state.dustSeeds[i] ?? 0.5;
          arr.setY(i, arr.getY(i) + (0.002 + seed * 0.002));
          if (arr.getY(i) > 3.3) arr.setY(i, -3.3);
        }
        arr.needsUpdate = true;
      }

      const t0 = performance.now();
      state.renderer.render(state.scene, camera);
      noteRenderCost(performance.now() - t0);
    };

    /* Render on conductor publishes (scroll-damped frames). */
    const unsubscribe = conductor.subscribe((frame) => {
      lastFrame = frame;
      renderFrame(frame);
    });
    onCleanup(unsubscribe);

    /* Pointer rig settle — re-renders only while the rig is moving. */
    const inputTick = (_time: number, deltaTime: number) => {
      if (disposed || document.hidden || contextLost) return;
      if (reduceMotion || coarse) return;
      // gsap.ticker deltaTime is in MILLISECONDS.
      const dt = Math.min(Math.max(deltaTime / 1000, 1 / 240), 0.1);
      const settle = 1 - Math.exp(-6 * dt); // framerate-independent damp
      const dx = pointerX * 0.32 - parallaxX;
      const dy = -pointerY * 0.22 - parallaxY;
      if (Math.abs(dx) > 0.0015 || Math.abs(dy) > 0.0015) {
        parallaxX += dx * settle;
        parallaxY += dy * settle;
        if (lastFrame) renderFrame(lastFrame);
      }
    };
    gsap.ticker.add(inputTick);
    onCleanup(() => gsap.ticker.remove(inputTick));

    void (async () => {
      let THREE: typeof import('three');
      try {
        THREE = await import('three');
      } catch {
        host.dataset.worldState = 'unavailable';
        return; // no WebGL/three — the semantic DOM story stands alone
      }
      if (disposed) return;

      try {
        /* ── Renderer + quality governor ───────────────────────────────
         * Probe the GL renderer string on a throwaway context BEFORE
         * creating the real renderer — software rasterizers (SwiftShader,
         * llvmpipe) get no MSAA and DPR 0.7 up front, instead of paying
         * for a 4×-cost antialiased first paint. */
        let softwareGL = false;
        try {
          const probeCanvas = document.createElement('canvas');
          const probeCtx = probeCanvas.getContext('webgl') as WebGLRenderingContext | null;
          const dbg = probeCtx?.getExtension('WEBGL_debug_renderer_info');
          const rendererName = probeCtx && dbg
            ? String(probeCtx.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
            : '';
          softwareGL = /swiftshader|llvmpipe|software|basic render/i.test(rendererName);
          probeCtx?.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {
          /* probe failure is not a world failure */
        }

        const renderer = new THREE.WebGLRenderer({
          // MSAA multiplies software-rasterizer cost ~4× — skip it there.
          antialias: !isMobile() && !softwareGL,
          alpha: true,
          powerPreference: 'high-performance',
        });
        const quality: 'high' | 'standard' = softwareGL ? 'standard' : 'high';

        renderer.setPixelRatio(
          softwareGL
            ? 0.7
            : Math.min(window.devicePixelRatio || 1, isMobile() ? 1.25 : 1.5),
        );
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();

        /* ── Subject — the R304 procedural ribbon, or nothing ────────── */
        let subject: WorldSubject | null = null;
        try {
          const factory = await loadKnowledgeRibbon();
          if (factory && !disposed) {
            const handle = factory(THREE, {
              scene,
              host,
              isMobile: isMobile(),
              reducedMotion: reduceMotion,
              quality,
              renderer,
              channels: {
                spread: 1, spin: 0.22, emissive: 0.35, dust: 0.5,
                fogD: 0.028, key: 1.5, keyAz: -0.55, keyEl: 5, roll: 0,
              },
            });
            subject = adaptSubject(handle);
          }
        } catch {
          subject = null; // a broken ribbon must never take the poster down
        }
        if (disposed) return;
        if (!subject) {
          /* NO legacy fallback: the retired 220-ring knot must never
           * re-enter the active path. The DOM story stands alone. */
          host.dataset.worldState = 'unavailable';
          return;
        }
        scene.add(subject.object as import('three').Object3D);

        /* ── Contact shadow — grounds the sculpt ─────────────────────── */
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

        /* ── Dust motes — the OPTIKKA particle field ─────────────────── */
        const DUST = isMobile() ? 90 : 160;
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = new Float32Array(DUST * 3);
        const dustSeed = new Float32Array(DUST);
        for (let i = 0; i < DUST; i++) {
          dustPos[i * 3] = (Math.sin(i * 127.1) * 0.5 + 0.5 - 0.5) * 11;
          dustPos[i * 3 + 1] = (Math.sin(i * 311.7) * 0.5 + 0.5 - 0.5) * 6.5;
          dustPos[i * 3 + 2] = (Math.sin(i * 74.7) * 0.5 + 0.5 - 0.5) * 8;
          const s = Math.sin(i * 12.9898) * 43758.5453;
          dustSeed[i] = s - Math.floor(s); // seeded 0..1
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
          size: isMobile() ? 0.05 : 0.035,
          map: new THREE.CanvasTexture(dotCanvas),
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          sizeAttenuation: true,
        });
        const dust = new THREE.Points(dustGeo, dustMat);
        scene.add(dust);

        /* ── Lighting — warm studio key (channel-driven) + fixed fills ── */
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

        /* ── Fog — tints toward the CSS paper ground ─────────────────── */
        const fog = new THREE.FogExp2(0xefeadf, 0.028);
        scene.fog = fog;

        const camera = new THREE.PerspectiveCamera(
          36, window.innerWidth / window.innerHeight, 0.1, 60,
        );

        /* ── Theme reactivity — materials re-read the poster tokens ──── */
        const applyThemeColors = () => {
          const css = getComputedStyle(document.documentElement);
          const paper = css.getPropertyValue('--poster-paper').trim() || '#FBFAF9';
          const ink = css.getPropertyValue('--poster-ink').trim() || '#191918';
          const signal = css.getPropertyValue('--poster-signal').trim() || '#B57438';
          fog.color.set(paper);
          subject?.applyTheme?.({ paper, ink, signal });
          /* Repaint without waiting for a scroll — the theme flip must be
           * visible on the very next composited frame. */
          if (lastFrame && !contextLost) renderFrame(lastFrame);
        };
        const themeObserver = new MutationObserver(applyThemeColors);
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
        applyThemeColors();

        /* ── Context loss — freeze the pixels, keep the story ────────── */
        const onContextLost = (event: Event) => {
          event.preventDefault();
          contextLost = true;
          host.dataset.worldState = 'context-lost';
        };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);

        const onResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight, false);
        };
        window.addEventListener('resize', onResize, { passive: true });

        renderState = {
          renderer, camera, scene, fog, key,
          dustMat, dustGeo, dustSeeds: dustSeed, dustCount: DUST,
          shadow, subject,
        };
        host.dataset.worldState = 'active';

        if (lastFrame) renderFrame(lastFrame);

        onCleanup(() => {
          themeObserver.disconnect();
          window.removeEventListener('resize', onResize);
          renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
          delete host.dataset.worldState;
          subject?.dispose?.();
          shadowTex.dispose();
          shadow.geometry.dispose();
          (shadow.material as import('three').Material).dispose();
          dustMat.map?.dispose();
          dustGeo.dispose();
          dustMat.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        });
      } catch {
        // WebGL setup failure — poster mode; the DOM story stands alone.
        host.dataset.worldState = 'unavailable';
      }
    })();

    /* ── 3 · Start after fonts settle (skill §measure-after-fonts) ────── */
    const fontsReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    void Promise.resolve(fontsReady).then(() => {
      if (!disposed) conductor.start();
    });

    return () => {
      disposed = true;
      for (let i = cleanups.length - 1; i >= 0; i--) cleanups[i]?.();
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

/* ── helpers ─────────────────────────────────────────────────────────── */

/** Defensively normalize a createKnowledgeRibbon return value. */
function adaptSubject(handle: unknown): WorldSubject | null {
  if (!handle) return null;
  const h = handle as Record<string, unknown>;
  const isObject3D =
    (h as { isObject3D?: boolean }).isObject3D === true ||
    (h as { isGroup?: boolean }).isGroup === true;
  if (isObject3D) return { object: handle };
  const object = h['object'];
  if (!object) return null;
  const subject: WorldSubject = { object };
  const update = h['update'];
  if (typeof update === 'function') {
    subject.update = (
      update as (frame: StoryFrame, channels: WorldChannels) => void
    ).bind(handle);
  }
  const applyTheme = h['applyTheme'];
  if (typeof applyTheme === 'function') {
    subject.applyTheme = (
      applyTheme as (tokens: { paper: string; ink: string; signal: string }) => void
    ).bind(handle);
  }
  const dispose = h['dispose'];
  if (typeof dispose === 'function') {
    subject.dispose = (dispose as () => void).bind(handle);
  }
  return subject;
}
