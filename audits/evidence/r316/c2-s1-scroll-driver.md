# R318 C2-S1 — the scroll driver: idempotent writes + batched geometry

Scope (the 4 owned files): `frontend/src/lib/motion/useSheetScroll.ts` ·
`frontend/src/lib/motion/sheetConductor.ts` ·
`frontend/src/hooks/useReveal.ts` ·
`frontend/src/components/landing/journey/JourneyScene.tsx` (driver/applyCam/camRectAt only).

Build measured: working tree of branch `c2-s1` (chunk `LandingPage-Bi_8d-r8.js`,
base `b91c6d82` + the pin-root publish + the two-phase tick + the cached
reading-probe lists). Commands: `cd frontend && npx vite build`, then
`npx vite preview --port 4190 --strictPort` and, in the same shell session,
`node scripts/r316/perf.mjs --viewports 1440,390 --cpu 4 --scenarios scroll
--base-url http://localhost:4190 --append --runs 3` plus one `--grbc` census
pass. "Before" = the c2/p baseline quoted in `causes.md` (medians over the
55afbae runs recorded in perf.json; loader skipped, CPU 4×, same wheel profile).

## 1. What changed in the driver

1. **Idempotent writes.** `sheetConductor.setSheetVar(style, name, value)` caches
   the last written value per (style, name) and skips unchanged strings;
   `data-stage`/`data-open`/`data-on` keep their existing string-compare guards.
   Clamped pin dwells (0/1), 4-decimal quantized steps and idle settle frames no
   longer dirty style.
2. **ONE batched geometry pass per tick.** `sheetConductor.sheetRect(el)` caches
   each element's rect + `innerHeight` per generation; the generation bumps at
   every conductor tick and on every out-of-loop read (`freshSheetRects()`), so a
   cached rect never crosses a frame boundary and the first read of an element in
   a tick serves every consumer. Census proof: `div.jt` / `div.wy` /
   `section#statement` read EXACTLY once per tick each (171/171/171 reads over
   171 ticks @1440; 242 each over 242 ticks @390 + `div.jt-window.jt-cam` once
   per tick — the sticky cam rect is measured live by design; its cached
   doc-offset would drift while stuck).
3. **The ≤991 stations/cam reads are cached per layout epoch.** The stations
   stack is in-flow content: its DOCUMENT-space top+height is cached
   (`stationsDocRef`), viewport position derived from `window.scrollY` (free),
   invalidated by `options.onRefresh` (resize + the settle callback), never per
   tick.
4. **The tick is TWO-PHASE (read → write).** The consumer write callbacks run in
   microtasks queued by the tick: every subscriber's reads happen inside the one
   rAF task, every write after that task's stack empties (still before the
   frame's style/layout/paint). No consumer's read can flush another consumer's
   write — the old interleave forced 2+ UpdateLayoutTree passes per frame
   (~19 ms each at 4×CPU). Settle/prime frames read fresh and write sync (they
   run alone).
