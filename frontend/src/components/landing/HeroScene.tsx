import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

/**
 * HeroScene — «عالم مدارك» (the Madarek Knowledge World)
 * ─────────────────────────────────────────────────────
 * An ORIGINAL WebGL scene for the landing hero (radical redesign v4).
 * Composition (RTL-aware: Arabic copy sits screen-RIGHT, the world biases LEFT):
 *
 *   · نواة المعرفة — an icosahedron breathing under 3D simplex-noise
 *     displacement; deep-navy body, gold fresnel rim (the knowledge core).
 *   · مدارات الكليات — three tilted orbital rings carrying 27 glowing
 *     instanced nodes (the colleges; 25 + 2 spares read as abundance).
 *   · خيوط المعرفة — six faint additive arcs linking the core to nodes.
 *   · غبار المعرفة — 1600 shader points (gold/azure/cream) drifting and
 *     twinkling in a wide shell (size-attenuated soft sprites).
 *   · Rig — camera with pointer parallax, autonomous breathing, a once-only
 *     entrance ease (z 11.6 → 8.4) and scroll pull-back driven by a live
 *     progress ref (no re-renders).
 *
 * Engineering tiers (ported from the v2 OrbitScene contract):
 *   · DPR ≤ 1.75 desktop / 1.5 small screens.
 *   · Renders ONLY while on-screen and tab-visible (IntersectionObserver +
 *     visibilitychange flip R3F frameloop always/never).
 *   · prefers-reduced-motion → single deterministic frame (entrance skipped).
 *   · Everything disposed on unmount; zero external assets (the halo texture
 *     is generated procedurally).
 */

export interface HeroSceneProps {
  className?: string;
  /** Live hero scroll progress 0..1 (mutated by the parent — no re-render). */
  progressRef?: { current: number };
  /** Reduced-motion: render one static settled frame, no loop. */
  staticFrame?: boolean;
  /** WebGL unavailable / context failure → parent keeps the CSS sky. */
  onFallback?: () => void;
}

/* ── Palette (landing night world) ──────────────────────────────────── */
const C = {
  void: '#05070F',
  gold: '#E9B44C',
  goldSoft: '#F5D48A',
  azure: '#6FA8FF',
  cream: '#F2EFE6',
  navy: '#101731',
} as const;

const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** GLSL — Ashima 3D simplex noise (public domain / MIT). */
const SIMPLEX_GLSL = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

/* ── Shared mutable pointer/entrance state (no React re-renders) ─────── */
interface Shared {
  px: number; py: number;          // pointer -1..1 (lerped)
  tx: number; ty: number;          // pointer target
  scroll: number;                  // hero progress 0..1
  reduced: boolean;
}

