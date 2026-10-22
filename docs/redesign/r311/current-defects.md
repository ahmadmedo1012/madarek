# R311 — Current Defects Register (Phase 2 snapshot)

Mission: R311 · complete reference-fidelity convergence, single-square pointer.
Baseline: `main` @ `b303f2b9` (R310 production evidence commit; buildId `bad3716d82c6` verified live).
This register follows the R311 §12 delta discipline: every entry carries observation → evidence → root cause → fix → test → status. Status values: `OPEN` · `IN PROGRESS` · `FIXED LOCALLY` · `VERIFIED IN PRODUCTION` · `BLOCKED WITH EVIDENCE`.

---

## D1 — The duplicate cursor (the mission's named root cause)

**Status: FIXED LOCALLY (Gate A proven; production verification pending the push).**

**Observation.** At ≥992px with a fine pointer, the landing rendered TWO independent pointer systems simultaneously:

- the app-level `CursorManager` (R305-A2, mounted in `App.tsx` outside the route tree): a 6×6 circular dot (`border-radius: 50%`) plus a 28×28 circular ring blooming over links, a drag crosshair, and construction lines;
- the landing's `SheetCursor` (R308): the 9×9 orange square, velocity trail, and 24×6 square reticle.

**Evidence (before, captured at 1440×900 on the working tree @ `b303f2b9`):** `audits/evidence/r311/before/`
- `before-dom-audit.json` — every state records `cursorLayer.present: true` with `dotCore.opacity: "1"`:
  - `linkHover`: `state: "link"` + `dotRing.transform: matrix(1,…)` — the circular ring fully bloomed **while** `sheetRing.on: "on"` (the square reticle): two competing reticles over one target.
  - `heroEntry`: `point: "on"` (the local plus owns the zone) **and** `dotCore.opacity: "1"` — the global circle painting on top of the hero instrument.
  - `loaderEarly`: the global circle riding over the loader's own cross/readout.
- `a2-crop-link-hover-1440.png` (4× crop) — independent VLM review: *"a faint, light orange/red circular ring positioned directly behind and around the small, filled red square."*

**Root cause (architectural, per R311 §1.1).** Two independently authored cursor systems were both alive on the same route. The R310 audit inventory only counted *landing-scoped* pointer layers and never included the app-level mount in `App.tsx` — the R310 claim «مؤشّر واحد حاكم لكل نطاق» was therefore false at the app level. A second split: the suppression vocabulary — `CursorManager` honors `data-cursor="none"` while the landing zones used `data-cursor="hidden"` — so the landing's suppression zones did not even exist in the global resolver's grammar.

**Fix (R311 §1.3 option a — keep the square sheet as the sole landing instrument; the app layer yields for the whole route; §1.5 — one vocabulary, `data-cursor="none"`):**
- `frontend/src/components/motion/CursorManager.tsx` — new `suspended` prop: while true the component renders null and its pointer pipeline fully tears down (never a hidden div).
- `frontend/src/App.tsx` — new `RoutedCursorManager` (router-aware, `pathname === '/'`): the landing route suspends the app layer for its entire duration; every other route keeps the untouched R305-A2 behavior.
- Vocabulary migration to `data-cursor="none"`: `.bp-stage` (`LandingPage.tsx`), `.sl` (`SheetLoader.tsx`), `SheetCursor`'s `SUPPRESSED_SELECTOR`, and the two ownership-ladder rules in `landing.css` (crosshair below 992px / none above). Zero `data-cursor="hidden"` remains anywhere in the app.

**Tests.**
- `tests/motion/r311-cursor-ownership.test.tsx` (new, 7 specs) — the REAL router + REAL landing page + REAL app-level mount in one tree; jsdom side of §1.7.
- `tests/e2e/r311-cursor-ownership.e2e.ts` (new, 7 specs) — browser truth: one square system on `/`, `.cursor-layer` count 0 in every state (rest, link hover, hero entry/drag, loader, route transitions both directions, reduced motion, touch), square-reticle construction (`border-radius: 0px`), unified vocabulary, `/colleges` restores the app layer exactly as R305-A2.
- Regression neighbors re-verified: r308 (4/4) + r309 (24/24) e2e, full unit belts (2492 frontend + 1783 backend), typecheck/lint/gates/build — all green.

