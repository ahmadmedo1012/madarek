# T-11C — Motion closure: bridge, chrome draw-up, preloader exit — 100% @1440/@390

Branch `r339/t11c` · closes the T-11 motion arc (T-11A work-list → T-11b1 deadlock → T-11b2 seats → this).
Commits: `c5127d40` (PROP_FAMILY bridge + walkExit observation) → `3de4925e` (chrome cell draw-up + preloader recorded flight) → this (lead-mask observation fix + closure).
Baseline at `c5127d40`: 24/32 = 75% @1440 · 22/30 = 73.3% @390.

## Final coverage (tween.mjs @ :5313, /tmp/t11c-final*.json)

| section | @1440 | @390 |
|---|---|---|
| home-hero-wrap | **6/6 (100%)** | **6/6 (100%)** |
| chrome | 2/2 | 2/2 |
| home-intro-wrap | 2/2 | — (no animated Heron groups @390) |
| home-cta-wrap | 2/2 | 2/2 |
| home-why-wrap | 2/2 | 2/2 |
| home-problem-wrap | 2/2 | 2/2 |
| home-usecase-wrap | 4/4 | 4/4 |
| home-map-wrap | 2/2 | 2/2 |
| home-platform-wrap | 4/4 | 4/4 |
| footer | 2/2 | 2/2 |
| loading (preloader) | 4/4 | 4/4 |
| **OVERALL** | **32/32 = 100%** (11 stateOnly excluded) | **30/30 = 100%** (9 stateOnly excluded) |

Target was ≥90% @1440 — landed 100%; cta @1440 = 2/2 (deadlock fix from 6417078b confirmed firing).

## Bridge semantics (tween.mjs, c5127d40 + this)

- `PROP_FAMILY`: GSAP var keys ↔ CSS families (`y`→translateY, `autoAlpha`→opacity…); never a blanket transform→anything.
- The CSS **`scale` property** and `scale()` functions decompose per-axis: non-uniform (`0 1`→identity) files scaleX only; uniform-and-changing (`0`→identity, the lead-mask ladder) files **scale + scaleX + scaleY** — all three are true of the same motion; only families the Heron census speaks can match. Non-translating matrices file per-axis scale (hypot of column vectors).
- **Zero rect ≠ absence** (this commit): the lead masks' armed `scale: 0` collapsed their boxes, so walk0 dropped them and the role-tolerant join then read the FIRST title mask's `0 1` as their from-state (a fabricated envelope). Elements collapsed by the scale property stay tracked; only layout-absent (display:none) subtrees are dropped. Element identity joins on section+role+**occurrence** (document order) for role-ambiguous siblings.
- **walkExit**: the preloader unmounts on the exit's last frame, so the journey snapshots can never see the end-state — a mid-flight snapshot ~700ms into the 835ms wipe (roots walked reversed) observes it; elements present at walk0+walkExit and absent later are exit-flight (trigger=load, envelope pinned rest→flown).

## Chrome + preloader implementation notes (3de4925e + this)

- **Chrome header** (nav.css): brand + six nav cells draw up on the `scale` property (scaleY family via the bridge), 800ms power2.out, 20ms ladder, delayed two sheet-exit rungs so the cells draw on the revealed sheet (Heron: fromTo scaleY:0 ×12 as the paper split completes).
- **Preloader exit** (preloader.css + Preloader.tsx): the recorded two-band choreography — `.pl-sheet` (renamed from `.pl-paper` to match the spec seat name) carries the recorded `.loading-main` clip-polygon pair (49.944%/50.056% hairline → quads collapsed to the edges) across `--motion-duration-sheet-exit` (835ms) on `cubic-bezier(1,0,0.44,1)` WHILE two real `.pl-band` halves fly the recorded per-bp distances (∓387.5px/+310.5px @≥992, ∓150.6px/+263.9px below) tinting to the recorded `#b3b3af`; content fades 400ms (`--motion-duration-page` + `--ease-out`, the power2.out rung); unmount guarded to the sheet's clip-path leg (cap twin). The raw bezier literals carry `easing-gate: allow` provenance — `--motion-ease-band` does not resolve on the landing sheet (the parity layer's `:root` loses the cascade there; the r335 exit silently fell back to `all 0s ease`, masked by the cap-timeout unmount). Zero @keyframes, zero JS animation — no r306 whitelist entries needed.

## Remaining (honest ledger — zero missing groups)

- **neverRevealed, held OUT of coverage** (armed-hidden, never shown in any snapshot/sample — not tweens we run): @1440 `hro-edge-t/b/s/e` (the hero frame edges) + `jt-window`/`jt-card1`/`jt-card2`/`jt-close` (map journal cards — interactive-state seats, not journey reveals); @390 the same minus `jt-window`/`jt-close`.
- **stateOnly Heron groups excluded from the denominator**: 11 @1440, 9 @390 — `set()`-only initial-state writes, no animation recorded.
- Scrub equivalence stays property+trigger (numeric curves are scroll.mjs territory, T-10).

verify.sh --fast: GREEN (tsc · 3051 vitest · bundle 765.1/770 KB gz). run.mjs untouched · no gsap · no new !important · Arabic copy untouched.