/* ═══ نواة المعرفة — the knowledge core ══════════════════════════════ */
function KnowledgeCore({ shared }: { shared: Shared }) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.16 },
        uEntrance: { value: 0 }, // 0..1 — scales displacement & rim in
        uColor: { value: new THREE.Color(C.navy).lerp(new THREE.Color('#1B2A55'), 0.5) },
        uRim: { value: new THREE.Color(C.goldSoft) },
      },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uAmp; uniform float uEntrance;
        varying vec3 vNormal; varying vec3 vView; varying float vN;
        ${SIMPLEX_GLSL}
        void main(){
          float n = snoise(normal * 1.7 + vec3(0.0, uTime * 0.16, uTime * 0.11));
          float amp = uAmp * (0.35 + 0.65 * uEntrance);
          vec3 displaced = position + normal * n * amp;
          vN = n;
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform vec3 uRim; uniform float uEntrance;
        varying vec3 vNormal; varying vec3 vView; varying float vN;
        void main(){
          vec3 V = normalize(vView);
          float fres = pow(1.0 - max(dot(V, normalize(vNormal)), 0.0), 2.4);
          vec3 body = mix(uColor * 0.5, uColor * 1.25, vN * 0.5 + 0.5);
          // interior constellation — noise bands suggest lit depth
          body += uColor * smoothstep(0.45, 0.95, vN) * 0.55;
          vec3 col = body + uRim * fres * (0.8 + 1.5 * uEntrance);
          float alpha = 0.92 + fres * 0.08;
          gl_FragColor = vec4(col, alpha);
        }`,
    });
  }, []);

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.15, 4), []);

  useEffect(() => {
    matRef.current = material;
    return () => {
      material.dispose();
      geometry.dispose();
    };
  }, [material, geometry]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const entrance = shared.reduced ? 1 : easeOutExpo(clamp01((t - 0.15) / 1.5));
    const u = material.uniforms;
    u.uTime!.value = t;
    u.uEntrance!.value = entrance;
  });

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[-1.72, 0.08, 0]}
      scale={shared.reduced ? 1 : 0.94}
    />
  );
}

/* ── Procedural halo sprites (no assets) ─────────────────────────── */
function makeRadialTexture(stops: Array<[number, string]>): THREE.CanvasTexture {
  const size = 256;
  const cnv = document.createElement('canvas');
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function CoreHalo() {
  const sprite = useMemo(
    () =>
      makeRadialTexture([
        [0, 'rgba(233,180,76,0.5)'],
        [0.3, 'rgba(233,180,76,0.17)'],
        [0.62, 'rgba(111,168,255,0.06)'],
        [1, 'rgba(5,7,15,0)'],
      ]),
    [],
  );

  useEffect(() => () => sprite.dispose(), [sprite]);

  return (
    <sprite position={[-1.72, 0.08, -0.3]} scale={[7.2, 7.2, 1]}>
      <spriteMaterial
        map={sprite}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={1}
      />
    </sprite>
  );
}

/* A soft azure nebula filling the lower-start quadrant — kills the
   dead zone with depth instead of content. */
function Nebula() {
  const sprite = useMemo(
    () =>
      makeRadialTexture([
        [0, 'rgba(111,168,255,0.14)'],
        [0.45, 'rgba(111,168,255,0.05)'],
        [1, 'rgba(5,7,15,0)'],
      ]),
    [],
  );
  useEffect(() => () => sprite.dispose(), [sprite]);
  return (
    <sprite position={[-4.6, -2.4, -5]} scale={[13, 9, 1]}>
      <spriteMaterial
        map={sprite}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.8}
      />
    </sprite>
  );
}

/* ═══ مدارات الكليات — orbit rings + instanced college nodes ═════════ */
interface RingSpec {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  nodes: number;
  color: string;
  opacity: number;
}

const RINGS: RingSpec[] = [
  { radius: 2.15, tilt: [0.42, 0.0, -0.18], speed: 0.05, nodes: 6, color: C.gold, opacity: 0.58 },
  { radius: 3.05, tilt: [-0.3, 0.15, 0.36], speed: -0.034, nodes: 9, color: C.goldSoft, opacity: 0.4 },
  { radius: 3.95, tilt: [0.18, -0.32, -0.42], speed: 0.022, nodes: 12, color: C.azure, opacity: 0.34 },
];

function OrbitSystem({ shared }: { shared: Shared }) {
  const group = useRef<THREE.Group>(null);
  const nodeRefs = useRef<THREE.InstancedMesh[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const ringGeometries = useMemo(
    () => RINGS.map((r) => new THREE.TorusGeometry(r.radius, 0.011, 8, 240)),
    [],
  );
  const nodeGeometry = useMemo(() => new THREE.SphereGeometry(0.08, 14, 14), []);
  const nodeMaterials = useMemo(
    () =>
      RINGS.map(
        (r) =>
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(r.color).lerp(new THREE.Color(C.cream), 0.22),
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );

  /* خيوط المعرفة — faint arcs from the core to first-ring nodes. */
  const arcs = useMemo(() => {
    const core = new THREE.Vector3(-1.72, 0.08, 0);
    return Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const target = new THREE.Vector3(
        -1.72 + Math.cos(a) * 2.15,
        0.08 + Math.sin(a) * 2.15 * 0.62,
        (i % 2 === 0 ? 1 : -1) * 0.65,
      );
      const mid = core.clone().lerp(target, 0.5);
      mid.z += 0.85; // bow outward toward camera
      const curve = new THREE.QuadraticBezierCurve3(core, mid, target);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(C.gold),
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return { geo, mat };
    });
  }, []);

  useEffect(
    () => () => {
      ringGeometries.forEach((g) => g.dispose());
      nodeGeometry.dispose();
      nodeMaterials.forEach((m) => m.dispose());
      arcs.forEach((a) => {
        a.geo.dispose();
        a.mat.dispose();
      });
    },
    [ringGeometries, nodeGeometry, nodeMaterials, arcs],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const entrance = shared.reduced ? 1 : easeOutExpo(clamp01((t - 0.35) / 1.7));

    if (group.current) {
      group.current.rotation.y = t * 0.016 + shared.scroll * 0.38;
      group.current.position.y = Math.sin(t * 0.24) * 0.05;
      group.current.scale.setScalar(0.9 + entrance * 0.1);
    }

    // node pulse — cheap per-instance matrix updates (27 total)
    RINGS.forEach((ring, ri) => {
      const mesh = nodeRefs.current[ri];
      const mat = nodeMaterials[ri];
      if (!mesh || !mat) return;
      for (let i = 0; i < ring.nodes; i++) {
        const a = (i / ring.nodes) * Math.PI * 2 + t * ring.speed * 2.4 + ri * 0.7;
        const pulse = 1 + Math.sin(t * 1.4 + i * 1.9 + ri) * 0.28;
        const s = (0.75 + 0.25 * entrance) * pulse;
        dummy.position.set(Math.cos(a) * ring.radius, 0, Math.sin(a) * ring.radius);
        dummy.scale.setScalar(s * (i === 0 ? 1.9 : 1)); // one "hero" node per ring
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mat.opacity = 0.3 + entrance * 0.7;
    });

    arcs.forEach((arc, i) => {
      arc.mat.opacity = (0.09 + 0.14 * entrance) * (0.65 + 0.35 * Math.sin(t * 0.7 + i * 1.3));
    });
  });

  return (
    <group ref={group} position={[-1.72, 0.08, 0]}>
      {RINGS.map((ring, ri) => (
        <group key={ri} rotation={ring.tilt}>
          <mesh geometry={ringGeometries[ri]}>
            <meshBasicMaterial
              color={ring.color}
              transparent
              opacity={ring.opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <instancedMesh
            ref={(m: THREE.InstancedMesh) => {
              if (m) nodeRefs.current[ri] = m;
            }}
            args={[nodeGeometry, nodeMaterials[ri], ring.nodes]}
          />
        </group>
      ))}
      {arcs.map((arc, i) => (
        <primitive key={`arc-${i}`} object={new THREE.Line(arc.geo, arc.mat)} />
      ))}
    </group>
  );
}

/* ═══ غبار المعرفة — knowledge dust (1600 shader points) ═════════════ */
function KnowledgeDust({ shared }: { shared: Shared }) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  const { geometry, material } = useMemo(() => {
    const COUNT = 1600;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const size = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);

    const palette = [
      new THREE.Color(C.cream),
      new THREE.Color(C.gold),
      new THREE.Color(C.goldSoft),
      new THREE.Color(C.azure),
    ] as const;
    const weights = [0.52, 0.22, 0.14, 0.12] as const;

    for (let i = 0; i < COUNT; i++) {
      // wide flat shell around the system
      const r = 5.2 + Math.random() * 8.5;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * (2.2 + Math.random() * 4.5);
      pos[i * 3] = Math.cos(theta) * r - 1.2; // bias left with the world
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(theta) * r - 2.2;

      const pick = Math.random();
      let acc = 0;
      let c = palette[0]!;
      for (let p = 0; p < palette.length; p++) {
        acc += weights[p] ?? 0;
        if (pick <= acc) {
          c = palette[p] ?? c;
          break;
        }
      }
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      size[i] = 0.85 + Math.random() * 2.9;
      phase[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uEntrance: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor; attribute float aSize; attribute float aPhase;
        uniform float uTime; uniform float uPixelRatio; uniform float uEntrance;
        varying vec3 vColor; varying float vAlpha;
        void main(){
          vec3 p = position;
          p.y += sin(uTime * 0.14 + aPhase) * 0.42;
          p.x += cos(uTime * 0.09 + aPhase * 1.71) * 0.36;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
          vColor = aColor;
          float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aPhase)) + aPhase * 3.1);
          vAlpha = twinkle * uEntrance;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vAlpha;
        void main(){
          float d = distance(gl_PointCoord, vec2(0.5));
          float a = smoothstep(0.5, 0.08, d);
          gl_FragColor = vec4(vColor, a * vAlpha);
        }`,
    });
    return { geometry, material };
  }, []);

  const { gl } = useThree();

  useEffect(() => {
    matRef.current = material;
    material.uniforms.uPixelRatio!.value = Math.min(gl.getPixelRatio(), 2);
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material, gl]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    material.uniforms.uTime!.value = t;
    material.uniforms.uEntrance!.value = shared.reduced
      ? 0.75
      : easeOutExpo(clamp01((t - 0.1) / 1.9));
  });

  return <points geometry={geometry} material={material} />;
}

