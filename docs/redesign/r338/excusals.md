- T-02a (home-usecase-wrap, 1024+1440 only): Heron's row text tween splits titles/lines into per-WORD divs (mid-tween residue, opacity 0); the depth-6-truncating census surfaces them as sibling sets (≥3 identical fs/fw/color) under shallow roots, sometimes sharing a path with the real un-split line box. Arabic word-split law: our copy renders one box per line inside the bound conforming containers (rowtw/rowtwf/rowlinebox/rowtitle) — the real line boxes at the same roots stay bound and fully measured (typography+geometry), so nothing is weakened; the per-word scaffold boxes are excused via the structural charSplit "wordset" rule (run.mjs, r337-intro 37705268 precedent). 18 boxes excused (9/bp); lh/geometry debt remains for T-02b.
## T-03 home-intro-wrap — residuals (r338 wave-1b, time-boxed)
- **webkit cells (all bps)**: webkit build (2287) absent from ~/.cache/ms-playwright; lead's post-npm-ci install attempt incomplete at dispatch time and chromium-1223 download stalled at 80% mid-session. Measured chromium only — per ENV ADDENDUM webkit = RESIDUAL, never faked.
- **dark theme cells**: the conformance instrument (run.mjs v2) has no dark-mode measurement path (no theme toggle/param exists in scripts/conformance/* or the landing styles) — dark conformance is not expressible by the current tool; n/a, not excused as impossible by design.

## T-14a instrument — dark path + plumbing-skip (r338 wave-6)
- **dark cells (all sections, all bps)**: the frozen Heron spec (docs/redesign/r335/heron-spec/) is LIGHT-ONLY — no dark recordings exist, so dark cells cannot be spec-compared (not a per-section design impossibility; an instrument gap now closed). `run.mjs --dark` measures OUR internal consistency on the same pairs: (1) `html[data-theme="dark"]` actually applied via the site's own ThemeToggle mechanism (`tokens.generated.css` flips the token blocks under `[data-theme="dark"]`); (2) geometry/type/border/radius/opacity/interactive/transition re-asserted vs the frozen light spec — a theme flip must not move a box or retype a line; (3) the color group is NOT compared to the light spec (differs by design) — instead a token-flip census (≥1 paired element per section must change color/bg light→dark) plus a WCAG contrast floor ≥3.0 for every text-bearing/interactive paired element vs its effective (nearest opaque ancestor) background — catches unflipped raw light inks unreadable on dark surfaces. Measured footer+home-usecase-wrap @vite:5314 chromium: DARK TOTAL 8741/10037 = 87.1% (footer ~221-224/343 per bp, usecase ~1557/1674), 290 contrast checks, 0 dark-contrast fails; residual dark debt = geometry drift kinds (y/w/x-mirror/h) under the flip for section agents to fix.
- **plumbing-skip mechanism (T-06c follow-up — 132 heuristic-paired defs/filter/mask paths)**: mappings may now declare `"plumbing": [{"section","heron","skip":["geometry",…],"reason"}]` (spec-path exact/suffix, same grammar as noCounterpart); per-binding `explicit[].skip` keeps working but is now COUNTED (it was silent before). Skipped checks are counted per cell (`skipped`, console `s=`, `summary.totalSkipped`) and listed in `results.skippedReport` with the written reason — never a silent pass, never weakening measured assertions on real boxes. Selftest (footer@1440, defs-suffix rule, skip geometry+color): skipped 7→13, fail 441→439, pass 250→246 — exactly the 6 declared checks left the denominator, reported by path+reason; light regression footer+usecase 5 bps identical (9511/12493 = 76.1%) with zero plumbing rules present.

## T-02c home-usecase-wrap — lh/color impossible cells (r338 wave-9)
- **roles.h2/h2br lh (13 cells: h2 5bp + br1 4bp + br2 4bp)**: the transformed expectation demands lh 1.35×fs (72/54/38.39/39.78/42.88px) while the same spec freezes the h2 box as a 1.0-lh 3-line box (h2box/section/column geometry all conform at lh 1.0×fs). Raising lh to the floor grows the box +56px@1920 and breaks box+section+column geometry assertions one-for-one — the two assertions are mutually exclusive on the same element. The reference's own 1.0 box wins (box+section+column conform; ruling carried from the r337/r338 rewrite comment in roles.css).
- **roles.rowtitle.1 lh (4 cells: 1920/1440/1024/768) + its #hm heuristic twins (lh 2 cells @1024/1440, fs/fw sisters)**: in the frozen spec, row 1's label, title and (at 1440/1024) the tween's per-word title boxes share IDENTICAL path strings at every breakpoint (word-split capture, cf. T-02a's entry) — no unique heron binding exists for row 1's title, so rowtitle.1 pairs to the label seat (fs 17.78/fw500/lh-floor 24) while carrying the title's own metrics (fs 26.67/fw700). rowtitle.2–8 bind cleanly and pass fs/fw/lh/color identically — our title metrics conform to the spec's title seats; the row-1 cells are a capture-ambiguity artifact, not a code deviation.
- **rowink.2/rowink.8 color (≤3 cells @1440/1024)**: the same duplicate-path capture records the row-2/row-8 label path TWICE at 1440/1024 — once opaque (label) and once rgba(40,40,40,.72) (open-row body word box). The wrapper is aligned to the opaque title-box color model (rowink seats' dominant reading, 34/37 cells); the residual twin cells assert the 0.72 body reading on the same path — the spec is self-contradictory on those paths.
- **roles.rowtitle.2–8 lh @390 (7 cells)**: same floor-vs-geometry mutual exclusion as the h2 — the spec's 390 titles carry lh 19.65 (1.1×fs, below the 24.11 Arabic floor) and every following row's y/h was frozen at that lh; conforming the floor was measured to add +59 y / +4 h cells while fixing 7 lh cells (90.8→90.6 net). The reference's own boxes win; T-02d owns any compensating re-seat if the 390 deck work revisits this.
- **#hm color twins (3 cells: 1920/768/390)**: our unbound row-1 ink wrapper heuristically pairs with opaque label/title seats while sibling 0.72 body-word seats share the identical spec paths (row-1 capture ambiguity above); measured residual after aligning the wrapper to the opaque title-box model.
<!-- T-03c continuation note (NOT an excusal — measured residue, 2026 wave-10) -->
- T-03c charSplit attempt REVERTED (measured 59.9%, −14.8): mapping `charSplit:[{container:"h2[1]"}]` makes run.mjs's per-container aggregate treat EVERY bound h2 pair (intro.line/linein/linemask/word/wordin.N) as a container, excise them from accounting and assert one aggregate → mass fail (fontSize:85 color:113 interactive:91). The container mode fits usecase's single-line rows, NOT intro's per-word bindings; wordset mode would skip our explicit word bindings (wordSet members are excluded in loop (a)). Remaining intro residue, file-level: (1) 26 desktop char-cell heron paths `home-intro-wrap > h2[1] > div[L] > div[1] > div[1] > div[K] > div[M]` (per-CHAR scaffold, tc none) still heuristic-glued to `#hm:div.none` ≈500 fail rows (y/w/h/x-mirror/lh/fs/bg) — need per-char→word explicit bindings (offset arithmetic from STATEMENT_LINES) or a purpose-built scaffold rule; (2) pill parked B-copy x-mirror intro.ctaspan2/ctaicon2/ctatext2 (~47 rows); (3) crawl/label svg+path+img heuristic x-mirror (~35 paths).
## T-05 why (r338, respawned wave) — session residuals
- webkit cells: webkit absent from the shared pw cache (ENV ADDENDUM) — RESIDUAL, not measured, never faked.
- why conformance %: no measured cell this session — the shared /tmp/conf.lock was held by sibling agents for the whole measurement window; the 1440 run was launched but returned no number before the time box. Reported as n/a, NOT as a pass.

## T-05b why (r338, measure+iterate session) — session log + residuals
- webkit cells: still absent from the shared pw cache — RESIDUAL (unchanged).
- dark cells: instrument has no dark path (T-14a) — RESIDUAL (unchanged).
- MEASURED for the first time (own vite :5305, chromium, PLAYWRIGHT_BROWSERS_PATH
  fallback per ADDENDUM 3): home-why-wrap = 61.2% → 61.8% (65/65/60/59/58 per bp).
  Explicit data-spec bindings + noCounterpart waivers landed (33 written, 27 kept
  after dropping 6 path-collision casualties) — e/d went 0/0 → 1/12-17 per bp.
- Remaining work-list (NOT excusals, real iteration debt): (a) the extractor's
  depth-6 path truncation COLLIDES deep stage subtrees with shallow head/side
  paths (e.g. `…section[1] > div[1] > div[2] > div[2]` is BOTH the lede and a
  2930px stage box) — the side-rail family cannot bind by path until bound via
  unique suffixes or walk-side ordinals; (b) ~52/bp no-counterpart heron
  elements: mini-capture clusters (0×0 spec imgs), row-3 player scaffolding
  (defs/filter/mask), row-4 map paths + 12 point reveals, caption clusters —
  need real counterparts + bindings or documented waivers; (c) y:505/x-mirror:120
  /w:111 failure mass sits inside those unbound families.

## T-05c why (r338, bindings session) — excusals added + session residuals
- SVG scaffolding (suffix-excused, r337 precedent): defs/defs[2], filter[1], femerge[5],
  clippath[2], mask[1], defs[1] — non-rendering 0x0 filter/clip/mask plumbing inside
  heron's capture svgs; our authored line-art reproduces the visuals without filters.
- MEASURED (own vite :5305, chromium): home-why-wrap 61.8% → 62.2% (66/65/61/59/58 per
  bp). True-path rebinds: 12→19 data-spec bindings (head/eyebrow/eyebrowt/h2w/title/
  hrule/stage/axis/stagein/progress/track/rows + NEW side/rulev); mk1/mk2 marker
  bindings dropped — no unique spec path survives the depth-6 truncation.
- Residual work-list (real debt, NOT excusals): (1) HEAD GEOMETRY — our .wy-head grid
  mis-places .wy-h2w into the side column (row1 c2) and .wy-side stacks below the grid
  instead of inside the head's right lane; heron head = 0,0 1427x269 two-column
  (left: eyebrow y133 + h2 y162; right: 464px rule+lede+note box) — needs a Why.tsx
  head re-structure + why.css grid fix. (2) STAGE INSET — our content sits at x=33
  w=1380 vs heron x=0 w=1427 (.wy-section padding-inline 0.84rem + .wy-head
  padding-inline-start 3.12rem; stage/track must be full-bleed 1427). (3) MOBILE
  (768/390) — why.css ≤991px belt STACKS the stage (our section 8591/7221px tall vs
  heron 1882/808px compact mobile) — the spec's mobile grammar needs its own re-seat;
  ~100 uncountered elements at 390/768 live there. (4) ~55/bp no-counterpart elements
  remain (mini-capture 0x0 spec imgs, row-4 map paths + point reveals, caption
  clusters) — need real counterparts or individual excusals. (5) mk1/mk2 way-markers
  unbindable by path (truncation collision) — heuristic-paired only.

## T-05d why (r338, bundle-diet + head-reseat session)
- MEASURED (own vite :5305, chromium, pw-browsers fallback per ADDENDUM 3):
  home-why-wrap 62.2% → 61.1% (65/65/58/58/57 per bp) — NET −1.1: the
  bundle-diet DOM cuts (dead svg defs/filter/mask scaffolding, 16-path spinner
  → circles, unbound data-spec attrs, dead data-wy-stage writer) shifted
  heuristic ordinals (x-mirror fails 120→153) while the head 2-col reseat to
  the measured 1427×269 seat + the full-bleed stage improved y-fails 505→449.
  BUNDLE GATE: 777.4 → 777.0 KB gz PASS (ceiling 777, CI blocker cleared).
- webkit cells (no build) + dark cells (no instrument path): still RESIDUAL.
- Residual work-list: (a) recover the ~33 x-mirror cells — prime suspect the
  ≤991 section width min(171.24rem,100%) vs heron's mobile shell; needs the
  768/390 spec section rects before re-seating; (b) mobile compact re-seat
  (ours 8591/7221px tall vs heron 1882/808 — the ≤991 belt still stacks);
  (c) ~317 no-counterpart FAILs (mini clusters, map paths, caption clusters)
  unchanged from T-05c.

## T-04a — home-problem-wrap heuristic de-junk (baseline 80.3%, this pass 80.5%)
- Excluded 55 container roots from heuristic pairing + 0 exact-path excuses: heron's div[1]>div[1..6] siblings of section[1] and the div[2] subtree are the extractor's staged duplicate scroll-state recordings of the already-bound seats (TRUE paths + problem.<seat>.<n> data-spec own the geometry); svg line/path/circle/ellipse internals are the reference's art motif inside the bound 20rem artcolor boxes (our PainArt draws Madarek's own motifs in the same boxes). Ordinal tag+tc pairing of these against our classless plumbing divs produced junk y/h/x-mirror/w failures (≈76% of the 800 listed baseline failures). Containers verified NOT substrings of any explicit binding, so no measured pair lost an assertion (explicit pairs form before the exclusion; only heuristic fallback is filtered).
# R338 — written excusals (genuinely impossible cells, with justification)
T-06 | footer × webkit (all 5 bps) | ~/.cache/ms-playwright has chromium only — no webkit build, no root to install system deps; measured chromium+light only; webkit = RESIDUAL (never faked)

## T-06c footer residual (measured 66/63/79/70/71 chromium 5-bp, was 64.1/62.6/75.3/66.7/68.2)
- SVG defs/filter/gradient plumbing + 0x0 tween-residue seats (132 distinct heron paths, ~560 fails): noCounterpart excuses exist in mapping/footer.json but run.mjs heuristic pairing (tag+tc) glues them to our unrelated elements BEFORE the excuse applies. Fix path = charSplit-style skip in shared run.mjs or explicit skip:["geometry"] bindings (intro precedent) once our plumbing carries data-spec hooks. NOT excusable as "done" — documented residual.
- Mobile (390/768) y-stack order: our col2/col3/mark/striptwin land ~1-2k px from heron seats (heron footer is taller than viewport at 390; col3/mark measure -10k px = off-stage technique divergence). Needs footer.css mobile re-stack — next agent.
- Rule/chrome bg model: 57+23 bg fails — heron paints some rules as bg rgb(179,179,175) and others transparent (border-model); ours is inverted on those seats. CSS-level fix.

## T-06d (footer) — mobile 768 two-column row + markpath.2–8
- **footer @768 col3/c2bottom side-by-side row** — heron 768 places c2-bottom (496×331) and col3 (251×331) in one row ([col1+c1sub 377|377] / c2-top full / [c2-bottom|col3]); our ≤991 stack seats col3 full-width below (mark 207 measured, y/h conform; w/x residual). Full row re-seating needs the col1 side-by-side 768 model too — deferred to the next footer pass.
- **footer markpath.2–8** — our col3 mark is Madarek-authored construction geometry (REWRITE, DON'T PATCH: never Heron's paths); heron's svg paths are a different drawing, so binding them would assert another artist's geometry. Excused per the authored-line-art rule; markpath.1 keeps its existing binding.
- **footer brow index rows** — heron's c1-top carries only brand + hairline + subscribe (spec has exactly 2 c1-top children at every bp); our 4+3+2 honest-platform index rows are authored content with no counterpart (documented in mapping noCounterpart).
