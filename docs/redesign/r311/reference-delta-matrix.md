# R311 — Reference Delta Matrix

Mission: R311 · reference-fidelity convergence on the Heron AI interaction grammar (`https://heronaiapp.com/`).
Evidence sources: live reference captures (`audits/evidence/r310/reference/`, 21 states), `docs/redesign/r308/reference-observations.md`, `docs/redesign/r310/cursor-layer-audit.md`, `docs/redesign/r311/current-defects.md`, and the R311 before/after captures in `audits/evidence/r311/`.
Status values: `OPEN` · `IN PROGRESS` · `FIXED LOCALLY` · `VERIFIED IN PRODUCTION` · `BLOCKED WITH EVIDENCE`.

Legend: **Ref** = the measured reference behavior; **Mdr** = current Madarek behavior; **Δ** = the specific delta; **Fix** = the change; **Test/Ev** = the proof.

---

## §P — The pointer grammar (this mission's core)

| # | Ref | Mdr (baseline b303f2b9) | Δ | Fix | Test/Ev | Status |
|---|---|---|---|---|---|---|
| P1 | One filled 9×9 square follows the pointer; sharp edges | TWO systems co-painted: a 6×6 circular dot riding on/over the 9×9 square | the app-level circular layer was never included in the R310 audit | `suspended` prop + `RoutedCursorManager` (yield at `/`); vocabulary unified to `data-cursor="none"` | e2e r311 spec 1; after-audit + production audit: `cursorLayerCount: 0` in every state | VERIFIED IN PRODUCTION (D1) |
| P2 | No circular dot; no circular ring anywhere in the pointer | 28×28 circular ring bloomed over links **on top of** the square reticle | two competing reticles over one target | same as P1 (the layer is absent, not hidden) | after-audit `linkHover`: `sheetRing.on:"on"`, ring element absent from the DOM; VLM crop: «no circular ring»; live: production-dom-audit.json | VERIFIED IN PRODUCTION (D1) |
| P3 | Square targeting/press grammar over interactive elements | square reticle existed (24px outline, press contract) but missed the initial pointer entry onto a link | boundary events fire before the first pointermove → `hasMoved` false at evaluation time | `onPointerMove` owns the state too (re-derives per move) | e2e r311 spec 2 first assertion (single jump); live linkHover ring on | VERIFIED IN PRODUCTION (D2) |
| P4 | Movement-dependent trail that decays with motion | identical constants (lerp .18, speed threshold, quadratic alpha ramp, 26-pt cap) — R308 measured parity | none | — | r308 belt (carried) | VERIFIED IN PRODUCTION (R310) |
| P5 | Hero: a local plus with bounded guides + relative coordinates replaces the global pointer | the plus owned the zone but the global circle painted on top of it | D1's hero-state face | P1's fix; ladder: ≥992px native none, below crosshair (no dead zone) | e2e r311 spec 3; after + production audits: plus on, circle absent | VERIFIED IN PRODUCTION (D1) |
| P6 | Loader: its own drawing instrument owns the pointer while it plays | the loader cross/readout existed but the global circle rode over them | D1's loader-state face | P1's fix; loader zone `data-cursor="none"` at every width | e2e r311 spec 4; after + production audits clean | VERIFIED IN PRODUCTION (D1) |
| P7 | Footer: the global pointer remains; the reveal is a separate mask, not a cursor | parity (R310 fix) | none | — | r308/r310 belts | VERIFIED IN PRODUCTION (R310) |
| P8 | Touch/reduced-motion: no desktop pointer decorations; native interaction stays useful | both systems gate down; native only | none | — | e2e r311 specs 6–7 | VERIFIED IN PRODUCTION (re-verified) |

---

## §S — The nine scene families (section-level status)

