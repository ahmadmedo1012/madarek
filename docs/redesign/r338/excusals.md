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