**Evidence (after, Gate A):** `audits/evidence/r311/after/`
- `after-dom-audit.json` — `cursorLayerCount: 0` and `dotCoreCount: 0` in **every** state; `linkHover.sheetRing.on: "on"` with no ring element in the DOM; `heroEntry`: `point: "on"`, `plusOpacity: "1"`; `loaderEarly`: `loader.attr: "none"`; `hiddenVocabulary: 0` everywhere.
- `a2-crop-link-hover-1440.png` — independent VLM: square outline + centered filled orange square, **no circular ring**.
- `a3-crop-hero-plus-1440.png` — independent VLM: plus with guides, no second cursor (the circular shapes nearby are the elevation's own artwork — grid bubbles/clock — allowed by §1.2).

---

## D2 — Reticle misses the initial pointer entry (§1.6 edge)

**Status: FIXED LOCALLY (surfaced by the new §1.7 belt; fix + regression spec landed together).**

**Observation.** A pointer entering the viewport directly onto an interactive element (single jump) never showed the square reticle until it crossed another element boundary.

**Evidence.** Reproduced deterministically: `page.mouse.move(cta)` single jump → `.sc-ring` stayed `data-on="off"` for 5s; a step-wise approach flipped it on; a synthetic `pointerover` dispatched on the CTA flipped it on.

**Root cause.** Chromium fires the boundary events (`pointerover`) **before** the first `pointermove` when the pointer enters the page. `setRingState()` therefore evaluated `show = overInteractive && !suppressed && hasMoved` while `hasMoved` was still false, cached `ringVisible=false`, and nothing re-evaluated until the next boundary crossing.

**Fix.** `SheetCursor.tsx` — `onPointerMove` now owns the state as well: every move re-derives `overInteractive`/`suppressed` from its own target and calls `setRingState()`. Documented in the component header (§1.6 initial-pointer-entry).

**Test.** `r311-cursor-ownership.e2e.ts` spec 2 (the single-jump hover is the first assertion).

---

## D3 — Pressed-state measurement landmine (recorded for future belts)

**Status: BLOCKED WITH EVIDENCE (browser behavior, not an app defect) — documented so no future belt re-trips on it.**

**Observation.** Exercising the pressed reticle state by pressing a landing CTA (an `<a>`) and dragging away produced a frozen pointer state.

**Evidence.** `setAttribute`/pointermove tap (probe): pressing an anchor and moving starts Chromium's **native link drag** — `dragstart` fires and the drag session swallows the pointer stream (measured: events die after step 1 of 12). No custom pointer system can track during a native drag; this is correct browser behavior, not a Madarek defect.

**Resolution.** The R311 press-grammar spec presses a real `<button>` (the theme toggle — outside every suppression zone) and releases away (no click). The landmine + measurement are documented in the spec header.

---

## D4 — e2e mount-latency flake under local parallel load (pre-existing)

**Status: OPEN (pre-existing; not an R311 regression) — recorded honestly.**

**Observation.** In the full local e2e run (and `--repeat-each` under 4 workers against the Vite DEV server), `r309-recovery.e2e.ts:49` («desktop drag reveals [CP]…») intermittently fails at its FIRST assertion: `div.bp-stage` not found within 5s of `goto`.

**Evidence.** Isolated runs pass (multiple times today, including the full r308+r309 belt 28/28); `--repeat-each=3` mixes pass/fail. The failure is always mount-time (lazy-chunk transform latency on the dev server under load), never in the drag geometry itself. CI's e2e job runs against a BUILT app where this latency class does not exist (R310's CI belt: 85 passed + 6 skipped, green).

**Root cause.** Vite dev-server cold transform of the LandingPage chunk under parallel workers exceeding `toBeVisible`'s 5s default after `domcontentloaded`.

**Decision.** Out of R311 scope (no mount-timing change was made); if it recurs in CI, the fix is a longer `toBeVisible` timeout on that spec — not a code change.

---

## D5 — Remaining reference deltas (the honest open list)

The pointer mission's named gaps are closed (D1, D2). The wider reference-convergence deltas that remain OPEN after R311 Phase 1 — carried into the delta matrix (`reference-delta-matrix.md`) for the next passes: no dedicated mobile crop of the learning plan (the full plan scales in the ≤991px flow); no frame-by-frame reference comparison for every transition; the deeper scroll-engine difference (native 480dvh CSS-sticky vs the reference's Lenis+ScrollTrigger) remains un-replaced per §7.1 (no user-facing gap reproduced).
