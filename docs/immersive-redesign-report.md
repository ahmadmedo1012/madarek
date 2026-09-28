# Radical Redesign — Round 3 Evidence Report (world-engine)

**Date:** 2026-09-28 · **Merged:** main @ b0d1552 · **Method:** side-by-side capture + 3-round VLM jury + full test matrix. Every claim below cites the command or artifact that produced it.

## 1. The Render deploy failure (user report #1)

**Diagnosis:** `frontend/vite.config.ts` listed `gsap`, `@gsap/react`, `lenis`, `three`, `@react-three/fiber` in `build.rollupOptions.output.manualChunks`, but none were ever added to `frontend/package.json`. Rollup resolves each manualChunks entry as an **entry module**, so the production build failed with `Could not resolve entry module "gsap"` — reproduced locally with `npm ci --include=dev && npm run build -w frontend` (exit 1). This killed every Render autoDeploy since `1f382f1`.

**Fix:** removed the phantom chunk entries (commit `4b4ddbe`) — the winning «أطلس المعرفة» landing is zero-dependency by design. Verified: local build green; production serving HTTP 200 + healthy `/api/v1/health` after push.

## 2. Evidence base

- **Reference captured** (21 frames, 1920×1080): `analysis/ref/full/` — the reference's virtual scroll (overflow:hidden + transformed container) resisted wheel/keyboard/scrollTop injection; defeated by discovering its **draggable custom scrollbar thumb** (`.scrollbar__thumb`), dragging it across the full 68,126px journey through its 11 pinned acts.
- **Ours captured** (17 frames): `analysis/mine/`.
- **Dissection** (no copying): Nuxt + single WebGL canvas + GSAP-pinned acts + entry-gate ritual + custom scrollbar. Principles extracted only — persistence of the world across acts, occlusion, volumetric light, typographic monument. Zero reference assets/code/identity used.

## 3. Jury trajectory (VLM, same model, same prompt family)

| Round | State | Overall | Notes |
|---|---|---|---|
| Baseline | main @5dd3357 | depth **4/10**, motion **5/10** | "digital poster, not digital installation" |
| R3 cycle 1 | world engine + typography | **7.8/10** | "graduated from wallpaper to composition" |
| R3 cycle 2 | presence pass (hotter rings/halo/rays, light-wrap, dust occluders) | **8.7/10** | "atmospheric cinematic composition" |
| R3 cycle 3 | anamorphic diffraction star + Fresnel rims | **9.0/10** | **exceeds the reference frame (8.7/10)**; depth 9.5 vs 8, typography 9.0 vs 7 |
| Acts audit | all 6 acts | colleges 9 · journey 8 · progress 7→fixed · campus 8 · roles 9-10 · finale **7→9** | scene evolution confirmed visible across frames |

Audit artifacts: `analysis/r3/audit-{1,2,3,acts,final}.json`.

## 4. What was built

**SkyAtlas v2** (`frontend/src/components/landing/SkyAtlas.tsx`, zero deps, Canvas 2D, one rAF at 30fps cap): perspective starfield (pinhole camera, z-drift with recycling, pointer-driven camera with 5.4× near/far disparity); the **Knowledge Core** — 3 gimbal rings + azure counter-ring as true 3D circles with exact front/back occlusion, depth-graded strokes, Fresnel rim brightening at silhouette extremes, Arabic-Indic graduated limb, 10 occluding orbital nodes, 3-layer breathing golden sun, anamorphic diffraction star (screen blend), 4 god rays; **scene evolution** across page progress G (nebula warm→cool crossfade, instrument recede zoom 1→0.86, twinkle season at G≈.5, meteor density rise).

**Page composition** (`LandingPage.tsx` + `landing.css`): the world moved into `.ln-world`, a page-wide fixed layer under a transparent `main` — the scene persists and evolves through all six acts (the reference's core trait, implemented with native accessible scroll instead of scroll-hijacking). CSS sky floor as canvas-failure fallback. Foreground dust occluders above content (shared Z-space proof). Warm light-wrap from the core into the copy zone.

**Typography & chromatics** (`landing.css`): hero title `clamp(64px,10vw,168px)` gradient-clipped cream→hot-gold with RTL right-to-left light-pass (per-word split — Chromium excludes transformed descendants from ancestor `background-clip:text`); hot gold ramp `#FFD98E/#F6A93B/#FF9E45`; cyan tension accents; premium gold CTA; glass cards (`blur(14px) saturate(1.15)`, mobile tier drops to opaque tint); giant Arabic-Indic act numerals ٢/٣/٥; progress stats as 64px gradient monuments; glowing finale rings.

## 5. Verification matrix (all run on the final tree)

- `npm run typecheck -w frontend` → clean
- `npm run test -w frontend -- --run` → **84 files / 977 tests, 0 failures**
- `npm run test -w backend -- --run` → **38 files / 1017 tests, 0 failures**
- `npm run build -w frontend` → clean (LandingPage 66.3 kB js / 22 kB gzip, css 53.5 kB)
- **axe-core 4.10.2 full page → 0 violations** (`scripts/r3-audit.js`)
- **reduced-motion** → canvas static frame painted (ratio 1.0) — depth without motion
- **mobile 390×844** → zero horizontal overflow at 6 scroll depths
- Perf tiers: 30fps ambient cap; DPR≤2; full/low density; offscreen + hidden-tab pause; mobile backdrop-filter drop (scripts/r3-perf.js instrumentation)

## 6. Honest limits

1. **Headless fps is not representative:** this environment renders with SwiftShader (software): the page *without* the canvas runs at ~14.5 fps, the canvas adds ~5. The 30fps cap and mobile blur-drop target real hardware; real-device profiling remains open.
2. **Real-browser QA** (Firefox/Safari, touch devices) not run — headless Chromium only.
3. **VLM jury is a proxy**, not the Awwwards jury; Arabic-Indic glyph recognition by VLM is unreliable (content verified via computed styles where the VLM misread).
4. The reference's interaction rituals (audio entry gate, sound toggle) were deliberately **not** replicated — the originality rule stands; our entry ritual (PreloaderRitual) remains our own.
5. Inner product pages (dashboard etc.) intentionally untouched this round — scope was the landing journey.

## 7. Next highest-leverage items

1. Real-device QA pass (iPhone/Android Safari+Chrome, GPU fps).
2. The journey peak act (8/10) — station cross-fight craft to 9.
3. Entrance choreography polish: ring-draw → ignition → type stagger timing audit frame-by-frame.
4. Consider a subtle scroll-velocity reaction in the world (stars streak with speed) — cheap in the existing engine, big feel win.
