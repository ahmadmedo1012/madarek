# R318 C2 — smoothness fix workstream (perf-plan)

Author: C2-P (smoothness profiler). Inputs: `audits/evidence/r316/perf.json` (78 runs),
`audits/evidence/r316/perf.md`, `audits/evidence/r316/causes.md`, all measured on the
R318 base `55afbae6` via `scripts/r316/perf.mjs` (chromium-1223, CDP CPU 1×/4×, Fast-3G
cold). Every item below names its measured target. NO app code was changed to produce
the numbers.

## Baseline being fixed (medians, loader-skipped interaction runs unless stated)

| cell | %frames>33ms | p95 rAF | longtasks>50ms | CLS | LCP |
|---|---|---|---|---|---|
| 1440×900 · 4× · wheel | 71.1% | 100ms | 63 / 5,067ms | 0.007 | cold(loader-ON): 4.05s (`div.fo-grain`) |
| 390×844 · 4× · wheel | 96.6% | 83.3ms | 69 / 5,048ms | 0.033–0.037 cold | cold: 2.80–3.62s |
| 1440×900 · 1× · wheel | 19.8% | 49.9ms | 4 / 315ms | 0.007 | — |
| 390×844 · 1× · wheel | 2.8% | 16.8ms | 2 / 154ms | 0.000 | — |

The 4× jank is main-thread JS (LoAF: `FrameRequestCallback` 1,732ms @1440 / 2,530ms @390
inside long frames; 5.0s of longtasks inside a ~5.6s window), NOT paint/composite
(grain-off/filter-off/svg-off deltas all inside the ±3–4pt noise band). Cold first visit
holds the loader ~5.5–5.9s and fetches 738.0KB raw / 215.1KB gz of JS. docH@1440 =
12,340px — protected, must not move.

## Workstream — ordered by measured impact

### P0.1 Scroll-frame writes become idempotent; geometry reads collapse to one batch
- Targets: 71.1% → <35% @1440×4; 96.6% → <60% @390×4; longtasks 5,067 → <2,000ms.
- `JourneyScene.tsx:281` — guard the `viewBox` write with a string compare (its
  :282–284 sibling `preserveAspectRatio` already does): today the full 1200×760 plan
  raster inside `.jt-cam` re-invalidates EVERY frame (307–417 svg-attr writes/run @390
  vs 168 @1440).
- `JourneyScene.tsx:373–374` — do not re-`getBoundingClientRect()` `stations` + `camEl`
  per frame; derive from the hook's own rect + cached heights (refresh cache on
  resize/fonts/load only). That is 2 of the 3 reads per frame at ≤991.
- `useSheetScroll.ts:63` stays the ONE read per consumer per frame — but consumers
  subscribe to a shared geometry batch (the conductor already exists; extend
  `ScrollMetrics` so no consumer ever reads layout again).
- `useReveal.ts:87` — trust the IO's `boundingClientRect` instead of re-reading the
  whole registry per settle event (474 reads per rl-card per scroll run today).

### P0.2 Loader: first-visit-only + skip rules (the 5.5–5.9s gate + LCP seat)
- Targets: loader hold ≤2.5s worst case for eligibles; zero replay for returning
  visitors; cold LCP ≤2.5s (today 2.8–4.0s and the LCP element is the decorative
  `.fo-grain` layer).
- Skip the intro when ANY of: `madarek-intro-skip` present (keep the harness contract),
  `prefers-reduced-motion: reduce`, `navigator.connection.saveData`, ≤2 logical cores
  (`navigator.hardwareConcurrency`), or a second visit within the session.
- Show a real visible «تخطّي» button after 1.5s (44px floor, contrast-gated).
- Gate on fonts-ready + hero image only (not the full ledger); never re-run on route
  returns.
- Preload the grain tile + hero photo in `index.html` so LCP is the hero, not the grain.

### P0.3 Route-split / warm discipline (cold JS 738.0KB raw / 215.1KB gz)
- The entry chunk is 78.8KB gz against an 80KB ceiling (98.5% full) — splits must come
  from inside it; charts (191.74KB raw) and pdf (334.08KB raw) are ALREADY lazy and
  never fetched on `/` — verified, no work there.