| Scene | Family | Current state (vs the reference) | Status |
|---|---|---|---|
| 01 | Loader and entrance | R309 clock (5s progression / 3.6s hold / 0.65s exit) + R310 staged elevation draft + center-out exit; once per session; reduced-motion complete page. Pointer ownership now single-instrument (P6). | VERIFIED IN PRODUCTION (R309/R310) + P6 FIXED LOCALLY |
| 02 | Full-frame interactive hero | R310 full-width elevation (1440×640, 97 elements, 10 ink layers) + R309 one-frame instrument (plus/guides/readout/drag-to-inspect, collision-aware cards, mobile flow). Pointer ownership now single-instrument (P5). | VERIFIED IN PRODUCTION (R310) + P5 FIXED LOCALLY |
| 03 | Intro statement and ink image | R307/R308 statement + media band; mask-scrubbed ink transitions on the applicable sections. | VERIFIED IN PRODUCTION (R308) |
| 04 | Problems with line-drawn icons | original SVG linework with hover/focus animation, keyboard-accessible. | VERIFIED IN PRODUCTION (R308) |
| 05 | Main pinned plan walkthrough | R310 `LearningPlanDrawing` (209 elements, 4 monotonic scrub-reversible stages, 103→209 live drawables, zone washes) on the native 480dvh CSS-sticky engine. | VERIFIED IN PRODUCTION (R310) |
| 06 | Product modules / before-after ink | real product captures under the honest-capture policy; Artwork C evaluated NOT NEEDED (R310 decision record). | VERIFIED IN PRODUCTION (R310) |
| 07 | “Why us” workflow sequence | the four-stage progression lives in the plan's stages (R310 decision); scroll-tied. | VERIFIED IN PRODUCTION (R310) |
| 08 | Use cases and role selector | five role panels, per-role real captures, touch-friendly mobile composition. | VERIFIED IN PRODUCTION (R309/R310) |
| 09 | CTA, transitions, footer | geometric route-transition grammar through the React Router lifecycle; footer lens as a separate reveal (P7). | VERIFIED IN PRODUCTION (R308/R310) |

---

## §R — Remaining deltas (the honest open list, carried forward)

| # | Delta | Owner pass | Status |
|---|---|---|---|
| R1 | No dedicated mobile crop of the learning plan (the full plan scales in the ≤991px flow) | the R312 art-direction pass | FIXED LOCALLY (R312: the `.jt-cam` sticky camera inside `.jt-flow` — the viewBox crops to the washed zone following the reading band; the side column never covered; invariant probe 0 violations; belt: 9 unit + 6 e2e + the landing neighbours 52/52) |
| R2 | No frame-by-frame reference comparison for every transition (section-level evidence only) | the R312 evidence pass | FIXED LOCALLY (R312 phase 4: every named transition recorded on video + instrumented timelines + contact sheets — docs/redesign/r312/frame-evidence.md; the pass FOUND and fixed D7) |
| R3 | Scroll-engine difference (native 480dvh CSS-sticky vs the reference's Lenis+ScrollTrigger) — retained per §7.1: no user-facing gap reproduced | the R312 phase-5 reproduction attempt | BLOCKED WITH EVIDENCE — RETAINED WITH FRESH MEASUREMENT (R312: the fair A/B on the BUILT bundle vs the wheel-driven reference — means within 0.04ms, both zero frames >34ms on their heaviest scrub sections; the dev-server hitches were the D4 transform class; docs/redesign/r312/frame-evidence.md §R3) |
| R4 | e2e mount-latency flake under local parallel load (dev-server transform class; CI unaffected) | the R312 belt hardening | HARDENED LOCALLY (the mount waits raised to 30s on the five D4 points + the drag-geometry flake eliminated: the three elevation markers are not collinear — a single-segment line passes [MG] by ~10px and opens 2/3 stations; the gesture now walks a waypoint per marker centre; stress 8/8 + the full belt 23/23; the loader-clock timing under deliberate 6-worker saturation retries — the CI class runs a built app, unaffected as documented) |
| D5 | Station-warm off-by-one (R310): stage 3 (mastery) warmed door [04] — the LIBRARY door — instead of [05], the mastery door | the R312 art-direction pass | FIXED LOCALLY (landing.css: stage 3 now warms data-station='4'; [04] documented as a supporting wing; pinned in the r312 unit belt) |
| D6 | The `.jt-side[data-open='on']` desktop clamp would narrow the side column mid-flow at ≤991px once pin ≥ 0.93 (a latent R308 rule never exercised before the mobile re-order) | the R312 art-direction pass | FIXED LOCALLY (the ≤991 belt forces the open state inert — 100% width, no start border) |
| D7 | The guest surfaces (landing / public colleges / auth) changed routes as a HARD CUT — the AppShell keyed PageTransition only ever covered authenticated routes; reproduced on video vs the reference's measured 1.6s two-phase mask sweep (§14) | the R312 frame-by-frame pass | FIXED LOCALLY (GuestReveal — the keyed remount on the three guest boundaries; viewport-anchored top-down clip sweep + a traveling 1px rule; belt: 6 unit + 4 e2e + the guest regression 46/46) |

**Rule (per §12):** a code change alone never marks a delta closed. P1–P6, P8 have now been re-captured live on `madarek.onrender.com` (buildId `b8b63aed21b8`, asset hash `index-C7P5ui9j.js` — `audits/evidence/r311/production/`).