5. **The `viewBox` rewrite is guarded** (`applyCam`): the interpolated crop is
   quantized to whole viewBox units (`Math.round`, 1px on a 480-unit window —
   invisible on the scrub) and `setAttribute` fires only when the composed
   string CHANGES (the `:282` `preserveAspectRatio` sibling's discipline). The
   ≤991 phone no longer re-rasterises the 1200×760 plan every frame for free.
6. **The clock publishes on the PIN-ROOT seat.** `--jt-p` is written on
   `.jt-pin` (the only subtree landing.css consumes it in — the plan scrub layer
   groups, the pin statement, the pin INTRODUCTION card), not on the track root.
   Measured per write+forced-flush cycle at 4×CPU (12 cycles, probe): track root
   ~39.7 ms @1440 / 32.2 ms @390 → pin root **~8.8 ms @1440 / ~0.6 ms @390**
   (the pin sheet is `display:none` ≤991px — Blink skips that recalc entirely;
   the mobile scrub rides the guarded viewBox + `data-stage`). `--jt-r` stays on
   the two `.jt-progress` hairline seats. Fallback to the track root if
   `.jt-pin` is ever missing — slower, never wrong.
7. **`viewportState()` caches its two MediaQueryLists** (a fresh
   `matchMedia(...)` pair per tick measured 4.6–5.0 ms per scroll run at 4×).
   The lists are live: `.matches` is re-read per call, so the r312 camera
   crossing and the r311 reduced-motion contracts are unchanged.
8. **useReveal settle: per-entry dirty tracking.** Entries carry DOCUMENT-space
   `docTop` + a layout epoch; a settle checks `docTop - scrollY < innerHeight`
   with ZERO layout reads and only re-measures entries whose epoch is stale
   (resize, fonts.ready, window + capture-phase resource loads, geometry-affecting
   transition/animation ends, and a per-settle `scrollHeight` net watch) — one
   batched read pass for the dirty set only. The r308 once-only, fling-hardening
   (mount check + IO fully-above clause + settle belt) and reduced-motion
   contracts are byte-for-byte preserved (doc comments kept). The IO callback
   refreshes `docTop` for free from its own measured rect.

## 2. Before → after (medians; loader skipped, CPU 4×, wheel profile)

| metric @1440×900 | before (55afbae) | after (this branch) |
|---|---|---|
| %frames >33ms (active) | 71.1% (p95 100 · max 200) | **73.8%** (72.5/73.1/74.4/74.6 — within the ±3–4pt noise band) |
| longtasks >50ms | 63 / 5,067 ms | **59 / ~4,950 ms** (51–63 / 4,354–5,306) |
| LoAF `FrameRequestCallback` | 1,732 ms (entry chunk: the whole sheet clock) | conductor chunk ≤147 ms; the remaining **~1.5 s** sits in `LandingPage-*.js :: FrameRequestCallback` = the header `apply` rAF (§4) |
| gBCR reads per scroll run | 4,585 (**560/s**) | **606 (80/s)** — 3 reads/tick, one per consumer |
| CSS-var writes per run | 809 | 738 |
| SVG/dataset attr writes | 168 | 168 (desktop has no cam writes) |

| metric @390×844 | before (55afbae) | after (this branch) |
|---|---|---|
| %frames >33ms (active) | **96.6%** (p95 83.3 · max 133.3) | **26.8%** (23.7/25.9/26.2/27.4/32 · p95 50 · max 66.7 · avg 22–24 ms) |
| %frames >20ms (active) | 96.6% | 26.8% (p95 50 ms ⇒ slow frames are 33–67 ms, none 100+) |
| longtasks >50ms | **69 / 5,048 ms** | **9 / ~900 ms** (6–12 / 688–1,260 — worst single task 425 ms = the idle auth-warm chunk eval, §4) |
| LoAF `FrameRequestCallback` | 2,530 ms | useSheetScroll chunk 22–149 ms + LandingPage chunk 52–108 ms (the header `apply`) |
| gBCR reads per scroll run | 3,619 (**466/s**) | **1,059 (200/s)** — 4 reads/tick (3 consumers + the sticky cam) |
| svg/dataset attr writes | 307–417 | **218** (the guarded, quantized viewBox) |
| CSS-var writes per run | 709 | 1,180 — per FRAME ~5.5 (flat vs before ~5.7); per run grows only because the active window now records 190–201 frames vs 125 (frames got faster) |

CLS 0 @390 (before 0); 0.007 @1440 (unchanged). `d`-attr mutations 0 in every
run (InkSketch still not on `/`). docH protected: **12,340 @1440 · 11,411 @390
EXACT** (live probe, this build).

Mission target @390 4× (≥98% frames ≤20ms, 0 longtasks >50ms): **NOT MET** —
26.8% >20ms, median 9 longtasks. The remaining jank is attributable to code
OUTSIDE this task's 4 files (§4); the driver itself is now batched, idempotent
and cheap (§2 census).

## 3. Suites

`vitest`: r308-interaction 24/24 · r313-lenis 13/13 · r306-landing-sheet 21/21 ·
r312-mobile-camera 9/9 · r168b-truthfulness 10/10 · wordreveal (r318 §A1) 3/3.
`tsc -b --noEmit` 0 · `eslint` 0 on the 4 owned files.

## 4. Remaining scroll-jank seats (OUT OF SCOPE — attribution for the foreman)

CDP CPU profile (200 µs samples, the harness's wheel profile, 4×CPU) + LoAF
top-invokers, after the driver work landed:

1. **`LandingPage.tsx:461-501` header `apply` rAF** — reads `window.scrollY`
   every frame; in Blink that read forces style recalc + layout when dirty, so
   it pays the flush of the scrub writes that landed in the same frame
   (microtask phase → its rAF order). Self time **639 ms @1440 / 190 ms @390**;
   LoAF `LandingPage-*.js :: FrameRequestCallback` ~1.5 s @1440. Fix: derive the
   header state from the conductor (subscribe) or cache scrollY per frame
   instead of re-reading it after other consumers' writes.
2. **The idle auth-warm (`LandingPage.tsx:420-424`, `requestIdleCallback`
   timeout 4 s)** evaluates mid-scroll at 4×CPU: `react-*.js ::
   MessagePort.onmessage` 306–756 ms @1440 / 252–434 ms @390 + `IdleRequestCallback`
   86–135 ms — React scheduler longtasks. Ticket owner: C2-S2 (loader/LCP/bundle).
3. **`HeroInspect.tsx:305-317` return-to-top scroll listener** — `window.scrollY`
   per scroll event (60–86 ms self) and `setOpenIds([])` on the up-crossing →
   React scheduler work on the way back up.
4. **Unguarded sibling var writes**: `WhyScene.tsx:92` (`--wy-p`) and
   `LandingPage.tsx:373` (`--wr-p`) re-write every tick even during clamped
   dwells (outside their bands) — measured flush after the 4-var set:
   **72 ms @1440** (single flush) vs ~8.8 ms for the pin-root `--jt-p` seat
   alone. Moving them to `setSheetVar` + the smallest-seat publish is a 2-line
   change per file in THEIR owners' hands.
5. **The unfenced 12,340 px paint domain** — `(program)` self time 580 ms @1440
   / 485 ms @390 = the render pipeline (RecalcStyle/Layout/Paint) after the
   callbacks. `contain` + `content-visibility:auto` + `contain-intrinsic-size`
   on the landing bands is the perf-plan P1 CSS line (landing.css — C2's CSS
   owner; docH 12,340 gate must stay exact).

## 5. Defect-gate note (scripts/r318/defect-gate.mjs, 360/390/1440)

`node scripts/r318/defect-gate.mjs --viewports 360,390,1440 --skip ocr,perf
--base-url http://localhost:4190 --out audits/evidence/r318/gate-c2s1.md` →
8 failing checks. Six are the cycle-1 documented reds, unchanged
(banner×hero-cue @360/390 light+dark; `--%` @1440 light+dark).
**Two new collision rows @1440 are a gate-seeding artifact, not a composition
regression**: `SET_SCRUB` seeds `--jt-p` inline on `.jt` (the OLD publish
seat), but the driver now publishes on `.jt-pin`, whose own inline value shadows
the seed — so at collision time the statement stayed at its natural p=0 state
(visible) instead of the seeded p=1 state (hidden). Its full-sheet box
(`.jt-statement { inset: 0 }`, 1387×900 — a designed overlay composition) then
records 5 BOX-model intersections with the pin's own children (intro title,
station 01 num/verb/title, status line) with ZERO glyph overlap — the
statement's text ink is centered at y≈3140–3195, the "colliding" text at
y3373–3533 (**≥178 px separation**, live-verified). The same geometry passed the
cycle-1 gate because the p=1 seed hid the statement. **2-line fix for the gate
owner**: seed `.jt-pin` when present (`.jt` fallback) — this also restores the
contrast states' intended scrub seeding (this run's contrast rows measured the
p≈0 composition three times and still passed 0 fails). Word-integrity, contrast
and overflow are green at all 6 cells; docH ladder exact (§2).