/* ═══ Rig — camera: entrance, breathing, pointer parallax, scroll ═════ */
function Rig({ shared }: { shared: Shared }) {
  const { camera } = useThree();

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      shared.tx = (e.clientX / window.innerWidth) * 2 - 1;
      shared.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [shared]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const entrance = shared.reduced ? 1 : easeOutExpo(clamp01((t - 0.1) / 1.55));

    // pointer lerp
    shared.px += (shared.tx - shared.px) * Math.min(1, delta * 2.6);
    shared.py += (shared.ty - shared.py) * Math.min(1, delta * 2.6);

    const breath = Math.sin(t * 0.32);
    const zBase = 11.6 - entrance * 3.2; // 11.6 → 8.4 entrance dolly
    const zScroll = shared.scroll * 2.3; // pull back as hero scrolls out

    camera.position.x = 0.55 + shared.px * 0.42 + breath * 0.04;
    camera.position.y = 0.42 - shared.py * 0.3 + breath * 0.06;
    camera.position.z = zBase + zScroll;
    camera.lookAt(-1.05, 0.05, 0);
  });

  return null;
}

/* ═══ Scene root ══════════════════════════════════════════════════════ */
function Scene({ shared }: { shared: Shared }) {
  return (
    <>
      <Rig shared={shared} />
      <KnowledgeCore shared={shared} />
      <CoreHalo />
      <Nebula />
      <OrbitSystem shared={shared} />
      <KnowledgeDust shared={shared} />
    </>
  );
}

