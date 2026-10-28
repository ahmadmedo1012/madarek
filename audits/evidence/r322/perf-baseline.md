# R322 WP-1e — the desktop 1440 performance baseline trace (kill-list V11)

Head `e4d1be3` (main @ c2 close, this worktree's base). Harness:
`scripts/r322/perf-baseline.mjs` — one Node ESM file, zero new deps
(playwright-core + CDP tracing). 1440×900 · DSF 1 · en-US · 4×CPU
throttle (the R321 §A1 methodology), self-served `vite preview`
(127.0.0.1:4317 — IPv4, the R321 ::1 lesson), one chromium, five
sessions. Machine result set: `perf.json` (this directory); raw traces
in `/tmp/mdrk-r322-traces/` (89MB loader-on ×2 · 28MB scroll — outside
the repo, the r316 convention).

Sessions:
- **S1** loader-ON first visit, 4×CPU, no network throttle (the R321
  5.04s-comparable leg), traced ~25s from navigation.
- **S1-net** loader-ON, Fast-3G + 4×CPU (the owner's V11 LCP-21s
  methodology class), traced.
- **S2** loader-SKIP (`madarek-intro-skip` seed — the repo's hermetic
  mechanism), steady wheel descent of the whole page: **19 × 660px
  @250ms (≈4 notches/sec, ≈12.5k px ≈ one full descent of docH
  12,373)**, traced with `devtools.timeline` +
  `invalidationTracking` + `blink.style`.
- **S2-clean** the same scroll, 4×CPU, NOT traced — the honest
  frame-health row (tracing overhead excluded: p95 133→100ms, same
  >33ms rate).
- **S2-native** the same scroll, 1×CPU (machine speed context).

Caveats, stated: the sandbox is a 2-core/4GB host (4×CPU throttling
here ≈ the R321 numbers but background threads contend more than on
the owner's box); headless compositing shows a single paint layer
(layerId 0) — the paint-side costs are real main-thread work but the
real-GPU layer story may differ. The style-recalc costs (the #1 cost)
are hardware-independent.

## 1. Frame health vs the §6 targets

Targets (BOARD §6): **≥98% frames ≤20ms · CLS ≤0.05 · LCP ≤2.5s
(skip) / ≤4s (first visit).**

| session (1440×900) | frames | >20ms | >33ms | p50 | p95 | max | CLS | LCP |
|---|---|---|---|---|---|---|---|---|
| S1 loader-on, 4×CPU (25s window) | 868 | 23.5% | 23.5% | 16.7 | 50.0 | 899.9 | **0.007** | 508ms (img logo)¹ |
| S1-net loader-on, Fast-3G+4×CPU | 835 | 22.3% | 22.3% | 16.7 | 33.4 | 983.2 | **0.011** | **5,728ms** (h1 hero) |
| S2 traced · whole run | 233 | 47.2% | 47.2% | 16.8 | 133.3 | 416.7 | 0.248 | — |
| S2 traced · ACTIVE window | 178 | 56.7% | 56.7% | 33.3 | 149.9 | 416.7 | | |
| **S2 traced · MAP BAND²** | 79 | **70.9%** | **70.9%** | **66.6** | 249.9 | 416.7 | | |
| S2-clean · whole run | 245 | 47.3% | 47.3% | 16.7 | 100.0 | 166.6 | **0.246** | 1,708ms (p hero-lead) ✓ |
| S2-clean · ACTIVE window | 188 | 58.0% | 58.0% | 33.3 | 100.1 | 166.6 | | |
| **S2-clean · MAP BAND** | 86 | **72.1%** | **72.1%** | **66.6** | 133.2 | 166.6 | | |
| S2-native (1×CPU) · whole run | 359 | 17.3% | 17.3% | 16.7 | 49.9 | 83.3 | **0.261** | — |
| S2-native · MAP BAND | 138 | **39.1%** | **39.1%** | 16.7 | 50.1 | 83.3 | | |

¹ fires under the loader overlay (the mark logo at 508ms — LCP is NOT
loader-gated on the fast leg; the honest content LCP is the S1-net h1).
² the map band = scrollY inside `.jt` (top 2,566 · height 5,841 · vh
900 @ docH 12,373).

**Verdicts.** Steady state fails the frame target 24× (47.3% >20ms vs
≤2%) and the map band is 3× worse than the rest of the page at every
throttle level — **the map band IS suspect #1, confirmed** (even at
1×CPU: 39% >33ms in band vs 17% overall). The V11 magnitudes
reproduce: the owner's 106/215 ≈ 49% >33ms matches the 4×CPU clean
profile (116/245 = 47.3%); the 21s LCP does NOT reproduce at Fast-3G
(5.73s) — but the mechanism it complains about does (see §6). CLS
fails 5× — and it is now **a scroll-session defect, not a load
defect** (load-phase CLS is 0.007–0.011; the 0.24–0.26 lands during
the descent — §5). Every janky frame is >33ms (no marginal 21–32ms
band) — the jank is structural (style/paint work), not borderline.
The 53 long tasks >50ms (5.55s total) cluster at 6.9–9.0s — the map
band's second half + the pin-end side-column open + the chapters
approach; worst: 416/265/255/218/186ms.

## 2. Where the main thread goes (S2 traced, self-time)

Self-time by trace event (main thread; children subtracted):

| # | event | count | self ms | note |
|---|---|---|---|---|
| 1 | **UpdateLayoutTree** | 317 | **3,885** | style recalc — 2,993ms of it INSIDE the map band (77%) |
| 2 | FunctionCall | 5,131 | 1,709 | JS entry (see the per-function table) |
| 3 | **Layerize** | 234 | **1,024** | layer tree rebuild per commit — no layer reuse |
| 4 | FireAnimationFrame | 631 | 872 | the rAF fan-out itself |
| 5 | **Paint** | 483 | **815** | 269 paints / 379ms in-band |
| 6 | EventDispatch | 842 | 789 | wheel + scroll + animationend listeners |
| 7 | PrePaint | 253 | 355 | |
| 8 | Layout | 57 | 213 | real layout (NOT the problem — recalc is) |
| 9 | HitTest | 39 | 49 | |
| 10 | IntersectionObserver compute | 468 | 43 | reveals |

Named JS (FunctionCall totals): `f @ LandingPage-BOxRKOdu.js` 636ms
(the JourneyScene driver `onscroll`) · `no @ index-Dj0_Itxh.js` 374ms
(Lenis `raf`) · `loop @ (inline)` 205ms (the conductor rAF) ·
`useReveal` 104ms · `useSheetScroll` 58ms. LoAF invokers:
`react-gInupMWC.js :: MessagePort.onmessage` **941ms** (React's
scheduler — reveal-triggered re-renders) · `useReveal ::
FrameRequestCallback` 332ms · `index (Lenis) :: FrameRequestCallback`
173ms · `LandingPage :: DOMWindow.onscroll` 142ms.

The conductor + Lenis stack the R321 decomposition suspected is REAL
but **not the majority**: rAF-related JS ≈ 1.6s vs style+paint+layer
≈ 5.7s. The style/paint side is the C3 target.

## 3. The 756-family — SOLVED (it is the plan's own drawables)

Invalidation census (13,378 events, node+reason from the trace) and
the style-resolve census (49,302 `StyleResolver::ResolveStyle` events
over 2,519 distinct nodes — the deepest naming Blink offers):

| family | resolves | invalidations (kind · reason) |
|---|---|---|
| `line.pl-hatch.bp-drawable` (the plan's service-strip hatch) | **13,857** | **756 × 3**: styleInvalidator "Invalidation set matched class" + style "Related style rule" + layout **"SVG changed"** — ALL in-band |
| `#text` (SVG text nodes — plan labels) | 6,742 | 1,232 (incl. "Fonts changed" at load) |
| `circle.pl-dot.bp-drawable` | 2,725 | 232 "SVG changed" + 162 × 2 style |
| `line.bp-drawable` / `g.bp-hair` / `text.bp-micro` / `rect.pl-wall` | 1,861 / 847 / 821 / 793 | same triple pattern |
| `span.wr-i` / `span.wr-w` (WordReveal) | 971 / 921 | "Related style rule" + "Invalidation set matched tagName" — the R321 .jt-intro var-chain, still alive in band |
| `line/rect.bp-hair.pm-draw` (the pains' 4 drawings) | 924 | 706 + 423 **"Animation"** — the stroke-dashoffset draw-in transitions |
| `span.hi-marker-dot` (hero pulse) | — | 702 **"Animation"** (`hi-pulse 2.2s infinite`) |

**The mechanism, named:** the driver writes `--jt-p` every frame on
the `.jt-plan` **SVG root** (the R319 §E-13 "consumer seat"). Custom
properties INHERIT — a changed custom property on an ancestor
invalidates the computed style of EVERY descendant that carries it,
and Blink's invalidation set for the plan subtree is the `.bp-drawable`
family: **756 elements walked per frame, three ways** (invalidator
walk + style recalc + "SVG changed" layout/paint invalidation of the
SVG subtree). That is the R321 "756-family" — it was never a mystery
section, it is the plan's own hatch/dot/hair drawables. The R319 seat
probe (0.058ms/cycle on `.jt-plan`) measured a quiet tree with a
forced flush — with the invalidation sets armed by live scroll the
same write costs the 756-walk: UpdateLayoutTree families of
**754–932 elements × 42 events** + **2,711-element families × 2**
(the `.jt[data-stage]` flips at stage boundaries — the R321 27ms
stage-flip cost, still present) + 22 mid-size (100–399).

## 4. The map-band repaint verdict (what repaints per frame during the pin)

- **One paint layer for the whole document** (`distinctLayers: 1`,
  every Paint event on layerId 0; `will-change: 0` in the CSS census —
  nothing is promoted). Scrolling rides `ScrollLayer` (cheap), but
  every style/paint invalidation repaints into the single root layer.
- Paint records in-band (269): **`DIV.jt-pin` × 95 (178ms)** — the
  sticky map viewport repaints ~once per frame during the pin — plus
  **`#document` × 128 (610ms total, clips up to 1440×5335!)** —
  whole-document paint records riding the reveal/entrance animations
  outside the band's own work. `span.wr-i` × 87, the pains'
  `li.pm-col.in-view` × 116 (the draw-in transitions), the stations'
  `article.jt-station` sit behind `backdrop-filter` ×4 (a real-GPU
  paint cost flagged for C3/C4).
- Layerize 1,024ms — the layer tree is rebuilt per commit because no
  stable layer exists to reuse.

**Verdict: during the pin, per frame, the browser (a) recalcs style
for the whole plan subtree (§3), (b) repaints the `.jt-pin` viewport,
(c) re-layerizes the document.** The R321 "svg-off changed nothing"
result is explained: hiding the SVG kills the PAINT but not the
756-element STYLE walk (which is the larger half), so p95 barely
moved; the SVG is guilty of both halves in different currencies.

## 5. CLS — the named shifting nodes

Scroll-session CLS 0.246–0.261 (all three S2 runs). Load-phase (S1/S1-net)
is 0.007–0.011 — V11's 0.27 is NOT the loader. The two shifts that
make it:

1. **0.187 @ pin end (t≈9.98s of the session)** — the `.jt-side`
   expanding capability column opens (`data-open="on"` at pin ≥ .93):
   `div.jt-side` 1px→344px wide, `ul.jt-checklist` + `p.jt-side-note`
   + `figure.jt-side-section` resize/appear, and **the plan SVG itself
   resizes (1259×797 → 916×580)** because the flex pin re-flows the
   window — one layout transition, five shifted sources, 76% of the
   total CLS.
2. **0.039 @ the same window** — the follow-on settle: `div.jt-side`
   continues growing, `svg` + `div.jt-progress` + `span` (the hairline
   fill) move with it.

Fix root: the pin-end expansion animates LAYOUT (width) of a flex
child — reserve the final geometry or animate opacity/clip only, and
`contain: layout paint` the pin so the plan's reflow can't shift
siblings.

## 6. The first-visit decomposition (S1 / S1-net)

| leg | S1 (4×CPU, no net) | S1-net (Fast-3G + 4×CPU) |
|---|---|---|
| FCP | 244ms | 1,612ms |
| fonts.ready | 394ms | 1,933ms |
| **loader mounts** (waits for the lazy landing chunk + React boot) | **3,868ms** | 6,411ms |
| LCP (content) | 508ms (logo img, under the loader) | **5,728ms (h1 hero — font-gated)** |
| **loader unmounts** (authored ~5.6s counter + 717ms hold + 835ms exit) | **9,994ms** | **11,182ms** |
| TBT proxy (Σ dur−50) | 6,023ms (**5,775ms before loader exit**) | 5,755ms (5,724 before exit) |
| long tasks | 46 / 8,323ms (worst 708, 642, 344ms) | 37 / 7,605ms |
| UpdateLayoutTree (25s window) | 911 events / **6,475ms** self | 863 / 5,368ms |

Where the time goes, in order: (1) **the loader's own dwell is
time-gated, not readiness-gated** — the counter curve (100% at
5,649ms) + hold + exit mean ~6.1s of loader regardless of what is
already painted underneath (the fast leg's content LCP fires at
508ms UNDER the overlay); (2) **the loader mount itself is late under
CPU load** — 3.9s after DCL at 4×CPU waiting for the lazy
`LandingPage` chunk to eval + React to boot (the visitor stares at the
hydration splash); (3) at 3G **the display font queues behind the
preload of a dead face**: `index.html` preloads
`plex-sans-arabic-400` + `700` — but the R322 C1 type system (V5)
uses **400/500/600 only**; the LCP h1's face (`600-arabic`, 45.9KB)
starts at 2,908ms and lands ~4.8s while the dead `700-arabic`
(44.6KB) rides the preload slot from 212ms. LCP-first at 3G is
5.73s vs the ≤4s target; re-pinning the preload to the faces actually
used (400+600 Arabic) is the single cheapest cut. (4) The load window
burns the main thread on style: 6.5s of UpdateLayoutTree driven by
three INFINITE CSS animations invalidating style every frame for the
whole 25s window — `hi-marker-dot` (2,538 invalidations, the hero
pulse), `fo-hero-work-track` + `fo-ticker-track` (1,692 each — the
marquees), plus the entrance draw-ins (`bp-drawable bp-hair`
"Animation" 1,573) and the font swap relayouts (`#text` "Fonts
changed" 676). React's scheduler (`MessagePort.onmessage`) alone is
1,974ms of the window.

The 21s LCP of V11 does not reproduce at Fast-3G (5.73s); the owner's
box was slower/colder. The structure it reports is real and measured
here: **time-to-content on first visit is loader-gated and
font-gated, not network-gated.**

A policy discovery: `introGate` (R318 §C) ALREADY skips the loader on
≤2-core devices, saveData and ≤2g — this 2-core sandbox never showed
it until the harness overrode `hardwareConcurrency`. Any
"loader-skip on desktop" policy for C4 builds on an existing, shipped
gate.

## 7. The fix menu for C3 (the map rewrite) — ranked by measured yield

1. **Kill the inherited-var recalc of the plan subtree** (UpdateLayoutTree
   3,885ms → expect ~70% back): register `--jt-p` as
   `@property { syntax: '<number>'; inherits: false }` and write it on
   each of the 8 consuming layer roots (`g.pl-l-*`) + the statement —
   the 756-element inherited walk dies at the element that reads it.
   (The `.jt-intro` line mapping needs `--wr-p` written per line
   directly — the R321 recommendation, now measured again: wr-i/wr-w
   ≈ 2,000 invalidations.) Alternative with the same yield: drive the
   8 layer opacities as direct JS `style.opacity` writes (no custom
   property at all — opacity does not inherit, descendants never recalc).
2. **Pre-rasterise the static art** (Paint 815ms + Layerize 1,024ms +
   the `.jt-pin` 95 in-band repaints): the plan's resolved stages are
   static geometry — render each completed stage state ONCE to an
   offscreen raster (or one-svg-per-state `<img>` opacity toggling —
   the mission's own menu) and keep only the live wash/chip/hairline
   as dynamic SVG. This also collapses Layerize to a stable layer set.
3. **Fix the pin-end side-column expansion** (0.187 of the 0.246 CLS):
   reserve the column's final width in the pin grid from stage 0 (the
   plan window sized to its FINAL box), or open it by opacity/clip —
   never by animating layout; `contain: layout paint` on `.jt-pin` /
   `.jt-window` so a plan resize cannot shift siblings (also bounds
   the §3 recalc to the band).
4. **Re-pin the font preload** (LCP-first 5.73s → ~3.5s expected at
   3G): `400+700` → `400+600` Arabic (the faces the C1 type system
   actually renders; 700 is dead weight competing with the LCP face).
5. **Promote or retire the infinite/reveal animations** (2,157+
   "Animation" invalidations during scroll; 5,900 during load):
   `will-change: opacity` (or `transform`-only keyframes) for
   `hi-pulse`, the two marquees, and the `reveal-up` set during their
   transition window; `pm-draw`'s stroke-dashoffset transitions (C4)
   → shorter or pre-drawn.
6. **Loader policy on desktop** (S1: 6.1s dwell, 5.8s TBT under it):
   let the hero mount/paint visibly under the loader and cut the
   dwell (the R321 option), or reuse the shipped R318 §C gate shape
   (skip on repeat visits / fast boots). C4 decision; the measurements
   above are its inputs.
7. `content-visibility: auto` below the fold stays NOT adopted (the
   R321 §A1 verdict — docH ratchet + relocated long tasks); items 1–3
   deliver the same frame win inside the band without the ratchet.

Holds (verified again): gBCR read storm ABSENT (96 reads per full
descent — the R318/R319 batch holds); the two-phase rAF
read→write contract holds (Layout 213ms total, 57 events); Lenis +
conductor JS ≈ 1.6s of 7.3s main-thread — keep the single-clock
architecture, it is not the bottleneck.

## Artifacts

- `audits/evidence/r322/perf.json` — the full machine result set
  (5 sessions: frames/CLS/LCP/longtasks/loaf/gBCR/census + the trace
  tables: self-time, invalidations-by-node+reason, style-resolves,
  paints-by-node, recalc families, anchors)
- `/tmp/mdrk-r322-traces/trace-1440-{loader-on,loader-on-fast3g,scroll-traced}.jsonl`
  — raw CDP traces (28–90MB each, outside the repo)
- `scripts/r322/perf-baseline.mjs` — the harness (re-runnable:
  `node scripts/r322/perf-baseline.mjs [--sessions s1,s1net,s2,s2clean,s2native]`;
  builds nothing, serves `frontend/dist` itself, kills the server on exit)
- `scripts/r322/_anchor-probe.mjs` — the trace-anchor verification
  probe (EventDispatch-wheel ↔ performance.now() pairing, spread 1.2–1.4ms)
