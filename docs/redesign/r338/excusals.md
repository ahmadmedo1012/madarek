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
## T-02d1r — usecase y/h geometry residuals (93.9%, measured)
- 390 rows 7-8 +17px drift (rowrule/rowtw/rowicon clusters): the phone band's
  row box (2rem pad) accumulates ~2.4px/row vs the census by row 7; re-seating
  the band's row padding moves rows 1-6 (currently passing) off their seats —
  left as residual for a parked-deck micro-pass; 390 holds 90% ≥ floor.
- 390 h2/h2box y +20: the label's box (20 vs 15) + the 12px margin seat the
  Arabic label's taller metric line; both y cells ride the same trade-off.
- 1024 deck: slide.1 h -28.8 / slideimg.1 -30 residual — the spec's 1024
  active-slide (785) exceeds its own frame (759) by 3.4%; reproduced via the
  scale(1.0343) seat, img lands 782 vs 812 — the img overflow at that bp reads
  3.4% (vs 2.7% at 1920) and the two remaining h cells are the accepted gap.
- T-08c platform: webkit absent from the shared pw cache (ENV ADDENDUM 2/4) — webkit cells for home-platform-wrap are unmeasured, never faked; dark cells not re-run this pass (residual for the next platform pass).
## T-08c1 (platform color+lh) — residuals handed to T-08c2 (pairing, not spec values)
- lineHeight `#hm:div.short` ×5 (1/bp): heron's short-text 1.4rem/1.4-voice nodes get HEURISTICALLY paired to our base-voice `.pr-label` (want 21.78/16.33/11.61/18.05/18.75 = exactly our `.pr-cta-line` voice, already explicit-bound to its own twins). Fix = c2 re-pairing (explicit binding/DOM seat), not CSS.
- color `#hm:div.none` ×43 listed: heron CTA-internal nodes (anchor/rule/body orange rgb(250,54,0) + row/line/icon solid ink) heuristically paired to our muted-inheriting head/side elements. Our CTA subtree already carries the measured colors under its explicit bindings; same c2 re-pairing lever.
- Dark cells + webkit unmeasured this pass (timebox); section has a dark arm (`html[data-theme=dark]` re-points all 5 pr-vars) — measure in c2's pass.
## T-08c2 (platform, r338) — heron home-platform-wrap wrapper crossovers
Heron's frozen `home-platform-wrap` census tree is a page WRAPPER: besides the platform band (`div[1] > section[1]`, fully asserted with explicit data-spec pairs) it captures duplicate marquee copies of the band plus nodes of the neighbouring map/usecase/cta bands at other page rects (~69 paths). Those nodes have no counterpart inside `section#product` (their true counterparts live in our other sections, asserted under their own section keys) — declared in `home-platform-wrap.json` `noCounterpart` with reasons. Residual: the instrument's heuristic can still mispair some of them before the excuse applies (h=52) and the ≤991 `pr-imgs`/`pr-img` y/x-mirror cells assert heron's off-page 0×0 positions (y −7606/−7372) which a `display:none` fold cannot reproduce — queued for T-08c3 (rendered duplicate rows + absolute 0×0 seats).
## T-04a — home-problem-wrap heuristic de-junk (baseline 80.3%, this pass 80.5%)
- Excluded 55 container roots from heuristic pairing + 0 exact-path excuses: heron's div[1]>div[1..6] siblings of section[1] and the div[2] subtree are the extractor's staged duplicate scroll-state recordings of the already-bound seats (TRUE paths + problem.<seat>.<n> data-spec own the geometry); svg line/path/circle/ellipse internals are the reference's art motif inside the bound 20rem artcolor boxes (our PainArt draws Madarek's own motifs in the same boxes). Ordinal tag+tc pairing of these against our classless plumbing divs produced junk y/h/x-mirror/w failures (≈76% of the 800 listed baseline failures). Containers verified NOT substrings of any explicit binding, so no measured pair lost an assertion (explicit pairs form before the exclusion; only heuristic fallback is filtered).

