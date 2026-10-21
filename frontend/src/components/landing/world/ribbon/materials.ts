import type * as THREE_NS from 'three';

/**
 * ribbon/materials — the artwork's material families and lighting.
 *
 * Palette discipline (OPTIKKA direction, harmonized with the r303
 * copper-signal world): ONE ember-orange ceramic family carries the
 * lamellae, ONE graphite keystone anchors the composition, and two
 * steel tones (dark core filament, brushed sash) draw the fine grey
 * structure. Two presets — paper (light) and night (dark) — re-key on
 * the theme channel with damped transitions.
 *
 * Metals follow the anti-pattern rule: no metalness without an
 * environment. The factory bakes a small procedural warm-studio
 * environment through PMREMGenerator (owned by the artwork, disposed
 * with it) and assigns it as an explicit `envMap` per material — the
 * module never mutates `scene.environment`, which belongs to the world
 * controller. Without a renderer the factory falls back to a
 * dielectric-biased setup that still reads under the scene's lights.
 */

export interface RibbonPalette {
  ember: number;
  graphite: number;
  core: number;
  sash: number;
  envIntensity: number;
}

export const RIBBON_PALETTES: Record<'light' | 'dark', RibbonPalette> = {
  light: {
    ember: 0xb95714,
    graphite: 0x514f4b,
    core: 0x7a7e84,
    sash: 0x9ca1a7,
    envIntensity: 0.9,
  },
  dark: {
    ember: 0xd47a2c,
    graphite: 0x8f8b85,
    core: 0xa9adb3,
    sash: 0xd0cbc3,
    envIntensity: 0.65,
  },
};

export interface RibbonMaterials {
  ember: THREE_NS.MeshPhysicalMaterial;
  graphite: THREE_NS.MeshStandardMaterial;
  core: THREE_NS.MeshStandardMaterial;
  sash: THREE_NS.MeshStandardMaterial;
  /** Damped per-frame theme chase; call once per rendered frame. */
  update: (dt: number) => void;
  /** Queue a palette transition ('light' | 'dark' or any truthy string). */
  setTheme: (theme: string | undefined) => void;
  dispose: () => void;
}

export interface MaterialFactoryOptions {
  renderer?: THREE_NS.WebGLRenderer;
  /** Skip the PMREM studio bake (software-GL tier / tests). */
  skipEnvironment?: boolean;
}

export function createRibbonMaterials(
  three: typeof THREE_NS,
  options: MaterialFactoryOptions = {},
): RibbonMaterials {
  const hasEnv = Boolean(options.renderer) && !options.skipEnvironment;
  const envTexture = hasEnv ? bakeStudioEnvironment(three, options.renderer!) : null;

  /* Fallback bias without an environment: metals go dielectric and lean
   * on the scene's key/fill/rim lights (anti-pattern §2 discipline). */
  const m = hasEnv ? 1 : 0.25;
  const roughShift = hasEnv ? 0 : 0.08;

  const ember = new three.MeshPhysicalMaterial({
    color: RIBBON_PALETTES.light.ember,
    roughness: 0.3 + roughShift,
    metalness: 0.3 * m,
    clearcoat: 0.55,
    clearcoatRoughness: 0.38,
    emissive: RIBBON_PALETTES.light.ember,
    emissiveIntensity: hasEnv ? 0.06 : 0.12,
  });

  const graphite = new three.MeshStandardMaterial({
    color: RIBBON_PALETTES.light.graphite,
    roughness: 0.4 + roughShift,
    metalness: 0.68 * m,
  });

  const core = new three.MeshStandardMaterial({
    color: RIBBON_PALETTES.light.core,
    roughness: 0.32 + roughShift,
    metalness: 0.82 * m,
  });

  const sash = new three.MeshStandardMaterial({
    color: RIBBON_PALETTES.light.sash,
    roughness: 0.34 + roughShift,
    metalness: 0.78 * m,
    roughnessMap: createBrushedRoughnessTexture(three),
  });

  if (envTexture) {
    const env = envTexture.texture;
    ember.envMap = env;
    graphite.envMap = env;
    core.envMap = env;
    sash.envMap = env;
  }

  /* ── Damped theme state ─────────────────────────────────────────── */
  const target = {
    ember: new three.Color(RIBBON_PALETTES.light.ember),
    graphite: new three.Color(RIBBON_PALETTES.light.graphite),
    core: new three.Color(RIBBON_PALETTES.light.core),
    sash: new three.Color(RIBBON_PALETTES.light.sash),
    envIntensity: RIBBON_PALETTES.light.envIntensity,
  };

  const setTheme = (theme: string | undefined) => {
    const palette = RIBBON_PALETTES[theme === 'dark' ? 'dark' : 'light'];
    target.ember.setHex(palette.ember);
    target.graphite.setHex(palette.graphite);
    target.core.setHex(palette.core);
    target.sash.setHex(palette.sash);
    target.envIntensity = palette.envIntensity;
  };

  const update = (dt: number) => {
    const k = 1 - Math.exp(-5 * Math.max(dt, 0.0001));
    ember.color.lerp(target.ember, k);
    ember.emissive.lerp(target.ember, k);
    graphite.color.lerp(target.graphite, k);
    core.color.lerp(target.core, k);
    sash.color.lerp(target.sash, k);
    const nextEnv = ember.envMapIntensity + (target.envIntensity - ember.envMapIntensity) * k;
    ember.envMapIntensity = nextEnv;
    graphite.envMapIntensity = nextEnv;
    core.envMapIntensity = nextEnv;
    sash.envMapIntensity = nextEnv;
  };

  const dispose = () => {
    (sash.roughnessMap as THREE_NS.Texture | null)?.dispose();
    for (const material of [ember, graphite, core, sash]) material.dispose();
    envTexture?.dispose();
  };

  return { ember, graphite, core, sash, update, setTheme, dispose };
}

