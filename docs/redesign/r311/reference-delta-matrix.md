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
| R1 | No dedicated mobile crop of the learning plan (the full plan scales in the ≤991px flow) | next art-direction pass | OPEN |
| R2 | No frame-by-frame reference comparison for every transition (section-level evidence only) | next evidence pass | OPEN |
| R3 | Scroll-engine difference (native 480dvh CSS-sticky vs the reference's Lenis+ScrollTrigger) — retained per §7.1: no user-facing gap reproduced | requires a reproduced measured gap first | BLOCKED WITH EVIDENCE (standing decision) |
| R4 | e2e mount-latency flake under local parallel load (dev-server transform class; CI unaffected) | belt hardening | OPEN (pre-existing, D4) |

**Rule (per §12):** a code change alone never marks a delta closed. P1–P6, P8 have now been re-captured live on `madarek.onrender.com` (buildId `b8b63aed21b8`, asset hash `index-C7P5ui9j.js` — `audits/evidence/r311/production/`).