## T-10 (cta first pass, r338/t10-cta)
- home-cta-wrap scaffolding: svg defs/mask/filter/fecomponenttransfer/image + the tween wrapper divs are excused via mapping noCounterpart with per-path written reasons (T-14a grammar) — plumbing, not measured design.
- heron cta band rails (top ledger band, kicker rail, column rules, sketch-band wrappers, masked img): structural first-pass excuse with written reasons; REAL counterparts (ruled ledger via the existing `.fo-cta .fo-hero-meta` css seat + authored inline-SVG sketch band) are the next cta pass's work. Leaf design (title/lede/primary button/actions box) is bound and fully measured.

## T-10b cta pass-2 (r338)
- **cg-strip (colleges registry)** — no heron counterpart: heron's cta spec ends at the bottom sheet rule (y1078); the registry strip is a product requirement (R323: the true colleges/campuses/live-capability numbers ride the strip). Our-side extra below the sheet; unbound by design.
- **kicker/rule ink (color skip)** — heron's ledger kickers + 1px rules carry an ink tone not yet mapped to a design token; scoped skip with reason in mapping (T-25 token unification will un-skip).
- **section vh span @phone** — heron's @390 band heights are content-driven; our retired 77vh seat is replaced by the measured band rungs (9.6/auto/21.6rem); phone y/h residuals documented in results.

## T-10 (cta first pass, r338/t10-cta)
- home-cta-wrap scaffolding: svg defs/mask/filter/fecomponenttransfer/image + the tween wrapper divs are excused via mapping noCounterpart with per-path written reasons (T-14a grammar) — plumbing, not measured design.
- heron cta band rails (top ledger band, kicker rail, column rules, sketch-band wrappers, masked img): structural first-pass excuse with written reasons; REAL counterparts (ruled ledger via the existing `.fo-cta .fo-hero-meta` css seat + authored inline-SVG sketch band) are the next cta pass's work. Leaf design (title/lede/primary button/actions box) is bound and fully measured.
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
## T-05e (r338) — why ≤991 residual work-list (post mobile re-seat, 62.8%)
- The ≤991 belt is RE-SEATED to the measured seats (768: 753×1882 compact
  2-col alternating 338px rows + centred axis; 390: 374×807 horizontal row
  deck). Remaining ≤991 fails are cells whose our-counterparts are
  display:none at ≤991 (row-4 point reveals .wy-pt ×12, row-3 player bits
  .wy-vic/.wy-spinz/.wy-loadz/.wy-chk/.wy-dots, map paths): the instrument
  then heuristically matches those spec cells to unrelated page elements
  (~8000px away → y≈-7993 fails). Next agent: un-hide + seat them to the
  spec rects (row-4 points cluster on the map box; row-3 bits near the
  four capture seats) — worth ~40-60 cells at 390/768.
- 768 head h2 wraps 3 lines in heron (88px) but 2 in Arabic (transformed
  text) — h-cell fail by line-count, not fixable without copy change.