/* ── Capability gate: only mount when the device can carry it ───────── */
function sceneSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl1 = gl2 ?? canvas.getContext('webgl');
    if (!gl1) return false;
    if ('connection' in navigator) {
      const conn = navigator.connection as { saveData?: boolean };
      if (conn.saveData) return false;
    }
    if ((navigator.hardwareConcurrency ?? 4) < 2) return false;
    return true;
  } catch {
    return false;
  }
}

export function HeroScene({ className, progressRef, staticFrame = false, onFallback }: HeroSceneProps) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(true); // on-screen + tab visible
  const hostRef = useRef<HTMLDivElement>(null);

  const shared = useMemo<Shared>(
    () => ({ px: 0, py: 0, tx: 0, ty: 0, scroll: 0, reduced: staticFrame }),
    [staticFrame],
  );

  /* Mount lazily (idle) so first paint is pure HTML/CSS. */
  useEffect(() => {
    if (!sceneSupported()) {
      onFallback?.();
      return;
    }
    const idle =
      'requestIdleCallback' in window
        ? window.requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 220) as unknown as number;
    const id = idle(() => setMounted(true));
    return () => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(id as number);
    };
  }, [onFallback]);

  /* Mirror the live scroll progress into the scene without re-renders. */
  useEffect(() => {
    if (!progressRef) return;
    let raf = 0;
    const tick = () => {
      shared.scroll = progressRef.current;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, shared]);

  /* Pause rendering off-screen / hidden tab. */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !mounted) return;
    let inView = true;
    const sync = () => setActive(inView && !document.hidden);
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.01 },
    );
    io.observe(host);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [mounted]);

  if (!mounted) return <div ref={hostRef} className={className} aria-hidden />;

  return (
    <div ref={hostRef} className={className} aria-hidden>
      <Canvas
        camera={{ fov: 42, near: 0.1, far: 60, position: [0.55, 0.42, 11.6] }}
        dpr={[1, Math.min(window.innerWidth < 900 ? 1.5 : 1.75, window.devicePixelRatio || 1)]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
        frameloop={staticFrame ? 'demand' : active ? 'always' : 'never'}
        onCreated={({ gl, scene, camera, invalidate }) => {
          gl.setClearColor(new THREE.Color(C.void), 0); // transparent — CSS sky beneath
          if (staticFrame) {
            // one deterministic settled frame for reduced-motion visitors
            requestAnimationFrame(() => {
              gl.render(scene, camera);
              invalidate();
            });
          }
        }}
        onError={() => onFallback?.()}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene shared={shared} />
      </Canvas>
    </div>
  );
}

export default HeroScene;