/* ── Brushed roughness map ──────────────────────────────────────────── */

/**
 * Fine directional streaks (lines run along the sweep's U axis) baked
 * into a small canvas. Data texture — stays linear, never tagged sRGB
 * (anti-pattern §19).
 */
export function createBrushedRoughnessTexture(
  three: typeof THREE_NS,
  size = 256,
): THREE_NS.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = 'rgb(150,150,150)'; // color-gate: allow — WebGL PMREM studio backdrop painted on a canvas; CSS vars do not resolve in 2D context
    ctx.fillRect(0, 0, size, size);
    // Per-row tonal bands: streaks run horizontally (along U).
    for (let y = 0; y < size; y += 1) {
      const band = 150 + Math.round((Math.sin(y * 0.35) + Math.sin(y * 0.11 + 1.7)) * 9);
      ctx.fillStyle = `rgb(${band},${band},${band})`;
      ctx.fillRect(0, y, size, 1);
    }
    // Sparse bright scratches.
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 90; i += 1) {
      const y = Math.floor(Math.random() * size);
      const x0 = Math.floor(Math.random() * size);
      const len = 20 + Math.floor(Math.random() * 90);
      const v = 185 + Math.floor(Math.random() * 50);
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + len, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const texture = new three.CanvasTexture(canvas);
  texture.wrapS = three.RepeatWrapping;
  texture.wrapT = three.RepeatWrapping;
  texture.repeat.set(2.5, 1);
  texture.anisotropy = 8;
  return texture;
}

/* ── Procedural warm studio environment ─────────────────────────────── */

export interface StudioEnvironment {
  texture: THREE_NS.Texture;
  dispose: () => void;
}

/**
 * A tiny emissive-light-rig scene convolved through PMREM: warm softbox
 * above, ember key from the upper left, cool rim from the right rear,
 * paper bounce below, all inside a warm gradient dome. Gives the metals
 * believable studio reflections at zero asset weight.
 */
export function bakeStudioEnvironment(
  three: typeof THREE_NS,
  renderer: THREE_NS.WebGLRenderer,
): StudioEnvironment {
  const scene = new three.Scene();

  // Gradient dome.
  const domeGeo = new three.SphereGeometry(10, 24, 16);
  const domeCount = domeGeo.attributes.position!.count;
  const domeColors = new Float32Array(domeCount * 3);
  const domePos = domeGeo.attributes.position!;
  const top = new three.Color(2.1, 1.95, 1.75);
  const horizon = new three.Color(0.85, 0.8, 0.73);
  const bottom = new three.Color(0.3, 0.28, 0.26);
  const domeColor = new three.Color();
  for (let i = 0; i < domeCount; i += 1) {
    const y = (domePos.getY(i) ?? 0) / 10; // −1..1
    if (y >= 0) domeColor.lerpColors(horizon, top, Math.min(1, y * 1.4));
    else domeColor.lerpColors(horizon, bottom, Math.min(1, -y * 1.8));
    domeColors[i * 3] = domeColor.r;
    domeColors[i * 3 + 1] = domeColor.g;
    domeColors[i * 3 + 2] = domeColor.b;
  }
  domeGeo.setAttribute('color', new three.BufferAttribute(domeColors, 3));
  const dome = new three.Mesh(
    domeGeo,
    new three.MeshBasicMaterial({ vertexColors: true, side: three.BackSide }),
  );
  scene.add(dome);

  const lightPlane = (
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    r: number,
    g: number,
    b: number,
  ) => {
    const mesh = new three.Mesh(
      new three.PlaneGeometry(w, h),
      new three.MeshBasicMaterial({
        color: new three.Color(r, g, b),
        side: three.DoubleSide,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };

  lightPlane(4.5, 4.5, 0, 6.5, 0.5, 6.2, 5.8, 5.1); // top softbox (warm white)
  lightPlane(2.6, 3.2, -5.5, 2.6, 3.2, 5.8, 3.9, 2.1); // ember key, upper left
  lightPlane(1.8, 3.4, 5.8, 1.2, -3.6, 3.2, 3.6, 4.2); // cool rim, right rear
  lightPlane(5, 5, 0, -5.5, 1.5, 1.15, 1.05, 0.92); // paper floor bounce

  const pmrem = new three.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();

  // The bake scene is throwaway — release its GPU resources now.
  scene.traverse((obj) => {
    const mesh = obj as THREE_NS.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE_NS.Material | undefined;
    if (mat) mat.dispose();
  });

  return {
    texture: rt.texture,
    dispose: () => {
      rt.dispose();
    },
  };
}