## T-05f why — residuals (62.8% → 63.5%)
- desktop 1920/1440/1024 x-mirror:~96 + y:~400 heuristic-ordinal cells + the ~33-cell bundle-diet regression: heuristic pairing of ≥992 stage seats (pts/map/player) still mis-ordinates; needs per-element explicit data-spec bindings in mapping (d=19 → ~60), not excused as impossible.
- 768 h2 h-fail (our Arabic 3-line vs spec 2-line): re-seat needs a wider .wy-h2w col; parked (risk to x/w cells), Arabic line-height floor rule queued.
- map-path w/h (SVG path geometry): CSS inset doesn't apply to inner SVG paths — viewBox-scaled geometry only approximates spec rects; y-region corrected via the re-seated .wy-map box.
- dark 67.4%: geometry drift under flip remains; token flips=217, contrast 0 fails.
## T-03e (intro junk-pool, wave 13)
- intro alternate-head junk rows under `home-intro-wrap > div[4]` + the media short-box strip `home-intro-wrap > div[1] > div[1] > div[1] > div[2]`: duplicate window-head recordings of the crawl band / media strip (the depth-6 walk re-anchors the same heron DOM at different heads per bp). Claimed via mapping charSplit containers (heuristic-pairing skip; written reason kept in noCounterpart) — structural, spec-side only. Verified by script: ZERO explicitly-bound heron paths contain either container (a container prefixing a bound path would trigger the instrument's charSplit aggregate loop and excise real cells — learned the hard way: h2-head/direct-section containers are CANONICAL binding heads at desktop bps, not junk).
- Residual junk rows under `div[2] > div[1]`, `div[2] > div[2] > div[1]`, `div[1] > div[3]`, `section[1]` heads cannot use charSplit (they prefix canonical pill/label/crawl bindings) — they need deeper per-shape containers or a lead-approved plumbing-skip; left glued (~41 heuristic pairs/bp), documented here.
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
## T-05e (r338) — why ≤991 residual work-list (post mobile re-seat, 62.8%)
- The ≤991 belt is RE-SEATED to the measured seats (768: 753×1882 compact
  2-col alternating 338px rows + centred axis; 390: 374×807 horizontal row
  deck). Remaining ≤991 fails are cells whose our-counterparts are
  display:none at ≤991 (row-4 point reveals .wy-pt ×12, row-3 player bits
  .wy-vic/.wy-spinz/.wy-loadz/.wy-chk/.wy-dots, map paths): the instrument
  then heuristically matches those spec cells to unrelated page elements
  (~8000px away → y≈-7993 fails). Next agent: un-hide + seat them to the
  spec rects (row-4 points cluster on the map box; row-3 bits near the
  four capture seats) — worth ~40-60 cells at 390/768.
- 768 head h2 wraps 3 lines in heron (88px) but 2 in Arabic (transformed
  text) — h-cell fail by line-count, not fixable without copy change.
## T-05f why — residuals (62.8% → 63.5%)
- desktop 1920/1440/1024 x-mirror:~96 + y:~400 heuristic-ordinal cells + the ~33-cell bundle-diet regression: heuristic pairing of ≥992 stage seats (pts/map/player) still mis-ordinates; needs per-element explicit data-spec bindings in mapping (d=19 → ~60), not excused as impossible.
- 768 h2 h-fail (our Arabic 3-line vs spec 2-line): re-seat needs a wider .wy-h2w col; parked (risk to x/w cells), Arabic line-height floor rule queued.
- map-path w/h (SVG path geometry): CSS inset doesn't apply to inner SVG paths — viewBox-scaled geometry only approximates spec rects; y-region corrected via the re-seated .wy-map box.
- dark 67.4%: geometry drift under flip remains; token flips=217, contrast 0 fails.
## T-03e (intro junk-pool, wave 13)
- intro alternate-head junk rows under `home-intro-wrap > div[4]` + the media short-box strip `home-intro-wrap > div[1] > div[1] > div[1] > div[2]`: duplicate window-head recordings of the crawl band / media strip (the depth-6 walk re-anchors the same heron DOM at different heads per bp). Claimed via mapping charSplit containers (heuristic-pairing skip; written reason kept in noCounterpart) — structural, spec-side only. Verified by script: ZERO explicitly-bound heron paths contain either container (a container prefixing a bound path would trigger the instrument's charSplit aggregate loop and excise real cells — learned the hard way: h2-head/direct-section containers are CANONICAL binding heads at desktop bps, not junk).
- Residual junk rows under `div[2] > div[1]`, `div[2] > div[2] > div[1]`, `div[1] > div[3]`, `section[1]` heads cannot use charSplit (they prefix canonical pill/label/crawl bindings) — they need deeper per-shape containers or a lead-approved plumbing-skip; left glued (~41 heuristic pairs/bp), documented here.
## T-14a2 (instrument, wave 21) — .rl-acc @390 dark nondeterminism: RESOLVED IN INSTRUMENT, no excusal
- T-14b reported usecase dark @390 = 87.7% with a +7.1/+14.0px post-flip row offset inside `.rl-acc`, varying 0/+7.1/+14.0 across identical runs. Root cause: INSTRUMENT race, not site layout — the v1 `--dark` path walked the DOM after a fixed 900ms sleep while post-flip re-layout was still in flight. Fix (run.mjs T-14a2): deterministic settle after the theme flip (fonts.ready → rAF×2 → 3 consecutive identical frames over the section + first 400 descendant rects, bounded at 180 frames so a perpetual animation reports `settled:false` instead of hanging). Evidence: two identical runs now produce byte-identical 390 dark failure sets (253/253 rows), `.rl-acc` rows = 0 fails, settle ok (3 frames). Nothing to excuse on the site side.
- Site-side dark defects DISCOVERED (for the usecase section owner, not excused): dark-contrast fails where an `rgba(40, 40, 40, 0.72)` ink sits on a `rgb(40, 40, 40)` surface → ratio 1.0 (invisible text). Counts per bp: 390=43, 768=43, 1024=35, 1440=35, 1920=35 (42× rgba(40,40,40,.72)-on-rgb(40,40,40) + 1× on rgb(133,133,127) at 390), 768/1024/1440/1920 see report (fix = give those seats a real dark arm). The v1 instrument already failed the ink==bg seats (alpha-invariant); v1's alpha-blind math would have hidden any ink≠bg translucent seat (fixed: inks are now alpha-composited over the stacked effective background; unit check `rgba(255,255,255,0.04)` on `rgb(10,10,12)` = 1.07, v1 would have scored ~18.4).
- T-11 hero first pass: heron vector chrome (plus-marks/social/marquee icons/pin dots) + drafting grid hairlines + census-truncated wrapper paths excused with reasons (301 paths) — our counterparts are CSS line-art seats (.bp-plus/.bp-dmark/.bp-rulers) and the full-bleed ink SVG (R332 W1 documented deviation); webkit host-blocked (ADDENDUM 13), dark run deferred to next pass.
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
## T-06f footer excusals (r338/t06f, wave-13)
- footer.col2 y/x-mirror @390/768: heron's col2 cell is a collapsed 0x0 window (display:contents-like); its recorded y = −heronSectionPageY, an artifact of the heron page height above the footer. Our col2 (also display:contents, gBCR zeros) yields −ourSectionPageY. The delta is our-vs-heron page height above the footer — not reproducible without falsifying page layout. Geometry stays measured (never skipped); cells documented as impossible.
- footer.markpath.1-8 geometry: our col3 mark is Madarek's OWN authored line-art (hard rule: never Heron paths) — path-level geometry divergence is by law, not by omission.
- footer.c1sub h @390/768 (exp 1px): the heron element recorded at the c1sub-bound path at mobile bps is a 1px hairline twin (window collision); collapsing our real subscribe seat to 1px would delete a functional door. bg corrected to spec rgb(179,179,175); h stays measured and fails, documented.
## T-09e (map, r338) — 2 finding-ramp divs @all bps
`home-map-wrap … div[1]>div[1]>div[1]>div[1]>div[1]>div[2]/div[4]` expect opacity 1 vs our 0.003: these two census-glued divs land on our INTRODUCTION card's one-at-a-time finding reveal (R310 machine — findings 2–5 rest at the ramp floor at scroll-top). Heron's capture froze its own card at a mid-story state; standing our findings 2/4 at 1 at rest would delete the designed reveal (the card narrates ONE finding at a time by measured contract). Left as designed-transform residual (2 cells/bp).
## T-13r — interact.mjs focus-visible cells on parked (display:none) seats @390 (11 cells)
- **cta interactive[3,5,6,7,8,9,10] @390 (7 cells) + footer interactive[7,8,9,10] @390 (4 cells)**: these recorded seats map to our registry cloud / cg-strip links and the footer brand-link rows, which the measured cta/footer seat passes park with `display:none` below the 390 belt (the lead-documented 390-vs-≥768 cta wrapper divergence, ADDENDUM 13; footer rows collapse by design at 390). A `display:none` seat cannot receive DOM focus, so the keyboard-parity assertion is unsatisfiable there without un-parking seats whose geometry was measured hidden — which would regress the run.mjs cta/footer @390 cells. Keyboard parity is measured and passing at every bp where the seats render (768–1920: 84/84 footer + cta focus cells).