- `LandingPage.tsx:413–429` auth warm (117.2KB raw / 34.7KB gz on the cold path):
  skip on `saveData` / `effectiveType` 2g-3g / ≤2 cores; warm on first intent
  (login-link hover/focus/touch) instead of idle timeout 4000ms.

### P1.1 Paint domain fencing (1× p95 49.9ms @1440; 0 contain/content-visibility today)
- `content-visibility: auto` + `contain-intrinsic-size` on below-fold bands (colleges
  grid, roles, platform, footer) — height-anchored sections keep
  `contain-intrinsic-size` from their measured band heights.
- GATE: docH@1440 must stay **12,340px** (protected round value) — verify with the
  harness after; the mobile camera bands are height-driven (`48svh` frame) and must not
  re-flow.
- `touch-action: manipulation` on interactive chrome; `contain: layout paint` on the
  pinned `.jt-pin` internals.

### P1.2 CLS reservations (0.033–0.037 @390 cold)
- Reserve space for the late-media seats named by the shift sources:
  `div.fo-hero-strip` (0.033), `section#statement` (0.033), `div.sl-meta`/`#node`
  (0.017) — min-height from aspect ratios + width/height attrs on the hero photos;
  `div.hydration-splash` (0.007 @1440) gets a fixed seat.
- Target: cold CLS ≤0.01 at every viewport; interaction CLS stays 0.

### P1.3 Grain as one static tiled raster (LCP + compositor, not jank)
- Replace the `position:fixed` full-viewport `mix-blend-mode:multiply` layer
  (`landing.css:73–85`) with one pre-multiplied static tile applied to the paper ground
  (no blend mode, no fixed element, no micro-grid second background). Keep the measured
  ±0.03% grain amplitude (scripts/r314/grain-measure.json). Dark twin keeps plain alpha.
- Rationale measured: blend removal does NOT fix 4× jank (Δ noise) but the fixed
  element is the cold LCP today and the blend costs real devices battery/composite.

### P2. Scheduling & polish (cheap, do alongside)
- `scheduler.yield()` between conductor consumers when available (longtask chunking);
  keep the single rAF (verified: no gsap/lenis/ScrollTrigger/framer-motion in dist —
  nothing else fights for frames).
- `will-change` budget ≤3–5: only the pinned `.jt-window` sheet, the `.jt-cam` frame and
  the theme-transitioning root — currently 0 (no waste, add deliberately).
- `100svh/dvh` for pinned stages (the `48svh` camera frame already; sweep the rest —
  no `100vh` scroll-jail on mobile URL bars).
- WOFF2 subsets + metric-matched fallback (fonts.css preloads ~86KB arabic subsets;
  verify `size-adjust`/ascent override so the 0.033 hero-strip shift dies at the font
  swap, not just from min-height).
- Ink art pre-rasterised AVIF/WebP for phones (≤991): keep SVG on desktop; on campus
  ALSO fix the real InkSketch chain (feDisplacementMap scale 100 + blur on a per-tick
  `d` mask — campus workstream; on `/` it is proven zero).
- Consent/banner + loader space reservation seats stay height-pinned (C1-C's geometry).

## Verification contract (same harness, same gates)
- `cd frontend && npx vite build && npx vite preview --port 4183 --strictPort &`
  then `node scripts/r316/perf.mjs --viewports 1440,390 --cpu 1,4 --scenarios scroll,touch,menu,theme,route,typing,cold --runs 2 --append`.
- Acceptance: @4× %frames>33ms ≤35% @1440 / ≤60% @390; longtasks ≤2,000ms per scroll
  run; cold LCP ≤2.5s with loader skip rules active; CLS ≤0.01 all viewports; docH@1440
  = 12,340; entry chunk ≤80KB gz; charts/pdf still absent from `/` fetches.
- Never merge on a single-run delta: repeat cells ≥3 (noise band ±3–4pt, per
  noise-recheck.md).
