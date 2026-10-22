# R312 — Frame-by-Frame Transition Evidence (Phase 4, §R R2)

Mission: R312 · Phases 3–5 (carried from R311). This report closes **§R R2**: "No frame-by-frame reference comparison for every transition (section-level evidence only)".
Baseline: `main` @ `2a5abfad` (R311 release).
Evidence root: `audits/evidence/r312/frames/` (raw webm + 10fps frame sets + contact sheets + `timelines.json`) and `audits/evidence/r312/frames/route-burst/` (the targeted screenshot burst for the route transition).
Method notes (recorded so no future pass re-trips):

- **Programmatic scrolls must use `behavior:'instant'`** — `base.css` sets `scroll-behavior: smooth` app-wide; every `window.scrollTo(0, y)` in tooling animates otherwise (measured: a jump landed 4.3kpx short while the lazy tail mounted).
- **The lazy tail grows the page on first entry** — engagement scrolls RETRY until they land (a clamped scroll reads as a short page).
- **`scrollIntoView` on a STICKY element is unreliable** — always the explicit `scrollTo` to the flow's document top.
- **Playwright video swallows sub-second effects inside chunk latency** (the D4 class: the dev-server cold transform can take seconds) — a ~600ms transition needs either a warm-up navigation or a targeted screenshot burst, not a whole-page video.
- **Rect reads need ≥110ms settles** after programmatic scrolls (24ms races layout).
- **ffmpeg**: this build has no glob demuxer (`-pattern_type` missing) — use an ffconcat list; a single-image output from a concat input needs `-update 1`; a many-frame tile needs the row count computed (`tile=6xN` emits one image per row otherwise).

## The transitions (all recorded on video + instrumented timelines)

