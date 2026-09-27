# Radical Redesign — Gap Analysis (Round 3, evidence-based)

**Date:** 2026-09-28 · **Base:** main @ 4b4ddbe · **Reference:** promo.emotion-agency.com (craft-level reference ONLY — no copying of assets/code/identity; all techniques re-derived and applied to madarek's own «أطلس المعرفة» language)

## 1. What was measured

Side-by-side capture at 1920×1080 (headless Chromium, `analysis/ref/full/` = 21 frames across the reference's 68,126px scroll journey incl. its 11 pinned acts; `analysis/mine/` = 17 frames of our landing at the same viewport). Two independent VLM jury audits (hero set + mid-page set), plus manual DOM/architecture dissection of the reference (Nuxt, single WebGL canvas, GSAP-pinned acts, custom scrollbar, entry-gate ritual).

## 2. Reference architecture (dissected, principles only)

- One persistent WebGL canvas behind **11 pinned acts** (~6 viewport-heights each; ~68k px of scrub). The WORLD persists and transforms per act (planet → canyon → tunnel → moonlit hills); text floats inside it.
- Ultra-bold wide display type, cream on deep void; mono eyebrow labels in `[ … ]` brackets; size hierarchy first, color second.
- Palette: deep void `#0A0514–#1a0b2e`, electric violet, cyan/teal, hot magenta accents; volumetric god-rays; starfield with per-star opacity; film grain.
- Rituals: audio entry-gate, custom draggable scrollbar, sound toggle, act-indicator classes (`current-section`/`next-section`).
- Zero native document scroll — a transformed container + wheel/touch/drag drivers (we will NOT copy this mechanic; native scroll + sticky acts is the accessible choice and ours already works).

## 3. Jury scores (VLM, 10-point scale)

| Dimension | Reference | Madarek (main @5dd3357) |
|---|---|---|
| Visual impact | 9.5 | 6.5 |
| Composition | 9 | 7 |
| **Depth / 3D** | **10** | **4** |
| Typography craft | 8.5 | 8 |
| Color artistry | 9 | 7 |
| **Motion potential** | **10** | **5** |
| Memorability | 9 | 6 |
| Mid-page sections | 9–10 | 4–5 |

Verdict quote: *"a digital installation vs a digital poster… stop designing layouts and start designing environments."*

## 4. Why the current build under-delivers (root causes)

1. **Flat planes.** SkyAtlas parallax is 2D offset (±8/16/30px) — no perspective projection, no z-axis. The astrolabe is drawn with uniform strokes at 0.3–0.5 alpha: no volume, no occlusion, no light. It reads as an etching, not an instrument floating in space.
2. **Timid light.** One 0.12-alpha halo + one haze sprite. The reference sells depth with volumetric rays and layered radial light at 3–4× our intensities plus screen-blend light leaks.
3. **Type sits ON the world, not IN it.** Solid-color headline, no gradient clip, no light-pass, no interaction with the core's glow. Hierarchy mixes size and color arbitrarily (jury: "the eye jumps erratically").
4. **Safe palette.** Gold `#ECBE69` on navy `#0A1024` is muted; no second accent creating chromatic tension; nebula clouds ≤0.1 alpha (invisible in practice).
5. **Scene doesn't evolve.** After the hero, the fixed atmosphere layers are static — acts 2–6 happen over a dead sky. The reference's world transforms through every act.
6. **Motion is ambient, not narrative.** Twinkle/drift/breath are loops, not staged choreography. The entrance has no ignition sequence (rings draw → core lights → type staggers).

## 5. What must be deleted vs evolved

- **Delete:** the flat single-stroke astrolabe renderer; uniform-alpha star planes as the only depth cue; the static post-hero sky; the solid-color hero title treatment.
- **Evolve (keep the bones):** 6-act narrative structure, pinned acts, GoldenThread, PreloaderRitual, CursorCompanion, KineticWords, zero-dependency canvas approach, full a11y/reduced-motion/perf contract (these are already world-class processes — the craft gap is visual, not structural).

## 6. The leap (this round's definition of done)

**A. World Engine (SkyAtlas v2):** perspective-projected starfield (stars carry z, drift toward viewer with scroll); volumetric knowledge core — 3D-tilted rings with front/back occlusion and depth-graded alpha; 25 orbital discipline nodes on true 3D orbits; layered god-rays; global act-progress driving scene evolution (hue shift, core drift, nebula crossfade per act); parallax disparity ≥5× between near/far.
**B. Type IN the world:** hero title at `clamp(64px, 10vw, 168px)`, gradient-clipped (hot gold → cream) with a slow light-pass; hierarchy by size/weight first; giant outlined Arabic-Indic act numerals as background depth.
**C. Chromatic audacity:** hotter gold ramp (`#FFD98E→#F6A93B`), cyan tension accent (`#7AC8FF→#39C6FF`) against deep void `#05070F–#0A1024`; light leaks with `mix-blend-mode: screen`.
**D. Entrance choreography:** ritual → ring-draw → core ignition → type stagger (all CSS/canvas staged, reduced-motion gets the composed still).
**E. Every act gets a scene state** (the sky answers each chapter), verified by VLM re-audit ≥8/10 per frame and the full test matrix (855 tests, axe 0, build clean, Lighthouse-class hygiene).

## 7. Measurement loop

Each cycle: build → capture 1920×1080 frames (hero + acts 2–6) → VLM jury vs reference frames → fix worst-scoring dimension → repeat until no dimension < 8/10 or two consecutive cycles gain < 0.25. Honest-stop rule applies: every claim in the final report must cite a command and its output.