| Transition | Evidence | Measured phases | Verdict |
|---|---|---|---|
| Entrance loader (desktop 1280 / mobile 390) | `mdrk-loader-desktop` (141f), `mdrk-loader-mobile` (133f) + `timelines.json` | mount → `.sl` overlay (counter + hairlines + the staged elevation draw) ~1.7s in; gone ~10.6s (desktop) / 9.9s (mobile) — the R309 clock (5s progress / 3.6s hold / 0.65s exit) on both; the hero ink-in then plays under the video's tail | VERIFIED (VLM: the drawing inks in progressively; ends on the fully-rendered hero; no flicker) |
| Reference loader (heronaiapp.com, fresh context) | `ref-loader` (246f) | `.loading` appears ~0.6s; display:none ~8.6s — a ~8.0s visible loader; then the hero reveal | VERIFIED (VLM: sketch grows progressively → detailed render → hero text fades in) |
| Loader comparison | the pair above | Both play a staged ink-in drawing and end on a fully-rendered hero. Madarek's visible phase ≈ 8.8s vs the reference's ≈ 8.0s (the R309 clock holds both sides of the exchange) | PARITY |
| Route transition (landing → /colleges → back) | `route-burst/` (the targeted burst; the video pass is the wide context) + `mdrk-route` (133f) | **D7 found**: the guest surfaces changed routes as a HARD CUT (the AppShell keyed remount only ever covered authenticated routes) — reproduced vs the reference's measured 1.6s two-phase mask sweep (reference-observations §14). **Fixed in this pass**: `GuestReveal` — the keyed remount on all three guest boundaries, playing a viewport-anchored top-down clip sweep + a traveling 1px rule; ~500ms by design (the R308 funnel lesson: faster than the reference) | FIXED + VERIFIED (three ways: the computed clip-path trajectory `inset(0 0 100%)` → `calc(100% − 215px)` → `…−799px` → `0%`; the pixel content-extent trajectory 318→336→431→512→549→568→573-settled; VLM tile-by-tile "progressive top-down unmasking, not a hard cut" — both directions) |
| Journey camera (mobile 390) | `mdrk-camera-mobile` (66f) + `timelines.json` | The read-through: card 0 → stage 0 (viewBox 640,126 crop interpolating on lecture) → card 1 → stage 1 (640,245) → card 2 → stage 2 (296,25.5) → card 3 → stage 3 (the exact mastery node `0 25.5 560 420`) → the side column closes | VERIFIED (VLM: the frame's content changes between tiles — the pan between the zones; the cards scroll below; ends on the checklist) |
| Reference route (heronaiapp.com header menu) | `ref-route` (800f) | The Webflow/Barba-class navigation on the reference (their measured 1.6s sweep per §14 of the observations) | RECORDED (the comparison anchor for D7) |

## D7 — the guest route transition (the pass's one code finding)

**Observation.** Every guest route change (landing → colleges, colleges → auth, back navigations) rendered as an instant hard cut. The `PageTransition` keyed remount lives in `AppShell`, which only wraps authenticated routes; the guest boundary (the landing, the public colleges gallery, `/auth`) has no shell — nothing fired. Reproduced on video against the reference's measured behavior before any code was written — exactly the §12 discipline (a reproduced measured gap).

**Fix.** `GuestReveal` (`frontend/src/components/motion/GuestReveal.tsx`, exported from the motion barrel): the same keyed-remount contract as `PageTransition`, mounted at the three guest boundaries in `App.tsx` (HomeRedirect's guest branch, GuestRoute's outlet, CollegesLayout's outlet). The sweep is viewport-anchored — a plain 100%→0 bottom inset would cross the fold in `500ms × vh/pageH` (a flash on tall pages), so the perceptible edge reaches the fold at 70% of the duration and the below-fold opens in the paint tail. The traveling 1px rule rides the same curve via `transform` (the motion gate forbids layout animation in keyframes). Clip-path is paint-only: CLS 0. RM collapses to the standing page. Barba itself stays rejected (the §H standing decision) — this is the declarative translation on the React Router lifecycle.

**Tests.** `tests/unit/r312-guest-reveal.test.tsx` (6 specs: the CSS contract pins — the 3-point sweep, the transform-only line, the RM belt; the three mounts in App.tsx; the jsdom re-key remount) + `tests/e2e/r312-guest-reveal.e2e.ts` (4 specs: the sweep plays + settles on both crossings, the traveling rule's computed style, RM standing page). The guest-surface regression belt: 46/46 green (r305-shell 16 + r311 14 + guest-landing + r312-mobile-camera 6 + not-found).

## R3 — the scroll-engine reproduction ATTEMPT (phase 5): no gap reproduced — §7.1 RETAINED

The §7.1 standing decision requires a reproduced user-facing gap before any engine change. The attempt (`audits/evidence/r312/probe-scroll-engine.mjs` + `scroll-engine/ab-report.json`): a fair A/B of rAF frame-time distributions during matched traversals of each side's heaviest scrub section — Madarek's journey walkthrough (the pin + the staged 209-element build + the camera) vs the reference's map region (its deepest ScrollTrigger work, wheel-driven — the r310 lesson: Lenis intercepts wheel, `documentElement` never scrolls there, so a programmatic `scrollTo` measures an idle page).

| Run (the BUILT Madarek bundle vs the live reference) | frames | mean | p95 | max | >20ms | >34ms |
|---|---|---|---|---|---|---|
| mdrk-journey-1440 (built, preview server) | 224 | 16.63 | 18.1 | 22.6 | 2 | **0** |
| mdrk-journey-390 (built, preview server) | 223 | 16.64 | 18.2 | 21.1 | 2 | **0** |
| ref-map-1440 (wheel-driven, run 2) | 182 | 16.60 | 17.0 | 23.8 | 2 | **0** |

The first attempt (the DEV server) showed Madarek at max 44.4ms / 2 frames >34ms — that was the D4 dev-transform class, not the engine: the same section on the BUILT bundle holds **zero frames >34ms**, identical to the reference (the 2-frame >20ms band appears on both sides across runs — measurement noise; the reference's own two runs read 0 then 2). The pin's positional fidelity (the desktop probe): the sticky pin holds exactly its offset for the whole pin window (24/31 samples at 0 with the remainder the monotone release ride) — sticky is browser layout; it cannot drift by construction.

**Conclusion:** the reproduction attempt FAILED to reproduce a user-facing gap. On production-class bundles, the native 480dvh CSS-sticky engine holds the same frame budget as the reference's Lenis+ScrollTrigger on their deepest sections (means within 0.04ms; both zero visible stutter). Per §7.1, the native engine is RETAINED — and the decision now carries fresh measured evidence instead of an unreproduced standing note. The dev-server hitches are recorded as the D4 class (already documented).

## What remains open after this pass

- R3 — CLOSED BY ATTEMPT (no gap reproduced; §7.1 retained with fresh evidence — see above).
- R4 (the e2e mount-latency flake) — the belt hardening is the remaining item of phase 5.
